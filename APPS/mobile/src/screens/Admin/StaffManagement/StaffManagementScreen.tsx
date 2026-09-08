import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity } from 'react-native';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '@app/shared';

export const StaffManagementScreen: React.FC = () => {
  const [staffCategory, setStaffCategory] = useState<'staff' | 'reception' | 'doctors'>('staff');

  // Seed Data for Staff
  const DEFAULT_STAFF = [
    { name: 'Anil Kumar M', role: 'Regular Staff', branch: 'KPHB', hours: '10.5 hrs/day', salary: '₹22,000' },
    { name: 'Ashwini Begari', role: 'Regular Staff', branch: 'Chandanagar', hours: '8.5 hrs/day', salary: '₹17,000' },
    { name: 'Vaishnavi Peri', role: 'Regular Staff', branch: 'Nallagandla', hours: '9.5 hrs/day', salary: '₹17,000' },
    { name: 'Nandini Gottelli', role: 'Regular Staff', branch: 'Dilshuknagar', hours: '8 hrs/day', salary: '₹15,000' },
    { name: 'Srikanth', role: 'Regular Staff', branch: 'KPHB', hours: '10 hrs/day', salary: '₹18,000' },
    { name: 'Arun Kumar', role: 'Regular Staff', branch: 'Nallagandla', hours: '8 hrs/day', salary: '₹14,000' },
  ];

  // Seed Data for Doctors
  const DEFAULT_DOCTORS = [
    { name: 'Dr. Prashanth k vaidya', role: 'Head Doctor', category: 'Head Doctor', phone: '8125260176', shift: '-', hours: '-', salary: '-' },
    { name: 'Dr. Jobeadh parveej', role: 'Head Doctor', category: 'Head Doctor', phone: '9903119766', shift: '-', hours: '-', salary: '-' },
    { name: 'Dr. Padma priya', role: 'Employee Doctor', category: 'Employee Doctor', phone: '9490808582', shift: '10:00 AM - 08:00 PM', hours: '10 hrs/day', salary: '₹95,000' },
    { name: 'Dr. Ramakrishna chanduri', role: 'Head Doctor', category: 'Head Doctor', phone: '1111111111', shift: '-', hours: '-', salary: '-' },
  ];

  const [liveStaffMembers, setLiveStaffMembers] = useState(DEFAULT_STAFF);
  const [liveDoctors, setLiveDoctors] = useState(DEFAULT_DOCTORS);

  // Firestore Listener: Staff Collection
  useEffect(() => {
    if (!db) return;
    const colRef = collection(db, 'staff');
    const unsub = onSnapshot(colRef, (snap) => {
      if (!snap.empty) {
        const loaded = snap.docs.map(d => {
          const data = d.data();
          return {
            name: data.name || 'Staff Member',
            role: 'Regular Staff',
            branch: data.branch || 'KPHB',
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

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
      {/* Title Header */}
      <Text style={styles.title}>Staff Management & Working Hours</Text>
      <Text style={styles.subTitle}>Manage clinic staff roles, branch reception desks, and doctor schedules.</Text>

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
            <Text style={styles.cardTitle}>Clinic Staff Members</Text>
            <Text style={styles.badgeText}>{liveStaffMembers.length} Active Staff</Text>
          </View>

          {liveStaffMembers.map(s => (
            <View key={s.name} style={styles.itemBox}>
              <Text style={styles.itemTitle}>{s.name} ({s.branch})</Text>
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
            <Text style={styles.cardTitle}>Doctors Directory</Text>
            <Text style={[styles.badgeText, { color: '#a8ce3a' }]}>{liveDoctors.length} Doctors</Text>
          </View>

          {liveDoctors.map(doc => {
            const isHeadDoc = doc.category === 'Head Doctor' || doc.role === 'Head Doctor';
            return (
              <View
                key={doc.name}
                style={[
                  styles.doctorBox,
                  { backgroundColor: '#ffffff', borderColor: '#e2e8f0' }
                ]}
              >
                <View style={styles.itemHeaderRow}>
                  <Text style={styles.itemTitle}>{doc.name}</Text>
                  <Text
                    style={[
                      styles.categoryTag,
                      { color: isHeadDoc ? '#258ec8' : '#a8ce3a', backgroundColor: isHeadDoc ? '#eef5fc' : '#f4f9e8' }
                    ]}
                  >
                    {doc.role}
                  </Text>
                </View>
                <Text style={styles.receptionPhone}>Phone: +91 {doc.phone}</Text>

                <View style={[styles.doctorFooterRow, { borderTopColor: '#f1f5f9' }]}>
                  <Text style={styles.metaLabel}>Shift: <Text style={styles.metaVal}>{isHeadDoc ? '-' : doc.shift}</Text></Text>
                  <Text style={styles.metaLabel}>Hours: <Text style={styles.metaVal}>{isHeadDoc ? '-' : doc.hours}</Text></Text>
                  <Text style={styles.metaLabel}>Salary: <Text style={styles.metaValBold}>{isHeadDoc ? '-' : doc.salary}</Text></Text>
                </View>
              </View>
            );
          })}
        </View>
      )}
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
  hoursText: { fontSize: 11.5, color: '#a8ce3a', fontWeight: '700' },
  salaryText: { fontSize: 12.5, color: '#0f172a', fontWeight: '800' },
  categoryTag: { fontSize: 10.5, fontWeight: '800', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  doctorFooterRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8, paddingTop: 6, borderTopWidth: 1, borderTopColor: '#f1f5f9' },
  metaLabel: { fontSize: 11, color: '#64748b', fontWeight: '600' },
  metaVal: { color: '#0f172a', fontWeight: '700' },
  metaValBold: { color: '#0f172a', fontWeight: '800' },
});
