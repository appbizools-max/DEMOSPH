import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, query, limit, where } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyAohSNLyeS6bYtnk2QvB4HGo0LbHDw9b6Q",
  authDomain: "spiritual-homeopathy-3b552.firebaseapp.com",
  projectId: "spiritual-homeopathy-3b552"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function inspectPatients() {
  console.log('Inspecting patients collection...');
  const snap = await getDocs(query(collection(db, 'patients'), limit(10)));
  snap.forEach(d => {
    console.log('ID:', d.id, JSON.stringify(d.data()));
  });

  // Check branch field values across 100 samples
  const branchCounts = {};
  const snap100 = await getDocs(query(collection(db, 'patients'), limit(100)));
  snap100.forEach(d => {
    const data = d.data();
    const b = data.branch || data.branchName || data.branchId || 'UNKNOWN';
    branchCounts[b] = (branchCounts[b] || 0) + 1;
  });
  console.log('Branch sample distribution (100 docs):', branchCounts);
}

inspectPatients().catch(console.error);
