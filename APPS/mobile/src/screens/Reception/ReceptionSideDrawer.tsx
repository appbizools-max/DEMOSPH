import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Modal, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { UserRole } from '@app/shared';

interface ReceptionSideDrawerProps {
  visible: boolean;
  onClose: () => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  userRole?: UserRole;
  branchName?: string;
  onSignOut?: () => void;
}

export const ReceptionSideDrawer: React.FC<ReceptionSideDrawerProps> = ({
  visible,
  onClose,
  activeTab,
  setActiveTab,
  userRole = 'reception',
  branchName = 'Nallagandla Branch',
  onSignOut
}) => {

  const getMenuItems = () => {
    if (userRole === 'admin') {
      return [
        { id: 'admin', label: 'Admin Dashboard' },
        { id: 'admin_packages', label: 'Package Members' },
        { id: 'admin_patients', label: 'Global Patients' },
        { id: 'admin_banners', label: 'Manage Banners' },
        { id: 'admin_revenue', label: 'Analytics & Revenue' },
        { id: 'admin_pending', label: 'Pending Payments' },
        { id: 'admin_branches', label: 'Branch Targets' },
        { id: 'admin_doctors', label: 'Doctor Timings' },
        { id: 'admin_staff', label: 'Staff Management' },
        { id: 'admin_medicines', label: 'Edit Medicines' },
      ];
    }

    if (userRole === 'hr') {
      return [
        { id: 'hr_attendance', label: 'Staff Attendance' },
        { id: 'hr_roster', label: 'Shift Roster' },
        { id: 'hr_targets', label: 'Branch Targets' },
        { id: 'hr_payroll', label: 'Staff Payroll' },
      ];
    }

    // Default Reception menu
    return [
      { id: 'reception_dashboard', label: 'Dashboard' },
      { id: 'reception_book', label: 'Book Appointment' },
      { id: 'reception_patients', label: 'All Patients' },
      { id: 'reception_followups', label: 'Follow Ups' },
      { id: 'reception_medicines', label: 'Medicine Requests' },
      { id: 'reception_billing', label: 'Product Billing' },
      { id: 'reception_noshow', label: 'Doctor No Show' },
      { id: 'reception_media', label: 'Media Manager' },
      { id: 'reception_cleaning', label: 'Cleaning Photos' },
    ];
  };

  const menuItems = getMenuItems();

  const handleSelect = (id: string) => {
    setActiveTab(id);
    onClose();
  };

  const getRoleBadgeTitle = () => {
    if (userRole === 'admin') return 'ADMIN MENU';
    if (userRole === 'hr') return 'HR MENU';
    return 'RECEPTION MENU';
  };

  const displayBranch = (branchName && !branchName.includes('HQ'))
    ? branchName
    : userRole === 'admin'
      ? 'Admin Control Hub'
      : userRole === 'hr'
        ? 'HR Management'
        : 'Nallagandla Branch';

  return (
    <Modal visible={visible} transparent animationType="fade">
      <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose}>
        <View style={styles.drawerContainer} onStartShouldSetResponder={() => true}>

          {/* HEADER */}
          <View style={styles.drawerHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.brandTitle}>Spiritual Homeo</Text>
              <Text style={styles.brandSub}>{getRoleBadgeTitle()}</Text>
            </View>

            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={16} color="#64748b" />
            </TouchableOpacity>
          </View>

          {/* ACTIVE BRANCH TAG (Only for Branch Receptionists/Staff) */}
          {userRole !== 'admin' && (
            <View style={styles.branchTagCard}>
              <Ionicons name="location-outline" size={12} color="#258ec8" />
              <Text style={styles.branchTagText}>{branchName}</Text>
            </View>
          )}

          {/* FULL SCROLLING NAVIGATION CONTAINER */}
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{ paddingVertical: 8, paddingBottom: 20 }}
            showsVerticalScrollIndicator={false}
          >
            <Text style={styles.sectionHeading}>MENU OPTIONS</Text>

            {menuItems.map((item) => {
              const isActive = activeTab === item.id || (item.id === 'reception_dashboard' && activeTab === 'reception') || (item.id === 'admin' && activeTab === 'analytics');
              return (
                <TouchableOpacity
                  key={item.id}
                  style={[styles.menuItem, isActive && styles.menuItemActive]}
                  onPress={() => handleSelect(item.id)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.menuLabel, isActive && styles.menuLabelActive]}>
                    {item.label}
                  </Text>

                  {isActive && <Ionicons name="chevron-forward" size={14} color="#258ec8" />}
                </TouchableOpacity>
              );
            })}

            {/* LOG OUT BUTTON AT BOTTOM OF SCROLL */}
            {onSignOut && (
              <TouchableOpacity
                style={styles.logoutBtn}
                onPress={() => { onClose(); onSignOut(); }}
              >
                <Ionicons name="log-out-outline" size={15} color="#258ec8" style={{ marginRight: 6 }} />
                <Text style={styles.logoutBtnText}>Log Out</Text>
              </TouchableOpacity>
            )}
          </ScrollView>

        </View>
      </TouchableOpacity>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
    flexDirection: 'row',
  },
  drawerContainer: {
    width: '65%',
    maxWidth: 240,
    backgroundColor: '#ffffff',
    height: '100%',
    paddingTop: 44,
    paddingHorizontal: 12,
    borderTopRightRadius: 18,
    borderBottomRightRadius: 18,
    shadowColor: '#0f172a',
    shadowOffset: { width: 4, height: 0 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 12,
    display: 'flex',
    flexDirection: 'column',
  },
  drawerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    marginBottom: 8,
  },
  brandTitle: {
    fontSize: 14.5,
    fontWeight: '800',
    color: '#258ec8',
  },
  brandSub: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#258ec8',
    letterSpacing: 0.6,
  },
  closeBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#f8fafc',
    alignItems: 'center',
    justifyContent: 'center',
  },
  branchTagCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#eef5fc',
    borderWidth: 1,
    borderColor: 'rgba(37, 142, 200, 0.3)',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8,
    marginBottom: 8,
  },
  branchTagText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#258ec8',
  },
  sectionHeading: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#94a3b8',
    letterSpacing: 0.8,
    marginBottom: 6,
    marginLeft: 4,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 9,
    paddingHorizontal: 10,
    borderRadius: 8,
    marginBottom: 4,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  menuItemActive: {
    backgroundColor: '#eef5fc',
    borderColor: 'rgba(37, 142, 200, 0.3)',
  },
  menuLabel: {
    fontSize: 12,
    color: '#475569',
    fontWeight: '600',
  },
  menuLabelActive: {
    color: '#258ec8',
    fontWeight: '800',
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#eef5fc',
    borderWidth: 1,
    borderColor: 'rgba(37, 142, 200, 0.3)',
    paddingVertical: 8,
    borderRadius: 8,
    marginTop: 16,
  },
  logoutBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#258ec8',
  },
});
