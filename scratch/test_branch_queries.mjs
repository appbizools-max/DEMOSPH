import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, query, where, limit } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyAohSNLyeS6bYtnk2QvB4HGo0LbHDw9b6Q",
  authDomain: "spiritual-homeopathy-3b552.firebaseapp.com",
  projectId: "spiritual-homeopathy-3b552"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function testBranchQueries() {
  console.log('Testing branch queries on patients collection...');
  
  // Test with 'in' queries on branch and branchName
  const branchQueries = ['Kphb', 'KPHB', 'KPHB Branch'];
  
  const q1 = query(collection(db, 'patients'), where('branchName', 'in', branchQueries), limit(5));
  const snap1 = await getDocs(q1);
  console.log('branchName in query matched:', snap1.size);
  snap1.forEach(d => console.log('  doc:', d.id, d.data().fullName || d.data().name, d.data().branchName));

  const q2 = query(collection(db, 'patients'), where('branch', 'in', branchQueries), limit(5));
  const snap2 = await getDocs(q2);
  console.log('branch in query matched:', snap2.size);
  snap2.forEach(d => console.log('  doc:', d.id, d.data().fullName || d.data().name, d.data().branch));
}

testBranchQueries().catch(console.error);
