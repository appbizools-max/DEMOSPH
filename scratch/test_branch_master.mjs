import {
  BRANCHES,
  OFFICIAL_BRANCH_LIST,
  resolveCanonicalBranchId,
  getBranch,
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

console.log('=== 1. Canonical IDs Test ===');
assert(resolveCanonicalBranchId('kphb') === 'kphb', "'kphb' => 'kphb'");
assert(resolveCanonicalBranchId('chandanagar') === 'chandanagar', "'chandanagar' => 'chandanagar'");
assert(resolveCanonicalBranchId('dilshuknagar') === 'dilshuknagar', "'dilshuknagar' => 'dilshuknagar'");
assert(resolveCanonicalBranchId('nallagandla') === 'nallagandla', "'nallagandla' => 'nallagandla'");

console.log('\n=== 2. Legacy Auth UIDs Test ===');
assert(resolveCanonicalBranchId('XRrXPAWzn4fKiwT387PKBLQZg323') === 'kphb', "KPHB Auth UID => 'kphb'");
assert(resolveCanonicalBranchId('xS0281lEdPc0hUFrrNRPBMeQZsD3') === 'chandanagar', "Chandanagar Auth UID => 'chandanagar'");
assert(resolveCanonicalBranchId('t7BiooFMRDU7DcgKFGnAPnJY0Qq2') === 'dilshuknagar', "Dilshuknagar Auth UID => 'dilshuknagar'");
assert(resolveCanonicalBranchId('1qj75oZZlWgN8P02OAeRNjCVMhM2') === 'nallagandla', "Nallagandla Auth UID 1 => 'nallagandla'");
assert(resolveCanonicalBranchId('pV2j0doYaX0Mmb3yUfNp') === 'nallagandla', "Nallagandla Auth UID 2 => 'nallagandla'");

console.log('\n=== 3. Phone Numbers Test ===');
assert(resolveCanonicalBranchId('9030176176') === 'kphb', "9030176176 => 'kphb'");
assert(resolveCanonicalBranchId('+91 95531 76176') === 'chandanagar', "+91 95531 76176 => 'chandanagar'");
assert(resolveCanonicalBranchId('9804176176') === 'dilshuknagar', "9804176176 => 'dilshuknagar'");
assert(resolveCanonicalBranchId('9132176176') === 'nallagandla', "9132176176 => 'nallagandla'");

console.log('\n=== 4. Branch Names & Variants Test ===');
assert(resolveCanonicalBranchId('KPHB Branch') === 'kphb', "'KPHB Branch' => 'kphb'");
assert(resolveCanonicalBranchId('CHANDNAGAR') === 'chandanagar', "'CHANDNAGAR' => 'chandanagar'");
assert(resolveCanonicalBranchId('Dilshuknagar Branch') === 'dilshuknagar', "'Dilshuknagar Branch' => 'dilshuknagar'");
assert(resolveCanonicalBranchId('Nallagandla Branch') === 'nallagandla', "'Nallagandla Branch' => 'nallagandla'");

console.log('\n=== 5. Registration Codes & Registration IDs Test ===');
assert(getRegistrationCode('kphb') === 'KPB', "kphb code is 'KPB'");
assert(getRegistrationCode('chandanagar') === 'CHN', "chandanagar code is 'CHN'");
assert(getRegistrationCode('dilshuknagar') === 'DIL', "dilshuknagar code is 'DIL'");
assert(getRegistrationCode('nallagandla') === 'NGL', "nallagandla code is 'NGL'");

assert(resolveCanonicalBranchId('SPH-KPB-0146') === 'kphb', "'SPH-KPB-0146' => 'kphb'");
assert(resolveCanonicalBranchId('SPHCHAN-061') === 'chandanagar', "'SPHCHAN-061' => 'chandanagar'");
assert(resolveCanonicalBranchId('SPHDSN-122') === 'dilshuknagar', "'SPHDSN-122' => 'dilshuknagar'");
assert(resolveCanonicalBranchId('SPH-NGL-0023') === 'nallagandla', "'SPH-NGL-0023' => 'nallagandla'");
assert(resolveCanonicalBranchId('10407/pv/kphb') === 'kphb', "'10407/pv/kphb' => 'kphb'");
assert(resolveCanonicalBranchId('159rk/dsnr') === 'dilshuknagar', "'159rk/dsnr' => 'dilshuknagar'");

console.log(`\nResults: ${passed} passed, ${failed} failed.`);
if (failed > 0) process.exit(1);
process.exit(0);
