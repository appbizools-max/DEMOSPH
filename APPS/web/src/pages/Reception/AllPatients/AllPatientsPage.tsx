import React, { useState } from 'react';
import { Users, Search, UserPlus, Phone, Calendar, ChevronRight, FileText } from 'lucide-react';

interface PatientRecord {
  id: string;
  name: string;
  phone: string;
  age: number;
  gender: string;
  registeredDate: string;
  lastVisit: string;
  status: 'active' | 'completed' | 'follow_up';
}

const mockPatients: PatientRecord[] = [
  { id: 'PAT-901', name: 'Sarah Jenkins', phone: '+91 98765 43210', age: 34, gender: 'Female', registeredDate: '2026-08-15', lastVisit: 'Today', status: 'active' },
  { id: 'PAT-902', name: 'Ramesh Kumar', phone: '+91 91234 56789', age: 45, gender: 'Male', registeredDate: '2026-07-20', lastVisit: 'Today', status: 'follow_up' },
  { id: 'PAT-903', name: 'Anita Sharma', phone: '+91 99887 76655', age: 29, gender: 'Female', registeredDate: '2026-06-10', lastVisit: '2 days ago', status: 'completed' },
  { id: 'PAT-904', name: 'Michael Chang', phone: '+91 94455 66778', age: 52, gender: 'Male', registeredDate: '2026-05-04', lastVisit: '1 week ago', status: 'active' }
];

export const AllPatientsPage: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [patients, setPatients] = useState<PatientRecord[]>(mockPatients);
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [newPatientName, setNewPatientName] = useState('');
  const [newPatientPhone, setNewPatientPhone] = useState('');

  const filteredPatients = patients.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    p.phone.includes(searchTerm) || 
    p.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleRegisterPatient = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPatientName.trim()) return;

    const newRecord: PatientRecord = {
      id: `PAT-${Math.floor(905 + Math.random() * 90)}`,
      name: newPatientName,
      phone: newPatientPhone || '+91 90000 00000',
      age: 30,
      gender: 'General',
      registeredDate: new Date().toISOString().split('T')[0],
      lastVisit: 'Just now',
      status: 'active'
    };

    setPatients([newRecord, ...patients]);
    setNewPatientName('');
    setNewPatientPhone('');
    setShowRegisterModal(false);
  };

  return (
    <div style={{ padding: '32px 24px', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Page Title & Register Button */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px', flexWrap: 'wrap', gap: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ background: 'rgba(168, 206, 58, 0.18)', padding: '12px', borderRadius: '14px', border: '1px solid rgba(168, 206, 58, 0.35)' }}>
            <Users color="#638012" size={26} />
          </div>
          <div>
            <h1 style={{ fontSize: '26px', fontWeight: 800, color: '#1e293b' }}>
              Reception • All Registered Patients
            </h1>
            <p style={{ color: '#64748b', fontSize: '14px', marginTop: '2px' }}>
              Directory of all patients, medical history, and quick registration
            </p>
          </div>
        </div>

        <button 
          onClick={() => setShowRegisterModal(true)}
          style={{
            background: '#258ec8',
            color: '#ffffff',
            border: 'none',
            padding: '12px 20px',
            borderRadius: '10px',
            fontWeight: 700,
            fontSize: '14px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            boxShadow: '0 4px 14px rgba(37, 142, 200, 0.25)'
          }}
        >
          <UserPlus size={16} /> Register New Patient
        </button>
      </div>

      {/* Search Bar */}
      <div style={{
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '16px',
        padding: '16px',
        marginBottom: '24px',
        boxShadow: '0 4px 14px rgba(0, 0, 0, 0.03)',
        display: 'flex',
        alignItems: 'center'
      }}>
        <Search size={18} color="#64748b" style={{ marginRight: '12px' }} />
        <input 
          type="text" 
          placeholder="Search patient by name, mobile number, or ID (e.g. PAT-901)..." 
          style={{ border: 'none', outline: 'none', width: '100%', fontSize: '14px', color: '#0f172a' }}
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
        />
      </div>

      {/* Patient Records List */}
      <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '20px', padding: '20px', boxShadow: '0 4px 14px rgba(0, 0, 0, 0.03)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #f1f5f9', textAlign: 'left', color: '#64748b', fontSize: '12px', fontWeight: 700 }}>
              <th style={{ padding: '12px 10px' }}>PATIENT ID & NAME</th>
              <th style={{ padding: '12px 10px' }}>MOBILE NUMBER</th>
              <th style={{ padding: '12px 10px' }}>AGE / GENDER</th>
              <th style={{ padding: '12px 10px' }}>LAST VISIT</th>
              <th style={{ padding: '12px 10px' }}>STATUS</th>
              <th style={{ padding: '12px 10px', textAlign: 'right' }}>DETAILS</th>
            </tr>
          </thead>
          <tbody>
            {filteredPatients.map(patient => (
              <tr key={patient.id} style={{ borderBottom: '1px solid #f8fafc' }}>
                <td style={{ padding: '14px 10px' }}>
                  <div style={{ fontWeight: 700, color: '#1e293b' }}>{patient.name}</div>
                  <div style={{ fontSize: '12px', color: '#258ec8', fontWeight: 600 }}>{patient.id}</div>
                </td>
                <td style={{ padding: '14px 10px', color: '#475569', fontWeight: 500 }}>{patient.phone}</td>
                <td style={{ padding: '14px 10px', color: '#64748b' }}>{patient.age} yrs • {patient.gender}</td>
                <td style={{ padding: '14px 10px', color: '#64748b' }}>{patient.lastVisit}</td>
                <td style={{ padding: '14px 10px' }}>
                  <span style={{
                    background: patient.status === 'active' ? 'rgba(37, 142, 200, 0.12)' : 'rgba(168, 206, 58, 0.2)',
                    color: patient.status === 'active' ? '#258ec8' : '#638012',
                    padding: '4px 10px',
                    borderRadius: '12px',
                    fontSize: '12px',
                    fontWeight: 700,
                    textTransform: 'capitalize'
                  }}>
                    {patient.status.replace('_', ' ')}
                  </span>
                </td>
                <td style={{ padding: '14px 10px', textAlign: 'right' }}>
                  <button style={{
                    background: '#f1f5f9',
                    border: 'none',
                    color: '#258ec8',
                    padding: '6px 12px',
                    borderRadius: '8px',
                    fontSize: '13px',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}>
                    View History
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Registration Modal Overlay */}
      {showRegisterModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(15, 23, 42, 0.5)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 200,
          padding: '20px'
        }}>
          <div style={{
            background: '#ffffff',
            borderRadius: '24px',
            padding: '32px',
            maxWidth: '440px',
            width: '100%',
            boxShadow: '0 20px 50px rgba(0,0,0,0.15)'
          }}>
            <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#1e293b', marginBottom: '16px' }}>
              Register New Patient
            </h2>
            <form onSubmit={handleRegisterPatient} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>Patient Full Name</label>
                <input 
                  type="text" 
                  placeholder="Enter full name..." 
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '14px', outline: 'none' }}
                  value={newPatientName}
                  onChange={e => setNewPatientName(e.target.value)}
                  required
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>Mobile Number</label>
                <input 
                  type="tel" 
                  placeholder="+91 Mobile number..." 
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '14px', outline: 'none' }}
                  value={newPatientPhone}
                  onChange={e => setNewPatientPhone(e.target.value)}
                  required
                />
              </div>

              <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
                <button 
                  type="button" 
                  onClick={() => setShowRegisterModal(false)}
                  style={{ flex: 1, background: '#f1f5f9', border: 'none', color: '#64748b', height: '44px', borderRadius: '10px', fontWeight: 700, cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  style={{ flex: 1, background: '#258ec8', border: 'none', color: '#ffffff', height: '44px', borderRadius: '10px', fontWeight: 700, cursor: 'pointer' }}
                >
                  Save Patient
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
