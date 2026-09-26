import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Alert, Modal, TextInput, Image, Linking, Platform, FlatList, Dimensions } from 'react-native';
import { Feather, MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { getSafeDb, collection, updateDoc, doc, addDoc } from '../../../utils/firebaseSafe';
import { receptionDataStore } from '../../../utils/receptionDataStore';

interface DoctorDashboardProps {
  doctorName?: string;
  doctorCategory?: string;
  onNavigateTab?: (tab: string, patient?: any) => void;
}
interface MedicineItem {
  medicineName: string;
  dosage: string;
  frequency: string;
  timing: string;
  duration: string;
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

export const DoctorDashboardScreen: React.FC<DoctorDashboardProps> = ({
  doctorName = 'Dr. Prashanth K Vaidya',
  doctorCategory = 'Head Doctor',
  onNavigateTab,
}) => {
  const db = getSafeDb();
  const [selectedBranch, setSelectedBranch] = useState<string>('KPHB Branch');
  const [appointments, setAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeFilter, setActiveFilter] = useState<'all' | 'waiting' | 'completed'>('all');

  // Popup Modal States
  const [selectedViewPatient, setSelectedViewPatient] = useState<any | null>(null);
  const [previewImages, setPreviewImages] = useState<string[]>([]);
  const [previewImageIndex, setPreviewImageIndex] = useState<number>(0);
  const fullViewListRef = useRef<FlatList>(null);

  const openImageFullView = (images: string[], initialIdx: number = 0) => {
    if (!images || images.length === 0) return;
    setPreviewImages(images);
    setPreviewImageIndex(initialIdx);
  };

  const handleSwapPrev = () => {
    if (previewImageIndex > 0) {
      const nextIdx = previewImageIndex - 1;
      setPreviewImageIndex(nextIdx);
      try { fullViewListRef.current?.scrollToIndex({ index: nextIdx, animated: true }); } catch {}
    }
  };

  const handleSwapNext = () => {
    if (previewImageIndex < previewImages.length - 1) {
      const nextIdx = previewImageIndex + 1;
      setPreviewImageIndex(nextIdx);
      try { fullViewListRef.current?.scrollToIndex({ index: nextIdx, animated: true }); } catch {}
    }
  };

  // Consultation Modal State
  const [activeConsultPatient, setActiveConsultPatient] = useState<any | null>(null);
  const [bp, setBp] = useState('120/80');
  const [pulse, setPulse] = useState('72');
  const [temp, setTemp] = useState('98.6');
  const [weight, setWeight] = useState('68');
  const [chiefComplaints, setChiefComplaints] = useState('');
  const [medicalHistory, setMedicalHistory] = useState('');
  const [typedPrescriptions, setTypedPrescriptions] = useState<MedicineItem[]>([
    { medicineName: 'Allium Cepa 30C', dosage: '4 pills', frequency: '1-0-1', timing: 'Before Food', duration: '15 Days' }
  ]);
  const [newMedName, setNewMedName] = useState('');
  const [newDosage, setNewDosage] = useState('4 pills');
  const [followUpInterval, setFollowUpInterval] = useState('15 Days');
  const [followUpDate, setFollowUpDate] = useState('');
  const [consultationFee, setConsultationFee] = useState<number>(500);
  const [medicineFeeRequested, setMedicineFeeRequested] = useState<number>(1200);
  const [submitting, setSubmitting] = useState(false);
  const todayStr = new Date().toISOString().split('T')[0];
  const formattedToday = new Date().toLocaleDateString('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
  const getTodayISO = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const day = now.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const isTodayDate = (a: any) => {
    const todayISO = getTodayISO();
    const rawDate = a.appointmentDate || a.date || a.bookingDate || a.dateString || a.slotDate;
    if (!rawDate) {
      if (a.createdAt) {
        return String(a.createdAt).startsWith(todayISO);
      }
      return false;
    }
    const clean = String(rawDate).trim();
    if (!clean) return false;

    if (clean === todayISO || clean.startsWith(todayISO)) return true;

    // DD-MM-YYYY, DD/MM/YYYY, D/M/YYYY
    const partsISO = todayISO.split('-'); // [YYYY, MM, DD]
    if (partsISO.length === 3) {
      const [y, m, d] = partsISO;
      const ddmmyyyyHyphen = `${d}-${m}-${y}`;
      const ddmmyyyySlash = `${d}/${m}/${y}`;
      const dmySlash = `${parseInt(d, 10)}/${parseInt(m, 10)}/${y}`;
      const dmyHyphen = `${parseInt(d, 10)}-${parseInt(m, 10)}-${y}`;
      if (clean === ddmmyyyyHyphen || clean === ddmmyyyySlash || clean === dmySlash || clean === dmyHyphen) return true;
    }

    return false;
  };

  const isActualAppointment = (item: any, colName: string) => {
    if (colName === 'appointments') return true;
    const hasApptDate = Boolean(item.appointmentDate || item.date || item.slotDate);
    const hasApptStatus = Boolean(item.status && item.status !== 'registered');
    const hasDoctor = Boolean(item.doctorName || item.doctor || item.doctor_name);
    const hasQueueOrder = typeof item.queueOrder === 'number';
    return hasApptDate || hasApptStatus || hasDoctor || hasQueueOrder;
  };

  const isWaitingOrActiveStatus = (status: string) => {
    const st = String(status || 'waiting').toLowerCase().trim();
    return st !== 'completed' && st !== 'done' && st !== 'finished' && st !== 'concluded' && st !== 'cancelled' && st !== 'collect_fee';
  };

  // Ultra-fast zero-delay sync using cached receptionDataStore
  useEffect(() => {
    receptionDataStore.startListeners();

    const activeDocClean = doctorName.toLowerCase().replace(/^dr\.\s*/i, '').replace(/^dr\s*/i, '').replace(/[^a-z0-9]/g, '').trim();

    const filterTodayDoctorApps = (list: any[]) => {
      const map = new Map<string, any>();

      for (const item of list) {
        if (!item) continue;
        if (!isActualAppointment(item, item.collectionName || 'appointments')) continue;
        // Strictly filter to TODAY'S consultations only
        if (!isTodayDate(item)) continue;

        const docName = String(item.doctorName || item.doctor || item.doctor_name || '').toLowerCase().replace(/^dr\.\s*/i, '').replace(/^dr\s*/i, '').replace(/[^a-z0-9]/g, '').trim();
        const isDocMatch = !docName || docName === 'unassigned' || docName.includes(activeDocClean) || activeDocClean.includes(docName) || (docName.length >= 4 && activeDocClean.includes(docName.substring(0, 5)));

        if (isDocMatch) {
          const cleanPhone = String(item.phone || item.phoneNumber || '').replace(/\D/g, '').slice(-10);
          const cleanDate = String(item.appointmentDate || item.date || item.slotDate || item.dateString || '').trim();
          const cleanTime = String(item.appointmentTime || item.time || item.timeSlot || '').trim().toLowerCase();
          const cleanName = String(item.patientName || item.name || '').trim().toLowerCase();
          const cleanReg = String(item.registrationId || item.regId || '').trim().toLowerCase();

          const dedupKey = (cleanPhone && cleanDate && cleanTime)
            ? `${cleanPhone}_${cleanDate}_${cleanTime}`
            : (cleanReg && cleanDate)
              ? `${cleanReg}_${cleanDate}`
              : (cleanPhone && cleanName)
                ? `${cleanPhone}_${cleanName}`
                : (item.id || `${cleanPhone}_${cleanName}`);

          if (!map.has(dedupKey)) {
            map.set(dedupKey, {
              ...item,
              id: item.id || dedupKey,
              displayStatus: String(item.status || item.displayStatus || 'waiting').toLowerCase(),
            });
          } else {
            const existing = map.get(dedupKey);
            const isItemWaiting = String(item.status || item.displayStatus || '').toLowerCase() === 'waiting';
            map.set(dedupKey, {
              ...item,
              ...existing,
              displayStatus: isItemWaiting ? 'waiting' : ((existing.displayStatus && existing.displayStatus !== 'waiting') ? existing.displayStatus : (item.displayStatus || 'waiting'))
            });
          }
        }
      }

      const resList = Array.from(map.values());
      resList.sort((a, b) => {
        const strA = String(a.createdAt || a.id || '');
        const strB = String(b.createdAt || b.id || '');
        return strB.localeCompare(strA);
      });

      setAppointments(resList);
      setLoading(false);
    };

    // Instant zero-delay load from cached store
    const initialPool = receptionDataStore.getAppointments();
    if (initialPool && initialPool.length > 0) {
      filterTodayDoctorApps(initialPool);
    }

    const unsub = receptionDataStore.subscribe((state) => {
      filterTodayDoctorApps(state.appointments);
    });

    return () => unsub();
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

  const handleUpdateStatus = async (docId: string, collectionName: string | undefined, newStatus: string) => {
    try {
      setAppointments((prev) =>
        prev.map((a) => (a.id === docId ? { ...a, displayStatus: newStatus.toLowerCase() } : a))
      );
      receptionDataStore.updateLocalAppointment(docId, { status: newStatus, displayStatus: newStatus.toLowerCase() });

      const payload = { status: newStatus, updatedAt: new Date().toISOString() };
      const targetCol = collectionName || 'appointments';
      await Promise.allSettled([
        updateDoc(doc(db, targetCol, docId), payload),
        updateDoc(doc(db, 'appointments', docId), payload),
        updateDoc(doc(db, 'allpatients', docId), payload),
        updateDoc(doc(db, 'patients', docId), payload)
      ]);
    } catch (e) {
      console.error('Update status error:', e);
    }
  };

  const handleStartConsultation = (patient: any) => {
    handleUpdateStatus(patient.id, patient.collectionName, 'in_consultation');

    if (onNavigateTab) {
      onNavigateTab('patient_file', patient);
      return;
    }

    // Rule 6: Fee Auto-Zero Rule
    const isFollowUp = patient.isFollowUp || patient.type === 'Follow-up' || patient.hasActivePackage;
    setConsultationFee(isFollowUp ? 0 : 500);

    setChiefComplaints(patient.diseases || patient.subject || '');
    setMedicalHistory(patient.medicalHistory || 'No known allergies.');
    setActiveConsultPatient(patient);
  };

  const handleAddMedicine = () => {
    if (!newMedName.trim()) return;
    setTypedPrescriptions([...typedPrescriptions, {
      medicineName: newMedName,
      dosage: newDosage,
      frequency: '1-0-1',
      timing: 'Before Food',
      duration: '15 Days'
    }]);
    setNewMedName('');
  };

  const handleSubmitConsultation = async () => {
    if (!activeConsultPatient) return;
    setSubmitting(true);

    try {
      const patientId = activeConsultPatient.patientId || activeConsultPatient.id || 'PAT-' + Date.now();
      const patName = activeConsultPatient.patientName || activeConsultPatient.name || 'Patient';
      const patPhone = activeConsultPatient.phone || activeConsultPatient.phoneNumber || '';
      const patBranch = activeConsultPatient.branch || 'KPHB Branch';

      // 1. Update status to 'collect_fee' for Reception Billing Checkout
      const mFee = Number(medicineFeeRequested) || 0;
      const cFee = mFee > 0 ? 0 : (Number(consultationFee) || 0);
      const targetVal = mFee > 0 ? mFee : (Number(consultationFee) || 500);

      const feePayload = {
        status: 'collect_fee',
        feeCollectionNeeded: true,
        paymentStatus: 'pending',
        consultationFee: cFee,
        medicineFee: mFee,
        pharmacyFee: mFee,
        medicineFeeRequested: mFee,
        targetAmount: targetVal,
        followUpInterval,
        preferredFollowUpDate: followUpDate,
        followUpDate: followUpDate,
        updatedAt: new Date().toISOString()
      };
      const appId = activeConsultPatient.id;
      const targetCol = activeConsultPatient.collectionName || 'appointments';
      receptionDataStore.updateLocalAppointment(appId, feePayload);
      await Promise.allSettled([
        updateDoc(doc(db, targetCol, appId), feePayload),
        updateDoc(doc(db, 'appointments', appId), feePayload),
        updateDoc(doc(db, 'allpatients', appId), feePayload),
        updateDoc(doc(db, 'patients', appId), feePayload)
      ]);

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
        canvasPrescriptionUrl: `prescriptions/${patientId}_${Date.now()}_canvas.png`,
        status: 'pending_dispense',
        createdAt: new Date().toISOString()
      });

      // 3. Create record in `followups` if scheduled
      if (followUpDate) {
        const genuineReg = activeConsultPatient.registrationId || activeConsultPatient.regId || activeConsultPatient.uhid || '';
        await addDoc(collection(db, 'followups'), {
          patientId,
          regId: genuineReg,
          registrationId: genuineReg,
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

      Alert.alert('Prescription Sent', `Prescription for ${patName} sent to reception!`);
      setActiveConsultPatient(null);
    } catch (err) {
      console.error('Error submitting consultation:', err);
      Alert.alert('Error', 'Failed to submit consultation.');
    } finally {
      setSubmitting(false);
    }
  };

  const branchFilteredAppointments = appointments;

  const waitingQueue = branchFilteredAppointments.filter((a) => isWaitingOrActiveStatus(a.displayStatus));
  const completedQueue = branchFilteredAppointments.filter((a) => !isWaitingOrActiveStatus(a.displayStatus));

  const displayedList = branchFilteredAppointments.filter((a) => {
    if (activeFilter === 'waiting') return isWaitingOrActiveStatus(a.displayStatus);
    if (activeFilter === 'completed') return !isWaitingOrActiveStatus(a.displayStatus);
    return true;
  });

  const handleCall = (phone?: string) => {
    if (!phone) return Alert.alert('No Phone', 'No phone number available.');
    Linking.openURL(`tel:${String(phone).replace(/\s+/g, '')}`).catch(() => Alert.alert('Error', 'Unable to initiate call.'));
  };

  const handleWhatsApp = (phone?: string, name?: string) => {
    if (!phone) return Alert.alert('No Phone', 'No phone number available.');
    const clean = String(phone).replace(/\D/g, '').slice(-10);
    const msg = `Hello ${name || 'Patient'}, this is regarding your consultation at Spiritual Homeopathy Clinic.`;
    Linking.openURL(`whatsapp://send?phone=91${clean}&text=${encodeURIComponent(msg)}`)
      .catch(() => Alert.alert('WhatsApp Error', 'Could not launch WhatsApp.'));
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 80 }} showsVerticalScrollIndicator={false}>
      {/* Doctor Header */}
      <View style={styles.headerCard}>
        <View style={styles.docHeaderTop}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarText}>{doctorName.replace(/^Dr\.\s*/i, '').charAt(0) || 'D'}</Text>
          </View>
          <View style={{ flex: 1, marginLeft: 10 }}>
            <Text style={styles.docNameText}>{doctorName}</Text>
            <Text style={styles.docSubText}>{doctorCategory} • 📅 {formattedToday}</Text>
          </View>
        </View>
      </View>

      {/* Metrics Row */}
      <View style={styles.metricsRow}>
        <TouchableOpacity
          style={[styles.metricBox, { borderTopColor: '#258ec8' }, activeFilter === 'all' && styles.metricBoxActive]}
          onPress={() => setActiveFilter('all')}
        >
          <Text style={[styles.metricNum, { color: '#258ec8' }]}>{branchFilteredAppointments.length}</Text>
          <Text style={styles.metricLabel}>Total Today</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.metricBox, { borderTopColor: '#d97706' }, activeFilter === 'waiting' && styles.metricBoxActive]}
          onPress={() => setActiveFilter('waiting')}
        >
          <Text style={[styles.metricNum, { color: '#d97706' }]}>{waitingQueue.length}</Text>
          <Text style={styles.metricLabel}>Waiting Queue</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.metricBox, { borderTopColor: '#16a34a' }, activeFilter === 'completed' && styles.metricBoxActive]}
          onPress={() => setActiveFilter('completed')}
        >
          <Text style={[styles.metricNum, { color: '#16a34a' }]}>{completedQueue.length}</Text>
          <Text style={styles.metricLabel}>Completed</Text>
        </TouchableOpacity>
      </View>

      {/* TODAY'S DOCTOR PATIENT QUEUE */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <Text style={styles.sectionHeader}>Today's Consultation Queue</Text>
      </View>

      {displayedList.length > 0 ? (
        displayedList.map((patient, index) => {
          const isDone = patient.displayStatus === 'completed' || patient.displayStatus === 'done' || patient.displayStatus === 'collect_fee';
          const isInConsult = patient.displayStatus === 'in_consultation' || patient.displayStatus === 'in consult' || patient.displayStatus === 'in-consultation';
          const regId = resolvePatientRegId(patient);
          const amt = extractAmountPaid(patient);
          const hasPaid = amt.amount > 0 || amt.status === 'paid';

          return (
            <TouchableOpacity
              key={patient.id}
              style={[styles.patientCard, isInConsult && styles.patientCardInConsult]}
              activeOpacity={0.9}
              onPress={() => setSelectedViewPatient(patient)}
            >
              <View style={styles.cardHeader}>
                <View style={styles.patientAvatar}>
                  <Text style={styles.patientAvatarText}>{(patient.patientName || patient.name || 'P').substring(0, 2).toUpperCase()}</Text>
                </View>
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={styles.patientName}>{patient.patientName || patient.name}</Text>
                  <Text style={styles.patientSub}>UHID: <Text style={{ color: '#0284c7', fontWeight: '800' }}>{regId}</Text> • +91 {patient.phone || 'N/A'}</Text>
                </View>
                
                {/* Status Badge */}
                <View style={[styles.statusBadge, { backgroundColor: isDone ? '#dcfce7' : isInConsult ? '#e0f2fe' : '#fef3c7' }]}>
                  <Text style={[styles.statusBadgeText, { color: isDone ? '#166534' : isInConsult ? '#0284c7' : '#b45309' }]}>
                    {isDone ? 'DONE ✓' : isInConsult ? 'IN CONSULT' : 'WAITING'}
                  </Text>
                </View>
              </View>

              {/* Amount Paid Pill & Branch Row */}
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8, paddingHorizontal: 2 }}>
                <Text style={{ fontSize: 11.5, color: '#64748b' }}>
                  📍 {patient.branch || patient.branchName || selectedBranch} • {patient.appointmentTime || patient.time || '10:00 AM'}
                </Text>
                <View style={[styles.amountBadgeSmall, hasPaid ? styles.amountPaidBadgeSmall : styles.amountPendingBadgeSmall]}>
                  <Text style={[styles.amountBadgeSmallText, hasPaid ? styles.amountPaidTextSmall : styles.amountPendingTextSmall]}>
                    {hasPaid ? `₹${amt.amount || '500'} Paid ✓` : (amt.amount ? `₹${amt.amount} Due` : 'Fee Pending')}
                  </Text>
                </View>
              </View>

              {/* Complaints / Symptoms */}
              {patient.diseases || patient.subject ? (
                <View style={styles.symptomBox}>
                  <Text style={styles.symptomText}>Complaints: {patient.diseases || patient.subject}</Text>
                </View>
              ) : null}

              {/* Doctor Action Buttons (Replaces View File with Details & Rx) */}
              <View style={[styles.cardActions, { gap: 8, alignItems: 'center' }]}>
                {isDone ? (
                  <>
                    <TouchableOpacity
                      style={[styles.startConsultBtn, { backgroundColor: '#f0fdf4', borderWidth: 1, borderColor: '#bbf7d0', flex: 1, justifyContent: 'center' }]}
                      onPress={() => setSelectedViewPatient(patient)}
                      activeOpacity={0.8}
                    >
                      <Feather name="eye" size={14} color="#16a34a" style={{ marginRight: 6 }} />
                      <Text style={[styles.startConsultText, { color: '#166534', fontWeight: '800' }]}>
                        View Details & Rx
                      </Text>
                    </TouchableOpacity>
                    <View style={styles.completedTag}>
                      <Text style={styles.completedTagText}>Finished ✓</Text>
                    </View>
                  </>
                ) : (
                  <>
                    <TouchableOpacity
                      style={[styles.startConsultBtn, { backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', flex: 0.9, justifyContent: 'center' }]}
                      onPress={() => setSelectedViewPatient(patient)}
                      activeOpacity={0.8}
                    >
                      <Feather name="eye" size={14} color="#0284c7" style={{ marginRight: 5 }} />
                      <Text style={[styles.startConsultText, { color: '#0284c7', fontWeight: '700' }]}>
                        Details & Rx
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.startConsultBtn, isInConsult && { backgroundColor: '#16a34a' }, { flex: 1.1, justifyContent: 'center' }]}
                      onPress={() => handleStartConsultation(patient)}
                      activeOpacity={0.8}
                    >
                      <MaterialCommunityIcons name={isInConsult ? "check-circle" : "stethoscope"} size={16} color="#ffffff" style={{ marginRight: 6 }} />
                      <Text style={styles.startConsultText}>
                        {isInConsult ? 'Resume Consult' : 'Start Consult'}
                      </Text>
                    </TouchableOpacity>
                  </>
                )}
              </View>
            </TouchableOpacity>
          );
        })
      ) : (
        <View style={styles.emptyBox}>
          <Feather name="user-check" size={32} color="#cbd5e1" />
          <Text style={styles.emptyText}>No patient queue today.</Text>
        </View>
      )}

      {/* MOBILE CONSULTATION MODAL */}
      {activeConsultPatient && (
        <Modal visible animationType="slide" transparent={false}>
          <View style={{ flex: 1, backgroundColor: '#ffffff', padding: 16 }}>
            {/* Header */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#e2e8f0', paddingBottom: 12 }}>
              <View>
                <Text style={{ fontSize: 16, fontWeight: '800', color: '#0f172a' }}>Consultation</Text>
                <Text style={{ fontSize: 13, color: '#258ec8', fontWeight: '700' }}>{activeConsultPatient.patientName || activeConsultPatient.name}</Text>
              </View>
              <TouchableOpacity onPress={() => setActiveConsultPatient(null)} style={{ padding: 6 }}>
                <Feather name="x" size={24} color="#64748b" />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ flex: 1, marginTop: 12 }} showsVerticalScrollIndicator={false}>
              {/* Vitals */}
              <Text style={{ fontSize: 12, fontWeight: '800', color: '#334155', marginBottom: 6 }}>PATIENT VITALS</Text>
              <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
                <TextInput value={bp} onChangeText={setBp} placeholder="BP" style={{ flex: 1, borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 8, padding: 8, fontSize: 12 }} />
                <TextInput value={pulse} onChangeText={setPulse} placeholder="Pulse" style={{ flex: 1, borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 8, padding: 8, fontSize: 12 }} />
                <TextInput value={temp} onChangeText={setTemp} placeholder="Temp" style={{ flex: 1, borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 8, padding: 8, fontSize: 12 }} />
                <TextInput value={weight} onChangeText={setWeight} placeholder="Weight" style={{ flex: 1, borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 8, padding: 8, fontSize: 12 }} />
              </View>

              {/* Complaints & History */}
              <Text style={{ fontSize: 12, fontWeight: '800', color: '#334155', marginBottom: 4 }}>CHIEF COMPLAINTS</Text>
              <TextInput value={chiefComplaints} onChangeText={setChiefComplaints} multiline numberOfLines={3} style={{ borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 8, padding: 8, fontSize: 12, marginBottom: 12 }} />

              <Text style={{ fontSize: 12, fontWeight: '800', color: '#334155', marginBottom: 4 }}>MEDICAL HISTORY & ALLERGIES</Text>
              <TextInput value={medicalHistory} onChangeText={setMedicalHistory} multiline numberOfLines={2} style={{ borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 8, padding: 8, fontSize: 12, marginBottom: 12 }} />

              {/* Prescriptions */}
              <Text style={{ fontSize: 12, fontWeight: '800', color: '#258ec8', marginBottom: 6 }}>PRESCRIBED REMEDIES</Text>
              {typedPrescriptions.map((med, idx) => (
                <View key={idx} style={{ backgroundColor: '#f8fafc', padding: 8, borderRadius: 6, marginBottom: 6, borderWidth: 1, borderColor: '#e2e8f0' }}>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: '#0f172a' }}>{idx + 1}. {med.medicineName} ({med.dosage})</Text>
                  <Text style={{ fontSize: 11, color: '#64748b' }}>{med.frequency} • {med.timing} • {med.duration}</Text>
                </View>
              ))}

              <View style={{ flexDirection: 'row', gap: 6, marginBottom: 16, marginTop: 4 }}>
                <TextInput value={newMedName} onChangeText={setNewMedName} placeholder="Add Remedy Name..." style={{ flex: 2, borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 8, padding: 8, fontSize: 12 }} />
                <TouchableOpacity onPress={handleAddMedicine} style={{ backgroundColor: '#258ec8', paddingHorizontal: 14, borderRadius: 8, justifyContent: 'center' }}>
                  <Text style={{ color: '#fff', fontWeight: '800', fontSize: 12 }}>+ Add</Text>
                </TouchableOpacity>
              </View>

              {/* Follow-up & Fees */}
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <Text style={{ fontSize: 12, fontWeight: '800', color: '#334155' }}>FOLLOW-UP INTERVAL (DD-MM-YYYY)</Text>
                {followUpDate ? (
                  <Text style={{ fontSize: 11, fontWeight: '700', color: '#0284c7' }}>📅 {followUpDate}</Text>
                ) : null}
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
                <View style={{ flexDirection: 'row', gap: 6 }}>
                  {['15 Days', '1 Month', '2 Months', '3 Months', '4 Months', '5 Months', '6 Months'].map(opt => (
                    <TouchableOpacity
                      key={opt}
                      onPress={() => {
                        setFollowUpInterval(opt);
                        const now = new Date();
                        if (opt === '15 Days') now.setDate(now.getDate() + 15);
                        else if (opt === '1 Month') now.setMonth(now.getMonth() + 1);
                        else if (opt === '2 Months') now.setMonth(now.getMonth() + 2);
                        else if (opt === '3 Months') now.setMonth(now.getMonth() + 3);
                        else if (opt === '4 Months') now.setMonth(now.getMonth() + 4);
                        else if (opt === '5 Months') now.setMonth(now.getMonth() + 5);
                        else if (opt === '6 Months') now.setMonth(now.getMonth() + 6);
                        const dd = String(now.getDate()).padStart(2, '0');
                        const mm = String(now.getMonth() + 1).padStart(2, '0');
                        const yyyy = now.getFullYear();
                        setFollowUpDate(`${dd}-${mm}-${yyyy}`);
                      }}
                      style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6, backgroundColor: followUpInterval === opt ? '#258ec8' : '#f1f5f9' }}
                    >
                      <Text style={{ fontSize: 11, fontWeight: '700', color: followUpInterval === opt ? '#fff' : '#475569' }}>{opt}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>

              <Text style={{ fontSize: 12, fontWeight: '800', color: '#334155', marginBottom: 6 }}>FEES FOR RECEPTION</Text>
              <View style={{ flexDirection: 'row', gap: 12, marginBottom: 20 }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 11, color: '#64748b' }}>Consultation Fee (₹)</Text>
                  <TextInput value={String(consultationFee)} onChangeText={v => setConsultationFee(Number(v))} keyboardType="numeric" style={{ borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 8, padding: 8, fontSize: 12, fontWeight: '700' }} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 11, color: '#64748b' }}>Medicines Estimate (₹)</Text>
                  <TextInput value={String(medicineFeeRequested)} onChangeText={v => setMedicineFeeRequested(Number(v))} keyboardType="numeric" style={{ borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 8, padding: 8, fontSize: 12, fontWeight: '700' }} />
                </View>
              </View>
            </ScrollView>

            <TouchableOpacity onPress={handleSubmitConsultation} disabled={submitting} style={{ backgroundColor: '#16a34a', padding: 14, borderRadius: 10, alignItems: 'center' }}>
              <Text style={{ color: '#fff', fontSize: 14, fontWeight: '800' }}>{submitting ? 'Submitting...' : 'Submit Prescription & Send to Reception ✓'}</Text>
            </TouchableOpacity>
          </View>
        </Modal>
      )}

      {/* 1. PATIENT DETAILS & PRESCRIPTION POPUP MODAL */}
      <Modal
        visible={!!selectedViewPatient}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setSelectedViewPatient(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalTitle} numberOfLines={1}>
                  {selectedViewPatient?.patientName || selectedViewPatient?.name || 'Patient'}
                </Text>
                <Text style={styles.modalSubtitle}>
                  UHID: <Text style={{ color: '#0284c7', fontWeight: '800' }}>{resolvePatientRegId(selectedViewPatient)}</Text>
                  {selectedViewPatient?.age ? ` • ${selectedViewPatient.age} yrs` : ''}
                  {selectedViewPatient?.gender ? ` • ${selectedViewPatient.gender}` : ''}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.modalCloseBtn}
                onPress={() => setSelectedViewPatient(null)}
              >
                <Ionicons name="close" size={22} color="#64748b" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={styles.modalBody}>
              {/* Patient Basic Info Card */}
              <View style={styles.modalSectionCard}>
                <View style={styles.modalInfoRow}>
                  <View style={styles.modalInfoCol}>
                    <Text style={styles.modalLabel}>Consultation Date & Time</Text>
                    <Text style={styles.modalValueBold}>
                      📅 {selectedViewPatient?.appointmentDate || todayStr} ({selectedViewPatient?.appointmentTime || selectedViewPatient?.time || '10:00 AM'})
                    </Text>
                  </View>
                  <View style={styles.modalInfoCol}>
                    <Text style={styles.modalLabel}>Clinic Branch</Text>
                    <Text style={styles.modalValueBold}>
                      📍 {selectedViewPatient?.branch || selectedViewPatient?.branchName || selectedBranch}
                    </Text>
                  </View>
                </View>

                <View style={[styles.modalInfoRow, { marginTop: 8 }]}>
                  <View style={styles.modalInfoCol}>
                    <Text style={styles.modalLabel}>Treating Doctor</Text>
                    <Text style={[styles.modalValueBold, { color: '#0284c7' }]}>
                      🩺 {selectedViewPatient?.doctorName || selectedViewPatient?.doctor || doctorName}
                    </Text>
                  </View>
                  <View style={styles.modalInfoCol}>
                    <Text style={styles.modalLabel}>Phone Contact</Text>
                    <Text style={styles.modalValueBold}>
                      📞 {selectedViewPatient?.phone ? `+91 ${String(selectedViewPatient.phone).replace(/\D/g, '').slice(-10)}` : 'N/A'}
                    </Text>
                  </View>
                </View>

                {/* Call & WhatsApp actions */}
                {selectedViewPatient?.phone ? (
                  <View style={styles.modalActionButtonsRow}>
                    <TouchableOpacity
                      style={styles.modalCallBtn}
                      onPress={() => handleCall(selectedViewPatient.phone)}
                    >
                      <Feather name="phone" size={14} color="#0284c7" />
                      <Text style={styles.modalCallBtnText}>Call Patient</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.modalWABtn}
                      onPress={() => handleWhatsApp(selectedViewPatient.phone, selectedViewPatient.patientName || selectedViewPatient.name)}
                    >
                      <MaterialCommunityIcons name="whatsapp" size={16} color="#16a34a" />
                      <Text style={styles.modalWABtnText}>WhatsApp</Text>
                    </TouchableOpacity>
                  </View>
                ) : null}
              </View>

              {/* Amount & Billing Section */}
              {(() => {
                const amt = extractAmountPaid(selectedViewPatient || {});
                return (
                  <View style={styles.modalSectionCard}>
                    <Text style={styles.modalSectionHeading}>💰 Amount & Billing Details</Text>
                    <View style={styles.amountDisplayRow}>
                      <View style={[
                        styles.amountBox,
                        amt.status === 'paid' || amt.amount > 0 ? styles.amountPaidBox : styles.amountPendingBox
                      ]}>
                        <Text style={styles.amountBoxLabel}>Amount Paid</Text>
                        <Text style={[
                          styles.amountBoxValue,
                          amt.status === 'paid' || amt.amount > 0 ? { color: '#15803d' } : { color: '#b45309' }
                        ]}>
                          ₹{amt.amount || '0'}
                        </Text>
                      </View>

                      <View style={styles.amountDetailsCol}>
                        <Text style={styles.amountDetailsText}>
                          Status: <Text style={{ fontWeight: '800', color: amt.status === 'paid' ? '#16a34a' : '#ea580c' }}>
                            {amt.status.toUpperCase()}
                          </Text>
                        </Text>
                        <Text style={styles.amountDetailsText}>
                          Mode: <Text style={{ fontWeight: '700' }}>{amt.mode}</Text>
                        </Text>
                      </View>
                    </View>
                  </View>
                );
              })()}

              {/* Prescribed Medicines Section */}
              {(() => {
                const meds = extractMedicinesFromDoc(selectedViewPatient || {});
                return (
                  <View style={styles.modalSectionCard}>
                    <Text style={styles.modalSectionHeading}>
                      💊 Prescribed Medicines ({meds.length})
                    </Text>

                    {meds.length > 0 ? (
                      meds.map((med: any, idx: number) => (
                        <View key={idx} style={styles.medicineRowCard}>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.medicineNameText}>{idx + 1}. {med.name}</Text>
                            {med.instructions ? (
                              <Text style={styles.medicineInstText}>Note: {med.instructions}</Text>
                            ) : null}
                          </View>
                          <View style={styles.medicineBadgeRow}>
                            <View style={styles.dosagePill}>
                              <Text style={styles.dosagePillText}>{med.dosage}</Text>
                            </View>
                            <View style={styles.freqPill}>
                              <Text style={styles.freqPillText}>{med.frequency}</Text>
                            </View>
                            <View style={styles.durPill}>
                              <Text style={styles.durPillText}>{med.duration}</Text>
                            </View>
                          </View>
                        </View>
                      ))
                    ) : (
                      <View style={styles.noDataBox}>
                        <Text style={styles.noDataText}>No prescribed remedies recorded for this consultation.</Text>
                      </View>
                    )}
                  </View>
                );
              })()}

              {/* Uploaded Prescription Scans & Drawings */}
              {(() => {
                const images = extractImagesFromDoc(selectedViewPatient || {});
                return (
                  <View style={styles.modalSectionCard}>
                    <Text style={styles.modalSectionHeading}>
                      📷 Uploaded Prescription Scans & Drawings ({images.length})
                    </Text>

                    {images.length > 0 ? (
                      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 8 }}>
                        {images.map((imgUri: string, idx: number) => (
                          <TouchableOpacity
                            key={idx}
                            style={styles.prescriptionThumbWrapper}
                            onPress={() => openImageFullView(images, idx)}
                            activeOpacity={0.8}
                          >
                            <Image source={{ uri: imgUri }} style={styles.prescriptionThumb} resizeMode="cover" />
                            <View style={styles.zoomBadge}>
                              <Feather name="maximize-2" size={12} color="#ffffff" />
                            </View>
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                    ) : (
                      <View style={styles.noDataBox}>
                        <Text style={styles.noDataText}>No prescription images or scans attached.</Text>
                      </View>
                    )}
                  </View>
                );
              })()}

              {/* Complaints & Diagnosis Notes */}
              <View style={styles.modalSectionCard}>
                <Text style={styles.modalSectionHeading}>🩺 Clinical Notes & Symptoms</Text>
                <Text style={styles.modalInfoNotes}>
                  <Text style={{ fontWeight: '700', color: '#334155' }}>Chief Complaint: </Text>
                  {selectedViewPatient?.chiefComplaint || selectedViewPatient?.diseases || selectedViewPatient?.subject || 'Routine Consultation'}
                </Text>
                {selectedViewPatient?.diagnosisNotes || selectedViewPatient?.diagnosis ? (
                  <Text style={[styles.modalInfoNotes, { marginTop: 6, color: '#0369a1' }]}>
                    <Text style={{ fontWeight: '700' }}>Diagnosis: </Text>
                    {selectedViewPatient?.diagnosisNotes || selectedViewPatient?.diagnosis}
                  </Text>
                ) : null}
              </View>
            </ScrollView>

            {/* Modal Close Button */}
            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.modalCloseDoneBtn}
                onPress={() => setSelectedViewPatient(null)}
              >
                <Text style={styles.modalCloseDoneBtnText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* FULL-SIZE IMAGE PREVIEW MODAL WITH SWAP & SWIPE */}
      <Modal
        visible={previewImages.length > 0}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setPreviewImages([])}
      >
        <View style={styles.previewImageOverlay}>
          {/* Header Bar */}
          <View style={styles.previewHeaderBar}>
            <View style={styles.previewCounterBadge}>
              <Feather name="file-text" size={13} color="#ffffff" style={{ marginRight: 6 }} />
              <Text style={styles.previewCounterText}>
                Scan {previewImageIndex + 1} of {previewImages.length}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.previewCloseBtn}
              onPress={() => setPreviewImages([])}
              activeOpacity={0.8}
            >
              <Ionicons name="close" size={24} color="#ffffff" />
            </TouchableOpacity>
          </View>

          {/* Swipeable Gallery */}
          <FlatList
            ref={fullViewListRef}
            data={previewImages}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            keyExtractor={(_, index) => String(index)}
            initialScrollIndex={previewImageIndex < previewImages.length ? previewImageIndex : 0}
            getItemLayout={(_, index) => ({
              length: Dimensions.get('window').width,
              offset: Dimensions.get('window').width * index,
              index,
            })}
            onMomentumScrollEnd={(e) => {
              const screenW = Dimensions.get('window').width;
              const idx = Math.round(e.nativeEvent.contentOffset.x / screenW);
              if (idx >= 0 && idx < previewImages.length) {
                setPreviewImageIndex(idx);
              }
            }}
            renderItem={({ item }) => (
              <View style={{
                width: Dimensions.get('window').width,
                height: Dimensions.get('window').height * 0.74,
                justifyContent: 'center',
                alignItems: 'center',
              }}>
                <Image
                  source={{ uri: item }}
                  style={styles.previewFullImage}
                  resizeMode="contain"
                />
              </View>
            )}
          />

          {/* Floating Left Swap */}
          {previewImages.length > 1 && previewImageIndex > 0 && (
            <TouchableOpacity style={styles.swapBtnLeft} onPress={handleSwapPrev} activeOpacity={0.8}>
              <Feather name="chevron-left" size={28} color="#ffffff" />
            </TouchableOpacity>
          )}

          {/* Floating Right Swap */}
          {previewImages.length > 1 && previewImageIndex < previewImages.length - 1 && (
            <TouchableOpacity style={styles.swapBtnRight} onPress={handleSwapNext} activeOpacity={0.8}>
              <Feather name="chevron-right" size={28} color="#ffffff" />
            </TouchableOpacity>
          )}

          {/* Bottom Bar: Dots + Prev/Next */}
          {previewImages.length > 1 && (
            <View style={styles.previewBottomBar}>
              <TouchableOpacity
                style={[styles.quickSwapBtn, previewImageIndex === 0 && styles.quickSwapBtnDisabled]}
                onPress={handleSwapPrev}
                disabled={previewImageIndex === 0}
                activeOpacity={0.7}
              >
                <Feather name="arrow-left" size={14} color={previewImageIndex === 0 ? '#64748b' : '#ffffff'} />
                <Text style={[styles.quickSwapText, previewImageIndex === 0 && { color: '#64748b' }]}>Prev</Text>
              </TouchableOpacity>

              <View style={styles.previewDotsRow}>
                {previewImages.map((_, i) => (
                  <View key={i} style={[styles.previewDot, i === previewImageIndex && styles.previewDotActive]} />
                ))}
              </View>

              <TouchableOpacity
                style={[styles.quickSwapBtn, previewImageIndex >= previewImages.length - 1 && styles.quickSwapBtnDisabled]}
                onPress={handleSwapNext}
                disabled={previewImageIndex >= previewImages.length - 1}
                activeOpacity={0.7}
              >
                <Text style={[styles.quickSwapText, previewImageIndex >= previewImages.length - 1 && { color: '#64748b' }]}>Next</Text>
                <Feather name="arrow-right" size={14} color={previewImageIndex >= previewImages.length - 1 ? '#64748b' : '#ffffff'} />
              </TouchableOpacity>
            </View>
          )}
        </View>
      </Modal>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc', padding: 12 },
  headerCard: { backgroundColor: '#ffffff', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: '#e2e8f0', marginBottom: 12 },
  docHeaderTop: { flexDirection: 'row', alignItems: 'center' },
  avatarCircle: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#258ec8', justifyContent: 'center', alignItems: 'center' },
  avatarText: { fontSize: 18, fontWeight: '800', color: '#ffffff' },
  docNameText: { fontSize: 16, fontWeight: '800', color: '#0f172a' },
  docSubText: { fontSize: 12, color: '#64748b', marginTop: 2 },
  branchRow: { flexDirection: 'row', gap: 6, marginTop: 12, flexWrap: 'wrap' },
  branchPill: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, backgroundColor: '#f1f5f9', borderWidth: 1, borderColor: '#cbd5e1' },
  branchPillActive: { backgroundColor: '#258ec8', borderColor: '#0284c7' },
  branchPillText: { fontSize: 11, fontWeight: '700', color: '#475569' },
  branchPillTextActive: { color: '#ffffff' },
  metricsRow: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  metricBox: { flex: 1, backgroundColor: '#ffffff', padding: 10, borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0', borderTopWidth: 3, alignItems: 'center' },
  metricBoxActive: { backgroundColor: '#f0f9ff' },
  metricNum: { fontSize: 18, fontWeight: '800' },
  metricLabel: { fontSize: 10, color: '#64748b', fontWeight: '700', marginTop: 2 },
  sectionHeader: { fontSize: 14, fontWeight: '800', color: '#0f172a' },
  patientCard: { backgroundColor: '#ffffff', borderRadius: 14, padding: 12, borderWidth: 1, borderColor: '#e2e8f0', marginBottom: 10 },
  patientCardInConsult: { borderColor: '#258ec8', backgroundColor: '#f0f9ff' },
  cardHeader: { flexDirection: 'row', alignItems: 'center' },
  patientAvatar: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#e0f2fe', justifyContent: 'center', alignItems: 'center' },
  patientAvatarText: { fontSize: 12, fontWeight: '800', color: '#258ec8' },
  patientName: { fontSize: 14, fontWeight: '800', color: '#0f172a' },
  patientSub: { fontSize: 11.5, color: '#64748b', marginTop: 1 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  statusBadgeText: { fontSize: 10, fontWeight: '800' },
  amountBadgeSmall: { paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6, borderWidth: 1 },
  amountPaidBadgeSmall: { backgroundColor: '#dcfce7', borderColor: '#bbf7d0' },
  amountPendingBadgeSmall: { backgroundColor: '#fef3c7', borderColor: '#fde68a' },
  amountBadgeSmallText: { fontSize: 10.5, fontWeight: '800' },
  amountPaidTextSmall: { color: '#15803d' },
  amountPendingTextSmall: { color: '#b45309' },
  symptomBox: { marginTop: 8, backgroundColor: '#f8fafc', padding: 8, borderRadius: 6, borderWidth: 1, borderColor: '#f1f5f9' },
  symptomText: { fontSize: 11.5, color: '#475569' },
  cardActions: { marginTop: 10, flexDirection: 'row', justifyContent: 'flex-end' },
  startConsultBtn: { backgroundColor: '#258ec8', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 7, borderRadius: 8 },
  startConsultText: { fontSize: 12, fontWeight: '800', color: '#ffffff' },
  completedTag: { backgroundColor: '#f0fdf4', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 6 },
  completedTagText: { fontSize: 11, fontWeight: '700', color: '#16a34a' },
  emptyBox: { padding: 40, alignItems: 'center' },
  emptyText: { fontSize: 13, color: '#94a3b8', marginTop: 8 },

  // POPUP MODAL STYLES
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
    minHeight: '65%',
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
  },
  modalSubtitle: {
    fontSize: 12.5,
    color: '#64748b',
    marginTop: 2,
  },
  modalCloseBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalBody: {
    paddingHorizontal: 16,
    paddingTop: 14,
  },
  modalSectionCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 14,
    marginBottom: 12,
  },
  modalSectionHeading: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 10,
  },
  modalInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modalInfoCol: {
    flex: 1,
  },
  modalLabel: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  modalValueBold: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#0f172a',
    marginTop: 2,
  },
  modalActionButtonsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  modalCallBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#e0f2fe',
    borderWidth: 1,
    borderColor: '#bae6fd',
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  modalCallBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0284c7',
  },
  modalWABtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#dcfce7',
    borderWidth: 1,
    borderColor: '#bbf7d0',
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  modalWABtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#15803d',
  },
  amountDisplayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  amountBox: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
  },
  amountPaidBox: {
    backgroundColor: '#dcfce7',
    borderColor: '#bbf7d0',
  },
  amountPendingBox: {
    backgroundColor: '#fef3c7',
    borderColor: '#fde68a',
  },
  amountBoxLabel: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#64748b',
  },
  amountBoxValue: {
    fontSize: 20,
    fontWeight: '900',
    marginTop: 1,
  },
  amountDetailsCol: {
    flex: 1,
    gap: 3,
  },
  amountDetailsText: {
    fontSize: 12,
    color: '#334155',
  },
  medicineRowCard: {
    backgroundColor: '#ffffff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 10,
    marginBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  medicineNameText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0f172a',
  },
  medicineInstText: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
  },
  medicineBadgeRow: {
    flexDirection: 'row',
    gap: 4,
    flexWrap: 'wrap',
  },
  dosagePill: {
    backgroundColor: '#e0f2fe',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
  },
  dosagePillText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#0284c7',
  },
  freqPill: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
  },
  freqPillText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#475569',
  },
  durPill: {
    backgroundColor: '#fef3c7',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
  },
  durPillText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#b45309',
  },
  noDataBox: {
    padding: 12,
    alignItems: 'center',
  },
  noDataText: {
    fontSize: 12,
    color: '#94a3b8',
    textAlign: 'center',
  },
  prescriptionThumbWrapper: {
    width: 80,
    height: 80,
    borderRadius: 10,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    marginRight: 10,
    backgroundColor: '#e2e8f0',
    position: 'relative',
  },
  prescriptionThumb: {
    width: '100%',
    height: '100%',
  },
  zoomBadge: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 4,
    padding: 3,
  },
  modalInfoNotes: {
    fontSize: 12.5,
    color: '#334155',
    lineHeight: 18,
  },
  modalFooter: {
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  modalCloseDoneBtn: {
    backgroundColor: '#0284c7',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  modalCloseDoneBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#ffffff',
  },

  // FULL IMAGE PREVIEW STYLES (WITH SWAP & SWIPE)
  previewImageOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.96)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewHeaderBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: Platform.OS === 'ios' ? 52 : 36,
    paddingHorizontal: 16,
    paddingBottom: 10,
    backgroundColor: 'rgba(0,0,0,0.5)',
    zIndex: 20,
  },
  previewCounterBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  previewCounterText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#ffffff',
  },
  previewCloseBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewFullImage: {
    width: Dimensions.get('window').width * 0.95,
    height: Dimensions.get('window').height * 0.72,
  },
  swapBtnLeft: {
    position: 'absolute',
    left: 8,
    top: '50%',
    marginTop: -24,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 15,
  },
  swapBtnRight: {
    position: 'absolute',
    right: 8,
    top: '50%',
    marginTop: -24,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 15,
  },
  previewBottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: Platform.OS === 'ios' ? 28 : 16,
    backgroundColor: 'rgba(0,0,0,0.5)',
    zIndex: 20,
  },
  quickSwapBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  quickSwapBtnDisabled: {
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  quickSwapText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#ffffff',
  },
  previewDotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  previewDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  previewDotActive: {
    backgroundColor: '#ffffff',
    width: 9,
    height: 9,
    borderRadius: 4.5,
  },
});
