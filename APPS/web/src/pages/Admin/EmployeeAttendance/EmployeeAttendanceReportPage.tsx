import React, { useState, useEffect, useMemo } from 'react';
import {
  Clock, Calendar, MapPin, Camera, Filter, Download, Search,
  ExternalLink, X, Building2, User, UserCheck, AlertTriangle,
  CheckCircle2, ChevronRight, Award, AlertCircle, FileText,
  ArrowLeft, Printer, BarChart2, TrendingUp, UserX
} from 'lucide-react';
import { collection, query, onSnapshot, orderBy, doc, setDoc } from 'firebase/firestore';
import { db, StaffAttendanceRecord, StaffLeaveRequest } from '@app/shared';

const DEFAULT_STAFF = [
  { id: '1', name: 'Anil Kumar M', branch: 'KPHB', role: 'Regular Staff', phone: '9030176176', shift: '10:00 AM - 08:30 PM', hours: '10.5 hrs/day', salary: '₹22,000' },
  { id: '2', name: 'Ashwini Begari', branch: 'Chandanagar', role: 'Regular Staff', phone: '9553176176', shift: '10:00 AM - 06:30 PM', hours: '8.5 hrs/day', salary: '₹17,000' },
  { id: '3', name: 'Vaishnavi Peri', branch: 'Nallagandla', role: 'Regular Staff', phone: '9132176176', shift: '09:30 AM - 07:00 PM', hours: '9.5 hrs/day', salary: '₹17,000' },
  { id: '4', name: 'Nandini Gottelli', branch: 'Dilshuknagar', role: 'Regular Staff', phone: '9804176176', shift: '10:00 AM - 02:00 PM | 04:30 PM - 08:30 PM', hours: '8 hrs/day', salary: '₹15,000' },
  { id: '5', name: 'Srikanth', branch: 'KPHB', role: 'Regular Staff', phone: '9030176176', shift: '10:00 AM - 08:00 PM', hours: '10 hrs/day', salary: '₹18,000' },
  { id: '6', name: 'Arun Kumar', branch: 'Nallagandla', role: 'Regular Staff', phone: '9132176176', shift: '10:00 AM - 06:00 PM', hours: '8 hrs/day', salary: '₹14,000' },
  { id: '7', name: 'Aishwarya . M', branch: 'KPHB', role: 'Regular Staff', phone: '7995532759', shift: '10:00 AM - 08:30 PM', hours: '10.5 hrs/day', salary: '₹14,000' },
];

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

  // Late if punch in is more than 15 minutes after shift start time
  const diff = punchInMins - shift.minutes;
  if (diff > 15) {
    return { isLate: true, lateMinutes: diff, shiftStartStr: shift.timeStr };
  }
  return { isLate: false, lateMinutes: Math.max(0, diff), shiftStartStr: shift.timeStr };
};

export const EmployeeAttendanceReportPage: React.FC = () => {
  // 4 View Modes:
  // 'day' = 📅 Day-Wise Report
  // 'month' = 📆 Month Log View
  // 'analysis' = 📊 Staff-Wise Monthly Analysis (Total Leaves, Late marks >15m, Working hours)
  // 'person' = 👤 Person-to-Person Individual Report
  const [viewMode, setViewMode] = useState<'day' | 'month' | 'analysis' | 'person'>('day');

  // Date & Month Selection
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  });

  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });

  // Selected Person for Individual Report
  const [selectedPersonStaffId, setSelectedPersonStaffId] = useState<string>('1');

  // Filters
  const [selectedBranch, setSelectedBranch] = useState<string>('All');
  const [selectedStatus, setSelectedStatus] = useState<string>('All');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Firestore Data
  const [staffList, setStaffList] = useState<any[]>(DEFAULT_STAFF);
  const [attendanceRecords, setAttendanceRecords] = useState<StaffAttendanceRecord[]>([]);
  const [leaveRequests, setLeaveRequests] = useState<StaffLeaveRequest[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Modal States
  const [previewPhoto, setPreviewPhoto] = useState<{
    url: string;
    staffName: string;
    type: 'Punch In' | 'Punch Out';
    time: string;
    date: string;
    branch: string;
    location?: string;
  } | null>(null);

  const [previewLocation, setPreviewLocation] = useState<{
    staffName: string;
    type: 'Punch In' | 'Punch Out';
    time: string;
    date: string;
    branch: string;
    address?: string;
    latitude?: number;
    longitude?: number;
  } | null>(null);

  // 1. Fetch & Auto-Sync Staff Directory from Firestore
  useEffect(() => {
    if (!db) return;
    const unsub = onSnapshot(collection(db, 'staff'), (snap) => {
      const list: any[] = [];
      snap.forEach(d => list.push({ id: d.id, ...d.data() }));

      // Auto-sync missing members like Aishwarya
      for (const stf of DEFAULT_STAFF) {
        const found = list.find(d => d.id === stf.id || d.name?.toLowerCase() === stf.name.toLowerCase() || d.phone === stf.phone || d.mobile === stf.phone);
        if (!found && db) {
          try {
            setDoc(doc(db, 'staff', stf.id), stf, { merge: true });
            list.push(stf);
          } catch (_) { }
        }
      }

      if (list.length > 0) {
        setStaffList(list);
      }
    }, (err) => console.warn('Staff listener error:', err));

    return () => unsub();
  }, []);

  // 2. Fetch Live Attendance Records
  useEffect(() => {
    if (!db) return;
    setIsLoading(true);
    const unsub = onSnapshot(query(collection(db, 'attendance'), orderBy('date', 'desc')), (snap) => {
      const list: StaffAttendanceRecord[] = [];
      snap.forEach(d => list.push({ id: d.id, ...(d.data() as any) }));
      setAttendanceRecords(list);
      setIsLoading(false);
    }, (err) => {
      console.warn('Attendance listener error:', err);
      setIsLoading(false);
    });
    return () => unsub();
  }, []);

  // 3. Fetch Live Leave Requests
  useEffect(() => {
    if (!db) return;
    const unsub = onSnapshot(query(collection(db, 'leaves'), orderBy('createdAt', 'desc')), (snap) => {
      const list: StaffLeaveRequest[] = [];
      snap.forEach(d => list.push({ id: d.id, ...(d.data() as any) }));
      setLeaveRequests(list);
    }, (err) => console.warn('Leaves listener error:', err));
    return () => unsub();
  }, []);

  // Normalize Attendance Status
  const getRecordStatus = (record?: StaffAttendanceRecord, onLeave?: boolean, isLate?: boolean): 'Present' | 'Completed' | 'Late' | 'On Leave' | 'Absent' => {
    if (onLeave) return 'On Leave';
    if (!record || !record.punchInTime) return 'Absent';
    if (record.punchOutTime) return 'Completed';
    if (isLate) return 'Late';
    return 'Present';
  };

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

  // Process Day-Wise Data
  const dayWiseData = useMemo(() => {
    const normTargetDate = normalizeDate(selectedDate);

    return staffList.map(stf => {
      const record = attendanceRecords.find(a =>
        (a.staffId === stf.id || (a.staffName && a.staffName.toLowerCase() === stf.name.toLowerCase())) &&
        normalizeDate(a.date) === normTargetDate
      );
      const onLeaveToday = leaveRequests.find(l =>
        (l.staffId === stf.id || (l.staffName && l.staffName.toLowerCase() === stf.name.toLowerCase())) &&
        l.status === 'Approved' &&
        normTargetDate >= normalizeDate(l.fromDate) &&
        normTargetDate <= normalizeDate(l.toDate)
      );
      const lateInfo = checkLateArrival(stf.shift, record?.punchInTime);
      const status = getRecordStatus(record, !!onLeaveToday, lateInfo.isLate);

      return {
        staff: stf,
        date: selectedDate,
        record,
        onLeave: !!onLeaveToday,
        leaveDetails: onLeaveToday,
        lateInfo,
        status
      };
    }).filter(item => {
      if (selectedBranch !== 'All' && !(item.staff.branch || '').toLowerCase().includes(selectedBranch.toLowerCase())) {
        return false;
      }
      if (selectedStatus !== 'All' && item.status !== selectedStatus) {
        return false;
      }
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        const matchesName = (item.staff.name || '').toLowerCase().includes(query);
        const matchesPhone = (item.staff.phone || item.staff.mobile || '').includes(query);
        if (!matchesName && !matchesPhone) return false;
      }
      return true;
    });
  }, [staffList, attendanceRecords, leaveRequests, selectedDate, selectedBranch, selectedStatus, searchTerm]);

  // Process Month-Wise Records
  const monthWiseRecords = useMemo(() => {
    const matching = attendanceRecords.filter(r => normalizeDate(r.date).startsWith(selectedMonth));

    return matching.map(record => {
      const staff = staffList.find(s => s.id === record.staffId || (s.name && s.name.toLowerCase() === record.staffName?.toLowerCase())) || {
        id: record.staffId,
        name: record.staffName,
        branch: record.branch || 'Clinic',
        role: record.role || 'Staff',
        shift: '10:00 AM - 08:30 PM'
      };

      const lateInfo = checkLateArrival(staff.shift, record.punchInTime);
      const status = getRecordStatus(record, false, lateInfo.isLate);

      return {
        staff,
        date: record.date,
        record,
        onLeave: false,
        leaveDetails: null,
        lateInfo,
        status
      };
    }).filter(item => {
      if (selectedBranch !== 'All' && !(item.staff.branch || '').toLowerCase().includes(selectedBranch.toLowerCase())) {
        return false;
      }
      if (selectedStatus !== 'All' && item.status !== selectedStatus) {
        return false;
      }
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        const matchesName = (item.staff.name || '').toLowerCase().includes(query);
        const matchesPhone = (item.staff.phone || item.staff.mobile || '').includes(query);
        if (!matchesName && !matchesPhone) return false;
      }
      return true;
    });
  }, [attendanceRecords, staffList, selectedMonth, selectedBranch, selectedStatus, searchTerm]);

  // Process Staff-Wise Monthly Analysis
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
      if (selectedBranch !== 'All' && !(item.staff.branch || '').toLowerCase().includes(selectedBranch.toLowerCase())) {
        return false;
      }
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        const matchesName = (item.staff.name || '').toLowerCase().includes(query);
        const matchesPhone = (item.staff.phone || item.staff.mobile || '').includes(query);
        if (!matchesName && !matchesPhone) return false;
      }
      return true;
    });
  }, [staffList, attendanceRecords, leaveRequests, selectedMonth, daysInMonthList, selectedBranch, searchTerm]);

  // Selected Staff Object for Person-to-Person Report
  const selectedStaffObj = useMemo(() => {
    return staffList.find(s => s.id === selectedPersonStaffId || s.name === selectedPersonStaffId) || staffList[0] || null;
  }, [staffList, selectedPersonStaffId]);

  // Person-to-Person Daily Ledger
  const personDailyLedger = useMemo(() => {
    if (!selectedStaffObj) return [];
    const staffId = selectedStaffObj.id;
    const staffName = selectedStaffObj.name;
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

      const lateInfo = checkLateArrival(selectedStaffObj.shift, record?.punchInTime);

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
  }, [selectedStaffObj, attendanceRecords, leaveRequests, selectedMonth, daysInMonthList]);

  // Person Monthly Totals
  const personTotals = useMemo(() => {
    let present = 0;
    let completed = 0;
    let late = 0;
    let leaves = 0;
    let absent = 0;
    let totalMinutes = 0;

    personDailyLedger.forEach(item => {
      if (item.leave) leaves++;
      if (item.record?.punchInTime) {
        present++;
        if (item.lateInfo.isLate) late++;
        if (item.record.punchOutTime) completed++;

        if (item.record.punchInTime && item.record.punchOutTime) {
          const inMins = parseTimeToMinutes(item.record.punchInTime);
          const outMins = parseTimeToMinutes(item.record.punchOutTime);
          if (inMins !== null && outMins !== null && outMins > inMins) {
            totalMinutes += (outMins - inMins);
          }
        } else if (item.record.workingHours) {
          const num = parseFloat(item.record.workingHours);
          if (!isNaN(num)) totalMinutes += Math.round(num * 60);
        }
      } else if (item.dayStatus === 'Absent') {
        absent++;
      }
    });

    const hours = (totalMinutes / 60).toFixed(1);
    const punctuality = present > 0 ? Math.max(0, Math.round(((present - late) / present) * 100)) : 100;

    return { present, completed, late, leaves, absent, hours, punctuality };
  }, [personDailyLedger]);

  // Active records for Day/Month tables
  const activeDisplayList = viewMode === 'day' ? dayWiseData : monthWiseRecords;

  // KPI Metrics for Day / Month views
  const dayMonthMetrics = useMemo(() => {
    if (viewMode === 'day') {
      const total = dayWiseData.length;
      const present = dayWiseData.filter(d => d.status === 'Present' || d.status === 'Late').length;
      const completed = dayWiseData.filter(d => d.status === 'Completed').length;
      const lateCount = dayWiseData.filter(d => d.lateInfo.isLate).length;
      const onLeave = dayWiseData.filter(d => d.status === 'On Leave').length;
      const absent = dayWiseData.filter(d => d.status === 'Absent').length;
      return { total, present, completed, lateCount, onLeave, absent };
    } else {
      const total = monthWiseRecords.length;
      const present = monthWiseRecords.filter(d => d.status === 'Present' || d.status === 'Late').length;
      const completed = monthWiseRecords.filter(d => d.status === 'Completed').length;
      const lateCount = monthWiseRecords.filter(d => d.lateInfo.isLate).length;
      const onLeave = leaveRequests.filter(l => l.status === 'Approved' && (normalizeDate(l.fromDate).startsWith(selectedMonth) || normalizeDate(l.toDate).startsWith(selectedMonth))).length;
      const uniqueStaffCount = new Set(monthWiseRecords.map(m => m.staff.name)).size;
      return { total, present, completed, lateCount, onLeave, absent: Math.max(0, staffList.length - uniqueStaffCount) };
    }
  }, [viewMode, dayWiseData, monthWiseRecords, leaveRequests, selectedMonth, staffList.length]);

  // KPI Metrics for Staff-Wise Monthly Analysis
  const analysisMetrics = useMemo(() => {
    const totalStaff = staffMonthlyAnalysis.length;
    const totalPresent = staffMonthlyAnalysis.reduce((acc, s) => acc + s.presentCount, 0);
    const totalLeaves = staffMonthlyAnalysis.reduce((acc, s) => acc + s.leaveDaysCount, 0);
    const totalLate = staffMonthlyAnalysis.reduce((acc, s) => acc + s.lateMarksCount, 0);
    const totalHours = staffMonthlyAnalysis.reduce((acc, s) => acc + parseFloat(s.totalHours || '0'), 0).toFixed(1);
    const avgPunctuality = totalStaff > 0 ? Math.round(staffMonthlyAnalysis.reduce((acc, s) => acc + s.punctualityScore, 0) / totalStaff) : 100;
    return { totalStaff, totalPresent, totalLeaves, totalLate, totalHours, avgPunctuality };
  }, [staffMonthlyAnalysis]);

  // Export CSV based on active view mode
  const handleExportCSV = () => {
    if (viewMode === 'analysis') {
      const headers = ['Staff Name', 'ID', 'Branch', 'Role', 'Days Present', 'Days Absent', 'Approved Leaves', 'Late Marks (>15m)', 'Total Hours', 'Punctuality %'];
      const rows = staffMonthlyAnalysis.map(s => [
        `"${s.staff.name}"`,
        `"${s.staff.id || ''}"`,
        `"${s.staff.branch || ''}"`,
        `"${s.staff.role || ''}"`,
        s.presentCount,
        s.absentCount,
        s.leaveDaysCount,
        s.lateMarksCount,
        `"${s.totalHours} hrs"`,
        `"${s.punctualityScore}%"`
      ]);
      const csv = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
      const link = document.createElement('a');
      link.setAttribute('href', encodeURI(csv));
      link.setAttribute('download', `staff_monthly_analysis_${selectedMonth}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      return;
    }

    if (viewMode === 'person') {
      const headers = ['Date', 'Day', 'Shift', 'Login Time', 'Late Duration', 'Logout Time', 'Hours Worked', 'Status', 'Leave Reason'];
      const rows = personDailyLedger.map(item => [
        `"${item.dateStr}"`,
        `"${item.dayName}"`,
        `"${selectedStaffObj?.shift || '10:00 AM - 08:30 PM'}"`,
        `"${item.record?.punchInTime || '--:--'}"`,
        `"${item.lateInfo.isLate ? `${item.lateInfo.lateMinutes}m Late` : 'On Time'}"`,
        `"${item.record?.punchOutTime || '--:--'}"`,
        `"${item.record?.workingHours || '--'}"`,
        `"${item.dayStatus}"`,
        `"${item.leave?.reason || ''}"`
      ]);
      const csv = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
      const link = document.createElement('a');
      link.setAttribute('href', encodeURI(csv));
      link.setAttribute('download', `personal_report_${(selectedStaffObj?.name || 'staff').replace(/\s+/g, '_')}_${selectedMonth}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      return;
    }

    // Day or Month view
    const headers = [
      'Staff Name', 'Staff ID', 'Branch', 'Date', 'Shift',
      'Punch In Time', 'Late Status', 'Punch In Location',
      'Punch Out Time', 'Punch Out Location', 'Hours Worked', 'Status'
    ];

    const rows = activeDisplayList.map(item => [
      `"${item.staff.name}"`,
      `"${item.staff.id || ''}"`,
      `"${item.staff.branch || ''}"`,
      `"${item.date}"`,
      `"${item.staff.shift || '10:00 AM - 08:30 PM'}"`,
      `"${item.record?.punchInTime || '--:--'}"`,
      `"${item.lateInfo?.isLate ? `LATE (+ ${item.lateInfo.lateMinutes}m)` : 'ON TIME'}"`,
      `"${(item.record?.punchInLocation?.address || '').replace(/"/g, '""')}"`,
      `"${item.record?.punchOutTime || '--:--'}"`,
      `"${(item.record?.punchOutLocation?.address || '').replace(/"/g, '""')}"`,
      `"${item.record?.workingHours || '--'}"`,
      `"${item.status}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const link = document.createElement('a');
    link.setAttribute('href', encodeURI(csvContent));
    link.setAttribute('download', `attendance_report_${viewMode}_${viewMode === 'day' ? selectedDate : selectedMonth}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div style={{ padding: '16px 14px', maxWidth: '1350px', margin: '0 auto', fontFamily: 'inherit' }}>

      {/* 1. Header & Title Bar */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '10px',
        marginBottom: '12px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{
            width: '34px',
            height: '34px',
            borderRadius: '10px',
            backgroundColor: '#eff6ff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#258ec8',
            border: '1px solid #bfdbfe'
          }}>
            <Clock size={18} />
          </div>
          <div>
            <h1 style={{ fontSize: '15px !important', fontWeight: 800, color: '#0f172a', margin: 0, lineHeight: 1.2 }}>
              Employee Attendance & Work Analysis
            </h1>
            <p style={{ fontSize: '11px !important', color: '#64748b', margin: '1px 0 0 0' }}>
              Day-wise punch roster, monthly logs, staff analysis, 15m late detection & individual person reports
            </p>
          </div>
        </div>

        {/* 4 View Modes Switcher & Export CSV */}
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', background: '#f1f5f9', padding: '3px', borderRadius: '10px', border: '1px solid #e2e8f0', gap: '2px' }}>
            <button
              onClick={() => setViewMode('day')}
              style={{
                padding: '5px 10px',
                borderRadius: '7px',
                border: 'none',
                background: viewMode === 'day' ? '#258ec8' : 'transparent',
                color: viewMode === 'day' ? '#ffffff' : '#475569',
                fontWeight: 800,
                fontSize: '11px !important',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              📅 Day-Wise Report
            </button>
            <button
              onClick={() => setViewMode('month')}
              style={{
                padding: '5px 10px',
                borderRadius: '7px',
                border: 'none',
                background: viewMode === 'month' ? '#258ec8' : 'transparent',
                color: viewMode === 'month' ? '#ffffff' : '#475569',
                fontWeight: 800,
                fontSize: '11px !important',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              📆 Month Log View
            </button>
            <button
              onClick={() => setViewMode('analysis')}
              style={{
                padding: '5px 10px',
                borderRadius: '7px',
                border: 'none',
                background: viewMode === 'analysis' ? '#258ec8' : 'transparent',
                color: viewMode === 'analysis' ? '#ffffff' : '#475569',
                fontWeight: 800,
                fontSize: '11px !important',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              📊 Staff-Wise Analysis
            </button>
            <button
              onClick={() => setViewMode('person')}
              style={{
                padding: '5px 10px',
                borderRadius: '7px',
                border: 'none',
                background: viewMode === 'person' ? '#258ec8' : 'transparent',
                color: viewMode === 'person' ? '#ffffff' : '#475569',
                fontWeight: 800,
                fontSize: '11px !important',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              👤 Person Report
            </button>
          </div>

          {/* Export CSV */}
          <button
            onClick={handleExportCSV}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              padding: '6px 12px',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              background: '#ffffff',
              color: '#0f172a',
              fontWeight: 700,
              fontSize: '11px !important',
              cursor: 'pointer',
              boxShadow: '0 1px 2px rgba(0,0,0,0.04)'
            }}
          >
            <Download size={13} color="#258ec8" /> Export CSV
          </button>
        </div>
      </div>

      {/* 2. Filter & Controls Bar */}
      <div style={{
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '12px',
        padding: '10px 12px',
        marginBottom: '12px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
        display: 'flex',
        flexWrap: 'wrap',
        gap: '10px',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        {/* Date / Month / Person Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          {viewMode === 'day' ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '11px !important', fontWeight: 700, color: '#64748b' }}>Date:</span>
              <input
                type="date"
                value={selectedDate}
                onChange={e => setSelectedDate(e.target.value)}
                style={{
                  padding: '4px 8px',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  fontSize: '11.5px !important',
                  fontWeight: 700,
                  color: '#0f172a',
                  background: '#f8fafc',
                  outline: 'none',
                  height: '28px'
                }}
              />
              <button
                onClick={() => {
                  const d = new Date();
                  setSelectedDate(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`);
                }}
                style={{
                  padding: '4px 8px',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  background: '#ffffff',
                  color: '#258ec8',
                  fontSize: '10.5px !important',
                  fontWeight: 800,
                  cursor: 'pointer',
                  height: '28px'
                }}
              >
                Today
              </button>
              <button
                onClick={() => {
                  const d = new Date();
                  d.setDate(d.getDate() - 1);
                  setSelectedDate(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`);
                }}
                style={{
                  padding: '4px 8px',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  background: '#ffffff',
                  color: '#475569',
                  fontSize: '10.5px !important',
                  fontWeight: 700,
                  cursor: 'pointer',
                  height: '28px'
                }}
              >
                Yesterday
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '11px !important', fontWeight: 700, color: '#64748b' }}>Select Month:</span>
              <input
                type="month"
                value={selectedMonth}
                onChange={e => setSelectedMonth(e.target.value)}
                style={{
                  padding: '4px 8px',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  fontSize: '11.5px !important',
                  fontWeight: 700,
                  color: '#0f172a',
                  background: '#f8fafc',
                  outline: 'none',
                  height: '28px'
                }}
              />

              {viewMode === 'person' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginLeft: '6px' }}>
                  <span style={{ fontSize: '11px !important', fontWeight: 700, color: '#0369a1' }}>👤 Select Staff:</span>
                  <select
                    value={selectedPersonStaffId}
                    onChange={e => setSelectedPersonStaffId(e.target.value)}
                    style={{
                      padding: '4px 8px',
                      borderRadius: '6px',
                      border: '1.5px solid #0284c7',
                      fontSize: '11.5px !important',
                      fontWeight: 800,
                      color: '#0f172a',
                      background: '#eff6ff',
                      outline: 'none',
                      height: '28px'
                    }}
                  >
                    {staffList.map(s => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.branch || 'KPHB'} • {s.role || 'Staff'})
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Branch Filter Chips */}
        {viewMode !== 'person' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '11px !important', fontWeight: 700, color: '#64748b', marginRight: '2px' }}>Branch:</span>
            {['All', 'KPHB', 'Chandanagar', 'Nallagandla', 'Dilshuknagar'].map(b => (
              <button
                key={b}
                onClick={() => setSelectedBranch(b)}
                style={{
                  padding: '3px 8px',
                  borderRadius: '6px',
                  border: selectedBranch === b ? '1px solid #258ec8' : '1px solid #e2e8f0',
                  background: selectedBranch === b ? '#258ec8' : '#ffffff',
                  color: selectedBranch === b ? '#ffffff' : '#64748b',
                  fontSize: '11px !important',
                  fontWeight: selectedBranch === b ? 800 : 600,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                {b === 'All' ? 'All Branches' : b}
              </button>
            ))}
          </div>
        )}

        {/* Search & Status Filter */}
        {viewMode !== 'person' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <div style={{ position: 'relative' }}>
              <Search size={12} color="#94a3b8" style={{ position: 'absolute', left: '8px', top: '8px' }} />
              <input
                type="text"
                placeholder="Search staff name or phone..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                style={{
                  padding: '4px 8px 4px 26px',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  fontSize: '11px !important',
                  width: '180px',
                  outline: 'none',
                  background: '#f8fafc',
                  height: '28px'
                }}
              />
            </div>

            {(viewMode === 'day' || viewMode === 'month') && (
              <select
                value={selectedStatus}
                onChange={e => setSelectedStatus(e.target.value)}
                style={{
                  padding: '4px 8px',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  fontSize: '11px !important',
                  fontWeight: 700,
                  color: '#0f172a',
                  background: '#ffffff',
                  outline: 'none',
                  height: '28px'
                }}
              >
                <option value="All">All Statuses</option>
                <option value="Present">Present (On Time)</option>
                <option value="Late">Late Arrival (&gt;15m)</option>
                <option value="Completed">Shift Done (Punched Out)</option>
                <option value="On Leave">On Leave</option>
                <option value="Absent">Absent</option>
              </select>
            )}
          </div>
        )}
      </div>

      {/* 3. Metric KPI Cards */}
      {viewMode === 'analysis' ? (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
          gap: '8px',
          marginBottom: '14px'
        }}>
          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '10px 12px', boxShadow: '0 1px 2px rgba(0,0,0,0.02)' }}>
            <div style={{ fontSize: '10px !important', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Active Staff</div>
            <div style={{ fontSize: '18px !important', fontWeight: 800, color: '#0f172a', marginTop: '2px' }}>{analysisMetrics.totalStaff}</div>
            <div style={{ fontSize: '9.5px !important', color: '#94a3b8' }}>Staff members analyzed</div>
          </div>

          <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '10px', padding: '10px 12px' }}>
            <div style={{ fontSize: '10px !important', fontWeight: 800, color: '#16a34a', textTransform: 'uppercase' }}>🟢 Total Present Days</div>
            <div style={{ fontSize: '18px !important', fontWeight: 800, color: '#15803d', marginTop: '2px' }}>{analysisMetrics.totalPresent}</div>
            <div style={{ fontSize: '9.5px !important', color: '#16a34a' }}>Across all staff in {selectedMonth}</div>
          </div>

          <div style={{ background: '#fefce8', border: '1px solid #fef08a', borderRadius: '10px', padding: '10px 12px' }}>
            <div style={{ fontSize: '10px !important', fontWeight: 800, color: '#ca8a04', textTransform: 'uppercase' }}>🟡 Total Approved Leaves</div>
            <div style={{ fontSize: '18px !important', fontWeight: 800, color: '#a16207', marginTop: '2px' }}>{analysisMetrics.totalLeaves} days</div>
            <div style={{ fontSize: '9.5px !important', color: '#ca8a04' }}>Leave days taken</div>
          </div>

          <div style={{ background: '#fef2f2', border: '1.5px solid #fca5a5', borderRadius: '10px', padding: '10px 12px' }}>
            <div style={{ fontSize: '10px !important', fontWeight: 800, color: '#dc2626', textTransform: 'uppercase' }}>⚠️ Late Marks (&gt;15m)</div>
            <div style={{ fontSize: '18px !important', fontWeight: 800, color: '#b91c1c', marginTop: '2px' }}>{analysisMetrics.totalLate}</div>
            <div style={{ fontSize: '9.5px !important', color: '#dc2626' }}>Arrived after shift + 15m</div>
          </div>

          <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '10px', padding: '10px 12px' }}>
            <div style={{ fontSize: '10px !important', fontWeight: 800, color: '#2563eb', textTransform: 'uppercase' }}>⏱️ Total Hours Logged</div>
            <div style={{ fontSize: '18px !important', fontWeight: 800, color: '#1d4ed8', marginTop: '2px' }}>{analysisMetrics.totalHours} hrs</div>
            <div style={{ fontSize: '9.5px !important', color: '#3b82f6' }}>Sum of all shifts</div>
          </div>

          <div style={{ background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '10px', padding: '10px 12px' }}>
            <div style={{ fontSize: '10px !important', fontWeight: 800, color: '#475569', textTransform: 'uppercase' }}>🎯 Avg Punctuality</div>
            <div style={{ fontSize: '18px !important', fontWeight: 800, color: '#0f172a', marginTop: '2px' }}>{analysisMetrics.avgPunctuality}%</div>
            <div style={{ fontSize: '9.5px !important', color: '#64748b' }}>On-time attendance rate</div>
          </div>
        </div>
      ) : viewMode === 'person' ? (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
          gap: '8px',
          marginBottom: '14px'
        }}>
          <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '10px', padding: '10px 12px' }}>
            <div style={{ fontSize: '9.5px !important', fontWeight: 800, color: '#16a34a', textTransform: 'uppercase' }}>🟢 Days Present</div>
            <div style={{ fontSize: '18px !important', fontWeight: 800, color: '#15803d', marginTop: '2px' }}>{personTotals.present}</div>
            <div style={{ fontSize: '9.5px !important', color: '#16a34a' }}>Punched in this month</div>
          </div>

          <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '10px', padding: '10px 12px' }}>
            <div style={{ fontSize: '9.5px !important', fontWeight: 800, color: '#2563eb', textTransform: 'uppercase' }}>🔵 Shift Completed</div>
            <div style={{ fontSize: '18px !important', fontWeight: 800, color: '#1d4ed8', marginTop: '2px' }}>{personTotals.completed}</div>
            <div style={{ fontSize: '9.5px !important', color: '#3b82f6' }}>Both punch in & out</div>
          </div>

          <div style={{ background: '#fefce8', border: '1px solid #fef08a', borderRadius: '10px', padding: '10px 12px' }}>
            <div style={{ fontSize: '9.5px !important', fontWeight: 800, color: '#ca8a04', textTransform: 'uppercase' }}>🟡 Approved Leaves</div>
            <div style={{ fontSize: '18px !important', fontWeight: 800, color: '#a16207', marginTop: '2px' }}>{personTotals.leaves} days</div>
            <div style={{ fontSize: '9.5px !important', color: '#ca8a04' }}>Official leaves</div>
          </div>

          <div style={{ background: '#fef2f2', border: '1.5px solid #fca5a5', borderRadius: '10px', padding: '10px 12px' }}>
            <div style={{ fontSize: '9.5px !important', fontWeight: 800, color: '#dc2626', textTransform: 'uppercase' }}>⚠️ Late Marks (&gt;15m)</div>
            <div style={{ fontSize: '18px !important', fontWeight: 800, color: '#b91c1c', marginTop: '2px' }}>{personTotals.late}</div>
            <div style={{ fontSize: '9.5px !important', color: '#dc2626' }}>Late arrival days</div>
          </div>

          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '10px 12px' }}>
            <div style={{ fontSize: '9.5px !important', fontWeight: 800, color: '#dc2626', textTransform: 'uppercase' }}>🔴 Days Absent</div>
            <div style={{ fontSize: '18px !important', fontWeight: 800, color: '#b91c1c', marginTop: '2px' }}>{personTotals.absent}</div>
            <div style={{ fontSize: '9.5px !important', color: '#ef4444' }}>Unexcused absences</div>
          </div>

          <div style={{ background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: '10px', padding: '10px 12px' }}>
            <div style={{ fontSize: '9.5px !important', fontWeight: 800, color: '#0369a1', textTransform: 'uppercase' }}>⏱️ Working Hours</div>
            <div style={{ fontSize: '18px !important', fontWeight: 800, color: '#0284c7', marginTop: '2px' }}>{personTotals.hours} hrs</div>
            <div style={{ fontSize: '9.5px !important', color: '#0284c7' }}>Logged on duty</div>
          </div>

          <div style={{ background: '#faf5ff', border: '1px solid #e9d5ff', borderRadius: '10px', padding: '10px 12px' }}>
            <div style={{ fontSize: '9.5px !important', fontWeight: 800, color: '#7e22ce', textTransform: 'uppercase' }}>🎯 Punctuality Score</div>
            <div style={{ fontSize: '18px !important', fontWeight: 800, color: '#6b21a8', marginTop: '2px' }}>{personTotals.punctuality}%</div>
            <div style={{ fontSize: '9.5px !important', color: '#9333ea' }}>On-time punctuality</div>
          </div>
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
          gap: '8px',
          marginBottom: '14px'
        }}>
          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '8px 10px', boxShadow: '0 1px 2px rgba(0,0,0,0.02)' }}>
            <div style={{ fontSize: '9.5px !important', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>
              {viewMode === 'day' ? 'Total Staff' : 'Total Logs'}
            </div>
            <div style={{ fontSize: '17px !important', fontWeight: 800, color: '#0f172a', marginTop: '2px' }}>
              {dayMonthMetrics.total}
            </div>
            <div style={{ fontSize: '9.5px !important', color: '#94a3b8', marginTop: '1px' }}>
              {viewMode === 'day' ? 'In staff directory' : `In ${selectedMonth}`}
            </div>
          </div>

          <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '10px', padding: '8px 10px' }}>
            <div style={{ fontSize: '9.5px !important', fontWeight: 800, color: '#16a34a', textTransform: 'uppercase' }}>
              🟢 Punched In (Working)
            </div>
            <div style={{ fontSize: '17px !important', fontWeight: 800, color: '#15803d', marginTop: '2px' }}>
              {dayMonthMetrics.present}
            </div>
            <div style={{ fontSize: '9.5px !important', color: '#16a34a', marginTop: '1px' }}>
              Active on shift
            </div>
          </div>

          <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '10px', padding: '8px 10px' }}>
            <div style={{ fontSize: '9.5px !important', fontWeight: 800, color: '#2563eb', textTransform: 'uppercase' }}>
              🔵 Shift Completed (Out)
            </div>
            <div style={{ fontSize: '17px !important', fontWeight: 800, color: '#1d4ed8', marginTop: '2px' }}>
              {dayMonthMetrics.completed}
            </div>
            <div style={{ fontSize: '9.5px !important', color: '#3b82f6', marginTop: '1px' }}>
              Punched out with hours
            </div>
          </div>

          <div style={{ background: '#fef2f2', border: '1.5px solid #fca5a5', borderRadius: '10px', padding: '8px 10px' }}>
            <div style={{ fontSize: '9.5px !important', fontWeight: 800, color: '#dc2626', textTransform: 'uppercase' }}>
              ⚠️ Late Arrivals (&gt;15m)
            </div>
            <div style={{ fontSize: '17px !important', fontWeight: 800, color: '#b91c1c', marginTop: '2px' }}>
              {dayMonthMetrics.lateCount}
            </div>
            <div style={{ fontSize: '9.5px !important', color: '#dc2626', marginTop: '1px' }}>
              Punched in late
            </div>
          </div>

          <div style={{ background: '#fefce8', border: '1px solid #fef08a', borderRadius: '10px', padding: '8px 10px' }}>
            <div style={{ fontSize: '9.5px !important', fontWeight: 800, color: '#ca8a04', textTransform: 'uppercase' }}>
              🟡 Approved Leave
            </div>
            <div style={{ fontSize: '17px !important', fontWeight: 800, color: '#a16207', marginTop: '2px' }}>
              {dayMonthMetrics.onLeave}
            </div>
            <div style={{ fontSize: '9.5px !important', color: '#ca8a04', marginTop: '1px' }}>
              Approved leaves
            </div>
          </div>

          <div style={{ background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '10px', padding: '8px 10px' }}>
            <div style={{ fontSize: '9.5px !important', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>
              🔴 Absent / Pending
            </div>
            <div style={{ fontSize: '17px !important', fontWeight: 800, color: '#0f172a', marginTop: '2px' }}>
              {dayMonthMetrics.absent}
            </div>
            <div style={{ fontSize: '9.5px !important', color: '#ef4444', marginTop: '1px' }}>
              Not punched in yet
            </div>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* VIEW 1 & 2: DAY-WISE REPORT OR MONTH LOG VIEW                       */}
      {/* =================================================================== */}
      {(viewMode === 'day' || viewMode === 'month') && (
        <div style={{
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '12px',
          overflow: 'hidden',
          boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
        }}>
          <div style={{
            padding: '10px 14px',
            borderBottom: '1px solid #e2e8f0',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            background: '#f8fafc',
            flexWrap: 'wrap',
            gap: '6px'
          }}>
            <div>
              <h3 style={{ fontSize: '12.5px !important', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                {viewMode === 'day' ? `Live Attendance Roster for ${selectedDate}` : `Monthly Attendance Records for ${selectedMonth}`}
              </h3>
              <span style={{ fontSize: '10.5px !important', color: '#64748b' }}>
                Showing {activeDisplayList.length} staff records • Shift start grace: 15 mins
              </span>
            </div>
            <div style={{ fontSize: '10.5px !important', color: '#64748b' }}>
              Click photo to zoom • Click location to view coordinates & Google Maps
            </div>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '11px !important' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569' }}>
                  <th style={{ padding: '7px 10px', fontWeight: 800, fontSize: '11px !important' }}>Employee Name</th>
                  <th style={{ padding: '7px 10px', fontWeight: 800, fontSize: '11px !important' }}>Branch & Shift</th>
                  {viewMode === 'month' && <th style={{ padding: '7px 10px', fontWeight: 800, fontSize: '11px !important' }}>Date</th>}
                  <th style={{ padding: '7px 10px', fontWeight: 800, color: '#16a34a', fontSize: '11px !important' }}>🟢 Login / Punch In</th>
                  <th style={{ padding: '7px 10px', fontWeight: 800, color: '#dc2626', fontSize: '11px !important' }}>🔴 Logout / Punch Out</th>
                  <th style={{ padding: '7px 10px', fontWeight: 800, fontSize: '11px !important' }}>Duration</th>
                  <th style={{ padding: '7px 10px', fontWeight: 800, fontSize: '11px !important' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={viewMode === 'month' ? 7 : 6} style={{ textAlign: 'center', padding: '30px', color: '#94a3b8', fontSize: '11px !important' }}>
                      Loading attendance records...
                    </td>
                  </tr>
                ) : activeDisplayList.length === 0 ? (
                  <tr>
                    <td colSpan={viewMode === 'month' ? 7 : 6} style={{ textAlign: 'center', padding: '30px', color: '#94a3b8', fontSize: '11px !important' }}>
                      No attendance records found matching the selected filters.
                    </td>
                  </tr>
                ) : (
                  activeDisplayList.map((item, index) => {
                    const { staff, date, record, onLeave, leaveDetails, lateInfo, status } = item;
                    const hasPunchIn = !!record?.punchInTime;
                    const hasPunchOut = !!record?.punchOutTime;

                    return (
                      <tr
                        key={`${staff.id || staff.name}_${date}_${index}`}
                        style={{
                          borderBottom: '1px solid #f1f5f9',
                          transition: 'background 0.1s ease',
                          background: lateInfo?.isLate ? '#fffbfb' : 'transparent'
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
                        onMouseLeave={e => e.currentTarget.style.background = lateInfo?.isLate ? '#fffbfb' : 'transparent'}
                      >
                        {/* Employee Info */}
                        <td style={{ padding: '7px 10px' }}>
                          <div style={{ fontWeight: 800, color: '#0f172a', fontSize: '11.5px !important' }}>
                            {staff.name}
                          </div>
                          <div style={{ fontSize: '10px !important', color: '#64748b' }}>
                            ID #{staff.id || '-'} • {staff.phone || staff.mobile || 'No Phone'}
                          </div>
                          <div style={{ fontSize: '9.5px !important', color: '#94a3b8' }}>
                            {staff.role || 'Regular Staff'}
                          </div>
                        </td>

                        {/* Branch & Shift */}
                        <td style={{ padding: '7px 10px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '3px', fontWeight: 700, color: '#334155', fontSize: '11px !important' }}>
                            <Building2 size={11} color="#258ec8" /> {staff.branch || 'KPHB'}
                          </div>
                          <div style={{ fontSize: '10px !important', color: '#64748b' }}>
                            Shift: {staff.shift || '10:00 AM - 08:30 PM'}
                          </div>
                          {staff.salary && (
                            <div style={{ fontSize: '9.5px !important', color: '#16a34a', fontWeight: 600 }}>
                              Base: {staff.salary}
                            </div>
                          )}
                        </td>

                        {/* Date (for Month View) */}
                        {viewMode === 'month' && (
                          <td style={{ padding: '7px 10px', fontWeight: 700, color: '#0f172a', fontSize: '11px !important' }}>
                            {date}
                          </td>
                        )}

                        {/* Punch In Record (with 15m Late Badge) */}
                        <td style={{ padding: '7px 10px' }}>
                          {hasPunchIn ? (
                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                              {/* Photo Thumbnail */}
                              {record?.punchInPhoto ? (
                                <button
                                  onClick={() => setPreviewPhoto({
                                    url: record.punchInPhoto!,
                                    staffName: staff.name,
                                    type: 'Punch In',
                                    time: record.punchInTime,
                                    date,
                                    branch: staff.branch,
                                    location: record.punchInLocation?.address
                                  })}
                                  title="Click to view captured selfie"
                                  style={{
                                    position: 'relative',
                                    padding: 0,
                                    border: lateInfo?.isLate ? '1.5px solid #ef4444' : '1.5px solid #22c55e',
                                    borderRadius: '6px',
                                    background: 'none',
                                    cursor: 'pointer',
                                    overflow: 'hidden',
                                    width: '30px',
                                    height: '30px',
                                    flexShrink: 0
                                  }}
                                >
                                  <img
                                    src={record.punchInPhoto}
                                    alt="Selfie"
                                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                  />
                                  <div style={{
                                    position: 'absolute',
                                    bottom: 0,
                                    right: 0,
                                    background: lateInfo?.isLate ? '#ef4444' : '#22c55e',
                                    padding: '1px',
                                    borderRadius: '2px 0 0 0'
                                  }}>
                                    <Camera size={7} color="#ffffff" />
                                  </div>
                                </button>
                              ) : (
                                <div style={{
                                  width: '30px',
                                  height: '30px',
                                  borderRadius: '6px',
                                  background: '#f1f5f9',
                                  border: '1px solid #e2e8f0',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  color: '#94a3b8',
                                  flexShrink: 0
                                }}>
                                  <Camera size={13} />
                                </div>
                              )}

                              {/* Time & Late Warning Badge */}
                              <div style={{ minWidth: 0 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap' }}>
                                  <span style={{ fontWeight: 800, color: lateInfo?.isLate ? '#dc2626' : '#16a34a', fontSize: '11.5px !important' }}>
                                    {record?.punchInTime}
                                  </span>
                                  {lateInfo?.isLate && (
                                    <span style={{
                                      background: '#fee2e2',
                                      color: '#dc2626',
                                      padding: '1px 5px',
                                      borderRadius: '4px',
                                      fontSize: '9.5px !important',
                                      fontWeight: 800,
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '2px',
                                      border: '1px solid #fca5a5'
                                    }}>
                                      ⚠️ LATE (+{lateInfo.lateMinutes}m)
                                    </span>
                                  )}
                                </div>

                                {record?.punchInLocation && (
                                  <button
                                    onClick={() => setPreviewLocation({
                                      staffName: staff.name,
                                      type: 'Punch In',
                                      time: record.punchInTime,
                                      date,
                                      branch: staff.branch,
                                      address: record.punchInLocation?.address,
                                      latitude: record.punchInLocation?.latitude,
                                      longitude: record.punchInLocation?.longitude
                                    })}
                                    title="View GPS Coordinates & Map Link"
                                    style={{
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '2px',
                                      background: 'none',
                                      border: 'none',
                                      padding: 0,
                                      color: '#0284c7',
                                      fontSize: '10px !important',
                                      fontWeight: 600,
                                      cursor: 'pointer',
                                      textAlign: 'left',
                                      maxWidth: '180px',
                                      overflow: 'hidden',
                                      textOverflow: 'ellipsis',
                                      whiteSpace: 'nowrap'
                                    }}
                                  >
                                    <MapPin size={10} color="#0284c7" />
                                    <span style={{ textDecoration: 'underline' }}>
                                      {record.punchInLocation.address || `${record.punchInLocation.latitude}, ${record.punchInLocation.longitude}`}
                                    </span>
                                  </button>
                                )}
                              </div>
                            </div>
                          ) : onLeave ? (
                            <div style={{ color: '#b45309', fontWeight: 700, fontSize: '10.5px !important' }}>
                              🟡 Leave: {leaveDetails?.leaveType || 'Approved'}
                            </div>
                          ) : (
                            <span style={{ color: '#94a3b8', fontStyle: 'italic', fontSize: '10.5px !important' }}>
                              Not Clocked In
                            </span>
                          )}
                        </td>

                        {/* Punch Out Record */}
                        <td style={{ padding: '7px 10px' }}>
                          {hasPunchOut ? (
                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                              {(record as any)?.punchOutPhoto ? (
                                <button
                                  onClick={() => setPreviewPhoto({
                                    url: (record as any).punchOutPhoto,
                                    staffName: staff.name,
                                    type: 'Punch Out',
                                    time: record.punchOutTime!,
                                    date,
                                    branch: staff.branch,
                                    location: record.punchOutLocation?.address
                                  })}
                                  title="Click to view punch out selfie"
                                  style={{
                                    position: 'relative',
                                    padding: 0,
                                    border: '1.5px solid #ef4444',
                                    borderRadius: '6px',
                                    background: 'none',
                                    cursor: 'pointer',
                                    overflow: 'hidden',
                                    width: '30px',
                                    height: '30px',
                                    flexShrink: 0
                                  }}
                                >
                                  <img
                                    src={(record as any).punchOutPhoto}
                                    alt="Selfie Out"
                                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                  />
                                  <div style={{
                                    position: 'absolute',
                                    bottom: 0,
                                    right: 0,
                                    background: '#ef4444',
                                    padding: '1px',
                                    borderRadius: '2px 0 0 0'
                                  }}>
                                    <Camera size={7} color="#ffffff" />
                                  </div>
                                </button>
                              ) : (
                                <div style={{
                                  width: '30px',
                                  height: '30px',
                                  borderRadius: '6px',
                                  background: '#f8fafc',
                                  border: '1px solid #e2e8f0',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  color: '#94a3b8',
                                  flexShrink: 0
                                }}>
                                  <Clock size={13} color="#ef4444" />
                                </div>
                              )}

                              <div style={{ minWidth: 0 }}>
                                <div style={{ fontWeight: 800, color: '#dc2626', fontSize: '11.5px !important' }}>
                                  {record?.punchOutTime}
                                </div>
                                {record?.punchOutLocation ? (
                                  <button
                                    onClick={() => setPreviewLocation({
                                      staffName: staff.name,
                                      type: 'Punch Out',
                                      time: record.punchOutTime!,
                                      date,
                                      branch: staff.branch,
                                      address: record.punchOutLocation?.address,
                                      latitude: record.punchOutLocation?.latitude,
                                      longitude: record.punchOutLocation?.longitude
                                    })}
                                    style={{
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '2px',
                                      background: 'none',
                                      border: 'none',
                                      padding: 0,
                                      color: '#0284c7',
                                      fontSize: '10px !important',
                                      fontWeight: 600,
                                      cursor: 'pointer',
                                      textAlign: 'left',
                                      maxWidth: '180px',
                                      overflow: 'hidden',
                                      textOverflow: 'ellipsis',
                                      whiteSpace: 'nowrap'
                                    }}
                                  >
                                    <MapPin size={10} color="#0284c7" />
                                    <span style={{ textDecoration: 'underline' }}>
                                      {record.punchOutLocation.address || `${record.punchOutLocation.latitude}, ${record.punchOutLocation.longitude}`}
                                    </span>
                                  </button>
                                ) : (
                                  <div style={{ fontSize: '9.5px !important', color: '#64748b' }}>Clinic Exit</div>
                                )}
                              </div>
                            </div>
                          ) : hasPunchIn ? (
                            <span style={{ color: '#d97706', fontSize: '10.5px !important', fontWeight: 700 }}>
                              ⏱️ On Duty (Pending)
                            </span>
                          ) : (
                            <span style={{ color: '#94a3b8', fontStyle: 'italic', fontSize: '10.5px !important' }}>
                              --:--
                            </span>
                          )}
                        </td>

                        {/* Duration / Hours */}
                        <td style={{ padding: '7px 10px' }}>
                          {record?.workingHours ? (
                            <span style={{ fontWeight: 800, color: '#0f172a', background: '#f1f5f9', padding: '2px 6px', borderRadius: '5px', fontSize: '10.5px !important' }}>
                              {record.workingHours}
                            </span>
                          ) : hasPunchIn ? (
                            <span style={{ color: '#16a34a', fontSize: '10px !important', fontWeight: 700 }}>
                              Active Shift
                            </span>
                          ) : (
                            <span style={{ color: '#94a3b8', fontSize: '10.5px !important' }}>--</span>
                          )}
                        </td>

                        {/* Status Badge */}
                        <td style={{ padding: '7px 10px' }}>
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '3px',
                            fontSize: '9.5px !important',
                            fontWeight: 800,
                            padding: '2px 6px',
                            borderRadius: '5px',
                            background:
                              status === 'Completed' ? '#eff6ff' :
                                status === 'Late' ? '#fef2f2' :
                                  status === 'Present' ? '#f0fdf4' :
                                    status === 'On Leave' ? '#fefce8' : '#f8fafc',
                            color:
                              status === 'Completed' ? '#1d4ed8' :
                                status === 'Late' ? '#dc2626' :
                                  status === 'Present' ? '#15803d' :
                                    status === 'On Leave' ? '#b45309' : '#64748b',
                            border:
                              status === 'Completed' ? '1px solid #bfdbfe' :
                                status === 'Late' ? '1px solid #fca5a5' :
                                  status === 'Present' ? '1px solid #bbf7d0' :
                                    status === 'On Leave' ? '1px solid #fef08a' : '1px solid #e2e8f0'
                          }}>
                            {status === 'Completed' ? '✓ SHIFT DONE' :
                              status === 'Late' ? '⚠️ LATE (>15m)' :
                                status === 'Present' ? '🟢 PRESENT' :
                                  status === 'On Leave' ? '🟡 ON LEAVE' : '🔴 ABSENT'}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* VIEW 3: STAFF-WISE MONTHLY ANALYSIS TABLE                           */}
      {/* =================================================================== */}
      {viewMode === 'analysis' && (
        <div style={{
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '12px',
          overflow: 'hidden',
          boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
        }}>
          <div style={{
            padding: '12px 16px',
            borderBottom: '1px solid #e2e8f0',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            background: '#f8fafc',
            flexWrap: 'wrap',
            gap: '8px'
          }}>
            <div>
              <h3 style={{ fontSize: '13px !important', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                📊 Staff-Wise Monthly Attendance & Leave Analysis ({selectedMonth})
              </h3>
              <span style={{ fontSize: '11px !important', color: '#64748b' }}>
                Summary of days present, leaves taken, late marks (&gt;15 min), and total logged hours
              </span>
            </div>
            <div style={{ fontSize: '11px !important', color: '#64748b' }}>
              Click <strong>"View Person Report"</strong> on any staff member for their complete daily ledger
            </div>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '11.5px !important' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569' }}>
                  <th style={{ padding: '10px 12px', fontWeight: 800 }}>Employee</th>
                  <th style={{ padding: '10px 12px', fontWeight: 800 }}>Branch & Shift</th>
                  <th style={{ padding: '10px 12px', fontWeight: 800, color: '#16a34a', textAlign: 'center' }}>🟢 Days Present</th>
                  <th style={{ padding: '10px 12px', fontWeight: 800, color: '#dc2626', textAlign: 'center' }}>🔴 Days Absent</th>
                  <th style={{ padding: '10px 12px', fontWeight: 800, color: '#ca8a04', textAlign: 'center' }}>🟡 No. of Leaves</th>
                  <th style={{ padding: '10px 12px', fontWeight: 800, color: '#dc2626', textAlign: 'center' }}>⚠️ Late Marks (&gt;15m)</th>
                  <th style={{ padding: '10px 12px', fontWeight: 800, color: '#0284c7', textAlign: 'center' }}>⏱️ Hours Worked</th>
                  <th style={{ padding: '10px 12px', fontWeight: 800, textAlign: 'center' }}>Punctuality Rate</th>
                  <th style={{ padding: '10px 12px', fontWeight: 800, textAlign: 'center' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {staffMonthlyAnalysis.length === 0 ? (
                  <tr>
                    <td colSpan={9} style={{ textAlign: 'center', padding: '30px', color: '#94a3b8' }}>
                      No staff members found matching the selected branch or search filter.
                    </td>
                  </tr>
                ) : (
                  staffMonthlyAnalysis.map(item => (
                    <tr
                      key={item.staff.id}
                      style={{ borderBottom: '1px solid #f1f5f9', transition: 'background 0.1s ease' }}
                      onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
                      {/* Employee Info */}
                      <td style={{ padding: '10px 12px' }}>
                        <div style={{ fontWeight: 800, color: '#0f172a', fontSize: '12px !important' }}>
                          {item.staff.name}
                        </div>
                        <div style={{ fontSize: '10.5px !important', color: '#64748b' }}>
                          ID #{item.staff.id} • {item.staff.phone || item.staff.mobile || 'No Phone'}
                        </div>
                        <div style={{ fontSize: '10px !important', color: '#94a3b8' }}>
                          {item.staff.role || 'Regular Staff'}
                        </div>
                      </td>

                      {/* Branch & Shift */}
                      <td style={{ padding: '10px 12px' }}>
                        <div style={{ fontWeight: 700, color: '#0284c7', fontSize: '11px !important' }}>
                          {item.staff.branch || 'KPHB'} Branch
                        </div>
                        <div style={{ fontSize: '10px !important', color: '#64748b' }}>
                          {item.staff.shift || '10:00 AM - 08:30 PM'}
                        </div>
                      </td>

                      {/* Days Present */}
                      <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                        <span style={{
                          display: 'inline-block',
                          padding: '3px 10px',
                          borderRadius: '6px',
                          background: '#f0fdf4',
                          color: '#15803d',
                          fontWeight: 800,
                          border: '1px solid #bbf7d0'
                        }}>
                          {item.presentCount} Days
                        </span>
                      </td>

                      {/* Days Absent */}
                      <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                        <span style={{
                          display: 'inline-block',
                          padding: '3px 10px',
                          borderRadius: '6px',
                          background: item.absentCount > 0 ? '#fef2f2' : '#f8fafc',
                          color: item.absentCount > 0 ? '#b91c1c' : '#94a3b8',
                          fontWeight: 800,
                          border: item.absentCount > 0 ? '1px solid #fecaca' : '1px solid #e2e8f0'
                        }}>
                          {item.absentCount} Days
                        </span>
                      </td>

                      {/* Number of Leaves */}
                      <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                        <span style={{
                          display: 'inline-block',
                          padding: '3px 10px',
                          borderRadius: '6px',
                          background: item.leaveDaysCount > 0 ? '#fefce8' : '#f8fafc',
                          color: item.leaveDaysCount > 0 ? '#a16207' : '#94a3b8',
                          fontWeight: 800,
                          border: item.leaveDaysCount > 0 ? '1px solid #fef08a' : '1px solid #e2e8f0'
                        }}>
                          {item.leaveDaysCount} Days
                          {item.approvedLeavesCount > 0 && (
                            <span style={{ fontSize: '9.5px !important', display: 'block', fontWeight: 600 }}>
                              ({item.approvedLeavesCount} leaves)
                            </span>
                          )}
                        </span>
                      </td>

                      {/* Late Marks (>15m) */}
                      <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '3px',
                          padding: '3px 10px',
                          borderRadius: '6px',
                          background: item.lateMarksCount > 0 ? '#fee2e2' : '#f8fafc',
                          color: item.lateMarksCount > 0 ? '#dc2626' : '#94a3b8',
                          fontWeight: 800,
                          border: item.lateMarksCount > 0 ? '1.5px solid #fca5a5' : '1px solid #e2e8f0'
                        }}>
                          {item.lateMarksCount > 0 ? `⚠️ ${item.lateMarksCount} Late` : '0 Late'}
                        </span>
                      </td>

                      {/* Hours Worked */}
                      <td style={{ padding: '10px 12px', textAlign: 'center', fontWeight: 800, color: '#0f172a' }}>
                        {item.totalHours} hrs
                      </td>

                      {/* Punctuality Rate */}
                      <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px' }}>
                          <span style={{
                            fontWeight: 800,
                            color: item.punctualityScore >= 90 ? '#15803d' : item.punctualityScore >= 75 ? '#ca8a04' : '#dc2626'
                          }}>
                            {item.punctualityScore}%
                          </span>
                          <div style={{ width: '60px', height: '5px', background: '#e2e8f0', borderRadius: '3px', overflow: 'hidden' }}>
                            <div style={{
                              width: `${item.punctualityScore}%`,
                              height: '100%',
                              background: item.punctualityScore >= 90 ? '#22c55e' : item.punctualityScore >= 75 ? '#eab308' : '#ef4444'
                            }} />
                          </div>
                        </div>
                      </td>

                      {/* Action: View Person Report */}
                      <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                        <button
                          onClick={() => {
                            setSelectedPersonStaffId(item.staff.id);
                            setViewMode('person');
                          }}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '5px 10px',
                            borderRadius: '6px',
                            background: '#eff6ff',
                            color: '#258ec8',
                            border: '1px solid #bfdbfe',
                            fontWeight: 700,
                            fontSize: '11px !important',
                            cursor: 'pointer'
                          }}
                        >
                          <User size={12} /> View Person Report
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* VIEW 4: PERSON-TO-PERSON INDIVIDUAL REPORT                          */}
      {/* =================================================================== */}
      {viewMode === 'person' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* Individual Employee Profile Banner */}
          {selectedStaffObj && (
            <div style={{
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '12px',
              padding: '14px 18px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '12px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  width: '46px',
                  height: '46px',
                  borderRadius: '12px',
                  background: '#eff6ff',
                  border: '2px solid #bfdbfe',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#258ec8',
                  fontSize: '18px',
                  fontWeight: 800
                }}>
                  {selectedStaffObj.name.charAt(0)}
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <h2 style={{ fontSize: '16px !important', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                      {selectedStaffObj.name}
                    </h2>
                    <span style={{
                      padding: '2px 8px',
                      borderRadius: '6px',
                      background: '#eff6ff',
                      color: '#0369a1',
                      fontSize: '10.5px !important',
                      fontWeight: 800
                    }}>
                      {selectedStaffObj.branch || 'KPHB'} Branch
                    </span>
                  </div>
                  <div style={{ fontSize: '11.5px !important', color: '#64748b', marginTop: '2px' }}>
                    Role: <strong>{selectedStaffObj.role || 'Regular Staff'}</strong> • ID #{selectedStaffObj.id} • Phone: {selectedStaffObj.phone || selectedStaffObj.mobile || '90301 76176'}
                  </div>
                  <div style={{ fontSize: '11px !important', color: '#0284c7', marginTop: '1px', fontWeight: 600 }}>
                    Shift: {selectedStaffObj.shift || '10:00 AM - 08:30 PM'} {selectedStaffObj.salary ? `• Salary: ${selectedStaffObj.salary}` : ''}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <button
                  onClick={() => setViewMode('analysis')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '6px 12px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    background: '#f8fafc',
                    color: '#475569',
                    fontSize: '11.5px !important',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  <ArrowLeft size={13} /> Back to Staff Analysis
                </button>
                <button
                  onClick={() => window.print()}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '6px 12px',
                    borderRadius: '8px',
                    border: '1px solid #258ec8',
                    background: '#258ec8',
                    color: '#ffffff',
                    fontSize: '11.5px !important',
                    fontWeight: 800,
                    cursor: 'pointer'
                  }}
                >
                  <Printer size={13} /> Print Ledger
                </button>
              </div>
            </div>
          )}

          {/* Individual Day-by-Day Calendar Ledger Table */}
          <div style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '12px',
            overflow: 'hidden',
            boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
          }}>
            <div style={{
              padding: '10px 14px',
              borderBottom: '1px solid #e2e8f0',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: '#f8fafc'
            }}>
              <h3 style={{ fontSize: '12.5px !important', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                📅 Complete Date-Wise Monthly Ledger: {selectedStaffObj?.name} ({selectedMonth})
              </h3>
              <span style={{ fontSize: '10.5px !important', color: '#64748b' }}>
                Grace Period: 15 minutes past shift start time ({selectedStaffObj?.shift || '10:00 AM'})
              </span>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '11px !important' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569' }}>
                    <th style={{ padding: '8px 10px', fontWeight: 800 }}>Date & Day</th>
                    <th style={{ padding: '8px 10px', fontWeight: 800 }}>Scheduled Shift</th>
                    <th style={{ padding: '8px 10px', fontWeight: 800, color: '#16a34a' }}>🟢 Login / Punch In</th>
                    <th style={{ padding: '8px 10px', fontWeight: 800, color: '#dc2626' }}>🔴 Logout / Punch Out</th>
                    <th style={{ padding: '8px 10px', fontWeight: 800 }}>Working Hours</th>
                    <th style={{ padding: '8px 10px', fontWeight: 800 }}>GPS Location</th>
                    <th style={{ padding: '8px 10px', fontWeight: 800 }}>Status & Remarks</th>
                  </tr>
                </thead>
                <tbody>
                  {personDailyLedger.map(item => {
                    const isSun = item.isSunday;
                    const hasRecord = !!item.record?.punchInTime;
                    const isLate = item.lateInfo.isLate;

                    return (
                      <tr
                        key={item.dateStr}
                        style={{
                          borderBottom: '1px solid #f1f5f9',
                          background: isSun ? '#f8fafc' : isLate ? '#fff8f8' : item.leave ? '#fefce8' : 'transparent',
                          transition: 'background 0.1s ease'
                        }}
                      >
                        {/* Date & Day */}
                        <td style={{ padding: '8px 10px' }}>
                          <span style={{ fontWeight: 800, color: isSun ? '#94a3b8' : '#0f172a' }}>
                            {item.dateStr}
                          </span>
                          <span style={{
                            marginLeft: '6px',
                            fontSize: '10px !important',
                            fontWeight: 700,
                            padding: '1px 5px',
                            borderRadius: '4px',
                            background: isSun ? '#e2e8f0' : '#eff6ff',
                            color: isSun ? '#64748b' : '#0284c7'
                          }}>
                            {item.dayName}
                          </span>
                        </td>

                        {/* Scheduled Shift */}
                        <td style={{ padding: '8px 10px', color: '#475569' }}>
                          {isSun ? 'Weekly Off' : selectedStaffObj?.shift || '10:00 AM - 08:30 PM'}
                        </td>

                        {/* Login Time with 15m Late Badge */}
                        <td style={{ padding: '8px 10px' }}>
                          {hasRecord ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              {item.record?.punchInPhoto ? (
                                <button
                                  onClick={() => setPreviewPhoto({
                                    url: item.record!.punchInPhoto!,
                                    staffName: selectedStaffObj.name,
                                    type: 'Punch In',
                                    time: item.record!.punchInTime,
                                    date: item.dateStr,
                                    branch: selectedStaffObj.branch,
                                    location: item.record!.punchInLocation?.address
                                  })}
                                  style={{
                                    border: isLate ? '1.5px solid #ef4444' : '1.5px solid #22c55e',
                                    borderRadius: '5px',
                                    width: '26px',
                                    height: '26px',
                                    padding: 0,
                                    overflow: 'hidden',
                                    cursor: 'pointer'
                                  }}
                                >
                                  <img src={item.record.punchInPhoto} alt="Punch In" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                </button>
                              ) : null}

                              <div>
                                <span style={{ fontWeight: 800, color: isLate ? '#dc2626' : '#16a34a' }}>
                                  {item.record?.punchInTime}
                                </span>
                                {isLate && (
                                  <span style={{
                                    marginLeft: '6px',
                                    background: '#fee2e2',
                                    color: '#dc2626',
                                    padding: '1px 5px',
                                    borderRadius: '4px',
                                    fontSize: '9.5px !important',
                                    fontWeight: 800,
                                    border: '1px solid #fca5a5'
                                  }}>
                                    ⚠️ LATE (+{item.lateInfo.lateMinutes}m)
                                  </span>
                                )}
                              </div>
                            </div>
                          ) : item.leave ? (
                            <span style={{ color: '#b45309', fontWeight: 700 }}>
                              🟡 On Leave: {item.leave.leaveType}
                            </span>
                          ) : isSun ? (
                            <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>Weekly Off</span>
                          ) : (
                            <span style={{ color: '#ef4444', fontWeight: 600 }}>Absent / No Punch</span>
                          )}
                        </td>

                        {/* Logout Time */}
                        <td style={{ padding: '8px 10px' }}>
                          {item.record?.punchOutTime ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              {(item.record as any).punchOutPhoto ? (
                                <button
                                  onClick={() => setPreviewPhoto({
                                    url: (item.record as any).punchOutPhoto,
                                    staffName: selectedStaffObj.name,
                                    type: 'Punch Out',
                                    time: item.record!.punchOutTime!,
                                    date: item.dateStr,
                                    branch: selectedStaffObj.branch,
                                    location: item.record!.punchOutLocation?.address
                                  })}
                                  style={{
                                    border: '1.5px solid #ef4444',
                                    borderRadius: '5px',
                                    width: '26px',
                                    height: '26px',
                                    padding: 0,
                                    overflow: 'hidden',
                                    cursor: 'pointer'
                                  }}
                                >
                                  <img src={(item.record as any).punchOutPhoto} alt="Punch Out" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                </button>
                              ) : null}
                              <span style={{ fontWeight: 800, color: '#dc2626' }}>
                                {item.record.punchOutTime}
                              </span>
                            </div>
                          ) : hasRecord ? (
                            <span style={{ color: '#d97706', fontWeight: 700 }}>On Duty (Pending)</span>
                          ) : (
                            <span style={{ color: '#94a3b8' }}>--:--</span>
                          )}
                        </td>

                        {/* Working Hours */}
                        <td style={{ padding: '8px 10px', fontWeight: 700, color: '#0f172a' }}>
                          {item.record?.workingHours || (hasRecord && item.record?.punchOutTime ? 'Logged' : '--')}
                        </td>

                        {/* GPS Location */}
                        <td style={{ padding: '8px 10px' }}>
                          {item.record?.punchInLocation ? (
                            <button
                              onClick={() => setPreviewLocation({
                                staffName: selectedStaffObj.name,
                                type: 'Punch In',
                                time: item.record!.punchInTime,
                                date: item.dateStr,
                                branch: selectedStaffObj.branch,
                                address: item.record!.punchInLocation?.address,
                                latitude: item.record!.punchInLocation?.latitude,
                                longitude: item.record!.punchInLocation?.longitude
                              })}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '2px',
                                background: 'none',
                                border: 'none',
                                padding: 0,
                                color: '#0284c7',
                                cursor: 'pointer',
                                fontSize: '10.5px !important',
                                maxWidth: '160px',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap'
                              }}
                            >
                              <MapPin size={11} color="#0284c7" />
                              <span style={{ textDecoration: 'underline' }}>
                                {item.record.punchInLocation.address || 'SPH Clinic'}
                              </span>
                            </button>
                          ) : (
                            <span style={{ color: '#94a3b8' }}>--</span>
                          )}
                        </td>

                        {/* Status Badge */}
                        <td style={{ padding: '8px 10px' }}>
                          <span style={{
                            display: 'inline-block',
                            padding: '2px 8px',
                            borderRadius: '5px',
                            fontSize: '10px !important',
                            fontWeight: 800,
                            background:
                              item.dayStatus === 'Completed' ? '#eff6ff' :
                                item.dayStatus === 'Late' ? '#fee2e2' :
                                  item.dayStatus === 'Present' ? '#f0fdf4' :
                                    item.dayStatus === 'On Leave' ? '#fefce8' :
                                      item.dayStatus === 'Weekend Off' ? '#f1f5f9' : '#fef2f2',
                            color:
                              item.dayStatus === 'Completed' ? '#1d4ed8' :
                                item.dayStatus === 'Late' ? '#dc2626' :
                                  item.dayStatus === 'Present' ? '#15803d' :
                                    item.dayStatus === 'On Leave' ? '#b45309' :
                                      item.dayStatus === 'Weekend Off' ? '#64748b' : '#b91c1c',
                            border:
                              item.dayStatus === 'Completed' ? '1px solid #bfdbfe' :
                                item.dayStatus === 'Late' ? '1px solid #fca5a5' :
                                  item.dayStatus === 'Present' ? '1px solid #bbf7d0' :
                                    item.dayStatus === 'On Leave' ? '1px solid #fef08a' :
                                      item.dayStatus === 'Weekend Off' ? '1px solid #e2e8f0' : '1px solid #fecaca'
                          }}>
                            {item.dayStatus === 'Completed' ? '✓ SHIFT DONE' :
                              item.dayStatus === 'Late' ? '⚠️ LATE (>15m)' :
                                item.dayStatus === 'Present' ? '🟢 PRESENT' :
                                  item.dayStatus === 'On Leave' ? `🟡 LEAVE (${item.leave?.leaveType || 'Approved'})` :
                                    item.dayStatus === 'Weekend Off' ? 'WEEKEND OFF' :
                                      item.dayStatus === 'Upcoming' ? 'UPCOMING' : '🔴 ABSENT'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* 5. MODAL: FULL PREVIEW SELFIE PHOTO                                 */}
      {/* =================================================================== */}
      {previewPhoto && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.75)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '16px'
        }}>
          <div style={{
            background: '#ffffff',
            borderRadius: '16px',
            maxWidth: '420px',
            width: '100%',
            overflow: 'hidden',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)'
          }}>
            <div style={{
              padding: '12px 16px',
              borderBottom: '1px solid #e2e8f0',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: '#f8fafc'
            }}>
              <div>
                <h3 style={{ fontSize: '13px !important', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                  {previewPhoto.type} Selfie Verification
                </h3>
                <span style={{ fontSize: '11px !important', color: '#64748b' }}>
                  {previewPhoto.staffName} • {previewPhoto.branch} Branch
                </span>
              </div>
              <button
                onClick={() => setPreviewPhoto(null)}
                style={{
                  background: '#f1f5f9',
                  border: 'none',
                  borderRadius: '6px',
                  width: '26px',
                  height: '26px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: '#475569'
                }}
              >
                <X size={15} />
              </button>
            </div>

            <div style={{ padding: '16px', textAlign: 'center', background: '#0f172a' }}>
              <img
                src={previewPhoto.url}
                alt="Captured Selfie"
                style={{
                  maxWidth: '100%',
                  maxHeight: '340px',
                  borderRadius: '10px',
                  objectFit: 'contain',
                  boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)'
                }}
              />
            </div>

            <div style={{ padding: '12px 16px', background: '#f8fafc', borderTop: '1px solid #e2e8f0', fontSize: '11px !important', color: '#64748b' }}>
              <div>📅 Recorded Date: <strong>{previewPhoto.date}</strong> at <strong>{previewPhoto.time}</strong></div>
              {previewPhoto.location && (
                <div style={{ marginTop: '3px' }}>📍 Location: {previewPhoto.location}</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* 6. MODAL: GPS LOCATION DETAILS                                      */}
      {/* =================================================================== */}
      {previewLocation && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.75)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '16px'
        }}>
          <div style={{
            background: '#ffffff',
            borderRadius: '16px',
            maxWidth: '440px',
            width: '100%',
            overflow: 'hidden',
            padding: '16px',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <div style={{
                  width: '30px',
                  height: '30px',
                  borderRadius: '8px',
                  background: '#eff6ff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#258ec8'
                }}>
                  <MapPin size={17} />
                </div>
                <div>
                  <h3 style={{ fontSize: '13px !important', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                    GPS Location Details
                  </h3>
                  <span style={{ fontSize: '11px !important', color: '#64748b' }}>
                    {previewLocation.staffName} ({previewLocation.type})
                  </span>
                </div>
              </div>
              <button
                onClick={() => setPreviewLocation(null)}
                style={{
                  background: '#f1f5f9',
                  border: 'none',
                  borderRadius: '6px',
                  width: '26px',
                  height: '26px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: '#475569'
                }}
              >
                <X size={15} />
              </button>
            </div>

            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '10px', marginBottom: '12px' }}>
              <div style={{ fontSize: '10.5px !important', color: '#64748b', marginBottom: '2px' }}>
                Captured Address:
              </div>
              <div style={{ fontSize: '12px !important', fontWeight: 700, color: '#0f172a' }}>
                {previewLocation.address || 'SPH Clinic Premise'}
              </div>

              {previewLocation.latitude !== undefined && previewLocation.longitude !== undefined && (
                <div style={{ marginTop: '6px', fontSize: '11px !important', color: '#0369a1', fontWeight: 600 }}>
                  Coordinates: {previewLocation.latitude}° N, {previewLocation.longitude}° E
                </div>
              )}

              <div style={{ marginTop: '6px', fontSize: '10px !important', color: '#64748b' }}>
                Recorded on {previewLocation.date} at {previewLocation.time} • {previewLocation.branch} Branch
              </div>
            </div>

            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              {previewLocation.latitude !== undefined && previewLocation.longitude !== undefined && (
                <a
                  href={`https://www.google.com/maps?q=${previewLocation.latitude},${previewLocation.longitude}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '6px 12px',
                    borderRadius: '6px',
                    background: '#eff6ff',
                    color: '#258ec8',
                    border: '1px solid #bfdbfe',
                    fontWeight: 700,
                    fontSize: '11px !important',
                    textDecoration: 'none'
                  }}
                >
                  <ExternalLink size={12} /> Open in Google Maps
                </a>
              )}
              <button
                onClick={() => setPreviewLocation(null)}
                style={{
                  padding: '6px 14px',
                  borderRadius: '6px',
                  background: '#258ec8',
                  color: '#ffffff',
                  border: 'none',
                  fontWeight: 700,
                  fontSize: '11px !important',
                  cursor: 'pointer'
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
