import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, updateDoc } from 'firebase/firestore';

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

function generateEmailFromName(name) {
  if (!name) return 'staff@sph.com';
  const clean = name.toLowerCase().replace(/[^a-z0-9]/g, ' ').trim().split(/\s+/)[0];
  return `${clean || 'staff'}@sph.com`;
}

async function updateStaffCredentials() {
  console.log('--- Migrating existing staff in Firestore with Email & standard password "email123" ---');
  const snap = await getDocs(collection(db, 'staff'));
  const usedEmails = new Set();

  for (const docSnap of snap.docs) {
    const data = docSnap.data();
    let baseEmail = generateEmailFromName(data.name);
    let finalEmail = baseEmail;
    let count = 1;
    while (usedEmails.has(finalEmail)) {
      count++;
      const prefix = baseEmail.split('@')[0];
      finalEmail = `${prefix}${count}@sph.com`;
    }
    usedEmails.add(finalEmail);

    const updatePayload = {
      email: data.email || finalEmail,
      password: data.password || 'email123',
    };

    await updateDoc(doc(db, 'staff', docSnap.id), updatePayload);
    console.log(`Updated Staff "${data.name}" (${data.branch}): Email: ${updatePayload.email}, Password: ${updatePayload.password}`);
  }
  console.log('--- Migration completed successfully! ---');
}

updateStaffCredentials();
