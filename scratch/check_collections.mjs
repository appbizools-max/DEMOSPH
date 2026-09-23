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

async function check() {
  console.log('Measuring collection counts and download times...');
  const collections = ['followups', 'prescriptions', 'appointments', 'allpatients'];
  
  for (const col of collections) {
    const t0 = Date.now();
    try {
      const snap = await getDocs(collection(db, col));
      const dur = Date.now() - t0;
      console.log(`[${col}] Count: ${snap.size} docs | Time: ${dur}ms`);
      if (snap.size > 0) {
        const sample = snap.docs[0].data();
        console.log(`  Sample fields for ${col}:`, Object.keys(sample).slice(0, 8).join(', '));
        // Check branch distribution
        const branchCounts = {};
        snap.docs.forEach(d => {
          const dat = d.data();
          const b = String(dat.branchId || dat.branch || dat.branchName || 'NONE');
          branchCounts[b] = (branchCounts[b] || 0) + 1;
        });
        console.log(`  Branch distribution (top 5):`, Object.entries(branchCounts).slice(0, 5));
      }
    } catch (e) {
      console.error(`Error on ${col}:`, e.message);
    }
  }
  process.exit(0);
}

check();
