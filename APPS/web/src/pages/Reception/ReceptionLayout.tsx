import React, { useState, useEffect, useMemo } from 'react';
import { ReceptionSidebar } from './ReceptionSidebar';
import { db } from '@app/shared';
import { collection, doc, onSnapshot, query, where } from 'firebase/firestore';
import {
  CleaningSchedule, CleaningSubmission, normalizeBranchName, checkBranchLockoutStatus, getTodayDateString
} from '../../utils/cleaningService';
import { CleaningPhotosPage } from './CleaningPhotos/CleaningPhotosPage';
import { AlertCircle, Lock } from 'lucide-react';

interface ReceptionLayoutProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  children: React.ReactNode;
}

export const ReceptionLayout: React.FC<ReceptionLayoutProps> = ({ activeTab, setActiveTab, children }) => {
  const [isNavCollapsed, setIsNavCollapsed] = useState(false);
  let isRoleAdminOrHr = false;
  let userBranch = 'KPHB';

  try {
    const saved = localStorage.getItem('sph_auth_session');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed?.role === 'admin' || parsed?.role === 'hr') {
        isRoleAdminOrHr = true;
      }
      if (parsed?.branchName) {
        userBranch = parsed.branchName;
      }
    }
  } catch (e) {}

  const currentBranch = normalizeBranchName(userBranch);

  const [schedule, setSchedule] = useState<CleaningSchedule>({
    branch: currentBranch,
    assignedDate: getTodayDateString()
  });
  const [submissions, setSubmissions] = useState<CleaningSubmission[]>([]);

  // 1. Listen to Cleaning Schedule
  useEffect(() => {
    if (isRoleAdminOrHr) return;
    const schedDocRef = doc(db, 'branch_cleaning_schedules', currentBranch);
    const unsub = onSnapshot(schedDocRef, (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setSchedule({
          branch: currentBranch,
          assignedDate: data.assignedDate || getTodayDateString(),
          updatedAt: data.updatedAt,
          updatedBy: data.updatedBy
        });
      } else {
        setSchedule({ branch: currentBranch, assignedDate: getTodayDateString() });
      }
    }, (err) => console.warn('Schedule listener error in layout:', err));
    return () => unsub();
  }, [currentBranch, isRoleAdminOrHr]);

  // 2. Listen to Cleaning Submissions
  useEffect(() => {
    if (isRoleAdminOrHr) return;
    const colRef = collection(db, 'branch_cleaning_submissions');
    const q = query(colRef, where('branch', '==', currentBranch));
    const unsub = onSnapshot(q, (snap) => {
      const list: CleaningSubmission[] = snap.docs.map(d => ({
        id: d.id,
        ...(d.data() as any)
      }));
      setSubmissions(list);
    }, (err) => console.warn('Submissions listener error in layout:', err));
    return () => unsub();
  }, [currentBranch, isRoleAdminOrHr]);

  const lockoutInfo = useMemo(() => {
    if (isRoleAdminOrHr) return { isBlocked: false, reason: '' };
    return checkBranchLockoutStatus(schedule.assignedDate, submissions, new Date());
  }, [isRoleAdminOrHr, schedule.assignedDate, submissions]);

  const isBlocked = lockoutInfo.isBlocked;

  if (isRoleAdminOrHr) {
    return <>{children}</>;
  }

  return (
    <div style={{ display: 'flex', minHeight: 'calc(100vh - 67px)', background: '#f8fafc' }}>
      {/* Side Navigation */}
      <ReceptionSidebar
        activeTab={activeTab}
        setActiveTab={(tab) => {
          if (isBlocked && tab !== 'reception_cleaning') {
            setActiveTab('reception_cleaning');
          } else {
            setActiveTab(tab);
          }
        }}
        isNavCollapsed={isNavCollapsed}
        setIsNavCollapsed={setIsNavCollapsed}
        isCleaningBlocked={isBlocked}
      />

      {/* Main Content Area */}
      <div style={{
        flex: 1,
        padding: '24px',
        marginLeft: isNavCollapsed ? '64px' : '200px',
        transition: 'margin-left 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        minWidth: 0
      }}>
        {/* If overdue and unapproved, forcibly show the Cleaning Photos Submission Screen */}
        {isBlocked ? (
          <div>
            <div style={{
              background: '#fff1f2',
              border: '2px solid #ef4444',
              borderRadius: '16px',
              padding: '16px 20px',
              marginBottom: '20px',
              display: 'flex',
              alignItems: 'center',
              gap: '14px',
              boxShadow: '0 4px 14px rgba(239, 68, 68, 0.12)'
            }}>
              <div style={{ background: '#ef4444', padding: '10px', borderRadius: '12px' }}>
                <Lock size={22} color="#ffffff" />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '16px', fontWeight: 800, color: '#991b1b' }}>
                  Reception Portal Locked: Weekly Clinic Cleaning Overdue
                </div>
                <div style={{ fontSize: '13px', color: '#b91c1c', marginTop: '2px' }}>
                  {lockoutInfo.reason} Normal operations (booking, billing, patient lists) are locked until 5 to 7 cleaning photos are submitted and verified by HR.
                </div>
              </div>
            </div>

            {/* Directly render CleaningPhotosPage so receptionist can upload 5-7 photos immediately */}
            <CleaningPhotosPage
              currentBranch={currentBranch}
              isOverdueLocked={true}
              onSubmittedSuccess={() => {
                setActiveTab('reception_cleaning');
              }}
            />
          </div>
        ) : (
          children
        )}
      </div>
    </div>
  );
};
