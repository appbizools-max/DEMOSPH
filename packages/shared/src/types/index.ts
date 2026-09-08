export type UserRole = 'admin' | 'doctor' | 'reception' | 'staff' | 'hr' | 'patient';

export interface Branch {
  id: string;
  name: string;
  phone: string;
  formattedPhone: string;
  receptionistRole: 'reception';
}

// Officially Authorized 4 SPH Receptionist Branches
export const SPH_OFFICIAL_BRANCHES: Record<string, Branch> = {
  kphb: {
    id: 'kphb',
    name: 'KPHB Branch',
    phone: '9030176176',
    formattedPhone: '+91 90301 76176',
    receptionistRole: 'reception',
  },
  nallagandla: {
    id: 'nallagandla',
    name: 'Nallagandla Branch',
    phone: '9132176176',
    formattedPhone: '+91 91321 76176',
    receptionistRole: 'reception',
  },
  dilshuknagar: {
    id: 'dilshuknagar',
    name: 'Dilshuknagar Branch',
    phone: '9804176176',
    formattedPhone: '+91 98041 76176',
    receptionistRole: 'reception',
  },
  chandanagar: {
    id: 'chandanagar',
    name: 'Chandanagar Branch',
    phone: '9553176176',
    formattedPhone: '+91 95531 76176',
    receptionistRole: 'reception',
  },
};

export interface UserProfile {
  uid: string;
  email: string;
  displayName?: string;
  phone?: string;
  role: UserRole;
  branchId?: string;
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
