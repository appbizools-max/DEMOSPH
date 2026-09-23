import React, { useState, useEffect } from 'react';
import {
  Users,
  Search,
  FileText,
  Pill
} from 'lucide-react';
import { receptionDataStore } from '../../../utils/receptionDataStore';

interface DoctorPatientListPageProps {
  onNavigateTab?: (tab: string, data?: any) => void;
}

export const DoctorPatientListPage: React.FC<DoctorPatientListPageProps> = ({ onNavigateTab }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [patients, setPatients] = useState<any[]>(() => receptionDataStore.getAppointments());

  useEffect(() => {
    receptionDataStore.startListeners();
    const unsub = receptionDataStore.subscribe((state) => {
      setPatients(state.appointments);
    });
    return () => unsub();
  }, []);

  const filteredPatients = patients.filter(patient => {
    const pName = String(patient.patientName || patient.name || '').toLowerCase();
    const pPhone = String(patient.phone || patient.phoneNumber || '');
    const pComplaint = String(patient.chiefComplaint || patient.subject || patient.diseases || '').toLowerCase();
    const sTerm = searchTerm.toLowerCase().trim();

    const matchesSearch = !sTerm || pName.includes(sTerm) || pPhone.includes(sTerm) || pComplaint.includes(sTerm);

    const st = String(patient.status || 'waiting').toLowerCase();
    const matchesStatus = statusFilter === 'all'
      || (statusFilter === 'waiting' && (st === 'waiting' || st === 'scheduled' || st === 'upcoming'))
      || (statusFilter === 'inconsultation' && (st === 'in_consultation' || st === 'in-consultation' || st === 'active' || st === 'consulting'))
      || (statusFilter === 'completed' && (st === 'completed' || st === 'done' || st === 'collect_fee'));

    return matchesSearch && matchesStatus;
  });

  return (
    <div style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Header Banner */}
      <div style={{
        background: '#ffffff',
        borderRadius: '16px',
        padding: '20px 24px',
        border: '1px solid #e2e8f0',
        boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '16px'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h1 style={{ fontSize: '20px', fontWeight: 800, color: '#0f172a', margin: 0 }}>Patient Directory</h1>
            <span style={{ background: '#e0f2fe', color: '#0284c7', padding: '2px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: 800 }}>
              {filteredPatients.length} Records
            </span>
          </div>
          <p style={{ color: '#64748b', fontSize: '13px', marginTop: '4px', margin: 0 }}>
            Search registered patient histories & consultation records.
          </p>
        </div>

        {/* Search & Filter Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            background: '#f8fafc',
            border: '1px solid #cbd5e1',
            borderRadius: '12px',
            padding: '0 12px',
            width: '260px',
            height: '40px'
          }}>
            <Search size={16} color="#64748b" style={{ marginRight: '8px' }} />
            <input
              type="text"
              placeholder="Search name or phone..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              style={{ border: 'none', outline: 'none', background: 'transparent', width: '100%', fontSize: '12.5px', color: '#0f172a' }}
            />
          </div>

          <div style={{ display: 'flex', background: '#f1f5f9', borderRadius: '10px', padding: '3px' }}>
            {[
              { id: 'all', label: 'All' },
              { id: 'waiting', label: 'Waiting' },
              { id: 'inconsultation', label: 'In Consult' },
              { id: 'completed', label: 'Completed' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setStatusFilter(tab.id)}
                style={{
                  border: 'none',
                  background: statusFilter === tab.id ? '#ffffff' : 'transparent',
                  color: statusFilter === tab.id ? '#0284c7' : '#64748b',
                  fontWeight: statusFilter === tab.id ? 800 : 600,
                  fontSize: '12px',
                  padding: '6px 12px',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  boxShadow: statusFilter === tab.id ? '0 2px 6px rgba(0,0,0,0.05)' : 'none',
                  transition: 'all 0.15s ease'
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Patient Directory Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '18px' }}>
        {filteredPatients.map((patient) => (
          <div
            key={patient.id}
            style={{
              background: '#ffffff',
              borderRadius: '16px',
              padding: '20px',
              border: '1px solid #e2e8f0',
              boxShadow: '0 4px 12px rgba(0,0,0,0.03)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              gap: '14px'
            }}
          >
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <h3 style={{ fontSize: '15px', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                    {patient.patientName || patient.name || 'Patient'}
                  </h3>
                  <p style={{ fontSize: '12px', color: '#64748b', marginTop: '2px', margin: 0 }}>
                    {patient.gender ? `${patient.gender} • ` : ''}{patient.regId || patient.registrationId ? `${patient.regId || patient.registrationId} • ` : ''}{patient.branch || patient.branchName || 'Clinic'}
                  </p>
                </div>
                <span style={{
                  padding: '4px 10px',
                  borderRadius: '8px',
                  fontSize: '11px',
                  fontWeight: 800,
                  background: (patient.status || '').toLowerCase() === 'completed' ? '#dcfce7' : (patient.status || '').toLowerCase().includes('consult') ? '#e0f2fe' : '#fef3c7',
                  color: (patient.status || '').toLowerCase() === 'completed' ? '#15803d' : (patient.status || '').toLowerCase().includes('consult') ? '#0369a1' : '#b45309'
                }}>
                  {patient.status || 'Waiting'}
                </span>
              </div>

              <div style={{ background: '#f8fafc', borderRadius: '12px', padding: '12px', marginTop: '12px', border: '1px solid #f1f5f9' }}>
                <p style={{ fontSize: '12.5px', color: '#334155', margin: 0 }}>
                  <strong style={{ color: '#0f172a' }}>Complaint:</strong> {patient.chiefComplaint || patient.subject || patient.diseases || 'Consultation'}
                </p>
                {patient.remedy && (
                  <p style={{ fontSize: '12px', color: '#16a34a', fontWeight: 700, marginTop: '6px', margin: 0, display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Pill size={14} color="#16a34a" />
                    <span>Remedy: {patient.remedy}</span>
                  </p>
                )}
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '12px', borderTop: '1px solid #f1f5f9' }}>
              <span style={{ fontSize: '12px', fontFamily: 'monospace', color: '#64748b', fontWeight: 700 }}>📞 {patient.phone || patient.phoneNumber || 'N/A'}</span>
              <button
                type="button"
                onClick={() => onNavigateTab && onNavigateTab('patient_file', patient)}
                style={{
                  background: '#e0f2fe',
                  color: '#0284c7',
                  border: '1px solid #bae6fd',
                  padding: '6px 14px',
                  borderRadius: '8px',
                  fontSize: '12px',
                  fontWeight: 800,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <FileText size={14} color="#0284c7" />
                <span>History & Patient File</span>
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
