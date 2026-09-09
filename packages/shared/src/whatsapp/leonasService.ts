/**
 * LEONAS WhatsApp Solution API Service
 * Official Meta WABA Approved Templates Verified with WABA ID: 2841437129545530
 */

export const LEONAS_CONFIG = {
  WABA_PHONE_NUMBER_ID: '1303340612865892',
  WABA_ACCOUNT_ID: '2841437129545530',
  WABA_API_KEY: '2731e63f-a853-11f1-afb3-02c8a5e042bd',
  BASE_URL: 'https://partnersv1.pinbot.ai/v3/1303340612865892/messages',
};

/**
 * Determine API URL dynamically (routes through Vite proxy in Web browser to eliminate CORS errors)
 */
export const getLeonasApiUrl = (): string => {
  if (typeof window !== 'undefined' && window.location) {
    return '/api/leonas/v3/1303340612865892/messages';
  }
  return LEONAS_CONFIG.BASE_URL;
};
/**
 * Format any Indian phone number safely into strict 91XXXXXXXXXX
 */
export const formatPhoneForWhatsApp = (phone: string): string => {
  if (!phone) return '';
  let cleaned = String(phone).replace(/\D/g, '');
  // Strip leading zeros
  cleaned = cleaned.replace(/^0+/, '');
  if (cleaned.length === 10) {
    return '91' + cleaned;
  }
  if (cleaned.length === 12 && cleaned.startsWith('91')) {
    return cleaned;
  }
  if (cleaned.length > 10) {
    return '91' + cleaned.slice(-10);
  }
  return cleaned;
};

// Exactly 4 Official Clinic Branches and their Short-form URLs
export const BRANCH_VISIT_URLS = {
  chanda: 'https://stiny.in/SPHMEO/chanda',     // Chandanagar
  kphb: 'https://stiny.in/SPHMEO/kphb',         // KPHB
  dilshu: 'https://stiny.in/SPHMEO/dilshu',     // Dilsukhnagar
  nallag: 'https://stiny.in/SPHMEO/nallag',     // Nallagandla
} as const;

export const getBranchVisitUrl = (branch?: string): string => {
  const clean = (branch || '').toLowerCase().trim();
  if (clean.includes('chanda')) return BRANCH_VISIT_URLS.chanda;
  if (clean.includes('dilshu')) return BRANCH_VISIT_URLS.dilshu;
  if (clean.includes('nallag')) return BRANCH_VISIT_URLS.nallag;
  return BRANCH_VISIT_URLS.kphb;
};

export interface SendWhatsAppTextParams {
  to: string;
  body: string;
}

export interface SendWhatsAppTemplateParams {
  to: string;
  templateName: string;
  languageCode?: string;
  bodyParameters?: (string | number)[];
}

/**
 * Send WhatsApp Message using Official Meta Approved WABA Templates
 */
export const sendWhatsAppTemplateMessage = async ({
  to,
  templateName,
  languageCode = 'en',
  bodyParameters = [],
}: SendWhatsAppTemplateParams): Promise<{ success: boolean; data?: any; error?: string }> => {
  try {
    const recipient = formatPhoneForWhatsApp(to);
    if (!recipient || recipient.length < 10) {
      console.warn('Invalid phone number for WhatsApp template:', to);
      return { success: false, error: 'Invalid phone number' };
    }
    const payload = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: recipient,
      type: 'template',
      template: {
        name: templateName,
        language: {
          code: languageCode,
        },
        components: bodyParameters && bodyParameters.length > 0 ? [
          {
            type: 'body',
            parameters: bodyParameters.map((paramVal) => ({
              type: 'text',
              text: String(paramVal ?? ''),
            })),
          },
        ] : [],
      },
    };

    const apiUrl = getLeonasApiUrl();
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': LEONAS_CONFIG.WABA_API_KEY,
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();
    console.log(`Leonas WhatsApp Template [${templateName}] Response:`, data);

    if (response.ok && (!data.error && (!data.errors || data.errors.length === 0))) {
      return { success: true, data };
    } else {
      return { success: false, error: data?.error?.message || data?.message || 'Failed to send WhatsApp template message', data };
    }
  } catch (err: any) {
    console.error(`Error sending WhatsApp template [${templateName}] via Leonas API:`, err);
    return { success: false, error: err.message || 'Network error' };
  }
};

/**
 * Send WhatsApp Freeform Text Message (fallback)
 */
export const sendWhatsAppTextMessage = async ({ to, body }: SendWhatsAppTextParams): Promise<{ success: boolean; data?: any; error?: string }> => {
  try {
    const recipient = formatPhoneForWhatsApp(to);
    if (!recipient || recipient.length < 10) {
      console.warn('Invalid phone number for WhatsApp message:', to);
      return { success: false, error: 'Invalid phone number' };
    }

    const payload = {
      messaging_product: 'whatsapp',
      preview_url: false,
      recipient_type: 'individual',
      to: recipient,
      type: 'text',
      text: {
        body: body,
      },
    };

    const apiUrl = getLeonasApiUrl();
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': LEONAS_CONFIG.WABA_API_KEY,
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();
    console.log('Leonas WhatsApp Text API Response:', data);

    if (response.ok) {
      return { success: true, data };
    } else {
      return { success: false, error: data?.message || 'Failed to send WhatsApp message', data };
    }
  } catch (err: any) {
    console.error('Error sending WhatsApp message via Leonas API:', err);
    return { success: false, error: err.message || 'Network error' };
  }
};

/**
 * 1. Trigger WhatsApp Notification on Appointment Booking
 * Template: booked_apt (Utility - Approved)
 * Placeholders:
 *  {{1}}: Patient Name
 *  {{2}}: Doctor Name
 *  {{3}}: Date
 *  {{4}}: Time
 *  {{5}}: Branch
 *  {{6}}: Visit URL (Exact 4 Branch Short URL)
 */
export const sendBookingWhatsAppNotification = async (params: {
  patientName: string;
  phone: string;
  date: string;
  time: string;
  doctorName?: string;
  branch?: string;
}) => {
  const doctor = (params.doctorName || 'Dr. Prashanth K Vaidya').trim();
  const branch = params.branch || 'KPHB';
  const branchVisitUrl = getBranchVisitUrl(branch);

  const templateResult = await sendWhatsAppTemplateMessage({
    to: params.phone,
    templateName: 'booked_apt',
    languageCode: 'en',
    bodyParameters: [
      params.patientName || 'Patient',
      doctor,
      params.date,
      params.time,
      branch,
      branchVisitUrl
    ]
  });

  if (templateResult.success) {
    return templateResult;
  }

  // Fallback: location_apt (Utility - Approved)
  const locTemplateResult = await sendWhatsAppTemplateMessage({
    to: params.phone,
    templateName: 'location_apt',
    languageCode: 'en',
    bodyParameters: [
      params.patientName || 'Patient',
      doctor,
      params.date,
      params.time,
      branch,
      branchVisitUrl
    ]
  });

  if (locTemplateResult.success) {
    return locTemplateResult;
  }

  // Raw Text Fallback
  const message = `*SPIRITUAL HOMEOPATHY* 🌿\n\nDear *${params.patientName}*,\nYour appointment has been successfully booked!\n\n👨‍⚕️ *Doctor:* ${doctor}\n📅 *Date:* ${params.date}\n⏰ *Time:* ${params.time}\n📍 *Branch:* ${branch}\n🔗 *Clinic Visit URL:* ${branchVisitUrl}\n\nThank you for choosing Spiritual Homeopathy Clinic.\n📞 Helpdesk: 9069 176 176\n🌐 www.spiritualhomeoclinic.com`;

  return await sendWhatsAppTextMessage({ to: params.phone, body: message });
};

/**
 * 2. Trigger WhatsApp Notification on Appointment Reschedule
 * Template: appointment_rescheduled (Utility - Approved)
 * Placeholders:
 *  {{1}}: Patient Name
 *  {{2}}: Doctor Name (without duplicate Dr.)
 *  {{3}}: Date
 *  {{4}}: Time
 *  {{5}}: Branch
 */
export const sendRescheduleWhatsAppNotification = async (params: {
  patientName: string;
  phone: string;
  date: string;
  time: string;
  doctorName?: string;
  branch?: string;
}) => {
  let docName = (params.doctorName || 'Prashanth K Vaidya').trim();
  if (docName.toLowerCase().startsWith('dr.') || docName.toLowerCase().startsWith('dr ')) {
    docName = docName.replace(/^dr\.?\s*/i, '');
  }
  const branch = params.branch || 'KPHB';

  const templateResult = await sendWhatsAppTemplateMessage({
    to: params.phone,
    templateName: 'appointment_rescheduled',
    languageCode: 'en',
    bodyParameters: [
      params.patientName || 'Patient',
      docName,
      params.date,
      params.time,
      branch
    ]
  });

  if (templateResult.success) {
    return templateResult;
  }

  const branchVisitUrl = getBranchVisitUrl(branch);
  const message = `*SPIRITUAL HOMEOPATHY* 🌿\n\nDear *${params.patientName}*,\nYour appointment has been successfully *rescheduled*.\n\n👨‍⚕️ *Doctor:* Dr. ${docName}\n📅 *New Date:* ${params.date}\n⏰ *New Time:* ${params.time}\n📍 *Branch:* ${branch}\n🔗 *Clinic Visit URL:* ${branchVisitUrl}\n\nThank you for choosing Spiritual Homeopathy Clinic.\n📞 Helpdesk: 9069 176 176\n🌐 www.spiritualhomeoclinic.com`;

  return await sendWhatsAppTextMessage({ to: params.phone, body: message });
};

/**
 * 3. Trigger WhatsApp Notification on Payment Collection / Invoice Generation
 * Triggers:
 *  1. payement_receipt (Utility - Approved)
 *     {{1}}: Patient Name
 *     {{2}}: Total Paid (Amount)
 *     {{3}}: Receipt No
 *     {{4}}: Date
 *     {{5}}: Branch
 *  2. invoice_recpt (Utility - Approved)
 *     {{1}}: Patient Name
 *  3. Experience / Google Review Template (Utility - Approved)
 */
export const sendInvoiceWhatsAppNotification = async (params: {
  patientName: string;
  phone: string;
  invoiceId?: string;
  totalPaid: number;
  paymentMode?: string;
  branch?: string;
}) => {
  const invCode = params.invoiceId ? String(params.invoiceId).substring(0, 6).toUpperCase() : 'RECEIPT';
  const branch = params.branch || 'KPHB';
  const todayDate = new Date().toLocaleDateString('en-GB').replace(/\//g, '-');
  const amountStr = String(Number(params.totalPaid || 0));

  // 1. Send Payment Receipt Template (payement_receipt: 5 Placeholders)
  const payResult = await sendWhatsAppTemplateMessage({
    to: params.phone,
    templateName: 'payement_receipt',
    languageCode: 'en',
    bodyParameters: [
      params.patientName || 'Patient',
      amountStr,
      `INV-${invCode}`,
      todayDate,
      branch
    ]
  });

  // 2. Trigger Invoice Receipt Template (invoice_recpt: 1 Placeholder)
  const invRecptResult = await sendWhatsAppTemplateMessage({
    to: params.phone,
    templateName: 'invoice_recpt',
    languageCode: 'en',
    bodyParameters: [
      params.patientName || 'Patient'
    ]
  }).catch(e => {
    console.warn('invoice_recpt error:', e);
    return null;
  });

  // 3. Trigger Experience / Review Template (experience / googlee_review)
  sendExperienceWhatsAppNotification({
    patientName: params.patientName,
    phone: params.phone,
    branch
  }).catch(e => console.warn('experience template error:', e));

  if (payResult.success || invRecptResult?.success) {
    return payResult.success ? payResult : (invRecptResult || payResult);
  }

  // 4. Raw Text Fallback
  const message = `*SPIRITUAL HOMEOPATHY - PAYMENT RECEIPT* 🧾\n\nDear *${params.patientName}*,\nWe have received your payment of Rs.${amountStr}.\n\nReceipt No: INV-${invCode}\nDate: ${todayDate}\nBranch: ${branch}\n\nThank you for choosing Spiritual Homeopathy Clinics.\n📞 Helpdesk: 9069 176 176\n🌐 www.spiritualhomeoclinic.com`;

  return await sendWhatsAppTextMessage({ to: params.phone, body: message });
};

/**
 * Trigger WhatsApp Notification for Invoice Receipt
 * Template: invoice_recpt (1 Placeholder: Patient Name) - Category: Utility
 */
export const sendInvoiceReceiptWhatsAppNotification = async (params: {
  patientName: string;
  phone: string;
}) => {
  return await sendWhatsAppTemplateMessage({
    to: params.phone,
    templateName: 'invoice_recpt',
    languageCode: 'en',
    bodyParameters: [
      params.patientName || 'Patient'
    ]
  });
};

/**
 * Trigger WhatsApp Notification for Patient Experience / Feedback Review
 * Attempts:
 * 1. experience (Utility - if approved)
 * 2. googlee_review (Utility - Approved, 3 Placeholders: Patient, Branch, Link)
 */
export const sendExperienceWhatsAppNotification = async (params: {
  patientName: string;
  phone: string;
  branch?: string;
}) => {
  const branch = params.branch || 'KPHB';
  const branchUrl = getBranchVisitUrl(branch);

  // 1. Try experience template (if approved in future)
  const expRes = await sendWhatsAppTemplateMessage({
    to: params.phone,
    templateName: 'experience',
    languageCode: 'en',
    bodyParameters: []
  });
  if (expRes.success) return expRes;

  // 2. Try approved googlee_review template (3 Placeholders: Patient, Branch, Review URL)
  return await sendWhatsAppTemplateMessage({
    to: params.phone,
    templateName: 'googlee_review',
    languageCode: 'en',
    bodyParameters: [
      params.patientName || 'Patient',
      branch,
      branchUrl
    ]
  });
};

/**
 * 4. Trigger WhatsApp Notification on Appointment Cancellation
 * Template: appointment_cancelled (Utility - Approved)
 * Placeholders:
 *  {{1}}: Patient Name
 *  {{2}}: Doctor Name
 *  {{3}}: Date
 *  {{4}}: Time
 *  {{5}}: Branch
 */
export const sendCancellationWhatsAppNotification = async (params: {
  patientName: string;
  phone: string;
  date: string;
  time: string;
  doctorName?: string;
  branch?: string;
}) => {
  let docName = (params.doctorName || 'Prashanth K Vaidya').trim();
  if (docName.toLowerCase().startsWith('dr.') || docName.toLowerCase().startsWith('dr ')) {
    docName = docName.replace(/^dr\.?\s*/i, '');
  }
  const branch = params.branch || 'KPHB';

  return await sendWhatsAppTemplateMessage({
    to: params.phone,
    templateName: 'appointment_cancelled',
    languageCode: 'en',
    bodyParameters: [
      params.patientName || 'Patient',
      docName,
      params.date,
      params.time,
      branch
    ]
  });
};

/**
 * 5. Trigger WhatsApp Notification for Appointment Reminder
 * Template: appointment_reminder (Utility - Approved)
 * Placeholders:
 *  {{1}}: Patient Name
 *  {{2}}: Doctor Name
 *  {{3}}: Date
 *  {{4}}: Time
 *  {{5}}: Branch
 */
export const sendReminderWhatsAppNotification = async (params: {
  patientName: string;
  phone: string;
  date: string;
  time: string;
  doctorName?: string;
  branch?: string;
}) => {
  let docName = (params.doctorName || 'Prashanth K Vaidya').trim();
  if (docName.toLowerCase().startsWith('dr.') || docName.toLowerCase().startsWith('dr ')) {
    docName = docName.replace(/^dr\.?\s*/i, '');
  }
  const branch = params.branch || 'KPHB';

  return await sendWhatsAppTemplateMessage({
    to: params.phone,
    templateName: 'appointment_reminder',
    languageCode: 'en',
    bodyParameters: [
      params.patientName || 'Patient',
      docName,
      params.date,
      params.time,
      branch
    ]
  });
};
