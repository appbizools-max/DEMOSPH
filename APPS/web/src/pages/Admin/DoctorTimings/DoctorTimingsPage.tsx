import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from '@app/shared';
import { Clock, Plus, Trash2, CheckCircle2, User, MapPin, ArrowLeft, Phone, ChevronRight } from 'lucide-react';

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

export const DoctorTimingsPage: React.FC = () => {
  const [doctorsList, setDoctorsList] = useState<Doctor[]>(DEFAULT_DOCTORS_SEED);
  const [selectedDoctorId, setSelectedDoctorId] = useState<string | null>(null);
  const [saveToast, setSaveToast] = useState<string>('');

  // Live Firestore listener for real doctors collection
  useEffect(() => {
    if (!db) return;
    const docColRef = collection(db, 'doctors');

    const unsubscribe = onSnapshot(docColRef, async (snapshot) => {
      if (snapshot.empty) {
        for (const item of DEFAULT_DOCTORS_SEED) {
          try {
            await setDoc(doc(db, 'doctors', item.id), item);
          } catch (e) {
            console.warn('Seed doctor error:', e);
          }
        }
      }

      const loadedDocs = snapshot.docs.map(docSnap => {
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

      // Include seed fallbacks if not present in Firestore snapshot
      DEFAULT_DOCTORS_SEED.forEach(seed => {
        if (!loadedDocs.some(d => d.id === seed.id || d.name.toLowerCase() === seed.name.toLowerCase())) {
          loadedDocs.push(seed);
        }
      });

      setDoctorsList(loadedDocs);
    }, (error) => {
      console.warn('Firestore doctors listener error:', error);
    });

    return () => unsubscribe();
  }, []);

  const currentDoctor = doctorsList.find(d => d.id === selectedDoctorId);

  // Helper to mutate doctor branch schedules locally before saving
  const updateCurrentDoctor = (updater: (doc: Doctor) => Doctor) => {
    if (!currentDoctor) return;
    setDoctorsList(prev => prev.map(d => d.id === currentDoctor.id ? updater(d) : d));
  };

  // Add Branch Schedule Card
  const handleAddBranchSchedule = () => {
    if (!currentDoctor) return;
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
      branchSchedules: [...doc.branchSchedules, newBs]
    }));
  };

  // Remove Branch Schedule Card
  const handleRemoveBranchSchedule = (bsId: string) => {
    updateCurrentDoctor(doc => ({
      ...doc,
      branchSchedules: doc.branchSchedules.filter(b => b.id !== bsId)
    }));
  };

  // Update Target Branch
  const handleUpdateTargetBranch = (bsId: string, branchName: string) => {
    updateCurrentDoctor(doc => ({
      ...doc,
      branchSchedules: doc.branchSchedules.map(b => b.id === bsId ? { ...b, targetBranch: branchName } : b)
    }));
  };

  // Change Selected Day for a Branch Schedule
  const handleSelectDay = (bsId: string, day: DayName) => {
    updateCurrentDoctor(doc => ({
      ...doc,
      branchSchedules: doc.branchSchedules.map(b => b.id === bsId ? { ...b, selectedDay: day } : b)
    }));
  };

  // Toggle Status (Available / Closed) for a day
  const handleToggleDayStatus = (bsId: string, day: DayName, status: 'Available' | 'Closed') => {
    updateCurrentDoctor(doc => ({
      ...doc,
      branchSchedules: doc.branchSchedules.map(b => {
        if (b.id !== bsId) return b;
        const currentDaySched = b.daySchedules[day];
        const newSlots = status === 'Available' && currentDaySched.slots.length === 0
          ? [{ startHour: '09', startMinute: '00', startAmPm: 'AM', endHour: '05', endMinute: '00', endAmPm: 'PM' }]
          : currentDaySched.slots;
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

  // Add Time Slot for a day
  const handleAddSlot = (bsId: string, day: DayName) => {
    updateCurrentDoctor(doc => ({
      ...doc,
      branchSchedules: doc.branchSchedules.map(b => {
        if (b.id !== bsId) return b;
        const currentDaySched = b.daySchedules[day];
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

  // Update Slot Component (startHour, startMinute, etc.)
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

  // Remove Time Slot
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

  // Helper to convert time slot to minutes from midnight for overlap calculation
  const slotToMinutes = (hour: string, min: string, amPm: 'AM' | 'PM') => {
    let h = parseInt(hour, 10);
    if (amPm === 'PM' && h < 12) h += 12;
    if (amPm === 'AM' && h === 12) h = 0;
    return h * 60 + parseInt(min, 10);
  };

  // Check if two time slots overlap: (StartA < EndB) && (StartB < EndA)
  const doSlotsOverlap = (slotA: TimeSlot, slotB: TimeSlot) => {
    const startA = slotToMinutes(slotA.startHour, slotA.startMinute, slotA.startAmPm);
    const endA = slotToMinutes(slotA.endHour, slotA.endMinute, slotA.endAmPm);
    const startB = slotToMinutes(slotB.startHour, slotB.startMinute, slotB.startAmPm);
    const endB = slotToMinutes(slotB.endHour, slotB.endMinute, slotB.endAmPm);

    return startA < endB && startB < endA;
  };

  // Detect if a doctor slot overlaps with any slot in another branch on the same day
  const getOverlappingConflict = (doctor: Doctor | undefined, currentBsId: string, day: DayName, slot: TimeSlot, currentSlotIdx: number) => {
    if (!doctor || !doctor.branchSchedules) return null;

    for (const bs of doctor.branchSchedules) {
      const daySched = bs.daySchedules[day];
      if (daySched && daySched.status === 'Available' && daySched.slots) {
        for (let idx = 0; idx < daySched.slots.length; idx++) {
          if (bs.id === currentBsId && idx === currentSlotIdx) continue; // skip same slot
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

  // Save Doctor Schedule directly to Firestore
  const handleSaveAll = async () => {
    if (!currentDoctor) return;

    // Validate no overlapping slots before saving
    let hasAnyConflict = false;
    for (const bs of currentDoctor.branchSchedules || []) {
      for (const d of DAYS) {
        const daySched = bs.daySchedules[d];
        if (daySched && daySched.status === 'Available' && daySched.slots) {
          for (let sIdx = 0; sIdx < daySched.slots.length; sIdx++) {
            const conflict = getOverlappingConflict(currentDoctor, bs.id, d, daySched.slots[sIdx], sIdx);
            if (conflict) {
              hasAnyConflict = true;
              break;
            }
          }
        }
        if (hasAnyConflict) break;
      }
      if (hasAnyConflict) break;
    }

    if (hasAnyConflict) {
      alert(`⚠️ Cannot Save: Overlapping schedule conflict detected for ${currentDoctor.name}! Please resolve highlighted red conflicts before saving.`);
      return;
    }

    try {
      if (db) {
        await setDoc(doc(db, 'doctors', currentDoctor.id), {
          ...currentDoctor,
          mobile: currentDoctor.phone,
          category: currentDoctor.role
        }, { merge: true });
      }
      setSaveToast(`Schedules successfully saved to Firestore for ${currentDoctor.name}!`);
    } catch (e) {
      console.error('Error saving to Firestore:', e);
      setSaveToast(`Saved locally for ${currentDoctor.name}!`);
    }
    setTimeout(() => setSaveToast(''), 4000);
  };

  // Delete Doctor Profile directly from Firestore
  const handleDeleteDoctor = async (doctorId: string, doctorName: string) => {
    if (window.confirm(`Are you sure you want to delete ${doctorName} from Firestore?`)) {
      try {
        if (db) {
          await deleteDoc(doc(db, 'doctors', doctorId));
        }
        if (selectedDoctorId === doctorId) {
          setSelectedDoctorId(null);
        }
        setSaveToast(`Deleted ${doctorName} from Firestore.`);
        setTimeout(() => setSaveToast(''), 4000);
      } catch (e) {
        console.error('Error deleting doctor from Firestore:', e);
      }
    }
  };

  // Add New Doctor Profile directly to Firestore
  const handleAddDoctor = async () => {
    const name = window.prompt('Enter New Doctor Name:', 'Dr. New Doctor');
    if (!name) return;
    const phone = window.prompt('Enter Contact Mobile Number:', '9000000000') || '9000000000';
    const role = window.prompt('Enter Specialization / Role:', 'Homeopathy Physician') || 'Homeopathy Physician';

    const newId = 'doc-' + Date.now();
    const newDoc: Doctor = {
      id: newId,
      name,
      phone,
      role,
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
      setSaveToast(`Added ${name} to Firestore!`);
      setTimeout(() => setSaveToast(''), 4000);
    } catch (e) {
      console.error('Error creating doctor in Firestore:', e);
    }
  };

  // Helper to format doctor schedule preview on the main list
  const getDoctorShiftPreview = (doc: Doctor) => {
    if (!doc.branchSchedules || doc.branchSchedules.length === 0) return 'No schedules configured';
    return doc.branchSchedules.map(bs => {
      const monSched = bs.daySchedules['Mon'];
      if (monSched && monSched.status === 'Available' && monSched.slots.length > 0) {
        const slotStrs = monSched.slots.map(s => `${s.startHour}:${s.startMinute} ${s.startAmPm} - ${s.endHour}:${s.endMinute} ${s.endAmPm}`).join(', ');
        return `${slotStrs} (${bs.targetBranch.replace(' Branch', '')})`;
      }
      return `${bs.targetBranch.replace(' Branch', '')} (Configured)`;
    }).join(' / ');
  };

  // Helper to render branch schedule breakdown cards in Doctor Directory (View 1)
  const renderDoctorBranchBreakdown = (doc: Doctor) => {
    if (!doc.branchSchedules || doc.branchSchedules.length === 0) {
      return (
        <span style={{ fontSize: '12px !important', color: '#94a3b8', fontStyle: 'italic' }}>
          No branch schedules configured
        </span>
      );
    }

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {doc.branchSchedules.map(bs => {
          const activeDays = DAYS.filter(d => bs.daySchedules[d] && bs.daySchedules[d].status === 'Available' && bs.daySchedules[d].slots.length > 0);
          const firstDayWithSlots = activeDays.length > 0 ? activeDays[0] : null;
          const slotsToDisplay = firstDayWithSlots ? bs.daySchedules[firstDayWithSlots].slots : [];

          return (
            <div key={bs.id} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '10px 12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <span style={{ fontSize: '12.5px !important', fontWeight: 800, color: '#258ec8', display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <MapPin size={13} color="#258ec8" /> {bs.targetBranch}
                </span>
                <span style={{ fontSize: '10px !important', fontWeight: 800, color: activeDays.length > 0 ? '#15803d' : '#ef4444', background: activeDays.length > 0 ? '#dcfce7' : '#fef2f2', padding: '2px 8px', borderRadius: '6px' }}>
                  {activeDays.length > 0 ? `${activeDays.join(', ')}` : 'Closed'}
                </span>
              </div>

              {activeDays.length > 0 && slotsToDisplay.length > 0 ? (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '4px' }}>
                  {slotsToDisplay.map((s, idx) => (
                    <span key={idx} style={{ fontSize: '11px !important', fontWeight: 700, background: '#ffffff', border: '1px solid #cbd5e1', color: '#0f172a', padding: '2px 8px', borderRadius: '6px' }}>
                      {s.startHour}:{s.startMinute} {s.startAmPm} - {s.endHour}:{s.endMinute} {s.endAmPm}
                    </span>
                  ))}
                </div>
              ) : (
                <span style={{ fontSize: '11px !important', color: '#94a3b8' }}>No active time slots</span>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  // VIEW 1: ALL DOCTORS DIRECTORY LIST (Default View)
  if (!currentDoctor) {
    return (
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '10px 4px' }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ background: 'rgba(37, 142, 200, 0.1)', padding: '10px', borderRadius: '12px' }}>
              <Clock size={24} color="#258ec8" />
            </div>
            <div>
              <h1 style={{ fontSize: '18px !important', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                Doctor Timings & Master Schedules
              </h1>
              <p style={{ fontSize: '12.5px !important', color: '#64748b', margin: '2px 0 0 0' }}>
                Real-time Firestore doctors list. Add, update, delete, or configure branch schedules live.
              </p>
            </div>
          </div>

          <button
            onClick={handleAddDoctor}
            style={{
              background: '#258ec8',
              color: '#ffffff',
              border: 'none',
              borderRadius: '10px',
              padding: '10px 18px',
              fontSize: '13px !important',
              fontWeight: 800,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 2px 8px rgba(37, 142, 200, 0.25)'
            }}
          >
            <Plus size={16} /> Add Doctor Profile
          </button>
        </div>

        {/* Doctors Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '18px' }}>
          {doctorsList.map(doc => (
            <div
              key={doc.id}
              onClick={() => setSelectedDoctorId(doc.id)}
              style={{
                background: '#ffffff',
                border: '1px solid #cbd5e1',
                borderRadius: '18px',
                padding: '20px',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = '#258ec8';
                e.currentTarget.style.boxShadow = '0 4px 14px rgba(37, 142, 200, 0.15)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = '#cbd5e1';
                e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.03)';
              }}
            >
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <h3 style={{ fontSize: '15px !important', fontWeight: 800, color: '#0f172a', margin: 0 }}>{doc.name}</h3>
                  <span style={{ background: '#e0f2fe', color: '#0284c7', fontSize: '10.5px !important', fontWeight: 800, padding: '3px 8px', borderRadius: '6px' }}>
                    {doc.role}
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px !important', color: '#258ec8', fontWeight: 700, marginBottom: '12px' }}>
                  <Phone size={13} color="#258ec8" />
                  <span>Phone: +91 {doc.phone}</span>
                </div>

                <div style={{ marginBottom: '14px' }}>
                  <span style={{ display: 'block', fontSize: '10.5px !important', color: '#94a3b8', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>
                    Branch Schedule Breakdown
                  </span>
                  {renderDoctorBranchBreakdown(doc)}
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '12px', borderTop: '1px solid #f1f5f9' }}>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteDoctor(doc.id, doc.name);
                  }}
                  title="Delete Doctor Profile"
                  style={{
                    background: '#fef2f2',
                    border: '1px solid #fecaca',
                    color: '#ef4444',
                    padding: '6px 10px',
                    borderRadius: '8px',
                    fontSize: '11.5px !important',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  <Trash2 size={13} color="#ef4444" /> Delete
                </button>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedDoctorId(doc.id);
                  }}
                  style={{
                    background: '#258ec8',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '6px 14px',
                    fontSize: '11.5px !important',
                    fontWeight: 800,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  Configure Schedule <ChevronRight size={13} />
                </button>
              </div>
            </div>
          ))}
        </div>

      </div>
    );
  }

  // VIEW 2: FULL SCHEDULE CONFIGURATION SCREEN FOR SELECTED DOCTOR
  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '10px 4px' }}>

      {/* Save Success Banner */}
      {saveToast ? (
        <div style={{
          background: '#dcfce7',
          border: '1px solid #86efac',
          color: '#15803d',
          padding: '12px 18px',
          borderRadius: '12px',
          marginBottom: '18px',
          fontSize: '13px !important',
          fontWeight: 800,
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          boxShadow: '0 2px 8px rgba(22, 163, 74, 0.15)'
        }}>
          <CheckCircle2 size={18} color="#15803d" />
          <span>{saveToast}</span>
        </div>
      ) : null}

      {/* BACK TO ALL DOCTORS BUTTON */}
      <button
        onClick={() => setSelectedDoctorId(null)}
        style={{
          background: '#ffffff',
          border: '1px solid #cbd5e1',
          color: '#0f172a',
          padding: '8px 16px',
          borderRadius: '10px',
          fontSize: '12.5px !important',
          fontWeight: 800,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          marginBottom: '16px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
          transition: 'all 0.2s ease'
        }}
      >
        <ArrowLeft size={16} color="#0f172a" /> ← Back to All Doctors
      </button>

      {/* TOP HEADER & SCHEDULE CONFIGURATION TITLE */}
      <div style={{
        background: '#ffffff',
        border: '1px solid #cbd5e1',
        borderRadius: '18px',
        padding: '18px 24px',
        marginBottom: '20px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '16px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.02)'
      }}>
        <div>
          <h1 style={{ fontSize: '20px !important', fontWeight: 800, color: '#0f172a', margin: '0 0 4px 0' }}>
            Schedule Configuration
          </h1>
          <p style={{ fontSize: '13.5px !important', color: '#258ec8', fontWeight: 800, margin: 0 }}>
            Managing timings for <span style={{ color: '#0f172a', fontWeight: 800 }}>{currentDoctor.name}</span>
          </p>
        </div>

        {/* ADD BRANCH SCHEDULE BUTTON */}
        <button
          onClick={handleAddBranchSchedule}
          style={{
            background: '#258ec8',
            color: '#ffffff',
            border: 'none',
            borderRadius: '10px',
            padding: '10px 18px',
            fontSize: '13px !important',
            fontWeight: 800,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            boxShadow: '0 2px 8px rgba(37, 142, 200, 0.25)',
            transition: 'all 0.2s ease'
          }}
        >
          <Plus size={16} /> Add Branch Schedule
        </button>
      </div>

      {/* BRANCH SCHEDULE CARDS LIST */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginBottom: '24px' }}>
        {(currentDoctor.branchSchedules || []).map((bs) => {
          const activeDay = bs.selectedDay;
          const daySched = bs.daySchedules[activeDay] || { status: 'Available', slots: [] };

          return (
            <div key={bs.id} style={{ background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '18px', padding: '20px', boxShadow: '0 2px 10px rgba(0,0,0,0.03)' }}>

              {/* 1. TARGET BRANCH DROPDOWN */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '11px !important', color: '#64748b', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>
                  Target Branch
                </label>
                <select
                  value={bs.targetBranch}
                  onChange={e => handleUpdateTargetBranch(bs.id, e.target.value)}
                  style={{ background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '10px', padding: '10px 14px', fontSize: '14px !important', fontWeight: 800, color: '#0f172a', width: '100%', outline: 'none', cursor: 'pointer' }}
                >
                  {BRANCHES.map(br => (
                    <option key={br} value={br}>{br}</option>
                  ))}
                </select>
              </div>

              {/* 2. WEEKLY DAY-WISE SCHEDULE SELECTOR */}
              <div style={{ marginBottom: '16px' }}>
                <span style={{ display: 'block', fontSize: '12px !important', fontWeight: 800, color: '#475569', marginBottom: '10px' }}>
                  Weekly Day-wise Schedule (Select Day to Configure)
                </span>

                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {DAYS.map(d => {
                    const isDaySelected = activeDay === d;
                    const dayStatus = bs.daySchedules[d] ? bs.daySchedules[d].status : 'Available';
                    return (
                      <button
                        key={d}
                        onClick={() => handleSelectDay(bs.id, d)}
                        style={{
                          padding: '8px 16px',
                          borderRadius: '10px',
                          border: isDaySelected ? '2px solid #258ec8' : '1px solid #e2e8f0',
                          background: isDaySelected ? '#258ec8' : '#ffffff',
                          color: isDaySelected ? '#ffffff' : '#334155',
                          fontWeight: isDaySelected ? 800 : 700,
                          fontSize: '12.5px !important',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          boxShadow: isDaySelected ? '0 2px 8px rgba(37, 142, 200, 0.25)' : 'none',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        <span>{d}</span>
                        {dayStatus === 'Closed' && (
                          <span style={{ fontSize: '9px !important', background: isDaySelected ? 'rgba(255,255,255,0.25)' : '#fef2f2', color: isDaySelected ? '#ffffff' : '#ef4444', padding: '1px 4px', borderRadius: '4px', fontWeight: 800 }}>
                            Off
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 3. ACTIVE DAY HEADER & SLOTS EDITOR */}
              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '16px', marginBottom: '16px' }}>

                {/* DAY NAME + STATUS TOGGLE + ADD SLOT */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ fontSize: '14px !important', fontWeight: 800, color: '#0f172a' }}>
                      {activeDay}
                    </span>

                    <div style={{ display: 'flex', background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '2px' }}>
                      <button
                        onClick={() => handleToggleDayStatus(bs.id, activeDay, 'Available')}
                        style={{
                          padding: '5px 14px',
                          borderRadius: '6px',
                          border: 'none',
                          background: daySched.status === 'Available' ? '#dcfce7' : 'transparent',
                          color: daySched.status === 'Available' ? '#15803d' : '#64748b',
                          fontWeight: 800,
                          fontSize: '12px !important',
                          cursor: 'pointer'
                        }}
                      >
                        Available
                      </button>
                      <button
                        onClick={() => handleToggleDayStatus(bs.id, activeDay, 'Closed')}
                        style={{
                          padding: '5px 14px',
                          borderRadius: '6px',
                          border: 'none',
                          background: daySched.status === 'Closed' ? '#fef2f2' : 'transparent',
                          color: daySched.status === 'Closed' ? '#ef4444' : '#64748b',
                          fontWeight: 800,
                          fontSize: '12px !important',
                          cursor: 'pointer'
                        }}
                      >
                        Unavailable / Closed
                      </button>
                    </div>
                  </div>

                  {daySched.status === 'Available' && (
                    <button
                      onClick={() => handleAddSlot(bs.id, activeDay)}
                      style={{
                        background: '#ffffff',
                        border: '1px solid #258ec8',
                        color: '#258ec8',
                        padding: '6px 14px',
                        borderRadius: '8px',
                        fontSize: '12px !important',
                        fontWeight: 800,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '5px'
                      }}
                    >
                      <Plus size={14} /> Add Slot
                    </button>
                  )}
                </div>

                {/* TIME SLOTS */}
                {daySched.status === 'Available' ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {daySched.slots.map((slot, slotIdx) => {
                      const conflict = getOverlappingConflict(currentDoctor, bs.id, activeDay, slot, slotIdx);

                      return (
                        <div key={slotIdx} style={{
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '6px',
                          background: conflict ? '#fef2f2' : '#ffffff',
                          border: conflict ? '1.5px solid #ef4444' : '1px solid #cbd5e1',
                          padding: '12px 16px',
                          borderRadius: '10px',
                          boxShadow: conflict ? '0 2px 8px rgba(239, 68, 68, 0.15)' : 'none'
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                            <span style={{ fontSize: '12px !important', fontWeight: 800, color: conflict ? '#ef4444' : '#64748b' }}>Start Time</span>
                            <select value={slot.startHour} onChange={e => handleUpdateSlot(bs.id, activeDay, slotIdx, 'startHour', e.target.value)} style={{ padding: '6px', borderRadius: '6px', border: conflict ? '1px solid #fecaca' : '1px solid #cbd5e1', fontSize: '12px !important', fontWeight: 800, color: '#0f172a' }}>
                              {['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'].map(h => <option key={h} value={h}>{h}</option>)}
                            </select>
                            <span style={{ fontWeight: 800, color: '#64748b' }}>:</span>
                            <select value={slot.startMinute} onChange={e => handleUpdateSlot(bs.id, activeDay, slotIdx, 'startMinute', e.target.value)} style={{ padding: '6px', borderRadius: '6px', border: conflict ? '1px solid #fecaca' : '1px solid #cbd5e1', fontSize: '12px !important', fontWeight: 800, color: '#0f172a' }}>
                              {['00', '15', '30', '45'].map(m => <option key={m} value={m}>{m}</option>)}
                            </select>
                            <select value={slot.startAmPm} onChange={e => handleUpdateSlot(bs.id, activeDay, slotIdx, 'startAmPm', e.target.value as any)} style={{ padding: '6px', borderRadius: '6px', border: '1px solid #258ec8', background: 'rgba(37, 142, 200, 0.1)', fontSize: '12px !important', fontWeight: 800, color: '#258ec8' }}>
                              <option value="AM">AM</option>
                              <option value="PM">PM</option>
                            </select>

                            <span style={{ fontSize: '12px !important', fontWeight: 800, color: '#94a3b8', margin: '0 4px' }}>to</span>

                            <span style={{ fontSize: '12px !important', fontWeight: 800, color: conflict ? '#ef4444' : '#64748b' }}>End Time</span>
                            <select value={slot.endHour} onChange={e => handleUpdateSlot(bs.id, activeDay, slotIdx, 'endHour', e.target.value)} style={{ padding: '6px', borderRadius: '6px', border: conflict ? '1px solid #fecaca' : '1px solid #cbd5e1', fontSize: '12px !important', fontWeight: 800, color: '#0f172a' }}>
                              {['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'].map(h => <option key={h} value={h}>{h}</option>)}
                            </select>
                            <span style={{ fontWeight: 800, color: '#64748b' }}>:</span>
                            <select value={slot.endMinute} onChange={e => handleUpdateSlot(bs.id, activeDay, slotIdx, 'endMinute', e.target.value)} style={{ padding: '6px', borderRadius: '6px', border: conflict ? '1px solid #fecaca' : '1px solid #cbd5e1', fontSize: '12px !important', fontWeight: 800, color: '#0f172a' }}>
                              {['00', '15', '30', '45'].map(m => <option key={m} value={m}>{m}</option>)}
                            </select>
                            <select value={slot.endAmPm} onChange={e => handleUpdateSlot(bs.id, activeDay, slotIdx, 'endAmPm', e.target.value as any)} style={{ padding: '6px', borderRadius: '6px', border: '1px solid #258ec8', background: 'rgba(37, 142, 200, 0.1)', fontSize: '12px !important', fontWeight: 800, color: '#258ec8' }}>
                              <option value="AM">AM</option>
                              <option value="PM">PM</option>
                            </select>

                            <button onClick={() => handleRemoveSlot(bs.id, activeDay, slotIdx)} title="Remove Slot" style={{ marginLeft: 'auto', background: '#fef2f2', border: '1px solid #fecaca', color: '#ef4444', padding: '6px 10px', borderRadius: '6px', cursor: 'pointer' }}>
                              <Trash2 size={13} color="#ef4444" />
                            </button>
                          </div>

                          {/* OVERLAP CONFLICT ALERT BADGE */}
                          {conflict && (
                            <div style={{ fontSize: '11.5px !important', color: '#dc2626', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '5px', background: '#ffffff', border: '1px solid #fca5a5', padding: '4px 10px', borderRadius: '6px', width: 'fit-content', marginTop: '2px' }}>
                              <span>⚠️ Overlapping Schedule Conflict: Doctor is already scheduled at {conflict.branch} ({conflict.timeStr})</span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div style={{ padding: '14px', textAlign: 'center', background: '#ffffff', borderRadius: '10px', border: '1px dashed #cbd5e1' }}>
                    <span style={{ fontSize: '13px !important', color: '#ef4444', fontWeight: 800 }}>
                      Unavailable / Closed on {activeDay}
                    </span>
                  </div>
                )}

              </div>

              {/* 4. REMOVE SCHEDULE BUTTON */}
              <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                <button
                  onClick={() => handleRemoveBranchSchedule(bs.id)}
                  style={{
                    background: '#fef2f2',
                    border: '1px solid #fecaca',
                    color: '#ef4444',
                    padding: '8px 16px',
                    borderRadius: '8px',
                    fontSize: '12px !important',
                    fontWeight: 800,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <Trash2 size={14} color="#ef4444" /> Remove Schedule
                </button>
              </div>

            </div>
          );
        })}
      </div>

      {/* BOTTOM SAVE BUTTON */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '10px' }}>
        <button
          onClick={handleSaveAll}
          style={{
            background: '#258ec8',
            color: '#ffffff',
            border: 'none',
            borderRadius: '12px',
            padding: '12px 28px',
            fontSize: '14px !important',
            fontWeight: 800,
            cursor: 'pointer',
            boxShadow: '0 4px 14px rgba(37, 142, 200, 0.3)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            transition: 'all 0.2s ease'
          }}
        >
          <CheckCircle2 size={18} /> Save Profile & Schedules
        </button>
      </div>

    </div>
  );
};
