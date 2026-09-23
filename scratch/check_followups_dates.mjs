import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, limit, query, where } from 'firebase/firestore';

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

async function check() {
  const followupsSnap = await getDocs(collection(db, 'followups'));
  console.log('Total followups docs:', followupsSnap.size);

  // Check how many followups are for 2026 or active
  let count2026 = 0;
  let countKphb = 0;
  followupsSnap.forEach(d => {
    const dat = d.data();
    const date = String(dat.followUpDate || dat.preferredFollowUpDate || '');
    if (date.includes('2026')) count2026++;
    const b = String(dat.branchId || dat.branchName || dat.branch || '').toLowerCase();
    if (b.includes('kphb') || b.includes('kpb')) countKphb++;
  });
  console.log(`Followups with 2026 date: ${count2026}, KPHB branch: ${countKphb}`);
  process.exit(0);
}

check();
