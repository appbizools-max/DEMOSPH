import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc } from 'firebase/firestore';

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

async function sendTestApprove() {
  const notiDoc = {
    type: 'cleaning_approved',
    title: 'Nallagandla Cleaning Approved ✅',
    body: 'Clinic cleaning approved by HR Manager for Nallagandla Branch. Reception is unlocked.',
    branch: 'Nallagandla Branch',
    targetBranch: 'nallagandla',
    status: 'approved',
    reviewedBy: 'HR Manager',
    targetRoles: ['reception', 'hr', 'admin'],
    createdAt: new Date().toISOString(),
  };

  const ref = await addDoc(collection(db, 'notifications'), notiDoc);
  console.log('Test approved notification created with ID:', ref.id);
}

sendTestApprove();
