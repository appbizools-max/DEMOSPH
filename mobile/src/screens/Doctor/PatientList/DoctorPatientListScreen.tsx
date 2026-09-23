import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { receptionDataStore } from '../../../utils/receptionDataStore';

interface DoctorPatientListScreenProps {
  onNavigateTab?: (tab: string, patient?: any) => void;
}

export const DoctorPatientListScreen: React.FC<DoctorPatientListScreenProps> = ({ onNavigateTab }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [patients, setPatients] = useState<any[]>(() => receptionDataStore.getAppointments());

  useEffect(() => {
    receptionDataStore.startListeners();
    const unsub = receptionDataStore.subscribe((state) => {
      setPatients(state.appointments);
    });
    return () => unsub();
  }, []);

  const filtered = patients.filter(p => {
    const pName = String(p.patientName || p.name || '').toLowerCase();
    const pPhone = String(p.phone || p.phoneNumber || '');
    const pReason = String(p.chiefComplaint || p.subject || p.diseases || '').toLowerCase();
    const sTerm = searchTerm.toLowerCase().trim();

    const matchesSearch = !sTerm || pName.includes(sTerm) || pPhone.includes(sTerm) || pReason.includes(sTerm);

    const st = String(p.status || 'waiting').toLowerCase();
    const matchesStatus = statusFilter === 'all'
      || (statusFilter === 'waiting' && (st === 'waiting' || st === 'scheduled' || st === 'upcoming'))
      || (statusFilter === 'inconsult' && (st === 'in_consultation' || st === 'in-consultation' || st === 'active' || st === 'consulting'))
      || (statusFilter === 'completed' && (st === 'completed' || st === 'done' || st === 'collect_fee'));

    return matchesSearch && matchesStatus;
  });

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Search Input */}
      <View style={styles.searchBar}>
        <Ionicons name="search-outline" size={18} color="#64748b" style={{ marginRight: 8 }} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search patient by name or phone..."
          placeholderTextColor="#94a3b8"
          value={searchTerm}
          onChangeText={setSearchTerm}
        />
      </View>

      {/* Status Filter Chips */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 14 }}>
        {[
          { id: 'all', label: 'All Patients' },
          { id: 'waiting', label: 'Waiting' },
          { id: 'inconsult', label: 'In Consult' },
          { id: 'completed', label: 'Completed' },
        ].map((chip) => (
          <TouchableOpacity
            key={chip.id}
            style={[styles.chip, statusFilter === chip.id && styles.chipActive]}
            onPress={() => setStatusFilter(chip.id)}
          >
            <Text style={[styles.chipText, statusFilter === chip.id && styles.chipTextActive]}>
              {chip.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Patient Directory List */}
      {filtered.map((item, idx) => {
        const pName = item.patientName || item.name || 'Patient';
        const pPhone = item.phone || item.phoneNumber || 'N/A';
        const pBranch = item.branch || item.branchName || 'Clinic';
        const pReason = item.chiefComplaint || item.subject || item.diseases || 'Consultation';
        const pStatus = (item.status || 'waiting').toLowerCase();
        const isDone = pStatus === 'completed' || pStatus === 'done' || pStatus === 'collect_fee';
        const isConsult = pStatus === 'in_consultation' || pStatus === 'in-consultation' || pStatus === 'active';

        return (
          <TouchableOpacity
            key={item.id ? `${item.id}-${idx}` : `pat-${idx}`}
            style={styles.patientCard}
            activeOpacity={0.8}
            onPress={() => onNavigateTab && onNavigateTab('patient_file', item)}
          >
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <View style={{ flex: 1 }}>
                <Text style={styles.patName}>{pName} {item.regId || item.registrationId ? `(${item.regId || item.registrationId})` : ''}</Text>
                <Text style={styles.patPhone}>📞 {pPhone} • {pBranch}</Text>
              </View>
              <Text style={[
                styles.statusBadge,
                isDone ? styles.statusComp : isConsult ? styles.statusConsult : styles.statusWait
              ]}>
                {isDone ? 'Completed' : isConsult ? 'In Consult' : 'Waiting'}
              </Text>
            </View>

            <View style={styles.complaintBox}>
              <Text style={styles.complaintText}><Text style={{ fontWeight: '700' }}>Complaint:</Text> {pReason}</Text>
            </View>

            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 10 }}>
              <View style={{ backgroundColor: '#e0f2fe', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 6, flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Ionicons name="document-text-outline" size={13} color="#0284c7" />
                <Text style={{ fontSize: 11, fontWeight: '800', color: '#0284c7' }}>Open Patient File ➔</Text>
              </View>
            </View>
          </TouchableOpacity>
        );
      })}

      <View style={{ height: 40 }} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc', paddingHorizontal: 14, paddingTop: 12 },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
    marginBottom: 12,
  },
  searchInput: { flex: 1, fontSize: 13, color: '#0f172a' },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginRight: 8,
  },
  chipActive: { backgroundColor: '#258ec8', borderColor: '#258ec8' },
  chipText: { fontSize: 12, color: '#64748b', fontWeight: '600' },
  chipTextActive: { color: '#ffffff', fontWeight: '800' },
  patientCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 10,
  },
  patName: { fontSize: 15, fontWeight: '800', color: '#0f172a' },
  patPhone: { fontSize: 12, color: '#64748b', marginTop: 2 },
  statusBadge: { fontSize: 10.5, fontWeight: '800', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  statusWait: { backgroundColor: '#fef3c7', color: '#b45309' },
  statusConsult: { backgroundColor: '#e0f2fe', color: '#0369a1' },
  statusComp: { backgroundColor: '#dcfce7', color: '#15803d' },
  complaintBox: {
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    padding: 10,
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  complaintText: { fontSize: 12.5, color: '#334155' },
  remedyText: { fontSize: 12, color: '#16a34a', fontWeight: '700', marginTop: 4 },
});
