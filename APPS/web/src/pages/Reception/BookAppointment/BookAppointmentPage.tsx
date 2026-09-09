import React, { useState, useEffect, useMemo } from 'react';
import {
  Calendar as CalendarIcon, Clock, User, Phone, Mail, Stethoscope, Video,
  CheckCircle2, ChevronDown, Check, Home, Megaphone, ArrowRight, ShieldCheck, Info,
  ChevronLeft, ChevronRight, X, Building2, Lock, Search, Printer
} from 'lucide-react';
import { createDocument, db, sendBookingWhatsAppNotification } from '@app/shared';
import { collection, onSnapshot, addDoc, setDoc, deleteDoc, doc, query, where, limit, getDocs } from 'firebase/firestore';
import { generateRegistrationId, getBranchShortcut } from '../../../utils/idGenerator';

let GLOBAL_WEB_PATIENTS_CACHE: any[] = [];
let GLOBAL_WEB_ALLPATIENTS_CACHE: any[] = [];
let GLOBAL_WEB_APPTS_CACHE: any[] = [];
const WEB_PATIENTS_CACHE_KEY = '@sph_web_patients_cache_v2';
const WEB_APPTS_CACHE_KEY = '@sph_web_appts_cache_v2';

try {
  const p = localStorage.getItem(WEB_PATIENTS_CACHE_KEY);
  if (p) GLOBAL_WEB_PATIENTS_CACHE = JSON.parse(p);
  const a = localStorage.getItem(WEB_APPTS_CACHE_KEY);
  if (a) GLOBAL_WEB_APPTS_CACHE = JSON.parse(a);
} catch (e) { }
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '../../../components/ui/dropdown-menu';

interface TimeSlot {
  startHour: string;
  startMinute: string;
  startAmPm: 'AM' | 'PM';
  endHour: string;
  endMinute: string;
  endAmPm: 'AM' | 'PM';
}

type DayName = 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri' | 'Sat' | 'Sun';

interface DaySchedule {
  status: 'Available' | 'Closed';
  slots: TimeSlot[];
}

interface BranchSchedule {
  id: string;
  targetBranch: string;
  selectedDay: DayName;
  daySchedules: Record<DayName, DaySchedule>;
}

interface Doctor {
  id: string;
  name: string;
  phone: string;
  role: string;
  branch?: string;
  assignedBranch?: string;
  branchSchedules?: BranchSchedule[];
}

const DEFAULT_DOCTORS_SEED: Doctor[] = [
  {
    id: 'doc-1',
    name: 'Dr. Prashanth K Vaidya',
    phone: '8125260176',
    role: 'Homeopathy Physician',
    branchSchedules: [
      {
        id: 'bs-1-kphb',
        targetBranch: 'KPHB Branch',
        selectedDay: 'Mon',
        daySchedules: {
          Mon: { status: 'Available', slots: [{ startHour: '12', startMinute: '30', startAmPm: 'PM', endHour: '02', endMinute: '00', endAmPm: 'PM' }, { startHour: '05', startMinute: '00', startAmPm: 'PM', endHour: '07', endMinute: '00', endAmPm: 'PM' }] },
          Tue: { status: 'Closed', slots: [] },
          Wed: { status: 'Available', slots: [{ startHour: '12', startMinute: '30', startAmPm: 'PM', endHour: '02', endMinute: '00', endAmPm: 'PM' }, { startHour: '05', startMinute: '00', startAmPm: 'PM', endHour: '07', endMinute: '00', endAmPm: 'PM' }] },
          Thu: { status: 'Closed', slots: [] },
          Fri: { status: 'Available', slots: [{ startHour: '12', startMinute: '30', startAmPm: 'PM', endHour: '02', endMinute: '00', endAmPm: 'PM' }, { startHour: '05', startMinute: '00', startAmPm: 'PM', endHour: '07', endMinute: '00', endAmPm: 'PM' }] },
          Sat: { status: 'Available', slots: [{ startHour: '12', startMinute: '30', startAmPm: 'PM', endHour: '02', endMinute: '00', endAmPm: 'PM' }, { startHour: '05', startMinute: '00', startAmPm: 'PM', endHour: '07', endMinute: '00', endAmPm: 'PM' }] },
          Sun: { status: 'Closed', slots: [] }
        }
      },
      {
        id: 'bs-1-chanda',
        targetBranch: 'Chandanagar Branch',
        selectedDay: 'Mon',
        daySchedules: {
          Mon: { status: 'Available', slots: [{ startHour: '10', startMinute: '00', startAmPm: 'AM', endHour: '12', endMinute: '00', endAmPm: 'PM' }, { startHour: '08', startMinute: '00', startAmPm: 'PM', endHour: '10', endMinute: '30', endAmPm: 'PM' }] },
          Tue: { status: 'Closed', slots: [] },
          Wed: { status: 'Available', slots: [{ startHour: '10', startMinute: '00', startAmPm: 'AM', endHour: '12', endMinute: '00', endAmPm: 'PM' }, { startHour: '08', startMinute: '00', startAmPm: 'PM', endHour: '10', endMinute: '30', endAmPm: 'PM' }] },
          Thu: { status: 'Closed', slots: [] },
          Fri: { status: 'Available', slots: [{ startHour: '10', startMinute: '00', startAmPm: 'AM', endHour: '12', endMinute: '00', endAmPm: 'PM' }, { startHour: '08', startMinute: '00', startAmPm: 'PM', endHour: '10', endMinute: '30', endAmPm: 'PM' }] },
          Sat: { status: 'Available', slots: [{ startHour: '10', startMinute: '00', startAmPm: 'AM', endHour: '12', endMinute: '00', endAmPm: 'PM' }, { startHour: '08', startMinute: '00', startAmPm: 'PM', endHour: '10', endMinute: '30', endAmPm: 'PM' }] },
          Sun: { status: 'Available', slots: [{ startHour: '11', startMinute: '00', startAmPm: 'AM', endHour: '01', endMinute: '00', endAmPm: 'PM' }] }
        }
      },
      {
        id: 'bs-1-nalla',
        targetBranch: 'Nallagandla Branch',
        selectedDay: 'Thu',
        daySchedules: {
          Mon: { status: 'Closed', slots: [] },
          Tue: { status: 'Closed', slots: [] },
          Wed: { status: 'Closed', slots: [] },
          Thu: { status: 'Available', slots: [{ startHour: '11', startMinute: '00', startAmPm: 'AM', endHour: '02', endMinute: '00', endAmPm: 'PM' }, { startHour: '06', startMinute: '00', startAmPm: 'PM', endHour: '10', endMinute: '00', endAmPm: 'PM' }] },
          Fri: { status: 'Closed', slots: [] },
          Sat: { status: 'Closed', slots: [] },
          Sun: { status: 'Available', slots: [{ startHour: '06', startMinute: '00', startAmPm: 'PM', endHour: '11', endMinute: '00', endAmPm: 'PM' }] }
        }
      }
    ]
  },
  {
    id: 'doc-2',
    name: 'Dr. CH. Rama Krishna',
    phone: '9804176176',
    role: 'Homeopathy Physician',
    branchSchedules: [
      {
        id: 'bs-2-dsnr',
        targetBranch: 'Dilshuknagar Branch',
        selectedDay: 'Mon',
        daySchedules: {
          Mon: { status: 'Available', slots: [{ startHour: '10', startMinute: '00', startAmPm: 'AM', endHour: '02', endMinute: '00', endAmPm: 'PM' }, { startHour: '05', startMinute: '00', startAmPm: 'PM', endHour: '09', endMinute: '00', endAmPm: 'PM' }] },
          Tue: { status: 'Available', slots: [{ startHour: '10', startMinute: '00', startAmPm: 'AM', endHour: '02', endMinute: '00', endAmPm: 'PM' }, { startHour: '05', startMinute: '00', startAmPm: 'PM', endHour: '09', endMinute: '00', endAmPm: 'PM' }] },
          Wed: { status: 'Available', slots: [{ startHour: '10', startMinute: '00', startAmPm: 'AM', endHour: '02', endMinute: '00', endAmPm: 'PM' }, { startHour: '05', startMinute: '00', startAmPm: 'PM', endHour: '09', endMinute: '00', endAmPm: 'PM' }] },
          Thu: { status: 'Available', slots: [{ startHour: '10', startMinute: '00', startAmPm: 'AM', endHour: '02', endMinute: '00', endAmPm: 'PM' }, { startHour: '05', startMinute: '00', startAmPm: 'PM', endHour: '09', endMinute: '00', endAmPm: 'PM' }] },
          Fri: { status: 'Closed', slots: [] },
          Sat: { status: 'Closed', slots: [] },
          Sun: { status: 'Available', slots: [{ startHour: '10', startMinute: '00', startAmPm: 'AM', endHour: '02', endMinute: '00', endAmPm: 'PM' }, { startHour: '05', startMinute: '00', startAmPm: 'PM', endHour: '09', endMinute: '00', endAmPm: 'PM' }] }
        }
      },
      {
        id: 'bs-2-nalla',
        targetBranch: 'Nallagandla Branch',
        selectedDay: 'Fri',
        daySchedules: {
          Mon: { status: 'Closed', slots: [] },
          Tue: { status: 'Closed', slots: [] },
          Wed: { status: 'Closed', slots: [] },
          Thu: { status: 'Closed', slots: [] },
          Fri: { status: 'Available', slots: [{ startHour: '10', startMinute: '30', startAmPm: 'AM', endHour: '02', endMinute: '30', endAmPm: 'PM' }, { startHour: '05', startMinute: '00', startAmPm: 'PM', endHour: '09', endMinute: '00', endAmPm: 'PM' }] },
          Sat: { status: 'Available', slots: [{ startHour: '10', startMinute: '30', startAmPm: 'AM', endHour: '02', endMinute: '30', endAmPm: 'PM' }, { startHour: '05', startMinute: '00', startAmPm: 'PM', endHour: '09', endMinute: '00', endAmPm: 'PM' }] },
          Sun: { status: 'Closed', slots: [] }
        }
      }
    ]
  },
  {
    id: 'doc-3',
    name: 'Dr. Jobedah Parveez',
    phone: '9903119766',
    role: 'Homeopathy Physician',
    branchSchedules: [
      {
        id: 'bs-3-nalla',
        targetBranch: 'Nallagandla Branch',
        selectedDay: 'Mon',
        daySchedules: {
          Mon: { status: 'Available', slots: [{ startHour: '11', startMinute: '00', startAmPm: 'AM', endHour: '01', endMinute: '00', endAmPm: 'PM' }, { startHour: '06', startMinute: '00', startAmPm: 'PM', endHour: '07', endMinute: '30', endAmPm: 'PM' }] },
          Tue: { status: 'Closed', slots: [] },
          Wed: { status: 'Closed', slots: [] },
          Thu: { status: 'Closed', slots: [] },
          Fri: { status: 'Closed', slots: [] },
          Sat: { status: 'Closed', slots: [] },
          Sun: { status: 'Closed', slots: [] }
        }
      },
      {
        id: 'bs-3-kphb',
        targetBranch: 'KPHB Branch',
        selectedDay: 'Tue',
        daySchedules: {
          Mon: { status: 'Closed', slots: [] },
          Tue: { status: 'Available', slots: [{ startHour: '12', startMinute: '30', startAmPm: 'PM', endHour: '02', endMinute: '00', endAmPm: 'PM' }] },
          Wed: { status: 'Available', slots: [{ startHour: '12', startMinute: '30', startAmPm: 'PM', endHour: '02', endMinute: '00', endAmPm: 'PM' }] },
          Thu: { status: 'Closed', slots: [] },
          Fri: { status: 'Available', slots: [{ startHour: '12', startMinute: '30', startAmPm: 'PM', endHour: '02', endMinute: '00', endAmPm: 'PM' }] },
          Sat: { status: 'Available', slots: [{ startHour: '12', startMinute: '30', startAmPm: 'PM', endHour: '02', endMinute: '00', endAmPm: 'PM' }, { startHour: '05', startMinute: '00', startAmPm: 'PM', endHour: '07', endMinute: '00', endAmPm: 'PM' }] },
          Sun: { status: 'Closed', slots: [] }
        }
      }
    ]
  },
  {
    id: 'doc-4',
    name: 'Dr. Padma Priya',
    phone: '9490808582',
    role: 'Homeopathy Physician',
    branchSchedules: [
      {
        id: 'bs-4-nalla',
        targetBranch: 'Nallagandla Branch',
        selectedDay: 'Tue',
        daySchedules: {
          Mon: { status: 'Closed', slots: [] },
          Tue: { status: 'Available', slots: [{ startHour: '10', startMinute: '00', startAmPm: 'AM', endHour: '08', endMinute: '00', endAmPm: 'PM' }] },
          Wed: { status: 'Available', slots: [{ startHour: '10', startMinute: '00', startAmPm: 'AM', endHour: '08', endMinute: '00', endAmPm: 'PM' }] },
          Thu: { status: 'Closed', slots: [] },
          Fri: { status: 'Closed', slots: [] },
          Sat: { status: 'Closed', slots: [] },
          Sun: { status: 'Available', slots: [{ startHour: '10', startMinute: '00', startAmPm: 'AM', endHour: '05', endMinute: '00', endAmPm: 'PM' }] }
        }
      },
      {
        id: 'bs-4-chanda',
        targetBranch: 'Chandanagar Branch',
        selectedDay: 'Mon',
        daySchedules: {
          Mon: { status: 'Available', slots: [{ startHour: '12', startMinute: '00', startAmPm: 'PM', endHour: '08', endMinute: '00', endAmPm: 'PM' }] },
          Tue: { status: 'Closed', slots: [] },
          Wed: { status: 'Closed', slots: [] },
          Thu: { status: 'Available', slots: [{ startHour: '10', startMinute: '00', startAmPm: 'AM', endHour: '08', endMinute: '00', endAmPm: 'PM' }] },
          Fri: { status: 'Available', slots: [{ startHour: '12', startMinute: '00', startAmPm: 'PM', endHour: '08', endMinute: '00', endAmPm: 'PM' }] },
          Sat: { status: 'Closed', slots: [] },
          Sun: { status: 'Available', slots: [{ startHour: '05', startMinute: '30', startAmPm: 'PM', endHour: '08', endMinute: '00', endAmPm: 'PM' }] }
        }
      }
    ]
  }
];

interface BookAppointmentPageProps {
  currentBranch?: string;
  onNavigate?: (tab: string) => void;
}

export const BookAppointmentPage: React.FC<BookAppointmentPageProps> = ({
  currentBranch = "KPHB Branch",
  onNavigate
}) => {
  // Section 1: Patient Details
  const [patientSearchTerm, setPatientSearchTerm] = useState('');
  const [patientName, setPatientName] = useState('');
  const [diseases, setDiseases] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [emailAddress, setEmailAddress] = useState('');
  const [marketingSource, setMarketingSource] = useState('Select Source');
  const [consultationMode, setConsultationMode] = useState('In-Clinic');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [activeSearchQuery, setActiveSearchQuery] = useState('');

  // START STATE FOR PROFILE LOOKUP
  const [patientData, setPatientData] = useState({ phone: '', fullName: '', patientName: '', patientId: '', regID: '', source: '' });
  const [existingProfilesList, setExistingProfilesList] = useState<any[]>([]);
  const [checkedPhone, setCheckedPhone] = useState('');
  const [bypassPhoneCheck, setBypassPhoneCheck] = useState(false);
  const [phoneCheckResult, setPhoneCheckResult] = useState<any>(null);
  const [checkingProfilesLoading, setCheckingProfilesLoading] = useState(false);
  const [existingProfilesModalVisible, setExistingProfilesModalVisible] = useState(false);
  // END STATE

  // START PROFILE FETCH BY PHONE
  const findProfilesByPhone = async (rawPhone: string) => {
    if (!rawPhone) return [];
    const clean = String(rawPhone).replace(/\D/g, '').slice(-10);
    if (clean.length < 10) return [];

    const profilesMap = new Map();

    const processDoc = (data: any, docId: string) => {
      if (!data) return;
      const pName = data.fullName || data.patientName || data.name || data.patient_name;
      const docPhone = data.phone || data.patientPhone || data.phoneNumber || data.mobile || data.contact || data.contactNumber || '';
      const cleanDocPhone = String(docPhone).replace(/\D/g, '').slice(-10);
      if (pName && cleanDocPhone === clean) {
        const rawReg = data.registrationId || data.registration_id || data.regId || data.regID || data.patientId || data.uhid;
        let regId = '';
        if (rawReg && typeof rawReg === 'string' && rawReg.trim().length > 0 && rawReg.trim().length <= 18 && !/^[a-zA-Z0-9]{19,32}$/.test(rawReg.trim())) {
          regId = rawReg.trim().toUpperCase();
        } else {
          const shortcut = getBranchShortcut(data.branchName || data.branch || currentBranch);
          regId = `SPH-${shortcut}-${String(profilesMap.size + 1).padStart(4, '0')}`;
        }

        const key = `${pName.toLowerCase()}_${cleanDocPhone}_${regId.toLowerCase()}`;
        if (!profilesMap.has(key)) {
          profilesMap.set(key, {
            id: docId,
            fullName: pName,
            registrationId: regId,
            phone: docPhone || clean,
            gender: data.gender || '',
            age: data.age || '',
            source: data.source || 'Old Patient',
            branchName: data.branchName || data.branch || ''
          });
        }
      }
    };

    // 1. Search in-memory state & cache instantly (0ms)
    try {
      (allPatientsList || []).forEach(p => processDoc(p, p?.id));
      (patientsList || []).forEach(p => processDoc(p, p?.id));
      (existingAppointments || []).forEach(a => processDoc(a, a?.id));
      (GLOBAL_WEB_ALLPATIENTS_CACHE || []).forEach(p => processDoc(p, p?.id));
      (GLOBAL_WEB_PATIENTS_CACHE || []).forEach(p => processDoc(p, p?.id));
    } catch (e) { }

    // 2. Query Firestore collections with a 1.5s max timeout safety
    const safeQuery = (q: any) => Promise.race([
      getDocs(q).catch(() => ({ docs: [] })),
      new Promise(res => setTimeout(() => res({ docs: [] }), 1500))
    ]);

    try {
      const [snapAll, snapPatients, snapAppts, snapProfiles] = await Promise.all([
        safeQuery(query(collection(db, 'allpatients'), where('phone', '==', clean), limit(20))),
        safeQuery(query(collection(db, 'patients'), where('phone', '==', clean), limit(20))),
        safeQuery(query(collection(db, 'appointments'), where('phone', '==', clean), limit(20))),
        safeQuery(query(collection(db, 'patient_profiles'), where('phone', '==', clean), limit(20)))
      ]);

      [snapAll, snapPatients, snapAppts, snapProfiles].forEach((snap: any) => {
        if (!snap || snap.empty || !snap.forEach) return;
        snap.forEach((docSnap: any) => {
          processDoc(docSnap.data(), docSnap.id);
        });
      });
    } catch (err) {
      console.warn("Firestore phone query error:", err);
    }

    const resultList = Array.from(profilesMap.values());
    setPhoneCheckResult(resultList);
    return resultList;
  };
  // END PROFILE FETCH BY PHONE

  // START PHONE HANDLERS AND PROFILE SELECTION
  const handleManualPhoneCheck = async (phoneVal: string) => {
    const clean = phoneVal.replace(/\D/g, '').slice(-10);
    if (clean.length < 10) {
      alert("Invalid Phone: Please enter a 10-digit mobile number.");
      return;
    }
    setCheckingProfilesLoading(true);
    try {
      const list = await findProfilesByPhone(phoneVal);
      if (list.length > 0) {
        setExistingProfilesList(list);
        setCheckedPhone(clean);
        setExistingProfilesModalVisible(true);
      } else {
        alert(`No existing patient profiles found for +91 ${clean}.`);
      }
    } catch (err) {
      console.error("Manual check error:", err);
    } finally {
      setCheckingProfilesLoading(false);
    }
  };

  // Automatically triggers profile check when user enters 10 digits
  const handlePhoneInputChange = (text: string) => {
    setPhoneNumber(text);
    setPatientData(prev => ({ ...prev, phone: text }));
    setBypassPhoneCheck(false);

    const clean = text.replace(/\D/g, '').slice(-10);
    if (clean.length === 10) {
      handleManualPhoneCheck(text);
    }
  };

  // Populate appointment form when user selects an existing profile
  const handleSelectExistingProfile = (prof: any) => {
    setPatientName(prof.fullName);
    setPhoneNumber(prof.phone || (patientData.phone || phoneNumber));
    setMarketingSource('Old Patient');
    setPatientData(prev => ({
      ...prev,
      patientId: prof.id,
      fullName: prof.fullName,
      patientName: prof.fullName,
      regID: prof.registrationId || prev.regID,
      source: 'Old Patient'
    }));
    setBypassPhoneCheck(true);
    setExistingProfilesModalVisible(false);
  };
  // END HANDLERS

  // Section 2: Appointment Information
  const getTodayFormatted = () => {
    const today = new Date();
    const d = String(today.getDate()).padStart(2, '0');
    const m = String(today.getMonth() + 1).padStart(2, '0');
    const y = today.getFullYear();
    return `${d}-${m}-${y}`;
  };

  const [appointmentDate, setAppointmentDate] = useState(getTodayFormatted);
  const [selectedDoctor, setSelectedDoctor] = useState('');
  const [selectedTimeSlot, setSelectedTimeSlot] = useState('');

  // Firestore Live Doctors List
  const [allDoctorsList, setAllDoctorsList] = useState<Doctor[]>(DEFAULT_DOCTORS_SEED);

  // Subscribe to real-time Firestore doctors collection
  useEffect(() => {
    try {
      const docColRef = collection(db, 'doctors');
      const unsubscribe = onSnapshot(docColRef, (snapshot) => {
        if (!snapshot.empty) {
          const fetched: Doctor[] = [];
          snapshot.forEach((snap) => {
            const data = snap.data();
            const normDataName = (data.name || data.doctorName || '').toLowerCase().replace(/dr\.?\s*/i, '').trim();
            const digits = (data.mobile || data.phone || '').replace(/\D/g, '');
            const seedFallback = DEFAULT_DOCTORS_SEED.find(s => {
              const normSeedName = s.name.toLowerCase().replace(/dr\.?\s*/i, '').trim();
              if (normDataName && (normSeedName.includes(normDataName) || normDataName.includes(normSeedName))) return true;
              if (digits && s.phone.includes(digits)) return true;
              return s.id === snap.id;
            }) || DEFAULT_DOCTORS_SEED.find(s => s.id === snap.id);
            fetched.push({
              id: snap.id,
              name: data.name || data.doctorName || seedFallback?.name || 'Doctor',
              phone: data.phone || data.mobile || seedFallback?.phone || '',
              role: data.role || seedFallback?.role || 'Homeopathy Physician',
              branch: data.branch || data.assignedBranch || '',
              branchSchedules: (data.branchSchedules && data.branchSchedules.length > 0)
                ? data.branchSchedules
                : (seedFallback?.branchSchedules || []),
            });
          });
          setAllDoctorsList(fetched);
        }
      }, (err) => {
        console.warn('Firestore doctors listener error:', err);
      });
      return () => unsubscribe();
    } catch (e) {
      console.warn('Firestore doctors subscribe notice:', e);
    }
  }, []);

  // Helper to convert DD-MM-YYYY to DayName
  const getSelectedDayName = (dateStr: string): DayName => {
    if (!dateStr) return 'Sat';
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const day = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const year = parseInt(parts[2], 10);
      if (!isNaN(day) && !isNaN(month) && !isNaN(year)) {
        const d = new Date(year, month, day);
        const days: DayName[] = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        return days[d.getDay()];
      }
    }
    return 'Sat';
  };

  const selectedDayName = getSelectedDayName(appointmentDate);

  // Dynamically filter doctors available for the selected branch and selected day
  const availableDoctors = allDoctorsList.filter((doc) => {
    const normCurrentBranch = (currentBranch || '').toLowerCase().replace(/\s*branch\s*/i, '').trim();

    if (doc.branchSchedules && doc.branchSchedules.length > 0) {
      const matchBs = doc.branchSchedules.find((bs) => {
        const normBsBranch = (bs.targetBranch || '').toLowerCase().replace(/\s*branch\s*/i, '').trim();
        return normBsBranch.includes(normCurrentBranch) || normCurrentBranch.includes(normBsBranch);
      });

      if (!matchBs) return false;
      const daySched = matchBs.daySchedules?.[selectedDayName];
      if (!daySched) return false;

      return daySched.status === 'Available' && daySched.slots && daySched.slots.length > 0;
    }

    const docBranchStr = (doc.branch || doc.assignedBranch || '').toLowerCase().replace(/\s*branch\s*/i, '').trim();
    if (docBranchStr) {
      return docBranchStr.includes(normCurrentBranch) || normCurrentBranch.includes(docBranchStr);
    }

    return false;
  });

  // Auto-reset selectedDoctor if no longer available on changed date/branch
  useEffect(() => {
    if (selectedDoctor && availableDoctors.length > 0) {
      const exists = availableDoctors.some((d) => d.name === selectedDoctor);
      if (!exists) {
        setSelectedDoctor('');
        setSelectedTimeSlot('');
      }
    }
  }, [appointmentDate, currentBranch, availableDoctors]);

  // Firestore Live Patient History Collections (appointments, patients & allpatients) with 0ms Instant Device Cache
  const [existingAppointments, setExistingAppointments] = useState<any[]>(GLOBAL_WEB_APPTS_CACHE);
  const [patientsList, setPatientsList] = useState<any[]>(GLOBAL_WEB_PATIENTS_CACHE);
  const [allPatientsList, setAllPatientsList] = useState<any[]>(GLOBAL_WEB_ALLPATIENTS_CACHE);

  useEffect(() => {
    try {
      const appColRef = collection(db, 'appointments');
      const unsubscribe = onSnapshot(appColRef, (snapshot) => {
        const appList: any[] = [];
        snapshot.forEach((snap) => {
          appList.push({ id: snap.id, ...snap.data() });
        });
        GLOBAL_WEB_APPTS_CACHE = appList;
        setExistingAppointments(appList);
      }, () => { });
      return () => unsubscribe();
    } catch (e) { }
  }, []);

  useEffect(() => {
    try {
      const patColRef = collection(db, 'patients');
      const unsubscribe = onSnapshot(patColRef, (snapshot) => {
        const list: any[] = [];
        snapshot.forEach((snap) => {
          list.push({ id: snap.id, ...snap.data() });
        });
        GLOBAL_WEB_PATIENTS_CACHE = list;
        setPatientsList(list);
      }, () => { });
      return () => unsubscribe();
    } catch (e) { }
  }, []);

  useEffect(() => {
    try {
      const allPatColRef = collection(db, 'allpatients');
      const unsubscribe = onSnapshot(allPatColRef, (snapshot) => {
        const list: any[] = [];
        snapshot.forEach((snap) => {
          list.push({ id: snap.id, ...snap.data() });
        });
        GLOBAL_WEB_ALLPATIENTS_CACHE = list;
        setAllPatientsList(list);
      }, () => { });
      return () => unsubscribe();
    } catch (e) { }
  }, []);

  // Deduplicated Patient History Database
  interface PatientRecordItem {
    id: string;
    name: string;
    phone: string;
    email: string;
    diseases: string;
    branch: string;
    nameLower: string;
    phoneLower: string;
  }

  const patientSuggestions: PatientRecordItem[] = [];

  const handleSelectPatientSuggestion = (item: PatientRecordItem) => {
    setPatientName(item.name || '');
    setPhoneNumber(item.phone || '');
    setEmailAddress(item.email || '');
    setDiseases(item.diseases || '');
    setMarketingSource('Old Patient');
    setPatientData(prev => ({
      ...prev,
      patientId: item.id,
      fullName: item.name,
      patientName: item.name,
      phone: item.phone,
      source: 'Old Patient'
    }));
    setPatientSearchTerm(item.name || item.phone || '');
    setActiveSearchQuery('');
    setShowSuggestions(false);
  };

  // Time conversion helpers for 15-min slot generation
  const parseTimeToMinutes = (hourStr: string, minStr: string, ampm: 'AM' | 'PM'): number => {
    let h = parseInt(hourStr, 10);
    const m = parseInt(minStr, 10) || 0;
    if (ampm === 'PM' && h < 12) h += 12;
    if (ampm === 'AM' && h === 12) h = 0;
    return h * 60 + m;
  };

  const formatMinutesToTimeStr = (totalMins: number): string => {
    let h = Math.floor(totalMins / 60);
    const m = totalMins % 60;
    const ampm = h >= 12 ? 'PM' : 'AM';
    if (h > 12) h -= 12;
    if (h === 0) h = 12;
    const hhStr = h.toString().padStart(2, '0');
    const mmStr = m.toString().padStart(2, '0');
    return `${hhStr}:${mmStr} ${ampm}`;
  };

  const generate15MinSlotsFromRanges = (slotRanges: TimeSlot[]): string[] => {
    const result: string[] = [];
    slotRanges.forEach((range) => {
      const startMins = parseTimeToMinutes(range.startHour, range.startMinute, range.startAmPm);
      const endMins = parseTimeToMinutes(range.endHour, range.endMinute, range.endAmPm);

      for (let mins = startMins; mins < endMins; mins += 15) {
        const timeStr = formatMinutesToTimeStr(mins);
        if (!result.includes(timeStr)) {
          result.push(timeStr);
        }
      }
    });
    return result;
  };

  // Firestore Live Temporary Slots List
  interface TempSlotDoc {
    id?: string;
    doctorName: string;
    branch: string;
    appointmentDate: string;
    startHour: string;
    startMinute: string;
    startAmPm: 'AM' | 'PM';
    endHour: string;
    endMinute: string;
    endAmPm: 'AM' | 'PM';
  }

  const [tempSlotsList, setTempSlotsList] = useState<TempSlotDoc[]>([]);
  const [tempModalOpen, setTempModalOpen] = useState(false);

  // Temporary slot form states
  const [tempStartHour, setTempStartHour] = useState('09');
  const [tempStartMin, setTempStartMin] = useState('00');
  const [tempStartAmPm, setTempStartAmPm] = useState<'AM' | 'PM'>('AM');
  const [tempEndHour, setTempEndHour] = useState('10');
  const [tempEndMin, setTempEndMin] = useState('00');
  const [tempEndAmPm, setTempEndAmPm] = useState<'AM' | 'PM'>('AM');
  const [isSavingTempSlot, setIsSavingTempSlot] = useState(false);

  useEffect(() => {
    try {
      const tempColRef = collection(db, 'doctor_temp_slots');
      const unsubscribe = onSnapshot(tempColRef, (snapshot) => {
        const list: TempSlotDoc[] = [];
        snapshot.forEach((snap) => {
          list.push({ id: snap.id, ...snap.data() } as TempSlotDoc);
        });
        setTempSlotsList(list);
      }, (err) => {
        console.warn('Temp slots snapshot warning:', err);
      });
      return () => unsubscribe();
    } catch (e) {
      console.warn('Temp slots listener notice:', e);
    }
  }, []);

  // Helper to add 15-min slot BEFORE regular/current start
  const handleAddSlotBefore = async () => {
    if (!selectedDoctor || timeSlotsList.length === 0) return;
    try {
      const earliestStr = timeSlotsList[0];
      const [timePart, ampm] = earliestStr.split(' ');
      const [h, m] = timePart.split(':');
      const totalMins = parseTimeToMinutes(h, m, ampm as 'AM' | 'PM');

      const newStartMins = Math.max(0, totalMins - 15);
      const newEndMins = totalMins;

      const startStr = formatMinutesToTimeStr(newStartMins);
      const endStr = formatMinutesToTimeStr(newEndMins);

      const [sHour, sMinAmpm] = startStr.split(':');
      const [sMin, sAmPm] = sMinAmpm.split(' ');

      const [eHour, eMinAmpm] = endStr.split(':');
      const [eMin, eAmPm] = eMinAmpm.split(' ');

      await addDoc(collection(db, 'doctor_temp_slots'), {
        doctorName: selectedDoctor,
        branch: currentBranch,
        appointmentDate: appointmentDate,
        startHour: sHour,
        startMinute: sMin,
        startAmPm: sAmPm,
        endHour: eHour,
        endMinute: eMin,
        endAmPm: eAmPm,
        createdAt: new Date().toISOString(),
      });
    } catch (e) {
      console.warn('Error adding slot before:', e);
    }
  };

  // Helper to add 15-min slot AFTER regular/current end
  const handleAddSlotAfter = async () => {
    if (!selectedDoctor || timeSlotsList.length === 0) return;
    try {
      const latestStr = timeSlotsList[timeSlotsList.length - 1];
      const [timePart, ampm] = latestStr.split(' ');
      const [h, m] = timePart.split(':');
      const totalMins = parseTimeToMinutes(h, m, ampm as 'AM' | 'PM');

      const newStartMins = totalMins + 15;
      const newEndMins = newStartMins + 15;

      const startStr = formatMinutesToTimeStr(newStartMins);
      const endStr = formatMinutesToTimeStr(newEndMins);

      const [sHour, sMinAmpm] = startStr.split(':');
      const [sMin, sAmPm] = sMinAmpm.split(' ');

      const [eHour, eMinAmpm] = endStr.split(':');
      const [eMin, eAmPm] = eMinAmpm.split(' ');

      await addDoc(collection(db, 'doctor_temp_slots'), {
        doctorName: selectedDoctor,
        branch: currentBranch,
        appointmentDate: appointmentDate,
        startHour: sHour,
        startMinute: sMin,
        startAmPm: sAmPm,
        endHour: eHour,
        endMinute: eMin,
        endAmPm: eAmPm,
        createdAt: new Date().toISOString(),
      });
    } catch (e) {
      console.warn('Error adding slot after:', e);
    }
  };

  const sortTimeSlotsChronologically = (slots: string[]): string[] => {
    return [...slots].sort((a, b) => {
      const parseSlotStr = (s: string) => {
        const [timePart, ampm] = s.split(' ');
        const [h, m] = timePart.split(':');
        return parseTimeToMinutes(h, m, ampm as 'AM' | 'PM');
      };
      return parseSlotStr(a) - parseSlotStr(b);
    });
  };

  // Compute available 15-minute time slots (Regular + Temporary) for selected doctor
  const selectedDocObj = availableDoctors.find((d) => d.name === selectedDoctor);
  const timeSlotsList = useMemo(() => {
    const defaultFallbackRanges: TimeSlot[] = [{
      startHour: '10', startMinute: '00', startAmPm: 'AM',
      endHour: '01', endMinute: '00', endAmPm: 'PM'
    }];

    let regularSlots: string[] = [];

    if (selectedDocObj && selectedDocObj.branchSchedules && selectedDocObj.branchSchedules.length > 0) {
      const normCurrentBranch = (currentBranch || '').toLowerCase().replace(/\s*branch\s*/i, '').trim();
      const matchBs = selectedDocObj.branchSchedules.find((bs) => {
        const normBsBranch = (bs.targetBranch || '').toLowerCase().replace(/\s*branch\s*/i, '').trim();
        return normBsBranch.includes(normCurrentBranch) || normCurrentBranch.includes(normBsBranch);
      });

      if (matchBs && matchBs.daySchedules?.[selectedDayName]) {
        const daySched = matchBs.daySchedules[selectedDayName];
        if (daySched.status === 'Available' && daySched.slots && daySched.slots.length > 0) {
          regularSlots = generate15MinSlotsFromRanges(daySched.slots);
        }
      }
    }

    if (regularSlots.length === 0) {
      regularSlots = generate15MinSlotsFromRanges(defaultFallbackRanges);
    }

    // Find temporary slots for selected doctor, appointment date, and branch
    const normSelectedDoc = (selectedDoctor || '').toLowerCase().trim();
    const normCurrentBranch = (currentBranch || '').toLowerCase().replace(/\s*branch\s*/i, '').trim();

    const matchedTempDocs = tempSlotsList.filter((ts) => {
      const sameDoc = (ts.doctorName || '').toLowerCase().trim() === normSelectedDoc;
      const sameDate = ts.appointmentDate === appointmentDate;
      const tsBranch = (ts.branch || '').toLowerCase().replace(/\s*branch\s*/i, '').trim();
      const sameBranch = !tsBranch || tsBranch.includes(normCurrentBranch) || normCurrentBranch.includes(tsBranch);
      return sameDoc && sameDate && sameBranch;
    });

    const tempSlotsRanges: TimeSlot[] = matchedTempDocs.map((ts) => ({
      startHour: ts.startHour,
      startMinute: ts.startMinute,
      startAmPm: ts.startAmPm,
      endHour: ts.endHour,
      endMinute: ts.endMinute,
      endAmPm: ts.endAmPm
    }));

    const generatedTempSlots = generate15MinSlotsFromRanges(tempSlotsRanges);

    // Merge regular & temp slots, remove duplicates, and sort chronologically
    const combined = Array.from(new Set([...regularSlots, ...generatedTempSlots]));
    return sortTimeSlotsChronologically(combined);
  }, [selectedDocObj, selectedDoctor, currentBranch, selectedDayName, appointmentDate, tempSlotsList]);

  const normalizeTimeStr = (str: string): string => {
    if (!str) return '';
    const trimmed = str.trim().toUpperCase();
    const parts = trimmed.split(' ');
    if (parts.length < 2) return trimmed;
    const [timePart, ampm] = parts;
    const timeSub = timePart.split(':');
    if (timeSub.length < 2) return trimmed;
    const hNum = parseInt(timeSub[0], 10);
    const mNum = parseInt(timeSub[1], 10) || 0;
    const hStr = hNum.toString().padStart(2, '0');
    const mStr = mNum.toString().padStart(2, '0');
    return `${hStr}:${mStr} ${ampm}`;
  };

  // Map of slotTimeStr -> tempDocId for temporary slots
  const tempSlotMap = useMemo(() => {
    const map: Record<string, string> = {};
    if (!selectedDoctor) return map;
    const normSelectedDoc = (selectedDoctor || '').toLowerCase().trim();
    const normCurrentBranch = (currentBranch || '').toLowerCase().replace(/\s*branch\s*/i, '').trim();

    const matchedTempDocs = tempSlotsList.filter((ts) => {
      const sameDoc = (ts.doctorName || '').toLowerCase().trim() === normSelectedDoc;
      const sameDate = ts.appointmentDate === appointmentDate;
      const tsBranch = (ts.branch || '').toLowerCase().replace(/\s*branch\s*/i, '').trim();
      const sameBranch = !tsBranch || tsBranch.includes(normCurrentBranch) || normCurrentBranch.includes(tsBranch);
      return sameDoc && sameDate && sameBranch;
    });

    matchedTempDocs.forEach((ts) => {
      const slots = generate15MinSlotsFromRanges([{
        startHour: ts.startHour,
        startMinute: ts.startMinute,
        startAmPm: ts.startAmPm,
        endHour: ts.endHour,
        endMinute: ts.endMinute,
        endAmPm: ts.endAmPm
      }]);
      slots.forEach((sStr) => {
        if (ts.id) {
          map[normalizeTimeStr(sStr)] = ts.id;
          map[sStr.trim()] = ts.id;
        }
      });
    });

    return map;
  }, [selectedDoctor, currentBranch, appointmentDate, tempSlotsList]);

  // Helper to delete temporary slot from Firestore
  const handleDeleteTempSlot = async (tempDocId: string) => {
    try {
      await deleteDoc(doc(db, 'doctor_temp_slots', tempDocId));
    } catch (e) {
      console.warn('Error deleting temp slot:', e);
    }
  };

  // Helper to calculate remaining slots out of 3 capacity for a time slot
  const getSlotCapacityInfo = (slotTimeStr: string) => {
    const normSelectedDoc = (selectedDoctor || '').toLowerCase().trim();
    const bookedCount = existingAppointments.filter((app) => {
      const normAppDoc = (app.doctorName || app.doctor || '').toLowerCase().trim();
      const sameDoc = normAppDoc === normSelectedDoc;
      const sameDate = app.appointmentDate === appointmentDate;
      const sameTime = (app.appointmentTime || app.time || '').trim() === slotTimeStr.trim();
      const notCancelled = app.status !== 'cancelled';
      return sameDoc && sameDate && sameTime && notCancelled;
    }).length;

    const remainingSlots = Math.max(0, 3 - bookedCount);
    return {
      bookedCount,
      remainingSlots,
      isFull: remainingSlots === 0
    };
  };

  // Calendar State: Month & Year switching
  const [calMonth, setCalMonth] = useState(() => new Date().getMonth());
  const [calYear, setCalYear] = useState(() => new Date().getFullYear());
  const [calendarModalOpen, setCalendarModalOpen] = useState(false);

  const [bookingSuccess, setBookingSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmedBooking, setConfirmedBooking] = useState<any>(null);

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const marketingSourcesList = [
    'Instagram',
    'Facebook',
    'Website',
    'Google',
    'Practo',
    'Referral',
    'Youtube',
    'Walk-in',
    'Old Patient',
  ];

  const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
  const startDayIndex = new Date(calYear, calMonth, 1).getDay();

  const handlePrevMonth = () => {
    if (calMonth === 0) {
      setCalMonth(11);
      setCalYear(calYear - 1);
    } else {
      setCalMonth(calMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (calMonth === 11) {
      setCalMonth(0);
      setCalYear(calYear + 1);
    } else {
      setCalMonth(calMonth + 1);
    }
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    if (!patientName.trim() || !phoneNumber.trim()) {
      alert('Please enter Patient Name and Phone Number.');
      return;
    }
    if (!selectedDoctor) {
      alert('Please select an available Doctor.');
      return;
    }

    setIsSubmitting(true);
    try {
      let generatedRegId = patientData.regID || patientData.patientId;
      if (!generatedRegId || typeof generatedRegId !== 'string' || generatedRegId.trim().length === 0 || /^[a-zA-Z0-9]{19,32}$/.test(generatedRegId.trim())) {
        generatedRegId = await generateRegistrationId(currentBranch);
      }

      const newDocRef = doc(collection(db, 'appointments'));
      const docId = newDocRef.id;

      const appPayload = {
        id: docId,
        appointmentId: docId,
        registrationId: generatedRegId,
        regId: generatedRegId,
        patientName,
        fullName: patientName,
        name: patientName,
        diseases,
        phone: phoneNumber,
        phoneNumber,
        emailAddress,
        marketingSource: (patientData.source === 'Old Patient' || marketingSource === 'Old Patient') ? 'Old Patient' : marketingSource,
        consultationMode,
        branch: currentBranch,
        branchName: currentBranch,
        doctorName: selectedDoctor,
        doctor: selectedDoctor,
        appointmentDate,
        date: appointmentDate,
        appointmentTime: selectedTimeSlot || '10:00 AM',
        time: selectedTimeSlot || '10:00 AM',
        timeSlot: selectedTimeSlot || '10:00 AM',
        status: 'waiting',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      await Promise.all([
        setDoc(newDocRef, appPayload),
        setDoc(doc(db, 'allpatients', docId), appPayload).catch(() => { }),
        setDoc(doc(db, 'patients', docId), appPayload).catch(() => { })
      ]);

      // Trigger Leonas WhatsApp Booking Notification
      sendBookingWhatsAppNotification({
        patientName,
        phone: phoneNumber,
        date: appointmentDate,
        time: selectedTimeSlot || '10:00 AM',
        doctorName: selectedDoctor,
        branch: currentBranch
      }).catch(err => console.error('WhatsApp booking notification error:', err));

      // Open confirmation modal with details
      setConfirmedBooking(appPayload);
      setShowConfirmModal(true);
      setBookingSuccess(true);
      setTimeout(() => setBookingSuccess(false), 4000);

      // Complete Form & Search Reset to eliminate post-booking lag
      setPatientName('');
      setDiseases('');
      setPhoneNumber('');
      setEmailAddress('');
      setMarketingSource('Select Source');
      setSelectedDoctor('');
      setSelectedTimeSlot('');
      setPatientSearchTerm('');
      setActiveSearchQuery('');
      setShowSuggestions(false);
      setPatientData({ phone: '', fullName: '', patientName: '', patientId: '', regID: '', source: '' });
    } catch (err) {
      setBookingSuccess(true);
      setTimeout(() => setBookingSuccess(false), 4000);
      setPatientSearchTerm('');
      setActiveSearchQuery('');
      setShowSuggestions(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{ padding: '24px', maxWidth: '1000px', margin: '0 auto' }}>

      {/* Page Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '24px !important', fontWeight: 800, color: '#0f172a', margin: 0 }}>
            Book Appointment
          </h1>
          <p style={{ color: '#64748b', fontSize: '13.5px !important', marginTop: '4px', margin: 0 }}>
            Schedule patient consultation for <strong style={{ color: '#258ec8' }}>{currentBranch}</strong> on <strong style={{ color: '#0f172a' }}>{selectedDayName} ({appointmentDate})</strong>
          </p>
        </div>
      </div>

      {bookingSuccess && (
        <div style={{
          background: '#dcfce7',
          border: '1px solid #bbf7d0',
          color: '#15803d',
          padding: '14px 18px',
          borderRadius: '16px',
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          fontSize: '13.5px !important',
          fontWeight: 700
        }}>
          <CheckCircle2 size={20} color="#16a34a" />
          <span>Appointment for {patientName || 'Patient'} successfully booked at {currentBranch}!</span>
        </div>
      )}

      <form onSubmit={handleFormSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

        {/* CARD 1: PATIENT DETAILS */}
        <div style={{
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '24px',
          padding: '24px 26px',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.02)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '10px',
              background: '#258ec8',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 800,
              fontSize: '14px !important'
            }}>
              1
            </div>
            <h2 style={{ fontSize: '16px !important', fontWeight: 800, color: '#1e293b' }}>
              Patient Details
            </h2>
            <div style={{ flex: 1, height: '1px', background: '#f1f5f9', marginLeft: '8px' }} />
          </div>

          {/* DEDICATED PROMINENT PATIENT SEARCH BAR */}
          <div style={{ position: 'relative', marginBottom: '22px' }}>
            <label style={{ display: 'block', fontSize: '12.5px !important', fontWeight: 800, color: '#258ec8', marginBottom: '8px' }}>
              🔎 Search Existing Patient (Type 2+ letters or phone digits)
            </label>
            <div style={{
              background: '#f8fafc',
              border: '2px solid #258ec8',
              borderRadius: '14px',
              padding: '0 16px',
              height: '52px',
              display: 'flex',
              alignItems: 'center',
              boxSizing: 'border-box',
              boxShadow: '0 2px 12px rgba(37, 142, 200, 0.12)'
            }}>
              <Search size={22} color="#258ec8" style={{ marginRight: '12px', flexShrink: 0 }} />
              <input
                type="text"
                placeholder="Search patient by Name or Mobile Number..."
                value={patientSearchTerm}
                onFocus={() => {
                  setActiveSearchQuery(patientSearchTerm);
                  setShowSuggestions(true);
                }}
                onChange={e => {
                  const val = e.target.value;
                  setPatientSearchTerm(val);
                  setActiveSearchQuery(val);
                  setShowSuggestions(true);
                }}
                style={{ border: 'none', outline: 'none', width: '100%', fontSize: '14px !important', color: '#0f172a', fontWeight: 600, background: 'transparent' }}
              />
              {patientSearchTerm ? (
                <button
                  type="button"
                  onClick={() => {
                    setPatientSearchTerm('');
                    setActiveSearchQuery('');
                    setShowSuggestions(false);
                  }}
                  style={{ border: 'none', background: 'transparent', cursor: 'pointer', padding: '4px', color: '#64748b' }}
                >
                  <X size={18} />
                </button>
              ) : null}
            </div>

            {/* PATIENT RECOMMENDATIONS DROPDOWN FROM SEARCH BAR */}
            {showSuggestions && activeSearchQuery.trim().length >= 2 && patientSuggestions.length > 0 && (
              <div style={{
                position: 'absolute',
                top: '84px',
                left: '-8px',
                right: '-8px',
                background: '#ffffff',
                border: '1px solid #cbd5e1',
                borderRadius: '16px',
                boxShadow: '0 20px 45px -10px rgba(15, 23, 42, 0.18), 0 0 0 1px rgba(15, 23, 42, 0.04)',
                zIndex: 9999,
                maxHeight: '340px',
                overflowY: 'auto',
                overflowX: 'hidden'
              }}>
                <div style={{
                  padding: '8px 16px',
                  background: '#f8fafc',
                  borderBottom: '1px solid #f1f5f9',
                  fontSize: '10px !important',
                  fontWeight: 800,
                  letterSpacing: '0.8px',
                  color: '#64748b',
                  textTransform: 'uppercase',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <span>Matching Patients</span>
                  <span style={{ background: '#e0f2fe', color: '#0369a1', padding: '2px 8px', borderRadius: '10px', fontSize: '10px !important' }}>
                    {patientSuggestions.length} Found
                  </span>
                </div>
                {patientSuggestions.map((item, idx) => (
                  <div
                    key={idx}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      handleSelectPatientSuggestion(item);
                    }}
                    onClick={() => handleSelectPatientSuggestion(item)}
                    style={{
                      padding: '12px 16px',
                      borderBottom: idx < patientSuggestions.length - 1 ? '1px solid #f1f5f9' : 'none',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '12px',
                      background: '#ffffff',
                      transition: 'all 0.15s ease'
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = '#f0f9ff')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = '#ffffff')}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: 0 }}>
                      <div style={{
                        width: '38px',
                        height: '38px',
                        borderRadius: '50%',
                        background: '#eff6ff',
                        border: '1px solid #dbeafe',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#0284c7',
                        fontWeight: 700,
                        flexShrink: 0
                      }}>
                        <User size={18} />
                      </div>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                          <span style={{ fontSize: '14px !important', fontWeight: 700, color: '#0f172a' }}>{item.name || 'Unnamed Patient'}</span>
                          {item.id && (
                            <span style={{ background: '#e0f2fe', border: '1px solid #bae6fd', color: '#0284c7', padding: '1px 7px', borderRadius: '6px', fontSize: '10.5px !important', fontWeight: 800 }}>
                              🆔 {item.id}
                            </span>
                          )}
                          {item.branch && (
                            <span style={{ background: '#f8fafc', border: '1px solid #e2e8f0', color: '#475569', padding: '1px 7px', borderRadius: '6px', fontSize: '10.5px !important', fontWeight: 600 }}>
                              📍 {item.branch}
                            </span>
                          )}
                        </div>
                        {item.diseases && (
                          <div style={{ fontSize: '11.5px !important', color: '#64748b', marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            🩺 {item.diseases}
                          </div>
                        )}
                      </div>
                    </div>
                    <span style={{
                      background: '#f0f9ff',
                      border: '1px solid #bae6fd',
                      color: '#0369a1',
                      padding: '4px 10px',
                      borderRadius: '8px',
                      fontSize: '11.5px !important',
                      fontWeight: 700,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      flexShrink: 0
                    }}>
                      <Phone size={12} /> {item.phone || 'No Phone'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', position: 'relative' }}>
            <div style={{ position: 'relative' }}>
              <label style={{ display: 'block', fontSize: '12.5px !important', fontWeight: 700, color: '#1e293b', marginBottom: '8px' }}>
                Patient Name *
              </label>
              <div style={{
                background: '#ffffff',
                border: '1px solid #cbd5e1',
                borderRadius: '12px',
                padding: '0 14px',
                height: '48px',
                display: 'flex',
                alignItems: 'center',
                boxSizing: 'border-box'
              }}>
                <User size={18} color="#94a3b8" style={{ marginRight: '10px' }} />
                <input
                  type="text"
                  placeholder="Enter full patient name"
                  value={patientName}
                  onFocus={() => {
                    setActiveSearchQuery(patientName);
                    setShowSuggestions(true);
                  }}
                  onChange={e => {
                    const val = e.target.value;
                    setPatientName(val);
                    setActiveSearchQuery(val);
                    setShowSuggestions(true);
                  }}
                  style={{ border: 'none', outline: 'none', width: '100%', fontSize: '13px !important', color: '#0f172a' }}
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12.5px !important', fontWeight: 700, color: '#1e293b', marginBottom: '8px' }}>
                Diseases / Symptoms
              </label>
              <div style={{
                background: '#ffffff',
                border: '1px solid #cbd5e1',
                borderRadius: '12px',
                padding: '0 14px',
                height: '48px',
                display: 'flex',
                alignItems: 'center',
                boxSizing: 'border-box'
              }}>
                <Stethoscope size={18} color="#94a3b8" style={{ marginRight: '10px' }} />
                <input
                  type="text"
                  placeholder="e.g. Migraine, Anxiety, Eczema"
                  value={diseases}
                  onChange={e => setDiseases(e.target.value)}
                  style={{ border: 'none', outline: 'none', width: '100%', fontSize: '13px !important', color: '#0f172a' }}
                />
              </div>
            </div>

            <div style={{ position: 'relative' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <label style={{ display: 'block', fontSize: '12.5px !important', fontWeight: 700, color: '#1e293b' }}>
                  Phone (+91) *
                </label>
                {(patientData.phone || phoneNumber).replace(/\D/g, '').length >= 10 && (
                  <button
                    type="button"
                    onClick={() => handleManualPhoneCheck(patientData.phone || phoneNumber)}
                    disabled={checkingProfilesLoading}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      fontSize: '11px',
                      fontWeight: 700,
                      color: checkingProfilesLoading ? '#94a3b8' : '#0284c7',
                      padding: 0
                    }}
                  >
                    {checkingProfilesLoading ? 'Checking...' : 'Check Profiles'}
                  </button>
                )}
              </div>
              <div style={{
                background: '#ffffff',
                border: '1px solid #cbd5e1',
                borderRadius: '12px',
                padding: '0 14px',
                height: '48px',
                display: 'flex',
                alignItems: 'center',
                boxSizing: 'border-box'
              }}>
                <Phone size={18} color="#94a3b8" style={{ marginRight: '10px' }} />
                <input
                  type="tel"
                  placeholder="10-digit mobile number"
                  value={patientData.phone || phoneNumber}
                  onChange={e => handlePhoneInputChange(e.target.value)}
                  style={{ border: 'none', outline: 'none', width: '100%', fontSize: '13px !important', color: '#0f172a' }}
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12.5px !important', fontWeight: 700, color: '#1e293b', marginBottom: '8px' }}>
                Email Address (Optional)
              </label>
              <div style={{
                background: '#ffffff',
                border: '1px solid #cbd5e1',
                borderRadius: '12px',
                padding: '0 14px',
                height: '48px',
                display: 'flex',
                alignItems: 'center',
                boxSizing: 'border-box'
              }}>
                <Mail size={18} color="#94a3b8" style={{ marginRight: '10px' }} />
                <input
                  type="email"
                  placeholder="patient@example.com"
                  value={emailAddress}
                  onChange={e => setEmailAddress(e.target.value)}
                  style={{ border: 'none', outline: 'none', width: '100%', fontSize: '13px !important', color: '#0f172a' }}
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12.5px !important', fontWeight: 700, color: '#1e293b', marginBottom: '8px' }}>
                Marketing Source
              </label>
              {marketingSource === 'Old Patient' || patientData.source === 'Old Patient' ? (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  background: '#f8fafc',
                  border: '1px solid #cbd5e1',
                  borderRadius: '12px',
                  padding: '0 14px',
                  height: '48px',
                  boxSizing: 'border-box'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <Megaphone size={16} color="#64748b" />
                    <span style={{ fontSize: '13px !important', color: '#0f172a', fontWeight: 700 }}>
                      Old Patient
                    </span>
                  </div>
                </div>
              ) : (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      background: '#ffffff',
                      border: '1px solid #cbd5e1',
                      borderRadius: '12px',
                      padding: '0 14px',
                      height: '48px',
                      boxSizing: 'border-box',
                      cursor: 'pointer'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <Megaphone size={16} color="#94a3b8" />
                        <span style={{ fontSize: '13px !important', color: marketingSource === 'Select Source' ? '#94a3b8' : '#0f172a', fontWeight: 500 }}>
                          {marketingSource}
                        </span>
                      </div>
                      <ChevronDown size={18} color="#94a3b8" />
                    </div>
                  </DropdownMenuTrigger>

                  <DropdownMenuContent>
                    <DropdownMenuGroup>
                      <DropdownMenuLabel>Select Marketing Source</DropdownMenuLabel>
                      <DropdownMenuRadioGroup value={marketingSource} onValueChange={setMarketingSource}>
                        {marketingSourcesList.map(src => (
                          <DropdownMenuRadioItem key={src} value={src}>{src}</DropdownMenuRadioItem>
                        ))}
                      </DropdownMenuRadioGroup>
                    </DropdownMenuGroup>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12.5px !important', fontWeight: 700, color: '#1e293b', marginBottom: '8px' }}>
                Mode of Consultation
              </label>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    background: '#ffffff',
                    border: '1px solid #cbd5e1',
                    borderRadius: '12px',
                    padding: '0 14px',
                    height: '48px',
                    boxSizing: 'border-box',
                    cursor: 'pointer'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <User size={16} color="#94a3b8" />
                      <span style={{ fontSize: '13px !important', color: '#0f172a', fontWeight: 500 }}>
                        {consultationMode}
                      </span>
                    </div>
                    <ChevronDown size={18} color="#94a3b8" />
                  </div>
                </DropdownMenuTrigger>

                <DropdownMenuContent>
                  <DropdownMenuGroup>
                    <DropdownMenuLabel>Select Mode</DropdownMenuLabel>
                    <DropdownMenuRadioGroup value={consultationMode} onValueChange={setConsultationMode}>
                      <DropdownMenuRadioItem value="In-Clinic">In-Clinic</DropdownMenuRadioItem>
                      <DropdownMenuRadioItem value="Online">Online</DropdownMenuRadioItem>
                    </DropdownMenuRadioGroup>
                  </DropdownMenuGroup>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>

        {/* CARD 2: APPOINTMENT INFORMATION */}
        <div style={{
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '24px',
          padding: '24px 26px',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.02)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '10px',
              background: '#258ec8',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 800,
              fontSize: '14px !important'
            }}>
              2
            </div>
            <h2 style={{ fontSize: '16px !important', fontWeight: 800, color: '#1e293b' }}>
              Appointment Information
            </h2>
            <div style={{ flex: 1, height: '1px', background: '#f1f5f9', marginLeft: '8px' }} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>

            {/* 1. Branch */}
            <div>
              <label style={{ display: 'block', fontSize: '12.5px !important', fontWeight: 700, color: '#1e293b', marginBottom: '8px' }}>
                Select Branch *
              </label>
              <div style={{
                background: '#f8fafc',
                border: '1px solid #cbd5e1',
                borderRadius: '12px',
                padding: '0 14px',
                height: '48px',
                display: 'flex',
                alignItems: 'center',
                boxSizing: 'border-box'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Building2 size={18} color="#258ec8" />
                  <span style={{ fontSize: '13.5px !important', color: '#0f172a', fontWeight: 800 }}>
                    {currentBranch}
                  </span>
                </div>
              </div>
            </div>

            {/* 2. Date Field */}
            <div>
              <label style={{ display: 'block', fontSize: '12.5px !important', fontWeight: 700, color: '#1e293b', marginBottom: '8px' }}>
                Date (DD-MM-YYYY) *
              </label>
              <div
                onClick={() => setCalendarModalOpen(true)}
                style={{
                  background: '#ffffff',
                  border: '1px solid #258ec8',
                  borderRadius: '12px',
                  padding: '0 14px',
                  height: '48px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  cursor: 'pointer'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <CalendarIcon size={18} color="#258ec8" />
                  <span style={{ fontSize: '13.5px !important', color: '#0f172a', fontWeight: 800 }}>
                    {appointmentDate}
                  </span>
                </div>
                <span style={{ fontSize: '11px', fontWeight: 800, color: '#0284c7', background: '#e0f2fe', padding: '2px 8px', borderRadius: '6px' }}>
                  {selectedDayName}
                </span>
              </div>
            </div>

            {/* 3. DYNAMIC DOCTOR DROPDOWN (ONLY AVAILABLE DOCTORS FOR THIS DAY & BRANCH) */}
            <div style={{ gridColumn: 'span 2' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <label style={{ fontSize: '12.5px !important', fontWeight: 700, color: '#1e293b' }}>
                  Select Doctor *
                </label>
                <span style={{ fontSize: '11px', color: availableDoctors.length > 0 ? '#16a34a' : '#ef4444', fontWeight: 800 }}>
                  {availableDoctors.length} Doctors Available on {selectedDayName} at {currentBranch}
                </span>
              </div>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    background: '#ffffff',
                    border: '1px solid #cbd5e1',
                    borderRadius: '12px',
                    padding: '0 14px',
                    height: '48px',
                    boxSizing: 'border-box',
                    maxWidth: '420px',
                    cursor: 'pointer'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <User size={16} color="#258ec8" />
                      <span style={{ fontSize: '13px !important', color: selectedDoctor ? '#0f172a' : '#94a3b8', fontWeight: selectedDoctor ? 800 : 500 }}>
                        {selectedDoctor || 'Select Available Doctor'}
                      </span>
                    </div>
                    <ChevronDown size={18} color="#94a3b8" />
                  </div>
                </DropdownMenuTrigger>

                <DropdownMenuContent style={{ maxWidth: '420px' }}>
                  <DropdownMenuGroup>
                    <DropdownMenuLabel>Available Doctors on {selectedDayName} ({currentBranch})</DropdownMenuLabel>
                    {availableDoctors.length === 0 ? (
                      <div style={{ padding: '12px', fontSize: '12px', color: '#ef4444', fontWeight: 700 }}>
                        No Doctors available on {selectedDayName} at {currentBranch}. Please pick another date.
                      </div>
                    ) : (
                      <DropdownMenuRadioGroup value={selectedDoctor} onValueChange={setSelectedDoctor}>
                        {availableDoctors.map(doc => (
                          <DropdownMenuRadioItem key={doc.id} value={doc.name}>
                            {doc.name}
                          </DropdownMenuRadioItem>
                        ))}
                      </DropdownMenuRadioGroup>
                    )}
                  </DropdownMenuGroup>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

          </div>

          {/* 4. Available Slots Section */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px !important', fontWeight: 800, color: '#1e293b', margin: 0 }}>
                <Clock size={16} color="#258ec8" /> Available Slots
              </label>

              {selectedDoctor && (
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={handleAddSlotBefore}
                    style={{
                      background: '#e0f2fe',
                      color: '#0284c7',
                      border: '1px solid #bae6fd',
                      borderRadius: '8px',
                      padding: '5px 10px',
                      fontSize: '11px !important',
                      fontWeight: 800,
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    + Add Slot Before
                  </button>

                  <button
                    type="button"
                    onClick={handleAddSlotAfter}
                    style={{
                      background: '#e0f2fe',
                      color: '#0284c7',
                      border: '1px solid #bae6fd',
                      borderRadius: '8px',
                      padding: '5px 10px',
                      fontSize: '11px !important',
                      fontWeight: 800,
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    + Add Slot After
                  </button>
                </div>
              )}
            </div>

            {!selectedDoctor ? (
              <div style={{ background: '#f8fafc', border: '1px solid #f1f5f9', borderRadius: '12px', padding: '12px 14px', fontSize: '12px !important', color: '#64748b' }}>
                Please select an available doctor to view time slots.
              </div>
            ) : timeSlotsList.length === 0 ? (
              <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '12px', padding: '12px 14px', fontSize: '12px !important', color: '#ef4444', fontWeight: 700 }}>
                No active time slots configured for {selectedDoctor} on {selectedDayName}.
              </div>
            ) : (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                {timeSlotsList.map((slot) => {
                  const isSelected = selectedTimeSlot === slot;
                  const { remainingSlots, isFull } = getSlotCapacityInfo(slot);
                  const normKey = normalizeTimeStr(slot);
                  const tempDocId = tempSlotMap[normKey] || tempSlotMap[slot.trim()];
                  const isTemp = !!tempDocId;

                  return (
                    <div key={slot} style={{ position: 'relative' }}>
                      <button
                        type="button"
                        disabled={isFull}
                        onClick={() => {
                          if (!isFull) {
                            setSelectedTimeSlot(slot);
                          }
                        }}
                        style={{
                          background: isSelected
                            ? (isTemp ? '#ef4444' : '#258ec8')
                            : isTemp
                              ? '#fff5f5'
                              : isFull
                                ? '#f1f5f9'
                                : '#ffffff',
                          color: isSelected
                            ? '#ffffff'
                            : isTemp
                              ? '#dc2626'
                              : isFull
                                ? '#94a3b8'
                                : '#1e293b',
                          border: isSelected
                            ? (isTemp ? '2px solid #b91c1c' : '2px solid #258ec8')
                            : isTemp
                              ? '1.5px solid #ef4444'
                              : isFull
                                ? '1px dashed #cbd5e1'
                                : '1px solid #cbd5e1',
                          borderRadius: '12px',
                          padding: '8px 14px',
                          cursor: isFull ? 'not-allowed' : 'pointer',
                          transition: 'all 0.15s ease',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '3px',
                          minWidth: '85px',
                          opacity: isFull ? 0.65 : 1,
                        }}
                      >
                        <span style={{
                          fontSize: '12.5px !important',
                          fontWeight: 800,
                          textDecoration: isFull ? 'line-through' : 'none'
                        }}>
                          {slot}
                        </span>
                        <span
                          style={{
                            fontSize: '10px !important',
                            fontWeight: 700,
                            padding: '1px 6px',
                            borderRadius: '5px',
                            background: isSelected
                              ? 'rgba(255, 255, 255, 0.25)'
                              : isTemp
                                ? '#fee2e2'
                                : isFull
                                  ? '#fee2e2'
                                  : remainingSlots === 1
                                    ? '#fef3c7'
                                    : '#e0f2fe',
                            color: isSelected
                              ? '#ffffff'
                              : isTemp
                                ? '#dc2626'
                                : isFull
                                  ? '#ef4444'
                                  : remainingSlots === 1
                                    ? '#b45309'
                                    : '#0369a1'
                          }}
                        >
                          {isFull ? 'FULL' : `${remainingSlots} left`}
                        </span>
                      </button>

                      {isTemp && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteTempSlot(tempDocId);
                          }}
                          title="Remove Temporary Slot"
                          style={{
                            position: 'absolute',
                            top: '-5px',
                            right: '-5px',
                            background: '#ef4444',
                            color: '#ffffff',
                            border: 'none',
                            borderRadius: '50%',
                            width: '18px',
                            height: '18px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            zIndex: 10,
                            padding: 0,
                            boxShadow: '0 2px 4px rgba(239, 68, 68, 0.4)'
                          }}
                        >
                          <X size={11} color="#ffffff" />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isSubmitting}
          style={{
            background: '#258ec8',
            color: '#ffffff',
            border: 'none',
            borderRadius: '16px',
            height: '52px',
            fontSize: '15px !important',
            fontWeight: 800,
            cursor: isSubmitting ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '10px',
            boxShadow: '0 4px 14px rgba(37, 142, 200, 0.35)',
            opacity: isSubmitting ? 0.7 : 1
          }}
        >
          <CheckCircle2 size={20} />
          <span>{isSubmitting ? 'Booking Appointment...' : `Confirm Booking at ${currentBranch}`}</span>
        </button>

      </form>

      {/* CALENDAR MODAL */}
      {calendarModalOpen && (
        <div
          onClick={() => setCalendarModalOpen(false)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(15, 23, 42, 0.55)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 99999,
            padding: '20px'
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: '#ffffff',
              borderRadius: '24px',
              padding: '24px',
              width: '100%',
              maxWidth: '350px',
              boxShadow: '0 20px 40px rgba(15, 23, 42, 0.2)',
              border: '1px solid #e2e8f0'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px', paddingBottom: '12px', borderBottom: '1px solid #f1f5f9' }}>
              <button
                type="button"
                onClick={handlePrevMonth}
                style={{ background: '#f1f5f9', border: 'none', borderRadius: '8px', padding: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                <ChevronLeft size={18} color="#258ec8" />
              </button>

              <span style={{ fontSize: '15.5px !important', fontWeight: 800, color: '#0f172a' }}>
                {monthNames[calMonth]} {calYear}
              </span>

              <button
                type="button"
                onClick={handleNextMonth}
                style={{ background: '#f1f5f9', border: 'none', borderRadius: '8px', padding: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                <ChevronRight size={18} color="#258ec8" />
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px', textAlign: 'center', marginBottom: '10px' }}>
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                <span key={d} style={{ fontSize: '11px !important', fontWeight: 700, color: '#64748b' }}>{d}</span>
              ))}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '6px' }}>
              {Array.from({ length: startDayIndex }).map((_, i) => (
                <div key={`empty-${i}`} />
              ))}

              {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(dayNum => {
                const formattedMonth = (calMonth + 1) < 10 ? `0${calMonth + 1}` : `${calMonth + 1}`;
                const formattedDay = dayNum < 10 ? `0${dayNum}` : `${dayNum}`;
                const dayStr = `${formattedDay}-${formattedMonth}-${calYear}`;
                const isSelected = appointmentDate === dayStr;

                return (
                  <button
                    key={dayNum}
                    type="button"
                    onClick={() => {
                      setAppointmentDate(dayStr);
                      setCalendarModalOpen(false);
                    }}
                    style={{
                      width: '38px',
                      height: '38px',
                      borderRadius: '50%',
                      background: isSelected ? '#258ec8' : '#f8fafc',
                      color: isSelected ? '#ffffff' : '#0f172a',
                      border: 'none',
                      fontSize: '12.5px !important',
                      fontWeight: isSelected ? 800 : 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      margin: '0 auto',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    {dayNum}
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              onClick={() => setCalendarModalOpen(false)}
              style={{
                width: '100%',
                marginTop: '18px',
                background: '#f1f5f9',
                color: '#475569',
                border: 'none',
                borderRadius: '12px',
                padding: '10px',
                fontSize: '12.5px !important',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              Close Calendar
            </button>
          </div>
        </div>
      )}

      {/* EXISTING PROFILES MODAL */}
      {existingProfilesModalVisible && (
        <div
          onClick={() => setExistingProfilesModalVisible(false)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(15, 23, 42, 0.55)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 99999,
            padding: '20px'
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '100%',
              maxWidth: '440px',
              background: '#ffffff',
              borderRadius: '20px',
              padding: '24px',
              boxShadow: '0 20px 40px rgba(0, 0, 0, 0.2)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#0f172a' }}>
                  Existing Profiles Found ({existingProfilesList.length})
                </h3>
                <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#64748b' }}>
                  Phone: +91 {checkedPhone}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setExistingProfilesModalVisible(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ maxHeight: '280px', overflowY: 'auto', marginBottom: '16px' }}>
              {existingProfilesList.map((prof, index) => (
                <div
                  key={prof.id || index}
                  onClick={() => handleSelectExistingProfile(prof)}
                  style={{
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: '10px',
                    padding: '12px',
                    marginBottom: '8px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    cursor: 'pointer'
                  }}
                >
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a' }}>
                      {prof.fullName}
                    </div>
                    <div style={{ fontSize: '12px', color: '#0284c7', marginTop: '2px' }}>
                      Reg ID: {prof.registrationId}
                    </div>
                    {(prof.gender || prof.age) && (
                      <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                        {[prof.gender, prof.age ? `${prof.age} YRS` : ''].filter(Boolean).join(' • ')}
                      </div>
                    )}
                  </div>
                  <div style={{ background: '#e0f2fe', padding: '6px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: 700, color: '#0284c7' }}>
                    Select
                  </div>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button
                type="button"
                onClick={() => {
                  setBypassPhoneCheck(true);
                  setExistingProfilesModalVisible(false);
                }}
                style={{
                  background: '#f1f5f9',
                  color: '#475569',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '10px 16px',
                  fontSize: '13px',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                Create New Patient
              </button>
            </div>
          </div>
        </div>
      )}
      {/* APPOINTMENT BOOKING CONFIRMATION POPUP MODAL */}
      {showConfirmModal && confirmedBooking && (
        <div
          onClick={() => setShowConfirmModal(false)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 999999,
            padding: '20px'
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: '#ffffff',
              borderRadius: '24px',
              padding: '28px',
              width: '100%',
              maxWidth: '480px',
              boxShadow: '0 25px 50px -12px rgba(15, 23, 42, 0.25)',
              border: '1px solid #e2e8f0',
              textAlign: 'center',
              position: 'relative'
            }}
          >
            <button
              onClick={() => setShowConfirmModal(false)}
              style={{
                position: 'absolute',
                top: '16px',
                right: '16px',
                background: '#f1f5f9',
                border: 'none',
                borderRadius: '50%',
                width: '32px',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: '#64748b'
              }}
            >
              <X size={18} />
            </button>

            {/* Success Icon Header */}
            <div style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              background: '#dcfce7',
              color: '#16a34a',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px auto',
              boxShadow: '0 0 0 8px #f0fdf4'
            }}>
              <CheckCircle2 size={36} />
            </div>

            <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#0f172a', margin: '0 0 6px 0' }}>
              Appointment Confirmed!
            </h2>
            <p style={{ fontSize: '13px', color: '#64748b', margin: '0 0 20px 0' }}>
              Appointment successfully registered and saved.
            </p>

            {/* Registration ID Highlight Badge */}
            <div style={{
              background: 'linear-gradient(135deg, #e0f2fe 0%, #bae6fd 100%)',
              border: '1px solid #7dd3fc',
              borderRadius: '14px',
              padding: '12px 16px',
              marginBottom: '20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <span style={{ fontSize: '11px', fontWeight: 800, color: '#0369a1', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Registration ID
              </span>
              <span style={{ fontSize: '15px', fontWeight: 900, color: '#0284c7', fontFamily: 'monospace' }}>
                {confirmedBooking.registrationId}
              </span>
            </div>

            {/* Appointment Summary Grid */}
            <div style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '16px',
              padding: '16px',
              marginBottom: '24px',
              textAlign: 'left',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '12.5px', color: '#64748b', fontWeight: 600 }}>Patient Name</span>
                <span style={{ fontSize: '13.5px', color: '#0f172a', fontWeight: 800 }}>{confirmedBooking.patientName}</span>
              </div>
              <div style={{ height: '1px', background: '#f1f5f9' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '12.5px', color: '#64748b', fontWeight: 600 }}>Phone Number</span>
                <span style={{ fontSize: '13.5px', color: '#0f172a', fontWeight: 800 }}>+91 {confirmedBooking.phone}</span>
              </div>
              <div style={{ height: '1px', background: '#f1f5f9' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '12.5px', color: '#64748b', fontWeight: 600 }}>Doctor</span>
                <span style={{ fontSize: '13.5px', color: '#0284c7', fontWeight: 800 }}>{confirmedBooking.doctorName}</span>
              </div>
              <div style={{ height: '1px', background: '#f1f5f9' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '12.5px', color: '#64748b', fontWeight: 600 }}>Branch</span>
                <span style={{ fontSize: '13.5px', color: '#0f172a', fontWeight: 800 }}>{confirmedBooking.branch}</span>
              </div>
              <div style={{ height: '1px', background: '#f1f5f9' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '12.5px', color: '#64748b', fontWeight: 600 }}>Date & Time</span>
                <span style={{ fontSize: '13.5px', color: '#16a34a', fontWeight: 800 }}>
                  {confirmedBooking.appointmentDate} @ {confirmedBooking.appointmentTime}
                </span>
              </div>
              <div style={{ height: '1px', background: '#f1f5f9' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '12.5px', color: '#64748b', fontWeight: 600 }}>Consultation Mode</span>
                <span style={{
                  fontSize: '11px',
                  fontWeight: 800,
                  color: confirmedBooking.consultationMode === 'Online' ? '#7c3aed' : '#0284c7',
                  background: confirmedBooking.consultationMode === 'Online' ? '#f3e8ff' : '#e0f2fe',
                  padding: '2px 8px',
                  borderRadius: '6px'
                }}>
                  {confirmedBooking.consultationMode || 'In-Clinic'}
                </span>
              </div>
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                type="button"
                onClick={() => window.print()}
                style={{
                  flex: 1,
                  background: '#f1f5f9',
                  color: '#475569',
                  border: '1px solid #cbd5e1',
                  borderRadius: '12px',
                  padding: '12px',
                  fontSize: '13.5px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px'
                }}
              >
                <Printer size={16} />
                Print Receipt
              </button>
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                style={{
                  flex: 1,
                  background: '#f1f5f9',
                  color: '#0f172a',
                  border: '1px solid #cbd5e1',
                  borderRadius: '12px',
                  padding: '12px',
                  fontSize: '13px',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                Book Another
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowConfirmModal(false);
                  if (onNavigate) {
                    onNavigate('reception_dashboard');
                  }
                }}
                style={{
                  flex: 1.5,
                  background: '#258ec8',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '12px',
                  padding: '12px',
                  fontSize: '13.5px',
                  fontWeight: 800,
                  cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(37, 142, 200, 0.3)'
                }}
              >
                Go to Dashboard
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
