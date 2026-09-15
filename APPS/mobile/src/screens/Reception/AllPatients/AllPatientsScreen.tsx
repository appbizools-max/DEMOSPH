import React, { useState, useMemo, useEffect, useCallback, memo } from 'react';
import {
  StyleSheet, Text, View, FlatList, TextInput, TouchableOpacity,
  Modal, Alert, Linking, ActivityIndicator, Platform
} from 'react-native';
import { Ionicons, Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { getSafeDb } from '../../../utils/firebaseSafe';
import { receptionDataStore } from '../../../utils/receptionDataStore';
import { getPatientVisitState } from '../../../utils/patientVisitState';

// --- Type Definitions ---
export interface Patient {
  id: string;
  name: string;
  phone: string;
  age?: number | string;
  gender?: string;
  branchName: string;
  branchId?: string;
  appointmentDate: string; // YYYY-MM-DD or DD-MM-YYYY
  appointmentTime?: string;
  doctorName?: string;
  status: 'active' | 'completed' | 'follow_up' | 'awaiting_payment' | string;
  regId?: string;
  subject?: string;
  raw?: any;
}

interface AllPatientsScreenProps {
  onNavigate?: (tab: string, patient?: any) => void;
  currentBranch?: string;
}

// --- Helper Functions for Date & Branch Normalize ---
const getFormattedDateStr = (dateObj: Date): string => {
  const yyyy = dateObj.getFullYear();
  const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
  const dd = String(dateObj.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

const normalizeDateToISO = (dateStr: string): string => {
  if (!dateStr) return '';
  const clean = String(dateStr).trim();
  if (clean.includes('T')) return clean.split('T')[0];
  if (clean.includes('/') || (clean.includes('-') && clean.split('-')[0].length <= 2)) {
    const parts = clean.split(/[\/\-]/);
    if (parts.length === 3) {
      let dd = parts[0].padStart(2, '0');
      let mm = parts[1].padStart(2, '0');
      let yyyy = parts[2];
      if (parts[0].length === 4) {
        yyyy = parts[0];
        mm = parts[1].padStart(2, '0');
        dd = parts[2].padStart(2, '0');
      }
      return `${yyyy}-${mm}-${dd}`;
    }
  }
  return clean;
};

const normalizeBranchName = (b: string): string => {
  return (b || '').toLowerCase().replace(/\s*branch\s*/i, '').trim();
};

const getBranchShortcut = (str: string): string => {
  if (str.includes('kphb') || str.includes('kukatpally')) return 'kphb';
  if (str.includes('nalla') || str.includes('nallagandla')) return 'nalla';
  if (str.includes('chanda') || str.includes('chnr') || str.includes('chandanagar')) return 'chanda';
  if (str.includes('dilshuk') || str.includes('dilsukh') || str.includes('dsnr') || str.includes('dshnr')) return 'dsnr';
  return str;
};

const isBranchMatching = (b1: string, b2?: string): boolean => {
  if (!b2 || b2 === 'all' || b2 === 'All Branches') return true;
  const n1 = normalizeBranchName(b1);
  const n2 = normalizeBranchName(b2);
  if (n1 === n2 || n1.includes(n2) || n2.includes(n1)) return true;
  return getBranchShortcut(n1) === getBranchShortcut(n2);
};

// --- Mock / Seed Data Fallback ---
const INITIAL_PATIENTS: Patient[] = [
  { id: 'PAT-101', name: 'Rajesh Kumar', phone: '+91 98490 12345', age: 38, gender: 'Male', branchName: 'KPHB Branch', appointmentDate: getFormattedDateStr(new Date()), doctorName: 'Dr. Srinivas', status: 'active', regId: 'SPH-KPHB-0101' },
  { id: 'PAT-102', name: 'Sneha Reddy', phone: '+91 91210 67890', age: 29, gender: 'Female', branchName: 'Nallagandla Branch', appointmentDate: getFormattedDateStr(new Date()), doctorName: 'Dr. Ananya', status: 'follow_up', regId: 'SPH-NALLA-0102' },
  { id: 'PAT-103', name: 'Venkatesh Rao', phone: '+91 94400 45678', age: 45, gender: 'Male', branchName: 'Dilshuknagar Branch', appointmentDate: getFormattedDateStr(new Date(Date.now() - 86400000)), doctorName: 'Dr. Srinivas', status: 'completed', regId: 'SPH-DSNR-0103' },
  { id: 'PAT-104', name: 'Ananya Sharma', phone: '+91 99887 11223', age: 31, gender: 'Female', branchName: 'Chandanagar Branch', appointmentDate: getFormattedDateStr(new Date(Date.now() - 86400000)), doctorName: 'Dr. Ramesh', status: 'awaiting_payment', regId: 'SPH-CHNR-0104' },
  { id: 'PAT-105', name: 'Kiran Verma', phone: '+91 98765 00011', age: 50, gender: 'Male', branchName: 'KPHB Branch', appointmentDate: '2026-09-01', doctorName: 'Dr. Ananya', status: 'completed', regId: 'SPH-KPHB-0105' }
];

const parsePoolToPatients = (pool: any[], currentBranch?: string, todayStr?: string): Patient[] => {
  const list: Patient[] = [];
  const seenIds = new Set<string>();
  const isHQRole = !currentBranch || currentBranch.toLowerCase().includes('admin') || currentBranch.toLowerCase().includes('hr') || currentBranch === 'All Branches';
  const fallbackDate = todayStr || getFormattedDateStr(new Date());

  (pool || []).forEach((data, idx) => {
    if (!data) return;
    const idKey = data.id || data.docId || String(idx);
    if (seenIds.has(idKey)) return;

    const bName = data.branch || data.targetBranch || data.branchName || currentBranch || 'KPHB Branch';

    const cleanPhone = String(data.phoneNumber || data.phone || data.mobile || '').trim();
    const pName = data.patientName || data.name || data.fullName || 'Patient';
    const regId = data.registrationId || data.regId || data.patientId || idKey;
    const rawDate = data.appointmentDate || data.date || data.createdAt || fallbackDate;

    let status = 'active';
    const s = String(data.status || '').toLowerCase().trim();
    const p = String(data.paymentStatus || '').toLowerCase().trim();
    if (s === 'completed' || s === 'done' || s === 'paid' || p === 'paid') {
      status = 'completed';
    } else if (s === 'follow_up' || s === 'followup' || data.followUpOpted === true) {
      status = 'follow_up';
    } else if (s === 'collect_fee' || s === 'awaiting_payment' || p === 'pending') {
      status = 'awaiting_payment';
    }

    const item: Patient = {
      id: idKey,
      name: pName,
      phone: cleanPhone,
      age: data.age || data.patientAge,
      gender: data.gender || 'Male',
      branchName: bName,
      appointmentDate: normalizeDateToISO(String(rawDate)),
      appointmentTime: data.appointmentTime || data.time || '10:00 AM',
      doctorName: data.doctorName || data.doctor,
      status: status,
      regId: regId,
      raw: data
    };

    seenIds.add(idKey);
    list.push(item);
  });

  INITIAL_PATIENTS.forEach((seed) => {
    if (!seenIds.has(seed.id)) {
      if (isHQRole || !currentBranch || isBranchMatching(seed.branchName, currentBranch)) {
        list.push(seed);
      }
    }
  });

  return list;
};

// --- Memoized Individual Patient Card Component ---
const PatientCardItem = memo(({
  patient,
  onCall,
  onWhatsApp,
}: {
  patient: Patient;
  onCall: (phone: string) => void;
  onWhatsApp: (phone: string, name: string) => void;
}) => {
  const normStatus = (patient.status || 'active').toLowerCase();
  const isCompleted = normStatus === 'completed' || normStatus === 'done' || normStatus === 'paid';
  const isActive = normStatus === 'active' || normStatus === 'in_consultation';
  const isFollowUp = normStatus === 'follow_up' || normStatus === 'followup';
  const isAwaitingPayment = normStatus === 'awaiting_payment' || normStatus === 'pending' || normStatus === 'collect_fee';

  const badgeStyle = isActive
    ? { bg: '#e0f2fe', text: '#0369a1', label: 'Active' }
    : isCompleted
      ? { bg: '#dcfce7', text: '#15803d', label: 'Completed ✓' }
      : isFollowUp
        ? { bg: '#fef9c3', text: '#a16207', label: 'Follow Up' }
        : isAwaitingPayment
          ? { bg: '#fee2e2', text: '#b91c1c', label: 'Pay Pending' }
          : { bg: '#f1f5f9', text: '#475569', label: patient.status.replace('_', ' ') };

  const visitState = useMemo(() => {
    try {
      const pool = receptionDataStore.getAllCollectionsPool();
      const pkgs = receptionDataStore.getPackageMembers();
      return getPatientVisitState(patient.raw || patient, pool, pkgs);
    } catch (e) {
      return null;
    }
  }, [patient]);

  return (
    <View style={styles.patientCard}>
      {/* Card Header: Name, Reg ID & Status Badge */}
      <View style={styles.cardHeader}>
        <View style={{ flex: 1, marginRight: 8 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <Text style={styles.patientName} numberOfLines={1}>{patient.name}</Text>
            {visitState ? (
              <View style={[styles.visitBadge, { backgroundColor: visitState.badgeBg, borderColor: visitState.badgeBorder }]}>
                <Text style={[styles.visitBadgeText, { color: visitState.badgeColor }]}>
                  {visitState.badgeText}
                </Text>
              </View>
            ) : null}
          </View>
          <Text style={styles.patientIdText}>
            ID: <Text style={{ color: '#0284c7', fontWeight: '800' }}>{patient.regId || patient.id}</Text>
            {patient.age ? ` • ${patient.age} yrs` : ''}
          </Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: badgeStyle.bg }]}>
          <Text style={[styles.statusBadgeText, { color: badgeStyle.text }]}>
            {badgeStyle.label}
          </Text>
        </View>
      </View>

      {/* Details Row: Branch, Date, Doctor */}
      <View style={styles.detailsRow}>
        <View style={styles.detailItem}>
          <Feather name="map-pin" size={13} color="#64748b" />
          <Text style={styles.detailText} numberOfLines={1}>{patient.branchName}</Text>
        </View>
        <View style={styles.detailItem}>
          <Feather name="calendar" size={13} color="#64748b" />
          <Text style={styles.detailText}>{patient.appointmentDate}</Text>
        </View>
        {patient.doctorName ? (
          <View style={styles.detailItem}>
            <MaterialCommunityIcons name="stethoscope" size={14} color="#64748b" />
            <Text style={styles.detailText} numberOfLines={1}>{patient.doctorName}</Text>
          </View>
        ) : null}
      </View>

      {/* Action Row: Phone, Call, WhatsApp */}
      <View style={styles.actionRow}>
        <Text style={styles.phoneText}>📞 {patient.phone}</Text>
        {patient.phone ? (
          <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
            <TouchableOpacity
              style={styles.iconBtnCall}
              onPress={() => onCall(patient.phone)}
              activeOpacity={0.7}
            >
              <Feather name="phone" size={15} color="#0284c7" />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.iconBtnWA}
              onPress={() => onWhatsApp(patient.phone, patient.name)}
              activeOpacity={0.7}
            >
              <MaterialCommunityIcons name="whatsapp" size={17} color="#16a34a" />
            </TouchableOpacity>
          </View>
        ) : null}
      </View>
    </View>
  );
});

export const AllPatientsScreen: React.FC<AllPatientsScreenProps> = ({ onNavigate, currentBranch }) => {
  // --- Filtering States ---
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilterMode, setDateFilterMode] = useState<'today' | 'yesterday' | 'all'>('today');

  // --- Date Calculations ---
  const todayStr = getFormattedDateStr(new Date());
  const yesterdayStr = getFormattedDateStr(new Date(Date.now() - 86400000));

  // --- Patients State (Instant initial load from cached receptionDataStore pool) ---
  const [patients, setPatients] = useState<Patient[]>(() => {
    const cachedPool = receptionDataStore.getAllCollectionsPool();
    const poolToUse = cachedPool.length > 0 ? cachedPool : receptionDataStore.getAppointments();
    return parsePoolToPatients(poolToUse, currentBranch, todayStr);
  });
  const [isLoading, setIsLoading] = useState(false);

  // --- Real-Time Firestore Loading & Sync ---
  useEffect(() => {
    let isMounted = true;

    try {
      receptionDataStore.startListeners();
      const unsub = receptionDataStore.subscribe((state) => {
        if (!isMounted) return;
        const pool = state.allCollectionsPool.length > 0 ? state.allCollectionsPool : state.appointments;
        const list = parsePoolToPatients(pool, currentBranch, todayStr);
        setPatients(list);
        setIsLoading(false);
      });

      // Safety timeout so loading indicator never stays stuck under any network condition
      const safetyTimer = setTimeout(() => {
        if (isMounted) setIsLoading(false);
      }, 500);

      return () => {
        isMounted = false;
        clearTimeout(safetyTimer);
        unsub();
      };
    } catch (err) {
      console.warn('Sync error:', err);
      setIsLoading(false);
    }
  }, [currentBranch, todayStr]);

  // --- Filtering Core Engine ---
  const filteredPatients = useMemo(() => {
    const isHQRole = !currentBranch || currentBranch.toLowerCase().includes('admin') || currentBranch.toLowerCase().includes('hr') || currentBranch === 'All Branches';

    return patients.filter((patient) => {
      // 1. Strict Branch Check (Only this branch!)
      if (!isHQRole && currentBranch && !isBranchMatching(patient.branchName, currentBranch)) {
        return false;
      }

      const patientDate = normalizeDateToISO(patient.appointmentDate);

      // 2. Date Session Filtering (Today session, Yesterday session, All)
      if (dateFilterMode === 'today') {
        if (patientDate !== todayStr) return false;
      } else if (dateFilterMode === 'yesterday') {
        if (patientDate !== yesterdayStr) return false;
      }

      // 3. Search Query Filtering (Name, Phone, ID)
      if (searchTerm.trim() !== '') {
        const queryStr = searchTerm.toLowerCase().trim();
        const matchesName = patient.name.toLowerCase().includes(queryStr);
        const matchesPhone = patient.phone.includes(queryStr);
        const matchesId = (patient.regId || patient.id).toLowerCase().includes(queryStr);
        if (!matchesName && !matchesPhone && !matchesId) return false;
      }

      return true;
    });
  }, [patients, dateFilterMode, currentBranch, searchTerm, todayStr, yesterdayStr]);

  // --- Handlers ---
  const handleOpenPatientFile = useCallback((patient: Patient) => {
    if (onNavigate) {
      onNavigate('reception_patient_file', {
        id: patient.id,
        patientName: patient.name,
        name: patient.name,
        phone: patient.phone,
        phoneNumber: patient.phone,
        registrationId: patient.regId || patient.id,
        regId: patient.regId || patient.id,
        branch: patient.branchName,
        doctorName: patient.doctorName,
        appointmentDate: patient.appointmentDate,
        ...patient.raw
      });
    } else {
      Alert.alert('Patient Selected', `${patient.name} (${patient.regId || patient.id})`);
    }
  }, [onNavigate]);

  const handleCall = useCallback((phone: string) => {
    if (!phone) return Alert.alert('No Phone', 'No phone number available for this patient.');
    Linking.openURL(`tel:${phone}`).catch(() => Alert.alert('Error', 'Unable to initiate call.'));
  }, []);

  const handleWhatsApp = useCallback((phone: string, name: string) => {
    if (!phone) return Alert.alert('No Phone', 'No phone number available.');
    const clean = phone.replace(/\D/g, '').slice(-10);
    const msg = `Hello ${name}, regarding your appointment at Spiritual Homeopathy Clinic.`;
    Linking.openURL(`whatsapp://send?phone=91${clean}&text=${encodeURIComponent(msg)}`)
      .catch(() => Alert.alert('WhatsApp Error', 'Could not launch WhatsApp.'));
  }, []);

  return (
    <View style={styles.container}>
      {/* Top Header - Clean Title & Branch */}
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <View style={styles.headerIconCircle}>
              <Ionicons name="people" size={18} color="#0284c7" />
            </View>
            <View>
              <Text style={styles.title}>Patient List</Text>
              <Text style={styles.subtitle}>
                {currentBranch || 'Branch'} • {filteredPatients.length} Patient(s)
              </Text>
            </View>
          </View>
        </View>
      </View>

      {/* Filter Control Box: Search + Date Sessions */}
      <View style={styles.filterToolbar}>
        {/* 1. Search Bar */}
        <View style={styles.searchBar}>
          <Feather name="search" size={17} color="#64748b" style={{ marginRight: 8 }} />
          <TextInput
            style={styles.searchInputText}
            placeholder="Search by Patient Name, Phone (+91), or ID..."
            placeholderTextColor="#94a3b8"
            value={searchTerm}
            onChangeText={setSearchTerm}
          />
          {searchTerm.length > 0 && (
            <TouchableOpacity onPress={() => setSearchTerm('')}>
              <Feather name="x" size={16} color="#94a3b8" />
            </TouchableOpacity>
          )}
        </View>

        {/* 2. Date Session Filter Buttons (Today, Yesterday, All, Custom) */}
        <View style={styles.dateFilterRow}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginRight: 6 }}>
            <Feather name="calendar" size={14} color="#64748b" />
            <Text style={styles.filterSectionLabel}>Session:</Text>
          </View>

          <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap', flex: 1 }}>
            {(['today', 'yesterday', 'all'] as const).map((mode) => {
              const isActive = dateFilterMode === mode;
              const label = mode === 'today' ? 'Today' : mode === 'yesterday' ? 'Yesterday' : 'All Patients';
              return (
                <TouchableOpacity
                  key={mode}
                  onPress={() => setDateFilterMode(mode)}
                  style={[styles.dateFilterBtn, isActive && styles.dateFilterBtnActive]}
                >
                  <Text style={[styles.dateFilterBtnText, isActive && styles.dateFilterBtnTextActive]}>
                    {label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </View>

      {/* Patient List */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0284c7" />
          <Text style={styles.loadingText}>Loading Patients...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredPatients}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingBottom: 140 }}
          showsVerticalScrollIndicator={false}
          maxToRenderPerBatch={15}
          windowSize={7}
          removeClippedSubviews={Platform.OS === 'android'}
          renderItem={({ item }) => (
            <PatientCardItem
              patient={item}
              onCall={handleCall}
              onWhatsApp={handleWhatsApp}
            />
          )}
          ListEmptyComponent={
            <View style={styles.emptyCard}>
              <Ionicons name="people-outline" size={32} color="#94a3b8" style={{ marginBottom: 6 }} />
              <Text style={styles.emptyTitle}>No patients found</Text>
              <Text style={styles.emptySub}>
                {currentBranch ? `No records found for ${currentBranch} in this session.` : 'Try adjusting your date or search filter.'}
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
    marginTop: 4,
  },
  headerIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#e0f2fe',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 19,
    fontWeight: '800',
    color: '#0f172a',
  },
  subtitle: {
    fontSize: 11.5,
    color: '#64748b',
    marginTop: 1,
    fontWeight: '600',
  },
  filterToolbar: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    padding: 10,
    marginBottom: 10,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginBottom: 8,
  },
  searchInputText: {
    flex: 1,
    fontSize: 13,
    color: '#0f172a',
    paddingVertical: 3,
  },
  dateFilterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  filterSectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
  },
  dateFilterBtn: {
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRadius: 7,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    backgroundColor: '#ffffff',
  },
  dateFilterBtnActive: {
    borderColor: '#0284c7',
    backgroundColor: '#0284c7',
  },
  dateFilterBtnText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#334155',
  },
  dateFilterBtnTextActive: {
    color: '#ffffff',
  },
  patientCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 9,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 2,
    elevation: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 5,
  },
  patientName: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0f172a',
  },
  visitBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 6,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  visitBadgeText: {
    fontSize: 9.5,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  patientIdText: {
    fontSize: 11.5,
    color: '#64748b',
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusBadgeText: {
    fontSize: 10.5,
    fontWeight: '800',
  },
  detailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
    flexWrap: 'wrap',
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  detailText: {
    fontSize: 11.5,
    color: '#64748b',
    fontWeight: '500',
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    paddingTop: 8,
  },
  phoneText: {
    fontSize: 12,
    color: '#334155',
    fontWeight: '600',
  },
  iconBtnCall: {
    width: 30,
    height: 30,
    borderRadius: 6,
    backgroundColor: '#e0f2fe',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBtnWA: {
    width: 30,
    height: 30,
    borderRadius: 6,
    backgroundColor: '#dcfce7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  openFileBtn: {
    backgroundColor: '#0284c7',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  openFileBtnText: {
    color: '#ffffff',
    fontSize: 11.5,
    fontWeight: '800',
  },
  emptyCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a',
  },
  emptySub: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 4,
    textAlign: 'center',
  },
  loadingContainer: {
    padding: 36,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  loadingText: {
    fontSize: 13,
    color: '#64748b',
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  modalCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 18,
  },
});
