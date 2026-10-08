import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';

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

async function inspectFcmTokens() {
  const snap = await getDocs(collection(db, 'fcm_tokens'));
  console.log(`fcm_tokens count: ${snap.size}`);
  snap.forEach(d => {
    console.log(`Doc ID: ${d.id} =>`, JSON.stringify(d.data(), null, 2));
  });
}

inspectFcmTokens().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
