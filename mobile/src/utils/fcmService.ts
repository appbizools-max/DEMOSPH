import { getSafeDb, collection, addDoc, getDocs, query, where, doc, setDoc, deleteDoc } from './firebaseSafe';
import { Platform, PermissionsAndroid, Vibration, Linking } from 'react-native';

// Safe dynamic/lazy loader for expo-notifications
let _notificationsModule: any = null;
let _handlerConfigured = false;

if (Platform.OS !== 'web') {
  try {
    // @ts-ignore
    _notificationsModule = require('expo-notifications');
    if (_notificationsModule && typeof _notificationsModule.setNotificationHandler === 'function') {
      _notificationsModule.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowAlert: true,
          shouldShowBanner: true,
          shouldShowList: true,
          shouldPlaySound: true,
          shouldSetBadge: true,
          priority: _notificationsModule.AndroidNotificationPriority?.MAX ?? 'max',
        }),
      });
      _handlerConfigured = true;
    }
  } catch (e) {
    console.warn('[FCM] Immediate notifications init notice:', e);
  }
}

export function getNotifications(): any {
  if (Platform.OS === 'web') return null;
  if (!_notificationsModule) {
    try {
      let expoNoti: any = null;
      try {
        // @ts-ignore
        expoNoti = require('expo-notifications');
      } catch (e1) {
        console.warn('[FCM] expo-notifications require notice:', e1);
      }
      _notificationsModule = expoNoti ? (expoNoti.default || expoNoti) : null;
      if (_notificationsModule && !_handlerConfigured && typeof _notificationsModule.setNotificationHandler === 'function') {
        try {
          _notificationsModule.setNotificationHandler({
            handleNotification: async () => ({
              shouldShowAlert: true,
              shouldShowBanner: true,
              shouldShowList: true,
              shouldPlaySound: true,
              shouldSetBadge: true,
              priority: _notificationsModule.AndroidNotificationPriority?.MAX ?? 'max',
            }),
          });
          _handlerConfigured = true;
        } catch (e2) { }
      }
    } catch (err) {
      console.warn('[FCM] expo-notifications lazy load notice:', err);
      _notificationsModule = null;
    }
  }
  return _notificationsModule;
}

/**
 * Initializes the Android Notification Channels with maximum importance, vibration, sound, and public lockscreen visibility
 * Registers both 'sph_appointments_channel' and 'default' to ensure delivery across all Android versions
 */
export async function setupNotificationChannel(): Promise<void> {
  if (Platform.OS === 'android') {
    try {
      const Notifications = getNotifications();
      if (!Notifications || typeof Notifications.setNotificationChannelAsync !== 'function') return;

      const maxImportance = Notifications.AndroidImportance?.MAX ?? 5;
      const publicVisibility = Notifications.AndroidNotificationVisibility?.PUBLIC ?? 1;

      // Primary Channel
      await Notifications.setNotificationChannelAsync('sph_appointments_channel', {
        name: 'Appointment Bookings & Alerts',
        description: 'Instant alerts for appointments, follow-ups, and clinic updates',
        importance: maxImportance,
        vibrationPattern: [0, 300, 200, 300],
        lightColor: '#0284c7',
        sound: 'default',
        enableVibrate: true,
        showBadge: true,
        lockscreenVisibility: publicVisibility,
        bypassDnd: false,
      });

      // Fallback Default Channel for older Android / OEM devices
      await Notifications.setNotificationChannelAsync('default', {
        name: 'General Clinic Notifications',
        description: 'Clinic alerts and notifications',
        importance: maxImportance,
        vibrationPattern: [0, 300, 200, 300],
        lightColor: '#0284c7',
        sound: 'default',
        enableVibrate: true,
        showBadge: true,
        lockscreenVisibility: publicVisibility,
        bypassDnd: false,
      });
    } catch (e) {
      console.warn('Notification channel setup notice:', e);
    }
  }
}

/**
 * Checks whether notifications are currently granted on the device
 */
export async function checkNotificationPermissionStatus(): Promise<boolean> {
  try {
    const Notifications = getNotifications();
    if (Notifications && typeof Notifications.getPermissionsAsync === 'function') {
      const status = await Notifications.getPermissionsAsync();
      if (status.granted || status.status === 'granted') return true;
    }
    if (Platform.OS === 'android') {
      const apiLevel = typeof Platform.Version === 'number' ? Platform.Version : parseInt(String(Platform.Version), 10);
      if (apiLevel >= 33 && PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS) {
        const has = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS);
        return has;
      }
      return true;
    }
  } catch (err) {
    console.warn('[Permissions] Check error safely handled:', err);
  }
  return true;
}

/**
 * Opens device app notification settings directly
 */
export async function openNotificationSettings(): Promise<void> {
  try {
    await Linking.openSettings();
  } catch (e) {
    console.warn('Cannot open settings:', e);
  }
}

/**
 * Prompts user for BOTH Notification and Location permissions on startup via native dialogs
 * Works reliably across Android 8 through Android 14+
 */
export async function requestAppPermissions(): Promise<{ notifications: boolean; location: boolean }> {
  let notiGranted = false;
  let locGranted = false;
  try {
    const Notifications = getNotifications();

    // 1. Check & Request Notification Permission via Expo (handles Android 13+ POST_NOTIFICATIONS natively)
    if (Notifications && typeof Notifications.getPermissionsAsync === 'function') {
      const current = await Notifications.getPermissionsAsync();
      if (current.granted || current.status === 'granted') {
        notiGranted = true;
      } else if (typeof Notifications.requestPermissionsAsync === 'function') {
        const req = await Notifications.requestPermissionsAsync({
          android: {},
          ios: { allowAlert: true, allowBadge: true, allowSound: true },
        });
        notiGranted = req.granted || req.status === 'granted';
      }
    }

    // Fallback direct request for Android 13+ if Expo did not grant
    if (Platform.OS === 'android' && !notiGranted) {
      const apiLevel = typeof Platform.Version === 'number' ? Platform.Version : parseInt(String(Platform.Version), 10);
      if (apiLevel >= 33 && PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS) {
        try {
          const granted = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS, {
            title: 'Enable Appointment Notifications',
            message: 'Allow Spiritual Homeo to alert you when appointments and follow-ups are booked.',
            buttonPositive: 'Allow',
            buttonNegative: 'Not Now',
          });
          notiGranted = granted === PermissionsAndroid.RESULTS.GRANTED;
        } catch (e) { }
      } else {
        notiGranted = true;
      }
    }

    // 2. Request Location permissions smoothly
    if (Platform.OS === 'android') {
      try {
        const locPerms: string[] = [];
        if (PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION) locPerms.push(PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION);
        if (PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION) locPerms.push(PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION);
        if (locPerms.length > 0) {
          const res = await PermissionsAndroid.requestMultiple(locPerms as any);
          locGranted =
            res[PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION] === PermissionsAndroid.RESULTS.GRANTED ||
            res[PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION] === PermissionsAndroid.RESULTS.GRANTED;
        }
      } catch (e) { }
    }
  } catch (err) {
    console.warn('[Permissions] Request error safely handled:', err);
  }

  // Ensure notification channels are set up immediately
  try {
    await setupNotificationChannel();
  } catch (e) { }

  return { notifications: notiGranted, location: locGranted };
}

/**
 * Triggers a real Android system push notification in the status bar & heads-up banner
 * Also vibrates the physical device for tactile feedback on all Android models
 */
export async function triggerSystemPushNotification(title: string, body: string, data?: Record<string, any>): Promise<void> {
  try {
    const Notifications = getNotifications();
    if (!Notifications || typeof Notifications.scheduleNotificationAsync !== 'function') return;

    // Ensure channels exist
    await setupNotificationChannel();

    // Physical vibration trigger for all devices
    try {
      Vibration.vibrate([0, 350, 150, 350]);
    } catch (e) { }

    await Notifications.scheduleNotificationAsync({
      content: {
        title: title || 'Appointment Booked',
        body: body || '',
        sound: 'default',
        priority: Notifications.AndroidNotificationPriority?.MAX ?? 'max',
        color: '#0284c7',
        data: data || {},
        // @ts-ignore
        channelId: 'sph_appointments_channel',
      },
      trigger: null,
    });
  } catch (err) {
    console.warn('Trigger system push notification notice:', err);
  }
}

let messagingInstance: any = null;
let messagingAttempted = false;

function getMessaging(): any {
  return null;
}
export function normalizeBranchTopic(branch: string): string {
  if (!branch) return '';
  return String(branch)
    .toLowerCase()
    .replace(/branch/gi, '')
    .replace(/[^a-z0-9]/g, '')
    .trim();
}
export async function cleanupOldNotifications(): Promise<void> {
  try {
    const activeDb = getSafeDb();
    if (!activeDb) return;
    const tenDaysAgoISO = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString();
    const q = query(collection(activeDb, 'notifications'), where('createdAt', '<', tenDaysAgoISO));
    const snapshot = await getDocs(q);

    if (!snapshot.empty) {
      const deletePromises = snapshot.docs.map((docSnap) => deleteDoc(doc(activeDb, 'notifications', docSnap.id)));
      await Promise.all(deletePromises);
    }
  } catch (err) {
    console.warn('[FCM] 10-day notification cleanup notice:', err);
  }
}

export async function createBookingNotificationInFirestore(payload: {
  patientName: string;
  appointmentTime: string;
  appointmentDate: string;
  branch: string;
  doctorName?: string;
  consultationMode?: string;
}): Promise<void> {
  try {
    const activeDb = getSafeDb();
    if (!activeDb) return;
    const cleanBranch = normalizeBranchTopic(payload.branch);
    const timeDisplay = payload.appointmentTime || '';
    const dateDisplay = payload.appointmentDate || '';
    const patientDisplay = payload.patientName || 'Patient';
    const branchDisplay = payload.branch || 'Branch';
    const notiDoc = {
      type: 'booking',
      title: 'Appointment Booked',
      body: `Appointment has been booked for ${patientDisplay} at ${timeDisplay} (${branchDisplay})`,
      patientName: patientDisplay,
      appointmentTime: timeDisplay,
      appointmentDate: dateDisplay,
      branch: branchDisplay,
      targetBranch: cleanBranch,
      doctorName: payload.doctorName || '',
      consultationMode: payload.consultationMode || 'In-Clinic',
      targetRoles: ['reception', 'hr', 'admin'],
      createdAt: new Date().toISOString(),
      status: 'pending',
    };
    await addDoc(collection(activeDb, 'notifications'), notiDoc);
    cleanupOldNotifications().catch(() => { });
  } catch (e) {
    console.warn('[FCM] Error saving notification to Firestore:', e);
  }
}

/**
 * Creates a payment completion notification in Firestore 'notifications'
 * Notifies HR / Admin across all branches, and notifies the specific Branch Reception
 */
export async function createPaymentNotificationInFirestore(payload: {
  patientName: string;
  amount: number | string;
  branch: string;
  paymentMode?: string;
  doctorName?: string;
  invoiceId?: string;
}): Promise<void> {
  try {
    const activeDb = getSafeDb();
    if (!activeDb) return;
    const cleanBranch = normalizeBranchTopic(payload.branch);
    const patientDisplay = payload.patientName || 'Patient';
    const branchDisplay = payload.branch || 'Branch';
    const numAmount = Number(payload.amount || 0);
    const amountDisplay = numAmount.toLocaleString('en-IN');
    const modeDisplay = payload.paymentMode || 'Cash';

    const notiDoc = {
      type: 'payment',
      title: 'Payment Received',
      body: `Payment of ₹${amountDisplay} received from ${patientDisplay} at ${branchDisplay} (${modeDisplay})`,
      patientName: patientDisplay,
      amount: numAmount,
      paymentMode: modeDisplay,
      branch: branchDisplay,
      targetBranch: cleanBranch,
      doctorName: payload.doctorName || '',
      invoiceId: payload.invoiceId || '',
      targetRoles: ['reception', 'hr', 'admin'],
      createdAt: new Date().toISOString(),
      status: 'completed',
    };
    await addDoc(collection(activeDb, 'notifications'), notiDoc);
    cleanupOldNotifications().catch(() => { });
  } catch (e) {
    console.warn('[FCM] Error saving payment notification to Firestore:', e);
  }
}

/**
 * Notifies HR when a staff member logs into their mobile app
 */
export async function createStaffLoginNotificationInFirestore(payload: {
  staffName: string;
  branch: string;
  staffId?: string;
}): Promise<void> {
  try {
    const activeDb = getSafeDb();
    if (!activeDb) return;
    const cleanBranch = normalizeBranchTopic(payload.branch);
    const staffDisplay = payload.staffName || 'Staff Member';
    const branchDisplay = payload.branch || 'Clinic Branch';
    const timeDisplay = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });

    const notiDoc = {
      type: 'staff_login',
      title: 'Staff Logged In',
      body: `${staffDisplay} logged in at ${branchDisplay} (${timeDisplay})`,
      staffName: staffDisplay,
      staffId: payload.staffId || '',
      branch: branchDisplay,
      targetBranch: cleanBranch,
      loginTime: timeDisplay,
      targetRoles: ['hr', 'admin'],
      createdAt: new Date().toISOString(),
      status: 'active',
    };
    await addDoc(collection(activeDb, 'notifications'), notiDoc);
    cleanupOldNotifications().catch(() => { });
  } catch (e) {
    console.warn('[FCM] Error saving staff login notification:', e);
  }
}

/**
 * Notifies HR when a staff member logs out of their mobile app
 */
export async function createStaffLogoutNotificationInFirestore(payload: {
  staffName: string;
  branch: string;
  staffId?: string;
}): Promise<void> {
  try {
    const activeDb = getSafeDb();
    if (!activeDb) return;
    const cleanBranch = normalizeBranchTopic(payload.branch);
    const staffDisplay = payload.staffName || 'Staff Member';
    const branchDisplay = payload.branch || 'Clinic Branch';
    const timeDisplay = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });

    const notiDoc = {
      type: 'staff_logout',
      title: 'Staff Logged Out',
      body: `${staffDisplay} logged out from ${branchDisplay} (${timeDisplay})`,
      staffName: staffDisplay,
      staffId: payload.staffId || '',
      branch: branchDisplay,
      targetBranch: cleanBranch,
      logoutTime: timeDisplay,
      targetRoles: ['hr', 'admin'],
      createdAt: new Date().toISOString(),
      status: 'completed',
    };
    await addDoc(collection(activeDb, 'notifications'), notiDoc);
    cleanupOldNotifications().catch(() => { });
  } catch (e) {
    console.warn('[FCM] Error saving staff logout notification:', e);
  }
}

/**
 * Notifies Staff and HR when a daily work report is submitted
 */
export async function createStaffDailyReportNotificationInFirestore(payload: {
  staffName: string;
  branch: string;
  staffId?: string;
  totalCalls?: number | string;
  followUps?: number | string;
}): Promise<void> {
  try {
    const activeDb = getSafeDb();
    if (!activeDb) return;
    const cleanBranch = normalizeBranchTopic(payload.branch);
    const staffDisplay = payload.staffName || 'Staff Member';
    const branchDisplay = payload.branch || 'Clinic Branch';
    const timeDisplay = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });

    const callsInfo = payload.totalCalls ? ` • ${payload.totalCalls} Calls` : '';
    const followUpsInfo = payload.followUps ? `, ${payload.followUps} Follow-ups` : '';

    const notiDoc = {
      type: 'staff_report',
      title: 'Daily Report Submitted',
      body: `${staffDisplay} submitted Daily Report for ${branchDisplay} (${timeDisplay}${callsInfo}${followUpsInfo})`,
      staffName: staffDisplay,
      staffId: payload.staffId || '',
      branch: branchDisplay,
      targetBranch: cleanBranch,
      totalCalls: payload.totalCalls || 0,
      followUps: payload.followUps || 0,
      targetRoles: ['hr', 'admin', 'staff'],
      createdAt: new Date().toISOString(),
      status: 'submitted',
    };
    await addDoc(collection(activeDb, 'notifications'), notiDoc);
    cleanupOldNotifications().catch(() => { });
  } catch (e) {
    console.warn('[FCM] Error saving staff report notification:', e);
  }
}

/**
 * Notifies HR and Admin when a Reception desk requests a medicine discount approval
 */
export async function createFeeDiscountRequestNotificationInFirestore(payload: {
  patientName: string;
  branch: string;
  requestedDiscount: number | string;
  originalTotalAmount: number | string;
  reason: string;
  appointmentId?: string;
  patientPhone?: string;
}): Promise<void> {
  try {
    const activeDb = getSafeDb();
    if (!activeDb) return;
    const cleanBranch = normalizeBranchTopic(payload.branch);
    const patientDisplay = payload.patientName || 'Patient';
    const branchDisplay = payload.branch || 'Clinic Branch';
    const discountNum = Number(payload.requestedDiscount || 0);
    const totalNum = Number(payload.originalTotalAmount || 0);

    const title = 'New Discount Approval Request';
    const body = `₹${discountNum.toLocaleString('en-IN')} discount requested for ${patientDisplay} (${branchDisplay}). Reason: "${payload.reason}"`;

    const notiDoc = {
      type: 'fee_discount_request',
      title,
      body,
      patientName: patientDisplay,
      patientPhone: payload.patientPhone || '',
      branch: branchDisplay,
      targetBranch: cleanBranch,
      requestedDiscount: discountNum,
      originalTotalAmount: totalNum,
      reason: payload.reason,
      appointmentId: payload.appointmentId || '',
      targetRoles: ['hr', 'admin'],
      targetTopic: 'topic_all_branches_hr',
      createdAt: new Date().toISOString(),
      status: 'pending',
    };
    await addDoc(collection(activeDb, 'notifications'), notiDoc);

    // Trigger local push notification + vibration on mobile device
    triggerSystemPushNotification(title, body, notiDoc).catch(() => {});
    cleanupOldNotifications().catch(() => {});
  } catch (e) {
    console.warn('[FCM] Error saving discount request notification:', e);
  }
}

/**
 * Notifies Reception and Admin when HR Approves or Rejects a discount request
 */
export async function createFeeDiscountResponseNotificationInFirestore(payload: {
  patientName: string;
  branch: string;
  status: 'Approved' | 'Rejected';
  discountAmount?: number | string;
  rejectReason?: string;
  reviewedBy?: string;
  appointmentId?: string;
}): Promise<void> {
  try {
    const activeDb = getSafeDb();
    if (!activeDb) return;
    const cleanBranch = normalizeBranchTopic(payload.branch);
    const patientDisplay = payload.patientName || 'Patient';
    const branchDisplay = payload.branch || 'Clinic Branch';
    const isApproved = payload.status === 'Approved';
    const discountNum = Number(payload.discountAmount || 0);

    const title = isApproved ? 'Discount Request Approved ✓' : 'Discount Request Rejected ❌';
    const body = isApproved
      ? `HR approved ₹${discountNum.toLocaleString('en-IN')} discount for ${patientDisplay} (${branchDisplay})`
      : `HR rejected discount request for ${patientDisplay} (${branchDisplay}). ${payload.rejectReason ? `Note: "${payload.rejectReason}"` : ''}`;

    const notiDoc = {
      type: 'fee_discount_response',
      title,
      body,
      patientName: patientDisplay,
      branch: branchDisplay,
      targetBranch: cleanBranch,
      discountAmount: discountNum,
      rejectReason: payload.rejectReason || '',
      reviewedBy: payload.reviewedBy || 'HR',
      status: payload.status.toLowerCase(),
      targetRoles: ['reception', 'admin'],
      targetTopic: `topic_branch_${cleanBranch}`,
      appointmentId: payload.appointmentId || '',
      createdAt: new Date().toISOString(),
    };
    await addDoc(collection(activeDb, 'notifications'), notiDoc);

    // Trigger local push notification + vibration on mobile device
    triggerSystemPushNotification(title, body, notiDoc).catch(() => {});
    cleanupOldNotifications().catch(() => {});
  } catch (e) {
    console.warn('[FCM] Error saving discount response notification:', e);
  }
}

export async function registerFCMForStaff(role: string, branch: string, staffName?: string): Promise<string | null> {
  try {
    const messaging = getMessaging();
    if (!messaging) return null;

    let authStatus: any = null;
    try {
      authStatus = await messaging().requestPermission();
    } catch (e) {
      return null;
    }

    const enabled =
      authStatus === messaging.AuthorizationStatus?.AUTHORIZED ||
      authStatus === messaging.AuthorizationStatus?.PROVISIONAL ||
      authStatus === 1 ||
      authStatus === 2;

    if (!enabled) return null;

    let token: string | null = null;
    try {
      token = await messaging().getToken();
    } catch (e) {
      return null;
    }

    if (!token) return null;

    const cleanBranch = normalizeBranchTopic(branch);

    if (role === 'admin' || role === 'hr') {
      await messaging().subscribeToTopic('topic_all_branches_hr').catch(() => { });
    } else if (role === 'reception' && cleanBranch) {
      await messaging().subscribeToTopic(`topic_branch_${cleanBranch}`).catch(() => { });
    }

    try {
      const activeDb = getSafeDb();
      if (activeDb && token) {
        const tokenDocRef = doc(activeDb, 'fcm_tokens', token.slice(-28));
        await setDoc(tokenDocRef, {
          token,
          role: role || 'reception',
          branch: branch || '',
          cleanBranch,
          staffName: staffName || '',
          platform: Platform.OS,
          updatedAt: new Date().toISOString(),
        }, { merge: true }).catch(() => { });
      }
    } catch (e) { }

    return token;
  } catch (err) {
    console.warn('[FCM] Staff FCM registration notice:', err);
    return null;
  }
}

export function setupFCMForegroundListeners(onNotificationReceived?: (notification: any) => void): () => void {
  try {
    const messaging = getMessaging();
    if (!messaging) return () => { };

    let unsubOnMessage: any = null;
    let unsubNotificationOpen: any = null;

    try {
      unsubOnMessage = messaging().onMessage(async (remoteMessage: any) => {
        const noti = remoteMessage.notification || {};
        if (noti.title || noti.body) {
          triggerSystemPushNotification(noti.title || 'Appointment Booked', noti.body || '', remoteMessage.data).catch(() => { });
        }
        if (onNotificationReceived) {
          onNotificationReceived(remoteMessage);
        }
      });
    } catch (e) { }

    try {
      unsubNotificationOpen = messaging().onNotificationOpenedApp((remoteMessage: any) => { });
    } catch (e) { }

    try {
      messaging().getInitialNotification().then(() => { }).catch(() => { });
    } catch (e) { }

    return () => {
      try { if (typeof unsubOnMessage === 'function') unsubOnMessage(); } catch (e) { }
      try { if (typeof unsubNotificationOpen === 'function') unsubNotificationOpen(); } catch (e) { }
    };
  } catch (err) {
    console.warn('[FCM] Foreground listener setup notice:', err);
    return () => { };
  }
}
