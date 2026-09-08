import React, { useState } from 'react';
import { ReceptionSidebar } from './ReceptionSidebar';

interface ReceptionLayoutProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  children: React.ReactNode;
}

export const ReceptionLayout: React.FC<ReceptionLayoutProps> = ({ activeTab, setActiveTab, children }) => {
  const [isNavCollapsed, setIsNavCollapsed] = useState(false);
  let isRoleAdminOrHr = false;
  try {
    const saved = localStorage.getItem('sph_auth_session');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed?.role === 'admin' || parsed?.role === 'hr') {
        isRoleAdminOrHr = true;
      }
    }
  } catch (e) {}

  if (isRoleAdminOrHr) {
    return <>{children}</>;
  }

  return (
    <div style={{ display: 'flex', minHeight: 'calc(100vh - 67px)', background: '#f8fafc' }}>
      {/* Side Navigation */}
      <ReceptionSidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isNavCollapsed={isNavCollapsed}
        setIsNavCollapsed={setIsNavCollapsed}
      />

      {/* Main Content Area */}
      <div style={{
        flex: 1,
        padding: '24px',
        marginLeft: isNavCollapsed ? '64px' : '200px',
        transition: 'margin-left 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        minWidth: 0
      }}>
        {children}
      </div>
    </div>
  );
};
