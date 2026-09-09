import React, { useState, useEffect } from 'react';
import {
  ClipboardList, Clock, CreditCard, Search, Calendar, CheckCircle,
  ArrowRightLeft, UserX, Activity, CheckCircle2, Play, AlertCircle, Trash2,
  ArrowUp, ArrowDown, Phone, CalendarClock, X, Save, MoreVertical, MessageCircle, FileText
} from 'lucide-react';
import { db, sendRescheduleWhatsAppNotification, sendCancellationWhatsAppNotification, sendInvoiceReceiptWhatsAppNotification, sendExperienceWhatsAppNotification } from '@app/shared';
import { collection, onSnapshot, updateDoc, deleteDoc, doc, query, where, getDocs } from 'firebase/firestore';
import { TargetProgressWebUI } from '../../../components/TargetProgressWebUI';
import { PatientFileUI } from '../../../components/PatientFileUI';
import { CollectFeeCheckoutModal } from '../../../components/CollectFeeCheckoutModal';

interface ReceptionDashboardPageProps {
  currentBranch?: string;
  onNavigate?: (tab: string, data?: any) => void;
}
export const ReceptionDashboardPage: React.FC<ReceptionDashboardPageProps> = ({ currentBranch, onNavigate }) => {
  const [appointments, setAppointments] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'upcoming' | 'active' | 'completed'>('upcoming');
  const [searchTerm, setSearchTerm] = useState('');
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  // 3-Dots Dropdown Menu State
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  // Reschedule Modal States
  const [rescheduleModalApp, setRescheduleModalApp] = useState<any | null>(null);
  const [newRescheduleDate, setNewRescheduleDate] = useState<string>('');
  const [newRescheduleTime, setNewRescheduleTime] = useState<string>('10:00 AM');

  // Checkout & Invoice Modal States
  const [checkoutModalApp, setCheckoutModalApp] = useState<any | null>(null);
  const [invoiceApp, setInvoiceApp] = useState<any | null>(null);
  const [patientFileApp, setPatientFileApp] = useState<any | null>(null);
  const [consultFeeInput, setConsultFeeInput] = useState<number>(500);
  const [medicineFeeInput, setMedicineFeeInput] = useState<number>(1200);
  const [dietFeeInput, setDietFeeInput] = useState<number>(300);
  const [otherChargesInput, setOtherChargesInput] = useState<number>(0);
  const [discountInput, setDiscountInput] = useState<number>(100);
  const [selectedPaymentMode, setSelectedPaymentMode] = useState<string>('Cash');
  const [splitCash, setSplitCash] = useState<number>(1000);
  const [splitUpi, setSplitUpi] = useState<number>(900);

  const handleOpenCheckout = (app: any) => {
    setCheckoutModalApp(app);
    setConsultFeeInput(Number(app.consultationFee) || 500);
    setMedicineFeeInput(Number(app.medicineFeeRequested || app.medicineFee) || 1200);
    setDietFeeInput(Number(app.dietFee) || 0);
    setOtherChargesInput(Number(app.otherCharges) || 0);
    setDiscountInput(Number(app.discount) || 0);
    setSelectedPaymentMode(app.paymentMode || 'Cash');
  };

  const handleStartConsultationWithFile = async (app: any) => {
    await handleUpdateStatus(app.id, 'in_consultation');
    setActiveTab('active');
    if (onNavigate) {
      onNavigate('reception_patient_file', app);
    } else {
      setPatientFileApp({ ...app, status: 'in_consultation' });
    }
  };

  const handleConfirmCheckout = async () => {
    if (!checkoutModalApp) return;
    setActionLoadingId(checkoutModalApp.id);
    const totalDue = Math.max(0, consultFeeInput + medicineFeeInput + dietFeeInput + otherChargesInput - discountInput);

    try {
      const payload = {
        paymentStatus: 'paid',
        paymentPending: false,
        paymentCollectedAt: new Date().toISOString(),
        consultationFee: consultFeeInput,
        medicineFee: medicineFeeInput,
        dietFee: dietFeeInput,
        otherCharges: otherChargesInput,
        discount: discountInput,
        totalPaid: totalDue,
        paymentMode: selectedPaymentMode === 'Split' ? `Split (Cash ₹${splitCash} + UPI ₹${splitUpi})` : selectedPaymentMode,
        updatedAt: new Date().toISOString()
      };

      await updateDoc(doc(db, 'appointments', checkoutModalApp.id), payload).catch(() => { });
      await updateDoc(doc(db, 'allpatients', checkoutModalApp.id), payload).catch(() => { });

      const invoiceData = { ...checkoutModalApp, ...payload };
      setCheckoutModalApp(null);
      setInvoiceApp(invoiceData);
    } catch (err) {
      console.error('Error completing checkout:', err);
    } finally {
      setActionLoadingId(null);
    }
  };


  // Close dropdown menu when clicking outside
  useEffect(() => {
    const handleGlobalClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.action-menu-container')) {
        setActiveMenuId(null);
      }
    };
    window.addEventListener('click', handleGlobalClick);
    return () => window.removeEventListener('click', handleGlobalClick);
  }, []);

  const DEFAULT_BRANCH_TARGETS: Record<string, { monthlyTarget: number; targetReached: number }> = {
    kphb: { monthlyTarget: 1200000, targetReached: 980000 },
    nallagandla: { monthlyTarget: 1000000, targetReached: 840000 },
    dilshuknagar: { monthlyTarget: 1400000, targetReached: 1150000 },
    chandanagar: { monthlyTarget: 900000, targetReached: 720000 },
  };

  const getBranchDefaultTarget = (bName: string) => {
    const norm = (bName || '').toLowerCase();
    if (norm.includes('kphb') || norm.includes('kukatpally')) return DEFAULT_BRANCH_TARGETS.kphb;
    if (norm.includes('nalla') || norm.includes('nallagandla')) return DEFAULT_BRANCH_TARGETS.nallagandla;
    if (norm.includes('chanda') || norm.includes('chnr') || norm.includes('chandanagar')) return DEFAULT_BRANCH_TARGETS.chandanagar;
    return DEFAULT_BRANCH_TARGETS.dilshuknagar;
  };

  const activeBranchName = currentBranch || 'KPHB Branch';
  const initialTarget = getBranchDefaultTarget(activeBranchName);

  // Subscribe live to Firestore branchTargets
  const [branchTarget, setBranchTarget] = useState({
    monthlyTarget: initialTarget.monthlyTarget,
    targetReached: initialTarget.targetReached,
    branchName: activeBranchName
  });

  useEffect(() => {
    try {
      const colRef = collection(db, 'branchTargets');
      const unsubscribe = onSnapshot(colRef, (snapshot) => {
        const curBranch = currentBranch || 'KPHB Branch';
        const defTarget = getBranchDefaultTarget(curBranch);

        if (!snapshot.empty) {
          const liveMap: Record<string, any> = {};
          snapshot.forEach((docSnap) => {
            liveMap[docSnap.id.toLowerCase()] = docSnap.data();
            if (docSnap.data().branchName) {
              liveMap[docSnap.data().branchName.toLowerCase()] = docSnap.data();
            }
          });

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
              monthlyTarget: Number(targetData.monthlyTarget) || defTarget.monthlyTarget,
              targetReached: Number(targetData.targetReached) || defTarget.targetReached,
              branchName: targetData.branchName || curBranch
            });
          } else {
            setBranchTarget({
              monthlyTarget: defTarget.monthlyTarget,
              targetReached: defTarget.targetReached,
              branchName: curBranch
            });
          }
        } else {
          setBranchTarget({
            monthlyTarget: defTarget.monthlyTarget,
            targetReached: defTarget.targetReached,
            branchName: curBranch
          });
        }
      });
      return () => unsubscribe();
    } catch (err) {
      console.error('Error listening to branch target:', err);
    }
  }, [currentBranch]);

  // Subscribe live to both Firestore appointments & allpatients collections
  useEffect(() => {
    let unsubApp: (() => void) | null = null;
    let unsubPat: (() => void) | null = null;
    let appsFromAppointments: any[] = [];
    let appsFromAllPatients: any[] = [];

    const mergeAndSet = () => {
      const combinedMap = new Map<string, any>();

      // 1. Add all appointments from 'appointments' collection by document ID
      appsFromAppointments.forEach(item => {
        if (item.id) {
          combinedMap.set(item.id, item);
        }
      });

      // 2. Merge records from 'allpatients' collection
      appsFromAllPatients.forEach(item => {
        if (!item.id) return;
        if (combinedMap.has(item.id)) {
          const existing = combinedMap.get(item.id);
          combinedMap.set(item.id, {
            ...item,
            ...existing,
            status: existing.status || item.status,
            paymentStatus: existing.paymentStatus || item.paymentStatus,
            feeCollectionNeeded: existing.feeCollectionNeeded ?? item.feeCollectionNeeded
          });
        } else {
          // Check if this allpatients record is an exact duplicate of an existing appointment (same phone, date, time and doctor)
          const cleanPhone = String(item.phoneNumber || item.phone || '').replace(/\D/g, '').slice(-10);
          const date = String(item.appointmentDate || item.date || '').trim();
          const time = String(item.appointmentTime || item.time || item.timeSlot || '').trim().toLowerCase();
          const doctor = String(item.doctorName || item.doctor || '').trim().toLowerCase();

          let isDuplicate = false;
          if (cleanPhone && date && time) {
            for (const existing of combinedMap.values()) {
              const exPhone = String(existing.phoneNumber || existing.phone || '').replace(/\D/g, '').slice(-10);
              const exDate = String(existing.appointmentDate || existing.date || '').trim();
              const exTime = String(existing.appointmentTime || existing.time || existing.timeSlot || '').trim().toLowerCase();
              const exDoc = String(existing.doctorName || existing.doctor || '').trim().toLowerCase();
              if (exPhone === cleanPhone && exDate === date && exTime === time && (!doctor || !exDoc || doctor === exDoc)) {
                isDuplicate = true;
                break;
              }
            }
          }

          if (!isDuplicate) {
            combinedMap.set(item.id, item);
          }
        }
      });

      const list = Array.from(combinedMap.values());
      list.sort((a, b) => {
        const dateA = String(a.appointmentDate || a.date || a.createdAt || '');
        const dateB = String(b.appointmentDate || b.date || b.createdAt || '');
        return dateB.localeCompare(dateA);
      });
      setAppointments(list);
    };

    try {
      unsubApp = onSnapshot(collection(db, 'appointments'), (snapshot) => {
        const list: any[] = [];
        snapshot.forEach((snap) => {
          list.push({ ...snap.data(), id: snap.id, docId: snap.id, collectionName: 'appointments' });
        });
        appsFromAppointments = list;
        mergeAndSet();
      }, (err) => {
        console.warn('Appointments snapshot listener notice:', err);
      });
    } catch (e) {
      console.warn('Appointments listener setup notice:', e);
    }

    try {
      unsubPat = onSnapshot(collection(db, 'allpatients'), (snapshot) => {
        const list: any[] = [];
        snapshot.forEach((snap) => {
          const data = snap.data();
          if (data.appointmentDate || data.date || data.appointmentTime || data.doctor || data.status) {
            list.push({ ...data, id: snap.id, docId: snap.id, collectionName: 'allpatients' });
          }
        });
        appsFromAllPatients = list;
        mergeAndSet();
      }, (err) => {
        console.warn('Allpatients snapshot listener notice:', err);
      });
    } catch (e) {
      console.warn('Allpatients setup notice:', e);
    }

    return () => {
      if (unsubApp) unsubApp();
      if (unsubPat) unsubPat();
    };
  }, []);

  // Status update handler (updates both appointments and allpatients)
  const handleUpdateStatus = async (appId: string, newStatus: string) => {
    setActionLoadingId(appId);
    try {
      const payload = {
        status: newStatus,
        updatedAt: new Date().toISOString()
      };
      await updateDoc(doc(db, 'appointments', appId), payload).catch(() => { });
      await updateDoc(doc(db, 'allpatients', appId), payload).catch(() => { });
      await updateDoc(doc(db, 'patients', appId), payload).catch(() => { });

      if (newStatus === 'cancelled') {
        const appObj = appointments.find(a => a.id === appId);
        if (appObj) {
          sendCancellationWhatsAppNotification({
            patientName: appObj.patientName || appObj.fullName || appObj.name || 'Patient',
            phone: appObj.phoneNumber || appObj.phone || '',
            date: appObj.appointmentDate || appObj.date || '',
            time: appObj.appointmentTime || appObj.time || '10:00 AM',
            doctorName: appObj.doctorName || appObj.doctor,
            branch: appObj.branch || currentBranch
          }).catch(err => console.error('Cancellation WhatsApp notification error:', err));
        }
      }
    } catch (err) {
      console.error('Failed to update status:', err);
    } finally {
      setActionLoadingId(null);
    }
  };

  // Reschedule Appointment handler
  const handleSaveReschedule = async () => {
    if (!rescheduleModalApp || !newRescheduleDate) return;
    setActionLoadingId(rescheduleModalApp.id);
    try {
      const payload = {
        appointmentDate: newRescheduleDate,
        appointmentTime: newRescheduleTime || rescheduleModalApp.appointmentTime || '10:00 AM',
        updatedAt: new Date().toISOString()
      };
      await updateDoc(doc(db, 'appointments', rescheduleModalApp.id), payload).catch(() => { });
      await updateDoc(doc(db, 'allpatients', rescheduleModalApp.id), payload).catch(() => { });

      // Trigger Leonas WhatsApp Reschedule Notification
      sendRescheduleWhatsAppNotification({
        patientName: rescheduleModalApp.patientName || rescheduleModalApp.fullName || rescheduleModalApp.name || 'Patient',
        phone: rescheduleModalApp.phoneNumber || rescheduleModalApp.phone || '',
        date: newRescheduleDate,
        time: newRescheduleTime || rescheduleModalApp.appointmentTime || '10:00 AM',
        doctorName: rescheduleModalApp.doctorName || rescheduleModalApp.doctor,
        branch: rescheduleModalApp.branch || currentBranch
      }).catch(err => console.error('WhatsApp reschedule notification error:', err));

      setRescheduleModalApp(null);
    } catch (err) {
      console.error('Error saving rescheduled appointment:', err);
    } finally {
      setActionLoadingId(null);
    }
  };

  // 1. Move Consultation Status to "completed"
  const handleMoveToCompleted = async (appId: string) => {
    setActionLoadingId(appId);
    try {
      const payload = {
        status: 'completed',
        updatedAt: new Date().toISOString()
      };
      await updateDoc(doc(db, 'appointments', appId), payload).catch(() => { });
      await updateDoc(doc(db, 'allpatients', appId), payload).catch(() => { });
      await updateDoc(doc(db, 'patients', appId), payload).catch(() => { });

      const targetApp = appointments.find(a => a.id === appId);
      if (targetApp) {
        const phone = targetApp.phoneNumber || targetApp.phone || '';
        const patientName = targetApp.patientName || targetApp.fullName || targetApp.name || 'Patient';

        // Trigger Invoice Receipt Template (invoice_recpt)
        sendInvoiceReceiptWhatsAppNotification({
          patientName,
          phone,
        }).catch(err => console.error('WhatsApp invoice_recpt error:', err));

        // Trigger Patient Experience / Feedback Template (experience)
        sendExperienceWhatsAppNotification({
          patientName,
          phone,
        }).catch(err => console.error('WhatsApp experience error:', err));
      }
    } catch (err) {
      console.error('Failed to update status to completed:', err);
    } finally {
      setActionLoadingId(null);
    }
  };

  // 2. Toggle Payment Status (Paid <-> Pending/Unpaid)
  const handleTogglePaymentStatus = async (appId: string, currentStatus: string) => {
    const nextStatus = currentStatus === 'paid' ? 'pending' : 'paid';
    setActionLoadingId(appId);
    try {
      const payload = {
        paymentStatus: nextStatus,
        paymentPending: nextStatus === 'pending',
        updatedAt: new Date().toISOString()
      };
      await updateDoc(doc(db, 'appointments', appId), payload).catch(() => { });
      await updateDoc(doc(db, 'allpatients', appId), payload).catch(() => { });
      await updateDoc(doc(db, 'patients', appId), payload).catch(() => { });
    } catch (err) {
      console.error('Failed to toggle payment status:', err);
    } finally {
      setActionLoadingId(null);
    }
  };

  // Delete appointment handler
  const handleDeleteAppointment = async (appId: string, pName: string) => {
    if (!window.confirm(`Are you sure you want to delete the appointment for ${pName || 'this patient'}?`)) {
      return;
    }
    setActionLoadingId(appId);
    try {
      const targetApp = appointments.find(a => a.id === appId);
      const pPhone = targetApp?.phoneNumber || targetApp?.phone || '';
      const appDate = targetApp?.appointmentDate || targetApp?.date || '';

      // Direct ID deletion across all collections
      await deleteDoc(doc(db, 'appointments', appId)).catch(() => {});
      await deleteDoc(doc(db, 'allpatients', appId)).catch(() => {});
      await deleteDoc(doc(db, 'patients', appId)).catch(() => {});

      // Query and clean up duplicate records with same phone and name/date across all collections
      if (pPhone || pName) {
        const cleanPhone = pPhone.replace(/\D/g, '').slice(-10);
        const cleanName = (pName || '').toLowerCase().trim();
        const collectionsToClean = ['appointments', 'allpatients', 'patients'];
        for (const colName of collectionsToClean) {
          try {
            const snap = await getDocs(collection(db, colName));
            snap.forEach((dSnap) => {
              const data = dSnap.data();
              const dPhone = String(data.phoneNumber || data.phone || '').replace(/\D/g, '').slice(-10);
              const dName = String(data.patientName || data.name || '').toLowerCase().trim();
              const dDate = String(data.appointmentDate || data.date || '').trim();
              if (
                (cleanPhone && dPhone === cleanPhone && dName === cleanName) ||
                (appDate && dDate === appDate && dName === cleanName)
              ) {
                deleteDoc(doc(db, colName, dSnap.id)).catch(() => {});
              }
            });
          } catch (e) {}
        }
      }
    } catch (err) {
      console.error('Failed to delete appointment:', err);
    } finally {
      setActionLoadingId(null);
    }
  };

  const getTodayISO = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const day = now.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const [selectedDate, setSelectedDate] = useState<string>(getTodayISO());

  const isMatchingDate = (a: any) => {
    const rawDate = a.appointmentDate || a.date || a.bookingDate || a.dateString;
    if (!rawDate) {
      return selectedDate === getTodayISO();
    }
    const clean = String(rawDate).trim();
    if (!clean) {
      return selectedDate === getTodayISO();
    }

    if (clean === selectedDate || clean.startsWith(selectedDate)) return true;

    // Support DD-MM-YYYY format matching YYYY-MM-DD
    const partsISO = selectedDate.split('-'); // [YYYY, MM, DD]
    if (partsISO.length === 3) {
      const [y, m, d] = partsISO;
      const ddmmyyyyHyphen = `${d}-${m}-${y}`;
      const ddmmyyyySlash = `${d}/${m}/${y}`;
      const dmySlash = `${parseInt(d, 10)}/${parseInt(m, 10)}/${y}`;
      const dmyHyphen = `${parseInt(d, 10)}-${parseInt(m, 10)}-${y}`;
      if (clean === ddmmyyyyHyphen || clean === ddmmyyyySlash || clean === dmySlash || clean === dmyHyphen) return true;
    }

    return false;
  };

  const isMatchingBranch = (a: any) => {
    if (!currentBranch || currentBranch === 'All Branches') return true;
    const appBranch = a.branch || a.targetBranch || a.branchName;
    if (!appBranch) return true;
    const normAppBranch = String(appBranch).toLowerCase().replace(/\s*branch\s*/i, '').trim();
    const normCurrentBranch = String(currentBranch).toLowerCase().replace(/\s*branch\s*/i, '').trim();
    return normAppBranch.includes(normCurrentBranch) || normCurrentBranch.includes(normAppBranch);
  };

  // Filter ONLY appointments for the selected date AND current branch
  const filteredBranchDateAppointments = appointments.filter(a => {
    return isMatchingDate(a) && isMatchingBranch(a);
  });

  // Filter lists for 3 sections (Selected Date & Branch ONLY)
  const upcomingList = filteredBranchDateAppointments.filter(a => {
    const st = (a.status || 'scheduled').toLowerCase().trim();
    const p = (a.paymentStatus || '').toLowerCase().trim();
    const isCompleted = st === 'completed' || st === 'concluded' || st === 'finished' || st === 'done' || st === 'paid' || p === 'paid';
    const isActive = st === 'in-consultation' || st === 'active' || st === 'consulting' || st === 'in_consultation' || st === 'collect_fee' || a.feeCollectionNeeded === true;
    return !isCompleted && !isActive && st !== 'cancelled';
  }).sort((a, b) => {
    if (a.queueOrder !== undefined && b.queueOrder !== undefined) {
      return a.queueOrder - b.queueOrder;
    }
    return 0;
  });

  // Handler for shifting patient queue position (Up / Down) in Firestore
  const handleShiftQueueOrder = async (patient: any, direction: 'up' | 'down') => {
    const listIndex = upcomingList.findIndex(item => item.id === patient.id);
    if (listIndex === -1) return;
    const targetIndex = direction === 'up' ? listIndex - 1 : listIndex + 1;
    if (targetIndex < 0 || targetIndex >= upcomingList.length) return;
    const currentApp = upcomingList[listIndex];
    const targetApp = upcomingList[targetIndex];
    try {
      const currentOrder = currentApp.queueOrder ?? (listIndex + 1);
      const targetOrder = targetApp.queueOrder ?? (targetIndex + 1);
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

  const activeList = filteredBranchDateAppointments.filter(a => {
    const st = (a.status || '').toLowerCase().trim();
    const p = (a.paymentStatus || '').toLowerCase().trim();
    return (st === 'in-consultation' || st === 'active' || st === 'consulting' || st === 'in_consultation' || st === 'collect_fee' || a.feeCollectionNeeded === true) && p !== 'paid' && st !== 'completed';
  });

  const completedList = filteredBranchDateAppointments.filter(a => {
    const st = (a.status || '').toLowerCase().trim();
    const p = (a.paymentStatus || '').toLowerCase().trim();
    return st === 'completed' || st === 'concluded' || st === 'finished' || st === 'done' || st === 'paid' || p === 'paid';
  });

  // Dynamic statistics for selected date & branch
  const totalBookings = filteredBranchDateAppointments.length;
  const waitingCount = filteredBranchDateAppointments.filter(a => (a.status || '').toLowerCase() === 'waiting' || (a.status || '').toLowerCase() === 'scheduled').length;
  const paymentPendingCount = filteredBranchDateAppointments.filter(a => a.paymentStatus === 'pending' || a.paymentPending).length;
  const activeConsultationCount = activeList.length;
  const completedCount = completedList.length;
  const followupOptedCount = filteredBranchDateAppointments.filter(a => a.followUpOpted || a.followup === true).length;
  const followupNotOptedCount = filteredBranchDateAppointments.filter(a => a.followUpOpted === false || a.followup === false).length;

  // Active list based on selected section tab
  const getTabAppointments = () => {
    switch (activeTab) {
      case 'active':
        return activeList;
      case 'completed':
        return completedList;
      case 'upcoming':
      default:
        return upcomingList;
    }
  };

  const currentTabAppointments = getTabAppointments().filter(app => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    const pName = (app.patientName || app.name || '').toLowerCase();
    const pPhone = (app.phoneNumber || app.phone || '').toLowerCase();
    const docName = (app.doctorName || app.doctor || '').toLowerCase();
    const dis = (app.diseases || '').toLowerCase();
    return pName.includes(term) || pPhone.includes(term) || docName.includes(term) || dis.includes(term);
  });

  return (
    <div style={{ padding: '24px 20px', maxWidth: '1400px', margin: '0 auto', fontFamily: 'Inter, system-ui, sans-serif' }}>
      {/* Branch Monthly Target Card */}
      <TargetProgressWebUI
        branchName={branchTarget.branchName}
        monthlyTarget={branchTarget.monthlyTarget}
        targetReached={branchTarget.targetReached}
      />

      {/* Header Banner */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ background: 'rgba(37, 142, 200, 0.12)', padding: '10px', borderRadius: '12px', border: '1px solid rgba(37, 142, 200, 0.25)' }}>
            <ClipboardList color="#258ec8" size={24} />
          </div>
          <div>
            <h1 style={{ fontSize: '18px', fontWeight: 800, color: '#1e293b', margin: 0 }}>
              Reception Desk Dashboard ({currentBranch || 'KPHB Branch'})
            </h1>
          </div>
        </div>

        {/* Date Filter Picker */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#ffffff', border: '1.5px solid #258ec8', padding: '6px 14px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(37, 142, 200, 0.12)' }}>
          <Calendar size={16} color="#258ec8" />
          <span style={{ fontSize: '12px', fontWeight: 800, color: '#1e293b' }}>Select Date:</span>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            style={{
              border: 'none',
              outline: 'none',
              fontSize: '12px',
              fontWeight: 700,
              color: '#0f172a',
              cursor: 'pointer',
              background: 'transparent'
            }}
          />
          {selectedDate !== getTodayISO() && (
            <button
              type="button"
              onClick={() => setSelectedDate(getTodayISO())}
              style={{
                background: '#258ec8',
                color: '#ffffff',
                border: 'none',
                padding: '4px 10px',
                borderRadius: '8px',
                fontSize: '11px',
                fontWeight: 800,
                cursor: 'pointer'
              }}
            >
              Reset Today
            </button>
          )}
        </div>
      </div>

      {/* 7 Metric Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '14px', marginBottom: '24px' }}>
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '14px', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '11.5px', fontWeight: 600, color: '#64748b' }}>Total Bookings</span>
            <Calendar color="#258ec8" size={16} />
          </div>
          <span style={{ fontSize: '20px', fontWeight: 800, color: '#258ec8' }}>{totalBookings}</span>
          <p style={{ fontSize: '10.5px', color: '#94a3b8', marginTop: '4px', margin: 0 }}>Bookings Today</p>
        </div>

        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '14px', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '11.5px', fontWeight: 600, color: '#64748b' }}>Waiting</span>
            <Clock color="#d97706" size={16} />
          </div>
          <span style={{ fontSize: '20px', fontWeight: 800, color: '#d97706' }}>{waitingCount}</span>
          <p style={{ fontSize: '10.5px', color: '#94a3b8', marginTop: '4px', margin: 0 }}>In Waiting Lounge</p>
        </div>

        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '14px', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '11.5px', fontWeight: 600, color: '#64748b' }}>Active Consultations</span>
            <Activity color="#d97706" size={16} />
          </div>
          <span style={{ fontSize: '20px', fontWeight: 800, color: '#d97706' }}>{activeConsultationCount}</span>
          <p style={{ fontSize: '10.5px', color: '#94a3b8', marginTop: '4px', margin: 0 }}>With Doctor Now</p>
        </div>

        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '14px', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '11.5px', fontWeight: 600, color: '#64748b' }}>Payment Pending</span>
            <CreditCard color="#ef4444" size={16} />
          </div>
          <span style={{ fontSize: '20px', fontWeight: 800, color: '#ef4444' }}>{paymentPendingCount}</span>
          <p style={{ fontSize: '10.5px', color: '#94a3b8', marginTop: '4px', margin: 0 }}>Unpaid Invoices</p>
        </div>

        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '14px', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '11.5px', fontWeight: 600, color: '#64748b' }}>Completed</span>
            <CheckCircle color="#16a34a" size={16} />
          </div>
          <span style={{ fontSize: '20px', fontWeight: 800, color: '#16a34a' }}>{completedCount}</span>
          <p style={{ fontSize: '10.5px', color: '#94a3b8', marginTop: '4px', margin: 0 }}>Visits Concluded</p>
        </div>

        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '14px', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '11.5px', fontWeight: 600, color: '#64748b' }}>Follow-up Opted</span>
            <ArrowRightLeft color="#258ec8" size={16} />
          </div>
          <span style={{ fontSize: '20px', fontWeight: 800, color: '#258ec8' }}>{followupOptedCount}</span>
          <p style={{ fontSize: '10.5px', color: '#94a3b8', marginTop: '4px', margin: 0 }}>Next Visit Booked</p>
        </div>

        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '14px', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '11.5px', fontWeight: 600, color: '#64748b' }}>Follow-up Not Opted</span>
            <UserX color="#64748b" size={16} />
          </div>
          <span style={{ fontSize: '20px', fontWeight: 800, color: '#64748b' }}>{followupNotOptedCount}</span>
          <p style={{ fontSize: '10.5px', color: '#94a3b8', marginTop: '4px', margin: 0 }}>No Next Visit</p>
        </div>
      </div>

      {/* 3 SECTION TAB BUTTONS & APPOINTMENTS TABLE */}
      <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '24px', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>

        {/* Section Tabs Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px', marginBottom: '20px', borderBottom: '2px solid #f1f5f9', paddingBottom: '16px' }}>

          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            {/* 1. Upcoming Appointments Tab Button */}
            <button
              type="button"
              onClick={() => setActiveTab('upcoming')}
              style={{
                padding: '10px 18px',
                borderRadius: '12px',
                border: activeTab === 'upcoming' ? '2px solid #258ec8' : '1px solid #cbd5e1',
                fontWeight: 800,
                fontSize: '13px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                background: activeTab === 'upcoming' ? '#258ec8' : '#ffffff',
                color: activeTab === 'upcoming' ? '#ffffff' : '#475569',
                boxShadow: activeTab === 'upcoming' ? '0 4px 12px rgba(37, 142, 200, 0.25)' : 'none',
                transition: 'all 0.2s ease'
              }}
            >
              <Calendar size={16} /> Upcoming Appointments
              <span style={{
                background: activeTab === 'upcoming' ? 'rgba(255, 255, 255, 0.25)' : '#f1f5f9',
                color: activeTab === 'upcoming' ? '#ffffff' : '#0284c7',
                padding: '2px 8px',
                borderRadius: '10px',
                fontSize: '11px',
                fontWeight: 800
              }}>
                {upcomingList.length}
              </span>
            </button>

            {/* 2. Active Consultation Tab Button */}
            <button
              type="button"
              onClick={() => setActiveTab('active')}
              style={{
                padding: '10px 18px',
                borderRadius: '12px',
                border: activeTab === 'active' ? '2px solid #d97706' : '1px solid #cbd5e1',
                fontWeight: 800,
                fontSize: '13px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                background: activeTab === 'active' ? '#d97706' : '#ffffff',
                color: activeTab === 'active' ? '#ffffff' : '#475569',
                boxShadow: activeTab === 'active' ? '0 4px 12px rgba(217, 119, 6, 0.25)' : 'none',
                transition: 'all 0.2s ease'
              }}
            >
              <Activity size={16} /> Active Consultation
              <span style={{
                background: activeTab === 'active' ? 'rgba(255, 255, 255, 0.25)' : '#fef3c7',
                color: activeTab === 'active' ? '#ffffff' : '#b45309',
                padding: '2px 8px',
                borderRadius: '10px',
                fontSize: '11px',
                fontWeight: 800
              }}>
                {activeList.length}
              </span>
            </button>

            {/* 3. Completed Appointments Tab Button */}
            <button
              type="button"
              onClick={() => setActiveTab('completed')}
              style={{
                padding: '10px 18px',
                borderRadius: '12px',
                border: activeTab === 'completed' ? '2px solid #16a34a' : '1px solid #cbd5e1',
                fontWeight: 800,
                fontSize: '13px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                background: activeTab === 'completed' ? '#16a34a' : '#ffffff',
                color: activeTab === 'completed' ? '#ffffff' : '#475569',
                boxShadow: activeTab === 'completed' ? '0 4px 12px rgba(22, 163, 74, 0.25)' : 'none',
                transition: 'all 0.2s ease'
              }}
            >
              <CheckCircle size={16} /> Completed Appointments
              <span style={{
                background: activeTab === 'completed' ? 'rgba(255, 255, 255, 0.25)' : '#dcfce7',
                color: activeTab === 'completed' ? '#ffffff' : '#15803d',
                padding: '2px 8px',
                borderRadius: '10px',
                fontSize: '11px',
                fontWeight: 800
              }}>
                {completedList.length}
              </span>
            </button>
          </div>

          {/* Search Field */}
          <div style={{ position: 'relative', width: '280px' }}>
            <Search size={15} color="#64748b" style={{ position: 'absolute', left: '12px', top: '10px' }} />
            <input
              type="text"
              placeholder="Search by patient, phone, doctor..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px 8px 36px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '12px',
                outline: 'none'
              }}
            />
          </div>
        </div>

        {/* Dynamic Appointments Table */}
        {currentTabAppointments.length === 0 ? (
          <div style={{ padding: '40px 20px', textAlign: 'center', color: '#64748b' }}>
            <AlertCircle size={32} color="#94a3b8" style={{ marginBottom: '8px' }} />
            <p style={{ margin: 0, fontSize: '13px', fontWeight: 600 }}>
              No {activeTab === 'upcoming' ? 'upcoming appointments' : activeTab === 'active' ? 'active consultations' : 'completed appointments'} found.
            </p>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #f1f5f9', textAlign: 'left', color: '#64748b', fontSize: '11px', fontWeight: 800 }}>
                <th style={{ padding: '12px 8px' }}>PATIENT DETAILS</th>
                <th style={{ padding: '12px 8px' }}>DOCTOR & BRANCH</th>
                <th style={{ padding: '12px 8px' }}>STATUS</th>
                <th style={{ padding: '12px 8px', textAlign: 'right' }}>ACTION</th>
              </tr>
            </thead>
            <tbody>
              {currentTabAppointments.map((app, index) => {
                const isLoading = actionLoadingId === app.id;
                const status = (app.status || 'scheduled').toLowerCase().trim();
                const isPaid = app.paymentStatus === 'paid';
                const isCompleted = status === 'completed' || status === 'done' || status === 'finished' || status === 'paid' || isPaid;
                const isConsulting = status === 'in-consultation' || status === 'active' || status === 'in_consultation' || status === 'consulting';

                const rawReg = app.registrationId || app.registration_id || app.regId || app.regID || app.patientId || app.uhid;
                let cleanRegId = '';
                if (rawReg && typeof rawReg === 'string' && rawReg.trim().length > 0 && rawReg.trim().length <= 18 && !/^[a-zA-Z0-9]{19,32}$/.test(rawReg.trim())) {
                  cleanRegId = rawReg.trim().toUpperCase();
                } else {
                  const branchStr = (app.branch || app.branchName || 'KPHB').toUpperCase();
                  let shortcut = 'KPB';
                  if (branchStr.includes('KPHB') || branchStr === 'KPB') shortcut = 'KPB';
                  else if (branchStr.includes('CHANDANAGAR') || branchStr === 'CHN') shortcut = 'CHN';
                  else if (branchStr.includes('NALLAGANDLA') || branchStr === 'NGL') shortcut = 'NGL';
                  else if (branchStr.includes('DILSHUKNAGAR') || branchStr === 'DIL') shortcut = 'DIL';
                  else shortcut = branchStr.replace(/[^A-Z]/g, '').substring(0, 3) || 'GEN';

                  cleanRegId = `SPH-${shortcut}-${String(index + 1).padStart(4, '0')}`;
                }

                const patientPhone = app.phoneNumber || app.phone || '';
                const cleanPhoneNum = patientPhone.replace(/\D/g, '').slice(-10);
                const isMenuOpen = activeMenuId === app.id;

                return (
                  <tr key={app.id} style={{ borderBottom: '1px solid #f8fafc' }}>
                    <td style={{ padding: '12px 8px' }}>
                      <div
                        onClick={() => {
                          if (status === 'collect_fee' || app.feeCollectionNeeded) {
                            handleOpenCheckout(app);
                          } else {
                            setPatientFileApp(app);
                          }
                        }}
                        style={{ fontWeight: 800, color: '#258ec8', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                        title={status === 'collect_fee' || app.feeCollectionNeeded ? "Click to open Billing Checkout & Fee Collection" : "Click to view Patient File & Clinical History"}
                      >
                        <span>{app.patientName || app.name || 'Unnamed Patient'}</span>
                        {!isCompleted && activeTab !== 'completed' && (
                          <span style={{ fontSize: '10px', background: '#e0f2fe', color: '#0284c7', padding: '1px 6px', borderRadius: '4px', fontWeight: 800 }}>
                            📄 File
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ color: '#258ec8', fontWeight: 800 }}>{cleanRegId}</span>
                        {patientPhone ? (
                          <a
                            href={`tel:${patientPhone}`}
                            style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', color: '#0284c7', textDecoration: 'none', fontWeight: 700 }}
                            title="Call Patient"
                          >
                            <Phone size={12} /> +91 {patientPhone}
                          </a>
                        ) : (
                          <span>• No phone</span>
                        )}
                      </div>
                    </td>
                    <td style={{ padding: '12px 8px' }}>
                      <div style={{ fontWeight: 700, color: '#1e293b' }}>{app.doctorName || app.doctor || 'Unassigned'}</div>
                      <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span>{app.branch || 'Main Branch'}</span>
                        <span>•</span>
                        <span style={{ color: '#0284c7', fontWeight: 700 }}>{app.appointmentTime || app.time || '10:00 AM'}</span>
                      </div>
                    </td>

                    <td style={{ padding: '12px 8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {isCompleted ? (
                          <span style={{
                            padding: '4px 10px',
                            borderRadius: '12px',
                            fontSize: '11px',
                            fontWeight: 800,
                            backgroundColor: '#d1fae5',
                            color: '#047857',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}>
                            PAID ✓
                          </span>
                        ) : isConsulting ? (
                          <button
                            type="button"
                            onClick={() => {
                              if (onNavigate) {
                                onNavigate('reception_patient_file', app);
                              } else {
                                setPatientFileApp(app);
                              }
                            }}
                            style={{ background: '#fef3c7', color: '#b45309', border: '1px solid #fde68a', padding: '4px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: 800, cursor: 'pointer' }}
                          >
                            ⚡ In Consultation
                          </button>
                        ) : (
                          <button
                            type="button"
                            disabled={isLoading}
                            onClick={() => handleStartConsultationWithFile(app)}
                            style={{
                              background: '#258ec8',
                              color: '#ffffff',
                              border: 'none',
                              padding: '6px 12px',
                              borderRadius: '10px',
                              fontSize: '11px',
                              fontWeight: 800,
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              boxShadow: '0 2px 6px rgba(37, 142, 200, 0.2)'
                            }}
                          >
                            <Play size={12} /> Start Consultation
                          </button>
                        )}

                        {/* Unpaid / Pending Badge -> Triggers Full Screen Billing Checkout in Active / Fee Pending stage */}
                        {!isCompleted && activeTab !== 'upcoming' && (
                          <button
                            type="button"
                            onClick={() => handleOpenCheckout(app)}
                            style={{
                              padding: '4px 10px',
                              borderRadius: '12px',
                              fontSize: '11px',
                              fontWeight: 800,
                              border: 'none',
                              cursor: 'pointer',
                              backgroundColor: '#fee2e2',
                              color: '#b91c1c'
                            }}
                            title="Click to open Billing Checkout & Fee Collection"
                          >
                            UNPAID / PENDING ⏳
                          </button>
                        )}
                      </div>
                    </td>

                    {/* ACTION COLUMN WITH CLEAN DROPDOWN MENU */}
                    <td style={{ padding: '12px 8px', textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                        {/* Upcoming Queue Re-ordering Buttons */}
                        {activeTab === 'upcoming' && (
                          <div style={{ display: 'inline-flex', gap: '4px', alignItems: 'center' }}>
                            <button
                              type="button"
                              disabled={index === 0}
                              onClick={() => handleShiftQueueOrder(app, 'up')}
                              title="Move Up in Queue"
                              style={{
                                background: '#258ec8',
                                border: '1px solid #1d709e',
                                borderRadius: '6px',
                                padding: '5px 7px',
                                cursor: index === 0 ? 'not-allowed' : 'pointer',
                                opacity: index === 0 ? 0.3 : 1,
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                              }}
                            >
                              <ArrowUp size={14} color="#ffffff" />
                            </button>
                            <button
                              type="button"
                              disabled={index === upcomingList.length - 1}
                              onClick={() => handleShiftQueueOrder(app, 'down')}
                              title="Move Down in Queue"
                              style={{
                                background: '#258ec8',
                                border: '1px solid #1d709e',
                                borderRadius: '6px',
                                padding: '5px 7px',
                                cursor: index === upcomingList.length - 1 ? 'not-allowed' : 'pointer',
                                opacity: index === upcomingList.length - 1 ? 0.3 : 1,
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                              }}
                            >
                              <ArrowDown size={14} color="#ffffff" />
                            </button>
                          </div>
                        )}

                        {activeTab === 'active' && (
                          <button
                            type="button"
                            disabled={isLoading}
                            onClick={() => handleOpenCheckout(app)}
                            style={{
                              background: '#16a34a',
                              color: '#ffffff',
                              border: 'none',
                              padding: '6px 12px',
                              borderRadius: '8px',
                              fontSize: '11px',
                              fontWeight: 800,
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              boxShadow: '0 2px 6px rgba(22, 163, 74, 0.25)'
                            }}
                          >
                            <CreditCard size={12} /> Collect Fee & Billing
                          </button>
                        )}

                        {(activeTab === 'completed' || isCompleted) && (
                          <button
                            type="button"
                            onClick={() => handleOpenCheckout(app)}
                            style={{
                              background: '#e0f2fe',
                              color: '#0284c7',
                              border: '1px solid #bae6fd',
                              padding: '5px 12px',
                              borderRadius: '8px',
                              fontSize: '11.5px',
                              fontWeight: 800,
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              boxShadow: '0 2px 6px rgba(2, 132, 199, 0.15)'
                            }}
                            title="Click to view/print/share Paid Digital Invoice"
                          >
                            <FileText size={13} /> Invoice 🧾
                          </button>
                        )}

                        {/* 3-DOTS ACTION DROPDOWN MENU */}
                        <div className="action-menu-container" style={{ position: 'relative', display: 'inline-block' }}>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveMenuId(isMenuOpen ? null : app.id);
                            }}
                            title="More Actions"
                            style={{
                              background: isMenuOpen ? '#e2e8f0' : '#f1f5f9',
                              border: '1px solid #cbd5e1',
                              borderRadius: '6px',
                              padding: '5px',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: '#334155'
                            }}
                          >
                            <MoreVertical size={16} />
                          </button>

                          {/* Dropdown Popup */}
                          {isMenuOpen && (
                            <div style={{
                              position: 'absolute',
                              right: 0,
                              top: '100%',
                              marginTop: '4px',
                              backgroundColor: '#ffffff',
                              borderRadius: '10px',
                              boxShadow: '0 10px 25px -5px rgba(15, 23, 42, 0.15)',
                              border: '1px solid #e2e8f0',
                              zIndex: 1000,
                              minWidth: '160px',
                              padding: '6px',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '2px',
                              textAlign: 'left'
                            }}>
                              {/* 1. Call Option */}
                              {cleanPhoneNum ? (
                                <a
                                  href={`tel:${cleanPhoneNum}`}
                                  style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    padding: '8px 10px',
                                    borderRadius: '6px',
                                    fontSize: '12px',
                                    fontWeight: 700,
                                    color: '#0284c7',
                                    textDecoration: 'none',
                                    backgroundColor: 'transparent'
                                  }}
                                >
                                  <Phone size={14} color="#0284c7" /> Call Patient
                                </a>
                              ) : null}

                              {/* 2. WhatsApp Option */}
                              {cleanPhoneNum ? (
                                <a
                                  href={`https://wa.me/91${cleanPhoneNum}?text=${encodeURIComponent(`Hello ${app.patientName || app.name || 'Patient'}, this is regarding your appointment at Spiritual Homeopathy (${app.branch || 'KPHB'}).`)}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    padding: '8px 10px',
                                    borderRadius: '6px',
                                    fontSize: '12px',
                                    fontWeight: 700,
                                    color: '#16a34a',
                                    textDecoration: 'none',
                                    backgroundColor: 'transparent'
                                  }}
                                >
                                  <MessageCircle size={14} color="#16a34a" /> WhatsApp Chat
                                </a>
                              ) : null}

                              {/* 3. Reschedule Option (EXCLUDED IN COMPLETED TAB AS REQUESTED!) */}
                              {activeTab !== 'completed' && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setActiveMenuId(null);
                                    setRescheduleModalApp(app);
                                    setNewRescheduleDate(app.appointmentDate || selectedDate);
                                    setNewRescheduleTime(app.appointmentTime || '10:00 AM');
                                  }}
                                  style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    padding: '8px 10px',
                                    borderRadius: '6px',
                                    fontSize: '12px',
                                    fontWeight: 700,
                                    color: '#334155',
                                    border: 'none',
                                    background: 'none',
                                    cursor: 'pointer',
                                    width: '100%'
                                  }}
                                >
                                  <CalendarClock size={14} color="#258ec8" /> Reschedule
                                </button>
                              )}

                              {/* View Patient File Separate Page Option */}
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActiveMenuId(null);
                                  if (onNavigate) {
                                    onNavigate('reception_patient_file', app);
                                  } else {
                                    setPatientFileApp(app);
                                  }
                                }}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '8px',
                                  padding: '8px 10px',
                                  borderRadius: '6px',
                                  fontSize: '12px',
                                  fontWeight: 700,
                                  color: '#0284c7',
                                  border: 'none',
                                  background: 'none',
                                  cursor: 'pointer',
                                  width: '100%'
                                }}
                              >
                                <FileText size={14} color="#0284c7" /> Open Patient File Page
                              </button>

                              {/* Collect Fee / Billing Checkout Option */}
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActiveMenuId(null);
                                  handleOpenCheckout(app);
                                }}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '8px',
                                  padding: '8px 10px',
                                  borderRadius: '6px',
                                  fontSize: '12px',
                                  fontWeight: 700,
                                  color: '#16a34a',
                                  border: 'none',
                                  background: 'none',
                                  cursor: 'pointer',
                                  width: '100%'
                                }}
                              >
                                <CreditCard size={14} color="#16a34a" /> Collect Fee & Checkout
                              </button>

                              {/* 4. Delete Option (Hidden on Completed Tab) */}
                              {!isCompleted && activeTab !== 'completed' && (
                                <>
                                  <div style={{ height: '1px', backgroundColor: '#f1f5f9', margin: '3px 0' }} />
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setActiveMenuId(null);
                                      handleDeleteAppointment(app.id, app.patientName || app.name);
                                    }}
                                    style={{
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '8px',
                                      padding: '8px 10px',
                                      borderRadius: '6px',
                                      fontSize: '12px',
                                      fontWeight: 700,
                                      color: '#ef4444',
                                      border: 'none',
                                      background: 'none',
                                      cursor: 'pointer',
                                      width: '100%'
                                    }}
                                  >
                                    <Trash2 size={14} color="#ef4444" /> Delete Appointment
                                  </button>
                                </>
                              )}
                            </div>
                          )}
                        </div>

                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* RESCHEDULE MODAL */}
      {rescheduleModalApp && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.5)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '16px'
        }}>
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '16px',
            width: '100%',
            maxWidth: '420px',
            padding: '24px',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
            border: '1px solid #e2e8f0'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CalendarClock size={20} color="#258ec8" />
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: '#0f172a' }}>
                  Reschedule Appointment
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setRescheduleModalApp(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '10px', marginBottom: '16px', border: '1px solid #f1f5f9' }}>
              <div style={{ fontSize: '13.5px', fontWeight: 800, color: '#0f172a' }}>
                {rescheduleModalApp.patientName || rescheduleModalApp.name}
              </div>
              <div style={{ fontSize: '11.5px', color: '#64748b', marginTop: '2px' }}>
                Doctor: {rescheduleModalApp.doctorName || rescheduleModalApp.doctor || 'Unassigned'} • Phone: +91 {rescheduleModalApp.phone || rescheduleModalApp.phoneNumber || 'N/A'}
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '20px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                  New Appointment Date:
                </label>
                <input
                  type="date"
                  value={newRescheduleDate}
                  onChange={(e) => setNewRescheduleDate(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '13px',
                    fontWeight: 700,
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                  New Time Slot:
                </label>
                <select
                  value={newRescheduleTime}
                  onChange={(e) => setNewRescheduleTime(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '13px',
                    fontWeight: 700,
                    outline: 'none',
                    backgroundColor: '#ffffff',
                    boxSizing: 'border-box'
                  }}
                >
                  {['09:30 AM', '10:00 AM', '10:30 AM', '11:00 AM', '11:30 AM', '12:00 PM', '04:30 PM', '05:00 PM', '05:30 PM', '06:00 PM', '06:30 PM', '07:00 PM'].map((slot) => (
                    <option key={slot} value={slot}>{slot}</option>
                  ))}
                </select>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => setRescheduleModalApp(null)}
                style={{
                  padding: '9px 16px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  background: '#ffffff',
                  color: '#475569',
                  fontWeight: 700,
                  fontSize: '12px',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveReschedule}
                style={{
                  padding: '9px 16px',
                  borderRadius: '8px',
                  border: 'none',
                  background: '#258ec8',
                  color: '#ffffff',
                  fontWeight: 800,
                  fontSize: '12px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <Save size={14} /> Save Reschedule
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Standalone Collect Fee & Printable Digital Invoice Modal */}
      <CollectFeeCheckoutModal
        appointment={checkoutModalApp}
        onClose={() => setCheckoutModalApp(null)}
        onSuccess={() => setCheckoutModalApp(null)}
      />

      {/* RECEPTIONIST PATIENT FILE & CLINICAL DETAILS MODAL */}
      {patientFileApp && (
        <PatientFileUI
          patient={patientFileApp}
          onClose={() => setPatientFileApp(null)}
          onSubmitConsultation={async () => {
            const nextApp = { ...patientFileApp };
            setPatientFileApp(null);
            handleOpenCheckout(nextApp);
          }}
        />
      )}

    </div>
  );
};

