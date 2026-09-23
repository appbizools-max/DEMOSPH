import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, limit, query } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyAohSNLyeS6bYtnk2QvB4HGo0LbHDw9b6Q",
  authDomain: "spiritual-homeopathy-3b552.firebaseapp.com",
  projectId: "spiritual-homeopathy-3b552"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

function cleanPatientName(name) {
  if (!name) return '';
  let str = String(name).toLowerCase().trim();
  str = str.replace(/^(dr\.|dr|mr\.|mr|mrs\.|mrs|ms\.|ms|master|baby|smt\.|smt|shri|shree)\s+/i, '');
  return str.replace(/[^a-z0-9]/g, '');
}

function extractPhone(obj) {
  if (!obj) return '';
  const raw = obj.phone || obj.phoneNumber || obj.mobile || obj.patientPhone || obj.contactNumber || obj.contact || '';
  return String(raw).replace(/\D/g, '').slice(-10);
}

function extractRegId(obj) {
  if (!obj) return '';
  const raw = obj.regNo || obj.regId || obj.registrationId || obj.patientId || obj.uhid || obj.patient_id || obj.customId || '';
  return String(raw).trim().toLowerCase();
}

function extractDocId(obj) {
  if (!obj) return '';
  return String(obj.patientDocId || obj.patient_id || obj.patientId || obj.id || obj.docId || '').trim();
}

function isSamePatientProfile(app, rec) {
  if (!app || !rec) return false;
  const appDocId = extractDocId(app);
  const recDocId = extractDocId(rec);
  if (appDocId && recDocId && (appDocId === recDocId || rec.patientDocId === app.id || app.patientDocId === rec.id)) {
    return true;
  }
  const appReg = extractRegId(app);
  const recReg = extractRegId(rec);
  if (appReg && recReg && appReg.length >= 2 && appReg.toLowerCase() === recReg.toLowerCase()) {
    return true;
  }
  const appName = cleanPatientName(app.patientName || app.name || app.fullName);
  const recName = cleanPatientName(rec.patientName || rec.name || rec.fullName);
  const appPhone = extractPhone(app);
  const recPhone = extractPhone(rec);
  if (appPhone && recPhone && appPhone.length >= 7 && recPhone.length >= 7 && appPhone !== recPhone) {
    return false;
  }
  if (appName && recName) {
    return appName === recName || ((appName.length >= 5 && recName.length >= 5) && (appName.includes(recName) || recName.includes(appName)));
  }
  if (appPhone && recPhone && appPhone.length >= 7 && appPhone === recPhone) {
    return true;
  }
  return false;
}

function getVisitState(appointment, allRecords) {
  // 1. Explicit Revisit flags
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
    return { type: 'REVISIT', badgeText: '↺ REVISIT' };
  }

  // 2. Matching against pool
  const matching = (allRecords || []).filter(r => {
    if (!r) return false;
    if (r.id === appointment.id) return false;
    return isSamePatientProfile(appointment, r);
  });

  if (matching.length > 0) {
    return { type: 'REVISIT', badgeText: '↺ REVISIT' };
  }

  // 3. Existing clinic registration format
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
    return { type: 'REVISIT', badgeText: '↺ REVISIT' };
  }

  return { type: 'NEW', badgeText: '✦ NEW' };
}

async function test() {
  const [snapAll, snapPatients] = await Promise.all([
    getDocs(query(collection(db, 'allpatients'), limit(30))),
    getDocs(query(collection(db, 'patients'), limit(30)))
  ]);

  const pool = [];
  snapAll.forEach(d => pool.push({ id: d.id, ...d.data(), collectionName: 'allpatients' }));
  snapPatients.forEach(d => pool.push({ id: d.id, ...d.data(), collectionName: 'patients' }));

  console.log('Sample allpatients visit states:');
  snapAll.forEach(d => {
    const data = d.data();
    const st = getVisitState({ id: d.id, ...data }, pool);
    console.log(`[${d.id}] ${data.patientName || data.name} (${data.phone}) - Reg: ${data.registrationId || data.regId || data.regNo} => ${st.badgeText}`);
    if (st.badgeText === '✦ NEW') {
      console.log('   -> Details of NEW patient:', JSON.stringify(data));
    }
  });
}

test().catch(console.error);
