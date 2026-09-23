import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';

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

async function inspect() {
  console.log('=== INSPECTING DOCTORS IN FIRESTORE ===');
  const snap = await getDocs(collection(db, 'doctors'));
  console.log('Total docs in "doctors":', snap.docs.length);
  snap.docs.forEach(d => {
    const data = d.data();
    console.log(`- ID: ${d.id} | name: "${data.name}" | doctorName: "${data.doctorName}" | phone: "${data.phone || data.mobile}" | branch: "${data.branch}"`);
  });

  console.log('\n=== INSPECTING RECENT APPOINTMENTS WITH RECEPTION IN DOCTOR ===');
  const appSnap = await getDocs(collection(db, 'appointments'));
  console.log('Total docs in "appointments":', appSnap.docs.length);
  let count = 0;
  appSnap.docs.forEach(d => {
    const data = d.data();
    const docField = String(data.doctorName || data.doctor || '');
    if (docField.toLowerCase().includes('reception')) {
      count++;
      console.log(`[APPT] ID: ${d.id} | patient: "${data.patientName || data.name}" | doctorName: "${data.doctorName}" | doctor: "${data.doctor}" | branch: "${data.branch || data.branchName}"`);
    }
  });
  console.log(`Total appointments with reception in doctor: ${count}`);

  console.log('\n=== INSPECTING RECENT ALLPATIENTS WITH RECEPTION IN DOCTOR ===');
  const allPatSnap = await getDocs(collection(db, 'allpatients'));
  console.log('Total docs in "allpatients":', allPatSnap.docs.length);
  let patCount = 0;
  allPatSnap.docs.forEach(d => {
    const data = d.data();
    const docField = String(data.doctorName || data.doctor || '');
    if (docField.toLowerCase().includes('reception')) {
      patCount++;
      console.log(`[ALLPATIENT] ID: ${d.id} | patient: "${data.patientName || data.name}" | doctorName: "${data.doctorName}" | doctor: "${data.doctor}" | branch: "${data.branch || data.branchName}"`);
    }
  });
  console.log(`Total allpatients with reception in doctor: ${patCount}`);
}

inspect().then(() => process.exit(0)).catch(err => { console.error(err); process.exit(1); });
