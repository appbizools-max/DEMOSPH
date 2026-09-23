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

async function check() {
  console.log('--- Checking doctors collection ---');
  const docSnap = await getDocs(collection(db, 'doctors'));
  console.log(`doctors count: ${docSnap.size}`);
  docSnap.forEach(d => {
    const data = d.data();
    console.log(`  Doc ID: ${d.id}, name: "${data.name || data.doctorName}", phone: "${data.phone || data.mobile}", branch: "${data.branch || data.assignedBranch}"`);
  });

  console.log('--- Checking staff collection ---');
  const staffSnap = await getDocs(collection(db, 'staff'));
  console.log(`staff count: ${staffSnap.size}`);
  staffSnap.forEach(d => {
    const data = d.data();
    console.log(`  Staff ID: ${d.id}, name: "${data.name}", phone: "${data.phone || data.mobile}", branch: "${data.branch || data.branchName}", role: "${data.role}"`);
  });

  console.log('--- Checking users collection ---');
  try {
    const usersSnap = await getDocs(collection(db, 'users'));
    console.log(`users count: ${usersSnap.size}`);
    usersSnap.forEach(d => {
      const data = d.data();
      console.log(`  User ID: ${d.id}, name: "${data.name || data.displayName}", phone: "${data.phone || data.phoneNumber || data.mobile}", role: "${data.role}", branch: "${data.branchId || data.branch}"`);
    });
  } catch (e) {
    console.log('users error:', e.message);
  }

  process.exit(0);
}

check();
