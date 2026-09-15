import React, { useState, useEffect, useMemo } from 'react';
import {
  StyleSheet, Text, View, ScrollView, TouchableOpacity, Image,
  Alert, ActivityIndicator, Modal, TextInput, Linking
} from 'react-native';
import { Ionicons, Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { getSafeDb, collection, query, onSnapshot, updateDoc, doc, orderBy, getDocs } from '../../../utils/firebaseSafe';
import { StaffAttendanceRecord, StaffLeaveRequest, StaffDailyReport } from '@app/shared';

interface AttendanceRosterScreenProps {
  onBack?: () => void;
}

const normalizeDate = (d?: string) => {
  if (!d) return '';
  if (d.includes('T')) return d.split('T')[0];
  if (d.includes('/')) {
    const parts = d.split('/');
    if (parts.length === 3) {
      if (parts[0].length === 4) return `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
      return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
    }
  }
  if (d.includes('-')) {
    const parts = d.split('-');
    if (parts.length === 3 && parts[0].length === 2 && parts[2].length === 4) {
      return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
    }
  }
  return d.trim();
};

// Helper: Parse time string into minutes from midnight
const parseTimeToMinutes = (timeStr?: string): number | null => {
  if (!timeStr) return null;
  const clean = timeStr.trim();
  const match = clean.match(/(\d{1,2}):(\d{2})(?:\s*([APap][Mm]))?/);
  if (!match) return null;
  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const meridiem = match[3]?.toUpperCase();

  if (meridiem === 'PM' && hours < 12) hours += 12;
  if (meridiem === 'AM' && hours === 12) hours = 0;
  return hours * 60 + minutes;
};

// Helper: Extract shift start time (defaults to 10:00 AM)
const parseShiftStartTime = (shiftStr?: string): { timeStr: string; minutes: number } => {
  if (!shiftStr || shiftStr === '-') {
    return { timeStr: '10:00 AM', minutes: 10 * 60 };
  }
  const parts = shiftStr.split('-');
  const startPart = parts[0].trim();
  const mins = parseTimeToMinutes(startPart);
  if (mins !== null) {
    return { timeStr: startPart, minutes: mins };
  }
  return { timeStr: '10:00 AM', minutes: 10 * 60 };
};

// Helper: Check if punch in is late by > 15 minutes
export interface LateStatus {
  isLate: boolean;
  lateMinutes: number;
  shiftStartStr: string;
}

const checkLateArrival = (shiftStr?: string, punchInTime?: string): LateStatus => {
  if (!punchInTime) return { isLate: false, lateMinutes: 0, shiftStartStr: '10:00 AM' };
  const shift = parseShiftStartTime(shiftStr);
  const punchInMins = parseTimeToMinutes(punchInTime);
  if (punchInMins === null) return { isLate: false, lateMinutes: 0, shiftStartStr: shift.timeStr };

  const diff = punchInMins - shift.minutes;
  if (diff > 15) {
    return { isLate: true, lateMinutes: diff, shiftStartStr: shift.timeStr };
  }
  return { isLate: false, lateMinutes: Math.max(0, diff), shiftStartStr: shift.timeStr };
};

export const AttendanceRosterScreen: React.FC<AttendanceRosterScreenProps> = ({ onBack }) => {
  const [activeTab, setActiveTab] = useState<'attendance' | 'monthly' | 'leaves' | 'reports'>('attendance');
  const [selectedBranch, setSelectedBranch] = useState<string>('All');
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  });

  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });

  // Person-to-Person Ledger Modal
  const [selectedPersonStaff, setSelectedPersonStaff] = useState<any | null>(null);

  // State data from Firestore
  const [staffList, setStaffList] = useState<any[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<StaffAttendanceRecord[]>([]);
  const [leaveRequests, setLeaveRequests] = useState<StaffLeaveRequest[]>([]);
  const [dailyReports, setDailyReports] = useState<StaffDailyReport[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Photo Preview Modal
  const [previewPhoto, setPreviewPhoto] = useState<{
    url: string;
    name: string;
    type?: string;
    time: string;
    location?: string;
    latitude?: number;
    longitude?: number;
  } | null>(null);

  // Reject Leave Modal
  const [rejectModalItem, setRejectModalItem] = useState<StaffLeaveRequest | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [isProcessingAction, setIsProcessingAction] = useState(false);

  // 1. Fetch Staff Directory
  useEffect(() => {
    const db = getSafeDb();
    if (!db) return;

    const unsub = onSnapshot(collection(db, 'staff'), (snap) => {
      const list: any[] = [];
      snap.forEach(d => {
        list.push({ id: d.id, ...d.data() });
      });
      setStaffList(list);
    }, (err) => console.warn('Staff listener error:', err));

    return () => unsub();
  }, []);

  // 2. Fetch Live Attendance Records
  useEffect(() => {
    const db = getSafeDb();
    if (!db) return;

    setIsLoading(true);
    const unsub = onSnapshot(query(collection(db, 'attendance'), orderBy('date', 'desc')), (snap) => {
      const list: StaffAttendanceRecord[] = [];
      snap.forEach(d => {
        list.push({ id: d.id, ...(d.data() as any) });
      });
      setAttendanceRecords(list);
      setIsLoading(false);
    }, (err) => {
      console.warn('Attendance listener error:', err);
      setIsLoading(false);
    });

    return () => unsub();
  }, []);

  // 3. Fetch Staff Leaves
  useEffect(() => {
    const db = getSafeDb();
    if (!db) return;

    const unsub = onSnapshot(query(collection(db, 'leaves'), orderBy('createdAt', 'desc')), (snap) => {
      const list: StaffLeaveRequest[] = [];
      snap.forEach(d => {
        list.push({ id: d.id, ...(d.data() as any) });
      });
      setLeaveRequests(list);
    }, (err) => console.warn('Leaves listener error:', err));

    return () => unsub();
  }, []);

  // 4. Fetch Staff Daily Reports
  useEffect(() => {
    const db = getSafeDb();
    if (!db) return;

    const unsub = onSnapshot(query(collection(db, 'staff_reports'), orderBy('submittedAt', 'desc')), (snap) => {
      const list: StaffDailyReport[] = [];
      snap.forEach(d => {
        list.push({ id: d.id, ...(d.data() as any) });
      });
      setDailyReports(list);
    }, (err) => console.warn('Reports listener error:', err));

    return () => unsub();
  }, []);

  // Days in selectedMonth
  const daysInMonthList = useMemo(() => {
    const [year, month] = selectedMonth.split('-').map(Number);
    if (!year || !month) return [];
    const numDays = new Date(year, month, 0).getDate();
    const days: { dateStr: string; dayNum: number; dayName: string; isSunday: boolean }[] = [];
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    for (let d = 1; d <= numDays; d++) {
      const dt = new Date(year, month - 1, d);
      const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      days.push({
        dateStr,
        dayNum: d,
        dayName: dayNames[dt.getDay()],
        isSunday: dt.getDay() === 0
      });
    }
    return days;
  }, [selectedMonth]);

  // Filtered Attendance for Selected Date & Branch
  const filteredAttendance = useMemo(() => {
    return staffList.map(stf => {
      const record = attendanceRecords.find(a =>
        (a.staffId === stf.id || a.staffName === stf.name) && a.date === selectedDate
      );
      const normDate = normalizeDate(selectedDate);
      const onLeaveToday = leaveRequests.find(l =>
        (l.staffId === stf.id || l.staffName === stf.name) &&
        l.status === 'Approved' &&
        normDate >= normalizeDate(l.fromDate) &&
        normDate <= normalizeDate(l.toDate)
      );

      const lateInfo = checkLateArrival(stf.shift, record?.punchInTime);

      return {
        staff: stf,
        record,
        onLeaveToday: !!onLeaveToday,
        leaveDetails: onLeaveToday,
        lateInfo
      };
    }).filter(item => {
      if (selectedBranch === 'All') return true;
      const b = (item.staff.branch || '').toLowerCase();
      return b.includes(selectedBranch.toLowerCase());
    });
  }, [staffList, attendanceRecords, leaveRequests, selectedDate, selectedBranch]);

  // Staff-Wise Monthly Analysis
  const staffMonthlyAnalysis = useMemo(() => {
    const todayNorm = normalizeDate(new Date().toISOString());

    return staffList.map(stf => {
      const staffRecords = attendanceRecords.filter(r =>
        (r.staffId === stf.id || (r.staffName && r.staffName.toLowerCase() === stf.name.toLowerCase())) &&
        normalizeDate(r.date).startsWith(selectedMonth)
      );

      const approvedLeaves = leaveRequests.filter(l =>
        (l.staffId === stf.id || (l.staffName && l.staffName.toLowerCase() === stf.name.toLowerCase())) &&
        l.status === 'Approved'
      );

      let presentCount = 0;
      let lateMarksCount = 0;
      let leaveDaysCount = 0;
      let absentCount = 0;
      let totalMinutesWorked = 0;

      daysInMonthList.forEach(day => {
        const normDay = day.dateStr;
        const record = staffRecords.find(r => normalizeDate(r.date) === normDay);

        const onLeave = approvedLeaves.find(l =>
          normDay >= normalizeDate(l.fromDate) &&
          normDay <= normalizeDate(l.toDate)
        );

        if (onLeave) {
          leaveDaysCount++;
        }

        if (record && record.punchInTime) {
          presentCount++;
          const lateInfo = checkLateArrival(stf.shift, record.punchInTime);
          if (lateInfo.isLate) {
            lateMarksCount++;
          }
          if (record.punchInTime && record.punchOutTime) {
            const inMins = parseTimeToMinutes(record.punchInTime);
            const outMins = parseTimeToMinutes(record.punchOutTime);
            if (inMins !== null && outMins !== null && outMins > inMins) {
              totalMinutesWorked += (outMins - inMins);
            }
          } else if (record.workingHours) {
            const num = parseFloat(record.workingHours);
            if (!isNaN(num)) totalMinutesWorked += Math.round(num * 60);
          }
        } else if (!onLeave && !day.isSunday && normDay <= todayNorm) {
          absentCount++;
        }
      });

      const totalHours = (totalMinutesWorked / 60).toFixed(1);
      const punctualityScore = presentCount > 0
        ? Math.max(0, Math.round(((presentCount - lateMarksCount) / presentCount) * 100))
        : 100;

      return {
        staff: stf,
        presentCount,
        lateMarksCount,
        leaveDaysCount,
        absentCount,
        totalHours,
        punctualityScore,
        approvedLeavesCount: approvedLeaves.length
      };
    }).filter(item => {
      if (selectedBranch === 'All') return true;
      const b = (item.staff.branch || '').toLowerCase();
      return b.includes(selectedBranch.toLowerCase());
    });
  }, [staffList, attendanceRecords, leaveRequests, selectedMonth, daysInMonthList, selectedBranch]);

  // Person-to-Person Ledger for Modal
  const personDailyLedger = useMemo(() => {
    if (!selectedPersonStaff) return [];
    const staffId = selectedPersonStaff.id;
    const staffName = selectedPersonStaff.name;
    const todayNorm = normalizeDate(new Date().toISOString());

    const staffRecords = attendanceRecords.filter(r =>
      (r.staffId === staffId || (r.staffName && r.staffName.toLowerCase() === staffName.toLowerCase())) &&
      normalizeDate(r.date).startsWith(selectedMonth)
    );

    const approvedLeaves = leaveRequests.filter(l =>
      (l.staffId === staffId || (l.staffName && l.staffName.toLowerCase() === staffName.toLowerCase())) &&
      l.status === 'Approved'
    );

    return daysInMonthList.map(day => {
      const normDay = day.dateStr;
      const record = staffRecords.find(r => normalizeDate(r.date) === normDay);

      const leave = approvedLeaves.find(l =>
        normDay >= normalizeDate(l.fromDate) &&
        normDay <= normalizeDate(l.toDate)
      );

      const lateInfo = checkLateArrival(selectedPersonStaff.shift, record?.punchInTime);

      let dayStatus: 'Present' | 'Late' | 'Completed' | 'On Leave' | 'Absent' | 'Weekend Off' | 'Upcoming' = 'Absent';

      if (day.isSunday) {
        dayStatus = 'Weekend Off';
      } else if (leave) {
        dayStatus = 'On Leave';
      } else if (record?.punchOutTime) {
        dayStatus = lateInfo.isLate ? 'Late' : 'Completed';
      } else if (record?.punchInTime) {
        dayStatus = lateInfo.isLate ? 'Late' : 'Present';
      } else if (normDay > todayNorm) {
        dayStatus = 'Upcoming';
      } else {
        dayStatus = 'Absent';
      }

      return {
        ...day,
        record,
        leave,
        lateInfo,
        dayStatus
      };
    });
  }, [selectedPersonStaff, attendanceRecords, leaveRequests, selectedMonth, daysInMonthList]);

  // Filtered Leaves
  const filteredLeaves = useMemo(() => {
    return leaveRequests.filter(l => {
      if (selectedBranch === 'All') return true;
      return (l.branch || '').toLowerCase().includes(selectedBranch.toLowerCase());
    });
  }, [leaveRequests, selectedBranch]);

  // Filtered Reports
  const filteredReports = useMemo(() => {
    return dailyReports.filter(r => {
      if (selectedBranch === 'All') return true;
      return (r.branch || '').toLowerCase().includes(selectedBranch.toLowerCase());
    });
  }, [dailyReports, selectedBranch]);

  // Report Totals
  const reportTotals = useMemo(() => {
    return filteredReports.reduce((acc, r) => {
      acc.totalCalls += (r.totalCalls ?? r.callsCount ?? 0);
      acc.followUps += (r.followUps ?? 0);
      acc.contacts += (r.contacts ?? 0);
      acc.gReviews += (r.gReviews ?? r.reviewsCount ?? 0);
      acc.videoReviews += (r.videoReviews ?? 0);
      return acc;
    }, { totalCalls: 0, followUps: 0, contacts: 0, gReviews: 0, videoReviews: 0 });
  }, [filteredReports]);

  // Action: Approve Leave
  const handleApproveLeave = async (leave: StaffLeaveRequest) => {
    if (!leave.id) return;
    setIsProcessingAction(true);
    try {
      const db = getSafeDb();
      if (db) {
        await updateDoc(doc(db, 'leaves', leave.id), {
          status: 'Approved',
          reviewedBy: 'Admin / HR',
          reviewedAt: new Date().toISOString()
        });
        Alert.alert('Leave Approved ✅', `${leave.staffName}'s leave application has been approved.`);
      }
    } catch (e) {
      console.error('Approve leave error:', e);
      Alert.alert('Error', 'Failed to approve leave request.');
    } finally {
      setIsProcessingAction(false);
    }
  };

  // Action: Reject Leave
  const handleConfirmRejectLeave = async () => {
    if (!rejectModalItem || !rejectModalItem.id) return;
    setIsProcessingAction(true);
    try {
      const db = getSafeDb();
      if (db) {
        await updateDoc(doc(db, 'leaves', rejectModalItem.id), {
          status: 'Rejected',
          reviewNotes: rejectReason.trim() || 'Disapproved due to clinic operational requirements',
          reviewedBy: 'Admin / HR',
          reviewedAt: new Date().toISOString()
        });
        Alert.alert('Leave Rejected ❌', `${rejectModalItem.staffName}'s leave application has been rejected.`);
        setRejectModalItem(null);
        setRejectReason('');
      }
    } catch (e) {
      console.error('Reject leave error:', e);
      Alert.alert('Error', 'Failed to reject leave request.');
    } finally {
      setIsProcessingAction(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Top Header */}
      <View style={styles.topHeader}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          {onBack && (
            <TouchableOpacity onPress={onBack} style={{ padding: 8, borderRadius: 10, backgroundColor: '#f1f5f9', borderWidth: 1, borderColor: '#e2e8f0' }}>
              <Ionicons name="arrow-back" size={20} color="#0f172a" />
            </TouchableOpacity>
          )}
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>Staff Attendance & Work Portal</Text>
            <Text style={styles.subtitle}>Punch logs, 15m late flags, monthly analysis & leaves.</Text>
          </View>
        </View>
      </View>

      {/* 4 Main Management Tabs */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'attendance' && styles.tabItemActive]}
          onPress={() => setActiveTab('attendance')}
        >
          <MaterialCommunityIcons name="clock-check" size={17} color={activeTab === 'attendance' ? '#258ec8' : '#64748b'} />
          <Text style={[styles.tabItemText, activeTab === 'attendance' && styles.tabItemTextActive]}>
            Live Logs
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'monthly' && styles.tabItemActive]}
          onPress={() => setActiveTab('monthly')}
        >
          <MaterialCommunityIcons name="chart-box-outline" size={17} color={activeTab === 'monthly' ? '#258ec8' : '#64748b'} />
          <Text style={[styles.tabItemText, activeTab === 'monthly' && styles.tabItemTextActive]}>
            Analysis
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'leaves' && styles.tabItemActive]}
          onPress={() => setActiveTab('leaves')}
        >
          <MaterialCommunityIcons name="calendar-alert" size={17} color={activeTab === 'leaves' ? '#258ec8' : '#64748b'} />
          <Text style={[styles.tabItemText, activeTab === 'leaves' && styles.tabItemTextActive]}>
            Leaves ({leaveRequests.filter(l => l.status === 'Pending').length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'reports' && styles.tabItemActive]}
          onPress={() => setActiveTab('reports')}
        >
          <Feather name="file-text" size={16} color={activeTab === 'reports' ? '#258ec8' : '#64748b'} />
          <Text style={[styles.tabItemText, activeTab === 'reports' && styles.tabItemTextActive]}>
            Reports
          </Text>
        </TouchableOpacity>
      </View>

      {/* Branch Filter Chips */}
      <View style={styles.branchFilterRow}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: 16 }}>
          {['All', 'KPHB', 'Chandanagar', 'Nallagandla', 'Dilshuknagar'].map(b => (
            <TouchableOpacity
              key={b}
              style={[styles.branchChip, selectedBranch === b && styles.branchChipActive]}
              onPress={() => setSelectedBranch(b)}
            >
              <Text style={[styles.branchChipText, selectedBranch === b && styles.branchChipTextActive]}>
                {b === 'All' ? 'All 4 Branches' : `${b} Branch`}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* ============================================================== */}
      {/* TAB 1: LIVE PUNCH ATTENDANCE LOG                               */}
      {/* ============================================================== */}
      {activeTab === 'attendance' && (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
          {/* Date Picker Row */}
          <View style={styles.datePickerContainer}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Ionicons name="calendar-outline" size={18} color="#258ec8" />
              <Text style={styles.dateLabel}>Date:</Text>
              <TextInput
                style={styles.dateInput}
                value={selectedDate}
                onChangeText={setSelectedDate}
                placeholder="YYYY-MM-DD"
                placeholderTextColor="#94a3b8"
              />
            </View>

            <View style={{ flexDirection: 'row', gap: 6 }}>
              <TouchableOpacity
                style={styles.dateQuickBtn}
                onPress={() => {
                  const d = new Date();
                  setSelectedDate(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`);
                }}
              >
                <Text style={styles.dateQuickBtnText}>Today</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Attendance Cards List */}
          {isLoading ? (
            <ActivityIndicator size="large" color="#258ec8" style={{ marginTop: 40 }} />
          ) : filteredAttendance.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>No staff members found for selected criteria.</Text>
            </View>
          ) : (
            filteredAttendance.map(({ staff, record, onLeaveToday, leaveDetails, lateInfo }) => {
              const isPresent = !!record?.punchInTime;
              const isCompleted = !!record?.punchOutTime;
              const isLate = lateInfo?.isLate;

              return (
                <View key={staff.id} style={[styles.staffAttCard, isLate && { borderColor: '#fca5a5', backgroundColor: '#fffbfb' }]}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <View style={{ flexDirection: 'row', gap: 10, flex: 1 }}>
                      {/* Photo Thumbnail */}
                      {record?.punchInPhoto ? (
                        <TouchableOpacity
                          onPress={() => setPreviewPhoto({
                            url: record.punchInPhoto || '',
                            name: staff.name,
                            time: record.punchInTime,
                            location: record.punchInLocation?.address
                          })}
                        >
                          <Image source={{ uri: record.punchInPhoto }} style={[styles.selfieThumbnail, isLate && { borderColor: '#ef4444' }]} />
                          <Text style={[styles.photoTagText, isLate && { backgroundColor: '#ef4444' }]}>
                            {isLate ? 'Late' : 'Selfie'}
                          </Text>
                        </TouchableOpacity>
                      ) : (
                        <View style={styles.avatarPlaceholder}>
                          <Ionicons name="person" size={24} color="#94a3b8" />
                        </View>
                      )}

                      <View style={{ flex: 1 }}>
                        <Text style={styles.staffName}>{staff.name}</Text>
                        <Text style={styles.staffRole}>{staff.role || 'Staff'} • {staff.branch || 'KPHB'} Branch</Text>
                        <Text style={styles.shiftTime}>⏰ Shift: {staff.shift || '10:00 AM - 08:30 PM'}</Text>
                      </View>
                    </View>

                    {/* Status Badge */}
                    <View style={[
                      styles.statusBadge,
                      onLeaveToday ? styles.bgYellow :
                      isCompleted ? (isLate ? styles.bgYellow : styles.bgBlue) :
                      isLate ? styles.bgRed :
                      isPresent ? styles.bgGreen : styles.bgRed
                    ]}>
                      <Text style={[
                        styles.statusBadgeText,
                        onLeaveToday ? styles.textYellow :
                        isCompleted ? (isLate ? styles.textYellow : styles.textBlue) :
                        isLate ? styles.textRed :
                        isPresent ? styles.textGreen : styles.textRed
                      ]}>
                        {onLeaveToday ? 'ON LEAVE' :
                         isCompleted ? (isLate ? 'DONE (LATE)' : 'SHIFT DONE') :
                         isLate ? 'LATE (>15m)' :
                         isPresent ? 'PRESENT' : 'ABSENT'}
                      </Text>
                    </View>
                  </View>

                  {/* Punch Timings Row */}
                  <View style={styles.timingsRow}>
                    <View style={styles.timeBox}>
                      <Text style={styles.timeLabel}>In Time:</Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                        <Text style={[styles.timeVal, { color: isLate ? '#dc2626' : isPresent ? '#16a34a' : '#94a3b8' }]}>
                          {record?.punchInTime || '--:--'}
                        </Text>
                        {isLate && (
                          <View style={styles.latePill}>
                            <Text style={styles.latePillText}>+{lateInfo.lateMinutes}m</Text>
                          </View>
                        )}
                      </View>
                    </View>

                    <View style={styles.timeBox}>
                      <Text style={styles.timeLabel}>Out Time:</Text>
                      <Text style={[styles.timeVal, { color: isCompleted ? '#dc2626' : '#94a3b8' }]}>
                        {record?.punchOutTime || '--:--'}
                      </Text>
                    </View>

                    <View style={styles.timeBox}>
                      <Text style={styles.timeLabel}>Hours:</Text>
                      <Text style={[styles.timeVal, { color: '#0f172a' }]}>
                        {record?.workingHours || '--'}
                      </Text>
                    </View>
                  </View>

                  {/* Punch In GPS Tag */}
                  {record?.punchInLocation && (
                    <TouchableOpacity
                      style={styles.gpsLocationRow}
                      onPress={() => {
                        if (record.punchInLocation?.latitude && record.punchInLocation?.longitude) {
                          Linking.openURL(`https://www.google.com/maps?q=${record.punchInLocation.latitude},${record.punchInLocation.longitude}`).catch(() => {});
                        }
                      }}
                    >
                      <Ionicons name="location" size={13} color="#0f766e" />
                      <Text style={styles.gpsText} numberOfLines={1}>
                        In GPS: {record.punchInLocation.address || `${record.punchInLocation.latitude}, ${record.punchInLocation.longitude}`}
                      </Text>
                    </TouchableOpacity>
                  )}

                  {/* Punch Out GPS Tag */}
                  {record?.punchOutLocation && (
                    <TouchableOpacity
                      style={[styles.gpsLocationRow, { backgroundColor: '#eff6ff', borderColor: '#bfdbfe', marginTop: 4 }]}
                      onPress={() => {
                        if (record.punchOutLocation?.latitude && record.punchOutLocation?.longitude) {
                          Linking.openURL(`https://www.google.com/maps?q=${record.punchOutLocation.latitude},${record.punchOutLocation.longitude}`).catch(() => {});
                        }
                      }}
                    >
                      <Ionicons name="location" size={13} color="#258ec8" />
                      <Text style={[styles.gpsText, { color: '#0369a1' }]} numberOfLines={1}>
                        Out GPS: {record.punchOutLocation.address || `${record.punchOutLocation.latitude}, ${record.punchOutLocation.longitude}`}
                      </Text>
                    </TouchableOpacity>
                  )}

                  {onLeaveToday && (
                    <View style={[styles.gpsLocationRow, { backgroundColor: '#fefce8', marginTop: 4 }]}>
                      <Ionicons name="alert-circle-outline" size={13} color="#ca8a04" />
                      <Text style={[styles.gpsText, { color: '#854d0e' }]}>
                        Approved Leave: {leaveDetails?.leaveType} ({leaveDetails?.reason})
                      </Text>
                    </View>
                  )}
                </View>
              );
            })
          )}
        </ScrollView>
      )}

      {/* ============================================================== */}
      {/* TAB 2: STAFF-WISE MONTHLY ANALYSIS & PERSON REPORT             */}
      {/* ============================================================== */}
      {activeTab === 'monthly' && (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
          {/* Month Selector Row */}
          <View style={styles.datePickerContainer}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Ionicons name="calendar" size={18} color="#258ec8" />
              <Text style={styles.dateLabel}>Month:</Text>
              <TextInput
                style={styles.dateInput}
                value={selectedMonth}
                onChangeText={setSelectedMonth}
                placeholder="YYYY-MM"
                placeholderTextColor="#94a3b8"
              />
            </View>
            <Text style={{ fontSize: 11, color: '#64748b', fontWeight: '600' }}>
              Showing {staffMonthlyAnalysis.length} Staff
            </Text>
          </View>

          {/* Monthly Summary Statistics Grid */}
          <View style={styles.statsSummaryGrid}>
            <View style={[styles.statsTile, { backgroundColor: '#f0fdf4', borderColor: '#bbf7d0' }]}>
              <Text style={[styles.statsTileVal, { color: '#15803d' }]}>
                {staffMonthlyAnalysis.reduce((a, s) => a + s.presentCount, 0)}
              </Text>
              <Text style={styles.statsTileLabel}>Total Present</Text>
            </View>

            <View style={[styles.statsTile, { backgroundColor: '#fefce8', borderColor: '#fef08a' }]}>
              <Text style={[styles.statsTileVal, { color: '#a16207' }]}>
                {staffMonthlyAnalysis.reduce((a, s) => a + s.leaveDaysCount, 0)}
              </Text>
              <Text style={styles.statsTileLabel}>Leave Days</Text>
            </View>

            <View style={[styles.statsTile, { backgroundColor: '#fef2f2', borderColor: '#fca5a5' }]}>
              <Text style={[styles.statsTileVal, { color: '#b91c1c' }]}>
                {staffMonthlyAnalysis.reduce((a, s) => a + s.lateMarksCount, 0)}
              </Text>
              <Text style={styles.statsTileLabel}>Late Marks (&gt;15m)</Text>
            </View>

            <View style={[styles.statsTile, { backgroundColor: '#eff6ff', borderColor: '#bfdbfe' }]}>
              <Text style={[styles.statsTileVal, { color: '#1d4ed8' }]}>
                {staffMonthlyAnalysis.reduce((a, s) => a + parseFloat(s.totalHours || '0'), 0).toFixed(0)} hrs
              </Text>
              <Text style={styles.statsTileLabel}>Hours Logged</Text>
            </View>
          </View>

          <Text style={styles.sectionHeading}>Staff Monthly Breakdown</Text>

          {staffMonthlyAnalysis.map(item => (
            <View key={item.staff.id} style={styles.staffAnalysisCard}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.staffName}>{item.staff.name}</Text>
                  <Text style={styles.staffRole}>{item.staff.branch || 'KPHB'} Branch • {item.staff.role || 'Staff'}</Text>
                  <Text style={styles.shiftTime}>⏰ Shift: {item.staff.shift || '10:00 AM - 08:30 PM'}</Text>
                </View>

                <View style={[styles.punctualityBadge, { backgroundColor: item.punctualityScore >= 90 ? '#f0fdf4' : item.punctualityScore >= 75 ? '#fefce8' : '#fef2f2' }]}>
                  <Text style={[styles.punctualityText, { color: item.punctualityScore >= 90 ? '#15803d' : item.punctualityScore >= 75 ? '#a16207' : '#dc2626' }]}>
                    {item.punctualityScore}% On-Time
                  </Text>
                </View>
              </View>

              {/* 4 KPIs Row */}
              <View style={styles.monthlyKpiRow}>
                <View style={styles.kpiPill}>
                  <Text style={styles.kpiPillLabel}>Present</Text>
                  <Text style={[styles.kpiPillVal, { color: '#15803d' }]}>{item.presentCount}d</Text>
                </View>

                <View style={styles.kpiPill}>
                  <Text style={styles.kpiPillLabel}>Absent</Text>
                  <Text style={[styles.kpiPillVal, { color: item.absentCount > 0 ? '#b91c1c' : '#64748b' }]}>{item.absentCount}d</Text>
                </View>

                <View style={styles.kpiPill}>
                  <Text style={styles.kpiPillLabel}>Leaves</Text>
                  <Text style={[styles.kpiPillVal, { color: '#a16207' }]}>{item.leaveDaysCount}d</Text>
                </View>

                <View style={[styles.kpiPill, item.lateMarksCount > 0 && { backgroundColor: '#fee2e2', borderColor: '#fca5a5' }]}>
                  <Text style={styles.kpiPillLabel}>Late (&gt;15m)</Text>
                  <Text style={[styles.kpiPillVal, { color: item.lateMarksCount > 0 ? '#dc2626' : '#64748b' }]}>
                    {item.lateMarksCount > 0 ? `⚠️ ${item.lateMarksCount}` : '0'}
                  </Text>
                </View>

                <View style={styles.kpiPill}>
                  <Text style={styles.kpiPillLabel}>Hours</Text>
                  <Text style={[styles.kpiPillVal, { color: '#0284c7' }]}>{item.totalHours}h</Text>
                </View>
              </View>

              {/* Action Button: View Person Ledger */}
              <TouchableOpacity
                style={styles.viewPersonBtn}
                onPress={() => setSelectedPersonStaff(item.staff)}
              >
                <Ionicons name="person-outline" size={14} color="#258ec8" />
                <Text style={styles.viewPersonBtnText}>View Date-Wise Person Ledger</Text>
                <Ionicons name="chevron-forward" size={14} color="#258ec8" />
              </TouchableOpacity>
            </View>
          ))}
        </ScrollView>
      )}

      {/* ============================================================== */}
      {/* TAB 3: LEAVE REQUESTS & APPROVALS (ACCEPT / REJECT)            */}
      {/* ============================================================== */}
      {activeTab === 'leaves' && (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
          <Text style={styles.sectionHeading}>
            Pending & Reviewed Leave Requests (Recent {Math.min(10, filteredLeaves.length)}{filteredLeaves.length > 10 ? ` of ${filteredLeaves.length}` : ''})
          </Text>

          {filteredLeaves.length === 0 ? (
            <View style={styles.emptyState}>
              <MaterialCommunityIcons name="calendar-check" size={42} color="#cbd5e1" />
              <Text style={styles.emptyText}>No leave requests found.</Text>
            </View>
          ) : (
            filteredLeaves.slice(0, 10).map(leave => (
              <View key={leave.id} style={styles.leaveCard}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.leaveStaffName}>{leave.staffName}</Text>
                    <Text style={styles.leaveMeta}>{leave.branch} Branch • {leave.leaveType} Leave</Text>
                    <Text style={styles.leaveDates}>📅 Leave: {leave.fromDate} to {leave.toDate} ({leave.daysCount} days)</Text>
                    {(leave as any).joiningDate ? (
                      <Text style={[styles.leaveDates, { color: '#0284c7', fontWeight: '700', marginTop: 2 }]}>
                        🏢 Joining Date: {(leave as any).joiningDate}
                      </Text>
                    ) : null}
                  </View>

                  <View style={[
                    styles.statusBadge,
                    leave.status === 'Approved' ? styles.bgGreen : leave.status === 'Rejected' ? styles.bgRed : styles.bgYellow
                  ]}>
                    <Text style={[
                      styles.statusBadgeText,
                      leave.status === 'Approved' ? styles.textGreen : leave.status === 'Rejected' ? styles.textRed : styles.textYellow
                    ]}>
                      {leave.status.toUpperCase()}
                    </Text>
                  </View>
                </View>

                {leave.reason ? (
                  <View style={styles.leaveReasonBox}>
                    <Text style={styles.leaveReasonText}>"{leave.reason}"</Text>
                  </View>
                ) : null}

                {/* Approve / Reject Actions */}
                {leave.status === 'Pending' && (
                  <View style={styles.leaveActionsRow}>
                    <TouchableOpacity
                      style={[styles.actionBtn, styles.approveBtn]}
                      onPress={() => handleApproveLeave(leave)}
                      disabled={isProcessingAction}
                    >
                      <Ionicons name="checkmark-circle" size={16} color="#ffffff" />
                      <Text style={styles.approveBtnText}>Approve</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.actionBtn, styles.rejectBtn]}
                      onPress={() => setRejectModalItem(leave)}
                      disabled={isProcessingAction}
                    >
                      <Ionicons name="close-circle" size={16} color="#dc2626" />
                      <Text style={styles.rejectBtnText}>Reject</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            ))
          )}
        </ScrollView>
      )}

      {/* ============================================================== */}
      {/* TAB 4: DAILY WORK REPORTS                                      */}
      {/* ============================================================== */}
      {activeTab === 'reports' && (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
          <View style={[styles.reportSummaryGrid, { marginBottom: 14 }]}>
            <View style={[styles.reportSummaryTile, { minWidth: '28%', flex: 1 }]}>
              <Text style={[styles.reportSummaryVal, { color: '#0284c7' }]}>{reportTotals.totalCalls}</Text>
              <Text style={styles.reportSummaryLabel}>Calls</Text>
            </View>
            <View style={[styles.reportSummaryTile, { minWidth: '28%', flex: 1 }]}>
              <Text style={[styles.reportSummaryVal, { color: '#16a34a' }]}>{reportTotals.followUps}</Text>
              <Text style={styles.reportSummaryLabel}>Follow Ups</Text>
            </View>
            <View style={[styles.reportSummaryTile, { minWidth: '28%', flex: 1 }]}>
              <Text style={[styles.reportSummaryVal, { color: '#4f46e5' }]}>{reportTotals.contacts}</Text>
              <Text style={styles.reportSummaryLabel}>Contacts</Text>
            </View>
            <View style={[styles.reportSummaryTile, { minWidth: '28%', flex: 1 }]}>
              <Text style={[styles.reportSummaryVal, { color: '#ca8a04' }]}>{reportTotals.gReviews}</Text>
              <Text style={styles.reportSummaryLabel}>G-Reviews</Text>
            </View>
            <View style={[styles.reportSummaryTile, { minWidth: '28%', flex: 1 }]}>
              <Text style={[styles.reportSummaryVal, { color: '#db2777' }]}>{reportTotals.videoReviews}</Text>
              <Text style={styles.reportSummaryLabel}>Video Reviews</Text>
            </View>
            <View style={[styles.reportSummaryTile, { minWidth: '28%', flex: 1 }]}>
              <Text style={[styles.reportSummaryVal, { color: '#0f766e' }]}>{filteredReports.length}</Text>
              <Text style={styles.reportSummaryLabel}>Reports Logged</Text>
            </View>
          </View>

          <Text style={styles.sectionHeading}>Daily Work Submissions</Text>

          {filteredReports.length === 0 ? (
            <View style={styles.emptyState}>
              <Feather name="file-text" size={42} color="#cbd5e1" />
              <Text style={styles.emptyText}>No daily work reports logged yet.</Text>
            </View>
          ) : (
            filteredReports.map(rep => (
              <View key={rep.id} style={styles.workReportCard}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <View>
                    <Text style={styles.reportStaffName}>{rep.staffName}</Text>
                    <Text style={styles.reportBranch}>{rep.branch} Branch • Date: {rep.date}</Text>
                  </View>
                  <Text style={styles.reportTimestamp}>
                    {new Date(rep.submittedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                </View>

                {/* 5-Metrics Badges Grid */}
                <View style={[styles.statsPillsRow, { flexWrap: 'wrap', gap: 6, marginVertical: 8 }]}>
                  <View style={styles.statPillBlue}>
                    <Ionicons name="call" size={13} color="#0284c7" />
                    <Text style={styles.statPillBlueText}>{rep.totalCalls ?? rep.callsCount ?? 0} Total Calls</Text>
                  </View>

                  <View style={[styles.statPillBlue, { backgroundColor: '#f0fdf4', borderColor: '#bbf7d0' }]}>
                    <Ionicons name="repeat" size={13} color="#16a34a" />
                    <Text style={[styles.statPillBlueText, { color: '#15803d' }]}>{rep.followUps ?? 0} Follow Ups</Text>
                  </View>

                  <View style={[styles.statPillBlue, { backgroundColor: '#eef2ff', borderColor: '#c7d2fe' }]}>
                    <Ionicons name="people" size={13} color="#4f46e5" />
                    <Text style={[styles.statPillBlueText, { color: '#4338ca' }]}>{rep.contacts ?? 0} Contacts</Text>
                  </View>

                  <View style={styles.statPillGold}>
                    <Ionicons name="star" size={13} color="#ca8a04" />
                    <Text style={styles.statPillGoldText}>{rep.gReviews ?? rep.reviewsCount ?? 0} G-Reviews</Text>
                  </View>

                  <View style={[styles.statPillGold, { backgroundColor: '#fdf2f8', borderColor: '#fbcfe8' }]}>
                    <Ionicons name="videocam" size={13} color="#db2777" />
                    <Text style={[styles.statPillGoldText, { color: '#9d174d' }]}>{rep.videoReviews ?? 0} Video Reviews</Text>
                  </View>
                </View>
              </View>
            ))
          )}
        </ScrollView>
      )}

      {/* ============================================================== */}
      {/* MODAL: PERSON-TO-PERSON DATE-WISE LEDGER                       */}
      {/* ============================================================== */}
      <Modal visible={!!selectedPersonStaff} transparent animationType="slide">
        <View style={styles.modalBackdrop}>
          <View style={styles.personModalCard}>
            <View style={styles.personModalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.personModalTitle}>{selectedPersonStaff?.name}</Text>
                <Text style={styles.personModalSub}>
                  {selectedPersonStaff?.branch} Branch • {selectedPersonStaff?.role || 'Staff'} • {selectedMonth}
                </Text>
                <Text style={{ fontSize: 11, color: '#0284c7', fontWeight: '700', marginTop: 1 }}>
                  Shift: {selectedPersonStaff?.shift || '10:00 AM - 08:30 PM'}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.closeCircleBtn}
                onPress={() => setSelectedPersonStaff(null)}
              >
                <Ionicons name="close" size={20} color="#475569" />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 420 }} showsVerticalScrollIndicator={false}>
              {personDailyLedger.map(item => (
                <View
                  key={item.dateStr}
                  style={[
                    styles.personDayRow,
                    item.isSunday && { backgroundColor: '#f8fafc' },
                    item.lateInfo.isLate && { backgroundColor: '#fff5f5', borderColor: '#fecaca' },
                    item.leave && { backgroundColor: '#fefce8', borderColor: '#fef08a' }
                  ]}
                >
                  <View style={{ width: 85 }}>
                    <Text style={styles.personDateText}>{item.dateStr}</Text>
                    <Text style={styles.personDayName}>{item.dayName}</Text>
                  </View>

                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Text style={[
                        styles.personPunchText,
                        item.lateInfo.isLate ? { color: '#dc2626' } : item.record?.punchInTime ? { color: '#16a34a' } : { color: '#94a3b8' }
                      ]}>
                        In: {item.record?.punchInTime || '--:--'}
                      </Text>
                      {item.lateInfo.isLate && (
                        <View style={styles.latePill}>
                          <Text style={styles.latePillText}>+{item.lateInfo.lateMinutes}m</Text>
                        </View>
                      )}
                    </View>

                    <Text style={styles.personOutText}>
                      Out: {item.record?.punchOutTime || '--:--'} {item.record?.workingHours ? `(${item.record.workingHours})` : ''}
                    </Text>
                  </View>

                  <View style={[
                    styles.statusBadge,
                    item.dayStatus === 'Completed' ? styles.bgBlue :
                    item.dayStatus === 'Late' ? styles.bgRed :
                    item.dayStatus === 'Present' ? styles.bgGreen :
                    item.dayStatus === 'On Leave' ? styles.bgYellow : styles.bgRed
                  ]}>
                    <Text style={[
                      styles.statusBadgeText,
                      item.dayStatus === 'Completed' ? styles.textBlue :
                      item.dayStatus === 'Late' ? styles.textRed :
                      item.dayStatus === 'Present' ? styles.textGreen :
                      item.dayStatus === 'On Leave' ? styles.textYellow : styles.textRed
                    ]}>
                      {item.dayStatus === 'Completed' ? 'DONE' :
                       item.dayStatus === 'Late' ? 'LATE' :
                       item.dayStatus === 'Present' ? 'PRESENT' :
                       item.dayStatus === 'On Leave' ? 'LEAVE' :
                       item.dayStatus === 'Weekend Off' ? 'OFF' : 'ABSENT'}
                    </Text>
                  </View>
                </View>
              ))}
            </ScrollView>

            <TouchableOpacity
              style={[styles.modalBtn, { backgroundColor: '#258ec8', marginTop: 12 }]}
              onPress={() => setSelectedPersonStaff(null)}
            >
              <Text style={{ color: '#ffffff', fontWeight: '800' }}>Close Person Ledger</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Selfie Photo Preview Modal */}
      <Modal visible={!!previewPhoto} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.photoModalCard}>
            <Text style={styles.photoModalTitle}>
              {previewPhoto?.type ? `${previewPhoto.type} Selfie Verification` : 'Selfie Verification'}
            </Text>
            {previewPhoto && (
              <>
                <Image source={{ uri: previewPhoto.url }} style={styles.fullPhoto} resizeMode="contain" />
                <Text style={styles.modalStaffName}>{previewPhoto.name}</Text>
                <Text style={styles.modalTimeText}>Punched Time: {previewPhoto.time}</Text>
                {previewPhoto.location && (
                  <Text style={styles.modalLocText}>📍 {previewPhoto.location}</Text>
                )}
                {previewPhoto.latitude && previewPhoto.longitude && (
                  <TouchableOpacity
                    style={{ marginTop: 8, paddingVertical: 6, paddingHorizontal: 12, backgroundColor: '#eff6ff', borderRadius: 8, borderWidth: 1, borderColor: '#bfdbfe', flexDirection: 'row', alignItems: 'center', gap: 4 }}
                    onPress={() => Linking.openURL(`https://www.google.com/maps?q=${previewPhoto.latitude},${previewPhoto.longitude}`).catch(() => {})}
                  >
                    <Ionicons name="map-outline" size={14} color="#258ec8" />
                    <Text style={{ fontSize: 12, fontWeight: '700', color: '#258ec8' }}>Open Location in Google Maps</Text>
                  </TouchableOpacity>
                )}
              </>
            )}
            <TouchableOpacity style={styles.closeModalBtn} onPress={() => setPreviewPhoto(null)}>
              <Text style={styles.closeModalBtnText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Reject Reason Modal */}
      <Modal visible={!!rejectModalItem} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.rejectModalCard}>
            <Text style={styles.rejectModalTitle}>Reject Leave Application</Text>
            <Text style={styles.rejectModalSub}>
              Reject leave for {rejectModalItem?.staffName} ({rejectModalItem?.fromDate} to {rejectModalItem?.toDate})?
            </Text>

            <TextInput
              style={styles.rejectInput}
              placeholder="Reason for rejection (e.g. Critical shift requirement)"
              placeholderTextColor="#94a3b8"
              value={rejectReason}
              onChangeText={setRejectReason}
              multiline
            />

            <View style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: '#f1f5f9' }]}
                onPress={() => { setRejectModalItem(null); setRejectReason(''); }}
              >
                <Text style={{ color: '#475569', fontWeight: '700' }}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: '#ef4444' }]}
                onPress={handleConfirmRejectLeave}
                disabled={isProcessingAction}
              >
                <Text style={{ color: '#ffffff', fontWeight: '800' }}>Confirm Reject</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  topHeader: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  title: { fontSize: 17, fontWeight: '800', color: '#0f172a' },
  subtitle: { fontSize: 11.5, color: '#64748b', marginTop: 2 },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    paddingHorizontal: 6,
  },
  tabItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    paddingVertical: 12,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabItemActive: {
    borderBottomColor: '#258ec8',
  },
  tabItemText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748b',
  },
  tabItemTextActive: {
    color: '#258ec8',
    fontWeight: '800',
  },
  branchFilterRow: {
    backgroundColor: '#ffffff',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  branchChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  branchChipActive: {
    backgroundColor: '#258ec8',
    borderColor: '#258ec8',
  },
  branchChipText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#475569',
  },
  branchChipTextActive: {
    color: '#ffffff',
    fontWeight: '800',
  },
  datePickerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#ffffff',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 12,
  },
  dateLabel: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#334155',
  },
  dateInput: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    fontSize: 12,
    fontWeight: '700',
    color: '#0f172a',
    width: 105,
  },
  dateQuickBtn: {
    backgroundColor: '#eff6ff',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  dateQuickBtnText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#258ec8',
  },
  statsSummaryGrid: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  statsTile: {
    flex: 1,
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
  },
  statsTileVal: {
    fontSize: 15,
    fontWeight: '800',
  },
  statsTileLabel: {
    fontSize: 9.5,
    color: '#64748b',
    fontWeight: '700',
    marginTop: 2,
    textAlign: 'center',
  },
  sectionHeading: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 12,
    marginTop: 4,
  },
  staffAttCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 10,
  },
  staffAnalysisCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 10,
  },
  selfieThumbnail: {
    width: 44,
    height: 44,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: '#22c55e',
  },
  photoTagText: {
    fontSize: 8,
    fontWeight: '800',
    color: '#ffffff',
    backgroundColor: '#22c55e',
    textAlign: 'center',
    borderRadius: 3,
    marginTop: 2,
  },
  avatarPlaceholder: {
    width: 44,
    height: 44,
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  staffName: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a',
  },
  staffRole: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 1,
  },
  shiftTime: {
    fontSize: 10.5,
    color: '#0284c7',
    fontWeight: '600',
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusBadgeText: {
    fontSize: 9.5,
    fontWeight: '800',
  },
  bgGreen: { backgroundColor: '#f0fdf4' },
  textGreen: { color: '#16a34a' },
  bgBlue: { backgroundColor: '#eff6ff' },
  textBlue: { color: '#2563eb' },
  bgYellow: { backgroundColor: '#fefce8' },
  textYellow: { color: '#ca8a04' },
  bgRed: { backgroundColor: '#fef2f2' },
  textRed: { color: '#dc2626' },
  timingsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#f8fafc',
    padding: 10,
    borderRadius: 8,
    marginTop: 10,
  },
  timeBox: {
    flex: 1,
  },
  timeLabel: {
    fontSize: 10,
    color: '#64748b',
    fontWeight: '700',
  },
  timeVal: {
    fontSize: 12,
    fontWeight: '800',
    marginTop: 2,
  },
  latePill: {
    backgroundColor: '#fee2e2',
    borderWidth: 1,
    borderColor: '#fca5a5',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
  },
  latePillText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#dc2626',
  },
  gpsLocationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#f0fdfa',
    borderWidth: 1,
    borderColor: '#ccfbf1',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
    marginTop: 8,
  },
  gpsText: {
    fontSize: 10.5,
    color: '#0f766e',
    fontWeight: '600',
    flex: 1,
  },
  punctualityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  punctualityText: {
    fontSize: 10,
    fontWeight: '800',
  },
  monthlyKpiRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 10,
  },
  kpiPill: {
    flex: 1,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    padding: 6,
    alignItems: 'center',
  },
  kpiPillLabel: {
    fontSize: 9,
    color: '#64748b',
    fontWeight: '700',
  },
  kpiPillVal: {
    fontSize: 11.5,
    fontWeight: '800',
    marginTop: 2,
  },
  viewPersonBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#bfdbfe',
    borderRadius: 8,
    paddingVertical: 7,
    marginTop: 10,
  },
  viewPersonBtnText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#258ec8',
  },
  personModalCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    width: '92%',
    maxHeight: '85%',
  },
  personModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    paddingBottom: 10,
    marginBottom: 8,
  },
  personModalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
  },
  personModalSub: {
    fontSize: 11.5,
    color: '#64748b',
    marginTop: 2,
  },
  closeCircleBtn: {
    padding: 4,
    borderRadius: 16,
    backgroundColor: '#f1f5f9',
  },
  personDayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    borderRadius: 6,
    marginBottom: 2,
  },
  personDateText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#0f172a',
  },
  personDayName: {
    fontSize: 9.5,
    color: '#64748b',
    fontWeight: '700',
  },
  personPunchText: {
    fontSize: 11,
    fontWeight: '800',
  },
  personOutText: {
    fontSize: 10,
    color: '#64748b',
    marginTop: 1,
  },
  leaveCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 10,
  },
  leaveStaffName: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a',
  },
  leaveMeta: {
    fontSize: 11.5,
    color: '#64748b',
    marginTop: 2,
  },
  leaveDates: {
    fontSize: 11,
    color: '#334155',
    fontWeight: '600',
    marginTop: 4,
  },
  leaveReasonBox: {
    backgroundColor: '#f8fafc',
    padding: 8,
    borderRadius: 8,
    marginTop: 8,
  },
  leaveReasonText: {
    fontSize: 11.5,
    color: '#475569',
    fontStyle: 'italic',
  },
  leaveActionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 8,
    borderRadius: 8,
  },
  approveBtn: {
    backgroundColor: '#16a34a',
  },
  approveBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#ffffff',
  },
  rejectBtn: {
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fca5a5',
  },
  rejectBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#dc2626',
  },
  reportSummaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  reportSummaryTile: {
    backgroundColor: '#ffffff',
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    alignItems: 'center',
  },
  reportSummaryVal: {
    fontSize: 15,
    fontWeight: '800',
  },
  reportSummaryLabel: {
    fontSize: 9.5,
    color: '#64748b',
    fontWeight: '700',
    marginTop: 2,
  },
  workReportCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 10,
  },
  reportStaffName: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#0f172a',
  },
  reportBranch: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 1,
  },
  reportTimestamp: {
    fontSize: 10.5,
    color: '#94a3b8',
    fontWeight: '600',
  },
  statsPillsRow: {
    flexDirection: 'row',
  },
  statPillBlue: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#bfdbfe',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statPillBlueText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#0369a1',
  },
  statPillGold: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#fefce8',
    borderWidth: 1,
    borderColor: '#fef08a',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statPillGoldText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#854d0e',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 6,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  photoModalCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    width: '90%',
    alignItems: 'center',
  },
  photoModalTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 10,
  },
  fullPhoto: {
    width: 240,
    height: 240,
    borderRadius: 12,
    backgroundColor: '#0f172a',
  },
  modalStaffName: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0f172a',
    marginTop: 10,
  },
  modalTimeText: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
  },
  modalLocText: {
    fontSize: 10.5,
    color: '#0369a1',
    marginTop: 4,
    textAlign: 'center',
  },
  closeModalBtn: {
    marginTop: 14,
    backgroundColor: '#258ec8',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 8,
  },
  closeModalBtnText: {
    color: '#ffffff',
    fontWeight: '800',
    fontSize: 12,
  },
  rejectModalCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    width: '90%',
  },
  rejectModalTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0f172a',
  },
  rejectModalSub: {
    fontSize: 11.5,
    color: '#64748b',
    marginTop: 4,
  },
  rejectInput: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    padding: 10,
    fontSize: 12,
    color: '#0f172a',
    minHeight: 60,
    marginTop: 10,
    textAlignVertical: 'top',
  },
  modalBtn: {
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
