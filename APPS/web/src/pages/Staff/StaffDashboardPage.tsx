import React from 'react';
import { Package, CheckSquare, Layers, AlertCircle } from 'lucide-react';

export const StaffDashboardPage: React.FC = () => {
  return (
    <div style={{ padding: '40px 20px', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
        <div style={{ background: 'rgba(245, 158, 11, 0.2)', padding: '12px', borderRadius: '12px', border: '1px solid rgba(245, 158, 11, 0.4)' }}>
          <Package color="#fbbf24" size={28} />
        </div>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: 700, color: '#f8fafc' }}>Clinic Staff & Inventory Portal</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
            Remedy inventory tracking, daily clinic tasks, stock alerts, and dispensary orders.
          </p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
        <div className="glass-card">
          <h3 style={{ fontSize: '18px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Layers color="#fbbf24" size={20} /> Remedy Stock & Dispensary
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ padding: '12px', background: 'rgba(255,255,255,0.04)', borderRadius: '8px', border: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between' }}>
              <div>
                <h4 style={{ color: '#f8fafc' }}>Arnica 30C Liquid Dilution</h4>
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Dispensary Shelf B2</p>
              </div>
              <span className="badge badge-success">In Stock (42 bottles)</span>
            </div>

            <div style={{ padding: '12px', background: 'rgba(255,255,255,0.04)', borderRadius: '8px', border: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between' }}>
              <div>
                <h4 style={{ color: '#f8fafc' }}>Ignatia 200C Pellets</h4>
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Dispensary Shelf C1</p>
              </div>
              <span className="badge badge-warning">Low Stock (3 left)</span>
            </div>
          </div>
        </div>

        <div className="glass-card">
          <h3 style={{ fontSize: '18px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <CheckSquare color="#38bdf8" size={20} /> Daily Clinic Checklist
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '14px', color: 'var(--text-secondary)' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <input type="checkbox" defaultChecked /> Sterilize Consultation Rooms 1 & 2
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <input type="checkbox" defaultChecked /> Restock Essential Mother Tinctures
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <input type="checkbox" /> Verify Evening Appointment Roster
            </label>
          </div>
        </div>
      </div>
    </div>
  );
};
