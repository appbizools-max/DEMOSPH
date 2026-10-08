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

async function checkNallaTxns() {
  const snap = await getDocs(collection(db, 'alltransactions'));
  let count = 0;
  let total = 0;
  const items = [];
  snap.forEach(d => {
    const data = d.data();
    const b = String(data.branch || data.branchName || data.branchId || '').toLowerCase();
    if (!b.includes('nalla')) return;
    const ymd = normalizeToYMD(data.timestamp || data.date || data.createdAt);
    if (!ymd || !ymd.startsWith('2026-10')) return;
    const amt = Number(data.amount || data.totalAmount || data.paidAmount || data.totalPaid || 0);
    count++;
    total += amt;
    items.push({ id: d.id, amt, ymd, mode: data.paymentMode, patient: data.patientName });
  });
  console.log(`alltransactions for Nallagandla in Oct 2026: count=${count}, total=₹${total}`);
  console.log(items);
}

checkNallaTxns().then(() => process.exit(0));
