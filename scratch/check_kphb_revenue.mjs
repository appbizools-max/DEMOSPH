import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, getDoc } from 'firebase/firestore';

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

const normalizeBranchKey = (raw = '') => {
  const s = String(raw || '').toLowerCase().trim();
  if (s.includes('kphb') || s.includes('kukatpally')) return 'kphb';
  if (s.includes('nalla') || s.includes('nallagandla')) return 'nallagandla';
  if (s.includes('dilshuk') || s.includes('dilsukh') || s.includes('dsnr') || s.includes('dshnr')) return 'dilshuknagar';
  if (s.includes('chanda') || s.includes('chnr') || s.includes('chandanagar')) return 'chandanagar';
  return 'kphb';
};

const normalizeToYMD = (raw) => {
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

async function checkKphbRevenue() {
  const now = new Date();
  const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  console.log(`Checking revenue for current month: ${currentMonthStr} (Calendar Date: ${now.toISOString()})`);

  // 1. Check branchTargets collection in Firestore
  console.log('\n--- Checking branchTargets collection ---');
  const targetDocSnap = await getDoc(doc(db, 'branchTargets', 'kphb'));
  if (targetDocSnap.exists()) {
    console.log('branchTargets/kphb doc:', JSON.stringify(targetDocSnap.data(), null, 2));
  } else {
    console.log('branchTargets/kphb doc does not exist.');
  }

  // 2. Fetch appointments
  console.log('\n--- Fetching appointments collection ---');
  const appSnap = await getDocs(collection(db, 'appointments'));
  console.log(`Total appointments in DB: ${appSnap.size}`);

  const seenPaymentIds = new Set();
  let kphbCurrentMonthAppRevenue = 0;
  const kphbCurrentMonthItems = [];

  const allMonthsRevenue = {};

  appSnap.forEach(docSnap => {
    const app = { id: docSnap.id, ...docSnap.data() };
    const appBranch = app.branch || app.targetBranch || app.branchName;
    if (normalizeBranchKey(appBranch) !== 'kphb') return;

    const s = String(app.status || '').toLowerCase().trim();
    const p = String(app.paymentStatus || '').toLowerCase().trim();
    const isPaid = p === 'paid' || s === 'completed' || s === 'done' || s === 'paid' || (Number(app.totalPaid) > 0);
    if (!isPaid) return;

    const rawDate = app.paymentCollectedAt || app.appointmentDate || app.date || app.createdAt || app.updatedAt;
    const ymd = normalizeToYMD(rawDate);
    if (!ymd) return;

    const monthKey = ymd.substring(0, 7);
    
    let paidAmt = 0;
    if (app.totalPaid !== undefined && app.totalPaid !== null && Number(app.totalPaid) > 0) {
      paidAmt = Number(app.totalPaid);
    } else if (app.totalAmount !== undefined && app.totalAmount !== null && Number(app.totalAmount) > 0) {
      paidAmt = Number(app.totalAmount);
    } else {
      const cFee = Number(app.consultationFee) || 0;
      const mFee = Number(app.medicineFee || app.pharmacyFee || app.medicineFeeRequested) || 0;
      const dFee = Number(app.dietFee || app.dietFeeAmount || app.dietPlan?.dietFeeAmount || app.dietPlan?.dietFee) || 0;
      const oFee = Number(app.otherCharges) || 0;
      const pFee = Number(app.packageFee || app.packageAdvancePaid) || 0;
      const disc = Number(app.discount) || 0;
      paidAmt = Math.max(0, cFee + mFee + dFee + oFee + pFee - disc);
    }

    allMonthsRevenue[monthKey] = (allMonthsRevenue[monthKey] || 0) + paidAmt;

    if (monthKey === currentMonthStr) {
      if (!seenPaymentIds.has(app.id)) {
        seenPaymentIds.add(app.id);
        kphbCurrentMonthAppRevenue += paidAmt;
        kphbCurrentMonthItems.push({
          id: app.id,
          patientName: app.patientName,
          date: ymd,
          paidAmt,
          status: app.status,
          paymentStatus: app.paymentStatus,
          totalPaid: app.totalPaid,
          consultationFee: app.consultationFee,
          medicineFee: app.medicineFee
        });
      }
    }
  });

  // 3. Check packageMembers collection
  console.log('\n--- Fetching packageMembers collection ---');
  let kphbCurrentMonthPkgRevenue = 0;
  try {
    const pkgSnap = await getDocs(collection(db, 'packageMembers'));
    console.log(`Total packageMembers in DB: ${pkgSnap.size}`);
    pkgSnap.forEach(docSnap => {
      const pkg = { id: docSnap.id, ...docSnap.data() };
      const pkgBranch = pkg.branch || pkg.targetBranch || pkg.branchName;
      if (normalizeBranchKey(pkgBranch) !== 'kphb') return;

      const rawDate = pkg.createdAt || pkg.startDate || pkg.updatedAt;
      const ymd = normalizeToYMD(rawDate);
      if (!ymd) return;

      const monthKey = ymd.substring(0, 7);
      const pkgPaid = Number(pkg.paidAmount || pkg.advancePaid || pkg.totalAmount) || 0;
      allMonthsRevenue[`${monthKey}_pkg`] = (allMonthsRevenue[`${monthKey}_pkg`] || 0) + pkgPaid;

      if (monthKey === currentMonthStr) {
        if (!seenPaymentIds.has(pkg.id) && !(pkg.patientDocId && seenPaymentIds.has(pkg.patientDocId))) {
          seenPaymentIds.add(pkg.id);
          kphbCurrentMonthPkgRevenue += pkgPaid;
          kphbCurrentMonthItems.push({
            id: pkg.id,
            patientName: pkg.patientName || pkg.name,
            date: ymd,
            paidAmt: pkgPaid,
            type: 'packageMember'
          });
        }
      }
    });
  } catch (e) {
    console.log('Error checking packageMembers:', e.message);
  }

  console.log('\n--- Summary for KPHB ---');
  console.log(`Current Month (${currentMonthStr}):`);
  console.log(`  Appointments Revenue: ₹${kphbCurrentMonthAppRevenue.toLocaleString('en-IN')}`);
  console.log(`  Package Members Revenue: ₹${kphbCurrentMonthPkgRevenue.toLocaleString('en-IN')}`);
  console.log(`  TOTAL Current Month Revenue: ₹${(kphbCurrentMonthAppRevenue + kphbCurrentMonthPkgRevenue).toLocaleString('en-IN')}`);
  console.log(`  Total Items Counted: ${kphbCurrentMonthItems.length}`);
  if (kphbCurrentMonthItems.length > 0) {
    console.log('  Items details:', JSON.stringify(kphbCurrentMonthItems.slice(0, 10), null, 2));
  }

  console.log('\n--- All Months KPHB Breakdown ---');
  console.log(JSON.stringify(allMonthsRevenue, null, 2));
}

checkKphbRevenue().then(() => process.exit(0)).catch(err => {
  console.error(err);
  process.exit(1);
});
