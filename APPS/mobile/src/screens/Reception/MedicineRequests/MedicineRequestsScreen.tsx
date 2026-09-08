import React from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity } from 'react-native';

export const MedicineRequestsScreen: React.FC = () => {
  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
      <View style={styles.header}>
        <Text style={styles.title}>Medicine Requests</Text>
        <Text style={styles.subtitle}>Patient remedy refills & courier dispatch</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardHeader}>Refill: Arnica 200C Liquid</Text>
        <Text style={styles.subText}>Patient: David Miller • Hyderabad</Text>
        <TouchableOpacity style={styles.btn}>
          <Text style={styles.btnText}>Approve Dispatch</Text>
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
  cardHeader: { fontSize: 16, fontWeight: '700', color: '#1e293b' },
  subText: { fontSize: 13, color: '#64748b', marginTop: 4, marginBottom: 12 },
  btn: { backgroundColor: '#a8ce3a', paddingVertical: 12, borderRadius: 10, alignItems: 'center' },
  btnText: { color: '#ffffff', fontWeight: '800', fontSize: 13 },
});
