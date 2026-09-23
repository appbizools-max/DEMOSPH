import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyAohSNLyeS6bYtnk2QvB4HGo0LbHDw9b6Q",
  authDomain: "spiritual-homeopathy-3b552.firebaseapp.com",
  projectId: "spiritual-homeopathy-3b552",
  storageBucket: "spiritual-homeopathy-3b552.firebasestorage.app",
  messagingSenderId: "81822616559",
  appId: "1:81822616559:web:98a0b9cd974938cc87841a"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function main() {
  console.log('Fetching staff...');
  const staffSnap = await getDocs(collection(db, 'staff'));
  console.log('Staff count:', staffSnap.size);
  staffSnap.forEach(d => console.log('Staff:', d.id, d.data().name, d.data().mobile || d.data().phone, d.data().role || d.data().category, d.data().branch));

  console.log('Fetching doctors...');
  const docSnap = await getDocs(collection(db, 'doctors'));
  console.log('Doctors count:', docSnap.size);
  docSnap.forEach(d => console.log('Doctor:', d.id, d.data().name, d.data().mobile || d.data().phone, d.data().branch));
  process.exit(0);
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
