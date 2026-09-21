import React, { useState, useEffect } from 'react';
import { UserCheck, Building2, Clock, Phone, Plus, Trash2, Edit2, X } from 'lucide-react';
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, setDoc } from 'firebase/firestore';
import { db } from '@app/shared';

export const StaffManagementPage: React.FC = () => {
  const DEFAULT_STAFF = [
    { id: '1', name: 'Anil Kumar M', role: 'Regular Staff', branch: 'KPHB', phone: '90301 76176', hours: '10.5 hrs/day', shift: '10:00 AM - 08:30 PM', salary: '₹22,000' },
    { id: '2', name: 'Ashwini Begari', role: 'Regular Staff', branch: 'Chandanagar', phone: '95531 76176', hours: '8.5 hrs/day', shift: '10:00 AM - 06:30 PM', salary: '₹17,000' },
    { id: '3', name: 'Vaishnavi Peri', role: 'Regular Staff', branch: 'Nallagandla', phone: '91321 76176', hours: '9.5 hrs/day', shift: '09:30 AM - 07:00 PM', salary: '₹17,000' },
    { id: '4', name: 'Nandini Gottelli', role: 'Regular Staff', branch: 'Dilshuknagar', phone: '98041 76176', hours: '8 hrs/day', shift: '10:00 AM - 02:00 PM | 04:30 PM - 08:30 PM', salary: '₹15,000' },
    { id: '5', name: 'Srikanth', role: 'Regular Staff', branch: 'KPHB', phone: '90301 76176', hours: '10 hrs/day', shift: '10:00 AM - 08:00 PM', salary: '₹18,000' },
    { id: '6', name: 'Arun Kumar', role: 'Regular Staff', branch: 'Nallagandla', phone: '91321 76176', hours: '8 hrs/day', shift: '10:00 AM - 06:00 PM', salary: '₹14,000' },
    { id: '7', name: 'Aishwarya . M', role: 'Regular Staff', branch: 'KPHB', phone: '79955 32759', hours: '10.5 hrs/day', shift: '10:00 AM - 08:30 PM', salary: '₹14,000' },
  ];

  const DEFAULT_DOCTORS = [
    { id: 'doc-prashanth', name: 'Dr. Prashanth K Vaidya', role: 'Head Doctor', category: 'Head Doctor', phone: '8125260176', mobile: '8125260176', branch: 'KPHB Branch', shift: '10:00 AM - 08:30 PM', hours: '10.5 hrs/day', salary: '₹1,50,000' },
    { id: 'doc-jobedah', name: 'Dr. Jobedah Parveez', role: 'Head Doctor', category: 'Head Doctor', phone: '9903119766', mobile: '9903119766', branch: 'Nallagandla Branch', shift: '10:00 AM - 08:30 PM', hours: '10.5 hrs/day', salary: '₹1,40,000' },
    { id: 'doc-padma', name: 'Dr. Padma Priya', role: 'Employee Doctor', category: 'Employee Doctor', phone: '9490808582', mobile: '9490808582', branch: 'Chandanagar Branch', shift: '10:00 AM - 08:00 PM', hours: '10 hrs/day', salary: '₹95,000' },
    { id: 'doc-ramakrishna', name: 'Dr. Ramakrishna Chanduri', role: 'Head Doctor', category: 'Head Doctor', phone: '1111111111', mobile: '1111111111', branch: 'Dilshuknagar Branch', shift: '10:00 AM - 08:30 PM', hours: '10.5 hrs/day', salary: '₹1,45,000' },
  ];

  const [staffList, setStaffList] = useState<any[]>(DEFAULT_STAFF);
  const [doctorsList, setDoctorsList] = useState<any[]>(DEFAULT_DOCTORS);

  // Staff Modal States
  const [showAddStaffModal, setShowAddStaffModal] = useState(false);
  const [showEditStaffModal, setShowEditStaffModal] = useState(false);
  const [editingStaffId, setEditingStaffId] = useState('');
  const [newStaffName, setNewStaffName] = useState('');
  const [newStaffPhone, setNewStaffPhone] = useState('');
  const [newStaffBranch, setNewStaffBranch] = useState('KPHB');
  const [newStaffShift, setNewStaffShift] = useState('10:00 AM - 08:30 PM');
  const [newStaffHours, setNewStaffHours] = useState('10.5 hrs/day');
  const [newStaffSalary, setNewStaffSalary] = useState('₹18,000');

  // Doctor Modal States
  const [showAddDocModal, setShowAddDocModal] = useState(false);
  const [showEditDocModal, setShowEditDocModal] = useState(false);
  const [editingDocId, setEditingDocId] = useState('');
  const [newDocName, setNewDocName] = useState('');
  const [newDocPhone, setNewDocPhone] = useState('');
  const [newDocCategory, setNewDocCategory] = useState<'Head Doctor' | 'Employee Doctor'>('Head Doctor');
  const [newDocBranch, setNewDocBranch] = useState('KPHB Branch');
  const [newDocShift, setNewDocShift] = useState('10:00 AM - 08:00 PM');
  const [newDocHours, setNewDocHours] = useState('10 hrs/day');
  const [newDocSalary, setNewDocSalary] = useState('₹95,000');

  const [isSubmitting, setIsSubmitting] = useState(false);

  // 1. Staff Listener
  useEffect(() => {
    if (!db) return;
    const colRef = collection(db, 'staff');
    const unsub = onSnapshot(colRef, (snap) => {
      if (!snap.empty) {
        const loaded = snap.docs.map(d => {
          const data = d.data();
          return {
            id: d.id,
            name: data.name || 'Staff Member',
            role: data.role || 'Regular Staff',
            branch: data.branch || 'KPHB',
            phone: data.mobile || data.phone || '90301 76176',
            hours: data.hours || '8 hrs/day',
            shift: data.shift || '10:00 AM - 06:00 PM',
            salary: data.salary || '₹18,000'
          };
        });
        setStaffList(loaded);
      }
    }, (err) => console.warn('Firestore staff listener error:', err));
    return () => unsub();
  }, []);

  // 2. Doctors Listener
  useEffect(() => {
    if (!db) return;
    const docColRef = collection(db, 'doctors');
    const unsub = onSnapshot(docColRef, async (snap) => {
      if (!snap.empty) {
        const loaded = snap.docs.map(d => {
          const data = d.data();
          return {
            id: d.id,
            name: data.name || 'Dr. Physician',
            role: data.role || data.category || 'Head Doctor',
            category: data.category || data.role || 'Head Doctor',
            phone: data.mobile || data.phone || '0000000000',
            mobile: data.mobile || data.phone || '0000000000',
            branch: data.branch || 'Medical Center',
            shift: data.shift || '-',
            hours: data.hours || '-',
            salary: data.salary || '-'
          };
        });
        setDoctorsList(loaded);
      } else {
        // Seed initial doctors so they exist in Firestore
        try {
          for (const docItem of DEFAULT_DOCTORS) {
            await setDoc(doc(db, 'doctors', docItem.id), docItem);
          }
        } catch (e) {
          console.warn('Seed doctors notice:', e);
        }
      }
    }, (err) => console.warn('Firestore doctors listener error:', err));
    return () => unsub();
  }, []);

  // STAFF ACTIONS
  const handleDeleteStaff = async (staffId?: string, staffName?: string) => {
    const confirmDelete = window.confirm(`Are you sure you want to delete staff member "${staffName}"?\n\nTheir login access will be immediately revoked across both Web and Mobile App.`);
    if (!confirmDelete) return;

    try {
      if (staffId && db) {
        await deleteDoc(doc(db, 'staff', staffId));
      }
      setStaffList(prev => prev.filter(s => s.id !== staffId && s.name !== staffName));
      alert(`Staff member ${staffName} deleted. Login access revoked.`);
    } catch (err: any) {
      console.error('Error deleting staff:', err);
      alert(`Failed to delete staff: ${err.message}`);
    }
  };

  const handleOpenEditStaff = (staff: any) => {
    setEditingStaffId(staff.id);
    setNewStaffName(staff.name);
    setNewStaffPhone(staff.phone || staff.mobile || '');
    setNewStaffBranch(staff.branch || 'KPHB');
    setNewStaffShift(staff.shift || '10:00 AM - 08:30 PM');
    setNewStaffHours(staff.hours || '10.5 hrs/day');
    setNewStaffSalary(staff.salary || '₹18,000');
    setShowEditStaffModal(true);
  };

  const handleSaveStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStaffName.trim() || !newStaffPhone.trim()) {
      alert('Please enter both staff name and phone number.');
      return;
    }

    setIsSubmitting(true);
    try {
      const cleanPhone = newStaffPhone.trim().replace(/\D/g, '');
      const staffDoc = {
        name: newStaffName.trim(),
        mobile: cleanPhone,
        phone: cleanPhone,
        branch: newStaffBranch,
        shift: newStaffShift.trim() || '10:00 AM - 08:30 PM',
        hours: newStaffHours.trim() || '10.5 hrs/day',
        salary: newStaffSalary.trim().startsWith('₹') ? newStaffSalary.trim() : `₹${newStaffSalary.trim()}`,
        role: 'Regular Staff',
        updatedAt: new Date().toISOString()
      };

      if (showEditStaffModal && editingStaffId && db) {
        await updateDoc(doc(db, 'staff', editingStaffId), staffDoc);
        setStaffList(prev => prev.map(s => s.id === editingStaffId ? { id: editingStaffId, ...staffDoc } : s));
        setShowEditStaffModal(false);
        alert(`Staff member ${staffDoc.name} updated successfully!`);
      } else {
        if (db) {
          const docRef = await addDoc(collection(db, 'staff'), { ...staffDoc, createdAt: new Date().toISOString() });
          setStaffList(prev => [{ id: docRef.id, ...staffDoc }, ...prev]);
        } else {
          setStaffList(prev => [{ id: Date.now().toString(), ...staffDoc }, ...prev]);
        }
        setShowAddStaffModal(false);
        alert(`Staff member ${staffDoc.name} added successfully! They can now log in using SMS OTP.`);
      }

      setNewStaffName('');
      setNewStaffPhone('');
      setNewStaffSalary('₹18,000');
    } catch (err: any) {
      console.error('Error saving staff:', err);
      alert(`Failed to save staff: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // DOCTOR ACTIONS
  const handleDeleteDoctor = async (docId?: string, docName?: string) => {
    const confirmDelete = window.confirm(`Are you sure you want to delete doctor "${docName}"?\n\nTheir login access will be immediately revoked across both Web and Mobile App.`);
    if (!confirmDelete) return;

    try {
      if (docId && db) {
        await deleteDoc(doc(db, 'doctors', docId));
      }
      setDoctorsList(prev => prev.filter(d => d.id !== docId && d.name !== docName));
      alert(`Doctor ${docName} deleted. Login access revoked.`);
    } catch (err: any) {
      console.error('Error deleting doctor:', err);
      alert(`Failed to delete doctor: ${err.message}`);
    }
  };

  const handleOpenEditDoctor = (doctor: any) => {
    setEditingDocId(doctor.id);
    setNewDocName(doctor.name);
    setNewDocPhone(doctor.phone || doctor.mobile || '');
    setNewDocCategory((doctor.category === 'Employee Doctor' || doctor.role?.includes('Employee')) ? 'Employee Doctor' : 'Head Doctor');
    setNewDocBranch(doctor.branch || 'KPHB Branch');
    setNewDocShift(doctor.shift || '10:00 AM - 08:00 PM');
    setNewDocHours(doctor.hours || '10 hrs/day');
    setNewDocSalary(doctor.salary || '₹95,000');
    setShowEditDocModal(true);
  };

  const handleSaveDoctor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDocName.trim() || !newDocPhone.trim()) {
      alert('Please enter both doctor name and phone number.');
      return;
    }

    setIsSubmitting(true);
    try {
      const cleanPhone = newDocPhone.trim().replace(/\D/g, '');
      const isHead = newDocCategory === 'Head Doctor';
      const doctorDoc = {
        name: newDocName.trim(),
        mobile: cleanPhone,
        phone: cleanPhone,
        role: newDocCategory,
        category: newDocCategory,
        branch: newDocBranch,
        shift: isHead ? '-' : (newDocShift.trim() || '10:00 AM - 08:00 PM'),
        hours: isHead ? '-' : (newDocHours.trim() || '10 hrs/day'),
        salary: isHead ? '-' : (newDocSalary.trim().startsWith('₹') ? newDocSalary.trim() : `₹${newDocSalary.trim()}`),
        updatedAt: new Date().toISOString()
      };

      if (showEditDocModal && editingDocId && db) {
        await updateDoc(doc(db, 'doctors', editingDocId), doctorDoc);
        setDoctorsList(prev => prev.map(d => d.id === editingDocId ? { id: editingDocId, ...doctorDoc } : d));
        setShowEditDocModal(false);
        alert(`Doctor ${doctorDoc.name} updated successfully!`);
      } else {
        if (db) {
          const docRef = await addDoc(collection(db, 'doctors'), { ...doctorDoc, createdAt: new Date().toISOString() });
          setDoctorsList(prev => [{ id: docRef.id, ...doctorDoc }, ...prev]);
        } else {
          setDoctorsList(prev => [{ id: Date.now().toString(), ...doctorDoc }, ...prev]);
        }
        setShowAddDocModal(false);
        alert(`Doctor ${doctorDoc.name} added successfully! They can now log in using SMS OTP.`);
      }

      setNewDocName('');
      setNewDocPhone('');
      setNewDocSalary('₹95,000');
    } catch (err: any) {
      console.error('Error saving doctor:', err);
      alert(`Failed to save doctor: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '20px', padding: '22px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ fontSize: '16px !important', fontWeight: 800, color: '#0f172a' }}>
            Staff & Doctors Directory Management
          </h2>
          <p style={{ fontSize: '12px !important', color: '#64748b' }}>
            Add, Edit, and Delete access for Clinic Staff and Doctors. Real-time sync with SMS OTP login.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => {
              setNewStaffName('');
              setNewStaffPhone('');
              setNewStaffSalary('₹18,000');
              setShowAddStaffModal(true);
            }}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor: '#258ec8',
              color: '#ffffff',
              border: 'none',
              padding: '9px 14px',
              borderRadius: '10px',
              fontSize: '12.5px',
              fontWeight: 800,
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(37, 142, 200, 0.25)'
            }}
          >
            <Plus size={15} />
            + Add Staff Member
          </button>
          <button
            type="button"
            onClick={() => {
              setNewDocName('');
              setNewDocPhone('');
              setNewDocSalary('₹95,000');
              setShowAddDocModal(true);
            }}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor: '#9333ea',
              color: '#ffffff',
              border: 'none',
              padding: '9px 14px',
              borderRadius: '10px',
              fontSize: '12.5px',
              fontWeight: 800,
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(147, 51, 234, 0.25)'
            }}
          >
            <Plus size={15} />
            + Add Doctor
          </button>
        </div>
      </div>

      {/* 3 SECTION SIDE-BY-SIDE GRID LAYOUT */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '18px' }}>

        {/* SECTION 1: CLINIC STAFF */}
        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px', paddingBottom: '10px', borderBottom: '1px solid #cbd5e1' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ background: '#258ec8', color: '#ffffff', padding: '6px', borderRadius: '8px' }}>
                <UserCheck size={16} />
              </div>
              <div>
                <h3 style={{ fontSize: '13.5px !important', fontWeight: 800, color: '#0f172a' }}>1. Regular Staff</h3>
                <span style={{ fontSize: '10.5px !important', color: '#64748b', fontWeight: 700 }}>{staffList.length} Staff Members</span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                setNewStaffName('');
                setNewStaffPhone('');
                setNewStaffSalary('₹18,000');
                setShowAddStaffModal(true);
              }}
              style={{
                background: '#e0f2fe',
                color: '#0284c7',
                border: '1px solid #bae6fd',
                padding: '4px 8px',
                borderRadius: '6px',
                fontSize: '11px',
                fontWeight: 800,
                cursor: 'pointer'
              }}
            >
              + Add
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {staffList.map(s => (
              <div key={s.id || s.name} style={{ background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '12px', padding: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontSize: '13px !important', fontWeight: 800, color: '#0f172a' }}>{s.name}</span>
                    <span style={{ background: '#e0f2fe', color: '#0284c7', fontSize: '10px !important', fontWeight: 800, padding: '2px 6px', borderRadius: '6px' }}>{s.branch}</span>
                  </div>
                  <div style={{ display: 'flex', gap: '4px' }}>
                    <button
                      type="button"
                      onClick={() => handleOpenEditStaff(s)}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '2px',
                        background: '#f1f5f9',
                        border: '1px solid #cbd5e1',
                        color: '#475569',
                        padding: '3px 6px',
                        borderRadius: '6px',
                        fontSize: '10.5px',
                        fontWeight: 700,
                        cursor: 'pointer'
                      }}
                      title="Edit Staff Member"
                    >
                      <Edit2 size={11} />
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteStaff(s.id, s.name)}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '2px',
                        background: '#fef2f2',
                        border: '1px solid #fee2e2',
                        color: '#ef4444',
                        padding: '3px 6px',
                        borderRadius: '6px',
                        fontSize: '10.5px',
                        fontWeight: 700,
                        cursor: 'pointer'
                      }}
                      title="Delete Staff & Revoke Login"
                    >
                      <Trash2 size={11} />
                      Delete
                    </button>
                  </div>
                </div>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11.5px !important', color: '#64748b', marginBottom: '6px' }}>
                  <Phone size={12} color="#0284c7" /> +91 {s.phone}
                </span>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', fontSize: '11px !important', paddingTop: '6px', borderTop: '1px solid #f1f5f9' }}>
                  <div style={{ color: '#16a34a', fontWeight: 700 }}>
                    {s.shift && s.shift.includes('|') ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        {s.shift.split('|').map((slotStr: string, i: number) => (
                          <div key={i}>Shift {i + 1}: {slotStr.trim()}</div>
                        ))}
                        <div style={{ color: '#0284c7', fontSize: '10.5px !important', marginTop: '2px' }}>Total: {s.hours}</div>
                      </div>
                    ) : (
                      <span>Shift: {s.shift || 'Regular'} ({s.hours || '8 hrs/day'})</span>
                    )}
                  </div>
                  <span style={{ fontWeight: 800, color: '#0f172a' }}>{s.salary || '₹18,000'}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* SECTION 2: OFFICIAL BRANCH DESKS */}
        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', paddingBottom: '10px', borderBottom: '1px solid #cbd5e1' }}>
            <div style={{ background: '#0284c7', color: '#ffffff', padding: '6px', borderRadius: '8px' }}>
              <Building2 size={16} />
            </div>
            <div>
              <h3 style={{ fontSize: '13.5px !important', fontWeight: 800, color: '#0f172a' }}>2. Reception (Branches)</h3>
              <span style={{ fontSize: '10.5px !important', color: '#64748b', fontWeight: 700 }}>4 Official Clinic Branches</span>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {[
              { branch: 'KPHB Branch', phone: '90301 76176', hours: '10:00 AM - 08:30 PM', location: 'KPHB Colony' },
              { branch: 'Nallagandla Branch', phone: '91321 76176', hours: '10:00 AM - 08:30 PM', location: 'Nallagandla Main Rd' },
              { branch: 'Dilshuknagar Branch', phone: '98041 76176', hours: '10:00 AM - 08:30 PM', location: 'Dilshuknagar Metro' },
              { branch: 'Chandanagar Branch', phone: '95531 76176', hours: '10:00 AM - 08:00 PM', location: 'HUDA Trade Centre' },
            ].map(b => (
              <div key={b.branch} style={{ background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '12px', padding: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                  <span style={{ fontSize: '13px !important', fontWeight: 800, color: '#0f172a' }}>{b.branch}</span>
                  <span style={{ background: '#dcfce7', color: '#15803d', fontSize: '10px !important', fontWeight: 800, padding: '2px 6px', borderRadius: '6px' }}>ACTIVE</span>
                </div>
                <span style={{ display: 'block', fontSize: '11.5px !important', color: '#64748b', marginBottom: '6px' }}>{b.location}</span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', fontSize: '11px !important', paddingTop: '6px', borderTop: '1px solid #f1f5f9' }}>
                  <span style={{ color: '#0284c7', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                    <Phone size={12} color="#0284c7" /> Contact: +91 {b.phone}
                  </span>
                  <span style={{ color: '#16a34a', fontWeight: 700 }}>Hours: {b.hours}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* SECTION 3: DOCTORS DIRECTORY */}
        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px', paddingBottom: '10px', borderBottom: '1px solid #cbd5e1' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ background: '#a855f7', color: '#ffffff', padding: '6px', borderRadius: '8px' }}>
                <Clock size={16} />
              </div>
              <div>
                <h3 style={{ fontSize: '13.5px !important', fontWeight: 800, color: '#0f172a' }}>3. Doctors Directory</h3>
                <span style={{ fontSize: '10.5px !important', color: '#64748b', fontWeight: 700 }}>{doctorsList.length} Doctors</span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                setNewDocName('');
                setNewDocPhone('');
                setNewDocSalary('₹95,000');
                setShowAddDocModal(true);
              }}
              style={{
                background: '#faf5ff',
                color: '#9333ea',
                border: '1px solid #e9d5ff',
                padding: '4px 8px',
                borderRadius: '6px',
                fontSize: '11px',
                fontWeight: 800,
                cursor: 'pointer'
              }}
            >
              + Add
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {doctorsList.map(d => (
              <div key={d.id || d.name} style={{ background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '12px', padding: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontSize: '13px !important', fontWeight: 800, color: '#0f172a' }}>{d.name}</span>
                    <span style={{ background: '#faf5ff', color: '#a855f7', fontSize: '10px !important', fontWeight: 800, padding: '2px 6px', borderRadius: '6px' }}>{d.role}</span>
                  </div>
                  <div style={{ display: 'flex', gap: '4px' }}>
                    <button
                      type="button"
                      onClick={() => handleOpenEditDoctor(d)}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '2px',
                        background: '#f1f5f9',
                        border: '1px solid #cbd5e1',
                        color: '#475569',
                        padding: '3px 6px',
                        borderRadius: '6px',
                        fontSize: '10.5px',
                        fontWeight: 700,
                        cursor: 'pointer'
                      }}
                      title="Edit Doctor"
                    >
                      <Edit2 size={11} />
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteDoctor(d.id, d.name)}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '2px',
                        background: '#fef2f2',
                        border: '1px solid #fee2e2',
                        color: '#ef4444',
                        padding: '3px 6px',
                        borderRadius: '6px',
                        fontSize: '10.5px',
                        fontWeight: 700,
                        cursor: 'pointer'
                      }}
                      title="Delete Doctor & Revoke Login"
                    >
                      <Trash2 size={11} />
                      Delete
                    </button>
                  </div>
                </div>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11.5px !important', color: '#64748b', marginBottom: '6px' }}>
                  <Phone size={12} color="#0284c7" /> Phone: +91 {d.phone || d.mobile}
                </span>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px !important', paddingTop: '6px', borderTop: '1px solid #f1f5f9' }}>
                  <span style={{ color: '#64748b', fontWeight: 700 }}>{d.branch || 'All Branches'}</span>
                  <span style={{ fontWeight: 800, color: d.role.includes('Employee') ? '#0f172a' : '#94a3b8' }}>
                    {d.role.includes('Employee') ? d.salary : '-'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* SECTION 4: HR DEPARTMENT */}
        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', paddingBottom: '10px', borderBottom: '1px solid #cbd5e1' }}>
            <div style={{ background: '#0284c7', color: '#ffffff', padding: '6px', borderRadius: '8px' }}>
              <UserCheck size={16} />
            </div>
            <div>
              <h3 style={{ fontSize: '13.5px !important', fontWeight: 800, color: '#0f172a' }}>4. HR Department</h3>
              <span style={{ fontSize: '10.5px !important', color: '#64748b', fontWeight: 700 }}>Human Resources & Operations</span>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '12px', padding: '14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '13.5px !important', fontWeight: 800, color: '#0f172a' }}>HR Department</span>
                <span style={{ background: '#dcfce7', color: '#15803d', fontSize: '10px !important', fontWeight: 800, padding: '2px 6px', borderRadius: '6px' }}>ACTIVE</span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', paddingTop: '8px', borderTop: '1px solid #f1f5f9' }}>
                <div style={{ fontSize: '12px !important', color: '#475569' }}>
                  <span style={{ fontWeight: 700, color: '#64748b' }}>Designation:</span> <span style={{ fontWeight: 700, color: '#0284c7' }}>Human Resources (HR)</span>
                </div>
                <div style={{ fontSize: '12px !important', color: '#475569' }}>
                  <span style={{ fontWeight: 700, color: '#64748b' }}>HR ID / Login Email:</span> <span style={{ fontWeight: 800, color: '#0f172a', background: '#f1f5f9', padding: '2px 6px', borderRadius: '4px' }}>hr@sph.com</span>
                </div>
                <div style={{ fontSize: '12px !important', color: '#475569' }}>
                  <span style={{ fontWeight: 700, color: '#64748b' }}>Password:</span> <span style={{ fontWeight: 800, color: '#0f172a', background: '#f1f5f9', padding: '2px 6px', borderRadius: '4px' }}>hr@sph123</span>
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* MODAL 1: ADD / EDIT STAFF */}
      {(showAddStaffModal || showEditStaffModal) && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.6)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '20px'
        }}>
          <div style={{
            background: '#ffffff',
            borderRadius: '16px',
            width: '100%',
            maxWidth: '500px',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            border: '1px solid #e2e8f0',
            overflow: 'hidden'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '16px 20px',
              borderBottom: '1px solid #f1f5f9',
              background: '#f8fafc'
            }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: '#0f172a' }}>
                  {showEditStaffModal ? 'Edit Staff Member' : 'Add New Staff Member'}
                </h3>
                <p style={{ margin: 0, fontSize: '11.5px', color: '#64748b' }}>
                  {showEditStaffModal ? 'Update staff member details.' : 'Staff can log in with SMS OTP immediately upon saving.'}
                </p>
              </div>
              <button
                onClick={() => { setShowAddStaffModal(false); setShowEditStaffModal(false); }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', padding: '4px' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveStaff} style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ramesh Reddy"
                  value={newStaffName}
                  onChange={e => setNewStaffName(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '13px',
                    color: '#0f172a',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                  Mobile / Phone Number * (Used for SMS OTP Login)
                </label>
                <input
                  type="tel"
                  required
                  placeholder="e.g. 9876543210"
                  value={newStaffPhone}
                  onChange={e => setNewStaffPhone(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '13px',
                    color: '#0f172a',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                  Clinic Branch
                </label>
                <select
                  value={newStaffBranch}
                  onChange={e => setNewStaffBranch(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '13px',
                    color: '#0f172a',
                    outline: 'none',
                    boxSizing: 'border-box',
                    background: '#ffffff'
                  }}
                >
                  <option value="KPHB">KPHB Branch</option>
                  <option value="Nallagandla">Nallagandla Branch</option>
                  <option value="Dilshuknagar">Dilshuknagar Branch</option>
                  <option value="Chandanagar">Chandanagar Branch</option>
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                    Shift Hours
                  </label>
                  <input
                    type="text"
                    placeholder="10:00 AM - 08:30 PM"
                    value={newStaffShift}
                    onChange={e => setNewStaffShift(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      fontSize: '13px',
                      color: '#0f172a',
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                    Daily Hours
                  </label>
                  <input
                    type="text"
                    placeholder="10.5 hrs/day"
                    value={newStaffHours}
                    onChange={e => setNewStaffHours(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      fontSize: '13px',
                      color: '#0f172a',
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                  Monthly Salary
                </label>
                <input
                  type="text"
                  placeholder="₹18,000"
                  value={newStaffSalary}
                  onChange={e => setNewStaffSalary(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '13px',
                    color: '#0f172a',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button
                  type="button"
                  onClick={() => { setShowAddStaffModal(false); setShowEditStaffModal(false); }}
                  style={{
                    padding: '10px 16px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    background: '#ffffff',
                    color: '#475569',
                    fontSize: '13px',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  style={{
                    padding: '10px 20px',
                    borderRadius: '8px',
                    border: 'none',
                    background: '#258ec8',
                    color: '#ffffff',
                    fontSize: '13px',
                    fontWeight: 800,
                    cursor: 'pointer',
                    boxShadow: '0 4px 12px rgba(37, 142, 200, 0.25)'
                  }}
                >
                  {isSubmitting ? 'Saving...' : showEditStaffModal ? 'Update Staff Member' : 'Save & Enable Login'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: ADD / EDIT DOCTOR */}
      {(showAddDocModal || showEditDocModal) && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.6)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '20px'
        }}>
          <div style={{
            background: '#ffffff',
            borderRadius: '16px',
            width: '100%',
            maxWidth: '500px',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            border: '1px solid #e2e8f0',
            overflow: 'hidden'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '16px 20px',
              borderBottom: '1px solid #f1f5f9',
              background: '#f8fafc'
            }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: '#0f172a' }}>
                  {showEditDocModal ? 'Edit Doctor Details' : 'Add New Doctor'}
                </h3>
                <p style={{ margin: 0, fontSize: '11.5px', color: '#64748b' }}>
                  {showEditDocModal ? 'Update doctor details and access.' : 'Doctor will be enabled for SMS OTP login immediately upon saving.'}
                </p>
              </div>
              <button
                onClick={() => { setShowAddDocModal(false); setShowEditDocModal(false); }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', padding: '4px' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveDoctor} style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                  Doctor Full Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Dr. Ramesh Homeo Specialist"
                  value={newDocName}
                  onChange={e => setNewDocName(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '13px',
                    color: '#0f172a',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                  Mobile / Phone Number * (Used for Doctor SMS OTP Login)
                </label>
                <input
                  type="tel"
                  required
                  placeholder="e.g. 9876543210"
                  value={newDocPhone}
                  onChange={e => setNewDocPhone(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '13px',
                    color: '#0f172a',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                    Doctor Role / Category
                  </label>
                  <select
                    value={newDocCategory}
                    onChange={e => setNewDocCategory(e.target.value as any)}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      fontSize: '13px',
                      color: '#0f172a',
                      outline: 'none',
                      boxSizing: 'border-box',
                      background: '#ffffff'
                    }}
                  >
                    <option value="Head Doctor">Head Doctor</option>
                    <option value="Employee Doctor">Employee Doctor</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                    Branch Location
                  </label>
                  <select
                    value={newDocBranch}
                    onChange={e => setNewDocBranch(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      fontSize: '13px',
                      color: '#0f172a',
                      outline: 'none',
                      boxSizing: 'border-box',
                      background: '#ffffff'
                    }}
                  >
                    <option value="KPHB Branch">KPHB Branch</option>
                    <option value="Nallagandla Branch">Nallagandla Branch</option>
                    <option value="Dilshuknagar Branch">Dilshuknagar Branch</option>
                    <option value="Chandanagar Branch">Chandanagar Branch</option>
                    <option value="All Branches">All Branches</option>
                  </select>
                </div>
              </div>

              {newDocCategory === 'Employee Doctor' && (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                        Shift Hours
                      </label>
                      <input
                        type="text"
                        placeholder="10:00 AM - 08:00 PM"
                        value={newDocShift}
                        onChange={e => setNewDocShift(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '10px 12px',
                          borderRadius: '8px',
                          border: '1px solid #cbd5e1',
                          fontSize: '13px',
                          color: '#0f172a',
                          outline: 'none',
                          boxSizing: 'border-box'
                        }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                        Daily Hours
                      </label>
                      <input
                        type="text"
                        placeholder="10 hrs/day"
                        value={newDocHours}
                        onChange={e => setNewDocHours(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '10px 12px',
                          borderRadius: '8px',
                          border: '1px solid #cbd5e1',
                          fontSize: '13px',
                          color: '#0f172a',
                          outline: 'none',
                          boxSizing: 'border-box'
                        }}
                      />
                    </div>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                      Monthly Salary
                    </label>
                    <input
                      type="text"
                      placeholder="₹95,000"
                      value={newDocSalary}
                      onChange={e => setNewDocSalary(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        borderRadius: '8px',
                        border: '1px solid #cbd5e1',
                        fontSize: '13px',
                        color: '#0f172a',
                        outline: 'none',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>
                </>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button
                  type="button"
                  onClick={() => { setShowAddDocModal(false); setShowEditDocModal(false); }}
                  style={{
                    padding: '10px 16px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    background: '#ffffff',
                    color: '#475569',
                    fontSize: '13px',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  style={{
                    padding: '10px 20px',
                    borderRadius: '8px',
                    border: 'none',
                    background: '#9333ea',
                    color: '#ffffff',
                    fontSize: '13px',
                    fontWeight: 800,
                    cursor: 'pointer',
                    boxShadow: '0 4px 12px rgba(147, 51, 234, 0.25)'
                  }}
                >
                  {isSubmitting ? 'Saving...' : showEditDocModal ? 'Update Doctor' : 'Save & Enable Doctor Login'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
