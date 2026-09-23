import { CanonicalBranchId, BranchRegistrationCode } from '../branches/branchMaster';

export type UserRole = 'admin' | 'doctor' | 'reception' | 'staff' | 'hr' | 'patient';

export interface Branch {
  id: CanonicalBranchId | string;
  name: string;
  phone: string;
  formattedPhone: string;
  receptionistRole: 'reception';
  registrationCode?: BranchRegistrationCode;
}

// Officially Authorized 4 SPH Receptionist Branches
export const SPH_OFFICIAL_BRANCHES: Record<CanonicalBranchId, Branch> = {
  kphb: {
    id: 'kphb',
    name: 'KPHB Branch',
    phone: '9030176176',
    formattedPhone: '+91 90301 76176',
    receptionistRole: 'reception',
    registrationCode: 'KPB',
  },
  nallagandla: {
    id: 'nallagandla',
    name: 'Nallagandla Branch',
    phone: '9132176176',
    formattedPhone: '+91 91321 76176',
    receptionistRole: 'reception',
    registrationCode: 'NGL',
  },
  dilshuknagar: {
    id: 'dilshuknagar',
    name: 'Dilshuknagar Branch',
    phone: '9804176176',
    formattedPhone: '+91 98041 76176',
    receptionistRole: 'reception',
    registrationCode: 'DIL',
  },
  chandanagar: {
    id: 'chandanagar',
    name: 'Chandanagar Branch',
    phone: '9553176176',
    formattedPhone: '+91 95531 76176',
    receptionistRole: 'reception',
    registrationCode: 'CHN',
  },
};

export interface AuthUserSession {
  uid?: string;
  role: UserRole;
  userName?: string;
  branchId: CanonicalBranchId;
  branchName: string;
  branchPhone: string;
  staffId?: string;
}

export interface UserProfile {
  uid: string;
  email: string;
  displayName?: string;
  phone?: string;
  role: UserRole;
  branchId?: CanonicalBranchId | string;
  photoURL?: string;
  createdAt: string;
}

export interface Remedy {
  id?: string;
  name: string;
  latinName?: string;
  category: 'Spiritual' | 'Acute' | 'Chronic' | 'General';
  symptoms: string[];
  potencyOptions: string[];
  description: string;
  spiritualInsight?: string;
  dosageInstructions?: string;
  stockCount?: number;
  imageUrl?: string;
}

export interface ConsultationAppointment {
  id?: string;
  userId: string;
  userName: string;
  doctorName: string;
  appointmentDate: string;
  appointmentTime: string;
  consultationType: 'Spiritual Consultation' | 'Homeopathic Remedy' | 'Holistic Healing';
  status: 'scheduled' | 'checked_in' | 'in_progress' | 'completed' | 'cancelled';
  notes?: string;
  prescription?: string;
  createdAt?: any;
}

export interface StaffShift {
  id?: string;
  staffName: string;
  role: UserRole;
  shiftDate: string;
  startTime: string;
  endTime: string;
  status: 'scheduled' | 'completed' | 'absent';
}

export interface FirebaseConfigOptions {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
  measurementId?: string;
}

export interface StaffAttendanceRecord {
  id?: string;
  staffId: string;
  staffName: string;
  role?: string;
  branch: string;
  date: string;
  punchInTime: string;
  punchInLocation?: {
    latitude: number;
    longitude: number;
    address?: string;
  };
  punchInPhoto?: string;
  punchOutTime?: string;
  punchOutLocation?: {
    latitude: number;
    longitude: number;
    address?: string;
  };
  workingHours?: string;
  status: 'Present' | 'Half Day' | 'Late' | 'Completed';
  createdAt?: string;
  updatedAt?: string;
}

export interface StaffLeaveRequest {
  id?: string;
  staffId: string;
  staffName: string;
  branch: string;
  leaveType: 'Casual' | 'Sick' | 'Privilege' | 'Emergency' | 'Half Day';
  fromDate: string;
  toDate: string;
  daysCount: number;
  reason: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  reviewedBy?: string;
  reviewedAt?: string;
  reviewNotes?: string;
  createdAt: string;
}

export interface StaffDailyReport {
  id?: string;
  staffId: string;
  staffName: string;
  branch: string;
  date: string;
  totalCalls: number;
  followUps: number;
  contacts: number;
  gReviews: number;
  videoReviews: number;
  tasksSummary?: string;
  callsCount?: number;
  reviewsCount?: number;
  submittedAt: string;
}
