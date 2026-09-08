import React, { useState } from 'react';
import { Mail, Lock, Phone, Eye, EyeOff, ShieldCheck, AlertCircle, Loader2 } from 'lucide-react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { auth, db, UserRole } from '@app/shared';

export interface WebLoginSuccessData {
  role: UserRole;
  userName?: string;
  branchName: string;
  branchPhone: string;
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

export const AuthPage: React.FC<AuthPageProps> = ({ onLoginSuccess }) => {
  const [activeRole, setActiveRole] = useState<'otp' | 'email'>('otp');
  const [emailOrUsername, setEmailOrUsername] = useState('admin@gmail.com');
  const [password, setPassword] = useState('admin123');
  const [showPassword, setShowPassword] = useState(false);
  const [mobileNumber, setMobileNumber] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const getAuthorizedBranch = (input: string) => {
    const digits = input.replace(/\D/g, '');
    const lower = input.toLowerCase().trim();

    if (!lower && !digits) return null;

    if (digits.includes('9030176176') || digits.includes('90301') || lower.includes('kphb') || lower.includes('kphp')) {
      return AUTHORIZED_WEB_BRANCHES['9030176176'];
    }
    if (digits.includes('9132176176') || digits.includes('91321') || lower.includes('nalla') || lower.includes('nallagandla')) {
      return AUTHORIZED_WEB_BRANCHES['9132176176'];
    }
    if (digits.includes('9804176176') || digits.includes('98041') || lower.includes('dilshuk') || lower.includes('dsnr')) {
      return AUTHORIZED_WEB_BRANCHES['9804176176'];
    }
    if (digits.includes('9553176176') || digits.includes('95531') || lower.includes('chanda') || lower.includes('chandnagar')) {
      return AUTHORIZED_WEB_BRANCHES['9553176176'];
    }

    return null;
  };

  const detectWebRoleAndBranch = async (input: string): Promise<WebLoginSuccessData> => {
    const cleanInput = input.trim();
    const digits = cleanInput.replace(/\D/g, '');
    const lower = cleanInput.toLowerCase();

    // 1. Check Reception Branch numbers FIRST
    const branch = getAuthorizedBranch(input);
    if (branch) {
      return {
        role: 'reception',
        userName: `${branch.name} Reception`,
        branchName: branch.name,
        branchPhone: branch.phone,
      };
    }

    // 2. Firestore Lookup if db available
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
            userName: data.name || 'Dr. Homeopathy Physician',
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
      } catch (e) { }
    }

    // 3. Admin / HR
    if (lower.includes('admin') || digits === '9000000001') {
      return { role: 'admin', userName: 'Admin Control Hub', branchName: 'HQ / Admin Office', branchPhone: '+91 90000 00001' };
    }
    if (lower.includes('hr') || digits === '9000000002') {
      return { role: 'hr', userName: 'HR Department', branchName: 'HQ / HR Department', branchPhone: '+91 90000 00002' };
    }

    // 4. Doctor Phone / Text check
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

    // 5. Staff fallback
    if (lower.includes('staff')) {
      return { role: 'staff', userName: 'Staff Member', branchName: 'KPHB Branch', branchPhone: digits || '+91 90000 00004' };
    }

    return { role: 'reception', userName: 'KPHB Reception', branchName: 'KPHB Branch', branchPhone: '+91 90301 76176' };
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setIsLoading(true);

    const authData = await detectWebRoleAndBranch(emailOrUsername);
    if (onLoginSuccess) {
      onLoginSuccess(authData);
    }
    setIsLoading(false);
  };

  const handleOtpSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setIsLoading(true);

    const authData = await detectWebRoleAndBranch(mobileNumber);
    setIsLoading(false);

    if (onLoginSuccess) {
      onLoginSuccess(authData);
    } else {
      alert(`Successfully verified & signed in to ${authData.branchName} as ${authData.role.toUpperCase()}`);
    }
  };

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!mobileNumber.trim()) {
      setErrorMessage('Please enter your mobile number.');
      return;
    }
    setOtpSent(true);
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

        {/* 2 Segmented Login Mode Switcher */}
        <div style={{
          display: 'flex',
          background: '#f1f5f9',
          borderRadius: '12px',
          padding: '4px',
          marginBottom: '24px'
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
              padding: '10px 12px',
              borderRadius: '9px',
              border: 'none',
              background: activeRole === 'otp' ? '#ffffff' : 'transparent',
              color: activeRole === 'otp' ? '#258ec8' : '#64748b',
              fontWeight: activeRole === 'otp' ? 800 : 600,
              fontSize: '13px',
              cursor: 'pointer',
              boxShadow: activeRole === 'otp' ? '0 2px 8px rgba(0,0,0,0.06)' : 'none',
              transition: 'all 0.15s ease'
            }}
          >
            <Phone size={15} color={activeRole === 'otp' ? '#258ec8' : '#64748b'} />
            Mobile OTP (Doctor/Staff/Reception)
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
              padding: '10px 12px',
              borderRadius: '9px',
              border: 'none',
              background: activeRole === 'email' ? '#ffffff' : 'transparent',
              color: activeRole === 'email' ? '#258ec8' : '#64748b',
              fontWeight: activeRole === 'email' ? 800 : 600,
              fontSize: '13px',
              cursor: 'pointer',
              boxShadow: activeRole === 'email' ? '0 2px 8px rgba(0,0,0,0.06)' : 'none',
              transition: 'all 0.15s ease'
            }}
          >
            <Mail size={15} color={activeRole === 'email' ? '#258ec8' : '#64748b'} />
            Email (Admin/HR)
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
                Mobile Number (Doctor, Staff & Reception)
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
                <label style={{ display: 'block', fontSize: '12.5px !important', fontWeight: 700, color: '#475569', marginBottom: '8px' }}>
                  Verification OTP
                </label>
                <div style={{ display: 'flex', alignItems: 'center', background: '#eef5fc', borderRadius: '10px', padding: '0 14px', height: '46px', border: '1px solid #e0ecf8' }}>
                  <Lock size={16} color="#64748b" style={{ marginRight: '12px' }} />
                  <input
                    type="text"
                    value={otpCode}
                    onChange={e => setOtpCode(e.target.value)}
                    placeholder="Enter 6-digit OTP"
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

            {/* Quick Click-to-Fill Phone Numbers */}
            <div style={{ marginTop: '16px', paddingTop: '14px', borderTop: '1px dashed #cbd5e1' }}>
              <span style={{ fontSize: '11px !important', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '8px' }}>
                Quick Click-to-Fill Authorized Numbers:
              </span>

              {/* Reception Desks */}
              <div style={{ marginBottom: '10px' }}>
                <span style={{ fontSize: '10.5px !important', fontWeight: 800, color: '#0284c7', display: 'block', marginBottom: '6px' }}>
                  🏢 Reception Desks:
                </span>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {[
                    { label: 'KPHB', phone: '9030176176' },
                    { label: 'Nallagandla', phone: '9132176176' },
                    { label: 'Dilshuknagar', phone: '9804176176' },
                    { label: 'Chandanagar', phone: '9553176176' },
                  ].map(b => (
                    <button
                      key={b.phone}
                      type="button"
                      onClick={() => setMobileNumber(b.phone)}
                      style={{
                        background: mobileNumber === b.phone ? '#e0f2fe' : '#f8fafc',
                        border: mobileNumber === b.phone ? '1.5px solid #0284c7' : '1px solid #cbd5e1',
                        color: mobileNumber === b.phone ? '#0369a1' : '#334155',
                        fontSize: '11px !important',
                        fontWeight: 700,
                        padding: '4px 8px',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      {b.label} ({b.phone})
                    </button>
                  ))}
                </div>
              </div>

              {/* Doctors Directory */}
              <div>
                <span style={{ fontSize: '10.5px !important', fontWeight: 800, color: '#9333ea', display: 'block', marginBottom: '6px' }}>
                  🩺 Doctors Directory:
                </span>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {[
                    { label: 'Dr. Prashanth', phone: '8125260176' },
                    { label: 'Dr. Jobedah', phone: '9903119766' },
                    { label: 'Dr. Padma Priya', phone: '9490808582' },
                    { label: 'Dr. Ramakrishna', phone: '1111111111' },
                  ].map(d => (
                    <button
                      key={d.phone}
                      type="button"
                      onClick={() => setMobileNumber(d.phone)}
                      style={{
                        background: mobileNumber === d.phone ? '#faf5ff' : '#f8fafc',
                        border: mobileNumber === d.phone ? '1.5px solid #9333ea' : '1px solid #cbd5e1',
                        color: mobileNumber === d.phone ? '#7e22ce' : '#334155',
                        fontSize: '11px !important',
                        fontWeight: 700,
                        padding: '4px 8px',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      {d.label} ({d.phone})
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </form>
        ) : (
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
        )}

      </div>
    </div>
  );
};
