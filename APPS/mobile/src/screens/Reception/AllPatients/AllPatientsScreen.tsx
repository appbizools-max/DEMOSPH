import React, { useState } from 'react';
import { StyleSheet, Text, View, FlatList, TextInput, TouchableOpacity, Modal, Alert } from 'react-native';

interface PatientItem {
  id: string;
  name: string;
  phone: string;
  age: number;
  lastVisit: string;
}

const mockPatients: PatientItem[] = [
  { id: 'PAT-901', name: 'Sarah Jenkins', phone: '+91 98765 43210', age: 34, lastVisit: 'Today' },
  { id: 'PAT-902', name: 'Ramesh Kumar', phone: '+91 91234 56789', age: 45, lastVisit: 'Today' },
  { id: 'PAT-903', name: 'Anita Sharma', phone: '+91 99887 76655', age: 29, lastVisit: '2 days ago' },
  { id: 'PAT-904', name: 'Michael Chang', phone: '+91 94455 66778', age: 52, lastVisit: '1 week ago' },
];

export const AllPatientsScreen: React.FC = () => {
  const [search, setSearch] = useState('');
  const [patients, setPatients] = useState<PatientItem[]>(mockPatients);
  const [modalVisible, setModalVisible] = useState(false);
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');

  const filtered = patients.filter(p => 
    p.name.toLowerCase().includes(search.toLowerCase()) || 
    p.phone.includes(search) || 
    p.id.toLowerCase().includes(search.toLowerCase())
  );

  const handleRegister = () => {
    if (!newName.trim() || !newPhone.trim()) {
      Alert.alert('Required', 'Please enter patient name and mobile number.');
      return;
    }

    const newPatient: PatientItem = {
      id: `PAT-${Math.floor(905 + Math.random() * 90)}`,
      name: newName,
      phone: newPhone,
      age: 30,
      lastVisit: 'Just now'
    };

    setPatients([newPatient, ...patients]);
    setNewName('');
    setNewPhone('');
    setModalVisible(false);
    Alert.alert('Registered', `Patient ${newPatient.name} (${newPatient.id}) registered successfully!`);
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>All Patients</Text>
          <Text style={styles.subtitle}>Patient Directory & Registration Desk</Text>
        </View>
        <TouchableOpacity style={styles.addBtn} onPress={() => setModalVisible(true)}>
          <Text style={styles.addBtnText}>+ Register</Text>
        </TouchableOpacity>
      </View>

      {/* Search Input */}
      <TextInput 
        style={styles.searchInput} 
        placeholder="Search by name, phone, or PAT-ID..." 
        placeholderTextColor="#94a3b8"
        value={search}
        onChangeText={setSearch}
      />

      {/* Patients List */}
      <FlatList
        data={filtered}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <View style={styles.patientCard}>
            <View style={styles.cardHeader}>
              <Text style={styles.nameText}>{item.name}</Text>
              <Text style={styles.idBadge}>{item.id}</Text>
            </View>
            <Text style={styles.phoneText}>{item.phone}</Text>
            <View style={styles.footerRow}>
              <Text style={styles.subText}>{item.age} yrs • Last visit: {item.lastVisit}</Text>
              <TouchableOpacity style={styles.viewBtn}>
                <Text style={styles.viewBtnText}>History</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      />

      {/* Register Patient Modal */}
      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Register New Patient</Text>

            <Text style={styles.inputLabel}>Patient Name</Text>
            <TextInput 
              style={styles.modalInput} 
              placeholder="Enter patient full name..." 
              placeholderTextColor="#94a3b8"
              value={newName}
              onChangeText={setNewName}
            />

            <Text style={styles.inputLabel}>Mobile Phone Number</Text>
            <TextInput 
              style={styles.modalInput} 
              placeholder="+91 Mobile number..." 
              placeholderTextColor="#94a3b8"
              keyboardType="phone-pad"
              value={newPhone}
              onChangeText={setNewPhone}
            />

            <View style={styles.modalBtnRow}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setModalVisible(false)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={handleRegister}>
                <Text style={styles.saveBtnText}>Save Patient</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
    paddingHorizontal: 18,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#1e293b',
  },
  subtitle: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 2,
  },
  addBtn: {
    backgroundColor: '#258ec8',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
  },
  addBtnText: {
    color: '#ffffff',
    fontWeight: '800',
    fontSize: 13,
  },
  searchInput: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: '#0f172a',
    marginBottom: 16,
  },
  patientCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  nameText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1e293b',
  },
  idBadge: {
    color: '#258ec8',
    fontSize: 12,
    fontWeight: '800',
    backgroundColor: 'rgba(37, 142, 200, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  phoneText: {
    fontSize: 13,
    color: '#475569',
    marginBottom: 10,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    paddingTop: 8,
  },
  subText: {
    fontSize: 12,
    color: '#94a3b8',
  },
  viewBtn: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  viewBtnText: {
    color: '#258ec8',
    fontSize: 12,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  modalCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 24,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1e293b',
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 4,
    marginTop: 4,
  },
  modalInput: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#0f172a',
    marginBottom: 12,
  },
  modalBtnRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
  },
  cancelBtn: {
    flex: 1,
    backgroundColor: '#f1f5f9',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  cancelBtnText: {
    color: '#64748b',
    fontWeight: '700',
  },
  saveBtn: {
    flex: 1,
    backgroundColor: '#258ec8',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  saveBtnText: {
    color: '#ffffff',
    fontWeight: '800',
  },
});
