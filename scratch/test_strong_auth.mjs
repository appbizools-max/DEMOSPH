import assert from 'assert';
import {
  resolveStrictAuth,
  resolveStrictDoctorName,
  RECEPTION_DESK_DIRECTORY,
  DOCTOR_DIRECTORY,
  STAFF_DIRECTORY
} from '../packages/shared/dist/auth/authMaster.js';

console.log('--- Testing Strict Authentication Master ---');

// 1. Test all 4 Reception Desk Phones
const deskKphb = resolveStrictAuth('9030176176');
assert(deskKphb !== null, 'KPHB desk should resolve');
assert(deskKphb.role === 'reception', 'KPHB role must be reception');
assert(deskKphb.branchId === 'kphb', 'KPHB branchId must be kphb');
assert(deskKphb.isDoctor === false, 'KPHB desk cannot be doctor');
console.log('✓ KPHB Reception Desk Verified');

const deskChnr = resolveStrictAuth('9553176176');
assert(deskChnr !== null, 'Chandanagar desk should resolve');
assert(deskChnr.role === 'reception', 'Chandanagar role must be reception');
assert(deskChnr.branchId === 'chandanagar', 'Chandanagar branchId must be chandanagar');
console.log('✓ Chandanagar Reception Desk Verified');

const deskDils = resolveStrictAuth('9804176176');
assert(deskDils !== null, 'Dilshuknagar desk should resolve');
assert(deskDils.role === 'reception', 'Dilshuknagar role must be reception');
assert(deskDils.branchId === 'dilshuknagar', 'Dilshuknagar branchId must be dilshuknagar');
assert(deskDils.isDoctor === false, 'Dilshuknagar desk cannot be doctor');
assert(!deskDils.userName.includes('Ramakrishna'), 'Dilshuknagar desk cannot be Dr. Ramakrishna');
console.log('✓ Dilshuknagar Reception Desk Verified (NOT Doctor!)');

const deskNall = resolveStrictAuth('9132176176');
assert(deskNall !== null, 'Nallagandla desk should resolve');
assert(deskNall.role === 'reception', 'Nallagandla role must be reception');
assert(deskNall.branchId === 'nallagandla', 'Nallagandla branchId must be nallagandla');
console.log('✓ Nallagandla Reception Desk Verified');

// 2. Test Doctor Phones
const docPrashanth = resolveStrictAuth('8125260176');
assert(docPrashanth !== null, 'Dr Prashanth should resolve');
assert(docPrashanth.role === 'doctor', 'Role must be doctor');
assert(docPrashanth.userName === 'Dr. Prashanth K Vaidya', 'Doctor name match');
assert(docPrashanth.isDoctor === true, 'isDoctor must be true');
console.log('✓ Dr. Prashanth K Vaidya Verified');

const docJobedah = resolveStrictAuth('9903119766');
assert(docJobedah !== null, 'Dr Jobedah should resolve');
assert(docJobedah.role === 'doctor', 'Role must be doctor');
assert(docJobedah.userName === 'Dr. Jobedah Parveez', 'Doctor name match');
console.log('✓ Dr. Jobedah Parveez Verified');

const docPadma = resolveStrictAuth('9490808582');
assert(docPadma !== null, 'Dr Padma should resolve');
assert(docPadma.role === 'doctor', 'Role must be doctor');
assert(docPadma.userName === 'Dr. Padma Priya', 'Doctor name match');
console.log('✓ Dr. Padma Priya Verified');

const docRama = resolveStrictAuth('1111111111');
assert(docRama !== null, 'Dr Ramakrishna should resolve');
assert(docRama.role === 'doctor', 'Role must be doctor');
assert(docRama.userName === 'Dr. Ramakrishna Chanduri', 'Doctor name match');
console.log('✓ Dr. Ramakrishna Chanduri Verified');

// 3. Test resolveStrictDoctorName
const docNameFromDesk = resolveStrictDoctorName('9804176176', 'Dilshuknagar Reception');
assert(!docNameFromDesk.includes('Dilshuknagar Reception'), 'Desk phone should not be doctor name');
console.log('✓ resolveStrictDoctorName safely ignores desk phone: ' + docNameFromDesk);

const docNameFromDocPhone = resolveStrictDoctorName('8125260176');
assert(docNameFromDocPhone === 'Dr. Prashanth K Vaidya');
console.log('✓ resolveStrictDoctorName matches doctor phone');

// 4. Test Staff
const staffAishwarya = resolveStrictAuth('7995532759');
assert(staffAishwarya !== null, 'Aishwarya should resolve');
assert(staffAishwarya.role === 'staff', 'Role must be staff');
console.log('✓ Staff Verified');

// 5. Test Admin & HR
const adminAuth = resolveStrictAuth('admin@sph.com');
assert(adminAuth !== null && adminAuth.role === 'admin');
const hrAuth = resolveStrictAuth('hr@sph.com');
assert(hrAuth !== null && hrAuth.role === 'hr');
console.log('✓ Admin and HR Verified');

console.log('ALL STRICT AUTH TESTS PASSED PERFECTLY!');
