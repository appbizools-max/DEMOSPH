import React from 'react';
import { StyleSheet, Text, View, ScrollView } from 'react-native';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';

export const DashboardScreen: React.FC = () => {
  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.headerRow}>
        <MaterialCommunityIcons name="view-dashboard" size={24} color="#258ec8" />
        <Text style={styles.title}>Admin Overview Dashboard</Text>
      </View>
      <Text style={styles.subTitle}>Live clinic operations & high-level system summary.</Text>

      <View style={styles.card}>
        <Text style={styles.cardHeader}>Quick Metrics</Text>
        <Text style={styles.statText}>Total Revenue: ₹36,90,000</Text>
        <Text style={styles.statText}>Active Branches: 4 Official</Text>
        <Text style={styles.statText}>Global Patients: 1,250 Registered</Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc', padding: 16 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 4 },
  title: { fontSize: 18, fontWeight: '800', color: '#0f172a' },
  subTitle: { fontSize: 12, color: '#64748b', marginBottom: 16 },
  card: { backgroundColor: '#ffffff', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#e2e8f0' },
  cardHeader: { fontSize: 15, fontWeight: '800', color: '#0f172a', marginBottom: 10 },
  statText: { fontSize: 13, color: '#334155', fontWeight: '600', marginBottom: 6 },
});
