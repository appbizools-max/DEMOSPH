import React, { useState, useEffect } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { db, sendInvoiceWhatsAppNotification } from '@app/shared';
import { X, User, CheckCircle2, Circle, ArrowLeft, MessageCircle } from 'lucide-react';
import shLogo from '../../Assets/sh_logo.png';
import { SH_LOGO_BASE64 } from '../utils/logoBase64';

export interface PatientAppointment {
  id: string;
  patientName?: string;
  name?: string;
  phone?: string;
  doctorName?: string;
  doctor?: string;
  branch?: string;
  regId?: string;
  consultationFee?: number;
  medicineFee?: number;
  medicineFeeRequested?: number;
  pharmacyFee?: number;
  dietFee?: number;
  otherCharges?: number;
  discount?: number;
  paymentMode?: string;
  paymentStatus?: string;
}

interface CollectFeeCheckoutModalProps {
  appointment: PatientAppointment | null;
  onClose: () => void;
  onSuccess?: (invoiceData: any) => void;
}

export const CollectFeeCheckoutModal: React.FC<CollectFeeCheckoutModalProps> = ({
  appointment,
  onClose,
  onSuccess
}) => {
  // ---------------- STATE ----------------
  const [showPatientDetails, setShowPatientDetails] = useState(false);
  const [targetAmount, setTargetAmount] = useState<number>(0);
  const [paymentTypePreset, setPaymentTypePreset] = useState<'consultation' | 'consultation_med' | 'split' | 'package'>('consultation');

  // Checkbox Fee Selection
  const [includeConsultFee, setIncludeConsultFee] = useState<boolean>(true);
  const [includeMedicineFee, setIncludeMedicineFee] = useState<boolean>(false);
  const [includeDietFee, setIncludeDietFee] = useState<boolean>(false);
  const [includeOtherCharges, setIncludeOtherCharges] = useState<boolean>(false);

  // Fee Inputs
  const [consultFeeInput, setConsultFeeInput] = useState<number>(0);
  const [medicineFeeInput, setMedicineFeeInput] = useState<number>(0);
  const [dietFeeInput, setDietFeeInput] = useState<number>(0);
  const [otherChargesInput, setOtherChargesInput] = useState<number>(0);
  const [discountInput, setDiscountInput] = useState<number>(0);
  const [showDiscountInput, setShowDiscountInput] = useState(false);

  // Payment Mode & Split
  const [selectedPaymentMode, setSelectedPaymentMode] = useState<string>('Cash');
  const [splitCash, setSplitCash] = useState<number>(0);
  const [splitUpi, setSplitUpi] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const isAlreadyPaid = appointment?.paymentStatus === 'paid' || appointment?.status === 'completed';
  const [invoiceApp, setInvoiceApp] = useState<any | null>(() => (
    appointment && isAlreadyPaid ? appointment : null
  ));
  const activeInvoice = invoiceApp || (isAlreadyPaid ? appointment : null);

  useEffect(() => {
    if (appointment) {
      const mFee = Number(appointment.pharmacyFee || appointment.medicineFeeRequested || appointment.medicineFee) || 0;
      const cFee = mFee > 0 ? 0 : (appointment.consultationFee !== undefined && appointment.consultationFee !== null ? Number(appointment.consultationFee) : 0);
      const dFee = Number(appointment.dietFee) || 0;
      const oFee = Number(appointment.otherCharges) || 0;
      const disc = Number(appointment.discount) || 0;

      const givenTarget = appointment.targetAmount ?? appointment.target_amount ?? appointment.totalAmount;
      const computedTarget = givenTarget !== undefined && givenTarget !== null ? Number(givenTarget) : (mFee > 0 ? mFee : (cFee + mFee + dFee + oFee - disc));

      setConsultFeeInput(cFee);
      setMedicineFeeInput(mFee);
      setDietFeeInput(dFee);
      setOtherChargesInput(oFee);
      setDiscountInput(disc);
      setTargetAmount(computedTarget);
      if (mFee > 0) {
        setIncludeConsultFee(false);
        setIncludeMedicineFee(true);
      } else {
        setIncludeConsultFee(true);
        setIncludeMedicineFee(false);
      }
      if (appointment.paymentStatus === 'paid' || appointment.status === 'completed') {
        setInvoiceApp(appointment);
      } else {
        setInvoiceApp(null);
      }
    }
  }, [appointment]);

  if (!appointment) return null;

  const handlePresetSelect = (preset: 'consultation' | 'consultation_med' | 'split' | 'package') => {
    setPaymentTypePreset(preset);
    if (preset === 'consultation') {
      setIncludeConsultFee(true);
      setIncludeMedicineFee(false);
    } else if (preset === 'consultation_med') {
      setIncludeConsultFee(true);
      setIncludeMedicineFee(true);
    } else if (preset === 'split') {
      setIncludeConsultFee(true);
      setIncludeMedicineFee(true);
      setSelectedPaymentMode('Split');
    } else if (preset === 'package') {
      setIncludeConsultFee(true);
      setIncludeMedicineFee(true);
      setIncludeDietFee(true);
    }
  };

  const activeConsultFee = includeConsultFee ? consultFeeInput : 0;
  const activeMedicineFee = includeMedicineFee ? medicineFeeInput : 0;
  const activeDietFee = includeDietFee ? dietFeeInput : 0;
  const activeOtherCharges = includeOtherCharges ? otherChargesInput : 0;

  const totalAmountDue = Math.max(
    0,
    activeConsultFee + activeMedicineFee + activeDietFee + activeOtherCharges - discountInput
  );

  const handleConfirmCheckout = async () => {
    setIsLoading(true);
    const finalPaymentMode =
      selectedPaymentMode === 'Split'
        ? `Split (Cash ₹${splitCash} + UPI ₹${splitUpi})`
        : selectedPaymentMode;

    const payload = {
      status: 'completed',
      paymentStatus: 'paid',
      paymentPending: false,
      paymentCollectedAt: new Date().toISOString(),
      consultationFee: activeConsultFee,
      medicineFee: activeMedicineFee,
      dietFee: activeDietFee,
      otherCharges: activeOtherCharges,
      discount: discountInput,
      totalPaid: totalAmountDue,
      paymentMode: finalPaymentMode,
      updatedAt: new Date().toISOString()
    };

    try {
      await updateDoc(doc(db, 'appointments', appointment.id), payload).catch(() => {});
      await updateDoc(doc(db, 'allpatients', appointment.id), payload).catch(() => {});
      await updateDoc(doc(db, 'patients', appointment.id), payload).catch(() => {});

      // Trigger Leonas WhatsApp Invoice / Payment Receipt Notification
      sendInvoiceWhatsAppNotification({
        patientName: appointment.patientName || appointment.name || 'Patient',
        phone: appointment.phone || appointment.phoneNumber || '',
        invoiceId: appointment.id,
        totalPaid: totalAmountDue,
        paymentMode: finalPaymentMode,
        branch: appointment.branch || 'KPHB'
      }).catch(err => console.error('WhatsApp invoice notification error:', err));

      const completedInvoice = { ...appointment, ...payload };
      if (onSuccess) {
        onSuccess(completedInvoice);
      }

      setInvoiceApp(completedInvoice);
    } catch (err) {
      console.error('Error completing checkout:', err);
      alert('Failed to save payment to Firestore.');
    } finally {
      setIsLoading(false);
    }
  };

  const patientName = appointment.patientName || appointment.name || 'Patient';
  const patientPhone = appointment.phone || 'N/A';

  return (
    <>
      {/* ---------------- 1. FULL SCREEN BILLING CHECKOUT ---------------- */}
      {!activeInvoice && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: '#ffffff', zIndex: 9999, display: 'flex', flexDirection: 'column',
          width: '100vw', height: '100vh', overflow: 'hidden'
        }}>
          {/* Top Bar */}
          <div style={{
            padding: '16px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            borderBottom: '1px solid #e2e8f0', backgroundColor: '#ffffff'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <button
                onClick={onClose}
                style={{
                  background: 'transparent', border: 'none', color: '#0f172a', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', padding: '4px'
                }}
              >
                <ArrowLeft size={22} />
              </button>
              <div>
                <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 800, color: '#0f172a' }}>
                  Appointment Payment
                </h2>
                <div style={{ fontSize: '13px', color: '#64748b', marginTop: '2px' }}>
                  Review and complete payment
                </div>
              </div>
            </div>

            <button
              onClick={onClose}
              style={{
                width: '34px', height: '34px', borderRadius: '50%', background: '#f1f5f9',
                border: 'none', color: '#0f172a', cursor: 'pointer', display: 'flex',
                alignItems: 'center', justifyContent: 'center'
              }}
            >
              <X size={20} />
            </button>
          </div>

          {/* Body Content */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '720px', width: '100%', margin: '0 auto' }}>
            {/* Patient Info Card */}
            <div style={{
              background: '#f0f7ff', borderRadius: '14px', padding: '16px',
              border: '1px solid #e0f2fe', display: 'flex', justifyContent: 'space-between', alignItems: 'center'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: '#dbeafe', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#258ec8' }}>
                  <User size={22} />
                </div>
                <div>
                  <div style={{ fontSize: '16px', fontWeight: 800, color: '#0f172a' }}>{patientName}</div>
                  <div style={{ fontSize: '13px', color: '#475569', marginTop: '2px' }}>{patientPhone}</div>
                </div>
              </div>
              <button
                onClick={() => setShowPatientDetails(!showPatientDetails)}
                style={{
                  background: '#ffffff', border: '1px solid #258ec8', color: '#258ec8',
                  padding: '7px 14px', borderRadius: '8px', fontSize: '12.5px', fontWeight: 700, cursor: 'pointer'
                }}
              >
                {showPatientDetails ? 'Hide Details' : 'View Details >'}
              </button>
            </div>

            {/* Expandable Patient Metadata */}
            {showPatientDetails && (
              <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '12px 16px', fontSize: '13px', color: '#475569', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <div>Doctor: <strong>{appointment.doctor || appointment.doctorName || 'Dr. Prashanth K Vaidya'}</strong></div>
                <div>Reg ID: <strong style={{ color: '#258ec8' }}>{appointment.regId || 'N/A'}</strong></div>
                <div>Branch: <strong>{appointment.branch || 'Clinic'}</strong></div>
              </div>
            )}

            {/* Section Heading */}
            <div style={{ fontSize: '16px', fontWeight: 800, color: '#0f172a', marginTop: '4px' }}>Select Payment Type</div>

            {/* Target Amount Box */}
            <div style={{
              background: '#f8fafc', border: '1px solid #93c5fd', borderRadius: '14px',
              padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center'
            }}>
              <div>
                <div style={{ fontSize: '14.5px', fontWeight: 800, color: '#0f172a' }}>Target Amount (from Doctor):</div>
                <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>Tap to edit target amount</div>
              </div>
              <div style={{
                display: 'flex', alignItems: 'center', background: '#ffffff', border: '1.5px solid #258ec8',
                borderRadius: '10px', padding: '6px 12px', width: '110px'
              }}>
                <span style={{ fontSize: '16px', fontWeight: 800, color: '#258ec8', marginRight: '4px' }}>₹</span>
                <input
                  type="number"
                  value={targetAmount}
                  onChange={e => setTargetAmount(Number(e.target.value))}
                  style={{ width: '100%', border: 'none', outline: 'none', textAlign: 'right', fontSize: '16px', fontWeight: 800, color: '#0f172a' }}
                />
              </div>
            </div>

            {/* 4 Payment Preset Pills */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
              {[
                { id: 'consultation', label: 'Consultation Fee' },
                { id: 'consultation_med', label: 'Consultation & Med Fee' },
                { id: 'split', label: 'Split (Both)' },
                { id: 'package', label: 'Package Fee' }
              ].map((pill) => {
                const isActive = paymentTypePreset === pill.id;
                return (
                  <button
                    key={pill.id}
                    onClick={() => handlePresetSelect(pill.id as any)}
                    style={{
                      padding: '10px 6px', borderRadius: '10px',
                      border: isActive ? '1.5px solid #258ec8' : '1px solid #cbd5e1',
                      background: isActive ? '#eff6ff' : '#ffffff',
                      color: isActive ? '#1d4ed8' : '#475569',
                      fontWeight: isActive ? 800 : 700, fontSize: '11px', cursor: 'pointer', textAlign: 'center'
                    }}
                  >
                    {pill.label}
                  </button>
                );
              })}
            </div>

            {/* Checkbox Fee Cards */}
            {/* 1. Consultation Fee */}
            <div style={{
              background: '#ffffff', border: includeConsultFee ? '1.5px solid #93c5fd' : '1px solid #e2e8f0',
              borderRadius: '12px', padding: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center'
            }}>
              <div
                onClick={() => setIncludeConsultFee(!includeConsultFee)}
                style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', flex: 1 }}
              >
                {includeConsultFee ? <CheckCircle2 color="#258ec8" size={24} /> : <Circle color="#cbd5e1" size={24} />}
                <div>
                  <div style={{ fontSize: '14.5px', fontWeight: 800, color: '#0f172a' }}>Consultation Fee</div>
                  <div style={{ fontSize: '12px', color: '#64748b', marginTop: '1px' }}>Doctor Requested Consultation Fee</div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '5px 10px', width: '90px' }}>
                <span style={{ fontSize: '14px', fontWeight: 700, color: '#258ec8', marginRight: '2px' }}>₹</span>
                <input
                  type="number"
                  value={consultFeeInput}
                  onChange={e => setConsultFeeInput(Number(e.target.value))}
                  style={{ width: '100%', border: 'none', outline: 'none', textAlign: 'right', fontSize: '14px', fontWeight: 700, color: '#0f172a' }}
                />
              </div>
            </div>

            {/* 2. Prescribed Medicines */}
            <div style={{
              background: '#ffffff', border: includeMedicineFee ? '1.5px solid #93c5fd' : '1px solid #e2e8f0',
              borderRadius: '12px', padding: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center'
            }}>
              <div
                onClick={() => setIncludeMedicineFee(!includeMedicineFee)}
                style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', flex: 1 }}
              >
                {includeMedicineFee ? <CheckCircle2 color="#258ec8" size={24} /> : <Circle color="#cbd5e1" size={24} />}
                <div>
                  <div style={{ fontSize: '14.5px', fontWeight: 800, color: '#0f172a' }}>Prescribed Medicines</div>
                  <div style={{ fontSize: '12px', color: '#64748b', marginTop: '1px' }}>Prescribed Remedies / Pharmacy Fee</div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '5px 10px', width: '90px' }}>
                <span style={{ fontSize: '14px', fontWeight: 700, color: '#258ec8', marginRight: '2px' }}>₹</span>
                <input
                  type="number"
                  value={medicineFeeInput}
                  onChange={e => setMedicineFeeInput(Number(e.target.value))}
                  style={{ width: '100%', border: 'none', outline: 'none', textAlign: 'right', fontSize: '14px', fontWeight: 700, color: '#0f172a' }}
                />
              </div>
            </div>

            {/* 3. Diet Plan Fee */}
            <div style={{
              background: '#ffffff', border: includeDietFee ? '1.5px solid #93c5fd' : '1px solid #e2e8f0',
              borderRadius: '12px', padding: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center'
            }}>
              <div
                onClick={() => setIncludeDietFee(!includeDietFee)}
                style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', flex: 1 }}
              >
                {includeDietFee ? <CheckCircle2 color="#258ec8" size={24} /> : <Circle color="#cbd5e1" size={24} />}
                <div>
                  <div style={{ fontSize: '14.5px', fontWeight: 800, color: '#0f172a' }}>Diet Plan Fee</div>
                  <div style={{ fontSize: '12px', color: '#64748b', marginTop: '1px' }}>Diet & Nutrition Fee</div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '5px 10px', width: '90px' }}>
                <span style={{ fontSize: '14px', fontWeight: 700, color: '#258ec8', marginRight: '2px' }}>₹</span>
                <input
                  type="number"
                  value={dietFeeInput}
                  onChange={e => setDietFeeInput(Number(e.target.value))}
                  style={{ width: '100%', border: 'none', outline: 'none', textAlign: 'right', fontSize: '14px', fontWeight: 700, color: '#0f172a' }}
                />
              </div>
            </div>

            {/* 4. Other Charges Fee */}
            <div style={{
              background: '#ffffff', border: includeOtherCharges ? '1.5px solid #93c5fd' : '1px solid #e2e8f0',
              borderRadius: '12px', padding: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center'
            }}>
              <div
                onClick={() => setIncludeOtherCharges(!includeOtherCharges)}
                style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', flex: 1 }}
              >
                {includeOtherCharges ? <CheckCircle2 color="#258ec8" size={24} /> : <Circle color="#cbd5e1" size={24} />}
                <div>
                  <div style={{ fontSize: '14.5px', fontWeight: 800, color: '#0f172a' }}>Other Charges</div>
                  <div style={{ fontSize: '12px', color: '#64748b', marginTop: '1px' }}>Miscellaneous / Procedures Fee</div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '5px 10px', width: '90px' }}>
                <span style={{ fontSize: '14px', fontWeight: 700, color: '#258ec8', marginRight: '2px' }}>₹</span>
                <input
                  type="number"
                  value={otherChargesInput}
                  onChange={e => setOtherChargesInput(Number(e.target.value))}
                  style={{ width: '100%', border: 'none', outline: 'none', textAlign: 'right', fontSize: '14px', fontWeight: 700, color: '#0f172a' }}
                />
              </div>
            </div>

            {/* Medicine Discount Status Card */}
            <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '14px' }}>
              <div style={{ fontSize: '14px', fontWeight: 800, color: '#0f172a' }}>Medicine Discount Status</div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '10px' }}>
                <button
                  onClick={() => setShowDiscountInput(!showDiscountInput)}
                  style={{ background: '#f1f5f9', border: '1px solid #cbd5e1', padding: '7px 14px', borderRadius: '8px', fontSize: '12.5px', fontWeight: 700, color: '#334155', cursor: 'pointer' }}
                >
                  Request Discount
                </button>

                {showDiscountInput && (
                  <div style={{ display: 'flex', alignItems: 'center', background: '#fff5f5', border: '1px solid #fecaca', borderRadius: '8px', padding: '5px 10px', width: '100px' }}>
                    <span style={{ fontSize: '14px', fontWeight: 700, color: '#ef4444', marginRight: '2px' }}>- ₹</span>
                    <input
                      type="number"
                      value={discountInput}
                      onChange={e => setDiscountInput(Number(e.target.value))}
                      style={{ width: '100%', border: 'none', outline: 'none', textAlign: 'right', fontSize: '14px', fontWeight: 700, color: '#ef4444' }}
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Payment Method Selector */}
            <div style={{ fontSize: '16px', fontWeight: 800, color: '#0f172a', marginTop: '6px' }}>Select Payment Method</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
              {['Cash', 'UPI / QR Code', 'Card', 'Split', 'Send Pay Link', 'Pay Later'].map((mode) => {
                const isActive = selectedPaymentMode === mode;
                return (
                  <button
                    key={mode}
                    onClick={() => setSelectedPaymentMode(mode)}
                    style={{
                      padding: '10px', borderRadius: '8px',
                      border: isActive ? '1.5px solid #258ec8' : '1px solid #cbd5e1',
                      background: isActive ? '#f0f9ff' : '#ffffff',
                      color: isActive ? '#258ec8' : '#475569',
                      fontWeight: isActive ? 800 : 700, fontSize: '12px', cursor: 'pointer'
                    }}
                  >
                    {mode}
                  </button>
                );
              })}
            </div>

            {/* Split Breakdown */}
            {selectedPaymentMode === 'Split' && (
              <div style={{ display: 'flex', gap: '12px', background: '#f0f9ff', padding: '14px', borderRadius: '10px', border: '1px solid #bae6fd' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: '12px', fontWeight: 700, color: '#0369a1', display: 'block', marginBottom: '4px' }}>Cash Portion (₹)</label>
                  <input type="number" value={splitCash} onChange={e => setSplitCash(Number(e.target.value))} style={{ width: '100%', padding: '7px', borderRadius: '6px', border: '1px solid #7dd3fc', fontSize: '13px', fontWeight: 700 }} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: '12px', fontWeight: 700, color: '#0369a1', display: 'block', marginBottom: '4px' }}>UPI Portion (₹)</label>
                  <input type="number" value={splitUpi} onChange={e => setSplitUpi(Number(e.target.value))} style={{ width: '100%', padding: '7px', borderRadius: '6px', border: '1px solid #7dd3fc', fontSize: '13px', fontWeight: 700 }} />
                </div>
              </div>
            )}

            {/* Total Amount Summary */}
            <div style={{
              background: '#f8fafc', border: '1.5px solid #cbd5e1', borderRadius: '12px',
              padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px'
            }}>
              <span style={{ fontSize: '15px', fontWeight: 800, color: '#0f172a' }}>TOTAL AMOUNT DUE:</span>
              <span style={{ fontSize: '20px', fontWeight: 800, color: '#16a34a' }}>
                ₹ {totalAmountDue.toLocaleString('en-IN')}
              </span>
            </div>
          </div>

          {/* Bottom Bar */}
          <div style={{ padding: '16px 24px', backgroundColor: '#ffffff', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
            <button onClick={onClose} style={{ padding: '11px 20px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#fff', color: '#475569', fontWeight: 700, cursor: 'pointer', fontSize: '13px' }}>
              Cancel
            </button>
            <button
              onClick={handleConfirmCheckout}
              disabled={isLoading}
              style={{ flex: 1, padding: '12px 24px', borderRadius: '8px', border: 'none', background: '#16a34a', color: '#fff', fontWeight: 800, fontSize: '14px', cursor: 'pointer', boxShadow: '0 4px 12px rgba(22, 163, 74, 0.25)' }}
            >
              {isLoading ? 'Processing...' : 'Confirm Payment & Generate Invoice ✓'}
            </button>
          </div>
        </div>
      )}
      {/* ---------------- 2. FULL SCREEN PRINTABLE INVOICE RECEIPT ---------------- */}
      {activeInvoice && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: '#ffffff', zIndex: 10000, display: 'flex', flexDirection: 'column',
          width: '100vw', height: '100vh', overflow: 'hidden'
        }}>
          <style>{`
            @media print {
              body * { visibility: hidden !important; }
              #printable-invoice-receipt, #printable-invoice-receipt * { visibility: visible !important; }
              #printable-invoice-receipt {
                position: absolute !important;
                left: 0 !important;
                top: 0 !important;
                width: 100% !important;
                max-width: 100% !important;
                padding: 28px 40px !important;
                margin: 0 !important;
                box-shadow: none !important;
              }
              .no-print { display: none !important; }
            }
          `}</style>

          {/* Invoice Header Navigation (Screen Only) */}
          <div className="no-print" style={{ padding: '16px 24px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#ffffff' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: '#0f172a', cursor: 'pointer' }}>
                <ArrowLeft size={22} />
              </button>
              <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#0f172a' }}>Payment Receipt</h2>
            </div>
            <button onClick={onClose} style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#f1f5f9', border: 'none', color: '#0f172a', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <X size={18} />
            </button>
          </div>

          {/* Printable Payment Receipt Container (1:1 with Screenshot) */}
          <div id="printable-invoice-receipt" style={{
            flex: 1, overflowY: 'auto', padding: '32px 40px', maxWidth: '800px', width: '100%',
            margin: '0 auto', fontFamily: 'Inter, system-ui, -apple-system, sans-serif', backgroundColor: '#ffffff', color: '#0f172a',
            display: 'flex', flexDirection: 'column', justifyContent: 'space-between'
          }}>
            <div>
              {/* 1. Header Bar */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '10px', gap: '12px' }}>
                <img src={`data:image/png;base64,${SH_LOGO_BASE64}`} width="260" height="52" alt="Spiritual Homeopathy Logo" style={{ height: '52px', width: '260px', objectFit: 'contain' }} />
                <div style={{ textAlign: 'right', fontSize: '11px', color: '#334155', fontWeight: 700, lineHeight: 1.4, flexShrink: 0 }}>
                  <div>www.spiritualhomeoclinic.com</div>
                  <div style={{ color: '#64748b', fontWeight: 500 }}>support@spiritualhomeo.com</div>
                </div>
              </div>

              {/* Lime Green Top Border Line */}
              <div style={{ height: '5px', backgroundColor: '#99cc00', width: '100%', margin: '10px 0 20px 0', borderRadius: '3px' }} />

              {/* 2. PAYMENT RECEIPT Header & Receipt Badge */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h1 style={{ margin: 0, fontSize: '20px', fontWeight: 900, color: '#0f172a', letterSpacing: '0.5px', textTransform: 'uppercase' }}>
                  PAYMENT RECEIPT
                </h1>
                <span style={{ backgroundColor: '#e0f2fe', color: '#0284c7', padding: '5px 16px', borderRadius: '20px', fontSize: '11.5px', fontWeight: 800, letterSpacing: '0.5px' }}>
                  RECEIPT
                </span>
              </div>

              {/* 3. PATIENT DETAILS Section */}
              <div style={{ marginBottom: '22px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                  <span style={{ fontSize: '11.5px', fontWeight: 800, color: '#475569', letterSpacing: '0.8px' }}>PATIENT DETAILS</span>
                  <div style={{ flex: 1, height: '1px', backgroundColor: '#e2e8f0' }} />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px 36px', fontSize: '13.5px' }}>
                  <div style={{ borderBottom: '1px solid #e2e8f0', paddingBottom: '6px' }}>
                    <div style={{ fontSize: '10.5px', fontWeight: 700, color: '#64748b', marginBottom: '3px', textTransform: 'uppercase' }}>PATIENT NAME</div>
                    <div style={{ fontWeight: 800, color: '#0f172a', fontSize: '14px' }}>{patientName}</div>
                  </div>
                  <div style={{ borderBottom: '1px solid #e2e8f0', paddingBottom: '6px' }}>
                    <div style={{ fontSize: '10.5px', fontWeight: 700, color: '#64748b', marginBottom: '3px', textTransform: 'uppercase' }}>PHONE NUMBER</div>
                    <div style={{ fontWeight: 800, color: '#0f172a', fontSize: '14px' }}>+91 {patientPhone}</div>
                  </div>
                  <div style={{ borderBottom: '1px solid #e2e8f0', paddingBottom: '6px' }}>
                    <div style={{ fontSize: '10.5px', fontWeight: 700, color: '#64748b', marginBottom: '3px', textTransform: 'uppercase' }}>CONSULTANT DOCTOR</div>
                    <div style={{ fontWeight: 800, color: '#0f172a', fontSize: '14px' }}>{activeInvoice.doctorName || activeInvoice.doctor || 'Dr. Prashanth k vaidya'}</div>
                  </div>
                  <div style={{ borderBottom: '1px solid #e2e8f0', paddingBottom: '6px' }}>
                    <div style={{ fontSize: '10.5px', fontWeight: 700, color: '#64748b', marginBottom: '3px', textTransform: 'uppercase' }}>CLINIC BRANCH</div>
                    <div style={{ fontWeight: 800, color: '#0f172a', fontSize: '14px' }}>{activeInvoice.branch || 'Kphb'}</div>
                  </div>
                  <div style={{ borderBottom: '1px solid #e2e8f0', paddingBottom: '6px' }}>
                    <div style={{ fontSize: '10.5px', fontWeight: 700, color: '#64748b', marginBottom: '3px', textTransform: 'uppercase' }}>APPOINTMENT SCHEDULE</div>
                    <div style={{ fontWeight: 800, color: '#0f172a', fontSize: '14px' }}>
                      {activeInvoice.appointmentDate || activeInvoice.date || new Date().toLocaleDateString('en-GB')} at {activeInvoice.timeSlot || activeInvoice.time || '01:00 PM'}
                    </div>
                  </div>
                  <div style={{ borderBottom: '1px solid #e2e8f0', paddingBottom: '6px' }}>
                    <div style={{ fontSize: '10.5px', fontWeight: 700, color: '#64748b', marginBottom: '3px', textTransform: 'uppercase' }}>SPECIALTY</div>
                    <div style={{ fontWeight: 800, color: '#0f172a', fontSize: '14px' }}>General Homeopathy</div>
                  </div>
                </div>
              </div>

              {/* 4. PAYMENT INFORMATION Section */}
              <div style={{ marginBottom: '22px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                  <span style={{ fontSize: '11.5px', fontWeight: 800, color: '#475569', letterSpacing: '0.8px' }}>PAYMENT INFORMATION</span>
                  <div style={{ flex: 1, height: '1px', backgroundColor: '#e2e8f0' }} />
                </div>

                <div style={{
                  backgroundColor: '#e6f7ed', border: '2px dashed #86efac', borderRadius: '14px',
                  padding: '18px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                }}>
                  <div>
                    <div style={{ fontSize: '11px', fontWeight: 800, color: '#166534', letterSpacing: '0.5px', marginBottom: '3px', textTransform: 'uppercase' }}>
                      TOTAL AMOUNT PAID
                    </div>
                    <div style={{ fontSize: '32px', fontWeight: 900, color: '#15803d', lineHeight: 1 }}>
                      ₹{Number(activeInvoice.totalPaid || activeInvoice.targetAmount || 2000).toFixed(2)}
                    </div>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <div style={{ backgroundColor: '#22c55e', color: '#ffffff', padding: '6px 18px', borderRadius: '20px', fontWeight: 800, fontSize: '13px', display: 'inline-block' }}>
                      PAID ✓
                    </div>
                    <div style={{ fontSize: '11px', fontWeight: 800, color: '#166534', marginTop: '6px', textTransform: 'uppercase' }}>
                      VIA {activeInvoice.paymentMode || 'UPI'}
                    </div>
                  </div>
                </div>
              </div>

              {/* 5. FEE BREAKDOWN Section */}
              <div style={{ marginBottom: '22px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                  <span style={{ fontSize: '11.5px', fontWeight: 800, color: '#475569', letterSpacing: '0.8px' }}>FEE BREAKDOWN</span>
                  <div style={{ flex: 1, height: '1px', backgroundColor: '#e2e8f0' }} />
                </div>

                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13.5px' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1.5px solid #cbd5e1', color: '#475569' }}>
                      <th style={{ padding: '10px 14px', textAlign: 'left', fontSize: '11.5px', fontWeight: 800, textTransform: 'uppercase' }}>DESCRIPTION</th>
                      <th style={{ padding: '10px 14px', textAlign: 'right', fontSize: '11.5px', fontWeight: 800, textTransform: 'uppercase' }}>AMOUNT (₹)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Number(activeInvoice.medicineFee) > 0 && (
                      <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '10px 14px', color: '#334155', fontWeight: 600 }}>Medicine Fee</td>
                        <td style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 700, color: '#0f172a' }}>
                          ₹{Number(activeInvoice.medicineFee).toFixed(2)}
                        </td>
                      </tr>
                    )}
                    {Number(activeInvoice.consultationFee) > 0 && (
                      <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '10px 14px', color: '#334155', fontWeight: 600 }}>Consultation Fee</td>
                        <td style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 700, color: '#0f172a' }}>
                          ₹{Number(activeInvoice.consultationFee).toFixed(2)}
                        </td>
                      </tr>
                    )}
                    {Number(activeInvoice.dietFee) > 0 && (
                      <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '10px 14px', color: '#334155', fontWeight: 600 }}>Diet & Nutrition Fee</td>
                        <td style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 700, color: '#0f172a' }}>
                          ₹{Number(activeInvoice.dietFee).toFixed(2)}
                        </td>
                      </tr>
                    )}
                    {Number(activeInvoice.otherCharges) > 0 && (
                      <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '10px 14px', color: '#334155', fontWeight: 600 }}>Other Charges</td>
                        <td style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 700, color: '#0f172a' }}>
                          ₹{Number(activeInvoice.otherCharges).toFixed(2)}
                        </td>
                      </tr>
                    )}
                    {Number(activeInvoice.discount) > 0 && (
                      <tr style={{ borderBottom: '1px solid #f1f5f9', color: '#ef4444' }}>
                        <td style={{ padding: '10px 14px', fontWeight: 600 }}>Discount Applied</td>
                        <td style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 700 }}>
                          - ₹{Number(activeInvoice.discount).toFixed(2)}
                        </td>
                      </tr>
                    )}
                    {(!activeInvoice.medicineFee && !activeInvoice.consultationFee && !activeInvoice.dietFee && !activeInvoice.otherCharges) && (
                      <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '10px 14px', color: '#334155', fontWeight: 600 }}>Medicine & Consultation Fee</td>
                        <td style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 700, color: '#0f172a' }}>
                          ₹{Number(activeInvoice.totalPaid || 2000).toFixed(2)}
                        </td>
                      </tr>
                    )}
                    <tr style={{ borderBottom: '1px solid #cbd5e1', fontWeight: 700 }}>
                      <td style={{ padding: '10px 14px', color: '#0f172a' }}>
                        Payment Mode ({activeInvoice.paymentMode || 'UPI'})
                      </td>
                      <td style={{ padding: '10px 14px', textAlign: 'right', color: '#0f172a', fontWeight: 800 }}>
                        ₹{Number(activeInvoice.totalPaid || 2000).toFixed(2)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* 6. Footer Meta & Disclaimer */}
              <div style={{ fontSize: '11px', color: '#64748b', lineHeight: 1.6, marginBottom: '20px', marginTop: '14px' }}>
                <div>Payment ID: WALKIN_{(activeInvoice.paymentMode || 'UPI').toUpperCase().replace(/\s+/g, '_')}</div>
                <div>Issued At: {new Date().toLocaleDateString('en-GB')}, {new Date().toLocaleTimeString()}</div>
                <div style={{ textAlign: 'center', marginTop: '12px', color: '#94a3b8', fontSize: '10.5px' }}>
                  This is a computer generated bill.
                </div>
              </div>
            </div>

            {/* 7. Bottom Lime Green Banner Bar */}
            <div style={{
              backgroundColor: '#99cc00', color: '#ffffff', padding: '10px 16px', borderRadius: '5px',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px',
              fontSize: '10.5px', fontWeight: 800, flexWrap: 'wrap', marginTop: '24px'
            }}>
              <div style={{ whiteSpace: 'nowrap' }}>📞 9069176176</div>
              <div style={{ whiteSpace: 'nowrap' }}>✉️ support@spiritualhomeo.com</div>
              <div style={{ whiteSpace: 'nowrap' }}>🌐 www.spiritualhomeoclinic.com</div>
              <div style={{ whiteSpace: 'nowrap' }}>📍 {(activeInvoice.branch || 'KPHB').toUpperCase()}</div>
            </div>
          </div>

          {/* Bottom Actions Bar (Screen Only) */}
          <div className="no-print" style={{ padding: '16px 24px', borderTop: '1px solid #e2e8f0', display: 'flex', gap: '10px', justifyContent: 'flex-end', flexWrap: 'wrap', backgroundColor: '#ffffff' }}>
            <button onClick={onClose} style={{ padding: '10px 18px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#fff', color: '#475569', fontWeight: 700, cursor: 'pointer' }}>
              Close
            </button>
            <button
              onClick={async () => {
                const element = document.getElementById('printable-invoice-receipt');
                const invCode = activeInvoice?.id ? String(activeInvoice.id).substring(0, 6).toUpperCase() : 'RECEIPT';
                const fileName = `SPH_Invoice_INV-${invCode}_${(patientName || 'Patient').replace(/\s+/g, '_')}.pdf`;
                const pPhone = (patientPhone || '').replace(/\D/g, '').slice(-10);

                const text = `*SPIRITUAL HOMEOPATHY - PAYMENT RECEIPT*\nInvoice #: INV-${invCode}\nPatient: ${patientName}\nTotal Paid: ₹${Number(activeInvoice?.totalPaid || 2000).toFixed(2)}`;

                const generateBlob = async (): Promise<Blob> => {
                  if ((window as any).html2pdf) {
                    return await (window as any).html2pdf().set({
                      margin: [8, 8, 8, 8],
                      filename: fileName,
                      image: { type: 'jpeg', quality: 0.98 },
                      html2canvas: { scale: 2, useCORS: true, logging: false },
                      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
                    }).from(element).output('blob');
                  } else {
                    return new Promise((resolve) => {
                      const script = document.createElement('script');
                      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js';
                      script.onload = async () => {
                        const blob = await (window as any).html2pdf().set({
                          margin: [8, 8, 8, 8],
                          filename: fileName,
                          image: { type: 'jpeg', quality: 0.98 },
                          html2canvas: { scale: 2, useCORS: true, logging: false },
                          jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
                        }).from(element).output('blob');
                        resolve(blob);
                      };
                      document.body.appendChild(script);
                    });
                  }
                };

                try {
                  const pdfBlob = await generateBlob();
                  const pdfFile = new File([pdfBlob], fileName, { type: 'application/pdf' });

                  // 1. Try Native Web Share API with File Attachment (Mobile Web / Native Share)
                  if (navigator.canShare && navigator.canShare({ files: [pdfFile] })) {
                    await navigator.share({
                      files: [pdfFile],
                      title: `SPH Payment Receipt - ${patientName}`,
                      text: text,
                    });
                    return;
                  }

                  // 2. Desktop Fallback: Open WhatsApp directly to patient number + Download PDF file
                  const waUrl = pPhone ? `https://api.whatsapp.com/send?phone=91${pPhone}&text=${encodeURIComponent(text)}` : `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
                  window.open(waUrl, '_blank');

                  const blobUrl = URL.createObjectURL(pdfBlob);
                  const a = document.createElement('a');
                  a.href = blobUrl;
                  a.download = fileName;
                  document.body.appendChild(a);
                  a.click();
                  document.body.removeChild(a);
                  URL.revokeObjectURL(blobUrl);
                } catch (err) {
                  console.error('Error generating or sharing PDF:', err);
                }
              }}
              style={{ padding: '10px 18px', borderRadius: '8px', border: 'none', background: '#16a34a', color: '#fff', fontWeight: 800, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px', boxShadow: '0 4px 12px rgba(22, 163, 74, 0.3)' }}
            >
              <MessageCircle size={16} /> Share PDF Invoice
            </button>
            <button 
              onClick={() => {
                const element = document.getElementById('printable-invoice-receipt');
                const invCode = activeInvoice?.id ? String(activeInvoice.id).substring(0, 6).toUpperCase() : 'RECEIPT';
                const fileName = `SPH_Invoice_INV-${invCode}_${(patientName || 'Patient').replace(/\s+/g, '_')}.pdf`;

                if ((window as any).html2pdf) {
                  (window as any).html2pdf().set({
                    margin: [8, 8, 8, 8],
                    filename: fileName,
                    image: { type: 'jpeg', quality: 0.98 },
                    html2canvas: { scale: 2, useCORS: true, logging: false },
                    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
                  }).from(element).save();
                } else {
                  const script = document.createElement('script');
                  script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js';
                  script.onload = () => {
                    (window as any).html2pdf().set({
                      margin: [8, 8, 8, 8],
                      filename: fileName,
                      image: { type: 'jpeg', quality: 0.98 },
                      html2canvas: { scale: 2, useCORS: true, logging: false },
                      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
                    }).from(element).save();
                  };
                  document.body.appendChild(script);
                }
              }} 
              style={{ padding: '10px 20px', borderRadius: '8px', border: 'none', background: '#258ec8', color: '#fff', fontWeight: 800, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px', boxShadow: '0 4px 12px rgba(37, 142, 200, 0.3)' }}
            >
              📥 Download PDF Receipt
            </button>
            <button 
              onClick={() => {
                const printWindow = window.open('', '_blank', 'width=900,height=1000');
                if (!printWindow) return alert('Popup blocked! Please allow popups.');

                const invCode = activeInvoice?.id ? String(activeInvoice.id).substring(0, 6).toUpperCase() : 'RECEIPT';
                const totalAmount = Number(activeInvoice.totalPaid || activeInvoice.targetAmount || 2000).toFixed(2);
                const docName = activeInvoice.doctorName || activeInvoice.doctor || 'Dr. Prashanth K Vaidya';
                const branchName = activeInvoice.branch || 'KPHB Branch';
                const currentDate = activeInvoice.appointmentDate || activeInvoice.date || new Date().toLocaleDateString('en-GB');

                const htmlContent = `
                  <!DOCTYPE html>
                  <html>
                  <head>
                    <title>Invoice - INV-${invCode}</title>
                    <style>
                      body { font-family: Arial, sans-serif; padding: 30px; color: #1e293b; margin: 0; background: #fff; }
                      .header { display: flex; justify-content: space-between; border-bottom: 2px solid #298FCA; padding-bottom: 15px; }
                      .brand-title { color: #0284c7; font-size: 20px; font-weight: 900; text-transform: uppercase; margin: 0; }
                      .brand-sub { font-size: 11px; color: #475569; margin-top: 2px; }
                      .title { font-size: 18px; font-weight: bold; color: #1e293b; text-transform: uppercase; margin-top: 20px; }
                      .amount-box { background: #f0fdf4; border: 1.5px dashed #22c55e; padding: 15px; margin: 20px 0; border-radius: 8px; display: flex; justify-content: space-between; align-items: center; }
                      .table { width: 100%; border-collapse: collapse; margin-top: 15px; }
                      .table th, .table td { padding: 10px; border-bottom: 1px solid #e2e8f0; text-align: left; }
                      .footer-bar { background: #99cc00; color: #fff; padding: 10px; border-radius: 4px; display: flex; justify-content: space-between; font-size: 11px; margin-top: 30px; }
                      @media print { body { padding: 0; } }
                    </style>
                  </head>
                  <body>
                    <div class="header">
                      <div>
                        <h2 class="brand-title">Spiritual Homeopathy</h2>
                        <div class="brand-sub">Multispecialty Homeopathy Clinic</div>
                      </div>
                      <div style="text-align: right;">
                        <div>www.spiritualhomeoclinic.com</div>
                        <div style="color: #64748b; font-size: 12px;">${currentDate}</div>
                      </div>
                    </div>
                    <h3 class="title">Payment Receipt</h3>
                    <p><strong>Patient:</strong> ${patientName} | <strong>Phone:</strong> +91 ${patientPhone}</p>
                    <p><strong>Doctor:</strong> ${docName} | <strong>Branch:</strong> ${branchName}</p>
                    <div class="amount-box">
                      <h3 style="margin: 0;">Total Amount Paid: ₹${totalAmount}</h3>
                      <span style="color: #22c55e; font-weight: bold; font-size: 16px;">PAID ✓</span>
                    </div>
                    <table class="table">
                      <thead>
                        <tr>
                          <th>Description</th>
                          <th style="text-align: right;">Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        ${Number(activeInvoice.medicineFee) > 0 ? `<tr><td>Medicine Fee</td><td style="text-align: right;">₹${Number(activeInvoice.medicineFee).toFixed(2)}</td></tr>` : ''}
                        ${Number(activeInvoice.consultationFee) > 0 ? `<tr><td>Consultation Fee</td><td style="text-align: right;">₹${Number(activeInvoice.consultationFee).toFixed(2)}</td></tr>` : ''}
                        ${Number(activeInvoice.dietFee) > 0 ? `<tr><td>Diet & Nutrition Fee</td><td style="text-align: right;">₹${Number(activeInvoice.dietFee).toFixed(2)}</td></tr>` : ''}
                        ${(!activeInvoice.medicineFee && !activeInvoice.consultationFee && !activeInvoice.dietFee) ? `<tr><td>Medicine & Consultation Fee</td><td style="text-align: right;">₹${totalAmount}</td></tr>` : ''}
                        <tr style="font-weight: bold;"><td>Payment Mode (${activeInvoice.paymentMode || 'UPI'})</td><td style="text-align: right;">₹${totalAmount}</td></tr>
                      </tbody>
                    </table>
                    <div class="footer-bar">
                      <div>📞 9069176176</div>
                      <div>✉️ support@spiritualhomeo.com</div>
                      <div>🌐 www.spiritualhomeoclinic.com</div>
                      <div>📍 ${branchName.toUpperCase()}</div>
                    </div>
                    <script>
                      window.onload = function() {
                        window.print();
                      }
                    </script>
                  </body>
                  </html>
                `;

                printWindow.document.write(htmlContent);
                printWindow.document.close();
              }} 
              style={{ padding: '10px 20px', borderRadius: '8px', border: 'none', background: '#258ec8', color: '#fff', fontWeight: 800, cursor: 'pointer', boxShadow: '0 4px 12px rgba(37, 142, 200, 0.3)' }}
            >
              🖨️ Print / Save PDF
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default CollectFeeCheckoutModal;
