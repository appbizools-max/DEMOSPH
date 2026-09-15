import React from 'react';
import { AdminScreen } from '../Admin/AdminScreen';

interface HRScreenProps {
  currentTab?: string;
  onNavigateTab?: (tab: string) => void;
}

export const HRScreen: React.FC<HRScreenProps> = ({ currentTab, onNavigateTab }) => {
  return <AdminScreen currentTab={currentTab} role="hr" onNavigateTab={onNavigateTab} />;
};
