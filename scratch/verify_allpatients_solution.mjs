import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, query, where, limit } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyAohSNLyeS6bYtnk2QvB4HGo0LbHDw9b6Q",
  authDomain: "spiritual-homeopathy-3b552.firebaseapp.com",
  projectId: "spiritual-homeopathy-3b552"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Simulate the updated visit state logic
function extractRegId(obj) {
  if (!obj) return '';
  const raw = obj.regNo || obj.regId || obj.registrationId || obj.patientId || obj.uhid || obj.patient_id || obj.patientUHID || obj.opNumber || obj.mrn || obj.customId || '';
  return String(raw).trim().toLowerCase();
}

function simulateVisitState(appointment, pool) {
  // Check explicit flags
  const isOldPatientFlag =
    appointment.patientType === 'followup' ||
    appointment.patientType === 'revisit' ||
    appointment.type === 'followup' ||
    appointment.type === 'revisit' ||
    appointment.visitType === 'followup' ||
    appointment.visitType === 'revisit' ||
    appointment.isFollowUp === true ||
    appointment.isRevisit === true ||
    appointment.isNewPatient === false ||
    appointment.source === 'Old Patient' ||
    appointment.marketingSource === 'Old Patient' ||
    appointment.collectionName === 'patients' ||
    (appointment.raw && (
      appointment.raw.patientType === 'revisit' ||
      appointment.raw.patientType === 'followup' ||
      appointment.raw.isNewPatient === false ||
      appointment.raw.source === 'Old Patient' ||
      appointment.raw.marketingSource === 'Old Patient' ||
      appointment.raw.collectionName === 'patients' ||
      (Array.isArray(appointment.raw.prescriptionUrls) && appointment.raw.prescriptionUrls.length > 0)
    )) ||
    (Array.isArray(appointment.prescriptionUrls) && appointment.prescriptionUrls.length > 0) ||
    appointment.preferredFollowUpDate ||
    appointment.preferredDate ||
    appointment.followUpDate ||
    appointment.followUpInterval;

  if (isOldPatientFlag) {
    return { type: 'REVISIT', label: 'Follow-up Revisit', badgeText: '↺ REVISIT' };
  }

  const existingReg = extractRegId(appointment);
  const isDocIdSameAsReg = appointment.id && existingReg === String(appointment.id).toLowerCase();
  const hasClinicRegPattern = existingReg && !isDocIdSameAsReg && (
    existingReg.includes('/pv/') ||
    existingReg.includes('/dsnr') ||
    existingReg.includes('rk/') ||
    existingReg.startsWith('sph') ||
    (existingReg.length >= 4 && !existingReg.startsWith('app_') && !existingReg.startsWith('temp_'))
  );

  if (hasClinicRegPattern) {
    return { type: 'REVISIT', label: 'Follow-up Revisit', badgeText: '↺ REVISIT' };
  }

  return { type: 'NEW', label: 'New Patient', badgeText: '✦ NEW' };
}

async function testVerification() {
  console.log('Testing All Patients & Visit State Verification...');
  
  // 1. Fetch samples from 'patients' collection
  const snapPatients = await getDocs(query(collection(db, 'patients'), where('branchName', 'in', ['Kphb', 'KPHB', 'KPHB Branch']), limit(5)));
  console.log(`\n1. Sample from master "patients" collection (KPHB) (${snapPatients.size} docs):`);
  snapPatients.forEach(d => {
    const data = d.data();
    const vState = simulateVisitState({ ...data, id: d.id, collectionName: 'patients' }, []);
    console.log(`   Patient: "${data.fullName || data.name}" | ID: ${data.registrationId || data.regNo || d.id} | Badge: ${vState.badgeText}`);
  });

  // 2. Fetch samples from 'allpatients' collection
  const snapAll = await getDocs(query(collection(db, 'allpatients'), where('branch', 'in', ['Kphb', 'KPHB', 'KPHB Branch', 'kphb']), limit(5)));
  console.log(`\n2. Sample from "allpatients" collection (KPHB) (${snapAll.size} docs):`);
  snapAll.forEach(d => {
    const data = d.data();
    const vState = simulateVisitState({ ...data, id: d.id, collectionName: 'allpatients' }, []);
    console.log(`   Patient: "${data.patientName || data.name}" | ID: ${data.registrationId || data.regId || data.regNo || d.id} | Badge: ${vState.badgeText}`);
  });
}

testVerification().catch(console.error);
