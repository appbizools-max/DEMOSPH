import {
  resolveCanonicalBranchId,
  BRANCHES,
  getRegistrationCode,
} from '../packages/shared/dist/branches/branchMaster.js';

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  PASS: ${message}`);
    passed++;
  } else {
    console.error(`  FAIL: ${message}`);
    failed++;
  }
}

console.log('=== Phase 2: User Session & Branch Normalization Tests ===\n');

// 1. Receptionist Desk Logins
const receptionTestCases = [
  { phone: '9030176176', expectedBranchId: 'kphb', expectedCode: 'KPB' },
  { phone: '9553176176', expectedBranchId: 'chandanagar', expectedCode: 'CHN' },
  { phone: '9804176176', expectedBranchId: 'dilshuknagar', expectedCode: 'DIL' },
  { phone: '9132176176', expectedBranchId: 'nallagandla', expectedCode: 'NGL' },
];

console.log('1. Receptionist Desk Phone Resolution:');
for (const tc of receptionTestCases) {
  const resolved = resolveCanonicalBranchId(tc.phone);
  assert(resolved === tc.expectedBranchId, `Phone ${tc.phone} => branchId: "${resolved}"`);
  assert(getRegistrationCode(resolved) === tc.expectedCode, `branchId "${resolved}" => registrationCode: "${tc.expectedCode}"`);
}

// 2. Legacy Auth UIDs found in Firestore users.branchId
console.log('\n2. Legacy Firebase Auth UIDs Normalization:');
const legacyUserDocs = [
  { uid: 'u1', rawBranchId: 'XRrXPAWzn4fKiwT387PKBLQZg323', expected: 'kphb' },
  { uid: 'u2', rawBranchId: 'xS0281lEdPc0hUFrrNRPBMeQZsD3', expected: 'chandanagar' },
  { uid: 'u3', rawBranchId: 't7BiooFMRDU7DcgKFGnAPnJY0Qq2', expected: 'dilshuknagar' },
  { uid: 'u4', rawBranchId: '1qj75oZZlWgN8P02OAeRNjCVMhM2', expected: 'nallagandla' },
  { uid: 'u5', rawBranchId: 'pV2j0doYaX0Mmb3yUfNp', expected: 'nallagandla' },
];

for (const doc of legacyUserDocs) {
  const normalized = resolveCanonicalBranchId(doc.rawBranchId);
  assert(normalized === doc.expected, `User doc with raw branchId "${doc.rawBranchId}" normalized to "${normalized}"`);
}

// 3. User Session Context Simulation
console.log('\n3. Simulated currentUser Context Normalization:');
function createNormalizedUserSession(rawLoginInput) {
  const resolvedBranchId = resolveCanonicalBranchId(rawLoginInput.branchId || rawLoginInput.branch || rawLoginInput.phone) || 'kphb';
  const branchInfo = BRANCHES[resolvedBranchId];

  return {
    uid: rawLoginInput.uid || 'usr-123',
    role: rawLoginInput.role || 'reception',
    userName: rawLoginInput.userName || `${branchInfo.name} Staff`,
    branchId: resolvedBranchId,
    branchName: branchInfo.fullName,
    branchPhone: branchInfo.formattedPhone,
    staffId: rawLoginInput.staffId || '1',
  };
}

const session1 = createNormalizedUserSession({ role: 'reception', branch: 'Chandanagar Branch' });
assert(session1.branchId === 'chandanagar', 'session1.branchId === "chandanagar"');
assert(session1.branchName === 'Chandanagar Branch', 'session1.branchName === "Chandanagar Branch"');

const session2 = createNormalizedUserSession({ role: 'reception', branchId: 'XRrXPAWzn4fKiwT387PKBLQZg323' });
assert(session2.branchId === 'kphb', 'session2 (legacy UID) branchId === "kphb"');
assert(session2.branchName === 'KPHB Branch', 'session2 (legacy UID) branchName === "KPHB Branch"');

console.log(`\nUser Normalization Results: ${passed} passed, ${failed} failed.`);
if (failed > 0) process.exit(1);
process.exit(0);
