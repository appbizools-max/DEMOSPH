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

const normalizeBranchKey = (raw = '') => {
  const s = String(raw || '').toLowerCase().trim();
  if (s.includes('kphb') || s.includes('kukatpally')) return 'kphb';
  return 'other';
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

async function checkDaily() {
  const appSnap = await getDocs(collection(db, 'appointments'));
  const dailyTotals = {};

  appSnap.forEach(docSnap => {
    const app = { id: docSnap.id, ...docSnap.data() };
    if (normalizeBranchKey(app.branch || app.branchName) !== 'kphb') return;
    const s = String(app.status || '').toLowerCase().trim();
    const p = String(app.paymentStatus || '').toLowerCase().trim();
    const isPaid = p === 'paid' || s === 'completed' || s === 'done' || s === 'paid' || (Number(app.totalPaid) > 0);
    if (!isPaid) return;

    const rawDate = app.paymentCollectedAt || app.appointmentDate || app.date || app.createdAt || app.updatedAt;
    const ymd = normalizeToYMD(rawDate);
    if (!ymd || !ymd.startsWith('2026-10')) return;

    const paidAmt = Number(app.totalPaid || app.totalAmount || (Number(app.consultationFee || 0) + Number(app.medicineFee || 0)));
    dailyTotals[ymd] = (dailyTotals[ymd] || 0) + paidAmt;
  });

  console.log('Daily breakdown for KPHB in October 2026:');
  console.log(dailyTotals);
}

checkDaily().then(() => process.exit(0));
