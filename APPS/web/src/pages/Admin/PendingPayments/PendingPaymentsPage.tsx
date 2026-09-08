import React from 'react';
import { AlertCircle } from 'lucide-react';

export const PendingPaymentsPage: React.FC = () => {
  return (
    <div style={{ padding: '24px 20px', maxWidth: '1000px', margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
        <AlertCircle size={24} color="#ef4444" />
        <h1 style={{ fontSize: '18px !important', fontWeight: 800, color: '#0f172a' }}>
          Pending Payments Status
        </h1>
      </div>

      <div style={{ background: '#ffffff', border: '1px solid #fca5a5', borderRadius: '16px', padding: '20px', maxWidth: '480px' }}>
        <span style={{ fontSize: '12px !important', fontWeight: 800, color: '#ef4444' }}>TOTAL PENDING PATIENT BALANCES</span>
        <span style={{ display: 'block', fontSize: '24px !important', fontWeight: 800, color: '#ef4444', margin: '6px 0' }}>₹1,45,000 Pending</span>
        <p style={{ fontSize: '12px !important', color: '#64748b' }}>
          12 Pending Patient Invoices Scheduled for Reception Follow-up.
        </p>
      </div>
    </div>
  );
};
