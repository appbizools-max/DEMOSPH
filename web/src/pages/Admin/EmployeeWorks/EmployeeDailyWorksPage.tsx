import React, { useState, useEffect, useMemo } from 'react';
import {
  PhoneCall, Star, Repeat, Users, Video, FileText, Calendar,
  Building2, Search, CheckCircle2, Clock, Filter, ChevronLeft,
  ChevronRight, ArrowUpDown, ChevronDown, ChevronUp, Download
} from 'lucide-react';
import { collection, query, onSnapshot, orderBy, doc, setDoc } from 'firebase/firestore';
import { db, StaffDailyReport } from '@app/shared';

export const EmployeeDailyWorksPage: React.FC = () => {
  // Mode: Day-wise vs Month-wise
  const [viewMode, setViewMode] = useState<'day' | 'month'>('day');

  // Branch Filter
  const [selectedBranch, setSelectedBranch] = useState<string>('All');

  // Search Filter
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Day-wise Date State (Default Today)
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  });

  // Month-wise Date State (Default Current Month: YYYY-MM)
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });

  // Expanded Staff ID in Month-wise mode for breakdown
  const [expandedStaffId, setExpandedStaffId] = useState<string | null>(null);

  const [dailyReports, setDailyReports] = useState<StaffDailyReport[]>([]);
  const [staffList, setStaffList] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // 1. Fetch Staff Directory & Ensure Aishwarya . M is included
  useEffect(() => {
    if (!db) return;
    const unsub = onSnapshot(collection(db, 'staff'), async (snap) => {
      const list: any[] = [];
      snap.forEach(d => list.push({ id: d.id, ...d.data() }));

      const defaultClinicStaff = [
        { id: '1', name: 'Anil Kumar M', branch: 'KPHB', role: 'Regular Staff', phone: '9030176176' },
        { id: '2', name: 'Ashwini Begari', branch: 'Chandanagar', role: 'Regular Staff', phone: '9553176176' },
        { id: '3', name: 'Vaishnavi Peri', branch: 'Nallagandla', role: 'Regular Staff', phone: '9132176176' },
        { id: '4', name: 'Nandini Gottelli', branch: 'Dilshuknagar', role: 'Regular Staff', phone: '9804176176' },
        { id: '5', name: 'Srikanth', branch: 'KPHB', role: 'Regular Staff', phone: '9030176176' },
        { id: '6', name: 'Arun Kumar', branch: 'Nallagandla', role: 'Regular Staff', phone: '9132176176' },
        { id: '7', name: 'Aishwarya . M', branch: 'KPHB', role: 'Regular Staff', phone: '7995532759', mobile: '7995532759', shiftType: 'Single Strict', loginTime: '10:00 AM', logoutTime: '08:30 PM', shift: '10:00 AM - 08:30 PM', hours: '10.5 hrs/day', salary: '₹14,000' },
      ];

      // Auto-sync missing members like Aishwarya to Firestore
      for (const stf of defaultClinicStaff) {
        const found = list.find(d => d.id === stf.id || d.name?.toLowerCase() === stf.name.toLowerCase() || d.phone === stf.phone || d.mobile === stf.phone);
        if (!found && db) {
          try {
            await setDoc(doc(db, 'staff', stf.id), stf, { merge: true });
            list.push(stf);
          } catch (_) { }
        } else if (found && stf.id === '7' && (found.salary !== '₹14,000' || found.logoutTime !== '08:30 PM') && db) {
          try {
            await setDoc(doc(db, 'staff', found.id || '7'), {
              salary: '₹14,000',
              shiftType: 'Single Strict',
              loginTime: '10:00 AM',
              logoutTime: '08:30 PM',
              shift: '10:00 AM - 08:30 PM',
              hours: '10.5 hrs/day'
            }, { merge: true });
          } catch (_) { }
        }
      }

      if (list.length === 0) {
        setStaffList(defaultClinicStaff);
      } else {
        setStaffList(list);
      }
    }, (err) => console.warn('Error fetching staff list:', err));

    return () => unsub();
  }, []);

  // 2. Fetch Live Daily Reports from Firestore
  useEffect(() => {
    if (!db) return;
    setIsLoading(true);
    const q = query(collection(db, 'staff_reports'), orderBy('submittedAt', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      const reports: StaffDailyReport[] = [];
      snap.forEach(d => {
        reports.push({ id: d.id, ...(d.data() as any) });
      });
      setDailyReports(reports);
      setIsLoading(false);
    }, (err) => {
      console.warn('Error fetching staff reports:', err);
      setIsLoading(false);
    });

    return () => unsub();
  }, []);

  // Date Shift Helpers (Day-wise)
  const handleShiftDate = (days: number) => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + days);
    setSelectedDate(d.toISOString().split('T')[0]);
  };

  const handleResetToToday = () => {
    const d = new Date();
    setSelectedDate(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`);
  };

  // Month Shift Helpers (Month-wise)
  const handleShiftMonth = (months: number) => {
    const [yStr, mStr] = selectedMonth.split('-');
    const dateObj = new Date(parseInt(yStr, 10), parseInt(mStr, 10) - 1 + months, 1);
    const newY = dateObj.getFullYear();
    const newM = String(dateObj.getMonth() + 1).padStart(2, '0');
    setSelectedMonth(`${newY}-${newM}`);
  };

  const handleResetToCurrentMonth = () => {
    const d = new Date();
    setSelectedMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  };

  // Compute Yesterday's Date string for the selected day
  const yesterdayDate = useMemo(() => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() - 1);
    return d.toISOString().split('T')[0];
  }, [selectedDate]);

  // Filtered staff based on branch and search
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

  // Reports belonging to the selected month
  const monthReports = useMemo(() => {
    return dailyReports.filter(rep => {
      const repDate = rep.date || '';
      if (!repDate.startsWith(selectedMonth)) return false;

      if (selectedBranch !== 'All') {
        const repBranch = (rep.branch || '').toLowerCase();
        const sel = selectedBranch.toLowerCase();
        if (!repBranch.includes(sel) && !sel.includes(repBranch)) return false;
      }
      return true;
    });
  }, [dailyReports, selectedMonth, selectedBranch]);

  // Day-wise Table Data: One row per filtered staff member
  const dayTableRows = useMemo(() => {
    return filteredStaff.map(staff => {
      // Find today's report
      const todayReport = dailyReports.find(r =>
        (String(r.staffId) === String(staff.id) || r.staffName === staff.name) && r.date === selectedDate
      );

      // Find yesterday's report
      const yestReport = dailyReports.find(r =>
        (String(r.staffId) === String(staff.id) || r.staffName === staff.name) && r.date === yesterdayDate
      );

      return {
        staff,
        isSubmitted: !!todayReport,
        todayReport,
        totalCalls: todayReport?.totalCalls ?? todayReport?.callsCount ?? 0,
        followUps: todayReport?.followUps ?? 0,
        contacts: todayReport?.contacts ?? 0,
        gReviews: todayReport?.gReviews ?? todayReport?.reviewsCount ?? 0,
        videoReviews: todayReport?.videoReviews ?? 0,
        submittedAt: todayReport?.submittedAt,
        yesterdayReport: yestReport ? {
          isSubmitted: true,
          totalCalls: yestReport.totalCalls ?? yestReport.callsCount ?? 0,
          followUps: yestReport.followUps ?? 0,
          contacts: yestReport.contacts ?? 0,
          gReviews: yestReport.gReviews ?? yestReport.reviewsCount ?? 0,
          videoReviews: yestReport.videoReviews ?? 0,
        } : {
          isSubmitted: false
        }
      };
    });
  }, [filteredStaff, dailyReports, selectedDate, yesterdayDate]);

  // Month-wise Table Data: Aggregated monthly statistics per staff
  const monthTableRows = useMemo(() => {
    return filteredStaff.map(staff => {
      const staffMonthReports = monthReports.filter(r =>
        String(r.staffId) === String(staff.id) || r.staffName === staff.name
      );

      const daysSubmitted = staffMonthReports.length;
      const totalCalls = staffMonthReports.reduce((sum, r) => sum + (r.totalCalls ?? r.callsCount ?? 0), 0);
      const followUps = staffMonthReports.reduce((sum, r) => sum + (r.followUps ?? 0), 0);
      const contacts = staffMonthReports.reduce((sum, r) => sum + (r.contacts ?? 0), 0);
      const gReviews = staffMonthReports.reduce((sum, r) => sum + (r.gReviews ?? r.reviewsCount ?? 0), 0);
      const videoReviews = staffMonthReports.reduce((sum, r) => sum + (r.videoReviews ?? 0), 0);

      // Find most recent submission in this month for yesterday/latest report column
      const sortedReports = [...staffMonthReports].sort((a, b) => (b.date || '').localeCompare(a.date || ''));
      const latestReport = sortedReports[0] || null;

      return {
        staff,
        daysSubmitted,
        totalCalls,
        followUps,
        contacts,
        gReviews,
        videoReviews,
        avgCallsPerDay: daysSubmitted > 0 ? (totalCalls / daysSubmitted).toFixed(1) : '0',
        latestReport,
        history: sortedReports
      };
    });
  }, [filteredStaff, monthReports]);

  // Active Cumulative Totals (Based on selected ViewMode)
  const activeTotals = useMemo(() => {
    if (viewMode === 'day') {
      return dayTableRows.reduce((acc, row) => {
        if (row.isSubmitted) {
          acc.totalCalls += row.totalCalls;
          acc.followUps += row.followUps;
          acc.contacts += row.contacts;
          acc.gReviews += row.gReviews;
          acc.videoReviews += row.videoReviews;
          acc.submittedCount += 1;
        }
        return acc;
      }, { totalCalls: 0, followUps: 0, contacts: 0, gReviews: 0, videoReviews: 0, submittedCount: 0 });
    } else {
      return monthTableRows.reduce((acc, row) => {
        acc.totalCalls += row.totalCalls;
        acc.followUps += row.followUps;
        acc.contacts += row.contacts;
        acc.gReviews += row.gReviews;
        acc.videoReviews += row.videoReviews;
        if (row.daysSubmitted > 0) acc.submittedCount += 1;
        return acc;
      }, { totalCalls: 0, followUps: 0, contacts: 0, gReviews: 0, videoReviews: 0, submittedCount: 0 });
    }
  }, [viewMode, dayTableRows, monthTableRows]);

  // CSV Export Helper
  const handleExportCSV = () => {
    let headers: string[] = [];
    let rows: any[] = [];

    if (viewMode === 'day') {
      headers = ['Staff Name', 'Branch', 'Date', "Yesterday's Status", 'Total Calls', 'Follow Ups', 'Contacts', 'G-Reviews', 'Video Reviews', 'Submission Status'];
      rows = dayTableRows.map(r => [
        `"${r.staff.name || ''}"`,
        `"${r.staff.branch || ''}"`,
        r.todayReport?.date || selectedDate,
        r.yesterdayReport.isSubmitted ? `Submitted (${r.yesterdayReport.totalCalls} Calls)` : 'Pending',
        r.totalCalls,
        r.followUps,
        r.contacts,
        r.gReviews,
        r.videoReviews,
        r.isSubmitted ? 'Submitted' : 'Pending'
      ]);
    } else {
      headers = ['Staff Name', 'Branch', 'Month', 'Days Logged', 'Total Calls', 'Follow Ups', 'Contacts', 'G-Reviews', 'Video Reviews', 'Avg Calls/Day'];
      rows = monthTableRows.map(r => [
        `"${r.staff.name || ''}"`,
        `"${r.staff.branch || ''}"`,
        selectedMonth,
        r.daysSubmitted,
        r.totalCalls,
        r.followUps,
        r.contacts,
        r.gReviews,
        r.videoReviews,
        r.avgCallsPerDay
      ]);
    }

    const csvContent = [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `employee_works_${viewMode}_${viewMode === 'day' ? selectedDate : selectedMonth}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const branchOptions = ['All', 'KPHB', 'Chandanagar', 'Nallagandla', 'Dilshuknagar'];

  return (
    <div style={{ padding: '24px 20px', maxWidth: '1360px', margin: '0 auto', fontFamily: 'inherit' }}>

      {/* 1. Header Banner & View Switcher */}
      <div style={{
        background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
        borderRadius: '16px',
        padding: '20px 24px',
        color: '#ffffff',
        marginBottom: '18px',
        boxShadow: '0 4px 20px rgba(15, 23, 42, 0.15)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <span style={{ background: '#258ec8', color: '#ffffff', padding: '3px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 800 }}>
                ADMIN & HR MASTER REPORT
              </span>
              <span style={{ fontSize: '12px', color: '#94a3b8' }}>
                Firebase Firestore • Real-time
              </span>
            </div>
            <h1 style={{ fontSize: '22px', fontWeight: 900, margin: 0 }}>
              Employee Daily Works Table
            </h1>
            <p style={{ margin: '4px 0 0 0', fontSize: '12.5px', color: '#94a3b8' }}>
              Tabular day-wise and month-wise performance reports across all clinic branches
            </p>
          </div>

          {/* Right Controls: Mode Toggle + Date/Month Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>

            {/* Day / Month Segmented Switcher */}
            <div style={{
              display: 'flex',
              background: 'rgba(255,255,255,0.1)',
              padding: '3px',
              borderRadius: '10px',
              border: '1px solid rgba(255,255,255,0.15)'
            }}>
              <button
                type="button"
                onClick={() => setViewMode('day')}
                style={{
                  padding: '6px 14px',
                  borderRadius: '7px',
                  border: 'none',
                  background: viewMode === 'day' ? '#258ec8' : 'transparent',
                  color: '#ffffff',
                  fontSize: '12px',
                  fontWeight: 800,
                  cursor: 'pointer',
                  transition: 'all 0.15s'
                }}
              >
                Day-wise
              </button>
              <button
                type="button"
                onClick={() => setViewMode('month')}
                style={{
                  padding: '6px 14px',
                  borderRadius: '7px',
                  border: 'none',
                  background: viewMode === 'month' ? '#258ec8' : 'transparent',
                  color: '#ffffff',
                  fontSize: '12px',
                  fontWeight: 800,
                  cursor: 'pointer',
                  transition: 'all 0.15s'
                }}
              >
                Month-wise
              </button>
            </div>

            {/* Date Shifter (If Day-wise) */}
            {viewMode === 'day' ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(255,255,255,0.08)', padding: '4px 8px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.15)' }}>
                <button
                  onClick={() => handleShiftDate(-1)}
                  style={{ background: 'transparent', border: 'none', color: '#ffffff', fontSize: '14px', cursor: 'pointer', padding: '4px 6px' }}
                  title="Previous Day"
                >
                  <ChevronLeft size={16} />
                </button>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  style={{
                    background: '#ffffff',
                    color: '#0f172a',
                    border: 'none',
                    padding: '4px 8px',
                    borderRadius: '6px',
                    fontWeight: 800,
                    fontSize: '12px',
                    cursor: 'pointer'
                  }}
                />
                <button
                  onClick={() => handleShiftDate(1)}
                  style={{ background: 'transparent', border: 'none', color: '#ffffff', fontSize: '14px', cursor: 'pointer', padding: '4px 6px' }}
                  title="Next Day"
                >
                  <ChevronRight size={16} />
                </button>
                <button
                  onClick={handleResetToToday}
                  style={{
                    background: '#258ec8',
                    color: '#ffffff',
                    border: 'none',
                    padding: '4px 8px',
                    borderRadius: '6px',
                    fontSize: '11px',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  Today
                </button>
              </div>
            ) : (
              /* Month Shifter (If Month-wise) */
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(255,255,255,0.08)', padding: '4px 8px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.15)' }}>
                <button
                  onClick={() => handleShiftMonth(-1)}
                  style={{ background: 'transparent', border: 'none', color: '#ffffff', fontSize: '14px', cursor: 'pointer', padding: '4px 6px' }}
                  title="Previous Month"
                >
                  <ChevronLeft size={16} />
                </button>
                <input
                  type="month"
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  style={{
                    background: '#ffffff',
                    color: '#0f172a',
                    border: 'none',
                    padding: '4px 8px',
                    borderRadius: '6px',
                    fontWeight: 800,
                    fontSize: '12px',
                    cursor: 'pointer'
                  }}
                />
                <button
                  onClick={() => handleShiftMonth(1)}
                  style={{ background: 'transparent', border: 'none', color: '#ffffff', fontSize: '14px', cursor: 'pointer', padding: '4px 6px' }}
                  title="Next Month"
                >
                  <ChevronRight size={16} />
                </button>
                <button
                  onClick={handleResetToCurrentMonth}
                  style={{
                    background: '#258ec8',
                    color: '#ffffff',
                    border: 'none',
                    padding: '4px 8px',
                    borderRadius: '6px',
                    fontSize: '11px',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  This Month
                </button>
              </div>
            )}

            {/* Export CSV Button */}
            <button
              onClick={handleExportCSV}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                background: '#0d9488',
                color: '#ffffff',
                border: 'none',
                padding: '7px 12px',
                borderRadius: '8px',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer',
                boxShadow: '0 2px 6px rgba(13, 148, 136, 0.3)'
              }}
              title="Export as CSV spreadsheet"
            >
              <Download size={14} /> Export CSV
            </button>
          </div>
        </div>

        {/* Branch Filter Pills */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '16px', paddingTop: '12px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
          <span style={{ fontSize: '11.5px', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '4px', marginRight: '4px' }}>
            <Filter size={13} /> Branch:
          </span>
          {branchOptions.map(b => (
            <button
              key={b}
              onClick={() => setSelectedBranch(b)}
              style={{
                background: selectedBranch === b ? '#258ec8' : 'rgba(255,255,255,0.08)',
                border: selectedBranch === b ? '1px solid #38bdf8' : '1px solid transparent',
                color: '#ffffff',
                padding: '4px 12px',
                borderRadius: '6px',
                fontSize: '11.5px',
                fontWeight: selectedBranch === b ? 800 : 500,
                cursor: 'pointer',
                transition: 'all 0.15s'
              }}
            >
              {b === 'All' ? 'All Branches' : `${b} Branch`}
            </button>
          ))}
        </div>
      </div>

      {/* 2. Top 6 Cumulative Compact KPI Metrics */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '10px', marginBottom: '16px' }}>
        {/* Total Calls */}
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '10px 12px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
            <span style={{ fontSize: '10.5px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.3px' }}>Total Calls</span>
            <div style={{ background: '#eff6ff', padding: '5px', borderRadius: '7px' }}>
              <PhoneCall size={14} color="#2563eb" />
            </div>
          </div>
          <div style={{ fontSize: '19px', fontWeight: 900, color: '#0284c7', lineHeight: 1.2 }}>
            {activeTotals.totalCalls}
          </div>
          <div style={{ fontSize: '10px', color: '#64748b', marginTop: '2px' }}>
            {viewMode === 'day' ? 'Calls on date' : 'Total calls in month'}
          </div>
        </div>

        {/* Follow Ups */}
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '10px 12px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
            <span style={{ fontSize: '10.5px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.3px' }}>Follow Ups</span>
            <div style={{ background: '#f0fdf4', padding: '5px', borderRadius: '7px' }}>
              <Repeat size={14} color="#16a34a" />
            </div>
          </div>
          <div style={{ fontSize: '19px', fontWeight: 900, color: '#16a34a', lineHeight: 1.2 }}>
            {activeTotals.followUps}
          </div>
          <div style={{ fontSize: '10px', color: '#64748b', marginTop: '2px' }}>
            Follow-up calls completed
          </div>
        </div>

        {/* Contacts */}
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '10px 12px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
            <span style={{ fontSize: '10.5px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.3px' }}>Contacts</span>
            <div style={{ background: '#eef2ff', padding: '5px', borderRadius: '7px' }}>
              <Users size={14} color="#4f46e5" />
            </div>
          </div>
          <div style={{ fontSize: '19px', fontWeight: 900, color: '#4f46e5', lineHeight: 1.2 }}>
            {activeTotals.contacts}
          </div>
          <div style={{ fontSize: '10px', color: '#64748b', marginTop: '2px' }}>
            New contacts registered
          </div>
        </div>

        {/* G-Reviews */}
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '10px 12px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
            <span style={{ fontSize: '10.5px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.3px' }}>G-Reviews</span>
            <div style={{ background: '#fefce8', padding: '5px', borderRadius: '7px' }}>
              <Star size={14} color="#ca8a04" />
            </div>
          </div>
          <div style={{ fontSize: '19px', fontWeight: 900, color: '#ca8a04', lineHeight: 1.2 }}>
            {activeTotals.gReviews}
          </div>
          <div style={{ fontSize: '10px', color: '#64748b', marginTop: '2px' }}>
            Google reviews collected
          </div>
        </div>

        {/* Video Reviews */}
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '10px 12px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
            <span style={{ fontSize: '10.5px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.3px' }}>Video Revs</span>
            <div style={{ background: '#fdf2f8', padding: '5px', borderRadius: '7px' }}>
              <Video size={14} color="#db2777" />
            </div>
          </div>
          <div style={{ fontSize: '19px', fontWeight: 900, color: '#db2777', lineHeight: 1.2 }}>
            {activeTotals.videoReviews}
          </div>
          <div style={{ fontSize: '10px', color: '#64748b', marginTop: '2px' }}>
            Video testimonials
          </div>
        </div>

        {/* Submissions */}
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '10px 12px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
            <span style={{ fontSize: '10.5px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.3px' }}>
              {viewMode === 'day' ? 'Submissions' : 'Staff Active'}
            </span>
            <div style={{ background: '#f0fdfa', padding: '5px', borderRadius: '7px' }}>
              <FileText size={14} color="#0d9488" />
            </div>
          </div>
          <div style={{ fontSize: '19px', fontWeight: 900, color: '#0d9488', lineHeight: 1.2 }}>
            {activeTotals.submittedCount} / {filteredStaff.length}
          </div>
          <div style={{ fontSize: '10px', color: '#64748b', marginTop: '2px' }}>
            {viewMode === 'day' ? `Staff submitted on ${selectedDate}` : `Active in ${selectedMonth}`}
          </div>
        </div>
      </div>

      {/* 3. Table Container Card with Search & Controls */}
      <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '18px 20px', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>

        {/* Table Top Bar: Title + Search */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
          <div>
            <h2 style={{ fontSize: '16px', fontWeight: 800, color: '#0f172a', margin: 0 }}>
              {viewMode === 'day'
                ? `Daily Works Report — ${selectedDate} (${selectedBranch === 'All' ? 'All Branches' : `${selectedBranch} Branch`})`
                : `Monthly Consolidated Works — ${selectedMonth} (${selectedBranch === 'All' ? 'All Branches' : `${selectedBranch} Branch`})`
              }
            </h2>
            <p style={{ fontSize: '12px', color: '#64748b', margin: '2px 0 0 0' }}>
              {viewMode === 'day'
                ? `Showing real-time submissions and yesterday's comparison (${yesterdayDate})`
                : `Consolidated month totals and submission consistency per employee`
              }
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {/* Search Input */}
            <div style={{ display: 'flex', alignItems: 'center', background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '4px 10px', width: '220px' }}>
              <Search size={14} color="#64748b" style={{ marginRight: '6px' }} />
              <input
                type="text"
                placeholder="Search staff or branch..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ background: 'transparent', border: 'none', outline: 'none', fontSize: '12px', color: '#0f172a', width: '100%' }}
              />
            </div>
          </div>
        </div>

        {/* 4. Tabular Presentation (DAY-WISE) */}
        {viewMode === 'day' && (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '950px' }}>
              <thead>
                <tr style={{ background: '#f1f5f9', borderBottom: '2px solid #e2e8f0', color: '#475569', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                  <th style={{ padding: '10px 12px' }}>#</th>
                  <th style={{ padding: '10px 12px' }}>Staff Name</th>
                  <th style={{ padding: '10px 12px' }}>Branch</th>
                  <th style={{ padding: '10px 12px', background: '#f8fafc' }}>Yesterday's Report ({yesterdayDate})</th>
                  <th style={{ padding: '10px 12px', textAlign: 'center' }}>Total Calls</th>
                  <th style={{ padding: '10px 12px', textAlign: 'center' }}>Follow Ups</th>
                  <th style={{ padding: '10px 12px', textAlign: 'center' }}>Contacts</th>
                  <th style={{ padding: '10px 12px', textAlign: 'center' }}>G-Reviews</th>
                  <th style={{ padding: '10px 12px', textAlign: 'center' }}>Video Revs</th>
                  <th style={{ padding: '10px 12px', textAlign: 'center' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {dayTableRows.length === 0 ? (
                  <tr>
                    <td colSpan={10} style={{ padding: '36px', textAlign: 'center', color: '#94a3b8', fontSize: '13px' }}>
                      No staff members found matching the selected branch / search filter.
                    </td>
                  </tr>
                ) : (
                  dayTableRows.map((row, idx) => (
                    <tr
                      key={row.staff.id || idx}
                      style={{
                        borderBottom: '1px solid #f1f5f9',
                        background: idx % 2 === 0 ? '#ffffff' : '#fafafa',
                        transition: 'background 0.1s'
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = '#f8fafc')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = idx % 2 === 0 ? '#ffffff' : '#fafafa')}
                    >
                      {/* # */}
                      <td style={{ padding: '11px 12px', fontSize: '12px', color: '#94a3b8', fontWeight: 600 }}>
                        {idx + 1}
                      </td>

                      {/* Staff Name */}
                      <td style={{ padding: '11px 12px' }}>
                        <div style={{ fontSize: '13px', fontWeight: 800, color: '#0f172a' }}>
                          {row.staff.name}
                        </div>
                        <div style={{ fontSize: '11px', color: '#64748b' }}>
                          ID: #{row.staff.id || '-'} • {row.staff.role || 'Staff'}
                        </div>
                      </td>

                      {/* Branch */}
                      <td style={{ padding: '11px 12px' }}>
                        <span style={{
                          fontSize: '11px',
                          fontWeight: 700,
                          padding: '3px 8px',
                          borderRadius: '6px',
                          background: '#f1f5f9',
                          color: '#334155'
                        }}>
                          {row.staff.branch} Branch
                        </span>
                      </td>

                      {/* Yesterday's Report Column */}
                      <td style={{ padding: '11px 12px', background: '#fdfdfe' }}>
                        {row.yesterdayReport.isSubmitted ? (
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '3px' }}>
                              <span style={{
                                fontSize: '10px',
                                fontWeight: 800,
                                background: '#dcfce7',
                                color: '#15803d',
                                padding: '2px 6px',
                                borderRadius: '4px'
                              }}>
                                ✓ SUBMITTED
                              </span>
                            </div>
                            <div style={{ fontSize: '11px', color: '#334155', fontWeight: 600 }}>
                              {row.yesterdayReport.totalCalls} Calls • {row.yesterdayReport.followUps} FollowUps • {row.yesterdayReport.contacts} Contacts
                            </div>
                            <div style={{ fontSize: '10px', color: '#64748b' }}>
                              ⭐ {row.yesterdayReport.gReviews} G-Rev • 📹 {row.yesterdayReport.videoReviews} Video
                            </div>
                          </div>
                        ) : (
                          <span style={{
                            fontSize: '10.5px',
                            fontWeight: 700,
                            background: '#fff1f2',
                            color: '#e11d48',
                            padding: '3px 8px',
                            borderRadius: '6px',
                            display: 'inline-block'
                          }}>
                            ✕ Not Submitted
                          </span>
                        )}
                      </td>

                      {/* Total Calls */}
                      <td style={{ padding: '11px 12px', textAlign: 'center' }}>
                        <span style={{
                          fontSize: '13px',
                          fontWeight: 800,
                          color: row.totalCalls > 0 ? '#0284c7' : '#94a3b8',
                          background: row.totalCalls > 0 ? '#e0f2fe' : 'transparent',
                          padding: row.totalCalls > 0 ? '3px 8px' : '0',
                          borderRadius: '6px'
                        }}>
                          {row.totalCalls}
                        </span>
                      </td>

                      {/* Follow Ups */}
                      <td style={{ padding: '11px 12px', textAlign: 'center' }}>
                        <span style={{
                          fontSize: '13px',
                          fontWeight: 800,
                          color: row.followUps > 0 ? '#16a34a' : '#94a3b8',
                          background: row.followUps > 0 ? '#dcfce7' : 'transparent',
                          padding: row.followUps > 0 ? '3px 8px' : '0',
                          borderRadius: '6px'
                        }}>
                          {row.followUps}
                        </span>
                      </td>

                      {/* Contacts */}
                      <td style={{ padding: '11px 12px', textAlign: 'center' }}>
                        <span style={{
                          fontSize: '13px',
                          fontWeight: 800,
                          color: row.contacts > 0 ? '#4f46e5' : '#94a3b8',
                          background: row.contacts > 0 ? '#e0e7ff' : 'transparent',
                          padding: row.contacts > 0 ? '3px 8px' : '0',
                          borderRadius: '6px'
                        }}>
                          {row.contacts}
                        </span>
                      </td>

                      {/* G-Reviews */}
                      <td style={{ padding: '11px 12px', textAlign: 'center' }}>
                        <span style={{
                          fontSize: '13px',
                          fontWeight: 800,
                          color: row.gReviews > 0 ? '#b45309' : '#94a3b8',
                          background: row.gReviews > 0 ? '#fef3c7' : 'transparent',
                          padding: row.gReviews > 0 ? '3px 8px' : '0',
                          borderRadius: '6px'
                        }}>
                          {row.gReviews}
                        </span>
                      </td>

                      {/* Video Revs */}
                      <td style={{ padding: '11px 12px', textAlign: 'center' }}>
                        <span style={{
                          fontSize: '13px',
                          fontWeight: 800,
                          color: row.videoReviews > 0 ? '#be185d' : '#94a3b8',
                          background: row.videoReviews > 0 ? '#fce7f3' : 'transparent',
                          padding: row.videoReviews > 0 ? '3px 8px' : '0',
                          borderRadius: '6px'
                        }}>
                          {row.videoReviews}
                        </span>
                      </td>

                      {/* Status / Timestamp */}
                      <td style={{ padding: '11px 12px', textAlign: 'center' }}>
                        {row.isSubmitted ? (
                          <div>
                            <span style={{
                              fontSize: '10.5px',
                              fontWeight: 800,
                              background: '#16a34a',
                              color: '#ffffff',
                              padding: '3px 8px',
                              borderRadius: '12px',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}>
                              <CheckCircle2 size={11} /> SUBMITTED
                            </span>
                            {row.submittedAt && (
                              <div style={{ fontSize: '10px', color: '#64748b', marginTop: '3px' }}>
                                {new Date(row.submittedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span style={{
                            fontSize: '10.5px',
                            fontWeight: 700,
                            background: '#fffbeb',
                            color: '#b45309',
                            border: '1px solid #fde68a',
                            padding: '3px 8px',
                            borderRadius: '12px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}>
                            <Clock size={11} /> PENDING
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* 5. Tabular Presentation (MONTH-WISE) */}
        {viewMode === 'month' && (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '950px' }}>
              <thead>
                <tr style={{ background: '#f1f5f9', borderBottom: '2px solid #e2e8f0', color: '#475569', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                  <th style={{ padding: '10px 12px' }}>#</th>
                  <th style={{ padding: '10px 12px' }}>Staff Name</th>
                  <th style={{ padding: '10px 12px' }}>Branch</th>
                  <th style={{ padding: '10px 12px', textAlign: 'center' }}>Days Logged ({selectedMonth})</th>
                  <th style={{ padding: '10px 12px', textAlign: 'center' }}>Total Calls</th>
                  <th style={{ padding: '10px 12px', textAlign: 'center' }}>Follow Ups</th>
                  <th style={{ padding: '10px 12px', textAlign: 'center' }}>Contacts</th>
                  <th style={{ padding: '10px 12px', textAlign: 'center' }}>G-Reviews</th>
                  <th style={{ padding: '10px 12px', textAlign: 'center' }}>Video Revs</th>
                  <th style={{ padding: '10px 12px', textAlign: 'center' }}>Avg Calls/Day</th>
                  <th style={{ padding: '10px 12px', textAlign: 'center' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {monthTableRows.length === 0 ? (
                  <tr>
                    <td colSpan={11} style={{ padding: '36px', textAlign: 'center', color: '#94a3b8', fontSize: '13px' }}>
                      No staff members found matching the selected branch / search filter.
                    </td>
                  </tr>
                ) : (
                  monthTableRows.map((row, idx) => {
                    const isExpanded = expandedStaffId === row.staff.id;
                    return (
                      <React.Fragment key={row.staff.id || idx}>
                        <tr
                          style={{
                            borderBottom: '1px solid #f1f5f9',
                            background: idx % 2 === 0 ? '#ffffff' : '#fafafa',
                            transition: 'background 0.1s'
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.background = '#f8fafc')}
                          onMouseLeave={(e) => (e.currentTarget.style.background = idx % 2 === 0 ? '#ffffff' : '#fafafa')}
                        >
                          <td style={{ padding: '11px 12px', fontSize: '12px', color: '#94a3b8', fontWeight: 600 }}>
                            {idx + 1}
                          </td>

                          <td style={{ padding: '11px 12px' }}>
                            <div style={{ fontSize: '13px', fontWeight: 800, color: '#0f172a' }}>
                              {row.staff.name}
                            </div>
                            <div style={{ fontSize: '11px', color: '#64748b' }}>
                              ID: #{row.staff.id || '-'} • {row.staff.role || 'Staff'}
                            </div>
                          </td>

                          <td style={{ padding: '11px 12px' }}>
                            <span style={{
                              fontSize: '11px',
                              fontWeight: 700,
                              padding: '3px 8px',
                              borderRadius: '6px',
                              background: '#f1f5f9',
                              color: '#334155'
                            }}>
                              {row.staff.branch} Branch
                            </span>
                          </td>

                          <td style={{ padding: '11px 12px', textAlign: 'center' }}>
                            <span style={{
                              fontSize: '12px',
                              fontWeight: 800,
                              background: row.daysSubmitted > 0 ? '#dcfce7' : '#fee2e2',
                              color: row.daysSubmitted > 0 ? '#15803d' : '#b91c1c',
                              padding: '3px 10px',
                              borderRadius: '12px'
                            }}>
                              {row.daysSubmitted} Days Logged
                            </span>
                          </td>

                          <td style={{ padding: '11px 12px', textAlign: 'center' }}>
                            <span style={{ fontSize: '13px', fontWeight: 900, color: '#0284c7' }}>
                              {row.totalCalls}
                            </span>
                          </td>

                          <td style={{ padding: '11px 12px', textAlign: 'center' }}>
                            <span style={{ fontSize: '13px', fontWeight: 900, color: '#16a34a' }}>
                              {row.followUps}
                            </span>
                          </td>

                          <td style={{ padding: '11px 12px', textAlign: 'center' }}>
                            <span style={{ fontSize: '13px', fontWeight: 900, color: '#4f46e5' }}>
                              {row.contacts}
                            </span>
                          </td>

                          <td style={{ padding: '11px 12px', textAlign: 'center' }}>
                            <span style={{ fontSize: '13px', fontWeight: 900, color: '#ca8a04' }}>
                              {row.gReviews}
                            </span>
                          </td>

                          <td style={{ padding: '11px 12px', textAlign: 'center' }}>
                            <span style={{ fontSize: '13px', fontWeight: 900, color: '#db2777' }}>
                              {row.videoReviews}
                            </span>
                          </td>

                          <td style={{ padding: '11px 12px', textAlign: 'center' }}>
                            <span style={{ fontSize: '12px', fontWeight: 800, color: '#0f766e', background: '#f0fdfa', padding: '3px 8px', borderRadius: '6px' }}>
                              {row.avgCallsPerDay} / day
                            </span>
                          </td>

                          <td style={{ padding: '11px 12px', textAlign: 'center' }}>
                            <button
                              onClick={() => setExpandedStaffId(isExpanded ? null : row.staff.id)}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '3px',
                                background: isExpanded ? '#258ec8' : '#f1f5f9',
                                color: isExpanded ? '#ffffff' : '#475569',
                                border: 'none',
                                padding: '4px 8px',
                                borderRadius: '6px',
                                fontSize: '11px',
                                fontWeight: 700,
                                cursor: 'pointer'
                              }}
                            >
                              {isExpanded ? 'Hide' : 'Daily Logs'}
                              {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                            </button>
                          </td>
                        </tr>

                        {/* Expanded Daily Logs Sub-table */}
                        {isExpanded && (
                          <tr style={{ background: '#f8fafc' }}>
                            <td colSpan={11} style={{ padding: '14px 20px', borderBottom: '2px solid #e2e8f0' }}>
                              <div style={{ background: '#ffffff', borderRadius: '10px', padding: '12px 16px', border: '1px solid #e2e8f0' }}>
                                <div style={{ fontSize: '12px', fontWeight: 800, color: '#1e293b', marginBottom: '8px' }}>
                                  🗓️ Daily Breakdown for {row.staff.name} in {selectedMonth} ({row.history.length} records):
                                </div>
                                {row.history.length === 0 ? (
                                  <div style={{ fontSize: '11.5px', color: '#94a3b8' }}>No daily reports submitted in this month yet.</div>
                                ) : (
                                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '8px' }}>
                                    {row.history.map(hist => (
                                      <div key={hist.id} style={{ background: '#f8fafc', padding: '8px 10px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                                          <span style={{ fontSize: '11.5px', fontWeight: 800, color: '#0f172a' }}>{hist.date}</span>
                                          <span style={{ fontSize: '10px', color: '#64748b' }}>
                                            {new Date(hist.submittedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                          </span>
                                        </div>
                                        <div style={{ fontSize: '11px', color: '#334155' }}>
                                          📞 <b>{hist.totalCalls ?? hist.callsCount ?? 0}</b> Calls • 🔁 <b>{hist.followUps ?? 0}</b> FollowUps
                                        </div>
                                        <div style={{ fontSize: '10.5px', color: '#64748b', marginTop: '2px' }}>
                                          👥 {hist.contacts ?? 0} Contacts • ⭐ {hist.gReviews ?? hist.reviewsCount ?? 0} G-Rev • 📹 {hist.videoReviews ?? 0} Video
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
};
