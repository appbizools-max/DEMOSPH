import { db } from '@app/shared';
import { collection, addDoc, getDocs, query, where, doc, deleteDoc } from 'firebase/firestore';

/**
 * Normalizes branch name to a clean alphanumeric topic string
 */
export function normalizeBranchTopic(branch: string): string {
  if (!branch) return '';
  return String(branch)
    .toLowerCase()
    .replace(/branch/gi, '')
    .replace(/[^a-z0-9]/g, '')
    .trim();
}

/**
 * 10-Day Rolling Cleanup Policy (Web-side)
 * Queries and deletes any notifications in Firestore older than 10 days
 */
export async function cleanupOldNotifications(): Promise<void> {
  if (!db) return;
  try {
    const tenDaysAgoISO = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString();
    const q = query(collection(db, 'notifications'), where('createdAt', '<', tenDaysAgoISO));
    const snapshot = await getDocs(q);

    if (!snapshot.empty) {
      const deletePromises = snapshot.docs.map((docSnap) => deleteDoc(doc(db, 'notifications', docSnap.id)));
      await Promise.all(deletePromises);
      console.log(`[FCM-Web] Cleaned up ${snapshot.size} expired notification(s) older than 10 days.`);
    }
  } catch (err) {
    console.warn('[FCM-Web] 10-day notification cleanup notice:', err);
  }
}

/**
 * Creates an appointment booking notification document in Firestore 'notifications'
 * which triggers the Cloud Function to send FCM push notifications to Mobile devices.
 */
export async function createBookingNotificationInFirestore(payload: {
  patientName: string;
  appointmentTime: string;
  appointmentDate: string;
  branch: string;
  doctorName?: string;
  consultationMode?: string;
}): Promise<void> {
  if (!db) return;
  try {
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

    await addDoc(collection(db, 'notifications'), notiDoc);

    // Non-blocking 10-day rolling cleanup
    cleanupOldNotifications().catch(() => {});
  } catch (e) {
    console.warn('[FCM-Web] Error saving notification to Firestore:', e);
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
  if (!db) return;
  try {
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

    await addDoc(collection(db, 'notifications'), notiDoc);
    cleanupOldNotifications().catch(() => {});
  } catch (e) {
    console.warn('[FCM-Web] Error saving payment notification to Firestore:', e);
  }
}

/**
 * Notifies HR when a staff member logs in
 */
export async function createStaffLoginNotificationInFirestore(payload: {
  staffName: string;
  branch: string;
  staffId?: string;
}): Promise<void> {
  if (!db) return;
  try {
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
    await addDoc(collection(db, 'notifications'), notiDoc);
    cleanupOldNotifications().catch(() => {});
  } catch (e) {
    console.warn('[FCM-Web] Error saving staff login notification:', e);
  }
}

/**
 * Notifies HR when a staff member logs out
 */
export async function createStaffLogoutNotificationInFirestore(payload: {
  staffName: string;
  branch: string;
  staffId?: string;
}): Promise<void> {
  if (!db) return;
  try {
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
    await addDoc(collection(db, 'notifications'), notiDoc);
    cleanupOldNotifications().catch(() => {});
  } catch (e) {
    console.warn('[FCM-Web] Error saving staff logout notification:', e);
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
  if (!db) return;
  try {
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
    await addDoc(collection(db, 'notifications'), notiDoc);
    cleanupOldNotifications().catch(() => {});
  } catch (e) {
    console.warn('[FCM-Web] Error saving staff report notification:', e);
  }
}

