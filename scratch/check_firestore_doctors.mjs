import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';

const app = initializeApp({
  apiKey: 'AIzaSyAohSNLyeS6bYtnk2QvB4HGo0LbHDw9b6Q',
  authDomain: 'spiritual-homeopathy-3b552.firebaseapp.com',
  projectId: 'spiritual-homeopathy-3b552'
});
const db = getFirestore(app);

async function check() {
  const snap = await getDocs(collection(db, 'doctors'));
  console.log('Doctors in Firestore:');
  snap.docs.forEach(d => {
    const data = d.data();
    console.log(d.id, data.name, 'phone:', data.phone || data.mobile, 'branch:', data.branch || data.branchId);
  });
  process.exit(0);
}

check();
