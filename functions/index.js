const { onDocumentCreated } = require('firebase-functions/v2/firestore');
const admin = require('firebase-admin');

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();
const messaging = admin.messaging();

/**
 * Normalizes branch name to a clean topic string (e.g. "KPHB Branch" -> "kphb")
 */
function normalizeBranchTopic(branch) {
  if (!branch) return '';
  return String(branch)
    .toLowerCase()
    .replace(/branch/gi, '')
    .replace(/[^a-z0-9]/g, '')
    .trim();
}

/**
 * 10-Day Rolling Cleanup Policy
 * Deletes any notification in Firestore where createdAt is older than 10 days.
 */
async function cleanupExpiredNotifications() {
  try {
    const tenDaysAgoISO = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString();
    const snapshot = await db
      .collection('notifications')
      .where('createdAt', '<', tenDaysAgoISO)
      .limit(100)
      .get();

    if (snapshot.empty) return;

    const batch = db.batch();
    snapshot.docs.forEach((docSnap) => {
      batch.delete(docSnap.ref);
    });

    await batch.commit();
    console.log(`Cleaned up ${snapshot.size} notifications older than 10 days.`);
  } catch (err) {
    console.warn('Notification 10-day cleanup notice:', err);
  }
}

/**
 * Cloud Function: onAppointmentNotificationCreated
 * Dispatches FCM Push Notifications to the target branch reception topic and the HR topic,
 * then purges notifications older than 10 days.
 */
exports.onAppointmentNotificationCreated = onDocumentCreated('notifications/{notificationId}', async (event) => {
  const snapshot = event.data;
  if (!snapshot) return;

  const data = snapshot.data();
  const notificationId = event.params.notificationId;

  const title = data.title || 'Appointment Booked';
  const body = data.body || 'A new appointment has been scheduled.';
  const rawBranch = data.branch || data.targetBranch || '';
  const cleanBranch = normalizeBranchTopic(rawBranch);

  const payload = {
    notification: {
      title,
      body,
    },
    android: {
      priority: 'high',
      notification: {
        sound: 'default',
        icon: 'noti_icon',
        channelId: 'sph_appointments_channel',
        priority: 'high',
        defaultVibrateTimings: true,
        defaultSound: true,
      },
    },
    data: {
      notificationId: String(notificationId),
      patientName: String(data.patientName || ''),
      appointmentTime: String(data.appointmentTime || ''),
      appointmentDate: String(data.appointmentDate || ''),
      branch: String(rawBranch),
      targetBranch: cleanBranch,
    },
  };

  const sendPromises = [];

  // 1. Send to HR / Admin topic (receives all bookings)
  sendPromises.push(
    messaging.send({
      ...payload,
      topic: 'topic_all_branches_hr',
    }).catch((err) => console.warn('FCM HR topic error:', err))
  );

  // 2. Send to specific branch topic (reception for this branch only)
  if (cleanBranch) {
    sendPromises.push(
      messaging.send({
        ...payload,
        topic: `topic_branch_${cleanBranch}`,
      }).catch((err) => console.warn(`FCM branch topic error (topic_branch_${cleanBranch}):`, err))
    );
  }

  // 3. Optional: Send directly to registered FCM device tokens in fcm_tokens collection
  try {
    const tokenDocs = await db.collection('fcm_tokens').get();
    const matchingTokens = [];

    tokenDocs.forEach((docSnap) => {
      const staff = docSnap.data();
      if (!staff || !staff.token) return;

      const isHR = staff.role === 'admin' || staff.role === 'hr';
      const isMatchingBranch = staff.role === 'reception' && cleanBranch && normalizeBranchTopic(staff.branch) === cleanBranch;

      if (isHR || isMatchingBranch) {
        matchingTokens.push(staff.token);
      }
    });

    if (matchingTokens.length > 0) {
      // Send multicast in batches of 500
      const uniqueTokens = Array.from(new Set(matchingTokens));
      sendPromises.push(
        messaging.sendEachForMulticast({
          ...payload,
          tokens: uniqueTokens,
        }).catch((err) => console.warn('FCM multicast token error:', err))
      );
    }
  } catch (tokenErr) {
    console.warn('FCM token lookup notice:', tokenErr);
  }

  await Promise.all(sendPromises);

  // 4. Run the 10-day rolling cleanup
  await cleanupExpiredNotifications();
});
