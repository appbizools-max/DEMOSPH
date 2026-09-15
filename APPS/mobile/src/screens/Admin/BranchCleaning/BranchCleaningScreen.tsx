import React, { useState, useEffect, useMemo } from 'react';
import {
  StyleSheet, Text, View, ScrollView, TouchableOpacity,
  Image, TextInput, Alert, Modal, ActivityIndicator, Dimensions
} from 'react-native';
import { Ionicons, Feather } from '@expo/vector-icons';
import {
  getSafeDb, collection, doc, onSnapshot, updateDoc, setDoc
} from '../../../utils/firebaseSafe';
import {
  CleaningSchedule, CleaningSubmission, BRANCH_LIST,
  getTodayDateString, formatDisplayDate, checkBranchLockoutStatus
} from '../../../utils/cleaningService';

interface BranchCleaningScreenProps {
  onBack?: () => void;
  role?: string;
}

const { width } = Dimensions.get('window');

export const BranchCleaningScreen: React.FC<BranchCleaningScreenProps> = ({
  onBack,
  role = 'admin'
}) => {
  const db = getSafeDb();
  const today = getTodayDateString();
  const [activeTab, setActiveTab] = useState<'reports' | 'assign'>('reports');

  const [schedules, setSchedules] = useState<Record<string, string>>({
    KPHB: today,
    Chandanagar: today,
    Nallagandla: today,
    Dilshuknagar: today,
  });

  const [submissions, setSubmissions] = useState<CleaningSubmission[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [selectedBranchFilter, setSelectedBranchFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'Pending' | 'Approved' | 'Rejected'>('all');

  // Date picker modal
  const [pickingBranch, setPickingBranch] = useState<string | null>(null);
  const [customDateInput, setCustomDateInput] = useState('');

  // Reject modal
  const [rejectingItem, setRejectingItem] = useState<CleaningSubmission | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  // Lightbox modal
  const [previewImg, setPreviewImg] = useState<string | null>(null);

  // 1. Listen to schedules
  useEffect(() => {
    if (!db) return;
    const colRef = collection(db, 'branch_cleaning_schedules');
    const unsub = onSnapshot(colRef, (snap) => {
      const map: Record<string, string> = {
        KPHB: today,
        Chandanagar: today,
        Nallagandla: today,
        Dilshuknagar: today,
      };
      snap.docs.forEach(d => {
        const data = d.data();
        if (data && data.assignedDate) {
          map[d.id] = data.assignedDate;
        }
      });
      setSchedules(map);
    }, (err) => console.warn('Mobile schedules listener error:', err));
    return () => unsub();
  }, [today]);

  // 2. Listen to submissions
  useEffect(() => {
    if (!db) return;
    setLoading(true);
    const colRef = collection(db, 'branch_cleaning_submissions');
    const unsub = onSnapshot(colRef, (snap) => {
      const list: CleaningSubmission[] = snap.docs.map(d => ({
        id: d.id,
        ...(d.data() as any)
      }));
      list.sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());
      setSubmissions(list);
      setLoading(false);
    }, (err) => {
      console.warn('Mobile submissions listener error:', err);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  // Update schedule date
  const handleSelectDate = async (newDate: string) => {
    if (!pickingBranch || !db || !newDate) return;
    try {
      await setDoc(doc(db, 'branch_cleaning_schedules', pickingBranch), {
        branch: pickingBranch,
        assignedDate: newDate,
        updatedAt: new Date().toISOString(),
        updatedBy: role === 'hr' ? 'HR Manager' : 'Admin'
      }, { merge: true });

      setSchedules(prev => ({ ...prev, [pickingBranch]: newDate }));
      Alert.alert('Schedule Updated', `${pickingBranch} cleaning assigned to ${formatDisplayDate(newDate)}.`);
    } catch (e) {
      console.warn('Error updating schedule:', e);
      Alert.alert('Error', 'Failed to update schedule.');
    } finally {
      setPickingBranch(null);
      setCustomDateInput('');
    }
  };

  // Generate next 7 upcoming days for the date picker modal
  const upcomingDateOptions = useMemo(() => {
    const list: Array<{ label: string; subLabel: string; value: string }> = [];
    const now = new Date();
    for (let i = 0; i < 7; i++) {
      const d = new Date(now.getTime() + i * 24 * 60 * 60 * 1000);
      const val = getTodayDateString(d);
      const dayName = i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : d.toLocaleDateString(undefined, { weekday: 'long' });
      list.push({
        label: `${dayName} (${formatDisplayDate(val)})`,
        subLabel: d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }),
        value: val
      });
    }
    return list;
  }, []);

  // Accept verification
  const handleAccept = async (sub: CleaningSubmission) => {
    if (!sub.id || !db) return;
    setActionLoading(true);
    try {
      await updateDoc(doc(db, 'branch_cleaning_submissions', sub.id), {
        status: 'Approved',
        reviewedAt: new Date().toISOString(),
        reviewedBy: role === 'hr' ? 'HR Manager' : 'Administrator',
        rejectReason: ''
      });
      Alert.alert('Approved ✅', `${sub.branch} clinic cleaning approved! Reception is unblocked.`);
    } catch (e) {
      Alert.alert('Error', 'Failed to accept submission.');
    } finally {
      setActionLoading(false);
    }
  };

  // Confirm Reject
  const handleConfirmReject = async () => {
    if (!rejectingItem || !rejectingItem.id || !db) return;
    if (!rejectReason.trim()) {
      Alert.alert('Feedback Required', 'Please provide a rejection note explaining what needs cleaning.');
      return;
    }
    setActionLoading(true);
    try {
      await updateDoc(doc(db, 'branch_cleaning_submissions', rejectingItem.id), {
        status: 'Rejected',
        rejectReason: rejectReason.trim(),
        reviewedAt: new Date().toISOString(),
        reviewedBy: role === 'hr' ? 'HR Manager' : 'Administrator'
      });
      Alert.alert('Rejected ❌', `${rejectingItem.branch} submission rejected. Reception is notified to re-upload.`);
      setRejectingItem(null);
      setRejectReason('');
    } catch (e) {
      Alert.alert('Error', 'Failed to reject submission.');
    } finally {
      setActionLoading(false);
    }
  };

  // Calculate live branch lockout states
  const branchStatuses = useMemo(() => {
    return BRANCH_LIST.map(b => {
      const date = schedules[b] || today;
      const branchSubs = submissions.filter(s => s.branch === b);
      const lockInfo = checkBranchLockoutStatus(date, branchSubs, new Date());
      return {
        branch: b,
        ...lockInfo
      };
    });
  }, [schedules, submissions, today]);

  const filteredSubmissions = useMemo(() => {
    return submissions.filter(s => {
      if (selectedBranchFilter !== 'all' && s.branch !== selectedBranchFilter) return false;
      if (statusFilter !== 'all' && s.status !== statusFilter) return false;
      return true;
    });
  }, [submissions, selectedBranchFilter, statusFilter]);

  const pendingCount = submissions.filter(s => s.status === 'Pending').length;
  const overdueCount = branchStatuses.filter(b => b.isBlocked).length;

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 60 }} showsVerticalScrollIndicator={false}>
      {/* Top Header */}
      <View style={styles.header}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            {onBack && (
              <TouchableOpacity onPress={onBack} style={styles.backBtn}>
                <Ionicons name="arrow-back" size={20} color="#0284c7" />
              </TouchableOpacity>
            )}
            <View>
              <Text style={styles.title}>Branch Clinic Cleaning</Text>
              <Text style={styles.subtitle}>Assigned dates audit & HR verification</Text>
            </View>
          </View>
        </View>

        {/* Quick summary cards */}
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
          <View style={[styles.statBox, { backgroundColor: '#fefce8', borderColor: '#fef08a' }]}>
            <Text style={{ fontSize: 11, color: '#854d0e', fontWeight: '700' }}>Pending Review</Text>
            <Text style={{ fontSize: 16, fontWeight: '900', color: '#a16207' }}>{pendingCount}</Text>
          </View>

          <View style={[styles.statBox, overdueCount > 0 ? { backgroundColor: '#fef2f2', borderColor: '#fecaca' } : { backgroundColor: '#f0fdf4', borderColor: '#bbf7d0' }]}>
            <Text style={{ fontSize: 11, color: overdueCount > 0 ? '#991b1b' : '#166534', fontWeight: '700' }}>
              {overdueCount > 0 ? 'Locked Overdue' : 'All Branches Active'}
            </Text>
            <Text style={{ fontSize: 16, fontWeight: '900', color: overdueCount > 0 ? '#dc2626' : '#16a34a' }}>
              {overdueCount > 0 ? overdueCount : 'Clean'}
            </Text>
          </View>
        </View>
      </View>

      {/* TABS SWITCHER (Reports & Verification vs Assign Schedule) */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'reports' ? styles.tabBtnActive : undefined]}
          onPress={() => setActiveTab('reports')}
        >
          <Ionicons
            name="checkbox-outline"
            size={16}
            color={activeTab === 'reports' ? '#ffffff' : '#64748b'}
          />
          <Text style={[styles.tabBtnText, activeTab === 'reports' ? styles.tabBtnTextActive : undefined]}>
            Verification Reports {pendingCount > 0 ? `(${pendingCount})` : ''}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'assign' ? styles.tabBtnActive : undefined]}
          onPress={() => setActiveTab('assign')}
        >
          <Ionicons
            name="calendar-outline"
            size={16}
            color={activeTab === 'assign' ? '#ffffff' : '#64748b'}
          />
          <Text style={[styles.tabBtnText, activeTab === 'assign' ? styles.tabBtnTextActive : undefined]}>
            Assign Date
          </Text>
        </TouchableOpacity>
      </View>

      {/* OPTION 1: ASSIGN CLEANING DATE */}
      {activeTab === 'assign' && (
        <View style={{ gap: 12 }}>
          <Text style={{ fontSize: 12.5, color: '#64748b', marginBottom: 4 }}>
            Select each branch to customize their assigned cleaning date. Overdue branches are locked automatically until 5–7 photos are uploaded and accepted.
          </Text>

          {branchStatuses.map((item) => (
            <View
              key={item.branch}
              style={[
                styles.branchCard,
                item.isBlocked ? { borderColor: '#fca5a5', backgroundColor: '#fff5f5' } : { borderColor: '#e2e8f0', backgroundColor: '#ffffff' }
              ]}
            >
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Ionicons name="business" size={18} color="#0284c7" />
                  <Text style={styles.branchName}>{item.branch} Branch</Text>
                </View>

                {item.isBlocked ? (
                  <View style={[styles.badge, { backgroundColor: '#fee2e2', borderColor: '#fca5a5' }]}>
                    <Text style={{ fontSize: 11, fontWeight: '800', color: '#dc2626' }}>Locked Overdue</Text>
                  </View>
                ) : item.status === 'Approved' ? (
                  <View style={[styles.badge, { backgroundColor: '#dcfce7', borderColor: '#86efac' }]}>
                    <Text style={{ fontSize: 11, fontWeight: '800', color: '#15803d' }}>Approved ✅</Text>
                  </View>
                ) : item.status === 'Pending' ? (
                  <View style={[styles.badge, { backgroundColor: '#fef9c3', borderColor: '#fde047' }]}>
                    <Text style={{ fontSize: 11, fontWeight: '800', color: '#854d0e' }}>Pending Review</Text>
                  </View>
                ) : item.status === 'Due Today' ? (
                  <View style={[styles.badge, { backgroundColor: '#fef3c7', borderColor: '#fcd34d' }]}>
                    <Text style={{ fontSize: 11, fontWeight: '800', color: '#b45309' }}>Due Today 📅</Text>
                  </View>
                ) : (
                  <View style={[styles.badge, { backgroundColor: '#f1f5f9', borderColor: '#cbd5e1' }]}>
                    <Text style={{ fontSize: 11, fontWeight: '700', color: '#475569' }}>Scheduled</Text>
                  </View>
                )}
              </View>

              {/* Date selection button */}
              <TouchableOpacity
                style={styles.daySelectorBtn}
                onPress={() => {
                  setPickingBranch(item.branch);
                  setCustomDateInput(item.assignedDate);
                }}
              >
                <View>
                  <Text style={{ fontSize: 11, color: '#64748b', fontWeight: '700' }}>Assigned Cleaning Date:</Text>
                  <Text style={{ fontSize: 14, fontWeight: '800', color: '#0f172a' }}>
                    {formatDisplayDate(item.assignedDate)}
                  </Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <Text style={{ fontSize: 12, color: '#0284c7', fontWeight: '700' }}>Pick Date</Text>
                  <Ionicons name="calendar" size={15} color="#0284c7" />
                </View>
              </TouchableOpacity>

              <Text style={{ fontSize: 11.5, color: item.isBlocked ? '#b91c1c' : '#64748b', marginTop: 8 }}>
                {item.reason}
              </Text>
            </View>
          ))}
        </View>
      )}

      {/* OPTION 2: VERIFICATION REPORTS (ACCEPT / REJECT) */}
      {activeTab === 'reports' && (
        <View>
          {/* Branch filter pills */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, marginBottom: 12 }}>
            <TouchableOpacity
              style={[styles.filterPill, selectedBranchFilter === 'all' ? styles.filterPillActive : undefined]}
              onPress={() => setSelectedBranchFilter('all')}
            >
              <Text style={[styles.filterPillText, selectedBranchFilter === 'all' ? styles.filterPillTextActive : undefined]}>
                All Branches
              </Text>
            </TouchableOpacity>
            {BRANCH_LIST.map(b => (
              <TouchableOpacity
                key={b}
                style={[styles.filterPill, selectedBranchFilter === b ? styles.filterPillActive : undefined]}
                onPress={() => setSelectedBranchFilter(b)}
              >
                <Text style={[styles.filterPillText, selectedBranchFilter === b ? styles.filterPillTextActive : undefined]}>
                  {b}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Submissions List */}
          {loading ? (
            <ActivityIndicator size="small" color="#258ec8" style={{ marginVertical: 30 }} />
          ) : filteredSubmissions.length === 0 ? (
            <View style={styles.emptyCard}>
              <Ionicons name="sparkles" size={36} color="#cbd5e1" />
              <Text style={{ fontSize: 14, fontWeight: '700', color: '#64748b', marginTop: 8 }}>
                No cleaning submissions found
              </Text>
              <Text style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>
                Submissions from Reception will appear here for verification.
              </Text>
            </View>
          ) : (
            <View style={{ gap: 14 }}>
              {filteredSubmissions.map((sub) => (
                <View
                  key={sub.id}
                  style={[
                    styles.reportCard,
                    sub.status === 'Pending' ? { borderColor: '#fde047', borderWidth: 1.5 } : { borderColor: '#e2e8f0', borderWidth: 1 }
                  ]}
                >
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                    <View>
                      <Text style={{ fontSize: 16, fontWeight: '800', color: '#0f172a' }}>{sub.branch} Branch</Text>
                      <Text style={{ fontSize: 11.5, color: '#64748b' }}>
                        Scheduled Date: <strong>{formatDisplayDate(sub.assignedDate)}</strong>
                      </Text>
                      <Text style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>
                        By {sub.submittedBy} • {new Date(sub.submittedAt).toLocaleDateString()}
                      </Text>
                    </View>

                    <View style={[
                      styles.badge,
                      sub.status === 'Approved' ? { backgroundColor: '#dcfce7', borderColor: '#86efac' } :
                      sub.status === 'Rejected' ? { backgroundColor: '#fee2e2', borderColor: '#fca5a5' } :
                      { backgroundColor: '#fef9c3', borderColor: '#fde047' }
                    ]}>
                      <Text style={{
                        fontSize: 11.5, fontWeight: '800',
                        color: sub.status === 'Approved' ? '#15803d' : sub.status === 'Rejected' ? '#b91c1c' : '#854d0e'
                      }}>
                        {sub.status === 'Approved' ? 'Approved ✅' : sub.status === 'Rejected' ? 'Rejected ❌' : 'Pending ⏳'}
                      </Text>
                    </View>
                  </View>

                  {/* Notes */}
                  {sub.notes ? (
                    <Text style={{ fontSize: 12, color: '#475569', marginBottom: 8, fontStyle: 'italic' }}>
                      "{sub.notes}"
                    </Text>
                  ) : null}

                  {/* Rejection Feedback */}
                  {sub.status === 'Rejected' && sub.rejectReason ? (
                    <View style={{ backgroundColor: '#fee2e2', padding: 8, borderRadius: 8, marginBottom: 8 }}>
                      <Text style={{ fontSize: 11.5, color: '#991b1b', fontWeight: '700' }}>
                        Rejection Reason: "{sub.rejectReason}"
                      </Text>
                    </View>
                  ) : null}

                  {/* Photos Grid */}
                  <View style={{ marginBottom: 12 }}>
                    <Text style={{ fontSize: 11.5, fontWeight: '700', color: '#64748b', marginBottom: 6 }}>
                      Submitted Photos ({sub.photos?.length || 0} photos):
                    </Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                      {sub.photos?.map((pUri, pIdx) => (
                        <TouchableOpacity key={pIdx} onPress={() => setPreviewImg(pUri)}>
                          <Image source={{ uri: pUri }} style={styles.photoThumb} />
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>

                  {/* Action Buttons: Accept / Reject */}
                  <View style={{ flexDirection: 'row', gap: 10, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#f1f5f9' }}>
                    <TouchableOpacity
                      style={[styles.actionBtn, { backgroundColor: '#16a34a' }]}
                      onPress={() => handleAccept(sub)}
                      disabled={actionLoading}
                    >
                      <Ionicons name="checkmark-sharp" size={16} color="#ffffff" />
                      <Text style={styles.actionBtnText}>Accept ✅</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.actionBtn, { backgroundColor: '#dc2626' }]}
                      onPress={() => {
                        setRejectingItem(sub);
                        setRejectReason('');
                      }}
                      disabled={actionLoading}
                    >
                      <Ionicons name="close-sharp" size={16} color="#ffffff" />
                      <Text style={styles.actionBtnText}>Reject ❌</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>
      )}

      {/* DATE PICKER MODAL */}
      <Modal visible={!!pickingBranch} transparent animationType="slide" onRequestClose={() => setPickingBranch(null)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <Text style={{ fontSize: 16, fontWeight: '800', color: '#0f172a' }}>
                Assign Cleaning Date for {pickingBranch}
              </Text>
              <TouchableOpacity onPress={() => setPickingBranch(null)}>
                <Ionicons name="close" size={22} color="#64748b" />
              </TouchableOpacity>
            </View>

            <Text style={{ fontSize: 12.5, color: '#64748b', marginBottom: 12 }}>
              Choose or enter the exact calendar date {pickingBranch} must complete and submit clinic photos:
            </Text>

            {/* Quick date choices */}
            <View style={{ gap: 6, marginBottom: 14 }}>
              {upcomingDateOptions.map(opt => (
                <TouchableOpacity
                  key={opt.value}
                  style={[
                    styles.dayChoiceBtn,
                    pickingBranch && schedules[pickingBranch] === opt.value ? { backgroundColor: '#e0f2fe', borderColor: '#0284c7' } : undefined
                  ]}
                  onPress={() => handleSelectDate(opt.value)}
                >
                  <Text style={{ fontSize: 13.5, fontWeight: '700', color: '#0f172a' }}>
                    {opt.label}
                  </Text>
                  {pickingBranch && schedules[pickingBranch] === opt.value && (
                    <Ionicons name="checkmark-circle" size={18} color="#0284c7" />
                  )}
                </TouchableOpacity>
              ))}
            </View>

            {/* Custom date input */}
            <View style={{ borderTopWidth: 1, borderTopColor: '#e2e8f0', paddingTop: 10 }}>
              <Text style={{ fontSize: 12, fontWeight: '700', color: '#475569', marginBottom: 6 }}>
                Or Enter Custom Date (YYYY-MM-DD):
              </Text>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <TextInput
                  value={customDateInput}
                  onChangeText={setCustomDateInput}
                  placeholder="YYYY-MM-DD (e.g. 2026-09-18)"
                  placeholderTextColor="#94a3b8"
                  style={[styles.textInput, { flex: 1, minHeight: 40 }]}
                />
                <TouchableOpacity
                  style={[styles.smallBtn, { backgroundColor: '#0284c7', justifyContent: 'center' }]}
                  onPress={() => {
                    if (customDateInput.trim().length === 10) {
                      handleSelectDate(customDateInput.trim());
                    } else {
                      Alert.alert('Invalid Format', 'Please enter date in YYYY-MM-DD format.');
                    }
                  }}
                >
                  <Text style={{ color: '#ffffff', fontWeight: '800', fontSize: 13 }}>Set Date</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>

      {/* REJECT FEEDBACK MODAL */}
      <Modal visible={!!rejectingItem} transparent animationType="fade" onRequestClose={() => setRejectingItem(null)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <Text style={{ fontSize: 16, fontWeight: '800', color: '#991b1b', marginBottom: 6 }}>
              Reject Cleaning Submission ({rejectingItem?.branch})
            </Text>
            <Text style={{ fontSize: 12.5, color: '#64748b', marginBottom: 12 }}>
              Specify reason or feedback for the branch. Reception will remain blocked until new photos are uploaded and approved.
            </Text>

            <TextInput
              value={rejectReason}
              onChangeText={setRejectReason}
              placeholder="e.g. Doctor room floor has dirt spots; Please re-mop and retake photos."
              placeholderTextColor="#94a3b8"
              style={[styles.textInput, { minHeight: 70 }]}
              multiline
            />

            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 14 }}>
              <TouchableOpacity
                style={[styles.smallBtn, { backgroundColor: '#f1f5f9' }]}
                onPress={() => setRejectingItem(null)}
              >
                <Text style={{ fontSize: 13, fontWeight: '700', color: '#475569' }}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.smallBtn, { backgroundColor: '#dc2626' }]}
                onPress={handleConfirmReject}
                disabled={actionLoading}
              >
                <Text style={{ fontSize: 13, fontWeight: '800', color: '#ffffff' }}>Confirm Rejection</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* PHOTO PREVIEW MODAL */}
      <Modal visible={!!previewImg} transparent animationType="fade" onRequestClose={() => setPreviewImg(null)}>
        <View style={styles.modalBg}>
          <TouchableOpacity style={styles.modalClose} onPress={() => setPreviewImg(null)}>
            <Ionicons name="close" size={26} color="#ffffff" />
          </TouchableOpacity>
          {previewImg && (
            <Image source={{ uri: previewImg }} style={styles.modalImg} resizeMode="contain" />
          )}
        </View>
      </Modal>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc', paddingHorizontal: 16 },
  header: { marginTop: 14, marginBottom: 14 },
  backBtn: {
    width: 34,
    height: 34,
    borderRadius: 8,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { fontSize: 20, fontWeight: '800', color: '#0f172a' },
  subtitle: { fontSize: 12, color: '#64748b', marginTop: 2 },
  statBox: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    padding: 10,
    alignItems: 'center',
  },
  tabBar: {
    flexDirection: 'row',
    gap: 8,
    backgroundColor: '#ffffff',
    padding: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 14,
  },
  tabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 9,
    borderRadius: 8,
  },
  tabBtnActive: { backgroundColor: '#0284c7' },
  tabBtnText: { fontSize: 12, fontWeight: '700', color: '#64748b' },
  tabBtnTextActive: { color: '#ffffff', fontWeight: '800' },
  branchCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    shadowColor: '#000',
    shadowOpacity: 0.02,
    shadowRadius: 4,
    elevation: 1,
  },
  branchName: { fontSize: 16, fontWeight: '800', color: '#0f172a' },
  badge: {
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  daySelectorBtn: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 10,
    padding: 10,
    marginTop: 4,
  },
  filterPill: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#cbd5e1',
  },
  filterPillActive: { backgroundColor: '#0284c7', borderColor: '#0284c7' },
  filterPillText: { fontSize: 12, fontWeight: '700', color: '#475569' },
  filterPillTextActive: { color: '#ffffff' },
  reportCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 14,
    shadowColor: '#000',
    shadowOpacity: 0.02,
    shadowRadius: 6,
    elevation: 1,
  },
  photoThumb: {
    width: 70,
    height: 70,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#cbd5e1',
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
  },
  actionBtnText: { fontSize: 13, fontWeight: '800', color: '#ffffff' },
  emptyCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 30,
    alignItems: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '85%',
  },
  dayChoiceBtn: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#f8fafc',
  },
  textInput: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 10,
    padding: 10,
    fontSize: 13,
    color: '#0f172a',
  },
  smallBtn: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
  },
  modalBg: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalClose: {
    position: 'absolute',
    top: 40,
    right: 20,
    zIndex: 99,
    padding: 8,
  },
  modalImg: {
    width: width * 0.92,
    height: '75%',
  },
});
