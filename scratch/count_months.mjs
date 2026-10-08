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

async function countMonths() {
  const snap = await getDocs(collection(db, 'alltransactions'));
  const counts = {};
  snap.forEach(d => {
    const data = d.data();
    const raw = data.timestamp || data.date || data.createdAt;
    const ymd = normalizeToYMD(raw);
    const month = ymd ? ymd.slice(0, 7) : 'UNKNOWN';
    counts[month] = (counts[month] || 0) + 1;
  });
  console.log('alltransactions counts by month:', counts);

  const appSnap = await getDocs(collection(db, 'appointments'));
  const appCounts = {};
  appSnap.forEach(d => {
    const data = d.data();
    const raw = data.paymentCollectedAt || data.appointmentDate || data.date || data.createdAt;
    const ymd = normalizeToYMD(raw);
    const month = ymd ? ymd.slice(0, 7) : 'UNKNOWN';
    appCounts[month] = (appCounts[month] || 0) + 1;
  });
  console.log('appointments counts by month:', appCounts);
}

countMonths().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
