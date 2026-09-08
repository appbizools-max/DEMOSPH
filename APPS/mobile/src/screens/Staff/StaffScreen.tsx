import React from 'react';
import { StyleSheet, Text, View, ScrollView } from 'react-native';

export const StaffScreen: React.FC = () => {
  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Clinic Staff & Inventory</Text>
      <Text style={styles.subtitle}>Remedy inventory & daily clinic tasks.</Text>

      <View style={styles.card}>
        <Text style={styles.cardHeader}>Dispensary Inventory</Text>
        <Text style={styles.stockText}>Arnica 30C: In Stock (42 bottles)</Text>
        <Text style={styles.lowStockText}>Ignatia 200C: Low Stock (3 left)</Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc', paddingHorizontal: 20, paddingTop: 12 },
  title: { fontSize: 22, fontWeight: '800', color: '#0f172a' },
  subtitle: { fontSize: 13, color: '#64748b', marginBottom: 16 },
  card: { backgroundColor: '#ffffff', padding: 16, borderRadius: 14, borderWidth: 1, borderColor: '#e2e8f0', marginBottom: 12 },
  cardHeader: { fontSize: 16, fontWeight: '700', color: '#0f172a', marginBottom: 8 },
  stockText: { fontSize: 14, color: '#a8ce3a', fontWeight: '600', marginBottom: 4 },
  lowStockText: { fontSize: 14, color: '#258ec8', fontWeight: '600' },
});
