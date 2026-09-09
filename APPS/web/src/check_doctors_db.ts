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

async function run() {
  console.log("=== CHECKING FIRESTORE DB FOR DOCTORS ===");
  const collectionsToQuery = ['doctors', 'users', 'staff', 'doctorsList', 'doctor_profiles'];

  for (const col of collectionsToQuery) {
    try {
      const snap = await getDocs(collection(db, col));
      console.log(`\nCollection "${col}" - Count: ${snap.docs.length}`);
      snap.docs.forEach((doc) => {
        console.log(`[${col}] ID: ${doc.id} =>`, JSON.stringify(doc.data()));
      });
    } catch (e: any) {
      console.log(`Collection "${col}" error:`, e.message);
    }
  }
  process.exit(0);
}

run();
