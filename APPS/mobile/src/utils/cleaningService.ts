export interface CleaningSchedule {
  id?: string;
  branch: string;
  assignedDate: string; // YYYY-MM-DD
  assignedDay?: string;
  updatedAt?: string;
  updatedBy?: string;
}

export interface CleaningSubmission {
  id?: string;
  branch: string;
  assignedDate: string; // YYYY-MM-DD of the cleaning assigned date
  submittedAt: string;
  submittedBy: string;
  photos: string[];     // 5 to 7 photos
  notes?: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  reviewedAt?: string;
  reviewedBy?: string;
  rejectReason?: string;
}

export const BRANCH_LIST = [
  'KPHB',
  'Chandanagar',
  'Nallagandla',
  'Dilshuknagar'
];

/**
 * Returns today's YYYY-MM-DD string
 */
export const getTodayDateString = (d: Date = new Date()): string => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Format YYYY-MM-DD to DD-MM-YYYY
 */
export const formatDisplayDate = (dateStr?: string): string => {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dateStr;
};

/**
 * Normalizes branch name (e.g. 'KPHB Branch' -> 'KPHB')
 */
export const normalizeBranchName = (raw?: string): string => {
  if (!raw) return 'KPHB';
  const clean = raw.replace(/\s+Branch$/i, '').trim();
  for (const b of BRANCH_LIST) {
    if (clean.toLowerCase().includes(b.toLowerCase())) return b;
  }
  return clean || 'KPHB';
};

/**
 * Determines if a branch is overdue and must be locked out based on assignedDate
 */
export const checkBranchLockoutStatus = (
  assignedDate: string = getTodayDateString(),
  submissions: CleaningSubmission[] = [],
  currentDate: Date = new Date()
): {
  isBlocked: boolean;
  currentSubmission: CleaningSubmission | null;
  assignedDate: string;
  isCleaningDateToday: boolean;
  status: 'Approved' | 'Pending' | 'Rejected' | 'Not Submitted' | 'Due Today';
  reason: string;
} => {
  const todayStr = getTodayDateString(currentDate);

  // Find latest submission matching this assignedDate, or the latest overall submission
  const matchingSubmissions = submissions
    .filter(s => s.assignedDate === assignedDate || s.submittedAt?.startsWith(assignedDate))
    .sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());

  const currentSub = matchingSubmissions.length > 0
    ? matchingSubmissions[0]
    : (submissions.length > 0 ? submissions[0] : null);

  const isCleaningDateToday = todayStr === assignedDate;
  const isPastAssignedDate = todayStr > assignedDate;

  // If approved for this assigned date
  if (currentSub?.status === 'Approved' && (currentSub.assignedDate === assignedDate || currentSub.submittedAt?.startsWith(assignedDate))) {
    return {
      isBlocked: false,
      currentSubmission: currentSub,
      assignedDate,
      isCleaningDateToday,
      status: 'Approved',
      reason: `Cleaning verified and approved by HR for ${formatDisplayDate(assignedDate)}.`
    };
  }

  // If the assigned date has passed (e.g. assigned was yesterday, today is the next day):
  if (isPastAssignedDate) {
    if (!currentSub || currentSub.assignedDate !== assignedDate) {
      return {
        isBlocked: true,
        currentSubmission: null,
        assignedDate,
        isCleaningDateToday: false,
        status: 'Not Submitted',
        reason: `Clinic cleaning was scheduled for ${formatDisplayDate(assignedDate)} and photos were not uploaded. Reception access is blocked until 5 to 7 photos are uploaded and approved by HR.`
      };
    }

    if (currentSub.status === 'Rejected') {
      return {
        isBlocked: true,
        currentSubmission: currentSub,
        assignedDate,
        isCleaningDateToday: false,
        status: 'Rejected',
        reason: `Cleaning submission for ${formatDisplayDate(assignedDate)} was rejected by HR: "${currentSub.rejectReason || 'Needs re-cleaning'}". Please upload 5 to 7 new photos to unlock.`
      };
    }

    if (currentSub.status === 'Pending') {
      return {
        isBlocked: true,
        currentSubmission: currentSub,
        assignedDate,
        isCleaningDateToday: false,
        status: 'Pending',
        reason: `Cleaning photos have been submitted and are pending HR / Admin review. Reception will unlock immediately once HR accepts.`
      };
    }
  }

  // If today IS the assigned cleaning date:
  if (isCleaningDateToday) {
    if (!currentSub || currentSub.assignedDate !== assignedDate) {
      return {
        isBlocked: false,
        currentSubmission: null,
        assignedDate,
        isCleaningDateToday: true,
        status: 'Due Today',
        reason: `Today (${formatDisplayDate(assignedDate)}) is your branch's assigned cleaning date. Please take and upload 5 to 7 clinic photos today.`
      };
    }
    if (currentSub.status === 'Pending') {
      return {
        isBlocked: false,
        currentSubmission: currentSub,
        assignedDate,
        isCleaningDateToday: true,
        status: 'Pending',
        reason: 'Cleaning photos submitted and currently awaiting HR review.'
      };
    }
    if (currentSub.status === 'Rejected') {
      return {
        isBlocked: false,
        currentSubmission: currentSub,
        assignedDate,
        isCleaningDateToday: true,
        status: 'Rejected',
        reason: `HR requested re-upload: "${currentSub.rejectReason || 'Please retake'}".`
      };
    }
  }

  // Ahead of scheduled date
  return {
    isBlocked: false,
    currentSubmission: currentSub,
    assignedDate,
    isCleaningDateToday: false,
    status: currentSub ? currentSub.status : 'Not Submitted',
    reason: `Scheduled for ${formatDisplayDate(assignedDate)}.`
  };
};
