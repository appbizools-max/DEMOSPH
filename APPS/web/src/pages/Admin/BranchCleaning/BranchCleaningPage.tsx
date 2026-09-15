import React, { useState, useEffect, useMemo } from 'react';
import {
  Calendar, CheckCircle, Clock, XCircle, AlertCircle, Eye,
  Check, X, Filter, Building2, Sparkles, RefreshCw, ZoomIn, ShieldCheck, ShieldAlert
} from 'lucide-react';
import { db } from '@app/shared';
import {
  collection, doc, getDocs, setDoc, addDoc, updateDoc, onSnapshot, query, where, orderBy
} from 'firebase/firestore';
import {
  CleaningSchedule, CleaningSubmission, BRANCH_LIST,
  getTodayDateString, formatDisplayDate, checkBranchLockoutStatus
} from '../../../utils/cleaningService';

interface BranchCleaningPageProps {
  role?: string;
  currentBranch?: string;
}

export const BranchCleaningPage: React.FC<BranchCleaningPageProps> = ({
  role = 'admin',
  currentBranch = 'All Branches'
}) => {
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
  const [selectedBranchFilter, setSelectedBranchFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'Pending' | 'Approved' | 'Rejected'>('all');

  // Reject modal state
  const [rejectingItem, setRejectingItem] = useState<CleaningSubmission | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  // Lightbox modal state
  const [lightboxImg, setLightboxImg] = useState<string | null>(null);

  // Success toast
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 4000);
  };

  // 1. Listen to schedules for all branches
  useEffect(() => {
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
    }, (err) => console.warn('Admin schedules listener error:', err));
    return () => unsub();
  }, [today]);

  // 2. Listen to all cleaning submissions
  useEffect(() => {
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
      console.warn('Admin submissions listener error:', err);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  // Handle schedule date change for a branch
  const handleUpdateScheduleDate = async (branchName: string, newDate: string) => {
    if (!newDate) return;
    try {
      await setDoc(doc(db, 'branch_cleaning_schedules', branchName), {
        branch: branchName,
        assignedDate: newDate,
        updatedAt: new Date().toISOString(),
        updatedBy: role === 'hr' ? 'HR Manager' : 'Administrator'
      }, { merge: true });

      setSchedules(prev => ({ ...prev, [branchName]: newDate }));
      showToast(`Updated ${branchName} cleaning date to ${formatDisplayDate(newDate)}!`);
    } catch (err) {
      console.error('Error updating cleaning schedule:', err);
      alert('Failed to update cleaning schedule date.');
    }
  };

  // Accept cleaning verification
  const handleAcceptSubmission = async (sub: CleaningSubmission) => {
    if (!sub.id) return;
    setActionLoading(true);
    try {
      await updateDoc(doc(db, 'branch_cleaning_submissions', sub.id), {
        status: 'Approved',
        reviewedAt: new Date().toISOString(),
        reviewedBy: role === 'hr' ? 'HR Manager' : 'Administrator',
        rejectReason: ''
      });
      showToast(`✅ ${sub.branch} cleaning photos approved! Reception portal unblocked.`);
    } catch (e) {
      console.error('Error accepting cleaning submission:', e);
      alert('Failed to accept submission.');
    } finally {
      setActionLoading(false);
    }
  };

  // Open Reject Modal
  const handleOpenReject = (sub: CleaningSubmission) => {
    setRejectingItem(sub);
    setRejectReason('');
  };

  // Confirm Rejection
  const handleConfirmReject = async () => {
    if (!rejectingItem || !rejectingItem.id) return;
    if (!rejectReason.trim()) {
      alert('Please enter a rejection reason or feedback for the branch.');
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
      showToast(`❌ ${rejectingItem.branch} submission rejected. Reception notified to re-upload.`);
      setRejectingItem(null);
      setRejectReason('');
    } catch (e) {
      console.error('Error rejecting cleaning submission:', e);
      alert('Failed to reject submission.');
    } finally {
      setActionLoading(false);
    }
  };

  // Branch live statuses
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

  // Filtered submissions
  const filteredSubmissions = useMemo(() => {
    return submissions.filter(s => {
      if (selectedBranchFilter !== 'all' && s.branch !== selectedBranchFilter) {
        return false;
      }
      if (statusFilter !== 'all' && s.status !== statusFilter) {
        return false;
      }
      return true;
    });
  }, [submissions, selectedBranchFilter, statusFilter]);

  const pendingCount = submissions.filter(s => s.status === 'Pending').length;
  const overdueCount = branchStatuses.filter(b => b.isBlocked).length;

  return (
    <div style={{ padding: '24px 20px', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Toast Banner */}
      {toastMsg && (
        <div style={{
          position: 'fixed',
          top: '80px',
          right: '24px',
          background: '#0f172a',
          color: '#ffffff',
          padding: '12px 20px',
          borderRadius: '12px',
          boxShadow: '0 8px 24px rgba(0,0,0,0.25)',
          zIndex: 9999,
          fontSize: '14px',
          fontWeight: 700,
          display: 'flex',
          alignItems: 'center',
          gap: '10px'
        }}>
          <CheckCircle size={18} color="#22c55e" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '16px',
        marginBottom: '24px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{
            background: 'linear-gradient(135deg, rgba(37, 142, 200, 0.15) 0%, rgba(168, 206, 58, 0.25) 100%)',
            padding: '14px',
            borderRadius: '16px',
            border: '1px solid rgba(37, 142, 200, 0.2)'
          }}>
            <Building2 color="#258ec8" size={28} />
          </div>
          <div>
            <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#0f172a', margin: 0 }}>
              Branch Clinic Sanitation & Cleaning Audits
            </h1>
            <p style={{ color: '#64748b', fontSize: '14px', marginTop: '4px', marginBottom: 0 }}>
              Assigned cleaning date management, 5–7 photo verification audits, & Accept/Reject enforcement
            </p>
          </div>
        </div>

        {/* Top summary pills */}
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <div style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '12px',
            padding: '8px 16px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <Clock size={16} color="#ca8a04" />
            <span style={{ fontSize: '13px', color: '#475569' }}>Pending Review:</span>
            <strong style={{ fontSize: '14px', color: '#ca8a04' }}>{pendingCount}</strong>
          </div>

          <div style={{
            background: overdueCount > 0 ? '#fef2f2' : '#ffffff',
            border: overdueCount > 0 ? '1px solid #fca5a5' : '1px solid #e2e8f0',
            borderRadius: '12px',
            padding: '8px 16px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <AlertCircle size={16} color={overdueCount > 0 ? '#dc2626' : '#64748b'} />
            <span style={{ fontSize: '13px', color: overdueCount > 0 ? '#991b1b' : '#475569' }}>Overdue & Locked:</span>
            <strong style={{ fontSize: '14px', color: overdueCount > 0 ? '#dc2626' : '#1e293b' }}>{overdueCount}</strong>
          </div>
        </div>
      </div>

      {/* Main Tabs Switcher (Option 1: Assigned Cleaning Date | Option 2: Reports & Verification) */}
      <div style={{
        display: 'flex',
        gap: '10px',
        borderBottom: '2px solid #e2e8f0',
        marginBottom: '24px',
        paddingBottom: '2px'
      }}>
        <button
          onClick={() => setActiveTab('reports')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '12px 22px',
            border: 'none',
            background: 'transparent',
            borderBottom: activeTab === 'reports' ? '3px solid #258ec8' : '3px solid transparent',
            color: activeTab === 'reports' ? '#258ec8' : '#64748b',
            fontWeight: activeTab === 'reports' ? 800 : 600,
            fontSize: '14.5px',
            cursor: 'pointer',
            marginBottom: '-2px',
            transition: 'all 0.2s ease'
          }}
        >
          <Sparkles size={18} />
          <span>Option 2: Cleaning Reports & Verification</span>
          {pendingCount > 0 && (
            <span style={{
              background: '#ef4444',
              color: '#ffffff',
              borderRadius: '20px',
              padding: '2px 8px',
              fontSize: '11px',
              fontWeight: 800
            }}>
              {pendingCount}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('assign')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '12px 22px',
            border: 'none',
            background: 'transparent',
            borderBottom: activeTab === 'assign' ? '3px solid #258ec8' : '3px solid transparent',
            color: activeTab === 'assign' ? '#258ec8' : '#64748b',
            fontWeight: activeTab === 'assign' ? 800 : 600,
            fontSize: '14.5px',
            cursor: 'pointer',
            marginBottom: '-2px',
            transition: 'all 0.2s ease'
          }}
        >
          <Calendar size={18} />
          <span>Option 1: Assign Cleaning Date</span>
        </button>
      </div>

      {/* TAB 1: ASSIGN CLEANING DATE */}
      {activeTab === 'assign' && (
        <div>
          <div style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '20px',
            padding: '24px',
            marginBottom: '24px',
            boxShadow: '0 2px 10px rgba(0,0,0,0.03)'
          }}>
            <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a', margin: '0 0 6px 0' }}>
              Assign Branch Clinic Cleaning Date
            </h3>
            <p style={{ color: '#64748b', fontSize: '13.5px', margin: '0 0 20px 0' }}>
              Select the exact calendar date for each branch's clinic sterilization. If the assigned date passes and photos are not approved by HR, that branch's Reception app and web are locked until 5–7 photos are uploaded and approved.
            </p>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: '18px'
            }}>
              {branchStatuses.map((item) => {
                const dateObj = new Date(item.assignedDate);
                const dayName = isNaN(dateObj.getTime())
                  ? ''
                  : dateObj.toLocaleDateString(undefined, { weekday: 'long' });

                return (
                  <div
                    key={item.branch}
                    style={{
                      background: item.isBlocked ? '#fff5f5' : '#f8fafc',
                      border: item.isBlocked ? '2px solid #fca5a5' : '1px solid #e2e8f0',
                      borderRadius: '16px',
                      padding: '20px',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.02)'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Building2 size={20} color="#258ec8" />
                        <h4 style={{ fontSize: '17px', fontWeight: 800, color: '#1e293b', margin: 0 }}>
                          {item.branch} Branch
                        </h4>
                      </div>

                      {/* Lockout status pill */}
                      {item.isBlocked ? (
                        <span style={{ fontSize: '11.5px', fontWeight: 800, color: '#dc2626', background: '#fee2e2', padding: '3px 8px', borderRadius: '8px', border: '1px solid #fca5a5', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <ShieldAlert size={12} /> Locked Overdue
                        </span>
                      ) : item.status === 'Approved' ? (
                        <span style={{ fontSize: '11.5px', fontWeight: 800, color: '#15803d', background: '#dcfce7', padding: '3px 8px', borderRadius: '8px', border: '1px solid #86efac', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <ShieldCheck size={12} /> Approved
                        </span>
                      ) : item.status === 'Pending' ? (
                        <span style={{ fontSize: '11.5px', fontWeight: 800, color: '#854d0e', background: '#fef9c3', padding: '3px 8px', borderRadius: '8px', border: '1px solid #fde047' }}>
                          Review Pending
                        </span>
                      ) : item.status === 'Due Today' ? (
                        <span style={{ fontSize: '11.5px', fontWeight: 800, color: '#b45309', background: '#fef3c7', padding: '3px 8px', borderRadius: '8px', border: '1px solid #fcd34d' }}>
                          Due Today 📅
                        </span>
                      ) : (
                        <span style={{ fontSize: '11.5px', fontWeight: 700, color: '#475569', background: '#f1f5f9', padding: '3px 8px', borderRadius: '8px' }}>
                          Scheduled
                        </span>
                      )}
                    </div>

                    {/* Date Picker Input */}
                    <div style={{ marginBottom: '12px' }}>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: '6px' }}>
                        Assigned Cleaning Date:
                      </label>
                      <input
                        type="date"
                        value={item.assignedDate}
                        onChange={(e) => handleUpdateScheduleDate(item.branch, e.target.value)}
                        style={{
                          width: '100%',
                          padding: '10px 14px',
                          borderRadius: '10px',
                          border: '1px solid #cbd5e1',
                          background: '#ffffff',
                          fontSize: '14px',
                          fontWeight: 700,
                          color: '#0f172a',
                          cursor: 'pointer',
                          outline: 'none',
                          boxSizing: 'border-box'
                        }}
                      />
                      {dayName && (
                        <div style={{ fontSize: '12px', color: '#0284c7', fontWeight: 700, marginTop: '4px' }}>
                          📅 {dayName} ({formatDisplayDate(item.assignedDate)})
                        </div>
                      )}
                    </div>

                    <p style={{ fontSize: '12px', color: item.isBlocked ? '#b91c1c' : '#64748b', margin: 0 }}>
                      {item.reason}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: CLEANING REPORTS & VERIFICATION (ACCEPT / REJECT) */}
      {activeTab === 'reports' && (
        <div>
          {/* Filter Bar */}
          <div style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '16px',
            padding: '16px 20px',
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '14px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <Filter size={18} color="#64748b" />
              <span style={{ fontSize: '13.5px', fontWeight: 700, color: '#334155' }}>Filters:</span>

              {/* Branch Filter */}
              <select
                value={selectedBranchFilter}
                onChange={(e) => setSelectedBranchFilter(e.target.value)}
                style={{
                  padding: '7px 12px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  background: '#ffffff',
                  fontSize: '13px',
                  fontWeight: 600,
                  color: '#1e293b',
                  outline: 'none'
                }}
              >
                <option value="all">All Branches ({BRANCH_LIST.length})</option>
                {BRANCH_LIST.map(b => (
                  <option key={b} value={b}>{b} Branch</option>
                ))}
              </select>

              {/* Status Filter */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                style={{
                  padding: '7px 12px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  background: '#ffffff',
                  fontSize: '13px',
                  fontWeight: 600,
                  color: '#1e293b',
                  outline: 'none'
                }}
              >
                <option value="all">All Statuses</option>
                <option value="Pending">Pending Review ⏳</option>
                <option value="Approved">Approved ✅</option>
                <option value="Rejected">Rejected ❌</option>
              </select>
            </div>

            <div style={{ fontSize: '13px', color: '#64748b' }}>
              Showing <strong>{filteredSubmissions.length}</strong> cleaning submission{filteredSubmissions.length !== 1 ? 's' : ''}
            </div>
          </div>

          {/* Submissions List */}
          {loading ? (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: '#64748b' }}>
              <RefreshCw size={28} className="animate-spin" style={{ margin: '0 auto 10px auto' }} />
              <p style={{ margin: 0, fontSize: '14px' }}>Loading cleaning photo submissions...</p>
            </div>
          ) : filteredSubmissions.length === 0 ? (
            <div style={{
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '20px',
              padding: '60px 20px',
              textAlign: 'center',
              color: '#94a3b8'
            }}>
              <Sparkles size={40} color="#cbd5e1" style={{ margin: '0 auto 12px auto', display: 'block' }} />
              <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#64748b', margin: '0 0 6px 0' }}>
                No cleaning submissions match your filters
              </h3>
              <p style={{ fontSize: '13px', margin: 0 }}>
                Submissions uploaded by Reception from each branch will appear here for HR / Admin verification.
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {filteredSubmissions.map((sub) => (
                <div
                  key={sub.id}
                  style={{
                    background: '#ffffff',
                    border: sub.status === 'Pending'
                      ? '2px solid #fde047'
                      : sub.status === 'Approved'
                      ? '1px solid #bbf7d0'
                      : '1px solid #fecdd3',
                    borderRadius: '20px',
                    padding: '24px',
                    boxShadow: '0 4px 14px rgba(0,0,0,0.03)'
                  }}
                >
                  {/* Top card header */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                          {sub.branch} Branch
                        </h3>
                        <span style={{ fontSize: '13px', color: '#64748b' }}>
                          • Scheduled Date: <strong>{formatDisplayDate(sub.assignedDate)}</strong>
                        </span>
                      </div>
                      <div style={{ fontSize: '12.5px', color: '#64748b', marginTop: '4px' }}>
                        Submitted by <strong>{sub.submittedBy}</strong> on {new Date(sub.submittedAt).toLocaleDateString()} at {new Date(sub.submittedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>

                    {/* Status badge & Review Actions */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                      {sub.status === 'Approved' && (
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '6px 14px',
                          borderRadius: '20px',
                          backgroundColor: '#dcfce7',
                          color: '#15803d',
                          fontWeight: 800,
                          fontSize: '12.5px',
                          border: '1px solid #86efac'
                        }}>
                          <CheckCircle size={15} /> Approved by {sub.reviewedBy || 'HR'}
                        </span>
                      )}

                      {sub.status === 'Rejected' && (
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '6px 14px',
                          borderRadius: '20px',
                          backgroundColor: '#fee2e2',
                          color: '#b91c1c',
                          fontWeight: 800,
                          fontSize: '12.5px',
                          border: '1px solid #fca5a5'
                        }}>
                          <XCircle size={15} /> Rejected
                        </span>
                      )}

                      {sub.status === 'Pending' && (
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '6px 14px',
                          borderRadius: '20px',
                          backgroundColor: '#fef9c3',
                          color: '#854d0e',
                          fontWeight: 800,
                          fontSize: '12.5px',
                          border: '1px solid #fde047'
                        }}>
                          <Clock size={15} /> Pending HR Verification
                        </span>
                      )}

                      {/* Action buttons (Accept / Reject) */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <button
                          type="button"
                          onClick={() => handleAcceptSubmission(sub)}
                          disabled={actionLoading}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '8px 16px',
                            borderRadius: '10px',
                            background: sub.status === 'Approved' ? '#f0fdf4' : '#16a34a',
                            color: sub.status === 'Approved' ? '#15803d' : '#ffffff',
                            fontWeight: 800,
                            fontSize: '13px',
                            border: sub.status === 'Approved' ? '1px solid #86efac' : 'none',
                            cursor: actionLoading ? 'not-allowed' : 'pointer',
                            boxShadow: sub.status !== 'Approved' ? '0 2px 8px rgba(22, 163, 74, 0.25)' : 'none'
                          }}
                        >
                          <Check size={16} /> Accept
                        </button>

                        <button
                          type="button"
                          onClick={() => handleOpenReject(sub)}
                          disabled={actionLoading}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '8px 16px',
                            borderRadius: '10px',
                            background: sub.status === 'Rejected' ? '#fee2e2' : '#dc2626',
                            color: sub.status === 'Rejected' ? '#b91c1c' : '#ffffff',
                            fontWeight: 800,
                            fontSize: '13px',
                            border: sub.status === 'Rejected' ? '1px solid #fca5a5' : 'none',
                            cursor: actionLoading ? 'not-allowed' : 'pointer',
                            boxShadow: sub.status !== 'Rejected' ? '0 2px 8px rgba(220, 38, 38, 0.25)' : 'none'
                          }}
                        >
                          <X size={16} /> Reject
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Notes */}
                  {sub.notes && (
                    <div style={{
                      background: '#f8fafc',
                      padding: '10px 14px',
                      borderRadius: '10px',
                      fontSize: '13px',
                      color: '#334155',
                      marginBottom: '14px',
                      border: '1px solid #e2e8f0'
                    }}>
                      <strong>Receptionist Notes:</strong> {sub.notes}
                    </div>
                  )}

                  {/* Rejection notice if rejected */}
                  {sub.status === 'Rejected' && sub.rejectReason && (
                    <div style={{
                      background: '#fff1f2',
                      border: '1px solid #fecdd3',
                      padding: '10px 14px',
                      borderRadius: '10px',
                      fontSize: '13px',
                      color: '#991b1b',
                      marginBottom: '14px',
                      fontWeight: 600
                    }}>
                      <strong>HR Rejection Reason:</strong> "{sub.rejectReason}"
                    </div>
                  )}

                  {/* Photos Section */}
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: '#475569', marginBottom: '10px' }}>
                      Submitted Clinic Sanitation Photos ({sub.photos?.length || 0} Photos):
                    </div>

                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
                      gap: '12px'
                    }}>
                      {sub.photos?.map((pUrl, pIdx) => (
                        <div
                          key={pIdx}
                          onClick={() => setLightboxImg(pUrl)}
                          style={{
                            position: 'relative',
                            height: '110px',
                            borderRadius: '12px',
                            overflow: 'hidden',
                            cursor: 'pointer',
                            border: '1px solid #cbd5e1',
                            boxShadow: '0 2px 6px rgba(0,0,0,0.06)',
                            backgroundColor: '#0f172a'
                          }}
                          title="Click to view full photo"
                        >
                          <img
                            src={pUrl}
                            alt={`Cleaning Photo ${pIdx + 1}`}
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          />
                          <div style={{
                            position: 'absolute',
                            top: '6px',
                            left: '6px',
                            background: 'rgba(0,0,0,0.6)',
                            color: '#ffffff',
                            fontSize: '11px',
                            fontWeight: 700,
                            padding: '2px 6px',
                            borderRadius: '6px'
                          }}>
                            #{pIdx + 1}
                          </div>
                          <div style={{
                            position: 'absolute',
                            bottom: '6px',
                            right: '6px',
                            background: 'rgba(0,0,0,0.6)',
                            color: '#ffffff',
                            padding: '4px',
                            borderRadius: '6px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}>
                            <ZoomIn size={14} color="#ffffff" />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* REJECTION REASON MODAL */}
      {rejectingItem && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.6)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 99999,
          padding: '20px'
        }}>
          <div style={{
            background: '#ffffff',
            borderRadius: '20px',
            maxWidth: '520px',
            width: '100%',
            padding: '26px',
            boxShadow: '0 20px 40px rgba(0,0,0,0.2)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ background: '#fee2e2', padding: '10px', borderRadius: '12px' }}>
                  <XCircle size={22} color="#dc2626" />
                </div>
                <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#991b1b', margin: 0 }}>
                  Reject Cleaning Photos ({rejectingItem.branch})
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setRejectingItem(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer' }}
              >
                <X size={20} color="#64748b" />
              </button>
            </div>

            <p style={{ fontSize: '13.5px', color: '#475569', margin: '0 0 16px 0', lineHeight: 1.5 }}>
              Rejecting will notify Reception that the clinic cleaning did not pass inspection. The portal will remain blocked until new photos are submitted and approved.
            </p>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#1e293b', marginBottom: '6px' }}>
                Rejection Feedback / Instructions for Reception:
              </label>
              <textarea
                rows={3}
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="e.g. Doctor consultation room floor has dirt spots; Please re-mop and upload fresh clear photos."
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: '10px',
                  border: '1px solid #cbd5e1',
                  fontSize: '13.5px',
                  outline: 'none',
                  resize: 'vertical',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                type="button"
                onClick={() => setRejectingItem(null)}
                style={{
                  padding: '10px 18px',
                  borderRadius: '10px',
                  background: '#f1f5f9',
                  color: '#475569',
                  fontWeight: 700,
                  fontSize: '13.5px',
                  border: 'none',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleConfirmReject}
                disabled={actionLoading}
                style={{
                  padding: '10px 20px',
                  borderRadius: '10px',
                  background: '#dc2626',
                  color: '#ffffff',
                  fontWeight: 800,
                  fontSize: '13.5px',
                  border: 'none',
                  cursor: actionLoading ? 'not-allowed' : 'pointer'
                }}
              >
                {actionLoading ? 'Rejecting...' : 'Confirm Rejection ❌'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FULL-SIZE LIGHTBOX MODAL */}
      {lightboxImg && (
        <div
          onClick={() => setLightboxImg(null)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.85)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 99999,
            padding: '20px'
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ position: 'relative', maxWidth: '90vw', maxHeight: '90vh' }}
          >
            <button
              type="button"
              onClick={() => setLightboxImg(null)}
              style={{
                position: 'absolute',
                top: '-40px',
                right: '0',
                background: '#ffffff',
                border: 'none',
                borderRadius: '50%',
                width: '34px',
                height: '34px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                boxShadow: '0 2px 10px rgba(0,0,0,0.3)'
              }}
            >
              <X size={20} color="#0f172a" />
            </button>
            <img
              src={lightboxImg}
              alt="Clinic Cleaning Zoomed"
              style={{ maxWidth: '90vw', maxHeight: '85vh', borderRadius: '12px', boxShadow: '0 8px 32px rgba(0,0,0,0.5)' }}
            />
          </div>
        </div>
      )}
    </div>
  );
};
