import React from 'react';
import { Pill, Search, Package, Clock, CheckCircle } from 'lucide-react';

export const MedicineRequestsPage: React.FC = () => {
  return (
    <div style={{ padding: '32px 24px', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
        <div style={{ background: 'rgba(168, 206, 58, 0.18)', padding: '12px', borderRadius: '14px' }}>
          <Pill color="#638012" size={26} />
        </div>
        <div>
          <h1 style={{ fontSize: '26px', fontWeight: 800, color: '#1e293b' }}>
            Reception • Medicine Requests
          </h1>
          <p style={{ color: '#64748b', fontSize: '14px', marginTop: '2px' }}>
            Patient courier remedy refills, home delivery dispatch, & dispensary requests
          </p>
        </div>
      </div>

      <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '20px', padding: '24px', boxShadow: '0 4px 14px rgba(0,0,0,0.03)' }}>
        <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#1e293b', marginBottom: '16px' }}>
          Pending Medicine Dispatch Requests
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ padding: '16px', border: '1px solid #e2e8f0', borderRadius: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h4 style={{ fontWeight: 700, color: '#1e293b' }}>Arnica 200C Liquid + Ignatia Mother Tincture</h4>
              <p style={{ fontSize: '13px', color: '#64748b', marginTop: '4px' }}>Patient: David Miller • Delivery Address: Hyderabad</p>
            </div>
            <button style={{ background: '#a8ce3a', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '8px', fontWeight: 700, cursor: 'pointer' }}>
              Approve Dispatch
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
