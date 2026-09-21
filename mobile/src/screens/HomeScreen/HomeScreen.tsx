import React from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Platform } from 'react-native';

interface HomeScreenProps {
  onNavigate: (screen: string) => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({ onNavigate }) => {
  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
      {/* Header Badge */}
      <View style={styles.badge}>
        <Text style={styles.badgeText}>SPIRITUAL HOMEO MOBILE</Text>
      </View>

      <Text style={styles.title}>Natural Homeopathic & Spiritual Healing</Text>
      <Text style={styles.subtitle}>
        Classical homeopathy remedies combined with spiritual wellness for mind, body & soul.
      </Text>

      {/* Action Buttons */}
      <View style={styles.btnRow}>
        <TouchableOpacity style={styles.btnPrimary} onPress={() => onNavigate('remedies')}>
          <Text style={styles.btnText}>Explore Remedies</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.btnSecondary} onPress={() => onNavigate('consult')}>
          <Text style={styles.btnSecondaryText}>Book Doctor</Text>
        </TouchableOpacity>
      </View>

      {/* Cards */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Homeopathic Remedies</Text>
        <Text style={styles.cardDesc}>Browse remedies for acute and chronic conditions with precise potency guidance.</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Spiritual Consultations</Text>
        <Text style={styles.cardDesc}>Connect 1-on-1 with qualified homeopathic doctors and wellness guides.</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>iOS & Android Ready</Text>
        <Text style={styles.cardDesc}>Running natively on {Platform.OS.toUpperCase()} with shared cloud state.</Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 20,
  },
  badge: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    alignSelf: 'flex-start',
    marginVertical: 12,
  },
  badgeText: {
    color: '#34d399',
    fontSize: 11,
    fontWeight: '700',
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: '#f8fafc',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#94a3b8',
    lineHeight: 20,
    marginBottom: 20,
  },
  btnRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  btnPrimary: {
    flex: 1,
    backgroundColor: '#258ec8',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  btnText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 14,
  },
  btnSecondary: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  btnSecondaryText: {
    color: '#258ec8',
    fontWeight: '700',
    fontSize: 14,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#258ec8',
    marginBottom: 6,
  },
  cardDesc: {
    fontSize: 13,
    color: '#94a3b8',
    lineHeight: 18,
  },
});
