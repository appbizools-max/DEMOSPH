import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, limit, query } from 'firebase/firestore';

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

async function inspectRegIds() {
  const collections = ['allpatients', 'patients', 'appointments', 'prescriptions', 'followups', 'counters'];
  
  for (const col of collections) {
    console.log(`\n=== COLLECTION: ${col} ===`);
    try {
      const q = query(collection(db, col), limit(15));
      const snap = await getDocs(q);
      console.log(`Total sample fetched: ${snap.size}`);
      
      const foundRegIds = new Set();
      const fieldKeysUsed = new Set();
      
      snap.forEach(docSnap => {
        const d = docSnap.data();
        // check fields related to reg/patient ID
        ['regId', 'regID', 'registrationId', 'registration_id', 'patientId', 'patient_id', 'uhid', 'UHID', 'id'].forEach(k => {
          if (d[k]) {
            fieldKeysUsed.add(k);
            foundRegIds.add(`${k}: "${d[k]}" (doc: ${docSnap.id})`);
          }
        });
      });
      
      console.log('Fields used:', Array.from(fieldKeysUsed).join(', '));
      console.log('Sample IDs found:');
      Array.from(foundRegIds).slice(0, 10).forEach(id => console.log('  -', id));
    } catch (err) {
      console.log(`Error reading ${col}:`, err.message);
    }
  }
}

inspectRegIds().then(() => process.exit(0)).catch(e => {
  console.error(e);
  process.exit(1);
});
