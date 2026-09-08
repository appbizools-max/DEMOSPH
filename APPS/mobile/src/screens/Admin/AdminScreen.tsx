import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, TextInput, Alert, Modal } from 'react-native';
import { Ionicons, Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { collection, onSnapshot, addDoc } from 'firebase/firestore';
import { db } from '@app/shared';
import { DoctorTimingsScreen } from './DoctorTimings/DoctorTimingsScreen';
import { ManageBranchesScreen } from './ManageBranches/ManageBranchesScreen';

interface AdminScreenProps {
  currentTab?: string;
}

export const AdminScreen: React.FC<AdminScreenProps> = ({ currentTab }) => {
  const normalizeTab = (tabStr?: string) => {
    if (!tabStr) return 'analytics';
    if (tabStr === 'admin_staff' || tabStr === 'staff') return 'staff';
    if (tabStr === 'admin_doctors' || tabStr === 'doctors') return 'doctors';
    if (tabStr === 'admin_branches' || tabStr === 'branches') return 'branches';
    if (tabStr === 'admin_patients' || tabStr === 'patients') return 'patients';
    if (tabStr === 'admin_packages' || tabStr === 'package_members') return 'package_members';
    if (tabStr === 'admin_banners' || tabStr === 'banners') return 'banners';
    if (tabStr === 'admin_medicines' || tabStr === 'medicine') return 'medicine';
    if (tabStr === 'admin_revenue' || tabStr === 'admin_pending' || tabStr === 'admin' || tabStr === 'analytics') return 'analytics';
    return 'analytics';
  };

  const [activeTab, setActiveTab] = useState<'analytics' | 'package_members' | 'banners' | 'branches' | 'patients' | 'doctors' | 'staff' | 'medicine'>(() => normalizeTab(currentTab));

  useEffect(() => {
    if (currentTab) {
      setActiveTab(normalizeTab(currentTab));
    }
  }, [currentTab]);
  const [staffCategory, setStaffCategory] = useState<'staff' | 'reception' | 'doctors'>('staff');

  const DEFAULT_STAFF = [
    { name: 'Anil Kumar M', role: 'Regular Staff', branch: 'KPHB', hours: '10.5 hrs/day', salary: '₹22,000' },
    { name: 'Ashwini Begari', role: 'Regular Staff', branch: 'Chandanagar', hours: '8.5 hrs/day', salary: '₹17,000' },
    { name: 'Vaishnavi Peri', role: 'Regular Staff', branch: 'Nallagandla', hours: '9.5 hrs/day', salary: '₹17,000' },
    { name: 'Nandini Gottelli', role: 'Regular Staff', branch: 'Dilshuknagar', hours: '8 hrs/day', salary: '₹15,000' },
    { name: 'Srikanth', role: 'Regular Staff', branch: 'KPHB', hours: '10 hrs/day', salary: '₹18,000' },
    { name: 'Arun Kumar', role: 'Regular Staff', branch: 'Nallagandla', hours: '8 hrs/day', salary: '₹14,000' },
  ];

  const [liveStaffMembers, setLiveStaffMembers] = useState(DEFAULT_STAFF);

  useEffect(() => {
    if (!db) return;
    const colRef = collection(db, 'staff');
    const unsub = onSnapshot(colRef, (snap) => {
      if (!snap.empty) {
        const loaded = snap.docs.map(d => {
          const data = d.data();
          return {
            name: data.name || 'Staff Member',
            phone: data.mobile || data.phone || '-',
            role: data.role || 'Regular Staff',
            branch: data.branch || 'KPHB',
            shift: data.shift || '10:00 AM - 08:30 PM',
            hours: data.hours || '8.5 hrs/day',
            salary: data.salary || '₹18,000'
          };
        });
        setLiveStaffMembers(loaded);
      }
    }, (err) => console.warn('Firestore mobile staff listener error:', err));
    return () => unsub();
  }, []);

  const DEFAULT_DOCTORS = [
    { name: 'Dr. Prashanth k vaidya', role: 'Head Doctor', category: 'Head Doctor', phone: '8125260176', shift: '-', hours: '-', salary: '-' },
    { name: 'Dr. Jobeadh parveej', role: 'Head Doctor', category: 'Head Doctor', phone: '9903119766', shift: '-', hours: '-', salary: '-' },
    { name: 'Dr. Padma priya', role: 'Employee Doctor', category: 'Employee Doctor', phone: '9490808582', shift: '10:00 AM - 08:00 PM', hours: '10 hrs/day', salary: '₹95,000' },
    { name: 'Dr. Ramakrishna chanduri', role: 'Head Doctor', category: 'Head Doctor', phone: '1111111111', shift: '-', hours: '-', salary: '-' },
  ];

  const [liveDoctors, setLiveDoctors] = useState(DEFAULT_DOCTORS);

  useEffect(() => {
    if (!db) return;
    const docColRef = collection(db, 'doctors');
    const unsub = onSnapshot(docColRef, (snap) => {
      if (!snap.empty) {
        const loaded = snap.docs.map(d => {
          const data = d.data();
          const category = data.category || (data.role?.includes('Employee') ? 'Employee Doctor' : 'Head Doctor');
          return {
            name: data.name || 'Doctor',
            role: category,
            category: category,
            phone: data.mobile || data.phone || '0000000000',
            shift: category === 'Head Doctor' ? '-' : (data.shift || '-'),
            hours: category === 'Head Doctor' ? '-' : (data.hours || '-'),
            salary: category === 'Head Doctor' ? '-' : (data.salary || '-')
          };
        });
        setLiveDoctors(loaded);
      }
    }, (err) => console.warn('Firestore mobile doctors listener error:', err));
    return () => unsub();
  }, []);

  // Add Staff Modal state
  const [showAddStaffModal, setShowAddStaffModal] = useState(false);
  const [newStaffName, setNewStaffName] = useState('');
  const [newStaffPhone, setNewStaffPhone] = useState('');
  const [newStaffBranch, setNewStaffBranch] = useState('KPHB');
  const [newStaffSalary, setNewStaffSalary] = useState('');
  const [staffShiftType, setStaffShiftType] = useState<'Single Strict' | 'Multi Strict'>('Single Strict');
  const [staffShiftSlots, setStaffShiftSlots] = useState([
    { loginTime: '10:00 AM', logoutTime: '08:30 PM' }
  ]);

  const parseTimeToMinutes = (timeStr: string) => {
    if (!timeStr) return 0;
    const match = timeStr.trim().match(/^(\d{1,2}):?(\d{2})?\s*(AM|PM)?$/i);
    if (!match) return 0;
    let h = parseInt(match[1]) || 0;
    let m = parseInt(match[2]) || 0;
    let ampm = match[3]?.toUpperCase();
    if (ampm === 'PM' && h < 12) h += 12;
    if (ampm === 'AM' && h === 12) h = 0;
    return h * 60 + m;
  };

  const getCalculatedDailyHours = () => {
    let totalMins = 0;
    staffShiftSlots.forEach(s => {
      let startMins = parseTimeToMinutes(s.loginTime || '10:00 AM');
      let endMins = parseTimeToMinutes(s.logoutTime || '08:30 PM');
      if (endMins > startMins) {
        totalMins += (endMins - startMins);
      }
    });
    if (totalMins <= 0) return '8.5 hrs/day';
    const hrs = (totalMins / 60).toFixed(1);
    return `${hrs.endsWith('.0') ? hrs.slice(0, -2) : hrs} hrs/day`;
  };

  const getFormattedShiftString = () => {
    return staffShiftSlots.map(s => `${s.loginTime || '10:00 AM'} - ${s.logoutTime || '08:30 PM'}`).join(' & ');
  };

  // Add Doctor Modal state
  const [showAddDoctorModal, setShowAddDoctorModal] = useState(false);
  const [newDocCategory, setNewDocCategory] = useState<'Head Doctor' | 'Employee Doctor'>('Head Doctor');
  const [newDocName, setNewDocName] = useState('');
  const [newDocPhone, setNewDocPhone] = useState('');
  const [newDocShift, setNewDocShift] = useState('');
  const [newDocHours, setNewDocHours] = useState('');
  const [newDocSalary, setNewDocSalary] = useState('');

  const handleSaveNewStaff = async () => {
    if (!newStaffName.trim() || !newStaffPhone.trim()) {
      Alert.alert('Required Fields', 'Please enter staff name and mobile number.');
      return;
    }
    const calculatedHours = getCalculatedDailyHours();
    const formattedShift = getFormattedShiftString();
    const formattedSalary = newStaffSalary.trim() ? `₹${newStaffSalary.trim().replace(/^₹/, '')}` : '₹18,000';

    const staffData = {
      name: newStaffName.trim(),
      phone: newStaffPhone.trim(),
      mobile: newStaffPhone.trim(),
      role: 'Regular Staff',
      branch: newStaffBranch,
      shiftType: staffShiftType,
      shift: formattedShift,
      hours: calculatedHours,
      salary: formattedSalary,
      createdAt: new Date().toISOString()
    };
    if (db) {
      try {
        await addDoc(collection(db, 'staff'), staffData);
      } catch (e) {
        console.warn('Error saving staff:', e);
      }
    }
    setLiveStaffMembers(prev => [staffData, ...prev]);
    setNewStaffName('');
    setNewStaffPhone('');
    setNewStaffSalary('');
    setStaffShiftType('Single Strict');
    setStaffShiftSlots([
      { loginTime: '10:00 AM', logoutTime: '08:30 PM' }
    ]);
    setShowAddStaffModal(false);
    Alert.alert('Saved', `Staff Member ${staffData.name} added successfully.`);
  };

  const handleSaveNewDoctor = async () => {
    if (!newDocName.trim() || !newDocPhone.trim()) {
      Alert.alert('Required Fields', 'Please enter doctor name and mobile number.');
      return;
    }
    const isHead = newDocCategory === 'Head Doctor';
    const doctorData = {
      name: newDocName.trim(),
      category: newDocCategory,
      role: newDocCategory,
      mobile: newDocPhone.trim(),
      phone: newDocPhone.trim(),
      shift: isHead ? '-' : (newDocShift.trim() || '10:00 AM - 08:00 PM'),
      hours: isHead ? '-' : (newDocHours.trim() || '10 hrs/day'),
      salary: isHead ? '-' : (newDocSalary.trim() || '₹95,000'),
      createdAt: new Date().toISOString()
    };
    if (db) {
      try {
        await addDoc(collection(db, 'doctors'), doctorData);
      } catch (e) {
        console.warn('Error saving doctor:', e);
      }
    }
    setLiveDoctors(prev => [doctorData, ...prev]);
    setNewDocName('');
    setNewDocPhone('');
    setNewDocShift('');
    setNewDocHours('');
    setNewDocSalary('');
    setShowAddDoctorModal(false);
    Alert.alert('Saved', `${newDocCategory} ${doctorData.name} added successfully.`);
  };

  // Medicine Edit Form
  const [medName, setMedName] = useState('');
  const [medPotency, setMedPotency] = useState('200C');
  const [medStock, setMedStock] = useState('150');

  const branchesData = [
    { name: 'KPHB Branch', phone: '+91 90301 76176', target: '₹12,00,000', achieved: '₹9,80,000' },
    { name: 'Nallagandla Branch', phone: '+91 91321 76176', target: '₹10,00,000', achieved: '₹8,40,000' },
    { name: 'Dilshuknagar Branch', phone: '+91 98041 76176', target: '₹14,00,000', achieved: '₹11,50,000' },
    { name: 'Chandanagar Branch', phone: '+91 95531 76176', target: '₹9,00,000', achieved: '₹7,20,000' },
  ];

  const handleSaveMedicine = () => {
    if (!medName) {
      Alert.alert('Required Field', 'Please enter medicine name.');
      return;
    }
    Alert.alert('Saved', `Medicine ${medName} saved successfully.`);
    setMedName('');
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 60 }} showsVerticalScrollIndicator={false}>

      {/* TAB 1: ANALYTICS & REVENUE */}
      {activeTab === 'analytics' && (
        <View style={{ gap: 12 }}>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>TOTAL REVENUE</Text>
            <Text style={styles.statVal}>₹36,90,000</Text>
            <Text style={styles.statSub}>+14.2% Growth vs Last Month</Text>
          </View>

          <View style={[styles.statCard, { borderColor: '#cbd5e1' }]}>
            <Text style={[styles.statLabel, { color: '#258ec8' }]}>PENDING PAYMENTS</Text>
            <Text style={[styles.statVal, { color: '#258ec8' }]}>₹1,45,000</Text>
            <Text style={styles.statSub}>12 Pending Patient Invoices</Text>
          </View>

          <View style={[styles.statCard, { borderColor: '#cbd5e1' }]}>
            <Text style={[styles.statLabel, { color: '#16a34a' }]}>NUTRITION REVENUE</Text>
            <Text style={[styles.statVal, { color: '#16a34a' }]}>₹4,85,000</Text>
            <Text style={styles.statSub}>Homeopathic Supplements & Wellness</Text>
          </View>
        </View>
      )}

      {/* TAB: PACKAGE MEMBERS */}
      {activeTab === 'package_members' && (
        <View style={{ gap: 10 }}>
          {[
            { name: 'Platinum Annual Wellness', price: '₹25,000/yr', members: 145 },
            { name: 'Classical Homeo Care Plan', price: '₹15,000/yr', members: 210 },
            { name: 'Pediatric Care Package', price: '₹12,000/yr', members: 98 },
            { name: 'Chronic Illness Wellness Plan', price: '₹18,000/yr', members: 175 },
          ].map(p => (
            <View key={p.name} style={styles.card}>
              <Text style={styles.cardTitle}>{p.name}</Text>
              <Text style={{ fontSize: 13, color: '#258ec8', fontWeight: '800', marginTop: 4 }}>Price: {p.price}</Text>
              <Text style={{ fontSize: 12, color: '#16a34a', fontWeight: '700', marginTop: 2 }}>{p.members} Active Package Members</Text>
            </View>
          ))}
        </View>
      )}

      {/* TAB: MANAGE BANNERS */}
      {activeTab === 'banners' && (
        <View style={{ gap: 10 }}>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>App Promotional Banners</Text>
            <Text style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>
              Active Banners: 3 Published (Festival Special, Free Consultation, Immunity Boost)
            </Text>
          </View>
        </View>
      )}

      {/* TAB 2: BRANCHES & TARGETS */}
      {activeTab === 'branches' && (
        <ManageBranchesScreen onBack={() => setActiveTab('analytics')} />
      )}

      {/* TAB 3: GLOBAL PATIENTS */}
      {activeTab === 'patients' && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Global Patients Summary</Text>
          <Text style={{ fontSize: 13, color: '#0f172a', fontWeight: '800', marginTop: 6 }}>
            Total Registered Patients: 1,250
          </Text>
          <Text style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>
            Packages: Platinum Annual Wellness, Classical Care, Pediatric Care
          </Text>
        </View>
      )}

      {/* TAB 4: DOCTOR TIMINGS */}
      {activeTab === 'doctors' && (
        <DoctorTimingsScreen />
      )}

      {/* TAB 5: STAFF & WORKING HOURS (3 CATEGORY SHIFT SELECTOR) */}
      {activeTab === 'staff' && (
        <View style={{ gap: 12 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
            <Text style={{ fontSize: 18, fontWeight: '800', color: '#0f172a' }}>Staff Management</Text>
            <TouchableOpacity
              style={{ backgroundColor: '#258ec8', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 }}
              onPress={() => setShowAddStaffModal(true)}
            >
              <Text style={{ color: '#ffffff', fontSize: 11.5, fontWeight: '800' }}>+ Add Staff</Text>
            </TouchableOpacity>
          </View>

          {/* Sub-Category Selector Pills */}
          <View style={{ flexDirection: 'row', gap: 6, marginBottom: 4 }}>
            {[
              { id: 'staff', label: 'Staff Members' },
              { id: 'reception', label: 'Reception Desk' },
              { id: 'doctors', label: 'Doctors Directory' },
            ].map(cat => (
              <TouchableOpacity
                key={cat.id}
                style={{
                  flex: 1,
                  paddingVertical: 8,
                  borderRadius: 10,
                  backgroundColor: staffCategory === cat.id ? '#258ec8' : '#ffffff',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderWidth: 1,
                  borderColor: staffCategory === cat.id ? '#258ec8' : '#cbd5e1'
                }}
                onPress={() => setStaffCategory(cat.id as any)}
              >
                <Text style={{ fontSize: 12, fontWeight: '800', color: staffCategory === cat.id ? '#ffffff' : '#475569' }}>
                  {cat.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Section 1: Staff Members (All Staff) */}
          {staffCategory === 'staff' && (
            <View style={styles.card}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' }}>
                <Text style={styles.cardTitle}>Clinic Staff Members</Text>
                <Text style={{ fontSize: 11, fontWeight: '700', color: '#258ec8' }}>{liveStaffMembers.length} Active Staff</Text>
              </View>

              {liveStaffMembers.map(s => (
                <View key={s.name} style={{ backgroundColor: '#ffffff', padding: 12, borderRadius: 12, marginBottom: 8, borderWidth: 1, borderColor: '#e2e8f0' }}>
                  <Text style={{ fontSize: 13.5, fontWeight: '800', color: '#0f172a' }}>{s.name} ({s.branch})</Text>
                  {(s as any).phone && (s as any).phone !== '-' && (
                    <Text style={{ fontSize: 11.5, color: '#258ec8', fontWeight: '600', marginTop: 4 }}>Phone: +91 {(s as any).phone}</Text>
                  )}
                  <View style={{ gap: 4, marginTop: 6, paddingTop: 6, borderTopWidth: 1, borderTopColor: '#f1f5f9' }}>
                    <Text style={{ fontSize: 11.5, color: '#258ec8', fontWeight: '700' }}>Shift: {(s as any).shift || '10:00 AM - 08:30 PM'}</Text>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text style={{ fontSize: 11.5, color: '#16a34a', fontWeight: '700' }}>Hours: {s.hours}</Text>
                      <Text style={{ fontSize: 12, color: '#0f172a', fontWeight: '800' }}>Salary: {s.salary}</Text>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          )}

          {/* Section 2: Reception Desk (Branch Desks Only) */}
          {staffCategory === 'reception' && (
            <View style={styles.card}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' }}>
                <Text style={styles.cardTitle}>Official Clinic Branches</Text>
                <Text style={{ fontSize: 11, fontWeight: '700', color: '#258ec8' }}>4 Active Branches</Text>
              </View>

              {[
                { branch: 'KPHB Branch', phone: '90301 76176', hours: '10:00 AM - 08:30 PM' },
                { branch: 'Nallagandla Branch', phone: '91321 76176', hours: '10:00 AM - 08:30 PM' },
                { branch: 'Dilshuknagar Branch', phone: '98041 76176', hours: '10:00 AM - 08:30 PM' },
                { branch: 'Chandanagar Branch', phone: '95531 76176', hours: '10:00 AM - 08:00 PM' },
              ].map(b => (
                <View key={b.branch} style={{ backgroundColor: '#ffffff', padding: 10, borderRadius: 10, marginBottom: 8, borderWidth: 1, borderColor: '#cbd5e1' }}>
                  <Text style={{ fontSize: 13, fontWeight: '800', color: '#0f172a' }}>{b.branch}</Text>
                  <Text style={{ fontSize: 11.5, color: '#258ec8', fontWeight: '700', marginVertical: 2 }}>Contact: +91 {b.phone}</Text>
                  <Text style={{ fontSize: 11.5, color: '#16a34a', fontWeight: '700' }}>Hours: {b.hours}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Section 3: Doctors Directory */}
          {staffCategory === 'doctors' && (
            <View style={styles.card}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' }}>
                <Text style={styles.cardTitle}>Doctors Directory</Text>
                <Text style={{ fontSize: 11, fontWeight: '700', color: '#16a34a' }}>{liveDoctors.length} Doctors</Text>
              </View>

              {liveDoctors.map(doc => {
                const isHeadDoc = doc.category === 'Head Doctor' || doc.role === 'Head Doctor';
                return (
                  <View key={doc.name} style={{ backgroundColor: '#ffffff', padding: 12, borderRadius: 12, marginBottom: 8, borderWidth: 1, borderColor: '#e2e8f0' }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text style={{ fontSize: 13, fontWeight: '800', color: '#0f172a' }}>{doc.name}</Text>
                      <Text style={{ fontSize: 10.5, fontWeight: '800', color: isHeadDoc ? '#258ec8' : '#16a34a', backgroundColor: isHeadDoc ? '#eef5fc' : '#f0fdf4', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                        {doc.role}
                      </Text>
                    </View>
                    <Text style={{ fontSize: 11.5, color: '#258ec8', fontWeight: '600', marginTop: 4 }}>Phone: +91 {doc.phone}</Text>

                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 6, paddingTop: 6, borderTopWidth: 1, borderTopColor: '#f1f5f9' }}>
                      <Text style={{ fontSize: 11, color: isHeadDoc ? '#64748b' : '#258ec8', fontWeight: '700' }}>
                        Shift: {isHeadDoc ? '-' : doc.shift}
                      </Text>
                      <Text style={{ fontSize: 11, color: isHeadDoc ? '#64748b' : '#16a34a', fontWeight: '700' }}>
                        Hours: {isHeadDoc ? '-' : doc.hours}
                      </Text>
                      <Text style={{ fontSize: 11.5, color: isHeadDoc ? '#94a3b8' : '#0f172a', fontWeight: '800' }}>
                        Salary: {isHeadDoc ? '-' : doc.salary}
                      </Text>
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </View>
      )}

      {/* TAB 6: EDIT MEDICINE FORM */}
      {activeTab === 'medicine' && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Edit Medicine / Remedy Form</Text>

          <Text style={styles.fieldLabel}>Medicine Name</Text>
          <View style={styles.inputBox}>
            <TextInput
              style={styles.inputText}
              placeholder="e.g. Arnica Montana"
              placeholderTextColor="#94a3b8"
              value={medName}
              onChangeText={setMedName}
            />
          </View>

          <Text style={styles.fieldLabel}>Potency</Text>
          <View style={styles.inputBox}>
            <TextInput
              style={styles.inputText}
              value={medPotency}
              onChangeText={setMedPotency}
            />
          </View>

          <Text style={styles.fieldLabel}>Stock Quantity</Text>
          <View style={styles.inputBox}>
            <TextInput
              style={styles.inputText}
              keyboardType="number-pad"
              value={medStock}
              onChangeText={setMedStock}
            />
          </View>

          <TouchableOpacity style={styles.saveBtn} onPress={handleSaveMedicine}>
            <Text style={styles.saveBtnText}>Save Medicine</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* ADD STAFF MODAL */}
      <Modal visible={showAddStaffModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { maxHeight: '85%' }]}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalTitle}>Add New Staff Member</Text>
              <TouchableOpacity onPress={() => setShowAddStaffModal(false)}>
                <Ionicons name="close" size={20} color="#64748b" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 10 }}>
              <Text style={styles.fieldLabel}>Full Name *</Text>
              <View style={styles.inputBox}>
                <TextInput
                  style={styles.inputText}
                  placeholder="e.g. Anil Kumar M"
                  placeholderTextColor="#94a3b8"
                  value={newStaffName}
                  onChangeText={setNewStaffName}
                />
              </View>

              <Text style={styles.fieldLabel}>Mobile / Phone Number *</Text>
              <View style={styles.inputBox}>
                <TextInput
                  style={styles.inputText}
                  placeholder="e.g. 90301 76176"
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

              {/* Salary & Work Schedule Box */}
              <View style={{ backgroundColor: '#f8fafc', borderRadius: 14, padding: 14, borderWidth: 1, borderColor: '#e2e8f0', marginTop: 12 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <Text style={{ fontSize: 13, fontWeight: '800', color: '#0f172a' }}>
                    Salary & Work Schedule
                  </Text>
                  <View style={{ backgroundColor: '#f4f9e8', borderWidth: 1, borderColor: 'rgba(168, 206, 58, 0.4)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 }}>
                    <Text style={{ fontSize: 11, fontWeight: '800', color: '#a8ce3a' }}>
                      {getCalculatedDailyHours()}
                    </Text>
                  </View>
                </View>

                {/* Monthly Base Salary (Rs) */}
                <Text style={[styles.fieldLabel, { marginTop: 4 }]}>Monthly Base Salary (Rs)</Text>
                <View style={styles.inputBox}>
                  <TextInput
                    style={styles.inputText}
                    placeholder="e.g. 25000"
                    keyboardType="number-pad"
                    placeholderTextColor="#94a3b8"
                    value={newStaffSalary}
                    onChangeText={setNewStaffSalary}
                  />
                </View>

                {/* Shift Type */}
                <Text style={[styles.fieldLabel, { marginTop: 10 }]}>Shift Type</Text>
                <View style={{ flexDirection: 'row', gap: 8, marginVertical: 6 }}>
                  {['Single Strict', 'Multi Strict'].map(type => (
                    <TouchableOpacity
                      key={type}
                      style={{
                        flex: 1,
                        paddingVertical: 9,
                        borderRadius: 10,
                        borderWidth: 1,
                        borderColor: staffShiftType === type ? '#258ec8' : '#cbd5e1',
                        backgroundColor: staffShiftType === type ? '#eef5fc' : '#ffffff',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                      onPress={() => {
                        setStaffShiftType(type as any);
                        if (type === 'Multi Strict' && staffShiftSlots.length < 2) {
                          setStaffShiftSlots([
                            { loginTime: '10:00 AM', logoutTime: '02:00 PM' },
                            { loginTime: '03:00 PM', logoutTime: '08:30 PM' }
                          ]);
                        } else if (type === 'Single Strict') {
                          setStaffShiftSlots([staffShiftSlots[0]]);
                        }
                      }}
                    >
                      <Text style={{ fontSize: 12, fontWeight: '800', color: staffShiftType === type ? '#258ec8' : '#64748b' }}>
                        {type}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Shift Hours Schedule */}
                {staffShiftSlots.map((slot, idx) => (
                  <View key={idx} style={styles.shiftSlotCard}>
                    <View style={styles.shiftSlotHeader}>
                      <View style={styles.shiftSlotBadge}>
                        <Text style={styles.shiftSlotBadgeText}>
                          {staffShiftType === 'Multi Strict' ? `SHIFT SLOT ${idx + 1}` : 'SHIFT HOURS SCHEDULE'}
                        </Text>
                      </View>
                      {staffShiftType === 'Multi Strict' && staffShiftSlots.length > 1 && (
                        <TouchableOpacity onPress={() => setStaffShiftSlots(prev => prev.filter((_, i) => i !== idx))}>
                          <Text style={styles.removeSlotText}>Remove Slot</Text>
                        </TouchableOpacity>
                      )}
                    </View>

                    {/* Side-by-Side Dual Time Modules */}
                    <View style={{ flexDirection: 'row', gap: 10 }}>
                      {/* Login Time */}
                      <View style={{ flex: 1 }}>
                        <Text style={styles.timeLabel}>Login Time</Text>
                        <View style={styles.timeInputContainer}>
                          <TextInput
                            style={styles.timeInputControl}
                            placeholder="10:00 AM"
                            placeholderTextColor="#94a3b8"
                            value={slot.loginTime}
                            onChangeText={val => {
                              setStaffShiftSlots(prev => prev.map((s, i) => i === idx ? { ...s, loginTime: val } : s));
                            }}
                          />
                        </View>

                        {/* Preset Chips */}
                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 6 }}>
                          {['09:00 AM', '10:00 AM', '10:30 AM'].map(t => {
                            const isSelected = slot.loginTime === t;
                            return (
                              <TouchableOpacity
                                key={t}
                                style={[styles.presetChip, isSelected && styles.presetChipActive]}
                                onPress={() => setStaffShiftSlots(prev => prev.map((s, i) => i === idx ? { ...s, loginTime: t } : s))}
                              >
                                <Text style={[styles.presetChipText, isSelected && styles.presetChipTextActive]}>{t}</Text>
                              </TouchableOpacity>
                            );
                          })}
                        </View>
                      </View>

                      {/* Logout Time */}
                      <View style={{ flex: 1 }}>
                        <Text style={styles.timeLabel}>Logout Time</Text>
                        <View style={styles.timeInputContainer}>
                          <TextInput
                            style={styles.timeInputControl}
                            placeholder="08:30 PM"
                            placeholderTextColor="#94a3b8"
                            value={slot.logoutTime}
                            onChangeText={val => {
                              setStaffShiftSlots(prev => prev.map((s, i) => i === idx ? { ...s, logoutTime: val } : s));
                            }}
                          />
                        </View>

                        {/* Preset Chips */}
                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 6 }}>
                          {['07:30 PM', '08:00 PM', '08:30 PM'].map(t => {
                            const isSelected = slot.logoutTime === t;
                            return (
                              <TouchableOpacity
                                key={t}
                                style={[styles.presetChip, isSelected && styles.presetChipActive]}
                                onPress={() => setStaffShiftSlots(prev => prev.map((s, i) => i === idx ? { ...s, logoutTime: t } : s))}
                              >
                                <Text style={[styles.presetChipText, isSelected && styles.presetChipTextActive]}>{t}</Text>
                              </TouchableOpacity>
                            );
                          })}
                        </View>
                      </View>
                    </View>
                  </View>
                ))}

                {staffShiftType === 'Multi Strict' && (
                  <TouchableOpacity
                    style={styles.addSlotBtn}
                    onPress={() => setStaffShiftSlots(prev => [...prev, { loginTime: '04:00 PM', logoutTime: '08:30 PM' }])}
                  >
                    <Text style={styles.addSlotBtnText}>+ Add Another Shift Slot</Text>
                  </TouchableOpacity>
                )}
              </View>

              <TouchableOpacity style={styles.saveBtn} onPress={handleSaveNewStaff}>
                <Text style={styles.saveBtnText}>Save Staff Member</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ADD DOCTOR MODAL */}
      <Modal visible={showAddDoctorModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalTitle}>Add New Doctor</Text>
              <TouchableOpacity onPress={() => setShowAddDoctorModal(false)}>
                <Ionicons name="close" size={20} color="#64748b" />
              </TouchableOpacity>
            </View>

            <Text style={styles.fieldLabel}>Doctor Category *</Text>
            <View style={{ flexDirection: 'row', gap: 8, marginVertical: 6 }}>
              {(['Head Doctor', 'Employee Doctor'] as const).map(cat => (
                <TouchableOpacity
                  key={cat}
                  style={[styles.catBtn, newDocCategory === cat && styles.catBtnActive]}
                  onPress={() => setNewDocCategory(cat)}
                >
                  <Text style={[styles.catBtnText, newDocCategory === cat && styles.catBtnTextActive]}>{cat}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.fieldLabel}>Doctor Full Name *</Text>
            <View style={styles.inputBox}>
              <TextInput
                style={styles.inputText}
                placeholder="e.g. Dr. Homeo Specialist"
                placeholderTextColor="#94a3b8"
                value={newDocName}
                onChangeText={setNewDocName}
              />
            </View>

            <Text style={styles.fieldLabel}>Mobile Phone Number *</Text>
            <View style={styles.inputBox}>
              <TextInput
                style={styles.inputText}
                placeholder="e.g. 9876543210"
                placeholderTextColor="#94a3b8"
                keyboardType="phone-pad"
                value={newDocPhone}
                onChangeText={setNewDocPhone}
              />
            </View>

            {newDocCategory === 'Employee Doctor' ? (
              <>
                <Text style={styles.fieldLabel}>Shift Timings</Text>
                <View style={styles.inputBox}>
                  <TextInput
                    style={styles.inputText}
                    placeholder="e.g. 10:00 AM - 08:00 PM"
                    placeholderTextColor="#94a3b8"
                    value={newDocShift}
                    onChangeText={setNewDocShift}
                  />
                </View>

                <Text style={styles.fieldLabel}>Daily Working Hours</Text>
                <View style={styles.inputBox}>
                  <TextInput
                    style={styles.inputText}
                    placeholder="e.g. 10 hrs/day"
                    placeholderTextColor="#94a3b8"
                    value={newDocHours}
                    onChangeText={setNewDocHours}
                  />
                </View>

                <Text style={styles.fieldLabel}>Monthly Salary</Text>
                <View style={styles.inputBox}>
                  <TextInput
                    style={styles.inputText}
                    placeholder="e.g. ₹95,000"
                    placeholderTextColor="#94a3b8"
                    value={newDocSalary}
                    onChangeText={setNewDocSalary}
                  />
                </View>
              </>
            ) : (
              <View style={styles.headNoticeCard}>
                <Text style={styles.headNoticeText}>
                  Note: Head Doctors are non-salaried consultants. Shift, Hours, and Salary will automatically display as "-".
                </Text>
              </View>
            )}

            <TouchableOpacity style={[styles.saveBtn, { backgroundColor: '#a8ce3a' }]} onPress={handleSaveNewDoctor}>
              <Text style={styles.saveBtnText}>Save Doctor</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc', paddingHorizontal: 16, paddingTop: 12 },
  actionHeaderRow: { flexDirection: 'row', gap: 10, marginBottom: 14, marginTop: 4 },
  addBtnStaff: { flex: 1, backgroundColor: '#258ec8', borderRadius: 12, height: 44, alignItems: 'center', justifyContent: 'center' },
  addBtnStaffText: { color: '#ffffff', fontSize: 13.5, fontWeight: '800' },
  addBtnDoctor: { flex: 1, backgroundColor: '#a8ce3a', borderRadius: 12, height: 44, alignItems: 'center', justifyContent: 'center' },
  addBtnDoctorText: { color: '#ffffff', fontSize: 13.5, fontWeight: '800' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  iconCircle: { width: 44, height: 44, borderRadius: 14, backgroundColor: '#258ec8', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#0f172a' },
  headerSub: { fontSize: 11.5, color: '#64748b' },
  tabRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  tabChip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#e2e8f0' },
  tabChipActive: { backgroundColor: '#258ec8', borderColor: '#258ec8' },
  tabChipText: { fontSize: 12, fontWeight: '600', color: '#64748b' },
  tabChipTextActive: { color: '#ffffff', fontWeight: '800' },
  statCard: { backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 16, padding: 16 },
  statLabel: { fontSize: 11.5, fontWeight: '800', color: '#64748b' },
  statVal: { fontSize: 22, fontWeight: '800', color: '#0f172a', marginVertical: 4 },
  statSub: { fontSize: 11, color: '#64748b' },
  card: { backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 16, padding: 16, marginBottom: 12 },
  cardTitle: { fontSize: 15, fontWeight: '800', color: '#0f172a' },
  cardSub: { fontSize: 12, color: '#64748b', marginTop: 2 },
  infoText: { fontSize: 12, color: '#475569' },
  fieldLabel: { fontSize: 12, fontWeight: '700', color: '#0f172a', marginTop: 10, marginBottom: 4 },
  inputBox: { backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 10, paddingHorizontal: 12, height: 44, justifyContent: 'center' },
  inputText: { fontSize: 13, color: '#0f172a' },
  saveBtn: { backgroundColor: '#258ec8', borderRadius: 12, height: 46, alignItems: 'center', justifyContent: 'center', marginTop: 16 },
  saveBtnText: { color: '#ffffff', fontSize: 14, fontWeight: '800' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.5)', justifyContent: 'center', paddingHorizontal: 16 },
  modalCard: { backgroundColor: '#ffffff', borderRadius: 20, padding: 20 },
  modalHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  modalTitle: { fontSize: 16, fontWeight: '800', color: '#0f172a' },
  chipBtn: { flex: 1, paddingVertical: 6, borderRadius: 8, backgroundColor: '#f1f5f9', alignItems: 'center', borderWidth: 1, borderColor: '#cbd5e1' },
  chipBtnActive: { backgroundColor: '#258ec8', borderColor: '#258ec8' },
  chipBtnText: { fontSize: 10.5, fontWeight: '700', color: '#475569' },
  chipBtnTextActive: { color: '#ffffff' },
  catBtn: { flex: 1, paddingVertical: 8, borderRadius: 10, backgroundColor: '#f1f5f9', alignItems: 'center', borderWidth: 1, borderColor: '#cbd5e1' },
  catBtnActive: { backgroundColor: '#a8ce3a', borderColor: '#a8ce3a' },
  catBtnText: { fontSize: 12, fontWeight: '700', color: '#475569' },
  catBtnTextActive: { color: '#ffffff' },
  headNoticeCard: { backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 10, padding: 10, marginTop: 10 },
  headNoticeText: { fontSize: 11.5, color: '#258ec8', lineHeight: 16 },
  shiftSlotCard: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 14,
    padding: 12,
    marginTop: 10,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  shiftSlotHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  shiftSlotBadge: {
    backgroundColor: '#eef5fc',
    borderWidth: 1,
    borderColor: 'rgba(37, 142, 200, 0.3)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  shiftSlotBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#258ec8',
    letterSpacing: 0.5,
  },
  removeSlotText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#258ec8',
  },
  timeLabel: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 4,
  },
  timeInputContainer: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 10,
    height: 40,
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  timeInputControl: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#0f172a',
    padding: 0,
  },
  presetChip: {
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  presetChipActive: {
    backgroundColor: '#eef5fc',
    borderColor: '#258ec8',
  },
  presetChipText: {
    fontSize: 9.5,
    fontWeight: '700',
    color: '#64748b',
  },
  presetChipTextActive: {
    color: '#258ec8',
    fontWeight: '800',
  },
  addSlotBtn: {
    marginTop: 10,
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#258ec8',
    backgroundColor: '#eef5fc',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addSlotBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#258ec8',
  },
});
