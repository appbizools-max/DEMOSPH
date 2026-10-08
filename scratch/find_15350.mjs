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

async function findSubset() {
  const appSnap = await getDocs(collection(db, 'appointments'));
  const allKphbOct = [];
  appSnap.forEach(d => {
    const data = d.data();
    const branch = String(data.branch || data.branchName || '').toLowerCase();
    if (!branch.includes('kphb')) return;
    const date = String(data.appointmentDate || data.date || data.createdAt || '');
    if (!date.includes('2026-10') && !date.includes('10-2026')) return;
    allKphbOct.push({ id: d.id, ...data });
  });

  console.log(`Total KPHB Oct appointments: ${allKphbOct.length}`);
  
  // check subsets by status, paymentStatus, etc.
  const byStatus = {};
  allKphbOct.forEach(a => {
    const s = `${a.status || 'no_status'}|${a.paymentStatus || 'no_pay_status'}`;
    const amt = Number(a.totalPaid || a.totalAmount || 0);
    byStatus[s] = (byStatus[s] || 0) + amt;
  });
  console.log('Grouped by status|paymentStatus:', byStatus);
}

findSubset().then(() => process.exit(0));
