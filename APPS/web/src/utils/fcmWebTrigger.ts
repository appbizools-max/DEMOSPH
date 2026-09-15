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
