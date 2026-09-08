import React, { useState, useEffect } from 'react';
import { UserCheck, Building2, Clock, Phone } from 'lucide-react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '@app/shared';

export const StaffManagementPage: React.FC = () => {
  const DEFAULT_STAFF = [
    { name: 'Anil Kumar M', role: 'Regular Staff', branch: 'KPHB', phone: '90301 76176', hours: '10.5 hrs/day', shift: '10:00 AM - 08:30 PM', salary: '₹22,000' },
    { name: 'Ashwini Begari', role: 'Regular Staff', branch: 'Chandanagar', phone: '95531 76176', hours: '8.5 hrs/day', shift: '10:00 AM - 06:30 PM', salary: '₹17,000' },
    { name: 'Vaishnavi Peri', role: 'Regular Staff', branch: 'Nallagandla', phone: '91321 76176', hours: '9.5 hrs/day', shift: '09:30 AM - 07:00 PM', salary: '₹17,000' },
    { name: 'Nandini Gottelli', role: 'Regular Staff', branch: 'Dilshuknagar', phone: '98041 76176', hours: '8 hrs/day', shift: '10:00 AM - 02:00 PM | 04:30 PM - 08:30 PM', salary: '₹15,000' },
    { name: 'Srikanth', role: 'Regular Staff', branch: 'KPHB', phone: '90301 76176', hours: '10 hrs/day', shift: '10:00 AM - 08:00 PM', salary: '₹18,000' },
    { name: 'Arun Kumar', role: 'Regular Staff', branch: 'Nallagandla', phone: '91321 76176', hours: '8 hrs/day', shift: '10:00 AM - 06:00 PM', salary: '₹14,000' },
  ];

  const [staffList, setStaffList] = useState(DEFAULT_STAFF);

  useEffect(() => {
    if (!db) return;
    const colRef = collection(db, 'staff');
    const unsub = onSnapshot(colRef, (snap) => {
      if (!snap.empty) {
        const loaded = snap.docs.map(d => {
          const data = d.data();
          return {
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

  return (
    <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '20px', padding: '22px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ fontSize: '16px !important', fontWeight: 800, color: '#0f172a' }}>
            Staff Management & Working Hours Directory
          </h2>
          <p style={{ fontSize: '12px !important', color: '#64748b' }}>
            Structured management across Clinic Staff, Receptionists, and Doctors.
          </p>
        </div>
      </div>

      {/* 3 SECTION SIDE-BY-SIDE GRID LAYOUT */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '18px' }}>
        
        {/* SECTION 1: CLINIC STAFF */}
        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', paddingBottom: '10px', borderBottom: '1px solid #cbd5e1' }}>
            <div style={{ background: '#258ec8', color: '#ffffff', padding: '6px', borderRadius: '8px' }}>
              <UserCheck size={16} />
            </div>
            <div>
              <h3 style={{ fontSize: '13.5px !important', fontWeight: 800, color: '#0f172a' }}>1. Regular Staff</h3>
              <span style={{ fontSize: '10.5px !important', color: '#64748b', fontWeight: 700 }}>{staffList.length} Regular Staff Members</span>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {staffList.map(s => (
              <div key={s.name} style={{ background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '12px', padding: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                  <span style={{ fontSize: '13px !important', fontWeight: 800, color: '#0f172a' }}>{s.name}</span>
                  <span style={{ background: '#e0f2fe', color: '#0284c7', fontSize: '10px !important', fontWeight: 800, padding: '2px 6px', borderRadius: '6px' }}>{s.branch}</span>
                </div>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11.5px !important', color: '#64748b', marginBottom: '6px' }}>
                  <Phone size={12} color="#0284c7" /> +91 {s.phone}
                </span>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', fontSize: '11px !important', paddingTop: '6px', borderTop: '1px solid #f1f5f9' }}>
                  <div style={{ color: '#16a34a', fontWeight: 700 }}>
                    {s.shift.includes('|') ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        {s.shift.split('|').map((slotStr, i) => (
                          <div key={i}>Shift {i + 1}: {slotStr.trim()}</div>
                        ))}
                        <div style={{ color: '#0284c7', fontSize: '10.5px !important', marginTop: '2px' }}>Total: {s.hours}</div>
                      </div>
                    ) : (
                      <span>Shift: {s.shift} ({s.hours})</span>
                    )}
                  </div>
                  <span style={{ fontWeight: 800, color: '#0f172a' }}>{s.salary}</span>
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', paddingBottom: '10px', borderBottom: '1px solid #cbd5e1' }}>
            <div style={{ background: '#a855f7', color: '#ffffff', padding: '6px', borderRadius: '8px' }}>
              <Clock size={16} />
            </div>
            <div>
              <h3 style={{ fontSize: '13.5px !important', fontWeight: 800, color: '#0f172a' }}>3. Doctors Directory</h3>
              <span style={{ fontSize: '10.5px !important', color: '#64748b', fontWeight: 700 }}>Consultants & Head Doctors</span>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {[
              { name: 'Dr. Prashanth k vaidya', role: 'Head Doctor', phone: '8125260176', salary: '₹1,50,000' },
              { name: 'Dr. Jobeadh parveej', role: 'Head Doctor', phone: '9903119766', salary: '₹1,40,000' },
              { name: 'Dr. Padma priya', role: 'Employee Doctor', phone: '9490808582', salary: '₹95,000' },
              { name: 'Dr. Ramakrishna chanduri', role: 'Head Doctor', phone: '1111111111', salary: '₹1,45,000' },
            ].map(d => (
              <div key={d.name} style={{ background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '12px', padding: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                  <span style={{ fontSize: '13px !important', fontWeight: 800, color: '#0f172a' }}>{d.name}</span>
                  <span style={{ background: '#faf5ff', color: '#a855f7', fontSize: '10px !important', fontWeight: 800, padding: '2px 6px', borderRadius: '6px' }}>{d.role}</span>
                </div>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11.5px !important', color: '#64748b', marginBottom: '6px' }}>
                  <Phone size={12} color="#0284c7" /> Phone: +91 {d.phone}
                </span>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px !important', paddingTop: '6px', borderTop: '1px solid #f1f5f9' }}>
                  <span style={{ color: '#64748b', fontWeight: 700 }}>Monthly Compensation</span>
                  <span style={{ fontWeight: 800, color: d.role.includes('Employee') ? '#0f172a' : '#94a3b8' }}>{d.role.includes('Employee') ? d.salary : '-'}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
};
