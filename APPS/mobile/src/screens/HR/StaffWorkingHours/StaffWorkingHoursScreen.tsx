import React from 'react';
import { StyleSheet, Text, View, ScrollView } from 'react-native';

export const StaffWorkingHoursScreen: React.FC = () => {
  const staffWorkingHours = [
    { name: 'Anil Kumar M', role: 'Regular Staff', branch: 'KPHB', hours: '8.5 Hours/Day', shift: '10:00 AM - 08:30 PM' },
    { name: 'Ashwini Begari', role: 'Regular Staff', branch: 'Chandanagar', hours: '8.0 Hours/Day', shift: '10:00 AM - 08:00 PM' },
    { name: 'Vaishnavi Peri', role: 'Regular Staff', branch: 'Nallagandla', hours: '8.5 Hours/Day', shift: '10:00 AM - 08:30 PM' },
    { name: 'Nandini Gottelli', role: 'Regular Staff', branch: 'Dilshuknagar', hours: '8.5 Hours/Day', shift: '10:00 AM - 08:30 PM' },
  ];

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <Text style={styles.title}>Staff Working Hours & Shift Roster</Text>
      <Text style={styles.subTitle}>Daily working hours log and active shift rosters.</Text>

      {staffWorkingHours.map(s => (
        <View key={s.name} style={styles.card}>
          <Text style={styles.cardTitle}>{s.name} ({s.branch})</Text>
          <Text style={styles.cardRole}>Role: {s.role}</Text>
          <Text style={styles.cardShift}>Shift: {s.shift}</Text>
          <Text style={styles.cardHours}>Working Hours: {s.hours}</Text>
        </View>
      ))}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc', padding: 16 },
  title: { fontSize: 18, fontWeight: '800', color: '#0f172a' },
  subTitle: { fontSize: 12, color: '#64748b', marginBottom: 14 },
  card: { backgroundColor: '#ffffff', borderRadius: 14, padding: 14, borderWidth: 1, borderColor: '#e2e8f0', marginBottom: 10 },
  cardTitle: { fontSize: 14.5, fontWeight: '800', color: '#0f172a' },
  cardRole: { fontSize: 12, color: '#64748b', marginTop: 2 },
  cardShift: { fontSize: 12, color: '#258ec8', fontWeight: '600', marginTop: 4 },
  cardHours: { fontSize: 12.5, color: '#a8ce3a', fontWeight: '700', marginTop: 2 },
});
