/**
 * SPH Official Clinic Branch Master Configuration
 * Single Source of Truth across Web, Mobile, and Backend Services.
 * 
 * Canonical branchId strictly matches Firestore 'branches' document IDs:
 * - 'kphb'
 * - 'chandanagar'
 * - 'dilshuknagar'
 * - 'nallagandla'
 */

export type CanonicalBranchId = 'kphb' | 'chandanagar' | 'dilshuknagar' | 'nallagandla';
export type BranchRegistrationCode = 'KPB' | 'CHN' | 'DIL' | 'NGL';

export interface BranchMasterItem {
  id: CanonicalBranchId;
  name: string;
  fullName: string;
  registrationCode: BranchRegistrationCode;
  phone: string;
  formattedPhone: string;
  receptionistRole: 'reception';
  visitUrl: string;
}
export const BRANCHES: Record<CanonicalBranchId, BranchMasterItem> = {
  kphb: {
    id: 'kphb',
    name: 'KPHB',
    fullName: 'KPHB Branch',
    registrationCode: 'KPB',
    phone: '9030176176',
    formattedPhone: '+91 90301 76176',
    receptionistRole: 'reception',
    visitUrl: 'https://stiny.in/SPHMEO/kphb',
  },
  chandanagar: {
    id: 'chandanagar',
    name: 'Chandanagar',
    fullName: 'Chandanagar Branch',
    registrationCode: 'CHN',
    phone: '9553176176',
    formattedPhone: '+91 95531 76176',
    receptionistRole: 'reception',
    visitUrl: 'https://stiny.in/SPHMEO/chanda',
  },
  dilshuknagar: {
    id: 'dilshuknagar',
    name: 'Dilshuknagar',
    fullName: 'Dilshuknagar Branch',
    registrationCode: 'DIL',
    phone: '9804176176',
    formattedPhone: '+91 98041 76176',
    receptionistRole: 'reception',
    visitUrl: 'https://stiny.in/SPHMEO/dilshu',
  },
  nallagandla: {
    id: 'nallagandla',
    name: 'Nallagandla',
    fullName: 'Nallagandla Branch',
    registrationCode: 'NGL',
    phone: '9132176176',
    formattedPhone: '+91 91321 76176',
    receptionistRole: 'reception',
    visitUrl: 'https://stiny.in/SPHMEO/nallag',
  },
} as const;

/**
 * Array list of all 4 official branches
 */
export const OFFICIAL_BRANCH_LIST: BranchMasterItem[] = Object.values(BRANCHES);

/**
 * Legacy Firebase Auth UIDs mapped to their canonical branch IDs
 */
const LEGACY_UID_BRANCH_MAP: Record<string, CanonicalBranchId> = {
  // KPHB
  'XRrXPAWzn4fKiwT387PKBLQZg323': 'kphb',
  // Chandanagar
  'xS0281lEdPc0hUFrrNRPBMeQZsD3': 'chandanagar',
  // Dilshuknagar
  't7BiooFMRDU7DcgKFGnAPnJY0Qq2': 'dilshuknagar',
  // Nallagandla
  '1qj75oZZlWgN8P02OAeRNjCVMhM2': 'nallagandla',
  'pV2j0doYaX0Mmb3yUfNp': 'nallagandla',
};

/**
 * Resolves any input (legacy Auth UID, phone, branch name variation, registration code)
 * to the canonical branchId ('kphb' | 'chandanagar' | 'dilshuknagar' | 'nallagandla').
 */
export function resolveCanonicalBranchId(input?: string | null): CanonicalBranchId | null {
  if (!input || typeof input !== 'string') return null;
  const trimmed = input.trim();
  if (!trimmed) return null;

  // 1. Exact match on Canonical ID
  if (trimmed === 'kphb' || trimmed === 'chandanagar' || trimmed === 'dilshuknagar' || trimmed === 'nallagandla') {
    return trimmed;
  }

  // 2. Legacy Auth UID Check
  if (LEGACY_UID_BRANCH_MAP[trimmed]) {
    return LEGACY_UID_BRANCH_MAP[trimmed];
  }

  // 3. Digits / Phone Number Check (10-digit matching)
  const digits = trimmed.replace(/\D/g, '');
  if (digits.length >= 10) {
    const last10 = digits.slice(-10);
    if (last10 === '9030176176') return 'kphb';
    if (last10 === '9553176176') return 'chandanagar';
    if (last10 === '9804176176') return 'dilshuknagar';
    if (last10 === '9132176176') return 'nallagandla';
  }

  const lower = trimmed.toLowerCase();

  // 4. KPHB variations
  if (
    lower.includes('kphb') ||
    lower.includes('kphp') ||
    lower.includes('kpb') ||
    lower.startsWith('sph-kpb') ||
    lower.startsWith('sphkpb')
  ) {
    return 'kphb';
  }

  // 5. Chandanagar variations
  if (
    lower.includes('chanda') ||
    lower.includes('chandnagar') ||
    lower.includes('cngr') ||
    lower.includes('chn') ||
    lower.startsWith('sph-chn') ||
    lower.startsWith('sphchan') ||
    lower.endsWith('/cn')
  ) {
    return 'chandanagar';
  }

  // 6. Dilshuknagar variations
  if (
    lower.includes('dilshuk') ||
    lower.includes('dilsukh') ||
    lower.includes('dsnr') ||
    lower.includes('dsn') ||
    lower.includes('dil') ||
    lower.startsWith('sph-dil') ||
    lower.startsWith('sphdsn') ||
    lower.includes('rk/dsnr')
  ) {
    return 'dilshuknagar';
  }

  // 7. Nallagandla variations
  if (
    lower.includes('nallagandla') ||
    lower.includes('nallag') ||
    lower.includes('ngdl') ||
    lower.includes('nlg') ||
    lower.includes('ngl') ||
    lower.startsWith('sph-ngl') ||
    lower.startsWith('sphnlg') ||
    lower.includes('pvngdl')
  ) {
    return 'nallagandla';
  }

  return null;
}

/**
 * Gets the full BranchMasterItem for any branch identifier or input
 */
export function getBranch(input?: string | null): BranchMasterItem | undefined {
  const canonicalId = resolveCanonicalBranchId(input);
  if (canonicalId) {
    return BRANCHES[canonicalId];
  }
  return undefined;
}

/**
 * Gets the standard 3-letter registration code ('KPB', 'CHN', 'DIL', 'NGL')
 * for any branch identifier or input. Falls back to 'GEN' if unknown.
 */
export function getRegistrationCode(input?: string | null): BranchRegistrationCode | 'GEN' {
  const branch = getBranch(input);
  return branch ? branch.registrationCode : 'GEN';
}

/**
 * Gets the array of branch name variations for Firestore 'in' queries
 */
export function getBranchQueryNames(branchIdOrName?: string | null): string[] {
  const canonical = resolveCanonicalBranchId(branchIdOrName);
  if (!canonical) return [];
  switch (canonical) {
    case 'kphb':
      return ['KPHB Branch', 'Kphb', 'KPHB', 'kphb'];
    case 'chandanagar':
      return ['Chandanagar Branch', 'Chandanagar', 'CHANDNAGAR', 'chandanagar'];
    case 'dilshuknagar':
      return ['Dilshuknagar Branch', 'Dilshuknagar', 'Dilsukhnagar', 'dilshuknagar'];
    case 'nallagandla':
      return ['Nallagandla Branch', 'Nallagandla', 'nallagandla'];
    default:
      return [];
  }
}

/**
 * Gets the direct branch desk mobile phone number (e.g. '9030176176', '9553176176')
 */
export function getBranchPhone(input?: string | null): string {
  const branch = getBranch(input);
  return branch ? branch.phone : '9030176176';
}

/**
 * Gets the formatted direct branch desk mobile phone number (e.g. '+91 90301 76176')
 */
export function getBranchFormattedPhone(input?: string | null): string {
  const branch = getBranch(input);
  return branch ? branch.formattedPhone : '+91 90301 76176';
}

