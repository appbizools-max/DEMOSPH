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

async function printAllDetails() {
  const aptSnap = await getDocs(collection(db, 'appointments'));
  const kphbOct = [];
  aptSnap.forEach(d => {
    const a = { id: d.id, ...d.data() };
    const b = String(a.branch || a.branchName || '').toLowerCase();
    const dt = String(a.appointmentDate || a.date || '');
    const s = String(a.status || '').toLowerCase().trim();
    const p = String(a.paymentStatus || '').toLowerCase().trim();
    const isPaid = p === 'paid' || s === 'completed' || s === 'done' || (Number(a.totalPaid) > 0);
    if (b.includes('kphb') && dt.includes('2026-10') && isPaid) {
      kphbOct.push(a);
    }
  });

  console.log(`Found ${kphbOct.length} appointments:`);
  let total = 0;
  kphbOct.forEach((a, i) => {
    const paid = Number(a.totalPaid || a.totalAmount || 0);
    total += paid;
    console.log(`${i+1}. ${a.patientName} | Phone: ${a.phone || a.phoneNumber} | Date: ${a.appointmentDate || a.date} | TotalPaid: ${paid} | cFee: ${a.consultationFee} | mFee: ${a.medicineFee}`);
  });
  console.log(`Sum: ${total}`);
}

printAllDetails().then(() => process.exit(0));
