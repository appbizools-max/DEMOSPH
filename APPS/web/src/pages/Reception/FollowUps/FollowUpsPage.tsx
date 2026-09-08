import React, { useState } from 'react';
import { RefreshCw, Search, PhoneCall, Calendar, CheckCircle } from 'lucide-react';

export const FollowUpsPage: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');

  const mockFollowUps = [
    { id: 'FOL-101', patient: 'Sarah Jenkins', phone: '+91 98765 43210', doctor: 'Dr. Homeo Specialist', lastVisit: '10 days ago', followUpDate: 'Today', status: 'pending' },
    { id: 'FOL-102', patient: 'Ramesh Kumar', phone: '+91 91234 56789', doctor: 'Dr. Spiritual Guide', lastVisit: '14 days ago', followUpDate: 'Tomorrow', status: 'scheduled' },
  ];

  return (
    <div style={{ padding: '32px 24px', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
        <div style={{ background: 'rgba(37, 142, 200, 0.12)', padding: '12px', borderRadius: '14px' }}>
          <RefreshCw color="#258ec8" size={26} />
        </div>
        <div>
          <h1 style={{ fontSize: '26px', fontWeight: 800, color: '#1e293b' }}>
            Reception • Patient Follow-Ups
          </h1>
          <p style={{ color: '#64748b', fontSize: '14px', marginTop: '2px' }}>
            Track post-consultation remedy progress, call schedules & follow-up appointments
          </p>
        </div>
      </div>

      <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '20px', padding: '20px', boxShadow: '0 4px 14px rgba(0,0,0,0.03)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #f1f5f9', textAlign: 'left', color: '#64748b', fontSize: '12px' }}>
              <th style={{ padding: '12px' }}>PATIENT & ID</th>
              <th style={{ padding: '12px' }}>DOCTOR</th>
              <th style={{ padding: '12px' }}>DUE DATE</th>
              <th style={{ padding: '12px' }}>STATUS</th>
              <th style={{ padding: '12px', textAlign: 'right' }}>ACTION</th>
            </tr>
          </thead>
          <tbody>
            {mockFollowUps.map(item => (
              <tr key={item.id} style={{ borderBottom: '1px solid #f8fafc' }}>
                <td style={{ padding: '14px 12px' }}>
                  <div style={{ fontWeight: 700, color: '#1e293b' }}>{item.patient}</div>
                  <div style={{ fontSize: '12px', color: '#64748b' }}>{item.phone}</div>
                </td>
                <td style={{ padding: '14px 12px', color: '#475569' }}>{item.doctor}</td>
                <td style={{ padding: '14px 12px', color: '#258ec8', fontWeight: 600 }}>{item.followUpDate}</td>
                <td style={{ padding: '14px 12px' }}>
                  <span style={{ background: '#fffbeb', color: '#d97706', padding: '4px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: 700 }}>
                    {item.status}
                  </span>
                </td>
                <td style={{ padding: '14px 12px', textAlign: 'right' }}>
                  <button style={{ background: '#258ec8', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '8px', fontWeight: 700, cursor: 'pointer' }}>
                    Call & Book Next Slot
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
