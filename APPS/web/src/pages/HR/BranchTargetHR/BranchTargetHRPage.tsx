import React from 'react';
import { Target } from 'lucide-react';

export const BranchTargetHRPage: React.FC = () => {
  const branchTargets = [
    { name: 'KPHB Branch Target', target: '₹12,00,000', current: '₹9,80,000', status: 'On Track (82%)' },
    { name: 'Nallagandla Branch Target', target: '₹10,00,000', current: '₹8,40,000', status: 'On Track (84%)' },
    { name: 'Dilshuknagar Branch Target', target: '₹14,00,000', current: '₹11,50,000', status: 'Ahead (82%)' },
    { name: 'Chandanagar Branch Target', target: '₹9,00,000', current: '₹7,20,000', status: 'On Track (80%)' },
  ];

  return (
    <div style={{ padding: '24px 20px', maxWidth: '1000px', margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
        <Target size={24} color="#258ec8" />
        <h1 style={{ fontSize: '18px !important', fontWeight: 800, color: '#0f172a' }}>
          Branch Target Progress (HR)
        </h1>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px' }}>
        {branchTargets.map(b => (
          <div key={b.name} style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '18px' }}>
            <span style={{ fontSize: '14px !important', fontWeight: 800, color: '#0f172a', display: 'block', marginBottom: '8px' }}>{b.name}</span>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px !important', color: '#64748b', marginBottom: '6px' }}>
              <span>Monthly Target: <b>{b.target}</b></span>
              <span>Achieved: <b style={{ color: '#16a34a' }}>{b.current}</b></span>
            </div>
            <span style={{ fontSize: '11px !important', fontWeight: 700, color: '#258ec8' }}>{b.status}</span>
          </div>
        ))}
      </div>
    </div>
  );
};
