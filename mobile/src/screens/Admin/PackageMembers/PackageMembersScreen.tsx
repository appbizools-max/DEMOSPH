import React, { useState, useEffect, useMemo } from 'react';
import {
  StyleSheet, Text, View, ScrollView, TouchableOpacity,
  TextInput, ActivityIndicator, Modal, SafeAreaView
} from 'react-native';
import { Ionicons, Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { getSafeDb, collection, onSnapshot } from '../../../utils/firebaseSafe';

export const PackageMembersScreen: React.FC = () => {
  const db = getSafeDb();
  const [loading, setLoading] = useState(true);
  const [members, setMembers] = useState<any[]>([]);
  const [patientDirectory, setPatientDirectory] = useState<Record<string, any>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'due' | 'paid' | 'expired'>('all');
  const [selectedMemberHistory, setSelectedMemberHistory] = useState<any | null>(null);

  // Real-time listener for package_members and allpatients
  useEffect(() => {
    if (!db) return;
    let unsubPkg: (() => void) | null = null;
    let unsubPat: (() => void) | null = null;

    try {
      unsubPkg = onSnapshot(collection(db, 'package_members'), (snapshot) => {
        const list: any[] = [];
        snapshot.forEach((docSnap) => {
          list.push({ id: docSnap.id, ...docSnap.data() });
        });
        // Sort descending by payment date / created date
        list.sort((a, b) => {
          const tA = new Date(a.paymentDate || a.startDate || a.createdAt || 0).getTime();
          const tB = new Date(b.paymentDate || b.startDate || b.createdAt || 0).getTime();
          return tB - tA;
        });
        setMembers(list);
        setLoading(false);
      }, (err) => {
        console.error('Error listening to package members in mobile:', err);
        setLoading(false);
      });
    } catch (e) {
      console.error('Firestore package members setup error in mobile:', e);
      setLoading(false);
    }

    try {
      unsubPat = onSnapshot(collection(db, 'allpatients'), (snapshot) => {
        const dir: Record<string, any> = {};
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          dir[docSnap.id] = data;
          if (data.patientName) dir[String(data.patientName).toLowerCase().trim()] = data;
          if (data.name) dir[String(data.name).toLowerCase().trim()] = data;
          const ph = (data.phone || data.phoneNumber || data.mobile || '').replace(/\D/g, '').slice(-10);
          if (ph) dir[ph] = data;
        });
        setPatientDirectory(dir);
      }, (err) => {
        console.warn('Allpatients lookup notice in mobile:', err);
      });
    } catch (e) {
      console.warn('Allpatients setup notice in mobile:', e);
    }

    return () => {
      if (unsubPkg) unsubPkg();
      if (unsubPat) unsubPat();
    };
  }, []);

  const computeEffectiveExpiry = (m: any): Date | null => {
    if (m.expiryDate) {
      const d = new Date(m.expiryDate);
      if (!isNaN(d.getTime())) return d;
    }
    const startStr = m.startDate || m.paymentDate || m.createdAt;
    if (!startStr) return null;
    const start = new Date(startStr);
    if (isNaN(start.getTime())) return null;

    let months = Number(m.durationMonths) || 0;
    if (!months && m.duration) {
      const match = String(m.duration).match(/(\d+)\s*(month|year)/i);
      if (match) {
        const num = parseInt(match[1], 10);
        months = match[2].toLowerCase().startsWith('year') ? num * 12 : num;
      }
    }
    if (!months) months = 3;

    const exp = new Date(start);
    exp.setMonth(exp.getMonth() + months);
    return exp;
  };

  const getCleanMemberDetails = (m: any, index: number) => {
    const matched = (m.patientDocId && patientDirectory[m.patientDocId]) ||
                    patientDirectory[m.id] ||
                    (m.patientName && patientDirectory[String(m.patientName).toLowerCase().trim()]) ||
                    (m.name && patientDirectory[String(m.name).toLowerCase().trim()]) ||
                    (m.phone && patientDirectory[String(m.phone).replace(/\D/g, '').slice(-10)]);

    // Clean Phone
    let rawPhone = m.phone || m.phoneNumber || '';
    if ((!rawPhone || rawPhone.trim().length === 0) && matched) {
      rawPhone = matched.phone || matched.phoneNumber || matched.mobile || '';
    }
    const cleanPhone = rawPhone.replace(/\D/g, '').slice(-10);

    // Clean Reg ID
    let rawReg = m.patientId || (matched && (matched.registrationId || matched.regId || matched.regID || matched.patientId || matched.uhid));
    let cleanRegId = '';
    if (rawReg && typeof rawReg === 'string' && rawReg.trim().length > 0 && rawReg.trim().length <= 18 && !/^[a-zA-Z0-9]{19,32}$/.test(rawReg.trim())) {
      cleanRegId = rawReg.trim().toUpperCase();
    } else {
      const branchStr = (m.branch || m.branchName || (matched && matched.branch) || 'KPHB').toUpperCase();
      let shortcut = 'KPB';
      if (branchStr.includes('KPHB') || branchStr === 'KPB') shortcut = 'KPB';
      else if (branchStr.includes('CHANDANAGAR') || branchStr === 'CHN') shortcut = 'CHN';
      else if (branchStr.includes('NALLAGANDLA') || branchStr === 'NGL') shortcut = 'NGL';
      else if (branchStr.includes('DILSHUKNAGAR') || branchStr === 'DIL') shortcut = 'DIL';
      else shortcut = branchStr.replace(/[^A-Z]/g, '').substring(0, 3) || 'GEN';

      cleanRegId = `SPH-${shortcut}-${String(index + 1).padStart(4, '0')}`;
    }

    return { cleanPhone, cleanRegId };
  };

  // Filtered members
  const filteredMembers = useMemo(() => {
    return members.filter((m) => {
      const q = searchQuery.toLowerCase().trim();
      const matchQuery =
        !q ||
        (m.patientName && String(m.patientName).toLowerCase().includes(q)) ||
        (m.phone && String(m.phone).includes(q)) ||
        (m.patientId && String(m.patientId).toLowerCase().includes(q)) ||
        (m.branch && String(m.branch).toLowerCase().includes(q));

      if (!matchQuery) return false;

      const rem = Number(m.remainingAmount || 0);
      const expDate = computeEffectiveExpiry(m);
      const isExpired = expDate ? expDate.getTime() < Date.now() : false;

      if (statusFilter === 'active') return !isExpired;
      if (statusFilter === 'due') return rem > 0 && !isExpired;
      if (statusFilter === 'paid') return rem <= 0 && !isExpired;
      if (statusFilter === 'expired') return isExpired;
      return true;
    });
  }, [members, searchQuery, statusFilter, patientDirectory]);

  // Aggregate stats
  const stats = useMemo(() => {
    let totalVal = 0;
    let totalPaid = 0;
    let totalDue = 0;
    let activeCount = 0;
    members.forEach((m) => {
      const tot = Number(m.totalAmount || 0);
      const paid = Number(m.paidAmount || 0);
      const rem = Number(m.remainingAmount !== undefined ? m.remainingAmount : Math.max(0, tot - paid));
      const expDate = computeEffectiveExpiry(m);
      const isExpired = expDate ? expDate.getTime() < Date.now() : false;
      if (!isExpired) activeCount++;
      totalVal += tot;
      totalPaid += paid;
      totalDue += rem;
    });
    return { count: members.length, activeCount, expiredCount: members.length - activeCount, totalVal, totalPaid, totalDue };
  }, [members]);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Package Members</Text>
          <Text style={styles.headerSubtitle}>Real-time package subscriptions & dues directory</Text>
        </View>
        <View style={styles.badgeCount}>
          <Text style={styles.badgeCountText}>{filteredMembers.length} Patients</Text>
        </View>
      </View>

      <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* KPI Stats Cards */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.kpiRow}>
          <View style={[styles.kpiCard, { borderColor: '#93c5fd', backgroundColor: '#eff6ff' }]}>
            <Text style={[styles.kpiLabel, { color: '#1d4ed8' }]}>ACTIVE MEMBERS</Text>
            <Text style={[styles.kpiValue, { color: '#1e3a8a' }]}>{stats.activeCount}</Text>
          </View>

          <View style={[styles.kpiCard, { borderColor: '#bbf7d0', backgroundColor: '#f0fdf4' }]}>
            <Text style={[styles.kpiLabel, { color: '#16a34a' }]}>COLLECTED REVENUE</Text>
            <Text style={[styles.kpiValue, { color: '#15803d' }]}>₹{stats.totalPaid.toLocaleString('en-IN')}</Text>
          </View>

          <View style={[styles.kpiCard, { borderColor: '#fecaca', backgroundColor: '#fef2f2' }]}>
            <Text style={[styles.kpiLabel, { color: '#dc2626' }]}>PENDING BALANCE</Text>
            <Text style={[styles.kpiValue, { color: '#b91c1c' }]}>₹{stats.totalDue.toLocaleString('en-IN')}</Text>
          </View>

          <View style={[styles.kpiCard, { borderColor: '#fca5a5', backgroundColor: '#fff1f2' }]}>
            <Text style={[styles.kpiLabel, { color: '#dc2626' }]}>INACTIVE (EXPIRED)</Text>
            <Text style={[styles.kpiValue, { color: '#dc2626' }]}>{stats.expiredCount}</Text>
          </View>

          <View style={[styles.kpiCard, { borderColor: '#e2e8f0', backgroundColor: '#ffffff' }]}>
            <Text style={[styles.kpiLabel, { color: '#64748b' }]}>TOTAL VALUE</Text>
            <Text style={[styles.kpiValue, { color: '#0f172a' }]}>₹{stats.totalVal.toLocaleString('en-IN')}</Text>
          </View>
        </ScrollView>

        {/* Search Bar */}
        <View style={styles.searchBox}>
          <Feather name="search" size={16} color="#64748b" style={{ marginRight: 8 }} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by patient name, phone, reg ID..."
            placeholderTextColor="#94a3b8"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={18} color="#94a3b8" />
            </TouchableOpacity>
          )}
        </View>

        {/* Filter Tabs */}
        <View style={styles.filterTabsRow}>
          {[
            { id: 'all', label: `All (${members.length})` },
            { id: 'active', label: `Active (${stats.activeCount})` },
            { id: 'due', label: 'Due Pending' },
            { id: 'paid', label: 'Paid in Full' },
            { id: 'expired', label: `Inactive (${stats.expiredCount})` },
          ].map((tab) => {
            const isSel = statusFilter === tab.id;
            const isExpiredTab = tab.id === 'expired';
            return (
              <TouchableOpacity
                key={tab.id}
                onPress={() => setStatusFilter(tab.id as any)}
                style={[
                  styles.filterTabBtn,
                  isSel && (isExpiredTab ? styles.filterTabBtnExpired : styles.filterTabBtnActive)
                ]}
              >
                <Text style={[
                  styles.filterTabText,
                  isSel && styles.filterTabTextActive,
                  !isSel && isExpiredTab && { color: '#dc2626' }
                ]}>
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Member Cards List */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#258ec8" />
            <Text style={styles.loadingText}>Loading package subscribers...</Text>
          </View>
        ) : filteredMembers.length === 0 ? (
          <View style={styles.emptyContainer}>
            <MaterialCommunityIcons name="package-variant-closed" size={48} color="#cbd5e1" />
            <Text style={styles.emptyTitle}>No Package Members Found</Text>
            <Text style={styles.emptySub}>
              {searchQuery ? 'No members matching your search query.' : 'No packages have been enrolled yet.'}
            </Text>
          </View>
        ) : (
          filteredMembers.map((m, index) => {
            const tot = Number(m.totalAmount || 0);
            const paid = Number(m.paidAmount || 0);
            const rem = Number(m.remainingAmount !== undefined ? m.remainingAmount : Math.max(0, tot - paid));
            const isPaidFull = rem <= 0;
            const expDate = computeEffectiveExpiry(m);
            const isExpired = expDate ? expDate.getTime() < Date.now() : false;
            const { cleanPhone, cleanRegId } = getCleanMemberDetails(m, index);

            const joinDateStr = m.paymentDate
              ? new Date(m.paymentDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
              : (m.startDate ? new Date(m.startDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A');

            const expiryDateStr = expDate
              ? expDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
              : 'N/A';

            return (
              <View key={m.id} style={styles.memberCard}>
                {/* Header Row */}
                <View style={styles.memberCardHeader}>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Text style={styles.patientName}>{m.patientName || 'Patient'}</Text>
                      <View style={[styles.pkgBadge, isExpired && { backgroundColor: '#fef2f2', borderColor: '#fca5a5' }]}>
                        <Text style={[styles.pkgBadgeText, isExpired && { color: '#dc2626' }]}>[PKG]</Text>
                      </View>
                    </View>
                    <Text style={styles.patientMeta}>
                      Reg: <Text style={{ color: '#258ec8', fontWeight: '800' }}>{cleanRegId}</Text>
                      {cleanPhone ? ` • +91 ${cleanPhone}` : ''}
                    </Text>
                  </View>

                  <View style={[
                    styles.statusBadge,
                    isExpired
                      ? { backgroundColor: '#fef2f2', borderColor: '#fca5a5' }
                      : isPaidFull
                        ? { backgroundColor: '#dcfce7', borderColor: '#86efac' }
                        : { backgroundColor: '#fffbeb', borderColor: '#fde68a' }
                  ]}>
                    <Text style={[
                      styles.statusBadgeText,
                      isExpired
                        ? { color: '#dc2626', fontWeight: '900' }
                        : isPaidFull
                          ? { color: '#15803d' }
                          : { color: '#b45309' }
                    ]}>
                      {isExpired ? '● INACTIVE (EXPIRED)' : isPaidFull ? '● ACTIVE (PAID)' : '● ACTIVE (DUE PENDING)'}
                    </Text>
                  </View>
                </View>

                {/* Details Grid */}
                <View style={styles.detailsGrid}>
                  <View style={styles.detailBox}>
                    <Text style={styles.detailLabel}>BRANCH</Text>
                    <Text style={styles.detailVal}>{m.branch || 'KPHB'}</Text>
                  </View>
                  <View style={styles.detailBox}>
                    <Text style={styles.detailLabel}>DURATION</Text>
                    <Text style={styles.detailVal}>{m.duration || `${m.durationMonths || 3} Months`}</Text>
                  </View>
                  <View style={styles.detailBox}>
                    <Text style={styles.detailLabel}>JOIN DATE</Text>
                    <Text style={styles.detailVal}>{joinDateStr}</Text>
                  </View>
                  <View style={styles.detailBox}>
                    <Text style={styles.detailLabel}>EXPIRES</Text>
                    <Text style={[styles.detailVal, isExpired && { color: '#dc2626', fontWeight: '800' }]}>
                      {expiryDateStr}
                    </Text>
                  </View>
                </View>

                {/* Financial Row */}
                <View style={styles.finRow}>
                  <View>
                    <Text style={styles.finLabel}>TOTAL PACKAGE</Text>
                    <Text style={styles.finVal}>₹{tot.toLocaleString('en-IN')}</Text>
                  </View>
                  <View>
                    <Text style={styles.finLabel}>PAID SO FAR</Text>
                    <Text style={[styles.finVal, { color: '#16a34a' }]}>₹{paid.toLocaleString('en-IN')}</Text>
                  </View>
                  <View>
                    <Text style={styles.finLabel}>REMAINING DUE</Text>
                    <Text style={[styles.finVal, { color: rem > 0 ? '#dc2626' : '#16a34a' }]}>
                      ₹{rem.toLocaleString('en-IN')}
                    </Text>
                  </View>
                </View>

                {/* Footer / History Button */}
                <View style={styles.cardFooter}>
                  <TouchableOpacity
                    style={styles.historyBtn}
                    onPress={() => setSelectedMemberHistory({ ...m, cleanRegId, cleanPhone })}
                  >
                    <Feather name="list" size={14} color="#0284c7" />
                    <Text style={styles.historyBtnText}>
                      View Payment Log ({m.paymentHistory ? m.paymentHistory.length : 1})
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>

      {/* Payment History Modal */}
      {selectedMemberHistory && (
        <Modal
          visible={!!selectedMemberHistory}
          animationType="fade"
          transparent
          onRequestClose={() => setSelectedMemberHistory(null)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <View>
                  <Text style={styles.modalTitle}>Payment History</Text>
                  <Text style={styles.modalSub}>{selectedMemberHistory.patientName} • {selectedMemberHistory.cleanRegId}</Text>
                </View>
                <TouchableOpacity onPress={() => setSelectedMemberHistory(null)} style={styles.closeBtn}>
                  <Ionicons name="close" size={20} color="#64748b" />
                </TouchableOpacity>
              </View>

              <ScrollView style={{ maxHeight: 350, marginVertical: 10 }}>
                {(selectedMemberHistory.paymentHistory || [
                  {
                    date: selectedMemberHistory.paymentDate || selectedMemberHistory.startDate || selectedMemberHistory.createdAt,
                    amount: selectedMemberHistory.paidAmount || selectedMemberHistory.totalAmount,
                    paymentMode: 'Recorded',
                    note: 'Initial Package Advance'
                  }
                ]).map((hist: any, idx: number) => {
                  const hDate = hist.date ? new Date(hist.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A';
                  return (
                    <View key={idx} style={styles.histItem}>
                      <View>
                        <Text style={styles.histNote}>{hist.note || 'Payment Received'}</Text>
                        <Text style={styles.histDate}>{hDate} • {hist.paymentMode || 'Cash'}</Text>
                      </View>
                      <Text style={styles.histAmount}>+₹{Number(hist.amount || 0).toLocaleString('en-IN')}</Text>
                    </View>
                  );
                })}
              </ScrollView>

              <View style={styles.modalFooter}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 }}>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: '#64748b' }}>Total Paid:</Text>
                  <Text style={{ fontSize: 14, fontWeight: '900', color: '#15803d' }}>
                    ₹{Number(selectedMemberHistory.paidAmount || 0).toLocaleString('en-IN')} / ₹{Number(selectedMemberHistory.totalAmount || 0).toLocaleString('en-IN')}
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.closeModalBtn}
                  onPress={() => setSelectedMemberHistory(null)}
                >
                  <Text style={{ color: '#ffffff', fontWeight: '800', fontSize: 13 }}>Close</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: { fontSize: 18, fontWeight: '900', color: '#0f172a' },
  headerSubtitle: { fontSize: 11.5, color: '#64748b', marginTop: 2 },
  badgeCount: { backgroundColor: '#eff6ff', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, borderWidth: 1, borderColor: '#bfdbfe' },
  badgeCountText: { fontSize: 11, fontWeight: '800', color: '#0284c7' },
  scrollContent: { flex: 1, padding: 14 },
  kpiRow: { gap: 10, marginBottom: 14 },
  kpiCard: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
    minWidth: 125,
  },
  kpiLabel: { fontSize: 9.5, fontWeight: '800', letterSpacing: 0.5 },
  kpiValue: { fontSize: 17, fontWeight: '900', marginTop: 4 },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 12,
  },
  searchInput: { flex: 1, fontSize: 13, color: '#0f172a', padding: 0 },
  filterTabsRow: { flexDirection: 'row', gap: 6, marginBottom: 14 },
  filterTabBtn: {
    flex: 1,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    alignItems: 'center',
  },
  filterTabBtnActive: {
    backgroundColor: '#0284c7',
    borderColor: '#0284c7',
  },
  filterTabBtnExpired: {
    backgroundColor: '#dc2626',
    borderColor: '#dc2626',
  },
  filterTabText: { fontSize: 10.5, fontWeight: '700', color: '#475569' },
  filterTabTextActive: { color: '#ffffff', fontWeight: '800' },
  loadingContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 40 },
  loadingText: { fontSize: 13, color: '#64748b', marginTop: 10, fontWeight: '600' },
  emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 50 },
  emptyTitle: { fontSize: 15, fontWeight: '800', color: '#334155', marginTop: 12 },
  emptySub: { fontSize: 12, color: '#94a3b8', marginTop: 4, textAlign: 'center', paddingHorizontal: 20 },
  memberCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 14,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },
  memberCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  patientName: { fontSize: 15, fontWeight: '800', color: '#0f172a' },
  pkgBadge: { backgroundColor: '#fef3c7', borderWidth: 1, borderColor: '#fde68a', paddingHorizontal: 5, paddingVertical: 1, borderRadius: 4 },
  pkgBadgeText: { fontSize: 9.5, fontWeight: '900', color: '#b45309' },
  patientMeta: { fontSize: 11.5, color: '#64748b', marginTop: 3 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, borderWidth: 1.5 },
  statusBadgeText: { fontSize: 10, fontWeight: '800' },
  detailsGrid: {
    flexDirection: 'row',
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    padding: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  detailBox: { flex: 1, alignItems: 'center' },
  detailLabel: { fontSize: 8.5, fontWeight: '800', color: '#64748b', letterSpacing: 0.5 },
  detailVal: { fontSize: 11.5, fontWeight: '700', color: '#0f172a', marginTop: 2 },
  finRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    marginBottom: 8,
  },
  finLabel: { fontSize: 9, fontWeight: '800', color: '#64748b' },
  finVal: { fontSize: 13.5, fontWeight: '900', color: '#0f172a', marginTop: 2 },
  cardFooter: { flexDirection: 'row', justifyContent: 'flex-end', paddingTop: 6, borderTopWidth: 1, borderTopColor: '#f1f5f9' },
  historyBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#eff6ff', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 6 },
  historyBtnText: { fontSize: 11, fontWeight: '700', color: '#0284c7' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContent: { backgroundColor: '#ffffff', borderRadius: 16, padding: 18, width: '100%', maxWidth: 360 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#f1f5f9', paddingBottom: 10 },
  modalTitle: { fontSize: 16, fontWeight: '800', color: '#0f172a' },
  modalSub: { fontSize: 12, color: '#64748b', marginTop: 2 },
  closeBtn: { padding: 4 },
  histItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f8fafc',
  },
  histNote: { fontSize: 13, fontWeight: '700', color: '#0f172a' },
  histDate: { fontSize: 11, color: '#64748b', marginTop: 2 },
  histAmount: { fontSize: 13.5, fontWeight: '900', color: '#15803d' },
  modalFooter: { borderTopWidth: 1, borderTopColor: '#f1f5f9', paddingTop: 12 },
  closeModalBtn: { backgroundColor: '#0284c7', paddingVertical: 10, borderRadius: 8, alignItems: 'center' },
});
