import React, { useState, useEffect } from 'react';
import { PatientFileUI } from '../../components/PatientFileUI';
import { Search, User, FileText, ArrowLeft, RefreshCw } from 'lucide-react';

import { receptionDataStore } from '../../utils/receptionDataStore';

interface PatientFilePageProps {
  onBack?: () => void;
  initialPatient?: any;
  onSubmitConsultation?: (data: any) => void;
  isDoctor?: boolean;
}

export const PatientFilePage: React.FC<PatientFilePageProps> = ({ onBack, initialPatient, onSubmitConsultation, isDoctor = false }) => {
  const [patients, setPatients] = useState<any[]>(() => {
    const pool = receptionDataStore.getAllCollectionsPool();
    if (initialPatient && !pool.some(p => p.id === initialPatient.id)) {
      return [initialPatient, ...pool];
    }
    return pool;
  });

  const [selectedPatientId, setSelectedPatientId] = useState<string>(() => {
    return initialPatient?.id || initialPatient?.patientId || '';
  });
  const [searchQuery, setSearchQuery] = useState('');

  // Subscribe to live patients from receptionDataStore
  useEffect(() => {
    receptionDataStore.startListeners();
    const unsub = receptionDataStore.subscribe((state) => {
      const pool = state.allCollectionsPool;
      setPatients(prev => {
        if (initialPatient && !pool.some(p => p.id === initialPatient.id)) {
          return [initialPatient, ...pool];
        }
        return pool;
      });
    });
    return () => unsub();
  }, [initialPatient]);

  // Update selected patient if initialPatient passed
  useEffect(() => {
    if (initialPatient) {
      const pId = initialPatient.id || initialPatient.patientId || '';
      if (pId) {
        setSelectedPatientId(pId);
      }
      setPatients(prev => {
        if (!prev.find(p => p.id === pId)) {
          return [initialPatient, ...prev];
        }
        return prev;
      });
    }
  }, [initialPatient]);

  const filteredPatients = (() => {
    const term = searchQuery.toLowerCase();
    const seen = new Set<string>();
    const result: any[] = [];
    for (const p of patients) {
      const id = p.id || p.docId || '';
      if (!id || seen.has(id)) continue;
      seen.add(id);
      const name = (p.patientName || p.name || '').toLowerCase();
      const reg = (p.registrationId || p.regId || '').toLowerCase();
      const phone = (p.phone || p.phoneNumber || '').toLowerCase();
      if (name.includes(term) || reg.includes(term) || phone.includes(term)) {
        result.push(p);
      }
    }
    return result;
  })();

  const activePatient = patients.find(p => p.id === selectedPatientId) || (initialPatient || patients[0]);

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
