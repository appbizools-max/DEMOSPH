import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, query, limit } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyAohSNLyeS6bYtnk2QvB4HGo0LbHDw9b6Q",
  authDomain: "spiritual-homeopathy-3b552.firebaseapp.com",
  projectId: "spiritual-homeopathy-3b552",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

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
  try {
    const d = new Date(str);
    if (!isNaN(d.getTime())) {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${day}`;
    }
  } catch (e) {}
  return '';
};

const normalizeBranchKey = (raw = '') => {
  const s = String(raw || '').toLowerCase().trim();
  if (s.includes('kphb') || s.includes('kukatpally')) return 'kphb';
  if (s.includes('nalla') || s.includes('nallagandla')) return 'nallagandla';
  if (s.includes('dilshuk') || s.includes('dilsukh') || s.includes('dsnr') || s.includes('dshnr')) return 'dilshuknagar';
  if (s.includes('chanda') || s.includes('chnr') || s.includes('chandanagar')) return 'chandanagar';
  return 'unknown';
};

const BRANCH_NAMES = {
  kphb: 'KPHB Branch',
  nallagandla: 'Nallagandla Branch',
  dilshuknagar: 'Dilshuknagar Branch',
  chandanagar: 'Chandanagar Branch',
};

async function getOctoberRevenue() {
  console.log('Fetching collections...');
  const [aptSnap, pkgSnap, txnSnap, patSnap, targetSnap] = await Promise.all([
    getDocs(collection(db, 'appointments')),
    getDocs(collection(db, 'package_members')),
    getDocs(collection(db, 'alltransactions')),
    getDocs(collection(db, 'allpatients')),
    getDocs(collection(db, 'branch_targets'))
  ]);

  console.log(`Appointments: ${aptSnap.size}, PackageMembers: ${pkgSnap.size}, Txns: ${txnSnap.size}, AllPatients: ${patSnap.size}`);

  // 1. branchRevenueCalculator METHOD (Appointments + Package Members)
  const calcTotals = {
    kphb: { total: 0, appointmentsCount: 0, packageCount: 0, items: [] },
    nallagandla: { total: 0, appointmentsCount: 0, packageCount: 0, items: [] },
    dilshuknagar: { total: 0, appointmentsCount: 0, packageCount: 0, items: [] },
    chandanagar: { total: 0, appointmentsCount: 0, packageCount: 0, items: [] }
  };

  const seenIds = new Set();

  aptSnap.forEach(d => {
    const app = { id: d.id, ...d.data() };
    const bKey = normalizeBranchKey(app.branch || app.targetBranch || app.branchName);
    if (!calcTotals[bKey]) return;

    const s = String(app.status || '').toLowerCase().trim();
    const p = String(app.paymentStatus || '').toLowerCase().trim();
    const isPaid = p === 'paid' || s === 'completed' || s === 'done' || s === 'paid' || (Number(app.totalPaid) > 0);
    if (!isPaid) return;

    const rawDate = app.paymentCollectedAt || app.appointmentDate || app.date || app.createdAt || app.updatedAt;
    const ymd = normalizeToYMD(rawDate);
    if (!ymd || !ymd.startsWith('2026-10')) return;

    if (seenIds.has(app.id)) return;
    seenIds.add(app.id);

    let paidAmt = 0;
    if (app.totalPaid !== undefined && app.totalPaid !== null && Number(app.totalPaid) > 0) {
      paidAmt = Number(app.totalPaid);
    } else if (app.totalAmount !== undefined && app.totalAmount !== null && Number(app.totalAmount) > 0) {
      paidAmt = Number(app.totalAmount);
    } else {
      const cFee = Number(app.consultationFee) || 0;
      const mFee = Number(app.medicineFee || app.pharmacyFee || app.medicineFeeRequested) || 0;
      const dFee = Number(app.dietFee || app.dietFeeAmount) || 0;
      const oFee = Number(app.otherCharges) || 0;
      const pFee = Number(app.packageFee || app.packageAdvancePaid) || 0;
      const disc = Number(app.discount) || 0;
      paidAmt = Math.max(0, cFee + mFee + dFee + oFee + pFee - disc);
    }

    calcTotals[bKey].total += paidAmt;
    calcTotals[bKey].appointmentsCount++;
    calcTotals[bKey].items.push({ id: app.id, patient: app.patientName, date: ymd, amount: paidAmt, type: 'appointment' });
  });

  pkgSnap.forEach(d => {
    const pkg = { id: d.id, ...d.data() };
    const bKey = normalizeBranchKey(pkg.branch || pkg.targetBranch || pkg.branchName);
    if (!calcTotals[bKey]) return;

    const rawDate = pkg.createdAt || pkg.startDate || pkg.updatedAt;
    const ymd = normalizeToYMD(rawDate);
    if (!ymd || !ymd.startsWith('2026-10')) return;

    if (seenIds.has(pkg.id) || (pkg.patientDocId && seenIds.has(pkg.patientDocId))) return;
    seenIds.add(pkg.id);

    const pkgPaid = Number(pkg.paidAmount || pkg.advancePaid || pkg.totalAmount) || 0;
    if (pkgPaid > 0) {
      calcTotals[bKey].total += pkgPaid;
      calcTotals[bKey].packageCount++;
      calcTotals[bKey].items.push({ id: pkg.id, patient: pkg.patientName, date: ymd, amount: pkgPaid, type: 'package' });
    }
  });

  // 2. Read stored branch_targets
  const storedTargets = {};
  targetSnap.forEach(d => {
    storedTargets[d.id] = d.data();
  });

  // 3. Transactions / Alltransactions method
  const txnTotals = {
    kphb: 0,
    nallagandla: 0,
    dilshuknagar: 0,
    chandanagar: 0
  };
  txnSnap.forEach(d => {
    const txn = d.data();
    const bKey = normalizeBranchKey(txn.branchName || txn.branch || txn.branchId);
    if (!txnTotals[bKey] && txnTotals[bKey] !== 0) return;
    const ymd = normalizeToYMD(txn.timestamp || txn.date || txn.createdAt);
    if (!ymd || !ymd.startsWith('2026-10')) return;
    const amt = Number(txn.amount || txn.totalAmount || txn.totalPaid || txn.paidAmount || 0);
    if (amt > 0) txnTotals[bKey] += amt;
  });

  console.log('--- REVENUE REPORT: OCTOBER 2026 ---');
  let grandTotal = 0;
  for (const [key, data] of Object.entries(calcTotals)) {
    grandTotal += data.total;
    console.log(`${BRANCH_NAMES[key]}: ₹${data.total.toLocaleString('en-IN')} (${data.appointmentsCount} appointments, ${data.packageCount} packages)`);
  }
  console.log(`GRAND TOTAL ACROSS ALL BRANCHES: ₹${grandTotal.toLocaleString('en-IN')}`);

  console.log('\n--- STORED BRANCH TARGETS IN FIRESTORE ---');
  for (const [docId, tData] of Object.entries(storedTargets)) {
    console.log(`Doc ${docId}: targetGoal=₹${tData.targetGoal || tData.monthlyTarget || 0}, targetReached=₹${tData.targetReached || 0}`);
  }

  console.log('\n--- ALLTRANSACTIONS COLLECTION OCTOBER TOTALS ---');
  for (const [key, tot] of Object.entries(txnTotals)) {
    console.log(`${BRANCH_NAMES[key]}: ₹${tot.toLocaleString('en-IN')}`);
  }

  process.exit(0);
}

getOctoberRevenue().catch(err => {
  console.error(err);
  process.exit(1);
});
