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

async function inspectDifferences() {
  const allTxnSnap = await getDocs(collection(db, 'alltransactions'));
  console.log(`Total in alltransactions: ${allTxnSnap.size}`);

  const kphbOctTxns = [];
  allTxnSnap.forEach(d => {
    const data = { id: d.id, ...d.data() };
    const b = String(data.branchName || data.branchId || data.branch || '').toLowerCase();
    const dt = String(data.timestamp || data.date || data.createdAt || '');
    if ((b.includes('kphb') || b.includes('kukatpally')) && (dt.includes('2026-10') || dt.includes('10-2026'))) {
      kphbOctTxns.push(data);
    }
  });
  console.log(`KPHB Oct in alltransactions: ${kphbOctTxns.length}`);
  let sumTxn = 0;
  kphbOctTxns.forEach(t => {
    const amt = Number(t.totalAmount || t.amount || t.totalPaid || 0);
    sumTxn += amt;
  });
  console.log(`Sum of KPHB Oct alltransactions: ₹${sumTxn}`);

  // Now inspect appointments
  const appSnap = await getDocs(collection(db, 'appointments'));
  const kphbOctApps = [];
  appSnap.forEach(d => {
    const data = { id: d.id, ...d.data() };
    const b = String(data.branch || data.branchName || '').toLowerCase();
    const dt = String(data.paymentCollectedAt || data.appointmentDate || data.date || data.createdAt || '');
    const s = String(data.status || '').toLowerCase().trim();
    const p = String(data.paymentStatus || '').toLowerCase().trim();
    const isPaid = p === 'paid' || s === 'completed' || s === 'done' || (Number(data.totalPaid) > 0);
    if ((b.includes('kphb') || b.includes('kukatpally')) && (dt.includes('2026-10') || dt.includes('10-2026')) && isPaid) {
      kphbOctApps.push(data);
    }
  });

  console.log(`KPHB Oct paid appointments: ${kphbOctApps.length}`);

  // Find which appointments are in appointments but NOT in alltransactions
  const txnAppIds = new Set(kphbOctTxns.map(t => String(t.appointmentId || t.id || '')));
  const missingInTxns = kphbOctApps.filter(a => !txnAppIds.has(a.id));
  console.log(`Appointments missing from alltransactions: ${missingInTxns.length}`);
  missingInTxns.forEach(m => {
    const amt = Number(m.totalPaid || m.totalAmount || 0);
    console.log(`- Patient: ${m.patientName} | Date: ${m.appointmentDate || m.date} | TotalPaid: ₹${amt} | Status: ${m.status} | PayStatus: ${m.paymentStatus} | ID: ${m.id}`);
  });
}

inspectDifferences().then(() => process.exit(0));
