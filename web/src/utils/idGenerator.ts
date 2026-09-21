import { db } from '@app/shared';
import { doc, runTransaction, collection, getDocs } from 'firebase/firestore';

// 1. Get 3-Letter Branch Code
export const getBranchShortcut = (branchNameOrId?: string): string => {
  const normalized = (branchNameOrId || 'UNKNOWN').toUpperCase();
  if (normalized.includes('KPHB') || normalized === 'KPB') return 'KPB';
  if (normalized.includes('CHANDANAGAR') || normalized === 'CHN') return 'CHN';
  if (normalized.includes('NALLAGANDLA') || normalized === 'NGL') return 'NGL';
  if (normalized.includes('DILSHUKNAGAR') || normalized === 'DIL') return 'DIL';
  
  return normalized.replace(/[^A-Z]/g, '').substring(0, 3) || 'GEN';
};

// Find highest existing registration counter number across ALL Firestore collections (allpatients, patients, appointments, patient_profiles)
export const getMaxExistingCounter = async (shortcut: string): Promise<number> => {
  let maxNum = 0;
  const collectionsToScan = ['allpatients', 'patients', 'appointments', 'patient_profiles'];

  const inspectDoc = (data: any) => {
    if (!data) return;
    const reg = data.registrationId || data.registration_id || data.regId || data.regID || data.patientId || data.patient_id || data.uhid || data.UHID;
    if (reg && typeof reg === 'string') {
      const clean = reg.trim().toUpperCase();
      if (clean.includes(shortcut)) {
        const numPart = clean.replace(/[^0-9]/g, '');
        const parsed = parseInt(numPart, 10);
        if (!isNaN(parsed) && parsed > maxNum) {
          maxNum = parsed;
        }
      }
    }
  };

  try {
    await Promise.all(collectionsToScan.map(async (colName) => {
      try {
        const colRef = collection(db, colName);
        const snap = await getDocs(colRef);
        snap.forEach((docSnap) => inspectDoc(docSnap.data()));
      } catch (e) {}
    }));
  } catch (e) {
    console.warn('Error fetching max counter across collections:', e);
  }

  return maxNum;
};

// 2. Generate Registration ID (Fast Atomic Firestore Transaction)
export const generateRegistrationId = async (branchNameOrId?: string): Promise<string> => {
  const shortcut = getBranchShortcut(branchNameOrId);
  const counterRef = doc(db, 'counters', `registration_${shortcut}`);
  try {
    const newId = await runTransaction(db, async (transaction) => {
      const counterDoc = await transaction.get(counterRef);
      let currentCount = 0;
      if (counterDoc.exists()) {
        currentCount = counterDoc.data().count || 0;
      }
      const newCount = currentCount + 1;
      transaction.set(counterRef, { count: newCount, updatedAt: new Date().toISOString() }, { merge: true });
      return newCount;
    });

    // Zero-padded 4-digit format: 0001, 0002, 0043...
    const formattedCount = String(newId).padStart(4, '0');
    return `SPH-${shortcut}-${formattedCount}`;
  } catch (error) {
    console.error('Error generating registration ID:', error);
    return `SPH-${shortcut}-${Date.now().toString().slice(-4)}`;
  }
};
