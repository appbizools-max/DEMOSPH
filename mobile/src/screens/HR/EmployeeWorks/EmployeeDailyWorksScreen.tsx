import React, { useState, useEffect, useMemo } from 'react';
import {
  StyleSheet, Text, View, ScrollView, TouchableOpacity,
  ActivityIndicator, TextInput
} from 'react-native';
import { Ionicons, Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { getSafeDb, collection, query, onSnapshot, orderBy } from '../../../utils/firebaseSafe';
import { StaffDailyReport } from '@app/shared';

interface EmployeeDailyWorksScreenProps {
  onBack?: () => void;
  currentBranch?: string;
}

export const EmployeeDailyWorksScreen: React.FC<EmployeeDailyWorksScreenProps> = ({
  onBack,
  currentBranch = 'All'
}) => {
  const [viewMode, setViewMode] = useState<'day' | 'month'>('day');
  const [selectedBranch, setSelectedBranch] = useState<string>(currentBranch || 'All');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Day-wise date state (YYYY-MM-DD)
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  });

  // Month-wise date state (YYYY-MM)
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });

  const [staffList, setStaffList] = useState<any[]>([]);
  const [dailyReports, setDailyReports] = useState<StaffDailyReport[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // 1. Fetch Staff Directory
  useEffect(() => {
    const db = getSafeDb();
    if (!db) return;

    const unsub = onSnapshot(collection(db, 'staff'), (snap) => {
      const list: any[] = [];
      snap.forEach(d => {
        list.push({ id: d.id, ...d.data() });
      });
      if (list.length === 0) {
        setStaffList([
          { id: '1', name: 'Anil Kumar M', branch: 'KPHB', role: 'Regular Staff', phone: '9030176176' },
          { id: '2', name: 'Ashwini Begari', branch: 'Chandanagar', role: 'Regular Staff', phone: '9553176176' },
          { id: '3', name: 'Vaishnavi Peri', branch: 'Nallagandla', role: 'Regular Staff', phone: '9132176176' },
          { id: '4', name: 'Nandini Gottelli', branch: 'Dilshuknagar', role: 'Regular Staff', phone: '9804176176' },
          { id: '5', name: 'Srikanth', branch: 'KPHB', role: 'Regular Staff', phone: '9030176176' },
          { id: '6', name: 'Arun Kumar', branch: 'Nallagandla', role: 'Regular Staff', phone: '9132176176' },
          { id: '7', name: 'Aishwarya . M', branch: 'KPHB', role: 'Regular Staff', phone: '7995532759', shift: '10:00 AM - 08:30 PM', hours: '10.5 hrs/day', salary: '₹14,000' },
        ]);
      } else {
        setStaffList(list);
      }
    }, (err) => console.warn('Staff listener error in EmployeeWorks:', err));

    return () => unsub();
  }, []);

  // 2. Fetch Live Daily Reports from Firestore
  useEffect(() => {
    const db = getSafeDb();
    if (!db) return;

    const unsub = onSnapshot(query(collection(db, 'staff_reports'), orderBy('submittedAt', 'desc')), (snap) => {
      const list: StaffDailyReport[] = [];
      snap.forEach(d => {
        list.push({ id: d.id, ...(d.data() as any) });
      });
      setDailyReports(list);
      setIsLoading(false);
    }, (err) => {
      console.warn('Daily reports listener error:', err);
      setIsLoading(false);
    });

    return () => unsub();
  }, []);

  // Date Shift Helpers (Day)
  const handleShiftDate = (days: number) => {
    const [y, m, d] = selectedDate.split('-').map(Number);
    const dateObj = new Date(y, m - 1, d);
    dateObj.setDate(dateObj.getDate() + days);
    const nextY = dateObj.getFullYear();
    const nextM = String(dateObj.getMonth() + 1).padStart(2, '0');
    const nextD = String(dateObj.getDate()).padStart(2, '0');
    setSelectedDate(`${nextY}-${nextM}-${nextD}`);
  };

  const handleSetToday = () => {
    const d = new Date();
    setSelectedDate(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`);
  };

  // Month Shift Helpers (Month)
  const handleShiftMonth = (months: number) => {
    const [y, m] = selectedMonth.split('-').map(Number);
    const dateObj = new Date(y, m - 1 + months, 1);
    const nextY = dateObj.getFullYear();
    const nextM = String(dateObj.getMonth() + 1).padStart(2, '0');
    setSelectedMonth(`${nextY}-${nextM}`);
  };

  const handleSetCurrentMonth = () => {
    const d = new Date();
    setSelectedMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  };

  // Yesterday's date
  const yesterdayDate = useMemo(() => {
    const [y, m, d] = selectedDate.split('-').map(Number);
    const dateObj = new Date(y, m - 1, d);
    dateObj.setDate(dateObj.getDate() - 1);
    const nextY = dateObj.getFullYear();
    const nextM = String(dateObj.getMonth() + 1).padStart(2, '0');
    const nextD = String(dateObj.getDate()).padStart(2, '0');
    return `${nextY}-${nextM}-${nextD}`;
  }, [selectedDate]);

  // Filtered staff list by branch & search
  const filteredStaff = useMemo(() => {
    return staffList.filter(s => {
      if (selectedBranch !== 'All') {
        const sBranch = (s.branch || '').toLowerCase();
        const sel = selectedBranch.toLowerCase();
        if (!sBranch.includes(sel) && !sel.includes(sBranch)) return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesName = (s.name || '').toLowerCase().includes(q);
        const matchesBranch = (s.branch || '').toLowerCase().includes(q);
        if (!matchesName && !matchesBranch) return false;
      }
      return true;
    });
  }, [staffList, selectedBranch, searchQuery]);

  // Day-wise staff data
  const dayRows = useMemo(() => {
    return filteredStaff.map(staff => {
      const todayReport = dailyReports.find(r =>
        (String(r.staffId) === String(staff.id) || r.staffName === staff.name) && r.date === selectedDate
      );
      const yestReport = dailyReports.find(r =>
        (String(r.staffId) === String(staff.id) || r.staffName === staff.name) && r.date === yesterdayDate
      );

      return {
        staff,
        isSubmitted: !!todayReport,
        todayReport,
        calls: todayReport?.totalCalls ?? todayReport?.callsCount ?? 0,
        followUps: todayReport?.followUps ?? 0,
        contacts: todayReport?.contacts ?? 0,
        gReviews: todayReport?.gReviews ?? todayReport?.reviewsCount ?? 0,
        videoReviews: todayReport?.videoReviews ?? 0,
        submittedAt: todayReport?.submittedAt,
        yesterdayReport: yestReport ? {
          isSubmitted: true,
          calls: yestReport.totalCalls ?? yestReport.callsCount ?? 0,
          gReviews: yestReport.gReviews ?? yestReport.reviewsCount ?? 0,
        } : {
          isSubmitted: false
        }
      };
    });
  }, [filteredStaff, dailyReports, selectedDate, yesterdayDate]);

  // Month-wise staff data
  const monthRows = useMemo(() => {
    return filteredStaff.map(staff => {
      const staffReports = dailyReports.filter(r => {
        const repDate = r.date || '';
        const matchesStaff = String(r.staffId) === String(staff.id) || r.staffName === staff.name;
        return matchesStaff && repDate.startsWith(selectedMonth);
      });

      const daysLogged = staffReports.length;
      const calls = staffReports.reduce((s, r) => s + (r.totalCalls ?? r.callsCount ?? 0), 0);
      const followUps = staffReports.reduce((s, r) => s + (r.followUps ?? 0), 0);
      const contacts = staffReports.reduce((s, r) => s + (r.contacts ?? 0), 0);
      const gReviews = staffReports.reduce((s, r) => s + (r.gReviews ?? r.reviewsCount ?? 0), 0);
      const videoReviews = staffReports.reduce((s, r) => s + (r.videoReviews ?? 0), 0);

      return {
        staff,
        daysLogged,
        calls,
        followUps,
        contacts,
        gReviews,
        videoReviews,
        avgCalls: daysLogged > 0 ? (calls / daysLogged).toFixed(1) : '0'
      };
    });
  }, [filteredStaff, dailyReports, selectedMonth]);

  // Totals for top cards
  const totals = useMemo(() => {
    if (viewMode === 'day') {
      return dayRows.reduce((acc, r) => {
        if (r.isSubmitted) {
          acc.calls += r.calls;
          acc.followUps += r.followUps;
          acc.contacts += r.contacts;
          acc.gReviews += r.gReviews;
          acc.videoReviews += r.videoReviews;
          acc.submittedCount += 1;
        }
        return acc;
      }, { calls: 0, followUps: 0, contacts: 0, gReviews: 0, videoReviews: 0, submittedCount: 0 });
    } else {
      return monthRows.reduce((acc, r) => {
        acc.calls += r.calls;
        acc.followUps += r.followUps;
        acc.contacts += r.contacts;
        acc.gReviews += r.gReviews;
        acc.videoReviews += r.videoReviews;
        if (r.daysLogged > 0) acc.submittedCount += 1;
        return acc;
      }, { calls: 0, followUps: 0, contacts: 0, gReviews: 0, videoReviews: 0, submittedCount: 0 });
    }
  }, [viewMode, dayRows, monthRows]);

  const branches = ['All', 'KPHB', 'Chandanagar', 'Nallagandla', 'Dilshuknagar'];

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 60 }} showsVerticalScrollIndicator={false}>

      {/* Header Bar */}
      <View style={styles.headerBar}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1, marginRight: 8 }}>
          {onBack && (
            <TouchableOpacity onPress={onBack} style={styles.backButton}>
              <Ionicons name="arrow-back" size={18} color="#0f172a" />
            </TouchableOpacity>
          )}
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <View style={styles.liveTag}>
                <Text style={styles.liveTagText}>LIVE</Text>
              </View>
              <Text style={styles.titleText} numberOfLines={1}>Daily Works</Text>
            </View>
            <Text style={styles.subtitleText} numberOfLines={1}>Staff performance reports</Text>
          </View>
        </View>

        {/* View Mode Switcher (Day-wise vs Month-wise) */}
        <View style={styles.modeToggleContainer}>
          <TouchableOpacity
            onPress={() => setViewMode('day')}
            style={[styles.modeToggleBtn, viewMode === 'day' && styles.modeToggleBtnActive]}
          >
            <Text style={[styles.modeToggleText, viewMode === 'day' && styles.modeToggleTextActive]}>Day</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setViewMode('month')}
            style={[styles.modeToggleBtn, viewMode === 'month' && styles.modeToggleBtnActive]}
          >
            <Text style={[styles.modeToggleText, viewMode === 'month' && styles.modeToggleTextActive]}>Month</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Date / Month Shifter Bar */}
      {viewMode === 'day' ? (
        <View style={styles.dateBarCard}>
          <TouchableOpacity onPress={() => handleShiftDate(-1)} style={styles.dateShiftBtn}>
            <Ionicons name="chevron-back" size={15} color="#475569" />
            <Text style={styles.dateShiftText}>Prev</Text>
          </TouchableOpacity>

          <View style={styles.dateDisplay}>
            <Ionicons name="calendar-outline" size={15} color="#0284c7" />
            <Text style={styles.dateDisplayText}>{selectedDate}</Text>
          </View>

          <TouchableOpacity onPress={() => handleShiftDate(1)} style={styles.dateShiftBtn}>
            <Text style={styles.dateShiftText}>Next</Text>
            <Ionicons name="chevron-forward" size={15} color="#475569" />
          </TouchableOpacity>

          <TouchableOpacity onPress={handleSetToday} style={styles.todayPillBtn}>
            <Text style={styles.todayPillText}>Today</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.dateBarCard}>
          <TouchableOpacity onPress={() => handleShiftMonth(-1)} style={styles.dateShiftBtn}>
            <Ionicons name="chevron-back" size={15} color="#475569" />
            <Text style={styles.dateShiftText}>Prev</Text>
          </TouchableOpacity>

          <View style={styles.dateDisplay}>
            <Ionicons name="calendar-outline" size={15} color="#0284c7" />
            <Text style={styles.dateDisplayText}>{selectedMonth}</Text>
          </View>

          <TouchableOpacity onPress={() => handleShiftMonth(1)} style={styles.dateShiftBtn}>
            <Text style={styles.dateShiftText}>Next</Text>
            <Ionicons name="chevron-forward" size={15} color="#475569" />
          </TouchableOpacity>

          <TouchableOpacity onPress={handleSetCurrentMonth} style={styles.todayPillBtn}>
            <Text style={styles.todayPillText}>Current</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Branch Selector Chips */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.branchRow}>
        {branches.map(b => (
          <TouchableOpacity
            key={b}
            onPress={() => setSelectedBranch(b)}
            style={[styles.branchChip, selectedBranch === b && styles.branchChipActive]}
          >
            <Text style={[styles.branchChipText, selectedBranch === b && styles.branchChipTextActive]}>
              {b} {b !== 'All' ? 'Branch' : ''}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Search Input */}
      <View style={styles.searchBox}>
        <Feather name="search" size={15} color="#94a3b8" />
        <TextInput
          style={styles.searchInput}
          placeholder="Search employee name or branch..."
          placeholderTextColor="#94a3b8"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={15} color="#94a3b8" />
          </TouchableOpacity>
        )}
      </View>

      {/* 6 Compact KPI Tiles */}
      <View style={styles.metricsGrid}>
        <View style={styles.metricCard}>
          <View style={[styles.iconCircle, { backgroundColor: '#e0f2fe' }]}>
            <Ionicons name="call" size={13} color="#0284c7" />
          </View>
          <Text style={styles.metricValue}>{totals.calls}</Text>
          <Text style={styles.metricLabel}>Total Calls</Text>
        </View>

        <View style={styles.metricCard}>
          <View style={[styles.iconCircle, { backgroundColor: '#f0fdf4' }]}>
            <Ionicons name="repeat" size={13} color="#16a34a" />
          </View>
          <Text style={[styles.metricValue, { color: '#16a34a' }]}>{totals.followUps}</Text>
          <Text style={styles.metricLabel}>Follow Ups</Text>
        </View>

        <View style={styles.metricCard}>
          <View style={[styles.iconCircle, { backgroundColor: '#eef2ff' }]}>
            <Ionicons name="people" size={13} color="#4f46e5" />
          </View>
          <Text style={[styles.metricValue, { color: '#4f46e5' }]}>{totals.contacts}</Text>
          <Text style={styles.metricLabel}>Contacts</Text>
        </View>

        <View style={styles.metricCard}>
          <View style={[styles.iconCircle, { backgroundColor: '#fefce8' }]}>
            <Ionicons name="star" size={13} color="#ca8a04" />
          </View>
          <Text style={[styles.metricValue, { color: '#ca8a04' }]}>{totals.gReviews}</Text>
          <Text style={styles.metricLabel}>G-Reviews</Text>
        </View>

        <View style={styles.metricCard}>
          <View style={[styles.iconCircle, { backgroundColor: '#fdf2f8' }]}>
            <Ionicons name="videocam" size={13} color="#db2777" />
          </View>
          <Text style={[styles.metricValue, { color: '#db2777' }]}>{totals.videoReviews}</Text>
          <Text style={styles.metricLabel}>Video Revs</Text>
        </View>

        <View style={styles.metricCard}>
          <View style={[styles.iconCircle, { backgroundColor: '#f0fdfa' }]}>
            <Feather name="file-text" size={13} color="#0f766e" />
          </View>
          <Text style={[styles.metricValue, { color: '#0f766e' }]}>
            {totals.submittedCount}/{filteredStaff.length}
          </Text>
          <Text style={styles.metricLabel}>{viewMode === 'day' ? 'Submitted' : 'Active'}</Text>
        </View>
      </View>

      {/* Section Title */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>
          {viewMode === 'day' ? `Staff Reports (${selectedDate})` : `Monthly Consolidation (${selectedMonth})`}
        </Text>
      </View>

      {/* Tabular Cards Presentation */}
      {isLoading ? (
        <View style={{ padding: 30, alignItems: 'center' }}>
          <ActivityIndicator size="small" color="#0284c7" />
          <Text style={{ marginTop: 8, fontSize: 12, color: '#64748b' }}>Loading records...</Text>
        </View>
      ) : viewMode === 'day' ? (
        dayRows.length === 0 ? (
          <View style={styles.emptyCard}>
            <Feather name="file-text" size={36} color="#cbd5e1" />
            <Text style={styles.emptyTitle}>No staff found</Text>
            <Text style={styles.emptySubtitle}>No staff records found for {selectedBranch} branch.</Text>
          </View>
        ) : (
          dayRows.map((r, idx) => (
            <View key={r.staff.id || idx} style={styles.tableCard}>
              {/* Header: Staff Name + Branch + Status Badge */}
              <View style={styles.tableCardHeader}>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <Text style={styles.staffNameText} numberOfLines={1}>{r.staff.name}</Text>
                  <Text style={styles.staffBranchText} numberOfLines={1}>{r.staff.branch} Branch • ID: #{r.staff.id || '-'}</Text>
                </View>

                {r.isSubmitted ? (
                  <View style={styles.submittedTag}>
                    <Ionicons name="checkmark-circle" size={12} color="#16a34a" />
                    <Text style={styles.submittedTagText}>SUBMITTED</Text>
                  </View>
                ) : (
                  <View style={styles.pendingTag}>
                    <Ionicons name="time-outline" size={12} color="#b45309" />
                    <Text style={styles.pendingTagText}>PENDING</Text>
                  </View>
                )}
              </View>

              {/* Yesterday's Report Strip */}
              <View style={styles.yesterdayStrip}>
                <Text style={styles.yesterdayLabel}>Yesterday ({yesterdayDate}):</Text>
                {r.yesterdayReport.isSubmitted ? (
                  <Text style={styles.yesterdayVal}>
                    ✓ {r.yesterdayReport.calls} Calls • {r.yesterdayReport.gReviews} G-Rev
                  </Text>
                ) : (
                  <Text style={[styles.yesterdayVal, { color: '#e11d48' }]}>
                    ✕ Not Submitted
                  </Text>
                )}
              </View>

              {/* 5 Metrics Data Row */}
              <View style={styles.metricsRow}>
                <View style={styles.metricCell}>
                  <Text style={styles.metricCellVal}>{r.calls}</Text>
                  <Text style={styles.metricCellKey}>Calls</Text>
                </View>
                <View style={styles.metricCell}>
                  <Text style={[styles.metricCellVal, { color: '#16a34a' }]}>{r.followUps}</Text>
                  <Text style={styles.metricCellKey}>F-Ups</Text>
                </View>
                <View style={styles.metricCell}>
                  <Text style={[styles.metricCellVal, { color: '#4f46e5' }]}>{r.contacts}</Text>
                  <Text style={styles.metricCellKey}>Contacts</Text>
                </View>
                <View style={styles.metricCell}>
                  <Text style={[styles.metricCellVal, { color: '#ca8a04' }]}>{r.gReviews}</Text>
                  <Text style={styles.metricCellKey}>G-Rev</Text>
                </View>
                <View style={styles.metricCell}>
                  <Text style={[styles.metricCellVal, { color: '#db2777' }]}>{r.videoReviews}</Text>
                  <Text style={styles.metricCellKey}>Video</Text>
                </View>
              </View>
            </View>
          ))
        )
      ) : (
        /* Month-wise Cards */
        monthRows.length === 0 ? (
          <View style={styles.emptyCard}>
            <Feather name="file-text" size={36} color="#cbd5e1" />
            <Text style={styles.emptyTitle}>No records</Text>
          </View>
        ) : (
          monthRows.map((r, idx) => (
            <View key={r.staff.id || idx} style={styles.tableCard}>
              <View style={styles.tableCardHeader}>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <Text style={styles.staffNameText}>{r.staff.name}</Text>
                  <Text style={styles.staffBranchText}>{r.staff.branch} Branch</Text>
                </View>
                <View style={styles.daysLoggedTag}>
                  <Text style={styles.daysLoggedTagText}>{r.daysLogged} Days Logged</Text>
                </View>
              </View>

              <View style={styles.metricsRow}>
                <View style={styles.metricCell}>
                  <Text style={styles.metricCellVal}>{r.calls}</Text>
                  <Text style={styles.metricCellKey}>Calls</Text>
                </View>
                <View style={styles.metricCell}>
                  <Text style={[styles.metricCellVal, { color: '#16a34a' }]}>{r.followUps}</Text>
                  <Text style={styles.metricCellKey}>F-Ups</Text>
                </View>
                <View style={styles.metricCell}>
                  <Text style={[styles.metricCellVal, { color: '#4f46e5' }]}>{r.contacts}</Text>
                  <Text style={styles.metricCellKey}>Contacts</Text>
                </View>
                <View style={styles.metricCell}>
                  <Text style={[styles.metricCellVal, { color: '#ca8a04' }]}>{r.gReviews}</Text>
                  <Text style={styles.metricCellKey}>G-Rev</Text>
                </View>
                <View style={styles.metricCell}>
                  <Text style={[styles.metricCellVal, { color: '#0d9488' }]}>{r.avgCalls}/d</Text>
                  <Text style={styles.metricCellKey}>Avg/Day</Text>
                </View>
              </View>
            </View>
          ))
        )
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
    padding: 12,
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  backButton: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  liveTag: {
    backgroundColor: '#eff6ff',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  liveTagText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#0284c7',
  },
  titleText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0f172a',
  },
  subtitleText: {
    fontSize: 10.5,
    color: '#64748b',
  },
  modeToggleContainer: {
    flexDirection: 'row',
    backgroundColor: '#e2e8f0',
    borderRadius: 8,
    padding: 2,
  },
  modeToggleBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  modeToggleBtnActive: {
    backgroundColor: '#0284c7',
  },
  modeToggleText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
  },
  modeToggleTextActive: {
    color: '#ffffff',
    fontWeight: '800',
  },
  dateBarCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#ffffff',
    borderRadius: 10,
    padding: 5,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 8,
  },
  dateShiftBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
    backgroundColor: '#f1f5f9',
  },
  dateShiftText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
  },
  dateDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#e0f2fe',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 6,
  },
  dateDisplayText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0369a1',
  },
  todayPillBtn: {
    backgroundColor: '#0284c7',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
  },
  todayPillText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '800',
  },
  branchRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 8,
  },
  branchChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#cbd5e1',
  },
  branchChipActive: {
    backgroundColor: '#0284c7',
    borderColor: '#0284c7',
  },
  branchChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
  },
  branchChipTextActive: {
    color: '#ffffff',
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    paddingHorizontal: 8,
    height: 34,
    gap: 6,
    marginBottom: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 11.5,
    color: '#0f172a',
    padding: 0,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  metricCard: {
    width: '31.8%',
    backgroundColor: '#ffffff',
    borderRadius: 10,
    paddingVertical: 7,
    paddingHorizontal: 2,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    alignItems: 'center',
    marginBottom: 6,
  },
  iconCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  metricValue: {
    fontSize: 13.5,
    fontWeight: '900',
    color: '#0f172a',
  },
  metricLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: '#64748b',
    textAlign: 'center',
  },
  sectionHeader: {
    marginBottom: 6,
  },
  sectionTitle: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#1e293b',
  },
  tableCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 8,
  },
  tableCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  staffNameText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0f172a',
  },
  staffBranchText: {
    fontSize: 10.5,
    color: '#64748b',
    marginTop: 1,
  },
  submittedTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#f0fdf4',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#bbf7d0',
    flexShrink: 0,
  },
  submittedTagText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#15803d',
  },
  pendingTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#fffbeb',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#fde68a',
    flexShrink: 0,
  },
  pendingTagText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#b45309',
  },
  daysLoggedTag: {
    backgroundColor: '#eff6ff',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#bfdbfe',
    flexShrink: 0,
  },
  daysLoggedTagText: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#0284c7',
  },
  yesterdayStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 4,
    backgroundColor: '#f8fafc',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  yesterdayLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748b',
  },
  yesterdayVal: {
    fontSize: 10,
    fontWeight: '700',
    color: '#166534',
  },
  metricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 2,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  metricCell: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 1,
  },
  metricCellVal: {
    fontSize: 12.5,
    fontWeight: '900',
    color: '#0284c7',
    textAlign: 'center',
  },
  metricCellKey: {
    fontSize: 8.5,
    fontWeight: '700',
    color: '#64748b',
    marginTop: 1,
    textAlign: 'center',
  },
  emptyCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  emptyTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#334155',
    marginTop: 6,
  },
  emptySubtitle: {
    fontSize: 11,
    color: '#94a3b8',
    textAlign: 'center',
    marginTop: 3,
  },
});
