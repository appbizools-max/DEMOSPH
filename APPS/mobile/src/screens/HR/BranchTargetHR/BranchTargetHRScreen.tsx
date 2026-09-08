import React from 'react';
import { StyleSheet, Text, View, ScrollView } from 'react-native';

export const BranchTargetHRScreen: React.FC = () => {
  const branchTargets = [
    { name: 'KPHB Branch Target', target: '₹12,00,000', current: '₹9,80,000', status: 'On Track (82%)' },
    { name: 'Nallagandla Branch Target', target: '₹10,00,000', current: '₹8,40,000', status: 'On Track (84%)' },
    { name: 'Dilshuknagar Branch Target', target: '₹14,00,000', current: '₹11,50,000', status: 'Ahead (82%)' },
    { name: 'Chandanagar Branch Target', target: '₹9,00,000', current: '₹7,20,000', status: 'On Track (80%)' },
  ];

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <Text style={styles.title}>HR Branch Target Management</Text>
      <Text style={styles.subTitle}>Branch revenue performance and staff targets.</Text>

      {branchTargets.map(b => (
        <View key={b.name} style={styles.card}>
          <Text style={styles.cardTitle}>{b.name}</Text>
          <Text style={styles.cardSub}>Target: {b.target} | Current: {b.current}</Text>
          <Text style={styles.cardStatus}>{b.status}</Text>
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
  cardSub: { fontSize: 12, color: '#64748b', marginTop: 4 },
  cardStatus: { fontSize: 12, fontWeight: '700', color: '#258ec8', marginTop: 4 },
});
