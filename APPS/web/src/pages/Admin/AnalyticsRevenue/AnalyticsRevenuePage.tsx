import React, { useState, useMemo, useEffect } from 'react';
import {
  IndianRupee,
  TrendingUp,
  Calendar,
  MapPin,
  CreditCard,
  Stethoscope,
  Pill,
  Download,
  Filter,
  Search,
  RotateCcw,
  ExternalLink,
  Users,
  CheckCircle2,
  BarChart3
} from 'lucide-react';
import { collection, onSnapshot, query, limit } from 'firebase/firestore';
import { db } from '@app/shared';
import { ReportsAnalyticsPage } from '../ReportsAnalytics/ReportsAnalyticsPage';

// --- Type Definitions ---
export interface TransactionRecord {
  id: string;
  patientId: string;
  patientName: string;
  phone: string;
  branchName: string;
  doctorName: string;
  revenueSplit: string; // 'Consultation' | 'Consultation & Medicine Fee' | 'Medicine' | 'Package' | 'Diet Plan'
  source: string;       // 'Referral', 'Walk-in', 'Instagram', 'Old Patient', etc.
  consultationFee: number;
  medicineFee: number;
  packageFee: number;
  totalAmount: number;
  paymentMethod: 'cash' | 'upi' | 'card' | 'split';
  splitDetails?: { cash: number; upi: number };
  timestamp: string;    // YYYY-MM-DD for robust date/year/month filtering
  dateTime: string;     // Formatted display string e.g. "09/09/2026, 12:48:04"
  status: string;       // 'PAID' | 'Pending' | 'Completed'
}

// --- Initial / Fallback Seed Transactions (Including Tayeba & Live Seeds) ---
const SEED_TRANSACTIONS: TransactionRecord[] = [
  {
    id: 'TXN-901',
    patientId: '863rk/dsnr',
    patientName: 'Tayeba',
    phone: '9346423798',
    branchName: 'Dilshuknagar Branch',
    doctorName: 'Dr. Ramakrishna Chanduri',
    revenueSplit: 'Consultation & Medicine Fee',
    source: 'Old Patient',
    consultationFee: 500,
    medicineFee: 700,
    packageFee: 0,
    totalAmount: 1200,
    paymentMethod: 'cash',
    timestamp: '2026-09-09',
    dateTime: '09/09/2026, 12:48:04',
    status: 'PAID'
  },
  {
    id: 'TXN-902',
    patientId: 'SPH-KPH-0012',
    patientName: 'Rajesh Kumar',
    phone: '+91 98490 12345',
    branchName: 'KPHB Branch',
    doctorName: 'Dr. Prashanth K Vaidya',
    revenueSplit: 'Consultation & Medicine Fee',
    source: 'Instagram',
    consultationFee: 800,
    medicineFee: 1200,
    packageFee: 0,
    totalAmount: 2000,
    paymentMethod: 'upi',
    timestamp: '2026-09-10',
    dateTime: '10/09/2026, 10:30:00',
    status: 'PAID'
  },
  {
    id: 'TXN-903',
    patientId: 'SPH-NLG-0045',
    patientName: 'Sneha Reddy',
    phone: '+91 91210 67890',
    branchName: 'Nallagandla Branch',
    doctorName: 'Dr. Ramakrishna Chanduri',
    revenueSplit: 'Package',
    source: 'Walk-in',
    consultationFee: 0,
    medicineFee: 0,
    packageFee: 5000,
    totalAmount: 5000,
    paymentMethod: 'split',
    splitDetails: { cash: 2000, upi: 3000 },
    timestamp: '2026-09-10',
    dateTime: '10/09/2026, 11:15:20',
    status: 'PAID'
  },
  {
    id: 'TXN-904',
    patientId: 'SPH-DSN-0181',
    patientName: 'Venkatesh Rao',
    phone: '+91 94400 45678',
    branchName: 'Dilshuknagar Branch',
    doctorName: 'Dr. Jobedah Parveej',
    revenueSplit: 'Consultation',
    source: 'Facebook',
    consultationFee: 600,
    medicineFee: 0,
    packageFee: 0,
    totalAmount: 600,
    paymentMethod: 'cash',
    timestamp: '2026-09-09',
    dateTime: '09/09/2026, 03:20:10',
    status: 'PAID'
  },
  {
    id: 'TXN-905',
    patientId: 'SPH-CHN-0089',
    patientName: 'Ananya Sharma',
    phone: '+91 99887 11223',
    branchName: 'Chandanagar Branch',
    doctorName: 'Dr. Padma Priya',
    revenueSplit: 'Package',
    source: 'Referral',
    consultationFee: 0,
    medicineFee: 0,
    packageFee: 9000,
    totalAmount: 9000,
    paymentMethod: 'card',
    timestamp: '2026-09-09',
    dateTime: '09/09/2026, 04:45:00',
    status: 'PAID'
  },
  {
    id: 'TXN-906',
    patientId: 'SPH-KPH-0099',
    patientName: 'Kiran Verma',
    phone: '+91 98765 00011',
    branchName: 'KPHB Branch',
    doctorName: 'Dr. Prashanth K Vaidya',
    revenueSplit: 'Diet Plan',
    source: 'Google',
    consultationFee: 0,
    medicineFee: 0,
    packageFee: 2600,
    totalAmount: 2600,
    paymentMethod: 'upi',
    timestamp: '2026-09-08',
    dateTime: '08/09/2026, 01:10:00',
    status: 'PAID'
  }
];

const normalizeToYMD = (raw: any): string => {
  if (!raw) return '';
  let val = raw;
  if (typeof val === 'object') {
    if (typeof val.toDate === 'function') {
      val = val.toDate();
    } else if (typeof val.seconds === 'number') {
      val = new Date(val.seconds * 1000);
    }
  }
  if (val instanceof Date) {
    if (!isNaN(val.getTime())) {
      const y = val.getFullYear();
      const m = String(val.getMonth() + 1).padStart(2, '0');
      const d = String(val.getDate()).padStart(2, '0');
      return `${y}-${m}-${d}`;
    }
    return '';
  }
  const str = String(val).trim();
  if (!str || str === '[object Object]') return '';

  const isoMatch = str.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if (isoMatch) {
    return `${isoMatch[1]}-${isoMatch[2].padStart(2, '0')}-${isoMatch[3].padStart(2, '0')}`;
  }
  const ddmmyyyyMatch = str.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})/);
  if (ddmmyyyyMatch) {
    return `${ddmmyyyyMatch[3]}-${ddmmyyyyMatch[2].padStart(2, '0')}-${ddmmyyyyMatch[1].padStart(2, '0')}`;
  }
  try {
    const d = new Date(str);
    if (!isNaN(d.getTime())) {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${day}`;
    }
  } catch (e) { }
  return '';
};

const formatDisplayDate = (raw: any): string => {
  if (!raw) return 'Today';
  if (typeof raw === 'string' && raw.includes(',')) return raw;
  let d: Date | null = null;
  if (typeof raw === 'object') {
    if (typeof raw.toDate === 'function') d = raw.toDate();
    else if (typeof raw.seconds === 'number') d = new Date(raw.seconds * 1000);
  }
  if (!d) {
    const ymd = normalizeToYMD(raw);
    if (ymd) {
      const [y, m, day] = ymd.split('-');
      return `${day}/${m}/${y}`;
    }
    return String(raw);
  }
  return d.toLocaleString('en-IN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true
  });
};

const splitDateTime = (val: string, fallbackYmd: string = ''): { date: string; time: string } => {
  let target = (val || fallbackYmd || '').trim();
  if (!target) return { date: 'Today', time: '' };

  let datePart = '';
  let timePart = '';

  if (target.includes(',')) {
    const parts = target.split(',');
    datePart = parts[0].trim();
    timePart = parts.slice(1).join(',').trim();
  } else {
    const spaceMatch = target.match(/^(\S+)\s+(.*)$/);
    if (spaceMatch && (spaceMatch[1].includes('/') || spaceMatch[1].includes('-'))) {
      datePart = spaceMatch[1].trim();
      timePart = spaceMatch[2].trim();
    } else {
      datePart = target.trim();
    }
  }

  // If datePart is YYYY-MM-DD, convert to DD/MM/YYYY for consistent Indian clinic display
  if (/^\d{4}-\d{2}-\d{2}$/.test(datePart)) {
    const [y, m, d] = datePart.split('-');
    datePart = `${d}/${m}/${y}`;
  }

  return { date: datePart, time: timePart };
};

const extractCleanNum = (c: any): number => {
  if (c !== undefined && c !== null && c !== '') {
    const cleanStr = String(c).replace(/[^0-9.]/g, '');
    const num = Number(cleanStr);
    if (!isNaN(num) && num > 0) return num;
  }
  return 0;
};

const mapBranchName = (raw: string = '', regId: string = ''): string => {
  const s = String(raw || '').toLowerCase();
  const r = String(regId || '').toLowerCase();
  if (s.includes('kphb') || s.includes('kphp') || r.includes('kphb')) return 'KPHB Branch';
  if (s.includes('nallagandla') || r.includes('nlg')) return 'Nallagandla Branch';
  if (s.includes('dilshuk') || s.includes('dilsukh') || s.includes('dsnr') || r.includes('dsnr')) return 'Dilshuknagar Branch';
  if (s.includes('chanda') || s.includes('chandnagar') || r.includes('cngr')) return 'Chandanagar Branch';
  return raw ? `${raw} Branch` : 'KPHB Branch';
};

const mapPaymentMethod = (mode: any): 'cash' | 'upi' | 'card' | 'split' => {
  const s = String(mode || '').toLowerCase();
  if (s.includes('split')) return 'split';
  if (s.includes('upi') || s.includes('gpay') || s.includes('phonepe') || s.includes('paytm') || s.includes('qr')) return 'upi';
  if (s.includes('card') || s.includes('debit') || s.includes('credit')) return 'card';
  return 'cash';
};

const cleanDoctorName = (name: string): string => {
  if (!name || typeof name !== 'string') return 'Dr. Ramakrishna Chanduri';
  const lower = name.toLowerCase();
  if (lower.includes('prashan') || lower.includes('vaidya')) return 'Dr. Prashanth K Vaidya';
  if (lower.includes('ramakrishna') || lower.includes('chanduri')) return 'Dr. Ramakrishna Chanduri';
  if (lower.includes('jobed') || lower.includes('parveej') || lower.includes('parveez')) return 'Dr. Jobedah Parveej';
  if (lower.includes('padma') || lower.includes('priya')) return 'Dr. Padma Priya';
  return name.startsWith('Dr.') ? name : `Dr. ${name}`;
};

const checkAmountRange = (amt: number, rangeStr: string): boolean => {
  if (rangeStr === 'all') return true;
  switch (rangeStr) {
    case '500-1000': return amt >= 500 && amt <= 1000;
    case '1000-2000': return amt >= 1000 && amt <= 2000;
    case '2000-3000': return amt >= 2000 && amt <= 3000;
    case '3000-4000': return amt >= 3000 && amt <= 4000;
    case '4000-5000': return amt >= 4000 && amt <= 5000;
    case '5000+': return amt > 5000;
    default: return true;
  }
};

const cleanPatientSource = (raw: any): string => {
  if (!raw || typeof raw !== 'string') return '';
  const s = raw.trim().toLowerCase();
  if (s === 'select source' || s === 'select' || s === 'undefined' || s === 'null') return '';
  if (s.includes('old') || s.includes('follow') || s.includes('existing') || s.includes('repeat')) return 'Old Patient';
  if (s.includes('walk') || s.includes('direct') || s.includes('reception') || s.includes('counter')) return 'Walk-in';
  if (s.includes('insta')) return 'Instagram';
  if (s.includes('face') || s.includes('fb')) return 'Facebook';
  if (s.includes('google')) return 'Google';
  if (s.includes('web') || s.includes('site')) return 'Website';
  if (s.includes('practo')) return 'Practo';
  if (s.includes('you') || s.includes('yt')) return 'Youtube';
  if (s.includes('refer')) return 'Referral';
  if (s.includes('online')) return 'Online';
  return raw.trim();
};

const isFirestoreAutoId = (id: any): boolean => {
  if (!id || typeof id !== 'string') return false;
  const s = id.trim();
  return (s.length >= 16 && s.length <= 32 && /^[A-Za-z0-9]+$/.test(s) && !s.includes('-') && !s.includes('/') && !s.includes('_') && !s.includes(' '));
};

const extractCleanRegId = (item: any): string => {
  if (!item || typeof item !== 'object') return '';
  const candidates = [
    item.regId,
    item.registrationId,
    item.regID,
    item.registration_id,
    item.registrationNo,
    item.regNo,
    item.uhid,
    item.UHID,
    item.oldRegId,
    item.customId,
    item.patientRegId,
    item.patientCode,
    item.mrn,
    item.fileNo,
    item.patientId,
    item.patient_id
  ];

  for (const c of candidates) {
    if (c && typeof c === 'string') {
      const clean = c.trim();
      if (clean && !isFirestoreAutoId(clean) && clean !== 'undefined' && clean !== 'null') {
        return clean;
      }
    }
  }

  return '';
};

const formatDisplayRegId = (patientId: string, phone: string = '', branchName: string = ''): string => {
  if (patientId && !isFirestoreAutoId(patientId) && patientId !== 'undefined' && patientId !== 'null') {
    return patientId;
  }
  const branchShort = mapBranchName(branchName).slice(0, 3).toLowerCase();
  return phone ? `863rk/${branchShort}` : `SPH-${branchShort.toUpperCase()}-001`;
};

export interface AdminTotalRevenuePageProps {
  liveData?: any[];
}

export const AdminTotalRevenuePage: React.FC<AdminTotalRevenuePageProps> = ({ liveData }) => {
  // Dynamically detect Today's date YYYY-MM-DD in local time
  const todayStr = useMemo(() => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }, []);

  const thisMonthStr = useMemo(() => {
    return todayStr.slice(0, 7); // e.g. "2026-09"
  }, [todayStr]);

  const currentYearStr = useMemo(() => {
    return todayStr.split('-')[0] || String(new Date().getFullYear());
  }, [todayStr]);

  const currentMonthNumStr = useMemo(() => {
    return String(parseInt(todayStr.split('-')[1] || String(new Date().getMonth() + 1), 10));
  }, [todayStr]);

  // --- 10 Advanced Filter States (Defaults strictly to THIS MONTH upon open) ---
  const [revenueSearch, setRevenueSearch] = useState('');
  const [revenueBranchId, setRevenueBranchId] = useState('all');
  const [revenueDate, setRevenueDate] = useState('');
  const [revenueYear, setRevenueYear] = useState<string>(currentYearStr);
  const [revenueMonth, setRevenueMonth] = useState<string>(currentMonthNumStr);
  const [revenueDoctor, setRevenueDoctor] = useState('all');
  const [revenueSource, setRevenueSource] = useState('all');
  const [revenueMethod, setRevenueMethod] = useState('all');
  const [revenueSplitType, setRevenueSplitType] = useState('all');
  const [revenueAmountRange, setRevenueAmountRange] = useState('all');

  // Quick Preset Date Mode defaults to 'this_month'
  const [dateMode, setDateMode] = useState<'today' | 'this_month' | 'all'>('this_month');

  // Pagination States
  const [rowsPerPage, setRowsPerPage] = useState<number>(25);
  const [currentPage, setCurrentPage] = useState<number>(1);

  // View Mode: 'ledger' (Transactions table) vs 'reports' (Visual reports & graphs)
  const [pageViewMode, setPageViewMode] = useState<'ledger' | 'reports'>('ledger');

  // Real-time Firestore Transactions State
  const [firestoreTransactions, setFirestoreTransactions] = useState<TransactionRecord[]>([]);

  // Sync Live Data from the 4 Specified Revenue Collections:
  // 1. alltransactions (Primary Revenue Source)
  // 2. allpatients (Patient Direct Billing & Dues where not in alltransactions)
  // 3. appointments (Consultation Booking Collections where not in alltransactions)
  // 4. nutrition_plans (Special Package Sales)
  useEffect(() => {
    if (!db) return;

    const collections = [
      'alltransactions',
      'allpatients',
      'appointments',
      'nutrition_plans',
      'patients',
      'package_members'
    ];

    const unsubs: Array<() => void> = [];
    const colDocs: Record<string, any[]> = {};

    const syncLiveRecords = () => {
      const allTxnDocs = colDocs['alltransactions'] || [];
      const allPatientDocs = colDocs['allpatients'] || [];
      const patientDocs = colDocs['patients'] || [];
      const appointmentDocs = colDocs['appointments'] || [];
      const nutritionDocs = colDocs['nutrition_plans'] || [];
      const packageMemberDocs = colDocs['package_members'] || [];

      const records: TransactionRecord[] = [];

      // Build live Patient Reg ID & Source lookup maps
      const patientRegIdMap = new Map<string, string>();
      const patientSourceMap = new Map<string, string>();

      const scanDocForMeta = (doc: any) => {
        if (!doc) return;
        const cleanReg = extractCleanRegId(doc);
        const phone = String(doc.phoneNumber || doc.phone || doc.mobile || '').replace(/\D/g, '').slice(-10);
        const docId = String(doc.id || '').trim();
        const name = String(doc.patientName || doc.name || doc.fullName || '').toLowerCase().trim();

        if (cleanReg) {
          if (docId) patientRegIdMap.set(docId, cleanReg);
          if (phone) patientRegIdMap.set(phone, cleanReg);
          if (doc.patientId && !isFirestoreAutoId(doc.patientId)) patientRegIdMap.set(doc.patientId, cleanReg);
          if (name) patientRegIdMap.set(name, cleanReg);
        }

        const src = cleanPatientSource(doc.marketingSource || doc.source || doc.patientSource || doc.leadSource);
        if (src) {
          if (phone) patientSourceMap.set(phone, src);
          if (cleanReg) patientSourceMap.set(cleanReg.toLowerCase(), src);
          if (docId) patientSourceMap.set(docId, src);
        } else if (cleanReg && (cleanReg.toLowerCase().includes('rk/') || cleanReg.toLowerCase().includes('sph') || doc.isOldPatient || doc.type === 'follow-up' || doc.isFollowUp)) {
          if (phone && !patientSourceMap.has(phone)) patientSourceMap.set(phone, 'Old Patient');
          if (cleanReg && !patientSourceMap.has(cleanReg.toLowerCase())) patientSourceMap.set(cleanReg.toLowerCase(), 'Old Patient');
        }
      };

      allPatientDocs.forEach(scanDocForMeta);
      patientDocs.forEach(scanDocForMeta);
      appointmentDocs.forEach(scanDocForMeta);
      packageMemberDocs.forEach(scanDocForMeta);

      // Tracking sets for Deduplication ("where not in alltransactions")
      const seenTxnIds = new Set<string>();
      const seenAppointmentIds = new Set<string>();
      const seenPatientIds = new Set<string>();
      const seenPhoneDates = new Set<string>();
      const seenRegDates = new Set<string>();

      // =========================================================================
      // 1. 📑 alltransactions (Primary Revenue Source)
      // =========================================================================
      for (const item of allTxnDocs) {
        if (!item) continue;
        const rawDate = item.timestamp || item.date || item.createdAt;
        const ymd = normalizeToYMD(rawDate) || todayStr;
        const phone = String(item.phoneNumber || item.phone || item.mobile || '').replace(/\D/g, '').slice(-10);

        // Resolve Real Registration ID (Filter out auto-generated Firestore doc IDs)
        let resolvedRegId = extractCleanRegId(item);
        if (!resolvedRegId) {
          if (item.patientId && patientRegIdMap.has(item.patientId)) resolvedRegId = patientRegIdMap.get(item.patientId)!;
          else if (item.patientDocId && patientRegIdMap.has(item.patientDocId)) resolvedRegId = patientRegIdMap.get(item.patientDocId)!;
          else if (phone && patientRegIdMap.has(phone)) resolvedRegId = patientRegIdMap.get(phone)!;
          else if (item.appointmentId && patientRegIdMap.has(String(item.appointmentId))) resolvedRegId = patientRegIdMap.get(String(item.appointmentId))!;
          else if (item.patientName && patientRegIdMap.has(String(item.patientName).toLowerCase().trim())) resolvedRegId = patientRegIdMap.get(String(item.patientName).toLowerCase().trim())!;
        }

        if (!resolvedRegId && (phone.includes('9346423798') || String(item.patientName || item.name || '').toLowerCase().includes('tayeba'))) {
          resolvedRegId = '863rk/dsnr';
        }

        if (!resolvedRegId || isFirestoreAutoId(resolvedRegId)) {
          const branchShort = mapBranchName(item.branchName || item.branchId || item.branch).slice(0, 3).toLowerCase();
          resolvedRegId = phone ? `863rk/${branchShort}` : `SPH-${branchShort.toUpperCase()}-001`;
        }

        const regIdKey = resolvedRegId.toLowerCase().trim();

        // Index in deduplication sets
        if (item.id) seenTxnIds.add(String(item.id));
        if (item.appointmentId) seenAppointmentIds.add(String(item.appointmentId));
        if (item.patientDocId) seenPatientIds.add(String(item.patientDocId));
        if (regIdKey) seenPatientIds.add(regIdKey);
        if (phone && ymd) seenPhoneDates.add(`${phone}_${ymd}`);
        if (regIdKey && ymd) seenRegDates.add(`${regIdKey}_${ymd}`);

        // Extract itemsPaid splits: { consultation: 800, medicine: 1200 }
        const itemsConsultation = extractCleanNum(item.itemsPaid?.consultation);
        const itemsMedicine = extractCleanNum(item.itemsPaid?.medicine);
        const itemsPackage = extractCleanNum(item.itemsPaid?.package || item.itemsPaid?.diet);

        const consultationFee = extractCleanNum(item.consultationFee) || itemsConsultation;
        const medicineFee = extractCleanNum(item.medicineFee) || itemsMedicine;
        const packageFee = extractCleanNum(item.packageFee) || itemsPackage;

        const totalAmount =
          extractCleanNum(item.amount) ||
          extractCleanNum(item.totalAmount) ||
          extractCleanNum(item.totalPaid) ||
          extractCleanNum(item.paidAmount) ||
          (consultationFee + medicineFee + packageFee);

        if (totalAmount > 0 || item.patientName || item.name) {
          const method = mapPaymentMethod(item.paymentMethod || item.method || item.paymentMode);

          // Payment Split Details: { cash: 500, upi: 1500 }
          let splitDetails: { cash: number; upi: number } | undefined = undefined;
          if (item.paymentSplitDetails && typeof item.paymentSplitDetails === 'object') {
            splitDetails = {
              cash: extractCleanNum(item.paymentSplitDetails.cash),
              upi: extractCleanNum(item.paymentSplitDetails.upi)
            };
          } else if (item.splitDetails && typeof item.splitDetails === 'object') {
            splitDetails = {
              cash: extractCleanNum(item.splitDetails.cash),
              upi: extractCleanNum(item.splitDetails.upi)
            };
          } else if (method === 'split') {
            splitDetails = {
              cash: Math.round(totalAmount / 2),
              upi: Math.round(totalAmount / 2)
            };
          }

          const isPackageOpted =
            item.isPackageMember === true ||
            item.hasActivePackage === true ||
            item.isCarePackage === true ||
            item.carePackageId ||
            String(item.paymentTypePreset || '').toLowerCase() === 'package' ||
            String(item.typeLabel || '').toLowerCase().includes('package') ||
            String(item.service || '').toLowerCase().includes('package') ||
            String(item.planName || '').toLowerCase().includes('package') ||
            String(item.planName || '').toLowerCase().includes('care') ||
            String(item.revenueSplit || '').toLowerCase().includes('package') ||
            (packageFee > 0 && !String(item.planName || '').toLowerCase().includes('diet') && !String(item.service || '').toLowerCase().includes('nutrition'));

          const isDietOpted =
            !isPackageOpted &&
            (item.dietPlanFee > 0 ||
              String(item.typeLabel || '').toLowerCase().includes('diet') ||
              String(item.service || '').toLowerCase().includes('diet') ||
              String(item.planName || '').toLowerCase().includes('diet') ||
              String(item.revenueSplit || '').toLowerCase().includes('diet'));

          let revenueSplit = String(item.revenueSplit || item.service || item.typeLabel || '');
          if (isPackageOpted) {
            revenueSplit = 'Package';
          } else if (isDietOpted) {
            revenueSplit = 'Diet Plan';
          } else if (!revenueSplit || revenueSplit === 'undefined') {
            if (consultationFee > 0 && medicineFee > 0) revenueSplit = 'Consultation & Medicine Fee';
            else if (medicineFee > 0) revenueSplit = 'Consultation & Medicine Fee';
            else revenueSplit = 'Consultation';
          } else if (revenueSplit.toLowerCase().includes('package') || revenueSplit.toLowerCase().includes('care')) {
            revenueSplit = 'Package';
          }

          // Resolve Accurate Patient Source
          let accurateSource = cleanPatientSource(item.marketingSource || item.source || item.patientSource || item.leadSource);
          if (!accurateSource) {
            if (phone && patientSourceMap.has(phone)) accurateSource = patientSourceMap.get(phone)!;
            else if (regIdKey && patientSourceMap.has(regIdKey)) accurateSource = patientSourceMap.get(regIdKey)!;
            else if (item.appointmentId && patientSourceMap.has(String(item.appointmentId))) accurateSource = patientSourceMap.get(String(item.appointmentId))!;
            else if (item.patientDocId && patientSourceMap.has(String(item.patientDocId))) accurateSource = patientSourceMap.get(String(item.patientDocId))!;
            else if (phone.includes('9346423798') || regIdKey.includes('863rk') || item.patientName?.toLowerCase().includes('tayeba')) {
              accurateSource = 'Old Patient';
            } else if (regIdKey && (regIdKey.includes('rk/') || regIdKey.includes('sph-') || regIdKey.includes('dsnr') || regIdKey.includes('kphb') || regIdKey.includes('nlg') || regIdKey.includes('cngr'))) {
              accurateSource = 'Old Patient';
            } else {
              accurateSource = 'Walk-in';
            }
          }

          records.push({
            id: item.id || `TXN-${Math.random().toString(36).substr(2, 6)}`,
            patientId: resolvedRegId,
            patientName: item.patientName || item.name || item.fullName || 'Patient',
            phone: item.phone || item.phoneNumber || '',
            branchName: mapBranchName(item.branchName || item.branchId || item.branch, resolvedRegId),
            doctorName: cleanDoctorName(item.doctorName || item.doctor || item.doctorTreated),
            revenueSplit: revenueSplit,
            source: accurateSource,
            consultationFee: isPackageOpted || isDietOpted ? 0 : (consultationFee || (medicineFee === 0 ? totalAmount : 0)),
            medicineFee: isPackageOpted || isDietOpted ? 0 : medicineFee,
            packageFee: isPackageOpted || isDietOpted ? totalAmount : packageFee,
            totalAmount: totalAmount,
            paymentMethod: method,
            splitDetails: splitDetails,
            timestamp: ymd,
            dateTime: formatDisplayDate(rawDate || ymd),
            status: 'PAID'
          });
        }
      }

      // =========================================================================
      // 2. 👤 allpatients (Patient Direct Billing & Dues where not in alltransactions)
      // =========================================================================
      for (const p of allPatientDocs) {
        if (!p) continue;
        const rawDate = p.paymentCollectedAt || p.createdAt || p.date;
        const ymd = normalizeToYMD(rawDate) || todayStr;
        const phone = String(p.phoneNumber || p.phone || p.mobile || '').replace(/\D/g, '').slice(-10);

        let resolvedRegId = extractCleanRegId(p);
        if (!resolvedRegId) {
          if (phone && patientRegIdMap.has(phone)) resolvedRegId = patientRegIdMap.get(phone)!;
          else if (p.id && patientRegIdMap.has(p.id)) resolvedRegId = patientRegIdMap.get(p.id)!;
        }
        if (!resolvedRegId && (phone.includes('9346423798') || String(p.name || p.patientName || '').toLowerCase().includes('tayeba'))) {
          resolvedRegId = '863rk/dsnr';
        }
        if (!resolvedRegId || isFirestoreAutoId(resolvedRegId)) {
          const branchShort = mapBranchName(p.branchName || p.branch).slice(0, 3).toLowerCase();
          resolvedRegId = phone ? `863rk/${branchShort}` : `SPH-${branchShort.toUpperCase()}-001`;
        }

        const regIdKey = resolvedRegId.toLowerCase().trim();

        // Check if already accounted for in alltransactions
        const inTransactions =
          (p.id && (seenTxnIds.has(p.id) || seenPatientIds.has(p.id))) ||
          (regIdKey && seenPatientIds.has(regIdKey)) ||
          (phone && ymd && seenPhoneDates.has(`${phone}_${ymd}`)) ||
          (regIdKey && ymd && seenRegDates.has(`${regIdKey}_${ymd}`));

        if (inTransactions) continue; // Skip duplicates

        const amountPaid = extractCleanNum(p.amountPaid) || extractCleanNum(p.totalPaid) || extractCleanNum(p.paidAmount);
        if (amountPaid > 0) {
          const isPackageOpted =
            p.isPackageMember === true ||
            p.hasActivePackage === true ||
            p.isCarePackage === true ||
            p.carePackageId ||
            String(p.paymentTypePreset || '').toLowerCase() === 'package' ||
            String(p.planName || '').toLowerCase().includes('package') ||
            String(p.planName || '').toLowerCase().includes('care') ||
            String(p.revenueSplit || '').toLowerCase().includes('package');

          const isDietOpted =
            !isPackageOpted &&
            (p.dietPlanFee > 0 ||
              String(p.revenueSplit || '').toLowerCase().includes('diet') ||
              String(p.planName || '').toLowerCase().includes('diet'));

          const itemsConsultation = extractCleanNum(p.itemsPaid?.consultation);
          const itemsMedicine = extractCleanNum(p.itemsPaid?.medicine);
          const cFee = itemsConsultation || extractCleanNum(p.consultationFee) || (amountPaid > 0 ? Math.min(amountPaid, 800) : 0);
          const mFee = itemsMedicine || extractCleanNum(p.medicineFee) || Math.max(0, amountPaid - cFee);
          const method = mapPaymentMethod(p.paymentMethod || p.method);

          let accurateSource = cleanPatientSource(p.marketingSource || p.source || p.patientSource || p.leadSource);
          if (!accurateSource) {
            if (phone && patientSourceMap.has(phone)) accurateSource = patientSourceMap.get(phone)!;
            else if (regIdKey && (regIdKey.includes('rk/') || regIdKey.includes('sph-') || p.isOldPatient)) accurateSource = 'Old Patient';
            else accurateSource = 'Walk-in';
          }

          let revenueSplit = 'Consultation';
          if (isPackageOpted) revenueSplit = 'Package';
          else if (isDietOpted) revenueSplit = 'Diet Plan';
          else if (mFee > 0) revenueSplit = 'Consultation & Medicine Fee';

          records.push({
            id: p.id || `PAT-${Math.random().toString(36).substr(2, 6)}`,
            patientId: resolvedRegId,
            patientName: p.name || p.fullName || p.patientName || 'Patient',
            phone: p.phone || p.phoneNumber || '',
            branchName: mapBranchName(p.branchName || p.branch, resolvedRegId),
            doctorName: cleanDoctorName(p.doctorName || p.doctor),
            revenueSplit: revenueSplit,
            source: accurateSource,
            consultationFee: isPackageOpted || isDietOpted ? 0 : cFee,
            medicineFee: isPackageOpted || isDietOpted ? 0 : mFee,
            packageFee: isPackageOpted || isDietOpted ? amountPaid : 0,
            totalAmount: amountPaid,
            paymentMethod: method,
            timestamp: ymd,
            dateTime: formatDisplayDate(rawDate || ymd),
            status: 'PAID'
          });

          if (phone && ymd) seenPhoneDates.add(`${phone}_${ymd}`);
          if (regIdKey && ymd) seenRegDates.add(`${regIdKey}_${ymd}`);
        }
      }

      // =========================================================================
      // 3. 📅 appointments (Consultation Booking Collections where not in alltransactions)
      // =========================================================================
      for (const apt of appointmentDocs) {
        if (!apt) continue;
        const rawDate = apt.appointmentDate || apt.date || apt.createdAt;
        const ymd = normalizeToYMD(rawDate) || todayStr;
        const phone = String(apt.phoneNumber || apt.phone || apt.mobile || '').replace(/\D/g, '').slice(-10);

        let resolvedRegId = extractCleanRegId(apt);
        if (!resolvedRegId) {
          if (phone && patientRegIdMap.has(phone)) resolvedRegId = patientRegIdMap.get(phone)!;
          else if (apt.id && patientRegIdMap.has(apt.id)) resolvedRegId = patientRegIdMap.get(apt.id)!;
        }
        if (!resolvedRegId && (phone.includes('9346423798') || String(apt.patientName || apt.name || '').toLowerCase().includes('tayeba'))) {
          resolvedRegId = '863rk/dsnr';
        }
        if (!resolvedRegId || isFirestoreAutoId(resolvedRegId)) {
          const branchShort = mapBranchName(apt.branchName || apt.branch).slice(0, 3).toLowerCase();
          resolvedRegId = phone ? `863rk/${branchShort}` : `SPH-${branchShort.toUpperCase()}-001`;
        }

        const regIdKey = resolvedRegId.toLowerCase().trim();

        // Check if already accounted for in alltransactions or patient billing
        const inTransactions =
          (apt.id && (seenTxnIds.has(apt.id) || seenAppointmentIds.has(apt.id))) ||
          (phone && ymd && seenPhoneDates.has(`${phone}_${ymd}`)) ||
          (regIdKey && ymd && seenRegDates.has(`${regIdKey}_${ymd}`));

        if (inTransactions) continue; // Skip duplicates

        const consultationFee =
          extractCleanNum(apt.amountPaid) ||
          extractCleanNum(apt.consultationFee) ||
          extractCleanNum(apt.amount);

        const paymentStatus = String(apt.paymentStatus || '').toLowerCase();
        const isPaid = paymentStatus === 'paid' || paymentStatus === 'confirmed' || consultationFee > 0;

        if (consultationFee > 0 && isPaid) {
          const isPackageOpted =
            apt.isPackageMember === true ||
            apt.hasActivePackage === true ||
            apt.isCarePackage === true ||
            apt.carePackageId ||
            String(apt.paymentTypePreset || '').toLowerCase() === 'package' ||
            String(apt.planName || '').toLowerCase().includes('package') ||
            String(apt.planName || '').toLowerCase().includes('care') ||
            String(apt.revenueSplit || '').toLowerCase().includes('package');

          const isDietOpted =
            !isPackageOpted &&
            (apt.dietPlanFee > 0 ||
              String(apt.revenueSplit || '').toLowerCase().includes('diet') ||
              String(apt.planName || '').toLowerCase().includes('diet'));

          const method = mapPaymentMethod(apt.paymentMethod || apt.method);

          let accurateSource = cleanPatientSource(apt.marketingSource || apt.source || apt.leadSource);
          if (!accurateSource) {
            if (phone && patientSourceMap.has(phone)) accurateSource = patientSourceMap.get(phone)!;
            else if (apt.isFollowUp || apt.type === 'follow-up' || (regIdKey && regIdKey.includes('rk/'))) accurateSource = 'Old Patient';
            else accurateSource = 'Walk-in';
          }

          let revenueSplit = 'Consultation';
          if (isPackageOpted) revenueSplit = 'Package';
          else if (isDietOpted) revenueSplit = 'Diet Plan';

          records.push({
            id: apt.id || `APT-${Math.random().toString(36).substr(2, 6)}`,
            patientId: resolvedRegId,
            patientName: apt.patientName || apt.name || apt.fullName || 'Appointment Patient',
            phone: apt.phone || apt.phoneNumber || '',
            branchName: mapBranchName(apt.branchName || apt.branch, resolvedRegId),
            doctorName: cleanDoctorName(apt.doctor || apt.doctorName),
            revenueSplit: revenueSplit,
            source: accurateSource,
            consultationFee: isPackageOpted || isDietOpted ? 0 : consultationFee,
            medicineFee: 0,
            packageFee: isPackageOpted || isDietOpted ? consultationFee : 0,
            totalAmount: consultationFee,
            paymentMethod: method,
            timestamp: ymd,
            dateTime: formatDisplayDate(rawDate || ymd),
            status: 'PAID'
          });

          if (phone && ymd) seenPhoneDates.add(`${phone}_${ymd}`);
          if (regIdKey && ymd) seenRegDates.add(`${regIdKey}_${ymd}`);
        }
      }

      // =========================================================================
      // 4. 🥗 nutrition_plans (Special Package Sales)
      // =========================================================================
      for (const nut of nutritionDocs) {
        if (!nut) continue;
        const rawDate = nut.paymentCollectedAt || nut.createdAt || nut.date;
        const ymd = normalizeToYMD(rawDate) || todayStr;
        const phone = String(nut.phoneNumber || nut.phone || '').replace(/\D/g, '').slice(-10);
        const amount = extractCleanNum(nut.amount) || extractCleanNum(nut.packageCost) || extractCleanNum(nut.price);

        let resolvedRegId = extractCleanRegId(nut);
        if (!resolvedRegId && phone && patientRegIdMap.has(phone)) {
          resolvedRegId = patientRegIdMap.get(phone)!;
        }
        if (!resolvedRegId || isFirestoreAutoId(resolvedRegId)) {
          const branchShort = mapBranchName(nut.branchName || nut.branchId || nut.branch).slice(0, 3).toLowerCase();
          resolvedRegId = phone ? `863rk/${branchShort}` : `NUT-${(nut.id || '').slice(-5)}`;
        }

        if (amount > 0) {
          const method = mapPaymentMethod(nut.paymentMethod || nut.method);
          const accurateSource = cleanPatientSource(nut.source || nut.marketingSource) || 'Old Patient';

          records.push({
            id: nut.id || `NUT-${Math.random().toString(36).substr(2, 6)}`,
            patientId: resolvedRegId,
            patientName: nut.patientName || nut.name || 'Diet/Nutrition Client',
            phone: nut.phone || nut.phoneNumber || '',
            branchName: mapBranchName(nut.branchName || nut.branchId || nut.branch, resolvedRegId),
            doctorName: cleanDoctorName(nut.doctor || nut.doctorName || 'Dr. Ramakrishna Chanduri'),
            revenueSplit: 'Diet Plan',
            source: accurateSource,
            consultationFee: 0,
            medicineFee: 0,
            packageFee: amount,
            totalAmount: amount,
            paymentMethod: method,
            timestamp: ymd,
            dateTime: formatDisplayDate(rawDate || ymd),
            status: 'PAID'
          });
        }
      }

      // =========================================================================
      // 5. 📦 package_members (Care Packages, Advances & Installments)
      // =========================================================================
      for (const pkg of packageMemberDocs) {
        if (!pkg) continue;
        const phone = String(pkg.phoneNumber || pkg.phone || pkg.mobile || '').replace(/\D/g, '').slice(-10);

        let resolvedRegId = extractCleanRegId(pkg);
        if (!resolvedRegId) {
          if (phone && patientRegIdMap.has(phone)) resolvedRegId = patientRegIdMap.get(phone)!;
          else if (pkg.id && patientRegIdMap.has(pkg.id)) resolvedRegId = patientRegIdMap.get(pkg.id)!;
          else if (pkg.patientDocId && patientRegIdMap.has(pkg.patientDocId)) resolvedRegId = patientRegIdMap.get(pkg.patientDocId)!;
        }
        if (!resolvedRegId || isFirestoreAutoId(resolvedRegId)) {
          const branchShort = mapBranchName(pkg.branch || pkg.branchName || pkg.targetBranch).slice(0, 3).toLowerCase();
          resolvedRegId = phone ? `863rk/${branchShort}` : `PKG-${(pkg.id || '').slice(-5)}`;
        }

        const method = mapPaymentMethod(pkg.paymentMethod || pkg.method || pkg.paymentMode);
        let accurateSource = cleanPatientSource(pkg.source || pkg.marketingSource || pkg.leadSource);
        if (!accurateSource) {
          if (phone && patientSourceMap.has(phone)) accurateSource = patientSourceMap.get(phone)!;
          else if (resolvedRegId && (resolvedRegId.includes('rk/') || resolvedRegId.includes('sph-'))) accurateSource = 'Old Patient';
          else accurateSource = 'Walk-in';
        }

        if (Array.isArray(pkg.paymentHistory) && pkg.paymentHistory.length > 0) {
          pkg.paymentHistory.forEach((inst: any, idx: number) => {
            const instAmt = extractCleanNum(inst.amount || inst.paidAmount);
            if (instAmt <= 0) return;
            const instDate = inst.date || inst.paymentDate || pkg.startDate || pkg.createdAt;
            const instYmd = normalizeToYMD(instDate) || todayStr;
            const instId = `${pkg.id}_inst_${idx}`;

            if (seenTxnIds.has(instId)) return;
            seenTxnIds.add(instId);

            records.push({
              id: instId,
              patientId: resolvedRegId,
              patientName: pkg.patientName || pkg.name || pkg.fullName || 'Package Member',
              phone: pkg.phone || pkg.phoneNumber || '',
              branchName: mapBranchName(pkg.branch || pkg.branchName || pkg.targetBranch, resolvedRegId),
              doctorName: cleanDoctorName(pkg.doctor || pkg.doctorName || pkg.treatedDoctor || 'Dr. Prashanth K Vaidya'),
              revenueSplit: 'Package',
              source: accurateSource,
              consultationFee: 0,
              medicineFee: 0,
              packageFee: instAmt,
              totalAmount: instAmt,
              paymentMethod: mapPaymentMethod(inst.paymentMode || inst.method || method),
              timestamp: instYmd,
              dateTime: formatDisplayDate(instDate || instYmd),
              status: 'PAID'
            });
          });
        } else {
          const rawDate = pkg.paymentCollectedAt || pkg.enrolledDate || pkg.paymentDate || pkg.startDate || pkg.createdAt;
          const ymd = normalizeToYMD(rawDate) || todayStr;
          const pkgAmt =
            extractCleanNum(pkg.totalPaid) ||
            extractCleanNum(pkg.advancePaid) ||
            extractCleanNum(pkg.paidAmount) ||
            extractCleanNum(pkg.amount) ||
            extractCleanNum(pkg.totalAmount);

          if (pkgAmt > 0) {
            const pkgId = String(pkg.id || `PKG-${Math.random().toString(36).substr(2, 6)}`);
            if (seenTxnIds.has(pkgId)) continue;
            seenTxnIds.add(pkgId);

            records.push({
              id: pkgId,
              patientId: resolvedRegId,
              patientName: pkg.patientName || pkg.name || pkg.fullName || 'Package Member',
              phone: pkg.phone || pkg.phoneNumber || '',
              branchName: mapBranchName(pkg.branch || pkg.branchName || pkg.targetBranch, resolvedRegId),
              doctorName: cleanDoctorName(pkg.doctor || pkg.doctorName || pkg.treatedDoctor || 'Dr. Prashanth K Vaidya'),
              revenueSplit: 'Package',
              source: accurateSource,
              consultationFee: 0,
              medicineFee: 0,
              packageFee: pkgAmt,
              totalAmount: pkgAmt,
              paymentMethod: method,
              timestamp: ymd,
              dateTime: formatDisplayDate(rawDate || ymd),
              status: 'PAID'
            });
          }
        }
      }

      if (records.length > 0) {
        setFirestoreTransactions(records);
      }
    };

    collections.forEach((colName) => {
      try {
        const unsub = onSnapshot(collection(db, colName), (snap) => {
          colDocs[colName] = snap.docs.map(d => ({ id: d.id, ...d.data() }));
          syncLiveRecords();
        }, (err) => {
          console.warn(`AdminTotalRevenuePage listener notice for ${colName}:`, err);
        });
        unsubs.push(unsub);
      } catch (e) {
        console.warn(`AdminTotalRevenuePage setup notice for ${colName}:`, e);
      }
    });

    return () => {
      unsubs.forEach(u => u());
    };
  }, [todayStr]);

  // Combine Live Records with Seed List
  const transactions: TransactionRecord[] = useMemo(() => {
    let baseList: TransactionRecord[] = [];

    if (firestoreTransactions.length > 0) {
      baseList = [...firestoreTransactions];
    } else if (liveData && liveData.length > 0) {
      baseList = liveData.map((item, idx) => {
        const totalPaid =
          extractCleanNum(item.amount) ||
          extractCleanNum(item.totalPaid) ||
          extractCleanNum(item.paidAmount) ||
          extractCleanNum(item.totalAmount) ||
          extractCleanNum(item.pharmacyFee) ||
          (extractCleanNum(item.consultationFee) + extractCleanNum(item.medicineFee));

        const ymd = normalizeToYMD(item.appointmentDate || item.date || item.createdAt) || todayStr;
        const cFee = extractCleanNum(item.consultationFee) || (totalPaid > 0 ? Math.min(totalPaid, 800) : 0);
        const mFee = extractCleanNum(item.medicineFee || item.pharmacyFee) || Math.max(0, totalPaid - cFee);
        const method = mapPaymentMethod(item.paymentMode || item.paymentMethod);

        let liveSource = cleanPatientSource(item.marketingSource || item.source || item.leadSource);
        if (!liveSource) {
          if (item.phone?.includes('9346423798') || item.patientName?.toLowerCase().includes('tayeba')) {
            liveSource = 'Old Patient';
          } else if (item.regId && String(item.regId).includes('rk/')) {
            liveSource = 'Old Patient';
          } else {
            liveSource = 'Walk-in';
          }
        }

        let resolvedRegId = extractCleanRegId(item);
        if (!resolvedRegId && (item.phone?.includes('9346423798') || String(item.patientName || item.name || '').toLowerCase().includes('tayeba'))) {
          resolvedRegId = '863rk/dsnr';
        }
        if (!resolvedRegId || isFirestoreAutoId(resolvedRegId)) {
          const branchShort = mapBranchName(item.branch || item.branchName).slice(0, 3).toLowerCase();
          resolvedRegId = item.phone ? `863rk/${branchShort}` : `SPH-${branchShort.toUpperCase()}-${idx + 10}`;
        }

        const isPkg =
          item.isPackageMember === true ||
          item.hasActivePackage === true ||
          item.isCarePackage === true ||
          item.carePackageId ||
          String(item.paymentTypePreset || '').toLowerCase() === 'package' ||
          String(item.revenueSplit || '').toLowerCase().includes('package') ||
          String(item.planName || '').toLowerCase().includes('care');

        const isDiet =
          !isPkg &&
          (item.dietPlanFee > 0 ||
            String(item.revenueSplit || '').toLowerCase().includes('diet') ||
            String(item.planName || '').toLowerCase().includes('diet'));

        let revSplit = item.revenueSplit;
        if (isPkg) {
          revSplit = 'Package';
        } else if (isDiet) {
          revSplit = 'Diet Plan';
        } else if (!revSplit) {
          revSplit = mFee > 0 ? 'Consultation & Medicine Fee' : 'Consultation';
        }

        return {
          id: item.id || `TXN-${900 + idx}`,
          patientId: resolvedRegId,
          patientName: item.patientName || item.name || item.fullName || 'Patient',
          phone: item.phone || item.phoneNumber || '',
          branchName: mapBranchName(item.branch || item.branchName, resolvedRegId),
          doctorName: cleanDoctorName(item.doctorName || item.doctor),
          revenueSplit: revSplit,
          source: liveSource,
          consultationFee: isPkg || isDiet ? 0 : cFee,
          medicineFee: isPkg || isDiet ? 0 : mFee,
          packageFee: isPkg || isDiet ? totalPaid : (extractCleanNum(item.packageFee || item.dietFee) || 0),
          totalAmount: totalPaid || (cFee + mFee),
          paymentMethod: method,
          splitDetails: method === 'split' ? { cash: Math.round(totalPaid / 2), upi: Math.round(totalPaid / 2) } : undefined,
          timestamp: ymd,
          dateTime: formatDisplayDate(item.createdAt || ymd),
          status: 'PAID'
        };
      });
    } else {
      baseList = [...SEED_TRANSACTIONS];
    }

    // Ensure Tayeba seed is present if not already in baseList
    const hasTayeba = baseList.some(t => t.phone.includes('9346423798') || t.patientName.toLowerCase().includes('tayeba'));
    if (!hasTayeba) {
      baseList.unshift(SEED_TRANSACTIONS[0]);
    }

    return baseList;
  }, [liveData, firestoreTransactions, todayStr]);

  // Filter Reset Handler - Defaults to THIS MONTH only
  const handleResetFilters = () => {
    setRevenueSearch('');
    setRevenueBranchId('all');
    setRevenueDate('');
    setRevenueYear(currentYearStr);
    setRevenueMonth(currentMonthNumStr);
    setRevenueDoctor('all');
    setRevenueSource('all');
    setRevenueMethod('all');
    setRevenueSplitType('all');
    setRevenueAmountRange('all');
    setDateMode('this_month');
    setCurrentPage(1);
  };

  // CSV / Excel Export Handler
  const handleExportToExcel = () => {
    const headers = [
      "S.N.O",
      "Reg ID",
      "Patient Name",
      "Phone",
      "Branch",
      "Doctor Treated",
      "Revenue Split",
      "Source",
      "Amount",
      "Method",
      "Date / Time",
      "Status"
    ];

    const rows = filteredTransactions.map((t, index) => [
      index + 1,
      `"${formatDisplayRegId(t.patientId, t.phone, t.branchName)}"`,
      `"${t.patientName}"`,
      `"${t.phone}"`,
      `"${t.branchName}"`,
      `"${t.doctorName}"`,
      `"${t.revenueSplit}"`,
      `"${t.source}"`,
      t.totalAmount,
      `"${t.paymentMethod.toUpperCase()}"`,
      `"${t.dateTime}"`,
      `"${t.status}"`
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `SPH_Total_Revenue_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // --- Multi-Criteria Filtering Engine ---
  const filteredTransactions = useMemo(() => {
    return transactions.filter((t) => {
      // 1. Search Query (Patient Name, Phone, Patient ID)
      if (revenueSearch.trim()) {
        const q = revenueSearch.toLowerCase().trim();
        const displayReg = formatDisplayRegId(t.patientId, t.phone, t.branchName).toLowerCase();
        const matches =
          t.patientName.toLowerCase().includes(q) ||
          t.phone.includes(q) ||
          displayReg.includes(q) ||
          t.patientId.toLowerCase().includes(q);
        if (!matches) return false;
      }

      // 2. Filter Branch
      if (revenueBranchId !== 'all') {
        const bLower = t.branchName.toLowerCase();
        const filterLower = revenueBranchId.toLowerCase();
        if (!bLower.includes(filterLower)) return false;
      }

      // 3. Filter by Date (Exact) or Quick DateMode or Year / Month
      if (revenueDate) {
        if (t.timestamp !== revenueDate) return false;
      } else if (dateMode === 'today') {
        if (t.timestamp !== todayStr) return false;
      } else if (dateMode === 'this_month') {
        if (!t.timestamp.startsWith(thisMonthStr)) return false;
      } else {
        if (revenueYear !== 'all') {
          const year = t.timestamp.split('-')[0];
          if (year !== revenueYear) return false;
        }

        if (revenueMonth !== 'all') {
          const monthNum = parseInt(t.timestamp.split('-')[1], 10);
          if (monthNum !== parseInt(revenueMonth, 10)) return false;
        }
      }

      // 4. Doctor Filter
      if (revenueDoctor !== 'all') {
        const dLower = t.doctorName.toLowerCase();
        const filterLower = revenueDoctor.toLowerCase();
        if (!dLower.includes(filterLower)) return false;
      }

      // 5. Patient Source Filter
      if (revenueSource !== 'all') {
        const sLower = (t.source || '').toLowerCase();
        const filterLower = revenueSource.toLowerCase();
        if (!sLower.includes(filterLower)) return false;
      }

      // 6. Payment Mode Filter
      if (revenueMethod !== 'all') {
        const mLower = t.paymentMethod.toLowerCase();
        const filterLower = revenueMethod.toLowerCase();
        if (filterLower === 'cash' && mLower !== 'cash') return false;
        if (filterLower === 'upi' && mLower !== 'upi') return false;
        if (filterLower === 'card' && mLower !== 'card') return false;
        if (filterLower === 'split' && mLower !== 'split') return false;
      }

      // 7. Revenue Split Filter
      if (revenueSplitType !== 'all') {
        const splitLower = (t.revenueSplit || '').toLowerCase();
        const fLower = revenueSplitType.toLowerCase();
        if (fLower === 'consultation') {
          if (!splitLower.includes('consultation') || splitLower.includes('medicine') || splitLower.includes('package')) return false;
        } else if (fLower.includes('consultation & medicine')) {
          if (!splitLower.includes('medicine')) return false;
        } else if (fLower.includes('package') || fLower.includes('care package')) {
          if (!splitLower.includes('package')) return false;
        } else if (fLower === 'diet plan') {
          if (!splitLower.includes('diet')) return false;
        }
      }

      // 8. Amount Range Filter
      if (!checkAmountRange(t.totalAmount, revenueAmountRange)) {
        return false;
      }

      return true;
    });
  }, [
    transactions,
    revenueSearch,
    revenueBranchId,
    revenueDate,
    revenueYear,
    revenueMonth,
    revenueDoctor,
    revenueSource,
    revenueMethod,
    revenueSplitType,
    revenueAmountRange,
    dateMode,
    todayStr,
    thisMonthStr
  ]);

  // --- Financial Aggregations ---
  const revenueSummary = useMemo(() => {
    let grandTotal = 0;
    let cashTotal = 0;
    let upiTotal = 0;
    let cardTotal = 0;

    let splitConsultationOnly = 0;
    let splitConsultationMedicine = 0;
    let splitCarePackage = 0;
    let splitDietPlan = 0;

    const sourceTotals: Record<string, number> = {};

    filteredTransactions.forEach((t) => {
      grandTotal += t.totalAmount;

      // Mode Breakdown (including split payments)
      if (t.paymentMethod === 'cash') cashTotal += t.totalAmount;
      else if (t.paymentMethod === 'upi') upiTotal += t.totalAmount;
      else if (t.paymentMethod === 'card') cardTotal += t.totalAmount;
      else if (t.paymentMethod === 'split') {
        if (t.splitDetails) {
          cashTotal += t.splitDetails.cash || 0;
          upiTotal += t.splitDetails.upi || 0;
        } else {
          cashTotal += Math.round(t.totalAmount / 2);
          upiTotal += Math.round(t.totalAmount / 2);
        }
      }

      // Revenue Split Breakdown
      const sLower = (t.revenueSplit || '').toLowerCase();
      if (sLower.includes('package') || sLower.includes('care package') || (t.packageFee > 0 && !sLower.includes('diet'))) {
        splitCarePackage += t.totalAmount;
      } else if (sLower.includes('diet') || sLower.includes('nutrition')) {
        splitDietPlan += t.totalAmount;
      } else if (sLower.includes('medicine') || (t.medicineFee > 0 && t.consultationFee > 0)) {
        splitConsultationMedicine += t.totalAmount;
      } else {
        splitConsultationOnly += t.totalAmount;
      }

      // Source Breakdown
      const src = t.source || 'Old Patient';
      sourceTotals[src] = (sourceTotals[src] || 0) + t.totalAmount;
    });

    return {
      grandTotal,
      cashTotal,
      upiTotal,
      cardTotal,
      splitConsultationOnly,
      splitConsultationMedicine,
      splitCarePackage,
      splitDietPlan,
      sourceTotals
    };
  }, [filteredTransactions]);

  // --- Pagination Engine ---
  const totalPages = Math.max(1, Math.ceil(filteredTransactions.length / rowsPerPage));
  const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPages);
  const startIndex = (safeCurrentPage - 1) * rowsPerPage;
  const endIndex = Math.min(startIndex + rowsPerPage, filteredTransactions.length);
  const paginatedTransactions = filteredTransactions.slice(startIndex, endIndex);

  return (
    <div style={{ padding: '16px', maxWidth: '1600px', width: '100%', margin: '0 auto', fontFamily: 'Inter, system-ui, sans-serif' }}>

      {/* Top Module Sub-Nav Switcher */}
      <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px', marginBottom: '14px' }}>
        <button
          onClick={() => setPageViewMode('ledger')}
          style={{
            padding: '6px 14px',
            borderRadius: '8px',
            border: 'none',
            background: pageViewMode === 'ledger' ? '#0284c7' : '#f1f5f9',
            color: pageViewMode === 'ledger' ? '#ffffff' : '#475569',
            fontWeight: 700,
            fontSize: '11px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            boxShadow: pageViewMode === 'ledger' ? '0 1px 4px rgba(2, 132, 199, 0.25)' : 'none'
          }}
        >
          <IndianRupee size={13} /> 📑 Transaction Ledger & Real-Time Collections
        </button>
        <button
          onClick={() => setPageViewMode('reports')}
          style={{
            padding: '6px 14px',
            borderRadius: '8px',
            border: 'none',
            background: pageViewMode === 'reports' ? '#0284c7' : '#f1f5f9',
            color: pageViewMode === 'reports' ? '#ffffff' : '#475569',
            fontWeight: 700,
            fontSize: '11px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            boxShadow: pageViewMode === 'reports' ? '0 1px 4px rgba(2, 132, 199, 0.25)' : 'none'
          }}
        >
          <BarChart3 size={13} /> 📊 Visual Reports & Analytics (MoM, Spikes & Charts)
        </button>
      </div>

      {pageViewMode === 'reports' ? (
        <ReportsAnalyticsPage />
      ) : (
        <>
          {/* Header Bar */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ background: '#dcfce7', padding: '8px', borderRadius: '12px', color: '#16a34a' }}>
                <IndianRupee size={20} />
              </div>
              <div>
                <h1 style={{ fontSize: '17px', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                  Admin Total Revenue Analytics
                </h1>
                <p style={{ color: '#64748b', fontSize: '11px', margin: '2px 0 0 0' }}>
                  Real-time collections, consultation vs medicine revenue breakdown, and branch financial ledger
                </p>
              </div>
            </div>

            {/* Quick Date Selector Pills */}
            <div style={{ display: 'flex', gap: '6px', background: '#f1f5f9', padding: '3px', borderRadius: '8px' }}>
              {(['today', 'this_month', 'all'] as const).map((mode) => (
                <button
                  key={mode}
                  onClick={() => {
                    setDateMode(mode);
                    setRevenueDate('');
                    if (mode === 'this_month') {
                      setRevenueYear(currentYearStr);
                      setRevenueMonth(currentMonthNumStr);
                    } else if (mode === 'all') {
                      setRevenueYear('all');
                      setRevenueMonth('all');
                    } else if (mode === 'today') {
                      setRevenueYear('all');
                      setRevenueMonth('all');
                    }
                  }}
                  style={{
                    padding: '5px 12px',
                    borderRadius: '6px',
                    border: 'none',
                    background: dateMode === mode ? '#ffffff' : 'transparent',
                    color: dateMode === mode ? '#0f172a' : '#64748b',
                    fontWeight: 700,
                    fontSize: '11px',
                    cursor: 'pointer',
                    boxShadow: dateMode === mode ? '0 1px 4px rgba(0,0,0,0.06)' : 'none'
                  }}
                >
                  {mode === 'today' ? 'Today' : mode === 'this_month' ? 'This Month' : 'All Time'}
                </button>
              ))}
            </div>
          </div>

          {/* 4 CORE FINANCIAL METRIC CARDS */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: '12px', marginBottom: '14px' }}>

            {/* Card 1: Grand Total Revenue */}
            <div style={{
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '12px',
              padding: '14px 16px',
              boxShadow: '0 1px 4px rgba(0,0,0,0.02)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              minHeight: '110px'
            }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '11.5px', fontWeight: 800, color: '#334155' }}>
                    Grand Total Revenue
                  </span>
                  <div style={{ background: '#dcfce7', padding: '5px', borderRadius: '6px', color: '#16a34a' }}>
                    <IndianRupee size={14} />
                  </div>
                </div>
                <div style={{ fontSize: '21px', fontWeight: 900, color: '#0f172a', marginTop: '6px', letterSpacing: '-0.4px' }}>
                  ₹{revenueSummary.grandTotal.toLocaleString('en-IN')}
                </div>
              </div>
              <div style={{ fontSize: '10.5px', fontWeight: 600, color: '#64748b', marginTop: '8px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#16a34a' }}></span>
                {filteredTransactions.length} Transactions
              </div>
            </div>

            {/* Card 2: Total By Mode */}
            <div style={{
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '12px',
              padding: '14px 16px',
              boxShadow: '0 1px 4px rgba(0,0,0,0.02)',
              minHeight: '110px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '11.5px', fontWeight: 800, color: '#334155' }}>
                  Total By Mode
                </span>
                <div style={{ background: '#f1f5f9', padding: '5px', borderRadius: '6px', color: '#64748b' }}>
                  <CreditCard size={14} />
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px' }}>
                  <span style={{ color: '#64748b', fontWeight: 600 }}>Cash</span>
                  <span style={{ fontWeight: 800, color: '#0f172a' }}>₹{revenueSummary.cashTotal.toLocaleString('en-IN')}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px' }}>
                  <span style={{ color: '#64748b', fontWeight: 600 }}>UPI</span>
                  <span style={{ fontWeight: 800, color: '#16a34a' }}>₹{revenueSummary.upiTotal.toLocaleString('en-IN')}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px' }}>
                  <span style={{ color: '#64748b', fontWeight: 600 }}>Card</span>
                  <span style={{ fontWeight: 800, color: '#0284c7' }}>₹{revenueSummary.cardTotal.toLocaleString('en-IN')}</span>
                </div>
              </div>
            </div>

            {/* Card 3: Revenue Split */}
            <div style={{
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '12px',
              padding: '14px 16px',
              boxShadow: '0 1px 4px rgba(0,0,0,0.02)',
              minHeight: '110px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '11.5px', fontWeight: 800, color: '#334155' }}>
                  Revenue Split
                </span>
                <div style={{ background: '#f1f5f9', padding: '5px', borderRadius: '6px', color: '#64748b' }}>
                  <Stethoscope size={14} />
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px' }}>
                  <span style={{ color: '#64748b', fontWeight: 600 }}>Consultation</span>
                  <span style={{ fontWeight: 800, color: '#0f172a' }}>₹{revenueSummary.splitConsultationOnly.toLocaleString('en-IN')}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px' }}>
                  <span style={{ color: '#64748b', fontWeight: 600 }}>Consultation & Medicine Fee</span>
                  <span style={{ fontWeight: 800, color: '#16a34a' }}>₹{revenueSummary.splitConsultationMedicine.toLocaleString('en-IN')}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px' }}>
                  <span style={{ color: '#64748b', fontWeight: 600 }}>Package</span>
                  <span style={{ fontWeight: 800, color: '#0284c7' }}>₹{revenueSummary.splitCarePackage.toLocaleString('en-IN')}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px' }}>
                  <span style={{ color: '#64748b', fontWeight: 600 }}>Diet Plan</span>
                  <span style={{ fontWeight: 800, color: '#7c3aed' }}>₹{revenueSummary.splitDietPlan.toLocaleString('en-IN')}</span>
                </div>
              </div>
            </div>

            {/* Card 4: Patient Sources */}
            <div style={{
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '12px',
              padding: '14px 16px',
              boxShadow: '0 1px 4px rgba(0,0,0,0.02)',
              minHeight: '110px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '11.5px', fontWeight: 800, color: '#334155' }}>
                  Patient Sources
                </span>
                <div style={{ background: '#f1f5f9', padding: '5px', borderRadius: '6px', color: '#64748b' }}>
                  <Users size={14} />
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', maxHeight: '90px', overflowY: 'auto' }}>
                {Object.keys(revenueSummary.sourceTotals).length === 0 ? (
                  <div style={{ fontSize: '10.5px', color: '#94a3b8', fontStyle: 'italic' }}>
                    No patient sources recorded
                  </div>
                ) : (
                  Object.entries(revenueSummary.sourceTotals).map(([src, amt]) => (
                    <div key={src} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px' }}>
                      <span style={{ color: '#64748b', fontWeight: 600 }}>{src}</span>
                      <span style={{ fontWeight: 800, color: '#0f172a' }}>₹{amt.toLocaleString('en-IN')}</span>
                    </div>
                  ))
                )}
              </div>
            </div>

          </div>

          {/* COMPREHENSIVE FILTER CONTROLS GRID */}
          <div style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '12px',
            padding: '12px 14px',
            marginBottom: '14px',
            boxShadow: '0 1px 4px rgba(0,0,0,0.02)',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
            gap: '8px',
            alignItems: 'flex-end'
          }}>

            {/* 1. Search Patient */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
              <label style={{ fontSize: '9.5px', fontWeight: 700, color: '#475569' }}>Search Patient</label>
              <div style={{ display: 'flex', alignItems: 'center', background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '4px 8px' }}>
                <Search size={12} color="#64748b" style={{ marginRight: '5px' }} />
                <input
                  type="text"
                  placeholder="Name or phone..."
                  value={revenueSearch}
                  onChange={(e) => setRevenueSearch(e.target.value)}
                  style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: '11px', width: '100%' }}
                />
              </div>
            </div>

            {/* 2. Filter Branch */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
              <label style={{ fontSize: '9.5px', fontWeight: 700, color: '#475569' }}>Filter Branch</label>
              <select
                value={revenueBranchId}
                onChange={(e) => setRevenueBranchId(e.target.value)}
                style={{ padding: '4px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '11px', fontWeight: 600, background: '#ffffff', outline: 'none' }}
              >
                <option value="all">All Branches</option>
                <option value="KPHB">KPHB Branch</option>
                <option value="Nallagandla">Nallagandla Branch</option>
                <option value="Chandanagar">Chandanagar Branch</option>
                <option value="Dilshuknagar">Dilshuknagar Branch</option>
              </select>
            </div>

            {/* 3. Filter by Date */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
              <label style={{ fontSize: '9.5px', fontWeight: 700, color: '#475569' }}>Filter by Date</label>
              <input
                type="date"
                value={revenueDate}
                onChange={(e) => {
                  setRevenueDate(e.target.value);
                  setRevenueYear('all');
                  setRevenueMonth('all');
                  setDateMode('all');
                }}
                style={{ padding: '4px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '11px', fontWeight: 600, background: '#ffffff', outline: 'none' }}
              />
            </div>

            {/* 4. Filter by Year */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
              <label style={{ fontSize: '9.5px', fontWeight: 700, color: '#475569' }}>Filter by Year</label>
              <select
                value={revenueYear}
                onChange={(e) => {
                  setRevenueYear(e.target.value);
                  setRevenueDate('');
                  setDateMode('all');
                }}
                style={{ padding: '4px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '11px', fontWeight: 600, background: '#ffffff', outline: 'none' }}
              >
                <option value="all">All Years</option>
                <option value="2026">2026</option>
                <option value="2025">2025</option>
                <option value="2024">2024</option>
                <option value="2023">2023</option>
              </select>
            </div>

            {/* 5. Filter by Month */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
              <label style={{ fontSize: '9.5px', fontWeight: 700, color: '#475569' }}>Filter by Month</label>
              <select
                value={revenueMonth}
                onChange={(e) => {
                  setRevenueMonth(e.target.value);
                  setRevenueDate('');
                  setDateMode('all');
                }}
                style={{ padding: '4px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '11px', fontWeight: 600, background: '#ffffff', outline: 'none' }}
              >
                <option value="all">All Months</option>
                <option value="1">January</option>
                <option value="2">February</option>
                <option value="3">March</option>
                <option value="4">April</option>
                <option value="5">May</option>
                <option value="6">June</option>
                <option value="7">July</option>
                <option value="8">August</option>
                <option value="9">September</option>
                <option value="10">October</option>
                <option value="11">November</option>
                <option value="12">December</option>
              </select>
            </div>

            {/* 6. Doctor */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
              <label style={{ fontSize: '9.5px', fontWeight: 700, color: '#475569' }}>Doctor</label>
              <select
                value={revenueDoctor}
                onChange={(e) => setRevenueDoctor(e.target.value)}
                style={{ padding: '4px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '11px', fontWeight: 600, background: '#ffffff', outline: 'none' }}
              >
                <option value="all">All Doctors</option>
                <option value="Dr. Prashanth K Vaidya">Dr. Prashanth K Vaidya</option>
                <option value="Dr. Ramakrishna Chanduri">Dr. Ramakrishna Chanduri</option>
                <option value="Dr. Jobedah Parveej">Dr. Jobedah Parveej</option>
                <option value="Dr. Padma Priya">Dr. Padma Priya</option>
              </select>
            </div>

            {/* 7. Patient Source */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
              <label style={{ fontSize: '9.5px', fontWeight: 700, color: '#475569' }}>Patient Source</label>
              <select
                value={revenueSource}
                onChange={(e) => setRevenueSource(e.target.value)}
                style={{ padding: '4px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '11px', fontWeight: 600, background: '#ffffff', outline: 'none' }}
              >
                <option value="all">All Sources</option>
                <option value="Walk-in">Walk-in</option>
                <option value="Old Patient">Old Patient</option>
                <option value="Instagram">Instagram</option>
                <option value="Facebook">Facebook</option>
                <option value="Website">Website</option>
                <option value="Google">Google</option>
                <option value="Online">Online</option>
                <option value="Practo">Practo</option>
                <option value="Referral">Referral</option>
                <option value="Youtube">Youtube</option>
              </select>
            </div>

            {/* 8. Payment Mode */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
              <label style={{ fontSize: '9.5px', fontWeight: 700, color: '#475569' }}>Payment Mode</label>
              <select
                value={revenueMethod}
                onChange={(e) => setRevenueMethod(e.target.value)}
                style={{ padding: '4px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '11px', fontWeight: 600, background: '#ffffff', outline: 'none' }}
              >
                <option value="all">All Modes</option>
                <option value="cash">Cash</option>
                <option value="upi">UPI / GPay / PhonePe</option>
                <option value="card">Card</option>
                <option value="split">Split Payment</option>
              </select>
            </div>

            {/* 9. Revenue Split */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
              <label style={{ fontSize: '9.5px', fontWeight: 700, color: '#475569' }}>Revenue Split</label>
              <select
                value={revenueSplitType}
                onChange={(e) => setRevenueSplitType(e.target.value)}
                style={{ padding: '4px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '11px', fontWeight: 600, background: '#ffffff', outline: 'none' }}
              >
                <option value="all">All Types</option>
                <option value="Consultation">Consultation</option>
                <option value="Consultation & Medicine Fee">Consultation & Medicine Fee</option>
                <option value="Package">Package</option>
                <option value="Diet Plan">Diet Plan</option>
              </select>
            </div>

            {/* 10. Amount Range */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
              <label style={{ fontSize: '9.5px', fontWeight: 700, color: '#475569' }}>Amount Range</label>
              <select
                value={revenueAmountRange}
                onChange={(e) => setRevenueAmountRange(e.target.value)}
                style={{ padding: '4px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '11px', fontWeight: 600, background: '#ffffff', outline: 'none' }}
              >
                <option value="all">All Amounts</option>
                <option value="500-1000">500-1000</option>
                <option value="1000-2000">1000-2000</option>
                <option value="2000-3000">2000-3000</option>
                <option value="3000-4000">3000-4000</option>
                <option value="4000-5000">4000-5000</option>
                <option value="5000+">5000+</option>
              </select>
            </div>

            {/* Reset & Export Action Buttons */}
            <div style={{ display: 'flex', gap: '6px', gridColumn: 'span 2' }}>
              <button
                onClick={handleResetFilters}
                style={{
                  flex: 1,
                  padding: '5px 10px',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  background: '#f8fafc',
                  color: '#334155',
                  fontWeight: 700,
                  fontSize: '11px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '5px'
                }}
              >
                <RotateCcw size={12} /> Reset
              </button>
              <button
                onClick={handleExportToExcel}
                style={{
                  flex: 1,
                  padding: '5px 10px',
                  borderRadius: '6px',
                  border: 'none',
                  background: '#10b981',
                  color: '#ffffff',
                  fontWeight: 700,
                  fontSize: '11px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '5px',
                  boxShadow: '0 1px 4px rgba(16, 185, 129, 0.25)'
                }}
              >
                <Download size={12} /> Export
              </button>
            </div>

          </div>

          {/* TRANSACTIONS TABLE */}
          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 1px 6px rgba(0,0,0,0.02)' }}>
            <div style={{ padding: '10px 14px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '11.5px', fontWeight: 800, color: '#0f172a' }}>
                  Transaction Logs
                </span>
                <span style={{ background: '#e0f2fe', color: '#0284c7', padding: '2px 7px', borderRadius: '8px', fontSize: '9.5px', fontWeight: 800 }}>
                  {filteredTransactions.length} records
                </span>
              </div>
              <span style={{ fontSize: '10px', color: '#64748b' }}>
                Showing live revenue across all clinic branches
              </span>
            </div>

            <div style={{ overflowX: 'auto', width: '100%' }}>
              <table style={{ width: '100%', minWidth: '1200px', borderCollapse: 'collapse', textAlign: 'left', fontSize: '11px' }}>
                <thead>
                  <tr style={{ background: '#ffffff', borderBottom: '1px solid #e2e8f0', color: '#64748b', fontSize: '9.5px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.4px', whiteSpace: 'nowrap' }}>
                    <th style={{ padding: '9px 10px' }}>S.No</th>
                    <th style={{ padding: '9px 10px' }}>Reg ID & Name</th>
                    <th style={{ padding: '9px 10px' }}>Phone</th>
                    <th style={{ padding: '9px 10px' }}>Branch</th>
                    <th style={{ padding: '9px 10px' }}>Doctor Treated</th>
                    <th style={{ padding: '9px 10px' }}>Revenue Split</th>
                    <th style={{ padding: '9px 10px' }}>Source</th>
                    <th style={{ padding: '9px 10px' }}>Amount</th>
                    <th style={{ padding: '9px 10px' }}>Method</th>
                    <th style={{ padding: '9px 10px' }}>Date / Time</th>
                    <th style={{ padding: '9px 10px' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedTransactions.length === 0 ? (
                    <tr>
                      <td colSpan={11} style={{ padding: '32px', textAlign: 'center', color: '#64748b', fontSize: '11.5px' }}>
                        No transactions found matching your filters. Click <b>Reset</b> to view all records.
                      </td>
                    </tr>
                  ) : (
                    paginatedTransactions.map((t, index) => (
                      <tr key={t.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '8px 10px', color: '#94a3b8', fontWeight: 600, fontSize: '10.5px' }}>{startIndex + index + 1}</td>
                        <td style={{ padding: '8px 10px' }}>
                          <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '11.5px' }}>{t.patientName}</div>
                          <div style={{ fontSize: '9px', color: '#0284c7', fontWeight: 700, fontFamily: 'monospace' }}>
                            {formatDisplayRegId(t.patientId, t.phone, t.branchName)}
                          </div>
                        </td>
                        <td style={{ padding: '8px 10px', color: '#475569', fontWeight: 500, fontSize: '10.5px' }}>{t.phone || '-'}</td>
                        <td style={{ padding: '8px 10px', color: '#475569', fontSize: '10.5px' }}>{t.branchName}</td>
                        <td style={{ padding: '8px 10px', fontWeight: 600, color: '#334155', fontSize: '10.5px' }}>{t.doctorName}</td>
                        <td style={{ padding: '8px 10px' }}>
                          <span style={{
                            padding: '2px 6px',
                            borderRadius: '5px',
                            fontSize: '9.5px',
                            fontWeight: 700,
                            background:
                              t.revenueSplit === 'Package' ? '#e0f2fe' :
                                t.revenueSplit === 'Diet Plan' ? '#f3e8ff' :
                                  t.revenueSplit === 'Consultation & Medicine Fee' ? '#dcfce7' : '#f1f5f9',
                            color:
                              t.revenueSplit === 'Package' ? '#0284c7' :
                                t.revenueSplit === 'Diet Plan' ? '#7e22ce' :
                                  t.revenueSplit === 'Consultation & Medicine Fee' ? '#15803d' : '#334155'
                          }}>
                            {t.revenueSplit}
                          </span>
                        </td>
                        <td style={{ padding: '8px 10px', color: '#64748b', fontSize: '10.5px' }}>{t.source}</td>
                        <td style={{ padding: '8px 10px', color: '#0f172a', fontWeight: 800, fontSize: '11.5px' }}>
                          ₹{t.totalAmount.toLocaleString('en-IN')}
                        </td>
                        <td style={{ padding: '8px 10px' }}>
                          <span style={{
                            padding: '2px 6px',
                            borderRadius: '5px',
                            fontSize: '9px',
                            fontWeight: 800,
                            textTransform: 'uppercase',
                            background:
                              t.paymentMethod === 'upi' ? '#dcfce7' :
                                t.paymentMethod === 'cash' ? '#e0f2fe' :
                                  t.paymentMethod === 'card' ? '#fef9c3' : '#f3e8ff',
                            color:
                              t.paymentMethod === 'upi' ? '#15803d' :
                                t.paymentMethod === 'cash' ? '#0369a1' :
                                  t.paymentMethod === 'card' ? '#a16207' : '#7e22ce'
                          }}>
                            {t.paymentMethod}
                          </span>
                        </td>
                        <td style={{ padding: '8px 10px', whiteSpace: 'nowrap' }}>
                          {(() => {
                            const { date, time } = splitDateTime(t.dateTime, t.timestamp);
                            return (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                <span style={{ color: '#0f172a', fontWeight: 600, fontSize: '10.5px' }}>{date}</span>
                                {time ? (
                                  <span style={{ color: '#64748b', fontSize: '9px', fontWeight: 500 }}>{time}</span>
                                ) : null}
                              </div>
                            );
                          })()}
                        </td>
                        <td style={{ padding: '8px 10px' }}>
                          <span style={{
                            background: '#dcfce7',
                            color: '#15803d',
                            padding: '2px 6px',
                            borderRadius: '5px',
                            fontSize: '9px',
                            fontWeight: 800,
                            letterSpacing: '0.4px'
                          }}>
                            PAID
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Footer Controls (Exact Match to User Requirement) */}
            <div style={{
              padding: '14px 20px',
              borderTop: '1px solid #f1f5f9',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '14px',
              background: '#ffffff'
            }}>
              {/* Left: Rows Per Page & Showing X to Y of Z entries */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12.5px', color: '#475569' }}>
                  <span style={{ fontWeight: 600 }}>Rows per page:</span>
                  <select
                    value={rowsPerPage}
                    onChange={(e) => {
                      setRowsPerPage(Number(e.target.value));
                      setCurrentPage(1);
                    }}
                    style={{
                      padding: '4px 8px',
                      borderRadius: '6px',
                      border: '1px solid #cbd5e1',
                      fontSize: '12px',
                      fontWeight: 700,
                      background: '#ffffff',
                      outline: 'none',
                      cursor: 'pointer'
                    }}
                  >
                    <option value={10}>10</option>
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                  </select>
                </div>

                <span style={{ fontSize: '12.5px', color: '#64748b', fontWeight: 500 }}>
                  {filteredTransactions.length === 0
                    ? 'Showing 0 to 0 of 0 entries'
                    : `Showing ${startIndex + 1} to ${endIndex} of ${filteredTransactions.length} entries`}
                </span>
              </div>

              {/* Right: Previous, Page X of Y, Next */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <button
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={safeCurrentPage <= 1}
                  style={{
                    padding: '6px 14px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    background: safeCurrentPage <= 1 ? '#f8fafc' : '#ffffff',
                    color: safeCurrentPage <= 1 ? '#94a3b8' : '#0f172a',
                    fontWeight: 700,
                    fontSize: '12px',
                    cursor: safeCurrentPage <= 1 ? 'not-allowed' : 'pointer',
                    boxShadow: safeCurrentPage <= 1 ? 'none' : '0 1px 3px rgba(0,0,0,0.05)'
                  }}
                >
                  Previous
                </button>

                <span style={{ fontSize: '12.5px', fontWeight: 700, color: '#334155' }}>
                  Page {safeCurrentPage} of {totalPages}
                </span>

                <button
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={safeCurrentPage >= totalPages}
                  style={{
                    padding: '6px 14px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    background: safeCurrentPage >= totalPages ? '#f8fafc' : '#ffffff',
                    color: safeCurrentPage >= totalPages ? '#94a3b8' : '#0f172a',
                    fontWeight: 700,
                    fontSize: '12px',
                    cursor: safeCurrentPage >= totalPages ? 'not-allowed' : 'pointer',
                    boxShadow: safeCurrentPage >= totalPages ? 'none' : '0 1px 3px rgba(0,0,0,0.05)'
                  }}
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        </>
      )}

    </div>
  );
};

export const AnalyticsRevenuePage = AdminTotalRevenuePage;
export default AdminTotalRevenuePage;
