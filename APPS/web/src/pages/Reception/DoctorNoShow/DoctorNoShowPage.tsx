import React from 'react';
import { UserX, AlertTriangle, Calendar, Phone } from 'lucide-react';

export const DoctorNoShowPage: React.FC = () => {
  return (
    <div style={{ padding: '32px 24px', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
        <div style={{ background: 'rgba(239, 68, 68, 0.12)', padding: '12px', borderRadius: '14px' }}>
          <UserX color="#ef4444" size={26} />
        </div>
        <div>
          <h1 style={{ fontSize: '26px', fontWeight: 800, color: '#1e293b' }}>
            Reception • Doctor No Show Tracker
          </h1>
          <p style={{ color: '#64748b', fontSize: '14px', marginTop: '2px' }}>
            Log doctor absences, unfulfilled slots, and patient rescheduling alerts
          </p>
        </div>
      </div>

      <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '20px', padding: '24px', boxShadow: '0 4px 14px rgba(0,0,0,0.03)' }}>
        <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#1e293b', marginBottom: '16px' }}>
          Unattended Appointments Today
        </h3>
        <p style={{ color: '#64748b', fontSize: '14px' }}>No doctor no-shows logged for today. All scheduled doctors are present in clinic rooms.</p>
      </div>
    </div>
  );
};
