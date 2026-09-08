import React, { useState, useEffect } from 'react';
import { LogOut, Phone, Building2, Clock, Calendar, User } from 'lucide-react';
import { signOutUser } from '@app/shared';

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  userName?: string;
  branchName?: string;
  branchPhone?: string;
  role?: string;
}

const resolveDoctorName = (phone: string, storedName?: string): string => {
  if (storedName && storedName.trim() && storedName !== 'Dr. Homeopathy Physician' && storedName !== 'Dr. Physician') {
    return storedName;
  }
  const digits = (phone || '').replace(/\D/g, '');
  if (digits.includes('8125260176')) return 'Dr. Prashanth K Vaidya';
  if (digits.includes('9903119766')) return 'Dr. Jobedah Parveez';
  if (digits.includes('9490808582')) return 'Dr. Padma Priya';
  if (digits.includes('1111111111')) return 'Dr. Ramakrishna Chanduri';
  if (digits.includes('9804176176')) return 'Dr. CH. Rama Krishna';
  return storedName || 'Homeopathy Physician';
};

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  userName,
  branchName = "KPHB Branch",
  branchPhone = "+91 90301 76176",
  role
}) => {
  const [timeStr, setTimeStr] = useState('');
  const [dayDateStr, setDayDateStr] = useState('');

  // Live real-time clock and date formatter
  useEffect(() => {
    const updateDateTime = () => {
      const now = new Date();
      setTimeStr(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true }));
      setDayDateStr(now.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }));
    };
    updateDateTime();
    const interval = setInterval(updateDateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleBrandClick = () => {
    if (role === 'admin') {
      setActiveTab('admin');
    } else if (role === 'hr') {
      setActiveTab('hr');
    } else if (role === 'doctor') {
      setActiveTab('doctor');
    } else if (role === 'staff') {
      setActiveTab('staff');
    } else {
      setActiveTab('reception_dashboard');
    }
  };

  const handleLogout = async () => {
    await signOutUser();
    setActiveTab('auth');
  };

  return (
    <nav style={{
      background: '#ffffff',
      borderBottom: '1px solid #e2e8f0',
      position: 'sticky',
      top: 0,
      zIndex: 100,
      padding: '8px 24px',
      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.03)'
    }}>
      <div style={{ maxWidth: '1400px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>

        {/* LEFT SIDE: Logo + Minimalist Date & Time Pill */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          {/* Brand Logo & Title */}
          <div
            onClick={handleBrandClick}
            style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}
          >
            <img
              src="/Assets/sh_logo.png"
              alt="Spiritual Homeo Logo"
              style={{ width: '36px', height: '36px', borderRadius: '8px', objectFit: 'contain' }}
              onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
            />
            <div>
              <h2 style={{ fontSize: '15px !important', fontWeight: 800, color: '#258ec8', lineHeight: 1.2 }}>
                Spiritual Homeo
              </h2>
              <span style={{ fontSize: '10px', color: '#64748b', fontWeight: 600 }}>
                {role === 'admin' ? 'Admin Control Hub' : role === 'hr' ? 'HR Portal' : role === 'doctor' ? 'Doctor Portal' : 'Staff Portal'}
              </span>
            </div>
          </div>

          <div style={{ height: '22px', width: '1px', background: '#cbd5e1' }} />

          {/* Minimalist Light Date & Time Pill */}
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            padding: '4px 12px',
            borderRadius: '20px',
            boxShadow: '0 1px 4px rgba(0, 0, 0, 0.02)'
          }}>
            {/* Live Green Pulse Indicator */}
            <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#a8ce3a', boxShadow: '0 0 6px #a8ce3a' }} />

            <Clock size={13} color="#258ec8" />
            <span style={{ fontSize: '11.5px !important', fontWeight: 800, color: '#258ec8', letterSpacing: '0.2px' }}>
              {timeStr}
            </span>

            <span style={{ color: '#cbd5e1', fontSize: '11px' }}>•</span>

            <Calendar size={12} color="#64748b" />
            <span style={{ fontSize: '11px !important', fontWeight: 600, color: '#475569' }}>
              {dayDateStr}
            </span>
          </div>
        </div>

        {/* RIGHT SIDE: User / Doctor / Branch Info Pill + Log Out Button */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>

          {/* User / Doctor / Branch Pill */}
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '10px',
            background: 'rgba(37, 142, 200, 0.06)',
            border: '1px solid rgba(37, 142, 200, 0.25)',
            padding: '6px 14px',
            borderRadius: '20px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              {role === 'doctor' ? <User size={14} color="#258ec8" /> : <Building2 size={14} color="#258ec8" />}
              <span style={{ fontWeight: 800, color: '#0f172a', fontSize: '12px !important' }}>
                {role === 'doctor' ? resolveDoctorName(branchPhone, userName) : branchName}
              </span>
            </div>

            <span style={{ color: '#cbd5e1', fontSize: '11px' }}>•</span>

            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <Phone size={12} color="#a8ce3a" />
              <span style={{ fontWeight: 700, color: '#258ec8', fontSize: '11.5px !important' }}>
                {branchPhone}
              </span>
            </div>
          </div>

          {/* Log Out Button */}
          <button
            onClick={handleLogout}
            style={{
              background: '#fef2f2',
              border: '1px solid #fecaca',
              color: '#ef4444',
              padding: '6px 12px',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '11.5px !important',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              transition: 'all 0.2s ease'
            }}
          >
            <LogOut size={13} color="#ef4444" />
            Log Out
          </button>
        </div>

      </div>
    </nav>
  );
};
