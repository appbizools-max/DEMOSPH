import React from 'react';
import { StyleSheet, Text, View, ScrollView } from 'react-native';

export const PendingPaymentsScreen: React.FC = () => {
  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <Text style={styles.title}>Pending Payments Status</Text>
      <Text style={styles.subTitle}>Outstanding patient balances and payment follow-ups.</Text>

      <View style={styles.card}>
        <Text style={styles.statLabel}>TOTAL PENDING PAYMENTS</Text>
        <Text style={styles.statVal}>₹1,45,000</Text>
        <Text style={styles.statSub}>12 Pending Patient Invoices Scheduled for Follow-up</Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc', padding: 16 },
  title: { fontSize: 18, fontWeight: '800', color: '#0f172a' },
  subTitle: { fontSize: 12, color: '#64748b', marginBottom: 14 },
  card: { backgroundColor: '#ffffff', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#cbd5e1' },
  statLabel: { fontSize: 11.5, fontWeight: '800', color: '#258ec8' },
  statVal: { fontSize: 22, fontWeight: '800', color: '#258ec8', marginVertical: 4 },
  statSub: { fontSize: 11, color: '#64748b' },
});
