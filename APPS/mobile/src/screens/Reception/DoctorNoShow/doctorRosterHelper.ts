export interface DoctorDaySchedule {
  isAvailable: boolean;
  timings: string;
}

export interface DoctorBranchRoster {
  branchKey: 'kphb' | 'nalla' | 'dsnr' | 'chanda';
  branchName: string;
  schedule: {
    Sun?: DoctorDaySchedule;
    Mon?: DoctorDaySchedule;
    Tue?: DoctorDaySchedule;
    Wed?: DoctorDaySchedule;
    Thu?: DoctorDaySchedule;
    Fri?: DoctorDaySchedule;
    Sat?: DoctorDaySchedule;
  };
}

export interface DoctorRosterItem {
  id: string;
  name: string;
  phone: string;
  role: string;
  branches: DoctorBranchRoster[];
}

export interface DoctorNoShowOverride {
  id: string;
  doctorId: string;
  doctorName: string;
  branchName: string;
  type: 'date' | 'date_range' | 'session' | 'time_range';
  date?: string;
  startDate?: string;
  endDate?: string;
  session?: 'morning' | 'evening';
  startTime?: string;
  endTime?: string;
  reason: string;
  createdAt: string;
}

export const MASTER_DOCTORS_ROSTER: DoctorRosterItem[] = [
  {
    id: 'DOC-1',
    name: 'Dr. Prashanth K Vaidya',
    phone: '8125260176',
    role: 'Homeopathy Physician',
    branches: [
      {
        branchKey: 'kphb',
        branchName: 'KPHB Branch',
        schedule: {
          Mon: { isAvailable: true, timings: '12:30 PM - 02:00 PM, 05:00 PM - 07:00 PM' },
          Tue: { isAvailable: false, timings: 'Closed' },
          Wed: { isAvailable: true, timings: '12:30 PM - 02:00 PM, 05:00 PM - 07:00 PM' },
          Thu: { isAvailable: false, timings: 'Closed' },
          Fri: { isAvailable: true, timings: '12:30 PM - 02:00 PM, 05:00 PM - 07:00 PM' },
          Sat: { isAvailable: true, timings: '12:30 PM - 02:00 PM, 05:00 PM - 07:00 PM' },
          Sun: { isAvailable: false, timings: 'Closed' }
        }
      },
      {
        branchKey: 'chanda',
        branchName: 'Chandanagar Branch',
        schedule: {
          Mon: { isAvailable: true, timings: '10:00 AM - 12:00 PM, 08:00 PM - 10:30 PM' },
          Tue: { isAvailable: false, timings: 'Closed' },
          Wed: { isAvailable: true, timings: '10:00 AM - 12:00 PM, 08:00 PM - 10:30 PM' },
          Thu: { isAvailable: false, timings: 'Closed' },
          Fri: { isAvailable: true, timings: '10:00 AM - 12:00 PM, 08:00 PM - 10:30 PM' },
          Sat: { isAvailable: true, timings: '10:00 AM - 12:00 PM, 08:00 PM - 10:30 PM' },
          Sun: { isAvailable: true, timings: '11:00 AM - 01:00 PM' }
        }
      },
      {
        branchKey: 'nalla',
        branchName: 'Nallagandla Branch',
        schedule: {
          Mon: { isAvailable: false, timings: 'Closed' },
          Tue: { isAvailable: false, timings: 'Closed' },
          Wed: { isAvailable: false, timings: 'Closed' },
          Thu: { isAvailable: true, timings: '11:00 AM - 02:00 PM, 06:00 PM - 10:00 PM' },
          Fri: { isAvailable: false, timings: 'Closed' },
          Sat: { isAvailable: false, timings: 'Closed' },
          Sun: { isAvailable: true, timings: '06:00 PM - 11:00 PM' }
        }
      }
    ]
  },
  {
    id: 'DOC-2',
    name: 'Dr. Ramakrishna Chanduri',
    phone: '9804176176',
    role: 'Homeopathy Physician',
    branches: [
      {
        branchKey: 'dsnr',
        branchName: 'Dilshuknagar Branch',
        schedule: {
          Mon: { isAvailable: true, timings: '10:00 AM - 02:00 PM, 05:00 PM - 09:00 PM' },
          Tue: { isAvailable: true, timings: '10:00 AM - 02:00 PM, 05:00 PM - 09:00 PM' },
          Wed: { isAvailable: true, timings: '10:00 AM - 02:00 PM, 05:00 PM - 09:00 PM' },
          Thu: { isAvailable: true, timings: '10:00 AM - 02:00 PM, 05:00 PM - 09:00 PM' },
          Fri: { isAvailable: false, timings: 'Closed' },
          Sat: { isAvailable: false, timings: 'Closed' },
          Sun: { isAvailable: true, timings: '10:00 AM - 02:00 PM, 05:00 PM - 09:00 PM' }
        }
      },
      {
        branchKey: 'nalla',
        branchName: 'Nallagandla Branch',
        schedule: {
          Mon: { isAvailable: false, timings: 'Closed' },
          Tue: { isAvailable: false, timings: 'Closed' },
          Wed: { isAvailable: false, timings: 'Closed' },
          Thu: { isAvailable: false, timings: 'Closed' },
          Fri: { isAvailable: true, timings: '10:30 AM - 02:30 PM, 05:00 PM - 09:00 PM' },
          Sat: { isAvailable: true, timings: '10:30 AM - 02:30 PM, 05:00 PM - 09:00 PM' },
          Sun: { isAvailable: false, timings: 'Closed' }
        }
      }
    ]
  },
  {
    id: 'DOC-3',
    name: 'Dr. Jobedah Parveez',
    phone: '9903119766',
    role: 'Homeopathy Physician',
    branches: [
      {
        branchKey: 'kphb',
        branchName: 'KPHB Branch',
        schedule: {
          Mon: { isAvailable: false, timings: 'Closed' },
          Tue: { isAvailable: true, timings: '12:30 PM - 02:00 PM' },
          Wed: { isAvailable: true, timings: '12:30 PM - 02:00 PM' },
          Thu: { isAvailable: false, timings: 'Closed' },
          Fri: { isAvailable: true, timings: '12:30 PM - 02:00 PM' },
          Sat: { isAvailable: true, timings: '12:30 PM - 02:00 PM, 05:00 PM - 07:00 PM' },
          Sun: { isAvailable: false, timings: 'Closed' }
        }
      },
      {
        branchKey: 'nalla',
        branchName: 'Nallagandla Branch',
        schedule: {
          Mon: { isAvailable: true, timings: '11:00 AM - 01:00 PM, 06:00 PM - 07:30 PM' },
          Tue: { isAvailable: false, timings: 'Closed' },
          Wed: { isAvailable: false, timings: 'Closed' },
          Thu: { isAvailable: false, timings: 'Closed' },
          Fri: { isAvailable: false, timings: 'Closed' },
          Sat: { isAvailable: false, timings: 'Closed' },
          Sun: { isAvailable: false, timings: 'Closed' }
        }
      }
    ]
  },
  {
    id: 'DOC-4',
    name: 'Dr. Padma Priya',
    phone: '9490808582',
    role: 'Homeopathy Physician',
    branches: [
      {
        branchKey: 'nalla',
        branchName: 'Nallagandla Branch',
        schedule: {
          Mon: { isAvailable: false, timings: 'Closed' },
          Tue: { isAvailable: true, timings: '10:00 AM - 08:00 PM' },
          Wed: { isAvailable: true, timings: '10:00 AM - 08:00 PM' },
          Thu: { isAvailable: false, timings: 'Closed' },
          Fri: { isAvailable: false, timings: 'Closed' },
          Sat: { isAvailable: false, timings: 'Closed' },
          Sun: { isAvailable: true, timings: '10:00 AM - 05:00 PM' }
        }
      },
      {
        branchKey: 'chanda',
        branchName: 'Chandanagar Branch',
        schedule: {
          Mon: { isAvailable: true, timings: '12:00 PM - 08:00 PM' },
          Tue: { isAvailable: false, timings: 'Closed' },
          Wed: { isAvailable: false, timings: 'Closed' },
          Thu: { isAvailable: true, timings: '10:00 AM - 08:00 PM' },
          Fri: { isAvailable: true, timings: '12:00 PM - 08:00 PM' },
          Sat: { isAvailable: false, timings: 'Closed' },
          Sun: { isAvailable: true, timings: '05:30 PM - 08:00 PM' }
        }
      }
    ]
  }
];

export const normalizeBranchKey = (str?: string): 'kphb' | 'nalla' | 'dsnr' | 'chanda' | 'all' => {
  if (!str) return 'kphb';
  const lower = str.toLowerCase();
  if (lower === 'all' || lower.includes('all branch')) return 'all';
  if (lower.includes('kphb') || lower.includes('kukatpally')) return 'kphb';
  if (lower.includes('nalla') || lower.includes('nallagandla')) return 'nalla';
  if (lower.includes('dilshuk') || lower.includes('dilsukh') || lower.includes('dsnr') || lower.includes('dshnr')) return 'dsnr';
  if (lower.includes('chanda') || lower.includes('chandanagar') || lower.includes('chnr')) return 'chanda';
  return 'kphb';
};

export const getCanonicalBranchName = (str?: string): string => {
  const key = normalizeBranchKey(str);
  if (key === 'kphb') return 'KPHB Branch';
  if (key === 'nalla') return 'Nallagandla Branch';
  if (key === 'dsnr') return 'Dilshuknagar Branch';
  if (key === 'chanda') return 'Chandanagar Branch';
  return str || 'KPHB Branch';
};

export const getCanonicalDoctorName = (rawName?: string): string => {
  if (!rawName) return 'Dr. Prashanth K Vaidya';
  const lower = String(rawName).toLowerCase();
  if (lower.includes('prashanth') || lower.includes('vaidya')) return 'Dr. Prashanth K Vaidya';
  if (lower.includes('ramakrishna') || lower.includes('rama krishna') || lower.includes('chanduri')) return 'Dr. Ramakrishna Chanduri';
  if (lower.includes('jobedah') || lower.includes('jobeadh') || lower.includes('parveez') || lower.includes('parveej')) return 'Dr. Jobedah Parveez';
  if (lower.includes('padma') || lower.includes('priya')) return 'Dr. Padma Priya';
  return rawName.trim();
};

export const normalizeToISODate = (dateStr: string): string => {
  if (!dateStr) return '';
  const trimmed = dateStr.trim();
  const delimiter = trimmed.includes('-') ? '-' : (trimmed.includes('/') ? '/' : '');
  if (!delimiter) return trimmed;

  const parts = trimmed.split(delimiter);
  if (parts.length === 3) {
    if (parts[0].length === 4) {
      // YYYY-MM-DD
      return `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
    } else if (parts[2].length === 4) {
      // DD-MM-YYYY
      return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
    }
  }
  return trimmed;
};

export const parseTimeToMinutes = (timeStr: string): number => {
  if (!timeStr) return 0;
  const clean = timeStr.trim().toUpperCase();
  const isPM = clean.includes('PM');
  const isAM = clean.includes('AM');
  const numPart = clean.replace(/[^\d:]/g, '');
  const parts = numPart.split(':');
  let h = parseInt(parts[0], 10) || 0;
  const m = parseInt(parts[1], 10) || 0;
  if (isPM && h < 12) h += 12;
  if (isAM && h === 12) h = 0;
  return h * 60 + m;
};

export const getDayNameFromDate = (dateStr: string): 'Sun' | 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri' | 'Sat' => {
  if (!dateStr) return 'Mon';
  const iso = normalizeToISODate(dateStr);
  const parts = iso.split('-');
  if (parts.length === 3) {
    const y = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10) - 1;
    const d = parseInt(parts[2], 10);
    const dateObj = new Date(y, m, d);
    const days: ('Sun' | 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri' | 'Sat')[] = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    return isNaN(dateObj.getTime()) ? 'Mon' : days[dateObj.getDay()];
  }
  return 'Mon';
};

export const getDoctorsForBranch = (branchName: string): DoctorRosterItem[] => {
  const key = normalizeBranchKey(branchName);
  if (key === 'all') return MASTER_DOCTORS_ROSTER;
  return MASTER_DOCTORS_ROSTER.filter(doc =>
    doc.branches.some(b => b.branchKey === key)
  );
};

export const getDoctorScheduleOnDate = (
  doctor: DoctorRosterItem,
  branchName: string,
  dateStr: string
): { isScheduled: boolean; timings: string; dayName: 'Sun' | 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri' | 'Sat' } => {
  const dayName = getDayNameFromDate(dateStr);
  const key = normalizeBranchKey(branchName);
  const branchRoster = doctor.branches.find(b => b.branchKey === key);
  if (!branchRoster) {
    return { isScheduled: false, timings: 'Not assigned to this branch', dayName };
  }
  const daySchedule = branchRoster.schedule[dayName];
  if (daySchedule && daySchedule.isAvailable) {
    return { isScheduled: true, timings: daySchedule.timings, dayName };
  }
  return { isScheduled: false, timings: `Not scheduled on ${dayName}`, dayName };
};

export const getScheduledDoctorsForBranchAndDate = (
  branchName: string,
  dateStr: string
): { doctor: DoctorRosterItem; timings: string; dayName: string }[] => {
  const branchDoctors = getDoctorsForBranch(branchName);
  return branchDoctors
    .map(doc => {
      const sched = getDoctorScheduleOnDate(doc, branchName, dateStr);
      return { doctor: doc, timings: sched.timings, dayName: sched.dayName, isScheduled: sched.isScheduled };
    })
    .filter(item => item.isScheduled);
};

export const getWorkingDaysSummary = (doctor: DoctorRosterItem, branchName: string): string => {
  const key = normalizeBranchKey(branchName);
  const branchRoster = doctor.branches.find(b => b.branchKey === key);
  if (!branchRoster) return 'No shifts at this branch';
  const days: ('Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri' | 'Sat' | 'Sun')[] = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const workingDays = days.filter(d => branchRoster.schedule[d]?.isAvailable);
  return workingDays.length > 0 ? workingDays.join(', ') : 'No scheduled days';
};

// Check if a No-Show override applies to a specific appointment query
export const isDoctorNoShowMatch = (
  override: DoctorNoShowOverride,
  doctorName: string,
  branchName: string,
  dateStr: string
): boolean => {
  if (!override || !doctorName) return false;

  // 1. Doctor match
  const canonOverrideDoc = getCanonicalDoctorName(override.doctorName);
  const canonSelectedDoc = getCanonicalDoctorName(doctorName);
  if (canonOverrideDoc !== canonSelectedDoc) return false;

  // 2. Branch match
  if (override.branchName !== 'All Branches') {
    const overrideBranchKey = normalizeBranchKey(override.branchName);
    const targetBranchKey = normalizeBranchKey(branchName);
    if (overrideBranchKey !== targetBranchKey) return false;
  }

  // 3. Date match
  const targetISO = normalizeToISODate(dateStr);
  if (!targetISO) return false;

  if (override.type === 'date_range') {
    const startISO = normalizeToISODate(override.startDate || '');
    const endISO = normalizeToISODate(override.endDate || '');
    if (!startISO || !endISO) return false;
    return targetISO >= startISO && targetISO <= endISO;
  } else {
    const overrideISO = normalizeToISODate(override.date || '');
    return overrideISO === targetISO;
  }
};

// Find the active override for a doctor, branch, and date
export const getActiveDoctorNoShow = (
  overridesList: DoctorNoShowOverride[],
  doctorName: string,
  branchName: string,
  dateStr: string
): DoctorNoShowOverride | undefined => {
  return overridesList.find(o => isDoctorNoShowMatch(o, doctorName, branchName, dateStr));
};

// Filter out slots blocked by an active No-Show override
export const filterSlotsByNoShow = (
  slots: string[],
  override?: DoctorNoShowOverride
): { availableSlots: string[]; blockedSlotsCount: number; statusMessage?: string } => {
  if (!override) {
    return { availableSlots: slots, blockedSlotsCount: 0 };
  }

  // Full day or date range leaves block ALL slots
  if (override.type === 'date' || override.type === 'date_range') {
    return {
      availableSlots: [],
      blockedSlotsCount: slots.length,
      statusMessage: `Doctor is on ${override.type === 'date_range' ? 'Multiple Days Leave' : 'Full Day No Show'} (${override.reason})`
    };
  }

  // Session block
  if (override.type === 'session') {
    const isMorning = override.session === 'morning';
    // Morning: before 14:00 (2:00 PM) -> totalMins < 840
    // Evening: 14:00 (2:00 PM) onwards -> totalMins >= 840
    const available = slots.filter(s => {
      const mins = parseTimeToMinutes(s);
      return isMorning ? mins >= 840 : mins < 840;
    });

    return {
      availableSlots: available,
      blockedSlotsCount: slots.length - available.length,
      statusMessage: `${isMorning ? 'Morning Session' : 'Evening Session'} is blocked by Doctor No Show (${override.reason})`
    };
  }

  // Time range block
  if (override.type === 'time_range') {
    const startMins = parseTimeToMinutes(override.startTime || '00:00');
    const endMins = parseTimeToMinutes(override.endTime || '23:59');

    const available = slots.filter(s => {
      const mins = parseTimeToMinutes(s);
      return mins < startMins || mins >= endMins;
    });

    return {
      availableSlots: available,
      blockedSlotsCount: slots.length - available.length,
      statusMessage: `Time range ${override.startTime} - ${override.endTime} is blocked by Doctor No Show (${override.reason})`
    };
  }

  return { availableSlots: slots, blockedSlotsCount: 0 };
};
