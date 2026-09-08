import React, { useState } from 'react';
import { StyleSheet, Text, View, ScrollView, TextInput, TouchableOpacity, Alert } from 'react-native';

export const EditMedicineScreen: React.FC = () => {
  const [medName, setMedName] = useState('');
  const [medPotency, setMedPotency] = useState('200C');
  const [medStock, setMedStock] = useState('150');

  const handleSave = () => {
    if (!medName) {
      Alert.alert('Required Field', 'Please enter medicine name.');
      return;
    }
    Alert.alert('Saved', `Medicine ${medName} updated successfully.`);
    setMedName('');
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <Text style={styles.title}>Edit Medicine & Remedy Form</Text>
      <Text style={styles.subTitle}>Add or update homeopathic remedies and inventory stock.</Text>

      <View style={styles.card}>
        <Text style={styles.fieldLabel}>Medicine / Remedy Name *</Text>
        <View style={styles.inputBox}>
          <TextInput 
            style={styles.inputText}
            placeholder="e.g. Arnica Montana"
            placeholderTextColor="#94a3b8"
            value={medName}
            onChangeText={setMedName}
          />
        </View>

        <Text style={styles.fieldLabel}>Potency</Text>
        <View style={styles.inputBox}>
          <TextInput 
            style={styles.inputText}
            value={medPotency}
            onChangeText={setMedPotency}
          />
        </View>

        <Text style={styles.fieldLabel}>Stock Quantity (Units)</Text>
        <View style={styles.inputBox}>
          <TextInput 
            style={styles.inputText}
            keyboardType="number-pad"
            value={medStock}
            onChangeText={setMedStock}
          />
        </View>

        <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
          <Text style={styles.saveBtnText}>Save Medicine Details</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc', padding: 16 },
  title: { fontSize: 18, fontWeight: '800', color: '#0f172a' },
  subTitle: { fontSize: 12, color: '#64748b', marginBottom: 14 },
  card: { backgroundColor: '#ffffff', borderRadius: 14, padding: 16, borderWidth: 1, borderColor: '#e2e8f0' },
  fieldLabel: { fontSize: 12, fontWeight: '700', color: '#0f172a', marginTop: 10, marginBottom: 4 },
  inputBox: { backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 10, paddingHorizontal: 12, height: 44, justifyContent: 'center' },
  inputText: { fontSize: 13, color: '#0f172a' },
  saveBtn: { backgroundColor: '#258ec8', borderRadius: 12, height: 46, alignItems: 'center', justifyContent: 'center', marginTop: 16 },
  saveBtnText: { color: '#ffffff', fontSize: 14, fontWeight: '800' },
});
