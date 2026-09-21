import React, { useState } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export const DoctorPatientListScreen: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const patients = [
    { id: '1', name: 'Sarah Jenkins', age: 34, phone: '9848012345', reason: 'Acute Anxiety & Chronic Insomnia', status: 'Waiting' },
    { id: '2', name: 'Rajesh Kumar', age: 48, phone: '9949023456', reason: 'Migraine & Spondylitis', status: 'In Consult', remedy: 'Nux Vomica 200C' },
    { id: '3', name: 'Anita Sharma', age: 29, phone: '9876543210', reason: 'Eczema & Allergic Rhinitis', status: 'Waiting' },
    { id: '4', name: 'David Miller', age: 52, phone: '9123456789', reason: 'Hypertension & Acid Reflux', status: 'Completed', remedy: 'Arnica 200C' },
  ];

  const filtered = patients.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || p.phone.includes(searchTerm);
    const matchesStatus = statusFilter === 'all' || p.status.toLowerCase().replace(' ', '') === statusFilter.toLowerCase().replace(' ', '');
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
      {filtered.map((item) => (
        <View key={item.id} style={styles.patientCard}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <View>
              <Text style={styles.patName}>{item.name} ({item.age} yrs)</Text>
              <Text style={styles.patPhone}>📞 {item.phone}</Text>
            </View>
            <Text style={[
              styles.statusBadge,
              item.status === 'Completed' ? styles.statusComp : item.status === 'In Consult' ? styles.statusConsult : styles.statusWait
            ]}>
              {item.status}
            </Text>
          </View>

          <View style={styles.complaintBox}>
            <Text style={styles.complaintText}><Text style={{ fontWeight: '700' }}>Complaint:</Text> {item.reason}</Text>
            {item.remedy && (
              <Text style={styles.remedyText}>💊 Remedy: {item.remedy}</Text>
            )}
          </View>
        </View>
      ))}

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
