import React from 'react';
import { AdminDashboardPage } from '../Admin/AdminDashboardPage';

interface HRDashboardPageProps {
  currentBranch?: string;
}

export const HRDashboardPage: React.FC<HRDashboardPageProps> = ({ currentBranch = "All Branches" }) => {
  return <AdminDashboardPage currentBranch={currentBranch} role="hr" />;
};
