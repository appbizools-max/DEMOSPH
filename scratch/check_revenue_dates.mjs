import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, limit, query } from 'firebase/firestore';

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

async function checkDates() {
  console.log("Current System Date:", new Date().toISOString());

  // 1. check alltransactions
  try {
    const snap = await getDocs(query(collection(db, 'alltransactions'), limit(15)));
    console.log(`\n=== alltransactions (Sample ${snap.size} docs) ===`);
    snap.docs.forEach(d => {
      const data = d.data();
      console.log(`ID: ${d.id} | amount: ${data.amount || data.totalAmount || data.paidAmount} | timestamp: ${data.timestamp} | date: ${data.date} | createdAt: ${data.createdAt} | branch: ${data.branchName || data.branchId || data.branch}`);
    });
  } catch (e) {
    console.error('Error fetching alltransactions:', e.message);
  }

  // 2. check appointments
  try {
    const snap = await getDocs(query(collection(db, 'appointments'), limit(15)));
    console.log(`\n=== appointments (Sample ${snap.size} docs) ===`);
    snap.docs.forEach(d => {
      const data = d.data();
      console.log(`ID: ${d.id} | paid: ${data.paidAmount || data.totalPaid || data.amount} | date: ${data.appointmentDate || data.date} | createdAt: ${data.createdAt} | branch: ${data.branch || data.targetBranch}`);
    });
  } catch (e) {
    console.error('Error fetching appointments:', e.message);
  }

  // 3. check allpatients
  try {
    const snap = await getDocs(query(collection(db, 'allpatients'), limit(15)));
    console.log(`\n=== allpatients (Sample ${snap.size} docs) ===`);
    snap.docs.forEach(d => {
      const data = d.data();
      console.log(`ID: ${d.id} | paid: ${data.paidAmount || data.totalPaid || data.amountPaid} | date: ${data.paymentCollectedAt || data.appointmentDate || data.date || data.createdAt} | branch: ${data.branch || data.branchName}`);
    });
  } catch (e) {
    console.error('Error fetching allpatients:', e.message);
  }
}

checkDates().then(() => process.exit(0)).catch(err => { console.error(err); process.exit(1); });
