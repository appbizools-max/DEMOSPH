import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, limit, query } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyAohSNLyeS6bYtnk2QvB4HGo0LbHDw9b6Q",
  projectId: "spiritual-homeopathy-3b552"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function checkFields() {
  const collections = ['followups', 'prescriptions', 'appointments'];
  for (const c of collections) {
    console.log(`\n=== Collection: ${c} ===`);
    const snap = await getDocs(query(collection(db, c), limit(5)));
    snap.forEach(d => {
      const data = d.data();
      console.log(`Doc ID: ${d.id}`);
      console.log('  branchId:', data.branchId);
      console.log('  branch:', data.branch);
      console.log('  branchName:', data.branchName);
      console.log('  targetBranch:', data.targetBranch);
      console.log('  regId:', data.regId || data.registrationId);
    });
  }
}

checkFields().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
