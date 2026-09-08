import React, { useState, useRef } from 'react';
import {
  FileText, Clock, MapPin, Phone, Megaphone, AlertCircle, Plus,
  Upload, Trash2, ArrowLeft, Calendar, Check, ExternalLink, RefreshCcw,
  Sparkles, Stethoscope, Apple, Share2, Award, FolderPlus, X, CheckCircle2
} from 'lucide-react';

export interface PatientFileUIProps {
  patient: any;
  doctorName?: string;
  onClose?: () => void;
  onSubmitConsultation?: (data: any) => Promise<void>;
  onRegisterPackage?: (packageInfo: any) => void;
  isStandalonePage?: boolean;
  userRoleTitle?: string;
}

export const PatientFileUI: React.FC<PatientFileUIProps> = ({
  patient,
  doctorName = 'Dr. Prashanth K Vaidya',
  onClose,
  onSubmitConsultation,
  onRegisterPackage,
  isStandalonePage = false,
  userRoleTitle = 'Dilshuknagar Receptionist',
}) => {
  const [activeTab, setActiveTab] = useState<'clinical' | 'diet' | 'media' | 'package'>('clinical');

  // Patient Info Values (with fallbacks matching reference screenshots)
  const patientName = patient?.patientName || patient?.name || 'Swpana latha';
  const regId = patient?.registrationId || patient?.regId || 'SPHDSN-124';
  const phone = patient?.phone || patient?.phoneNumber || '9000136260';
  const branchName = patient?.branch || 'Dilshuknagar';
  const source = patient?.source || patient?.leadSource || 'Old Patient';
  const subject = patient?.subject || patient?.diseases || 'Fever';

  // --- TAB 1: CLINICAL FORM STATE ---
  const [diagnosisNotes, setDiagnosisNotes] = useState('');
  const [drawPrescription, setDrawPrescription] = useState<'on' | 'off'>('off');
  const [physicalFile, setPhysicalFile] = useState<File | null>(null);
  const [followUpInterval, setFollowUpInterval] = useState('No Follow-up');
  const [preferredFollowUpDate, setPreferredFollowUpDate] = useState('2026-10-07');
  const [pharmacyFee, setPharmacyFee] = useState('');

  // Canvas State
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [canvasHasContent, setCanvasHasContent] = useState(false);

  // --- TAB 2: DIET PLAN STATE ---
  const [selectedDietPlan, setSelectedDietPlan] = useState('+ Create New Diet Plan');
  const [age, setAge] = useState('30');
  const [height, setHeight] = useState('');
  const [weight, setWeight] = useState('');
  const [bmi, setBmi] = useState('0');
  const [deficiencies, setDeficiencies] = useState<Record<string, boolean>>({});
  const [disorders, setDisorders] = useState<Record<string, boolean>>({});
  const [otherDisorders, setOtherDisorders] = useState('');
  const [symptomsSigns, setSymptomsSigns] = useState('');
  const [foodsToEat, setFoodsToEat] = useState('');
  const [foodsToAvoid, setFoodsToAvoid] = useState('');
  const [dietFeeAmount, setDietFeeAmount] = useState('500');

  // --- TAB 3: SHARE MEDIA STATE ---
  const [sharedMediaList, setSharedMediaList] = useState<string[]>([]);
  const [showGlobalMediaModal, setShowGlobalMediaModal] = useState(false);

  // --- TAB 4: REGISTER PACKAGE STATE ---
  const [totalPackageAmount, setTotalPackageAmount] = useState('');
  const [initialAdvancePaid, setInitialAdvancePaid] = useState('0');
  const [packagePurpose, setPackagePurpose] = useState('');
  const [packageDuration, setPackageDuration] = useState('3 Months');
  const [packageStartDate, setPackageStartDate] = useState('2026-09-07');
  const [packageEndDate, setPackageEndDate] = useState('2026-12-07');

  // Uploaded Prescriptions State
  const [uploadedImages, setUploadedImages] = useState<string[]>([
    'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=150&auto=format&fit=crop&q=60'
  ]);

  const [saving, setSaving] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  // Deficiency items checklist
  const deficiencyList = [
    'Vitamin A', 'Vitamin C', 'Vitamin E', 'Calcium', 'Magnesium', 'Iron', 'Protein', 'Phosphorus',
    'Vitamin B', 'Vitamin D', 'Vitamin K', 'Potassium', 'Zinc', 'Sodium', 'Manganese'
  ];

  // Common Health Disorders pills
  const disordersList = [
    'Sugar (Diabetes)', 'High BP / Hypertension', 'Thyroid', 'Gastritis', 'IBS / IBD', 'GERD',
    'Piles', 'PCOD', 'Insulin Resistance', 'Hairfall', 'Melasma', 'Weight Gain', 'Weight Loss',
    'Height Growth', 'Adenoids / Tonsillitis', 'Allergies'
  ];

  // Canvas Handlers
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    setIsDrawing(true);
    const rect = canvas.getBoundingClientRect();
    ctx.beginPath();
    ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
    ctx.strokeStyle = '#0284c7';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.stroke();
    setCanvasHasContent(true);
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setCanvasHasContent(false);
  };

  const handleSaveConsultation = async () => {
    setSaving(true);
    const payload = {
      patientId: patient?.id || patient?.patientId,
      patientName,
      regId,
      diagnosisNotes,
      followUpInterval,
      preferredFollowUpDate,
      pharmacyFee,
      drawPrescription,
    };

    if (onSubmitConsultation) {
      await onSubmitConsultation(payload);
    }
    setToastMessage('Consultation saved successfully!');
    setTimeout(() => {
      setToastMessage('');
      if (onClose) onClose();
    }, 1800);
    setSaving(false);
  };

  const handleCreatePackage = () => {
    const pkgData = {
      totalPackageAmount,
      initialAdvancePaid,
      packagePurpose,
      packageDuration,
      packageStartDate,
      packageEndDate,
    };
    if (onRegisterPackage) onRegisterPackage(pkgData);
    setToastMessage('Package Membership Created Successfully!');
    setTimeout(() => setToastMessage(''), 2500);
  };

  return (
    <div style={{
      backgroundColor: '#f8fafc',
      minHeight: isStandalonePage ? '100vh' : 'auto',
      fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
      color: '#0f172a',
      fontSize: '12px'
    }}>

      {/* Toast Notification */}
      {toastMessage && (
        <div style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          backgroundColor: '#0284c7',
          color: '#ffffff',
          padding: '12px 20px',
          borderRadius: '10px',
          fontWeight: 700,
          boxShadow: '0 10px 25px rgba(2, 132, 199, 0.3)',
          zIndex: 100000,
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <CheckCircle2 size={18} /> {toastMessage}
        </div>
      )}

      {/* 1. TOP HEADER BAR */}
      <div style={{
        backgroundColor: '#ffffff',
        borderBottom: '1px solid #e2e8f0',
        padding: '12px 24px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '12px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          {onClose && (
            <button
              onClick={onClose}
              style={{
                backgroundColor: '#f1f5f9',
                border: '1px solid #cbd5e1',
                padding: '6px 14px',
                borderRadius: '8px',
                color: '#334155',
                fontWeight: 700,
                fontSize: '11.5px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              ‹ Back to Dashboard
            </button>
          )}

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h1 style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: '#0f172a' }}>
              Patient File: {patientName} ({regId})
            </h1>
            <span style={{
              backgroundColor: '#fef08a',
              color: '#854d0e',
              border: '1px solid #fde047',
              fontSize: '9.5px',
              padding: '2px 8px',
              borderRadius: '10px',
              fontWeight: 800,
              letterSpacing: '0.4px'
            }}>
              IN DURATION
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '12px', fontWeight: 800, color: '#0f172a' }}>{userRoleTitle}</div>
          </div>
          <div style={{
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            backgroundColor: '#e0f2fe',
            color: '#0284c7',
            border: '1px solid #bae6fd',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 800,
            fontSize: '13px'
          }}>
            D
          </div>
        </div>
      </div>

      {/* MAIN CONTAINER: 2 COLUMN GRID */}
      <div style={{
        padding: '20px 24px',
        display: 'grid',
        gridTemplateColumns: '320px 1fr',
        gap: '20px',
        maxWidth: '1440px',
        margin: '0 auto'
      }}>

        {/* LEFT COLUMN: PATIENT INFO & STACK CARDS */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

          {/* CARD 1: PATIENT INFORMATION CARD */}
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '14px',
            border: '1px solid #e2e8f0',
            padding: '20px',
            boxShadow: '0 2px 8px rgba(15, 23, 42, 0.03)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
              <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#0f172a' }}>
                {patientName}
              </h2>
              <span style={{
                backgroundColor: '#fef08a',
                color: '#854d0e',
                fontSize: '9px',
                padding: '2px 6px',
                borderRadius: '6px',
                fontWeight: 800
              }}>
                IN DURATION
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', color: '#475569', fontSize: '11.5px' }}>
              <div style={{ color: '#0284c7', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
                📋 Reg ID: {regId}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                📞 {phone}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                📍 {branchName}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                📢 Source: {source}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700, color: '#0f172a' }}>
                📋 Subject: {subject}
              </div>
            </div>

            {/* Sub-Card: Register Patient in Package Box */}
            <div style={{
              marginTop: '16px',
              backgroundColor: '#f8fafc',
              border: '1px dashed #cbd5e1',
              borderRadius: '10px',
              padding: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '8px'
            }}>
              <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>No active package.</span>
              <button
                onClick={() => setActiveTab('package')}
                style={{
                  backgroundColor: '#ffffff',
                  border: '1px solid #0284c7',
                  color: '#0284c7',
                  padding: '5px 10px',
                  borderRadius: '6px',
                  fontSize: '11px',
                  fontWeight: 800,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                + Register Patient in Package
              </button>
            </div>
          </div>

          {/* CARD 2: MEDICAL HISTORY */}
          <div style={{
            backgroundColor: '#e0f2fe',
            borderRadius: '14px',
            border: '1px solid #bae6fd',
            padding: '18px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px'
          }}>
            <h3 style={{ margin: 0, fontSize: '13px', fontWeight: 800, color: '#0284c7', display: 'flex', alignItems: 'center', gap: '6px' }}>
              ⏱ Medical History
            </h3>
            <div style={{
              backgroundColor: '#ffffff',
              borderRadius: '10px',
              padding: '24px 16px',
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              minHeight: '110px'
            }}>
              <div style={{ width: '36px', height: '36px', borderRadius: '50%', border: '2px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                ✏️
              </div>
              <span style={{ fontSize: '10.5px', color: '#94a3b8', fontWeight: 600 }}>
                No previous visits recorded for this patient.
              </span>
            </div>
          </div>

          {/* CARD 3: UPLOADED PRESCRIPTIONS & CANVAS */}
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '14px',
            border: '1px solid #e2e8f0',
            padding: '18px',
            boxShadow: '0 2px 8px rgba(15, 23, 42, 0.03)',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px'
          }}>
            <h3 style={{ margin: 0, fontSize: '13px', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px' }}>
              📤 Uploaded Prescriptions & Canvas
            </h3>

            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              {uploadedImages.map((img, idx) => (
                <div key={idx} style={{ position: 'relative', width: '64px', height: '64px', borderRadius: '8px', overflow: 'hidden', border: '1px solid #cbd5e1' }}>
                  <img src={img} alt="Prescription Scan" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  <button
                    onClick={() => setUploadedImages(uploadedImages.filter((_, i) => i !== idx))}
                    style={{
                      position: 'absolute',
                      top: '2px',
                      right: '2px',
                      backgroundColor: '#ef4444',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '50%',
                      width: '16px',
                      height: '16px',
                      fontSize: '10px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>

            <button style={{
              backgroundColor: '#f1f5f9',
              border: '1px solid #cbd5e1',
              color: '#334155',
              padding: '7px 12px',
              borderRadius: '6px',
              fontSize: '11px',
              fontWeight: 800,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              width: 'fit-content'
            }}>
              + Upload Image
            </button>
          </div>

        </div>

        {/* RIGHT COLUMN: TABS & MAIN CONTENT */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

          {/* TOP TABS NAVIGATION BAR */}
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '12px',
            border: '1px solid #e2e8f0',
            padding: '6px 12px',
            display: 'flex',
            gap: '12px',
            alignItems: 'center'
          }}>
            {[
              { id: 'clinical', label: 'Clinical Form', icon: '📋' },
              { id: 'diet', label: 'Diet Plan', icon: '🍎' },
              { id: 'media', label: 'Share Media', icon: '📁' },
              { id: 'package', label: 'Register Package', icon: '🎗' },
            ].map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  style={{
                    backgroundColor: 'transparent',
                    border: 'none',
                    borderBottom: isActive ? '3px solid #0284c7' : '3px solid transparent',
                    color: isActive ? '#0284c7' : '#64748b',
                    fontWeight: isActive ? 800 : 600,
                    fontSize: '12.5px',
                    padding: '8px 14px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <span>{tab.icon}</span>
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* TAB 1: CLINICAL FORM CONTENT */}
          {activeTab === 'clinical' && (
            <div style={{
              backgroundColor: '#ffffff',
              borderRadius: '14px',
              border: '1px solid #e2e8f0',
              padding: '24px',
              boxShadow: '0 2px 8px rgba(15, 23, 42, 0.03)',
              display: 'flex',
              flexDirection: 'column',
              gap: '20px'
            }}>
              <h2 style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: '#0f172a' }}>
                Digital Prescription
              </h2>

              {/* Diagnosis Notes */}
              <div>
                <label style={{ fontSize: '12px', fontWeight: 800, color: '#334155', display: 'block', marginBottom: '6px' }}>
                  Diagnosis Notes
                </label>
                <textarea
                  rows={5}
                  value={diagnosisNotes}
                  onChange={(e) => setDiagnosisNotes(e.target.value)}
                  placeholder="Enter detailed clinical notes and diagnosis..."
                  style={{
                    width: '100%',
                    padding: '12px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '12px',
                    outline: 'none',
                    fontFamily: 'inherit'
                  }}
                />
              </div>

              {/* Draw Prescription (Optional) */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <span style={{ fontSize: '12px', fontWeight: 800, color: '#0f172a' }}>
                  Draw Prescription (Optional)
                </span>
                <label style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', fontSize: '12px' }}>
                  <input
                    type="radio"
                    name="drawPrescription"
                    checked={drawPrescription === 'on'}
                    onChange={() => setDrawPrescription('on')}
                  /> On
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', fontSize: '12px' }}>
                  <input
                    type="radio"
                    name="drawPrescription"
                    checked={drawPrescription === 'off'}
                    onChange={() => setDrawPrescription('off')}
                  /> Off
                </label>
              </div>

              {/* Canvas Pad (Visible if Draw Prescription is On) */}
              {drawPrescription === 'on' && (
                <div style={{ border: '2px dashed #0284c7', borderRadius: '10px', padding: '10px', backgroundColor: '#f0f9ff' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <span style={{ fontSize: '11px', fontWeight: 700, color: '#0284c7' }}>✍️ Freehand Canvas Prescription Drawing Pad</span>
                    <button onClick={clearCanvas} style={{ backgroundColor: '#ffffff', border: '1px solid #cbd5e1', padding: '2px 8px', borderRadius: '4px', fontSize: '10px', cursor: 'pointer' }}>Clear</button>
                  </div>
                  <canvas
                    ref={canvasRef}
                    width={750}
                    height={160}
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={stopDrawing}
                    onMouseLeave={stopDrawing}
                    style={{ backgroundColor: '#ffffff', width: '100%', borderRadius: '6px', cursor: 'crosshair' }}
                  />
                </div>
              )}

              {/* Physical Prescription File Upload Input */}
              <div>
                <label style={{ fontSize: '12px', fontWeight: 800, color: '#0f172a', display: 'block', marginBottom: '6px' }}>
                  Physical Prescription (Optional if Canvas Drawing is used)
                </label>
                <div style={{
                  border: '1px solid #cbd5e1',
                  borderRadius: '8px',
                  padding: '8px 12px',
                  backgroundColor: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px'
                }}>
                  <input
                    type="file"
                    onChange={(e) => setPhysicalFile(e.target.files ? e.target.files[0] : null)}
                    style={{ fontSize: '11.5px' }}
                  />
                </div>
                <span style={{ fontSize: '10.5px', color: '#94a3b8', marginTop: '4px', display: 'block' }}>
                  Upload one or multiple photos of the handwritten prescription.
                </span>
              </div>

              {/* Follow-up Recommendation */}
              <div>
                <h3 style={{ margin: '0 0 10px 0', fontSize: '13px', fontWeight: 800, color: '#0f172a' }}>
                  Follow-up Recommendation
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div>
                    <label style={{ fontSize: '11px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>
                      Follow-up Interval
                    </label>
                    <select
                      value={followUpInterval}
                      onChange={(e) => setFollowUpInterval(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '9px 12px',
                        borderRadius: '8px',
                        border: '1px solid #cbd5e1',
                        fontSize: '12px',
                        backgroundColor: '#ffffff',
                        outline: 'none'
                      }}
                    >
                      <option value="No Follow-up">No Follow-up</option>
                      <option value="15 Days">15 Days</option>
                      <option value="1 Month">1 Month</option>
                      <option value="2 Months">2 Months</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ fontSize: '11px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>
                      Preferred Follow-up Date
                    </label>
                    <input
                      type="date"
                      value={preferredFollowUpDate}
                      onChange={(e) => setPreferredFollowUpDate(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        borderRadius: '8px',
                        border: '1px solid #cbd5e1',
                        fontSize: '12px',
                        outline: 'none'
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Consultation & Medicine Fee */}
              <div>
                <h3 style={{ margin: '0 0 8px 0', fontSize: '13px', fontWeight: 800, color: '#0f172a' }}>
                  Consultation & Medicine Fee
                </h3>
                <div>
                  <label style={{ fontSize: '11px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>
                    Pharmacy/Medicine Fee (₹)
                  </label>
                  <input
                    type="text"
                    placeholder="Enter amount..."
                    value={pharmacyFee}
                    onChange={(e) => setPharmacyFee(e.target.value)}
                    style={{
                      width: '260px',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      fontSize: '12px',
                      outline: 'none'
                    }}
                  />
                </div>
              </div>

              {/* Save Consultation Action Button */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '10px' }}>
                <button
                  onClick={handleSaveConsultation}
                  disabled={saving}
                  style={{
                    backgroundColor: '#0284c7',
                    color: '#ffffff',
                    border: 'none',
                    padding: '10px 24px',
                    borderRadius: '8px',
                    fontSize: '13px',
                    fontWeight: 800,
                    cursor: 'pointer',
                    boxShadow: '0 2px 8px rgba(2, 132, 199, 0.3)',
                    transition: 'all 0.15s ease'
                  }}
                >
                  {saving ? 'Saving...' : 'Save Consultation'}
                </button>
              </div>

            </div>
          )}

          {/* TAB 2: DIET PLAN CONTENT */}
          {activeTab === 'diet' && (
            <div style={{
              backgroundColor: '#ffffff',
              borderRadius: '14px',
              border: '1px solid #e2e8f0',
              padding: '24px',
              boxShadow: '0 2px 8px rgba(15, 23, 42, 0.03)',
              display: 'flex',
              flexDirection: 'column',
              gap: '18px'
            }}>
              {/* Select Plan Dropdown */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ fontSize: '12px', fontWeight: 800, color: '#0f172a' }}>Select Plan:</span>
                <select
                  value={selectedDietPlan}
                  onChange={(e) => setSelectedDietPlan(e.target.value)}
                  style={{
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '12px',
                    fontWeight: 700,
                    backgroundColor: '#ffffff',
                    minWidth: '220px'
                  }}
                >
                  <option value="+ Create New Diet Plan">+ Create New Diet Plan</option>
                  <option value="General Homeopathy Plan">General Homeopathy Plan</option>
                  <option value="Gastric & Weight Loss">Gastric & Weight Loss</option>
                </select>
              </div>

              {/* Vitals / Metrics Row */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', display: 'block', marginBottom: '4px' }}>Age</label>
                  <input type="text" value={age} onChange={(e) => setAge(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12px' }} />
                </div>
                <div>
                  <label style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', display: 'block', marginBottom: '4px' }}>Height (cm)</label>
                  <input type="text" value={height} onChange={(e) => setHeight(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12px' }} />
                </div>
                <div>
                  <label style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', display: 'block', marginBottom: '4px' }}>Weight (kg)</label>
                  <input type="text" value={weight} onChange={(e) => setWeight(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12px' }} />
                </div>
                <div>
                  <label style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', display: 'block', marginBottom: '4px' }}>BMI</label>
                  <input type="text" value={bmi} onChange={(e) => setBmi(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12px' }} />
                </div>
              </div>

              {/* Grid: Deficiencies checklist & Common Health Disorders */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>

                {/* Deficiencies Checklist */}
                <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px' }}>
                  <h4 style={{ margin: '0 0 10px 0', fontSize: '12px', fontWeight: 800, color: '#0284c7' }}>
                    Deficiencies checklist
                  </h4>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '11.5px' }}>
                    {deficiencyList.map((item) => (
                      <label key={item} style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', color: '#475569' }}>
                        <input
                          type="checkbox"
                          checked={Boolean(deficiencies[item])}
                          onChange={(e) => setDeficiencies({ ...deficiencies, [item]: e.target.checked })}
                        />
                        {item}
                      </label>
                    ))}
                  </div>
                </div>

                {/* Common Health Disorders */}
                <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px' }}>
                  <h4 style={{ margin: '0 0 10px 0', fontSize: '12px', fontWeight: 800, color: '#0284c7' }}>
                    Common Health Disorders
                  </h4>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {disordersList.map((item) => {
                      const isSel = Boolean(disorders[item]);
                      return (
                        <button
                          key={item}
                          onClick={() => setDisorders({ ...disorders, [item]: !isSel })}
                          style={{
                            padding: '4px 10px',
                            borderRadius: '16px',
                            border: isSel ? '1px solid #0284c7' : '1px solid #cbd5e1',
                            backgroundColor: isSel ? '#e0f2fe' : '#ffffff',
                            color: isSel ? '#0284c7' : '#475569',
                            fontSize: '10.5px',
                            fontWeight: 700,
                            cursor: 'pointer'
                          }}
                        >
                          {item}
                        </button>
                      );
                    })}
                  </div>
                </div>

              </div>

              {/* Other Diseases / Disorders & Symptoms/Signs Row */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ fontSize: '11.5px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>Other Diseases/Disorders</label>
                  <input type="text" value={otherDisorders} onChange={(e) => setOtherDisorders(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12px' }} />
                </div>
                <div>
                  <label style={{ fontSize: '11.5px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>Symptoms/Signs</label>
                  <input type="text" value={symptomsSigns} onChange={(e) => setSymptomsSigns(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12px' }} />
                </div>
              </div>

              {/* Foods to Eat & Foods to Avoid Textareas */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ fontSize: '11.5px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>Foods to Eat</label>
                  <textarea rows={3} value={foodsToEat} onChange={(e) => setFoodsToEat(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12px' }} />
                </div>
                <div>
                  <label style={{ fontSize: '11.5px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>Foods to Avoid</label>
                  <textarea rows={3} value={foodsToAvoid} onChange={(e) => setFoodsToAvoid(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12px' }} />
                </div>
              </div>

              {/* Fee Amount (₹) */}
              <div>
                <label style={{ fontSize: '11.5px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>Fee Amount (₹)</label>
                <input type="text" value={dietFeeAmount} onChange={(e) => setDietFeeAmount(e.target.value)} style={{ width: '200px', padding: '8px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12px' }} />
              </div>

              {/* 30-Day Diet Plan Menu */}
              <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <h3 style={{ margin: 0, fontSize: '13px', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    🗓 30-Day Diet Plan Menu
                  </h3>
                  <button style={{ backgroundColor: '#ffffff', border: '1px solid #cbd5e1', padding: '4px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: 700, cursor: 'pointer' }}>
                    ↗ Expand / Edit Popup
                  </button>
                </div>

                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11.5px', backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#f1f5f9', textAlign: 'left', color: '#475569', fontWeight: 800 }}>
                      <th style={{ padding: '8px 10px' }}>DAY</th>
                      <th style={{ padding: '8px 10px' }}>BREAKFAST</th>
                      <th style={{ padding: '8px 10px' }}>LUNCH</th>
                      <th style={{ padding: '8px 10px' }}>SNACKS</th>
                      <th style={{ padding: '8px 10px' }}>DINNER</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '8px 10px', fontWeight: 700 }}>1</td>
                      <td style={{ padding: '8px 10px' }}>Idli with Ginger Chutney & Sambhar</td>
                      <td style={{ padding: '8px 10px' }}>Ragi Roti + Mixed Dal + Sautéed Bhindi + Sprouted salad</td>
                      <td style={{ padding: '8px 10px' }}>Roasted Makhana with green tea</td>
                      <td style={{ padding: '8px 10px' }}>Moong Dal Khichdi + Lauki Raita + Roasted Papad</td>
                    </tr>
                  </tbody>
                </table>
              </div>

            </div>
          )}

          {/* TAB 3: SHARE MEDIA CONTENT */}
          {activeTab === 'media' && (
            <div style={{
              backgroundColor: '#ffffff',
              borderRadius: '14px',
              border: '1px solid #e2e8f0',
              padding: '24px',
              boxShadow: '0 2px 8px rgba(15, 23, 42, 0.03)',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2 style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: '#0f172a' }}>
                  Shared Media & Education
                </h2>
                <button
                  onClick={() => setShowGlobalMediaModal(true)}
                  style={{
                    backgroundColor: '#0284c7',
                    color: '#ffffff',
                    border: 'none',
                    padding: '8px 16px',
                    borderRadius: '8px',
                    fontSize: '12px',
                    fontWeight: 800,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  📁 Share Global Library Media
                </button>
              </div>

              {sharedMediaList.length === 0 ? (
                <div style={{
                  backgroundColor: '#ffffff',
                  border: '1px dashed #bae6fd',
                  borderRadius: '10px',
                  padding: '40px 20px',
                  textAlign: 'center',
                  color: '#64748b',
                  fontSize: '12px'
                }}>
                  No global media has been shared with this patient yet.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {sharedMediaList.map((item, idx) => (
                    <div key={idx} style={{ padding: '10px 14px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', fontWeight: 700 }}>
                      📄 {item}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 4: REGISTER PACKAGE CONTENT */}
          {activeTab === 'package' && (
            <div style={{
              backgroundColor: '#ffffff',
              borderRadius: '14px',
              border: '1px solid #e2e8f0',
              padding: '24px',
              boxShadow: '0 2px 8px rgba(15, 23, 42, 0.03)',
              display: 'flex',
              flexDirection: 'column',
              gap: '18px'
            }}>
              <h2 style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: '#0f172a' }}>
                Register Patient in Package
              </h2>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ fontSize: '11.5px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>
                    Total Package Amount (₹) *
                  </label>
                  <input
                    type="text"
                    placeholder="Enter total package cost"
                    value={totalPackageAmount}
                    onChange={(e) => setTotalPackageAmount(e.target.value)}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12px' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '11.5px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>
                    Initial Advance Paid (₹)
                  </label>
                  <input
                    type="text"
                    value={initialAdvancePaid}
                    onChange={(e) => setInitialAdvancePaid(e.target.value)}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12px' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: '11.5px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>
                  Package Purpose / Disease
                </label>
                <input
                  type="text"
                  placeholder="e.g. Chronic Asthma, Sinusitis"
                  value={packagePurpose}
                  onChange={(e) => setPackagePurpose(e.target.value)}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12px' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ fontSize: '11.5px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>
                    Package Duration
                  </label>
                  <select
                    value={packageDuration}
                    onChange={(e) => setPackageDuration(e.target.value)}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12px', backgroundColor: '#ffffff' }}
                  >
                    <option value="3 Months">3 Months</option>
                    <option value="6 Months">6 Months</option>
                    <option value="1 Year">1 Year</option>
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '11.5px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={packageStartDate}
                    onChange={(e) => setPackageStartDate(e.target.value)}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12px' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '11.5px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>
                    End Date
                  </label>
                  <input
                    type="date"
                    value={packageEndDate}
                    onChange={(e) => setPackageEndDate(e.target.value)}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12px', backgroundColor: '#f8fafc' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '10px' }}>
                <button
                  onClick={handleCreatePackage}
                  style={{
                    backgroundColor: '#0284c7',
                    color: '#ffffff',
                    border: 'none',
                    padding: '10px 24px',
                    borderRadius: '8px',
                    fontSize: '13px',
                    fontWeight: 800,
                    cursor: 'pointer',
                    boxShadow: '0 2px 8px rgba(2, 132, 199, 0.3)'
                  }}
                >
                  Create Package Membership
                </button>
              </div>

            </div>
          )}

        </div>

      </div>

      {/* SHARE GLOBAL MEDIA MODAL */}
      {showGlobalMediaModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.6)',
          zIndex: 10000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '16px'
        }}>
          <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', padding: '24px', width: '100%', maxWidth: '440px', boxShadow: '0 20px 25px rgba(0,0,0,0.2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px', marginBottom: '14px' }}>
              <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: '#0f172a' }}>Select Media to Share</h3>
              <button onClick={() => setShowGlobalMediaModal(false)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '18px' }}>×</button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {['Homeopathy Guidelines & Food Care PDF', 'Diet Routine Video Series', 'Skin & Hair Awareness Guide'].map(item => (
                <button
                  key={item}
                  onClick={() => {
                    if (!sharedMediaList.includes(item)) setSharedMediaList([...sharedMediaList, item]);
                    setShowGlobalMediaModal(false);
                  }}
                  style={{ padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: '#f8fafc', fontWeight: 700, cursor: 'pointer', textAlign: 'left' }}
                >
                  + {item}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
