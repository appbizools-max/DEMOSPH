import React from 'react';
import { StyleSheet, Text, View, ScrollView } from 'react-native';

export const PayrollSalaryScreen: React.FC = () => {
  const payrollList = [
    { name: 'Anil Kumar M', branch: 'KPHB', salary: '₹22,000', status: 'Processed' },
    { name: 'Ashwini Begari', branch: 'Chandanagar', salary: '₹17,000', status: 'Processed' },
    { name: 'Vaishnavi Peri', branch: 'Nallagandla', salary: '₹17,000', status: 'Processed' },
    { name: 'Nandini Gottelli', branch: 'Dilshuknagar', salary: '₹15,000', status: 'Pending' },
  ];

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <Text style={styles.title}>Staff Payroll & Base Salaries</Text>
      <Text style={styles.subTitle}>Monthly compensation and payout status.</Text>

      {payrollList.map(p => (
        <View key={p.name} style={styles.card}>
          <Text style={styles.cardTitle}>{p.name} ({p.branch})</Text>
          <Text style={styles.cardSalary}>Base Salary: {p.salary}</Text>
          <Text style={[styles.cardStatus, p.status === 'Processed' ? styles.statusGreen : styles.statusRed]}>
            Status: {p.status}
          </Text>
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
  cardSalary: { fontSize: 13, fontWeight: '800', color: '#0f172a', marginTop: 4 },
  cardStatus: { fontSize: 11.5, fontWeight: '800', marginTop: 4 },
  statusGreen: { color: '#a8ce3a' },
  statusRed: { color: '#258ec8' },
});
