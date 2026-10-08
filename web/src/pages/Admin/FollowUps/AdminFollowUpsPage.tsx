import React, { useState, useEffect, useMemo } from 'react';
import {
  Calendar, Clock, Phone, MessageSquare, Search, ChevronLeft, ChevronRight,
  RefreshCw, Building2, User, FileText, CheckCircle2, AlertTriangle, Layers, Download, FileSpreadsheet
} from 'lucide-react';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from '@app/shared';

export interface AdminFollowUpItem {
  id: string;
  patientName: string;
  phone: string;
  regId: string;
  doctorName: string;
  branchName: string;
  scheduledDate: string; // YYYY-MM-DD
  interval: string;
  notes: string;
  status: 'today' | 'overdue' | 'this_month' | 'next_month' | 'upcoming';
  dateMs: number;
  raw?: any;
}

const BRANCHES = [
  'All Branches',
  'KPHB Branch',
  'Chandanagar Branch',
  'Dilshuknagar Branch',
  'Nallagandla Branch',
];

const DOCTORS = [
  'All Doctors',
  'Dr. Prashanth K Vaidya',
  'Dr. Ramakrishna Chanduri',
  'Dr. Padma Priya',
  'Dr. Jobedah Parveez',
];

const normalizeBranchKey = (branch?: string): string => {
  if (!branch) return '';
  const s = branch.toLowerCase().trim();
  if (s.includes('kphb') || s.includes('kpb') || s.includes('kukatpally')) return 'kphb';
  if (s.includes('chanda') || s.includes('chn') || s.includes('chandna')) return 'chanda';
  if (s.includes('dilshuk') || s.includes('dsnr') || s.includes('dilsukh') || s.includes('dshnr')) return 'dsnr';
  if (s.includes('nalla') || s.includes('ngl')) return 'nalla';
  return s.replace(/\s*branch\s*/i, '').trim();
};

const getCanonicalBranchName = (raw?: string, regId?: string, doctorName?: string): string => {
  const k = normalizeBranchKey(raw);
  if (k === 'kphb') return 'KPHB Branch';
  if (k === 'chanda') return 'Chandanagar Branch';
  if (k === 'dsnr') return 'Dilshuknagar Branch';
  if (k === 'nalla') return 'Nallagandla Branch';

  const reg = (regId || '').toUpperCase();
  if (reg.includes('CHN') || reg.includes('CHAN')) return 'Chandanagar Branch';
  if (reg.includes('DIL') || reg.includes('DSN')) return 'Dilshuknagar Branch';
  if (reg.includes('NGL') || reg.includes('NAL')) return 'Nallagandla Branch';
  if (reg.includes('KPB') || reg.includes('KPHB')) return 'KPHB Branch';

  const doc = (doctorName || '').toLowerCase();
  if (doc.includes('padma')) return 'Chandanagar Branch';
  if (doc.includes('ramakrishna') || doc.includes('jobedah')) return 'Dilshuknagar Branch';

  return 'KPHB Branch';
};

const getCanonicalDoctorName = (rawName?: string): string => {
  if (!rawName) return 'Dr. Prashanth K Vaidya';
  let clean = String(rawName).trim();
  clean = clean.replace(/^(dr\.?\s*)+/i, '').trim();
  const lower = clean.toLowerCase();

  if (lower.includes('prashanth') || lower.includes('vaidya') || lower.includes('prashant')) {
    return 'Dr. Prashanth K Vaidya';
  }
  if (lower.includes('ramakrishna') || lower.includes('rama krishna') || lower.includes('chanduri') || lower === 'rk') {
    return 'Dr. Ramakrishna Chanduri';
  }
  if (lower.includes('padma') || lower.includes('priya')) {
    return 'Dr. Padma Priya';
  }
  if (lower.includes('jobedah') || lower.includes('jobeadh') || lower.includes('parveez') || lower.includes('parveej') || lower.includes('zobeda')) {
    return 'Dr. Jobedah Parveez';
  }

  return clean ? `Dr. ${clean}` : 'Dr. Prashanth K Vaidya';
};

const isBranchMatching = (b1: string, b2?: string): boolean => {
  if (!b2 || b2 === 'all' || b2 === 'All Branches' || b2.toLowerCase().trim() === 'all branches') return true;
  const k1 = normalizeBranchKey(b1);
  const k2 = normalizeBranchKey(b2);
  if (!k1 || !k2) return false;
  return k1 === k2;
};

const formatISO = (rawDate: any): string => {
  if (!rawDate) return '';
  const clean = String(rawDate).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(clean)) return clean;
  if (clean.includes('T')) return clean.split('T')[0];
  if (clean.includes('/') || clean.includes('-')) {
    const parts = clean.split(/[\/\-]/);
    if (parts.length === 3) {
      let dd = parts[0].padStart(2, '0');
      let mm = parts[1].padStart(2, '0');
      let yyyy = parts[2];
      if (parts[0].length === 4) {
        yyyy = parts[0];
        mm = parts[1].padStart(2, '0');
        dd = parts[2].padStart(2, '0');
      }
      return `${yyyy}-${mm}-${dd}`;
    }
  }
  return clean;
};

const formatDisplayDate = (isoStr: string): string => {
  if (!isoStr) return 'Pending Date';
  if (/^\d{4}-\d{2}-\d{2}$/.test(isoStr)) {
    const [y, m, d] = isoStr.split('-');
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthIdx = parseInt(m, 10) - 1;
    return `${d} ${months[monthIdx] || m} ${y}`;
  }
  return isoStr;
};

export const AdminFollowUpsPage: React.FC = () => {
  const [rawFollowups, setRawFollowups] = useState<any[]>([]);
  const [rawPrescriptions, setRawPrescriptions] = useState<any[]>([]);
  const [rawAppointments, setRawAppointments] = useState<any[]>([]);
  const [rawAllPatients, setRawAllPatients] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Filters
  const [selectedBranch, setSelectedBranch] = useState<string>('All Branches');
  const [selectedDoctor, setSelectedDoctor] = useState<string>('All Doctors');
  const [activeDateTab, setActiveDateTab] = useState<'all' | 'today' | 'overdue' | 'this_month' | 'next_month' | 'custom_date' | 'custom_month'>('all');
  const [customDateISO, setCustomDateISO] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [customMonthStr, setCustomMonthStr] = useState<string>(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Pagination Controls (15 or 25 per page as requested)
  const [pageSize, setPageSize] = useState<number>(15);
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Today ISO and month strings
  const todayISO = useMemo(() => new Date().toISOString().split('T')[0], []);
  const thisMonthStr = useMemo(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  }, []);
  const nextMonthStr = useMemo(() => {
    const now = new Date();
    const next = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    return `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}`;
  }, []);

  // Listen to Firestore `followups`, `prescriptions`, `appointments`, and `allpatients`
  useEffect(() => {
    if (!db) return;
    setIsLoading(true);

    const unsubFollowups = onSnapshot(collection(db, 'followups'), (snapshot) => {
      const list: any[] = [];
      snapshot.forEach((docSnap) => list.push({ id: docSnap.id, ...docSnap.data() }));
      setRawFollowups(list);
      setIsLoading(false);
    }, (err) => {
      console.warn('Admin followups collection listener:', err);
      setIsLoading(false);
    });

    const unsubPrescriptions = onSnapshot(collection(db, 'prescriptions'), (snapshot) => {
      const list: any[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        const { canvasData, drawingPoints, strokes, imageBase64, canvasImage, ...lightData } = data as any;
        list.push({ id: docSnap.id, ...lightData });
      });
      setRawPrescriptions(list);
      setIsLoading(false);
    }, (err) => {
      console.warn('Admin prescriptions listener:', err);
      setIsLoading(false);
    });

    const unsubAppointments = onSnapshot(collection(db, 'appointments'), (snapshot) => {
      const list: any[] = [];
      snapshot.forEach((docSnap) => list.push({ id: docSnap.id, ...docSnap.data() }));
      setRawAppointments(list);
      setIsLoading(false);
    }, (err) => {
      console.warn('Admin appointments listener:', err);
      setIsLoading(false);
    });

    const unsubAllPatients = onSnapshot(collection(db, 'allpatients'), (snapshot) => {
      const list: any[] = [];
      snapshot.forEach((docSnap) => list.push({ id: docSnap.id, ...docSnap.data() }));
      setRawAllPatients(list);
      setIsLoading(false);
    }, (err) => {
      console.warn('Admin allpatients listener:', err);
      setIsLoading(false);
    });

    return () => {
      unsubFollowups();
      unsubPrescriptions();
      unsubAppointments();
      unsubAllPatients();
    };
  }, []);

  // Active appointments lookup matching Reception exactly: skips patients who currently have a booked appointment
  const activeAppointmentsByPatient = useMemo(() => {
    const activeMap = new Map<string, Set<string>>();
    const addActive = (key: string, dateStr: string) => {
      if (!key || !dateStr) return;
      if (!activeMap.has(key)) activeMap.set(key, new Set());
      activeMap.get(key)!.add(dateStr);
    };

    rawAppointments.forEach((app) => {
      if (!app) return;
      const st = (app.status || '').toLowerCase();
      const isActive = st === 'waiting' || st === 'booked' || st === 'confirmed' || st === 'in_consultation' || st === 'pending';
      if (!isActive) return;

      const dateISO = formatISO(app.appointmentDate || app.date);
      const pDigits = (app.phone || app.phoneNumber || app.mobile || '').toString().replace(/\D/g, '').slice(-10);
      const rId = (app.registrationId || app.regId || '').toString().trim().toUpperCase();
      const pName = (app.patientName || app.name || '').toString().trim().toLowerCase();

      if (pDigits) addActive(pDigits, dateISO);
      if (rId) addActive(rId, dateISO);
      if (pName && rId) addActive(`${pName}_${rId}`, dateISO);
    });

    return activeMap;
  }, [rawAppointments]);

  // Aggregate and deduplicate follow-ups matching Reception logic
  const followups = useMemo(() => {
    const map = new Map<string, AdminFollowUpItem>();
    const seenPatientFollowups = new Set<string>();

    const processItem = (data: any, isPrimaryFollowup = false) => {
      if (!data) return;

      // Skip if explicitly marked as completed or booked
      if (
        data.followUpStatus === 'completed' ||
        data.followUpStatus === 'booked' ||
        data.followUpBooked === true ||
        data.isFollowUpCompleted === true ||
        (data.status === 'booked' && !data.appointmentTime)
      ) {
        return;
      }

      const itemId = data.id || data.raw?.id || '';
      const phone = String(data.phone || data.phoneNumber || data.mobile || data.contact || '').trim();
      const pName = String(data.patientName || data.name || data.fullName || data.patient || '').trim();
      if (!pName && !phone) return;

      const cleanPhone = phone.replace(/\D/g, '').slice(-10);
      const rawReg = (data.regId || data.registrationId || '').toString().trim();
      const isDocId = /^[a-zA-Z0-9]{19,32}$/.test(rawReg) || /^PAT-\d+$/i.test(rawReg);
      const docName = getCanonicalDoctorName(data.doctorName || data.doctor || data.assignedDoctor);
      const bName = getCanonicalBranchName(data.branch || data.branchName || data.assignedBranch, rawReg, docName);
      const shortcut = bName.includes('Chanda') ? 'CHN' : bName.includes('Nalla') ? 'NGL' : bName.includes('Dilshuk') ? 'DIL' : 'KPB';
      const regId = (rawReg && !isDocId ? rawReg : (cleanPhone ? `SPH-${shortcut}-${cleanPhone.slice(-4)}` : `SPH-${shortcut}-0001`)).toUpperCase();

      const rawPrefDate = data.scheduledDate || data.preferredFollowUpDate || data.followUpDate || data.nextFollowUpDate;
      const interval = data.interval || data.followUpInterval || '15 Days';
      if (!rawPrefDate && interval === 'No Follow-up') return;
      if (!rawPrefDate) return;

      const prefDateISO = formatISO(rawPrefDate);
      if (!prefDateISO) return;

      // Skip if patient already has an active booked appointment for this follow-up date or upcoming/today
      const patientApptDates = (cleanPhone ? activeAppointmentsByPatient.get(cleanPhone) : undefined) ||
        (regId ? activeAppointmentsByPatient.get(regId) : undefined);
      if (patientApptDates) {
        if (patientApptDates.has(prefDateISO)) return;
        for (const d of patientApptDates) {
          if (d >= todayISO && prefDateISO <= todayISO) {
            return;
          }
        }
      }

      let status: 'today' | 'overdue' | 'this_month' | 'next_month' | 'upcoming' = 'upcoming';
      if (prefDateISO < todayISO) {
        status = 'overdue';
      } else if (prefDateISO === todayISO) {
        status = 'today';
      } else if (prefDateISO.startsWith(thisMonthStr)) {
        status = 'this_month';
      } else if (prefDateISO.startsWith(nextMonthStr)) {
        status = 'next_month';
      }

      // Exact deduplication signature as Reception
      const dedupSignature = cleanPhone ? `${cleanPhone}_${prefDateISO}` : `${pName.toLowerCase()}_${regId}_${prefDateISO}`;
      const dateMs = new Date(prefDateISO).getTime() || 0;

      const itemObj: AdminFollowUpItem = {
        id: itemId || dedupSignature,
        patientName: pName || 'Patient',
        phone: cleanPhone ? `+91 ${cleanPhone}` : phone,
        regId,
        doctorName: docName,
        branchName: bName,
        scheduledDate: prefDateISO,
        interval,
        notes: data.notes || data.diseases || data.diagnosisNotes || data.subject || 'General Follow-up',
        status,
        dateMs,
        raw: data
      };

      if (isPrimaryFollowup) {
        map.set(itemId || dedupSignature, itemObj);
        seenPatientFollowups.add(dedupSignature);
      } else {
        if (seenPatientFollowups.has(dedupSignature)) return;
        const key = itemId || dedupSignature;
        if (map.has(key)) return;
        map.set(key, itemObj);
        seenPatientFollowups.add(dedupSignature);
      }
    };

    rawFollowups.forEach((item) => processItem(item, true));
    rawPrescriptions.forEach((item) => processItem(item, false));
    rawAppointments.forEach((item) => processItem(item, false));
    rawAllPatients.forEach((item) => processItem(item, false));

    return Array.from(map.values()).sort((a, b) => b.dateMs - a.dateMs);
  }, [rawFollowups, rawPrescriptions, rawAppointments, rawAllPatients, activeAppointmentsByPatient, todayISO, thisMonthStr, nextMonthStr]);

  // Real-time branch count stats
  const branchCounts = useMemo(() => {
    const counts: Record<string, number> = { 'All Branches': followups.length };
    BRANCHES.slice(1).forEach((b) => {
      counts[b] = followups.filter((f) => isBranchMatching(f.branchName, b)).length;
    });
    return counts;
  }, [followups]);

  // Real-time doctor count stats (scoped to selected branch)
  const doctorCounts = useMemo(() => {
    const branchScoped = selectedBranch === 'All Branches'
      ? followups
      : followups.filter((f) => isBranchMatching(f.branchName, selectedBranch));

    const counts: Record<string, number> = { 'All Doctors': branchScoped.length };
    DOCTORS.slice(1).forEach((doc) => {
      counts[doc] = branchScoped.filter((f) => f.doctorName === doc).length;
    });
    return counts;
  }, [followups, selectedBranch]);

  // Status Tab Counts based on currently selected branch & doctor
  const statusCounts = useMemo(() => {
    let scoped = followups;
    if (selectedBranch !== 'All Branches') {
      scoped = scoped.filter((f) => isBranchMatching(f.branchName, selectedBranch));
    }
    if (selectedDoctor !== 'All Doctors') {
      scoped = scoped.filter((f) => f.doctorName === selectedDoctor);
    }

    let today = 0, overdue = 0, thisMonth = 0, nextMonth = 0, customDateCount = 0, customMonthCount = 0;
    scoped.forEach((i) => {
      const pDate = i.scheduledDate;
      if (pDate === todayISO) today++;
      if (pDate < todayISO) overdue++;
      if (pDate.startsWith(thisMonthStr)) thisMonth++;
      if (pDate.startsWith(nextMonthStr)) nextMonth++;
      if (pDate === customDateISO) customDateCount++;
      if (pDate.startsWith(customMonthStr)) customMonthCount++;
    });

    return {
      all: scoped.length,
      today,
      overdue,
      this_month: thisMonth,
      next_month: nextMonth,
      custom_date: customDateCount,
      custom_month: customMonthCount,
    };
  }, [followups, selectedBranch, selectedDoctor, todayISO, thisMonthStr, nextMonthStr, customDateISO, customMonthStr]);

  // Multi-Criteria Filtered Items matching Reception tab definitions
  const filteredItems = useMemo(() => {
    return followups.filter((item) => {
      // 1. Branch Filter
      if (selectedBranch !== 'All Branches' && !isBranchMatching(item.branchName, selectedBranch)) {
        return false;
      }

      // 2. Doctor Filter
      if (selectedDoctor !== 'All Doctors' && item.doctorName !== selectedDoctor) {
        return false;
      }

      // 3. Date / Status Tab Filter matching Reception
      if (activeDateTab === 'today' && item.scheduledDate !== todayISO) return false;
      if (activeDateTab === 'overdue' && item.scheduledDate >= todayISO) return false;
      if (activeDateTab === 'this_month' && !item.scheduledDate.startsWith(thisMonthStr)) return false;
      if (activeDateTab === 'next_month' && !item.scheduledDate.startsWith(nextMonthStr)) return false;
      if (activeDateTab === 'custom_date' && item.scheduledDate !== customDateISO) return false;
      if (activeDateTab === 'custom_month' && !item.scheduledDate.startsWith(customMonthStr)) return false;

      // 4. Search Query Filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesName = item.patientName.toLowerCase().includes(q);
        const matchesPhone = item.phone.replace(/\D/g, '').includes(q.replace(/\D/g, ''));
        const matchesReg = item.regId.toLowerCase().includes(q);
        const matchesDoc = item.doctorName.toLowerCase().includes(q);
        const matchesNotes = item.notes.toLowerCase().includes(q);
        if (!matchesName && !matchesPhone && !matchesReg && !matchesDoc && !matchesNotes) {
          return false;
        }
      }

      return true;
    });
  }, [followups, selectedBranch, selectedDoctor, activeDateTab, searchQuery, todayISO, thisMonthStr, nextMonthStr, customDateISO, customMonthStr]);

  // Reset pagination on filter change
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedBranch, selectedDoctor, activeDateTab, searchQuery, pageSize, customDateISO, customMonthStr]);

  // Page-wise Pagination calculations (Strict 15 or 25 members per page)
  const totalPages = Math.max(1, Math.ceil(filteredItems.length / pageSize));
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, filteredItems.length);
  const paginatedItems = useMemo(() => {
    return filteredItems.slice(startIndex, endIndex);
  }, [filteredItems, startIndex, endIndex]);

  const openWhatsApp = (phoneStr: string, patName: string, docName: string) => {
    const cleanDigits = phoneStr.replace(/\D/g, '').slice(-10);
    if (!cleanDigits) return;
    const msg = encodeURIComponent(`Hello ${patName}, this is regarding your upcoming follow-up with ${docName} at Spiritual Homeopathy.`);
    window.open(`https://wa.me/91${cleanDigits}?text=${msg}`, '_blank');
  };

  const handleExportToExcel = () => {
    if (filteredItems.length === 0) {
      alert('No follow-up records found matching the current filter to export.');
      return;
    }

    const headers = [
      'Sl No',
      'Patient Name',
      'Phone Number',
      'Registration ID',
      'Branch Name',
      'Consulting Doctor',
      'Follow-Up Date',
      'Interval',
      'Diagnosis / Notes',
      'Status'
    ];

    const escapeCsvField = (field: any): string => {
      if (field === null || field === undefined) return '""';
      const str = String(field).replace(/"/g, '""');
      return `"${str}"`;
    };

    const rows = filteredItems.map((item, idx) => {
      const badge = getStatusBadgeStyle(item.scheduledDate);
      return [
        idx + 1,
        escapeCsvField(item.patientName),
        escapeCsvField(item.phone),
        escapeCsvField(item.regId),
        escapeCsvField(item.branchName),
        escapeCsvField(item.doctorName),
        escapeCsvField(item.scheduledDate),
        escapeCsvField(item.interval),
        escapeCsvField(item.notes),
        escapeCsvField(badge.label)
      ].join(',');
    });

    // UTF-8 BOM so Excel opens Hindi, special characters, and columns cleanly
    const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');

    const cleanBranch = selectedBranch.replace(/\s+/g, '_');
    const filterTag = activeDateTab === 'custom_date' 
      ? customDateISO 
      : activeDateTab === 'custom_month' 
      ? customMonthStr 
      : activeDateTab.toUpperCase();
    const today = new Date().toISOString().split('T')[0];

    link.setAttribute('href', url);
    link.setAttribute('download', `SPH_FollowUps_${cleanBranch}_${filterTag}_${today}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const getBranchBadgeStyle = (branch: string) => {
    if (branch.includes('KPHB')) return { bg: '#eff6ff', color: '#1d4ed8', border: '#bfdbfe' };
    if (branch.includes('Chanda')) return { bg: '#ecfdf5', color: '#047857', border: '#a7f3d0' };
    if (branch.includes('Dilshuk')) return { bg: '#f5f3ff', color: '#6d28d9', border: '#ddd6fe' };
    if (branch.includes('Nalla')) return { bg: '#fffbeb', color: '#b45309', border: '#fde68a' };
    return { bg: '#f1f5f9', color: '#475569', border: '#cbd5e1' };
  };

  const getStatusBadgeStyle = (scheduledDate: string) => {
    if (scheduledDate === todayISO) return { bg: '#fffbeb', color: '#b45309', border: '#fef3c7', label: 'TODAY' };
    if (scheduledDate < todayISO) return { bg: '#fef2f2', color: '#dc2626', border: '#fee2e2', label: 'OVERDUE' };
    if (scheduledDate.startsWith(thisMonthStr)) return { bg: '#eff6ff', color: '#0284c7', border: '#e0f2fe', label: 'THIS MONTH' };
    if (scheduledDate.startsWith(nextMonthStr)) return { bg: '#f5f3ff', color: '#7c3aed', border: '#ede9fe', label: 'NEXT MONTH' };
    return { bg: '#f0fdf4', color: '#16a34a', border: '#dcfce7', label: 'UPCOMING' };
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* 1. Header Banner & Aggregate Counters */}
      <div style={{
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '18px',
        padding: '20px 24px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '16px'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
            <span style={{
              background: '#e0f2fe',
              color: '#0284c7',
              padding: '3px 10px',
              borderRadius: '8px',
              fontSize: '11px',
              fontWeight: 800,
              textTransform: 'uppercase',
              letterSpacing: '0.04em'
            }}>
              ADMIN & HR OPERATIONS
            </span>
            <span style={{ fontSize: '12px', color: '#94a3b8', fontWeight: 600 }}>•</span>
            <span style={{ fontSize: '12.5px', color: '#64748b', fontWeight: 700 }}>
              {followups.length} Total Registered Follow-Ups
            </span>
          </div>
          <h1 style={{ fontSize: '20px', fontWeight: 800, color: '#0f172a', margin: 0 }}>
            Patient Follow-Ups Directory
          </h1>
          <p style={{ fontSize: '13px', color: '#64748b', margin: '4px 0 0 0' }}>
            Comprehensive cross-branch follow-up registry with branch filtering, page-wise pagination, and instant patient lookup.
          </p>
        </div>

        {/* Aggregate Stats Badges */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '8px 14px', textAlign: 'center' }}>
            <div style={{ fontSize: '10px', color: '#64748b', fontWeight: 800 }}>TODAY</div>
            <div style={{ fontSize: '17px', fontWeight: 800, color: '#b45309' }}>{statusCounts.today}</div>
          </div>
          <div style={{ background: '#fef2f2', border: '1px solid #fee2e2', borderRadius: '12px', padding: '8px 14px', textAlign: 'center' }}>
            <div style={{ fontSize: '10px', color: '#dc2626', fontWeight: 800 }}>OVERDUE</div>
            <div style={{ fontSize: '17px', fontWeight: 800, color: '#dc2626' }}>{statusCounts.overdue}</div>
          </div>
          <div style={{ background: '#eff6ff', border: '1px solid #e0f2fe', borderRadius: '12px', padding: '8px 14px', textAlign: 'center' }}>
            <div style={{ fontSize: '10px', color: '#0284c7', fontWeight: 800 }}>THIS MONTH</div>
            <div style={{ fontSize: '17px', fontWeight: 800, color: '#0284c7' }}>{statusCounts.this_month}</div>
          </div>
          <div style={{ background: '#f0fdf4', border: '1px solid #dcfce7', borderRadius: '12px', padding: '8px 14px', textAlign: 'center' }}>
            <div style={{ fontSize: '10px', color: '#16a34a', fontWeight: 800 }}>TOTAL ACTIVE</div>
            <div style={{ fontSize: '17px', fontWeight: 800, color: '#16a34a' }}>{statusCounts.all}</div>
          </div>
        </div>
      </div>

      {/* 2. Branch Filter Bar (All Branches & Individual Branches) */}
      <div style={{
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '16px',
        padding: '12px 18px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '12px',
        boxShadow: '0 2px 6px rgba(0,0,0,0.015)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginRight: '6px', color: '#475569', fontSize: '12px', fontWeight: 800 }}>
            <Building2 size={16} color="#0284c7" />
            <span>BRANCH:</span>
          </div>
          {BRANCHES.map((b) => {
            const isSelected = selectedBranch === b;
            const count = branchCounts[b] || 0;
            return (
              <button
                key={b}
                type="button"
                onClick={() => setSelectedBranch(b)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 14px',
                  borderRadius: '10px',
                  border: isSelected ? '1px solid #0284c7' : '1px solid #cbd5e1',
                  background: isSelected ? '#0284c7' : '#ffffff',
                  color: isSelected ? '#ffffff' : '#334155',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  boxShadow: isSelected ? '0 2px 8px rgba(2,132,199,0.25)' : 'none'
                }}
              >
                <span>{b}</span>
                <span style={{
                  background: isSelected ? 'rgba(255,255,255,0.28)' : '#f1f5f9',
                  color: isSelected ? '#ffffff' : '#64748b',
                  fontSize: '10.5px',
                  fontWeight: 800,
                  padding: '1px 6px',
                  borderRadius: '8px'
                }}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Page Size Selector (15 or 25 members per page) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 700 }}>Per Page:</span>
          <div style={{ display: 'flex', border: '1px solid #cbd5e1', borderRadius: '8px', overflow: 'hidden' }}>
            <button
              type="button"
              onClick={() => setPageSize(15)}
              style={{
                padding: '4px 10px',
                border: 'none',
                background: pageSize === 15 ? '#0284c7' : '#ffffff',
                color: pageSize === 15 ? '#ffffff' : '#475569',
                fontSize: '11.5px',
                fontWeight: 800,
                cursor: 'pointer'
              }}
            >
              15
            </button>
            <button
              type="button"
              onClick={() => setPageSize(25)}
              style={{
                padding: '4px 10px',
                border: 'none',
                borderLeft: '1px solid #cbd5e1',
                background: pageSize === 25 ? '#0284c7' : '#ffffff',
                color: pageSize === 25 ? '#ffffff' : '#475569',
                fontSize: '11.5px',
                fontWeight: 800,
                cursor: 'pointer'
              }}
            >
              25
            </button>
          </div>
        </div>
      </div>

      {/* 2b. Doctor Filter Bar */}
      <div style={{
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '16px',
        padding: '12px 18px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '12px',
        boxShadow: '0 2px 6px rgba(0,0,0,0.015)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginRight: '6px', color: '#475569', fontSize: '12px', fontWeight: 800 }}>
            <User size={16} color="#7c3aed" />
            <span>DOCTOR:</span>
          </div>
          {DOCTORS.map((doc) => {
            const isSelected = selectedDoctor === doc;
            const count = doctorCounts[doc] || 0;
            return (
              <button
                key={doc}
                type="button"
                onClick={() => setSelectedDoctor(doc)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 14px',
                  borderRadius: '10px',
                  border: isSelected ? '1px solid #7c3aed' : '1px solid #cbd5e1',
                  background: isSelected ? '#7c3aed' : '#ffffff',
                  color: isSelected ? '#ffffff' : '#334155',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  boxShadow: isSelected ? '0 2px 8px rgba(124, 58, 237, 0.25)' : 'none'
                }}
              >
                <span>{doc}</span>
                <span style={{
                  background: isSelected ? 'rgba(255,255,255,0.28)' : '#f1f5f9',
                  color: isSelected ? '#ffffff' : '#64748b',
                  fontSize: '10.5px',
                  fontWeight: 800,
                  padding: '1px 6px',
                  borderRadius: '8px'
                }}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. Date Tabs & Search Filter Bar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '14px'
      }}>
        {/* Status / Due Date Tabs */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
          {[
            { id: 'all', label: 'ALL', count: statusCounts.all },
            { id: 'today', label: 'TODAY', count: statusCounts.today },
            { id: 'overdue', label: 'OVERDUE', count: statusCounts.overdue },
            { id: 'this_month', label: 'THIS MONTH', count: statusCounts.this_month },
            { id: 'next_month', label: 'NEXT MONTH', count: statusCounts.next_month },
            { id: 'custom_date', label: 'CUSTOM DATE', count: statusCounts.custom_date },
            { id: 'custom_month', label: 'CUSTOM MONTH', count: statusCounts.custom_month },
          ].map((tab) => {
            const isActive = activeDateTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveDateTab(tab.id as any)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '7px 14px',
                  borderRadius: '10px',
                  border: isActive ? '1px solid #0f172a' : '1px solid #e2e8f0',
                  background: isActive ? '#0f172a' : '#ffffff',
                  color: isActive ? '#ffffff' : '#475569',
                  fontSize: '11.5px',
                  fontWeight: 800,
                  letterSpacing: '0.02em',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                <span>{tab.label}</span>
                <span style={{
                  background: isActive ? 'rgba(255,255,255,0.25)' : '#f1f5f9',
                  color: isActive ? '#ffffff' : '#0f172a',
                  fontSize: '10px',
                  fontWeight: 800,
                  padding: '1px 6px',
                  borderRadius: '6px'
                }}>
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Right side tools: Live Search & Export to Excel */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          {/* Live Search Input */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: '#ffffff',
            border: '1px solid #cbd5e1',
            borderRadius: '10px',
            padding: '6px 12px',
            width: '280px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
          }}>
            <Search size={16} color="#94a3b8" />
            <input
              type="text"
              placeholder="Search patient, phone, reg ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                border: 'none',
                outline: 'none',
                fontSize: '12.5px',
                width: '100%',
                color: '#0f172a'
              }}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#94a3b8', fontSize: '11px', fontWeight: 800 }}
              >
                ✕
              </button>
            )}
          </div>

          {/* Export to Excel Button */}
          <button
            type="button"
            onClick={handleExportToExcel}
            title={`Export ${filteredItems.length} filtered follow-up records to Excel`}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '7px 14px',
              borderRadius: '10px',
              border: '1px solid #16a34a',
              background: '#f0fdf4',
              color: '#15803d',
              fontSize: '12px',
              fontWeight: 800,
              cursor: 'pointer',
              transition: 'all 0.15s ease',
              whiteSpace: 'nowrap',
              boxShadow: '0 1px 3px rgba(22, 163, 74, 0.1)'
            }}
          >
            <Download size={15} color="#15803d" />
            <span>Export to Excel</span>
            <span style={{
              background: '#15803d',
              color: '#ffffff',
              fontSize: '10px',
              fontWeight: 800,
              padding: '1px 6px',
              borderRadius: '6px'
            }}>
              {filteredItems.length}
            </span>
          </button>
        </div>
      </div>

      {/* Inline Picker Controls when Custom Date or Custom Month is active */}
      {activeDateTab === 'custom_date' && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          background: '#eff6ff',
          border: '1.5px solid #258ec8',
          borderRadius: '12px',
          padding: '10px 18px',
          boxShadow: '0 2px 6px rgba(37, 142, 200, 0.08)',
          width: 'fit-content'
        }}>
          <Calendar size={18} color="#258ec8" />
          <span style={{ fontSize: '13px', fontWeight: 800, color: '#0369a1' }}>
            Filter by Date:
          </span>
          <input
            type="date"
            value={customDateISO}
            onChange={(e) => {
              if (e.target.value) setCustomDateISO(e.target.value);
            }}
            style={{
              padding: '6px 12px',
              borderRadius: '8px',
              border: '1px solid #93c5fd',
              fontSize: '13px',
              fontWeight: 800,
              color: '#0f172a',
              background: '#ffffff',
              outline: 'none',
              cursor: 'pointer'
            }}
          />
          <span style={{ fontSize: '12.5px', color: '#0369a1', fontWeight: 700 }}>
            Showing <strong>{statusCounts.custom_date}</strong> follow-ups on {formatDisplayDate(customDateISO)}
          </span>
        </div>
      )}

      {activeDateTab === 'custom_month' && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          background: '#faf5ff',
          border: '1.5px solid #9333ea',
          borderRadius: '12px',
          padding: '10px 18px',
          boxShadow: '0 2px 6px rgba(147, 51, 234, 0.08)',
          width: 'fit-content'
        }}>
          <Calendar size={18} color="#9333ea" />
          <span style={{ fontSize: '13px', fontWeight: 800, color: '#6b21a8' }}>
            Filter by Month & Year:
          </span>
          <input
            type="month"
            value={customMonthStr}
            onChange={(e) => {
              if (e.target.value) setCustomMonthStr(e.target.value);
            }}
            style={{
              padding: '6px 12px',
              borderRadius: '8px',
              border: '1px solid #d8b4fe',
              fontSize: '13px',
              fontWeight: 800,
              color: '#0f172a',
              background: '#ffffff',
              outline: 'none',
              cursor: 'pointer'
            }}
          />
          <span style={{ fontSize: '12.5px', color: '#6b21a8', fontWeight: 700 }}>
            Showing <strong>{statusCounts.custom_month}</strong> follow-ups for {customMonthStr}
          </span>
        </div>
      )}

      {/* 4. Follow-Ups Table with Strict Page Slice */}
      <div style={{
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '16px',
        overflow: 'hidden',
        boxShadow: '0 2px 8px rgba(0,0,0,0.02)'
      }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
            <thead>
              <tr style={{
                background: '#f8fafc',
                borderBottom: '1px solid #e2e8f0',
                color: '#475569',
                fontSize: '11px',
                fontWeight: 800,
                textTransform: 'uppercase',
                letterSpacing: '0.04em'
              }}>
                <th style={{ padding: '12px 16px', width: '50px' }}>#</th>
                <th style={{ padding: '12px 16px' }}>PATIENT INFO</th>
                <th style={{ padding: '12px 16px' }}>BRANCH</th>
                <th style={{ padding: '12px 16px' }}>CONSULTING DOCTOR</th>
                <th style={{ padding: '12px 16px' }}>DUE DATE & INTERVAL</th>
                <th style={{ padding: '12px 16px' }}>STATUS</th>
                <th style={{ padding: '12px 16px', textAlign: 'right' }}>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={7} style={{ padding: '40px 16px', textAlign: 'center', color: '#64748b' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                      <RefreshCw size={28} color="#0284c7" style={{ animation: 'spin 1s linear infinite' }} />
                      <div style={{ fontWeight: 700, color: '#334155' }}>Loading follow-up records...</div>
                    </div>
                  </td>
                </tr>
              ) : paginatedItems.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: '40px 16px', textAlign: 'center', color: '#64748b' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                      <Calendar size={32} color="#94a3b8" />
                      <div style={{ fontWeight: 700, color: '#334155' }}>No follow-up records found</div>
                      <div style={{ fontSize: '12px' }}>
                        No records match the selected branch ("{selectedBranch}") or date filter.
                      </div>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedItems.map((item, idx) => {
                  const itemNumber = startIndex + idx + 1;
                  const branchBadge = getBranchBadgeStyle(item.branchName);
                  const statusBadge = getStatusBadgeStyle(item.scheduledDate);

                  return (
                    <tr
                      key={item.id}
                      style={{
                        borderBottom: '1px solid #f1f5f9',
                        transition: 'background 0.15s ease'
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#f8fafc'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                    >
                      {/* Row Index */}
                      <td style={{ padding: '12px 16px', color: '#94a3b8', fontSize: '11.5px', fontWeight: 700 }}>
                        {itemNumber}
                      </td>

                      {/* Patient Info */}
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '13.5px' }}>
                          {item.patientName}
                        </div>
                        <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span>{item.phone}</span>
                          <span>•</span>
                          <span style={{ color: '#0284c7', fontWeight: 800 }}>{item.regId}</span>
                        </div>
                      </td>

                      {/* Branch Badge */}
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          padding: '3px 9px',
                          borderRadius: '6px',
                          fontSize: '11px',
                          fontWeight: 700,
                          background: branchBadge.bg,
                          color: branchBadge.color,
                          border: `1px solid ${branchBadge.border}`
                        }}>
                          <Building2 size={11} />
                          {item.branchName}
                        </span>
                      </td>

                      {/* Doctor */}
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ fontWeight: 600, color: '#334155' }}>{item.doctorName}</div>
                      </td>

                      {/* Due Date & Interval */}
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ fontWeight: 700, color: statusBadge.color }}>
                          {formatDisplayDate(item.scheduledDate)}
                        </div>
                        <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>
                          Interval: <strong style={{ color: '#475569' }}>{item.interval}</strong>
                        </div>
                      </td>

                      {/* Status */}
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{
                          padding: '3px 8px',
                          borderRadius: '6px',
                          fontSize: '10.5px',
                          fontWeight: 800,
                          letterSpacing: '0.03em',
                          background: statusBadge.bg,
                          color: statusBadge.color,
                          border: `1px solid ${statusBadge.border}`
                        }}>
                          {statusBadge.label}
                        </span>
                      </td>

                      {/* Quick Contact Actions */}
                      <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '6px' }}>
                          <button
                            type="button"
                            onClick={() => openWhatsApp(item.phone, item.patientName, item.doctorName)}
                            title="Open WhatsApp Chat"
                            style={{
                              background: '#ecfdf5',
                              border: '1px solid #a7f3d0',
                              color: '#059669',
                              padding: '5px 10px',
                              borderRadius: '8px',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                              fontSize: '11.5px',
                              fontWeight: 700,
                              transition: 'all 0.15s ease'
                            }}
                          >
                            <MessageSquare size={13} color="#059669" />
                            <span>WhatsApp</span>
                          </button>

                          <a
                            href={`tel:${item.phone.replace(/\D/g, '')}`}
                            title="Call Patient"
                            style={{
                              background: '#eff6ff',
                              border: '1px solid #bfdbfe',
                              color: '#1d4ed8',
                              padding: '5px 8px',
                              borderRadius: '8px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              textDecoration: 'none'
                            }}
                          >
                            <Phone size={13} color="#1d4ed8" />
                          </a>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* 5. Page-wise Pagination Controls Footer */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 20px',
          background: '#f8fafc',
          borderTop: '1px solid #e2e8f0',
          flexWrap: 'wrap',
          gap: '12px'
        }}>
          <div style={{ fontSize: '12.5px', color: '#64748b', fontWeight: 600 }}>
            Showing <strong style={{ color: '#0f172a' }}>{filteredItems.length === 0 ? 0 : startIndex + 1}</strong> to{' '}
            <strong style={{ color: '#0f172a' }}>{endIndex}</strong> of{' '}
            <strong style={{ color: '#0f172a' }}>{filteredItems.length}</strong> follow-ups
            {selectedBranch !== 'All Branches' && <span> in <strong>{selectedBranch}</strong></span>}
          </div>

          {/* Page Navigation Controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <button
              type="button"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                padding: '6px 12px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                background: currentPage <= 1 ? '#f1f5f9' : '#ffffff',
                color: currentPage <= 1 ? '#94a3b8' : '#334155',
                fontSize: '12px',
                fontWeight: 700,
                cursor: currentPage <= 1 ? 'not-allowed' : 'pointer'
              }}
            >
              <ChevronLeft size={14} />
              <span>Previous</span>
            </button>

            {/* Page Indicator Pill */}
            <div style={{
              padding: '6px 12px',
              borderRadius: '8px',
              background: '#ffffff',
              border: '1px solid #cbd5e1',
              fontSize: '12px',
              fontWeight: 800,
              color: '#0f172a'
            }}>
              Page {currentPage} of {totalPages}
            </div>

            <button
              type="button"
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                padding: '6px 12px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                background: currentPage >= totalPages ? '#f1f5f9' : '#ffffff',
                color: currentPage >= totalPages ? '#94a3b8' : '#334155',
                fontSize: '12px',
                fontWeight: 700,
                cursor: currentPage >= totalPages ? 'not-allowed' : 'pointer'
              }}
            >
              <span>Next</span>
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
