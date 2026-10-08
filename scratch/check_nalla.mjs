import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';

const defaultConfig = {
  apiKey: "AIzaSyAohSNLyeS6bYtnk2QvB4HGo0LbHDw9b6Q",
  authDomain: "spiritual-homeopathy-3b552.firebaseapp.com",
  databaseURL: "https://spiritual-homeopathy-3b552-default-rtdb.firebaseio.com",
  projectId: "spiritual-homeopathy-3b552",
  storageBucket: "spiritual-homeopathy-3b552.firebasestorage.app",
  messagingSenderId: "81822616559",
  appId: "1:81822616559:web:98a0b9cd974938cc87841a",
};

const app = initializeApp(defaultConfig);
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

const isNalla = (b) => String(b || '').toLowerCase().includes('nalla');

async function run() {
  console.log('Fetching appointments...');
  const aptSnap = await getDocs(collection(db, 'appointments'));
  console.log('appointments total:', aptSnap.size);

  let nallaCount = 0;
  let nallaTotal = 0;
  const list = [];
  aptSnap.forEach(d => {
    const data = { id: d.id, ...d.data() };
    const b = data.branch || data.targetBranch || data.branchName;
    if (isNalla(b)) {
      const ymd = normalizeToYMD(data.paymentCollectedAt || data.appointmentDate || data.date || data.createdAt);
      if (ymd && ymd.startsWith('2026-10')) {
        nallaCount++;
        const s = String(data.status || '').toLowerCase().trim();
        const p = String(data.paymentStatus || '').toLowerCase().trim();
        const paid = Number(data.totalPaid || data.totalAmount || data.paidAmount || (Number(data.consultationFee || 0) + Number(data.medicineFee || 0)));
        nallaTotal += paid;
        list.push({ id: d.id, status: data.status, paymentStatus: data.paymentStatus, totalPaid: data.totalPaid, cFee: data.consultationFee, mFee: data.medicineFee, paid, date: ymd });
      }
    }
  });

  console.log(`Nallagandla in appointments: count=${nallaCount}, total=₹${nallaTotal}`);
  list.forEach(item => console.log(JSON.stringify(item)));
}

run().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
