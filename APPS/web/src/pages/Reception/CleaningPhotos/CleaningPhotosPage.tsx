import React from 'react';
import { Camera, CheckCircle, Sparkles, AlertCircle } from 'lucide-react';

export const CleaningPhotosPage: React.FC = () => {
  return (
    <div style={{ padding: '32px 24px', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
        <div style={{ background: 'rgba(168, 206, 58, 0.18)', padding: '12px', borderRadius: '14px' }}>
          <Camera color="#638012" size={26} />
        </div>
        <div>
          <h1 style={{ fontSize: '26px', fontWeight: 800, color: '#1e293b' }}>
            Reception • Clinic Sanitation & Cleaning Photos
          </h1>
          <p style={{ color: '#64748b', fontSize: '14px', marginTop: '2px' }}>
            Daily clinic hygiene inspection photos, room sterilization audits, & staff logs
          </p>
        </div>
      </div>

      <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '20px', padding: '24px', boxShadow: '0 4px 14px rgba(0,0,0,0.03)' }}>
        <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#1e293b', marginBottom: '12px' }}>
          Today's Hygiene Inspection Photos
        </h3>
        <p style={{ color: '#64748b', fontSize: '14px' }}>Morning sterilization photos uploaded & verified for Consultation Rooms 1, 2, and Waiting Lounge.</p>
      </div>
    </div>
  );
};
