import React, { useState, useEffect } from 'react';
import { PatientFileUI } from '../../components/PatientFileUI';
import { Search, User, FileText, ArrowLeft, RefreshCw } from 'lucide-react';
import { db } from '@app/shared';
import { collection, onSnapshot } from 'firebase/firestore';

interface PatientFilePageProps {
  onBack?: () => void;
  initialPatient?: any;
  onSubmitConsultation?: (data: any) => void;
  isDoctor?: boolean;
}

export const PatientFilePage: React.FC<PatientFilePageProps> = ({ onBack, initialPatient, onSubmitConsultation, isDoctor = false }) => {
  const [patients, setPatients] = useState<any[]>([
    {
      id: 'demo-1',
      patientName: 'Swpana latha',
      name: 'Swpana latha',
      registrationId: 'SPHDSN-124',
      regId: 'SPHDSN-124',
      phone: '9000136260',
      branch: 'Dilshuknagar',
      source: 'Old Patient',
      subject: 'Fever',
      diseases: 'Fever, Body ache',
      vitals: { bp: '120/80', pulse: '72', temp: '98.6', weight: '68', spo2: '98' }
    },
    {
      id: 'demo-2',
      patientName: 'Rahul Kumar',
      name: 'Rahul Kumar',
      registrationId: 'SPHDSN-125',
      regId: 'SPHDSN-125',
      phone: '9849012345',
      branch: 'KPHB Branch',
      source: 'Walk-in',
      subject: 'Allergic Rhinitis & Sinusitis',
      diseases: 'Nasal congestion, sneezing',
      vitals: { bp: '118/76', pulse: '75', temp: '98.4', weight: '72', spo2: '99' }
    },
    {
      id: 'demo-3',
      patientName: 'Ananya Sharma',
      name: 'Ananya Sharma',
      registrationId: 'SPHDSN-126',
      regId: 'SPHDSN-126',
      phone: '9100987654',
      branch: 'Kukatpally Branch',
      source: 'Google Ads',
      subject: 'Skin Allergy & Eczema',
      diseases: 'Skin redness, itching',
      vitals: { bp: '122/82', pulse: '70', temp: '98.6', weight: '58', spo2: '98' }
    }
  ]);

  const [selectedPatientId, setSelectedPatientId] = useState<string>('demo-1');
  const [searchQuery, setSearchQuery] = useState('');

  // Subscribe to live patients from Firestore
  useEffect(() => {
    let unsubApp: (() => void) | null = null;
    let unsubPat: (() => void) | null = null;
    let appList: any[] = [];
    let patList: any[] = [];

    const mergeList = () => {
      const combined = [...appList, ...patList];
      const uniqueMap = new Map<string, any>();
      
      // Default demos first
      patients.forEach(p => uniqueMap.set(p.id, p));

      combined.forEach(p => {
        const id = p.id || p.docId;
        if (id && !uniqueMap.has(id)) {
          uniqueMap.set(id, {
            ...p,
            patientName: p.patientName || p.name || 'Patient Name',
            registrationId: p.registrationId || p.regId || `SPHDSN-${Math.floor(100 + Math.random() * 900)}`,
            branch: p.branch || 'Dilshuknagar',
            source: p.source || p.leadSource || 'Walk-in',
            subject: p.subject || p.diseases || 'Consultation',
          });
        }
      });

      setPatients(Array.from(uniqueMap.values()));
    };

    try {
      unsubApp = onSnapshot(collection(db, 'appointments'), (snapshot) => {
        appList = snapshot.docs.map(d => ({ ...d.data(), id: d.id }));
        mergeList();
      });
      unsubPat = onSnapshot(collection(db, 'allpatients'), (snapshot) => {
        patList = snapshot.docs.map(d => ({ ...d.data(), id: d.id }));
        mergeList();
      });
    } catch (err) {
      console.warn('Live patient subscription notice:', err);
    }

    return () => {
      if (unsubApp) unsubApp();
      if (unsubPat) unsubPat();
    };
  }, []);

  // Update selected patient if initialPatient passed
  useEffect(() => {
    if (initialPatient) {
      const pId = initialPatient.id || 'demo-1';
      setSelectedPatientId(pId);
      setPatients(prev => {
        if (!prev.find(p => p.id === pId)) {
          return [initialPatient, ...prev];
        }
        return prev;
      });
    }
  }, [initialPatient]);

  const filteredPatients = patients.filter(p => {
    const term = searchQuery.toLowerCase();
    const name = (p.patientName || p.name || '').toLowerCase();
    const reg = (p.registrationId || p.regId || '').toLowerCase();
    const phone = (p.phone || p.phoneNumber || '').toLowerCase();
    return name.includes(term) || reg.includes(term) || phone.includes(term);
  });

  const activePatient = patients.find(p => p.id === selectedPatientId) || patients[0];

  return (
    <div style={{
      backgroundColor: '#f8fafc',
      minHeight: 'calc(100vh - 60px)',
      width: '100%',
      display: 'flex',
      flexDirection: 'column',
      fontFamily: 'Inter, system-ui, -apple-system, sans-serif'
    }}>
      
      {/* Patient Selection Bar at Top of Page */}
      <div style={{
        backgroundColor: '#ffffff',
        borderBottom: '1px solid #e2e8f0',
        padding: '10px 24px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '12px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '11px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Active Patient File:
          </span>
          <select
            value={selectedPatientId}
            onChange={(e) => setSelectedPatientId(e.target.value)}
            style={{
              padding: '6px 12px',
              borderRadius: '8px',
              border: '1px solid #0284c7',
              backgroundColor: '#f0f9ff',
              color: '#0284c7',
              fontSize: '12px',
              fontWeight: 800,
              cursor: 'pointer',
              outline: 'none'
            }}
          >
            {filteredPatients.map(p => (
              <option key={p.id} value={p.id}>
                {p.registrationId || p.regId || 'REG'} - {p.patientName || p.name} ({p.branch || 'Dilshuknagar'})
              </option>
            ))}
          </select>
        </div>

        <div style={{ position: 'relative', width: '260px' }}>
          <Search size={14} color="#94a3b8" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
          <input
            type="text"
            placeholder="Search patient name or Reg ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '6px 10px 6px 30px',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              fontSize: '11.5px',
              outline: 'none'
            }}
          />
        </div>
      </div>

      {/* Main Standalone Full-Page Patient File View */}
      {activePatient ? (
        <div style={{ flex: 1 }}>
          <PatientFileUI
            patient={activePatient}
            onClose={onBack}
            onSubmitConsultation={onSubmitConsultation}
            isDoctor={isDoctor}
            isStandalonePage={true}
          />
        </div>
      ) : (
        <div style={{ backgroundColor: '#ffffff', padding: '60px', borderRadius: '16px', border: '1px solid #e2e8f0', textAlign: 'center', color: '#64748b', margin: '40px auto', maxWidth: '600px' }}>
          No patient record selected. Use the search dropdown above.
        </div>
      )}

    </div>
  );
};
