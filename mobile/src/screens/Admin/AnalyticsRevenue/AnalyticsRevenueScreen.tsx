import React from 'react';
import { StyleSheet, Text, View, ScrollView } from 'react-native';

export const AnalyticsRevenueScreen: React.FC = () => {
  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <Text style={styles.title}>Average Analytics & Total Revenue</Text>
      <Text style={styles.subTitle}>Clinic revenue metrics, ticket sizes, and average analytics.</Text>

      <View style={styles.card}>
        <Text style={styles.statLabel}>TOTAL REVENUE</Text>
        <Text style={styles.statVal}>₹36,90,000</Text>
        <Text style={styles.statSub}>+14.2% Growth vs Last Month</Text>
      </View>

      <View style={[styles.card, { marginTop: 12 }]}>
        <Text style={styles.statLabel}>AVERAGE CONSULTATION TICKET</Text>
        <Text style={[styles.statVal, { color: '#a8ce3a' }]}>₹3,200 / Patient</Text>
        <Text style={styles.statSub}>Average Revenue per Consultation</Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc', padding: 16 },
  title: { fontSize: 18, fontWeight: '800', color: '#0f172a' },
  subTitle: { fontSize: 12, color: '#64748b', marginBottom: 14 },
  card: { backgroundColor: '#ffffff', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#e2e8f0' },
  statLabel: { fontSize: 11.5, fontWeight: '800', color: '#64748b' },
  statVal: { fontSize: 22, fontWeight: '800', color: '#258ec8', marginVertical: 4 },
  statSub: { fontSize: 11, color: '#64748b' },
});
