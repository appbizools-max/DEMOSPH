import React from 'react';
import { PieChart, DollarSign, Users, Building2 } from 'lucide-react';

export const DashboardPage: React.FC = () => {
  return (
    <div style={{ padding: '24px 20px', maxWidth: '1000px', margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
        <PieChart size={24} color="#258ec8" />
        <h1 style={{ fontSize: '18px !important', fontWeight: 800, color: '#0f172a' }}>
          Admin Dashboard & Analytics Overview
        </h1>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '18px' }}>
          <span style={{ fontSize: '12px !important', color: '#64748b', fontWeight: 700 }}>TOTAL REVENUE</span>
          <span style={{ display: 'block', fontSize: '22px !important', fontWeight: 800, color: '#0f172a', margin: '4px 0' }}>₹36,90,000</span>
          <span style={{ fontSize: '11px !important', color: '#16a34a', fontWeight: 700 }}>+14.2% Growth</span>
        </div>

        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '18px' }}>
          <span style={{ fontSize: '12px !important', color: '#64748b', fontWeight: 700 }}>ACTIVE BRANCHES</span>
          <span style={{ display: 'block', fontSize: '22px !important', fontWeight: 800, color: '#258ec8', margin: '4px 0' }}>4 Official</span>
          <span style={{ fontSize: '11px !important', color: '#64748b' }}>KPHB, Nallagandla, DSN, Chn</span>
        </div>
      </div>
    </div>
  );
};
