import React from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export const DoctorPackagesScreen: React.FC = () => {
  const packagesList = [
    {
      id: 'pkg-1',
      title: 'Constitutional Homeopathy Plan',
      tag: '6 Months Care',
      price: '₹12,500',
      description: 'Comprehensive chronic care covering deep-acting constitutional remedies, monthly checkups & unlimited emergency guidance.',
      features: ['Monthly In-Person / Video Consultations', 'Free Home Delivery of Prescriptions', 'Personalized Spiritual & Lifestyle Plan', '24/7 Priority Emergency Support'],
      popular: true,
    },
    {
      id: 'pkg-2',
      title: 'Spiritual Wellness & Mind Balance',
      tag: '3 Months Program',
      price: '₹8,000',
      description: 'Integrated mind-body healing targeting stress, anxiety, insomnoid disorders, and mental fatigue.',
      features: ['Weekly Spiritual & Meditation Sessions', 'Mind-Body Homeopathic Formulations', 'Stress & Sleep Quality Tracking', 'Direct Access to Head Doctor'],
      popular: false,
    },
    {
      id: 'pkg-3',
      title: 'Acute Immunity & Wellness Shield',
      tag: 'Annual Family Plan',
      price: '₹22,000',
      description: 'Complete family healthcare coverage focusing on preventative homeopathic constitutional care.',
      features: ['Covers up to 4 Family Members', 'Unlimited Acute Disease Consultations', 'Seasonal Immunity Boosters', 'Free Medicine Delivery'],
      popular: false,
    },
  ];

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <Text style={styles.title}>Treatment Packages</Text>
        <Text style={styles.subtitle}>Curated Homeopathy & Spiritual Care Plans</Text>
      </View>

      {packagesList.map((pkg) => (
        <View key={pkg.id} style={[styles.packageCard, pkg.popular && styles.packageCardPopular]}>
          {pkg.popular && (
            <View style={styles.popularBadge}>
              <Text style={styles.popularBadgeText}>MOST POPULAR</Text>
            </View>
          )}

          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginTop: pkg.popular ? 8 : 0 }}>
            <View style={{ flex: 1, paddingRight: 8 }}>
              <Text style={styles.pkgTitle}>{pkg.title}</Text>
              <View style={styles.tagBadge}>
                <Text style={styles.tagText}>{pkg.tag}</Text>
              </View>
            </View>
            <Text style={styles.pkgPrice}>{pkg.price}</Text>
          </View>

          <Text style={styles.pkgDesc}>{pkg.description}</Text>

          <View style={styles.divider} />

          <Text style={styles.featuresHeader}>PACKAGE HIGHLIGHTS:</Text>
          {pkg.features.map((feat, idx) => (
            <View key={idx} style={styles.featRow}>
              <Ionicons name="checkmark-circle" size={16} color="#16a34a" style={{ marginRight: 6 }} />
              <Text style={styles.featText}>{feat}</Text>
            </View>
          ))}

          <TouchableOpacity style={styles.enrollBtn}>
            <Text style={styles.enrollBtnText}>Prescribe Package to Patient</Text>
          </TouchableOpacity>
        </View>
      ))}

      <View style={{ height: 40 }} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc', paddingHorizontal: 14, paddingTop: 12 },
  header: { marginBottom: 14 },
  title: { fontSize: 20, fontWeight: '800', color: '#0f172a' },
  subtitle: { fontSize: 13, color: '#64748b', marginTop: 2 },
  packageCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    marginBottom: 14,
    position: 'relative',
  },
  packageCardPopular: {
    borderColor: '#0284c7',
    borderWidth: 2,
    backgroundColor: '#f0f9ff',
  },
  popularBadge: {
    position: 'absolute',
    top: -12,
    right: 16,
    backgroundColor: '#0284c7',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
  },
  popularBadgeText: { color: '#ffffff', fontSize: 9.5, fontWeight: '900' },
  pkgTitle: { fontSize: 16, fontWeight: '800', color: '#0f172a' },
  tagBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#e0f2fe',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    marginTop: 4,
  },
  tagText: { color: '#0369a1', fontSize: 11, fontWeight: '700' },
  pkgPrice: { fontSize: 20, fontWeight: '900', color: '#0284c7' },
  pkgDesc: { fontSize: 12.5, color: '#475569', marginTop: 10, lineHeight: 18 },
  divider: { height: 1, backgroundColor: '#e2e8f0', marginVertical: 12 },
  featuresHeader: { fontSize: 11, fontWeight: '800', color: '#64748b', marginBottom: 6 },
  featRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  featText: { fontSize: 12, color: '#334155', fontWeight: '600' },
  enrollBtn: {
    backgroundColor: '#0284c7',
    borderRadius: 10,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
  },
  enrollBtnText: { color: '#ffffff', fontWeight: '800', fontSize: 13 },
});
