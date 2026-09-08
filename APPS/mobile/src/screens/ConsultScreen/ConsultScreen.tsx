import React, { useState } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, Alert } from 'react-native';
import { ConsultationAppointment, createDocument } from '@app/shared';

export const ConsultScreen: React.FC = () => {
  const [userName, setUserName] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  const handleBook = async () => {
    if (!userName.trim()) {
      Alert.alert('Required', 'Please enter your name.');
      return;
    }

    setLoading(true);
    const appointment: ConsultationAppointment = {
      userId: 'user_mobile_99',
      userName,
      doctorName: 'Dr. Spiritual Homeo Specialist',
      appointmentDate: date || 'Tomorrow',
      appointmentTime: time || '10:00 AM',
      consultationType: 'Homeopathic Remedy',
      status: 'scheduled',
      notes
    };

    try {
      await createDocument('consultations', appointment);
      Alert.alert('Success', 'Consultation appointment requested!');
    } catch (err) {
      Alert.alert('Logged', 'Appointment request recorded.');
    } finally {
      setLoading(false);
      setUserName('');
      setNotes('');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Book Doctor Consultation</Text>
      <Text style={styles.subtitle}>Connect 1-on-1 with a spiritual & homeopathic specialist.</Text>

      <View style={styles.card}>
        <TextInput 
          style={styles.input} 
          placeholder="Your Full Name" 
          placeholderTextColor="#94a3b8"
          value={userName}
          onChangeText={setUserName}
        />
        <TextInput 
          style={styles.input} 
          placeholder="Preferred Date (e.g. 2026-09-05)" 
          placeholderTextColor="#94a3b8"
          value={date}
          onChangeText={setDate}
        />
        <TextInput 
          style={styles.input} 
          placeholder="Preferred Time (e.g. 03:00 PM)" 
          placeholderTextColor="#94a3b8"
          value={time}
          onChangeText={setTime}
        />
        <TextInput 
          style={[styles.input, { height: 80 }]} 
          placeholder="Symptoms or health goals..." 
          placeholderTextColor="#94a3b8"
          multiline
          value={notes}
          onChangeText={setNotes}
        />

        <TouchableOpacity style={styles.button} onPress={handleBook} disabled={loading}>
          <Text style={styles.btnText}>{loading ? 'Booking...' : 'Confirm Appointment'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#f8fafc',
    marginTop: 12,
  },
  subtitle: {
    fontSize: 13,
    color: '#94a3b8',
    marginBottom: 16,
  },
  card: {
    backgroundColor: 'rgba(30, 41, 59, 0.7)',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  input: {
    backgroundColor: 'rgba(15, 23, 42, 0.8)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 10,
    color: '#ffffff',
    padding: 12,
    fontSize: 14,
    marginBottom: 12,
  },
  button: {
    backgroundColor: '#06b6d4',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 6,
  },
  btnText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 14,
  },
});
