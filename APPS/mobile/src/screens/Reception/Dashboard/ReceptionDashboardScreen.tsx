import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Modal, Linking, Alert, TextInput } from 'react-native';
import { Ionicons, Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { collection, onSnapshot, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '@app/shared';
import { PatientAppointmentRecord } from '../../../components/AppointmentsQueueUI';
import { getBranchShortcut } from '../../../utils/idGenerator';
import { DEFAULT_DOCTORS_SEED } from '../BookAppointment/BookAppointmentScreen';
import { TargetProgressUI } from '../../../components/TargetProgressUI';

interface ReceptionDashboardScreenProps {
  currentBranch?: string;
  onNavigate?: (tab: string, patient?: any) => void;
}
export const ReceptionDashboardScreen: React.FC<ReceptionDashboardScreenProps> = ({ currentBranch, onNavigate }) => {
  const getTodayDateStr = () => {
    const today = new Date();
    const d = String(today.getDate()).padStart(2, '0');
    const m = String(today.getMonth() + 1).padStart(2, '0');
    const y = today.getFullYear();
    return `${d}-${m}-${y}`;
  };

  const getTomorrowDateStr = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const d = String(tomorrow.getDate()).padStart(2, '0');
    const m = String(tomorrow.getMonth() + 1).padStart(2, '0');
    const y = tomorrow.getFullYear();
    return `${d}-${m}-${y}`;
  };

  const [selectedDate, setSelectedDate] = useState<string>(getTodayDateStr());
  const [liveAppointments, setLiveAppointments] = useState<any[]>([]);
  const [datePickerModalOpen, setDatePickerModalOpen] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState<Date>(new Date());

  // Reschedule Modal States
  const [rescheduleModalOpen, setRescheduleModalOpen] = useState(false);
  const [selectedRescheduleAppt, setSelectedRescheduleAppt] = useState<PatientAppointmentRecord | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState(getTodayDateStr());
  const [rescheduleTime, setRescheduleTime] = useState('11:00 AM');
  const [rescheduleDoctor, setRescheduleDoctor] = useState('Dr. Prashanth K Vaidya');
  const [rescheduleCalOpen, setRescheduleCalOpen] = useState(false);
  const [rescheduleCalMonth, setRescheduleCalMonth] = useState<Date>(new Date());
  const [doctorDropdownOpen, setDoctorDropdownOpen] = useState(false);
  const [liveDoctorsData, setLiveDoctorsData] = useState<any[]>(DEFAULT_DOCTORS_SEED);

  const activeBranchName = currentBranch || 'Dilshuknagar Branch';

  const [branchTarget, setBranchTarget] = useState({
    monthlyTarget: 1400000,
    targetReached: 1150000,
    branchName: activeBranchName
  });

  useEffect(() => {
    if (currentBranch) {
      setBranchTarget(prev => ({ ...prev, branchName: currentBranch }));
    }
  }, [currentBranch]);

  // Subscribe to real-time Firestore branch targets collection
  useEffect(() => {
    try {
      const colRef = collection(db, 'branchTargets');
      const unsubscribe = onSnapshot(colRef, (snapshot) => {
        if (!snapshot.empty) {
          const liveMap: Record<string, any> = {};
          snapshot.forEach((docSnap) => {
            liveMap[docSnap.id.toLowerCase()] = docSnap.data();
            if (docSnap.data().branchName) {
              liveMap[docSnap.data().branchName.toLowerCase()] = docSnap.data();
            }
          });

          const curBranch = currentBranch || branchTarget.branchName || 'Dilshuknagar Branch';
          const activeBranchKey = curBranch.toLowerCase().replace(/\s*branch$/i, '').trim();

          const getShortcut = (str: string) => {
            if (str.includes('kphb') || str.includes('kukatpally')) return 'kphb';
            if (str.includes('nalla') || str.includes('nallagandla')) return 'nallagandla';
            if (str.includes('chanda') || str.includes('chnr') || str.includes('chandanagar')) return 'chandanagar';
            if (str.includes('dilshuk') || str.includes('dilsukh') || str.includes('dsnr') || str.includes('dshnr')) return 'dilshuknagar';
            return str;
          };

          const keyShortcut = getShortcut(activeBranchKey);

          let targetData = liveMap[activeBranchKey] || liveMap[`${activeBranchKey} branch`] || liveMap[keyShortcut] || liveMap[`${keyShortcut} branch`];

          if (!targetData) {
            const foundKey = Object.keys(liveMap).find(k => getShortcut(k) === keyShortcut);
            if (foundKey) targetData = liveMap[foundKey];
          }

          if (targetData) {
            setBranchTarget({
              monthlyTarget: Number(targetData.monthlyTarget) || 1400000,
              targetReached: Number(targetData.targetReached) || 1150000,
              branchName: targetData.branchName || curBranch
            });
          } else {
            setBranchTarget(prev => ({
              ...prev,
              branchName: curBranch
            }));
          }
        }
      });
      return () => unsubscribe();
    } catch (err) {
      console.error('Error listening to branch target:', err);
    }
  }, [currentBranch, branchTarget.branchName]);

  // Subscribe to real-time Firestore doctors collection
  useEffect(() => {
    try {
      const colRef = collection(db, 'doctors');
      const unsubscribe = onSnapshot(colRef, (snapshot) => {
        const list: any[] = [];
        if (!snapshot.empty) {
          snapshot.forEach((docSnap) => {
            const data = docSnap.data();
            const seedFallback = DEFAULT_DOCTORS_SEED.find(s => s.id === docSnap.id || s.name === data.name || s.name === data.doctorName);
            list.push({
              id: docSnap.id,
              name: data.name || data.doctorName || seedFallback?.name || 'Doctor',
              role: data.role || seedFallback?.role || 'Homeopathy Physician',
              branch: data.branch || data.assignedBranch || (seedFallback as any)?.branch || '',
              branchSchedules: (data.branchSchedules && Array.isArray(data.branchSchedules) && data.branchSchedules.length > 0)
                ? data.branchSchedules
                : (seedFallback?.branchSchedules || []),
            });
          });
        }

        DEFAULT_DOCTORS_SEED.forEach((seed) => {
          if (!list.some(d => d.name === seed.name || d.id === seed.id)) {
            list.push(seed);
          }
        });

        setLiveDoctorsData(list);
      }, (err) => {
        console.warn('Doctors listener error:', err);
        setLiveDoctorsData(DEFAULT_DOCTORS_SEED);
      });
      return () => unsubscribe();
    } catch (e) {
      console.warn('Doctors subscribe notice:', e);
      setLiveDoctorsData(DEFAULT_DOCTORS_SEED);
    }
  }, []);

  // Helper to convert DD-MM-YYYY to DayName ('Sun' | 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri' | 'Sat')
  const getDayNameFromDateStr = (dateStr: string): string => {
    if (!dateStr) return 'Mon';
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const day = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const year = parseInt(parts[2], 10);
      if (!isNaN(day) && !isNaN(month) && !isNaN(year)) {
        const d = new Date(year, month, day);
        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        return days[d.getDay()];
      }
    }
    return 'Mon';
  };

  // Dynamically derive available doctors ONLY for the selected branch AND selected day schedule
  const availableDoctorsList = React.useMemo(() => {
    const targetBranchNorm = (selectedRescheduleAppt?.branch || '').toLowerCase().replace(/\s*branch\s*|\s*clinic\s*/gi, '').trim();
    const dayName = getDayNameFromDateStr(rescheduleDate);
    const set = new Set<string>();

    liveDoctorsData.forEach((docData) => {
      const docName = docData.name || docData.doctorName;
      if (!docName) return;

      // 1. Check branchSchedules for matching targetBranch & daySchedule availability
      if (docData.branchSchedules && Array.isArray(docData.branchSchedules) && docData.branchSchedules.length > 0) {
        const matchBs = docData.branchSchedules.find((bs: any) => {
          const bsBranch = (bs.targetBranch || bs.branch || '').toLowerCase().replace(/\s*branch\s*|\s*clinic\s*/gi, '').trim();
          return !targetBranchNorm || !bsBranch || bsBranch.includes(targetBranchNorm) || targetBranchNorm.includes(bsBranch);
        });

        if (matchBs && matchBs.daySchedules) {
          const daySched = matchBs.daySchedules[dayName];
          if (daySched && daySched.status === 'Available' && daySched.slots && daySched.slots.length > 0) {
            set.add(docName);
          }
          return; // Strictly evaluated via branchSchedules
        }
      }

      // 2. Fallback check: Doctor assigned main branch (only if doctor branch matches target branch)
      const docBranch = (docData.branch || docData.assignedBranch || '').toLowerCase().replace(/\s*branch\s*|\s*clinic\s*/gi, '').trim();
      if (targetBranchNorm && docBranch && (docBranch.includes(targetBranchNorm) || targetBranchNorm.includes(docBranch))) {
        set.add(docName);
      }
    });

    return Array.from(set);
  }, [liveDoctorsData, rescheduleDate, selectedRescheduleAppt]);

  // Auto-reset selected doctor if current doctor is not available on changed date/branch
  useEffect(() => {
    if (availableDoctorsList.length > 0 && !availableDoctorsList.includes(rescheduleDoctor)) {
      setRescheduleDoctor(availableDoctorsList[0]);
    }
  }, [availableDoctorsList, rescheduleDoctor]);

  const RESCHEDULE_TIME_SLOTS = [
    '10:00 AM', '10:30 AM', '11:00 AM', '11:30 AM',
    '12:00 PM', '12:30 PM', '04:00 PM', '04:30 PM',
    '05:00 PM', '05:30 PM', '06:00 PM', '06:30 PM',
  ];

  const parseTimeToMinutes = (hourStr: string, minStr: string, ampm: string): number => {
    let h = parseInt(hourStr, 10) || 10;
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

  const generate15MinSlotsFromRanges = (slotRanges: any[]): string[] => {
    const result: string[] = [];
    if (!Array.isArray(slotRanges)) return result;
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

  const rescheduleTimeSlots = React.useMemo(() => {
    if (!rescheduleDoctor) return RESCHEDULE_TIME_SLOTS;

    const normDocName = rescheduleDoctor.toLowerCase().trim();
    const docData = liveDoctorsData.find((d) => (d.name || d.doctorName || '').toLowerCase().trim() === normDocName);
    const dayName = getDayNameFromDateStr(rescheduleDate);
    const targetBranchNorm = (selectedRescheduleAppt?.branch || '').toLowerCase().replace(/\s*branch\s*|\s*clinic\s*/gi, '').trim();

    if (docData && docData.branchSchedules && Array.isArray(docData.branchSchedules)) {
      const matchBs = docData.branchSchedules.find((bs: any) => {
        const bsBranch = (bs.targetBranch || bs.branch || '').toLowerCase().replace(/\s*branch\s*|\s*clinic\s*/gi, '').trim();
        return !targetBranchNorm || !bsBranch || bsBranch.includes(targetBranchNorm) || targetBranchNorm.includes(bsBranch);
      });

      if (matchBs && matchBs.daySchedules && matchBs.daySchedules[dayName]) {
        const daySched = matchBs.daySchedules[dayName];
        if (daySched.status === 'Available' && daySched.slots && daySched.slots.length > 0) {
          const generated = generate15MinSlotsFromRanges(daySched.slots);
          if (generated.length > 0) {
            return generated;
          }
        }
      }
    }

    return RESCHEDULE_TIME_SLOTS;
  }, [rescheduleDoctor, liveDoctorsData, rescheduleDate, selectedRescheduleAppt]);

  const getSlotCapacityInfo = (slotTimeStr: string) => {
    const normSelectedDoc = (rescheduleDoctor || '').toLowerCase().trim();
    const bookedCount = liveAppointments.filter((app) => {
      const normAppDoc = (app.doctorName || app.doctor || '').toLowerCase().trim();
      const sameDoc = normAppDoc === normSelectedDoc;
      const sameDate = (app.appointmentDate || app.date || '') === rescheduleDate;
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

  // Open Reschedule Modal Handler
  const handleOpenRescheduleModal = (patient: PatientAppointmentRecord) => {
    setSelectedRescheduleAppt(patient);
    setRescheduleDate(patient.date || getTodayDateStr());
    setRescheduleTime(patient.time || '11:00 AM');
    setRescheduleDoctor(patient.doctor || 'Dr. Prashanth K Vaidya');
    setRescheduleCalOpen(false);
    setRescheduleModalOpen(true);
  };

  // Confirm Reschedule in Firestore Handler
  const handleConfirmReschedule = async () => {
    if (!selectedRescheduleAppt) return;
    const docId = selectedRescheduleAppt.id;
    try {
      const payload = {
        appointmentDate: rescheduleDate,
        dateString: rescheduleDate,
        appointmentTime: rescheduleTime,
        timeSlot: rescheduleTime,
        doctorName: rescheduleDoctor,
        doctor: rescheduleDoctor,
        status: 'upcoming', // Reset status to upcoming
        updatedAt: new Date().toISOString(),
      };
      // Update in appointments collection
      try {
        await updateDoc(doc(db, 'appointments', docId), payload);
      } catch (e) { }
      // Update in allpatients collection
      try {
        await updateDoc(doc(db, 'allpatients', docId), payload);
      } catch (e) { }
      Alert.alert('Rescheduled', `Appointment for ${selectedRescheduleAppt.name} rescheduled to ${rescheduleDate} at ${rescheduleTime}.`);
      setRescheduleModalOpen(false);
    } catch (err) {
      console.error('Reschedule error:', err);
      Alert.alert('Error', 'Failed to reschedule appointment in Firestore.');
    }
  };

  // Subscribe to real-time Firestore appointments & allpatients in real time (Matching Web Reception Dashboard)
  useEffect(() => {
    let unsubApp: (() => void) | null = null;
    let unsubPat: (() => void) | null = null;
    let appsFromAppointments: any[] = [];
    let appsFromAllPatients: any[] = [];

    const mergeAndSet = () => {
      const combinedMap = new Map<string, any>();
      appsFromAppointments.forEach(item => combinedMap.set(item.id, item));
      appsFromAllPatients.forEach(item => {
        if (!combinedMap.has(item.id)) {
          combinedMap.set(item.id, item);
        }
      });
      const list = Array.from(combinedMap.values());
      list.sort((a, b) => {
        const dateA = String(a.appointmentDate || a.date || a.createdAt || '');
        const dateB = String(b.appointmentDate || b.date || b.createdAt || '');
        return dateB.localeCompare(dateA);
      });
      setLiveAppointments(list);
    };

    try {
      unsubApp = onSnapshot(collection(db, 'appointments'), (snapshot) => {
        const list: any[] = [];
        snapshot.forEach((snap) => {
          list.push({ id: snap.id, collectionName: 'appointments', ...snap.data() });
        });
        appsFromAppointments = list;
        mergeAndSet();
      }, (err) => {
        console.warn('Dashboard appointments listener error:', err);
      });
    } catch (e) {
      console.warn('Dashboard subscribe notice:', e);
    }

    try {
      unsubPat = onSnapshot(collection(db, 'allpatients'), (snapshot) => {
        const list: any[] = [];
        snapshot.forEach((snap) => {
          const data = snap.data();
          if (data.appointmentDate || data.date || data.appointmentTime || data.doctor || data.status) {
            list.push({ id: snap.id, collectionName: 'allpatients', ...data });
          }
        });
        appsFromAllPatients = list;
        mergeAndSet();
      }, (err) => {
        console.warn('Allpatients listener notice:', err);
      });
    } catch (e) {
      console.warn('Allpatients subscribe notice:', e);
    }

    return () => {
      if (unsubApp) unsubApp();
      if (unsubPat) unsubPat();
    };
  }, []);

  // Handler for deleting appointment
  const handleDeleteAppointment = (patientId: string, patientName: string) => {
    Alert.alert(
      'Delete Appointment',
      `Are you sure you want to delete the appointment for ${patientName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              try {
                await deleteDoc(doc(db, 'appointments', patientId));
              } catch (e) { }
              try {
                await deleteDoc(doc(db, 'allpatients', patientId));
              } catch (e) { }
              Alert.alert('Deleted', 'Appointment deleted successfully.');
            } catch (err) {
              console.error('Error deleting appointment:', err);
              Alert.alert('Error', 'Could not delete appointment from Firestore.');
            }
          },
        },
      ]
    );
  };

  // Handler for updating appointment status directly from card buttons
  const handleUpdateStatus = async (docId: string, newStatus: 'active' | 'completed' | 'upcoming') => {
    try {
      const payload = {
        status: newStatus,
        updatedAt: new Date().toISOString(),
      };
      await updateDoc(doc(db, 'appointments', docId), payload).catch(() => { });
      await updateDoc(doc(db, 'allpatients', docId), payload).catch(() => { });
      Alert.alert('Status Updated', `Patient appointment marked as ${newStatus}.`);
    } catch (err) {
      console.error('Error updating status:', err);
      Alert.alert('Update Failed', 'Could not update appointment status in Firestore.');
    }
  };

  // Helper flexible date matcher matching Web logic
  const isMatchingDate = (app: any, targetDate: string) => {
    const rawDate = app.appointmentDate || app.date || app.bookingDate || app.dateString || app.slotDate || app.createdAt;
    if (!rawDate) return targetDate === getTodayDateStr();
    const clean = String(rawDate).trim();
    if (!clean) return targetDate === getTodayDateStr();

    if (clean === targetDate || clean.startsWith(targetDate)) return true;

    if (clean.includes('T')) {
      const isoPart = clean.split('T')[0]; // YYYY-MM-DD
      const partsISO = isoPart.split('-');
      if (partsISO.length === 3) {
        const [y, m, d] = partsISO;
        const ddmmyyyy = `${d.padStart(2, '0')}-${m.padStart(2, '0')}-${y}`;
        if (ddmmyyyy === targetDate) return true;
      }
    }

    const parts = clean.split(/[-/]/);
    if (parts.length === 3) {
      let d = parts[0];
      let m = parts[1];
      let y = parts[2];
      if (parts[0].length === 4) {
        y = parts[0];
        m = parts[1];
        d = parts[2];
      }
      const ddmmyyyy = `${d.padStart(2, '0')}-${m.padStart(2, '0')}-${y}`;
      return ddmmyyyy === targetDate;
    }

    return false;
  };

  const isMatchingBranch = (app: any) => {
    const activeBranch = currentBranch || branchTarget.branchName;
    if (!activeBranch || activeBranch === 'All Branches') return true;

    const appBranch = app.branch || app.targetBranch || app.branchName;
    if (!appBranch) return false;

    const isBranchMatching = (b1: string, b2: string): boolean => {
      const n1 = b1.toLowerCase().replace(/\s*branch\s*/i, '').trim();
      const n2 = b2.toLowerCase().replace(/\s*branch\s*/i, '').trim();
      if (n1 === n2 || n1.includes(n2) || n2.includes(n1)) return true;

      const getShortcut = (str: string) => {
        if (str.includes('kphb') || str.includes('kukatpally')) return 'kphb';
        if (str.includes('nalla') || str.includes('nallagandla')) return 'nalla';
        if (str.includes('chanda') || str.includes('chnr') || str.includes('chandanagar')) return 'chanda';
        if (str.includes('dilshuk') || str.includes('dilsukh') || str.includes('dsnr') || str.includes('dshnr')) return 'dsnr';
        return str;
      };

      return getShortcut(n1) === getShortcut(n2);
    };

    return isBranchMatching(String(appBranch), String(activeBranch));
  };

  // Filter appointments by selected date and branch (Matching Web)
  const filteredAppointments = liveAppointments.filter(app => {
    return isMatchingDate(app, selectedDate) && isMatchingBranch(app);
  });

  // Dynamic metrics (Matching Web reception dashboard metrics)
  const totalBookings = filteredAppointments.length;
  const waiting = filteredAppointments.filter(app => {
    const st = (app.status || '').toLowerCase();
    return st === 'waiting' || st === 'scheduled' || st === 'upcoming' || st === 'pending';
  }).length;
  const activeConsultationsCount = filteredAppointments.filter(app => {
    const st = (app.status || '').toLowerCase();
    return st === 'active' || st === 'in_consultation' || st === 'in-consultation';
  }).length;
  const payPending = filteredAppointments.filter(app => app.paymentStatus === 'pending' || app.paymentPending === true).length;
  const completed = filteredAppointments.filter(app => {
    const st = (app.status || '').toLowerCase();
    return st === 'completed' || st === 'done' || st === 'finished';
  }).length;
  const apptsCompleted = completed;
  const followupOpted = filteredAppointments.filter(app => app.followup === true || app.followUpOpted === true).length;
  const followupNotOpted = Math.max(0, totalBookings - followupOpted);

  const getCleanRegId = (app: any, index: number) => {
    const raw = app.registrationId || app.registration_id || app.regId || app.regID || app.patientId || app.patient_id || app.uhid || app.UHID;
    if (raw && typeof raw === 'string' && raw.trim().length > 0) {
      const clean = raw.trim();
      if (clean.length <= 18 && !/^[a-zA-Z0-9]{19,32}$/.test(clean)) {
        return clean.toUpperCase();
      }
    }
    const shortcut = getBranchShortcut(app.branch || app.branchName);
    const countStr = String(index + 1).padStart(4, '0');
    return `SPH-${shortcut}-${countStr}`;
  };

  // Map into PatientAppointmentRecord lists
  const mapRecord = (app: any, index: number): PatientAppointmentRecord => {
    let status: 'upcoming' | 'active' | 'completed' = 'upcoming';
    const s = String(app.status || '').toLowerCase();
    if (s === 'completed' || s === 'done') {
      status = 'completed';
    } else if (s === 'active' || s === 'in_consultation' || s === 'in-clinic') {
      status = 'active';
    } else {
      status = 'upcoming';
    }

    return {
      id: app.id || String(index),
      name: app.patientName || app.name || 'Patient',
      phone: app.phoneNumber || app.phone || app.mobile || '',
      regId: getCleanRegId(app, index),
      doctor: app.doctorName || app.doctor || 'Dr. Prashanth K Vaidya',
      time: app.appointmentTime || app.time || '10:00 AM',
      date: app.appointmentDate || selectedDate,
      status: status,
      branch: app.branch || 'Clinic',
      mode: app.consultationMode || 'In-Clinic'
    };
  };

  const upcomingList = filteredAppointments.filter(app => {
    const s = String(app.status || '').toLowerCase();
    return s !== 'completed' && s !== 'done' && s !== 'active' && s !== 'in_consultation';
  }).sort((a, b) => {
    if (a.queueOrder !== undefined && b.queueOrder !== undefined) {
      return a.queueOrder - b.queueOrder;
    }
    return 0;
  }).map(mapRecord);

  const activeList = filteredAppointments.filter(app => {
    const s = String(app.status || '').toLowerCase();
    return s === 'active' || s === 'in_consultation';
  }).map(mapRecord);

  const completedList = filteredAppointments.filter(app => {
    const s = String(app.status || '').toLowerCase();
    return s === 'completed' || s === 'done';
  }).map(mapRecord);

  // Handler for shifting patient queue position (Up / Down) in Firestore
  const handleShiftQueueOrder = async (patient: PatientAppointmentRecord, direction: 'up' | 'down') => {
    const listIndex = upcomingList.findIndex(item => item.id === patient.id);
    if (listIndex === -1) return;
    const targetIndex = direction === 'up' ? listIndex - 1 : listIndex + 1;
    if (targetIndex < 0 || targetIndex >= upcomingList.length) return;
    const currentApp = upcomingList[listIndex];
    const targetApp = upcomingList[targetIndex];
    try {
      const currentOrder = listIndex + 1;
      const targetOrder = targetIndex + 1;
      // Swap queue orders in Firestore (appointments & allpatients)
      try {
        await updateDoc(doc(db, 'appointments', currentApp.id), { queueOrder: targetOrder, updatedAt: new Date().toISOString() });
      } catch (e) {
        await updateDoc(doc(db, 'allpatients', currentApp.id), { queueOrder: targetOrder, updatedAt: new Date().toISOString() });
      }
      try {
        await updateDoc(doc(db, 'appointments', targetApp.id), { queueOrder: currentOrder, updatedAt: new Date().toISOString() });
      } catch (e) {
        await updateDoc(doc(db, 'allpatients', targetApp.id), { queueOrder: currentOrder, updatedAt: new Date().toISOString() });
      }
    } catch (err) {
      console.error('Error shifting queue order:', err);
    }
  };

  const handleCall = (phone: string) => {
    if (!phone) return Alert.alert('No Phone', 'No phone number available');
    Linking.openURL(`tel:${phone}`).catch(() => Alert.alert('Error', 'Unable to make call'));
  };

  const handleWhatsApp = (phone: string, name: string) => {
    if (!phone) return Alert.alert('No Phone', 'No phone number available');
    const clean = phone.replace(/\D/g, '').slice(-10);
    const msg = `Hello ${name}, regarding your appointment at Spiritual Homeopathy Clinic.`;
    Linking.openURL(`https://wa.me/91${clean}?text=${encodeURIComponent(msg)}`).catch(() => Alert.alert('Error', 'Unable to open WhatsApp'));
  };

  const renderPatientCard = (patient: PatientAppointmentRecord, index: number, totalCount: number) => (
    <View key={patient.id} style={styles.patientCard}>
      <View style={styles.cardHeader}>
        <View style={styles.patientAvatarCircle}>
          <Text style={styles.avatarText}>
            {(patient.name || 'P').substring(0, 2).toUpperCase()}
          </Text>
        </View>
        <View style={styles.patientMainInfo}>
          <Text style={styles.patientName}>{patient.name}</Text>
          <Text style={styles.patientMeta}>
            {patient.status === 'upcoming' ? (
              patient.phone
            ) : (
              <>Reg: <Text style={{ color: '#258ec8', fontWeight: '700' }}>{patient.regId || 'N/A'}</Text> • {patient.phone}</>
            )}
          </Text>
        </View>
        {patient.status === 'upcoming' ? (
          <TouchableOpacity
            style={[styles.statusBadge, { backgroundColor: '#258ec8', borderColor: '#1d709e' }]}
            onPress={() => {
              handleUpdateStatus(patient.id, 'active');
              if (onNavigate) onNavigate('reception_patient_file', patient);
            }}
          >
            <Text style={[styles.statusBadgeText, { color: '#ffffff', fontWeight: '800' }]}>
              START CONSULTATION
            </Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[
              styles.statusBadge,
              patient.status === 'active' && { backgroundColor: '#e0f2fe', borderColor: '#bae6fd' },
              patient.status === 'completed' && { backgroundColor: '#dcfce7', borderColor: '#bbf7d0' },
            ]}
            onPress={() => onNavigate && onNavigate('reception_patient_file', patient)}
          >
            <Text style={[
              styles.statusBadgeText,
              patient.status === 'active' && { color: '#0284c7' },
              patient.status === 'completed' && { color: '#166534' },
            ]}>
              {patient.status === 'active' && '⚡ IN CONSULTATION (View File)'}
              {patient.status === 'completed' && 'COMPLETED (View File) ✓'}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.detailsRow}>
        <View style={styles.detailItem}>
          <MaterialCommunityIcons name="stethoscope" size={14} color="#64748b" />
          <Text style={styles.detailText}>{patient.doctor}</Text>
        </View>
        <View style={styles.detailItem}>
          <Feather name="clock" size={14} color="#64748b" />
          <Text style={styles.detailText}>{patient.time}</Text>
        </View>
        <View style={styles.detailItem}>
          <Feather name="map-pin" size={14} color="#64748b" />
          <Text style={styles.detailText}>{patient.branch}</Text>
        </View>
      </View>

      <View style={styles.actionRow}>
        {/* View Patient File Folder Icon */}
        <TouchableOpacity
          style={[styles.rescheduleIconBtn, { backgroundColor: '#e0f2fe' }]}
          onPress={() => onNavigate && onNavigate('reception_patient_file', patient)}
        >
          <MaterialCommunityIcons name="folder-account-outline" size={18} color="#0284c7" />
        </TouchableOpacity>

        {/* UP & DOWN QUEUE SHIFT ARROWS (Upcoming Queue Only) */}
        {patient.status === 'upcoming' && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
            {/* Move Up Button */}
            <TouchableOpacity
              disabled={index === 0}
              style={[styles.arrowIconBtn, index === 0 && { opacity: 0.3 }]}
              onPress={() => handleShiftQueueOrder(patient, 'up')}
            >
              <Feather name="arrow-up" size={16} color={index === 0 ? '#94a3b8' : '#ffffff'} />
            </TouchableOpacity>
            {/* Move Down Button */}
            <TouchableOpacity
              disabled={index === totalCount - 1}
              style={[styles.arrowIconBtn, index === totalCount - 1 && { opacity: 0.3 }]}
              onPress={() => handleShiftQueueOrder(patient, 'down')}
            >
              <Feather name="arrow-down" size={16} color={index === totalCount - 1 ? '#94a3b8' : '#ffffff'} />
            </TouchableOpacity>
          </View>
        )}

        <TouchableOpacity style={styles.callIconBtn} onPress={() => handleCall(patient.phone)}>
          <Feather name="phone" size={18} color="#258ec8" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.waIconBtn} onPress={() => handleWhatsApp(patient.phone, patient.name)}>
          <MaterialCommunityIcons name="whatsapp" size={19} color="#22c55e" />
        </TouchableOpacity>
        {patient.status === 'upcoming' && (
          <TouchableOpacity
            style={styles.rescheduleIconBtn}
            onPress={() => handleOpenRescheduleModal(patient)}
          >
            <Feather name="calendar" size={18} color="#258ec8" />
          </TouchableOpacity>
        )}
        <TouchableOpacity style={styles.deleteIconBtn} onPress={() => handleDeleteAppointment(patient.id, patient.name)}>
          <Feather name="trash-2" size={18} color="#ef4444" />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 100 }} showsVerticalScrollIndicator={false}>

      {/* Target Progress Card */}
      <View style={{ paddingHorizontal: 10, marginTop: 8 }}>
        <TargetProgressUI
          branchName={branchTarget.branchName}
          monthlyTarget={branchTarget.monthlyTarget}
          targetReached={branchTarget.targetReached}
        />
      </View>

      {/* Overview Header */}
      <View style={styles.overviewHeader}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Text style={styles.overviewTitle}>Overview</Text>
          <View style={styles.liveBadge}>
            <View style={styles.liveDot} />
            <Text style={styles.liveText}>LIVE</Text>
          </View>
        </View>

        {/* Date Filter Button */}
        <TouchableOpacity
          style={styles.todayFilterBtn}
          onPress={() => setDatePickerModalOpen(true)}
        >
          <Ionicons name="calendar-outline" size={14} color="#258ec8" />
          <Text style={styles.todayFilterText}>
            {selectedDate === getTodayDateStr() ? 'Today' : selectedDate === getTomorrowDateStr() ? 'Tomorrow' : selectedDate}
          </Text>
          <Feather name="chevron-down" size={14} color="#64748b" />
        </TouchableOpacity>
      </View>

      {/* Top Row: 4 Clean Metric Cards */}
      <View style={styles.metricsRow}>
        <View style={[styles.metricCard, { borderTopColor: '#258ec8' }]}>
          <Text style={[styles.metricNum, { color: '#258ec8' }]}>{totalBookings}</Text>
          <Text style={styles.metricLabel} numberOfLines={1}>Total Bookings</Text>
        </View>

        <View style={[styles.metricCard, { borderTopColor: '#d97706' }]}>
          <Text style={[styles.metricNum, { color: '#d97706' }]}>{waiting}</Text>
          <Text style={styles.metricLabel}>Waiting</Text>
        </View>

        <View style={[styles.metricCard, { borderTopColor: '#ef4444' }]}>
          <Text style={[styles.metricNum, { color: '#ef4444' }]}>{payPending}</Text>
          <Text style={styles.metricLabel}>Pay Pending</Text>
        </View>

        <View style={[styles.metricCard, { borderTopColor: '#16a34a' }]}>
          <Text style={[styles.metricNum, { color: '#16a34a' }]}>{completed}</Text>
          <Text style={styles.metricLabel}>Completed</Text>
        </View>
      </View>

      {/* Bottom Row: 3 Clean Metric Cards */}
      <View style={styles.metricsRowSecond}>
        <View style={[styles.metricCardWide, { borderTopColor: '#16a34a' }]}>
          <Text style={[styles.metricNum, { color: '#16a34a' }]}>{apptsCompleted}</Text>
          <Text style={styles.metricLabel}>Appts Completed</Text>
        </View>

        <View style={[styles.metricCardWide, { borderTopColor: '#258ec8' }]}>
          <Text style={[styles.metricNum, { color: '#258ec8' }]}>{followupOpted}</Text>
          <Text style={styles.metricLabel}>Follow-up Opted</Text>
        </View>

        <View style={[styles.metricCardWide, { borderTopColor: '#64748b' }]}>
          <Text style={[styles.metricNum, { color: '#64748b' }]}>{followupNotOpted}</Text>
          <Text style={styles.metricLabel}>Follow-up Not Opted</Text>
        </View>
      </View>

      {/* Section 1: Upcoming Appointments */}
      <View style={styles.sectionHeaderRow}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Text style={styles.sectionTitle}>Upcoming Appointments</Text>
          <View style={styles.countBadge}>
            <Text style={styles.countBadgeText}>{upcomingList.length}</Text>
          </View>
        </View>

        <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
          <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Ionicons name="refresh-outline" size={13} color="#258ec8" />
            <Text style={{ color: '#258ec8', fontSize: 12, fontWeight: '700' }}>Restore (24h)</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => onNavigate && onNavigate('reception_book')}>
            <Text style={{ color: '#258ec8', fontSize: 12, fontWeight: '700' }}>View All</Text>
          </TouchableOpacity>
        </View>
      </View>

      {upcomingList.length > 0 ? (
        upcomingList.map((p, idx) => renderPatientCard(p, idx, upcomingList.length))
      ) : (
        <View style={styles.emptyCardContainer}>
          <Ionicons name="calendar-outline" size={28} color="#cbd5e1" style={{ marginBottom: 6 }} />
          <Text style={styles.emptyCardText}>No upcoming waiting appointments for {selectedDate}.</Text>
          <TouchableOpacity
            style={styles.limeGreenBtn}
            onPress={() => onNavigate && onNavigate('reception_book')}
          >
            <Ionicons name="add-circle-outline" size={16} color="#ffffff" style={{ marginRight: 6 }} />
            <Text style={styles.limeGreenBtnText}>Book Appointment</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Section 2: Active Consultations */}
      <View style={[styles.sectionHeaderRow, { marginTop: 22, marginBottom: 12 }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Text style={styles.sectionTitle}>Active Consultations</Text>
          <View style={styles.countBadge}>
            <Text style={styles.countBadgeText}>{activeList.length}</Text>
          </View>
        </View>
      </View>

      {activeList.length > 0 ? (
        activeList.map((p, idx) => renderPatientCard(p, idx, activeList.length))
      ) : (
        <View style={styles.emptyCardSimple}>
          <Ionicons name="time-outline" size={26} color="#cbd5e1" style={{ marginBottom: 4 }} />
          <Text style={styles.emptyCardText}>No patients currently in consultation or awaiting payment.</Text>
        </View>
      )}

      {/* Section 3: Completed Appointments Today */}
      <View style={[styles.sectionHeaderRow, { marginTop: 22, marginBottom: 12 }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Text style={styles.sectionTitle}>Completed Appointments Today</Text>
          <View style={styles.countBadge}>
            <Text style={styles.countBadgeText}>{completedList.length}</Text>
          </View>
        </View>
      </View>

      {completedList.length > 0 ? (
        completedList.map((p, idx) => renderPatientCard(p, idx, completedList.length))
      ) : (
        <View style={styles.emptyCardSimple}>
          <Ionicons name="checkmark-done-circle-outline" size={26} color="#cbd5e1" style={{ marginBottom: 4 }} />
          <Text style={styles.emptyCardText}>No completed appointments today yet.</Text>
        </View>
      )}

      {/* DATE FILTER MODAL WITH FULL INTERACTIVE CALENDAR GRID */}
      <Modal
        visible={datePickerModalOpen}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setDatePickerModalOpen(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setDatePickerModalOpen(false)}
        >
          <View style={[styles.modalCard, { maxWidth: 360, padding: 18 }]} onStartShouldSetResponder={() => true}>

            {/* Modal Title & Close */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <Text style={{ fontSize: 16, fontWeight: '800', color: '#0f172a' }}>
                Select Dashboard Date
              </Text>
              <TouchableOpacity onPress={() => setDatePickerModalOpen(false)}>
                <Feather name="x" size={20} color="#64748b" />
              </TouchableOpacity>
            </View>

            {/* Quick Filter Buttons: Today & Tomorrow */}
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
              <TouchableOpacity
                style={[
                  styles.quickDateBtn,
                  selectedDate === getTodayDateStr() && styles.quickDateBtnActive
                ]}
                onPress={() => {
                  setSelectedDate(getTodayDateStr());
                  setCalendarMonth(new Date());
                  setDatePickerModalOpen(false);
                }}
              >
                <Ionicons name="calendar-outline" size={14} color={selectedDate === getTodayDateStr() ? '#ffffff' : '#258ec8'} />
                <Text style={[styles.quickDateText, selectedDate === getTodayDateStr() && styles.quickDateTextActive]}>
                  Today ({getTodayDateStr()})
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.quickDateBtn,
                  selectedDate === getTomorrowDateStr() && styles.quickDateBtnActive
                ]}
                onPress={() => {
                  setSelectedDate(getTomorrowDateStr());
                  const tom = new Date();
                  tom.setDate(tom.getDate() + 1);
                  setCalendarMonth(tom);
                  setDatePickerModalOpen(false);
                }}
              >
                <Ionicons name="time-outline" size={14} color={selectedDate === getTomorrowDateStr() ? '#ffffff' : '#258ec8'} />
                <Text style={[styles.quickDateText, selectedDate === getTomorrowDateStr() && styles.quickDateTextActive]}>
                  Tomorrow
                </Text>
              </TouchableOpacity>
            </View>

            {/* Month & Year Navigation Header */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f8fafc', paddingVertical: 10, paddingHorizontal: 12, borderRadius: 12, marginBottom: 12, borderWidth: 1, borderColor: '#e2e8f0' }}>
              <TouchableOpacity
                onPress={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1, 1))}
                style={{ padding: 4 }}
              >
                <Feather name="chevron-left" size={18} color="#258ec8" />
              </TouchableOpacity>

              <Text style={{ fontSize: 14, fontWeight: '800', color: '#0f172a' }}>
                {['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'][calendarMonth.getMonth()]} {calendarMonth.getFullYear()}
              </Text>

              <TouchableOpacity
                onPress={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 1))}
                style={{ padding: 4 }}
              >
                <Feather name="chevron-right" size={18} color="#258ec8" />
              </TouchableOpacity>
            </View>

            {/* Days of Week Header */}
            <View style={{ flexDirection: 'row', marginBottom: 8 }}>
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d, i) => (
                <View key={i} style={{ flex: 1, alignItems: 'center' }}>
                  <Text style={{ fontSize: 11, fontWeight: '700', color: '#64748b' }}>{d}</Text>
                </View>
              ))}
            </View>

            {/* Calendar Grid (Days 1..31) */}
            {(() => {
              const year = calendarMonth.getFullYear();
              const month = calendarMonth.getMonth();
              const daysInMonth = new Date(year, month + 1, 0).getDate();
              const firstDayIndex = new Date(year, month, 1).getDay();

              const cells = [];
              for (let i = 0; i < firstDayIndex; i++) {
                cells.push(<View key={`empty-${i}`} style={{ width: '14.28%', height: 36 }} />);
              }

              for (let day = 1; day <= daysInMonth; day++) {
                const formattedDay = String(day).padStart(2, '0');
                const formattedMonth = String(month + 1).padStart(2, '0');
                const dateStr = `${formattedDay}-${formattedMonth}-${year}`;
                const isSelected = selectedDate === dateStr;
                const isToday = getTodayDateStr() === dateStr;

                cells.push(
                  <TouchableOpacity
                    key={`day-${day}`}
                    style={{
                      width: '14.28%',
                      height: 36,
                      justifyContent: 'center',
                      alignItems: 'center',
                    }}
                    onPress={() => {
                      setSelectedDate(dateStr);
                      setDatePickerModalOpen(false);
                    }}
                  >
                    <View
                      style={[
                        { width: 30, height: 30, borderRadius: 15, justifyContent: 'center', alignItems: 'center' },
                        isSelected && { backgroundColor: '#258ec8' },
                        !isSelected && isToday && { borderWidth: 1.5, borderColor: '#16a34a', backgroundColor: '#f0fdf4' },
                      ]}
                    >
                      <Text
                        style={[
                          { fontSize: 13, fontWeight: '600', color: '#334155' },
                          isSelected && { color: '#ffffff', fontWeight: '800' },
                          !isSelected && isToday && { color: '#166534', fontWeight: '800' },
                        ]}
                      >
                        {day}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              }

              return (
                <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                  {cells}
                </View>
              );
            })()}

            {/* Close Button */}
            <TouchableOpacity
              style={{
                marginTop: 16,
                backgroundColor: '#f1f5f9',
                paddingVertical: 10,
                borderRadius: 10,
                alignItems: 'center'
              }}
              onPress={() => setDatePickerModalOpen(false)}
            >
              <Text style={{ color: '#475569', fontWeight: '700', fontSize: 13 }}>Close Calendar</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* RESCHEDULE APPOINTMENT MODAL */}
      <Modal
        visible={rescheduleModalOpen}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setRescheduleModalOpen(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setRescheduleModalOpen(false)}
        >
          <View style={[styles.modalCard, { maxHeight: '90%' }]} onStartShouldSetResponder={() => true}>

            {/* Modal Header */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <View>
                <Text style={{ fontSize: 16, fontWeight: '800', color: '#0f172a' }}>Reschedule Appointment</Text>
                <Text style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
                  {selectedRescheduleAppt?.name} {selectedRescheduleAppt?.regId ? `(${selectedRescheduleAppt?.regId})` : ''}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setRescheduleModalOpen(false)}>
                <Feather name="x" size={20} color="#64748b" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 10 }}>

              {/* 1. SELECT NEW DATE */}
              <Text style={styles.fieldLabel}>Select New Date</Text>

              {/* Quick Date Shortcuts & Calendar Toggle */}
              <View style={{ flexDirection: 'row', gap: 6, marginBottom: 10 }}>
                <TouchableOpacity
                  style={[
                    styles.quickDateBtn,
                    rescheduleDate === getTodayDateStr() && styles.quickDateBtnActive
                  ]}
                  onPress={() => {
                    setRescheduleDate(getTodayDateStr());
                    setRescheduleCalOpen(false);
                  }}
                >
                  <Ionicons name="calendar-outline" size={13} color={rescheduleDate === getTodayDateStr() ? '#ffffff' : '#258ec8'} />
                  <Text style={[styles.quickDateText, rescheduleDate === getTodayDateStr() && styles.quickDateTextActive]}>
                    Today ({getTodayDateStr()})
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.quickDateBtn,
                    rescheduleDate === getTomorrowDateStr() && styles.quickDateBtnActive
                  ]}
                  onPress={() => {
                    setRescheduleDate(getTomorrowDateStr());
                    setRescheduleCalOpen(false);
                  }}
                >
                  <Ionicons name="time-outline" size={13} color={rescheduleDate === getTomorrowDateStr() ? '#ffffff' : '#258ec8'} />
                  <Text style={[styles.quickDateText, rescheduleDate === getTomorrowDateStr() && styles.quickDateTextActive]}>
                    Tomorrow
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.quickDateBtn,
                    { flex: 0.8 },
                    rescheduleCalOpen && styles.quickDateBtnActive
                  ]}
                  onPress={() => setRescheduleCalOpen(!rescheduleCalOpen)}
                >
                  <Feather name="calendar" size={13} color={rescheduleCalOpen ? '#ffffff' : '#258ec8'} />
                  <Text style={[styles.quickDateText, rescheduleCalOpen && styles.quickDateTextActive]}>
                    Calendar
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Selected Date Box */}
              <View style={styles.inputBox}>
                <Feather name="calendar" size={15} color="#258ec8" style={{ marginRight: 8 }} />
                <TextInput
                  style={styles.inputText}
                  value={rescheduleDate}
                  onChangeText={setRescheduleDate}
                  placeholder="DD-MM-YYYY"
                />
              </View>

              {/* Full Month Calendar Grid Toggle */}
              {rescheduleCalOpen && (
                <View style={{ marginTop: 10, padding: 10, backgroundColor: '#f8fafc', borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0' }}>
                  {/* Month Navigation */}
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <TouchableOpacity onPress={() => setRescheduleCalMonth(new Date(rescheduleCalMonth.getFullYear(), rescheduleCalMonth.getMonth() - 1, 1))}>
                      <Feather name="chevron-left" size={16} color="#258ec8" />
                    </TouchableOpacity>
                    <Text style={{ fontSize: 13, fontWeight: '800', color: '#0f172a' }}>
                      {['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'][rescheduleCalMonth.getMonth()]} {rescheduleCalMonth.getFullYear()}
                    </Text>
                    <TouchableOpacity onPress={() => setRescheduleCalMonth(new Date(rescheduleCalMonth.getFullYear(), rescheduleCalMonth.getMonth() + 1, 1))}>
                      <Feather name="chevron-right" size={16} color="#258ec8" />
                    </TouchableOpacity>
                  </View>

                  {/* Day Headers */}
                  <View style={{ flexDirection: 'row', marginBottom: 6 }}>
                    {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
                      <View key={i} style={{ flex: 1, alignItems: 'center' }}>
                        <Text style={{ fontSize: 10, fontWeight: '700', color: '#64748b' }}>{d}</Text>
                      </View>
                    ))}
                  </View>

                  {/* Day Cells */}
                  {(() => {
                    const y = rescheduleCalMonth.getFullYear();
                    const m = rescheduleCalMonth.getMonth();
                    const daysInMonth = new Date(y, m + 1, 0).getDate();
                    const firstDay = new Date(y, m, 1).getDay();
                    const cells = [];
                    for (let i = 0; i < firstDay; i++) {
                      cells.push(<View key={`empty-${i}`} style={{ width: '14.28%', height: 30 }} />);
                    }
                    for (let d = 1; d <= daysInMonth; d++) {
                      const dStr = `${String(d).padStart(2, '0')}-${String(m + 1).padStart(2, '0')}-${y}`;
                      const isSel = rescheduleDate === dStr;
                      cells.push(
                        <TouchableOpacity
                          key={`d-${d}`}
                          style={{ width: '14.28%', height: 30, justifyContent: 'center', alignItems: 'center' }}
                          onPress={() => {
                            setRescheduleDate(dStr);
                            setRescheduleCalOpen(false);
                          }}
                        >
                          <View style={[{ width: 26, height: 26, borderRadius: 13, justifyContent: 'center', alignItems: 'center' }, isSel && { backgroundColor: '#258ec8' }]}>
                            <Text style={[{ fontSize: 11, fontWeight: '600', color: '#334155' }, isSel && { color: '#ffffff', fontWeight: '800' }]}>{d}</Text>
                          </View>
                        </TouchableOpacity>
                      );
                    }
                    return <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>{cells}</View>;
                  })()}
                </View>
              )}

              {/* 2. SELECT DOCTOR DROPDOWN */}
              <Text style={[styles.fieldLabel, { marginTop: 14 }]}>
                Select Doctor for {selectedRescheduleAppt?.branch || 'Branch'} ({getDayNameFromDateStr(rescheduleDate)})
              </Text>

              <TouchableOpacity
                style={styles.dropdownSelectorBox}
                onPress={() => setDoctorDropdownOpen(!doctorDropdownOpen)}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                  <MaterialCommunityIcons name="stethoscope" size={18} color="#258ec8" />
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 13, fontWeight: '800', color: '#0f172a' }}>
                      {rescheduleDoctor || 'Select Doctor'}
                    </Text>
                    <Text style={{ fontSize: 11, color: '#64748b', marginTop: 1 }}>
                      Homeopathy Physician • {selectedRescheduleAppt?.branch || 'Clinic'}
                    </Text>
                  </View>
                </View>
                <Feather name={doctorDropdownOpen ? "chevron-up" : "chevron-down"} size={18} color="#64748b" />
              </TouchableOpacity>

              {doctorDropdownOpen && (
                <View style={styles.dropdownOptionsContainer}>
                  {availableDoctorsList.length === 0 ? (
                    <View style={{ padding: 12 }}>
                      <Text style={{ fontSize: 12, color: '#64748b', fontStyle: 'italic' }}>
                        No doctors available on {getDayNameFromDateStr(rescheduleDate)} for {selectedRescheduleAppt?.branch || 'Branch'}
                      </Text>
                    </View>
                  ) : (
                    availableDoctorsList.map((docName) => {
                      const isSelected = rescheduleDoctor === docName;
                      return (
                        <TouchableOpacity
                          key={docName}
                          style={[styles.dropdownOptionRow, isSelected && styles.dropdownOptionRowActive]}
                          onPress={() => {
                            setRescheduleDoctor(docName);
                            setDoctorDropdownOpen(false);
                          }}
                        >
                          <View style={{ flex: 1 }}>
                            <Text style={[styles.dropdownOptionTitle, isSelected && { color: '#258ec8', fontWeight: '800' }]}>
                              {docName}
                            </Text>
                            <Text style={{ fontSize: 11, color: '#64748b', marginTop: 1 }}>
                              Homeopathy Physician
                            </Text>
                          </View>
                          {isSelected && (
                            <Ionicons name="checkmark-circle" size={18} color="#258ec8" />
                          )}
                        </TouchableOpacity>
                      );
                    })
                  )}
                </View>
              )}

              {/* 3. SELECT TIME SLOT & LEFT SLOTS */}
              <Text style={[styles.fieldLabel, { marginTop: 14 }]}>
                Available Time Slots for {rescheduleDoctor}
              </Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
                {rescheduleTimeSlots.map((slot) => {
                  const { remainingSlots, isFull } = getSlotCapacityInfo(slot);
                  const isSelected = rescheduleTime.trim() === slot.trim();
                  const isOneLeft = remainingSlots === 1;

                  return (
                    <TouchableOpacity
                      key={slot}
                      disabled={isFull}
                      style={[
                        styles.slotChip,
                        isSelected && styles.slotChipActive,
                        isFull && styles.slotChipFull
                      ]}
                      onPress={() => setRescheduleTime(slot)}
                    >
                      <Text style={[
                        styles.slotChipTime,
                        isSelected && styles.slotChipTimeActive,
                        isFull && styles.slotChipTimeFull
                      ]}>
                        {slot}
                      </Text>

                      <View style={[
                        styles.capacityBadge,
                        isSelected && { backgroundColor: 'rgba(255,255,255,0.25)' },
                        !isSelected && isFull && { backgroundColor: '#fee2e2' },
                        !isSelected && isOneLeft && { backgroundColor: '#fef3c7' },
                        !isSelected && !isFull && !isOneLeft && { backgroundColor: '#e0f2fe' },
                      ]}>
                        <Text style={[
                          styles.capacityBadgeText,
                          isSelected && { color: '#ffffff' },
                          !isSelected && isFull && { color: '#ef4444' },
                          !isSelected && isOneLeft && { color: '#b45309' },
                          !isSelected && !isFull && !isOneLeft && { color: '#0369a1' },
                        ]}>
                          {isFull ? 'FULL' : `${remainingSlots} left`}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>

            </ScrollView>

            {/* Modal Action Footer */}
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 16, paddingTop: 10, borderTopWidth: 1, borderColor: '#f1f5f9' }}>
              <TouchableOpacity
                style={{ flex: 1, backgroundColor: '#f1f5f9', paddingVertical: 10, borderRadius: 10, alignItems: 'center' }}
                onPress={() => setRescheduleModalOpen(false)}
              >
                <Text style={{ color: '#475569', fontWeight: '700', fontSize: 13 }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={{ flex: 1.5, backgroundColor: '#258ec8', paddingVertical: 10, borderRadius: 10, alignItems: 'center' }}
                onPress={handleConfirmReschedule}
              >
                <Text style={{ color: '#ffffff', fontWeight: '800', fontSize: 13 }}>Confirm Reschedule</Text>
              </TouchableOpacity>
            </View>

          </View>
        </TouchableOpacity>
      </Modal>

    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
    paddingHorizontal: 8,
  },
  overviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    marginBottom: 10,
  },
  overviewTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0f172a',
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#bbf7d0',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  liveDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#16a34a',
  },
  liveText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#16a34a',
    letterSpacing: 0.5,
  },
  todayFilterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  todayFilterText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
  },
  metricsRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 8,
  },
  metricsRowSecond: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 14,
  },
  metricCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 2,
    alignItems: 'center',
    borderTopWidth: 3,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 2,
  },
  metricCardWide: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 2,
    alignItems: 'center',
    borderTopWidth: 3,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 2,
  },
  metricNum: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 1,
  },
  metricLabel: {
    fontSize: 8.5,
    color: '#64748b',
    fontWeight: '700',
    textAlign: 'center',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a',
  },
  countBadge: {
    backgroundColor: '#eef5fc',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(37, 142, 200, 0.2)',
  },
  countBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#258ec8',
  },
  patientCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#64748b',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  patientAvatarCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#e0f2fe',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  avatarText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#258ec8',
  },
  patientMainInfo: {
    flex: 1,
  },
  patientName: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a',
  },
  patientMeta: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 1,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  statusBadgeText: {
    fontSize: 9,
    fontWeight: '800',
  },
  detailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 5,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#f1f5f9',
    marginBottom: 6,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  detailText: {
    fontSize: 12,
    color: '#334155',
    fontWeight: '600',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  callBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#e0f2fe',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  callBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#258ec8',
  },
  waBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#dcfce7',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  waBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#166534',
  },
  statusChangeBtn: {
    backgroundColor: '#258ec8',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  statusChangeBtnText: {
    color: '#ffffff',
    fontSize: 11.5,
    fontWeight: '800',
  },
  viewBtn: {
    marginLeft: 'auto',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#258ec8',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  viewBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#ffffff',
  },
  emptyCardContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    paddingVertical: 20,
    paddingHorizontal: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 2,
  },
  emptyCardText: {
    fontSize: 12.5,
    color: '#64748b',
    fontWeight: '500',
    textAlign: 'center',
  },
  limeGreenBtn: {
    backgroundColor: '#258ec8',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 12,
    marginTop: 12,
    shadowColor: '#258ec8',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 3,
  },
  limeGreenBtnText: {
    color: '#ffffff',
    fontWeight: '800',
    fontSize: 13,
  },
  emptyCardSimple: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    paddingVertical: 18,
    paddingHorizontal: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 5,
  },
  dateOptionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 10,
  },
  dateOptionBtnSelected: {
    backgroundColor: '#f0f9ff',
    borderColor: '#258ec8',
  },
  quickDateBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#bae6fd',
    backgroundColor: '#e0f2fe',
  },
  quickDateBtnActive: {
    backgroundColor: '#258ec8',
    borderColor: '#0284c7',
  },
  quickDateText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#0284c7',
  },
  quickDateTextActive: {
    color: '#ffffff',
  },
  arrowIconBtn: {
    padding: 5,
    backgroundColor: '#258ec8',
    borderWidth: 1,
    borderColor: '#1d709e',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  callIconBtn: {
    padding: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  waIconBtn: {
    padding: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteIconBtn: {
    padding: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rescheduleIconBtn: {
    padding: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rescheduleBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0284c7',
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 4,
  },
  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  inputText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: '#0f172a',
    padding: 0,
  },
  doctorPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
  },
  doctorPillActive: {
    backgroundColor: '#258ec8',
    borderColor: '#0284c7',
  },
  doctorPillText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#475569',
  },
  doctorPillTextActive: {
    color: '#ffffff',
  },
  slotChip: {
    width: '31%',
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    paddingVertical: 6,
    paddingHorizontal: 4,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  slotChipActive: {
    backgroundColor: '#258ec8',
    borderColor: '#0284c7',
  },
  slotChipFull: {
    backgroundColor: '#f1f5f9',
    borderColor: '#e2e8f0',
    opacity: 0.6,
  },
  slotChipTime: {
    fontSize: 11,
    fontWeight: '800',
    color: '#0f172a',
  },
  slotChipTimeActive: {
    color: '#ffffff',
  },
  slotChipTimeFull: {
    color: '#94a3b8',
  },
  dropdownSelectorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginTop: 4,
  },
  dropdownOptionsContainer: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 12,
    marginTop: 4,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  dropdownOptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  dropdownOptionRowActive: {
    backgroundColor: '#f0f9ff',
  },
  dropdownOptionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
  },
  capacityBadge: {
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
    marginTop: 2,
  },
  capacityBadgeText: {
    fontSize: 9,
    fontWeight: '800',
  },
  slotChipCapacity: {
    fontSize: 9.5,
    fontWeight: '700',
    color: '#258ec8',
    marginTop: 1,
  },
  slotChipCapacityActive: {
    color: '#e0f2fe',
  },
  slotChipCapacityFull: {
    color: '#ef4444',
  },
});
