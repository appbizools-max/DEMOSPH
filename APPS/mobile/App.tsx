import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, SafeAreaView, TouchableOpacity, Platform, Alert, BackHandler } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons, Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Auth Screen
import { AuthScreen, LoginSuccessData } from './src/screens/AuthScreen/AuthScreen';

// Reception Sub-Screens & Side Drawer
import { ReceptionSideDrawer } from './src/screens/Reception/ReceptionSideDrawer';
import { ReceptionDashboardScreen } from './src/screens/Reception/Dashboard/ReceptionDashboardScreen';
import { BookAppointmentScreen } from './src/screens/Reception/BookAppointment/BookAppointmentScreen';
import { AllPatientsScreen } from './src/screens/Reception/AllPatients/AllPatientsScreen';
import { FollowUpsScreen } from './src/screens/Reception/FollowUps/FollowUpsScreen';
import { MedicineRequestsScreen } from './src/screens/Reception/MedicineRequests/MedicineRequestsScreen';
import { ProductBillingScreen } from './src/screens/Reception/ProductBilling/ProductBillingScreen';
import { DoctorNoShowScreen } from './src/screens/Reception/DoctorNoShow/DoctorNoShowScreen';
import { MediaManagerScreen } from './src/screens/Reception/MediaManager/MediaManagerScreen';
import { CleaningPhotosScreen } from './src/screens/Reception/CleaningPhotos/CleaningPhotosScreen';

// Admin, HR, Doctor & Staff Screens
import { AdminScreen } from './src/screens/Admin/AdminScreen';
import { HRScreen } from './src/screens/HR/HRScreen';
import { DoctorScreen } from './src/screens/Doctor/DoctorScreen';
import { StaffScreen } from './src/screens/Staff/StaffScreen';
import { PatientFileMobileScreen } from './src/screens/PatientFile/PatientFileMobileScreen';

import { UserRole, signOutUser } from '@app/shared';

const MOBILE_AUTH_KEY = '@sph_auth_session';

const resolveDoctorName = (phone: string, storedName?: string): string => {
  if (storedName && storedName.trim() && storedName !== 'Dr. Homeopathy Physician' && storedName !== 'Dr. Physician') {
    return storedName;
  }
  const digits = (phone || '').replace(/\D/g, '');
  if (digits.includes('8125260176')) return 'Dr. Prashanth K Vaidya';
  if (digits.includes('9903119766')) return 'Dr. Jobedah Parveez';
  if (digits.includes('9490808582')) return 'Dr. Padma Priya';
  if (digits.includes('1111111111')) return 'Dr. Ramakrishna Chanduri';
  return storedName || 'Homeopathy Physician';
};

export default function App() {
  const [activeTab, setActiveTab] = useState<string>('auth');
  const [tabHistory, setTabHistory] = useState<string[]>([]);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [userRole, setUserRole] = useState<UserRole>('reception');

  // Authenticated User Branch State (Branch-Locked)
  const [userName, setUserName] = useState('');
  const [branchName, setBranchName] = useState('Nallagandla');
  const [branchPhone, setBranchPhone] = useState('9553176176');
  const [isLoadingSession, setIsLoadingSession] = useState(true);

  const [selectedPatient, setSelectedPatient] = useState<any>(null);

  // Navigation Stack Helper
  const navigateToTab = (newTab: string, patientData?: any) => {
    let target = newTab;
    if (target === 'Dashboard' || target === 'dashboard' || target === 'reception') {
      target = userRole === 'admin' ? 'admin' : userRole === 'doctor' ? 'doctor' : userRole === 'staff' ? 'staff' : 'reception_dashboard';
    }
    if (patientData) {
      setSelectedPatient(patientData);
    }
    if (target === activeTab && !patientData) return;
    setTabHistory(prev => [...prev, activeTab]);
    setActiveTab(target);
  };

  const handleGoBack = (): boolean => {
    if (tabHistory.length > 0) {
      const prevTab = tabHistory[tabHistory.length - 1];
      setTabHistory(prev => prev.slice(0, -1));
      setActiveTab(prevTab);
      return true;
    } else if (activeTab !== 'reception_dashboard' && activeTab !== 'reception' && activeTab !== 'admin' && activeTab !== 'auth') {
      const defaultHome = userRole === 'admin' ? 'admin' : userRole === 'doctor' ? 'doctor' : userRole === 'staff' ? 'staff' : 'reception_dashboard';
      setActiveTab(defaultHome);
      return true;
    }
    return false;
  };

  // Hardware Back Button Listener (Native Android Back Press)
  useEffect(() => {
    const onHardwareBackPress = () => {
      return handleGoBack();
    };

    const subscription = BackHandler.addEventListener('hardwareBackPress', onHardwareBackPress);
    return () => subscription.remove();
  }, [tabHistory, activeTab, userRole]);

  // Restore saved session on app startup
  useEffect(() => {
    const restoreSession = async () => {
      try {
        const saved = await AsyncStorage.getItem(MOBILE_AUTH_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed && parsed.role) {
            setUserRole(parsed.role);
            const resolvedName = parsed.role === 'doctor' ? resolveDoctorName(parsed.branchPhone || '', parsed.userName) : (parsed.userName || 'Branch User');
            setUserName(resolvedName);
            setBranchName(parsed.branchName || 'Nallagandla');
            setBranchPhone(parsed.branchPhone || '9553176176');
            if (parsed.role === 'admin') {
              setActiveTab('admin');
            } else if (parsed.role === 'hr') {
              setActiveTab('hr');
            } else if (parsed.role === 'doctor') {
              setActiveTab('doctor');
            } else if (parsed.role === 'staff') {
              setActiveTab('staff');
            } else {
              setActiveTab('reception_dashboard');
            }
          }
        }
      } catch (e) {
        console.warn('Session restore note:', e);
      } finally {
        setIsLoadingSession(false);
      }
    };
    restoreSession();
  }, []);

  const handleLoginSuccess = async (data: LoginSuccessData) => {
    const resolvedName = data.role === 'doctor' ? resolveDoctorName(data.branchPhone, data.userName) : (data.userName || 'Branch User');
    try {
      await AsyncStorage.setItem(MOBILE_AUTH_KEY, JSON.stringify({
        role: data.role,
        userName: resolvedName,
        branchName: data.branchName,
        branchPhone: data.branchPhone,
      }));
    } catch (e) { }

    setUserRole(data.role);
    setUserName(resolvedName);
    setBranchName(data.branchName);
    setBranchPhone(data.branchPhone);
    setTabHistory([]);

    if (data.role === 'admin') {
      setActiveTab('admin');
    } else if (data.role === 'hr') {
      setActiveTab('hr');
    } else if (data.role === 'doctor') {
      setActiveTab('doctor');
    } else if (data.role === 'staff') {
      setActiveTab('staff');
    } else {
      setActiveTab('reception_dashboard');
    }
  };

  const handleSignOut = async () => {
    try {
      await AsyncStorage.removeItem(MOBILE_AUTH_KEY);
    } catch (e) { }
    await signOutUser();
    setTabHistory([]);
    setActiveTab('auth');
    Alert.alert('Signed Out', 'You have been logged out of SPH Staff Portal.');
  };

  const isAuthScreen = activeTab === 'auth';

  const renderScreen = () => {
    if (activeTab === 'auth') {
      return <AuthScreen onLoginSuccess={handleLoginSuccess} />;
    }

    if (activeTab === 'reception_medicines') {
      return <MedicineRequestsScreen />;
    }

    if (activeTab === 'hr') {
      return <HRScreen />;
    }

    if (activeTab === 'reception_book') {
      return <BookAppointmentScreen currentBranch={branchName} onNavigate={(tab: string) => navigateToTab(tab)} onBack={handleGoBack} />;
    }

    if (activeTab === 'patient_file' || activeTab === 'reception_patient_file') {
      return (
        <PatientFileMobileScreen
          patient={selectedPatient}
          onBack={handleGoBack}
        />
      );
    }

    if (userRole === 'admin') {
      return <AdminScreen currentTab={activeTab} />;
    }

    if (userRole === 'hr') {
      return <HRScreen />;
    }

    if (userRole === 'doctor') {
      const resolvedDocName = resolveDoctorName(branchPhone, userName);
      const isEmployee = resolvedDocName.toLowerCase().includes('padma');
      return (
        <DoctorScreen
          doctorCategory={isEmployee ? 'Employee Doctor' : 'Head Doctor'}
          doctorName={resolvedDocName}
          onLogout={handleSignOut}
          onNavigateTab={navigateToTab}
        />
      );
    }

    if (userRole === 'staff') {
      return <StaffScreen />;
    }

    switch (activeTab) {
      // Reception Modules
      case 'reception':
      case 'reception_dashboard':
        return <ReceptionDashboardScreen currentBranch={branchName} onNavigate={navigateToTab} />;
      case 'reception_patients':
        return <AllPatientsScreen />;
      case 'reception_followups':
        return <FollowUpsScreen onNavigate={navigateToTab} currentBranch={branchName} />;
      case 'reception_billing':
        return <ProductBillingScreen />;
      case 'reception_noshow':
        return <DoctorNoShowScreen />;
      case 'reception_media':
        return <MediaManagerScreen />;
      case 'reception_cleaning':
        return <CleaningPhotosScreen />;

      default:
        return <ReceptionDashboardScreen currentBranch={branchName} onNavigate={navigateToTab} />;
    }
  };

  // Admin Bottom Nav Items: Dashboard, Requests, Leaves, Book Appt, Logout
  const adminBottomNavItems = [
    { id: 'admin', label: 'Dashboard', iconType: 'ionicons', iconName: 'grid-outline' },
    { id: 'reception_medicines', label: 'Requests', iconType: 'mci', iconName: 'pill' },
    { id: 'hr', label: 'Leaves', iconType: 'ionicons', iconName: 'calendar-outline' },
    { id: 'reception_book', label: 'Book Appt', iconType: 'ionicons', iconName: 'add-circle-outline' },
    { id: 'logout', label: 'Logout', iconType: 'ionicons', iconName: 'log-out-outline' },
  ];

  // Reception Bottom Nav Items: Dashboard, Book Appt, Patient List, Med Req, Logout
  const receptionBottomNavItems = [
    { id: 'reception_dashboard', label: 'Dashboard', iconType: 'ionicons', iconName: 'grid-outline' },
    { id: 'reception_book', label: 'Book Appt', iconType: 'ionicons', iconName: 'calendar-outline' },
    { id: 'reception_patients', label: 'Patient List', iconType: 'ionicons', iconName: 'people-outline' },
    { id: 'reception_medicines', label: 'Med Req', iconType: 'mci', iconName: 'pill' },
    { id: 'logout', label: 'Logout', iconType: 'ionicons', iconName: 'log-out-outline' },
  ];

  const bottomNavItems = userRole === 'admin' ? adminBottomNavItems : receptionBottomNavItems;

  const handleBottomTabPress = (id: string) => {
    if (id === 'logout') {
      handleSignOut();
    } else {
      navigateToTab(id);
    }
  };

  if (isLoadingSession) {
    return (
      <View style={{ flex: 1, backgroundColor: '#f8fafc', alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ fontSize: 13, color: '#64748b', fontWeight: '600' }}>Restoring Session...</Text>
      </View>
    );
  }

  const getSubPageTitle = (tab: string) => {
    switch (tab) {
      case 'branches':
      case 'admin_branches':
        return 'Manage Branches & Targets';
      case 'doctors':
      case 'admin_doctors':
        return 'Doctor Timings & Schedules';
      case 'staff':
      case 'admin_staff':
        return 'Staff & Employee Directory';
      case 'package_members':
      case 'admin_packages':
        return 'Package Members';
      case 'banners':
      case 'admin_banners':
        return 'Promotional App Banners';
      case 'patients':
      case 'admin_patients':
        return 'Global Patients Summary';
      case 'medicine':
      case 'admin_medicines':
        return 'Edit Medicine Inventory';
      case 'reception_medicines':
        return 'Medicine & Patient Requests';
      case 'hr':
      case 'hr_attendance':
      case 'hr_payroll':
      case 'hr_roster':
        return 'Staff Leaves & HR Portal';
      case 'reception_book':
        return 'Book Appointment';
      case 'reception_patients':
        return 'All Patients Directory';
      case 'reception_followups':
        return 'Follow-Ups';
      case 'reception_billing':
        return 'Product Billing';
      case 'reception_noshow':
        return 'Doctor No Show';
      case 'reception_media':
        return 'Media Manager';
      case 'reception_cleaning':
        return 'Cleaning Photos';
      default:
        return 'Spiritual Homeo';
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />

      {/* Top Main Dashboard Header Bar */}
      {!isAuthScreen && userRole !== 'doctor' && (activeTab === 'reception_dashboard' || activeTab === 'reception' || activeTab === 'admin' || activeTab === 'analytics') && (
        <View style={styles.topHeader}>
          {/* Left Side: Hamburger Menu + Avatar Circle + Branch/User Info */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <TouchableOpacity style={styles.menuDrawerBtn} onPress={() => setDrawerOpen(true)}>
              <Ionicons name="menu-outline" size={24} color="#0f172a" />
            </TouchableOpacity>

            <View style={styles.avatarCircle}>
              <Ionicons name="person" size={20} color="#258ec8" />
            </View>

            {userRole === 'admin' ? (
              <View>
                <Text style={styles.branchTitle}>Spiritual Homeo</Text>
                <View style={styles.tagRow}>
                  <View style={styles.roleBadge}>
                    <Text style={styles.roleBadgeText}>ADMIN</Text>
                  </View>
                </View>
              </View>
            ) : (userRole as string) === 'doctor' ? (
              <View>
                <Text style={styles.branchTitle}>{resolveDoctorName(branchPhone, userName)}</Text>
                <Text style={styles.phoneSub}>{branchPhone}</Text>
                <View style={styles.tagRow}>
                  <View style={styles.roleBadge}>
                    <Text style={styles.roleBadgeText}>DOCTOR</Text>
                  </View>
                  <View style={styles.locBadge}>
                    <Ionicons name="location-outline" size={10} color="#64748b" style={{ marginRight: 2 }} />
                    <Text style={styles.locBadgeText}>{branchName || 'Medical Center'}</Text>
                  </View>
                </View>
              </View>
            ) : (
              <View>
                <Text style={styles.branchTitle}>{userName || branchName}</Text>
                <Text style={styles.phoneSub}>{branchPhone}</Text>
                <View style={styles.tagRow}>
                  <View style={styles.roleBadge}>
                    <Text style={styles.roleBadgeText}>{(userRole || 'reception').toUpperCase()}</Text>
                  </View>
                  <View style={styles.locBadge}>
                    <Ionicons name="location-outline" size={10} color="#64748b" style={{ marginRight: 2 }} />
                    <Text style={styles.locBadgeText}>{branchName}</Text>
                  </View>
                </View>
              </View>
            )}
          </View>

          {/* Right Side: Notification Bell + Red Logout Button */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <TouchableOpacity style={styles.bellBtn}>
              <Ionicons name="notifications-outline" size={18} color="#1e293b" />
              <View style={styles.redDot} />
            </TouchableOpacity>

            <TouchableOpacity style={styles.signOutBtnCircle} onPress={handleSignOut}>
              <Ionicons name="log-out-outline" size={18} color="#ef4444" />
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Sub-Page Professional Navigation Header with Back Arrow < and Page Title */}
      {!isAuthScreen && userRole !== 'doctor' && (activeTab !== 'reception_dashboard' && activeTab !== 'reception' && activeTab !== 'admin' && activeTab !== 'analytics') && (
        <View style={styles.subPageHeader}>
          <TouchableOpacity style={styles.headerBackBtn} onPress={handleGoBack}>
            <Ionicons name="arrow-back" size={22} color="#0f172a" />
          </TouchableOpacity>

          <View style={{ flex: 1, marginLeft: 10 }}>
            <Text style={styles.subPageTitle} numberOfLines={1}>
              {getSubPageTitle(activeTab)}
            </Text>
          </View>

          <TouchableOpacity style={styles.menuDrawerBtn} onPress={() => setDrawerOpen(true)}>
            <Ionicons name="menu-outline" size={24} color="#64748b" />
          </TouchableOpacity>
        </View>
      )}

      {/* Mobile Reception Side Drawer */}
      <ReceptionSideDrawer
        visible={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        activeTab={activeTab}
        setActiveTab={navigateToTab}
        userRole={userRole}
        branchName={branchName}
        onSignOut={handleSignOut}
      />

      {/* Main Screen Content */}
      <View style={{ flex: 1 }}>
        {renderScreen()}
      </View>

      {/* Edge-to-Edge Full Width Bottom Navigation Bar */}
      {!isAuthScreen && userRole !== 'doctor' && (
        <View style={styles.fullBottomNavContainer}>
          {bottomNavItems.map((item) => {
            const isActive = activeTab === item.id ||
              (item.id === 'reception_dashboard' && activeTab === 'reception') ||
              (item.id === 'admin' && (activeTab === 'admin' || activeTab === 'analytics' || activeTab === 'branches' || activeTab === 'doctors' || activeTab === 'staff'));
            const isLogout = item.id === 'logout';
            const iconColor = isLogout ? '#ef4444' : isActive ? '#258ec8' : '#64748b';

            return (
              <TouchableOpacity
                key={item.id}
                style={styles.bottomTab}
                onPress={() => handleBottomTabPress(item.id)}
              >
                {item.iconType === 'ionicons' && (
                  <Ionicons name={item.iconName as any} size={22} color={iconColor} />
                )}
                {item.iconType === 'feather' && (
                  <Feather name={item.iconName as any} size={20} color={iconColor} />
                )}
                {item.iconType === 'mci' && (
                  <MaterialCommunityIcons name={item.iconName as any} size={22} color={iconColor} />
                )}

                <Text style={[
                  styles.bottomTabLabel,
                  isActive && styles.bottomTabLabelActive,
                  isLogout && { color: '#ef4444' }
                ]}>
                  {item.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
    paddingTop: Platform.OS === 'android' ? 36 : 0,
  },
  topHeader: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 2,
  },
  subPageHeader: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    elevation: 1,
  },
  subPageTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
  },
  headerBackBtn: {
    padding: 6,
    marginRight: 2,
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
  },
  menuDrawerBtn: {
    padding: 4,
  },
  avatarCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#eef5fc',
    alignItems: 'center',
    justifyContent: 'center',
  },
  branchTitle: {
    fontSize: 15.5,
    fontWeight: '800',
    color: '#0f172a',
    lineHeight: 18,
  },
  phoneSub: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '500',
  },
  tagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  roleBadge: {
    backgroundColor: '#e0f2fe',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  roleBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#0284c7',
  },
  locBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  locBadgeText: {
    fontSize: 9.5,
    color: '#64748b',
    fontWeight: '600',
  },
  bellBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  redDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ef4444',
    position: 'absolute',
    top: 6,
    right: 7,
  },
  signOutBtnCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#fef2f2',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  fullBottomNavContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    paddingVertical: 10,
    paddingHorizontal: 8,
    justifyContent: 'space-around',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 8,
  },
  bottomTab: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  bottomTabLabel: {
    fontSize: 9.5,
    color: '#64748b',
    fontWeight: '600',
    marginTop: 3,
  },
  bottomTabLabelActive: {
    color: '#258ec8',
    fontWeight: '800',
  },
});
