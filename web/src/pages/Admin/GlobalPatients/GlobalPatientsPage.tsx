import React from 'react';
import { Users } from 'lucide-react';

export const GlobalPatientsPage: React.FC = () => {
  const globalPatients = [
    { id: 'PAT-101', name: 'Rajesh Kumar', phone: '+91 98490 12345', branch: 'KPHB Branch', source: 'Instagram' },
    { id: 'PAT-102', name: 'Sneha Reddy', phone: '+91 91210 67890', branch: 'Nallagandla Branch', source: 'Google' },
    { id: 'PAT-103', name: 'Venkatesh Rao', phone: '+91 94400 45678', branch: 'Dilshuknagar Branch', source: 'Website' },
    { id: 'PAT-104', name: 'Ananya Sharma', phone: '+91 99887 11223', branch: 'Chandanagar Branch', source: 'Referral' },
  ];

  return (
    <div style={{ padding: '24px 20px', maxWidth: '1000px', margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
        <Users size={24} color="#258ec8" />
        <h1 style={{ fontSize: '18px !important', fontWeight: 800, color: '#0f172a' }}>
          Global Patients Directory
        </h1>
      </div>

      <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '16px', overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
              <th style={{ padding: '10px', fontSize: '12px !important' }}>PATIENT ID</th>
              <th style={{ padding: '10px', fontSize: '12px !important' }}>NAME</th>
              <th style={{ padding: '10px', fontSize: '12px !important' }}>PHONE</th>
              <th style={{ padding: '10px', fontSize: '12px !important' }}>BRANCH</th>
              <th style={{ padding: '10px', fontSize: '12px !important' }}>SOURCE</th>
            </tr>
          </thead>
          <tbody>
            {globalPatients.map(p => (
              <tr key={p.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                <td style={{ padding: '10px', fontSize: '12px !important', fontWeight: 800, color: '#258ec8' }}>{p.id}</td>
                <td style={{ padding: '10px', fontSize: '12.5px !important', fontWeight: 700 }}>{p.name}</td>
                <td style={{ padding: '10px', fontSize: '12px !important' }}>{p.phone}</td>
                <td style={{ padding: '10px', fontSize: '12px !important' }}>{p.branch}</td>
                <td style={{ padding: '10px', fontSize: '12px !important', color: '#16a34a', fontWeight: 700 }}>{p.source}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
