import React from 'react';
import { Clock } from 'lucide-react';

export const StaffWorkingHoursPage: React.FC = () => {
  const staff = [
    { name: 'Anil Kumar M', role: 'Regular Staff', branch: 'KPHB', hours: '8.5 Hours/Day', shift: '10:00 AM - 08:30 PM' },
    { name: 'Ashwini Begari', role: 'Regular Staff', branch: 'Chandanagar', hours: '8.0 Hours/Day', shift: '10:00 AM - 08:00 PM' },
    { name: 'Vaishnavi Peri', role: 'Regular Staff', branch: 'Nallagandla', hours: '8.5 Hours/Day', shift: '10:00 AM - 08:30 PM' },
    { name: 'Nandini Gottelli', role: 'Regular Staff', branch: 'Dilshuknagar', hours: '8.5 Hours/Day', shift: '10:00 AM - 08:30 PM' },
  ];

  return (
    <div style={{ padding: '24px 20px', maxWidth: '1000px', margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
        <Clock size={24} color="#258ec8" />
        <h1 style={{ fontSize: '18px !important', fontWeight: 800, color: '#0f172a' }}>
          Staff Working Hours & Daily Roster
        </h1>
      </div>

      <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '16px', overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
              <th style={{ padding: '10px', fontSize: '12px !important' }}>STAFF NAME</th>
              <th style={{ padding: '10px', fontSize: '12px !important' }}>ROLE & BRANCH</th>
              <th style={{ padding: '10px', fontSize: '12px !important' }}>SHIFT SCHEDULE</th>
              <th style={{ padding: '10px', fontSize: '12px !important' }}>WORKING HOURS</th>
            </tr>
          </thead>
          <tbody>
            {staff.map(s => (
              <tr key={s.name} style={{ borderBottom: '1px solid #f1f5f9' }}>
                <td style={{ padding: '10px', fontSize: '13px !important', fontWeight: 700 }}>{s.name}</td>
                <td style={{ padding: '10px', fontSize: '12px !important' }}>{s.role} ({s.branch})</td>
                <td style={{ padding: '10px', fontSize: '12px !important', color: '#258ec8', fontWeight: 600 }}>{s.shift}</td>
                <td style={{ padding: '10px', fontSize: '12px !important', color: '#16a34a', fontWeight: 700 }}>{s.hours}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
