import React, { useState, useEffect } from 'react';
import {
  Modal, View, Text, StyleSheet, TouchableOpacity,
  TextInput, ScrollView, Alert, ActivityIndicator, SafeAreaView, Linking, Image, Share, NativeModules
} from 'react-native';
import { Ionicons, Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { db, sendInvoiceWhatsAppNotification } from '@app/shared';
import { doc, updateDoc } from 'firebase/firestore';
import { SH_LOGO_BASE64 } from '../utils/logoBase64';
export interface AppointmentPaymentModalProps {
  visible: boolean;
  onDismiss: () => void;
  selectedPatientForPayment: any;
  includeConsultation?: boolean;
  setIncludeConsultation?: (val: boolean) => void;
  onPaymentSuccess?: (paymentData: any) => void;
}
export const AppointmentPaymentModal: React.FC<AppointmentPaymentModalProps> = ({
  visible,
  onDismiss,
  selectedPatientForPayment,
  includeConsultation = true,
  setIncludeConsultation,
  onPaymentSuccess,
}) => {
  const [showPatientDetails, setShowPatientDetails] = useState(false);
  const [targetAmount, setTargetAmount] = useState<number>(0);
  const [paymentTypePreset, setPaymentTypePreset] = useState<'consultation' | 'consultation_med' | 'split' | 'package'>('consultation');

  // Fee Checkbox Selection States
  const [includeConsultFee, setIncludeConsultFee] = useState<boolean>(true);
  const [includeMedicineFee, setIncludeMedicineFee] = useState<boolean>(false);
  const [includeDietFee, setIncludeDietFee] = useState<boolean>(false);
  const [includeOtherCharges, setIncludeOtherCharges] = useState<boolean>(false);

  // Fee Amount Inputs
  const [consultFeeInput, setConsultFeeInput] = useState<number>(0);
  const [medicineFeeInput, setMedicineFeeInput] = useState<number>(0);
  const [dietFeeInput, setDietFeeInput] = useState<number>(0);
  const [otherChargesInput, setOtherChargesInput] = useState<number>(0);
  const [discountInput, setDiscountInput] = useState<number>(0);
  const [showDiscountInput, setShowDiscountInput] = useState(false);

  // Payment Mode
  const [selectedPaymentMode, setSelectedPaymentMode] = useState<string>('Cash');
  const [splitCash, setSplitCash] = useState<number>(0);
  const [splitUpi, setSplitUpi] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isAlreadyPaid = selectedPatientForPayment?.paymentStatus === 'paid' || selectedPatientForPayment?.status === 'completed';
  const [invoiceApp, setInvoiceApp] = useState<any | null>(() => (
    selectedPatientForPayment && isAlreadyPaid ? selectedPatientForPayment : null
  ));
  const activeInvoice = invoiceApp || (isAlreadyPaid ? selectedPatientForPayment : null);

  useEffect(() => {
    if (selectedPatientForPayment) {
      const mFee = Number(selectedPatientForPayment.pharmacyFee || selectedPatientForPayment.medicineFeeRequested || selectedPatientForPayment.medicineFee) || 0;
      const cFee = mFee > 0 ? 0 : (selectedPatientForPayment.consultationFee !== undefined && selectedPatientForPayment.consultationFee !== null ? Number(selectedPatientForPayment.consultationFee) : 0);
      const dFee = Number(selectedPatientForPayment.dietFee) || 0;
      const oFee = Number(selectedPatientForPayment.otherCharges) || 0;
      const disc = Number(selectedPatientForPayment.discount) || 0;

      const givenTarget = selectedPatientForPayment.targetAmount ?? selectedPatientForPayment.target_amount ?? selectedPatientForPayment.totalAmount;
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
      if (selectedPatientForPayment.paymentStatus === 'paid' || selectedPatientForPayment.status === 'completed') {
        setInvoiceApp(selectedPatientForPayment);
      } else {
        setInvoiceApp(null);
      }
    }
  }, [selectedPatientForPayment, visible]);

  // Handle Preset Pills
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
    if (!selectedPatientForPayment) return;
    setIsSubmitting(true);

    const paymentModeText =
      selectedPaymentMode === 'Split'
        ? `Split (Cash ₹${splitCash} + UPI ₹${splitUpi})`
        : selectedPaymentMode;

    const payload = {
      paymentStatus: 'paid',
      paymentPending: false,
      paymentCollectedAt: new Date().toISOString(),
      consultationFee: activeConsultFee,
      medicineFee: activeMedicineFee,
      dietFee: activeDietFee,
      otherCharges: activeOtherCharges,
      discount: discountInput,
      totalPaid: totalAmountDue,
      paymentMode: paymentModeText,
      status: 'completed',
      updatedAt: new Date().toISOString()
    };

    try {
      if (db && selectedPatientForPayment.id) {
        const docId = selectedPatientForPayment.id;
        await updateDoc(doc(db, 'appointments', docId), payload).catch(() => {});
        await updateDoc(doc(db, 'allpatients', docId), payload).catch(() => {});
        await updateDoc(doc(db, 'patients', docId), payload).catch(() => {});
      }

      // Trigger Leonas WhatsApp Invoice / Payment Receipt Notification
      sendInvoiceWhatsAppNotification({
        patientName: selectedPatientForPayment.patientName || selectedPatientForPayment.name || 'Patient',
        phone: selectedPatientForPayment.phone || selectedPatientForPayment.phoneNumber || '',
        invoiceId: selectedPatientForPayment.id,
        totalPaid: totalAmountDue,
        paymentMode: paymentModeText,
        branch: selectedPatientForPayment.branch || 'KPHB'
      }).catch(err => console.error('WhatsApp invoice notification error:', err));

      const completedInvoice = { ...selectedPatientForPayment, ...payload };
      if (onPaymentSuccess) {
        onPaymentSuccess(completedInvoice);
      }

      setInvoiceApp(completedInvoice);
    } catch (err) {
      console.error("Error completing checkout:", err);
      Alert.alert("Error", "Failed to complete payment checkout. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!visible || !selectedPatientForPayment) return null;

  const patientName = selectedPatientForPayment.patientName || selectedPatientForPayment.name || 'Patient';
  const patientPhone = selectedPatientForPayment.phone || selectedPatientForPayment.phoneNumber || 'N/A';

  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={onDismiss}
    >
      {activeInvoice ? (
        <SafeAreaView style={styles.fullScreenContainer}>
          {/* Header Actions (Screen Only) */}
          <View style={{ paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f1f5f9', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#ffffff' }}>
            <TouchableOpacity onPress={onDismiss} style={{ padding: 4 }}>
              <Ionicons name="arrow-back" size={24} color="#0f172a" />
            </TouchableOpacity>
            <Text style={{ fontSize: 17, fontWeight: '800', color: '#0f172a' }}>Payment Receipt</Text>
            <TouchableOpacity onPress={onDismiss} style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="close" size={18} color="#0f172a" />
            </TouchableOpacity>
          </View>

          {/* Printable Mobile Receipt View (1:1 with Screenshot) */}
          <ScrollView style={{ flex: 1, backgroundColor: '#ffffff' }} contentContainerStyle={{ padding: 20 }}>
            {/* 1. Header Bar */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 6 }}>
              <Image source={require('../assets/sh_logo.png')} style={{ width: 150, height: 48, resizeMode: 'contain' }} />
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={{ fontSize: 11, fontWeight: '700', color: '#334155' }}>www.spiritualhomeoclinic.com</Text>
                <Text style={{ fontSize: 10, color: '#64748b', marginTop: 1 }}>support@spiritualhomeo.com</Text>
              </View>
            </View>

            {/* Lime Green Divider Line */}
            <View style={{ height: 4, backgroundColor: '#99cc00', width: '100%', marginVertical: 10, borderRadius: 2 }} />

            {/* 2. PAYMENT RECEIPT Header & Receipt Badge */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
              <Text style={{ fontSize: 18, fontWeight: '800', color: '#0f172a', letterSpacing: 0.4 }}>
                PAYMENT RECEIPT
              </Text>
              <View style={{ backgroundColor: '#e0f2fe', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 14 }}>
                <Text style={{ color: '#0284c7', fontSize: 10, fontWeight: '800' }}>RECEIPT</Text>
              </View>
            </View>

            {/* 3. PATIENT DETAILS Section */}
            <View style={{ marginBottom: 18 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10, gap: 6 }}>
                <Text style={{ fontSize: 10, fontWeight: '800', color: '#64748b', letterSpacing: 0.5 }}>PATIENT DETAILS</Text>
                <View style={{ flex: 1, height: 1, backgroundColor: '#e2e8f0' }} />
              </View>

              <View style={{ gap: 10 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: '#f1f5f9', paddingBottom: 6 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 9.5, fontWeight: '700', color: '#64748b' }}>PATIENT NAME</Text>
                    <Text style={{ fontSize: 13, fontWeight: '800', color: '#0f172a', marginTop: 1 }}>{patientName}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 9.5, fontWeight: '700', color: '#64748b' }}>PHONE NUMBER</Text>
                    <Text style={{ fontSize: 13, fontWeight: '800', color: '#0f172a', marginTop: 1 }}>+91 {patientPhone}</Text>
                  </View>
                </View>

                <View style={{ flexDirection: 'row', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: '#f1f5f9', paddingBottom: 6 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 9.5, fontWeight: '700', color: '#64748b' }}>CONSULTANT DOCTOR</Text>
                    <Text style={{ fontSize: 13, fontWeight: '800', color: '#0f172a', marginTop: 1 }}>{activeInvoice.doctorName || activeInvoice.doctor || 'Dr. Prashanth k vaidya'}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 9.5, fontWeight: '700', color: '#64748b' }}>CLINIC BRANCH</Text>
                    <Text style={{ fontSize: 13, fontWeight: '800', color: '#0f172a', marginTop: 1 }}>{activeInvoice.branch || 'Kphb'}</Text>
                  </View>
                </View>

                <View style={{ flexDirection: 'row', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: '#f1f5f9', paddingBottom: 6 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 9.5, fontWeight: '700', color: '#64748b' }}>APPOINTMENT SCHEDULE</Text>
                    <Text style={{ fontSize: 13, fontWeight: '800', color: '#0f172a', marginTop: 1 }}>
                      {activeInvoice.appointmentDate || activeInvoice.date || new Date().toLocaleDateString('en-GB')} at {activeInvoice.timeSlot || activeInvoice.time || '01:00 PM'}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 9.5, fontWeight: '700', color: '#64748b' }}>SPECIALTY</Text>
                    <Text style={{ fontSize: 13, fontWeight: '800', color: '#0f172a', marginTop: 1 }}>General Homeopathy</Text>
                  </View>
                </View>
              </View>
            </View>

            {/* 4. PAYMENT INFORMATION Section */}
            <View style={{ marginBottom: 18 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10, gap: 6 }}>
                <Text style={{ fontSize: 10, fontWeight: '800', color: '#64748b', letterSpacing: 0.5 }}>PAYMENT INFORMATION</Text>
                <View style={{ flex: 1, height: 1, backgroundColor: '#e2e8f0' }} />
              </View>

              <View style={{
                backgroundColor: '#e6f7ed', borderWidth: 1.5, borderColor: '#86efac', borderStyle: 'dashed', borderRadius: 14,
                padding: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'
              }}>
                <View>
                  <Text style={{ fontSize: 10, fontWeight: '800', color: '#166534' }}>TOTAL AMOUNT PAID</Text>
                  <Text style={{ fontSize: 28, fontWeight: '900', color: '#15803d', marginTop: 2 }}>
                    ₹{Number(activeInvoice.totalPaid || activeInvoice.targetAmount || 2000).toFixed(2)}
                  </Text>
                </View>

                <View style={{ alignItems: 'flex-end' }}>
                  <View style={{ backgroundColor: '#22c55e', paddingHorizontal: 14, paddingVertical: 5, borderRadius: 16 }}>
                    <Text style={{ color: '#ffffff', fontSize: 12, fontWeight: '800' }}>PAID ✓</Text>
                  </View>
                  <Text style={{ fontSize: 10, fontWeight: '800', color: '#166534', marginTop: 4, textTransform: 'uppercase' }}>
                    VIA {activeInvoice.paymentMode || 'UPI'}
                  </Text>
                </View>
              </View>
            </View>

            {/* 5. FEE BREAKDOWN Section */}
            <View style={{ marginBottom: 18 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10, gap: 6 }}>
                <Text style={{ fontSize: 10, fontWeight: '800', color: '#64748b', letterSpacing: 0.5 }}>FEE BREAKDOWN</Text>
                <View style={{ flex: 1, height: 1, backgroundColor: '#e2e8f0' }} />
              </View>

              <View style={{ borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 10, overflow: 'hidden' }}>
                <View style={{ flexDirection: 'row', backgroundColor: '#f8fafc', paddingHorizontal: 12, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#e2e8f0' }}>
                  <Text style={{ flex: 1, fontSize: 10, fontWeight: '800', color: '#64748b' }}>DESCRIPTION</Text>
                  <Text style={{ fontSize: 10, fontWeight: '800', color: '#64748b' }}>AMOUNT (₹)</Text>
                </View>

                {Number(activeInvoice.medicineFee) > 0 && (
                  <View style={{ flexDirection: 'row', paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' }}>
                    <Text style={{ flex: 1, fontSize: 12, color: '#334155', fontWeight: '500' }}>Medicine Fee</Text>
                    <Text style={{ fontSize: 12, fontWeight: '700', color: '#0f172a' }}>₹{Number(activeInvoice.medicineFee).toFixed(2)}</Text>
                  </View>
                )}
                {Number(activeInvoice.consultationFee) > 0 && (
                  <View style={{ flexDirection: 'row', paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' }}>
                    <Text style={{ flex: 1, fontSize: 12, color: '#334155', fontWeight: '500' }}>Consultation Fee</Text>
                    <Text style={{ fontSize: 12, fontWeight: '700', color: '#0f172a' }}>₹{Number(activeInvoice.consultationFee).toFixed(2)}</Text>
                  </View>
                )}
                {Number(activeInvoice.dietFee) > 0 && (
                  <View style={{ flexDirection: 'row', paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' }}>
                    <Text style={{ flex: 1, fontSize: 12, color: '#334155', fontWeight: '500' }}>Diet & Nutrition Fee</Text>
                    <Text style={{ fontSize: 12, fontWeight: '700', color: '#0f172a' }}>₹{Number(activeInvoice.dietFee).toFixed(2)}</Text>
                  </View>
                )}
                {Number(activeInvoice.otherCharges) > 0 && (
                  <View style={{ flexDirection: 'row', paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' }}>
                    <Text style={{ flex: 1, fontSize: 12, color: '#334155', fontWeight: '500' }}>Other Charges</Text>
                    <Text style={{ fontSize: 12, fontWeight: '700', color: '#0f172a' }}>₹{Number(activeInvoice.otherCharges).toFixed(2)}</Text>
                  </View>
                )}
                {Number(activeInvoice.discount) > 0 && (
                  <View style={{ flexDirection: 'row', paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' }}>
                    <Text style={{ flex: 1, fontSize: 12, color: '#ef4444', fontWeight: '500' }}>Discount Applied</Text>
                    <Text style={{ fontSize: 12, fontWeight: '700', color: '#ef4444' }}>- ₹{Number(activeInvoice.discount).toFixed(2)}</Text>
                  </View>
                )}
                {(!activeInvoice.medicineFee && !activeInvoice.consultationFee && !activeInvoice.dietFee && !activeInvoice.otherCharges) && (
                  <View style={{ flexDirection: 'row', paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' }}>
                    <Text style={{ flex: 1, fontSize: 12, color: '#334155', fontWeight: '500' }}>Medicine & Consultation Fee</Text>
                    <Text style={{ fontSize: 12, fontWeight: '700', color: '#0f172a' }}>₹{Number(activeInvoice.totalPaid || 2000).toFixed(2)}</Text>
                  </View>
                )}

                <View style={{ flexDirection: 'row', paddingHorizontal: 12, paddingVertical: 11, backgroundColor: '#ffffff' }}>
                  <Text style={{ flex: 1, fontSize: 12, fontWeight: '700', color: '#0f172a' }}>Payment Mode ({activeInvoice.paymentMode || 'UPI'})</Text>
                  <Text style={{ fontSize: 13, fontWeight: '800', color: '#0f172a' }}>₹{Number(activeInvoice.totalPaid || 2000).toFixed(2)}</Text>
                </View>
              </View>
            </View>

            {/* 6. Footer Meta & Disclaimer */}
            <View style={{ marginBottom: 16 }}>
              <Text style={{ fontSize: 10, color: '#94a3b8' }}>Payment ID: WALKIN_{(activeInvoice.paymentMode || 'UPI').toUpperCase().replace(/\s+/g, '_')}</Text>
              <Text style={{ fontSize: 10, color: '#94a3b8', marginTop: 2 }}>Issued At: {new Date().toLocaleDateString('en-GB')}, {new Date().toLocaleTimeString()}</Text>
              <Text style={{ fontSize: 10, color: '#cbd5e1', textAlign: 'center', marginTop: 10 }}>This is a computer generated bill.</Text>
            </View>

            {/* 7. Bottom Lime Green Banner Bar */}
            <View style={{
              backgroundColor: '#99cc00', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 4,
              flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'
            }}>
              <Text style={{ color: '#ffffff', fontSize: 10, fontWeight: '700' }}>📞 9069176176</Text>
              <Text style={{ color: '#ffffff', fontSize: 10, fontWeight: '700' }}>✉️ support@spiritualhomeo.com</Text>
              <Text style={{ color: '#ffffff', fontSize: 10, fontWeight: '700' }}>🌐 spiritualhomeoclinic.com</Text>
              <Text style={{ color: '#ffffff', fontSize: 10, fontWeight: '700' }}>📍 {(activeInvoice.branch || 'KPHB').toUpperCase()}</Text>
            </View>
          </ScrollView>

          {/* Action Buttons Footer */}
          <View style={{ paddingHorizontal: 16, paddingVertical: 12, borderTopWidth: 1, borderTopColor: '#e2e8f0', gap: 8, backgroundColor: '#ffffff' }}>
            <TouchableOpacity
              style={{ backgroundColor: '#16a34a', paddingVertical: 12, borderRadius: 10, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 6 }}
              onPress={async () => {
                const htmlContent = `
                  <!DOCTYPE html>
                  <html>
                  <head>
                    <meta charset="utf-8">
                    <style>
                      @page { size: A4 portrait; margin: 0; }
                      body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; padding: 28px 40px; color: #0f172a; margin: 0; background: #fff; line-height: 1.5; box-sizing: border-box; }
                      .header { display: flex; justify-content: space-between; align-items: center; padding-bottom: 10px; margin-bottom: 4px; }
                      .brand-title { color: #0284c7; font-size: 22px; font-weight: 900; letter-spacing: 0.5px; text-transform: uppercase; }
                      .brand-sub { font-size: 12px; color: #475569; margin-top: 3px; font-weight: 600; }
                      .lime-bar { height: 5px; background: #99cc00; width: 100%; margin: 10px 0 20px 0; border-radius: 3px; }
                      .title-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
                      .receipt-title { font-size: 20px; font-weight: 900; color: #0f172a; text-transform: uppercase; margin: 0; letter-spacing: 0.5px; }
                      .receipt-badge { background: #e0f2fe; color: #0284c7; padding: 5px 16px; border-radius: 20px; font-weight: 800; font-size: 11.5px; letter-spacing: 0.5px; }
                      .section-head { font-size: 11.5px; font-weight: 800; color: #475569; margin-bottom: 12px; letter-spacing: 0.8px; text-transform: uppercase; display: flex; align-items: center; gap: 8px; }
                      .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px 36px; margin-bottom: 22px; font-size: 13.5px; }
                      .grid-cell { border-bottom: 1px solid #e2e8f0; padding-bottom: 6px; }
                      .label { font-size: 10.5px; font-weight: 700; color: #64748b; text-transform: uppercase; margin-bottom: 3px; letter-spacing: 0.4px; }
                      .val { font-weight: 800; color: #0f172a; font-size: 14px; }
                      .pay-box { background: #e6f7ed; border: 2px dashed #86efac; border-radius: 14px; padding: 18px 24px; display: flex; justify-content: space-between; align-items: center; margin-bottom: 22px; }
                      .pay-amt { font-size: 32px; font-weight: 900; color: #15803d; margin-top: 3px; }
                      .paid-badge { background: #22c55e; color: #fff; padding: 6px 18px; border-radius: 20px; font-weight: 800; font-size: 13px; display: inline-block; letter-spacing: 0.5px; }
                      table { width: 100%; border-collapse: collapse; margin-bottom: 22px; font-size: 13.5px; }
                      th { background: #f8fafc; padding: 10px 14px; text-align: left; font-size: 11.5px; font-weight: 800; border-bottom: 1.5px solid #cbd5e1; color: #475569; letter-spacing: 0.4px; }
                      td { padding: 10px 14px; border-bottom: 1px solid #e2e8f0; font-weight: 600; }
                      .meta-info { font-size: 11px; color: #64748b; line-height: 1.6; margin-bottom: 20px; margin-top: 14px; }
                      .footer-bar { background: #99cc00; color: #fff; padding: 10px 16px; border-radius: 5px; display: flex; justify-content: space-between; align-items: center; font-size: 10.5px; font-weight: 800; margin-top: 24px; flex-wrap: wrap; gap: 8px; }
                    </style>
                  </head>
                  <body>
                    <div class="header">
                      <div>
                        <img src="data:image/png;base64,${SH_LOGO_BASE64}" width="260" height="52" style="height: 52px; width: 260px; max-width: 280px; object-fit: contain; display: block;" alt="SPIRITUAL HOMEOPATHY" />
                      </div>
                      <div style="text-align: right; font-size: 11px; font-weight: 700; color: #334155; line-height: 1.4;">
                        <div>www.spiritualhomeoclinic.com</div>
                        <div style="color: #64748b; font-weight: 500;">support@spiritualhomeo.com</div>
                      </div>
                    </div>
                    <div class="lime-bar"></div>
                    <div class="title-row">
                      <h1 class="receipt-title">PAYMENT RECEIPT</h1>
                      <span class="receipt-badge">RECEIPT</span>
                    </div>
                    <div class="section-head">PATIENT DETAILS</div>
                    <div class="grid">
                      <div class="grid-cell"><div class="label">PATIENT NAME</div><div class="val">${patientName}</div></div>
                      <div class="grid-cell"><div class="label">PHONE NUMBER</div><div class="val">+91 ${patientPhone}</div></div>
                      <div class="grid-cell"><div class="label">CONSULTANT DOCTOR</div><div class="val">${activeInvoice?.doctorName || activeInvoice?.doctor || 'Dr. Prashanth k vaidya'}</div></div>
                      <div class="grid-cell"><div class="label">CLINIC BRANCH</div><div class="val">${activeInvoice?.branch || 'Kphb'}</div></div>
                      <div class="grid-cell"><div class="label">APPOINTMENT SCHEDULE</div><div class="val">${activeInvoice?.appointmentDate || activeInvoice?.date || new Date().toLocaleDateString('en-GB')} at ${activeInvoice?.timeSlot || activeInvoice?.time || '01:00 PM'}</div></div>
                      <div class="grid-cell"><div class="label">SPECIALTY</div><div class="val">General Homeopathy</div></div>
                    </div>
                    <div class="section-head">PAYMENT INFORMATION</div>
                    <div class="pay-box">
                      <div>
                        <div class="label" style="color: #166534;">TOTAL AMOUNT PAID</div>
                        <div class="pay-amt">₹${Number(activeInvoice?.totalPaid || activeInvoice?.targetAmount || 2000).toFixed(2)}</div>
                      </div>
                      <div style="text-align: right;">
                        <span class="paid-badge">PAID ✓</span>
                        <div style="font-size: 11px; font-weight: 800; color: #166534; margin-top: 6px; text-transform: uppercase;">VIA ${activeInvoice?.paymentMode || 'UPI'}</div>
                      </div>
                    </div>
                    <div class="section-head">FEE BREAKDOWN</div>
                    <table>
                      <thead><tr><th>DESCRIPTION</th><th style="text-align: right;">AMOUNT (₹)</th></tr></thead>
                      <tbody>
                        ${Number(activeInvoice?.medicineFee) > 0 ? `<tr><td>Medicine Fee</td><td style="text-align: right; font-weight: 700;">₹${Number(activeInvoice?.medicineFee).toFixed(2)}</td></tr>` : ''}
                        ${Number(activeInvoice?.consultationFee) > 0 ? `<tr><td>Consultation Fee</td><td style="text-align: right; font-weight: 700;">₹${Number(activeInvoice?.consultationFee).toFixed(2)}</td></tr>` : ''}
                        ${Number(activeInvoice?.dietFee) > 0 ? `<tr><td>Diet & Nutrition Fee</td><td style="text-align: right; font-weight: 700;">₹${Number(activeInvoice?.dietFee).toFixed(2)}</td></tr>` : ''}
                        ${Number(activeInvoice?.otherCharges) > 0 ? `<tr><td>Other Charges</td><td style="text-align: right; font-weight: 700;">₹${Number(activeInvoice?.otherCharges).toFixed(2)}</td></tr>` : ''}
                        ${Number(activeInvoice?.discount) > 0 ? `<tr style="color: #ef4444;"><td>Discount Applied</td><td style="text-align: right; font-weight: 700;">- ₹${Number(activeInvoice?.discount).toFixed(2)}</td></tr>` : ''}
                        ${(!activeInvoice?.medicineFee && !activeInvoice?.consultationFee && !activeInvoice?.dietFee && !activeInvoice?.otherCharges) ? `<tr><td>Medicine & Consultation Fee</td><td style="text-align: right; font-weight: 700;">₹${Number(activeInvoice?.totalPaid || 2000).toFixed(2)}</td></tr>` : ''}
                        <tr style="font-weight: 800;"><td>Payment Mode (${activeInvoice?.paymentMode || 'UPI'})</td><td style="text-align: right;">₹${Number(activeInvoice?.totalPaid || 2000).toFixed(2)}</td></tr>
                      </tbody>
                    </table>
                    <div class="meta-info">
                      <div>Payment ID: WALKIN_${(activeInvoice?.paymentMode || 'UPI').toUpperCase().replace(/\s+/g, '_')}</div>
                      <div>Issued At: ${new Date().toLocaleDateString('en-GB')}, ${new Date().toLocaleTimeString()}</div>
                      <div style="text-align: center; margin-top: 12px; color: #94a3b8;">This is a computer generated bill.</div>
                    </div>
                    <div class="footer-bar">
                      <div style="white-space: nowrap;">📞 9069176176</div>
                      <div style="white-space: nowrap;">✉️ support@spiritualhomeo.com</div>
                      <div style="white-space: nowrap;">🌐 www.spiritualhomeoclinic.com</div>
                      <div style="white-space: nowrap;">📍 ${(activeInvoice?.branch || 'KPHB').toUpperCase()}</div>
                    </div>
                  </body>
                  </html>
                `;
                try {
                  let PrintModule: any = null;
                  let SharingModule: any = null;
                  try { PrintModule = require('expo-print'); } catch (e) {}
                  try { SharingModule = require('expo-sharing'); } catch (e) {}
                  if (PrintModule && typeof PrintModule.printToFileAsync === 'function') {
                    const pdfFile = await PrintModule.printToFileAsync({ html: htmlContent });
                    const cleanPhone = (patientPhone || '').replace(/\D/g, '').slice(-10);
                    const phoneDisplay = cleanPhone ? ` (+91 ${cleanPhone})` : '';

                    if (SharingModule && typeof SharingModule.shareAsync === 'function') {
                      await SharingModule.shareAsync(pdfFile.uri, {
                        mimeType: 'application/pdf',
                        dialogTitle: `Share Invoice PDF to ${patientName}${phoneDisplay}`,
                        UTI: 'com.adobe.pdf',
                      });
                      return;
                    } else {
                      await Share.share({
                        url: pdfFile.uri,
                        title: `Payment Receipt PDF - ${patientName}${phoneDisplay}`,
                      });
                      return;
                    }
                  }
                } catch (err: any) {
                  console.warn('PDF Share notice:', err?.message);
                }
              }}
            >
              <MaterialCommunityIcons name="whatsapp" size={18} color="#ffffff" />
              <Text style={{ color: '#ffffff', fontWeight: '800', fontSize: 14 }}>Share PDF Invoice (WhatsApp / Apps)</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={{ backgroundColor: '#258ec8', paddingVertical: 12, borderRadius: 10, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 6 }}
              onPress={async () => {
                const htmlContent = `
                  <!DOCTYPE html>
                  <html>
                  <head>
                    <meta charset="utf-8">
                    <style>
                      @page { size: A4 portrait; margin: 0; }
                      body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; padding: 36px 44px; color: #0f172a; margin: 0; background: #fff; line-height: 1.5; }
                      .header { display: flex; justify-content: space-between; align-items: center; padding-bottom: 12px; margin-bottom: 4px; }
                      .brand-title { color: #0284c7; font-size: 22px; font-weight: 900; letter-spacing: 0.5px; text-transform: uppercase; }
                      .brand-sub { font-size: 12px; color: #475569; margin-top: 3px; font-weight: 600; }
                      .lime-bar { height: 5px; background: #99cc00; width: 100%; margin: 10px 0 24px 0; border-radius: 3px; }
                      .title-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }
                      .receipt-title { font-size: 20px; font-weight: 900; color: #0f172a; text-transform: uppercase; margin: 0; letter-spacing: 0.5px; }
                      .receipt-badge { background: #e0f2fe; color: #0284c7; padding: 5px 16px; border-radius: 20px; font-weight: 800; font-size: 11.5px; letter-spacing: 0.5px; }
                      .section-head { font-size: 11.5px; font-weight: 800; color: #475569; margin-bottom: 14px; letter-spacing: 0.7px; text-transform: uppercase; display: flex; align-items: center; gap: 8px; }
                      .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px 36px; margin-bottom: 28px; font-size: 13.5px; }
                      .grid-cell { border-bottom: 1px solid #e2e8f0; padding-bottom: 8px; }
                      .label { font-size: 10.5px; font-weight: 700; color: #64748b; text-transform: uppercase; margin-bottom: 3px; letter-spacing: 0.4px; }
                      .val { font-weight: 800; color: #0f172a; font-size: 14.5px; }
                      .pay-box { background: #e6f7ed; border: 2px dashed #86efac; border-radius: 16px; padding: 22px 28px; display: flex; justify-content: space-between; align-items: center; margin-bottom: 28px; }
                      .pay-amt { font-size: 34px; font-weight: 900; color: #15803d; margin-top: 3px; }
                      .paid-badge { background: #22c55e; color: #fff; padding: 7px 18px; border-radius: 20px; font-weight: 800; font-size: 13.5px; display: inline-block; letter-spacing: 0.5px; }
                      table { width: 100%; border-collapse: collapse; margin-bottom: 28px; font-size: 13.5px; }
                      th { background: #f8fafc; padding: 12px 14px; text-align: left; font-size: 11.5px; font-weight: 800; border-bottom: 1.5px solid #cbd5e1; color: #475569; letter-spacing: 0.4px; }
                      td { padding: 12px 14px; border-bottom: 1px solid #f1f5f9; font-weight: 600; }
                      .meta-info { font-size: 11px; color: #64748b; line-height: 1.6; margin-bottom: 24px; margin-top: 16px; }
                      .footer-bar { background: #99cc00; color: #fff; padding: 10px 16px; border-radius: 5px; display: flex; justify-content: space-between; align-items: center; font-size: 10.5px; font-weight: 800; margin-top: 32px; flex-wrap: wrap; gap: 8px; }
                    </style>
                  </head>
                  <body>
                    <div class="header">
                      <div>
                        <div class="brand-title">SPIRITUAL HOMEOPATHY</div>
                        <div class="brand-sub">Multispecialty Homeopathy Clinic</div>
                      </div>
                      <div style="text-align: right; font-size: 11px; font-weight: 700; color: #334155; line-height: 1.4;">
                        <div>www.spiritualhomeoclinic.com</div>
                        <div style="color: #64748b; font-weight: 500;">support@spiritualhomeo.com</div>
                      </div>
                    </div>
                    <div class="lime-bar"></div>
                    <div class="title-row">
                      <h1 class="receipt-title">PAYMENT RECEIPT</h1>
                      <span class="receipt-badge">RECEIPT</span>
                    </div>
                    <div class="section-head">PATIENT DETAILS</div>
                    <div class="grid">
                      <div class="grid-cell"><div class="label">PATIENT NAME</div><div class="val">${patientName}</div></div>
                      <div class="grid-cell"><div class="label">PHONE NUMBER</div><div class="val">+91 ${patientPhone}</div></div>
                      <div class="grid-cell"><div class="label">CONSULTANT DOCTOR</div><div class="val">${activeInvoice?.doctorName || activeInvoice?.doctor || 'Dr. Prashanth k vaidya'}</div></div>
                      <div class="grid-cell"><div class="label">CLINIC BRANCH</div><div class="val">${activeInvoice?.branch || 'Kphb'}</div></div>
                      <div class="grid-cell"><div class="label">APPOINTMENT SCHEDULE</div><div class="val">${activeInvoice?.appointmentDate || activeInvoice?.date || new Date().toLocaleDateString('en-GB')} at ${activeInvoice?.timeSlot || activeInvoice?.time || '01:00 PM'}</div></div>
                      <div class="grid-cell"><div class="label">SPECIALTY</div><div class="val">General Homeopathy</div></div>
                    </div>
                    <div class="section-head">PAYMENT INFORMATION</div>
                    <div class="pay-box">
                      <div>
                        <div class="label" style="color: #166534;">TOTAL AMOUNT PAID</div>
                        <div class="pay-amt">₹${Number(activeInvoice?.totalPaid || activeInvoice?.targetAmount || 2000).toFixed(2)}</div>
                      </div>
                      <div style="text-align: right;">
                        <span class="paid-badge">PAID ✓</span>
                        <div style="font-size: 11px; font-weight: 800; color: #166534; margin-top: 6px; text-transform: uppercase;">VIA ${activeInvoice?.paymentMode || 'UPI'}</div>
                      </div>
                    </div>
                    <div class="section-head">FEE BREAKDOWN</div>
                    <table>
                      <thead><tr><th>DESCRIPTION</th><th style="text-align: right;">AMOUNT (₹)</th></tr></thead>
                      <tbody>
                        ${Number(activeInvoice?.medicineFee) > 0 ? `<tr><td>Medicine Fee</td><td style="text-align: right; font-weight: 700;">₹${Number(activeInvoice?.medicineFee).toFixed(2)}</td></tr>` : ''}
                        ${Number(activeInvoice?.consultationFee) > 0 ? `<tr><td>Consultation Fee</td><td style="text-align: right; font-weight: 700;">₹${Number(activeInvoice?.consultationFee).toFixed(2)}</td></tr>` : ''}
                        ${Number(activeInvoice?.dietFee) > 0 ? `<tr><td>Diet & Nutrition Fee</td><td style="text-align: right; font-weight: 700;">₹${Number(activeInvoice?.dietFee).toFixed(2)}</td></tr>` : ''}
                        ${Number(activeInvoice?.otherCharges) > 0 ? `<tr><td>Other Charges</td><td style="text-align: right; font-weight: 700;">₹${Number(activeInvoice?.otherCharges).toFixed(2)}</td></tr>` : ''}
                        ${Number(activeInvoice?.discount) > 0 ? `<tr style="color: #ef4444;"><td>Discount Applied</td><td style="text-align: right; font-weight: 700;">- ₹${Number(activeInvoice?.discount).toFixed(2)}</td></tr>` : ''}
                        ${(!activeInvoice?.medicineFee && !activeInvoice?.consultationFee && !activeInvoice?.dietFee && !activeInvoice?.otherCharges) ? `<tr><td>Medicine & Consultation Fee</td><td style="text-align: right; font-weight: 700;">₹${Number(activeInvoice?.totalPaid || 2000).toFixed(2)}</td></tr>` : ''}
                        <tr style="font-weight: 800;"><td>Payment Mode (${activeInvoice?.paymentMode || 'UPI'})</td><td style="text-align: right;">₹${Number(activeInvoice?.totalPaid || 2000).toFixed(2)}</td></tr>
                      </tbody>
                    </table>
                    <div class="meta-info">
                      <div>Payment ID: WALKIN_${(activeInvoice?.paymentMode || 'UPI').toUpperCase().replace(/\s+/g, '_')}</div>
                      <div>Issued At: ${new Date().toLocaleDateString('en-GB')}, ${new Date().toLocaleTimeString()}</div>
                      <div style="text-align: center; margin-top: 12px; color: #94a3b8;">This is a computer generated bill.</div>
                    </div>
                    <div class="footer-bar">
                      <div style="white-space: nowrap;">📞 9069176176</div>
                      <div style="white-space: nowrap;">✉️ support@spiritualhomeo.com</div>
                      <div style="white-space: nowrap;">🌐 www.spiritualhomeoclinic.com</div>
                      <div style="white-space: nowrap;">📍 ${(activeInvoice?.branch || 'KPHB').toUpperCase()}</div>
                    </div>
                  </body>
                  </html>
                `;
                try {
                  const getExpoModule = (modName: string) => {
                    try {
                      const r = (0, eval)('require');
                      return r(modName);
                    } catch (e) {
                      return null;
                    }
                  };
                  const Print = getExpoModule('expo-print');
                  if (Print && Print.printAsync) {
                    await Print.printAsync({ html: htmlContent });
                  } else {
                    Alert.alert('Notice', 'Native printing feature is ready.');
                  }
                } catch (e) {
                  Alert.alert('Notice', 'Could not open native printer preview.');
                }
              }}
            >
              <Feather name="printer" size={18} color="#ffffff" />
              <Text style={{ color: '#ffffff', fontWeight: '800', fontSize: 14 }}>Print / Download PDF</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={{ backgroundColor: '#64748b', paddingVertical: 11, borderRadius: 10, alignItems: 'center' }}
              onPress={onDismiss}
            >
              <Text style={{ color: '#ffffff', fontWeight: '800', fontSize: 14 }}>Done & Close ✓</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      ) : (
        <SafeAreaView style={styles.fullScreenContainer}>
          {/* Top Navigation Bar */}
          <View style={styles.topNavBar}>
            <TouchableOpacity onPress={onDismiss} style={styles.backBtn}>
              <Ionicons name="arrow-back" size={24} color="#0f172a" />
            </TouchableOpacity>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.headerTitle}>Appointment Payment</Text>
              <Text style={styles.headerSubtitle}>Review and complete payment</Text>
            </View>
            <TouchableOpacity onPress={onDismiss} style={styles.closeCircleBtn}>
              <Ionicons name="close" size={20} color="#0f172a" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scrollBody} showsVerticalScrollIndicator={false}>
            {/* Patient Info Card */}
            <View style={styles.patientCardContainer}>
              <View style={styles.patientInfoLeft}>
                <View style={styles.patientAvatarCircle}>
                  <Ionicons name="person" size={20} color="#258ec8" />
                </View>
                <View>
                  <Text style={styles.patientNameText}>{patientName}</Text>
                  <Text style={styles.patientPhoneText}>{patientPhone}</Text>
                </View>
              </View>
              <TouchableOpacity
                style={styles.viewDetailsBtn}
                onPress={() => setShowPatientDetails(!showPatientDetails)}
              >
                <Text style={styles.viewDetailsBtnText}>
                  {showPatientDetails ? 'Hide Details' : 'View Details >'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Expandable Patient Details */}
            {showPatientDetails && (
              <View style={styles.expandedDetailsBox}>
                <Text style={styles.expDetailLine}>Doctor: <Text style={{ fontWeight: '700', color: '#0f172a' }}>{selectedPatientForPayment.doctor || selectedPatientForPayment.doctorName || 'Dr. Prashanth K Vaidya'}</Text></Text>
                <Text style={styles.expDetailLine}>Reg ID: <Text style={{ fontWeight: '700', color: '#258ec8' }}>{selectedPatientForPayment.regId || 'N/A'}</Text></Text>
                <Text style={styles.expDetailLine}>Branch: <Text style={{ fontWeight: '700', color: '#0f172a' }}>{selectedPatientForPayment.branch || 'Clinic'}</Text></Text>
              </View>
            )}

            {/* Section Title */}
            <Text style={styles.sectionHeading}>Select Payment Type</Text>

            {/* Target Amount Box */}
            <View style={styles.targetAmountBox}>
              <View style={{ flex: 1 }}>
                <Text style={styles.targetTitle}>Target Amount (from Doctor):</Text>
                <Text style={styles.targetSubtext}>Tap to edit target amount</Text>
              </View>
              <View style={styles.targetInputWrapper}>
                <Text style={styles.rupeeSymbol}>₹</Text>
                <TextInput
                  style={styles.targetInput}
                  keyboardType="numeric"
                  value={String(targetAmount)}
                  onChangeText={(v) => setTargetAmount(Number(v) || 0)}
                />
              </View>
            </View>

            {/* 4 Payment Preset Pills */}
            <View style={styles.presetPillsGrid}>
              <TouchableOpacity
                style={[styles.presetPill, paymentTypePreset === 'consultation' && styles.presetPillActive]}
                onPress={() => handlePresetSelect('consultation')}
              >
                <Text style={[styles.presetPillText, paymentTypePreset === 'consultation' && styles.presetPillTextActive]}>
                  Consultation Fee
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.presetPill, paymentTypePreset === 'consultation_med' && styles.presetPillActive]}
                onPress={() => handlePresetSelect('consultation_med')}
              >
                <Text style={[styles.presetPillText, paymentTypePreset === 'consultation_med' && styles.presetPillTextActive]}>
                  Consultation & Med Fee
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.presetPill, paymentTypePreset === 'split' && styles.presetPillActive]}
                onPress={() => handlePresetSelect('split')}
              >
                <Text style={[styles.presetPillText, paymentTypePreset === 'split' && styles.presetPillTextActive]}>
                  Split (Both)
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.presetPill, paymentTypePreset === 'package' && styles.presetPillActive]}
                onPress={() => handlePresetSelect('package')}
              >
                <Text style={[styles.presetPillText, paymentTypePreset === 'package' && styles.presetPillTextActive]}>
                  Package Fee
                </Text>
              </TouchableOpacity>
            </View>

            {/* Checkbox Fee Cards */}
            {/* 1. Consultation Fee */}
            <View style={[styles.feeCard, includeConsultFee && styles.feeCardActive]}>
              <TouchableOpacity
                style={styles.feeCardCheckRow}
                onPress={() => setIncludeConsultFee(!includeConsultFee)}
                activeOpacity={0.8}
              >
                <Ionicons
                  name={includeConsultFee ? "checkmark-circle" : "ellipse-outline"}
                  size={24}
                  color={includeConsultFee ? "#258ec8" : "#cbd5e1"}
                />
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={styles.feeTitle}>Consultation Fee</Text>
                  <Text style={styles.feeSubtext}>Doctor Requested Consultation Fee</Text>
                </View>
              </TouchableOpacity>
              <View style={styles.feeInputWrapper}>
                <Text style={styles.rupeeSymbolSmall}>₹</Text>
                <TextInput
                  style={styles.feeNumberInput}
                  keyboardType="numeric"
                  value={String(consultFeeInput)}
                  onChangeText={(v) => setConsultFeeInput(Number(v) || 0)}
                />
              </View>
            </View>

            {/* 2. Prescribed Medicines Fee */}
            <View style={[styles.feeCard, includeMedicineFee && styles.feeCardActive]}>
              <TouchableOpacity
                style={styles.feeCardCheckRow}
                onPress={() => setIncludeMedicineFee(!includeMedicineFee)}
                activeOpacity={0.8}
              >
                <Ionicons
                  name={includeMedicineFee ? "checkmark-circle" : "ellipse-outline"}
                  size={24}
                  color={includeMedicineFee ? "#258ec8" : "#cbd5e1"}
                />
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={styles.feeTitle}>Prescribed Medicines</Text>
                  <Text style={styles.feeSubtext}>Prescribed Remedies / Pharmacy Fee</Text>
                </View>
              </TouchableOpacity>
              <View style={styles.feeInputWrapper}>
                <Text style={styles.rupeeSymbolSmall}>₹</Text>
                <TextInput
                  style={styles.feeNumberInput}
                  keyboardType="numeric"
                  value={String(medicineFeeInput)}
                  onChangeText={(v) => setMedicineFeeInput(Number(v) || 0)}
                />
              </View>
            </View>

            {/* 3. Diet Plan Fee */}
            <View style={[styles.feeCard, includeDietFee && styles.feeCardActive]}>
              <TouchableOpacity
                style={styles.feeCardCheckRow}
                onPress={() => setIncludeDietFee(!includeDietFee)}
                activeOpacity={0.8}
              >
                <Ionicons
                  name={includeDietFee ? "checkmark-circle" : "ellipse-outline"}
                  size={24}
                  color={includeDietFee ? "#258ec8" : "#cbd5e1"}
                />
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={styles.feeTitle}>Diet Plan Fee</Text>
                  <Text style={styles.feeSubtext}>Diet & Nutrition Fee</Text>
                </View>
              </TouchableOpacity>
              <View style={styles.feeInputWrapper}>
                <Text style={styles.rupeeSymbolSmall}>₹</Text>
                <TextInput
                  style={styles.feeNumberInput}
                  keyboardType="numeric"
                  value={String(dietFeeInput)}
                  onChangeText={(v) => setDietFeeInput(Number(v) || 0)}
                />
              </View>
            </View>

            {/* 4. Other Charges Fee */}
            <View style={[styles.feeCard, includeOtherCharges && styles.feeCardActive]}>
              <TouchableOpacity
                style={styles.feeCardCheckRow}
                onPress={() => setIncludeOtherCharges(!includeOtherCharges)}
                activeOpacity={0.8}
              >
                <Ionicons
                  name={includeOtherCharges ? "checkmark-circle" : "ellipse-outline"}
                  size={24}
                  color={includeOtherCharges ? "#258ec8" : "#cbd5e1"}
                />
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={styles.feeTitle}>Other Charges</Text>
                  <Text style={styles.feeSubtext}>Miscellaneous / Procedures Fee</Text>
                </View>
              </TouchableOpacity>
              <View style={styles.feeInputWrapper}>
                <Text style={styles.rupeeSymbolSmall}>₹</Text>
                <TextInput
                  style={styles.feeNumberInput}
                  keyboardType="numeric"
                  value={String(otherChargesInput)}
                  onChangeText={(v) => setOtherChargesInput(Number(v) || 0)}
                />
              </View>
            </View>

            {/* Medicine Discount Status Section */}
            <View style={styles.discountSectionCard}>
              <Text style={styles.discountSectionTitle}>Medicine Discount Status</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 }}>
                <TouchableOpacity
                  style={styles.requestDiscountBtn}
                  onPress={() => setShowDiscountInput(!showDiscountInput)}
                >
                  <Text style={styles.requestDiscountBtnText}>Request Discount</Text>
                </TouchableOpacity>

                {showDiscountInput && (
                  <View style={styles.discountInputWrapper}>
                    <Text style={{ fontSize: 13, fontWeight: '700', color: '#ef4444', marginRight: 4 }}>- ₹</Text>
                    <TextInput
                      style={styles.discountInput}
                      keyboardType="numeric"
                      value={String(discountInput)}
                      onChangeText={(v) => setDiscountInput(Number(v) || 0)}
                    />
                  </View>
                )}
              </View>
            </View>

            {/* Payment Method Selector */}
            <Text style={[styles.sectionHeading, { marginTop: 18 }]}>Select Payment Method</Text>
            <View style={styles.paymentMethodGrid}>
              {['Cash', 'UPI / QR Code', 'Card', 'Split', 'Send Pay Link', 'Pay Later'].map((mode) => {
                const isActive = selectedPaymentMode === mode;
                return (
                  <TouchableOpacity
                    key={mode}
                    style={[styles.methodChip, isActive && styles.methodChipActive]}
                    onPress={() => setSelectedPaymentMode(mode)}
                  >
                    <Text style={[styles.methodChipText, isActive && styles.methodChipTextActive]}>
                      {mode}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Split Options */}
            {selectedPaymentMode === 'Split' && (
              <View style={styles.splitBox}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.splitLabel}>Cash Portion (₹)</Text>
                  <TextInput
                    style={styles.splitInput}
                    keyboardType="numeric"
                    value={String(splitCash)}
                    onChangeText={(v) => setSplitCash(Number(v) || 0)}
                  />
                </View>
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={styles.splitLabel}>UPI Portion (₹)</Text>
                  <TextInput
                    style={styles.splitInput}
                    keyboardType="numeric"
                    value={String(splitUpi)}
                    onChangeText={(v) => setSplitUpi(Number(v) || 0)}
                  />
                </View>
              </View>
            )}

            {/* Total Amount Summary Banner */}
            <View style={styles.totalBannerRow}>
              <Text style={styles.totalBannerLabel}>TOTAL AMOUNT DUE:</Text>
              <Text style={styles.totalBannerValue}>₹ {totalAmountDue.toLocaleString('en-IN')}</Text>
            </View>
          </ScrollView>

          {/* Action Buttons Footer */}
          <View style={styles.footerRow}>
            <TouchableOpacity style={styles.cancelFooterBtn} onPress={onDismiss}>
              <Text style={styles.cancelFooterBtnText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.confirmFooterBtn}
              onPress={handleConfirmCheckout}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#ffffff" size="small" />
              ) : (
                <Text style={styles.confirmFooterBtnText}>Confirm Payment & Generate Invoice ✓</Text>
              )}
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      )}
    </Modal>
  );
};

export default AppointmentPaymentModal;

const styles = StyleSheet.create({
  fullScreenContainer: {
    flex: 1,
    backgroundColor: '#ffffff'
  },
  topNavBar: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    backgroundColor: '#ffffff'
  },
  backBtn: {
    padding: 4
  },
  headerTitle: {
    fontSize: 19,
    fontWeight: '800',
    color: '#0f172a'
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 1
  },
  closeCircleBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center'
  },
  scrollBody: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 14
  },
  patientCardContainer: {
    backgroundColor: '#f0f7ff',
    borderRadius: 14,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#e0f2fe'
  },
  patientInfoLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10
  },
  patientAvatarCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#dbeafe',
    alignItems: 'center',
    justifyContent: 'center'
  },
  patientNameText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0f172a'
  },
  patientPhoneText: {
    fontSize: 12,
    color: '#475569',
    marginTop: 2
  },
  viewDetailsBtn: {
    borderWidth: 1,
    borderColor: '#258ec8',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#ffffff'
  },
  viewDetailsBtnText: {
    color: '#258ec8',
    fontSize: 12,
    fontWeight: '700'
  },
  expandedDetailsBox: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    padding: 10,
    marginTop: 8,
    gap: 4
  },
  expDetailLine: {
    fontSize: 12,
    color: '#64748b'
  },
  sectionHeading: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0f172a',
    marginTop: 18,
    marginBottom: 10
  },
  targetAmountBox: {
    borderWidth: 1,
    borderColor: '#93c5fd',
    backgroundColor: '#f8fafc',
    borderRadius: 14,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  targetTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a'
  },
  targetSubtext: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2
  },
  targetInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#258ec8',
    backgroundColor: '#ffffff',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 6,
    width: 90
  },
  rupeeSymbol: {
    fontSize: 15,
    fontWeight: '800',
    color: '#258ec8',
    marginRight: 4
  },
  targetInput: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0f172a',
    flex: 1,
    textAlign: 'right'
  },
  presetPillsGrid: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 12,
    marginBottom: 14
  },
  presetPill: {
    flex: 1,
    paddingVertical: 9,
    paddingHorizontal: 4,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center'
  },
  presetPillActive: {
    backgroundColor: '#eff6ff',
    borderColor: '#258ec8',
    borderWidth: 1.5
  },
  presetPillText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#475569',
    textAlign: 'center'
  },
  presetPillTextActive: {
    color: '#1d4ed8',
    fontWeight: '800'
  },
  feeCard: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    backgroundColor: '#ffffff',
    padding: 12,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  feeCardActive: {
    borderColor: '#93c5fd',
    backgroundColor: '#fafafa'
  },
  feeCardCheckRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1
  },
  feeTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a'
  },
  feeSubtext: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2
  },
  feeInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    width: 80,
    backgroundColor: '#ffffff'
  },
  rupeeSymbolSmall: {
    fontSize: 13,
    fontWeight: '700',
    color: '#258ec8',
    marginRight: 2
  },
  feeNumberInput: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
    flex: 1,
    textAlign: 'right'
  },
  discountSectionCard: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    padding: 12,
    marginTop: 4,
    marginBottom: 10
  },
  discountSectionTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0f172a'
  },
  requestDiscountBtn: {
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8
  },
  requestDiscountBtnText: {
    color: '#334155',
    fontSize: 12,
    fontWeight: '700'
  },
  discountInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#fecaca',
    backgroundColor: '#fff5f5',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    width: 90
  },
  discountInput: {
    fontSize: 13,
    fontWeight: '700',
    color: '#ef4444',
    flex: 1,
    textAlign: 'right'
  },
  paymentMethodGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12
  },
  methodChip: {
    width: '31%',
    paddingVertical: 9,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    backgroundColor: '#ffffff',
    alignItems: 'center'
  },
  methodChipActive: {
    borderColor: '#258ec8',
    backgroundColor: '#f0f9ff',
    borderWidth: 1.5
  },
  methodChipText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#475569'
  },
  methodChipTextActive: {
    color: '#258ec8',
    fontWeight: '800'
  },
  splitBox: {
    flexDirection: 'row',
    backgroundColor: '#f0f9ff',
    borderWidth: 1,
    borderColor: '#bae6fd',
    borderRadius: 10,
    padding: 10,
    marginBottom: 14
  },
  splitLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0369a1',
    marginBottom: 4
  },
  splitInput: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#7dd3fc',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    fontSize: 12,
    fontWeight: '700',
    color: '#0f172a'
  },
  totalBannerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderWidth: 1.5,
    borderColor: '#cbd5e1',
    borderRadius: 12,
    padding: 14,
    marginTop: 8,
    marginBottom: 20
  },
  totalBannerLabel: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0f172a'
  },
  totalBannerValue: {
    fontSize: 18,
    fontWeight: '800',
    color: '#16a34a'
  },
  footerRow: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10
  },
  cancelFooterBtn: {
    paddingHorizontal: 16,
    paddingVertical: 11,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    backgroundColor: '#ffffff'
  },
  cancelFooterBtnText: {
    color: '#475569',
    fontWeight: '700',
    fontSize: 13
  },
  confirmFooterBtn: {
    flex: 1,
    backgroundColor: '#16a34a',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center'
  },
  confirmFooterBtnText: {
    color: '#ffffff',
    fontWeight: '800',
    fontSize: 13
  }
});
