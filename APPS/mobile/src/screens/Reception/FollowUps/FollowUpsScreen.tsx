import React, { useState, useEffect, useMemo } from 'react';
import {
  StyleSheet, Text, View, ScrollView, TouchableOpacity,
  TextInput, Linking, Alert, FlatList, ActivityIndicator
} from 'react-native';
import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { db } from '@app/shared';
import { collection, onSnapshot, query, limit } from 'firebase/firestore';

interface FollowUpsScreenProps {
  currentBranch?: string;
  onNavigate?: (tab: string, data?: any) => void;
}

export const FollowUpsScreen: React.FC<FollowUpsScreenProps> = ({
  currentBranch = 'KPHB Branch',
  onNavigate
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTabFilter, setActiveTabFilter] = useState<'all' | 'today' | 'overdue' | 'upcoming'>('all');

  const [rawPrescriptions, setRawPrescriptions] = useState<any[]>([]);
  const [rawAppointments, setRawAppointments] = useState<any[]>([]);
  const [rawAllPatients, setRawAllPatients] = useState<any[]>([]);

  // 1. Subscribe to Firestore Collections with Safety Limits
  useEffect(() => {
    if (!db) return;
    const unsubPresc = onSnapshot(query(collection(db, 'prescriptions'), limit(100)), (snap) => {
      const list: any[] = [];
      snap.forEach((d) => list.push({ id: d.id, ...d.data() }));
      setRawPrescriptions(list);
    }, (err) => console.warn('Mobile Prescriptions listener error:', err));

    const unsubAppts = onSnapshot(query(collection(db, 'appointments'), limit(100)), (snap) => {
      const list: any[] = [];
      snap.forEach((d) => list.push({ id: d.id, ...d.data() }));
      setRawAppointments(list);
    }, (err) => console.warn('Mobile Appointments listener error:', err));

    const unsubAllPat = onSnapshot(query(collection(db, 'allpatients'), limit(100)), (snap) => {
      const list: any[] = [];
      snap.forEach((d) => list.push({ id: d.id, ...d.data() }));
      setRawAllPatients(list);
    }, (err) => console.warn('Mobile AllPatients listener error:', err));

    return () => {
      unsubPresc();
      unsubAppts();
      unsubAllPat();
    };
  }, []);

  // Helper to format Date string to DD-MM-YYYY
  const formatNiceDate = (rawDate: any): string => {
    if (!rawDate) return '';
    if (typeof rawDate === 'string') {
      if (/^\d{2}-\d{2}-\d{4}$/.test(rawDate.trim())) return rawDate.trim();
      if (/^\d{4}-\d{2}-\d{2}$/.test(rawDate.trim())) {
        const [y, m, d] = rawDate.trim().split('-');
        return `${d}-${m}-${y}`;
      }
    }
    try {
      const dateObj = new Date(rawDate);
      if (!isNaN(dateObj.getTime())) {
        const d = String(dateObj.getDate()).padStart(2, '0');
        const m = String(dateObj.getMonth() + 1).padStart(2, '0');
        const y = dateObj.getFullYear();
        return `${d}-${m}-${y}`;
      }
    } catch (e) { }
    return String(rawDate);
  };

  const parseDateToMs = (dateStr: string): number => {
    if (!dateStr) return 0;
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      if (parts[0].length === 4) {
        return new Date(`${parts[0]}-${parts[1]}-${parts[2]}`).getTime() || 0;
      }
      return new Date(`${parts[2]}-${parts[1]}-${parts[0]}`).getTime() || 0;
    }
    return new Date(dateStr).getTime() || 0;
  };

  // 2. Process & Deduplicate Live Follow-Up Items
  const followUpItems = useMemo(() => {
    const map = new Map<string, any>();
    const todayMs = new Date().setHours(0, 0, 0, 0);

    const processItem = (item: any, source: string) => {
      if (!item) return;
      const phone = (item.phone || item.phoneNumber || item.mobile || item.contact || '').toString().trim();
      const pName = (item.patientName || item.fullName || item.name || item.patient || '').toString().trim();
      if (!pName && !phone) return;

      const prefDateRaw = item.preferredFollowUpDate || item.followUpDate || item.nextFollowUpDate || item.scheduledDate;
      const interval = item.followUpInterval || item.interval || '15 Days';
      
      if (interval === 'No Follow-up' && !prefDateRaw) return;

      const formattedPrefDate = formatNiceDate(prefDateRaw) || 'Pending Date';
      const cleanPhone = phone.replace(/\D/g, '').slice(-10);
      const regId = (item.regId || item.registrationId || item.patientId || (cleanPhone ? `REG-${cleanPhone.slice(-4)}` : 'REG-1001')).toUpperCase();
      
      const key = cleanPhone ? cleanPhone : `${pName.toLowerCase()}_${regId}`;

      const dateMs = parseDateToMs(formattedPrefDate);
      let status: 'overdue' | 'today' | 'upcoming' = 'upcoming';

      if (dateMs > 0) {
        if (dateMs < todayMs) status = 'overdue';
        else if (dateMs === todayMs) status = 'today';
      }

      if (!map.has(key) || (dateMs > 0 && parseDateToMs(map.get(key).preferredDate) < dateMs)) {
        map.set(key, {
          id: item.id || key,
          patientName: pName || 'Patient',
          phone: cleanPhone ? `+91 ${cleanPhone}` : 'N/A',
          rawPhone: cleanPhone,
          regId,
          doctorName: item.doctorName || item.doctor || 'Dr. Prashanth K Vaidya',
          branchName: item.branchName || item.branch || currentBranch,
          preferredDate: formattedPrefDate,
          followUpInterval: interval,
          diseases: item.diseases || item.diagnosisNotes || item.subject || 'General Follow-up',
          status,
          dateMs,
          source
        });
      }
    };

    rawPrescriptions.forEach(p => processItem(p, 'prescriptions'));
    rawAppointments.forEach(a => processItem(a, 'appointments'));
    rawAllPatients.forEach(p => processItem(p, 'allpatients'));

    const list = Array.from(map.values());
    list.sort((a, b) => b.dateMs - a.dateMs);
    return list;
  }, [rawPrescriptions, rawAppointments, rawAllPatients, currentBranch]);

  // Filtered List based on Search & Filter Tabs
  const filteredItems = useMemo(() => {
    return followUpItems.filter(item => {
      const matchesTab = activeTabFilter === 'all' || item.status === activeTabFilter;
      const q = searchTerm.toLowerCase().trim();
      const matchesSearch = !q ||
        item.patientName.toLowerCase().includes(q) ||
        item.phone.includes(q) ||
        item.regId.toLowerCase().includes(q) ||
        item.doctorName.toLowerCase().includes(q);

      return matchesTab && matchesSearch;
    });
  }, [followUpItems, searchTerm, activeTabFilter]);

  const handleCall = (phone: string) => {
    if (!phone) return;
    Linking.openURL(`tel:${phone}`).catch(() => Alert.alert('Error', 'Unable to make call'));
  };

  const handleWhatsApp = (item: any) => {
    if (!item.rawPhone) return;
    const msg = `Hello ${item.patientName}, this is a reminder from SPH Clinic regarding your scheduled follow-up on ${item.preferredDate}.`;
    const url = `whatsapp://send?phone=91${item.rawPhone}&text=${encodeURIComponent(msg)}`;
    Linking.openURL(url).catch(() => Alert.alert('Error', 'WhatsApp is not installed on this device.'));
  };

  const handleBookNext = (item: any) => {
    if (onNavigate) {
      onNavigate('reception_book', {
        fullName: item.patientName,
        phone: item.rawPhone,
        regID: item.regId,
        diseases: item.diseases
      });
    }
  };

  return (
    <View style={styles.container}>
      {/* HEADER & TITLE */}
      <View style={styles.header}>
        <Text style={styles.title}>Patient Follow-Ups</Text>
        <Text style={styles.subtitle}>Preferred follow-up dates & remedy schedules ({currentBranch})</Text>
      </View>

      {/* SEARCH BAR */}
      <View style={styles.searchBarBox}>
        <Feather name="search" size={18} color="#64748b" style={{ marginRight: 8 }} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search patient, phone, or reg ID..."
          placeholderTextColor="#94a3b8"
          value={searchTerm}
          onChangeText={setSearchTerm}
        />
        {searchTerm.length > 0 && (
          <TouchableOpacity onPress={() => setSearchTerm('')}>
            <Feather name="x" size={18} color="#64748b" />
          </TouchableOpacity>
        )}
      </View>

      {/* FILTER CHIPS */}
      <View style={styles.filterRow}>
        <TouchableOpacity
          onPress={() => setActiveTabFilter('all')}
          style={[styles.filterChip, activeTabFilter === 'all' && styles.filterChipActive]}
        >
          <Text style={[styles.filterChipText, activeTabFilter === 'all' && styles.filterChipTextActive]}>
            All ({followUpItems.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setActiveTabFilter('today')}
          style={[styles.filterChip, activeTabFilter === 'today' && styles.filterChipActiveToday]}
        >
          <Text style={[styles.filterChipText, activeTabFilter === 'today' && styles.filterChipTextToday]}>
            Due Today
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setActiveTabFilter('overdue')}
          style={[styles.filterChip, activeTabFilter === 'overdue' && styles.filterChipActiveOverdue]}
        >
          <Text style={[styles.filterChipText, activeTabFilter === 'overdue' && styles.filterChipTextOverdue]}>
            Overdue
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setActiveTabFilter('upcoming')}
          style={[styles.filterChip, activeTabFilter === 'upcoming' && styles.filterChipActiveUpcoming]}
        >
          <Text style={[styles.filterChipText, activeTabFilter === 'upcoming' && styles.filterChipTextUpcoming]}>
            Upcoming
          </Text>
        </TouchableOpacity>
      </View>

      {/* FOLLOW-UP LIST */}
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        {filteredItems.length === 0 ? (
          <View style={styles.emptyBox}>
            <Feather name="calendar" size={36} color="#cbd5e1" />
            <Text style={styles.emptyText}>No follow-up records found</Text>
          </View>
        ) : (
          filteredItems.map((item) => (
            <View key={item.id} style={styles.card}>
              {/* TOP PATIENT ROW */}
              <View style={styles.cardHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.patientName}>{item.patientName}</Text>
                  <Text style={styles.patientSub}>
                    {item.regId} • {item.phone}
                  </Text>
                </View>
                {item.status === 'overdue' && (
                  <View style={[styles.statusBadge, { backgroundColor: '#fef2f2', borderColor: '#fecaca' }]}>
                    <Text style={[styles.statusText, { color: '#dc2626' }]}>Overdue</Text>
                  </View>
                )}
                {item.status === 'today' && (
                  <View style={[styles.statusBadge, { backgroundColor: '#fffbeb', borderColor: '#fde68a' }]}>
                    <Text style={[styles.statusText, { color: '#d97706' }]}>Due Today</Text>
                  </View>
                )}
                {item.status === 'upcoming' && (
                  <View style={[styles.statusBadge, { backgroundColor: '#f0fdf4', borderColor: '#bbf7d0' }]}>
                    <Text style={[styles.statusText, { color: '#16a34a' }]}>Scheduled</Text>
                  </View>
                )}
              </View>

              {/* DETAILS ROW */}
              <View style={styles.detailsRow}>
                <View style={styles.prefDatePill}>
                  <Feather name="calendar" size={13} color="#0284c7" />
                  <Text style={styles.prefDateText}>Pref Date: {item.preferredDate}</Text>
                </View>
                <Text style={styles.intervalText}>Interval: {item.followUpInterval}</Text>
              </View>

              <Text style={styles.doctorText}>Doctor: {item.doctorName} ({item.branchName})</Text>

              {/* ACTION BUTTONS */}
              <View style={styles.actionRow}>
                {item.rawPhone ? (
                  <TouchableOpacity style={styles.callBtn} onPress={() => handleCall(item.rawPhone)}>
                    <Feather name="phone" size={14} color="#0284c7" />
                    <Text style={styles.callBtnText}>Call</Text>
                  </TouchableOpacity>
                ) : null}

                {item.rawPhone ? (
                  <TouchableOpacity style={styles.waBtn} onPress={() => handleWhatsApp(item)}>
                    <MaterialCommunityIcons name="whatsapp" size={16} color="#16a34a" />
                    <Text style={styles.waBtnText}>WhatsApp</Text>
                  </TouchableOpacity>
                ) : null}

                <TouchableOpacity style={styles.bookBtn} onPress={() => handleBookNext(item)}>
                  <Text style={styles.bookBtnText}>Book Next Slot</Text>
                  <Feather name="arrow-right" size={14} color="#ffffff" />
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc', paddingHorizontal: 16 },
  header: { marginTop: 14, marginBottom: 12 },
  title: { fontSize: 22, fontWeight: '800', color: '#0f172a' },
  subtitle: { fontSize: 12, color: '#64748b', marginTop: 2, fontWeight: '500' },
  searchBarBox: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#ffffff',
    borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 12, paddingHorizontal: 12,
    height: 44, marginBottom: 12
  },
  searchInput: { flex: 1, fontSize: 13, color: '#0f172a', fontWeight: '600' },
  filterRow: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  filterChip: {
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10,
    backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#e2e8f0'
  },
  filterChipActive: { backgroundColor: '#0284c7', borderColor: '#0284c7' },
  filterChipText: { fontSize: 12, fontWeight: '700', color: '#64748b' },
  filterChipTextActive: { color: '#ffffff' },
  filterChipActiveToday: { backgroundColor: '#d97706', borderColor: '#d97706' },
  filterChipTextToday: { color: '#ffffff' },
  filterChipActiveOverdue: { backgroundColor: '#ef4444', borderColor: '#ef4444' },
  filterChipTextOverdue: { color: '#ffffff' },
  filterChipActiveUpcoming: { backgroundColor: '#16a34a', borderColor: '#16a34a' },
  filterChipTextUpcoming: { color: '#ffffff' },

  emptyBox: { alignItems: 'center', justifyContent: 'center', paddingTop: 60 },
  emptyText: { marginTop: 10, fontSize: 14, color: '#94a3b8', fontWeight: '600' },

  card: {
    backgroundColor: '#ffffff', borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: '#e2e8f0', marginBottom: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.03, shadowRadius: 6, elevation: 1
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  patientName: { fontSize: 15, fontWeight: '700', color: '#0f172a' },
  patientSub: { fontSize: 12, color: '#64748b', marginTop: 2, fontWeight: '600' },
  statusBadge: { borderWidth: 1, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  statusText: { fontSize: 11, fontWeight: '800' },

  detailsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 10, marginBottom: 6 },
  prefDatePill: {
    flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#f0f9ff',
    borderWidth: 1, borderColor: '#bae6fd', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8
  },
  prefDateText: { fontSize: 12, fontWeight: '800', color: '#0369a1' },
  intervalText: { fontSize: 12, fontWeight: '600', color: '#475569' },
  doctorText: { fontSize: 12, color: '#64748b', marginBottom: 12 },

  actionRow: { flexDirection: 'row', gap: 8, justifyContent: 'flex-end', alignItems: 'center' },
  callBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#f1f5f9',
    paddingHorizontal: 10, paddingVertical: 8, borderRadius: 8
  },
  callBtnText: { fontSize: 12, fontWeight: '700', color: '#0284c7' },
  waBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#dcfce7',
    paddingHorizontal: 10, paddingVertical: 8, borderRadius: 8
  },
  waBtnText: { fontSize: 12, fontWeight: '700', color: '#15803d' },
  bookBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#0284c7',
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8
  },
  bookBtnText: { fontSize: 12, fontWeight: '700', color: '#ffffff' }
});
