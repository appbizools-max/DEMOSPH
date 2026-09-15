import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Alert, Modal, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getSafeDb, collection, onSnapshot, doc, deleteDoc, addDoc, updateDoc, setDoc } from '../../../utils/firebaseSafe';

export const StaffManagementScreen: React.FC = () => {
  const db = getSafeDb();
  const [staffCategory, setStaffCategory] = useState<'staff' | 'reception' | 'doctors'>('staff');

  // Staff Modal State
  const [showAddStaffModal, setShowAddStaffModal] = useState(false);
  const [showEditStaffModal, setShowEditStaffModal] = useState(false);
  const [editingStaffId, setEditingStaffId] = useState('');
  const [newStaffName, setNewStaffName] = useState('');
  const [newStaffPhone, setNewStaffPhone] = useState('');
  const [newStaffBranch, setNewStaffBranch] = useState('KPHB');
  const [newStaffShift, setNewStaffShift] = useState('10:00 AM - 08:30 PM');
  const [newStaffHours, setNewStaffHours] = useState('10.5 hrs/day');
  const [newStaffSalary, setNewStaffSalary] = useState('₹18,000');

  // Doctor Modal State
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

  // Seed Data for Staff
  const DEFAULT_STAFF = [
    { id: '1', name: 'Anil Kumar M', role: 'Regular Staff', branch: 'KPHB', hours: '10.5 hrs/day', salary: '₹22,000', phone: '9030176176' },
    { id: '2', name: 'Ashwini Begari', role: 'Regular Staff', branch: 'Chandanagar', hours: '8.5 hrs/day', salary: '₹17,000', phone: '9553176176' },
    { id: '3', name: 'Vaishnavi Peri', role: 'Regular Staff', branch: 'Nallagandla', hours: '9.5 hrs/day', salary: '₹17,000', phone: '9132176176' },
    { id: '4', name: 'Nandini Gottelli', role: 'Regular Staff', branch: 'Dilshuknagar', hours: '8 hrs/day', salary: '₹15,000', phone: '9804176176' },
    { id: '5', name: 'Srikanth', role: 'Regular Staff', branch: 'KPHB', hours: '10 hrs/day', salary: '₹18,000', phone: '9030176176' },
    { id: '6', name: 'Arun Kumar', role: 'Regular Staff', branch: 'Nallagandla', hours: '8 hrs/day', salary: '₹14,000', phone: '9132176176' },
    { id: '7', name: 'Aishwarya . M', role: 'Regular Staff', branch: 'KPHB', hours: '10.5 hrs/day', salary: '₹14,000', phone: '7995532759' },
  ];

  // Seed Data for Doctors
  const DEFAULT_DOCTORS = [
    { id: 'doc-prashanth', name: 'Dr. Prashanth k vaidya', role: 'Head Doctor', category: 'Head Doctor', phone: '8125260176', mobile: '8125260176', branch: 'KPHB Branch', shift: '-', hours: '-', salary: '-' },
    { id: 'doc-jobedah', name: 'Dr. Jobeadh parveej', role: 'Head Doctor', category: 'Head Doctor', phone: '9903119766', mobile: '9903119766', branch: 'Nallagandla Branch', shift: '-', hours: '-', salary: '-' },
    { id: 'doc-padma', name: 'Dr. Padma priya', role: 'Employee Doctor', category: 'Employee Doctor', phone: '9490808582', mobile: '9490808582', branch: 'Chandanagar Branch', shift: '10:00 AM - 08:00 PM', hours: '10 hrs/day', salary: '₹95,000' },
    { id: 'doc-ramakrishna', name: 'Dr. Ramakrishna Chanduri', role: 'Head Doctor', category: 'Head Doctor', phone: '1111111111', mobile: '1111111111', branch: 'Dilshuknagar Branch', shift: '-', hours: '-', salary: '-' },
  ];

  const [liveStaffMembers, setLiveStaffMembers] = useState<any[]>(DEFAULT_STAFF);
  const [liveDoctors, setLiveDoctors] = useState<any[]>(DEFAULT_DOCTORS);

  // Firestore Listener: Staff Collection
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
            phone: data.mobile || data.phone || '',
            shift: data.shift || '10:00 AM - 08:30 PM',
            hours: data.hours || '8 hrs/day',
            salary: data.salary || '₹18,000'
          };
        });
        setLiveStaffMembers(loaded);
      }
    }, (err) => console.warn('Firestore mobile staff listener error:', err));
    return () => unsub();
  }, []);

  // Firestore Listener: Doctors Collection
  useEffect(() => {
    if (!db) return;
    const docColRef = collection(db, 'doctors');
    const unsub = onSnapshot(docColRef, async (snap) => {
      if (!snap.empty) {
        const loaded = snap.docs.map(d => {
          const data = d.data();
          const category = data.category || (data.role?.includes('Employee') ? 'Employee Doctor' : 'Head Doctor');
          return {
            id: d.id,
            name: data.name || 'Doctor',
            role: category,
            category: category,
            phone: data.mobile || data.phone || '0000000000',
            mobile: data.mobile || data.phone || '0000000000',
            branch: data.branch || 'Medical Center',
            shift: category === 'Head Doctor' ? '-' : (data.shift || '-'),
            hours: category === 'Head Doctor' ? '-' : (data.hours || '-'),
            salary: category === 'Head Doctor' ? '-' : (data.salary || '-')
          };
        });
        setLiveDoctors(loaded);
      } else {
        // Seed initial doctors into Firestore
        try {
          for (const docItem of DEFAULT_DOCTORS) {
            await setDoc(doc(db, 'doctors', docItem.id), docItem);
          }
        } catch (e) {
          console.warn('Seed mobile doctors notice:', e);
        }
      }
    }, (err) => console.warn('Firestore mobile doctors listener error:', err));
    return () => unsub();
  }, []);

  // STAFF ACTIONS
  const handleDeleteStaff = (staffId?: string, staffName?: string) => {
    Alert.alert(
      'Delete Staff Member',
      `Are you sure you want to delete ${staffName || 'this staff member'}?\n\nTheir login access will be immediately revoked across both Web and Mobile App.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete & Revoke Access',
          style: 'destructive',
          onPress: async () => {
            if (staffId && db) {
              try {
                await deleteDoc(doc(db, 'staff', staffId));
              } catch (e) {
                console.warn('Error deleting staff from Firestore:', e);
              }
            }
            setLiveStaffMembers(prev => prev.filter(s => s.id !== staffId && s.name !== staffName));
            Alert.alert('Deleted', `${staffName} has been deleted and their login access is revoked.`);
          }
        }
      ]
    );
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

  const handleSaveStaff = async () => {
    if (!newStaffName.trim() || !newStaffPhone.trim()) {
      Alert.alert('Required Fields', 'Please enter staff name and phone number.');
      return;
    }

    const cleanPhone = newStaffPhone.trim().replace(/\D/g, '');
    const salaryFormatted = newStaffSalary.trim().startsWith('₹') ? newStaffSalary.trim() : `₹${newStaffSalary.trim()}`;

    const staffData = {
      name: newStaffName.trim(),
      mobile: cleanPhone,
      phone: cleanPhone,
      branch: newStaffBranch,
      shift: newStaffShift.trim() || '10:00 AM - 08:30 PM',
      hours: newStaffHours.trim() || '10.5 hrs/day',
      salary: salaryFormatted || '₹18,000',
      role: 'Regular Staff',
      updatedAt: new Date().toISOString()
    };

    if (showEditStaffModal && editingStaffId && db) {
      try {
        await updateDoc(doc(db, 'staff', editingStaffId), staffData);
        setLiveStaffMembers(prev => prev.map(s => s.id === editingStaffId ? { id: editingStaffId, ...staffData } : s));
        setShowEditStaffModal(false);
        Alert.alert('Updated', `${staffData.name} details updated.`);
      } catch (e) {
        console.warn('Error updating staff:', e);
      }
    } else {
      let newId = Date.now().toString();
      if (db) {
        try {
          const docRef = await addDoc(collection(db, 'staff'), { ...staffData, createdAt: new Date().toISOString() });
          newId = docRef.id;
        } catch (e) {
          console.warn('Error saving staff to Firestore:', e);
        }
      }
      setLiveStaffMembers(prev => [{ id: newId, ...staffData }, ...prev]);
      setShowAddStaffModal(false);
      Alert.alert('Staff Added', `${staffData.name} has been added. They can now log in immediately via SMS OTP.`);
    }

    setNewStaffName('');
    setNewStaffPhone('');
    setNewStaffSalary('₹18,000');
  };

  // DOCTOR ACTIONS
  const handleDeleteDoctor = (docId?: string, docName?: string) => {
    Alert.alert(
      'Delete Doctor',
      `Are you sure you want to delete ${docName || 'this doctor'}?\n\nTheir login access will be immediately revoked across both Web and Mobile App.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete & Revoke Access',
          style: 'destructive',
          onPress: async () => {
            if (docId && db) {
              try {
                await deleteDoc(doc(db, 'doctors', docId));
              } catch (e) {
                console.warn('Error deleting doctor from Firestore:', e);
              }
            }
            setLiveDoctors(prev => prev.filter(d => d.id !== docId && d.name !== docName));
            Alert.alert('Deleted', `${docName} has been deleted and their login access is revoked.`);
          }
        }
      ]
    );
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

  const handleSaveDoctor = async () => {
    if (!newDocName.trim() || !newDocPhone.trim()) {
      Alert.alert('Required Fields', 'Please enter doctor name and phone number.');
      return;
    }

    const cleanPhone = newDocPhone.trim().replace(/\D/g, '');
    const isHead = newDocCategory === 'Head Doctor';
    const salaryFormatted = isHead ? '-' : (newDocSalary.trim().startsWith('₹') ? newDocSalary.trim() : `₹${newDocSalary.trim()}`);

    const doctorData = {
      name: newDocName.trim(),
      mobile: cleanPhone,
      phone: cleanPhone,
      role: newDocCategory,
      category: newDocCategory,
      branch: newDocBranch,
      shift: isHead ? '-' : (newDocShift.trim() || '10:00 AM - 08:00 PM'),
      hours: isHead ? '-' : (newDocHours.trim() || '10 hrs/day'),
      salary: salaryFormatted,
      updatedAt: new Date().toISOString()
    };

    if (showEditDocModal && editingDocId && db) {
      try {
        await updateDoc(doc(db, 'doctors', editingDocId), doctorData);
        setLiveDoctors(prev => prev.map(d => d.id === editingDocId ? { id: editingDocId, ...doctorData } : d));
        setShowEditDocModal(false);
        Alert.alert('Updated', `${doctorData.name} details updated.`);
      } catch (e) {
        console.warn('Error updating doctor:', e);
      }
    } else {
      let newId = Date.now().toString();
      if (db) {
        try {
          const docRef = await addDoc(collection(db, 'doctors'), { ...doctorData, createdAt: new Date().toISOString() });
          newId = docRef.id;
        } catch (e) {
          console.warn('Error saving doctor to Firestore:', e);
        }
      }
      setLiveDoctors(prev => [{ id: newId, ...doctorData }, ...prev]);
      setShowAddDocModal(false);
      Alert.alert('Doctor Added', `${doctorData.name} has been added. They can now log in immediately via SMS OTP.`);
    }

    setNewDocName('');
    setNewDocPhone('');
    setNewDocSalary('₹95,000');
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
      {/* Title Header */}
      <Text style={styles.title}>Staff & Doctors Management</Text>
      <Text style={styles.subTitle}>Manage clinic staff, doctors, and branch schedules with real-time access control.</Text>

      {/* 3 Sub-Category Selector Buttons */}
      <View style={styles.selectorRow}>
        {[
          { id: 'staff', label: 'Staff Members' },
          { id: 'reception', label: 'Reception Desk' },
          { id: 'doctors', label: 'Doctors Directory' },
        ].map(cat => (
          <TouchableOpacity
            key={cat.id}
            style={[styles.selectorBtn, staffCategory === cat.id && styles.selectorBtnActive]}
            onPress={() => setStaffCategory(cat.id as any)}
          >
            <Text style={[styles.selectorText, staffCategory === cat.id && styles.selectorTextActive]}>
              {cat.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* VIEW 1: STAFF MEMBERS (ALL CLINIC STAFF) */}
      {staffCategory === 'staff' && (
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View>
              <Text style={styles.cardTitle}>Clinic Staff Members</Text>
              <Text style={styles.badgeText}>{liveStaffMembers.length} Active Staff</Text>
            </View>
            <TouchableOpacity
              style={{
                backgroundColor: '#258ec8',
                paddingHorizontal: 10,
                paddingVertical: 6,
                borderRadius: 8,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 4
              }}
              onPress={() => {
                setNewStaffName('');
                setNewStaffPhone('');
                setNewStaffSalary('₹18,000');
                setShowAddStaffModal(true);
              }}
            >
              <Ionicons name="add-circle-outline" size={14} color="#ffffff" />
              <Text style={{ color: '#ffffff', fontSize: 11.5, fontWeight: '800' }}>+ Add Staff</Text>
            </TouchableOpacity>
          </View>

          {liveStaffMembers.map(s => (
            <View key={s.id || s.name} style={styles.itemBox}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={styles.itemTitle}>{s.name} ({s.branch})</Text>
                <View style={{ flexDirection: 'row', gap: 6 }}>
                  <TouchableOpacity
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 2,
                      backgroundColor: '#f1f5f9',
                      paddingHorizontal: 8,
                      paddingVertical: 4,
                      borderRadius: 6,
                      borderWidth: 1,
                      borderColor: '#cbd5e1'
                    }}
                    onPress={() => handleOpenEditStaff(s)}
                  >
                    <Ionicons name="create-outline" size={12} color="#475569" />
                    <Text style={{ fontSize: 11, fontWeight: '700', color: '#475569' }}>Edit</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 2,
                      backgroundColor: '#fef2f2',
                      paddingHorizontal: 8,
                      paddingVertical: 4,
                      borderRadius: 6,
                      borderWidth: 1,
                      borderColor: '#fee2e2'
                    }}
                    onPress={() => handleDeleteStaff(s.id, s.name)}
                  >
                    <Ionicons name="trash-outline" size={12} color="#ef4444" />
                    <Text style={{ fontSize: 11, fontWeight: '700', color: '#ef4444' }}>Delete</Text>
                  </TouchableOpacity>
                </View>
              </View>
              {s.phone ? (
                <Text style={{ fontSize: 11.5, color: '#0284c7', fontWeight: '600', marginTop: 2 }}>Phone: +91 {s.phone}</Text>
              ) : null}
              <Text style={styles.itemRole}>Role: {s.role}</Text>
              <View style={styles.itemDetailsRow}>
                <Text style={styles.hoursText}>Hours: {s.hours}</Text>
                <Text style={styles.salaryText}>{s.salary}</Text>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* VIEW 2: RECEPTION DESK (OFFICIAL CLINIC BRANCHES ONLY) */}
      {staffCategory === 'reception' && (
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Official Clinic Branches</Text>
            <Text style={[styles.badgeText, { color: '#258ec8' }]}>4 Active Branches</Text>
          </View>

          {[
            { branch: 'KPHB Branch', phone: '90301 76176', hours: '10:00 AM - 08:30 PM' },
            { branch: 'Nallagandla Branch', phone: '91321 76176', hours: '10:00 AM - 08:30 PM' },
            { branch: 'Dilshuknagar Branch', phone: '98041 76176', hours: '10:00 AM - 08:30 PM' },
            { branch: 'Chandanagar Branch', phone: '95531 76176', hours: '10:00 AM - 08:00 PM' },
          ].map(b => (
            <View key={b.branch} style={styles.receptionBox}>
              <Text style={styles.itemTitle}>{b.branch}</Text>
              <Text style={styles.receptionPhone}>Contact: +91 {b.phone}</Text>
              <Text style={styles.hoursText}>Hours: {b.hours}</Text>
            </View>
          ))}
        </View>
      )}

      {/* VIEW 3: DOCTORS DIRECTORY */}
      {staffCategory === 'doctors' && (
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View>
              <Text style={styles.cardTitle}>Doctors Directory</Text>
              <Text style={[styles.badgeText, { color: '#9333ea' }]}>{liveDoctors.length} Doctors</Text>
            </View>
            <TouchableOpacity
              style={{
                backgroundColor: '#9333ea',
                paddingHorizontal: 10,
                paddingVertical: 6,
                borderRadius: 8,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 4
              }}
              onPress={() => {
                setNewDocName('');
                setNewDocPhone('');
                setNewDocSalary('₹95,000');
                setShowAddDocModal(true);
              }}
            >
              <Ionicons name="add-circle-outline" size={14} color="#ffffff" />
              <Text style={{ color: '#ffffff', fontSize: 11.5, fontWeight: '800' }}>+ Add Doctor</Text>
            </TouchableOpacity>
          </View>

          {liveDoctors.map(doc => {
            const isHeadDoc = doc.category === 'Head Doctor' || doc.role === 'Head Doctor';
            return (
              <View
                key={doc.id || doc.name}
                style={[
                  styles.doctorBox,
                  { backgroundColor: '#ffffff', borderColor: '#e2e8f0' }
                ]}
              >
                <View style={styles.itemHeaderRow}>
                  <Text style={styles.itemTitle}>{doc.name}</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text
                      style={[
                        styles.categoryTag,
                        { color: isHeadDoc ? '#258ec8' : '#9333ea', backgroundColor: isHeadDoc ? '#eef5fc' : '#faf5ff' }
                      ]}
                    >
                      {doc.role}
                    </Text>
                    <TouchableOpacity
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 2,
                        backgroundColor: '#f1f5f9',
                        paddingHorizontal: 6,
                        paddingVertical: 3,
                        borderRadius: 6,
                        borderWidth: 1,
                        borderColor: '#cbd5e1'
                      }}
                      onPress={() => handleOpenEditDoctor(doc)}
                    >
                      <Ionicons name="create-outline" size={11} color="#475569" />
                      <Text style={{ fontSize: 10.5, fontWeight: '700', color: '#475569' }}>Edit</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 2,
                        backgroundColor: '#fef2f2',
                        paddingHorizontal: 6,
                        paddingVertical: 3,
                        borderRadius: 6,
                        borderWidth: 1,
                        borderColor: '#fee2e2'
                      }}
                      onPress={() => handleDeleteDoctor(doc.id, doc.name)}
                    >
                      <Ionicons name="trash-outline" size={11} color="#ef4444" />
                      <Text style={{ fontSize: 10.5, fontWeight: '700', color: '#ef4444' }}>Delete</Text>
                    </TouchableOpacity>
                  </View>
                </View>
                <Text style={styles.receptionPhone}>Phone: +91 {doc.phone || doc.mobile}</Text>

                <View style={[styles.doctorFooterRow, { borderTopColor: '#f1f5f9' }]}>
                  <Text style={styles.metaLabel}>Branch: <Text style={styles.metaVal}>{doc.branch || 'All Branches'}</Text></Text>
                  <Text style={styles.metaLabel}>Shift: <Text style={styles.metaVal}>{isHeadDoc ? '-' : doc.shift}</Text></Text>
                  <Text style={styles.metaLabel}>Salary: <Text style={styles.metaValBold}>{isHeadDoc ? '-' : doc.salary}</Text></Text>
                </View>
              </View>
            );
          })}
        </View>
      )}

      {/* MODAL 1: ADD / EDIT STAFF */}
      <Modal visible={showAddStaffModal || showEditStaffModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeaderRow}>
              <View>
                <Text style={styles.modalTitle}>{showEditStaffModal ? 'Edit Staff Member' : 'Add New Staff Member'}</Text>
                <Text style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>Enabled for instant SMS OTP login</Text>
              </View>
              <TouchableOpacity onPress={() => { setShowAddStaffModal(false); setShowEditStaffModal(false); }}>
                <Ionicons name="close" size={22} color="#64748b" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 16 }}>
              <Text style={styles.fieldLabel}>Full Name *</Text>
              <View style={styles.inputBox}>
                <TextInput
                  style={styles.inputText}
                  placeholder="e.g. Ramesh Reddy"
                  placeholderTextColor="#94a3b8"
                  value={newStaffName}
                  onChangeText={setNewStaffName}
                />
              </View>

              <Text style={styles.fieldLabel}>Mobile / Phone Number *</Text>
              <View style={styles.inputBox}>
                <TextInput
                  style={styles.inputText}
                  placeholder="e.g. 9876543210"
                  keyboardType="phone-pad"
                  placeholderTextColor="#94a3b8"
                  value={newStaffPhone}
                  onChangeText={setNewStaffPhone}
                />
              </View>

              <Text style={styles.fieldLabel}>Branch Assignment</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginVertical: 6 }}>
                {['KPHB', 'Nallagandla', 'Dilshuknagar', 'Chandanagar'].map(br => (
                  <TouchableOpacity
                    key={br}
                    style={[styles.chipBtn, newStaffBranch === br && styles.chipBtnActive]}
                    onPress={() => setNewStaffBranch(br)}
                  >
                    <Text style={[styles.chipBtnText, newStaffBranch === br && styles.chipBtnTextActive]}>{br}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.fieldLabel}>Shift Hours</Text>
              <View style={styles.inputBox}>
                <TextInput
                  style={styles.inputText}
                  placeholder="10:00 AM - 08:30 PM"
                  placeholderTextColor="#94a3b8"
                  value={newStaffShift}
                  onChangeText={setNewStaffShift}
                />
              </View>

              <Text style={styles.fieldLabel}>Daily Hours</Text>
              <View style={styles.inputBox}>
                <TextInput
                  style={styles.inputText}
                  placeholder="10.5 hrs/day"
                  placeholderTextColor="#94a3b8"
                  value={newStaffHours}
                  onChangeText={setNewStaffHours}
                />
              </View>

              <Text style={styles.fieldLabel}>Monthly Salary</Text>
              <View style={styles.inputBox}>
                <TextInput
                  style={styles.inputText}
                  placeholder="₹18,000"
                  placeholderTextColor="#94a3b8"
                  value={newStaffSalary}
                  onChangeText={setNewStaffSalary}
                />
              </View>

              <TouchableOpacity style={styles.saveBtn} onPress={handleSaveStaff}>
                <Text style={styles.saveBtnText}>{showEditStaffModal ? 'Update Staff Member' : 'Save & Enable Login'}</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* MODAL 2: ADD / EDIT DOCTOR */}
      <Modal visible={showAddDocModal || showEditDocModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeaderRow}>
              <View>
                <Text style={styles.modalTitle}>{showEditDocModal ? 'Edit Doctor' : 'Add New Doctor'}</Text>
                <Text style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>Enabled for instant SMS OTP doctor login</Text>
              </View>
              <TouchableOpacity onPress={() => { setShowAddDocModal(false); setShowEditDocModal(false); }}>
                <Ionicons name="close" size={22} color="#64748b" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 16 }}>
              <Text style={styles.fieldLabel}>Doctor Full Name *</Text>
              <View style={styles.inputBox}>
                <TextInput
                  style={styles.inputText}
                  placeholder="e.g. Dr. Ramesh Homeo Specialist"
                  placeholderTextColor="#94a3b8"
                  value={newDocName}
                  onChangeText={setNewDocName}
                />
              </View>

              <Text style={styles.fieldLabel}>Mobile / Phone Number * (Used for Doctor SMS OTP)</Text>
              <View style={styles.inputBox}>
                <TextInput
                  style={styles.inputText}
                  placeholder="e.g. 9876543210"
                  keyboardType="phone-pad"
                  placeholderTextColor="#94a3b8"
                  value={newDocPhone}
                  onChangeText={setNewDocPhone}
                />
              </View>

              <Text style={styles.fieldLabel}>Doctor Category</Text>
              <View style={{ flexDirection: 'row', gap: 6, marginVertical: 6 }}>
                {(['Head Doctor', 'Employee Doctor'] as const).map(cat => (
                  <TouchableOpacity
                    key={cat}
                    style={[styles.chipBtn, newDocCategory === cat && styles.chipBtnActivePurple]}
                    onPress={() => setNewDocCategory(cat)}
                  >
                    <Text style={[styles.chipBtnText, newDocCategory === cat && styles.chipBtnTextActivePurple]}>{cat}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.fieldLabel}>Branch Location</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginVertical: 6 }}>
                {['KPHB Branch', 'Nallagandla Branch', 'Dilshuknagar Branch', 'Chandanagar Branch', 'All Branches'].map(br => (
                  <TouchableOpacity
                    key={br}
                    style={[styles.chipBtn, newDocBranch === br && styles.chipBtnActivePurple]}
                    onPress={() => setNewDocBranch(br)}
                  >
                    <Text style={[styles.chipBtnText, newDocBranch === br && styles.chipBtnTextActivePurple]}>{br}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {newDocCategory === 'Employee Doctor' && (
                <>
                  <Text style={styles.fieldLabel}>Shift Hours</Text>
                  <View style={styles.inputBox}>
                    <TextInput
                      style={styles.inputText}
                      placeholder="10:00 AM - 08:00 PM"
                      placeholderTextColor="#94a3b8"
                      value={newDocShift}
                      onChangeText={setNewDocShift}
                    />
                  </View>

                  <Text style={styles.fieldLabel}>Daily Hours</Text>
                  <View style={styles.inputBox}>
                    <TextInput
                      style={styles.inputText}
                      placeholder="10 hrs/day"
                      placeholderTextColor="#94a3b8"
                      value={newDocHours}
                      onChangeText={setNewDocHours}
                    />
                  </View>

                  <Text style={styles.fieldLabel}>Monthly Salary</Text>
                  <View style={styles.inputBox}>
                    <TextInput
                      style={styles.inputText}
                      placeholder="₹95,000"
                      placeholderTextColor="#94a3b8"
                      value={newDocSalary}
                      onChangeText={setNewDocSalary}
                    />
                  </View>
                </>
              )}

              <TouchableOpacity style={[styles.saveBtn, { backgroundColor: '#9333ea' }]} onPress={handleSaveDoctor}>
                <Text style={styles.saveBtnText}>{showEditDocModal ? 'Update Doctor' : 'Save & Enable Doctor Login'}</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc', padding: 16 },
  title: { fontSize: 18, fontWeight: '800', color: '#0f172a' },
  subTitle: { fontSize: 12, color: '#64748b', marginTop: 2, marginBottom: 14 },
  selectorRow: { flexDirection: 'row', gap: 6, marginBottom: 14 },
  selectorBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#cbd5e1'
  },
  selectorBtnActive: { backgroundColor: '#258ec8', borderColor: '#258ec8' },
  selectorText: { fontSize: 11.5, fontWeight: '700', color: '#475569' },
  selectorTextActive: { color: '#ffffff', fontWeight: '800' },
  card: { backgroundColor: '#ffffff', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#e2e8f0', marginBottom: 16 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  cardTitle: { fontSize: 15, fontWeight: '800', color: '#0f172a' },
  badgeText: { fontSize: 11, fontWeight: '800', color: '#258ec8' },
  itemBox: { backgroundColor: '#f8fafc', padding: 12, borderRadius: 12, marginBottom: 10, borderWidth: 1, borderColor: '#e2e8f0' },
  receptionBox: { backgroundColor: '#ffffff', padding: 12, borderRadius: 12, marginBottom: 10, borderWidth: 1, borderColor: '#cbd5e1' },
  doctorBox: { backgroundColor: '#ffffff', padding: 12, borderRadius: 12, marginBottom: 10, borderWidth: 1, borderColor: '#e2e8f0' },
  itemHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  itemTitle: { fontSize: 13.5, fontWeight: '800', color: '#0f172a' },
  itemRole: { fontSize: 11.5, color: '#64748b', marginTop: 2 },
  receptionPhone: { fontSize: 11.5, color: '#258ec8', fontWeight: '700', marginTop: 3 },
  itemDetailsRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 },
  hoursText: { fontSize: 11.5, color: '#16a34a', fontWeight: '700' },
  salaryText: { fontSize: 12.5, color: '#0f172a', fontWeight: '800' },
  categoryTag: { fontSize: 10.5, fontWeight: '800', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  doctorFooterRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8, paddingTop: 6, borderTopWidth: 1, borderTopColor: '#f1f5f9' },
  metaLabel: { fontSize: 11, color: '#64748b', fontWeight: '600' },
  metaVal: { color: '#0f172a', fontWeight: '700' },
  metaValBold: { color: '#0f172a', fontWeight: '800' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.6)', justifyContent: 'center', alignItems: 'center', padding: 16 },
  modalCard: { width: '100%', maxWidth: 450, maxHeight: '85%', backgroundColor: '#ffffff', borderRadius: 18, padding: 18, borderWidth: 1, borderColor: '#e2e8f0' },
  modalHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  modalTitle: { fontSize: 16, fontWeight: '800', color: '#0f172a' },
  fieldLabel: { fontSize: 12, fontWeight: '700', color: '#475569', marginTop: 10, marginBottom: 4 },
  inputBox: { backgroundColor: '#f8fafc', borderRadius: 10, borderWidth: 1, borderColor: '#cbd5e1', paddingHorizontal: 12, paddingVertical: 8 },
  inputText: { fontSize: 13, color: '#0f172a', padding: 0 },
  chipBtn: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, backgroundColor: '#f1f5f9', borderWidth: 1, borderColor: '#cbd5e1' },
  chipBtnActive: { backgroundColor: '#e0f2fe', borderColor: '#0284c7' },
  chipBtnActivePurple: { backgroundColor: '#faf5ff', borderColor: '#9333ea' },
  chipBtnText: { fontSize: 11, fontWeight: '700', color: '#64748b' },
  chipBtnTextActive: { color: '#0284c7', fontWeight: '800' },
  chipBtnTextActivePurple: { color: '#9333ea', fontWeight: '800' },
  saveBtn: { backgroundColor: '#258ec8', paddingVertical: 12, borderRadius: 10, alignItems: 'center', marginTop: 18 },
  saveBtnText: { color: '#ffffff', fontSize: 13.5, fontWeight: '800' },
});
