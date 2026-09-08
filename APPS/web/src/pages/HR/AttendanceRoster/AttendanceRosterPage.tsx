import React, { useState } from 'react';
import { UserCheck } from 'lucide-react';

export const AttendanceRosterPage: React.FC = () => {
  const [staffList, setStaffList] = useState([
    { id: '1', name: 'Anil Kumar M', role: 'Regular Staff', branch: 'KPHB', status: 'Present' },
    { id: '2', name: 'Ashwini Begari', role: 'Regular Staff', branch: 'Chandanagar', status: 'Present' },
    { id: '3', name: 'Vaishnavi Peri', role: 'Regular Staff', branch: 'Nallagandla', status: 'Present' },
    { id: '4', name: 'Nandini Gottelli', role: 'Regular Staff', branch: 'Dilshuknagar', status: 'On Leave' },
  ]);

  const toggleAttendance = (id: string) => {
    setStaffList(prev => prev.map(s => {
      if (s.id === id) {
        const nextStatus = s.status === 'Present' ? 'Absent' : s.status === 'Absent' ? 'On Leave' : 'Present';
        return { ...s, status: nextStatus };
      }
      return s;
    }));
  };

  return (
    <div style={{ padding: '24px 20px', maxWidth: '1000px', margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
        <UserCheck size={24} color="#258ec8" />
        <h1 style={{ fontSize: '18px !important', fontWeight: 800, color: '#0f172a' }}>
          Daily Staff Attendance & Roster Log
        </h1>
      </div>

      <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '16px', overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
              <th style={{ padding: '10px', fontSize: '12px !important' }}>STAFF NAME</th>
              <th style={{ padding: '10px', fontSize: '12px !important' }}>ROLE & BRANCH</th>
              <th style={{ padding: '10px', fontSize: '12px !important' }}>ATTENDANCE STATUS</th>
            </tr>
          </thead>
          <tbody>
            {staffList.map(s => (
              <tr key={s.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                <td style={{ padding: '10px', fontSize: '13px !important', fontWeight: 700 }}>{s.name}</td>
                <td style={{ padding: '10px', fontSize: '12px !important' }}>{s.role} ({s.branch})</td>
                <td style={{ padding: '10px' }}>
                  <button 
                    onClick={() => toggleAttendance(s.id)}
                    style={{ 
                      background: s.status === 'Present' ? '#f0fdf4' : s.status === 'Absent' ? '#fef2f2' : '#fefce8', 
                      color: s.status === 'Present' ? '#16a34a' : s.status === 'Absent' ? '#ef4444' : '#ca8a04', 
                      border: 'none', 
                      padding: '4px 10px', 
                      borderRadius: '8px', 
                      fontSize: '11.5px !important', 
                      fontWeight: 800, 
                      cursor: 'pointer' 
                    }}
                  >
                    {s.status === 'Present' ? '✓ Present' : s.status === 'Absent' ? '✕ Absent' : '⏳ On Leave'}
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
