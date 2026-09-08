import React from 'react';
import { StyleSheet, Text, View, ScrollView } from 'react-native';

export const PackageMembersScreen: React.FC = () => {
  const packages = [
    { name: 'Platinum Annual Wellness', price: '₹25,000/yr', members: 145 },
    { name: 'Classical Homeo Care Plan', price: '₹15,000/yr', members: 210 },
    { name: 'Pediatric Care Package', price: '₹12,000/yr', members: 98 },
    { name: 'Chronic Illness Wellness Plan', price: '₹18,000/yr', members: 175 },
  ];

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <Text style={styles.title}>Package Members & Subscriptions</Text>
      <Text style={styles.subTitle}>Homeopathic package subscribers & membership status.</Text>

      {packages.map(pkg => (
        <View key={pkg.name} style={styles.card}>
          <Text style={styles.cardTitle}>{pkg.name}</Text>
          <Text style={styles.cardPrice}>Price: {pkg.price}</Text>
          <Text style={styles.cardMembers}>{pkg.members} Active Members</Text>
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
  cardPrice: { fontSize: 12.5, fontWeight: '700', color: '#258ec8', marginTop: 4 },
  cardMembers: { fontSize: 12, color: '#a8ce3a', fontWeight: '700', marginTop: 2 },
});
