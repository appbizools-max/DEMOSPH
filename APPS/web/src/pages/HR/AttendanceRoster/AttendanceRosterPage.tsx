import React, { useState, useEffect, useMemo } from 'react';
import {
  UserCheck, Clock, Calendar, CheckCircle2, XCircle, AlertCircle,
  MapPin, Camera, FileText, PhoneCall, Star, Filter, Eye, ChevronRight, RefreshCw,
  Users, Video, Repeat
} from 'lucide-react';
import { collection, query, onSnapshot, updateDoc, doc, orderBy } from 'firebase/firestore';
import { db, StaffAttendanceRecord, StaffLeaveRequest, StaffDailyReport } from '@app/shared';

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

export const AttendanceRosterPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'attendance' | 'leaves' | 'reports'>('attendance');
  const [selectedBranch, setSelectedBranch] = useState<string>('All');
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  });

  // State
  const [staffList, setStaffList] = useState<any[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<StaffAttendanceRecord[]>([]);
  const [leaveRequests, setLeaveRequests] = useState<StaffLeaveRequest[]>([]);
  const [dailyReports, setDailyReports] = useState<StaffDailyReport[]>([]);
  const [previewPhoto, setPreviewPhoto] = useState<{ url: string; name: string; time: string; location?: string } | null>(null);

  // Reject Modal
  const [rejectItem, setRejectItem] = useState<StaffLeaveRequest | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  // 1. Staff Directory
  useEffect(() => {
    if (!db) return;
    const unsub = onSnapshot(collection(db, 'staff'), (snap) => {
      const list: any[] = [];
      snap.forEach(d => list.push({ id: d.id, ...d.data() }));
      setStaffList(list);
    }, (err) => console.warn('Staff listener error:', err));
    return () => unsub();
  }, []);

  // 2. Attendance Records
  useEffect(() => {
    if (!db) return;
    const unsub = onSnapshot(query(collection(db, 'attendance'), orderBy('createdAt', 'desc')), (snap) => {
      const list: StaffAttendanceRecord[] = [];
      snap.forEach(d => list.push({ id: d.id, ...(d.data() as any) }));
      setAttendanceRecords(list);
    }, (err) => console.warn('Attendance error:', err));
    return () => unsub();
  }, []);

  // 3. Leave Requests
  useEffect(() => {
    if (!db) return;
    const unsub = onSnapshot(query(collection(db, 'leaves'), orderBy('createdAt', 'desc')), (snap) => {
      const list: StaffLeaveRequest[] = [];
      snap.forEach(d => list.push({ id: d.id, ...(d.data() as any) }));
      setLeaveRequests(list);
    }, (err) => console.warn('Leaves error:', err));
    return () => unsub();
  }, []);

  // 4. Daily Reports
  useEffect(() => {
    if (!db) return;
    const unsub = onSnapshot(query(collection(db, 'staff_reports'), orderBy('submittedAt', 'desc')), (snap) => {
      const list: StaffDailyReport[] = [];
      snap.forEach(d => list.push({ id: d.id, ...(d.data() as any) }));
      setDailyReports(list);
    }, (err) => console.warn('Reports error:', err));
    return () => unsub();
  }, []);

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
      return { staff: stf, record, onLeaveToday, leaveDetails: onLeaveToday };
    }).filter(item => {
      if (selectedBranch === 'All') return true;
      return (item.staff.branch || '').toLowerCase().includes(selectedBranch.toLowerCase());
    });
  }, [staffList, attendanceRecords, leaveRequests, selectedDate, selectedBranch]);

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

  // Approve Leave Action
  const handleApproveLeave = async (leave: StaffLeaveRequest) => {
    if (!leave.id) return;
    setIsProcessing(true);
    try {
      if (db) {
        await updateDoc(doc(db, 'leaves', leave.id), {
          status: 'Approved',
          reviewedBy: 'Admin & HR',
          reviewedAt: new Date().toISOString()
        });
        alert(`Leave Approved for ${leave.staffName} (${leave.fromDate} to ${leave.toDate})`);
      }
    } catch (e) {
      console.error(e);
      alert('Error approving leave.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Reject Leave Action
  const handleConfirmReject = async () => {
    if (!rejectItem?.id) return;
    setIsProcessing(true);
    try {
      if (db) {
        await updateDoc(doc(db, 'leaves', rejectItem.id), {
          status: 'Rejected',
          reviewNotes: rejectReason.trim() || 'Disapproved due to clinic requirements',
          reviewedBy: 'Admin & HR',
          reviewedAt: new Date().toISOString()
        });
        alert(`Leave Rejected for ${rejectItem.staffName}`);
        setRejectItem(null);
        setRejectReason('');
      }
    } catch (e) {
      console.error(e);
      alert('Error rejecting leave.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div style={{ padding: '24px 20px', maxWidth: '1200px', margin: '0 auto', fontFamily: 'inherit' }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '20px',
        flexWrap: 'wrap',
        gap: '14px'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <UserCheck size={26} color="#258ec8" />
            <h1 style={{ fontSize: '22px', fontWeight: 800, color: '#0f172a', margin: 0 }}>
              Staff Attendance & Work Management Portal
            </h1>
          </div>
          <p style={{ fontSize: '13px', color: '#64748b', margin: '4px 0 0 0' }}>
            Live GPS & selfie punch logs across all 4 clinic branches, leave approvals, and daily work reports.
          </p>
        </div>

        {/* Branch Filter */}
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', background: '#f8fafc', padding: '4px 8px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
          <Filter size={14} color="#64748b" />
          {['All', 'KPHB', 'Chandanagar', 'Nallagandla', 'Dilshuknagar'].map(b => (
            <button
              key={b}
              onClick={() => setSelectedBranch(b)}
              style={{
                background: selectedBranch === b ? '#258ec8' : 'transparent',
                color: selectedBranch === b ? '#ffffff' : '#64748b',
                border: 'none',
                padding: '5px 10px',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              {b === 'All' ? 'All Branches' : b}
            </button>
          ))}
        </div>
      </div>

      {/* 3 Main Management Tabs */}
      <div style={{ display: 'flex', gap: '10px', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px', marginBottom: '20px' }}>
        <button
          onClick={() => setActiveTab('attendance')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '8px 16px',
            borderRadius: '8px',
            border: 'none',
            cursor: 'pointer',
            fontWeight: 800,
            fontSize: '13px',
            background: activeTab === 'attendance' ? '#258ec8' : '#f1f5f9',
            color: activeTab === 'attendance' ? '#ffffff' : '#475569'
          }}
        >
          <Clock size={16} /> Live Punch Logs ({filteredAttendance.filter(a => a.record?.punchInTime).length} Present)
        </button>

        <button
          onClick={() => setActiveTab('leaves')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '8px 16px',
            borderRadius: '8px',
            border: 'none',
            cursor: 'pointer',
            fontWeight: 800,
            fontSize: '13px',
            background: activeTab === 'leaves' ? '#258ec8' : '#f1f5f9',
            color: activeTab === 'leaves' ? '#ffffff' : '#475569'
          }}
        >
          <Calendar size={16} /> Leave Applications ({leaveRequests.filter(l => l.status === 'Pending').length} Pending)
        </button>

        <button
          onClick={() => setActiveTab('reports')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '8px 16px',
            borderRadius: '8px',
            border: 'none',
            cursor: 'pointer',
            fontWeight: 800,
            fontSize: '13px',
            background: activeTab === 'reports' ? '#258ec8' : '#f1f5f9',
            color: activeTab === 'reports' ? '#ffffff' : '#475569'
          }}
        >
          <FileText size={16} /> Daily Work Reports ({dailyReports.length})
        </button>
      </div>

      {/* TAB 1: LIVE PUNCH ATTENDANCE LOGS */}
      {activeTab === 'attendance' && (
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '18px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <label style={{ fontSize: '13px', fontWeight: 700, color: '#334155' }}>Inspection Date:</label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
              />
              <button
                onClick={() => {
                  const d = new Date();
                  setSelectedDate(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`);
                }}
                style={{ background: '#e0f2fe', color: '#0369a1', border: 'none', padding: '6px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}
              >
                Today
              </button>
            </div>

            <div style={{ fontSize: '12px', color: '#64748b' }}>
              Showing {filteredAttendance.length} Staff Members
            </div>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                  <th style={{ padding: '10px' }}>Staff Name</th>
                  <th style={{ padding: '10px' }}>Branch & Shift</th>
                  <th style={{ padding: '10px' }}>Punch In</th>
                  <th style={{ padding: '10px' }}>Punch Out</th>
                  <th style={{ padding: '10px' }}>Hours</th>
                  <th style={{ padding: '10px' }}>GPS Location Verification</th>
                  <th style={{ padding: '10px' }}>Selfie Photo</th>
                  <th style={{ padding: '10px' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredAttendance.map(({ staff, record, onLeaveToday, leaveDetails }) => {
                  const isPresent = !!record?.punchInTime;
                  const isDone = !!record?.punchOutTime;

                  return (
                    <tr key={staff.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '10px', fontWeight: 800, color: '#0f172a' }}>
                        {staff.name}
                        <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 500 }}>ID #{staff.id} • {staff.mobile || staff.phone}</div>
                      </td>
                      <td style={{ padding: '10px', color: '#475569' }}>
                        <span style={{ fontWeight: 700 }}>{staff.branch}</span>
                        <div style={{ fontSize: '11px', color: '#94a3b8' }}>{staff.shift || '10:00 AM - 08:30 PM'}</div>
                      </td>
                      <td style={{ padding: '10px', fontWeight: 800, color: isPresent ? '#16a34a' : '#94a3b8' }}>
                        {record?.punchInTime || '--:--'}
                      </td>
                      <td style={{ padding: '10px', fontWeight: 800, color: isDone ? '#dc2626' : '#94a3b8' }}>
                        {record?.punchOutTime || '--:--'}
                      </td>
                      <td style={{ padding: '10px', fontWeight: 700, color: '#0f172a' }}>
                        {record?.workingHours || '--'}
                      </td>
                      <td style={{ padding: '10px', fontSize: '11.5px', color: '#0f766e' }}>
                        {record?.punchInLocation ? (
                          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <MapPin size={13} /> {record.punchInLocation.address}
                          </span>
                        ) : onLeaveToday ? (
                          <span style={{ color: '#ca8a04' }}>Approved Leave: {leaveDetails?.leaveType}</span>
                        ) : (
                          <span style={{ color: '#94a3b8' }}>Not Clocked In</span>
                        )}
                      </td>
                      <td style={{ padding: '10px' }}>
                        {record?.punchInPhoto ? (
                          <button
                            onClick={() => setPreviewPhoto({
                              url: record.punchInPhoto || '',
                              name: staff.name,
                              time: record.punchInTime,
                              location: record.punchInLocation?.address
                            })}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                          >
                            <img src={record.punchInPhoto} alt="Selfie" style={{ width: '32px', height: '32px', borderRadius: '6px', objectFit: 'cover', border: '1px solid #cbd5e1' }} />
                          </button>
                        ) : (
                          <span style={{ fontSize: '11px', color: '#94a3b8' }}>--</span>
                        )}
                      </td>
                      <td style={{ padding: '10px' }}>
                        <span style={{
                          fontSize: '11px',
                          fontWeight: 800,
                          padding: '3px 8px',
                          borderRadius: '6px',
                          background: onLeaveToday ? '#fefce8' : isDone ? '#eff6ff' : isPresent ? '#f0fdf4' : '#fef2f2',
                          color: onLeaveToday ? '#ca8a04' : isDone ? '#2563eb' : isPresent ? '#16a34a' : '#ef4444'
                        }}>
                          {onLeaveToday ? 'ON LEAVE' : isDone ? 'SHIFT DONE' : isPresent ? 'PRESENT' : 'ABSENT'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: LEAVE APPLICATIONS WITH ACCEPT & REJECT */}
      {activeTab === 'leaves' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 4px' }}>
            <span style={{ fontSize: '13px', fontWeight: 700, color: '#475569' }}>
              Staff Leave Requests (Showing latest {Math.min(10, filteredLeaves.length)}{filteredLeaves.length > 10 ? ` of ${filteredLeaves.length}` : ''})
            </span>
          </div>
          {filteredLeaves.length === 0 ? (
            <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '40px', textAlign: 'center', color: '#94a3b8' }}>
              <Calendar size={36} style={{ margin: '0 auto 10px auto', display: 'block' }} />
              No staff leave requests submitted.
            </div>
          ) : (
            filteredLeaves.slice(0, 10).map(leave => (
              <div
                key={leave.id}
                style={{
                  background: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '16px',
                  padding: '16px 20px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '14px'
                }}
              >
                <div style={{ flex: 1, minWidth: '280px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <h4 style={{ fontSize: '15px', fontWeight: 800, color: '#0f172a', margin: 0 }}>{leave.staffName}</h4>
                    <span style={{ fontSize: '11px', fontWeight: 700, background: '#f1f5f9', color: '#475569', padding: '2px 8px', borderRadius: '4px' }}>
                      {leave.branch} Branch
                    </span>
                    <span style={{
                      fontSize: '11px',
                      fontWeight: 800,
                      padding: '2px 8px',
                      borderRadius: '4px',
                      background: leave.status === 'Approved' ? '#f0fdf4' : leave.status === 'Rejected' ? '#fef2f2' : '#fefce8',
                      color: leave.status === 'Approved' ? '#16a34a' : leave.status === 'Rejected' ? '#ef4444' : '#ca8a04'
                    }}>
                      {leave.status}
                    </span>
                  </div>

                  <div style={{ fontSize: '13px', color: '#0284c7', fontWeight: 700, margin: '2px 0' }}>
                    📅 {leave.leaveType} Leave: {leave.fromDate} to {leave.toDate} ({leave.daysCount} Days)
                  </div>
                  {(leave as any).joiningDate && (
                    <div style={{ fontSize: '12.5px', color: '#0369a1', fontWeight: 700, margin: '2px 0' }}>
                      🏢 Joining Date: {(leave as any).joiningDate}
                    </div>
                  )}

                  <div style={{ fontSize: '12.5px', color: '#475569', marginTop: '4px' }}>
                    <strong>Reason:</strong> {leave.reason}
                  </div>

                  {leave.reviewNotes && (
                    <div style={{ fontSize: '12px', color: '#dc2626', marginTop: '2px' }}>
                      <strong>Admin Note:</strong> {leave.reviewNotes}
                    </div>
                  )}
                </div>

                {/* Accept & Reject Buttons for Pending Requests */}
                {leave.status === 'Pending' ? (
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button
                      onClick={() => setRejectItem(leave)}
                      disabled={isProcessing}
                      style={{
                        background: '#fef2f2',
                        color: '#ef4444',
                        border: '1px solid #fecaca',
                        padding: '8px 16px',
                        borderRadius: '8px',
                        fontWeight: 800,
                        fontSize: '12.5px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}
                    >
                      <XCircle size={15} /> Reject
                    </button>

                    <button
                      onClick={() => handleApproveLeave(leave)}
                      disabled={isProcessing}
                      style={{
                        background: '#16a34a',
                        color: '#ffffff',
                        border: 'none',
                        padding: '8px 18px',
                        borderRadius: '8px',
                        fontWeight: 800,
                        fontSize: '12.5px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}
                    >
                      <CheckCircle2 size={15} /> Accept & Approve
                    </button>
                  </div>
                ) : (
                  <div style={{ fontSize: '12px', color: '#64748b' }}>
                    Reviewed by {leave.reviewedBy || 'Admin/HR'}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* TAB 3: STAFF DAILY WORK REPORTS */}
      {activeTab === 'reports' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Summary Metric Tiles (6 Tiles) */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
            <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '14px', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ background: '#eff6ff', padding: '10px', borderRadius: '10px' }}>
                <PhoneCall size={20} color="#2563eb" />
              </div>
              <div>
                <div style={{ fontSize: '20px', fontWeight: 900, color: '#0284c7' }}>{reportTotals.totalCalls}</div>
                <div style={{ fontSize: '11.5px', color: '#64748b' }}>Total Calls</div>
              </div>
            </div>

            <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '14px', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ background: '#f0fdf4', padding: '10px', borderRadius: '10px' }}>
                <Repeat size={20} color="#16a34a" />
              </div>
              <div>
                <div style={{ fontSize: '20px', fontWeight: 900, color: '#16a34a' }}>{reportTotals.followUps}</div>
                <div style={{ fontSize: '11.5px', color: '#64748b' }}>Follow Ups</div>
              </div>
            </div>

            <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '14px', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ background: '#eef2ff', padding: '10px', borderRadius: '10px' }}>
                <Users size={20} color="#4f46e5" />
              </div>
              <div>
                <div style={{ fontSize: '20px', fontWeight: 900, color: '#4f46e5' }}>{reportTotals.contacts}</div>
                <div style={{ fontSize: '11.5px', color: '#64748b' }}>Contacts</div>
              </div>
            </div>

            <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '14px', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ background: '#fefce8', padding: '10px', borderRadius: '10px' }}>
                <Star size={20} color="#ca8a04" />
              </div>
              <div>
                <div style={{ fontSize: '20px', fontWeight: 900, color: '#ca8a04' }}>{reportTotals.gReviews}</div>
                <div style={{ fontSize: '11.5px', color: '#64748b' }}>G-Reviews</div>
              </div>
            </div>

            <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '14px', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ background: '#fdf2f8', padding: '10px', borderRadius: '10px' }}>
                <Video size={20} color="#db2777" />
              </div>
              <div>
                <div style={{ fontSize: '20px', fontWeight: 900, color: '#db2777' }}>{reportTotals.videoReviews}</div>
                <div style={{ fontSize: '11.5px', color: '#64748b' }}>Video Reviews</div>
              </div>
            </div>

            <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '14px', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ background: '#f0fdfa', padding: '10px', borderRadius: '10px' }}>
                <FileText size={20} color="#0d9488" />
              </div>
              <div>
                <div style={{ fontSize: '20px', fontWeight: 900, color: '#0d9488' }}>{filteredReports.length}</div>
                <div style={{ fontSize: '11.5px', color: '#64748b' }}>Reports Logged</div>
              </div>
            </div>
          </div>

          {/* Reports Table */}
          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '18px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#0f172a', marginBottom: '14px' }}>
              Staff Daily Work Submissions Log
            </h3>

            {filteredReports.length === 0 ? (
              <p style={{ fontSize: '13px', color: '#94a3b8' }}>No daily work reports submitted.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {filteredReports.map(rep => (
                  <div key={rep.id} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '14px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap', gap: '8px' }}>
                      <div>
                        <span style={{ fontWeight: 800, fontSize: '14px', color: '#0f172a' }}>{rep.staffName}</span>
                        <span style={{ fontSize: '11px', background: '#e0f2fe', color: '#0369a1', padding: '2px 8px', borderRadius: '4px', marginLeft: '8px', fontWeight: 700 }}>
                          {rep.branch} Branch
                        </span>
                      </div>
                      <div style={{ fontSize: '12px', color: '#64748b' }}>
                        📅 Date: <strong>{rep.date}</strong> ({new Date(rep.submittedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})
                      </div>
                    </div>

                    {/* 5-Metrics Badges */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', margin: '8px 0' }}>
                      <span style={{ background: '#eff6ff', color: '#2563eb', padding: '4px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <PhoneCall size={13} /> {rep.totalCalls ?? rep.callsCount ?? 0} Total Calls
                      </span>
                      <span style={{ background: '#f0fdf4', color: '#16a34a', padding: '4px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Repeat size={13} /> {rep.followUps ?? 0} Follow Ups
                      </span>
                      <span style={{ background: '#eef2ff', color: '#4f46e5', padding: '4px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Users size={13} /> {rep.contacts ?? 0} Contacts
                      </span>
                      <span style={{ background: '#fefce8', color: '#ca8a04', padding: '4px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Star size={13} /> {rep.gReviews ?? rep.reviewsCount ?? 0} G-Reviews
                      </span>
                      <span style={{ background: '#fdf2f8', color: '#db2777', padding: '4px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Video size={13} /> {rep.videoReviews ?? 0} Video Reviews
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Selfie Photo Preview Modal */}
      {previewPhoto && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.65)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999
        }}>
          <div style={{ background: '#ffffff', borderRadius: '16px', padding: '20px', maxWidth: '340px', textAlign: 'center' }}>
            <h4 style={{ margin: '0 0 12px 0', fontSize: '16px', fontWeight: 800 }}>Punch-In Selfie Verification</h4>
            <img src={previewPhoto.url} alt="Selfie Verification" style={{ width: '260px', height: '260px', borderRadius: '12px', objectFit: 'cover' }} />
            <div style={{ marginTop: '10px', fontWeight: 800, fontSize: '14px', color: '#0f172a' }}>{previewPhoto.name}</div>
            <div style={{ fontSize: '12px', color: '#16a34a', fontWeight: 700 }}>In Time: {previewPhoto.time}</div>
            {previewPhoto.location && (
              <div style={{ fontSize: '11px', color: '#0f766e', marginTop: '4px' }}>📍 {previewPhoto.location}</div>
            )}
            <div style={{ marginTop: '16px' }}>
              <button
                onClick={() => setPreviewPhoto(null)}
                style={{ background: '#0f172a', color: '#ffffff', border: 'none', padding: '8px 24px', borderRadius: '8px', fontWeight: 700, cursor: 'pointer' }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Reason Modal */}
      {rejectItem && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.65)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999
        }}>
          <div style={{ background: '#ffffff', borderRadius: '16px', padding: '20px', maxWidth: '380px', width: '100%' }}>
            <h4 style={{ margin: '0 0 8px 0', fontSize: '16px', fontWeight: 800, color: '#dc2626' }}>Reject Leave Application</h4>
            <p style={{ fontSize: '12px', color: '#64748b', margin: '0 0 12px 0' }}>
              Reject leave for <strong>{rejectItem.staffName}</strong> ({leaveRequests.find(l => l.id === rejectItem.id)?.fromDate} to {leaveRequests.find(l => l.id === rejectItem.id)?.toDate})?
            </p>

            <textarea
              rows={3}
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Enter rejection reason / operational note..."
              style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' }}
            />

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '14px' }}>
              <button
                onClick={() => { setRejectItem(null); setRejectReason(''); }}
                style={{ background: '#f1f5f9', color: '#475569', border: 'none', padding: '8px 16px', borderRadius: '8px', fontWeight: 700, cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmReject}
                disabled={isProcessing}
                style={{ background: '#ef4444', color: '#ffffff', border: 'none', padding: '8px 16px', borderRadius: '8px', fontWeight: 800, cursor: 'pointer' }}
              >
                Confirm Reject
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
