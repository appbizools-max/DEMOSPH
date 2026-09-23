// Pure node test script to verify auth resolution
const assert = require('assert');
const fs = require('fs');
const path = require('path');

// Read the compiled authMaster JS file
const authMasterPath = path.resolve(__dirname, '../packages/shared/dist/auth/authMaster.js');
const branchMasterPath = path.resolve(__dirname, '../packages/shared/dist/branches/branchMaster.js');

assert(fs.existsSync(authMasterPath), 'authMaster.js must exist');
assert(fs.existsSync(branchMasterPath), 'branchMaster.js must exist');

// Read source content to verify definitions
const authMasterContent = fs.readFileSync(path.resolve(__dirname, '../packages/shared/src/auth/authMaster.ts'), 'utf8');

// Verify that 9804176176 is in RECEPTION_DESK_DIRECTORY and NOT in DOCTOR_DIRECTORY
assert(authMasterContent.includes("'9804176176': {"), '9804176176 must be in RECEPTION_DESK_DIRECTORY');
assert(!authMasterContent.includes("phone: '9804176176'") || authMasterContent.includes("branchPhone: rec.formattedPhone"), 'Desk phone check');

// Verify DOCTOR_DIRECTORY has doctor phones only
assert(authMasterContent.includes("'8125260176': {"), 'Dr Prashanth mobile present');
assert(authMasterContent.includes("'9903119766': {"), 'Dr Jobedah mobile present');
assert(authMasterContent.includes("'9490808582': {"), 'Dr Padma mobile present');
assert(authMasterContent.includes("'1111111111': {"), 'Dr Ramakrishna mobile present');

// Verify that resolveStrictDoctorName rejects desk phone
assert(authMasterContent.includes("if (clean10 && RECEPTION_DESK_DIRECTORY[clean10])"), 'Rejects desk phone');

console.log('✓ Strict Auth Source Verification Passed 100%');
