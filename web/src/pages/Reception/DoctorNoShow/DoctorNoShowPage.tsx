import React, { useState, useEffect, useMemo } from 'react';
import { UserX, Calendar, Clock, Plus, Trash2, AlertCircle, MapPin, CheckCircle, Search, Filter, X, AlertTriangle } from 'lucide-react';
import { db } from '@app/shared';
import { collection, onSnapshot, addDoc, deleteDoc, doc } from 'firebase/firestore';
import {
  MASTER_DOCTORS_ROSTER,
  normalizeBranchKey,
  getCanonicalBranchName,
  getCanonicalDoctorName,
  getDayNameFromDate,
  getDoctorsForBranch,
  getDoctorScheduleOnDate,
  getScheduledDoctorsForBranchAndDate,
  getWorkingDaysSummary,
  DoctorRosterItem
} from './doctorRosterHelper';

export interface DoctorNoShowOverride {
  id: string;
  doctorId: string;
  doctorName: string;
  branchName: string;
  type: 'date' | 'date_range' | 'session' | 'time_range';
  date?: string;
  startDate?: string;
  endDate?: string;
  session?: 'morning' | 'evening';
  startTime?: string;
  endTime?: string;
  reason: string;
  createdAt: string;
}

const INITIAL_OVERRIDES: DoctorNoShowOverride[] = [
  {
    id: 'NS-1',
    doctorId: 'DOC-1',
    doctorName: 'Dr. Prashanth K Vaidya',
    branchName: 'KPHB Branch',
    type: 'date',
    date: '2026-09-10',
    reason: 'Emergency Leave',
    createdAt: '2026-09-10'
  },
  {
    id: 'NS-2',
    doctorId: 'DOC-2',
    doctorName: 'Dr. Ramakrishna Chanduri',
    branchName: 'Nallagandla Branch',
    type: 'session',
    date: '2026-09-11',
    session: 'morning',
    reason: 'Conference Meeting',
    createdAt: '2026-09-10'
  }
];

const BRANCH_OPTIONS = [
  'KPHB Branch',
  'Nallagandla Branch',
  'Dilshuknagar Branch',
  'Chandanagar Branch'
];

interface DoctorNoShowPageProps {
  currentBranch?: string;
}

export const DoctorNoShowPage: React.FC<DoctorNoShowPageProps> = ({ currentBranch }) => {
  const defaultBranch = getCanonicalBranchName(currentBranch);
  const [overrides, setOverrides] = useState<DoctorNoShowOverride[]>(INITIAL_OVERRIDES);
  const [showModal, setShowModal] = useState(false);
  const [filterBranch, setFilterBranch] = useState(defaultBranch);

  // Form State
  const [branchName, setBranchName] = useState(defaultBranch);
  const [overrideType, setOverrideType] = useState<'date' | 'date_range' | 'session' | 'time_range'>('date');
  const [singleDate, setSingleDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [startDate, setStartDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 2);
    return d.toISOString().split('T')[0];
  });
  const [doctorName, setDoctorName] = useState('Dr. Prashanth K Vaidya');
  const [session, setSession] = useState<'morning' | 'evening'>('morning');
  const [startTime, setStartTime] = useState('10:00');
  const [endTime, setEndTime] = useState('13:00');
  const [reason, setReason] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Keep branch in sync with reception login
  useEffect(() => {
    if (currentBranch) {
      const b = getCanonicalBranchName(currentBranch);
      setBranchName(b);
      setFilterBranch(b);
    }
  }, [currentBranch]);


  // Modal: Doctors rostered for the modal's selected branch
  const modalBranchDoctors = useMemo(() => {
    return getDoctorsForBranch(branchName);
  }, [branchName]);

  // Target date & Day of week
  const activeDate = overrideType === 'date_range' ? startDate : singleDate;
  const activeDayName = getDayNameFromDate(activeDate);

  // Scheduled doctors at this branch on this specific date
  const scheduledDoctorsOnDate = useMemo(() => {
    return getScheduledDoctorsForBranchAndDate(branchName, activeDate);
  }, [branchName, activeDate]);

  // Doctors to show in modal dropdown
  const availableModalDoctors = useMemo(() => {
    if (overrideType === 'date_range') {
      // For multi-day leave, show all doctors assigned to this branch
      return modalBranchDoctors.map(doc => ({
        id: doc.id,
        name: doc.name,
        timings: `Working Days: ${getWorkingDaysSummary(doc, branchName)}`,
        isScheduled: true
      }));
    }

    if (scheduledDoctorsOnDate.length > 0) {
      // Show doctors scheduled on this specific date
      return scheduledDoctorsOnDate.map(item => ({
        id: item.doctor.id,
        name: item.doctor.name,
        timings: `Scheduled: ${item.timings}`,
        isScheduled: true
      }));
    }

    // If no doctor scheduled on this date (e.g. Clinic Closed on Thursday)
    return modalBranchDoctors.map(doc => ({
      id: doc.id,
      name: doc.name,
      timings: `Not Scheduled on ${activeDayName}`,
      isScheduled: false
    }));
  }, [overrideType, modalBranchDoctors, scheduledDoctorsOnDate, branchName, activeDayName]);

  // Auto-select valid doctor whenever branch, date, or override type changes
  useEffect(() => {
    if (availableModalDoctors.length > 0) {
      const isCurrentValid = availableModalDoctors.some(d => d.name === doctorName);
      if (!isCurrentValid) {
        setDoctorName(availableModalDoctors[0].name);
      }
    }
  }, [availableModalDoctors, doctorName]);

  // Real-time Firestore sync with Web & Mobile
  useEffect(() => {
    if (!db) return;
    try {
      const q = collection(db, 'doctor_no_shows');
      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          const list: DoctorNoShowOverride[] = snapshot.docs.map((docSnap) => ({
            id: docSnap.id,
            ...(docSnap.data() as Omit<DoctorNoShowOverride, 'id'>)
          }));
          setOverrides(list);
        },
        (err) => {
          console.warn('Firestore doctor_no_shows error, using local state:', err);
        }
      );
      return () => unsubscribe();
    } catch (e) {
      console.warn('Firestore subscription failed, keeping local state:', e);
    }
  }, []);

  const handleAddOverride = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) {
      alert('Please enter a reason for the No Show override.');
      return;
    }

    // Validate that the doctor works at this branch
    const branchDocs = getDoctorsForBranch(branchName);
    const matchedDoc = branchDocs.find(d => getCanonicalDoctorName(d.name) === getCanonicalDoctorName(doctorName));
    if (!matchedDoc) {
      alert(`${doctorName} does not practice at ${branchName}. Please select a doctor rostered to ${branchName}.`);
      return;
    }

    // If single date, verify scheduling
    if (overrideType !== 'date_range') {
      const schedule = getDoctorScheduleOnDate(matchedDoc, branchName, singleDate);
      if (!schedule.isScheduled) {
        const proceed = window.confirm(
          `Note: ${doctorName} is normally not scheduled to work at ${branchName} on ${schedule.dayName} (${singleDate}). Do you still want to record this No Show override?`
        );
        if (!proceed) return;
      }
    }

    const doctorId = matchedDoc.id;

    const payload: Record<string, any> = {
      doctorId,
      doctorName: matchedDoc.name,
      branchName,
      type: overrideType,
      reason: reason.trim(),
      createdAt: new Date().toISOString().split('T')[0]
    };

    if (overrideType === 'date_range') {
      if (startDate) payload.startDate = startDate;
      if (endDate) payload.endDate = endDate;
    } else {
      if (singleDate) payload.date = singleDate;
    }

    if (overrideType === 'session') {
      if (session) payload.session = session;
    }

    if (overrideType === 'time_range') {
      if (startTime) payload.startTime = startTime;
      if (endTime) payload.endTime = endTime;
    }

    // Safety: ensure no undefined properties exist before Firestore addDoc
    Object.keys(payload).forEach(key => {
      if (payload[key] === undefined) {
        delete payload[key];
      }
    });

    setIsSaving(true);
    try {
      if (db) {
        const docRef = await addDoc(collection(db, 'doctor_no_shows'), payload);
        const savedOverride: DoctorNoShowOverride = {
          id: docRef.id,
          ...(payload as Omit<DoctorNoShowOverride, 'id'>)
        };
        setOverrides(prev => [savedOverride, ...prev.filter(item => item.id !== docRef.id)]);
      } else {
        const newOverride: DoctorNoShowOverride = {
          id: `NS-${Date.now()}`,
          ...(payload as Omit<DoctorNoShowOverride, 'id'>)
        };
        setOverrides(prev => [newOverride, ...prev]);
      }
      setShowModal(false);
      setReason('');
    } catch (error) {
      console.error('Error saving Doctor No Show override:', error);
      const newOverride: DoctorNoShowOverride = {
        id: `NS-${Date.now()}`,
        ...(payload as Omit<DoctorNoShowOverride, 'id'>)
      };
      setOverrides(prev => [newOverride, ...prev]);
      setShowModal(false);
      setReason('');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to remove this Doctor No Show block?')) {
      try {
        if (db && !id.startsWith('NS-')) {
          await deleteDoc(doc(db, 'doctor_no_shows', id));
        }
      } catch (err) {
        console.warn('Failed deleting from Firestore, removing locally:', err);
      }
      setOverrides(prev => prev.filter(item => item.id !== id));
    }
  };

  // Filtered Overrides (Filtered strictly by branch)
  const filteredOverrides = overrides.filter(item => {
    return (
      filterBranch === 'all' ||
      normalizeBranchKey(item.branchName) === normalizeBranchKey(filterBranch)
    );
  });

  const fullDayCount = overrides.filter(o => o.type === 'date').length;
  const dateRangeCount = overrides.filter(o => o.type === 'date_range').length;
  const sessionCount = overrides.filter(o => o.type === 'session' || o.type === 'time_range').length;

  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto', fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ background: '#fee2e2', padding: '12px', borderRadius: '14px', color: '#dc2626', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <UserX size={26} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h1 style={{ fontSize: '22px', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                Doctor No Show & Unavailability Overrides
              </h1>
              <span style={{ fontSize: '11px', background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe', padding: '3px 8px', borderRadius: '6px', fontWeight: 700 }}>
                📍 Reception: {defaultBranch}
              </span>
            </div>
            <p style={{ color: '#64748b', fontSize: '13px', margin: '3px 0 0 0' }}>
              Block doctor schedules for emergency leave, sessions, or custom hours — filtered strictly by branch roster & day availability
            </p>
          </div>
        </div>
        <button
          onClick={() => {
            setBranchName(defaultBranch);
            setShowModal(true);
          }}
          style={{
            background: '#dc2626',
            color: '#ffffff',
            border: 'none',
            padding: '10px 18px',
            borderRadius: '10px',
            fontWeight: 700,
            fontSize: '13px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            boxShadow: '0 4px 12px rgba(220, 38, 38, 0.25)'
          }}
        >
          <Plus size={16} /> Add Doctor No Show
        </button>
      </div>

      {/* Metrics Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px', marginBottom: '20px' }}>
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px', display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ background: '#fef2f2', padding: '10px', borderRadius: '10px', color: '#dc2626' }}>
            <AlertCircle size={22} />
          </div>
          <div>
            <div style={{ fontSize: '20px', fontWeight: 800, color: '#0f172a' }}>{overrides.length}</div>
            <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>Total Active Overrides</div>
          </div>
        </div>
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px', display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ background: '#eff6ff', padding: '10px', borderRadius: '10px', color: '#2563eb' }}>
            <Calendar size={22} />
          </div>
          <div>
            <div style={{ fontSize: '20px', fontWeight: 800, color: '#0f172a' }}>{fullDayCount + dateRangeCount}</div>
            <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>Full Day / Leave Blocks</div>
          </div>
        </div>
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px', display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ background: '#fef3c7', padding: '10px', borderRadius: '10px', color: '#d97706' }}>
            <Clock size={22} />
          </div>
          <div>
            <div style={{ fontSize: '20px', fontWeight: 800, color: '#0f172a' }}>{sessionCount}</div>
            <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>Session & Hour Blocks</div>
          </div>
        </div>
      </div>

      {/* Branch Filter Bar */}
      <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '12px 18px', marginBottom: '16px', display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ background: '#eff6ff', padding: '8px', borderRadius: '8px', color: '#2563eb', display: 'flex', alignItems: 'center' }}>
            <MapPin size={18} />
          </div>
          <div>
            <div style={{ fontSize: '13.5px', fontWeight: 800, color: '#0f172a' }}>Filter Branch</div>
            <div style={{ fontSize: '12px', color: '#64748b' }}>Displaying No Show blocks for selected branch</div>
          </div>
        </div>

        <select
          value={filterBranch}
          onChange={e => setFilterBranch(e.target.value)}
          style={{ padding: '8px 16px', borderRadius: '8px', border: filterBranch === defaultBranch ? '1.5px solid #2563eb' : '1px solid #cbd5e1', fontSize: '13px', background: filterBranch === defaultBranch ? '#eff6ff' : '#ffffff', color: filterBranch === defaultBranch ? '#1d4ed8' : '#334155', fontWeight: 700, outline: 'none', cursor: 'pointer' }}
        >
          <option value="all">🌐 All Branches</option>
          {BRANCH_OPTIONS.map(b => (
            <option key={b} value={b}>
              {b} {b === defaultBranch ? '⭐ (Your Branch)' : ''}
            </option>
          ))}
        </select>
      </div>

      {/* Active Overrides Table */}
      <div style={{ background: '#ffffff', borderRadius: '14px', border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 2px 6px rgba(0,0,0,0.02)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
          <thead>
            <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', fontWeight: 700 }}>
              <th style={{ padding: '14px 16px' }}>Doctor Name</th>
              <th style={{ padding: '14px 16px' }}>Branch</th>
              <th style={{ padding: '14px 16px' }}>Override Type</th>
              <th style={{ padding: '14px 16px' }}>Unavailability Details</th>
              <th style={{ padding: '14px 16px' }}>Reason & Log</th>
              <th style={{ padding: '14px 16px', textAlign: 'right' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {filteredOverrides.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
                  <CheckCircle size={36} color="#cbd5e1" style={{ margin: '0 auto 8px', display: 'block' }} />
                  <div style={{ fontWeight: 600, fontSize: '14px', color: '#64748b' }}>No doctor no-show overrides found</div>
                  <div style={{ fontSize: '12px', marginTop: '4px' }}>All doctors are currently available per regular branch rosters.</div>
                </td>
              </tr>
            ) : (
              filteredOverrides.map(item => (
                <tr key={item.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '14px 16px' }}>
                    <div style={{ fontWeight: 700, color: '#0f172a' }}>{item.doctorName}</div>
                    <div style={{ fontSize: '11px', color: '#94a3b8' }}>ID: {item.doctorId}</div>
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: '#f1f5f9', color: '#334155', padding: '4px 8px', borderRadius: '6px', fontSize: '12px', fontWeight: 600 }}>
                      <MapPin size={12} color="#64748b" /> {item.branchName}
                    </span>
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    <span style={{
                      display: 'inline-block',
                      padding: '4px 8px',
                      borderRadius: '6px',
                      fontSize: '11px',
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      background:
                        item.type === 'date' ? '#fee2e2' :
                        item.type === 'date_range' ? '#fef3c7' :
                        item.type === 'session' ? '#eff6ff' : '#f3e8ff',
                      color:
                        item.type === 'date' ? '#dc2626' :
                        item.type === 'date_range' ? '#b45309' :
                        item.type === 'session' ? '#1d4ed8' : '#7e22ce'
                    }}>
                      {item.type.replace('_', ' ')}
                    </span>
                  </td>
                  <td style={{ padding: '14px 16px', color: '#334155', fontWeight: 700 }}>
                    {item.type === 'date' && `📅 Full Day (${item.date})`}
                    {item.type === 'date_range' && `🗓️ ${item.startDate} to ${item.endDate}`}
                    {item.type === 'session' && `🌅 ${item.date} (${item.session?.toUpperCase()} Session)`}
                    {item.type === 'time_range' && `⏰ ${item.date} (${item.startTime} - ${item.endTime})`}
                  </td>
                  <td style={{ padding: '14px 16px', color: '#475569', maxWidth: '280px' }}>
                    <span style={{ fontSize: '12.5px', color: '#334155', fontWeight: 600 }}>{item.reason}</span>
                    <div style={{ fontSize: '10.5px', color: '#94a3b8', marginTop: '2px' }}>Logged: {item.createdAt}</div>
                  </td>
                  <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                    <button
                      onClick={() => handleDelete(item.id)}
                      title="Remove Override"
                      style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', padding: '6px 10px', borderRadius: '8px', cursor: 'pointer' }}
                    >
                      <Trash2 size={15} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Add Modal */}
      {showModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15,23,42,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '16px' }}>
          <div style={{ background: '#ffffff', borderRadius: '16px', padding: '24px', maxWidth: '540px', width: '100%', boxShadow: '0 20px 40px rgba(0,0,0,0.18)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ background: '#fee2e2', padding: '8px', borderRadius: '8px', color: '#dc2626' }}>
                  <UserX size={20} />
                </div>
                <div>
                  <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a', margin: 0 }}>Add Doctor No Show</h2>
                  <div style={{ fontSize: '11.5px', color: '#64748b' }}>Doctors filtered specifically by branch & date roster</div>
                </div>
              </div>
              <button onClick={() => setShowModal(false)} style={{ background: 'transparent', border: 'none', color: '#64748b', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleAddOverride} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {/* Branch Selection */}
              <div>
                <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>
                  1. Select Branch
                </label>
                <select
                  value={branchName}
                  onChange={(e) => setBranchName(e.target.value)}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', outline: 'none', fontWeight: 700, color: '#0f172a' }}
                >
                  {BRANCH_OPTIONS.map(b => (
                    <option key={b} value={b}>
                      {b} {b === defaultBranch ? '⭐ (Reception Default)' : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Override Type */}
              <div>
                <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>
                  2. Unavailability Override Type
                </label>
                <select
                  value={overrideType}
                  onChange={(e) => setOverrideType(e.target.value as any)}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', outline: 'none', fontWeight: 700, color: '#0f172a' }}
                >
                  <option value="date">📅 Full Day (Single Date)</option>
                  <option value="date_range">🗓️ Date Range (Multiple Days Leave)</option>
                  <option value="session">🌅 Session (Morning or Evening)</option>
                  <option value="time_range">⏰ Time Range (Specific Hours)</option>
                </select>
              </div>

              {/* Date Inputs based on Type */}
              {overrideType === 'date_range' ? (
                <div style={{ display: 'flex', gap: '10px' }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>Start Date</label>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', outline: 'none', fontWeight: 600 }}
                      required
                    />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>End Date</label>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', outline: 'none', fontWeight: 600 }}
                      required
                    />
                  </div>
                </div>
              ) : (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                    <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569' }}>
                      Date ({activeDayName})
                    </label>
                    <span style={{ fontSize: '11px', color: '#2563eb', fontWeight: 700 }}>
                      Day: {activeDayName}
                    </span>
                  </div>
                  <input
                    type="date"
                    value={singleDate}
                    onChange={(e) => setSingleDate(e.target.value)}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', outline: 'none', fontWeight: 600 }}
                    required
                  />
                </div>
              )}

              {/* Roster & Availability Status Banner */}
              {overrideType !== 'date_range' && (
                scheduledDoctorsOnDate.length > 0 ? (
                  <div style={{ background: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: '8px', padding: '8px 12px', fontSize: '11.5px', color: '#065f46', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <CheckCircle size={14} color="#059669" />
                    <span>
                      <strong>{scheduledDoctorsOnDate.length} doctor{scheduledDoctorsOnDate.length > 1 ? 's' : ''}</strong> rostered at <strong>{branchName}</strong> on <strong>{activeDayName}</strong>
                    </span>
                  </div>
                ) : (
                  <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '8px', padding: '8px 12px', fontSize: '11.5px', color: '#92400e', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <AlertTriangle size={14} color="#d97706" />
                    <span>
                      ⚠️ No doctor normally rostered at <strong>{branchName}</strong> on <strong>{activeDayName}s</strong>.
                    </span>
                  </div>
                )
              )}

              {/* Doctor Selection (Strictly for this branch & scheduled on date) */}
              <div>
                <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>
                  3. Select Doctor (Only {branchName} Roster)
                </label>
                <select
                  value={doctorName}
                  onChange={(e) => setDoctorName(e.target.value)}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1.5px solid #2563eb', fontSize: '13px', outline: 'none', fontWeight: 700, background: '#f8fafc', color: '#0f172a' }}
                >
                  {availableModalDoctors.map(d => (
                    <option key={d.id} value={d.name}>
                      {d.name} — {d.timings}
                    </option>
                  ))}
                </select>
                <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>
                  * Doctors from other branches are hidden. Showing only doctors assigned to {branchName}.
                </div>
              </div>

              {/* Session Type */}
              {overrideType === 'session' && (
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>Session Block</label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <button
                      type="button"
                      onClick={() => setSession('morning')}
                      style={{
                        padding: '10px',
                        borderRadius: '8px',
                        border: session === 'morning' ? '2px solid #2563eb' : '1px solid #cbd5e1',
                        background: session === 'morning' ? '#eff6ff' : '#ffffff',
                        color: session === 'morning' ? '#1d4ed8' : '#475569',
                        fontWeight: 700,
                        fontSize: '12.5px',
                        cursor: 'pointer'
                      }}
                    >
                      🌅 Morning Session
                    </button>
                    <button
                      type="button"
                      onClick={() => setSession('evening')}
                      style={{
                        padding: '10px',
                        borderRadius: '8px',
                        border: session === 'evening' ? '2px solid #2563eb' : '1px solid #cbd5e1',
                        background: session === 'evening' ? '#eff6ff' : '#ffffff',
                        color: session === 'evening' ? '#1d4ed8' : '#475569',
                        fontWeight: 700,
                        fontSize: '12.5px',
                        cursor: 'pointer'
                      }}
                    >
                      🌆 Evening Session
                    </button>
                  </div>
                </div>
              )}

              {/* Time Range */}
              {overrideType === 'time_range' && (
                <div style={{ display: 'flex', gap: '10px' }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>Start Time</label>
                    <input
                      type="time"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', outline: 'none' }}
                      required
                    />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>End Time</label>
                    <input
                      type="time"
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                      style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', outline: 'none' }}
                      required
                    />
                  </div>
                </div>
              )}

              {/* Reason */}
              <div>
                <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>Reason for No Show</label>
                <input
                  type="text"
                  placeholder="e.g. Emergency Leave, Personal emergency, Health issue, Conference..."
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', outline: 'none' }}
                  required
                />
              </div>

              {/* Form Action Buttons */}
              <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  style={{ flex: 1, padding: '11px', background: '#f1f5f9', border: 'none', borderRadius: '8px', fontWeight: 700, color: '#64748b', cursor: 'pointer', fontSize: '13px' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  style={{ flex: 1, padding: '11px', background: '#dc2626', border: 'none', borderRadius: '8px', fontWeight: 800, color: '#ffffff', cursor: 'pointer', fontSize: '13px' }}
                >
                  {isSaving ? 'Saving Block...' : 'Save No Show Block'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export const WebDoctorNoShowPage = DoctorNoShowPage;
