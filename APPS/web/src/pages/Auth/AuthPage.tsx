import React, { useState, useEffect } from 'react';
import { Mail, Lock, Phone, Eye, EyeOff, ShieldCheck, AlertCircle, Loader2 } from 'lucide-react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc, setDoc, collection, query, where, getDocs, onSnapshot } from 'firebase/firestore';
import { auth, db, UserRole } from '@app/shared';
import { sendSmsOtp, generate4DigitOtp, normalizePhoneForSms } from '../../services/smsOtpService';

export interface WebLoginSuccessData {
  role: UserRole;
  userName?: string;
  branchName: string;
  branchPhone: string;
  staffId?: string;
}

interface AuthPageProps {
  onLoginSuccess?: (data: WebLoginSuccessData) => void;
}

export const AUTHORIZED_WEB_BRANCHES: Record<string, { name: string; phone: string }> = {
  '9030176176': { name: 'KPHB Branch', phone: '+91 90301 76176' },
  '9132176176': { name: 'Nallagandla Branch', phone: '+91 91321 76176' },
  '9804176176': { name: 'Dilshuknagar Branch', phone: '+91 98041 76176' },
  '9553176176': { name: 'Chandanagar Branch', phone: '+91 95531 76176' },
};

const KNOWN_DOCTOR_PHONES = ['8125260176', '9903119766', '9490808582', '1111111111'];

export const REGISTERED_CLINIC_STAFF = [
  { id: '1', name: 'Anil Kumar M', role: 'Front Desk & Operations', branch: 'KPHB', phone: '9030176176' },
  { id: '2', name: 'Ashwini Begari', role: 'Clinic Coordinator', branch: 'Chandanagar', phone: '9553176176' },
  { id: '3', name: 'Vaishnavi Peri', role: 'Patient Care & Followup', branch: 'Nallagandla', phone: '9132176176' },
  { id: '4', name: 'Nandini Gottelli', role: 'Pharmacy & Billing', branch: 'Dilshuknagar', phone: '9804176176' },
  { id: '5', name: 'Srikanth', role: 'Support Assistant', branch: 'KPHB', phone: '9030176176' },
  { id: '6', name: 'Arun Kumar', role: 'Lab & General Support', branch: 'Nallagandla', phone: '9132176176' },
  { id: '7', name: 'Aishwarya . M', role: 'Front Desk & Operations', branch: 'KPHB', phone: '7995532759' },
];

export const AuthPage: React.FC<AuthPageProps> = ({ onLoginSuccess }) => {
  const [activeRole, setActiveRole] = useState<'otp' | 'email'>('otp');
  const [emailOrUsername, setEmailOrUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [mobileNumber, setMobileNumber] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [displayedOtp, setDisplayedOtp] = useState('');
  const [smsStatusNotice, setSmsStatusNotice] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const getAuthorizedBranch = (input: string) => {
    const clean = input.replace(/\D/g, '');
    for (const [phone, info] of Object.entries(AUTHORIZED_WEB_BRANCHES)) {
      if (clean.includes(phone)) return info;
    }
    return null;
  };
  const detectWebRoleAndBranch = async (input: string): Promise<WebLoginSuccessData | null> => {
    const cleanInput = input.trim();
    const digits = cleanInput.replace(/\D/g, '');
    const clean10 = digits.length > 10 ? digits.slice(-10) : digits;
    const lower = cleanInput.toLowerCase();
    // 1. Instant Receptionist Branch Check (Dedicated desk numbers take top priority)
    for (const [recPhone, recInfo] of Object.entries(AUTHORIZED_WEB_BRANCHES)) {
      const baseBranchName = recInfo.name.toLowerCase().replace(/\s*branch$/i, '');
      if (
        (clean10 && clean10 === recPhone) ||
        (digits && (digits === recPhone || digits.endsWith(recPhone))) ||
        (lower && lower.includes(baseBranchName))
      ) {
        return {
          role: 'reception',
          userName: `${recInfo.name} Reception`,
          branchName: recInfo.name,
          branchPhone: recInfo.phone
        };
      }
    }

    if (lower.includes('reception') || lower.includes('recption')) {
      return {
        role: 'reception',
        userName: 'KPHB Branch Reception',
        branchName: 'KPHB Branch',
        branchPhone: '+91 9030176176'
      };
    }

    // 2. Instant Admin / HR Email Logins (0ms delay)
    if (lower === 'hr@sph.com' || lower.includes('hr') || digits === '9000000002') {
      const email = cleanInput.includes('@') ? cleanInput : 'hr@sph.com';
      return { role: 'hr', userName: email, branchName: 'HR Department', branchPhone: '' };
    }
    if (lower.includes('admin') || digits === '9000000001') {
      const email = cleanInput.includes('@') ? cleanInput : 'admin@sph.com';
      return { role: 'admin', userName: email, branchName: 'Admin Control Hub', branchPhone: '' };
    }

    // 3. Instant Known Doctor Seed Check (0ms delay)
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

    // 4. Instant Pre-registered Clinic Staff Check (0ms delay)
    for (const s of REGISTERED_CLINIC_STAFF) {
      if ((clean10 && s.phone === clean10) || (cleanInput && s.name.toLowerCase().includes(lower))) {
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
    if (db) {
      try {
        const [staffSnap, docSnap] = await Promise.all([
          getDocs(collection(db, 'staff')),
          digits.length >= 8 ? getDocs(collection(db, 'doctors')) : Promise.resolve({ docs: [], empty: true } as any)
        ]);

        // Check staff collection
        for (const d of staffSnap.docs) {
          const data = d.data();
          const sPhone = String(data.mobile || data.phone || '').replace(/\D/g, '');
          const sClean10 = sPhone.length > 10 ? sPhone.slice(-10) : sPhone;
          const sName = String(data.name || '').toLowerCase();

          if (sClean10 && AUTHORIZED_WEB_BRANCHES[sClean10]) {
            const recInfo = AUTHORIZED_WEB_BRANCHES[sClean10];
            if ((clean10 && clean10 === sClean10) || (digits && sPhone && clean10 === sClean10)) {
              return {
                role: 'reception',
                userName: `${recInfo.name} Reception`,
                branchName: recInfo.name,
                branchPhone: recInfo.phone,
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
            return {
              role: 'staff',
              userName: data.name || 'Staff Member',
              branchName: data.branch ? (data.branch.includes('Branch') ? data.branch : `${data.branch} Branch`) : 'KPHB Branch',
              branchPhone: data.mobile || data.phone || digits,
              staffId: d.id
            };
          }
        }

        // Check doctors collection
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
        console.warn('Firestore web parallel lookup notice:', e);
      }
    }

    // Not found / Deleted / Unauthorized
    return null;
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setIsLoading(true);

    const cleanInput = emailOrUsername.trim().toLowerCase();
    const cleanPass = password.trim();

    if (cleanInput === 'hr@sph.com' || cleanInput.includes('hr')) {
      if (cleanPass && cleanPass !== 'hr@sph123') {
        setErrorMessage('Incorrect password for HR login. Expected password: hr@sph123');
        setIsLoading(false);
        return;
      }
    } else if (cleanInput.includes('admin')) {
      if (cleanPass && cleanPass !== 'admin123') {
        setErrorMessage('Incorrect password for Admin login. Expected password: admin123');
        setIsLoading(false);
        return;
      }
    }

    const authData = await detectWebRoleAndBranch(emailOrUsername);
    if (!authData) {
      setErrorMessage('Account not recognized or login access revoked.');
      setIsLoading(false);
      return;
    }

    if (onLoginSuccess) {
      onLoginSuccess(authData);
    }
    setIsLoading(false);
  };

  // SEND REAL 4-DIGIT SMS OTP (SMS Gateway: smslogin.co, Template: 1777178867791586062)
  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!mobileNumber.trim()) {
      setErrorMessage('Please enter your mobile number.');
      return;
    }

    setIsLoading(true);
    const authData = await detectWebRoleAndBranch(mobileNumber);

    if (!authData) {
      setIsLoading(false);
      setErrorMessage('Access Denied: This mobile number is not registered as an active Doctor, Receptionist, or Staff member. If this account was deleted by Admin or HR, access is revoked.');
      return;
    }

    const generatedOtp = generate4DigitOtp();
    const { clean10 } = normalizePhoneForSms(mobileNumber);

    // Save OTP to Firestore with 5-minute expiry
    if (db && clean10) {
      try {
        await setDoc(doc(db, 'auth_otps', clean10), {
          phone: clean10,
          otp: generatedOtp,
          expiresAt: Date.now() + 5 * 60 * 1000,
          role: authData.role,
          staffId: authData.staffId || null,
          userName: authData.userName || '',
          branchName: authData.branchName || '',
          createdAt: new Date().toISOString()
        });
      } catch (err) {
        console.warn('Error saving OTP to Firestore:', err);
      }
    }

    // Send real SMS OTP
    const smsResult = await sendSmsOtp(clean10, generatedOtp);
    setIsLoading(false);
    setOtpSent(true);
    if (smsResult.success) {
      setDisplayedOtp('');
      setSmsStatusNotice(`A 4-digit verification code has been sent via SMS to +91 ${clean10}.`);
    } else {
      setDisplayedOtp(generatedOtp);
      if (smsResult.isCredentialsError) {
        setSmsStatusNotice(`SMS Gateway notice: "Invalid Credentials" returned by smslogin.co. Provider did not dispatch SMS.`);
      } else {
        setSmsStatusNotice(`SMS Delivery Notice: ${smsResult.message}`);
      }
    }
  };

  // VERIFY 4-DIGIT SMS OTP
  const handleOtpSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setIsLoading(true);

    const cleanOtp = otpCode.trim();
    if (!cleanOtp) {
      setErrorMessage('Please enter the 4-digit OTP received via SMS.');
      setIsLoading(false);
      return;
    }

    const { clean10 } = normalizePhoneForSms(mobileNumber);
    let isOtpValid = false;

    if (db && clean10) {
      try {
        const otpSnap = await getDoc(doc(db, 'auth_otps', clean10));
        if (otpSnap.exists()) {
          const data = otpSnap.data();
          if (data.otp === cleanOtp) {
            if (Date.now() <= (data.expiresAt || 0)) {
              isOtpValid = true;
            } else {
              setIsLoading(false);
              setErrorMessage('OTP has expired (5 minutes validity). Please click Send OTP again.');
              return;
            }
          }
        }
      } catch (err) {
        console.warn('Error reading OTP from Firestore:', err);
      }
    }

    // Testing fallback
    if (!isOtpValid && cleanOtp === '1234') {
      isOtpValid = true;
    }

    if (!isOtpValid) {
      setIsLoading(false);
      setErrorMessage('Invalid OTP. Please check your SMS or enter test OTP 1234.');
      return;
    }

    // Re-verify that user was not deleted in the interim
    const authData = await detectWebRoleAndBranch(mobileNumber);
    setIsLoading(false);

    if (!authData) {
      setErrorMessage('Access Denied: This staff account was deleted or deactivated by Admin / HR.');
      return;
    }

    if (onLoginSuccess) {
      onLoginSuccess(authData);
    } else {
      alert(`Successfully verified & signed in to ${authData.branchName} as ${authData.role.toUpperCase()}`);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      width: '100%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'radial-gradient(circle at center, #f5f9fc 0%, #e8eff5 100%)',
      padding: '20px'
    }}>
      {/* Centered White Login Card */}
      <div style={{
        width: '100%',
        maxWidth: '430px',
        background: '#ffffff',
        borderRadius: '24px',
        padding: '36px 32px 40px',
        boxShadow: '0 20px 60px rgba(0, 0, 0, 0.08), 0 4px 20px rgba(37, 142, 200, 0.06)',
        border: '1px solid #ffffff'
      }}>
        {/* Brand Emblem Logo */}
        <div style={{ textAlign: 'center', marginBottom: '16px' }}>
          <img
            src="/Assets/sh_logo.png"
            alt="Spiritual Homeopathy Logo"
            style={{ width: '64px', height: '64px', objectFit: 'contain' }}
            onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
          />
        </div>

        {/* Card Title & Subtitle */}
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <h1 style={{
            fontSize: '22px !important',
            fontWeight: 800,
            color: '#1e293b',
            letterSpacing: '-0.3px',
            marginBottom: '4px'
          }}>
            Spiritual Homeopathy
          </h1>
          <p style={{
            fontSize: '13px !important',
            color: '#94a3b8',
            fontWeight: 500
          }}>
            Doctor, Staff, HR, Reception & Admin Portal
          </p>
        </div>

        {/* 3 Segmented Login Mode Switcher */}
        <div style={{
          display: 'flex',
          background: '#f1f5f9',
          borderRadius: '12px',
          padding: '4px',
          marginBottom: '24px',
          gap: '4px'
        }}>
          <button
            type="button"
            onClick={() => {
              setActiveRole('otp');
              setErrorMessage('');
            }}
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              padding: '9px 8px',
              borderRadius: '9px',
              border: 'none',
              background: activeRole === 'otp' ? '#ffffff' : 'transparent',
              color: activeRole === 'otp' ? '#258ec8' : '#64748b',
              fontWeight: activeRole === 'otp' ? 800 : 600,
              fontSize: '12px',
              cursor: 'pointer',
              boxShadow: activeRole === 'otp' ? '0 2px 8px rgba(0,0,0,0.06)' : 'none',
              transition: 'all 0.15s ease'
            }}
          >
            <Phone size={14} color={activeRole === 'otp' ? '#258ec8' : '#64748b'} />
            Doctor / Reception
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveRole('email');
              setErrorMessage('');
            }}
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              padding: '9px 8px',
              borderRadius: '9px',
              border: 'none',
              background: activeRole === 'email' ? '#ffffff' : 'transparent',
              color: activeRole === 'email' ? '#258ec8' : '#64748b',
              fontWeight: activeRole === 'email' ? 800 : 600,
              fontSize: '12px',
              cursor: 'pointer',
              boxShadow: activeRole === 'email' ? '0 2px 8px rgba(0,0,0,0.06)' : 'none',
              transition: 'all 0.15s ease'
            }}
          >
            <Mail size={14} color={activeRole === 'email' ? '#258ec8' : '#64748b'} />
            Admin / HR
          </button>
        </div>

        {/* Error Notification Alert */}
        {errorMessage ? (
          <div style={{
            background: '#fef2f2',
            border: '1px solid #fca5a5',
            color: '#ef4444',
            padding: '10px 14px',
            borderRadius: '12px',
            marginBottom: '18px',
            fontSize: '12px !important',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'flex-start',
            gap: '8px'
          }}>
            <AlertCircle size={16} color="#ef4444" style={{ marginTop: '2px', flexShrink: 0 }} />
            <span>{errorMessage}</span>
          </div>
        ) : null}

        {/* Form Body */}

        {activeRole === 'otp' ? (
          <form onSubmit={!otpSent ? handleSendOtp : handleOtpSignIn} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12.5px !important', fontWeight: 700, color: '#475569', marginBottom: '8px' }}>
                Mobile Number (Doctor & Reception)
              </label>
              <div style={{ display: 'flex', alignItems: 'center', background: '#eef5fc', borderRadius: '10px', padding: '0 14px', height: '46px', border: '1px solid #e0ecf8' }}>
                <Phone size={16} color="#64748b" style={{ marginRight: '12px' }} />
                <input
                  type="tel"
                  value={mobileNumber}
                  onChange={e => setMobileNumber(e.target.value)}
                  placeholder="e.g. 8125260176 or 9030176176"
                  style={{ background: 'transparent', border: 'none', outline: 'none', width: '100%', fontSize: '13px !important', color: '#0f172a', fontWeight: 500 }}
                  required
                />
              </div>
            </div>

            {otpSent && (
              <div>
                {smsStatusNotice && (
                  <div style={{
                    backgroundColor: '#eff6ff',
                    border: '1px solid #bfdbfe',
                    borderRadius: '10px',
                    padding: '10px 12px',
                    marginBottom: '12px',
                    fontSize: '11.5px',
                    color: '#1e40af'
                  }}>
                    <div style={{ fontWeight: 600, marginBottom: displayedOtp ? '4px' : '0' }}>{smsStatusNotice}</div>
                    {displayedOtp && (
                      <div style={{ fontSize: '12px', fontWeight: 800, color: '#0369a1' }}>
                        OTP: <span style={{ letterSpacing: '2px', background: '#dbeafe', padding: '1px 6px', borderRadius: '4px' }}>{displayedOtp}</span>
                      </div>
                    )}
                  </div>
                )}
                <label style={{ display: 'block', fontSize: '12.5px !important', fontWeight: 700, color: '#475569', marginBottom: '8px' }}>
                  Verification OTP
                </label>
                <div style={{ display: 'flex', alignItems: 'center', background: '#eef5fc', borderRadius: '10px', padding: '0 14px', height: '46px', border: '1px solid #e0ecf8' }}>
                  <Lock size={16} color="#64748b" style={{ marginRight: '12px' }} />
                  <input
                    type="text"
                    value={otpCode}
                    onChange={e => setOtpCode(e.target.value)}
                    placeholder="Enter 4-digit OTP"
                    maxLength={4}
                    style={{ background: 'transparent', border: 'none', outline: 'none', width: '100%', fontSize: '13px !important', color: '#0f172a', fontWeight: 500 }}
                    required
                  />
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              style={{
                background: '#258ec8',
                color: '#ffffff',
                border: 'none',
                height: '46px',
                borderRadius: '10px',
                fontSize: '14.5px !important',
                fontWeight: 800,
                cursor: 'pointer',
                marginTop: '8px',
                boxShadow: '0 4px 14px rgba(37, 142, 200, 0.25)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
            >
              {isLoading ? <Loader2 size={18} className="animate-spin" /> : <ShieldCheck size={18} color="#ffffff" />}
              {!otpSent ? 'Send Verification OTP' : 'Verify & Sign In'}
            </button>
          </form>
        ) : activeRole === 'email' ? (
          <form onSubmit={handleSignIn} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12.5px !important', fontWeight: 700, color: '#475569', marginBottom: '8px' }}>
                Management Email Address (Admin / HR)
              </label>
              <div style={{ display: 'flex', alignItems: 'center', background: '#eef5fc', borderRadius: '10px', padding: '0 14px', height: '46px', border: '1px solid #e0ecf8' }}>
                <Mail size={16} color="#64748b" style={{ marginRight: '12px' }} />
                <input
                  type="text"
                  value={emailOrUsername}
                  onChange={e => setEmailOrUsername(e.target.value)}
                  placeholder="e.g. admin@gmail.com or hr@spiritualhomeo.com"
                  style={{ background: 'transparent', border: 'none', outline: 'none', width: '100%', fontSize: '13px !important', color: '#0f172a', fontWeight: 500 }}
                  required
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12.5px !important', fontWeight: 700, color: '#475569', marginBottom: '8px' }}>
                Password
              </label>
              <div style={{ display: 'flex', alignItems: 'center', background: '#eef5fc', borderRadius: '10px', padding: '0 14px', height: '46px', border: '1px solid #e0ecf8', position: 'relative' }}>
                <Lock size={16} color="#64748b" style={{ marginRight: '12px' }} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  style={{ background: 'transparent', border: 'none', outline: 'none', width: '100%', fontSize: '13px !important', color: '#0f172a', fontWeight: 500, paddingRight: '30px' }}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{ position: 'absolute', right: '12px', background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', display: 'flex', alignItems: 'center' }}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              style={{
                background: '#258ec8',
                color: '#ffffff',
                border: 'none',
                height: '46px',
                borderRadius: '10px',
                fontSize: '14.5px !important',
                fontWeight: 800,
                cursor: 'pointer',
                marginTop: '8px',
                boxShadow: '0 4px 14px rgba(37, 142, 200, 0.25)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
            >
              {isLoading ? <Loader2 size={18} className="animate-spin" /> : <ShieldCheck size={18} color="#ffffff" />}
              Sign In to Management Portal
            </button>
          </form>
        ) : null}

      </div>
    </div>
  );
};
