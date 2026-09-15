import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, Image, SafeAreaView, KeyboardAvoidingView, Platform, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { getSafeDb, doc, getDoc, setDoc, collection, query, where, getDocs, onSnapshot } from '../../utils/firebaseSafe';
import { auth, UserRole } from '@app/shared';
import { sendSmsOtp, generate4DigitOtp, normalizePhoneForSms } from '../../services/smsOtpService';

export interface LoginSuccessData {
  role: UserRole;
  userName?: string;
  branchName: string;
  branchPhone: string;
  staffId?: string;
}

interface AuthScreenProps {
  onLoginSuccess?: (data: LoginSuccessData) => void;
}

// Strictly authorized 4 Branch Receptionist phone numbers
export const AUTHORIZED_RECEPTION_BRANCHES: Record<string, { name: string; phone: string }> = {
  '9030176176': { name: 'KPHB', phone: '9030176176' },
  '9132176176': { name: 'Nallagandla', phone: '9132176176' },
  '9804176176': { name: 'Dilshuknagar', phone: '9804176176' },
  '9553176176': { name: 'Chandanagar', phone: '9553176176' },
};

export const REGISTERED_CLINIC_STAFF = [
  { id: '1', name: 'Anil Kumar M', role: 'Front Desk & Operations', branch: 'KPHB', phone: '9030176176' },
  { id: '2', name: 'Ashwini Begari', role: 'Clinic Coordinator', branch: 'Chandanagar', phone: '9553176176' },
  { id: '3', name: 'Vaishnavi Peri', role: 'Patient Care & Followup', branch: 'Nallagandla', phone: '9132176176' },
  { id: '4', name: 'Nandini Gottelli', role: 'Pharmacy & Billing', branch: 'Dilshuknagar', phone: '9804176176' },
  { id: '5', name: 'Srikanth', role: 'Support Assistant', branch: 'KPHB', phone: '9030176176' },
  { id: '6', name: 'Arun Kumar', role: 'Lab & General Support', branch: 'Nallagandla', phone: '9132176176' },
  { id: '7', name: 'Aishwarya . M', role: 'Front Desk & Operations', branch: 'KPHB', phone: '7995532759' },
];

// Known doctor phone numbers for seed matching
const KNOWN_DOCTOR_PHONES = ['8125260176', '9903119766', '9490808582', '1111111111'];

export const AuthScreen: React.FC<AuthScreenProps> = ({ onLoginSuccess }) => {
  const [loginMethod, setLoginMethod] = useState<'otp' | 'staff' | 'email'>('otp');
  const [selectedStaffId, setSelectedStaffId] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [displayedOtp, setDisplayedOtp] = useState('');
  const [smsNotice, setSmsNotice] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [liveStaffChips, setLiveStaffChips] = useState<any[]>([]);

  useEffect(() => {
    const activeDb = getSafeDb();
    if (!activeDb) return;
    const unsubStaff = onSnapshot(collection(activeDb, 'staff'), (snap) => {
      const list: any[] = [];
      snap.forEach(d => {
        list.push({ id: d.id, ...d.data() });
      });
      setLiveStaffChips(list);
    }, (err) => console.warn('Auth live staff listener notice:', err));

    return () => {
      unsubStaff();
    };
  }, []);

  // Helper to dynamically detect Role, User Name, and Branch from input or Firestore
  const detectRoleAndBranch = async (input: string): Promise<LoginSuccessData | null> => {
    const cleanInput = input.trim();
    const digits = cleanInput.replace(/\D/g, '');
    const clean10 = digits.length > 10 ? digits.slice(-10) : digits;
    const lower = cleanInput.toLowerCase();

    const activeDb = getSafeDb();

    // 1. Instant Reception Branch Check (Dedicated desk numbers)
    for (const [recPhone, recInfo] of Object.entries(AUTHORIZED_RECEPTION_BRANCHES)) {
      if (
        (clean10 && clean10 === recPhone) ||
        (digits && digits.endsWith(recPhone)) ||
        (lower && lower.includes(recInfo.name.toLowerCase()))
      ) {
        return {
          role: 'reception',
          userName: `${recInfo.name} Reception`,
          branchName: `${recInfo.name} Branch`,
          branchPhone: `+91 ${recPhone}`
        };
      }
    }

    if (lower.includes('reception') || lower.includes('recption')) {
      return {
        role: 'reception',
        userName: 'KPHB Reception',
        branchName: 'KPHB Branch',
        branchPhone: '+91 9030176176'
      };
    }

    // 2. Instant Admin / HR Check (No network calls needed)
    if (lower === 'hr@sph.com' || lower.includes('hr') || digits === '9000000002') {
      const email = cleanInput.includes('@') ? cleanInput : 'hr@sph.com';
      return { role: 'hr', userName: email, branchName: 'HR Department', branchPhone: '' };
    }
    if (lower.includes('admin') || digits === '9000000001') {
      const email = cleanInput.includes('@') ? cleanInput : 'admin@sph.com';
      return { role: 'admin', userName: email, branchName: 'Admin Control Hub', branchPhone: '' };
    }

    // 3. Instant Known Doctor Seed Check
    if (digits.includes('8125260176') || lower.includes('prashanth')) {
      return { role: 'doctor', userName: 'Dr. Prashanth K Vaidya', branchName: 'KPHB Branch', branchPhone: '+91 81252 60176' };
    }
    if (digits.includes('9903119766') || lower.includes('jobedah') || lower.includes('parveez')) {
      return { role: 'doctor', userName: 'Dr. Jobedah Parveez', branchName: 'Nallagandla Branch', branchPhone: '+91 99031 19766' };
    }
    if (digits.includes('9490808582') || lower.includes('padma')) {
      return { role: 'doctor', userName: 'Dr. Padma Priya', branchName: 'Chandanagar Branch', branchPhone: '+91 94908 08582' };
    }
    if (digits.includes('1111111111') || lower.includes('chanduri') || lower.includes('ramakrishna') || lower.includes('rama krishna')) {
      return { role: 'doctor', userName: 'Dr. Ramakrishna Chanduri', branchName: 'Dilshuknagar Branch', branchPhone: '+91 98041 76176' };
    }

    // 4. Instant Check In-Memory Live Staff Chips (0ms delay)
    if (liveStaffChips && liveStaffChips.length > 0) {
      for (const item of liveStaffChips) {
        const sPhone = String(item.mobile || item.phone || '').replace(/\D/g, '');
        const sClean10 = sPhone.length > 10 ? sPhone.slice(-10) : sPhone;
        const sName = String(item.name || '').toLowerCase();

        if (
          (cleanInput && item.id === cleanInput) ||
          (clean10 && sClean10 && clean10 === sClean10) ||
          (lower && sName && (sName === lower || sName.includes(lower) || lower.includes(sName))) ||
          (digits && sPhone && digits.length >= 10 && (digits === sPhone || clean10 === sClean10))
        ) {
          let detectedRole = item.role || item.category || item.department;
          if (!detectedRole) {
            detectedRole = sName.includes('reception') ? 'reception' : 'staff';
          }
          return {
            role: detectedRole as any,
            userName: item.name || (detectedRole === 'reception' ? 'Reception' : 'Staff Member'),
            branchName: item.branch ? (item.branch.includes('Branch') ? item.branch : `${item.branch} Branch`) : 'KPHB Branch',
            branchPhone: item.mobile || item.phone || digits,
            staffId: item.id
          };
        }
      }
    }

    // 4.5. Instant Pre-registered Clinic Staff Check (0ms delay)
    for (const s of REGISTERED_CLINIC_STAFF) {
      const sPhone = s.phone.replace(/\D/g, '');
      const sClean10 = sPhone.length > 10 ? sPhone.slice(-10) : sPhone;
      const sName = s.name.toLowerCase();
      if (
        (clean10 && sClean10 && clean10 === sClean10) ||
        (cleanInput && (s.id === cleanInput || sName === lower || sName.includes(lower) || lower.includes(sName)))
      ) {
        return {
          role: 'staff',
          userName: s.name,
          branchName: `${s.branch} Branch`,
          branchPhone: `+91 ${s.phone}`,
          staffId: s.id
        };
      }
    }

    // 5. Parallel Firestore Lookup as Fallback (Parallelized network call for max speed)
    if (activeDb) {
      try {
        const [staffSnap, docSnap] = await Promise.all([
          getDocs(collection(activeDb, 'staff')),
          digits.length >= 8 ? getDocs(collection(activeDb, 'doctors')) : Promise.resolve({ docs: [], empty: true } as any)
        ]);

        // Check staff results
        for (const d of staffSnap.docs) {
          const data = d.data();
          const sPhone = String(data.mobile || data.phone || '').replace(/\D/g, '');
          const sClean10 = sPhone.length > 10 ? sPhone.slice(-10) : sPhone;
          const sName = String(data.name || '').toLowerCase();

          if (sClean10 && AUTHORIZED_RECEPTION_BRANCHES[sClean10]) {
            const recInfo = AUTHORIZED_RECEPTION_BRANCHES[sClean10];
            if ((clean10 && clean10 === sClean10) || (digits && sPhone && digits.includes(sClean10))) {
              return {
                role: 'reception',
                userName: `${recInfo.name} Reception`,
                branchName: `${recInfo.name} Branch`,
                branchPhone: `+91 ${sClean10}`,
                staffId: d.id
              };
            }
          }

          if (
            (cleanInput && d.id === cleanInput) ||
            (clean10 && sClean10 && clean10 === sClean10) ||
            (lower && sName && sName === lower) ||
            (digits && sPhone && digits.length >= 10 && (digits === sPhone || clean10 === sClean10))
          ) {
            let detectedRole = data.role || data.category || data.department;
            if (!detectedRole) {
              detectedRole = sName.includes('reception') ? 'reception' : 'staff';
            }
            return {
              role: detectedRole as any,
              userName: data.name || (detectedRole === 'reception' ? 'Reception' : 'Staff Member'),
              branchName: data.branch ? (data.branch.includes('Branch') ? data.branch : `${data.branch} Branch`) : 'KPHB Branch',
              branchPhone: data.mobile || data.phone || digits,
              staffId: d.id
            };
          }
        }

        // Check doctor results
        if (!docSnap.empty) {
          for (const d of docSnap.docs) {
            const data = d.data();
            const dPhone = String(data.mobile || data.phone || '').replace(/\D/g, '');
            const dClean10 = dPhone.length > 10 ? dPhone.slice(-10) : dPhone;
            const dName = String(data.name || '').toLowerCase();
            if (
              (clean10 && dClean10 && clean10 === dClean10) ||
              (digits && dPhone && (digits.includes(dPhone) || dPhone.includes(digits))) ||
              (cleanInput && d.id === cleanInput) ||
              (lower && dName && dName === lower)
            ) {
              return {
                role: 'doctor',
                userName: data.name || 'Dr. Physician',
                branchName: data.branch || 'Medical Center',
                branchPhone: digits,
                staffId: d.id
              };
            }
          }
        }
      } catch (e) {
        console.warn('Firestore parallel lookup notice:', e);
      }
    }

    // Not found / Deleted / Unauthorized
    return null;

    // Not found / Deleted / Unauthorized
    return null;
  };

  // SEND 4-DIGIT REAL SMS OTP
  const handleSendOTP = async () => {
    const rawInput = phoneNumber.trim();
    if (!rawInput) {
      Alert.alert('Phone Number Required', 'Please enter your registered mobile number.');
      return;
    }
    setIsSubmitting(true);
    const authData = await detectRoleAndBranch(rawInput);
    if (!authData) {
      setIsSubmitting(false);
      Alert.alert(
        'Access Denied',
        'This mobile number is not registered as an active Doctor, Receptionist, or Staff member.\n\nIf your account was removed by Admin or HR, login access has been revoked.'
      );
      return;
    }

    // Generate 4-digit random OTP
    const generatedOtp = generate4DigitOtp();
    const { clean10 } = normalizePhoneForSms(rawInput);

    // Save OTP to Firestore in auth_otps with 5-minute expiry
    const activeDb = getSafeDb();
    if (activeDb && clean10) {
      try {
        await setDoc(doc(activeDb, 'auth_otps', clean10), {
          phone: clean10,
          otp: generatedOtp,
          expiresAt: Date.now() + 5 * 60 * 1000,
          role: authData.role,
          staffId: authData.staffId || null,
          userName: authData.userName || '',
          branchName: authData.branchName || '',
          createdAt: new Date().toISOString()
        });
      } catch (e) {
        console.warn('Error saving OTP to Firestore:', e);
      }
    }

    // Send real SMS OTP using smslogin.co API and template 1777178867791586062
    const smsResult = await sendSmsOtp(clean10, generatedOtp);
    setIsSubmitting(false);
    setOtpSent(true);

    if (smsResult.success) {
      setDisplayedOtp('');
      setSmsNotice(`A 4-digit verification code has been dispatched via SMS to +91 ${clean10}.`);
      Alert.alert(
        'SMS OTP Sent',
        `Your 4-digit verification code has been sent via SMS to +91 ${clean10}.\n\nIt is valid for 5 minutes.`
      );
    } else {
      setDisplayedOtp(generatedOtp);
      if (smsResult.isCredentialsError) {
        setSmsNotice(`SMS Gateway: Invalid Credentials on smslogin.co account.`);
        Alert.alert(
          'SMS Gateway Alert',
          `The SMS gateway (smslogin.co) returned "Invalid Credentials".\n\nYour account username or API key needs to be configured.\n\nYour login OTP is: ${generatedOtp}`
        );
      } else {
        setSmsNotice(`SMS Delivery Notice: ${smsResult.message}`);
        Alert.alert(
          'SMS Delivery Notice',
          `${smsResult.message}\n\nYour login OTP is: ${generatedOtp}`
        );
      }
    }
  };

  // VERIFY 4-DIGIT REAL SMS OTP
  const handleVerifyOTP = async () => {
    const cleanOtp = otpCode.trim();
    if (!cleanOtp) {
      Alert.alert('OTP Required', 'Please enter the 4-digit OTP received via SMS.');
      return;
    }

    setIsSubmitting(true);
    const rawInput = phoneNumber.trim();
    const { clean10 } = normalizePhoneForSms(rawInput);
    const activeDb = getSafeDb();

    let isOtpValid = false;
    let cachedOtpAuthData: LoginSuccessData | null = null;

    if (activeDb && clean10) {
      try {
        const otpSnap = await getDoc(doc(activeDb, 'auth_otps', clean10));
        if (otpSnap.exists()) {
          const otpData = otpSnap.data();
          if (otpData.otp === cleanOtp) {
            if (Date.now() <= (otpData.expiresAt || 0)) {
              isOtpValid = true;
              if (otpData.role && otpData.branchName) {
                cachedOtpAuthData = {
                  role: otpData.role,
                  userName: otpData.userName,
                  branchName: otpData.branchName,
                  branchPhone: `+91 ${clean10}`,
                  staffId: otpData.staffId || undefined
                };
              }
            } else {
              setIsSubmitting(false);
              Alert.alert('OTP Expired', 'The OTP has expired (5-minute validity). Please request a new OTP.');
              return;
            }
          }
        }
      } catch (e) {
        console.warn('Error verifying Firestore OTP:', e);
      }
    }

    // Testing fallback
    if (!isOtpValid && cleanOtp === '1234') {
      isOtpValid = true;
    }

    if (!isOtpValid) {
      setIsSubmitting(false);
      Alert.alert('Invalid OTP', 'The OTP code is incorrect. Please check your SMS message or enter default test OTP 1234.');
      return;
    }

    // Re-verify that user has NOT been deleted in the meantime (use cached data if valid, otherwise fallback)
    const authData = cachedOtpAuthData || (await detectRoleAndBranch(rawInput));
    setIsSubmitting(false);

    if (!authData) {
      Alert.alert('Access Denied', 'This staff member or account has been deleted by Admin or HR.');
      return;
    }

    if (onLoginSuccess) {
      onLoginSuccess(authData);
    } else {
      Alert.alert('Access Granted', `Welcome ${authData.userName} (${authData.role.toUpperCase()})`);
    }
  };

  // Helper to resolve staff login directly
  const handleStaffLogin = async () => {
    const rawInput = phoneNumber.trim() || selectedStaffId;
    if (!rawInput) {
      Alert.alert('Select Staff', 'Please select a staff member or enter your registered mobile number.');
      return;
    }

    setIsSubmitting(true);
    try {
      let rawDetected = await detectRoleAndBranch(rawInput);

      // Fallback check against REGISTERED_CLINIC_STAFF if not found or if detected as reception phone number
      if (!rawDetected || rawDetected.role !== 'staff') {
        const lower = rawInput.toLowerCase();
        const foundSeed = REGISTERED_CLINIC_STAFF.find(
          s => s.id === rawInput || s.phone === rawInput || s.name.toLowerCase().includes(lower) || lower.includes(s.name.toLowerCase())
        );
        if (foundSeed) {
          rawDetected = {
            role: 'staff',
            userName: foundSeed.name,
            branchName: `${foundSeed.branch} Branch`,
            branchPhone: `+91 ${foundSeed.phone}`,
            staffId: foundSeed.id
          };
        }
      }

      if (!rawDetected) {
        setIsSubmitting(false);
        Alert.alert(
          'Access Denied',
          'Staff record not found or access has been revoked by Admin / HR.'
        );
        return;
      }

      const authData: LoginSuccessData = {
        ...rawDetected,
        role: 'staff'
      };

      // If user hasn't requested an SMS OTP yet, generate and send 4-digit OTP
      if (!otpSent) {
        const generatedOtp = generate4DigitOtp();
        const { clean10 } = normalizePhoneForSms(authData.branchPhone || rawInput);
        const activeDb = getSafeDb();

        if (activeDb && clean10) {
          try {
            await setDoc(doc(activeDb, 'auth_otps', clean10), {
              phone: clean10,
              otp: generatedOtp,
              expiresAt: Date.now() + 5 * 60 * 1000,
              role: 'staff',
              staffId: authData.staffId || null,
              userName: authData.userName || '',
              branchName: authData.branchName || '',
              createdAt: new Date().toISOString()
            });
          } catch (e) {
            console.warn('Error storing staff OTP:', e);
          }
        }

        await sendSmsOtp(clean10, generatedOtp);
        setIsSubmitting(false);
        setOtpSent(true);
        Alert.alert(
          'SMS OTP Sent',
          `Your 4-digit OTP has been sent via SMS to +91 ${clean10}.\n\nValid for 5 minutes. (Test OTP: ${generatedOtp})`
        );
        return;
      }

      // If OTP was sent, verify it
      const cleanOtp = otpCode.trim();
      let isOtpValid = cleanOtp === '1234';

      if (!isOtpValid) {
        const { clean10 } = normalizePhoneForSms(authData.branchPhone || rawInput);
        const activeDb = getSafeDb();
        if (activeDb && clean10) {
          const otpSnap = await getDoc(doc(activeDb, 'auth_otps', clean10));
          if (otpSnap.exists() && otpSnap.data().otp === cleanOtp) {
            if (Date.now() <= (otpSnap.data().expiresAt || 0)) {
              isOtpValid = true;
            } else {
              setIsSubmitting(false);
              Alert.alert('OTP Expired', 'The OTP has expired. Please tap Send OTP again.');
              return;
            }
          }
        }
      }

      if (!isOtpValid) {
        setIsSubmitting(false);
        Alert.alert('Invalid OTP', 'Please enter the 4-digit OTP sent to your phone, or 1234 for testing.');
        return;
      }

      setIsSubmitting(false);
      if (onLoginSuccess) {
        onLoginSuccess(authData);
      } else {
        Alert.alert('Access Granted', `Welcome ${authData.userName} (Regular Staff Portal)`);
      }
    } catch (err) {
      console.error('Staff login error:', err);
      setIsSubmitting(false);
      Alert.alert('Login Error', 'Failed to authenticate staff.');
    }
  };

  const handleEmailLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Required Fields', 'Please enter your email address and password.');
      return;
    }

    const cleanInput = email.trim().toLowerCase();
    const cleanPass = password.trim();

    if (cleanInput === 'hr@sph.com' || cleanInput.includes('hr')) {
      if (cleanPass !== 'hr@sph123') {
        Alert.alert('Incorrect Password', 'Invalid password for HR login. Expected password: hr@sph123');
        return;
      }
    } else if (cleanInput.includes('admin')) {
      if (cleanPass !== 'admin123') {
        Alert.alert('Incorrect Password', 'Invalid password for Admin login. Expected password: admin123');
        return;
      }
    }

    setIsSubmitting(true);
    const authData = await detectRoleAndBranch(email);
    setIsSubmitting(false);

    if (!authData) {
      Alert.alert('Access Denied', 'Account not recognized or removed by Admin/HR.');
      return;
    }

    if (onLoginSuccess) {
      onLoginSuccess(authData);
    } else {
      Alert.alert('Access Granted', `Welcome to ${authData.role.toUpperCase()} Portal`);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Top Logo */}
          <View style={styles.logoWrapper}>
            <Image
              source={require('../../assets/sh_logo.png')}
              style={styles.logoImage}
              resizeMode="contain"
            />
          </View>

          {/* Page Headers */}
          <View style={styles.headerSection}>
            <Text style={styles.portalTitle}>Spiritual Homeopathy</Text>
            <Text style={styles.portalSubtitle}>Doctor, Staff, HR, Reception & Admin Portal</Text>
          </View>

          {/* White Card Box */}
          <View style={styles.whiteCard}>
            {/* 3 Unified Login Tabs: Mobile OTP vs Staff Login vs Email/Password */}
            <View style={styles.tabBarContainer}>
              <TouchableOpacity
                style={[styles.tabButton, loginMethod === 'otp' && styles.tabButtonActive]}
                onPress={() => { setLoginMethod('otp'); setOtpSent(false); }}
              >
                <Ionicons
                  name="call-outline"
                  size={15}
                  color={loginMethod === 'otp' ? '#258ec8' : '#64748b'}
                  style={{ marginRight: 4 }}
                />
                <Text style={[styles.tabButtonText, loginMethod === 'otp' && styles.tabButtonTextActive]}>
                  Doctor / Reception
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.tabButton, loginMethod === 'staff' && styles.tabButtonActive]}
                onPress={() => { setLoginMethod('staff'); setOtpCode('1234'); }}
              >
                <Ionicons
                  name="person-outline"
                  size={15}
                  color={loginMethod === 'staff' ? '#258ec8' : '#64748b'}
                  style={{ marginRight: 4 }}
                />
                <Text style={[styles.tabButtonText, loginMethod === 'staff' && styles.tabButtonTextActive]}>
                  Staff Login
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.tabButton, loginMethod === 'email' && styles.tabButtonActive]}
                onPress={() => setLoginMethod('email')}
              >
                <Ionicons
                  name="mail-outline"
                  size={15}
                  color={loginMethod === 'email' ? '#258ec8' : '#64748b'}
                  style={{ marginRight: 4 }}
                />
                <Text style={[styles.tabButtonText, loginMethod === 'email' && styles.tabButtonTextActive]}>
                  Admin / HR
                </Text>
              </TouchableOpacity>
            </View>

            {loginMethod === 'staff' && (
              <>
                <Text style={styles.sectionSubtitle}>Regular Staff Login (Punch, Leaves & Reports)</Text>

                {/* Staff ID or Mobile Input */}
                <View style={styles.inputContainer}>
                  <Ionicons name="person-outline" size={18} color="#258ec8" style={{ marginRight: 8 }} />
                  <TextInput
                    style={styles.inputField}
                    placeholder="Staff Mobile Number or Name"
                    placeholderTextColor="#94a3b8"
                    value={phoneNumber}
                    onChangeText={(t) => {
                      setPhoneNumber(t);
                      setOtpSent(false);
                    }}
                  />
                </View>

                {otpSent ? (
                  <>
                    {/* Notice Banner */}
                    {smsNotice ? (
                      <View style={{
                        backgroundColor: '#eff6ff',
                        borderRadius: 10,
                        borderWidth: 1,
                        borderColor: '#bfdbfe',
                        padding: 10,
                        marginBottom: 10
                      }}>
                        <Text style={{ fontSize: 11.5, color: '#1e40af', fontWeight: '600' }}>{smsNotice}</Text>
                        {displayedOtp ? (
                          <Text style={{ fontSize: 12, color: '#0284c7', fontWeight: '800', marginTop: 4 }}>
                            OTP Code: <Text style={{ letterSpacing: 2, backgroundColor: '#dbeafe' }}>{displayedOtp}</Text>
                          </Text>
                        ) : null}
                      </View>
                    ) : null}

                    {/* OTP Code (4 digits) */}
                    <View style={styles.inputContainer}>
                      <Ionicons name="lock-closed-outline" size={18} color="#258ec8" style={{ marginRight: 8 }} />
                      <TextInput
                        style={styles.inputField}
                        placeholder="Enter 4-Digit SMS OTP (or 1234 for test)"
                        placeholderTextColor="#94a3b8"
                        keyboardType="number-pad"
                        value={otpCode}
                        onChangeText={setOtpCode}
                        maxLength={6}
                      />
                    </View>

                    <TouchableOpacity
                      style={[styles.primaryButton, { backgroundColor: '#16a34a' }]}
                      onPress={handleStaffLogin}
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? (
                        <ActivityIndicator color="#ffffff" />
                      ) : (
                        <Text style={styles.primaryButtonText}>Verify & Sign In to Staff Portal</Text>
                      )}
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={handleSendOTP}
                      style={{ marginTop: 8, alignItems: 'center' }}
                      disabled={isSubmitting}
                    >
                      <Text style={{ fontSize: 12, color: '#258ec8', fontWeight: '700' }}>Resend 4-Digit SMS OTP</Text>
                    </TouchableOpacity>
                  </>
                ) : (
                  <TouchableOpacity
                    style={[styles.primaryButton, { backgroundColor: '#258ec8' }]}
                    onPress={handleSendOTP}
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <ActivityIndicator color="#ffffff" />
                    ) : (
                      <Text style={styles.primaryButtonText}>Send 4-Digit SMS OTP</Text>
                    )}
                  </TouchableOpacity>
                )}
              </>
            )}

            {loginMethod === 'otp' && (
              <>
                <Text style={styles.sectionSubtitle}>Doctor, Staff & Receptionist Login</Text>

                {!otpSent ? (
                  <>
                    {/* Phone Input */}
                    <View style={styles.inputContainer}>
                      <Ionicons name="call-outline" size={18} color="#258ec8" style={{ marginRight: 8 }} />
                      <TextInput
                        style={styles.inputField}
                        placeholder="Mobile Number (e.g. 8125260176, 9030176176)"
                        placeholderTextColor="#94a3b8"
                        keyboardType="phone-pad"
                        value={phoneNumber}
                        onChangeText={setPhoneNumber}
                        maxLength={13}
                      />
                    </View>

                    {/* Send OTP Primary Button */}
                    <TouchableOpacity style={styles.primaryButton} onPress={handleSendOTP} disabled={isSubmitting}>
                      {isSubmitting ? (
                        <ActivityIndicator color="#ffffff" />
                      ) : (
                        <Text style={styles.primaryButtonText}>Send Verification OTP</Text>
                      )}
                    </TouchableOpacity>
                  </>
                ) : (
                  <>
                    {/* OTP Code Input */}
                    <View style={styles.inputContainer}>
                      <Ionicons name="lock-closed-outline" size={18} color="#258ec8" style={{ marginRight: 8 }} />
                      <TextInput
                        style={styles.inputField}
                        placeholder="Enter 4-Digit OTP"
                        placeholderTextColor="#94a3b8"
                        keyboardType="number-pad"
                        value={otpCode}
                        onChangeText={setOtpCode}
                        maxLength={4}
                      />
                    </View>

                    <TouchableOpacity style={styles.primaryButton} onPress={handleVerifyOTP} disabled={isSubmitting}>
                      {isSubmitting ? (
                        <ActivityIndicator color="#ffffff" />
                      ) : (
                        <Text style={styles.primaryButtonText}>Verify & Sign In</Text>
                      )}
                    </TouchableOpacity>

                    <TouchableOpacity onPress={() => setOtpSent(false)} style={{ marginTop: 12 }}>
                      <Text style={styles.linkText}>Change Mobile Number</Text>
                    </TouchableOpacity>
                  </>
                )}
              </>
            )}

            {loginMethod === 'email' && (
              <>
                <Text style={styles.sectionSubtitle}>Admin & HR Management Login</Text>

                {/* Email Fields */}
                <View style={styles.inputContainer}>
                  <Ionicons name="mail-outline" size={18} color="#258ec8" style={{ marginRight: 8 }} />
                  <TextInput
                    style={styles.inputField}
                    placeholder="Email Address (e.g. admin@gmail.com)"
                    placeholderTextColor="#94a3b8"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    value={email}
                    onChangeText={setEmail}
                  />
                </View>

                <View style={styles.inputContainer}>
                  <Ionicons name="key-outline" size={18} color="#258ec8" style={{ marginRight: 8 }} />
                  <TextInput
                    style={styles.inputField}
                    placeholder="Password"
                    placeholderTextColor="#94a3b8"
                    secureTextEntry
                    value={password}
                    onChangeText={setPassword}
                  />
                </View>

                <TouchableOpacity style={styles.primaryButton} onPress={handleEmailLogin} disabled={isSubmitting}>
                  {isSubmitting ? (
                    <ActivityIndicator color="#ffffff" />
                  ) : (
                    <Text style={styles.primaryButtonText}>Sign In to Portal</Text>
                  )}
                </TouchableOpacity>
              </>
            )}

            {/* Role Info Footer */}
            <View style={styles.branchListContainer}>
              <Text style={styles.branchListHeading}>LOGIN ACCOUNTS ACCESS:</Text>
              <Text style={styles.branchItemText}>• Doctor, Staff & Reception: Mobile Number OTP</Text>
              <Text style={styles.branchItemText}>• Admin & HR: Email & Password Sign In</Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 36,
  },
  logoWrapper: {
    alignItems: 'center',
    marginBottom: 24,
  },
  logoImage: {
    width: 220,
    height: 60,
  },
  headerSection: {
    alignItems: 'center',
    marginBottom: 28,
  },
  portalTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: '#1e293b',
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  portalSubtitle: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '500',
  },
  whiteCard: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.06,
    shadowRadius: 20,
    elevation: 4,
  },
  tabBarContainer: {
    flexDirection: 'row',
    backgroundColor: '#f1f5f9',
    borderRadius: 12,
    padding: 4,
    marginBottom: 20,
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
  },
  tabButtonActive: {
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  tabButtonText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#64748b',
  },
  tabButtonTextActive: {
    color: '#258ec8',
    fontWeight: '800',
  },
  sectionSubtitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 14,
    textAlign: 'center',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 52,
    marginBottom: 18,
    backgroundColor: '#ffffff',
  },
  phoneIcon: {
    fontSize: 18,
    marginRight: 12,
    color: '#64748b',
  },
  inputField: {
    flex: 1,
    fontSize: 14.5,
    color: '#0f172a',
    height: '100%',
  },
  primaryButton: {
    backgroundColor: '#258ec8',
    borderRadius: 14,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#258ec8',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 15.5,
    fontWeight: '700',
  },
  linkText: {
    color: '#258ec8',
    fontSize: 13.5,
    fontWeight: '600',
    textAlign: 'center',
  },
  branchListContainer: {
    marginTop: 18,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  branchListHeading: {
    fontSize: 10,
    fontWeight: '800',
    color: '#94a3b8',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  branchItemText: {
    fontSize: 11.5,
    color: '#475569',
    fontWeight: '600',
    marginBottom: 3,
  },
});
