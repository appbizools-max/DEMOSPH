import React, { useState, useEffect, useRef } from 'react';
import {
  Users,
  MapPin,
  Stethoscope,
  Check,
  CheckCircle2,
  Clock,
  Calendar,
  UserCheck,
  X,
  Plus,
  Trash2,
  Save,
  FileText,
  Activity,
  Apple,
  FolderPlus,
  UploadCloud
} from 'lucide-react';
import { db } from '@app/shared';
import { collection, onSnapshot, updateDoc, doc, addDoc } from 'firebase/firestore';
import { PatientFileUI } from '../../../components/PatientFileUI';

interface DoctorDashboardPageProps {
  doctorCategory?: string;
  doctorName?: string;
  onNavigateTab?: (tab: string, data?: any) => void;
}

interface MedicineItem {
  medicineName: string;
  dosage: string;
  frequency: string;
  timing: string;
  duration: string;
}

export const DoctorDashboardPage: React.FC<DoctorDashboardPageProps> = ({
  doctorCategory = 'Head Doctor',
  doctorName = 'Dr. Prashanth K Vaidya',
  onNavigateTab,
}) => {
  const [selectedBranch, setSelectedBranch] = useState<string>('KPHB Branch');
  const [appointments, setAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeFilter, setActiveFilter] = useState<'all' | 'waiting' | 'completed'>('all');

  // Consultation Modal State
  const [activeConsultPatient, setActiveConsultPatient] = useState<any | null>(null);
  const [consultTab, setConsultTab] = useState<'clinical' | 'nutrition' | 'media'>('clinical');
  const [vitals, setVitals] = useState({ bp: '120/80', pulse: '72', temp: '98.6', weight: '68', spo2: '98' });
  const [chiefComplaints, setChiefComplaints] = useState('');
  const [medicalHistory, setMedicalHistory] = useState('');
  const [typedPrescriptions, setTypedPrescriptions] = useState<MedicineItem[]>([
    { medicineName: 'Allium Cepa 30C', dosage: '4 pills', frequency: '1-0-1', timing: 'Before Food', duration: '15 Days' }
  ]);
  const [newMed, setNewMed] = useState<MedicineItem>({ medicineName: '', dosage: '4 pills', frequency: '1-0-1', timing: 'Before Food', duration: '15 Days' });
  const [followUpInterval, setFollowUpInterval] = useState('15 Days');
  const [followUpDate, setFollowUpDate] = useState('');
  const [consultationFee, setConsultationFee] = useState<number>(500);
  const [medicineFeeRequested, setMedicineFeeRequested] = useState<number>(1200);
  const [dietNotes, setDietNotes] = useState('Homeopathic Diet: Avoid camphor, raw onion/garlic 30 mins before/after remedy.');
  const [selectedDietTemplate, setSelectedDietTemplate] = useState('General Homeopathy Diet');
  const [selectedMediaFolders, setSelectedMediaFolders] = useState<string[]>(['Patient Awareness Guide']);
  const [submitting, setSubmitting] = useState(false);
  const [successToast, setSuccessToast] = useState('');

  // Freehand Canvas State
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [canvasHasContent, setCanvasHasContent] = useState(false);

  const todayStr = new Date().toISOString().split('T')[0];
  const formattedToday = new Date().toLocaleDateString('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  const isActualAppointment = (item: any, colName: string) => {
    if (colName === 'appointments') return true;
    const hasApptDate = Boolean(item.appointmentDate || item.date || item.slotDate);
    const hasApptStatus = Boolean(item.status && item.status !== 'registered');
    const hasDoctor = Boolean(item.doctorName || item.doctor || item.doctor_name);
    const hasQueueOrder = typeof item.queueOrder === 'number';
    return hasApptDate || hasApptStatus || hasDoctor || hasQueueOrder;
  };

  const isWaitingOrActiveStatus = (st: string) => {
    const s = (st || '').toLowerCase();
    return s === 'waiting' || s === 'booked' || s === 'scheduled' || s === 'active' || s === 'in_consultation' || s === 'in-consultation' || s === 'in consult';
  };

  useEffect(() => {
    let unsubApp: (() => void) | null = null;
    let unsubAllPat: (() => void) | null = null;

    let appList: any[] = [];
    let allPatList: any[] = [];

    const mergeAndFilter = () => {
      const combined = [...appList, ...allPatList];

      const filtered = combined.filter((item) => {
        const statusStr = (item.status || '').toLowerCase();
        if (statusStr === 'cancelled' || statusStr === 'rejected') return false;
        if (!isActualAppointment(item, item.collectionName)) return false;

        const docName = (item.doctorName || item.doctor || '').toLowerCase();
        const curDocName = (doctorName || '').toLowerCase();

        const docMatch =
          !docName ||
          docName.includes(curDocName) ||
          curDocName.includes(docName) ||
          docName.includes('spiritual') ||
          docName.includes('head');

        return docMatch;
      });

      const uniqueMap = new Map<string, any>();
      filtered.forEach((item) => {
        const key = `${item.phone || item.id}_${item.patientName || item.name}`;
        if (!uniqueMap.has(key)) {
          uniqueMap.set(key, item);
        }
      });

      const list = Array.from(uniqueMap.values());

      list.sort((a, b) => {
        const timeA = a.appointmentTime || a.time || '00:00';
        const timeB = b.appointmentTime || b.time || '00:00';
        const strA = String(timeA).toLowerCase();
        const strB = String(timeB).toLowerCase();
        return strB.localeCompare(strA);
      });

      setAppointments(list);
      setLoading(false);
    };

    try {
      unsubApp = onSnapshot(collection(db, 'appointments'), (snapshot) => {
        appList = snapshot.docs.map((d) => ({
          ...d.data(),
          id: d.id,
          docId: d.id,
          collectionName: 'appointments',
          displayStatus: (d.data().status || 'waiting').toLowerCase(),
        }));
        mergeAndFilter();
      });

      unsubAllPat = onSnapshot(collection(db, 'allpatients'), (snapshot) => {
        allPatList = snapshot.docs.map((d) => ({
          ...d.data(),
          id: d.id,
          docId: d.id,
          collectionName: 'allpatients',
          displayStatus: (d.data().status || 'waiting').toLowerCase(),
        }));
        mergeAndFilter();
      });
    } catch (err) {
      console.warn('Error subscribing to web doctor appointments:', err);
      setLoading(false);
    }

    return () => {
      if (unsubApp) unsubApp();
      if (unsubAllPat) unsubAllPat();
    };
  }, [doctorName, todayStr]);

  // Set auto follow-up date based on interval picker
  useEffect(() => {
    const today = new Date();
    if (followUpInterval === '15 Days') {
      today.setDate(today.getDate() + 15);
      setFollowUpDate(today.toISOString().split('T')[0]);
    } else if (followUpInterval === '1 Month') {
      today.setMonth(today.getMonth() + 1);
      setFollowUpDate(today.toISOString().split('T')[0]);
    } else if (followUpInterval === '2 Months') {
      today.setMonth(today.getMonth() + 2);
      setFollowUpDate(today.toISOString().split('T')[0]);
    }
  }, [followUpInterval]);

  const handleUpdateStatus = async (appId: string, collectionName: string | undefined, newStatus: string) => {
    try {
      console.log(`[DoctorDashboard] Updating status for doc ID "${appId}" to "${newStatus}" in collection "${collectionName || 'appointments'}"`);
      setAppointments((prev) =>
        prev.map((a) => (a.id === appId || a.docId === appId ? { ...a, displayStatus: newStatus.toLowerCase() } : a))
      );

      const payload = { status: newStatus, updatedAt: new Date().toISOString() };
      const targetCol = collectionName || 'appointments';
      await updateDoc(doc(db, targetCol, appId), payload).catch((e) => console.warn(`Update notice for ${targetCol}/${appId}:`, e));
      await updateDoc(doc(db, 'appointments', appId), payload).catch((e) => console.warn(`Update notice for appointments/${appId}:`, e));
      await updateDoc(doc(db, 'allpatients', appId), payload).catch((e) => console.warn(`Update notice for allpatients/${appId}:`, e));
      await updateDoc(doc(db, 'patients', appId), payload).catch((e) => console.warn(`Update notice for patients/${appId}:`, e));
    } catch (err) {
      console.error('Error updating status on web:', err);
    }
  };

  const handleStartConsultation = (patient: any) => {
    handleUpdateStatus(patient.id, patient.collectionName, 'in_consultation');

    // Rule 6: Fee Auto-Zero Rule if follow-up or active package
    const isFollowUp = patient.isFollowUp || patient.type === 'Follow-up' || patient.hasActivePackage;
    setConsultationFee(isFollowUp ? 0 : 500);

    setChiefComplaints(patient.diseases || patient.subject || '');
    setMedicalHistory(patient.medicalHistory || 'No known allergies.');

    if (onNavigateTab) {
      onNavigateTab('patient_file', patient);
    } else {
      setActiveConsultPatient(patient);
      setConsultTab('clinical');
    }
  };

  const handleAddMedicine = () => {
    if (!newMed.medicineName.trim()) return;
    setTypedPrescriptions([...typedPrescriptions, newMed]);
    setNewMed({ medicineName: '', dosage: '4 pills', frequency: '1-0-1', timing: 'Before Food', duration: '15 Days' });
  };

  const handleRemoveMedicine = (idx: number) => {
    setTypedPrescriptions(typedPrescriptions.filter((_, i) => i !== idx));
  };

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
    ctx.strokeStyle = '#258ec8';
    ctx.lineWidth = 2;
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

  const handleSubmitConsultation = async () => {
    if (!activeConsultPatient) return;
    setSubmitting(true);

    try {
      let canvasUrl = '';
      if (canvasRef.current && canvasHasContent) {
        canvasUrl = canvasRef.current.toDataURL('image/png');
      }

      const patientId = activeConsultPatient.patientId || activeConsultPatient.id || 'PAT-' + Date.now();
      const patName = activeConsultPatient.patientName || activeConsultPatient.name || 'Patient';
      const patPhone = activeConsultPatient.phone || activeConsultPatient.phoneNumber || '';
      const patBranch = activeConsultPatient.branch || 'KPHB Branch';

      // 1. Update status to 'completed'
      await handleUpdateStatus(activeConsultPatient.id, activeConsultPatient.collectionName, 'completed');

      // 2. Create record in `medicine_requests`
      await addDoc(collection(db, 'medicine_requests'), {
        appointmentId: activeConsultPatient.id,
        patientId,
        patientName: patName,
        phone: patPhone,
        doctorName: doctorName,
        branch: patBranch,
        items: typedPrescriptions,
        totalMedicineFee: Number(medicineFeeRequested) || 0,
        consultationFee: Number(consultationFee) || 0,
        canvasPrescriptionUrl: canvasUrl || `prescriptions/${patientId}_${Date.now()}_canvas.png`,
        status: 'pending_dispense',
        createdAt: new Date().toISOString()
      });

      // 3. Create record in `followups` if scheduled
      if (followUpDate) {
        await addDoc(collection(db, 'followups'), {
          patientId,
          patientName: patName,
          phone: patPhone,
          doctorName,
          branch: patBranch,
          scheduledDate: followUpDate,
          interval: followUpInterval,
          status: 'scheduled',
          notes: chiefComplaints,
          createdAt: new Date().toISOString()
        });
      }

      setSuccessToast(`Prescription for ${patName} submitted successfully! Sent to Reception counter.`);
      setTimeout(() => {
        setSuccessToast('');
        setActiveConsultPatient(null);
      }, 2500);

    } catch (err) {
      console.error('Error submitting consultation:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const displayedList = appointments.filter((a) => {
    if (activeFilter === 'waiting') return isWaitingOrActiveStatus(a.displayStatus);
    if (activeFilter === 'completed') return !isWaitingOrActiveStatus(a.displayStatus);
    return true;
  });

  return (
    <div style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '20px', fontFamily: 'Inter, system-ui, sans-serif' }}>

      {/* Top Success Toast */}
      {successToast && (
        <div style={{ background: '#10b981', color: '#ffffff', padding: '14px 20px', borderRadius: '10px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '10px', boxShadow: '0 4px 12px rgba(16,185,129,0.3)' }}>
          <CheckCircle2 size={20} />
          <span>{successToast}</span>
        </div>
      )}

      {/* Top Banner Card: Doctor Info */}
      <div style={{
        backgroundColor: '#ffffff',
        borderRadius: '16px',
        border: '1px solid #e2e8f0',
        padding: '20px 24px',
        boxShadow: '0 2px 8px rgba(15, 23, 42, 0.03)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '16px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: '#258ec8', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', fontWeight: 800 }}>
            {(doctorName || 'D').replace(/^Dr\.\s*/i, '').charAt(0)}
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: '#0f172a' }}>{doctorName}</h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
              <span style={{ backgroundColor: '#f1f5f9', color: '#475569', fontSize: '0.78rem', fontWeight: 700, padding: '2px 8px', borderRadius: '6px' }}>
                {doctorCategory}
              </span>
              <span style={{ fontSize: '0.82rem', color: '#64748b', fontWeight: 600 }}>
                📅 {formattedToday}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 3 Metric Stat Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '18px' }}>
        <div
          onClick={() => setActiveFilter('all')}
          style={{
            background: activeFilter === 'all' ? '#f0f9ff' : '#ffffff',
            borderRadius: '16px',
            padding: '20px',
            border: activeFilter === 'all' ? '2px solid #258ec8' : '1px solid #e2e8f0',
            cursor: 'pointer',
            boxShadow: '0 2px 8px rgba(15, 23, 42, 0.03)'
          }}
        >
          <div style={{ color: '#64748b', fontSize: '13px', fontWeight: 700 }}>Today's Total Patients</div>
          <div style={{ fontSize: '28px', fontWeight: 800, color: '#0f172a', marginTop: '6px' }}>{appointments.length}</div>
        </div>

        <div
          onClick={() => setActiveFilter('waiting')}
          style={{
            background: activeFilter === 'waiting' ? '#fffbeb' : '#ffffff',
            borderRadius: '16px',
            padding: '20px',
            border: activeFilter === 'waiting' ? '2px solid #f59e0b' : '1px solid #e2e8f0',
            cursor: 'pointer',
            boxShadow: '0 2px 8px rgba(15, 23, 42, 0.03)'
          }}
        >
          <div style={{ color: '#b45309', fontSize: '13px', fontWeight: 700 }}>Waiting / In Consult</div>
          <div style={{ fontSize: '28px', fontWeight: 800, color: '#d97706', marginTop: '6px' }}>
            {appointments.filter(a => isWaitingOrActiveStatus(a.displayStatus)).length}
          </div>
        </div>

        <div
          onClick={() => setActiveFilter('completed')}
          style={{
            background: activeFilter === 'completed' ? '#f0fdf4' : '#ffffff',
            borderRadius: '16px',
            padding: '20px',
            border: activeFilter === 'completed' ? '2px solid #16a34a' : '1px solid #e2e8f0',
            cursor: 'pointer',
            boxShadow: '0 2px 8px rgba(15, 23, 42, 0.03)'
          }}
        >
          <div style={{ color: '#15803d', fontSize: '13px', fontWeight: 700 }}>Completed Consultations</div>
          <div style={{ fontSize: '28px', fontWeight: 800, color: '#16a34a', marginTop: '6px' }}>
            {appointments.filter(a => !isWaitingOrActiveStatus(a.displayStatus)).length}
          </div>
        </div>
      </div>

      {/* Main Queue Section */}
      <div style={{ background: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '24px', boxShadow: '0 2px 8px rgba(15, 23, 42, 0.03)' }}>
        <h3 style={{ fontSize: '17px', fontWeight: 800, color: '#0f172a', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <UserCheck size={20} color="#258ec8" /> Today's Consultation Queue
        </h3>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {loading ? (
            <div style={{ padding: '20px', textAlign: 'center', color: '#64748b', fontSize: '13px' }}>
              Syncing with Reception Queue...
            </div>
          ) : displayedList.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8', fontSize: '13px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
              <UserCheck size={32} color="#cbd5e1" />
              <span>No patient queue today.</span>
            </div>
          ) : (
            displayedList.map((item, index) => {
              const isDone = item.displayStatus === 'completed' || item.displayStatus === 'done';
              const isInConsult = item.displayStatus === 'in_consultation' || item.displayStatus === 'in consult' || item.displayStatus === 'in-consultation';

              return (
                <div
                  key={item.id}
                  style={{
                    padding: '16px',
                    borderRadius: '14px',
                    border: isInConsult ? '2px solid #258ec8' : '1px solid #e2e8f0',
                    background: isInConsult ? '#f0f9ff' : '#ffffff',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '12px'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ width: '36px', height: '36px', borderRadius: '18px', background: '#e0f2fe', color: '#258ec8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '12px' }}>
                      {(item.patientName || item.name || 'P').substring(0, 2).toUpperCase()}
                    </div>

                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '14px', fontWeight: 800, color: '#0f172a' }}>
                          {item.patientName || item.name}
                        </span>
                        <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>
                          Reg ID: <strong style={{ color: '#258ec8' }}>{item.registrationId || item.regId || `REG-${index + 1001}`}</strong> • +91 {item.phone || item.phoneNumber || 'N/A'}
                        </span>
                      </div>
                      {(item.diseases || item.subject) && (
                        <div style={{ marginTop: '6px', background: '#f8fafc', padding: '6px 10px', borderRadius: '6px', border: '1px solid #f1f5f9', fontSize: '11.5px', color: '#475569' }}>
                          Complaints: {item.diseases || item.subject}
                        </div>
                      )}
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{
                      padding: '4px 10px',
                      borderRadius: '6px',
                      fontSize: '10px',
                      fontWeight: 800,
                      background: isDone ? '#dcfce7' : isInConsult ? '#e0f2fe' : '#fef3c7',
                      color: isDone ? '#166534' : isInConsult ? '#0284c7' : '#b45309'
                    }}>
                      {isDone ? 'DONE ✓' : isInConsult ? 'IN CONSULT' : 'WAITING'}
                    </span>

                    {!isDone && (
                      <button
                        type="button"
                        onClick={() => handleStartConsultation(item)}
                        style={{
                          background: isInConsult ? '#16a34a' : '#258ec8',
                          color: '#ffffff',
                          border: 'none',
                          padding: '7px 14px',
                          borderRadius: '8px',
                          fontSize: '12px',
                          fontWeight: 800,
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}
                      >
                        <Stethoscope size={16} />
                        {isInConsult ? 'Resume Consultation' : 'Start Consultation'}
                      </button>
                    )}

                    {isDone && (
                      <div style={{ background: '#f0fdf4', padding: '5px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: 700, color: '#16a34a' }}>
                        Consultation Finished ✓
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* DOCTOR CONSULTATION / PATIENT FILE UI MODAL */}
      {activeConsultPatient && (
        <PatientFileUI
          patient={activeConsultPatient}
          doctorName={doctorName}
          onClose={() => setActiveConsultPatient(null)}
          onSubmitConsultation={async (data) => {
            await handleSubmitConsultation();
          }}
        />
      )}

    </div>
  );
};
