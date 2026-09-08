import React from 'react';
import { Megaphone } from 'lucide-react';

export const NewPatientSourcedPage: React.FC = () => {
  const sources = [
    { name: 'Instagram', count: 420 },
    { name: 'Google Search', count: 310 },
    { name: 'Website Direct', count: 215 },
    { name: 'Referral', count: 180 },
    { name: 'Practo', count: 95 },
    { name: 'Youtube', count: 70 },
    { name: 'Walk-in', count: 140 },
    { name: 'Old Patient', count: 260 },
  ];

  return (
    <div style={{ padding: '24px 20px', maxWidth: '1000px', margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
        <Megaphone size={24} color="#258ec8" />
        <h1 style={{ fontSize: '18px !important', fontWeight: 800, color: '#0f172a' }}>
          New Patient Acquisition & Marketing Source Data
        </h1>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
        {sources.map(s => (
          <div key={s.name} style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '13.5px !important', fontWeight: 800, color: '#0f172a' }}>{s.name}</span>
            <span style={{ fontSize: '12.5px !important', fontWeight: 800, color: '#258ec8' }}>{s.count} Patients</span>
          </div>
        ))}
      </div>
    </div>
  );
};
