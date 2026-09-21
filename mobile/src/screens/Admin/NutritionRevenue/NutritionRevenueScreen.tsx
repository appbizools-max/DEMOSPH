import React from 'react';
import { StyleSheet, Text, View, ScrollView } from 'react-native';

export const NutritionRevenueScreen: React.FC = () => {
  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <Text style={styles.title}>Nutrition & Supplement Revenue</Text>
      <Text style={styles.subTitle}>Homeopathic supplements and nutrition sales.</Text>

      <View style={styles.card}>
        <Text style={styles.statLabel}>TOTAL NUTRITION REVENUE</Text>
        <Text style={styles.statVal}>₹4,85,000</Text>
        <Text style={styles.statSub}>Homeopathic Wellness & Nutritional Remedies</Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc', padding: 16 },
  title: { fontSize: 18, fontWeight: '800', color: '#0f172a' },
  subTitle: { fontSize: 12, color: '#64748b', marginBottom: 14 },
  card: { backgroundColor: '#ffffff', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#cbd5e1' },
  statLabel: { fontSize: 11.5, fontWeight: '800', color: '#a8ce3a' },
  statVal: { fontSize: 22, fontWeight: '800', color: '#a8ce3a', marginVertical: 4 },
  statSub: { fontSize: 11, color: '#64748b' },
});
