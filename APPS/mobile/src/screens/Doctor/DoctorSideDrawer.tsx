import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Modal, SafeAreaView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface DoctorSideDrawerProps {
  visible: boolean;
  activeTab: string;
  onSelectTab: (tab: string) => void;
  onClose: () => void;
  isHeadDoctor: boolean;
  doctorName: string;
}

export const DoctorSideDrawer: React.FC<DoctorSideDrawerProps> = ({
  visible,
  activeTab,
  onSelectTab,
  onClose,
  isHeadDoctor,
  doctorName,
}) => {
  const navigationItems = [
    { id: 'dashboard', label: 'Dashboard', icon: 'grid-outline' as const },
    { id: 'patients', label: 'Patient List', icon: 'people-outline' as const },
    // Packages & Total Revenue visible ONLY for Head Doctor
    ...(isHeadDoctor ? [
      { id: 'packages', label: 'Packages', icon: 'cube-outline' as const },
      { id: 'revenue', label: 'Total Revenue', icon: 'stats-chart-outline' as const },
    ] : []),
  ];

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.drawerContainer}>
          <SafeAreaView style={{ flex: 1 }}>
            {/* Header / Doctor Info */}
            <View style={styles.drawerHeader}>
              <View style={styles.avatarCircle}>
                <Ionicons name="person-outline" size={24} color="#38bdf8" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.docName} numberOfLines={1}>{doctorName}</Text>
                <View style={[styles.badge, isHeadDoctor ? styles.headBadge : styles.empBadge]}>
                  <Text style={[styles.badgeText, isHeadDoctor ? styles.headBadgeText : styles.empBadgeText]}>
                    {isHeadDoctor ? 'HEAD DOCTOR' : 'EMPLOYEE DOCTOR'}
                  </Text>
                </View>
              </View>
              <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                <Ionicons name="close-outline" size={24} color="#64748b" />
              </TouchableOpacity>
            </View>

            <View style={styles.divider} />

            {/* Navigation Options */}
            <View style={styles.navSection}>
              <Text style={styles.sectionHeaderTitle}>DOCTOR NAVIGATION</Text>
              {navigationItems.map((item) => {
                const isActive = activeTab === item.id;
                return (
                  <TouchableOpacity
                    key={item.id}
                    style={[styles.navItem, isActive && styles.navItemActive]}
                    onPress={() => {
                      onSelectTab(item.id);
                      onClose();
                    }}
                  >
                    <Ionicons
                      name={item.icon}
                      size={20}
                      color={isActive ? '#0284c7' : '#64748b'}
                      style={{ marginRight: 12 }}
                    />
                    <Text style={[styles.navLabel, isActive && styles.navLabelActive]}>
                      {item.label}
                    </Text>
                    {isActive && (
                      <View style={styles.activeDot} />
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>

            <View style={{ flex: 1 }} />

            {/* Footer */}
            <View style={styles.drawerFooter}>
              <Text style={styles.footerAppTitle}>Medical Center Portal</Text>
              <Text style={styles.footerVer}>v2.4.0 • Doctor Suite</Text>
            </View>
          </SafeAreaView>
        </View>

        {/* Backdrop Touchable to Dismiss */}
        <TouchableOpacity style={styles.backdropTouch} onPress={onClose} activeOpacity={1} />
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
  },
  drawerContainer: {
    width: '78%',
    maxWidth: 320,
    backgroundColor: '#ffffff',
    height: '100%',
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  backdropTouch: {
    flex: 1,
  },
  drawerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
  },
  avatarCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#e0f2fe',
    alignItems: 'center',
    justifyContent: 'center',
  },
  docName: { fontSize: 15, fontWeight: '800', color: '#0f172a' },
  badge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, alignSelf: 'flex-start', marginTop: 3 },
  headBadge: { backgroundColor: '#e0f2fe' },
  headBadgeText: { color: '#0284c7' },
  empBadge: { backgroundColor: '#dcfce7' },
  empBadgeText: { color: '#16a34a' },
  badgeText: { fontSize: 9.5, fontWeight: '800' },
  closeBtn: { padding: 4 },
  divider: { height: 1, backgroundColor: '#f1f5f9', marginVertical: 8 },
  navSection: { marginTop: 12 },
  sectionHeaderTitle: { fontSize: 10.5, fontWeight: '800', color: '#94a3b8', marginBottom: 10, letterSpacing: 0.5 },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 10,
    marginBottom: 4,
  },
  navItemActive: {
    backgroundColor: '#f0f9ff',
  },
  navLabel: { fontSize: 14, fontWeight: '600', color: '#334155' },
  navLabelActive: { color: '#0284c7', fontWeight: '800' },
  activeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#0284c7',
    marginLeft: 'auto',
  },
  drawerFooter: {
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  footerAppTitle: { fontSize: 12, fontWeight: '700', color: '#64748b' },
  footerVer: { fontSize: 10.5, color: '#94a3b8', marginTop: 2 },
});
