import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Alert, Modal, TextInput } from 'react-native';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { collection, onSnapshot, updateDoc, doc, addDoc } from 'firebase/firestore';
import { db } from '@app/shared';

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

export const DoctorDashboardScreen: React.FC<DoctorDashboardProps> = ({
  doctorName = 'Dr. Prashanth K Vaidya',
  doctorCategory = 'Head Doctor',
  onNavigateTab,
}) => {
  const [selectedBranch, setSelectedBranch] = useState<string>('KPHB Branch');
  const [appointments, setAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeFilter, setActiveFilter] = useState<'all' | 'waiting' | 'completed'>('all');

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
    return st !== 'completed' && st !== 'done' && st !== 'finished' && st !== 'concluded' && st !== 'cancelled';
  };

  useEffect(() => {
    setLoading(true);
    let unsubApp: (() => void) | null = null;
    let unsubAllPat: (() => void) | null = null;

    let appList: any[] = [];
    let allPatList: any[] = [];

    const mergeAndFilter = () => {
      const map = new Map<string, any>();
      const activeDocClean = doctorName.toLowerCase().replace(/^dr\.\s*/i, '').replace(/^dr\s*/i, '').replace(/[^a-z0-9]/g, '').trim();

      [...appList, ...allPatList].forEach((item) => {
        if (!item) return;
        if (!isActualAppointment(item, item.collectionName)) return;

        const docName = String(item.doctorName || item.doctor || item.doctor_name || '').toLowerCase().replace(/^dr\.\s*/i, '').replace(/^dr\s*/i, '').replace(/[^a-z0-9]/g, '').trim();
        const isDocMatch = !docName || docName === 'unassigned' || docName.includes(activeDocClean) || activeDocClean.includes(docName) || (docName.length >= 4 && activeDocClean.includes(docName.substring(0, 5)));

        if (isDocMatch) {
          const uniqueId = item.id || `${item.phone}_${item.patientName}`;
          map.set(uniqueId, {
            ...item,
            id: item.id || uniqueId,
            displayStatus: String(item.status || 'waiting').toLowerCase(),
          });
        }
      });

      const list = Array.from(map.values());
      list.sort((a, b) => {
        const strA = String(a.createdAt || a.id || '');
        const strB = String(b.createdAt || b.id || '');
        return strB.localeCompare(strA);
      });

      setAppointments(list);
      setLoading(false);
    };

    try {
      unsubApp = onSnapshot(collection(db, 'appointments'), (snapshot) => {
        appList = snapshot.docs.map((d) => ({ id: d.id, collectionName: 'appointments', ...d.data() }));
        mergeAndFilter();
      });
      unsubAllPat = onSnapshot(collection(db, 'allpatients'), (snapshot) => {
        allPatList = snapshot.docs.map((d) => ({ id: d.id, collectionName: 'allpatients', ...d.data() }));
        mergeAndFilter();
      });
    } catch (e) {
      console.warn('Error connecting to Firestore:', e);
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

  const handleUpdateStatus = async (docId: string, collectionName: string | undefined, newStatus: string) => {
    try {
      setAppointments((prev) =>
        prev.map((a) => (a.id === docId ? { ...a, displayStatus: newStatus.toLowerCase() } : a))
      );

      const payload = { status: newStatus, updatedAt: new Date().toISOString() };
      const targetCol = collectionName || 'appointments';
      await updateDoc(doc(db, targetCol, docId), payload).catch(() => { });
      await updateDoc(doc(db, 'appointments', docId), payload).catch(() => { });
      await updateDoc(doc(db, 'allpatients', docId), payload).catch(() => { });
      await updateDoc(doc(db, 'patients', docId), payload).catch(() => { });
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
        updatedAt: new Date().toISOString()
      };
      const appId = activeConsultPatient.id;
      const targetCol = activeConsultPatient.collectionName || 'appointments';
      await updateDoc(doc(db, targetCol, appId), feePayload).catch(() => {});
      await updateDoc(doc(db, 'appointments', appId), feePayload).catch(() => {});
      await updateDoc(doc(db, 'allpatients', appId), feePayload).catch(() => {});
      await updateDoc(doc(db, 'patients', appId), feePayload).catch(() => {});

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
          const isDone = patient.displayStatus === 'completed' || patient.displayStatus === 'done';
          const isInConsult = patient.displayStatus === 'in_consultation' || patient.displayStatus === 'in consult' || patient.displayStatus === 'in-consultation';

          return (
            <View key={patient.id} style={[styles.patientCard, isInConsult && styles.patientCardInConsult]}>
              <View style={styles.cardHeader}>
                <View style={styles.patientAvatar}>
                  <Text style={styles.patientAvatarText}>{(patient.patientName || patient.name || 'P').substring(0, 2).toUpperCase()}</Text>
                </View>
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={styles.patientName}>{patient.patientName || patient.name}</Text>
                  <Text style={styles.patientSub}>Reg: {patient.registrationId || `REG-${index + 1001}`} • +91 {patient.phone || 'N/A'}</Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: isDone ? '#dcfce7' : isInConsult ? '#e0f2fe' : '#fef3c7' }]}>
                  <Text style={[styles.statusBadgeText, { color: isDone ? '#166534' : isInConsult ? '#0284c7' : '#b45309' }]}>
                    {isDone ? 'DONE ✓' : isInConsult ? 'IN CONSULT' : 'WAITING'}
                  </Text>
                </View>
              </View>

              {/* Complaints / Symptoms */}
              {patient.diseases || patient.subject ? (
                <View style={styles.symptomBox}>
                  <Text style={styles.symptomText}>Complaints: {patient.diseases || patient.subject}</Text>
                </View>
              ) : null}

              {/* Doctor Action Buttons */}
              <View style={[styles.cardActions, { gap: 8 }]}>
                <TouchableOpacity
                  style={[styles.startConsultBtn, { backgroundColor: '#e0f2fe', borderWidth: 1, borderColor: '#bae6fd' }]}
                  onPress={() => onNavigateTab && onNavigateTab('patient_file', patient)}
                >
                  <MaterialCommunityIcons name="folder-account-outline" size={16} color="#0284c7" style={{ marginRight: 4 }} />
                  <Text style={[styles.startConsultText, { color: '#0284c7' }]}>
                    ⚡ View File
                  </Text>
                </TouchableOpacity>

                {!isDone && (
                  <TouchableOpacity
                    style={[styles.startConsultBtn, isInConsult && { backgroundColor: '#16a34a' }]}
                    onPress={() => handleStartConsultation(patient)}
                  >
                    <MaterialCommunityIcons name={isInConsult ? "check-circle" : "stethoscope"} size={16} color="#ffffff" style={{ marginRight: 6 }} />
                    <Text style={styles.startConsultText}>
                      {isInConsult ? 'Resume Consultation' : 'Start Consultation'}
                    </Text>
                  </TouchableOpacity>
                )}
                {isDone && (
                  <View style={styles.completedTag}>
                    <Text style={styles.completedTagText}>Consultation Finished ✓</Text>
                  </View>
                )}
              </View>
            </View>
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
              <Text style={{ fontSize: 12, fontWeight: '800', color: '#334155', marginBottom: 6 }}>FOLLOW-UP INTERVAL</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
                <View style={{ flexDirection: 'row', gap: 6 }}>
                  {['15 Days', '1 Month', '2 Months', '3 Months', '4 Months', '5 Months', '6 Months'].map(opt => (
                    <TouchableOpacity key={opt} onPress={() => setFollowUpInterval(opt)} style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6, backgroundColor: followUpInterval === opt ? '#258ec8' : '#f1f5f9' }}>
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
  symptomBox: { marginTop: 8, backgroundColor: '#f8fafc', padding: 8, borderRadius: 6, borderWidth: 1, borderColor: '#f1f5f9' },
  symptomText: { fontSize: 11.5, color: '#475569' },
  cardActions: { marginTop: 10, flexDirection: 'row', justifyContent: 'flex-end' },
  startConsultBtn: { backgroundColor: '#258ec8', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 7, borderRadius: 8 },
  startConsultText: { fontSize: 12, fontWeight: '800', color: '#ffffff' },
  completedTag: { backgroundColor: '#f0fdf4', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 6 },
  completedTagText: { fontSize: 11, fontWeight: '700', color: '#16a34a' },
  emptyBox: { padding: 40, alignItems: 'center' },
  emptyText: { fontSize: 13, color: '#94a3b8', marginTop: 8 },
});
