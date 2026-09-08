import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Alert, TextInput, BackHandler } from 'react-native';
import { Ionicons, Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { collection, onSnapshot, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from '@app/shared';

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
  doctorDate?: string;
  branchSchedules: BranchSchedule[];
}

const DAYS: DayName[] = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const BRANCHES = ['KPHB Branch', 'Nallagandla Branch', 'Dilshuknagar Branch', 'Chandanagar Branch'];

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

export const DoctorTimingsScreen: React.FC = () => {
  const [doctorsList, setDoctorsList] = useState<Doctor[]>(DEFAULT_DOCTORS_SEED);
  const [selectedDoctorId, setSelectedDoctorId] = useState<string | null>(null);

  // Hardware Back Button Handler for Native Mobile App Navigation
  useEffect(() => {
    const onBackPress = () => {
      if (selectedDoctorId !== null) {
        setSelectedDoctorId(null);
        return true; // intercept back press to return to directory view
      }
      return false; // let parent screen / app handle back
    };

    const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => subscription.remove();
  }, [selectedDoctorId]);

  // Firestore Live Listener
  useEffect(() => {
    if (!db) return;
    const docColRef = collection(db, 'doctors');

    const unsubscribe = onSnapshot(docColRef, async (snapshot) => {
      if (snapshot.empty) {
        for (const item of DEFAULT_DOCTORS_SEED) {
          try {
            await setDoc(doc(db, 'doctors', item.id), item);
          } catch (e) {
            console.warn('Seed doctor error on mobile:', e);
          }
        }
      }

      const loaded = snapshot.docs.map(docSnap => {
        const data = docSnap.data();
        const normDataName = (data.name || data.doctorName || '').toLowerCase().replace(/dr\.?\s*/i, '').trim();
        const digits = (data.mobile || data.phone || '').replace(/\D/g, '');

        const seedFallback = DEFAULT_DOCTORS_SEED.find(s => {
          const normSeedName = s.name.toLowerCase().replace(/dr\.?\s*/i, '').trim();
          if (normDataName && (normSeedName.includes(normDataName) || normDataName.includes(normSeedName))) return true;
          if (digits && s.phone.includes(digits)) return true;
          return s.id === docSnap.id;
        }) || DEFAULT_DOCTORS_SEED.find(s => s.id === docSnap.id);

        return {
          id: docSnap.id,
          name: data.name || data.doctorName || seedFallback?.name || 'Doctor',
          phone: data.mobile || data.phone || seedFallback?.phone || '9000000000',
          role: data.role || data.category || seedFallback?.role || 'Homeopathy Physician',
          doctorDate: data.doctorDate || data.date || '',
          branchSchedules: (data.branchSchedules && Array.isArray(data.branchSchedules) && data.branchSchedules.length > 0)
            ? data.branchSchedules
            : (seedFallback?.branchSchedules || [])
        } as Doctor;
      });

      DEFAULT_DOCTORS_SEED.forEach(seed => {
        if (!loaded.some(d => d.id === seed.id || d.name.toLowerCase() === seed.name.toLowerCase())) {
          loaded.push(seed);
        }
      });

      setDoctorsList(loaded);
    }, (err) => {
      console.warn('Mobile doctors firestore error:', err);
    });

    return () => unsubscribe();
  }, []);

  const selectedDoctor = doctorsList.find(d => d.id === selectedDoctorId);

  // Helper to get Doctor Initials Avatar Badge
  const getDoctorInitials = (name: string) => {
    const clean = name.replace(/^Dr\.\s*/i, '').trim();
    const parts = clean.split(' ').filter(Boolean);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    if (parts.length === 1 && parts[0].length >= 2) return parts[0].slice(0, 2).toUpperCase();
    return 'DR';
  };

  // Helper to mutate selected doctor's schedule
  const updateCurrentDoctor = (updater: (doc: Doctor) => Doctor) => {
    if (!selectedDoctor) return;
    setDoctorsList(prev => prev.map(d => d.id === selectedDoctor.id ? updater(d) : d));
  };

  // Branch Schedule Actions
  const handleAddBranchSchedule = () => {
    if (!selectedDoctor) return;
    const newBs: BranchSchedule = {
      id: 'bs-' + Date.now(),
      targetBranch: 'KPHB Branch',
      selectedDay: 'Mon',
      daySchedules: {
        Mon: { status: 'Available', slots: [{ startHour: '10', startMinute: '00', startAmPm: 'AM', endHour: '01', endMinute: '00', endAmPm: 'PM' }] },
        Tue: { status: 'Available', slots: [{ startHour: '10', startMinute: '00', startAmPm: 'AM', endHour: '01', endMinute: '00', endAmPm: 'PM' }] },
        Wed: { status: 'Available', slots: [{ startHour: '10', startMinute: '00', startAmPm: 'AM', endHour: '01', endMinute: '00', endAmPm: 'PM' }] },
        Thu: { status: 'Available', slots: [{ startHour: '10', startMinute: '00', startAmPm: 'AM', endHour: '01', endMinute: '00', endAmPm: 'PM' }] },
        Fri: { status: 'Available', slots: [{ startHour: '10', startMinute: '00', startAmPm: 'AM', endHour: '01', endMinute: '00', endAmPm: 'PM' }] },
        Sat: { status: 'Available', slots: [{ startHour: '10', startMinute: '00', startAmPm: 'AM', endHour: '01', endMinute: '00', endAmPm: 'PM' }] },
        Sun: { status: 'Closed', slots: [] }
      }
    };

    updateCurrentDoctor(doc => ({
      ...doc,
      branchSchedules: [...(doc.branchSchedules || []), newBs]
    }));
  };

  const handleRemoveBranchSchedule = (bsId: string) => {
    updateCurrentDoctor(doc => ({
      ...doc,
      branchSchedules: doc.branchSchedules.filter(b => b.id !== bsId)
    }));
  };

  const handleUpdateTargetBranch = (bsId: string, branchName: string) => {
    updateCurrentDoctor(doc => ({
      ...doc,
      branchSchedules: doc.branchSchedules.map(b => b.id === bsId ? { ...b, targetBranch: branchName } : b)
    }));
  };

  const handleSelectDay = (bsId: string, day: DayName) => {
    updateCurrentDoctor(doc => ({
      ...doc,
      branchSchedules: doc.branchSchedules.map(b => b.id === bsId ? { ...b, selectedDay: day } : b)
    }));
  };

  const handleToggleDayStatus = (bsId: string, day: DayName, status: 'Available' | 'Closed') => {
    updateCurrentDoctor(doc => ({
      ...doc,
      branchSchedules: doc.branchSchedules.map(b => {
        if (b.id !== bsId) return b;
        const currentSched = b.daySchedules[day] || { status: 'Closed', slots: [] };
        const newSlots = status === 'Available' && currentSched.slots.length === 0
          ? [{ startHour: '10', startMinute: '00', startAmPm: 'AM', endHour: '02', endMinute: '00', endAmPm: 'PM' }]
          : currentSched.slots;
        return {
          ...b,
          daySchedules: {
            ...b.daySchedules,
            [day]: { status, slots: newSlots }
          }
        };
      })
    }));
  };

  const handleAddSlot = (bsId: string, day: DayName) => {
    updateCurrentDoctor(doc => ({
      ...doc,
      branchSchedules: doc.branchSchedules.map(b => {
        if (b.id !== bsId) return b;
        const currentDaySched = b.daySchedules[day] || { status: 'Available', slots: [] };
        return {
          ...b,
          daySchedules: {
            ...b.daySchedules,
            [day]: {
              ...currentDaySched,
              status: 'Available',
              slots: [
                ...currentDaySched.slots,
                { startHour: '05', startMinute: '00', startAmPm: 'PM', endHour: '08', endMinute: '00', endAmPm: 'PM' }
              ]
            }
          }
        };
      })
    }));
  };

  const handleUpdateSlot = (bsId: string, day: DayName, slotIdx: number, field: keyof TimeSlot, value: string) => {
    updateCurrentDoctor(doc => ({
      ...doc,
      branchSchedules: doc.branchSchedules.map(b => {
        if (b.id !== bsId) return b;
        const currentDaySched = b.daySchedules[day];
        const newSlots = currentDaySched.slots.map((s, idx) => idx === slotIdx ? { ...s, [field]: value } : s);
        return {
          ...b,
          daySchedules: {
            ...b.daySchedules,
            [day]: { ...currentDaySched, slots: newSlots }
          }
        };
      })
    }));
  };

  const handleRemoveSlot = (bsId: string, day: DayName, slotIdx: number) => {
    updateCurrentDoctor(doc => ({
      ...doc,
      branchSchedules: doc.branchSchedules.map(b => {
        if (b.id !== bsId) return b;
        const currentDaySched = b.daySchedules[day];
        const newSlots = currentDaySched.slots.filter((_, idx) => idx !== slotIdx);
        return {
          ...b,
          daySchedules: {
            ...b.daySchedules,
            [day]: { ...currentDaySched, slots: newSlots }
          }
        };
      })
    }));
  };

  // Overlap Detection Helpers
  const slotToMinutes = (hour: string, min: string, amPm: 'AM' | 'PM') => {
    let h = parseInt(hour, 10) || 12;
    if (amPm === 'PM' && h < 12) h += 12;
    if (amPm === 'AM' && h === 12) h = 0;
    return h * 60 + (parseInt(min, 10) || 0);
  };

  const doSlotsOverlap = (slotA: TimeSlot, slotB: TimeSlot) => {
    const startA = slotToMinutes(slotA.startHour, slotA.startMinute, slotA.startAmPm);
    const endA = slotToMinutes(slotA.endHour, slotA.endMinute, slotA.endAmPm);
    const startB = slotToMinutes(slotB.startHour, slotB.startMinute, slotB.startAmPm);
    const endB = slotToMinutes(slotB.endHour, slotB.endMinute, slotB.endAmPm);

    return startA < endB && startB < endA;
  };

  const getOverlappingConflict = (doctor: Doctor | undefined, currentBsId: string, day: DayName, slot: TimeSlot, currentSlotIdx: number) => {
    if (!doctor || !doctor.branchSchedules) return null;

    for (const bs of doctor.branchSchedules) {
      const daySched = bs.daySchedules[day];
      if (daySched && daySched.status === 'Available' && daySched.slots) {
        for (let idx = 0; idx < daySched.slots.length; idx++) {
          if (bs.id === currentBsId && idx === currentSlotIdx) continue;
          const otherSlot = daySched.slots[idx];
          if (doSlotsOverlap(slot, otherSlot)) {
            return {
              branch: bs.targetBranch,
              timeStr: `${otherSlot.startHour}:${otherSlot.startMinute} ${otherSlot.startAmPm} - ${otherSlot.endHour}:${otherSlot.endMinute} ${otherSlot.endAmPm}`
            };
          }
        }
      }
    }
    return null;
  };

  // Save Doctor Schedule to Firestore
  const handleSaveAll = async () => {
    if (!selectedDoctor) return;

    // Validate overlapping slots
    let conflictFound: { day: DayName; branch: string; conflictBranch: string; timeStr: string } | null = null;

    for (const bs of selectedDoctor.branchSchedules || []) {
      for (const d of DAYS) {
        const daySched = bs.daySchedules[d];
        if (daySched && daySched.status === 'Available' && daySched.slots) {
          for (let sIdx = 0; sIdx < daySched.slots.length; sIdx++) {
            const conflict = getOverlappingConflict(selectedDoctor, bs.id, d, daySched.slots[sIdx], sIdx);
            if (conflict) {
              conflictFound = {
                day: d,
                branch: bs.targetBranch,
                conflictBranch: conflict.branch,
                timeStr: conflict.timeStr
              };
              break;
            }
          }
        }
        if (conflictFound) break;
      }
      if (conflictFound) break;
    }

    if (conflictFound) {
      Alert.alert(
        'Schedule Overlap Conflict',
        `Cannot Save: ${selectedDoctor.name} has an overlapping shift on ${conflictFound.day} between ${conflictFound.branch} and ${conflictFound.conflictBranch} (${conflictFound.timeStr}). Please fix the conflicting time slot before saving.`
      );
      return;
    }

    try {
      if (db) {
        await setDoc(doc(db, 'doctors', selectedDoctor.id), {
          ...selectedDoctor,
          mobile: selectedDoctor.phone,
          category: selectedDoctor.role
        }, { merge: true });
      }
      Alert.alert('Schedules Saved!', `Timings successfully updated in Firestore for ${selectedDoctor.name}.`);
    } catch (e) {
      console.error('Mobile save error:', e);
      Alert.alert('Error', 'Failed to save schedules to Firestore.');
    }
  };

  // Delete Doctor Profile
  const handleDeleteDoctor = (doctorId: string, doctorName: string) => {
    Alert.alert(
      'Delete Doctor Profile',
      `Are you sure you want to delete ${doctorName} from Firestore?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              if (db) {
                await deleteDoc(doc(db, 'doctors', doctorId));
              }
              if (selectedDoctorId === doctorId) {
                setSelectedDoctorId(null);
              }
            } catch (e) {
              console.error('Error deleting doctor in mobile:', e);
            }
          }
        }
      ]
    );
  };

  // Add New Doctor Profile
  const handleAddDoctor = () => {
    Alert.prompt(
      'Add Doctor Profile',
      'Enter doctor name:',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Add',
          onPress: async (name) => {
            if (!name) return;
            const newId = 'doc-' + Date.now();
            const newDoc: Doctor = {
              id: newId,
              name: name.trim(),
              phone: '9000000000',
              role: 'Homeopathy Physician',
              branchSchedules: [
                {
                  id: 'bs-' + newId,
                  targetBranch: 'KPHB Branch',
                  selectedDay: 'Mon',
                  daySchedules: {
                    Mon: { status: 'Available', slots: [{ startHour: '10', startMinute: '00', startAmPm: 'AM', endHour: '02', endMinute: '00', endAmPm: 'PM' }] },
                    Tue: { status: 'Available', slots: [{ startHour: '10', startMinute: '00', startAmPm: 'AM', endHour: '02', endMinute: '00', endAmPm: 'PM' }] },
                    Wed: { status: 'Available', slots: [{ startHour: '10', startMinute: '00', startAmPm: 'AM', endHour: '02', endMinute: '00', endAmPm: 'PM' }] },
                    Thu: { status: 'Available', slots: [{ startHour: '10', startMinute: '00', startAmPm: 'AM', endHour: '02', endMinute: '00', endAmPm: 'PM' }] },
                    Fri: { status: 'Available', slots: [{ startHour: '10', startMinute: '00', startAmPm: 'AM', endHour: '02', endMinute: '00', endAmPm: 'PM' }] },
                    Sat: { status: 'Available', slots: [{ startHour: '10', startMinute: '00', startAmPm: 'AM', endHour: '02', endMinute: '00', endAmPm: 'PM' }] },
                    Sun: { status: 'Closed', slots: [] }
                  }
                }
              ]
            };

            try {
              if (db) {
                await setDoc(doc(db, 'doctors', newId), newDoc);
              }
              setSelectedDoctorId(newId);
            } catch (e) {
              console.error('Error adding doctor on mobile:', e);
            }
          }
        }
      ]
    );
  };

  // Helper to format slots into clean readable string
  const formatSlotListStr = (slots: TimeSlot[]) => {
    if (!slots || slots.length === 0) return 'No slots';
    return slots.map(s => `${s.startHour}:${s.startMinute}${s.startAmPm} - ${s.endHour}:${s.endMinute}${s.endAmPm}`).join(' & ');
  };

  // Helper to render branch schedule breakdown cards in View 1 (Directory View)
  const renderDoctorBranchBreakdown = (doc: Doctor) => {
    if (!doc.branchSchedules || doc.branchSchedules.length === 0) {
      return <Text style={{ fontSize: 12, color: '#94a3b8', fontStyle: 'italic' }}>No branch schedules configured</Text>;
    }

    return (
      <View style={{ gap: 8 }}>
        {doc.branchSchedules.map(bs => {
          const activeDays = DAYS.filter(d => bs.daySchedules?.[d]?.status === 'Available' && (bs.daySchedules[d].slots?.length || 0) > 0);

          if (activeDays.length === 0) {
            return (
              <View key={bs.id} style={styles.branchBreakdownRow}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <Ionicons name="location" size={14} color="#64748b" />
                  <Text style={[styles.branchNameText, { color: '#64748b' }]}>{bs.targetBranch}</Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: '#fef2f2' }]}>
                  <Text style={[styles.statusBadgeText, { color: '#ef4444' }]}>Unavailable / Closed</Text>
                </View>
              </View>
            );
          }

          // Build grouped map: slotStr -> array of days
          const groupedMap: Record<string, DayName[]> = {};
          activeDays.forEach(d => {
            const slotStr = formatSlotListStr(bs.daySchedules[d].slots);
            if (!groupedMap[slotStr]) groupedMap[slotStr] = [];
            groupedMap[slotStr].push(d);
          });

          return (
            <View key={bs.id} style={styles.branchBreakdownRow}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <Ionicons name="location" size={14} color="#258ec8" />
                  <Text style={styles.branchNameText}>{bs.targetBranch}</Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: '#dcfce7' }]}>
                  <Text style={[styles.statusBadgeText, { color: '#15803d' }]}>Active Branch</Text>
                </View>
              </View>

              {Object.entries(groupedMap).map(([slotStr, daysArr], gIdx) => (
                <View key={gIdx} style={{ marginTop: 2, paddingLeft: 18 }}>
                  <Text style={styles.daysScheduleText}>
                    <Text style={{ fontWeight: '800', color: '#0f172a' }}>{daysArr.join(', ')}:</Text> {slotStr}
                  </Text>
                </View>
              ))}
            </View>
          );
        })}
      </View>
    );
  };

  // VIEW 1: ALL DOCTORS DIRECTORY LIST
  if (!selectedDoctor) {
    return (
      <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        {/* Action Button Row */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, paddingHorizontal: 4 }}>
          <Text style={{ fontSize: 13, fontWeight: '700', color: '#64748b' }}>
            Select a doctor to configure weekly timings:
          </Text>
          <TouchableOpacity
            style={styles.addDoctorTopBtn}
            onPress={handleAddDoctor}
          >
            <Ionicons name="add-circle" size={15} color="#ffffff" style={{ marginRight: 4 }} />
            <Text style={styles.addDoctorTopBtnText}>Add Doctor</Text>
          </TouchableOpacity>
        </View>

        {doctorsList.map(d => (
          <TouchableOpacity
            key={d.id}
            activeOpacity={0.85}
            onPress={() => setSelectedDoctorId(d.id)}
            style={styles.doctorCardFull}
          >
            <View style={styles.cardHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1, marginRight: 6 }}>
                <View style={styles.avatarCircle}>
                  <Text style={styles.avatarText}>{getDoctorInitials(d.name)}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardTitle} numberOfLines={1} ellipsizeMode="tail">{d.name}</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
                    <Ionicons name="call-outline" size={12} color="#258ec8" />
                    <Text style={styles.cardPhone} numberOfLines={1}>+91 {d.phone}</Text>
                  </View>
                </View>
              </View>

              <View style={styles.roleBadge}>
                <MaterialCommunityIcons name="stethoscope" size={12} color="#0284c7" style={{ marginRight: 3 }} />
                <Text style={styles.roleText} numberOfLines={1}>{d.role}</Text>
              </View>
            </View>

            <View style={styles.cardActionRow}>
              <TouchableOpacity
                style={styles.configBtn}
                onPress={() => setSelectedDoctorId(d.id)}
              >
                <Ionicons name="calendar-outline" size={15} color="#ffffff" style={{ marginRight: 6 }} />
                <Text style={styles.configBtnText}>Configure Schedule →</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.deleteBtn}
                onPress={() => handleDeleteDoctor(d.id, d.name)}
              >
                <Ionicons name="trash-outline" size={15} color="#ef4444" />
                <Text style={styles.deleteBtnText}>Delete</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    );
  }

  // VIEW 2: DETAILED DOCTOR SCHEDULE CONFIGURATION SCREEN
  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 50 }} showsVerticalScrollIndicator={false}>
      {/* Sleek Header Bar */}
      <View style={styles.doctorDetailHeaderRow}>
        <TouchableOpacity
          onPress={() => setSelectedDoctorId(null)}
          style={styles.doctorDetailBackBtn}
        >
          <Ionicons name="arrow-back" size={16} color="#0284c7" style={{ marginRight: 4 }} />
          <Text style={styles.doctorDetailBackBtnText}>Back to Doctors</Text>
        </TouchableOpacity>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 1, marginLeft: 8 }}>
          <View style={styles.avatarCircleSmall}>
            <Text style={styles.avatarTextSmall}>{getDoctorInitials(selectedDoctor.name)}</Text>
          </View>
          <View style={{ flexShrink: 1 }}>
            <Text style={styles.doctorDetailTitle} numberOfLines={1} ellipsizeMode="tail">{selectedDoctor.name}</Text>
            <Text style={styles.doctorDetailSub} numberOfLines={1}>{selectedDoctor.role}</Text>
          </View>
        </View>
      </View>

      {/* Target Branch Cards */}
      {(selectedDoctor.branchSchedules || []).map((bs) => {
        const activeDay = bs.selectedDay || 'Mon';
        const daySched = bs.daySchedules?.[activeDay] || { status: 'Closed', slots: [] };

        return (
          <View key={bs.id} style={styles.branchCardFull}>
            {/* Target Branch Header & Selector */}
            <View style={styles.branchCardHeader}>
              <View style={{ flex: 1, marginRight: 8, overflow: 'hidden' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 6 }}>
                  <Ionicons name="location-outline" size={15} color="#258ec8" />
                  <Text style={styles.sectionLabel}>Target Branch</Text>
                </View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
                  {BRANCHES.map(bName => (
                    <TouchableOpacity
                      key={bName}
                      onPress={() => handleUpdateTargetBranch(bs.id, bName)}
                      style={[
                        styles.branchSelectChip,
                        bs.targetBranch === bName && styles.branchSelectChipActive
                      ]}
                    >
                      {bs.targetBranch === bName && (
                        <Ionicons name="checkmark-circle" size={13} color="#ffffff" style={{ marginRight: 4 }} />
                      )}
                      <Text style={[
                        styles.branchSelectChipText,
                        bs.targetBranch === bName && styles.branchSelectChipTextActive
                      ]}>
                        {bName.replace(' Branch', '')}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
              <TouchableOpacity
                onPress={() => handleRemoveBranchSchedule(bs.id)}
                style={styles.removeIconSquareBtn}
              >
                <Ionicons name="trash-outline" size={16} color="#ef4444" />
              </TouchableOpacity>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 6 }}>
              <Ionicons name="calendar-outline" size={15} color="#258ec8" />
              <Text style={styles.sectionLabel}>Weekly Schedule (Select Day)</Text>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }} style={{ marginBottom: 12 }}>
              {DAYS.map(day => {
                const isSelected = activeDay === day;
                const isOff = bs.daySchedules?.[day]?.status === 'Closed';
                return (
                  <TouchableOpacity
                    key={day}
                    onPress={() => handleSelectDay(bs.id, day)}
                    style={[styles.dayChip, isSelected && styles.dayChipActive]}
                  >
                    <View style={[
                      styles.dayDot,
                      isOff ? styles.dayDotOff : styles.dayDotActive,
                      isSelected && { backgroundColor: '#ffffff' }
                    ]} />
                    <Text style={[styles.dayChipText, isSelected && styles.dayChipTextActive]}>{day}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
            {/* Horizontal Divider Line */}
            <View style={styles.cardDividerLine} />
            {/* Row 1: Day Status Toggle */}
            <View style={styles.statusRowContainer}>
              <Text style={styles.slotHeaderText}>{activeDay} Status:</Text>
              <View style={{ flexDirection: 'row', gap: 6 }}>
                <TouchableOpacity
                  onPress={() => handleToggleDayStatus(bs.id, activeDay, 'Available')}
                  style={[styles.statusToggleBtn, daySched.status === 'Available' && styles.statusToggleBtnActive]}
                >
                  <Ionicons
                    name="checkmark-circle"
                    size={14}
                    color={daySched.status === 'Available' ? '#15803d' : '#64748b'}
                    style={{ marginRight: 4 }}
                  />
                  <Text style={[styles.statusToggleText, daySched.status === 'Available' && styles.statusToggleTextActive]}>Available</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => handleToggleDayStatus(bs.id, activeDay, 'Closed')}
                  style={[styles.statusToggleBtn, daySched.status === 'Closed' && styles.statusToggleBtnClosed]}
                >
                  <Ionicons
                    name="close-circle"
                    size={14}
                    color={daySched.status === 'Closed' ? '#ef4444' : '#64748b'}
                    style={{ marginRight: 4 }}
                  />
                  <Text style={[styles.statusToggleText, daySched.status === 'Closed' && styles.statusToggleTextClosed]}>Closed</Text>
                </TouchableOpacity>
              </View>
            </View>
            {/* Row 2: Dedicated Add Time Slot Button */}
            {daySched.status === 'Available' && (
              <TouchableOpacity
                onPress={() => handleAddSlot(bs.id, activeDay)}
                style={styles.addSlotDedicatedBtn}
              >
                <Ionicons name="add-circle" size={16} color="#0284c7" style={{ marginRight: 6 }} />
                <Text style={styles.addSlotDedicatedBtnText}>+ Add Time Slot for {activeDay}</Text>
              </TouchableOpacity>
            )}
            {/* Time Slot List */}
            {daySched.status === 'Available' ? (
              <View style={{ gap: 8, marginTop: 10 }}>
                {daySched.slots && daySched.slots.length > 0 ? (
                  daySched.slots.map((slot, sIdx) => {
                    const conflict = getOverlappingConflict(selectedDoctor, bs.id, activeDay, slot, sIdx);

                    return (
                      <View key={sIdx} style={[styles.slotCardContainer, conflict ? { borderColor: '#ef4444', backgroundColor: '#fff5f5' } : {}]}>
                        {/* Slot Header Row */}
                        <View style={styles.slotCardHeader}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            <Ionicons name="time-outline" size={15} color="#258ec8" />
                            <Text style={styles.slotCardTitle}>Time Slot {sIdx + 1}</Text>
                          </View>

                          <TouchableOpacity
                            onPress={() => handleRemoveSlot(bs.id, activeDay, sIdx)}
                            style={styles.deleteSlotSquareBtn}
                          >
                            <Ionicons name="trash-outline" size={15} color="#ef4444" />
                          </TouchableOpacity>
                        </View>

                        {conflict && (
                          <View style={styles.conflictBanner}>
                            <Ionicons name="warning-outline" size={14} color="#ef4444" style={{ marginRight: 4 }} />
                            <Text style={styles.conflictBannerText}>
                              Overlaps with {conflict.branch} ({conflict.timeStr})
                            </Text>
                          </View>
                        )}

                        {/* Spacious Time Selectors Grid */}
                        <View style={styles.timeSelectorsRow}>
                          {/* Start Time Column */}
                          <View style={styles.timeGroupCol}>
                            <Text style={styles.timeGroupLabel}>START TIME</Text>
                            <View style={styles.timeBoxRow}>
                              <TextInput
                                style={styles.timeInputBox}
                                value={slot.startHour}
                                keyboardType="numeric"
                                maxLength={2}
                                onChangeText={(val) => handleUpdateSlot(bs.id, activeDay, sIdx, 'startHour', val)}
                              />
                              <Text style={styles.timeColon}>:</Text>
                              <TextInput
                                style={styles.timeInputBox}
                                value={slot.startMinute}
                                keyboardType="numeric"
                                maxLength={2}
                                onChangeText={(val) => handleUpdateSlot(bs.id, activeDay, sIdx, 'startMinute', val)}
                              />
                              <TouchableOpacity
                                style={styles.ampmBtn}
                                onPress={() => handleUpdateSlot(bs.id, activeDay, sIdx, 'startAmPm', slot.startAmPm === 'AM' ? 'PM' : 'AM')}
                              >
                                <Text style={styles.ampmBtnText}>{slot.startAmPm}</Text>
                              </TouchableOpacity>
                            </View>
                          </View>

                          <View style={styles.timeArrowDivider}>
                            <Ionicons name="arrow-forward" size={14} color="#94a3b8" />
                          </View>

                          {/* End Time Column */}
                          <View style={styles.timeGroupCol}>
                            <Text style={styles.timeGroupLabel}>END TIME</Text>
                            <View style={styles.timeBoxRow}>
                              <TextInput
                                style={styles.timeInputBox}
                                value={slot.endHour}
                                keyboardType="numeric"
                                maxLength={2}
                                onChangeText={(val) => handleUpdateSlot(bs.id, activeDay, sIdx, 'endHour', val)}
                              />
                              <Text style={styles.timeColon}>:</Text>
                              <TextInput
                                style={styles.timeInputBox}
                                value={slot.endMinute}
                                keyboardType="numeric"
                                maxLength={2}
                                onChangeText={(val) => handleUpdateSlot(bs.id, activeDay, sIdx, 'endMinute', val)}
                              />
                              <TouchableOpacity
                                style={styles.ampmBtn}
                                onPress={() => handleUpdateSlot(bs.id, activeDay, sIdx, 'endAmPm', slot.endAmPm === 'AM' ? 'PM' : 'AM')}
                              >
                                <Text style={styles.ampmBtnText}>{slot.endAmPm}</Text>
                              </TouchableOpacity>
                            </View>
                          </View>
                        </View>
                      </View>
                    );
                  })
                ) : (
                  <View style={styles.emptySlotBox}>
                    <Ionicons name="time-outline" size={22} color="#cbd5e1" style={{ marginBottom: 4 }} />
                    <Text style={styles.emptySlotText}>No time slots configured for {activeDay}.</Text>
                  </View>
                )}
              </View>
            ) : (
              <View style={styles.closedBannerFull}>
                <Ionicons name="moon-outline" size={18} color="#ef4444" style={{ marginBottom: 4 }} />
                <Text style={{ fontSize: 12.5, fontWeight: '800', color: '#ef4444' }}>
                  Unavailable / Closed on {activeDay} for {bs.targetBranch}
                </Text>
              </View>
            )}
          </View>
        );
      })}

      {/* Add Branch Schedule Button */}
      <TouchableOpacity
        onPress={handleAddBranchSchedule}
        style={styles.addBranchBtnFull}
      >
        <Ionicons name="add-circle-outline" size={18} color="#258ec8" style={{ marginRight: 6 }} />
        <Text style={styles.addBranchBtnTextFull}>Add Branch Schedule Card</Text>
      </TouchableOpacity>

      {/* Save Button */}
      <TouchableOpacity
        onPress={handleSaveAll}
        style={styles.saveBtnFull}
      >
        <Ionicons name="save-outline" size={18} color="#ffffff" style={{ marginRight: 6 }} />
        <Text style={styles.saveBtnTextFull}>Save Profile & Schedules</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc', paddingHorizontal: 14, paddingTop: 12 },
  topHeaderBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, paddingHorizontal: 2 },
  title: { fontSize: 19, fontWeight: '800', color: '#0f172a' },
  subTitle: { fontSize: 12, color: '#64748b', marginTop: 2 },
  addDoctorTopBtn: { backgroundColor: '#258ec8', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, flexDirection: 'row', alignItems: 'center' },
  addDoctorTopBtnText: { color: '#ffffff', fontSize: 12, fontWeight: '800' },
  doctorCardFull: { backgroundColor: '#ffffff', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: '#cbd5e1', marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 6, elevation: 2 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, flexWrap: 'wrap', gap: 6 },
  avatarCircle: { width: 42, height: 42, borderRadius: 21, backgroundColor: '#e0f2fe', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#bae6fd' },
  avatarText: { fontSize: 15, fontWeight: '800', color: '#0284c7' },
  cardTitle: { fontSize: 15.5, fontWeight: '800', color: '#0f172a' },
  roleBadge: { backgroundColor: '#e0f2fe', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, flexDirection: 'row', alignItems: 'center' },
  roleText: { fontSize: 10.5, fontWeight: '800', color: '#0284c7' },
  cardPhone: { fontSize: 12, fontWeight: '700', color: '#258ec8' },
  scheduleFullWidthSection: { borderTopWidth: 1, borderTopColor: '#f1f5f9', paddingTop: 10, marginBottom: 14 },
  previewLabel: { fontSize: 10, fontWeight: '800', color: '#94a3b8', letterSpacing: 0.5, marginBottom: 8 },
  branchBreakdownRow: { backgroundColor: '#f8fafc', borderRadius: 10, padding: 10, borderWidth: 1, borderColor: '#e2e8f0' },
  branchNameText: { fontSize: 13, fontWeight: '800', color: '#258ec8' },
  daysScheduleText: { fontSize: 11.5, color: '#334155', fontWeight: '600' },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  statusBadgeText: { fontSize: 10.5, fontWeight: '800' },
  cardActionRow: { flexDirection: 'row', gap: 10 },
  configBtn: { flex: 1, backgroundColor: '#258ec8', paddingVertical: 11, borderRadius: 10, alignItems: 'center', flexDirection: 'row', justifyContent: 'center' },
  configBtnText: { color: '#ffffff', fontSize: 13, fontWeight: '800' },
  deleteBtn: { backgroundColor: '#fef2f2', borderWidth: 1, borderColor: '#fecaca', paddingHorizontal: 12, paddingVertical: 11, borderRadius: 10, flexDirection: 'row', alignItems: 'center', gap: 4 },
  deleteBtnText: { color: '#ef4444', fontSize: 12.5, fontWeight: '800' },

  // Sleek Doctor Detail View Header
  doctorDetailHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#ffffff', borderRadius: 14, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 12, borderWidth: 1, borderColor: '#e2e8f0', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.03, elevation: 1, flexWrap: 'wrap', gap: 8 },
  doctorDetailBackBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#e0f2fe', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  doctorDetailBackBtnText: { fontSize: 12, fontWeight: '800', color: '#0284c7' },
  avatarCircleSmall: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#e0f2fe', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#bae6fd' },
  avatarTextSmall: { fontSize: 12, fontWeight: '800', color: '#0284c7' },
  doctorDetailTitle: { fontSize: 14, fontWeight: '800', color: '#0f172a' },
  doctorDetailSub: { fontSize: 10.5, color: '#64748b', fontWeight: '600' },

  branchCardFull: { backgroundColor: '#ffffff', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: '#cbd5e1', marginBottom: 14, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, elevation: 2 },
  branchCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  branchSelectChip: { backgroundColor: '#f1f5f9', borderWidth: 1, borderColor: '#cbd5e1', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, flexDirection: 'row', alignItems: 'center' },
  branchSelectChipActive: { backgroundColor: '#258ec8', borderColor: '#258ec8' },
  branchSelectChipText: { fontSize: 11.5, fontWeight: '700', color: '#475569' },
  branchSelectChipTextActive: { color: '#ffffff', fontWeight: '800' },
  removeIconSquareBtn: { width: 34, height: 34, borderRadius: 8, backgroundColor: '#fef2f2', borderWidth: 1, borderColor: '#fecaca', alignItems: 'center', justifyContent: 'center' },
  sectionLabel: { fontSize: 11.5, fontWeight: '800', color: '#475569' },

  dayChip: { backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#e2e8f0', paddingHorizontal: 10, minHeight: 38, borderRadius: 8, flexDirection: 'row', alignItems: 'center', gap: 6 },
  dayChipActive: { backgroundColor: '#258ec8', borderColor: '#258ec8' },
  dayChipText: { fontSize: 12.5, fontWeight: '700', color: '#334155' },
  dayChipTextActive: { color: '#ffffff', fontWeight: '800' },
  dayDot: { width: 6, height: 6, borderRadius: 3 },
  dayDotActive: { backgroundColor: '#16a34a' },
  dayDotOff: { backgroundColor: '#ef4444' },

  cardDividerLine: { height: 1, backgroundColor: '#f1f5f9', marginVertical: 10 },
  statusRowContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  slotHeaderText: { fontSize: 13, fontWeight: '800', color: '#0f172a' },
  statusToggleBtn: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: '#cbd5e1', backgroundColor: '#ffffff', flexDirection: 'row', alignItems: 'center' },
  statusToggleBtnActive: { backgroundColor: '#dcfce7', borderColor: '#86efac' },
  statusToggleBtnClosed: { backgroundColor: '#fef2f2', borderColor: '#fecaca' },
  statusToggleText: { fontSize: 11.5, fontWeight: '700', color: '#64748b' },
  statusToggleTextActive: { color: '#15803d', fontWeight: '800' },
  statusToggleTextClosed: { color: '#ef4444', fontWeight: '800' },

  addSlotDedicatedBtn: { backgroundColor: '#f0f9ff', borderWidth: 1, borderColor: '#bae6fd', paddingVertical: 9, paddingHorizontal: 12, borderRadius: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 4, marginBottom: 8 },
  addSlotDedicatedBtnText: { fontSize: 12.5, fontWeight: '800', color: '#0284c7' },

  slotCardContainer: { backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 14, padding: 10, marginBottom: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.03, elevation: 1 },
  slotCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, paddingBottom: 6, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  slotCardTitle: { fontSize: 12.5, fontWeight: '800', color: '#0f172a' },
  deleteSlotSquareBtn: { width: 30, height: 30, borderRadius: 6, backgroundColor: '#fef2f2', borderWidth: 1, borderColor: '#fecaca', alignItems: 'center', justifyContent: 'center' },
  conflictBanner: { backgroundColor: '#fef2f2', padding: 6, borderRadius: 6, marginBottom: 8, borderLeftWidth: 3, borderLeftColor: '#ef4444', flexDirection: 'row', alignItems: 'center' },
  conflictBannerText: { fontSize: 11, fontWeight: '800', color: '#ef4444', flex: 1 },
  timeSelectorsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  timeGroupCol: { flex: 1 },
  timeGroupLabel: { fontSize: 9, fontWeight: '800', color: '#64748b', marginBottom: 4, letterSpacing: 0.5 },
  timeBoxRow: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  timeInputBox: { width: 34, height: 36, backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 8, textAlign: 'center', fontSize: 13.5, fontWeight: '800', color: '#0f172a', padding: 0 },
  timeColon: { fontSize: 13, fontWeight: '800', color: '#475569' },
  ampmBtn: { backgroundColor: '#258ec8', paddingHorizontal: 6, paddingVertical: 8, borderRadius: 8, marginLeft: 2 },
  ampmBtnText: { fontSize: 11, fontWeight: '800', color: '#ffffff' },
  timeArrowDivider: { paddingHorizontal: 2, alignItems: 'center', justifyContent: 'center', marginTop: 14 },

  emptySlotBox: { backgroundColor: '#f8fafc', borderRadius: 10, borderWidth: 1, borderColor: '#e2e8f0', padding: 14, alignItems: 'center', justifyContent: 'center', marginTop: 6 },
  emptySlotText: { fontSize: 12, color: '#64748b', fontWeight: '600' },
  closedBannerFull: { backgroundColor: '#fef2f2', borderWidth: 1, borderColor: '#fecaca', padding: 14, borderRadius: 10, alignItems: 'center', marginTop: 10 },
  addBranchBtnFull: { backgroundColor: '#ffffff', borderWidth: 1.5, borderColor: '#258ec8', paddingVertical: 14, borderRadius: 12, alignItems: 'center', marginBottom: 12, flexDirection: 'row', justifyContent: 'center' },
  addBranchBtnTextFull: { color: '#258ec8', fontSize: 14, fontWeight: '800' },
  saveBtnFull: { backgroundColor: '#258ec8', paddingVertical: 15, borderRadius: 12, alignItems: 'center', marginVertical: 8, elevation: 2, flexDirection: 'row', justifyContent: 'center' },
  saveBtnTextFull: { color: '#ffffff', fontSize: 15.5, fontWeight: '800' },
});
