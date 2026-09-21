import React from 'react';
import { StyleSheet, Text, View, ScrollView } from 'react-native';

export const NewPatientSourcedScreen: React.FC = () => {
  const sources = [
    { name: 'Instagram', count: 420 },
    { name: 'Google Search', count: 310 },
    { name: 'Website Direct', count: 215 },
    { name: 'Referral', count: 180 },
    { name: 'Practo', count: 95 },
    { name: 'Youtube', count: 70 },
    { name: 'Walk-in', count: 140 },
    { name: 'Old Patient', count: 260 },
  ];

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <Text style={styles.title}>New Patient & Marketing Source Data</Text>
      <Text style={styles.subTitle}>Breakdown of patient acquisitions by source.</Text>

      {sources.map(s => (
        <View key={s.name} style={styles.card}>
          <Text style={styles.cardTitle}>{s.name}</Text>
          <Text style={styles.cardCount}>{s.count} Patients Acquired</Text>
        </View>
      ))}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc', padding: 16 },
  title: { fontSize: 18, fontWeight: '800', color: '#0f172a' },
  subTitle: { fontSize: 12, color: '#64748b', marginBottom: 14 },
  card: { backgroundColor: '#ffffff', borderRadius: 14, padding: 14, borderWidth: 1, borderColor: '#e2e8f0', marginBottom: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardTitle: { fontSize: 14.5, fontWeight: '800', color: '#0f172a' },
  cardCount: { fontSize: 12.5, fontWeight: '700', color: '#258ec8' },
});
