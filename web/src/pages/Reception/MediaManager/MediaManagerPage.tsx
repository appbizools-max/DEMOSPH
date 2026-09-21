import React from 'react';
import { Image, Upload, Film, Folder, FileCheck } from 'lucide-react';

export const MediaManagerPage: React.FC = () => {
  return (
    <div style={{ padding: '32px 24px', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
        <div style={{ background: 'rgba(37, 142, 200, 0.12)', padding: '12px', borderRadius: '14px' }}>
          <Image color="#258ec8" size={26} />
        </div>
        <div>
          <h1 style={{ fontSize: '26px', fontWeight: 800, color: '#1e293b' }}>
            Reception • Media Manager
          </h1>
          <p style={{ color: '#64748b', fontSize: '14px', marginTop: '2px' }}>
            Patient X-rays, lab reports, clinical scans, & media file uploads
          </p>
        </div>
      </div>

      <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '20px', padding: '32px', textAlign: 'center', boxShadow: '0 4px 14px rgba(0,0,0,0.03)' }}>
        <Upload size={48} color="#258ec8" style={{ margin: '0 auto 12px' }} />
        <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#1e293b', marginBottom: '6px' }}>Upload Medical Media or Reports</h3>
        <p style={{ color: '#64748b', fontSize: '14px', marginBottom: '16px' }}>Drag & drop files or browse from device</p>
        <button style={{ background: '#258ec8', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '8px', fontWeight: 700, cursor: 'pointer' }}>
          Browse Files
        </button>
      </div>
    </div>
  );
};
