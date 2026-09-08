import React, { useState, useEffect } from 'react';
import {
  ClipboardList, Clock, CreditCard, Search, Calendar, CheckCircle,
  ArrowRightLeft, UserX, Activity, CheckCircle2, Play, AlertCircle, Trash2,
  ArrowUp, ArrowDown, Phone, CalendarClock, X, Save, MoreVertical, MessageCircle, FileText
} from 'lucide-react';
import { db } from '@app/shared';
import { collection, onSnapshot, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { TargetProgressWebUI } from '../../../components/TargetProgressWebUI';
import { PatientFileUI } from '../../../components/PatientFileUI';

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

  // Subscribe live to Firestore branchTargets
  const [branchTarget, setBranchTarget] = useState({
    monthlyTarget: 1200000,
    targetReached: 980000,
    branchName: currentBranch || 'KPHB Branch'
  });

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

          const activeBranchKey = (currentBranch || 'KPHB Branch').toLowerCase().replace(/ branch$/i, '').trim();
          const targetData = liveMap[activeBranchKey] || liveMap[`${activeBranchKey} branch`] || liveMap['kphb'] || Object.values(liveMap)[0];

          if (targetData) {
            setBranchTarget({
              monthlyTarget: Number(targetData.monthlyTarget) || 1200000,
              targetReached: Number(targetData.targetReached) || 980000,
              branchName: targetData.branchName || currentBranch || 'KPHB Branch'
            });
          }
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
      setRescheduleModalApp(null);
    } catch (err) {
      console.error('Error saving rescheduled appointment:', err);
    } finally {
      setActionLoadingId(null);
    }
  };

  // Toggle Payment Status (Paid / Pending)
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
      try {
        await deleteDoc(doc(db, 'appointments', appId));
      } catch (e) { }
      try {
        await deleteDoc(doc(db, 'allpatients', appId));
      } catch (e) { }
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
    return st === 'scheduled' || st === 'confirmed' || st === 'waiting' || st === 'pending' || st === 'upcoming' || (st !== 'in-consultation' && st !== 'active' && st !== 'completed' && st !== 'done' && st !== 'cancelled');
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
    return st === 'in-consultation' || st === 'active' || st === 'consulting' || st === 'in_consultation';
  });

  const completedList = filteredBranchDateAppointments.filter(a => {
    const st = (a.status || '').toLowerCase().trim();
    return st === 'completed' || st === 'concluded' || st === 'finished' || st === 'done';
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
                <th style={{ padding: '12px 8px' }}>DATE & TIME</th>
                <th style={{ padding: '12px 8px' }}>MODE / DISEASE</th>
                <th style={{ padding: '12px 8px' }}>PAYMENT & CHECKOUT</th>
                <th style={{ padding: '12px 8px' }}>STATUS</th>
                <th style={{ padding: '12px 8px', textAlign: 'right' }}>ACTION</th>
              </tr>
            </thead>
            <tbody>
              {currentTabAppointments.map((app, index) => {
                const isLoading = actionLoadingId === app.id;
                const status = (app.status || 'scheduled').toLowerCase();

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
                const isPaid = app.paymentStatus === 'paid';
                const isMenuOpen = activeMenuId === app.id;

                return (
                  <tr key={app.id} style={{ borderBottom: '1px solid #f8fafc' }}>
                    <td style={{ padding: '12px 8px' }}>
                      <div
                        onClick={() => setPatientFileApp(app)}
                        style={{ fontWeight: 800, color: '#258ec8', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                        title="Click to view Patient File & Clinical History"
                      >
                        <span>{app.patientName || app.name || 'Unnamed Patient'}</span>
                        <span style={{ fontSize: '10px', background: '#e0f2fe', color: '#0284c7', padding: '1px 6px', borderRadius: '4px', fontWeight: 800 }}>
                          📄 File
                        </span>
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
                      <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>{app.branch || 'Main Branch'}</div>
                    </td>
                    <td style={{ padding: '12px 8px' }}>
                      <div style={{ fontWeight: 700, color: '#0284c7' }}>{app.appointmentTime || app.time || '10:00 AM'}</div>
                      <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>{app.appointmentDate || 'Today'}</div>
                    </td>
                    <td style={{ padding: '12px 8px' }}>
                      <span style={{
                        background: app.consultationMode === 'video' ? '#f0f9ff' : '#f8fafc',
                        color: app.consultationMode === 'video' ? '#0284c7' : '#475569',
                        padding: '2px 8px',
                        borderRadius: '6px',
                        fontSize: '11px',
                        fontWeight: 700,
                        display: 'inline-block',
                        marginBottom: '2px'
                      }}>
                        {app.consultationMode === 'video' ? '📹 Video' : '🏥 In-Person'}
                      </span>
                      {app.diseases && (
                        <div style={{ fontSize: '11px', color: '#64748b' }}>{app.diseases}</div>
                      )}
                    </td>

                    {/* Payment Status & Checkout Toggle (Visible in ALL Tabs) */}
                    <td style={{ padding: '12px 8px' }}>
                      <button
                        type="button"
                        disabled={isLoading}
                        onClick={() => handleTogglePaymentStatus(app.id, isPaid ? 'paid' : 'pending')}
                        style={{
                          background: isPaid ? '#dcfce7' : '#fef2f2',
                          color: isPaid ? '#15803d' : '#ef4444',
                          border: `1px solid ${isPaid ? '#bbf7d0' : '#fecaca'}`,
                          borderRadius: '6px',
                          padding: '3px 8px',
                          fontSize: '10.5px',
                          fontWeight: 800,
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}
                      >
                        <CreditCard size={11} /> {isPaid ? 'Paid ✓' : 'Mark Paid'}
                      </button>
                      <button
                        type="button"
                        disabled={isLoading}
                        onClick={() => handleOpenCheckout(app)}
                        style={{
                          background: '#258ec8',
                          color: '#ffffff',
                          border: 'none',
                          borderRadius: '6px',
                          padding: '3px 8px',
                          fontSize: '10.5px',
                          fontWeight: 800,
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          marginLeft: '6px'
                        }}
                      >
                        💳 Checkout
                      </button>
                    </td>

                    <td style={{ padding: '12px 8px' }}>
                      {status === 'completed' || status === 'done' || status === 'finished' || activeTab === 'completed' ? (
                        <span style={{ background: '#dcfce7', color: '#15803d', padding: '4px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: 800 }}>
                          ✓ Completed
                        </span>
                      ) : status === 'in-consultation' || status === 'active' || status === 'in_consultation' ? (
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
                          ⚡ In Consultation (View File)
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
                            onClick={() => handleUpdateStatus(app.id, 'completed')}
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
                              boxShadow: '0 2px 6px rgba(22, 163, 74, 0.2)'
                            }}
                          >
                            <CheckCircle2 size={12} /> Complete Visit
                          </button>
                        )}

                        {activeTab === 'completed' && (
                          <span style={{ fontSize: '11px', color: '#16a34a', fontWeight: 700, marginRight: '4px' }}>
                            Finished
                          </span>
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

                              <div style={{ height: '1px', backgroundColor: '#f1f5f9', margin: '3px 0' }} />

                              {/* 4. Delete Option */}
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

      {/* PAYMENT COLLECTION & CHECKOUT MODAL */}
      {checkoutModalApp && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.55)',
          backdropFilter: 'blur(4px)',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <div style={{
            width: '90%',
            maxWidth: '640px',
            backgroundColor: '#ffffff',
            borderRadius: '16px',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column'
          }}>
            <div style={{ padding: '18px 24px', backgroundColor: '#0f172a', color: '#ffffff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800 }}>
                  Billing Checkout & Fee Collection
                </h3>
                <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '2px' }}>
                  Patient: <strong>{checkoutModalApp.patientName || checkoutModalApp.name}</strong> (+91 {checkoutModalApp.phone || 'N/A'})
                </div>
              </div>
              <button onClick={() => setCheckoutModalApp(null)} style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <h4 style={{ margin: 0, fontSize: '13px', fontWeight: 800, color: '#258ec8' }}>ITEMIZED BILLING BREAKDOWN</h4>

              <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '10px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '12.5px', color: '#475569', fontWeight: 600 }}>Consultation Fee:</span>
                  <input type="number" value={consultFeeInput} onChange={e => setConsultFeeInput(Number(e.target.value))} style={{ width: '120px', padding: '5px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px', textAlign: 'right', fontWeight: 700 }} />
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '12.5px', color: '#475569', fontWeight: 600 }}>Prescribed Medicines:</span>
                  <input type="number" value={medicineFeeInput} onChange={e => setMedicineFeeInput(Number(e.target.value))} style={{ width: '120px', padding: '5px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px', textAlign: 'right', fontWeight: 700 }} />
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '12.5px', color: '#475569', fontWeight: 600 }}>Diet / Nutrition Plan:</span>
                  <input type="number" value={dietFeeInput} onChange={e => setDietFeeInput(Number(e.target.value))} style={{ width: '120px', padding: '5px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px', textAlign: 'right', fontWeight: 700 }} />
                </div>

                {/* Point 7: Separate Line Items for Other Charges & Discount */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '12.5px', color: '#475569', fontWeight: 600 }}>Other Charges:</span>
                  <input type="number" value={otherChargesInput} onChange={e => setOtherChargesInput(Number(e.target.value))} style={{ width: '120px', padding: '5px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px', textAlign: 'right', fontWeight: 700 }} />
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '12.5px', color: '#ef4444', fontWeight: 600 }}>Discount (- ₹):</span>
                  <input type="number" value={discountInput} onChange={e => setDiscountInput(Number(e.target.value))} style={{ width: '120px', padding: '5px 8px', borderRadius: '6px', border: '1px solid #fecaca', fontSize: '12px', textAlign: 'right', fontWeight: 700, color: '#ef4444' }} />
                </div>

                <div style={{ borderTop: '2px solid #cbd5e1', paddingTop: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '14px', fontWeight: 800, color: '#0f172a' }}>TOTAL AMOUNT DUE:</span>
                  <span style={{ fontSize: '18px', fontWeight: 800, color: '#16a34a' }}>
                    ₹ {Math.max(0, consultFeeInput + medicineFeeInput + dietFeeInput + otherChargesInput - discountInput).toLocaleString('en-IN')}
                  </span>
                </div>
              </div>

              {/* Payment Mode Selection */}
              <div>
                <label style={{ fontSize: '12px', fontWeight: 800, color: '#0f172a', display: 'block', marginBottom: '8px' }}>Select Payment Method</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                  {['Cash', 'UPI / QR Code', 'Card', 'Split', 'Send Pay Link', 'Pay Later'].map((mode) => (
                    <button
                      key={mode}
                      onClick={() => setSelectedPaymentMode(mode)}
                      style={{
                        padding: '8px',
                        borderRadius: '8px',
                        border: selectedPaymentMode === mode ? '2px solid #258ec8' : '1px solid #cbd5e1',
                        background: selectedPaymentMode === mode ? '#f0f9ff' : '#ffffff',
                        color: selectedPaymentMode === mode ? '#258ec8' : '#475569',
                        fontWeight: 800,
                        fontSize: '11.5px',
                        cursor: 'pointer'
                      }}
                    >
                      {mode}
                    </button>
                  ))}
                </div>
              </div>

              {selectedPaymentMode === 'Split' && (
                <div style={{ display: 'flex', gap: '12px', background: '#f0f9ff', padding: '12px', borderRadius: '8px', border: '1px solid #bae6fd' }}>
                  <div>
                    <label style={{ fontSize: '11px', fontWeight: 700, color: '#0369a1' }}>Cash Portion (₹)</label>
                    <input type="number" value={splitCash} onChange={e => setSplitCash(Number(e.target.value))} style={{ width: '100%', padding: '6px', borderRadius: '6px', border: '1px solid #7dd3fc', fontSize: '12px' }} />
                  </div>
                  <div>
                    <label style={{ fontSize: '11px', fontWeight: 700, color: '#0369a1' }}>UPI Portion (₹)</label>
                    <input type="number" value={splitUpi} onChange={e => setSplitUpi(Number(e.target.value))} style={{ width: '100%', padding: '6px', borderRadius: '6px', border: '1px solid #7dd3fc', fontSize: '12px' }} />
                  </div>
                </div>
              )}
            </div>

            <div style={{ padding: '16px 24px', backgroundColor: '#f8fafc', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <button onClick={() => setCheckoutModalApp(null)} style={{ padding: '9px 16px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#fff', color: '#475569', fontWeight: 700, cursor: 'pointer' }}>
                Cancel
              </button>
              <button
                onClick={handleConfirmCheckout}
                style={{ padding: '10px 20px', borderRadius: '8px', border: 'none', background: '#16a34a', color: '#fff', fontWeight: 800, fontSize: '13px', cursor: 'pointer', boxShadow: '0 4px 12px rgba(22, 163, 74, 0.25)' }}
              >
                Confirm Payment & Generate Invoice ✓
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PRINTABLE DIGITAL INVOICE RECEIPT MODAL WITH DOCTOR SIGNATURE */}
      {invoiceApp && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.65)',
          backdropFilter: 'blur(4px)',
          zIndex: 10000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px'
        }}>
          <div style={{
            width: '100%',
            maxWidth: '680px',
            backgroundColor: '#ffffff',
            borderRadius: '16px',
            padding: '32px',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            maxHeight: '90vh',
            overflowY: 'auto',
            fontFamily: 'Inter, sans-serif'
          }}>
            {/* Hospital Branding Header */}
            <div style={{ borderBottom: '2px solid #258ec8', paddingBottom: '16px', marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <h2 style={{ margin: 0, color: '#258ec8', fontSize: '22px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  SPIRITUAL HOMEOPATHY
                </h2>
                <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
                  {invoiceApp.branch || currentBranch || 'KPHB Branch'}, Hyderabad • Contact: +91 81252 60176
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{ background: '#dcfce7', color: '#15803d', fontSize: '11px', fontWeight: 800, padding: '4px 10px', borderRadius: '12px' }}>
                  PAID RECEIPT ✓
                </span>
                <div style={{ fontSize: '11px', color: '#64748b', marginTop: '6px' }}>
                  Invoice #: <strong>INV-{String(invoiceApp.id).substring(0, 6).toUpperCase()}</strong>
                </div>
              </div>
            </div>

            {/* Patient & Doctor Metadata */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px', background: '#f8fafc', padding: '14px', borderRadius: '10px' }}>
              <div>
                <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748b' }}>PATIENT DETAILS</div>
                <div style={{ fontSize: '14px', fontWeight: 800, color: '#0f172a', marginTop: '2px' }}>{invoiceApp.patientName || invoiceApp.name}</div>
                <div style={{ fontSize: '12px', color: '#475569' }}>Phone: +91 {invoiceApp.phone || 'N/A'}</div>
              </div>
              <div>
                <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748b' }}>CONSULTING DOCTOR</div>
                <div style={{ fontSize: '14px', fontWeight: 800, color: '#0f172a', marginTop: '2px' }}>{invoiceApp.doctorName || 'Dr. Prashanth K Vaidya'}</div>
                <div style={{ fontSize: '12px', color: '#475569' }}>Date: {new Date().toLocaleDateString('en-IN')}</div>
              </div>
            </div>

            {/* Itemized Table Breakdown */}
            <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '20px', fontSize: '13px' }}>
              <thead>
                <tr style={{ background: '#f1f5f9', color: '#334155', textAlign: 'left' }}>
                  <th style={{ padding: '10px' }}>Description</th>
                  <th style={{ padding: '10px', textAlign: 'right' }}>Amount (₹)</th>
                </tr>
              </thead>
              <tbody>
                <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '10px' }}>Doctor Consultation Fee</td>
                  <td style={{ padding: '10px', textAlign: 'right', fontWeight: 700 }}>₹ {invoiceApp.consultationFee || 500}</td>
                </tr>
                <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '10px' }}>Prescribed Remedies / Medicines</td>
                  <td style={{ padding: '10px', textAlign: 'right', fontWeight: 700 }}>₹ {invoiceApp.medicineFee || 1200}</td>
                </tr>
                <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '10px' }}>Diet & Nutrition Counseling</td>
                  <td style={{ padding: '10px', textAlign: 'right', fontWeight: 700 }}>₹ {invoiceApp.dietFee || 0}</td>
                </tr>
                {/* Point 7: Separate Line Items */}
                <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '10px' }}>Other Charges</td>
                  <td style={{ padding: '10px', textAlign: 'right', fontWeight: 700 }}>₹ {invoiceApp.otherCharges || 0}</td>
                </tr>
                <tr style={{ borderBottom: '1px solid #f1f5f9', color: '#ef4444' }}>
                  <td style={{ padding: '10px' }}>Discount Applied</td>
                  <td style={{ padding: '10px', textAlign: 'right', fontWeight: 700 }}>- ₹ {invoiceApp.discount || 0}</td>
                </tr>
                <tr style={{ background: '#f8fafc', fontWeight: 800 }}>
                  <td style={{ padding: '12px', fontSize: '14px', color: '#0f172a' }}>TOTAL AMOUNT PAID ({invoiceApp.paymentMode || 'Cash'}):</td>
                  <td style={{ padding: '12px', textAlign: 'right', fontSize: '16px', color: '#16a34a' }}>₹ {invoiceApp.totalPaid || 0}</td>
                </tr>
              </tbody>
            </table>

            {/* Point 8: Doctor Digital Signature Block */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: '30px', paddingTop: '20px', borderTop: '1px dashed #cbd5e1' }}>
              <div>
                <div style={{ fontSize: '11px', color: '#94a3b8' }}>Thank you for choosing Spiritual Homeopathy.</div>
                <div style={{ fontSize: '11px', color: '#94a3b8' }}>This is a computer-generated digital invoice.</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontFamily: 'Georgia, serif', fontStyle: 'italic', fontSize: '16px', color: '#0f172a', fontWeight: 700, marginBottom: '4px' }}>
                  {invoiceApp.doctorName || 'Dr. Prashanth K Vaidya'}
                </div>
                <div style={{ borderTop: '1px solid #0f172a', width: '180px', margin: '0 auto', paddingTop: '4px', fontSize: '11px', fontWeight: 800, color: '#475569' }}>
                  DOCTOR AUTHORIZED SIGNATURE
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '24px' }}>
              <button onClick={() => setInvoiceApp(null)} style={{ padding: '10px 18px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#fff', color: '#475569', fontWeight: 700, cursor: 'pointer' }}>
                Close
              </button>
              <button onClick={() => window.print()} style={{ padding: '10px 24px', borderRadius: '8px', border: 'none', background: '#258ec8', color: '#fff', fontWeight: 800, cursor: 'pointer', boxShadow: '0 4px 12px rgba(37, 142, 200, 0.3)' }}>
                🖨️ Print Invoice / PDF
              </button>
            </div>
          </div>
        </div>
      )}

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

