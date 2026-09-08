import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, setDoc, doc, deleteDoc } from 'firebase/firestore';
import { db } from '@app/shared';
import {
  Building2, Users, DollarSign, Clock, TrendingUp, AlertCircle, ShieldAlert,
  UserCheck, Package, Pill, Search, Plus, Edit, Trash2, CheckCircle2, Target, Calendar,
  PieChart, Award, FileText, ChevronRight, ChevronLeft, Image, Phone, X
} from 'lucide-react';
import { ManageBannersPage } from './ManageBanners/ManageBannersPage';
import { PackageMembersPage } from './PackageMembers/PackageMembersPage';
import { PendingPaymentsPage } from './PendingPayments/PendingPaymentsPage';
import { DoctorTimingsPage } from './DoctorTimings/DoctorTimingsPage';
import { ManageBranchesPage } from './ManageBranches/ManageBranchesPage';

interface AdminDashboardPageProps {
  currentBranch?: string;
}

export const AdminDashboardPage: React.FC<AdminDashboardPageProps> = ({ currentBranch = "All Branches" }) => {
  const getTabFromUrl = () => {
    const path = window.location.pathname.toLowerCase().replace(/^\//, '');
    if (path === 'managebanner' || path === 'managebanners' || path === 'banners') return 'banners';
    if (path === 'packagemembers' || path === 'packages') return 'package_members';
    if (path === 'globalpatients' || path === 'patients') return 'patients';
    if (path === 'revenue' || path === 'finance') return 'finance';
    if (path === 'pendingpayments' || path === 'pending') return 'pending_payments';
    if (path === 'branches' || path === 'targets') return 'branches';
    if (path === 'doctortimings' || path === 'doctors') return 'doctors';
    if (path === 'staffmanagement' || path === 'staff') return 'staff';
    if (path === 'medicines' || path === 'inventory') return 'medicines';
    return 'overview';
  };

  const [activeTab, setActiveTab] = useState<
    'overview' | 'package_members' | 'patients' | 'banners' | 'finance' | 'pending_payments' | 'branches' | 'doctors' | 'staff' | 'medicines'
  >(getTabFromUrl);

  const [isNavCollapsed, setIsNavCollapsed] = useState(false);

  const handleTabChange = (tabId: any) => {
    setActiveTab(tabId);
    let targetPath = '/dashboard';
    switch (tabId) {
      case 'overview': targetPath = '/dashboard'; break;
      case 'banners': targetPath = '/managebanner'; break;
      case 'package_members': targetPath = '/packagemembers'; break;
      case 'patients': targetPath = '/globalpatients'; break;
      case 'finance': targetPath = '/revenue'; break;
      case 'pending_payments': targetPath = '/pendingpayments'; break;
      case 'branches': targetPath = '/branches'; break;
      case 'doctors': targetPath = '/doctortimings'; break;
      case 'staff': targetPath = '/staffmanagement'; break;
      case 'medicines': targetPath = '/medicines'; break;
      default: targetPath = '/dashboard'; break;
    }
    if (window.location.pathname !== targetPath) {
      window.history.pushState({}, '', targetPath);
    }
  };

  React.useEffect(() => {
    const handlePopState = () => {
      setActiveTab(getTabFromUrl());
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Staff Sub-Category Selector State (Staff, Reception, Doctors)
  const [staffCategory, setStaffCategory] = useState<'staff' | 'reception' | 'doctors'>('staff');

  const parseTimeToMinutes = (timeStr: string) => {
    if (!timeStr) return 0;
    const parts = timeStr.trim().split(' ');
    const timePart = parts[0] || '00:00';
    const ampm = (parts[1] || 'AM').toUpperCase();
    let [hStr, mStr] = timePart.split(':');
    let h = parseInt(hStr, 10) || 0;
    let m = parseInt(mStr, 10) || 0;
    if (ampm === 'PM' && h < 12) h += 12;
    if (ampm === 'AM' && h === 12) h = 0;
    return h * 60 + m;
  };

  const calculateDailyHoursFromSlots = (slots: Array<{ loginTime: string; logoutTime: string }>) => {
    let totalMinutes = 0;
    for (const slot of slots) {
      const startMins = parseTimeToMinutes(slot.loginTime);
      let endMins = parseTimeToMinutes(slot.logoutTime);
      if (endMins < startMins) {
        endMins += 24 * 60;
      }
      const diff = endMins - startMins;
      if (diff > 0) {
        totalMinutes += diff;
      }
    }
    const hours = Math.floor(totalMinutes / 60);
    const mins = totalMinutes % 60;
    if (mins === 0) {
      return `${hours} hrs/day`;
    }
    const dec = (mins / 60).toFixed(1).replace('0.', '');
    return `${hours}.${dec} hrs/day`;
  };

  const DEFAULT_STAFF_SEED = [
    { id: '1', name: 'Anil Kumar M', role: 'Regular Staff', branch: 'KPHB', mobile: '9030176176', shiftType: 'Single Strict', loginTime: '10:00 AM', logoutTime: '08:30 PM', shift: '10:00 AM - 08:30 PM', hours: '10.5 hrs/day', salary: '₹22,000' },
    { id: '2', name: 'Ashwini Begari', role: 'Regular Staff', branch: 'Chandanagar', mobile: '9553176176', shiftType: 'Single Strict', loginTime: '10:00 AM', logoutTime: '06:30 PM', shift: '10:00 AM - 06:30 PM', hours: '8.5 hrs/day', salary: '₹17,000' },
    { id: '3', name: 'Vaishnavi Peri', role: 'Regular Staff', branch: 'Nallagandla', mobile: '9132176176', shiftType: 'Single Strict', loginTime: '09:30 AM', logoutTime: '07:00 PM', shift: '09:30 AM - 07:00 PM', hours: '9.5 hrs/day', salary: '₹17,000' },
    { id: '4', name: 'Nandini Gottelli', role: 'Regular Staff', branch: 'Dilshuknagar', mobile: '9804176176', shiftType: 'Multi Strict', loginTime: '10:00 AM', logoutTime: '08:30 PM', shift: '10:00 AM - 02:00 PM | 04:30 PM - 08:30 PM', hours: '8 hrs/day', salary: '₹15,000' },
    { id: '5', name: 'Srikanth', role: 'Regular Staff', branch: 'KPHB', mobile: '9030176176', shiftType: 'Single Strict', loginTime: '10:00 AM', logoutTime: '08:00 PM', shift: '10:00 AM - 08:00 PM', hours: '10 hrs/day', salary: '₹18,000' },
    { id: '6', name: 'Arun Kumar', role: 'Regular Staff', branch: 'Nallagandla', mobile: '9132176176', shiftType: 'Single Strict', loginTime: '10:00 AM', logoutTime: '06:00 PM', shift: '10:00 AM - 06:00 PM', hours: '8 hrs/day', salary: '₹14,000' },
  ];

  // Staff Members State & Add/Edit Modal
  const [staffMembers, setStaffMembers] = useState(DEFAULT_STAFF_SEED);

  useEffect(() => {
    if (!db) return;
    const staffColRef = collection(db, 'staff');

    const unsubscribe = onSnapshot(staffColRef, async (snapshot) => {
      if (snapshot.empty) {
        for (const item of DEFAULT_STAFF_SEED) {
          try {
            await setDoc(doc(db, 'staff', item.id), item);
          } catch (e) {
            console.warn('Seed staff error:', e);
          }
        }
      } else {
        const loadedStaff = snapshot.docs.map(docSnap => ({
          id: docSnap.id,
          ...docSnap.data()
        })) as typeof DEFAULT_STAFF_SEED;
        setStaffMembers(loadedStaff);
      }
    }, (error) => {
      console.warn('Firestore staff listener error:', error);
    });

    return () => unsubscribe();
  }, []);

  const [showAddStaffModal, setShowAddStaffModal] = useState(false);
  const [editingStaffId, setEditingStaffId] = useState<string | null>(null);

  const hoursList = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'];
  const minutesList = ['00', '05', '10', '15', '20', '25', '30', '35', '40', '45', '50', '55'];

  const parseTimeComponents = (timeStr: string) => {
    if (!timeStr) return { hour: '09', minute: '00', ampm: 'AM' };
    const parts = timeStr.trim().split(' ');
    const timePart = parts[0] || '09:00';
    const ampm = (parts[1] || 'AM').toUpperCase();
    let [hStr, mStr] = timePart.split(':');
    let h = parseInt(hStr, 10);
    if (isNaN(h)) h = 9;
    if (h > 12) h = h % 12;
    if (h === 0) h = 12;
    const hour = h < 10 ? `0${h}` : `${h}`;
    const minute = mStr ? (mStr.length === 1 ? `0${mStr}` : mStr) : '00';
    return { hour, minute, ampm: ampm === 'PM' ? 'PM' : 'AM' };
  };

  const handleSlotTimeComponentChange = (
    index: number,
    slotField: 'loginTime' | 'logoutTime',
    component: 'hour' | 'minute' | 'ampm',
    value: string
  ) => {
    setStaffFormSlots(prev => prev.map((slot, i) => {
      if (i !== index) return slot;
      const comp = parseTimeComponents(slot[slotField]);
      comp[component] = value;
      return { ...slot, [slotField]: `${comp.hour}:${comp.minute} ${comp.ampm}` };
    }));
  };

  const [staffFormRole, setStaffFormRole] = useState('Regular Staff');
  const [staffFormName, setStaffFormName] = useState('');
  const [staffFormMobile, setStaffFormMobile] = useState('');
  const [staffFormBranch, setStaffFormBranch] = useState('');
  const [staffFormSalary, setStaffFormSalary] = useState('');
  const [staffFormShiftType, setStaffFormShiftType] = useState<'Single Strict' | 'Multi Strict'>('Single Strict');
  const [staffFormSlots, setStaffFormSlots] = useState<Array<{ loginTime: string; logoutTime: string }>>([
    { loginTime: '09:00 AM', logoutTime: '06:00 PM' }
  ]);

  const handleOpenAddStaffModal = () => {
    setEditingStaffId(null);
    setStaffFormRole('Regular Staff');
    setStaffFormName('');
    setStaffFormMobile('');
    setStaffFormBranch('');
    setStaffFormSalary('');
    setStaffFormShiftType('Single Strict');
    setStaffFormSlots([{ loginTime: '09:00 AM', logoutTime: '06:00 PM' }]);
    setShowAddStaffModal(true);
  };

  const handleOpenEditStaffModal = (s: typeof staffMembers[0]) => {
    setEditingStaffId(s.id);
    setStaffFormRole(s.role || 'Regular Staff');
    setStaffFormName(s.name);
    setStaffFormMobile(s.mobile || '');
    setStaffFormBranch(s.branch);
    setStaffFormSalary(s.salary ? s.salary.replace(/[^0-9]/g, '') : '');
    const currentShiftType = (s.shiftType as any) || 'Single Strict';
    setStaffFormShiftType(currentShiftType);

    const parsedSlots = s.shift ? s.shift.split('|').map(str => {
      const parts = str.trim().split('-');
      return {
        loginTime: parts[0] ? parts[0].trim() : '09:00 AM',
        logoutTime: parts[1] ? parts[1].trim() : '06:00 PM'
      };
    }) : [{ loginTime: '09:00 AM', logoutTime: '06:00 PM' }];

    setStaffFormSlots(parsedSlots);
    setShowAddStaffModal(true);
  };

  const handleSaveStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!staffFormName || !staffFormBranch) {
      alert('Please enter Full Name and select a Branch.');
      return;
    }
    const formattedSalary = staffFormSalary ? `₹${parseInt(staffFormSalary).toLocaleString('en-IN')}` : '₹0';
    const shiftText = staffFormSlots.map(slot => `${slot.loginTime} - ${slot.logoutTime}`).join(' | ');
    const calculatedHours = calculateDailyHoursFromSlots(staffFormSlots);

    const staffDataToSave = {
      name: staffFormName,
      role: staffFormRole,
      branch: staffFormBranch,
      mobile: staffFormMobile,
      salary: formattedSalary,
      shiftType: staffFormShiftType,
      loginTime: staffFormSlots[0]?.loginTime || '09:00 AM',
      logoutTime: staffFormSlots[0]?.logoutTime || '06:00 PM',
      shift: shiftText,
      hours: calculatedHours
    };

    if (editingStaffId) {
      setStaffMembers(prev => prev.map(s => s.id === editingStaffId ? { id: editingStaffId, ...staffDataToSave } : s));
      if (db) {
        try {
          await setDoc(doc(db, 'staff', editingStaffId), staffDataToSave, { merge: true });
        } catch (err) {
          console.warn('Firestore update staff error:', err);
        }
      }
    } else {
      const newId = Date.now().toString();
      const newStaff = { id: newId, ...staffDataToSave };
      setStaffMembers(prev => [newStaff, ...prev]);
      if (db) {
        try {
          await setDoc(doc(db, 'staff', newId), newStaff);
        } catch (err) {
          console.warn('Firestore add staff error:', err);
        }
      }
    }
    setShowAddStaffModal(false);
  };

  const handleDeleteStaff = async (id: string, name: string) => {
    if (confirm(`Are you sure you want to delete staff member "${name}"?`)) {
      setStaffMembers(prev => prev.filter(s => s.id !== id));
      if (db) {
        try {
          await deleteDoc(doc(db, 'staff', id));
        } catch (err) {
          console.warn('Firestore delete staff error:', err);
        }
      }
    }
  };

  // Doctors State & Add/Edit Doctor Modal
  const DEFAULT_DOCTORS_SEED = [
    { id: 'doc-1', name: 'Dr. Prashanth k vaidya', role: 'Doctor', category: 'Head Doctor', mobile: '8125260176', shiftType: 'Single Strict', loginTime: '-', logoutTime: '-', shift: '-', hours: '-', salary: '-' },
    { id: 'doc-2', name: 'Dr. Jobeadh parveej', role: 'Doctor', category: 'Head Doctor', mobile: '9903119766', shiftType: 'Single Strict', loginTime: '-', logoutTime: '-', shift: '-', hours: '-', salary: '-' },
    { id: 'doc-3', name: 'Dr. Padma priya', role: 'Doctor', category: 'Employee Doctor', mobile: '9490808582', shiftType: 'Single Strict', loginTime: '10:00 AM', logoutTime: '08:00 PM', shift: '10:00 AM - 08:00 PM', hours: '10 hrs/day', salary: '₹95,000' },
    { id: 'doc-4', name: 'Dr. Ramakrishna chanduri', role: 'Doctor', category: 'Head Doctor', mobile: '1111111111', shiftType: 'Single Strict', loginTime: '-', logoutTime: '-', shift: '-', hours: '-', salary: '-' },
  ];

  const [doctorsMembers, setDoctorsMembers] = useState(DEFAULT_DOCTORS_SEED);

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
      } else {
        const loadedDocs = snapshot.docs.map(docSnap => {
          const data = docSnap.data();
          const category = data.category || (data.role?.includes('Employee') ? 'Employee Doctor' : 'Head Doctor');
          const isHead = category === 'Head Doctor';
          return {
            id: docSnap.id,
            name: data.name || data.doctorName || 'Doctor',
            role: data.role || 'Doctor',
            category: category,
            mobile: data.mobile || data.phone || '',
            shiftType: isHead ? 'Single Strict' : (data.shiftType || 'Single Strict'),
            loginTime: isHead ? '-' : (data.loginTime || '-'),
            logoutTime: isHead ? '-' : (data.logoutTime || '-'),
            shift: isHead ? '-' : (data.shift || '-'),
            hours: isHead ? '-' : (data.hours || '-'),
            salary: isHead ? '-' : (data.salary || '-')
          };
        });
        setDoctorsMembers(loadedDocs);
      }
    }, (error) => {
      console.warn('Firestore doctors listener error:', error);
    });

    return () => unsubscribe();
  }, []);

  const [showAddDoctorModal, setShowAddDoctorModal] = useState(false);
  const [editingDoctorId, setEditingDoctorId] = useState<string | null>(null);

  const [doctorFormCategory, setDoctorFormCategory] = useState<'Head Doctor' | 'Employee Doctor'>('Head Doctor');
  const [doctorFormName, setDoctorFormName] = useState('');
  const [doctorFormMobile, setDoctorFormMobile] = useState('');
  const [doctorFormSalary, setDoctorFormSalary] = useState('');
  const [doctorFormShiftType, setDoctorFormShiftType] = useState<'Single Strict' | 'Multi Strict'>('Single Strict');
  const [doctorFormSlots, setDoctorFormSlots] = useState<Array<{ loginTime: string; logoutTime: string }>>([
    { loginTime: '09:00 AM', logoutTime: '06:00 PM' }
  ]);

  const handleSlotDoctorTimeChange = (
    index: number,
    slotField: 'loginTime' | 'logoutTime',
    component: 'hour' | 'minute' | 'ampm',
    value: string
  ) => {
    setDoctorFormSlots(prev => prev.map((slot, i) => {
      if (i !== index) return slot;
      const comp = parseTimeComponents(slot[slotField]);
      comp[component] = value;
      return { ...slot, [slotField]: `${comp.hour}:${comp.minute} ${comp.ampm}` };
    }));
  };

  const handleOpenAddDoctorModal = () => {
    setEditingDoctorId(null);
    setDoctorFormCategory('Head Doctor');
    setDoctorFormName('');
    setDoctorFormMobile('');
    setDoctorFormSalary('');
    setDoctorFormShiftType('Single Strict');
    setDoctorFormSlots([{ loginTime: '09:00 AM', logoutTime: '06:00 PM' }]);
    setShowAddDoctorModal(true);
  };

  const handleOpenEditDoctorModal = (d: typeof doctorsMembers[0]) => {
    setEditingDoctorId(d.id);
    setDoctorFormCategory((d.category as any) || (d.role.includes('Employee') ? 'Employee Doctor' : 'Head Doctor'));
    setDoctorFormName(d.name);
    setDoctorFormMobile(d.mobile || '');
    setDoctorFormSalary(d.salary && d.salary !== '-' ? d.salary.replace(/[^0-9]/g, '') : '');
    const currentShiftType = (d.shiftType as any) || 'Single Strict';
    setDoctorFormShiftType(currentShiftType);

    const parsedSlots = d.shift ? d.shift.split('|').map(str => {
      const parts = str.trim().split('-');
      return {
        loginTime: parts[0] ? parts[0].trim() : '09:00 AM',
        logoutTime: parts[1] ? parts[1].trim() : '06:00 PM'
      };
    }) : [{ loginTime: '09:00 AM', logoutTime: '06:00 PM' }];

    setDoctorFormSlots(parsedSlots);
    setShowAddDoctorModal(true);
  };

  const handleSaveDoctor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!doctorFormName) {
      alert('Please enter Doctor Full Name.');
      return;
    }
    const isHeadDoctor = doctorFormCategory === 'Head Doctor';
    const formattedSalary = isHeadDoctor
      ? '-'
      : (doctorFormSalary ? `₹${parseInt(doctorFormSalary).toLocaleString('en-IN')}` : '₹0');

    const shiftText = isHeadDoctor
      ? '-'
      : doctorFormSlots.map(slot => `${slot.loginTime} - ${slot.logoutTime}`).join(' | ');
    const calculatedHours = isHeadDoctor
      ? '-'
      : calculateDailyHoursFromSlots(doctorFormSlots);

    const doctorDataToSave = {
      name: doctorFormName.startsWith('Dr.') ? doctorFormName : `Dr. ${doctorFormName}`,
      role: 'Doctor',
      category: doctorFormCategory,
      mobile: doctorFormMobile,
      salary: formattedSalary,
      shiftType: isHeadDoctor ? 'Single Strict' : doctorFormShiftType,
      loginTime: isHeadDoctor ? '-' : (doctorFormSlots[0]?.loginTime || '09:00 AM'),
      logoutTime: isHeadDoctor ? '-' : (doctorFormSlots[0]?.logoutTime || '06:00 PM'),
      shift: shiftText,
      hours: calculatedHours
    };

    if (editingDoctorId) {
      setDoctorsMembers(prev => prev.map(d => d.id === editingDoctorId ? { id: editingDoctorId, ...doctorDataToSave } : d));
      if (db) {
        try {
          await setDoc(doc(db, 'doctors', editingDoctorId), doctorDataToSave, { merge: true });
        } catch (err) {
          console.warn('Firestore update doctor error:', err);
        }
      }
    } else {
      const newId = `doc-${Date.now()}`;
      const newDoctor = { id: newId, ...doctorDataToSave };
      setDoctorsMembers(prev => [newDoctor, ...prev]);
      if (db) {
        try {
          await setDoc(doc(db, 'doctors', newId), newDoctor);
        } catch (err) {
          console.warn('Firestore add doctor error:', err);
        }
      }
    }
    setShowAddDoctorModal(false);
  };

  const handleDeleteDoctor = async (id: string, name: string) => {
    if (confirm(`Are you sure you want to remove ${name} from doctors list?`)) {
      setDoctorsMembers(prev => prev.filter(d => d.id !== id));
      if (db) {
        try {
          await deleteDoc(doc(db, 'doctors', id));
        } catch (err) {
          console.warn('Firestore delete doctor error:', err);
        }
      }
    }
  };

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBranchFilter, setSelectedBranchFilter] = useState('All');

  // Medicine Edit Form state
  const [remedyName, setRemedyName] = useState('');
  const [remedyPotency, setRemedyPotency] = useState('200C');
  const [remedyCategory, setRemedyCategory] = useState('Chronic');
  const [remedyStock, setRemedyStock] = useState('150');
  const [medicineSavedMsg, setMedicineSavedMsg] = useState(false);

  // Mock Branch Targets Data
  const [branchesList, setBranchesList] = useState([
    { id: 'kphb', name: 'KPHB Branch', phone: '+91 90301 76176', target: '₹12,00,000', achieved: '₹9,80,000', patients: 340, status: 'Active' },
    { id: 'nallagandla', name: 'Nallagandla Branch', phone: '+91 91321 76176', target: '₹10,00,000', achieved: '₹8,40,000', patients: 280, status: 'Active' },
    { id: 'dilshuknagar', name: 'Dilshuknagar Branch', phone: '+91 98041 76176', target: '₹14,00,000', achieved: '₹11,50,000', patients: 410, status: 'Active' },
    { id: 'chandanagar', name: 'Chandanagar Branch', phone: '+91 95531 76176', target: '₹9,00,000', achieved: '₹7,20,000', patients: 220, status: 'Active' },
  ]);

  // Global Patients Sample Data
  const globalPatientsList = [
    { id: 'PAT-101', name: 'Rajesh Kumar', phone: '+91 98490 12345', branch: 'KPHB Branch', package: 'Platinum Annual Wellness', source: 'Instagram', status: 'Active' },
    { id: 'PAT-102', name: 'Sneha Reddy', phone: '+91 91210 67890', branch: 'Nallagandla Branch', package: 'Classical Homeo Care', source: 'Google', status: 'Active' },
    { id: 'PAT-103', name: 'Venkatesh Rao', phone: '+91 94400 45678', branch: 'Dilshuknagar Branch', package: 'Pediatric Care Plan', source: 'Website', status: 'Active' },
    { id: 'PAT-104', name: 'Ananya Sharma', phone: '+91 99887 11223', branch: 'Chandanagar Branch', package: 'Chronic Skin Treatment', source: 'Referral', status: 'Active' },
  ];

  // Doctors & Timings Data
  const doctorsList = [
    { id: 'DOC-1', name: 'Dr. Prashanth k vaidya', phone: '8125260176', role: 'Head Doctor', timings: '10:00 AM - 02:00 PM (KPHB) / 03:00 PM - 08:30 PM (Chandanagar)' },
    { id: 'DOC-2', name: 'Dr. Jobeadh parveej', phone: '9903119766', role: 'Head Doctor', timings: '10:00 AM - 02:00 PM (Nallagandla) / 05:00 PM - 08:30 PM (KPHB)' },
    { id: 'DOC-3', name: 'Dr. Padma priya', phone: '9490808582', role: 'Employee Doctor', timings: '10:00 AM - 08:00 PM (General Consultation)' },
    { id: 'DOC-4', name: 'Dr. Ramakrishna chanduri', phone: '1111111111', role: 'Head Doctor', timings: '10:00 AM - 02:00 PM (Dilshuknagar) / 05:00 PM - 09:00 PM (Nallagandla)' },
  ];

  // Staff Working Hours Data
  const staffList = [
    { id: 'STF-1', name: 'Anil Kumar M', role: 'Regular Staff', branch: 'KPHB', hours: '8.5 Hours/Day', shift: '10:00 AM - 08:30 PM', salary: '₹22,000' },
    { id: 'STF-2', name: 'Ashwini Begari', role: 'Regular Staff', branch: 'Chandanagar', hours: '8.0 Hours/Day', shift: '10:00 AM - 08:00 PM', salary: '₹17,000' },
    { id: 'STF-3', name: 'Vaishnavi Peri', role: 'Regular Staff', branch: 'Nallagandla', hours: '8.5 Hours/Day', shift: '10:00 AM - 08:30 PM', salary: '₹17,000' },
    { id: 'STF-4', name: 'Nandini Gottelli', role: 'Regular Staff', branch: 'Dilshuknagar', hours: '8.5 Hours/Day', shift: '10:00 AM - 08:30 PM', salary: '₹15,000' },
  ];

  const handleSaveMedicine = (e: React.FormEvent) => {
    e.preventDefault();
    if (!remedyName) return;
    setMedicineSavedMsg(true);
    setTimeout(() => setMedicineSavedMsg(false), 3000);
    setRemedyName('');
  };

  const adminMenuItems = [
    { id: 'overview', label: 'Admin Dashboard', icon: PieChart },
    { id: 'package_members', label: 'Package Members', icon: Package },
    { id: 'patients', label: 'Global Patients List', icon: Users },
    { id: 'banners', label: 'Manage Banners', icon: Image },
    { id: 'finance', label: 'Total Revenue & Analytics', icon: DollarSign },
    { id: 'pending_payments', label: 'Pending Payments', icon: AlertCircle },
    { id: 'branches', label: 'Manage Branches & Targets', icon: Building2 },
    { id: 'doctors', label: 'Doctor Timings', icon: Clock },
    { id: 'staff', label: 'Staff Management', icon: UserCheck },
    { id: 'medicines', label: 'Edit Medicine Inventory', icon: Pill },
  ];

  return (
    <div style={{ display: 'flex', minHeight: 'calc(100vh - 67px)', background: '#f8fafc' }}>
      {/* Admin Left Side Navigation matching ReceptionSidebar design */}
      <aside style={{
        width: isNavCollapsed ? '64px' : '200px',
        minWidth: isNavCollapsed ? '64px' : '200px',
        background: '#ffffff',
        borderRight: '1px solid #e2e8f0',
        position: 'fixed',
        top: '67px',
        bottom: 0,
        left: 0,
        padding: isNavCollapsed ? '14px 6px' : '14px 10px',
        display: 'flex',
        flexDirection: 'column',
        gap: '3px',
        overflowY: 'auto',
        overflowX: 'hidden',
        zIndex: 40,
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: isNavCollapsed ? 'center' : 'space-between',
          padding: '0 4px 8px 4px',
          marginBottom: '6px',
          borderBottom: '1px solid #f1f5f9'
        }}>
          {!isNavCollapsed && (
            <h3 style={{ fontSize: '10px !important', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.6px', margin: 0 }}>
              Admin Control Menu
            </h3>
          )}
          <button
            onClick={() => setIsNavCollapsed(!isNavCollapsed)}
            title={isNavCollapsed ? "Expand Sidebar (Open)" : "Collapse Sidebar (Close)"}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '26px',
              height: '26px',
              borderRadius: '6px',
              border: '1px solid #cbd5e1',
              background: '#f8fafc',
              color: '#0284c7',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
            }}
          >
            {isNavCollapsed ? <ChevronRight size={16} color="#0284c7" /> : <ChevronLeft size={16} color="#0284c7" />}
          </button>
        </div>

        {adminMenuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => handleTabChange(item.id as any)}
              title={isNavCollapsed ? item.label : undefined}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: isNavCollapsed ? 'center' : 'space-between',
                width: '100%',
                padding: isNavCollapsed ? '9px 0' : '7px 10px',
                borderRadius: '8px',
                border: isActive ? '1px solid rgba(37, 142, 200, 0.3)' : '1px solid transparent',
                background: isActive ? 'rgba(37, 142, 200, 0.1)' : 'transparent',
                color: isActive ? '#258ec8' : '#475569',
                fontWeight: isActive ? 700 : 500,
                fontSize: '11.5px !important',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                textAlign: 'left'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: isNavCollapsed ? 'center' : 'flex-start' }}>
                <Icon size={16} color={isActive ? '#258ec8' : '#64748b'} />
                {!isNavCollapsed && <span>{item.label}</span>}
              </div>
              {!isNavCollapsed && isActive && <ChevronRight size={13} color="#258ec8" />}
            </button>
          );
        })}
      </aside>

      {/* Main Content Area matching ReceptionLayout */}
      <div style={{
        flex: 1,
        padding: '24px',
        marginLeft: isNavCollapsed ? '64px' : '200px',
        transition: 'margin-left 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        minWidth: 0
      }}>

        {/* TAB 1: OVERVIEW DASHBOARD & ANALYTICS */}
        {activeTab === 'overview' && (
          <div>
            {/* Revenue & Financial Summary Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px', marginBottom: '24px' }}>
              <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '18px', padding: '18px', boxShadow: '0 4px 14px rgba(0,0,0,0.02)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <span style={{ fontSize: '12px !important', fontWeight: 700, color: '#64748b' }}>TOTAL REVENUE</span>
                  <div style={{ background: '#eff6ff', padding: '6px', borderRadius: '10px' }}><DollarSign size={18} color="#258ec8" /></div>
                </div>
                <span style={{ fontSize: '22px !important', fontWeight: 800, color: '#0f172a' }}>₹36,90,000</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '8px', color: '#16a34a', fontSize: '11.5px !important', fontWeight: 700 }}>
                  <TrendingUp size={14} /> +14.2% vs last month
                </div>
              </div>

              <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '18px', padding: '18px', boxShadow: '0 4px 14px rgba(0,0,0,0.02)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <span style={{ fontSize: '12px !important', fontWeight: 700, color: '#64748b' }}>PENDING PAYMENTS</span>
                  <div style={{ background: '#fef2f2', padding: '6px', borderRadius: '10px' }}><AlertCircle size={18} color="#ef4444" /></div>
                </div>
                <span style={{ fontSize: '22px !important', fontWeight: 800, color: '#ef4444' }}>₹1,45,000</span>
                <div style={{ marginTop: '8px', color: '#64748b', fontSize: '11.5px !important' }}>
                  12 Pending Patient Invoices
                </div>
              </div>

              <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '18px', padding: '18px', boxShadow: '0 4px 14px rgba(0,0,0,0.02)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <span style={{ fontSize: '12px !important', fontWeight: 700, color: '#64748b' }}>NUTRITION REVENUE</span>
                  <div style={{ background: '#f0fdf4', padding: '6px', borderRadius: '10px' }}><Pill size={18} color="#16a34a" /></div>
                </div>
                <span style={{ fontSize: '22px !important', fontWeight: 800, color: '#16a34a' }}>₹4,85,000</span>
                <div style={{ marginTop: '8px', color: '#64748b', fontSize: '11.5px !important' }}>
                  Homeopathic Supplements & Wellness
                </div>
              </div>

              <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '18px', padding: '18px', boxShadow: '0 4px 14px rgba(0,0,0,0.02)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <span style={{ fontSize: '12px !important', fontWeight: 700, color: '#64748b' }}>AVERAGE ANALYTICS</span>
                  <div style={{ background: '#faf5ff', padding: '6px', borderRadius: '10px' }}><Target size={18} color="#a855f7" /></div>
                </div>
                <span style={{ fontSize: '22px !important', fontWeight: 800, color: '#a855f7' }}>₹3,200 / Patient</span>
                <div style={{ marginTop: '8px', color: '#64748b', fontSize: '11.5px !important' }}>
                  Average Consultation Ticket Size
                </div>
              </div>
            </div>

            {/* Branch Performance Overview Grid */}
            <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '20px', padding: '20px', marginBottom: '24px' }}>
              <h3 style={{ fontSize: '15px !important', fontWeight: 800, color: '#0f172a', marginBottom: '16px' }}>
                Branch Performance & Monthly Target Achievement
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px' }}>
                {branchesList.map(b => (
                  <div key={b.id} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                      <span style={{ fontSize: '13.5px !important', fontWeight: 800, color: '#0f172a' }}>{b.name}</span>
                      <span style={{ background: '#e0f2fe', color: '#0284c7', padding: '2px 8px', borderRadius: '8px', fontSize: '10.5px !important', fontWeight: 700 }}>
                        {b.status}
                      </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px !important', color: '#64748b', marginBottom: '4px' }}>
                      <span>Target: <b>{b.target}</b></span>
                      <span>Achieved: <b style={{ color: '#16a34a' }}>{b.achieved}</b></span>
                    </div>
                    <div style={{ width: '100%', height: '8px', background: '#e2e8f0', borderRadius: '4px', overflow: 'hidden', margin: '8px 0' }}>
                      <div style={{ width: '82%', height: '100%', background: '#258ec8', borderRadius: '4px' }} />
                    </div>
                    <span style={{ fontSize: '11px !important', color: '#64748b', fontWeight: 600 }}>
                      📞 {b.phone} • {b.patients} Active Patients
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB: PACKAGE MEMBERS */}
        {activeTab === 'package_members' && (
          <PackageMembersPage />
        )}

        {/* TAB: MANAGE BANNERS */}
        {activeTab === 'banners' && (
          <ManageBannersPage />
        )}

        {/* TAB: PENDING PAYMENTS */}
        {activeTab === 'pending_payments' && (
          <PendingPaymentsPage />
        )}

        {/* TAB 2: MANAGE BRANCHES & TARGET MANAGEMENT */}
        {activeTab === 'branches' && (
          <ManageBranchesPage />
        )}

        {/* TAB 3: GLOBAL PATIENTS & PACKAGE MEMBERS */}
        {activeTab === 'patients' && (
          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '20px', padding: '22px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <h2 style={{ fontSize: '16px !important', fontWeight: 800, color: '#0f172a' }}>
                  Global Patients & Package Members Directory
                </h2>
                <p style={{ fontSize: '12px !important', color: '#64748b' }}>
                  Master patient registry, marketing sources, and package memberships.
                </p>
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <div style={{ position: 'relative' }}>
                  <Search size={16} color="#94a3b8" style={{ position: 'absolute', left: '12px', top: '14px' }} />
                  <input
                    type="text"
                    placeholder="Search patient or phone..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    style={{ padding: '8px 12px 8px 36px', border: '1px solid #cbd5e1', borderRadius: '10px', fontSize: '12px !important', outline: 'none' }}
                  />
                </div>
              </div>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                    <th style={{ padding: '12px 14px', fontSize: '12px !important', fontWeight: 800, color: '#475569' }}>PATIENT ID</th>
                    <th style={{ padding: '12px 14px', fontSize: '12px !important', fontWeight: 800, color: '#475569' }}>PATIENT NAME</th>
                    <th style={{ padding: '12px 14px', fontSize: '12px !important', fontWeight: 800, color: '#475569' }}>PHONE</th>
                    <th style={{ padding: '12px 14px', fontSize: '12px !important', fontWeight: 800, color: '#475569' }}>BRANCH</th>
                    <th style={{ padding: '12px 14px', fontSize: '12px !important', fontWeight: 800, color: '#475569' }}>PACKAGE MEMBERSHIP</th>
                    <th style={{ padding: '12px 14px', fontSize: '12px !important', fontWeight: 800, color: '#475569' }}>MARKETING SOURCE</th>
                  </tr>
                </thead>
                <tbody>
                  {globalPatientsList
                    .filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()) || p.phone.includes(searchQuery))
                    .map(p => (
                      <tr key={p.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '12px 14px', fontSize: '12px !important', fontWeight: 800, color: '#258ec8' }}>{p.id}</td>
                        <td style={{ padding: '12px 14px', fontSize: '13px !important', fontWeight: 700, color: '#0f172a' }}>{p.name}</td>
                        <td style={{ padding: '12px 14px', fontSize: '12.5px !important', color: '#334155' }}>{p.phone}</td>
                        <td style={{ padding: '12px 14px', fontSize: '12.5px !important', color: '#334155' }}>{p.branch}</td>
                        <td style={{ padding: '12px 14px', fontSize: '12px !important' }}>
                          <span style={{ background: '#f0fdf4', color: '#16a34a', padding: '3px 8px', borderRadius: '8px', fontWeight: 700 }}>
                            {p.package}
                          </span>
                        </td>
                        <td style={{ padding: '12px 14px', fontSize: '12.5px !important', color: '#64748b' }}>{p.source}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 4: DOCTOR TIMINGS & SCHEDULES */}
        {activeTab === 'doctors' && (
          <DoctorTimingsPage />
        )}

        {/* TAB 5: STAFF MANAGEMENT & WORKING HOURS */}
        {activeTab === 'staff' && (
          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '20px', padding: '22px' }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <h2 style={{ fontSize: '16px !important', fontWeight: 800, color: '#0f172a' }}>
                  Staff Management & Working Hours
                </h2>
                <p style={{ fontSize: '12px !important', color: '#64748b' }}>
                  Select a category below to view and manage working hours, shifts, and compensation.
                </p>
              </div>
            </div>

            {/* 3 SELECTOR BUTTONS FOR CATEGORY SHIFTING & ADD STAFF BUTTON */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
              <div style={{ display: 'flex', gap: '8px', background: '#f1f5f9', padding: '4px', borderRadius: '12px', width: 'fit-content' }}>
                <button
                  onClick={() => setStaffCategory('staff')}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '9px',
                    border: 'none',
                    background: staffCategory === 'staff' ? '#ffffff' : 'transparent',
                    color: staffCategory === 'staff' ? '#258ec8' : '#64748b',
                    fontWeight: staffCategory === 'staff' ? 800 : 600,
                    fontSize: '12.5px !important',
                    cursor: 'pointer',
                    boxShadow: staffCategory === 'staff' ? '0 2px 6px rgba(0,0,0,0.06)' : 'none',
                    transition: 'all 0.2s ease'
                  }}
                >
                  Staff Members
                </button>
                <button
                  onClick={() => setStaffCategory('reception')}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '9px',
                    border: 'none',
                    background: staffCategory === 'reception' ? '#ffffff' : 'transparent',
                    color: staffCategory === 'reception' ? '#258ec8' : '#64748b',
                    fontWeight: staffCategory === 'reception' ? 800 : 600,
                    fontSize: '12.5px !important',
                    cursor: 'pointer',
                    boxShadow: staffCategory === 'reception' ? '0 2px 6px rgba(0,0,0,0.06)' : 'none',
                    transition: 'all 0.2s ease'
                  }}
                >
                  Reception Desk
                </button>
                <button
                  onClick={() => setStaffCategory('doctors')}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '9px',
                    border: 'none',
                    background: staffCategory === 'doctors' ? '#ffffff' : 'transparent',
                    color: staffCategory === 'doctors' ? '#258ec8' : '#64748b',
                    fontWeight: staffCategory === 'doctors' ? 800 : 600,
                    fontSize: '12.5px !important',
                    cursor: 'pointer',
                    boxShadow: staffCategory === 'doctors' ? '0 2px 6px rgba(0,0,0,0.06)' : 'none',
                    transition: 'all 0.2s ease'
                  }}
                >
                  Doctors
                </button>
              </div>

              {staffCategory === 'staff' && (
                <button
                  onClick={handleOpenAddStaffModal}
                  style={{
                    background: '#258ec8',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '10px',
                    padding: '9px 16px',
                    fontSize: '13px !important',
                    fontWeight: 800,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    boxShadow: '0 2px 8px rgba(37, 99, 235, 0.25)',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <Plus size={16} /> Add Staff
                </button>
              )}
              {staffCategory === 'doctors' && (
                <button
                  onClick={handleOpenAddDoctorModal}
                  style={{
                    background: '#258ec8',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '10px',
                    padding: '9px 16px',
                    fontSize: '13px !important',
                    fontWeight: 800,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    boxShadow: '0 2px 8px rgba(139, 92, 246, 0.25)',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <Plus size={16} /> Add Doctor
                </button>
              )}
            </div>

            {/* VIEW 1: STAFF MEMBERS (ALL CLINIC STAFF) */}
            {staffCategory === 'staff' && (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                      <th style={{ padding: '12px 14px', fontSize: '12px !important', fontWeight: 800, color: '#475569' }}>STAFF NAME</th>
                      <th style={{ padding: '12px 14px', fontSize: '12px !important', fontWeight: 800, color: '#475569' }}>ASSIGNED BRANCH</th>
                      <th style={{ padding: '12px 14px', fontSize: '12px !important', fontWeight: 800, color: '#475569' }}>SHIFT HOURS</th>
                      <th style={{ padding: '12px 14px', fontSize: '12px !important', fontWeight: 800, color: '#475569' }}>DAILY HOURS</th>
                      <th style={{ padding: '12px 14px', fontSize: '12px !important', fontWeight: 800, color: '#475569' }}>MONTHLY SALARY</th>
                      <th style={{ padding: '12px 14px', fontSize: '12px !important', fontWeight: 800, color: '#475569', textAlign: 'center' }}>ACTIONS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {staffMembers.map(s => (
                      <tr key={s.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '12px 14px', fontSize: '13px !important', fontWeight: 700, color: '#0f172a' }}>
                          {s.name}
                        </td>
                        <td style={{ padding: '12px 14px', fontSize: '12.5px !important', color: '#258ec8', fontWeight: 600 }}>{s.branch}</td>
                        <td style={{ padding: '12px 14px', fontSize: '12.5px !important', color: '#258ec8', fontWeight: 600 }}>
                          {s.shift && s.shift.includes('|') ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                              {s.shift.split('|').map((slotStr, i) => (
                                <div key={i} style={{ whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                  <span style={{ fontSize: '10px !important', background: '#eff6ff', border: '1px solid #bfdbfe', color: '#1d4ed8', padding: '1px 5px', borderRadius: '4px', fontWeight: 800 }}>Shift {i + 1}</span>
                                  <span>{slotStr.trim()}</span>
                                </div>
                              ))}
                            </div>
                          ) : (
                            s.shift
                          )}
                        </td>
                        <td style={{ padding: '12px 14px', fontSize: '12.5px !important', color: '#16a34a', fontWeight: 700 }}>{s.hours}</td>
                        <td style={{ padding: '12px 14px', fontSize: '13px !important', fontWeight: 800, color: '#0f172a' }}>{s.salary}</td>
                        <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                            <button
                              onClick={() => handleOpenEditStaffModal(s)}
                              title="Edit Staff Member"
                              style={{
                                background: '#eff6ff',
                                border: '1px solid #bfdbfe',
                                borderRadius: '8px',
                                padding: '6px 10px',
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                fontSize: '11.5px !important',
                                fontWeight: 700,
                                color: '#1d4ed8',
                                transition: 'all 0.2s ease'
                              }}
                            >
                              <Edit size={14} color="#1d4ed8" /> Edit
                            </button>
                            <button
                              onClick={() => handleDeleteStaff(s.id, s.name)}
                              title="Delete Staff Member"
                              style={{
                                background: '#fef2f2',
                                border: '1px solid #fecaca',
                                borderRadius: '8px',
                                padding: '6px 10px',
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                fontSize: '11.5px !important',
                                fontWeight: 700,
                                color: '#dc2626',
                                transition: 'all 0.2s ease'
                              }}
                            >
                              <Trash2 size={14} color="#dc2626" /> Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* VIEW 2: RECEPTION DESK (OFFICIAL CLINIC BRANCHES ONLY) */}
            {staffCategory === 'reception' && (
              <div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
                  {[
                    { branch: 'KPHB Branch', phone: '90301 76176', hours: '10:00 AM - 08:30 PM', location: 'Road No 1, KPHB Colony', status: 'ACTIVE BRANCH' },
                    { branch: 'Nallagandla Branch', phone: '91321 76176', hours: '10:00 AM - 08:30 PM', location: 'Main Road, Nallagandla', status: 'ACTIVE BRANCH' },
                    { branch: 'Dilshuknagar Branch', phone: '98041 76176', hours: '10:00 AM - 08:30 PM', location: 'Near Metro Station, Dilshuknagar', status: 'ACTIVE BRANCH' },
                    { branch: 'Chandanagar Branch', phone: '95531 76176', hours: '10:00 AM - 08:00 PM', location: 'HUDA Trade Centre, Chandanagar', status: 'ACTIVE BRANCH' },
                  ].map(b => (
                    <div key={b.branch} style={{ background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '16px', padding: '18px', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <h4 style={{ fontSize: '14px !important', fontWeight: 800, color: '#0f172a' }}>🏢 {b.branch}</h4>
                        <span style={{ background: '#dcfce7', color: '#15803d', fontSize: '10px !important', fontWeight: 800, padding: '3px 8px', borderRadius: '6px' }}>{b.status}</span>
                      </div>
                      <p style={{ fontSize: '12px !important', color: '#64748b', marginBottom: '12px' }}>📍 {b.location}</p>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', paddingTop: '10px', borderTop: '1px solid #f1f5f9' }}>
                        <div style={{ fontSize: '12px !important', color: '#0284c7', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                          <Phone size={13} color="#0284c7" /> Contact: <span style={{ color: '#0f172a', fontWeight: 800 }}>+91 {b.phone}</span>
                        </div>
                        <div style={{ fontSize: '12px !important', color: '#16a34a', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                          <Clock size={13} color="#16a34a" /> Hours: <span style={{ color: '#334155', fontWeight: 600 }}>{b.hours}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* VIEW 3: DOCTORS DIRECTORY */}
            {staffCategory === 'doctors' && (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                      <th style={{ padding: '12px 14px', fontSize: '12px !important', fontWeight: 800, color: '#475569' }}>DOCTOR NAME</th>
                      <th style={{ padding: '12px 14px', fontSize: '12px !important', fontWeight: 800, color: '#475569' }}>DESIGNATION</th>
                      <th style={{ padding: '12px 14px', fontSize: '12px !important', fontWeight: 800, color: '#475569' }}>PHONE NUMBER</th>
                      <th style={{ padding: '12px 14px', fontSize: '12px !important', fontWeight: 800, color: '#475569' }}>SHIFT HOURS</th>
                      <th style={{ padding: '12px 14px', fontSize: '12px !important', fontWeight: 800, color: '#475569' }}>DAILY HOURS</th>
                      <th style={{ padding: '12px 14px', fontSize: '12px !important', fontWeight: 800, color: '#475569' }}>MONTHLY COMPENSATIONS</th>
                      <th style={{ padding: '12px 14px', fontSize: '12px !important', fontWeight: 800, color: '#475569', textAlign: 'center' }}>ACTIONS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {doctorsMembers.map(d => (
                      <tr key={d.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '12px 14px', fontSize: '13px !important', fontWeight: 800, color: '#0f172a' }}>{d.name}</td>
                        <td style={{ padding: '12px 14px', fontSize: '12.5px !important', color: '#6b21a8', fontWeight: 700 }}>
                          <span style={{
                            background: d.category === 'Employee Doctor' ? '#f0fdf4' : '#faf5ff',
                            border: d.category === 'Employee Doctor' ? '1px solid #bbf7d0' : '1px solid #e9d5ff',
                            color: d.category === 'Employee Doctor' ? '#166534' : '#6b21a8',
                            padding: '3px 8px',
                            borderRadius: '6px'
                          }}>
                            {d.category || d.role}
                          </span>
                        </td>
                        <td style={{ padding: '12px 14px', fontSize: '12.5px !important', color: '#334155', fontWeight: 600 }}>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                            <Phone size={14} color="#0284c7" />
                            +91 {d.mobile}
                          </span>
                        </td>
                        <td style={{ padding: '12px 14px', fontSize: '12.5px !important', color: d.category === 'Head Doctor' || d.shift === '-' ? '#64748b' : '#258ec8', fontWeight: 600 }}>
                          {d.category === 'Head Doctor' || d.shift === '-' ? (
                            '-'
                          ) : d.shift && d.shift.includes('|') ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                              {d.shift.split('|').map((slotStr, i) => (
                                <div key={i} style={{ whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                  <span style={{ fontSize: '10px !important', background: '#eff6ff', border: '1px solid #bfdbfe', color: '#1d4ed8', padding: '1px 5px', borderRadius: '4px', fontWeight: 800 }}>Shift {i + 1}</span>
                                  <span>{slotStr.trim()}</span>
                                </div>
                              ))}
                            </div>
                          ) : (
                            d.shift || '-'
                          )}
                        </td>
                        <td style={{ padding: '12px 14px', fontSize: '12.5px !important', color: d.category === 'Head Doctor' || d.hours === '-' ? '#64748b' : '#16a34a', fontWeight: 700 }}>
                          {d.category === 'Head Doctor' || d.hours === '-' ? '-' : d.hours}
                        </td>
                        <td style={{ padding: '12px 14px', fontSize: '13px !important', fontWeight: 800, color: d.category === 'Employee Doctor' && d.salary !== '-' ? '#0f172a' : '#94a3b8' }}>
                          {d.category === 'Head Doctor' || d.salary === '-' ? '-' : d.salary}
                        </td>
                        <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                            <button
                              onClick={() => handleOpenEditDoctorModal(d)}
                              title="Edit Doctor Profile"
                              style={{
                                background: '#eff6ff',
                                border: '1px solid #bfdbfe',
                                borderRadius: '8px',
                                padding: '6px 10px',
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                fontSize: '11.5px !important',
                                fontWeight: 700,
                                color: '#1d4ed8',
                                transition: 'all 0.2s ease'
                              }}
                            >
                              <Edit size={14} color="#1d4ed8" /> Edit
                            </button>
                            <button
                              onClick={() => handleDeleteDoctor(d.id, d.name)}
                              title="Delete Doctor Profile"
                              style={{
                                background: '#fef2f2',
                                border: '1px solid #fecaca',
                                borderRadius: '8px',
                                padding: '6px 10px',
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                fontSize: '11.5px !important',
                                fontWeight: 700,
                                color: '#dc2626',
                                transition: 'all 0.2s ease'
                              }}
                            >
                              <Trash2 size={14} color="#dc2626" /> Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* TAB 6: FINANCE, TOTAL & NUTRITION REVENUE */}
        {activeTab === 'finance' && (
          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '20px', padding: '22px' }}>
            <h2 style={{ fontSize: '16px !important', fontWeight: 800, color: '#0f172a', marginBottom: '4px' }}>
              Revenue & Financial Analytics
            </h2>
            <p style={{ fontSize: '12px !important', color: '#64748b', marginBottom: '20px' }}>
              Breakdown of consultation fees, nutrition revenue, and pending patient balances.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '20px' }}>
                <span style={{ fontSize: '13px !important', fontWeight: 800, color: '#0f172a', display: 'block', marginBottom: '10px' }}>
                  💰 Revenue Stream Breakdown
                </span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12.5px !important' }}>
                    <span>Consultations & Remedies:</span>
                    <b style={{ color: '#258ec8' }}>₹30,60,000</b>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12.5px !important' }}>
                    <span>Nutrition & Supplements:</span>
                    <b style={{ color: '#16a34a' }}>₹4,85,000</b>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12.5px !important' }}>
                    <span>Package Subscriptions:</span>
                    <b style={{ color: '#a855f7' }}>₹1,45,000</b>
                  </div>
                </div>
              </div>

              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '20px' }}>
                <span style={{ fontSize: '13px !important', fontWeight: 800, color: '#0f172a', display: 'block', marginBottom: '10px' }}>
                  ⚠️ Pending Payments Status
                </span>
                <span style={{ fontSize: '20px !important', fontWeight: 800, color: '#ef4444', display: 'block', marginBottom: '6px' }}>
                  ₹1,45,000 Pending
                </span>
                <p style={{ fontSize: '12px !important', color: '#64748b' }}>
                  Outstanding balances across 12 patient invoices scheduled for follow-up.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* TAB 7: EDIT MEDICINE FORM */}
        {activeTab === 'medicines' && (
          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '20px', padding: '24px', maxWidth: '640px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
              <Pill size={22} color="#258ec8" />
              <h2 style={{ fontSize: '16px !important', fontWeight: 800, color: '#0f172a' }}>
                Edit Medicine & Remedy Inventory Form
              </h2>
            </div>

            {medicineSavedMsg && (
              <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#16a34a', padding: '10px 14px', borderRadius: '12px', marginBottom: '16px', fontSize: '12.5px !important', fontWeight: 700 }}>
                ✓ Medicine Details Saved Successfully!
              </div>
            )}

            <form onSubmit={handleSaveMedicine} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12.5px !important', fontWeight: 700, color: '#1e293b', marginBottom: '6px' }}>
                  Medicine / Remedy Name *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Arnica Montana, Nux Vomica"
                  value={remedyName}
                  onChange={e => setRemedyName(e.target.value)}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '13px !important', outline: 'none' }}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12.5px !important', fontWeight: 700, color: '#1e293b', marginBottom: '6px' }}>
                    Potency
                  </label>
                  <select
                    value={remedyPotency}
                    onChange={e => setRemedyPotency(e.target.value)}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '13px !important', outline: 'none', background: '#ffffff' }}
                  >
                    <option value="30C">30C</option>
                    <option value="200C">200C</option>
                    <option value="1M">1M</option>
                    <option value="10M">10M</option>
                    <option value="Q (Mother Tincture)">Q (Mother Tincture)</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12.5px !important', fontWeight: 700, color: '#1e293b', marginBottom: '6px' }}>
                    Category
                  </label>
                  <select
                    value={remedyCategory}
                    onChange={e => setRemedyCategory(e.target.value)}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '13px !important', outline: 'none', background: '#ffffff' }}
                  >
                    <option value="Acute">Acute</option>
                    <option value="Chronic">Chronic</option>
                    <option value="Spiritual">Spiritual</option>
                    <option value="General Wellness">General Wellness</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12.5px !important', fontWeight: 700, color: '#1e293b', marginBottom: '6px' }}>
                  Stock Quantity (Units)
                </label>
                <input
                  type="number"
                  value={remedyStock}
                  onChange={e => setRemedyStock(e.target.value)}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '13px !important', outline: 'none' }}
                />
              </div>

              <button
                type="submit"
                style={{
                  background: '#258ec8',
                  color: '#ffffff',
                  border: 'none',
                  padding: '12px',
                  borderRadius: '12px',
                  fontSize: '13.5px !important',
                  fontWeight: 800,
                  cursor: 'pointer',
                  boxShadow: '0 4px 14px rgba(59, 130, 246, 0.3)',
                  marginTop: '8px'
                }}
              >
                Save Medicine Details
              </button>
            </form>
          </div>
        )}

      </div>

      {/* ADD/EDIT STAFF MODAL */}
      {showAddStaffModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(15, 23, 42, 0.6)',
          backdropFilter: 'blur(4px)',
          zIndex: 1000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px'
        }}>
          <div style={{
            background: '#ffffff',
            borderRadius: '20px',
            maxWidth: '540px',
            width: '100%',
            padding: '24px',
            maxHeight: '90vh',
            overflowY: 'auto',
            boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
            border: '1px solid #cbd5e1'
          }}>
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px', paddingBottom: '12px', borderBottom: '1px solid #f1f5f9' }}>
              <div>
                <h3 style={{ fontSize: '16px !important', fontWeight: 800, color: '#0f172a' }}>
                  {editingStaffId ? '✏️ Edit Staff Member' : '➕ Add Staff Member'}
                </h3>
                <p style={{ fontSize: '11.5px !important', color: '#64748b', marginTop: '2px' }}>
                  Assign staff role, branch location, monthly salary & shift timings.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowAddStaffModal(false)}
                style={{ background: '#f1f5f9', border: 'none', borderRadius: '50%', width: '32px', height: '32px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                <X size={16} color="#64748b" />
              </button>
            </div>

            <form onSubmit={handleSaveStaff} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Assign Staff Role */}
              <div>
                <label style={{ display: 'block', fontSize: '12px !important', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                  Assign Staff Role
                </label>
                <select
                  value={staffFormRole}
                  onChange={e => setStaffFormRole(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '10px',
                    border: '1px solid #cbd5e1',
                    fontSize: '13px !important',
                    fontWeight: 600,
                    color: '#0f172a',
                    background: '#ffffff',
                    outline: 'none'
                  }}
                >
                  <option value="Regular Staff">Regular Staff</option>
                </select>
              </div>

              {/* Full Name */}
              <div>
                <label style={{ display: 'block', fontSize: '12px !important', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                  Full Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. John Doe"
                  value={staffFormName}
                  onChange={e => setStaffFormName(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '10px',
                    border: '1px solid #cbd5e1',
                    fontSize: '13px !important',
                    color: '#0f172a',
                    outline: 'none'
                  }}
                />
              </div>

              {/* Mobile Number (without +91) */}
              <div>
                <label style={{ display: 'block', fontSize: '12px !important', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                  Mobile Number (without +91)
                </label>
                <input
                  type="text"
                  placeholder="without +91 (e.g. 9876543210)"
                  value={staffFormMobile}
                  onChange={e => setStaffFormMobile(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '10px',
                    border: '1px solid #cbd5e1',
                    fontSize: '13px !important',
                    color: '#0f172a',
                    outline: 'none'
                  }}
                />
              </div>

              {/* Assign to Branch */}
              <div>
                <label style={{ display: 'block', fontSize: '12px !important', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                  Assign to Branch
                </label>
                <select
                  value={staffFormBranch}
                  onChange={e => setStaffFormBranch(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '10px',
                    border: '1px solid #cbd5e1',
                    fontSize: '13px !important',
                    fontWeight: 600,
                    color: staffFormBranch ? '#0f172a' : '#94a3b8',
                    background: '#ffffff',
                    outline: 'none'
                  }}
                >
                  <option value="" disabled>Select a Branch</option>
                  <option value="KPHB">KPHB</option>
                  <option value="Nallagandla">Nallagandla</option>
                  <option value="Dilshuknagar">Dilshuknagar</option>
                  <option value="Chandanagar">Chandanagar</option>
                </select>
              </div>

              {/* Salary & Work Schedule Box */}
              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <h4 style={{ fontSize: '13px !important', fontWeight: 800, color: '#1e293b' }}>
                    💼 Salary & Work Schedule
                  </h4>
                  <span style={{ background: '#dcfce7', color: '#15803d', border: '1px solid #bbf7d0', fontSize: '11px !important', fontWeight: 800, padding: '3px 8px', borderRadius: '6px' }}>
                    ⏱️ {calculateDailyHoursFromSlots(staffFormSlots)}
                  </span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  {/* Monthly Base Salary (Rs) */}
                  <div>
                    <label style={{ display: 'block', fontSize: '12px !important', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                      Monthly Base Salary (Rs)
                    </label>
                    <input
                      type="number"
                      placeholder="e.g. 25000"
                      value={staffFormSalary}
                      onChange={e => setStaffFormSalary(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '10px 14px',
                        borderRadius: '10px',
                        border: '1px solid #cbd5e1',
                        fontSize: '13px !important',
                        color: '#0f172a',
                        background: '#ffffff',
                        outline: 'none'
                      }}
                    />
                  </div>

                  {/* Shift Type */}
                  <div>
                    <label style={{ display: 'block', fontSize: '12px !important', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                      Shift Type
                    </label>
                    <div style={{ display: 'flex', gap: '10px' }}>
                      {['Single Strict', 'Multi Strict'].map(type => (
                        <button
                          key={type}
                          type="button"
                          onClick={() => {
                            setStaffFormShiftType(type as any);
                            if (type === 'Multi Strict' && staffFormSlots.length < 2) {
                              setStaffFormSlots([
                                { loginTime: '09:00 AM', logoutTime: '01:00 PM' },
                                { loginTime: '04:00 PM', logoutTime: '08:30 PM' }
                              ]);
                            } else if (type === 'Single Strict' && staffFormSlots.length > 1) {
                              setStaffFormSlots([staffFormSlots[0]]);
                            }
                          }}
                          style={{
                            flex: 1,
                            padding: '9px 12px',
                            borderRadius: '9px',
                            border: staffFormShiftType === type ? '2px solid #2563eb' : '1px solid #cbd5e1',
                            background: staffFormShiftType === type ? '#eff6ff' : '#ffffff',
                            color: staffFormShiftType === type ? '#1d4ed8' : '#64748b',
                            fontWeight: staffFormShiftType === type ? 800 : 600,
                            fontSize: '12.5px !important',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease'
                          }}
                        >
                          {type}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Dynamic Shift Slots (Login Time 1, Logout Time 1, Login Time 2, Logout Time 2...) */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {staffFormSlots.map((slot, idx) => {
                      const loginComp = parseTimeComponents(slot.loginTime);
                      const logoutComp = parseTimeComponents(slot.logoutTime);

                      return (
                        <div key={idx} style={{ background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '12px', padding: '14px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                            <span style={{ fontSize: '12.5px !important', fontWeight: 800, color: '#2563eb' }}>
                              {staffFormShiftType === 'Multi Strict' ? `Shift Slot ${idx + 1}` : 'Shift Hours Schedule'}
                            </span>
                            {staffFormShiftType === 'Multi Strict' && staffFormSlots.length > 1 && (
                              <button
                                type="button"
                                onClick={() => setStaffFormSlots(prev => prev.filter((_, i) => i !== idx))}
                                style={{
                                  background: '#fef2f2',
                                  border: '1px solid #fecaca',
                                  borderRadius: '6px',
                                  padding: '4px 8px',
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  fontSize: '11px !important',
                                  color: '#dc2626',
                                  fontWeight: 700
                                }}
                              >
                                <Trash2 size={12} color="#dc2626" /> Remove
                              </button>
                            )}
                          </div>

                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                            {/* Login Time Selector */}
                            <div>
                              <label style={{ display: 'block', fontSize: '11.5px !important', fontWeight: 700, color: '#475569', marginBottom: '6px' }}>
                                ⏰ Login Time {staffFormShiftType === 'Multi Strict' ? idx + 1 : ''}
                              </label>
                              <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                                <select
                                  value={loginComp.hour}
                                  onChange={e => handleSlotTimeComponentChange(idx, 'loginTime', 'hour', e.target.value)}
                                  style={{ flex: 1, padding: '8px 4px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12.5px !important', fontWeight: 700, color: '#0f172a', background: '#ffffff', textAlign: 'center', outline: 'none' }}
                                >
                                  {hoursList.map(h => <option key={h} value={h}>{h}</option>)}
                                </select>
                                <span style={{ fontWeight: 800, color: '#64748b' }}>:</span>
                                <select
                                  value={loginComp.minute}
                                  onChange={e => handleSlotTimeComponentChange(idx, 'loginTime', 'minute', e.target.value)}
                                  style={{ flex: 1, padding: '8px 4px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12.5px !important', fontWeight: 700, color: '#0f172a', background: '#ffffff', textAlign: 'center', outline: 'none' }}
                                >
                                  {minutesList.map(m => <option key={m} value={m}>{m}</option>)}
                                </select>
                                <select
                                  value={loginComp.ampm}
                                  onChange={e => handleSlotTimeComponentChange(idx, 'loginTime', 'ampm', e.target.value)}
                                  style={{ flex: 1, padding: '8px 4px', borderRadius: '8px', border: '1px solid #258ec8', fontSize: '12.5px !important', fontWeight: 800, color: '#1d4ed8', background: '#eff6ff', textAlign: 'center', outline: 'none' }}
                                >
                                  <option value="AM">AM</option>
                                  <option value="PM">PM</option>
                                </select>
                              </div>
                            </div>

                            {/* Logout Time Selector */}
                            <div>
                              <label style={{ display: 'block', fontSize: '11.5px !important', fontWeight: 700, color: '#475569', marginBottom: '6px' }}>
                                ⏰ Logout Time {staffFormShiftType === 'Multi Strict' ? idx + 1 : ''}
                              </label>
                              <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                                <select
                                  value={logoutComp.hour}
                                  onChange={e => handleSlotTimeComponentChange(idx, 'logoutTime', 'hour', e.target.value)}
                                  style={{ flex: 1, padding: '8px 4px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12.5px !important', fontWeight: 700, color: '#0f172a', background: '#ffffff', textAlign: 'center', outline: 'none' }}
                                >
                                  {hoursList.map(h => <option key={h} value={h}>{h}</option>)}
                                </select>
                                <span style={{ fontWeight: 800, color: '#64748b' }}>:</span>
                                <select
                                  value={logoutComp.minute}
                                  onChange={e => handleSlotTimeComponentChange(idx, 'logoutTime', 'minute', e.target.value)}
                                  style={{ flex: 1, padding: '8px 4px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12.5px !important', fontWeight: 700, color: '#0f172a', background: '#ffffff', textAlign: 'center', outline: 'none' }}
                                >
                                  {minutesList.map(m => <option key={m} value={m}>{m}</option>)}
                                </select>
                                <select
                                  value={logoutComp.ampm}
                                  onChange={e => handleSlotTimeComponentChange(idx, 'logoutTime', 'ampm', e.target.value)}
                                  style={{ flex: 1, padding: '8px 4px', borderRadius: '8px', border: '1px solid #258ec8', fontSize: '12.5px !important', fontWeight: 800, color: '#1d4ed8', background: '#eff6ff', textAlign: 'center', outline: 'none' }}
                                >
                                  <option value="AM">AM</option>
                                  <option value="PM">PM</option>
                                </select>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}

                    {/* Add Slot Button for Multi Strict */}
                    {staffFormShiftType === 'Multi Strict' && (
                      <button
                        type="button"
                        onClick={() => setStaffFormSlots(prev => [...prev, { loginTime: '04:00 PM', logoutTime: '08:30 PM' }])}
                        style={{
                          width: '100%',
                          padding: '9px 12px',
                          borderRadius: '8px',
                          border: '1px dashed #258ec8',
                          background: '#eff6ff',
                          color: '#1d4ed8',
                          fontWeight: 700,
                          fontSize: '12px !important',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px'
                        }}
                      >
                        <Plus size={14} /> + Add Shift Slot (Login/Logout Pair)
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Modal Buttons */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button
                  type="button"
                  onClick={() => setShowAddStaffModal(false)}
                  style={{
                    padding: '10px 18px',
                    borderRadius: '10px',
                    border: '1px solid #cbd5e1',
                    background: '#ffffff',
                    color: '#475569',
                    fontSize: '13px !important',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{
                    padding: '10px 22px',
                    borderRadius: '10px',
                    border: 'none',
                    background: '#2563eb',
                    color: '#ffffff',
                    fontSize: '13px !important',
                    fontWeight: 800,
                    cursor: 'pointer',
                    boxShadow: '0 2px 8px rgba(37, 99, 235, 0.25)'
                  }}
                >
                  {editingStaffId ? 'Update Staff Member' : 'Save Staff Member'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADD / EDIT DOCTOR MODAL */}
      {showAddDoctorModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(15, 23, 42, 0.5)',
          backdropFilter: 'blur(3px)',
          zIndex: 1000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px'
        }}>
          <div style={{
            background: '#ffffff',
            borderRadius: '16px',
            maxWidth: '520px',
            width: '100%',
            padding: '24px',
            maxHeight: '90vh',
            overflowY: 'auto',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
            border: '1px solid #e2e8f0'
          }}>
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px', paddingBottom: '14px', borderBottom: '1px solid #f1f5f9' }}>
              <div>
                <h3 style={{ fontSize: '16px !important', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                  {editingDoctorId ? 'Edit Doctor Profile' : 'Add New Doctor'}
                </h3>
                <p style={{ fontSize: '12px !important', color: '#64748b', marginTop: '3px', margin: 0, fontWeight: 500 }}>
                  Configure practitioner details and work schedule.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowAddDoctorModal(false)}
                style={{
                  background: '#f8fafc',
                  border: '1px solid #cbd5e1',
                  borderRadius: '6px',
                  width: '30px',
                  height: '30px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#64748b'
                }}
              >
                <X size={16} color="#64748b" />
              </button>
            </div>

            <form onSubmit={handleSaveDoctor} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Assign Staff Role */}
              <div>
                <label style={{ display: 'block', fontSize: '12px !important', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                  Assign Staff Role
                </label>
                <select
                  disabled
                  value="Doctor"
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '13px !important',
                    fontWeight: 700,
                    color: '#334155',
                    background: '#f8fafc',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                >
                  <option value="Doctor">Doctor</option>
                </select>
              </div>

              {/* Doctor Category */}
              <div>
                <label style={{ display: 'block', fontSize: '12px !important', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                  Doctor Category
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  {(['Head Doctor', 'Employee Doctor'] as const).map(cat => {
                    const isSelected = doctorFormCategory === cat;
                    return (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setDoctorFormCategory(cat)}
                        style={{
                          padding: '10px 12px',
                          borderRadius: '8px',
                          border: isSelected ? '2px solid #2563eb' : '1px solid #cbd5e1',
                          background: isSelected ? '#eff6ff' : '#ffffff',
                          color: isSelected ? '#1d4ed8' : '#475569',
                          fontWeight: isSelected ? 800 : 600,
                          fontSize: '13px !important',
                          cursor: 'pointer',
                          textAlign: 'center',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        {cat}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Full Name */}
              <div>
                <label style={{ display: 'block', fontSize: '12px !important', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                  Full Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Dr. John Doe"
                  value={doctorFormName}
                  onChange={e => setDoctorFormName(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '13px !important',
                    color: '#0f172a',
                    fontWeight: 600,
                    outline: 'none',
                    background: '#ffffff',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              {/* Mobile Number (without +91) */}
              <div>
                <label style={{ display: 'block', fontSize: '12px !important', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                  Mobile Number (without +91)
                </label>
                <input
                  type="text"
                  placeholder="e.g. 9876543210"
                  value={doctorFormMobile}
                  onChange={e => setDoctorFormMobile(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '13px !important',
                    color: '#0f172a',
                    fontWeight: 600,
                    outline: 'none',
                    background: '#ffffff',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              {/* Salary & Work Schedule Box (Only for Employee Doctors) */}
              {doctorFormCategory === 'Employee Doctor' && (
                <div style={{
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '12px',
                  padding: '16px'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                    <h4 style={{ fontSize: '13px !important', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                      Salary & Work Schedule
                    </h4>
                    <span style={{
                      background: '#f0fdf4',
                      color: '#16a34a',
                      border: '1px solid #bbf7d0',
                      fontSize: '11px !important',
                      fontWeight: 700,
                      padding: '2px 8px',
                      borderRadius: '6px'
                    }}>
                      {calculateDailyHoursFromSlots(doctorFormSlots)}
                    </span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    {/* Monthly Base Salary (Rs) */}
                    <div>
                      <label style={{ display: 'block', fontSize: '12px !important', fontWeight: 700, color: '#475569', marginBottom: '6px' }}>
                        Monthly Base Salary (Rs)
                      </label>
                      <input
                        type="number"
                        placeholder="e.g. 25000"
                        value={doctorFormSalary}
                        onChange={e => setDoctorFormSalary(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '9px 12px',
                          borderRadius: '8px',
                          border: '1px solid #cbd5e1',
                          fontSize: '13px !important',
                          color: '#0f172a',
                          fontWeight: 600,
                          background: '#ffffff',
                          outline: 'none',
                          boxSizing: 'border-box'
                        }}
                      />
                    </div>

                    {/* Shift Type */}
                    <div>
                      <label style={{ display: 'block', fontSize: '12px !important', fontWeight: 700, color: '#475569', marginBottom: '6px' }}>
                        Shift Type
                      </label>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                        {(['Single Strict', 'Multi Strict'] as const).map(type => (
                          <button
                            key={type}
                            type="button"
                            onClick={() => {
                              setDoctorFormShiftType(type);
                              if (type === 'Multi Strict' && doctorFormSlots.length < 2) {
                                setDoctorFormSlots([
                                  { loginTime: '09:00 AM', logoutTime: '01:00 PM' },
                                  { loginTime: '04:00 PM', logoutTime: '08:30 PM' }
                                ]);
                              } else if (type === 'Single Strict' && doctorFormSlots.length > 1) {
                                setDoctorFormSlots([doctorFormSlots[0]]);
                              }
                            }}
                            style={{
                              padding: '8px 10px',
                              borderRadius: '8px',
                              border: doctorFormShiftType === type ? '2px solid #2563eb' : '1px solid #cbd5e1',
                              background: doctorFormShiftType === type ? '#eff6ff' : '#ffffff',
                              color: doctorFormShiftType === type ? '#1d4ed8' : '#475569',
                              fontWeight: doctorFormShiftType === type ? 800 : 600,
                              fontSize: '12px !important',
                              cursor: 'pointer'
                            }}
                          >
                            {type}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Dynamic Shift Slots */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {doctorFormSlots.map((slot, idx) => {
                        const loginComp = parseTimeComponents(slot.loginTime);
                        const logoutComp = parseTimeComponents(slot.logoutTime);

                        return (
                          <div key={idx} style={{ background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '12px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                              <span style={{ fontSize: '12px !important', fontWeight: 700, color: '#334155' }}>
                                {doctorFormShiftType === 'Multi Strict' ? `Shift Slot ${idx + 1}` : 'Shift Hours Schedule'}
                              </span>
                              {doctorFormShiftType === 'Multi Strict' && doctorFormSlots.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => setDoctorFormSlots(prev => prev.filter((_, i) => i !== idx))}
                                  style={{
                                    background: '#fef2f2',
                                    border: '1px solid #fecaca',
                                    borderRadius: '4px',
                                    padding: '2px 6px',
                                    cursor: 'pointer',
                                    fontSize: '11px !important',
                                    color: '#dc2626',
                                    fontWeight: 700
                                  }}
                                >
                                  Remove
                                </button>
                              )}
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                              {/* Login Time Selector */}
                              <div>
                                <label style={{ display: 'block', fontSize: '11px !important', fontWeight: 700, color: '#64748b', marginBottom: '4px' }}>
                                  Login Time {doctorFormShiftType === 'Multi Strict' ? idx + 1 : ''}
                                </label>
                                <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                                  <select
                                    value={loginComp.hour}
                                    onChange={e => handleSlotDoctorTimeChange(idx, 'loginTime', 'hour', e.target.value)}
                                    style={{ flex: 1, padding: '6px 4px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px !important', fontWeight: 700, color: '#0f172a', background: '#ffffff', textAlign: 'center', outline: 'none' }}
                                  >
                                    {hoursList.map(h => <option key={h} value={h}>{h}</option>)}
                                  </select>
                                  <span style={{ fontWeight: 700, color: '#64748b' }}>:</span>
                                  <select
                                    value={loginComp.minute}
                                    onChange={e => handleSlotDoctorTimeChange(idx, 'loginTime', 'minute', e.target.value)}
                                    style={{ flex: 1, padding: '6px 4px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px !important', fontWeight: 700, color: '#0f172a', background: '#ffffff', textAlign: 'center', outline: 'none' }}
                                  >
                                    {minutesList.map(m => <option key={m} value={m}>{m}</option>)}
                                  </select>
                                  <select
                                    value={loginComp.ampm}
                                    onChange={e => handleSlotDoctorTimeChange(idx, 'loginTime', 'ampm', e.target.value)}
                                    style={{ flex: 1, padding: '6px 4px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px !important', fontWeight: 700, color: '#1d4ed8', background: '#eff6ff', textAlign: 'center', outline: 'none' }}
                                  >
                                    <option value="AM">AM</option>
                                    <option value="PM">PM</option>
                                  </select>
                                </div>
                              </div>

                              {/* Logout Time Selector */}
                              <div>
                                <label style={{ display: 'block', fontSize: '11px !important', fontWeight: 700, color: '#64748b', marginBottom: '4px' }}>
                                  Logout Time {doctorFormShiftType === 'Multi Strict' ? idx + 1 : ''}
                                </label>
                                <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                                  <select
                                    value={logoutComp.hour}
                                    onChange={e => handleSlotDoctorTimeChange(idx, 'logoutTime', 'hour', e.target.value)}
                                    style={{ flex: 1, padding: '6px 4px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px !important', fontWeight: 700, color: '#0f172a', background: '#ffffff', textAlign: 'center', outline: 'none' }}
                                  >
                                    {hoursList.map(h => <option key={h} value={h}>{h}</option>)}
                                  </select>
                                  <span style={{ fontWeight: 700, color: '#64748b' }}>:</span>
                                  <select
                                    value={logoutComp.minute}
                                    onChange={e => handleSlotDoctorTimeChange(idx, 'logoutTime', 'minute', e.target.value)}
                                    style={{ flex: 1, padding: '6px 4px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px !important', fontWeight: 700, color: '#0f172a', background: '#ffffff', textAlign: 'center', outline: 'none' }}
                                  >
                                    {minutesList.map(m => <option key={m} value={m}>{m}</option>)}
                                  </select>
                                  <select
                                    value={logoutComp.ampm}
                                    onChange={e => handleSlotDoctorTimeChange(idx, 'logoutTime', 'ampm', e.target.value)}
                                    style={{ flex: 1, padding: '6px 4px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px !important', fontWeight: 700, color: '#1d4ed8', background: '#eff6ff', textAlign: 'center', outline: 'none' }}
                                  >
                                    <option value="AM">AM</option>
                                    <option value="PM">PM</option>
                                  </select>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}

                      {/* Add Slot Button for Multi Strict */}
                      {doctorFormShiftType === 'Multi Strict' && (
                        <button
                          type="button"
                          onClick={() => setDoctorFormSlots(prev => [...prev, { loginTime: '04:00 PM', logoutTime: '08:30 PM' }])}
                          style={{
                            width: '100%',
                            padding: '8px 12px',
                            borderRadius: '6px',
                            border: '1px dashed #cbd5e1',
                            background: '#ffffff',
                            color: '#2563eb',
                            fontWeight: 700,
                            fontSize: '12px !important',
                            cursor: 'pointer'
                          }}
                        >
                          + Add Shift Slot
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Modal Action Footer */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '6px', paddingTop: '14px', borderTop: '1px solid #f1f5f9' }}>
                <button
                  type="button"
                  onClick={() => setShowAddDoctorModal(false)}
                  style={{
                    padding: '9px 16px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    background: '#ffffff',
                    color: '#475569',
                    fontSize: '13px !important',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{
                    padding: '9px 20px',
                    borderRadius: '8px',
                    border: 'none',
                    background: '#2563eb',
                    color: '#ffffff',
                    fontSize: '13px !important',
                    fontWeight: 800,
                    cursor: 'pointer',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                  }}
                >
                  {editingDoctorId ? 'Update Doctor Profile' : 'Save Doctor'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
