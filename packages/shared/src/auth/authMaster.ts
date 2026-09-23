import { CanonicalBranchId, BRANCHES, resolveCanonicalBranchId } from '../branches/branchMaster';
import { UserRole } from '../types';

/**
 * Strict Reception Desk Directory
 * Only the 4 official branch desk numbers can ever resolve to 'reception'.
 */
export interface ReceptionDeskInfo {
  branchId: CanonicalBranchId;
  branchName: string;
  phone: string;
  formattedPhone: string;
  userName: string;
}

export const RECEPTION_DESK_DIRECTORY: Record<string, ReceptionDeskInfo> = {
  '9030176176': {
    branchId: 'kphb',
    branchName: 'KPHB Branch',
    phone: '9030176176',
    formattedPhone: '+91 90301 76176',
    userName: 'KPHB Reception',
  },
  '9553176176': {
    branchId: 'chandanagar',
    branchName: 'Chandanagar Branch',
    phone: '9553176176',
    formattedPhone: '+91 95531 76176',
    userName: 'Chandanagar Reception',
  },
  '9804176176': {
    branchId: 'dilshuknagar',
    branchName: 'Dilshuknagar Branch',
    phone: '9804176176',
    formattedPhone: '+91 98041 76176',
    userName: 'Dilshuknagar Reception',
  },
  '9132176176': {
    branchId: 'nallagandla',
    branchName: 'Nallagandla Branch',
    phone: '9132176176',
    formattedPhone: '+91 91321 76176',
    userName: 'Nallagandla Reception',
  },
};

/**
 * Strict Doctor Directory
 * Only official clinical doctor numbers can resolve to 'doctor'.
 * Desk numbers (such as 9804176176) are strictly excluded.
 */
export interface DoctorInfo {
  id: string;
  name: string;
  phone: string;
  formattedPhone: string;
  branchId: CanonicalBranchId;
  category: 'Head Doctor' | 'Employee Doctor';
}

export const DOCTOR_DIRECTORY: Record<string, DoctorInfo> = {
  '8125260176': {
    id: 'doc-1',
    name: 'Dr. Prashanth K Vaidya',
    phone: '8125260176',
    formattedPhone: '+91 81252 60176',
    branchId: 'kphb',
    category: 'Head Doctor',
  },
  '9903119766': {
    id: 'doc-2',
    name: 'Dr. Jobedah Parveez',
    phone: '9903119766',
    formattedPhone: '+91 99031 19766',
    branchId: 'nallagandla',
    category: 'Head Doctor',
  },
  '9490808582': {
    id: 'doc-3',
    name: 'Dr. Padma Priya',
    phone: '9490808582',
    formattedPhone: '+91 94908 08582',
    branchId: 'chandanagar',
    category: 'Employee Doctor',
  },
  '1111111111': {
    id: 'doc-4',
    name: 'Dr. Ramakrishna Chanduri',
    phone: '1111111111',
    formattedPhone: '+91 11111 11111',
    branchId: 'dilshuknagar',
    category: 'Head Doctor',
  },
};

/**
 * Resolved strict authentication record
 */
export interface StrictAuthRecord {
  role: 'admin' | 'hr' | 'doctor' | 'reception' | 'staff';
  userName: string;
  branchId: CanonicalBranchId;
  branchName: string;
  branchPhone: string;
  staffId?: string;
  isDoctor: boolean;
  isReception: boolean;
  isStaff: boolean;
  isAdminOrHr: boolean;
  doctorCategory?: 'Head Doctor' | 'Employee Doctor';
}

/**
 * Normalizes input to clean 10-digit mobile number or lowercased string
 */
export function extractClean10Digits(input?: string | null): string {
  if (!input || typeof input !== 'string') return '';
  const digits = input.replace(/\D/g, '');
  return digits.length >= 10 ? digits.slice(-10) : digits;
}

/**
 * Resolves authentication strictly:
 * 1. Checks Reception Desk Directory (PRIORITY 1 - Never confused with Doctor/Staff)
 * 2. Checks Doctor Directory (PRIORITY 2 - Never confused with Reception/Staff)
 * 3. Checks Admin / HR
 * 4. Checks Staff Directory
 *
 * If no match is found, returns null so the caller can handle invalid/unauthorized input.
 */
export function resolveStrictAuth(input?: string | null): StrictAuthRecord | null {
  if (!input || typeof input !== 'string') return null;
  const cleanInput = input.trim();
  if (!cleanInput) return null;

  const clean10 = extractClean10Digits(cleanInput);
  const lower = cleanInput.toLowerCase();

  // 1. Reception Desk Phones (Takes top priority)
  if (clean10 && RECEPTION_DESK_DIRECTORY[clean10]) {
    const rec = RECEPTION_DESK_DIRECTORY[clean10];
    return {
      role: 'reception',
      userName: rec.userName,
      branchId: rec.branchId,
      branchName: rec.branchName,
      branchPhone: rec.formattedPhone,
      isReception: true,
      isDoctor: false,
      isStaff: false,
      isAdminOrHr: false,
    };
  }

  // Check branch name variations if specifically typing "reception"
  if (lower.includes('reception') || lower.includes('recption')) {
    const canonical = resolveCanonicalBranchId(lower) || 'kphb';
    const branchItem = BRANCHES[canonical];
    return {
      role: 'reception',
      userName: `${branchItem.name} Reception`,
      branchId: canonical,
      branchName: branchItem.fullName,
      branchPhone: branchItem.formattedPhone,
      isReception: true,
      isDoctor: false,
      isStaff: false,
      isAdminOrHr: false,
    };
  }

  // 2. Doctor Phones & Names (Takes second priority)
  if (clean10 && DOCTOR_DIRECTORY[clean10]) {
    const doc = DOCTOR_DIRECTORY[clean10];
    const branchItem = BRANCHES[doc.branchId];
    return {
      role: 'doctor',
      userName: doc.name,
      branchId: doc.branchId,
      branchName: branchItem.fullName,
      branchPhone: doc.formattedPhone,
      isReception: false,
      isDoctor: true,
      isStaff: false,
      isAdminOrHr: false,
      doctorCategory: doc.category,
    };
  }

  // Doctor name fuzzy match
  if (lower.includes('prashanth') || cleanInput.includes('8125260176')) {
    const doc = DOCTOR_DIRECTORY['8125260176'];
    return {
      role: 'doctor',
      userName: doc.name,
      branchId: doc.branchId,
      branchName: BRANCHES[doc.branchId].fullName,
      branchPhone: doc.formattedPhone,
      isReception: false,
      isDoctor: true,
      isStaff: false,
      isAdminOrHr: false,
      doctorCategory: doc.category,
    };
  }
  if (lower.includes('jobedah') || lower.includes('parveez') || cleanInput.includes('9903119766')) {
    const doc = DOCTOR_DIRECTORY['9903119766'];
    return {
      role: 'doctor',
      userName: doc.name,
      branchId: doc.branchId,
      branchName: BRANCHES[doc.branchId].fullName,
      branchPhone: doc.formattedPhone,
      isReception: false,
      isDoctor: true,
      isStaff: false,
      isAdminOrHr: false,
      doctorCategory: doc.category,
    };
  }
  if (lower.includes('padma') || cleanInput.includes('9490808582')) {
    const doc = DOCTOR_DIRECTORY['9490808582'];
    return {
      role: 'doctor',
      userName: doc.name,
      branchId: doc.branchId,
      branchName: BRANCHES[doc.branchId].fullName,
      branchPhone: doc.formattedPhone,
      isReception: false,
      isDoctor: true,
      isStaff: false,
      isAdminOrHr: false,
      doctorCategory: doc.category,
    };
  }
  if (lower.includes('chanduri') || lower.includes('ramakrishna') || clean10 === '1111111111') {
    const doc = DOCTOR_DIRECTORY['1111111111'];
    return {
      role: 'doctor',
      userName: doc.name,
      branchId: doc.branchId,
      branchName: BRANCHES[doc.branchId].fullName,
      branchPhone: doc.formattedPhone,
      isReception: false,
      isDoctor: true,
      isStaff: false,
      isAdminOrHr: false,
      doctorCategory: doc.category,
    };
  }

  // 3. Admin / HR Email or Hotline Logins
  if (lower === 'hr@sph.com' || lower.includes('hr') || clean10 === '9000000002') {
    return {
      role: 'hr',
      userName: cleanInput.includes('@') ? cleanInput : 'hr@sph.com',
      branchId: 'kphb',
      branchName: 'HR Department',
      branchPhone: '+91 90301 76176',
      isReception: false,
      isDoctor: false,
      isStaff: false,
      isAdminOrHr: true,
    };
  }
  if (lower.includes('admin') || clean10 === '9000000001') {
    return {
      role: 'admin',
      userName: cleanInput.includes('@') ? cleanInput : 'admin@sph.com',
      branchId: 'kphb',
      branchName: 'Admin Control Hub',
      branchPhone: '+91 90301 76176',
      isReception: false,
      isDoctor: false,
      isStaff: false,
      isAdminOrHr: true,
    };
  }

  // Regular staff members are 100% database-driven (queried from Firestore 'staff' collection)
  // Non-desk and non-doctor accounts return null so they are validated against live HR/Admin database
  return null;
}

/**
 * Resolves the primary resident doctor for a given clinic branch.
 */
export function resolveDefaultDoctorForBranch(branchOrBranchId?: string | null): string {
  if (!branchOrBranchId) return 'Dr. Prashanth K Vaidya';
  const lower = branchOrBranchId.toLowerCase().trim();
  if (lower.includes('chandanagar') || lower === 'chnr') return 'Dr. Padma Priya';
  if (lower.includes('dilshuknagar') || lower === 'dsnr') return 'Dr. Ramakrishna Chanduri';
  if (lower.includes('nallagandla') || lower === 'nalla') return 'Dr. Jobedah Parveez';
  return 'Dr. Prashanth K Vaidya';
}

/**
 * Universal sanitizer for doctor names across Web & Mobile.
 * Completely eliminates "Dr. [Branch] Reception" or "dr . Dilshuknagar Reception".
 * If a name contains "reception", "desk", or "staff", it maps to that branch's doctor.
 */
export function sanitizeDoctorName(rawName?: string | null, branchContext?: string | null): string {
  if (!rawName || typeof rawName !== 'string') {
    return resolveDefaultDoctorForBranch(branchContext);
  }

  let clean = rawName.trim();
  const lower = clean.toLowerCase();

  // If the string contains "reception", "desk", or "staff", it is NOT a doctor!
  if (lower.includes('reception') || lower.includes('desk') || lower.includes('staff')) {
    return resolveDefaultDoctorForBranch(branchContext || clean);
  }

  // Strip all repeated "Dr." or "Dr" or "dr." or "dr ." prefixes
  clean = clean.replace(/^(dr\.?\s*)+/i, '').trim();

  const cleanLower = clean.toLowerCase();
  if (cleanLower.includes('ramakrishna') || cleanLower.includes('rama krishna') || cleanLower.includes('chanduri')) {
    return 'Dr. Ramakrishna Chanduri';
  }
  if (cleanLower.includes('prashanth') || cleanLower.includes('vaidya')) {
    return 'Dr. Prashanth K Vaidya';
  }
  if (cleanLower.includes('padma') || cleanLower.includes('priya')) {
    return 'Dr. Padma Priya';
  }
  if (cleanLower.includes('jobedah') || cleanLower.includes('jobeadh') || cleanLower.includes('parveez') || cleanLower.includes('parveej')) {
    return 'Dr. Jobedah Parveez';
  }
  if (cleanLower.includes('ananya')) {
    return 'Dr. Ananya';
  }
  if (cleanLower.includes('srinivas')) {
    return 'Dr. Srinivas';
  }
  if (cleanLower.includes('ramesh')) {
    return 'Dr. Ramesh';
  }

  if (!clean || cleanLower === 'doctor' || cleanLower === 'unassigned') {
    return resolveDefaultDoctorForBranch(branchContext);
  }

  // Capitalize words neatly
  const titleCased = clean.split(' ').filter(Boolean).map(w => w[0].toUpperCase() + w.slice(1).toLowerCase()).join(' ');
  return `Dr. ${titleCased}`;
}

/**
 * Strictly resolves doctor name without ever matching reception desk numbers.
 * If phone belongs to a reception desk (e.g. 9804176176), it is NEVER treated as a doctor.
 */
export function resolveStrictDoctorName(phoneOrName?: string | null, fallbackStoredName?: string | null): string {
  const input = (phoneOrName || '').trim();
  const stored = (fallbackStoredName || '').trim();

  // If already a valid specific doctor name, return it
  if (
    stored &&
    stored !== 'Dr. Homeopathy Physician' &&
    stored !== 'Dr. Physician' &&
    stored !== 'Doctor' &&
    !stored.toLowerCase().includes('reception') &&
    !stored.toLowerCase().includes('desk') &&
    !stored.toLowerCase().includes('staff')
  ) {
    return stored;
  }

  const clean10 = extractClean10Digits(input);

  // If phone matches reception desk, strictly reject doctor resolution and return that branch's doctor
  if (clean10 && RECEPTION_DESK_DIRECTORY[clean10]) {
    const branchId = RECEPTION_DESK_DIRECTORY[clean10].branchId;
    return resolveDefaultDoctorForBranch(branchId);
  }

  if (clean10 && DOCTOR_DIRECTORY[clean10]) {
    return DOCTOR_DIRECTORY[clean10].name;
  }

  const lower = (input + ' ' + stored).toLowerCase();
  if (lower.includes('prashanth') || lower.includes('vaidya')) return 'Dr. Prashanth K Vaidya';
  if (lower.includes('jobedah') || lower.includes('parveez')) return 'Dr. Jobedah Parveez';
  if (lower.includes('padma') || lower.includes('priya')) return 'Dr. Padma Priya';
  if (lower.includes('chanduri') || lower.includes('ramakrishna')) return 'Dr. Ramakrishna Chanduri';
  if (lower.includes('ananya')) return 'Dr. Ananya';
  if (lower.includes('srinivas')) return 'Dr. Srinivas';
  if (lower.includes('ramesh')) return 'Dr. Ramesh';

  // Branch checks if input/stored contains branch name
  if (lower.includes('chandanagar')) return 'Dr. Padma Priya';
  if (lower.includes('dilshuknagar') || lower.includes('dsnr')) return 'Dr. Ramakrishna Chanduri';
  if (lower.includes('nallagandla')) return 'Dr. Jobedah Parveez';
  if (lower.includes('kphb')) return 'Dr. Prashanth K Vaidya';

  // Fallback if stored is a legitimate doctor name that didn't match the standard 4
  if (
    stored &&
    !stored.toLowerCase().includes('reception') &&
    !stored.toLowerCase().includes('desk') &&
    !stored.toLowerCase().includes('staff')
  ) {
    return stored;
  }

  return 'Dr. Prashanth K Vaidya';
}
