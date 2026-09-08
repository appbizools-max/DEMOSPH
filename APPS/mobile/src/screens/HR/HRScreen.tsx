import React, { useState } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons, Feather, MaterialCommunityIcons } from '@expo/vector-icons';

export const HRScreen: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'attendance' | 'roster' | 'targets' | 'payroll'>('attendance');

  const [staffList, setStaffList] = useState([
    { id: '1', name: 'Anil Kumar M', role: 'Regular Staff', branch: 'KPHB', hours: '8.5 hrs', status: 'Present' },
    { id: '2', name: 'Ashwini Begari', role: 'Regular Staff', branch: 'Chandanagar', hours: '8.0 hrs', status: 'Present' },
    { id: '3', name: 'Vaishnavi Peri', role: 'Regular Staff', branch: 'Nallagandla', hours: '8.5 hrs', status: 'Present' },
    { id: '4', name: 'Nandini Gottelli', role: 'Regular Staff', branch: 'Dilshuknagar', hours: '0.0 hrs', status: 'On Leave' },
  ]);

  const toggleAttendance = (id: string) => {
    setStaffList(prev => prev.map(s => {
      if (s.id === id) {
        const nextStatus = s.status === 'Present' ? 'Absent' : s.status === 'Absent' ? 'On Leave' : 'Present';
        return { ...s, status: nextStatus };
      }
      return s;
    }));
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 60 }} showsVerticalScrollIndicator={false}>
      
      {/* Title Header */}
      <View style={styles.header}>
        <View style={styles.iconCircle}>
          <MaterialCommunityIcons name="account-group" size={24} color="#ffffff" />
        </View>
        <View>
          <Text style={styles.headerTitle}>HR & Staff Portal</Text>
          <Text style={styles.headerSub}>Staff Working Hours, Attendance & Branch Targets</Text>
        </View>
      </View>

      {/* Tabs (Wrapped, No Side Scrolling) */}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
        {[
          { id: 'attendance', label: 'Attendance' },
          { id: 'roster', label: 'Shift Roster' },
          { id: 'targets', label: 'Branch Targets' },
          { id: 'payroll', label: 'Staff Payroll' },
        ].map(tab => (
          <TouchableOpacity
            key={tab.id}
            style={[styles.tabChip, activeTab === tab.id && styles.tabChipActive]}
            onPress={() => setActiveTab(tab.id as any)}
          >
            <Text style={[styles.tabChipText, activeTab === tab.id && styles.tabChipTextActive]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* TAB 1: ATTENDANCE */}
      {activeTab === 'attendance' && (
        <View style={{ gap: 10 }}>
          <Text style={{ fontSize: 13, fontWeight: '800', color: '#0f172a', marginBottom: 4 }}>
            Today's Staff Attendance (Tap badge to change)
          </Text>
          {staffList.map(stf => (
            <View key={stf.id} style={styles.card}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <View>
                  <Text style={styles.cardTitle}>{stf.name}</Text>
                  <Text style={{ fontSize: 12, color: '#64748b' }}>{stf.role} • {stf.branch}</Text>
                  <Text style={{ fontSize: 12, color: '#a8ce3a', fontWeight: '700', marginTop: 4 }}>Hours: {stf.hours}</Text>
                </View>

                <TouchableOpacity 
                  onPress={() => toggleAttendance(stf.id)}
                  style={[
                    styles.badge, 
                    stf.status === 'Present' ? styles.bgGreen : stf.status === 'Absent' ? styles.bgRed : styles.bgYellow
                  ]}
                >
                  <Text style={[
                    styles.badgeText,
                    stf.status === 'Present' ? styles.textGreen : stf.status === 'Absent' ? styles.textRed : styles.textYellow
                  ]}>
                    {stf.status}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* TAB 2: SHIFT ROSTER */}
      {activeTab === 'roster' && (
        <View style={{ gap: 10 }}>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Morning Shift (10:00 AM - 02:00 PM)</Text>
            <Text style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>Anil Kumar M, Vaishnavi Peri, Arun Kumar</Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Evening Shift (03:00 PM - 08:30 PM)</Text>
            <Text style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>Ashwini Begari, Nandini Gottelli</Text>
          </View>
        </View>
      )}

      {/* TAB 3: TARGETS */}
      {activeTab === 'targets' && (
        <View style={{ gap: 10 }}>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>KPHB Branch Target</Text>
            <Text style={{ fontSize: 12, color: '#64748b' }}>Target: ₹12,00,000 | Achieved: ₹9,80,000</Text>
          </View>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Dilshuknagar Branch Target</Text>
            <Text style={{ fontSize: 12, color: '#64748b' }}>Target: ₹14,00,000 | Achieved: ₹11,50,000</Text>
          </View>
        </View>
      )}

      {/* TAB 4: PAYROLL */}
      {activeTab === 'payroll' && (
        <View style={{ gap: 10 }}>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Anil Kumar M - KPHB</Text>
            <Text style={{ fontSize: 13, fontWeight: '800', color: '#a8ce3a', marginTop: 2 }}>Base Salary: ₹22,000 (Processed)</Text>
          </View>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Ashwini Begari - Chandanagar</Text>
            <Text style={{ fontSize: 13, fontWeight: '800', color: '#a8ce3a', marginTop: 2 }}>Base Salary: ₹17,000 (Processed)</Text>
          </View>
        </View>
      )}

    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc', paddingHorizontal: 16, paddingTop: 12 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  iconCircle: { width: 44, height: 44, borderRadius: 14, backgroundColor: '#258ec8', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#0f172a' },
  headerSub: { fontSize: 11.5, color: '#64748b' },
  tabChip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#e2e8f0' },
  tabChipActive: { backgroundColor: '#258ec8', borderColor: '#258ec8' },
  tabChipText: { fontSize: 12, fontWeight: '600', color: '#64748b' },
  tabChipTextActive: { color: '#ffffff', fontWeight: '800' },
  card: { backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 16, padding: 16 },
  cardTitle: { fontSize: 15, fontWeight: '800', color: '#0f172a' },
  badge: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  bgGreen: { backgroundColor: '#f4f9e8' },
  bgRed: { backgroundColor: '#eef5fc' },
  bgYellow: { backgroundColor: '#f8fafc' },
  badgeText: { fontSize: 11.5, fontWeight: '800' },
  textGreen: { color: '#a8ce3a' },
  textRed: { color: '#258ec8' },
  textYellow: { color: '#64748b' },
});
