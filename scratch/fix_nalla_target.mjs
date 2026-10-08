import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc, getDoc } from 'firebase/firestore';

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

async function fixNallagandlaTarget() {
  const docRef = doc(db, 'branchTargets', 'nallagandla');
  const snap = await getDoc(docRef);
  const current = snap.data() || {};
  console.log('Current nallagandla target:', current);

  const monthlyTarget = Number(current.monthlyTarget) > 0 ? Number(current.monthlyTarget) : 1000000;
  const targetReached = 75100; // Matches Admin Revenue Analytics for Oct 2026
  const remaining = Math.max(0, monthlyTarget - targetReached);
  const percentage = Math.round((targetReached / monthlyTarget) * 100);

  const payload = {
    id: 'nallagandla',
    branchId: 'nallagandla',
    branchName: 'Nallagandla Branch',
    month: '2026-10',
    monthlyTarget,
    targetReached,
    remaining,
    percentage,
    updatedAt: new Date().toISOString()
  };

  await setDoc(docRef, payload, { merge: true });
  console.log('Updated nallagandla target successfully:', payload);
}

fixNallagandlaTarget().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
