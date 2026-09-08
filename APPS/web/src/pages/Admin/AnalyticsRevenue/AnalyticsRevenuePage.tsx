import React from 'react';
import { DollarSign, TrendingUp, Target } from 'lucide-react';

export const AnalyticsRevenuePage: React.FC = () => {
  return (
    <div style={{ padding: '24px 20px', maxWidth: '1000px', margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
        <DollarSign size={24} color="#258ec8" />
        <h1 style={{ fontSize: '18px !important', fontWeight: 800, color: '#0f172a' }}>
          Average Analytics & Total Revenue
        </h1>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '18px' }}>
          <span style={{ fontSize: '12px !important', color: '#64748b', fontWeight: 700 }}>TOTAL REVENUE</span>
          <span style={{ display: 'block', fontSize: '22px !important', fontWeight: 800, color: '#0f172a', margin: '4px 0' }}>₹36,90,000</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#16a34a', fontSize: '11.5px !important', fontWeight: 700 }}>
            <TrendingUp size={14} /> +14.2% Growth vs last month
          </div>
        </div>

        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '18px' }}>
          <span style={{ fontSize: '12px !important', color: '#64748b', fontWeight: 700 }}>AVERAGE CONSULTATION TICKET</span>
          <span style={{ display: 'block', fontSize: '22px !important', fontWeight: 800, color: '#a855f7', margin: '4px 0' }}>₹3,200 / Patient</span>
          <span style={{ fontSize: '11.5px !important', color: '#64748b' }}>Average Ticket Size</span>
        </div>
      </div>
    </div>
  );
};
