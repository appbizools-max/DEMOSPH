const assert = require('assert');
const fs = require('fs');
const path = require('path');

// 1. Check shared authMaster source
const authMasterTs = fs.readFileSync(path.resolve(__dirname, '../packages/shared/src/auth/authMaster.ts'), 'utf8');
assert(!authMasterTs.includes('STAFF_DIRECTORY'), 'authMaster.ts must not contain STAFF_DIRECTORY');
assert(authMasterTs.includes('RECEPTION_DESK_DIRECTORY'), 'authMaster.ts must contain RECEPTION_DESK_DIRECTORY');
assert(authMasterTs.includes('DOCTOR_DIRECTORY'), 'authMaster.ts must contain DOCTOR_DIRECTORY');

// 2. Check mobile AuthScreen source
const mobileAuthTsx = fs.readFileSync(path.resolve(__dirname, '../mobile/src/screens/AuthScreen/AuthScreen.tsx'), 'utf8');
assert(!mobileAuthTsx.includes('REGISTERED_CLINIC_STAFF'), 'mobile AuthScreen must not contain REGISTERED_CLINIC_STAFF');
assert(!mobileAuthTsx.includes('STAFF_DIRECTORY'), 'mobile AuthScreen must not import STAFF_DIRECTORY');

// 3. Check web AuthPage source
const webAuthTsx = fs.readFileSync(path.resolve(__dirname, '../web/src/pages/Auth/AuthPage.tsx'), 'utf8');
assert(!webAuthTsx.includes('REGISTERED_CLINIC_STAFF'), 'web AuthPage must not contain REGISTERED_CLINIC_STAFF');
assert(!webAuthTsx.includes('STAFF_DIRECTORY'), 'web AuthPage must not import STAFF_DIRECTORY');

// 4. Test compiled JS resolver
const { resolveStrictAuth } = require('../packages/shared/dist/auth/authMaster.js');

// Reception desk numbers must resolve strictly to reception
const kphbRec = resolveStrictAuth('9030176176');
assert.strictEqual(kphbRec.role, 'reception');
assert.strictEqual(kphbRec.branchId, 'kphb');

const dsnRec = resolveStrictAuth('9804176176');
assert.strictEqual(dsnRec.role, 'reception');
assert.strictEqual(dsnRec.branchId, 'dilshuknagar');
assert.strictEqual(dsnRec.userName, 'Dilshuknagar Reception');

// Doctors must resolve strictly to doctor
const docPrashanth = resolveStrictAuth('8125260176');
assert.strictEqual(docPrashanth.role, 'doctor');
assert.strictEqual(docPrashanth.userName, 'Dr. Prashanth K Vaidya');

const docRamakrishna = resolveStrictAuth('1111111111');
assert.strictEqual(docRamakrishna.role, 'doctor');
assert.strictEqual(docRamakrishna.userName, 'Dr. Ramakrishna Chanduri');

// Regular staff numbers must return NULL from strict resolver so they are checked against Firestore DB!
const aishwarya = resolveStrictAuth('7995532759');
assert.strictEqual(aishwarya, null, 'Regular staff numbers must return null to trigger Firestore database lookup');

const salman = resolveStrictAuth('7842836959');
assert.strictEqual(salman, null, 'Regular staff numbers must return null to trigger Firestore database lookup');

// Random unregistered numbers must return NULL
const randomNum = resolveStrictAuth('9123456789');
assert.strictEqual(randomNum, null, 'Random numbers must return null');

const fakeNum = resolveStrictAuth('9999999999');
assert.strictEqual(fakeNum, null, 'Fake numbers must return null');

console.log('✓ All 100% Database-Driven Staff Auth Checks Passed Successfully!');

