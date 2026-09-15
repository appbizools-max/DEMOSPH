import { getSafeDb, collection, addDoc, getDocs, query, where, doc, setDoc, deleteDoc } from './firebaseSafe';
import { Platform, PermissionsAndroid } from 'react-native';

// Safe dynamic/lazy loader for expo-notifications
let _notificationsModule: any = null;
let _handlerConfigured = false;

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
              shouldShowAlert: false,
              shouldShowBanner: true,
              shouldShowList: true,
              shouldPlaySound: true,
              shouldSetBadge: true,
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
 * Initializes the Android Notification Channel with high importance, vibration, sound, and icon
 */
export async function setupNotificationChannel(): Promise<void> {
  if (Platform.OS === 'android') {
    try {
      const Notifications = getNotifications();
      if (!Notifications || typeof Notifications.setNotificationChannelAsync !== 'function') return;
      await Notifications.setNotificationChannelAsync('sph_appointments_channel', {
        name: 'Appointment Bookings',
        importance: Notifications.AndroidImportance?.MAX ?? 5,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#0284c7',
        sound: 'default',
        enableVibrate: true,
        showBadge: true,
      });
    } catch (e) {
      console.warn('Notification channel setup notice:', e);
    }
  }
}

/**
 * Prompts user for BOTH Notification and Location permissions on startup via Android native dialogs
 */
export async function requestAppPermissions(): Promise<{ notifications: boolean; location: boolean }> {
  let notiGranted = false;
  let locGranted = false;
  try {
    if (Platform.OS === 'android') {
      const permsToRequest: string[] = [];
      const apiLevel = typeof Platform.Version === 'number' ? Platform.Version : parseInt(String(Platform.Version), 10);

      if (apiLevel >= 33 && PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS) {
        permsToRequest.push(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS);
      } else {
        notiGranted = true;
      }

      if (PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION) {
        permsToRequest.push(PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION);
      }
      if (PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION) {
        permsToRequest.push(PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION);
      }

      const validPerms = permsToRequest.filter(p => typeof p === 'string' && p.length > 0);

      if (validPerms.length > 0) {
        const results = await PermissionsAndroid.requestMultiple(validPerms as any);
        if (apiLevel >= 33 && PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS) {
          notiGranted = results[PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS] === PermissionsAndroid.RESULTS.GRANTED;
        }
        locGranted =
          results[PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION] === PermissionsAndroid.RESULTS.GRANTED ||
          results[PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION] === PermissionsAndroid.RESULTS.GRANTED;
      }
    }
    try {
      const Notifications = getNotifications();
      if (Notifications && typeof Notifications.requestPermissionsAsync === 'function') {
        const expoPerm: any = await Notifications.requestPermissionsAsync({
          android: {},
          ios: { allowAlert: true, allowBadge: true, allowSound: true },
        });
        if (expoPerm?.granted || expoPerm?.status === 'granted') {
          notiGranted = true;
        }
      }
    } catch (e) { }
  } catch (err) {
    console.warn('[Permissions] Request error safely handled:', err);
  }
  try {
    await setupNotificationChannel();
  } catch (e) { }
  return { notifications: notiGranted, location: locGranted };
}

/**
 * Triggers a real Android system push notification in the status bar & swipe-down drawer
 */
export async function triggerSystemPushNotification(title: string, body: string, data?: Record<string, any>): Promise<void> {
  try {
    const Notifications = getNotifications();
    if (!Notifications || typeof Notifications.scheduleNotificationAsync !== 'function') return;
    await setupNotificationChannel();
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
