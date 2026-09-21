import React, { useState } from 'react';
import { Pill } from 'lucide-react';

export const EditMedicinePage: React.FC = () => {
  const [medName, setMedName] = useState('');
  const [medPotency, setMedPotency] = useState('200C');
  const [medStock, setMedStock] = useState('150');
  const [msg, setMsg] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!medName) return;
    setMsg(true);
    setTimeout(() => setMsg(false), 3000);
    setMedName('');
  };

  return (
    <div style={{ padding: '24px 20px', maxWidth: '600px', margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
        <Pill size={24} color="#258ec8" />
        <h1 style={{ fontSize: '18px !important', fontWeight: 800, color: '#0f172a' }}>
          Edit Medicine & Remedy Inventory Form
        </h1>
      </div>

      {msg && (
        <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#16a34a', padding: '10px 14px', borderRadius: '10px', marginBottom: '16px', fontSize: '12px !important', fontWeight: 700 }}>
          ✓ Medicine Details Updated Successfully!
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <div>
          <label style={{ display: 'block', fontSize: '12px !important', fontWeight: 700, color: '#0f172a', marginBottom: '6px' }}>Medicine Name *</label>
          <input 
            type="text"
            value={medName}
            onChange={e => setMedName(e.target.value)}
            placeholder="e.g. Nux Vomica"
            style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12.5px !important', outline: 'none' }}
            required
          />
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '12px !important', fontWeight: 700, color: '#0f172a', marginBottom: '6px' }}>Potency</label>
          <input 
            type="text"
            value={medPotency}
            onChange={e => setMedPotency(e.target.value)}
            style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12.5px !important', outline: 'none' }}
          />
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '12px !important', fontWeight: 700, color: '#0f172a', marginBottom: '6px' }}>Stock Quantity</label>
          <input 
            type="number"
            value={medStock}
            onChange={e => setMedStock(e.target.value)}
            style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12.5px !important', outline: 'none' }}
          />
        </div>

        <button type="submit" style={{ background: '#258ec8', color: '#ffffff', border: 'none', padding: '10px', borderRadius: '8px', fontSize: '13px !important', fontWeight: 800, cursor: 'pointer', marginTop: '6px' }}>
          Save Medicine Details
        </button>
      </form>
    </div>
  );
};
