import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, query, where, getCountFromServer } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyAohSNLyeS6bYtnk2QvB4HGo0LbHDw9b6Q",
  authDomain: "spiritual-homeopathy-3b552.firebaseapp.com",
  projectId: "spiritual-homeopathy-3b552"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function countByBranch() {
  const branches = [
    { name: 'KPHB', queries: ['Kphb', 'KPHB', 'KPHB Branch'] },
    { name: 'Chandanagar', queries: ['Chandanagar', 'Chandanagar Branch', 'Chnr', 'CHNR'] },
    { name: 'Nallagandla', queries: ['Nallagandla', 'Nallagandla Branch', 'Nalla', 'NLG'] },
    { name: 'Dilshuknagar', queries: ['Dilshuknagar', 'Dilshuknagar Branch', 'DSNR', 'Dshnr'] }
  ];

  for (const b of branches) {
    let totalPatients = 0;
    for (const q of b.queries) {
      try {
        const snap = await getCountFromServer(query(collection(db, 'patients'), where('branch', '==', q)));
        totalPatients += snap.data().count;
      } catch (e) {}
      try {
        const snap2 = await getCountFromServer(query(collection(db, 'patients'), where('branchName', '==', q)));
        totalPatients += snap2.data().count;
      } catch (e) {}
    }
    console.log(`Branch ${b.name}: ~${totalPatients} in patients`);
  }
}

countByBranch().catch(console.error);
