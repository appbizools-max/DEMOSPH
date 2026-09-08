import React from 'react';
import { StyleSheet, Text, View, ScrollView } from 'react-native';

export const DoctorNoShowScreen: React.FC = () => {
  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
      <View style={styles.header}>
        <Text style={styles.title}>Doctor No Show</Text>
        <Text style={styles.subtitle}>Doctor absences & slot rescheduling alerts</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardHeader}>Today's Status</Text>
        <Text style={styles.subText}>No doctor no-shows logged today. All doctors present in clinic rooms.</Text>
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
  cardHeader: { fontSize: 16, fontWeight: '700', color: '#1e293b', marginBottom: 6 },
  subText: { fontSize: 13, color: '#64748b', lineHeight: 18 },
});
