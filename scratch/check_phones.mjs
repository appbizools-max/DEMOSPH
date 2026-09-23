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

async function check() {
  const followupsSnap = await getDocs(collection(db, 'followups'));
  const fMap = new Set();
  followupsSnap.forEach(d => {
    const dat = d.data();
    const p = String(dat.phone || dat.phoneNumber || '').replace(/\D/g, '').slice(-10);
    if (p) fMap.add(p);
  });

  console.log(`followups unique phones: ${fMap.size}`);
  process.exit(0);
}

check();
