import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, setDoc } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyAohSNLyeS6bYtnk2QvB4HGo0LbHDw9b6Q",
  authDomain: "spiritual-homeopathy-3b552.firebaseapp.com",
  databaseURL: "https://spiritual-homeopathy-3b552-default-rtdb.firebaseio.com",
  projectId: "spiritual-homeopathy-3b552",
  storageBucket: "spiritual-homeopathy-3b552.firebasestorage.app",
  messagingSenderId: "81822616559",
  appId: "1:81822616559:web:98a0b9cd974938cc87841a"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Simulate exact AnalyticsRevenuePage logic
async function runAnalyticsRevenueSimulation() {
  const [allTxnSnap, allPatSnap, aptSnap] = await Promise.all([
    getDocs(collection(db, 'alltransactions')),
    getDocs(collection(db, 'allpatients')),
    getDocs(collection(db, 'appointments'))
  ]);

  const allTxnDocs = allTxnSnap.docs.map(d => ({ id: d.id, ...d.data() }));
  const allPatientDocs = allPatSnap.docs.map(d => ({ id: d.id, ...d.data() }));
  const appointmentDocs = aptSnap.docs.map(d => ({ id: d.id, ...d.data() }));

  const extractCleanNum = (c) => {
    if (c !== undefined && c !== null && c !== '') {
      const cleanStr = String(c).replace(/[^0-9.]/g, '');
      const num = Number(cleanStr);
      if (!isNaN(num) && num > 0) return num;
    }
    return 0;
  };

  const normalizeToYMD = (raw) => {
    if (!raw) return '';
    let val = raw;
    if (typeof val === 'object') {
      if (typeof val.toDate === 'function') val = val.toDate();
      else if (typeof val.seconds === 'number') val = new Date(val.seconds * 1000);
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
    const isoMatch = str.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
    if (isoMatch) return `${isoMatch[1]}-${isoMatch[2].padStart(2, '0')}-${isoMatch[3].padStart(2, '0')}`;
    const ddmmyyyyMatch = str.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})/);
    if (ddmmyyyyMatch) return `${ddmmyyyyMatch[3]}-${ddmmyyyyMatch[2].padStart(2, '0')}-${ddmmyyyyMatch[1].padStart(2, '0')}`;
    return '';
  };

  const mapBranchKey = (raw = '') => {
    const s = String(raw || '').toLowerCase();
    if (s.includes('kphb') || s.includes('kphp') || s.includes('kukatpally')) return 'kphb';
    if (s.includes('nallagandla') || s.includes('nalla') || s.includes('nlg')) return 'nallagandla';
    if (s.includes('dilshuk') || s.includes('dilsukh') || s.includes('dsnr')) return 'dilshuknagar';
    if (s.includes('chanda') || s.includes('chandnagar') || s.includes('cngr')) return 'chandanagar';
    return 'kphb';
  };

  const seenTxnIds = new Set();
  const seenAppointmentIds = new Set();
  const seenPatientIds = new Set();
  const seenPhoneDates = new Set();
  const records = [];

  // 1. alltransactions
  for (const item of allTxnDocs) {
    const ymd = normalizeToYMD(item.timestamp || item.date || item.createdAt);
    const phone = String(item.phoneNumber || item.phone || item.mobile || '').replace(/\D/g, '').slice(-10);
    if (item.id) seenTxnIds.add(String(item.id));
    if (item.appointmentId) seenAppointmentIds.add(String(item.appointmentId));
    if (item.patientDocId) seenPatientIds.add(String(item.patientDocId));
    if (phone && ymd) seenPhoneDates.add(`${phone}_${ymd}`);
    const tot = extractCleanNum(item.amount) || extractCleanNum(item.totalAmount) || extractCleanNum(item.totalPaid) || extractCleanNum(item.paidAmount);
    if (tot > 0) {
      records.push({
        id: item.id,
        branchKey: mapBranchKey(item.branchName || item.branchId || item.branch),
        timestamp: ymd,
        totalAmount: tot,
        sourceCol: 'alltransactions'
      });
    }
  }

  // 2. allpatients
  for (const p of allPatientDocs) {
    const ymd = normalizeToYMD(p.paymentCollectedAt || p.createdAt || p.date);
    const phone = String(p.phoneNumber || p.phone || p.mobile || '').replace(/\D/g, '').slice(-10);
    const inTxns = (p.id && (seenTxnIds.has(p.id) || seenPatientIds.has(p.id))) || (phone && ymd && seenPhoneDates.has(`${phone}_${ymd}`));
    if (inTxns) continue;
    const amountPaid = extractCleanNum(p.amountPaid) || extractCleanNum(p.totalPaid) || extractCleanNum(p.paidAmount);
    if (amountPaid > 0) {
      records.push({
        id: p.id,
        branchKey: mapBranchKey(p.branchName || p.branch),
        timestamp: ymd,
        totalAmount: amountPaid,
        sourceCol: 'allpatients'
      });
      if (phone && ymd) seenPhoneDates.add(`${phone}_${ymd}`);
    }
  }

  // 3. appointments
  for (const apt of appointmentDocs) {
    const ymd = normalizeToYMD(apt.appointmentDate || apt.date || apt.createdAt);
    const phone = String(apt.phoneNumber || apt.phone || apt.mobile || '').replace(/\D/g, '').slice(-10);
    const inTxns = (apt.id && (seenTxnIds.has(apt.id) || seenAppointmentIds.has(apt.id))) || (phone && ymd && seenPhoneDates.has(`${phone}_${ymd}`));
    if (inTxns) continue;

    const consultationFee = extractCleanNum(apt.amountPaid) || extractCleanNum(apt.consultationFee) || extractCleanNum(apt.amount);
    const paymentStatus = String(apt.paymentStatus || '').toLowerCase();
    const isPaid = paymentStatus === 'paid' || paymentStatus === 'confirmed' || consultationFee > 0;
    if (consultationFee > 0 && isPaid) {
      records.push({
        id: apt.id,
        branchKey: mapBranchKey(apt.branchName || apt.branch),
        timestamp: ymd,
        totalAmount: consultationFee,
        sourceCol: 'appointments'
      });
    }
  }

  const branchTotals = {
    kphb: { total: 0, count: 0 },
    nallagandla: { total: 0, count: 0 },
    dilshuknagar: { total: 0, count: 0 },
    chandanagar: { total: 0, count: 0 }
  };

  records.forEach(r => {
    if (r.timestamp && r.timestamp.startsWith('2026-10')) {
      if (branchTotals[r.branchKey]) {
        branchTotals[r.branchKey].total += r.totalAmount;
        branchTotals[r.branchKey].count += 1;
      }
    }
  });

  console.log('Exact Admin Revenue Analytics for October 2026:');
  console.log(JSON.stringify(branchTotals, null, 2));
}

runAnalyticsRevenueSimulation().then(() => process.exit(0));
