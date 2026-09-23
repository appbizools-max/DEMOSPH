const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, query, limit } = require('firebase/firestore');

const firebaseConfig = {
  apiKey: "AIzaSyAohSNLyeS6bYtnk2QvB4HGo0LbHDw9b6Q",
  authDomain: "spiritual-homeopathy-3b552.firebaseapp.com",
  projectId: "spiritual-homeopathy-3b552",
  storageBucket: "spiritual-homeopathy-3b552.firebasestorage.app",
  messagingSenderId: "81822616559",
  appId: "1:81822616559:web:98a0b9cd974938cc87841a"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

function resolveCanonicalBranchId(val) {
  if (!val || typeof val !== 'string') return null;
  const l = val.toLowerCase().trim();
  if (l.includes('kphb') || l.includes('kpb')) return 'kphb';
  if (l.includes('chanda') || l.includes('chn')) return 'chandanagar';
  if (l.includes('dilshuk') || l.includes('dsn') || l.includes('dsnr')) return 'dilshuknagar';
  if (l.includes('nalla') || l.includes('ngl')) return 'nallagandla';
  return null;
}

function formatISO(rawDate) {
  if (!rawDate) return '';
  const clean = String(rawDate).trim();
  if (clean.includes('T')) return clean.split('T')[0];
  if (clean.includes('/') || (clean.includes('-') && clean.split('-')[0].length <= 2)) {
    const parts = clean.split(/[\/\-]/);
    if (parts.length === 3) {
      let dd = parts[0].padStart(2, '0');
      let mm = parts[1].padStart(2, '0');
      let yyyy = parts[2];
      if (parts[0].length === 4) {
        yyyy = parts[0];
        mm = parts[1].padStart(2, '0');
        dd = parts[2].padStart(2, '0');
      }
      return `${yyyy}-${mm}-${dd}`;
    }
  }
  return clean;
}

async function detailedAnalysis() {
  const followupsSnap = await getDocs(collection(db, 'followups'));
  const allFollowups = [];
  followupsSnap.forEach(d => allFollowups.push({ id: d.id, ...d.data() }));

  const apptsSnap = await getDocs(query(collection(db, 'appointments'), limit(400)));
  const allAppts = [];
  apptsSnap.forEach(d => allAppts.push({ id: d.id, ...d.data() }));

  const allPatientsSnap = await getDocs(query(collection(db, 'allpatients'), limit(400)));
  const allPatients = [];
  allPatientsSnap.forEach(d => allPatients.push({ id: d.id, ...d.data() }));

  console.log(`Followups: ${allFollowups.length}, Appointments: ${allAppts.length}, AllPatients: ${allPatients.length}`);

  // Let's check how many followups have branch matching KPHB:
  const kphbFollowups = allFollowups.filter(f => {
    const b = resolveCanonicalBranchId(f.branchId || f.branch || f.branchName || f.assignedBranch || f.regId || f.registrationId);
    return b === 'kphb';
  });
  console.log(`KPHB followups collection: ${kphbFollowups.length}`);

  const kphbAppts = allAppts.filter(f => {
    const b = resolveCanonicalBranchId(f.branchId || f.branch || f.branchName || f.assignedBranch || f.regId || f.registrationId);
    return b === 'kphb';
  });
  console.log(`KPHB appointments: ${kphbAppts.length}`);

  const kphbAllPatients = allPatients.filter(f => {
    const b = resolveCanonicalBranchId(f.branchId || f.branch || f.branchName || f.assignedBranch || f.regId || f.registrationId);
    return b === 'kphb';
  });
  console.log(`KPHB allpatients: ${kphbAllPatients.length}`);

  // Let's run WEB logic with the active appointments check:
  const now = new Date();
  const todayISO = now.toISOString().split('T')[0];
  const thisMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const nextMonthDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const nextMonthStr = `${nextMonthDate.getFullYear()}-${String(nextMonthDate.getMonth() + 1).padStart(2, '0')}`;

  console.log(`Dates: todayISO=${todayISO}, thisMonthStr=${thisMonthStr}, nextMonthStr=${nextMonthStr}`);

  // Active appointments in Web:
  const activeAppointmentsByPatient = new Map();
  allAppts.forEach(app => {
    const st = (app.status || '').toLowerCase();
    const isActive = st === 'waiting' || st === 'booked' || st === 'confirmed' || st === 'in_consultation' || st === 'pending';
    if (!isActive) return;
    const dateISO = formatISO(app.appointmentDate || app.date);
    const pDigits = (app.phone || app.phoneNumber || app.mobile || '').toString().replace(/\D/g, '').slice(-10);
    const rId = (app.registrationId || app.regId || '').toString().trim().toUpperCase();
    if (pDigits) {
      if (!activeAppointmentsByPatient.has(pDigits)) activeAppointmentsByPatient.set(pDigits, new Set());
      activeAppointmentsByPatient.get(pDigits).add(dateISO);
    }
  });

  console.log(`Active appointment patients count: ${activeAppointmentsByPatient.size}`);

  // Test WEB:
  const webMap = new Map();
  let webExcludedByActive = 0;
  let webExcludedByBookedCompleted = 0;
  let webExcludedByBranch = 0;

  function runWebItem(item) {
    if (!item) return;
    const itemCanonical = resolveCanonicalBranchId(item.branchId || item.branch || item.branchName || item.assignedBranch || item.regId || item.registrationId);
    if (itemCanonical !== 'kphb') {
      webExcludedByBranch++;
      return;
    }
    if (item.followUpStatus === 'booked' || item.followUpStatus === 'completed' || item.followUpBooked === true || item.isFollowUpCompleted === true || (item.status === 'booked' && !item.appointmentTime)) {
      webExcludedByBookedCompleted++;
      return;
    }
    const phone = (item.phone || item.phoneNumber || item.mobile || item.contact || '').toString().trim();
    const pName = (item.patientName || item.fullName || item.name || item.patient || '').toString().trim();
    if (!pName && !phone) return;
    const cleanDigits = phone.replace(/\D/g, '').slice(-10);
    const rawReg = (item.regId || item.registrationId || '').toString().trim();
    const key = cleanDigits ? cleanDigits : `${pName.toLowerCase()}_${rawReg}`;

    const prefDateRaw = item.preferredFollowUpDate || item.followUpDate || item.nextFollowUpDate || item.scheduledDate;
    if (!prefDateRaw) return;
    const formattedPrefDate = formatISO(prefDateRaw);
    if (!formattedPrefDate) return;

    const patientApptDates = cleanDigits ? activeAppointmentsByPatient.get(cleanDigits) : undefined;
    if (patientApptDates) {
      if (patientApptDates.has(formattedPrefDate)) {
        webExcludedByActive++;
        return;
      }
      for (const d of patientApptDates) {
        if (d >= todayISO && formattedPrefDate <= todayISO) {
          webExcludedByActive++;
          return;
        }
      }
    }

    const curTimestamp = new Date(item.updatedAt || item.createdAt || item.savedAt || 0).getTime();
    if (!webMap.has(key)) {
      webMap.set(key, { preferredDate: formattedPrefDate, timestamp: curTimestamp });
    } else {
      if (curTimestamp > webMap.get(key).timestamp) {
        webMap.set(key, { preferredDate: formattedPrefDate, timestamp: curTimestamp });
      }
    }
  }

  allFollowups.forEach(runWebItem);
  allAppts.forEach(runWebItem);
  allPatients.forEach(runWebItem);

  console.log(`WEB result size: ${webMap.size}`);
  console.log(`WEB Exclusions: Branch=${webExcludedByBranch}, Booked/Completed=${webExcludedByBookedCompleted}, ActiveAppt=${webExcludedByActive}`);

  // Tab stats for Web:
  let wToday = 0, wOverdue = 0, wThisMonth = 0, wNextMonth = 0;
  for (const item of webMap.values()) {
    if (item.preferredDate === todayISO) wToday++;
    if (item.preferredDate < todayISO) wOverdue++;
    if (item.preferredDate.startsWith(thisMonthStr)) wThisMonth++;
    if (item.preferredDate.startsWith(nextMonthStr)) wNextMonth++;
  }
  console.log(`WEB Stats: Today=${wToday}, Overdue=${wOverdue}, ThisMonth=${wThisMonth}, NextMonth=${wNextMonth}, Total=${webMap.size}`);

  process.exit(0);
}

detailedAnalysis().catch(console.error);
