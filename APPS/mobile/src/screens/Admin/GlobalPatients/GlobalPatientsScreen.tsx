import React from 'react';
import { StyleSheet, Text, View, ScrollView } from 'react-native';

export const GlobalPatientsScreen: React.FC = () => {
  const globalPatients = [
    { id: 'PAT-101', name: 'Rajesh Kumar', phone: '+91 98490 12345', branch: 'KPHB Branch', source: 'Instagram' },
    { id: 'PAT-102', name: 'Sneha Reddy', phone: '+91 91210 67890', branch: 'Nallagandla Branch', source: 'Google' },
    { id: 'PAT-103', name: 'Venkatesh Rao', phone: '+91 94400 45678', branch: 'Dilshuknagar Branch', source: 'Website' },
    { id: 'PAT-104', name: 'Ananya Sharma', phone: '+91 99887 11223', branch: 'Chandanagar Branch', source: 'Referral' },
  ];

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <Text style={styles.title}>Global Patients Directory</Text>
      <Text style={styles.subTitle}>Master registry across all 4 SPH branches.</Text>

      {globalPatients.map(p => (
        <View key={p.id} style={styles.card}>
          <Text style={styles.patientId}>{p.id}</Text>
          <Text style={styles.cardTitle}>{p.name}</Text>
          <Text style={styles.cardSub}>{p.phone} • {p.branch}</Text>
          <Text style={styles.cardSource}>Source: {p.source}</Text>
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
  patientId: { fontSize: 11, fontWeight: '800', color: '#258ec8' },
  cardTitle: { fontSize: 14.5, fontWeight: '800', color: '#0f172a', marginTop: 2 },
  cardSub: { fontSize: 12, color: '#64748b', marginTop: 2 },
  cardSource: { fontSize: 11.5, color: '#a8ce3a', fontWeight: '700', marginTop: 4 },
});
