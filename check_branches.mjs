import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY || process.env.EXPO_PUBLIC_FIREBASE_API_KEY || "YOUR_FIREBASE_API_KEY",
  authDomain: "spiritual-homeopathy-3b552.firebaseapp.com",
  databaseURL: "https://spiritual-homeopathy-3b552-default-rtdb.firebaseio.com",
  projectId: "spiritual-homeopathy-3b552",
  storageBucket: "spiritual-homeopathy-3b552.firebasestorage.app",
  messagingSenderId: "81822616559",
  appId: "1:81822616559:web:98a0b9cd974938cc87841a"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function checkStaffBranchConnections() {
  console.log('--- Checking "users" Collection ---');
  try {
    const usersSnapshot = await getDocs(collection(db, 'users'));
    if (!usersSnapshot.empty) {
      console.log(`Found ${usersSnapshot.size} user records:`);
      usersSnapshot.forEach(doc => {
        const d = doc.data();
        console.log(`UID: ${doc.id} | Email/Phone: ${d.email || d.phone || d.mobile} | Role: ${d.role} | Branch: ${d.branchId || d.branchName || d.branch}`);
      });
    } else {
      console.log('No records in "users".');
    }
  } catch (err) {
    console.log('Error in users:', err.message);
  }

  console.log('\n--- Checking "staff" Collection ---');
  try {
    const staffSnapshot = await getDocs(collection(db, 'staff'));
    if (!staffSnapshot.empty) {
      console.log(`Found ${staffSnapshot.size} staff records:`);
      staffSnapshot.forEach(doc => {
        const d = doc.data();
        console.log(`ID: ${doc.id} | Name: ${d.name} | Phone: ${d.phone} | Branch: ${d.branchId || d.branchName || d.branch}`);
      });
    } else {
      console.log('No records in "staff".');
    }
  } catch (err) {
    console.log('Error in staff:', err.message);
  }
}

checkStaffBranchConnections().then(() => process.exit(0)).catch(err => {
  console.error(err);
  process.exit(1);
});
