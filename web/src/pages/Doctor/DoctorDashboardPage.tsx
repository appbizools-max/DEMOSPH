import React from 'react';
import { Stethoscope, Calendar, FileText, HeartPulse } from 'lucide-react';

export const DoctorDashboardPage: React.FC = () => {
  return (
    <div style={{ padding: '40px 20px', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
        <div style={{ background: 'rgba(6, 182, 212, 0.2)', padding: '12px', borderRadius: '12px', border: '1px solid rgba(6, 182, 212, 0.4)' }}>
          <Stethoscope color="#38bdf8" size={28} />
        </div>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: 700, color: '#f8fafc' }}>Doctor Consultation Portal</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
            Patient queue, homeopathic remedy prescription generator, and spiritual consultation notes.
          </p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
        <div className="glass-card">
          <h3 style={{ fontSize: '18px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Calendar color="#38bdf8" size={20} /> Today's Patient Queue
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ padding: '12px', background: 'rgba(255,255,255,0.04)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <h4 style={{ color: '#38bdf8' }}>Patient: Sarah Jenkins</h4>
                <span className="badge badge-warning">Waiting</span>
              </div>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>Reason: Acute Anxiety & Chronic Insomnia</p>
            </div>

            <div style={{ padding: '12px', background: 'rgba(255,255,255,0.04)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <h4 style={{ color: '#38bdf8' }}>Patient: David Miller</h4>
                <span className="badge badge-success">Completed</span>
              </div>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>Remedy Prescribed: Arnica 200C</p>
            </div>
          </div>
        </div>

        <div className="glass-card">
          <h3 style={{ fontSize: '18px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FileText color="#10b981" size={20} /> Prescribe Remedy & Notes
          </h3>
          <form style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <input type="text" className="input-field" placeholder="Select Patient Name" />
            <input type="text" className="input-field" placeholder="Homeopathic Remedy (e.g. Ignatia 1M)" />
            <textarea className="input-field" rows={3} placeholder="Potency, Dosage & Spiritual Healing Advice..." />
            <button type="button" className="btn-primary" style={{ justifyContent: 'center' }}>
              Save & Send Prescription
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
