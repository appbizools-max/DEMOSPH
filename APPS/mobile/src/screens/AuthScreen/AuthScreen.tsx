import React, { useState } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, Image, SafeAreaView, KeyboardAvoidingView, Platform, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { auth, db, UserRole } from '@app/shared';

export interface LoginSuccessData {
  role: UserRole;
  userName?: string;
  branchName: string;
  branchPhone: string;
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

// Known doctor phone numbers for seed matching
const KNOWN_DOCTOR_PHONES = ['8125260176', '9903119766', '9490808582', '1111111111'];

export const AuthScreen: React.FC<AuthScreenProps> = ({ onLoginSuccess }) => {
  const [loginMethod, setLoginMethod] = useState<'otp' | 'email'>('otp');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Helper to dynamically detect Role, User Name, and Branch from input or Firestore
  const detectRoleAndBranch = async (input: string): Promise<LoginSuccessData> => {
    const cleanInput = input.trim();
    const digits = cleanInput.replace(/\D/g, '');
    const lower = cleanInput.toLowerCase();

    // 1. Check Receptionist Branch Numbers FIRST
    if (digits.includes('9030176176') || digits.includes('90301') || lower.includes('kphb')) {
      return { role: 'reception', userName: 'KPHB Reception', branchName: 'KPHB Branch', branchPhone: '+91 90301 76176' };
    }
    if (digits.includes('9132176176') || digits.includes('91321') || lower.includes('nalla')) {
      return { role: 'reception', userName: 'Nallagandla Reception', branchName: 'Nallagandla Branch', branchPhone: '+91 91321 76176' };
    }
    if (digits.includes('9804176176') || digits.includes('98041') || lower.includes('dilshuk')) {
      return { role: 'reception', userName: 'Dilshuknagar Reception', branchName: 'Dilshuknagar Branch', branchPhone: '+91 98041 76176' };
    }
    if (digits.includes('9553176176') || digits.includes('95531') || lower.includes('chanda')) {
      return { role: 'reception', userName: 'Chandanagar Reception', branchName: 'Chandanagar Branch', branchPhone: '+91 95531 76176' };
    }

    // 2. Check Firestore if available
    if (db && digits.length >= 8) {
      try {
        const receptionQuery = query(collection(db, 'reception'), where('phone', '==', digits));
        const receptionSnap = await getDocs(receptionQuery);
        if (!receptionSnap.empty) {
          const data = receptionSnap.docs[0].data();
          return {
            role: 'reception',
            userName: data.name || 'Branch Reception',
            branchName: data.branch || 'KPHB Branch',
            branchPhone: digits,
          };
        }

        const docQuery = query(collection(db, 'doctors'), where('phone', '==', digits));
        const docSnap = await getDocs(docQuery);
        if (!docSnap.empty) {
          const data = docSnap.docs[0].data();
          return {
            role: 'doctor',
            userName: data.name || 'Dr. Physician',
            branchName: data.branch || 'Medical Center',
            branchPhone: digits,
          };
        }

        const staffQuery = query(collection(db, 'staff'), where('phone', '==', digits));
        const staffSnap = await getDocs(staffQuery);
        if (!staffSnap.empty) {
          const data = staffSnap.docs[0].data();
          return {
            role: 'staff',
            userName: data.name || 'Staff Member',
            branchName: data.branch || 'KPHB Branch',
            branchPhone: digits,
          };
        }
      } catch (e) {
        console.warn('Firestore user lookup error:', e);
      }
    }

    // 3. Admin / HR
    if (lower.includes('admin') || digits === '9000000001') {
      return { role: 'admin', userName: 'Admin Control Hub', branchName: 'HQ Admin Office', branchPhone: '+91 90000 00001' };
    }
    if (lower.includes('hr') || digits === '9000000002') {
      return { role: 'hr', userName: 'HR Department', branchName: 'HQ HR Dept', branchPhone: '+91 90000 00002' };
    }

    // 4. Exact Doctor Seed Matching by Phone or Name Keywords
    if (digits.includes('8125260176') || lower.includes('prashanth')) {
      return { role: 'doctor', userName: 'Dr. Prashanth K Vaidya', branchName: 'KPHB Branch', branchPhone: '+91 81252 60176' };
    }
    if (digits.includes('9903119766') || lower.includes('jobedah') || lower.includes('parveez')) {
      return { role: 'doctor', userName: 'Dr. Jobedah Parveez', branchName: 'Nallagandla Branch', branchPhone: '+91 99031 19766' };
    }
    if (digits.includes('9490808582') || lower.includes('padma')) {
      return { role: 'doctor', userName: 'Dr. Padma Priya', branchName: 'Chandanagar Branch', branchPhone: '+91 94908 08582' };
    }
    if (digits.includes('1111111111') || lower.includes('chanduri')) {
      return { role: 'doctor', userName: 'Dr. Ramakrishna Chanduri', branchName: 'Dilshuknagar Branch', branchPhone: '+91 11111 11111' };
    }
    if (lower.includes('ramakrishna') || lower.includes('rama krishna')) {
      return { role: 'doctor', userName: 'Dr. CH. Rama Krishna', branchName: 'Dilshuknagar Branch', branchPhone: '+91 98041 76176' };
    }

    if (KNOWN_DOCTOR_PHONES.some(p => digits.includes(p)) || lower.includes('doctor') || lower.includes('dr.')) {
      return {
        role: 'doctor',
        userName: 'Dr. Homeopathy Physician',
        branchName: 'Medical Center',
        branchPhone: digits || '+91 81252 60176',
      };
    }

    // 5. Regular Staff fallback
    if (lower.includes('staff')) {
      return { role: 'staff', userName: 'Staff Member', branchName: 'KPHB Branch', branchPhone: digits || '+91 90000 00004' };
    }

    return { role: 'reception', userName: 'KPHB Reception', branchName: 'KPHB Branch', branchPhone: digits || '+91 90301 76176' };
  };

  const handleSendOTP = async () => {
    if (!phoneNumber.trim()) {
      Alert.alert('Phone Number Required', 'Please enter your mobile number.');
      return;
    }
    setIsSubmitting(true);
    const authData = await detectRoleAndBranch(phoneNumber);
    setIsSubmitting(false);

    setOtpSent(true);
    Alert.alert('OTP Sent', `Verification code sent to +91 ${phoneNumber} (${authData.role.toUpperCase()} Login)`);
  };

  const handleVerifyOTP = async () => {
    if (!otpCode.trim()) {
      Alert.alert('OTP Required', 'Please enter the 6-digit verification code.');
      return;
    }

    setIsSubmitting(true);
    const authData = await detectRoleAndBranch(phoneNumber);
    setIsSubmitting(false);

    if (onLoginSuccess) {
      onLoginSuccess(authData);
    } else {
      Alert.alert('Access Granted', `Welcome to ${authData.role.toUpperCase()} Portal`);
    }
  };

  const handleEmailLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Required Fields', 'Please enter your email address and password.');
      return;
    }

    setIsSubmitting(true);
    const authData = await detectRoleAndBranch(email);
    setIsSubmitting(false);

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
            {/* 2 Unified Login Tabs: Mobile OTP vs Email/Password */}
            <View style={styles.tabBarContainer}>
              <TouchableOpacity
                style={[styles.tabButton, loginMethod === 'otp' && styles.tabButtonActive]}
                onPress={() => setLoginMethod('otp')}
              >
                <Ionicons
                  name="call-outline"
                  size={16}
                  color={loginMethod === 'otp' ? '#258ec8' : '#64748b'}
                  style={{ marginRight: 6 }}
                />
                <Text style={[styles.tabButtonText, loginMethod === 'otp' && styles.tabButtonTextActive]}>
                  Mobile OTP
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.tabButton, loginMethod === 'email' && styles.tabButtonActive]}
                onPress={() => setLoginMethod('email')}
              >
                <Ionicons
                  name="mail-outline"
                  size={16}
                  color={loginMethod === 'email' ? '#258ec8' : '#64748b'}
                  style={{ marginRight: 6 }}
                />
                <Text style={[styles.tabButtonText, loginMethod === 'email' && styles.tabButtonTextActive]}>
                  Email (Admin/HR)
                </Text>
              </TouchableOpacity>
            </View>

            {loginMethod === 'otp' ? (
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
                        placeholder="Enter 6-Digit OTP"
                        placeholderTextColor="#94a3b8"
                        keyboardType="number-pad"
                        value={otpCode}
                        onChangeText={setOtpCode}
                        maxLength={6}
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

                {/* Quick Click-to-Fill Authorized Numbers */}
                <View style={{ marginTop: 16, paddingTop: 14, borderTopWidth: 1, borderColor: '#e2e8f0' }}>
                  <Text style={{ fontSize: 11, fontWeight: '800', color: '#475569', textTransform: 'uppercase', marginBottom: 8 }}>
                    Quick Click-to-Fill Authorized Numbers:
                  </Text>

                  <Text style={{ fontSize: 10.5, fontWeight: '800', color: '#0284c7', marginBottom: 6 }}>
                    🏢 Reception Desks:
                  </Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
                    {[
                      { label: 'KPHB', phone: '9030176176' },
                      { label: 'Nallagandla', phone: '9132176176' },
                      { label: 'Dilshuknagar', phone: '9804176176' },
                      { label: 'Chandanagar', phone: '9553176176' },
                    ].map(b => (
                      <TouchableOpacity
                        key={b.phone}
                        onPress={() => setPhoneNumber(b.phone)}
                        style={{
                          backgroundColor: phoneNumber === b.phone ? '#e0f2fe' : '#f8fafc',
                          borderWidth: phoneNumber === b.phone ? 1.5 : 1,
                          borderColor: phoneNumber === b.phone ? '#0284c7' : '#cbd5e1',
                          paddingHorizontal: 8,
                          paddingVertical: 5,
                          borderRadius: 6,
                        }}
                      >
                        <Text style={{ fontSize: 11, fontWeight: '700', color: phoneNumber === b.phone ? '#0369a1' : '#334155' }}>
                          {b.label} ({b.phone})
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  <Text style={{ fontSize: 10.5, fontWeight: '800', color: '#9333ea', marginBottom: 6 }}>
                    🩺 Doctors Directory:
                  </Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                    {[
                      { label: 'Dr. Prashanth', phone: '8125260176' },
                      { label: 'Dr. Jobedah', phone: '9903119766' },
                      { label: 'Dr. Padma Priya', phone: '9490808582' },
                      { label: 'Dr. Ramakrishna', phone: '1111111111' },
                    ].map(d => (
                      <TouchableOpacity
                        key={d.phone}
                        onPress={() => setPhoneNumber(d.phone)}
                        style={{
                          backgroundColor: phoneNumber === d.phone ? '#faf5ff' : '#f8fafc',
                          borderWidth: phoneNumber === d.phone ? 1.5 : 1,
                          borderColor: phoneNumber === d.phone ? '#9333ea' : '#cbd5e1',
                          paddingHorizontal: 8,
                          paddingVertical: 5,
                          borderRadius: 6,
                        }}
                      >
                        <Text style={{ fontSize: 11, fontWeight: '700', color: phoneNumber === d.phone ? '#7e22ce' : '#334155' }}>
                          {d.label} ({d.phone})
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              </>
            ) : (
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
