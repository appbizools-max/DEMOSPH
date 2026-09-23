import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, getCountFromServer, limit, query } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyAohSNLyeS6bYtnk2QvB4HGo0LbHDw9b6Q",
  authDomain: "spiritual-homeopathy-3b552.firebaseapp.com",
  projectId: "spiritual-homeopathy-3b552"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function main() {
  console.log('=== CHECKING COLLECTIONS ===');
  for (const name of ['allpatients', 'patients', 'appointments', 'prescriptions']) {
    try {
      const countSnap = await getCountFromServer(collection(db, name));
      console.log(`\nCollection: "${name}" => Total count: ${countSnap.data().count}`);
      const sample = await getDocs(query(collection(db, name), limit(3)));
      sample.forEach(d => {
        const data = d.data();
        console.log(`  [${name}] ID: ${d.id}`);
        console.log(`     name: ${data.name || data.patientName || data.fullName}`);
        console.log(`     phone: ${data.phone || data.mobile || data.contactNumber}`);
        console.log(`     branch: ${data.branch || data.branchName || data.branchId}`);
        console.log(`     regNo/id: ${data.regNo || data.registrationId || data.patientId || data.customId}`);
        console.log(`     visitType: ${data.visitType || data.type || data.patientType}`);
      });
    } catch (e) {
      console.error(`Error checking ${name}:`, e.message);
    }
  }
}

main().catch(console.error);
