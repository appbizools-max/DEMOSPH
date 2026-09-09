import React, { useState, useEffect, useMemo } from 'react';
import {
  RefreshCw, Search, Phone, Calendar, CheckCircle2, Clock,
  MessageSquare, User, Filter, AlertCircle, ArrowRight, ExternalLink
} from 'lucide-react';
import { db } from '@app/shared';
import { collection, onSnapshot, query, limit } from 'firebase/firestore';

interface FollowUpsPageProps {
  currentBranch?: string;
  onNavigate?: (tab: string, data?: any) => void;
}

export const FollowUpsPage: React.FC<FollowUpsPageProps> = ({
  currentBranch = 'KPHB Branch',
  onNavigate
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTabFilter, setActiveTabFilter] = useState<'all' | 'today' | 'overdue' | 'upcoming'>('all');

  const [rawPrescriptions, setRawPrescriptions] = useState<any[]>([]);
  const [rawAppointments, setRawAppointments] = useState<any[]>([]);
  const [rawAllPatients, setRawAllPatients] = useState<any[]>([]);

  // 1. Subscribe to Firestore Collections with Safety Limits
  useEffect(() => {
    if (!db) return;
    const unsubPresc = onSnapshot(query(collection(db, 'prescriptions'), limit(100)), (snap) => {
      const list: any[] = [];
      snap.forEach((d) => list.push({ id: d.id, ...d.data() }));
      setRawPrescriptions(list);
    }, (err) => console.warn('Prescriptions listener error:', err));

    const unsubAppts = onSnapshot(query(collection(db, 'appointments'), limit(100)), (snap) => {
      const list: any[] = [];
      snap.forEach((d) => list.push({ id: d.id, ...d.data() }));
      setRawAppointments(list);
    }, (err) => console.warn('Appointments listener error:', err));

    const unsubAllPat = onSnapshot(query(collection(db, 'allpatients'), limit(100)), (snap) => {
      const list: any[] = [];
      snap.forEach((d) => list.push({ id: d.id, ...d.data() }));
      setRawAllPatients(list);
    }, (err) => console.warn('AllPatients listener error:', err));

    return () => {
      unsubPresc();
      unsubAppts();
      unsubAllPat();
    };
  }, []);

  // Helper to format Date string to DD-MM-YYYY
  const formatNiceDate = (rawDate: any): string => {
    if (!rawDate) return '';
    if (typeof rawDate === 'string') {
      if (/^\d{2}-\d{2}-\d{4}$/.test(rawDate.trim())) return rawDate.trim();
      if (/^\d{4}-\d{2}-\d{2}$/.test(rawDate.trim())) {
        const [y, m, d] = rawDate.trim().split('-');
        return `${d}-${m}-${y}`;
      }
    }
    try {
      const dateObj = new Date(rawDate);
      if (!isNaN(dateObj.getTime())) {
        const d = String(dateObj.getDate()).padStart(2, '0');
        const m = String(dateObj.getMonth() + 1).padStart(2, '0');
        const y = dateObj.getFullYear();
        return `${d}-${m}-${y}`;
      }
    } catch (e) { }
    return String(rawDate);
  };

  // Helper to parse date for overdue comparison
  const parseDateToMs = (dateStr: string): number => {
    if (!dateStr) return 0;
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      if (parts[0].length === 4) {
        return new Date(`${parts[0]}-${parts[1]}-${parts[2]}`).getTime() || 0;
      }
      return new Date(`${parts[2]}-${parts[1]}-${parts[0]}`).getTime() || 0;
    }
    return new Date(dateStr).getTime() || 0;
  };

  // 2. Process & Deduplicate Live Follow-Up Items
  const followUpItems = useMemo(() => {
    const map = new Map<string, any>();
    const todayMs = new Date().setHours(0, 0, 0, 0);

    const processItem = (item: any, source: string) => {
      if (!item) return;
      const phone = (item.phone || item.phoneNumber || item.mobile || item.contact || '').toString().trim();
      const pName = (item.patientName || item.fullName || item.name || item.patient || '').toString().trim();
      if (!pName && !phone) return;

      const prefDateRaw = item.preferredFollowUpDate || item.followUpDate || item.nextFollowUpDate || item.scheduledDate;
      const interval = item.followUpInterval || item.interval || '15 Days';
      
      // Ignore items explicitly marked as No Follow-up
      if (interval === 'No Follow-up' && !prefDateRaw) return;

      const formattedPrefDate = formatNiceDate(prefDateRaw) || 'Pending Date';
      const cleanPhone = phone.replace(/\D/g, '').slice(-10);
      const regId = (item.regId || item.registrationId || item.patientId || (cleanPhone ? `REG-${cleanPhone.slice(-4)}` : 'REG-1001')).toUpperCase();
      
      const key = cleanPhone ? cleanPhone : `${pName.toLowerCase()}_${regId}`;

      const dateMs = parseDateToMs(formattedPrefDate);
      let status: 'overdue' | 'today' | 'upcoming' = 'upcoming';

      if (dateMs > 0) {
        if (dateMs < todayMs) status = 'overdue';
        else if (dateMs === todayMs) status = 'today';
      }

      if (!map.has(key) || (dateMs > 0 && parseDateToMs(map.get(key).preferredDate) < dateMs)) {
        map.set(key, {
          id: item.id || key,
          patientName: pName || 'Patient',
          phone: cleanPhone ? `+91 ${cleanPhone}` : 'N/A',
          rawPhone: cleanPhone,
          regId,
          doctorName: item.doctorName || item.doctor || 'Dr. Prashanth K Vaidya',
          branchName: item.branchName || item.branch || currentBranch,
          preferredDate: formattedPrefDate,
          followUpInterval: interval,
          diseases: item.diseases || item.diagnosisNotes || item.subject || 'General Follow-up',
          status,
          dateMs,
          source
        });
      }
    };

    rawPrescriptions.forEach(p => processItem(p, 'prescriptions'));
    rawAppointments.forEach(a => processItem(a, 'appointments'));
    rawAllPatients.forEach(p => processItem(p, 'allpatients'));

    const list = Array.from(map.values());
    list.sort((a, b) => b.dateMs - a.dateMs);
    return list;
  }, [rawPrescriptions, rawAppointments, rawAllPatients, currentBranch]);

  // Filtered List based on Search & Tabs
  const filteredItems = useMemo(() => {
    return followUpItems.filter(item => {
      const matchesTab = activeTabFilter === 'all' || item.status === activeTabFilter;
      const q = searchTerm.toLowerCase().trim();
      const matchesSearch = !q ||
        item.patientName.toLowerCase().includes(q) ||
        item.phone.includes(q) ||
        item.regId.toLowerCase().includes(q) ||
        item.doctorName.toLowerCase().includes(q);

      return matchesTab && matchesSearch;
    });
  }, [followUpItems, searchTerm, activeTabFilter]);

  // Statistics Counts
  const stats = useMemo(() => {
    let overdue = 0;
    let today = 0;
    let upcoming = 0;
    followUpItems.forEach(i => {
      if (i.status === 'overdue') overdue++;
      else if (i.status === 'today') today++;
      else upcoming++;
    });
    return { total: followUpItems.length, overdue, today, upcoming };
  }, [followUpItems]);

  const handleBookNext = (item: any) => {
    if (onNavigate) {
      onNavigate('reception_book', {
        fullName: item.patientName,
        phone: item.rawPhone,
        regID: item.regId,
        diseases: item.diseases
      });
    }
  };

  return (
    <div style={{ padding: '24px', maxWidth: '1280px', margin: '0 auto', fontFamily: 'Inter, system-ui, sans-serif' }}>
      {/* HEADER SECTION */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ background: '#e0f2fe', padding: '12px', borderRadius: '16px', color: '#0284c7' }}>
            <RefreshCw size={28} />
          </div>
          <div>
            <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#0f172a', margin: 0 }}>
              Patient Follow-Ups
            </h1>
            <p style={{ color: '#64748b', fontSize: '13px', margin: '3px 0 0 0', fontWeight: 500 }}>
              Live preferred follow-up dates recorded during consultations ({currentBranch})
            </p>
          </div>
        </div>

        {/* SEARCH BAR */}
        <div style={{
          background: '#ffffff',
          border: '1.5px solid #cbd5e1',
          borderRadius: '12px',
          padding: '0 14px',
          height: '44px',
          display: 'flex',
          alignItems: 'center',
          width: '320px',
          boxShadow: '0 2px 6px rgba(0,0,0,0.04)'
        }}>
          <Search size={18} color="#64748b" style={{ marginRight: '10px' }} />
          <input
            type="text"
            placeholder="Search by patient, phone, or reg ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ border: 'none', outline: 'none', width: '100%', fontSize: '13.5px', color: '#0f172a', fontWeight: 600 }}
          />
        </div>
      </div>

      {/* STATS SUMMARY CARDS */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        <div onClick={() => setActiveTabFilter('all')} style={{
          background: activeTabFilter === 'all' ? '#f0f9ff' : '#ffffff',
          border: activeTabFilter === 'all' ? '2px solid #0284c7' : '1px solid #e2e8f0',
          borderRadius: '14px', padding: '16px', cursor: 'pointer', transition: 'all 0.15s'
        }}>
          <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Total Follow-Ups</div>
          <div style={{ fontSize: '26px', fontWeight: 800, color: '#0284c7', marginTop: '4px' }}>{stats.total}</div>
        </div>

        <div onClick={() => setActiveTabFilter('today')} style={{
          background: activeTabFilter === 'today' ? '#fffbeb' : '#ffffff',
          border: activeTabFilter === 'today' ? '2px solid #d97706' : '1px solid #e2e8f0',
          borderRadius: '14px', padding: '16px', cursor: 'pointer', transition: 'all 0.15s'
        }}>
          <div style={{ fontSize: '12px', color: '#d97706', fontWeight: 700, textTransform: 'uppercase' }}>Due Today</div>
          <div style={{ fontSize: '26px', fontWeight: 800, color: '#b45309', marginTop: '4px' }}>{stats.today}</div>
        </div>

        <div onClick={() => setActiveTabFilter('overdue')} style={{
          background: activeTabFilter === 'overdue' ? '#fef2f2' : '#ffffff',
          border: activeTabFilter === 'overdue' ? '2px solid #ef4444' : '1px solid #e2e8f0',
          borderRadius: '14px', padding: '16px', cursor: 'pointer', transition: 'all 0.15s'
        }}>
          <div style={{ fontSize: '12px', color: '#ef4444', fontWeight: 700, textTransform: 'uppercase' }}>Overdue</div>
          <div style={{ fontSize: '26px', fontWeight: 800, color: '#b91c1c', marginTop: '4px' }}>{stats.overdue}</div>
        </div>

        <div onClick={() => setActiveTabFilter('upcoming')} style={{
          background: activeTabFilter === 'upcoming' ? '#f0fdf4' : '#ffffff',
          border: activeTabFilter === 'upcoming' ? '2px solid #16a34a' : '1px solid #e2e8f0',
          borderRadius: '14px', padding: '16px', cursor: 'pointer', transition: 'all 0.15s'
        }}>
          <div style={{ fontSize: '12px', color: '#16a34a', fontWeight: 700, textTransform: 'uppercase' }}>Upcoming</div>
          <div style={{ fontSize: '26px', fontWeight: 800, color: '#15803d', marginTop: '4px' }}>{stats.upcoming}</div>
        </div>
      </div>

      {/* MAIN TABLE DATA */}
      <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 4px 16px rgba(0,0,0,0.02)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13.5px' }}>
          <thead>
            <tr style={{ background: '#f8fafc', borderBottom: '1.5px solid #e2e8f0', textAlign: 'left', color: '#64748b', fontSize: '11.5px', fontWeight: 800, textTransform: 'uppercase' }}>
              <th style={{ padding: '14px 16px' }}>Patient Info</th>
              <th style={{ padding: '14px 16px' }}>Doctor & Branch</th>
              <th style={{ padding: '14px 16px' }}>Preferred Date</th>
              <th style={{ padding: '14px 16px' }}>Interval</th>
              <th style={{ padding: '14px 16px' }}>Status</th>
              <th style={{ padding: '14px 16px', textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredItems.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', padding: '48px', color: '#94a3b8', fontWeight: 600 }}>
                  No follow-up records found.
                </td>
              </tr>
            ) : (
              filteredItems.map((item) => (
                <tr key={item.id} style={{ borderBottom: '1px solid #f1f5f9', transition: 'background 0.1s' }}>
                  {/* PATIENT INFO */}
                  <td style={{ padding: '14px 16px' }}>
                    <div style={{ fontWeight: 700, color: '#0f172a' }}>{item.patientName}</div>
                    <div style={{ fontSize: '12px', color: '#64748b', display: 'flex', gap: '8px', marginTop: '2px' }}>
                      <span style={{ color: '#0284c7', fontWeight: 700 }}>{item.regId}</span>
                      <span>•</span>
                      <span>{item.phone}</span>
                    </div>
                  </td>

                  {/* DOCTOR & BRANCH */}
                  <td style={{ padding: '14px 16px' }}>
                    <div style={{ fontWeight: 600, color: '#334155' }}>{item.doctorName}</div>
                    <div style={{ fontSize: '11.5px', color: '#64748b' }}>📍 {item.branchName}</div>
                  </td>

                  {/* PREFERRED FOLLOW UP DATE */}
                  <td style={{ padding: '14px 16px' }}>
                    <div style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      background: '#f0f9ff',
                      border: '1px solid #bae6fd',
                      color: '#0369a1',
                      padding: '4px 10px',
                      borderRadius: '8px',
                      fontWeight: 800,
                      fontSize: '13px'
                    }}>
                      <Calendar size={14} color="#0284c7" />
                      {item.preferredDate}
                    </div>
                  </td>

                  {/* INTERVAL */}
                  <td style={{ padding: '14px 16px', fontWeight: 600, color: '#475569' }}>
                    {item.followUpInterval}
                  </td>

                  {/* STATUS */}
                  <td style={{ padding: '14px 16px' }}>
                    {item.status === 'overdue' && (
                      <span style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', padding: '3px 9px', borderRadius: '10px', fontSize: '11.5px', fontWeight: 800 }}>
                        ⚠️ Overdue
                      </span>
                    )}
                    {item.status === 'today' && (
                      <span style={{ background: '#fffbeb', border: '1px solid #fde68a', color: '#d97706', padding: '3px 9px', borderRadius: '10px', fontSize: '11.5px', fontWeight: 800 }}>
                        🔔 Due Today
                      </span>
                    )}
                    {item.status === 'upcoming' && (
                      <span style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#16a34a', padding: '3px 9px', borderRadius: '10px', fontSize: '11.5px', fontWeight: 800 }}>
                        📅 Scheduled
                      </span>
                    )}
                  </td>

                  {/* ACTIONS */}
                  <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '8px' }}>
                      {item.rawPhone ? (
                        <a
                          href={`tel:${item.rawPhone}`}
                          style={{
                            background: '#f1f5f9', color: '#334155', border: 'none',
                            padding: '6px 10px', borderRadius: '8px', fontWeight: 700,
                            display: 'inline-flex', alignItems: 'center', gap: '4px', textDecoration: 'none', fontSize: '12px'
                          }}
                        >
                          <Phone size={13} color="#0284c7" /> Call
                        </a>
                      ) : null}

                      {item.rawPhone ? (
                        <a
                          href={`https://wa.me/91${item.rawPhone}?text=${encodeURIComponent(`Hello ${item.patientName}, this is a reminder from SPH Clinic regarding your scheduled follow-up on ${item.preferredDate}. Please let us know your available time slot.`)}`}
                          target="_blank"
                          rel="noreferrer"
                          style={{
                            background: '#dcfce7', color: '#15803d', border: 'none',
                            padding: '6px 10px', borderRadius: '8px', fontWeight: 700,
                            display: 'inline-flex', alignItems: 'center', gap: '4px', textDecoration: 'none', fontSize: '12px'
                          }}
                        >
                          <MessageSquare size={13} color="#16a34a" /> WhatsApp
                        </a>
                      ) : null}

                      <button
                        onClick={() => handleBookNext(item)}
                        style={{
                          background: '#0284c7', color: '#ffffff', border: 'none',
                          padding: '6px 12px', borderRadius: '8px', fontWeight: 700,
                          cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '12px'
                        }}
                      >
                        Book Next Slot <ArrowRight size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
