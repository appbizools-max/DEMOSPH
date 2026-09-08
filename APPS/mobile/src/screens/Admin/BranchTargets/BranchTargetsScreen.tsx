import React from 'react';
import { StyleSheet, Text, View, ScrollView } from 'react-native';

export const BranchTargetsScreen: React.FC = () => {
  const branchTargets = [
    { name: 'KPHB Branch', target: '₹12,00,000', current: '₹9,80,000' },
    { name: 'Nallagandla Branch', target: '₹10,00,000', current: '₹8,40,000' },
    { name: 'Dilshuknagar Branch', target: '₹14,00,000', current: '₹11,50,000' },
    { name: 'Chandanagar Branch', target: '₹9,00,000', current: '₹7,20,000' },
  ];

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <Text style={styles.title}>Branch Target Management</Text>
      <Text style={styles.subTitle}>Monthly revenue targets and branch progress.</Text>

      {branchTargets.map(b => (
        <View key={b.name} style={styles.card}>
          <Text style={styles.cardTitle}>{b.name}</Text>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 }}>
            <Text style={styles.infoText}>Target: <Text style={{ fontWeight: '800', color: '#258ec8' }}>{b.target}</Text></Text>
            <Text style={styles.infoText}>Achieved: <Text style={{ fontWeight: '800', color: '#a8ce3a' }}>{b.current}</Text></Text>
          </View>
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
  infoText: { fontSize: 12, color: '#475569' },
});
