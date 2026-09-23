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

async function inspectSample() {
  const allPatSnap = await getDocs(collection(db, 'allpatients'));
  let matched = 0;
  for (const d of allPatSnap.docs) {
    const data = d.data();
    const docField = String(data.doctorName || data.doctor || '');
    if (docField.toLowerCase().includes('reception')) {
      matched++;
      console.log(`\n=== SAMPLE ${matched} ===`);
      console.log('ID:', d.id);
      console.log('Full document data:');
      console.log(JSON.stringify(data, null, 2));
      if (matched >= 3) break;
    }
  }
}

inspectSample().then(() => process.exit(0)).catch(err => { console.error(err); process.exit(1); });
