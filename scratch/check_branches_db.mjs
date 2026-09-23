import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyAohSNLyeS6bYtnk2QvB4HGo0LbHDw9b6Q",
  projectId: "spiritual-homeopathy-3b552"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function main() {
  console.log('--- branches collection ---');
  try {
    const snap = await getDocs(collection(db, 'branches'));
    console.log(`Count in branches: ${snap.size}`);
    snap.forEach(d => console.log('branch doc ID:', d.id, d.data()));
  } catch (e) {
    console.log('Error branches:', e.message);
  }

  console.log('\n--- users collection ---');
  try {
    const uSnap = await getDocs(collection(db, 'users'));
    uSnap.forEach(d => {
      const data = d.data();
      if (data.branchId || data.branch || data.branchName) {
        console.log(`user doc ID: ${d.id} | email: ${data.email} | branchId: ${data.branchId} | branch: ${data.branch || data.branchName}`);
      }
    });
  } catch (e) {
    console.log('Error users:', e.message);
  }
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
