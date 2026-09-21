import React, { useState } from 'react';
import { DoctorSidebar } from './DoctorSidebar';
import { DoctorDashboardPage } from './Dashboard/DoctorDashboardPage';
import { DoctorPatientListPage } from './PatientList/DoctorPatientListPage';
import { DoctorPackagesPage } from './Packages/DoctorPackagesPage';
import { DoctorTotalRevenuePage } from './TotalRevenue/DoctorTotalRevenuePage';
import { PatientFilePage } from '../PatientFile/PatientFilePage';

interface DoctorLayoutProps {
  doctorCategory?: string; // 'Head Doctor' | 'Employee Doctor'
  doctorName?: string;
  onLogout?: () => void;
}

export const DoctorLayout: React.FC<DoctorLayoutProps> = ({
  doctorCategory = 'Head Doctor',
  doctorName = 'Dr. Prashanth K Vaidya',
  onLogout,
}) => {
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [selectedPatient, setSelectedPatient] = useState<any | null>(null);

  const isHeadDoctor = doctorCategory === 'Head Doctor' || doctorName.includes('Prashanth') || doctorName.includes('Rama') || doctorName.includes('Jobedah');

  const handleNavigate = (tab: string, data?: any) => {
    if (data) {
      setSelectedPatient(data);
    }
    setActiveTab(tab);
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
      case 'doctor':
        return (
          <DoctorDashboardPage
            doctorCategory={isHeadDoctor ? 'Head Doctor' : 'Employee Doctor'}
            doctorName={doctorName}
            onNavigateTab={handleNavigate}
          />
        );
      case 'patient_file':
        return (
          <PatientFilePage
            initialPatient={selectedPatient}
            isDoctor={true}
            onBack={() => setActiveTab('dashboard')}
            onSubmitConsultation={() => setActiveTab('dashboard')}
          />
        );
      case 'patient_list':
        return <DoctorPatientListPage onNavigateTab={handleNavigate} />;
      case 'packages':
        return isHeadDoctor ? <DoctorPackagesPage /> : <DoctorDashboardPage doctorCategory="Employee Doctor" doctorName={doctorName} />;
      case 'total_revenue':
      case 'revenue':
        return isHeadDoctor ? <DoctorTotalRevenuePage /> : <DoctorDashboardPage doctorCategory="Employee Doctor" doctorName={doctorName} />;
      default:
        return (
          <DoctorDashboardPage
            doctorCategory={isHeadDoctor ? 'Head Doctor' : 'Employee Doctor'}
            doctorName={doctorName}
            onNavigateTab={setActiveTab}
          />
        );
    }
  };

  return (
    <div style={{ display: 'flex', minHeight: 'calc(100vh - 60px)', background: '#f8fafc' }}>
      <DoctorSidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isHeadDoctor={isHeadDoctor}
        onLogout={onLogout}
        doctorName={doctorName}
      />
      <main style={{ flex: 1, overflowY: 'auto' }}>
        {renderContent()}
      </main>
    </div>
  );
};
