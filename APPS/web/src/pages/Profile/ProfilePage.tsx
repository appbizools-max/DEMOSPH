import React from 'react';
import { User, Shield, Heart, FileText } from 'lucide-react';

export const ProfilePage: React.FC = () => {
  return (
    <div style={{ padding: '40px 20px', maxWidth: '800px', margin: '0 auto' }}>
      <div className="glass-card" style={{ marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '20px' }}>
        <div style={{ background: 'linear-gradient(135deg, #258ec8, #a8ce3a)', padding: '20px', borderRadius: '50%' }}>
          <User size={36} color="#ffffff" />
        </div>
        <div>
          <h2 style={{ fontSize: '24px' }}>Spiritual Wellness Member</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginTop: '4px' }}>
            Member since August 2026 • Patient ID: #SH-9042
          </p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        <div className="glass-card">
          <h3 style={{ fontSize: '18px', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Heart color="#38bdf8" size={18} /> Active Remedies
          </h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>
            No active remedy schedules. Explore the Remedies directory to add remedies to your daily tracker.
          </p>
        </div>

        <div className="glass-card">
          <h3 style={{ fontSize: '18px', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FileText color="#10b981" size={18} /> Consultation History
          </h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>
            No past consultations found. Use the Consultation tab to schedule your first session.
          </p>
        </div>
      </div>
    </div>
  );
};
