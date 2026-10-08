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

async function findExactDifference() {
  const aptSnap = await getDocs(collection(db, 'appointments'));
  const kphbOct = [];
  aptSnap.forEach(d => {
    const data = { id: d.id, ...d.data() };
    const b = String(data.branch || data.branchName || '').toLowerCase();
    const dt = String(data.paymentCollectedAt || data.appointmentDate || data.date || data.createdAt || '');
    const s = String(data.status || '').toLowerCase().trim();
    const p = String(data.paymentStatus || '').toLowerCase().trim();
    const isPaid = p === 'paid' || s === 'completed' || s === 'done' || (Number(data.totalPaid) > 0);
    if ((b.includes('kphb') || b.includes('kukatpally')) && (dt.includes('2026-10') || dt.includes('10-2026')) && isPaid) {
      kphbOct.push(data);
    }
  });

  console.log(`Total KPHB Oct paid appointments: ${kphbOct.length}`);
  
  // Check phone + date duplicates
  const seenPhoneDates = new Map();
  const duplicatesByPhoneDate = [];

  for (const a of kphbOct) {
    const phone = String(a.phone || a.phoneNumber || a.mobile || '').replace(/\D/g, '').slice(-10);
    const date = String(a.appointmentDate || a.date || '').slice(0, 10);
    const key = `${phone}_${date}`;
    if (phone && seenPhoneDates.has(key)) {
      duplicatesByPhoneDate.push({
        current: { name: a.patientName, phone, date, paid: a.totalPaid, id: a.id },
        first: seenPhoneDates.get(key)
      });
    } else if (phone) {
      seenPhoneDates.set(key, { name: a.patientName, phone, date, paid: a.totalPaid, id: a.id });
    }
  }

  console.log('Duplicates by Phone + Date:', JSON.stringify(duplicatesByPhoneDate, null, 2));

  // Check items with paid = 0
  const zeroPaid = kphbOct.filter(a => Number(a.totalPaid || 0) === 0);
  console.log('Zero paid count:', zeroPaid.length);
  zeroPaid.forEach(z => console.log(`Zero paid: ${z.patientName} (${z.id})`));

  // All amounts list
  const amounts = kphbOct.map(a => ({
    name: a.patientName,
    date: a.appointmentDate || a.date,
    consultationFee: a.consultationFee,
    medicineFee: a.medicineFee,
    totalPaid: a.totalPaid,
    totalAmount: a.totalAmount
  }));
  console.log('Sample amounts:', JSON.stringify(amounts.slice(0, 15), null, 2));
}

findExactDifference().then(() => process.exit(0));
