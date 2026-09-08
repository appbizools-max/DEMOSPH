import React, { useState } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export const DoctorTotalRevenueScreen: React.FC = () => {
  const [timeframe, setTimeframe] = useState<'month' | 'quarter' | 'year'>('month');

  const summaryCards = [
    { title: 'Total Revenue', amount: '₹3,85,000', growth: '+18.5%', bg: '#0284c7' },
    { title: 'Consultations', amount: '₹1,45,000', growth: '+12.0%', bg: '#0f172a' },
    { title: 'Remedies Dispensed', amount: '₹1,60,000', growth: '+22.4%', bg: '#0f172a' },
    { title: 'Package Sales', amount: '₹80,000', growth: '+15.8%', bg: '#0f172a' },
  ];

  const paymentModes = [
    { mode: 'UPI / QR Code', amount: '₹2,10,000', share: '54.5%', pct: 0.545 },
    { mode: 'Credit / Debit Cards', amount: '₹95,000', share: '24.7%', pct: 0.247 },
    { mode: 'Cash Payments', amount: '₹55,000', share: '14.3%', pct: 0.143 },
    { mode: 'Bank Transfer', amount: '₹25,000', share: '6.5%', pct: 0.065 },
  ];

  const recentReceipts = [
    { id: 'TXN-901', patient: 'Sarah Jenkins', service: 'Constitutional Package', amount: '₹12,500', mode: 'UPI' },
    { id: 'TXN-902', patient: 'Rajesh Kumar', service: 'Consultation & Remedy', amount: '₹2,400', mode: 'Card' },
    { id: 'TXN-903', patient: 'Anita Sharma', service: 'Acute Remedy Dispense', amount: '₹1,800', mode: 'Cash' },
    { id: 'TXN-904', patient: 'David Miller', service: 'Spiritual Mind Care', amount: '₹8,000', mode: 'UPI' },
  ];

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      
      {/* Banner */}
      <View style={styles.headerBanner}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={styles.bannerTitle}>Total Revenue</Text>
              <View style={styles.headBadge}>
                <Text style={styles.headBadgeText}>HEAD DOCTOR</Text>
              </View>
            </View>
            <Text style={styles.bannerSub}>Financial overview & income channels</Text>
          </View>
          <Ionicons name="stats-chart" size={28} color="#38bdf8" />
        </View>

        {/* Timeframe Selector */}
        <View style={styles.timeframeRow}>
          {(['month', 'quarter', 'year'] as const).map((t) => (
            <TouchableOpacity
              key={t}
              style={[styles.tfBtn, timeframe === t && styles.tfBtnActive]}
              onPress={() => setTimeframe(t)}
            >
              <Text style={[styles.tfBtnText, timeframe === t && styles.tfBtnTextActive]}>
                This {t}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Primary Hero Revenue Card */}
      <View style={styles.heroCard}>
        <Text style={styles.heroLabel}>NET REVENUE (THIS MONTH)</Text>
        <Text style={styles.heroAmount}>₹3,85,000</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 6, gap: 4 }}>
          <Ionicons name="trending-up-outline" size={16} color="#a7f3d0" />
          <Text style={styles.heroGrowth}>+18.5% growth vs last month</Text>
        </View>
      </View>

      {/* Metrics Grid */}
      <View style={styles.gridContainer}>
        {summaryCards.slice(1).map((card, idx) => (
          <View key={idx} style={styles.gridCard}>
            <Text style={styles.gridLabel}>{card.title.toUpperCase()}</Text>
            <Text style={styles.gridVal}>{card.amount}</Text>
            <Text style={styles.gridGrowth}>{card.growth}</Text>
          </View>
        ))}
      </View>

      {/* Payment Modes Breakdown */}
      <View style={styles.sectionBox}>
        <View style={styles.sectionHeader}>
          <Ionicons name="card-outline" size={20} color="#0284c7" />
          <Text style={styles.sectionTitle}>Payment Collections</Text>
        </View>

        {paymentModes.map((item, idx) => (
          <View key={idx} style={styles.payRow}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
              <Text style={styles.payModeName}>{item.mode}</Text>
              <Text style={styles.payModeAmt}>{item.amount} ({item.share})</Text>
            </View>
            <View style={styles.barBg}>
              <View style={[styles.barFill, { width: `${item.pct * 100}%` }]} />
            </View>
          </View>
        ))}
      </View>

      {/* Recent Receipts List */}
      <View style={styles.sectionBox}>
        <View style={styles.sectionHeader}>
          <Ionicons name="receipt-outline" size={20} color="#16a34a" />
          <Text style={styles.sectionTitle}>Recent Receipts</Text>
        </View>

        {recentReceipts.map((tx) => (
          <View key={tx.id} style={styles.txCard}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={styles.txPatient}>{tx.patient}</Text>
              <Text style={styles.txAmt}>{tx.amount}</Text>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
              <Text style={styles.txService}>{tx.service}</Text>
              <Text style={styles.txMode}>{tx.mode}</Text>
            </View>
          </View>
        ))}
      </View>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc', paddingHorizontal: 14, paddingTop: 12 },
  headerBanner: {
    backgroundColor: '#0f172a',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  bannerTitle: { fontSize: 18, fontWeight: '800', color: '#ffffff' },
  bannerSub: { fontSize: 12, color: '#94a3b8', marginTop: 2 },
  headBadge: { backgroundColor: 'rgba(56, 189, 248, 0.2)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  headBadgeText: { color: '#38bdf8', fontSize: 9, fontWeight: '800' },
  timeframeRow: { flexDirection: 'row', marginTop: 12, gap: 6 },
  tfBtn: { flex: 1, paddingVertical: 6, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center' },
  tfBtnActive: { backgroundColor: '#ffffff' },
  tfBtnText: { fontSize: 11, fontWeight: '700', color: '#94a3b8', textTransform: 'capitalize' },
  tfBtnTextActive: { color: '#0f172a', fontWeight: '800' },
  heroCard: {
    backgroundColor: '#0284c7',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  heroLabel: { fontSize: 11, fontWeight: '800', color: 'rgba(255,255,255,0.85)' },
  heroAmount: { fontSize: 26, fontWeight: '900', color: '#ffffff', marginTop: 4 },
  heroGrowth: { fontSize: 12, fontWeight: '700', color: '#a7f3d0' },
  gridContainer: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  gridCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  gridLabel: { fontSize: 9.5, fontWeight: '800', color: '#64748b' },
  gridVal: { fontSize: 15, fontWeight: '900', color: '#0f172a', marginTop: 4 },
  gridGrowth: { fontSize: 10.5, fontWeight: '700', color: '#16a34a', marginTop: 2 },
  sectionBox: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 12,
  },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  sectionTitle: { fontSize: 15, fontWeight: '800', color: '#0f172a' },
  payRow: { marginBottom: 10 },
  payModeName: { fontSize: 12.5, fontWeight: '700', color: '#334155' },
  payModeAmt: { fontSize: 12, fontWeight: '800', color: '#0f172a' },
  barBg: { height: 6, backgroundColor: '#f1f5f9', borderRadius: 3, overflow: 'hidden', marginTop: 4 },
  barFill: { height: '100%', backgroundColor: '#0284c7', borderRadius: 3 },
  txCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    marginBottom: 8,
  },
  txPatient: { fontSize: 13.5, fontWeight: '800', color: '#0f172a' },
  txAmt: { fontSize: 14, fontWeight: '900', color: '#0284c7' },
  txService: { fontSize: 11.5, color: '#64748b' },
  txMode: { fontSize: 10.5, fontWeight: '800', color: '#475569', backgroundColor: '#e2e8f0', paddingHorizontal: 6, paddingVertical: 1, borderRadius: 4 },
});
