import React, { useState } from 'react';
import { 
  UserCheck, Calendar, DollarSign, Award, Clock, Target, Building2, 
  Search, CheckCircle2, XCircle, AlertCircle, ShieldCheck, Users,
  ChevronLeft, ChevronRight
} from 'lucide-react';

interface HRDashboardPageProps {
  currentBranch?: string;
}

export const HRDashboardPage: React.FC<HRDashboardPageProps> = ({ currentBranch = "All Branches" }) => {
  const [activeTab, setActiveTab] = useState<'attendance' | 'roster' | 'payroll' | 'targets'>('attendance');
  const [isNavCollapsed, setIsNavCollapsed] = useState(false);

  // Staff Attendance List State
  const [staffAttendanceList, setStaffAttendanceList] = useState([
    { id: 'STF-101', name: 'Anil Kumar M', role: 'Regular Staff', branch: 'KPHB', hours: '8.5 hrs', status: 'Present', checkIn: '09:55 AM', checkOut: '08:30 PM' },
    { id: 'STF-102', name: 'Ashwini Begari', role: 'Regular Staff', branch: 'Chandanagar', hours: '8.0 hrs', status: 'Present', checkIn: '10:02 AM', checkOut: '08:00 PM' },
    { id: 'STF-103', name: 'Vaishnavi Peri', role: 'Regular Staff', branch: 'Nallagandla', hours: '8.5 hrs', status: 'Present', checkIn: '09:48 AM', checkOut: '08:30 PM' },
    { id: 'STF-104', name: 'Nandini Gottelli', role: 'Regular Staff', branch: 'Dilshuknagar', hours: '0.0 hrs', status: 'On Leave', checkIn: '-', checkOut: '-' },
    { id: 'STF-105', name: 'Arun Kumar', role: 'Regular Staff', branch: 'Nallagandla', hours: '8.5 hrs', status: 'Present', checkIn: '10:00 AM', checkOut: '08:30 PM' },
  ]);

  // Branch Targets State
  const branchTargets = [
    { name: 'KPHB Branch', target: '₹12,00,000', current: '₹9,80,000', staffCount: 5, targetStatus: 'On Track (82%)' },
    { name: 'Nallagandla Branch', target: '₹10,00,000', current: '₹8,40,000', staffCount: 4, targetStatus: 'On Track (84%)' },
    { name: 'Dilshuknagar Branch', target: '₹14,00,000', current: '₹11,50,000', staffCount: 6, targetStatus: 'Ahead (82%)' },
    { name: 'Chandanagar Branch', target: '₹9,00,000', current: '₹7,20,000', staffCount: 4, targetStatus: 'On Track (80%)' },
  ];

  const handleToggleAttendance = (id: string) => {
    setStaffAttendanceList(prev => prev.map(s => {
      if (s.id === id) {
        const nextStatus = s.status === 'Present' ? 'Absent' : s.status === 'Absent' ? 'On Leave' : 'Present';
        return { ...s, status: nextStatus };
      }
      return s;
    }));
  };

  const hrMenuItems = [
    { id: 'attendance', label: 'Staff Attendance & Hours', icon: UserCheck },
    { id: 'roster', label: 'Shift Roster Scheduling', icon: Clock },
    { id: 'targets', label: 'Branch Target Management', icon: Target },
    { id: 'payroll', label: 'Staff Payroll & Salaries', icon: DollarSign },
  ];

  return (
    <div style={{ display: 'flex', minHeight: 'calc(100vh - 67px)', background: '#f8fafc' }}>
      {/* HR Left Side Navigation matching ReceptionSidebar */}
      <aside style={{
        width: isNavCollapsed ? '64px' : '200px',
        minWidth: isNavCollapsed ? '64px' : '200px',
        background: '#ffffff',
        borderRight: '1px solid #e2e8f0',
        position: 'fixed',
        top: '67px',
        bottom: 0,
        left: 0,
        padding: isNavCollapsed ? '14px 6px' : '14px 10px',
        display: 'flex',
        flexDirection: 'column',
        gap: '3px',
        overflowY: 'auto',
        overflowX: 'hidden',
        zIndex: 40,
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: isNavCollapsed ? 'center' : 'space-between',
          padding: '0 4px 8px 4px',
          marginBottom: '6px',
          borderBottom: '1px solid #f1f5f9'
        }}>
          {!isNavCollapsed && (
            <h3 style={{ fontSize: '10px !important', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.6px', margin: 0 }}>
              HR Portal Menu
            </h3>
          )}
          <button
            onClick={() => setIsNavCollapsed(!isNavCollapsed)}
            title={isNavCollapsed ? "Expand Sidebar (Open)" : "Collapse Sidebar (Close)"}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '26px',
              height: '26px',
              borderRadius: '6px',
              border: '1px solid #cbd5e1',
              background: '#f8fafc',
              color: '#258ec8',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
            }}
          >
            {isNavCollapsed ? <ChevronRight size={16} color="#258ec8" /> : <ChevronLeft size={16} color="#258ec8" />}
          </button>
        </div>

        {hrMenuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id as any)}
              title={isNavCollapsed ? item.label : undefined}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: isNavCollapsed ? 'center' : 'space-between',
                width: '100%',
                padding: isNavCollapsed ? '9px 0' : '7px 10px',
                borderRadius: '8px',
                border: isActive ? '1px solid rgba(37, 142, 200, 0.3)' : '1px solid transparent',
                background: isActive ? 'rgba(37, 142, 200, 0.1)' : 'transparent',
                color: isActive ? '#258ec8' : '#475569',
                fontWeight: isActive ? 700 : 500,
                fontSize: '11.5px !important',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                textAlign: 'left'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: isNavCollapsed ? 'center' : 'flex-start' }}>
                <Icon size={16} color={isActive ? '#258ec8' : '#64748b'} />
                {!isNavCollapsed && <span>{item.label}</span>}
              </div>
              {!isNavCollapsed && isActive && <ChevronRight size={13} color="#258ec8" />}
            </button>
          );
        })}
      </aside>

      {/* Main Content Area matching ReceptionLayout */}
      <div style={{
        flex: 1,
        padding: '24px',
        marginLeft: isNavCollapsed ? '64px' : '200px',
        transition: 'margin-left 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        minWidth: 0
      }}>

      {/* TAB 1: STAFF ATTENDANCE & WORKING HOURS */}
      {activeTab === 'attendance' && (
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '20px', padding: '22px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <div>
              <h2 style={{ fontSize: '16px !important', fontWeight: 800, color: '#0f172a' }}>
                Daily Staff Attendance & Working Hours Log
              </h2>
              <p style={{ fontSize: '12px !important', color: '#64748b' }}>
                Click on any staff status badge to toggle between Present, Absent, and On Leave.
              </p>
            </div>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                  <th style={{ padding: '12px 14px', fontSize: '12px !important', fontWeight: 800, color: '#475569' }}>STAFF ID</th>
                  <th style={{ padding: '12px 14px', fontSize: '12px !important', fontWeight: 800, color: '#475569' }}>STAFF NAME</th>
                  <th style={{ padding: '12px 14px', fontSize: '12px !important', fontWeight: 800, color: '#475569' }}>ROLE & BRANCH</th>
                  <th style={{ padding: '12px 14px', fontSize: '12px !important', fontWeight: 800, color: '#475569' }}>CHECK-IN TIME</th>
                  <th style={{ padding: '12px 14px', fontSize: '12px !important', fontWeight: 800, color: '#475569' }}>WORKING HOURS</th>
                  <th style={{ padding: '12px 14px', fontSize: '12px !important', fontWeight: 800, color: '#475569' }}>ATTENDANCE STATUS</th>
                </tr>
              </thead>
              <tbody>
                {staffAttendanceList.map(stf => (
                  <tr key={stf.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '12px 14px', fontSize: '12px !important', fontWeight: 800, color: '#258ec8' }}>{stf.id}</td>
                    <td style={{ padding: '12px 14px', fontSize: '13px !important', fontWeight: 700, color: '#0f172a' }}>{stf.name}</td>
                    <td style={{ padding: '12px 14px', fontSize: '12.5px !important', color: '#334155' }}>{stf.role} ({stf.branch})</td>
                    <td style={{ padding: '12px 14px', fontSize: '12.5px !important', color: '#64748b' }}>{stf.checkIn}</td>
                    <td style={{ padding: '12px 14px', fontSize: '12.5px !important', color: '#16a34a', fontWeight: 700 }}>{stf.hours}</td>
                    <td style={{ padding: '12px 14px' }}>
                      <button 
                        onClick={() => handleToggleAttendance(stf.id)}
                        style={{ 
                          background: stf.status === 'Present' ? '#f0fdf4' : stf.status === 'Absent' ? '#fef2f2' : '#fefce8', 
                          color: stf.status === 'Present' ? '#16a34a' : stf.status === 'Absent' ? '#ef4444' : '#ca8a04', 
                          border: 'none', 
                          padding: '4px 10px', 
                          borderRadius: '8px', 
                          fontSize: '11.5px !important', 
                          fontWeight: 800,
                          cursor: 'pointer' 
                        }}
                      >
                        {stf.status === 'Present' ? '✓ Present' : stf.status === 'Absent' ? '✕ Absent' : '⏳ On Leave'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: SHIFT ROSTER SCHEDULING */}
      {activeTab === 'roster' && (
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '20px', padding: '22px' }}>
          <h2 style={{ fontSize: '16px !important', fontWeight: 800, color: '#0f172a', marginBottom: '4px' }}>
            Shift Roster & Timings Schedule
          </h2>
          <p style={{ fontSize: '12px !important', color: '#64748b', marginBottom: '20px' }}>
            Standard clinic shift timings for staff and receptionists.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '18px' }}>
              <span style={{ fontSize: '13.5px !important', fontWeight: 800, color: '#0f172a', display: 'block', marginBottom: '6px' }}>
                ☀️ Morning Shift Roster
              </span>
              <span style={{ fontSize: '12px !important', color: '#258ec8', fontWeight: 700, display: 'block', marginBottom: '10px' }}>
                10:00 AM - 02:00 PM (4.0 Hours)
              </span>
              <p style={{ fontSize: '11.5px !important', color: '#64748b' }}>
                Assigned Staff: Anil Kumar M, Vaishnavi Peri, Arun Kumar
              </p>
            </div>

            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '18px' }}>
              <span style={{ fontSize: '13.5px !important', fontWeight: 800, color: '#0f172a', display: 'block', marginBottom: '6px' }}>
                🌙 Evening Shift Roster
              </span>
              <span style={{ fontSize: '12px !important', color: '#258ec8', fontWeight: 700, display: 'block', marginBottom: '10px' }}>
                03:00 PM - 08:30 PM (5.5 Hours)
              </span>
              <p style={{ fontSize: '11.5px !important', color: '#64748b' }}>
                Assigned Staff: Ashwini Begari, Nandini Gottelli
              </p>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: BRANCH TARGET MANAGEMENT */}
      {activeTab === 'targets' && (
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '20px', padding: '22px' }}>
          <h2 style={{ fontSize: '16px !important', fontWeight: 800, color: '#0f172a', marginBottom: '4px' }}>
            Branch Target Management & Staff Progress
          </h2>
          <p style={{ fontSize: '12px !important', color: '#64748b', marginBottom: '20px' }}>
            Monthly branch revenue targets and team performance tracking.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px' }}>
            {branchTargets.map(b => (
              <div key={b.name} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '18px' }}>
                <span style={{ fontSize: '14px !important', fontWeight: 800, color: '#0f172a', display: 'block', marginBottom: '8px' }}>{b.name}</span>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px !important', color: '#64748b', marginBottom: '6px' }}>
                  <span>Monthly Target: <b>{b.target}</b></span>
                  <span>Achieved: <b style={{ color: '#16a34a' }}>{b.current}</b></span>
                </div>
                <span style={{ fontSize: '11px !important', color: '#258ec8', fontWeight: 700 }}>
                  {b.targetStatus} • {b.staffCount} Staff Members
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: PAYROLL & SALARIES */}
      {activeTab === 'payroll' && (
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '20px', padding: '22px' }}>
          <h2 style={{ fontSize: '16px !important', fontWeight: 800, color: '#0f172a', marginBottom: '4px' }}>
            Staff Payroll & Salary Summary
          </h2>
          <p style={{ fontSize: '12px !important', color: '#64748b', marginBottom: '20px' }}>
            Monthly salary distribution and employee payouts.
          </p>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                  <th style={{ padding: '12px 14px', fontSize: '12px !important', fontWeight: 800, color: '#475569' }}>STAFF NAME</th>
                  <th style={{ padding: '12px 14px', fontSize: '12px !important', fontWeight: 800, color: '#475569' }}>BRANCH</th>
                  <th style={{ padding: '12px 14px', fontSize: '12px !important', fontWeight: 800, color: '#475569' }}>BASE SALARY</th>
                  <th style={{ padding: '12px 14px', fontSize: '12px !important', fontWeight: 800, color: '#475569' }}>PAYOUT STATUS</th>
                </tr>
              </thead>
              <tbody>
                <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '12px 14px', fontSize: '13px !important', fontWeight: 700 }}>Anil Kumar M</td>
                  <td style={{ padding: '12px 14px', fontSize: '12.5px !important' }}>KPHB</td>
                  <td style={{ padding: '12px 14px', fontSize: '13px !important', fontWeight: 800, color: '#0f172a' }}>₹22,000</td>
                  <td style={{ padding: '12px 14px' }}><span style={{ background: '#f0fdf4', color: '#16a34a', padding: '3px 8px', borderRadius: '8px', fontSize: '11px !important', fontWeight: 700 }}>✓ Processed</span></td>
                </tr>
                <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '12px 14px', fontSize: '13px !important', fontWeight: 700 }}>Ashwini Begari</td>
                  <td style={{ padding: '12px 14px', fontSize: '12.5px !important' }}>Chandanagar</td>
                  <td style={{ padding: '12px 14px', fontSize: '13px !important', fontWeight: 800, color: '#0f172a' }}>₹17,000</td>
                  <td style={{ padding: '12px 14px' }}><span style={{ background: '#f0fdf4', color: '#16a34a', padding: '3px 8px', borderRadius: '8px', fontSize: '11px !important', fontWeight: 700 }}>✓ Processed</span></td>
                </tr>
                <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '12px 14px', fontSize: '13px !important', fontWeight: 700 }}>Vaishnavi Peri</td>
                  <td style={{ padding: '12px 14px', fontSize: '12.5px !important' }}>Nallagandla</td>
                  <td style={{ padding: '12px 14px', fontSize: '13px !important', fontWeight: 800, color: '#0f172a' }}>₹17,000</td>
                  <td style={{ padding: '12px 14px' }}><span style={{ background: '#f0fdf4', color: '#16a34a', padding: '3px 8px', borderRadius: '8px', fontSize: '11px !important', fontWeight: 700 }}>✓ Processed</span></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      </div>
    </div>
  );
};
