import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, orderBy, query, limit, addDoc } from 'firebase/firestore';

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

async function checkAndSend() {
  console.log('--- Fetching latest 10 notifications from Firestore ---');
  try {
    const q = query(collection(db, 'notifications'), orderBy('createdAt', 'desc'), limit(10));
    const snap = await getDocs(q);
    console.log(`Found ${snap.size} notifications:`);
    snap.forEach((doc) => {
      console.log(doc.id, JSON.stringify(doc.data()));
    });
  } catch (err) {
    console.error('Error fetching notifications:', err);
  }
}

checkAndSend();
