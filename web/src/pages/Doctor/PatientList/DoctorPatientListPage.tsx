import React, { useState, useEffect, useMemo } from 'react';
import {
  Search,
  FileText,
  Pill,
  Calendar,
  MapPin,
  Clock,
  Phone,
  Eye,
  X,
  CreditCard,
  CheckCircle,
  AlertCircle,
  ExternalLink,
  ZoomIn
} from 'lucide-react';
import { sanitizeDoctorName } from '@app/shared';
import { receptionDataStore } from '../../../utils/receptionDataStore';

interface DoctorPatientListPageProps {
  doctorName?: string;
  doctorCategory?: string;
  onNavigateTab?: (tab: string, data?: any) => void;
}

// Resolve genuine UHID / Registration ID
const resolvePatientRegId = (data: any, pool?: any[]): string => {
  if (!data) return 'SPH-PAT-0001';

  const candidates = [
    data.registrationId,
    data.regId,
    data.uhid,
    data.patientId,
    data.regNo,
    data.fileNo,
    data.customId
  ];

  for (const c of candidates) {
    if (c && typeof c === 'string') {
      const t = c.trim();
      if (t.length > 0 && t.length <= 18 && !/^[a-zA-Z0-9]{19,32}$/.test(t)) {
        return t.toUpperCase();
      }
    }
  }

  const phone = String(data.phoneNumber || data.phone || data.mobile || '').replace(/\D/g, '').slice(-10);
  if (phone && pool && Array.isArray(pool)) {
    const match = pool.find(item => {
      if (!item) return false;
      const itemPhone = String(item.phoneNumber || item.phone || item.mobile || '').replace(/\D/g, '').slice(-10);
      return itemPhone === phone && (item.registrationId || item.regId || item.uhid || item.patientId);
    });
    if (match) {
      const itemReg = match.registrationId || match.regId || match.uhid || match.patientId;
      if (itemReg && typeof itemReg === 'string') {
        const t = itemReg.trim();
        if (t.length > 0 && t.length <= 18 && !/^[a-zA-Z0-9]{19,32}$/.test(t)) {
          return t.toUpperCase();
        }
      }
    }
  }

  const b = String(data.branch || data.branchName || 'KPHB').toUpperCase();
  let code = 'KPB';
  if (b.includes('KPHB')) code = 'KPB';
  else if (b.includes('CHANDANAGAR') || b.includes('CHN')) code = 'CHN';
  else if (b.includes('NALLAGANDLA') || b.includes('NGL')) code = 'NGL';
  else if (b.includes('DILSHUKNAGAR') || b.includes('DIL') || b.includes('DSNR')) code = 'DIL';

  const seedNum = phone.length >= 4 ? phone.slice(-4) : '0001';
  return `SPH-${code}-${seedNum}`;
};

// Extract all uploaded prescription scans and images
const extractImagesFromDoc = (data: any): string[] => {
  const images: string[] = [];
  const add = (v: any) => {
    if (!v) return;
    if (Array.isArray(v)) {
      v.forEach(x => {
        if (typeof x === 'string' && x.trim()) images.push(x.trim());
        else if (x && typeof x === 'object') {
          const u = x.url || x.imageUrl || x.prescriptionUrl || x.fileUrl || x.uri || x.downloadURL;
          if (u && typeof u === 'string') images.push(u.trim());
        }
      });
    } else if (typeof v === 'string' && v.trim()) {
      images.push(v.trim());
    } else if (v && typeof v === 'object') {
      const u = v.url || v.imageUrl || v.prescriptionUrl || v.fileUrl || v.uri || v.downloadURL;
      if (u && typeof u === 'string') images.push(u.trim());
    }
  };

  add(data.uploadedPrescriptions);
  add(data.prescriptionUrls);
  add(data.prescriptionUrl);
  add(data.prescriptionImage);
  add(data.prescriptionImages);
  add(data.canvasPrescriptionUrl);
  add(data.canvasUrl);
  add(data.reports);
  add(data.images);
  add(data.documents);
  add(data.media);
  add(data.rxUrl);
  add(data.rxUrls);

  return Array.from(new Set(images.filter(Boolean)));
};

// Extract real amount paid and status
const extractAmountPaid = (data: any): { amount: number; status: string; mode: string } => {
  const rawPaid = data.totalPaid ?? data.paidAmount ?? data.amountPaid ?? data.targetAmount ?? data.amount;
  const consultFee = Number(data.consultationFee) || 0;
  const medFee = Number(data.medicineFee || data.totalMedicineFee) || 0;
  const total = Number(data.totalAmount) || Math.max(0, consultFee + medFee);

  let amount = 0;
  let status = 'pending';
  const mode = data.paymentMode || 'Cash / Direct';

  if (rawPaid !== undefined && rawPaid !== null && rawPaid !== '' && !isNaN(Number(rawPaid))) {
    amount = Number(rawPaid);
    status = amount > 0 ? 'paid' : (data.paymentStatus || 'pending');
  } else if (String(data.paymentStatus).toLowerCase() === 'paid') {
    amount = total > 0 ? total : 0;
    status = 'paid';
  } else if (total > 0) {
    amount = total;
    status = data.paymentStatus || 'pending';
  }
  return { amount, status, mode };
};

// Extract prescribed remedies list
const extractMedicinesFromDoc = (data: any): any[] => {
  const docMedicines = data.items || data.medicines || data.remedies || data.prescribedMedicines || data.prescriptionItems || data.medications || data.rx || data.typedPrescriptions || [];
  if (!Array.isArray(docMedicines)) return [];
  return docMedicines.map(m => {
    if (typeof m === 'string') return { name: m, dosage: '4 Pills', frequency: 'Twice Daily', duration: '7 Days', instructions: '' };
    return {
      name: m.name || m.medicineName || m.remedyName || 'Remedy',
      dosage: m.dosage || '4 Pills',
      frequency: m.frequency || 'Twice Daily',
      duration: m.duration || '7 Days',
      instructions: m.instructions || ''
    };
  });
};

const normalizeDocString = (name?: string): string => {
  return String(name || '')
    .toLowerCase()
    .replace(/^dr\.\s*/i, '')
    .replace(/^dr\s*/i, '')
    .replace(/[^a-z0-9]/g, '')
    .trim();
};

const isDoctorMatch = (itemDoctor: string, currentDoctor: string, isHeadDoc: boolean): boolean => {
  const normCurrent = normalizeDocString(currentDoctor);
  if (!normCurrent) return true;
  const normItem = normalizeDocString(itemDoctor);
  if (!normItem) return isHeadDoc;
  if (normItem === normCurrent) return true;
  if (normItem.includes(normCurrent) || normCurrent.includes(normItem)) return true;
  if (normItem.length >= 4 && normCurrent.includes(normItem.substring(0, 5))) return true;
  if (normCurrent.length >= 4 && normItem.includes(normCurrent.substring(0, 5))) return true;
  return false;
};

export const DoctorPatientListPage: React.FC<DoctorPatientListPageProps> = ({
  doctorName = 'Dr. Prashanth K Vaidya',
  doctorCategory = 'Head Doctor',
  onNavigateTab
}) => {
  const isHeadDoctor = doctorCategory === 'Head Doctor' || doctorName.includes('Prashanth') || doctorName.includes('Rama');

  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState<'recent' | 'today' | 'yesterday' | 'all'>('recent');
  const [displayCount, setDisplayCount] = useState<number>(24);
  const [selectedPatientModal, setSelectedPatientModal] = useState<any | null>(null);
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);

  const [pool, setPool] = useState<any[]>(() => {
    const p = receptionDataStore.getAllCollectionsPool();
    return p.length > 0 ? p : receptionDataStore.getAppointments();
  });

  useEffect(() => {
    receptionDataStore.startListeners();
    const unsub = receptionDataStore.subscribe((state) => {
      const p = state.allCollectionsPool.length > 0 ? state.allCollectionsPool : state.appointments;
      setPool(p);
    });
    return () => unsub();
  }, []);

  // Today and date benchmarks
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  const todayStr = `${y}-${m}-${d}`;

  const yest = new Date(Date.now() - 86400000);
  const yd = String(yest.getDate()).padStart(2, '0');
  const ym = String(yest.getMonth() + 1).padStart(2, '0');
  const yy = yest.getFullYear();
  const yesterdayStr = `${yy}-${ym}-${yd}`;

  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000);
  const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().split('T')[0];

  // Filter only patients treated by THIS DOCTOR from ALL BRANCHES
  const doctorPatients = useMemo(() => {
    const list: any[] = [];
    const seen = new Set<string>();

    (pool || []).forEach((data, idx) => {
      if (!data) return;
      const rawDoc = data.doctorName || data.doctor || data.doctor_name || '';
      if (!isDoctorMatch(rawDoc, doctorName, isHeadDoctor)) return;

      const pPhone = String(data.phoneNumber || data.phone || data.mobile || '').replace(/\D/g, '').slice(-10);
      const pDate = String(data.appointmentDate || data.date || data.createdAt || todayStr).split('T')[0];
      const pTime = String(data.appointmentTime || data.time || '10:00 AM');
      const pReg = resolvePatientRegId(data, pool);

      const key = (pPhone && pDate) ? `${pPhone}_${pDate}_${pTime}` : (pReg && pDate) ? `${pReg}_${pDate}` : (data.id || String(idx));
      if (seen.has(key)) return;
      seen.add(key);

      const bName = data.branch || data.targetBranch || data.branchName || 'Clinic';
      const amtInfo = extractAmountPaid(data);
      const images = extractImagesFromDoc(data);
      const medicines = extractMedicinesFromDoc(data);

      list.push({
        ...data,
        id: data.id || data.docId || key,
        raw: data,
        patientName: data.patientName || data.name || data.fullName || 'Patient',
        phone: pPhone ? `+91 ${pPhone}` : (data.phone || 'N/A'),
        cleanPhone: pPhone,
        regId: pReg,
        branch: bName,
        appointmentDate: pDate,
        appointmentTime: pTime,
        doctorName: sanitizeDoctorName(rawDoc, bName),
        status: String(data.status || 'waiting').toLowerCase(),
        chiefComplaint: data.chiefComplaint || data.subject || data.diseases || data.reason || 'Consultation',
        diagnosisNotes: data.diagnosisNotes || data.diagnosis || data.clinicalNotes || data.doctorNotes || '',
        amountPaid: amtInfo.amount,
        paymentStatus: amtInfo.status,
        paymentMode: amtInfo.mode,
        images,
        medicines
      });
    });

    list.sort((a, b) => String(b.appointmentDate || '').localeCompare(String(a.appointmentDate || '')));
    return list;
  }, [pool, doctorName, isHeadDoctor, todayStr]);

  const filteredPatients = useMemo(() => {
    const isSearching = searchTerm.trim() !== '';
    const sTerm = searchTerm.toLowerCase().trim();
    const sDigits = searchTerm.replace(/\D/g, '');

    return doctorPatients.filter(patient => {
      const st = String(patient.status || 'waiting').toLowerCase();
      // 1. Date Session Filter (when not searching)
      if (!isSearching) {
        const pDate = patient.appointmentDate;
        if (dateFilter === 'today' && pDate !== todayStr) return false;
        if (dateFilter === 'yesterday' && pDate !== yesterdayStr) return false;
        if (dateFilter === 'recent' && pDate < thirtyDaysAgoStr && st !== 'waiting' && st !== 'in_consultation') return false;
      }

      // 2. Search Term
      if (isSearching) {
        const pName = String(patient.patientName || '').toLowerCase();
        const pPhone = String(patient.phone || '').replace(/\D/g, '');
        const pId = String(patient.registrationId || patient.regId || patient.id || '').toLowerCase();
        const pComplaint = String(patient.chiefComplaint || '').toLowerCase();

        const matchesName = pName.includes(sTerm);
        const matchesPhone = sDigits.length > 0 && pPhone.includes(sDigits);
        const matchesId = pId.includes(sTerm);
        const matchesComplaint = pComplaint.includes(sTerm);

        if (!matchesName && !matchesPhone && !matchesId && !matchesComplaint) return false;
      }

      return true;
    });
  }, [doctorPatients, dateFilter, searchTerm, todayStr, yesterdayStr, thirtyDaysAgoStr]);

  const displayedPatients = useMemo(() => {
    return filteredPatients.slice(0, displayCount);
  }, [filteredPatients, displayCount]);

  return (
    <div style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* Header Banner */}
      <div style={{
        background: '#ffffff',
        borderRadius: '16px',
        padding: '20px 24px',
        border: '1px solid #e2e8f0',
        boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '16px'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h1 style={{ fontSize: '20px', fontWeight: 800, color: '#0f172a', margin: 0 }}>My Patients Directory</h1>
            <span style={{ background: '#e0f2fe', color: '#0284c7', padding: '2px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: 800 }}>
              {filteredPatients.length} Patients
            </span>
          </div>
          <p style={{ color: '#64748b', fontSize: '13px', marginTop: '4px', margin: 0 }}>
            Treated by <strong>{doctorName}</strong> across all clinic branches.
          </p>
        </div>

        {/* Search & Filter Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            background: '#f8fafc',
            border: '1px solid #cbd5e1',
            borderRadius: '12px',
            padding: '0 12px',
            width: '280px',
            height: '40px'
          }}>
            <Search size={16} color="#64748b" style={{ marginRight: '8px' }} />
            <input
              type="text"
              placeholder="Search name, phone, or UHID..."
              value={searchTerm}
              onChange={e => { setSearchTerm(e.target.value); setDisplayCount(24); }}
              style={{ border: 'none', outline: 'none', background: 'transparent', width: '100%', fontSize: '12.5px', color: '#0f172a' }}
            />
          </div>

          {/* Date Chips */}
          <div style={{ display: 'flex', background: '#f1f5f9', borderRadius: '10px', padding: '3px' }}>
            {[
              { id: 'recent', label: 'Recent (30d)' },
              { id: 'today', label: 'Today' },
              { id: 'yesterday', label: 'Yesterday' },
              { id: 'all', label: 'All Dates' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => { setDateFilter(tab.id as any); setDisplayCount(24); }}
                style={{
                  border: 'none',
                  background: dateFilter === tab.id ? '#ffffff' : 'transparent',
                  color: dateFilter === tab.id ? '#0284c7' : '#64748b',
                  fontWeight: dateFilter === tab.id ? 800 : 600,
                  fontSize: '11.5px',
                  padding: '6px 10px',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  boxShadow: dateFilter === tab.id ? '0 2px 6px rgba(0,0,0,0.05)' : 'none',
                  transition: 'all 0.15s ease'
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Patient Directory Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '18px' }}>
        {displayedPatients.map((patient) => {
          const hasPaid = patient.amountPaid > 0 || patient.paymentStatus === 'paid';

          return (
            <div
              key={patient.id}
              onClick={() => setSelectedPatientModal(patient)}
              style={{
                background: '#ffffff',
                borderRadius: '16px',
                padding: '18px',
                border: '1px solid #e2e8f0',
                boxShadow: '0 4px 12px rgba(0,0,0,0.03)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                gap: '12px',
                cursor: 'pointer',
                transition: 'transform 0.15s ease, box-shadow 0.15s ease'
              }}
            >
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <h3 style={{ fontSize: '15px', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                      {patient.patientName}
                    </h3>
                    <p style={{ fontSize: '12px', color: '#64748b', marginTop: '2px', margin: 0 }}>
                      ID: <span style={{ color: '#0284c7', fontWeight: 800 }}>{patient.regId}</span>
                      {patient.age ? ` • ${patient.age} yrs` : ''}
                      {patient.gender ? ` • ${patient.gender}` : ''}
                    </p>
                  </div>
                  
                  {/* Amount Paid Pill */}
                  <span style={{
                    padding: '4px 10px',
                    borderRadius: '8px',
                    fontSize: '11px',
                    fontWeight: 800,
                    background: hasPaid ? '#dcfce7' : '#fef3c7',
                    color: hasPaid ? '#15803d' : '#b45309',
                    border: hasPaid ? '1px solid #bbf7d0' : '1px solid #fde68a'
                  }}>
                    {hasPaid ? `₹${patient.amountPaid || '500'} Paid ✓` : (patient.amountPaid ? `₹${patient.amountPaid} Due` : 'Fee Pending')}
                  </span>
                </div>

                {/* Details Row: Branch, Date, Time */}
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginTop: '10px', color: '#64748b', fontSize: '11.5px', flexWrap: 'wrap' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <MapPin size={12} color="#0284c7" />
                    <strong>{patient.branch}</strong>
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Calendar size={12} />
                    {patient.appointmentDate}
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Clock size={12} />
                    {patient.appointmentTime}
                  </span>
                </div>

                <div style={{ background: '#f8fafc', borderRadius: '10px', padding: '10px', marginTop: '10px', border: '1px solid #f1f5f9' }}>
                  <p style={{ fontSize: '12px', color: '#334155', margin: 0 }}>
                    <strong style={{ color: '#0f172a' }}>Complaint:</strong> {patient.chiefComplaint}
                  </p>
                  {patient.diagnosisNotes ? (
                    <p style={{ fontSize: '12px', color: '#0369a1', margin: '4px 0 0 0', fontWeight: 600 }}>
                      <strong>Diagnosis:</strong> {patient.diagnosisNotes}
                    </p>
                  ) : null}
                </div>
              </div>

              {/* Card Footer: Phone + View Details & Rx Popup Trigger (Replaces Open Patient File) */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '10px', borderTop: '1px solid #f1f5f9' }}>
                <span style={{ fontSize: '12px', fontFamily: 'monospace', color: '#475569', fontWeight: 700 }}>📞 {patient.phone}</span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedPatientModal(patient);
                  }}
                  style={{
                    background: '#0284c7',
                    color: '#ffffff',
                    border: 'none',
                    padding: '7px 14px',
                    borderRadius: '8px',
                    fontSize: '12px',
                    fontWeight: 800,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    boxShadow: '0 2px 6px rgba(2,132,199,0.25)'
                  }}
                >
                  <Eye size={14} color="#ffffff" />
                  <span>View Details & Rx</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Pagination Load More Button */}
      {displayCount < filteredPatients.length && (
        <div style={{ display: 'flex', justifyContent: 'center', margin: '20px 0' }}>
          <button
            type="button"
            onClick={() => setDisplayCount(prev => prev + 24)}
            style={{
              background: '#0284c7',
              color: '#ffffff',
              border: 'none',
              borderRadius: '10px',
              padding: '10px 24px',
              fontSize: '13px',
              fontWeight: 800,
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(2,132,199,0.25)'
            }}
          >
            Load More Patients ({displayCount} of {filteredPatients.length})
          </button>
        </div>
      )}

      {/* PATIENT DETAILS & PRESCRIPTION POPUP MODAL */}
      {selectedPatientModal && (
        <div
          onClick={() => setSelectedPatientModal(null)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '20px'
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: '#ffffff',
              borderRadius: '20px',
              width: '100%',
              maxWidth: '820px',
              maxHeight: '90vh',
              overflowY: 'auto',
              boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
              display: 'flex',
              flexDirection: 'column'
            }}
          >
            {/* Modal Header */}
            <div style={{
              padding: '18px 24px',
              borderBottom: '1px solid #e2e8f0',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              position: 'sticky',
              top: 0,
              background: '#ffffff',
              zIndex: 10
            }}>
              <div>
                <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                  {selectedPatientModal.patientName}
                </h2>
                <p style={{ fontSize: '12.5px', color: '#64748b', margin: '2px 0 0 0' }}>
                  UHID: <strong style={{ color: '#0284c7' }}>{selectedPatientModal.regId}</strong>
                  {selectedPatientModal.age ? ` • ${selectedPatientModal.age} yrs` : ''}
                  {selectedPatientModal.gender ? ` • ${selectedPatientModal.gender}` : ''}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedPatientModal(null)}
                style={{
                  background: '#f1f5f9',
                  border: 'none',
                  borderRadius: '50%',
                  width: '34px',
                  height: '34px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <X size={18} color="#64748b" />
              </button>
            </div>

            {/* Modal Content */}
            <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
              
              {/* 1. Patient & Visit Info */}
              <div style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '12px',
                padding: '16px',
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                gap: '12px'
              }}>
                <div>
                  <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Visit Date & Time</span>
                  <p style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a', margin: '3px 0 0 0' }}>
                    📅 {selectedPatientModal.appointmentDate} ({selectedPatientModal.appointmentTime})
                  </p>
                </div>
                <div>
                  <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Clinic Branch</span>
                  <p style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a', margin: '3px 0 0 0' }}>
                    📍 {selectedPatientModal.branch}
                  </p>
                </div>
                <div>
                  <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Treating Doctor</span>
                  <p style={{ fontSize: '13px', fontWeight: 700, color: '#0284c7', margin: '3px 0 0 0' }}>
                    🩺 {selectedPatientModal.doctorName}
                  </p>
                </div>
                <div>
                  <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Phone Contact</span>
                  <p style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a', margin: '3px 0 0 0' }}>
                    📞 {selectedPatientModal.phone}
                  </p>
                </div>
              </div>

              {/* 2. Amount & Payment Details */}
              <div style={{
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '12px',
                padding: '16px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                  <CreditCard size={18} color="#0284c7" />
                  <h3 style={{ fontSize: '14px', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                    Amount & Billing Details
                  </h3>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>
                  <div style={{
                    padding: '12px 18px',
                    borderRadius: '10px',
                    background: selectedPatientModal.amountPaid > 0 || selectedPatientModal.paymentStatus === 'paid' ? '#f0fdf4' : '#fffbeb',
                    border: selectedPatientModal.amountPaid > 0 || selectedPatientModal.paymentStatus === 'paid' ? '1px solid #bbf7d0' : '1px solid #fde68a'
                  }}>
                    <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 700 }}>Amount Paid</span>
                    <p style={{
                      fontSize: '20px',
                      fontWeight: 900,
                      margin: '2px 0 0 0',
                      color: selectedPatientModal.amountPaid > 0 || selectedPatientModal.paymentStatus === 'paid' ? '#15803d' : '#b45309'
                    }}>
                      ₹{selectedPatientModal.amountPaid || '0'}
                    </p>
                  </div>
                  <div>
                    <p style={{ fontSize: '13px', color: '#334155', margin: '0 0 4px 0' }}>
                      <strong>Status:</strong>{' '}
                      <span style={{
                        fontWeight: 800,
                        color: selectedPatientModal.paymentStatus === 'paid' ? '#16a34a' : '#ea580c'
                      }}>
                        {(selectedPatientModal.paymentStatus || 'pending').toUpperCase()}
                      </span>
                    </p>
                    <p style={{ fontSize: '13px', color: '#334155', margin: 0 }}>
                      <strong>Payment Mode:</strong> {selectedPatientModal.paymentMode || 'Cash / Direct'}
                    </p>
                  </div>
                </div>
              </div>

              {/* 3. Prescribed Medicines */}
              <div style={{
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '12px',
                padding: '16px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                  <Pill size={18} color="#0284c7" />
                  <h3 style={{ fontSize: '14px', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                    Prescribed Medicines ({selectedPatientModal.medicines?.length || 0})
                  </h3>
                </div>

                {selectedPatientModal.medicines && selectedPatientModal.medicines.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {selectedPatientModal.medicines.map((med: any, idx: number) => (
                      <div
                        key={idx}
                        style={{
                          background: '#f8fafc',
                          border: '1px solid #f1f5f9',
                          borderRadius: '8px',
                          padding: '10px 14px',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          flexWrap: 'wrap',
                          gap: '8px'
                        }}
                      >
                        <div>
                          <p style={{ fontSize: '13.5px', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                            {idx + 1}. {med.name}
                          </p>
                          {med.instructions ? (
                            <p style={{ fontSize: '11.5px', color: '#64748b', margin: '2px 0 0 0' }}>
                              Note: {med.instructions}
                            </p>
                          ) : null}
                        </div>
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <span style={{ background: '#e0f2fe', color: '#0284c7', fontSize: '11px', fontWeight: 700, padding: '3px 8px', borderRadius: '6px' }}>
                            {med.dosage}
                          </span>
                          <span style={{ background: '#f1f5f9', color: '#475569', fontSize: '11px', fontWeight: 700, padding: '3px 8px', borderRadius: '6px' }}>
                            {med.frequency}
                          </span>
                          <span style={{ background: '#fef3c7', color: '#b45309', fontSize: '11px', fontWeight: 700, padding: '3px 8px', borderRadius: '6px' }}>
                            {med.duration}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ padding: '16px', background: '#f8fafc', borderRadius: '8px', textAlign: 'center', color: '#94a3b8', fontSize: '13px' }}>
                    No typed medicines prescribed for this consultation.
                  </div>
                )}
              </div>

              {/* 4. Uploaded Prescription Scans & Reports */}
              <div style={{
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '12px',
                padding: '16px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                  <FileText size={18} color="#0284c7" />
                  <h3 style={{ fontSize: '14px', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                    Uploaded Prescription Scans & Drawings ({selectedPatientModal.images?.length || 0})
                  </h3>
                </div>

                {selectedPatientModal.images && selectedPatientModal.images.length > 0 ? (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '12px' }}>
                    {selectedPatientModal.images.map((imgUrl: string, idx: number) => (
                      <div
                        key={idx}
                        onClick={() => setPreviewImageUrl(imgUrl)}
                        style={{
                          borderRadius: '10px',
                          overflow: 'hidden',
                          border: '1px solid #e2e8f0',
                          position: 'relative',
                          cursor: 'pointer',
                          aspectRatio: '1',
                          background: '#f8fafc'
                        }}
                      >
                        <img
                          src={imgUrl}
                          alt={`Prescription ${idx + 1}`}
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                        <div style={{
                          position: 'absolute',
                          bottom: 4,
                          right: 4,
                          background: 'rgba(0,0,0,0.6)',
                          borderRadius: '6px',
                          padding: '4px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}>
                          <ZoomIn size={14} color="#ffffff" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ padding: '16px', background: '#f8fafc', borderRadius: '8px', textAlign: 'center', color: '#94a3b8', fontSize: '13px' }}>
                    No prescription scans or images attached to this record.
                  </div>
                )}
              </div>

              {/* 5. Complaints & Clinical Diagnosis Notes */}
              <div style={{
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '12px',
                padding: '16px'
              }}>
                <h3 style={{ fontSize: '14px', fontWeight: 800, color: '#0f172a', margin: '0 0 8px 0' }}>
                  Clinical Notes & Symptoms
                </h3>
                <p style={{ fontSize: '13px', color: '#334155', margin: '0 0 6px 0' }}>
                  <strong>Chief Complaint:</strong> {selectedPatientModal.chiefComplaint}
                </p>
                {selectedPatientModal.diagnosisNotes ? (
                  <p style={{ fontSize: '13px', color: '#0369a1', margin: 0, fontWeight: 600 }}>
                    <strong>Diagnosis Notes:</strong> {selectedPatientModal.diagnosisNotes}
                  </p>
                ) : null}
              </div>

            </div>

            {/* Modal Footer */}
            <div style={{
              padding: '16px 24px',
              borderTop: '1px solid #e2e8f0',
              display: 'flex',
              justifyContent: 'flex-end',
              background: '#f8fafc',
              borderBottomLeftRadius: '20px',
              borderBottomRightRadius: '20px'
            }}>
              <button
                type="button"
                onClick={() => setSelectedPatientModal(null)}
                style={{
                  background: '#0284c7',
                  color: '#ffffff',
                  border: 'none',
                  padding: '9px 20px',
                  borderRadius: '10px',
                  fontSize: '13px',
                  fontWeight: 800,
                  cursor: 'pointer'
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FULL-SIZE IMAGE PREVIEW MODAL */}
      {previewImageUrl && (
        <div
          onClick={() => setPreviewImageUrl(null)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.9)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100000,
            padding: '20px'
          }}
        >
          <div style={{ position: 'relative', maxWidth: '90vw', maxHeight: '90vh' }}>
            <img
              src={previewImageUrl}
              alt="Prescription Full Preview"
              style={{ maxWidth: '100%', maxHeight: '85vh', objectFit: 'contain', borderRadius: '8px' }}
            />
            <button
              type="button"
              onClick={() => setPreviewImageUrl(null)}
              style={{
                position: 'absolute',
                top: '-40px',
                right: '0px',
                background: '#ffffff',
                border: 'none',
                borderRadius: '50%',
                width: '36px',
                height: '36px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <X size={20} color="#0f172a" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
