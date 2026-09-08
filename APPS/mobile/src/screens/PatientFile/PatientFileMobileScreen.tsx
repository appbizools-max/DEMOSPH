import React, { useState } from 'react';
import {
  StyleSheet, Text, View, ScrollView, TouchableOpacity,
  TextInput, Image, Alert, Modal, FlatList, Dimensions
} from 'react-native';
import { Feather, MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';

interface PatientFileMobileScreenProps {
  patient?: any;
  onBack?: () => void;
  onSaveConsultation?: (data: any) => void;
}

export const PatientFileMobileScreen: React.FC<PatientFileMobileScreenProps> = ({
  patient,
  onBack,
  onSaveConsultation,
}) => {
  const [activeTab, setActiveTab] = useState<'clinical' | 'diet' | 'media' | 'package'>('clinical');

  // Patient Info Fallbacks matching reference screenshots
  const patientName = patient?.patientName || patient?.name || 'Swpana latha';
  const regId = patient?.registrationId || patient?.regId || 'SPHDSN-124';
  const phone = patient?.phone || patient?.phoneNumber || '9000136260';
  const branchName = patient?.branch || 'Dilshuknagar';
  const source = patient?.source || patient?.leadSource || 'Old Patient';
  const subject = patient?.subject || patient?.diseases || 'Fever';

  // Tab 1: Clinical Form State
  const [diagnosisNotes, setDiagnosisNotes] = useState('');
  const [drawPrescription, setDrawPrescription] = useState<'on' | 'off'>('off');
  const [followUpInterval, setFollowUpInterval] = useState('No Follow-up');
  const [preferredFollowUpDate, setPreferredFollowUpDate] = useState('2026-10-07');
  const [pharmacyFee, setPharmacyFee] = useState('');

  // Tab 2: Diet Plan State
  const [selectedDietPlan, setSelectedDietPlan] = useState('+ Create New Diet Plan');
  const [age, setAge] = useState('30');
  const [height, setHeight] = useState('');
  const [weight, setWeight] = useState('');
  const [bmi, setBmi] = useState('0');
  const [deficiencies, setDeficiencies] = useState<Record<string, boolean>>({});
  const [disorders, setDisorders] = useState<Record<string, boolean>>({});
  const [otherDisorders, setOtherDisorders] = useState('');
  const [symptomsSigns, setSymptomsSigns] = useState('');
  const [foodsToEat, setFoodsToEat] = useState('');
  const [foodsToAvoid, setFoodsToAvoid] = useState('');
  const [dietFeeAmount, setDietFeeAmount] = useState('500');

  // Tab 3: Share Media State
  const [sharedMediaList, setSharedMediaList] = useState<string[]>([]);
  const [showGlobalMediaModal, setShowGlobalMediaModal] = useState(false);

  // Tab 4: Register Package State
  const [totalPackageAmount, setTotalPackageAmount] = useState('');
  const [initialAdvancePaid, setInitialAdvancePaid] = useState('0');
  const [packagePurpose, setPackagePurpose] = useState('');
  const [packageDuration, setPackageDuration] = useState('3 Months');
  const [packageStartDate, setPackageStartDate] = useState('2026-09-07');
  const [packageEndDate, setPackageEndDate] = useState('2026-12-07');

  // Deficiencies List
  const deficiencyList = [
    'Vitamin A', 'Vitamin C', 'Vitamin E', 'Calcium', 'Magnesium', 'Iron', 'Protein', 'Phosphorus',
    'Vitamin B', 'Vitamin D', 'Vitamin K', 'Potassium', 'Zinc', 'Sodium', 'Manganese'
  ];

  // Common Health Disorders Pills
  const disordersList = [
    'Sugar (Diabetes)', 'High BP / Hypertension', 'Thyroid', 'Gastritis', 'IBS / IBD', 'GERD',
    'Piles', 'PCOD', 'Insulin Resistance', 'Hairfall', 'Melasma', 'Weight Gain', 'Weight Loss',
    'Height Growth', 'Adenoids / Tonsillitis', 'Allergies'
  ];

  const handleSaveConsultation = () => {
    const data = {
      patientId: patient?.id,
      patientName,
      regId,
      diagnosisNotes,
      followUpInterval,
      preferredFollowUpDate,
      pharmacyFee,
    };
    if (onSaveConsultation) onSaveConsultation(data);
    Alert.alert('Success', 'Patient Consultation File saved successfully!');
    if (onBack) onBack();
  };

  const handleCreatePackage = () => {
    Alert.alert('Success', 'Package Membership Created Successfully!');
  };

  return (
    <View style={styles.container}>
      {/* 1. TOP HEADER BAR */}
      <View style={styles.topHeader}>
        <View style={styles.headerLeft}>
          {onBack && (
            <TouchableOpacity style={styles.backBtn} onPress={onBack}>
              <Text style={styles.backBtnText}>‹ Back</Text>
            </TouchableOpacity>
          )}
          <View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={styles.headerTitle} numberOfLines={1}>
                Patient File: {patientName} ({regId})
              </Text>
              <View style={styles.durationBadge}>
                <Text style={styles.durationBadgeText}>IN DURATION</Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.headerRight}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarText}>D</Text>
          </View>
        </View>
      </View>

      <ScrollView style={styles.scrollBody} contentContainerStyle={styles.scrollContent}>

        {/* 2. PATIENT INFO CARD STACK */}
        <View style={styles.card}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <Text style={styles.patientNameText}>{patientName}</Text>
            <View style={styles.durationBadge}>
              <Text style={styles.durationBadgeText}>IN DURATION</Text>
            </View>
          </View>

          <View style={styles.infoRowStack}>
            <Text style={styles.regIdText}>📋 Reg ID: {regId}</Text>
            <Text style={styles.infoText}>📞 {phone}</Text>
            <Text style={styles.infoText}>📍 {branchName}</Text>
            <Text style={styles.infoText}>📢 Source: {source}</Text>
            <Text style={styles.subjectText}>📋 Subject: {subject}</Text>
          </View>

          <View style={styles.packageNoticeBox}>
            <Text style={styles.packageNoticeText}>No active package.</Text>
            <TouchableOpacity style={styles.registerPkgBtn} onPress={() => setActiveTab('package')}>
              <Text style={styles.registerPkgBtnText}>+ Register Patient in Package</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* 3. MEDICAL HISTORY CARD */}
        <View style={styles.historyCard}>
          <Text style={styles.historyHeaderTitle}>⏱ Medical History</Text>
          <View style={styles.historyEmptyBox}>
            <Ionicons name="create-outline" size={24} color="#94a3b8" />
            <Text style={styles.historyEmptyText}>No previous visits recorded for this patient.</Text>
          </View>
        </View>

        {/* 4. UPLOADED PRESCRIPTIONS CARD */}
        <View style={styles.card}>
          <Text style={styles.sectionCardTitle}>📤 Uploaded Prescriptions & Canvas</Text>
          <View style={{ flexDirection: 'row', gap: 10, marginVertical: 8 }}>
            <View style={styles.prescriptionThumb}>
              <Ionicons name="document-text-outline" size={28} color="#0284c7" />
            </View>
          </View>
          <TouchableOpacity style={styles.uploadBtn}>
            <Text style={styles.uploadBtnText}>+ Upload Image</Text>
          </TouchableOpacity>
        </View>

        {/* 5. TOP HORIZONTAL TABS BAR */}
        <View style={styles.tabsBar}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {[
              { id: 'clinical', label: '📋 Clinical Form' },
              { id: 'diet', label: '🍎 Diet Plan' },
              { id: 'media', label: '📁 Share Media' },
              { id: 'package', label: '🎗 Register Package' },
            ].map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <TouchableOpacity
                  key={tab.id}
                  style={[styles.tabItem, isActive && styles.tabItemActive]}
                  onPress={() => setActiveTab(tab.id as any)}
                >
                  <Text style={[styles.tabItemText, isActive && styles.tabItemTextActive]}>
                    {tab.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* 6. TAB 1: CLINICAL FORM */}
        {activeTab === 'clinical' && (
          <View style={styles.card}>
            <Text style={styles.mainTabTitle}>Digital Prescription</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Diagnosis Notes</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                multiline
                numberOfLines={4}
                value={diagnosisNotes}
                onChangeText={setDiagnosisNotes}
                placeholder="Enter detailed clinical notes and diagnosis..."
              />
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16, marginVertical: 8 }}>
              <Text style={styles.label}>Draw Prescription (Optional)</Text>
              <TouchableOpacity
                style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
                onPress={() => setDrawPrescription('on')}
              >
                <Ionicons name={drawPrescription === 'on' ? 'radio-button-on' : 'radio-button-off'} size={18} color="#0284c7" />
                <Text style={styles.radioLabel}>On</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
                onPress={() => setDrawPrescription('off')}
              >
                <Ionicons name={drawPrescription === 'off' ? 'radio-button-on' : 'radio-button-off'} size={18} color="#0284c7" />
                <Text style={styles.radioLabel}>Off</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Physical Prescription (Optional if Canvas Drawing is used)</Text>
              <TouchableOpacity style={styles.chooseFileBtn}>
                <Text style={styles.chooseFileBtnText}>Choose Files</Text>
                <Text style={{ fontSize: 11, color: '#64748b', marginLeft: 8 }}>No file chosen</Text>
              </TouchableOpacity>
              <Text style={styles.helperText}>Upload one or multiple photos of the handwritten prescription.</Text>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.subTitle}>Follow-up Recommendation</Text>
              <Text style={styles.label}>Follow-up Interval</Text>
              <TextInput
                style={styles.input}
                value={followUpInterval}
                onChangeText={setFollowUpInterval}
              />

              <Text style={[styles.label, { marginTop: 8 }]}>Preferred Follow-up Date</Text>
              <TextInput
                style={styles.input}
                value={preferredFollowUpDate}
                onChangeText={setPreferredFollowUpDate}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.subTitle}>Consultation & Medicine Fee</Text>
              <Text style={styles.label}>Pharmacy/Medicine Fee (₹)</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter amount..."
                keyboardType="numeric"
                value={pharmacyFee}
                onChangeText={setPharmacyFee}
              />
            </View>

            <TouchableOpacity style={styles.saveBtn} onPress={handleSaveConsultation}>
              <Text style={styles.saveBtnText}>Save Consultation</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* 7. TAB 2: DIET PLAN */}
        {activeTab === 'diet' && (
          <View style={styles.card}>
            <Text style={styles.mainTabTitle}>Diet Plan Management</Text>

            <View style={styles.metricsRow}>
              <View style={styles.metricCol}>
                <Text style={styles.label}>Age</Text>
                <TextInput style={styles.input} value={age} onChangeText={setAge} keyboardType="numeric" />
              </View>
              <View style={styles.metricCol}>
                <Text style={styles.label}>Height (cm)</Text>
                <TextInput style={styles.input} value={height} onChangeText={setHeight} keyboardType="numeric" />
              </View>
              <View style={styles.metricCol}>
                <Text style={styles.label}>Weight (kg)</Text>
                <TextInput style={styles.input} value={weight} onChangeText={setWeight} keyboardType="numeric" />
              </View>
              <View style={styles.metricCol}>
                <Text style={styles.label}>BMI</Text>
                <TextInput style={styles.input} value={bmi} onChangeText={setBmi} keyboardType="numeric" />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.subTitle}>Deficiencies Checklist</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {deficiencyList.map((item) => {
                  const isChecked = Boolean(deficiencies[item]);
                  return (
                    <TouchableOpacity
                      key={item}
                      style={[styles.checkChip, isChecked && styles.checkChipActive]}
                      onPress={() => setDeficiencies({ ...deficiencies, [item]: !isChecked })}
                    >
                      <Text style={[styles.checkChipText, isChecked && styles.checkChipTextActive]}>
                        {isChecked ? '✓ ' : '+ '}{item}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.subTitle}>Common Health Disorders</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                {disordersList.map((item) => {
                  const isSel = Boolean(disorders[item]);
                  return (
                    <TouchableOpacity
                      key={item}
                      style={[styles.pillChip, isSel && styles.pillChipActive]}
                      onPress={() => setDisorders({ ...disorders, [item]: !isSel })}
                    >
                      <Text style={[styles.pillChipText, isSel && styles.pillChipTextActive]}>
                        {item}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Foods to Eat</Text>
              <TextInput style={[styles.input, styles.textAreaSmall]} multiline value={foodsToEat} onChangeText={setFoodsToEat} />

              <Text style={[styles.label, { marginTop: 8 }]}>Foods to Avoid</Text>
              <TextInput style={[styles.input, styles.textAreaSmall]} multiline value={foodsToAvoid} onChangeText={setFoodsToAvoid} />
            </View>
          </View>
        )}

        {/* 8. TAB 3: SHARE MEDIA */}
        {activeTab === 'media' && (
          <View style={styles.card}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <Text style={styles.mainTabTitle}>Shared Media & Education</Text>
              <TouchableOpacity style={styles.actionBtnSmall} onPress={() => setShowGlobalMediaModal(true)}>
                <Text style={styles.actionBtnSmallText}>📁 Share Global Media</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.dashedBox}>
              <Text style={styles.dashedBoxText}>No global media has been shared with this patient yet.</Text>
            </View>
          </View>
        )}

        {/* 9. TAB 4: REGISTER PACKAGE */}
        {activeTab === 'package' && (
          <View style={styles.card}>
            <Text style={styles.mainTabTitle}>Register Patient in Package</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Total Package Amount (₹) *</Text>
              <TextInput style={styles.input} placeholder="Enter total package cost" keyboardType="numeric" value={totalPackageAmount} onChangeText={setTotalPackageAmount} />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Initial Advance Paid (₹)</Text>
              <TextInput style={styles.input} keyboardType="numeric" value={initialAdvancePaid} onChangeText={setInitialAdvancePaid} />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Package Purpose / Disease</Text>
              <TextInput style={styles.input} placeholder="e.g. Chronic Asthma, Sinusitis" value={packagePurpose} onChangeText={setPackagePurpose} />
            </View>

            <TouchableOpacity style={styles.saveBtn} onPress={handleCreatePackage}>
              <Text style={styles.saveBtnText}>Create Package Membership</Text>
            </TouchableOpacity>
          </View>
        )}

      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  topHeader: { backgroundColor: '#ffffff', borderBottomWidth: 1, borderBottomColor: '#e2e8f0', paddingHorizontal: 16, paddingVertical: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  backBtn: { backgroundColor: '#f1f5f9', borderBottomWidth: 1, borderBottomColor: '#cbd5e1', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 6 },
  backBtnText: { fontSize: 12, fontWeight: '700', color: '#334155' },
  headerTitle: { fontSize: 13, fontWeight: '800', color: '#0f172a' },
  durationBadge: { backgroundColor: '#fef08a', borderWidth: 1, borderColor: '#fde047', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  durationBadgeText: { fontSize: 8.5, fontWeight: '800', color: '#854d0e' },
  headerRight: { flexDirection: 'row', alignItems: 'center' },
  avatarCircle: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#e0f2fe', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#bae6fd' },
  avatarText: { fontSize: 12, fontWeight: '800', color: '#0284c7' },
  scrollBody: { flex: 1 },
  scrollContent: { padding: 14, gap: 14 },
  card: { backgroundColor: '#ffffff', borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0', padding: 14 },
  patientNameText: { fontSize: 17, fontWeight: '800', color: '#0f172a' },
  infoRowStack: { gap: 4, marginTop: 4 },
  regIdText: { fontSize: 12, fontWeight: '700', color: '#0284c7' },
  infoText: { fontSize: 11.5, color: '#475569' },
  subjectText: { fontSize: 12, fontWeight: '700', color: '#0f172a' },
  packageNoticeBox: { marginTop: 12, backgroundColor: '#f8fafc', borderStyle: 'dashed', borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 8, padding: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  packageNoticeText: { fontSize: 11, color: '#64748b', fontWeight: '600' },
  registerPkgBtn: { backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#0284c7', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  registerPkgBtnText: { fontSize: 10.5, fontWeight: '800', color: '#0284c7' },
  historyCard: { backgroundColor: '#e0f2fe', borderRadius: 12, borderWidth: 1, borderColor: '#bae6fd', padding: 14 },
  historyHeaderTitle: { fontSize: 12.5, fontWeight: '800', color: '#0284c7', marginBottom: 8 },
  historyEmptyBox: { backgroundColor: '#ffffff', borderRadius: 8, padding: 16, alignItems: 'center', justifyContent: 'center', gap: 6 },
  historyEmptyText: { fontSize: 10.5, color: '#94a3b8', fontWeight: '600' },
  sectionCardTitle: { fontSize: 12.5, fontWeight: '800', color: '#0f172a', marginBottom: 6 },
  prescriptionThumb: { width: 54, height: 54, borderRadius: 8, backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#cbd5e1', alignItems: 'center', justifyContent: 'center' },
  uploadBtn: { backgroundColor: '#f1f5f9', borderWidth: 1, borderColor: '#cbd5e1', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6, alignSelf: 'flex-start' },
  uploadBtnText: { fontSize: 11, fontWeight: '800', color: '#334155' },
  tabsBar: { backgroundColor: '#ffffff', borderRadius: 10, borderWidth: 1, borderColor: '#e2e8f0', padding: 4 },
  tabItem: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 6, marginRight: 4 },
  tabItemActive: { backgroundColor: '#e0f2fe', borderWidth: 1, borderColor: '#bae6fd' },
  tabItemText: { fontSize: 12, fontWeight: '600', color: '#64748b' },
  tabItemTextActive: { fontWeight: '800', color: '#0284c7' },
  mainTabTitle: { fontSize: 14, fontWeight: '800', color: '#0f172a', marginBottom: 12 },
  inputGroup: { marginBottom: 12 },
  label: { fontSize: 11.5, fontWeight: '700', color: '#475569', marginBottom: 4 },
  subTitle: { fontSize: 12.5, fontWeight: '800', color: '#0f172a', marginBottom: 6, marginTop: 4 },
  radioLabel: { fontSize: 12, fontWeight: '600', color: '#334155' },
  input: { backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, fontSize: 12, color: '#0f172a' },
  textArea: { height: 90, textAlignVertical: 'top' },
  textAreaSmall: { height: 60, textAlignVertical: 'top' },
  chooseFileBtn: { backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#cbd5e1', paddingHorizontal: 10, paddingVertical: 8, borderRadius: 6, flexDirection: 'row', alignItems: 'center' },
  chooseFileBtnText: { fontSize: 11, fontWeight: '800', color: '#334155' },
  helperText: { fontSize: 10, color: '#94a3b8', marginTop: 3 },
  saveBtn: { backgroundColor: '#0284c7', paddingVertical: 12, borderRadius: 8, alignItems: 'center', marginTop: 10 },
  saveBtnText: { fontSize: 13, fontWeight: '800', color: '#ffffff' },
  metricsRow: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  metricCol: { flex: 1 },
  checkChip: { backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#cbd5e1', paddingHorizontal: 8, paddingVertical: 5, borderRadius: 6 },
  checkChipActive: { backgroundColor: '#e0f2fe', borderColor: '#0284c7' },
  checkChipText: { fontSize: 10.5, color: '#475569', fontWeight: '600' },
  checkChipTextActive: { color: '#0284c7', fontWeight: '800' },
  pillChip: { backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#cbd5e1', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  pillChipActive: { backgroundColor: '#e0f2fe', borderColor: '#0284c7' },
  pillChipText: { fontSize: 10, color: '#475569', fontWeight: '600' },
  pillChipTextActive: { color: '#0284c7', fontWeight: '800' },
  dashedBox: { backgroundColor: '#ffffff', borderStyle: 'dashed', borderWidth: 1, borderColor: '#bae6fd', borderRadius: 10, padding: 24, alignItems: 'center' },
  dashedBoxText: { fontSize: 11, color: '#64748b', textAlign: 'center' },
  actionBtnSmall: { backgroundColor: '#0284c7', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6 },
  actionBtnSmallText: { fontSize: 11, fontWeight: '800', color: '#ffffff' }
});
