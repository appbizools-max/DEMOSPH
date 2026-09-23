import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, query, where, limit } from 'firebase/firestore';

const app = initializeApp({
  apiKey: 'AIzaSyAohSNLyeS6bYtnk2QvB4HGo0LbHDw9b6Q',
  authDomain: 'spiritual-homeopathy-3b552.firebaseapp.com',
  projectId: 'spiritual-homeopathy-3b552'
});
const db = getFirestore(app);

async function testPhone(phone) {
  console.log(`\n--- Testing Phone: ${phone} ---`);
  const [snapPatients, snapAll, snapAppts] = await Promise.all([
    getDocs(query(collection(db, 'patients'), where('phone', '==', phone), limit(5))),
    getDocs(query(collection(db, 'allpatients'), where('phone', '==', phone), limit(5))),
    getDocs(query(collection(db, 'appointments'), where('phone', '==', phone), limit(5)))
  ]);

  console.log('Found in patients:', snapPatients.size);
  snapPatients.forEach(d => {
    const data = d.data();
    console.log('patients doc:', { id: d.id, name: data.fullName, regNo: data.regNo, registrationId: data.registrationId, branch: data.branch, branchName: data.branchName, source: data.source });
  });

  console.log('Found in allpatients:', snapAll.size);
  snapAll.forEach(d => {
    const data = d.data();
    console.log('allpatients doc:', { id: d.id, name: data.patientName, regId: data.regId, registrationId: data.registrationId, branch: data.branch, branchName: data.branchName });
  });

  console.log('Found in appointments:', snapAppts.size);
  snapAppts.forEach(d => {
    const data = d.data();
    console.log('appointments doc:', { id: d.id, name: data.patientName, regId: data.regId, branch: data.branch, branchName: data.branchName, date: data.appointmentDate });
  });
}

async function run() {
  await testPhone('9885080168');
  await testPhone('7780117948');
  process.exit(0);
}
run();
