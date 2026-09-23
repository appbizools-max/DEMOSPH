import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, updateDoc, doc } from 'firebase/firestore';

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

function getBranchResidentDoctor(branch) {
  const lower = String(branch || '').toLowerCase();
  if (lower.includes('chandanagar') || lower.includes('chnr')) return 'Dr. Padma Priya';
  if (lower.includes('dilshuknagar') || lower.includes('dsnr')) return 'Dr. Ramakrishna Chanduri';
  if (lower.includes('nallagandla') || lower.includes('nalla')) return 'Dr. Jobedah Parveez';
  return 'Dr. Prashanth K Vaidya';
}

async function fixCollection(colName) {
  console.log(`\n--- SCANNING & REPAIRING "${colName}" COLLECTION ---`);
  const snap = await getDocs(collection(db, colName));
  console.log(`Total docs in "${colName}": ${snap.docs.length}`);

  let updatedCount = 0;
  for (const docSnap of snap.docs) {
    const data = docSnap.data();
    const docName = String(data.doctorName || '').trim();
    const docField = String(data.doctor || '').trim();

    const hasReceptionInDocName = docName.toLowerCase().includes('reception');
    const hasReceptionInDoc = docField.toLowerCase().includes('reception');

    if (hasReceptionInDocName || hasReceptionInDoc) {
      const branchContext = data.branch || data.branchName || data.targetBranch || docName || docField;
      const realDoc = getBranchResidentDoctor(branchContext);

      try {
        await updateDoc(doc(db, colName, docSnap.id), {
          doctorName: realDoc,
          doctor: realDoc,
        });
        updatedCount++;
        console.log(`[REPAIRED] ${colName}/${docSnap.id}: "${docName || docField}" -> "${realDoc}" (Branch: ${data.branch || data.branchName})`);
      } catch (err) {
        console.error(`Failed to update ${colName}/${docSnap.id}:`, err.message);
      }
    }
  }

  console.log(`Successfully repaired ${updatedCount} records in "${colName}"!`);
}

async function run() {
  await fixCollection('allpatients');
  await fixCollection('appointments');
  await fixCollection('patients');
  console.log('\n=== ALL DATABASE RECORDS PERMANENTLY REPAIRED ===');
}

run().then(() => process.exit(0)).catch(err => { console.error(err); process.exit(1); });
