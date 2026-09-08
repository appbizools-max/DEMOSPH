import React from 'react';
import { StyleSheet, Text, View, ScrollView, TextInput, TouchableOpacity } from 'react-native';

export const ProductBillingScreen: React.FC = () => {
  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
      <View style={styles.header}>
        <Text style={styles.title}>Product Billing</Text>
        <Text style={styles.subtitle}>Invoices, consultation fees & receipts</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardHeader}>Generate Billing Receipt</Text>
        <TextInput style={styles.input} placeholder="Patient Name or ID" placeholderTextColor="#94a3b8" />
        <TextInput style={styles.input} placeholder="Product / Remedy Name" placeholderTextColor="#94a3b8" />
        <TextInput style={styles.input} placeholder="Amount (₹)" keyboardType="number-pad" placeholderTextColor="#94a3b8" />
        <TouchableOpacity style={styles.btn}>
          <Text style={styles.btnText}>Generate & Print Receipt</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc', paddingHorizontal: 18 },
  header: { marginVertical: 16 },
  title: { fontSize: 24, fontWeight: '800', color: '#1e293b' },
  subtitle: { fontSize: 13, color: '#64748b', marginTop: 2 },
  card: { backgroundColor: '#ffffff', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#e2e8f0', marginBottom: 12 },
  cardHeader: { fontSize: 16, fontWeight: '700', color: '#1e293b', marginBottom: 12 },
  input: { backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 10, padding: 12, fontSize: 14, marginBottom: 10 },
  btn: { backgroundColor: '#258ec8', paddingVertical: 14, borderRadius: 10, alignItems: 'center', marginTop: 6 },
  btnText: { color: '#ffffff', fontWeight: '800', fontSize: 13 },
});
