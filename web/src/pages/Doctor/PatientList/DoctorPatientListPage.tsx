import React, { useState } from 'react';
import {
  Users,
  Search,
  FileText,
  Pill
} from 'lucide-react';

interface Patient {
  id: string;
  name: string;
  age: number;
  gender: string;
  phone: string;
  branch: string;
  visitDate: string;
  chiefComplaint: string;
  status: 'Waiting' | 'In Consultation' | 'Completed';
  remedy?: string;
  potency?: string;
  notes?: string;
}

interface DoctorPatientListPageProps {
  onNavigateTab?: (tab: string, data?: any) => void;
}

export const DoctorPatientListPage: React.FC<DoctorPatientListPageProps> = ({ onNavigateTab }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const [patients] = useState<Patient[]>([
    {
      id: 'p-101',
      name: 'Sarah Jenkins',
      age: 34,
      gender: 'Female',
      phone: '98480 12345',
      branch: 'KPHB Branch',
      visitDate: 'Today, 10:30 AM',
      chiefComplaint: 'Acute Anxiety, Panic Attacks & Chronic Insomnia',
      status: 'Waiting',
    },
    {
      id: 'p-102',
      name: 'Rajesh Kumar',
      age: 48,
      gender: 'Male',
      phone: '99490 23456',
      branch: 'Nallagandla Branch',
      visitDate: 'Today, 11:15 AM',
      chiefComplaint: 'Migraine, Photophobia & Cervical Spondylitis',
      status: 'In Consultation',
      remedy: 'Nux Vomica 200C',
      potency: '200C - 4 Pills',
    },
    {
      id: 'p-103',
      name: 'Anita Sharma',
      age: 29,
      gender: 'Female',
      phone: '98765 43210',
      branch: 'Chandanagar Branch',
      visitDate: 'Today, 11:45 AM',
      chiefComplaint: 'Severe Eczema & Allergic Rhinitis',
      status: 'Waiting',
    },
    {
      id: 'p-104',
      name: 'David Miller',
      age: 52,
      gender: 'Male',
      phone: '91234 56789',
      branch: 'Dilshuknagar Branch',
      visitDate: 'Today, 09:30 AM',
      chiefComplaint: 'Hypertension, Palpitations & Acid Reflux',
      status: 'Completed',
      remedy: 'Arnica 200C & Crataegus Q',
      notes: 'Advised daily 20 mins evening walking & reduced sodium diet.',
    },
    {
      id: 'p-105',
      name: 'Priya Reddy',
      age: 41,
      gender: 'Female',
      phone: '90001 98765',
      branch: 'KPHB Branch',
      visitDate: 'Yesterday',
      chiefComplaint: 'Thyroid Dysfunction & Fatigue',
      status: 'Completed',
      remedy: 'Thyroidinum 30C',
      notes: 'Follow-up appointment scheduled after 3 weeks.',
    },
  ]);

  const filteredPatients = patients.filter(patient => {
    const matchesSearch =
      patient.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      patient.phone.includes(searchTerm) ||
      patient.chiefComplaint.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'all' || patient.status.toLowerCase().replace(' ', '') === statusFilter.toLowerCase().replace(' ', '');

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
                  <h3 style={{ fontSize: '15px', fontWeight: 800, color: '#0f172a', margin: 0 }}>{patient.name}</h3>
                  <p style={{ fontSize: '12px', color: '#64748b', marginTop: '2px', margin: 0 }}>
                    {patient.gender}, {patient.age} yrs • {patient.branch}
                  </p>
                </div>
                <span style={{
                  padding: '4px 10px',
                  borderRadius: '8px',
                  fontSize: '11px',
                  fontWeight: 800,
                  background: patient.status === 'Completed' ? '#dcfce7' : patient.status === 'In Consultation' ? '#e0f2fe' : '#fef3c7',
                  color: patient.status === 'Completed' ? '#15803d' : patient.status === 'In Consultation' ? '#0369a1' : '#b45309'
                }}>
                  {patient.status}
                </span>
              </div>

              <div style={{ background: '#f8fafc', borderRadius: '12px', padding: '12px', marginTop: '12px', border: '1px solid #f1f5f9' }}>
                <p style={{ fontSize: '12.5px', color: '#334155', margin: 0 }}>
                  <strong style={{ color: '#0f172a' }}>Complaint:</strong> {patient.chiefComplaint}
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
              <span style={{ fontSize: '12px', fontFamily: 'monospace', color: '#64748b', fontWeight: 700 }}>📞 {patient.phone}</span>
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
