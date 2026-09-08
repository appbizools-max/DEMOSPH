import React from 'react';
import { CreditCard, ShoppingBag, Plus, Printer, CheckCircle } from 'lucide-react';

export const ProductBillingPage: React.FC = () => {
  return (
    <div style={{ padding: '32px 24px', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
        <div style={{ background: 'rgba(37, 142, 200, 0.12)', padding: '12px', borderRadius: '14px' }}>
          <CreditCard color="#258ec8" size={26} />
        </div>
        <div>
          <h1 style={{ fontSize: '26px', fontWeight: 800, color: '#1e293b' }}>
            Reception • Product Billing & Invoicing
          </h1>
          <p style={{ color: '#64748b', fontSize: '14px', marginTop: '2px' }}>
            Generate consultation bills, remedy receipts, tax invoices & payment links
          </p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px' }}>
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '20px', padding: '24px', boxShadow: '0 4px 14px rgba(0,0,0,0.03)' }}>
          <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#1e293b', marginBottom: '16px' }}>
            Create New Invoice
          </h3>
          <form style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <input type="text" placeholder="Patient Name or ID" style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }} />
            <input type="text" placeholder="Product / Remedy Name (e.g. Homeopathy Dilution Pack)" style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }} />
            <input type="number" placeholder="Amount (₹)" style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }} />
            <button type="button" style={{ background: '#258ec8', color: '#fff', border: 'none', padding: '12px', borderRadius: '10px', fontWeight: 700, cursor: 'pointer' }}>
              Generate Receipt & Print
            </button>
          </form>
        </div>

        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '20px', padding: '24px', boxShadow: '0 4px 14px rgba(0,0,0,0.03)' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#1e293b', marginBottom: '12px' }}>
            Today's Totals
          </h3>
          <span style={{ fontSize: '28px', fontWeight: 800, color: '#a8ce3a' }}>₹ 24,800</span>
          <p style={{ fontSize: '13px', color: '#64748b', marginTop: '4px' }}>32 Invoices Generated</p>
        </div>
      </div>
    </div>
  );
};
