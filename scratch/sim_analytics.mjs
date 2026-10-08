import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';

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

// Simulate AnalyticsRevenuePage logic
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

  const mapBranchName = (raw = '') => {
    const s = String(raw || '').toLowerCase();
    if (s.includes('kphb') || s.includes('kphp')) return 'KPHB Branch';
    if (s.includes('nallagandla') || s.includes('nlg')) return 'Nallagandla Branch';
    if (s.includes('dilshuk') || s.includes('dilsukh') || s.includes('dsnr')) return 'Dilshuknagar Branch';
    if (s.includes('chanda') || s.includes('chandnagar') || s.includes('cngr')) return 'Chandanagar Branch';
    return raw ? `${raw} Branch` : 'KPHB Branch';
  };

  const seenTxnIds = new Set();
  const seenAppointmentIds = new Set();
  const seenPatientIds = new Set();
  const seenPhoneDates = new Set();
  const seenRegDates = new Set();
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
        branchName: mapBranchName(item.branchName || item.branchId || item.branch),
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
        patientName: p.name || p.patientName,
        phone,
        branchName: mapBranchName(p.branchName || p.branch),
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
        patientName: apt.patientName,
        phone,
        branchName: mapBranchName(apt.branchName || apt.branch),
        timestamp: ymd,
        totalAmount: consultationFee,
        sourceCol: 'appointments'
      });
    }
  }

  // Filter for KPHB & 2026-10
  const kphbOct = records.filter(r => r.branchName === 'KPHB Branch' && r.timestamp && r.timestamp.startsWith('2026-10'));
  console.log(`Simulated AnalyticsRevenuePage records for KPHB Oct 2026: ${kphbOct.length}`);
  const sum = kphbOct.reduce((acc, r) => acc + r.totalAmount, 0);
  console.log(`Simulated AnalyticsRevenuePage Grand Total: ₹${sum}`);

  // Now find the 46 appointments from branchRevenueCalculator
  // and see which ones are NOT in kphbOct or have different amounts!
  const inKphbOctIds = new Set(kphbOct.map(r => r.id));
  const missingFromAnalytics = [];
  appointmentDocs.forEach(a => {
    const b = mapBranchName(a.branch || a.branchName);
    const ymd = normalizeToYMD(a.paymentCollectedAt || a.appointmentDate || a.date);
    const s = String(a.status || '').toLowerCase();
    const p = String(a.paymentStatus || '').toLowerCase();
    const isPaid = p === 'paid' || s === 'completed' || s === 'done' || (Number(a.totalPaid) > 0);
    if (b === 'KPHB Branch' && ymd && ymd.startsWith('2026-10') && isPaid) {
      if (!inKphbOctIds.has(a.id)) {
        missingFromAnalytics.push({
          id: a.id,
          patientName: a.patientName,
          phone: a.phone || a.phoneNumber,
          totalPaid: a.totalPaid,
          consultationFee: a.consultationFee,
          medicineFee: a.medicineFee,
          amountPaid: a.amountPaid,
          status: a.status,
          paymentStatus: a.paymentStatus,
          date: ymd
        });
      }
    }
  });

  console.log(`Appointments missing or excluded in AnalyticsRevenuePage: ${missingFromAnalytics.length}`);
  console.log(JSON.stringify(missingFromAnalytics, null, 2));
}

runAnalyticsRevenueSimulation().then(() => process.exit(0));
