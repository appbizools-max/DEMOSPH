// Test getInstantMobileAuthData for all clinic numbers
const AUTHORIZED_RECEPTION_BRANCHES = {
  '9030176176': { name: 'KPHB', phone: '9030176176' },
  '9132176176': { name: 'Nallagandla', phone: '9132176176' },
  '9804176176': { name: 'Dilshuknagar', phone: '9804176176' },
  '9553176176': { name: 'Chandanagar', phone: '9553176176' },
};

const REGISTERED_CLINIC_STAFF = [
  { id: '1', name: 'Anil Kumar M', role: 'Front Desk & Operations', branch: 'KPHB', phone: '9030176176' },
  { id: '2', name: 'Ashwini Begari', role: 'Clinic Coordinator', branch: 'Chandanagar', phone: '9553176176' },
  { id: '3', name: 'Vaishnavi Peri', role: 'Patient Care & Followup', branch: 'Nallagandla', phone: '9132176176' },
  { id: '4', name: 'Nandini Gottelli', role: 'Pharmacy & Billing', branch: 'Dilshuknagar', phone: '9804176176' },
  { id: '5', name: 'Srikanth', role: 'Support Assistant', branch: 'KPHB', phone: '9030176176' },
  { id: '6', name: 'Arun Kumar', role: 'Lab & General Support', branch: 'Nallagandla', phone: '9132176176' },
  { id: '7', name: 'Aishwarya . M', role: 'Front Desk & Operations', branch: 'KPHB', phone: '7995532759' },
  { id: '8', name: 'Ashwini Begari', role: 'Clinic Coordinator', branch: 'Chandanagar', phone: '6302121265' },
  { id: '9', name: 'Anil Kumar M', role: 'Front Desk & Operations', branch: 'KPHB', phone: '7338260802' },
  { id: '10', name: 'R. Srikanth', role: 'Support Assistant', branch: 'Chandanagar', phone: '8125384387' },
  { id: '11', name: 'Vaishnavi Peri', role: 'Patient Care', branch: 'Nallagandla', phone: '9866569895' },
  { id: '12', name: 'Nandini Gottelli', role: 'Pharmacy & Billing', branch: 'Dilshuknagar', phone: '9652180003' },
  { id: '13', name: 'Arun Kumar', role: 'Lab & Support', branch: 'Nallagandla', phone: '9347808298' },
  { id: '14', name: 'Preetham Ram', role: 'Regular Staff', branch: 'KPHB', phone: '8374062188' },
  { id: '15', name: 'Salman', role: 'Regular Staff', branch: 'Nallagandla', phone: '7842836959' },
];

function getInstantMobileAuthData(input, loginMethod = 'otp') {
  const cleanInput = (input || '').trim();
  const digits = cleanInput.replace(/\D/g, '');
  const clean10 = digits.length > 10 ? digits.slice(-10) : digits;
  const lower = cleanInput.toLowerCase();

  // 1. Receptionist Desk Phones
  for (const [recPhone, recInfo] of Object.entries(AUTHORIZED_RECEPTION_BRANCHES)) {
    if (clean10 === recPhone || digits.endsWith(recPhone) || (lower && lower.includes(recInfo.name.toLowerCase()))) {
      return {
        role: 'reception',
        userName: `${recInfo.name} Reception`,
        branchId: recPhone,
        branchName: `${recInfo.name} Branch`,
        branchPhone: `+91 ${recPhone}`
      };
    }
  }

  // 2. Doctor Phones
  if (digits.includes('8125260176') || lower.includes('prashanth')) {
    return { role: 'doctor', userName: 'Dr. Prashanth K Vaidya' };
  }
  if (digits.includes('9903119766') || lower.includes('jobedah')) {
    return { role: 'doctor', userName: 'Dr. Jobedah Parveez' };
  }
  if (digits.includes('9490808582') || lower.includes('padma')) {
    return { role: 'doctor', userName: 'Dr. Padma Priya' };
  }
  if (digits.includes('1111111111') || lower.includes('chanduri')) {
    return { role: 'doctor', userName: 'Dr. Ramakrishna Chanduri' };
  }

  // 3. Registered Staff
  for (const s of REGISTERED_CLINIC_STAFF) {
    if ((clean10 && s.phone === clean10) || (lower && s.name.toLowerCase().includes(lower))) {
      return {
        role: 'staff',
        userName: s.name
      };
    }
  }

  // 4. Default / Fallback
  return {
    role: loginMethod === 'staff' ? 'staff' : (lower.includes('doc') ? 'doctor' : 'reception'),
    userName: 'Fallback'
  };
}

console.log('9030176176 (KPHB):', getInstantMobileAuthData('9030176176', 'otp'));
console.log('8125260176 (Dr Prashanth):', getInstantMobileAuthData('8125260176', 'otp'));
console.log('7338260802 (Anil staff):', getInstantMobileAuthData('7338260802', 'otp'));
console.log('9999999999 (random):', getInstantMobileAuthData('9999999999', 'otp'));
