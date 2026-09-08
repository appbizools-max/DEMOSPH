import React from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity } from 'react-native';

export const CleaningPhotosScreen: React.FC = () => {
  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
      <View style={styles.header}>
        <Text style={styles.title}>Clinic Sanitation & Cleaning Photos</Text>
        <Text style={styles.subtitle}>Daily clinic hygiene & sterilization photo logs</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardHeader}>Upload Daily Cleaning Photo</Text>
        <Text style={styles.subText}>Take a photo of sterilized Consultation Rooms or Waiting Lounge.</Text>
        <TouchableOpacity style={styles.btn}>
          <Text style={styles.btnText}>Take & Upload Photo</Text>
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
  cardHeader: { fontSize: 16, fontWeight: '700', color: '#1e293b', marginBottom: 6 },
  subText: { fontSize: 13, color: '#64748b', marginBottom: 14, lineHeight: 18 },
  btn: { backgroundColor: '#a8ce3a', paddingVertical: 12, borderRadius: 10, alignItems: 'center' },
  btnText: { color: '#ffffff', fontWeight: '800', fontSize: 13 },
});
