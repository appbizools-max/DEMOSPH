import { initializeApp } from 'firebase/app';
import { getFirestore, collection, query, limit, getDocs } from 'firebase/firestore';

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
  return '';
};

async function test() {
  const q = query(collection(db, 'appointments'), limit(150));
  const snap = await getDocs(q);
  let total = 0;
  snap.forEach(d => {
    const data = d.data();
    const branch = String(data.branch || data.targetBranch || data.branchName || '').toLowerCase();
    if (!branch.includes('nalla')) return;
    const s = String(data.status || '').toLowerCase().trim();
    const p = String(data.paymentStatus || '').toLowerCase().trim();
    const isPaid = p === 'paid' || s === 'completed' || s === 'done' || s === 'paid' || (Number(data.totalPaid) > 0);
    if (!isPaid) return;
    const rawDate = data.paymentCollectedAt || data.appointmentDate || data.date || data.createdAt || data.updatedAt;
    const ymd = normalizeToYMD(rawDate);
    if (!ymd || !ymd.startsWith('2026-10')) return;
    const paidAmt = Number(data.totalPaid || data.totalAmount || (Number(data.consultationFee || 0) + Number(data.medicineFee || 0)));
    total += paidAmt;
    console.log(`Matched appt ${d.id}: amount=${paidAmt}, date=${ymd}`);
  });
  console.log(`Total for Nallagandla in limit(150): ${total}`);
}

test().then(() => process.exit(0));
