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

async function check500() {
  const aptSnap = await getDocs(collection(db, 'appointments'));
  aptSnap.forEach(d => {
    const a = d.data();
    const b = String(a.branch || a.branchName || '').toLowerCase();
    const dt = String(a.appointmentDate || a.date || '');
    if (b.includes('kphb') && dt.includes('2026-10')) {
      const tot = Number(a.totalPaid || a.totalAmount || 0);
      const c = Number(a.consultationFee || 0);
      const m = Number(a.medicineFee || 0);
      const disc = Number(a.discount || 0);
      if (c + m - disc !== tot || disc > 0) {
        console.log(`Mismatch or discount: ${a.patientName} | totalPaid: ${tot} | cFee: ${c} | mFee: ${m} | disc: ${disc} | id: ${d.id}`);
      }
    }
  });
}

check500().then(() => process.exit(0));
