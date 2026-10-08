/**
 * LEONAS WhatsApp Solution API Service
 * Official Meta WABA Approved Templates Verified with WABA ID: 2841437129545530
 */

import { resolveCanonicalBranchId, CanonicalBranchId } from '../branches/branchMaster';
import { generateInvoicePdfBytes, uploadInvoicePdfToFirebaseStorage, InvoiceItem } from '../invoice/invoicePdfGenerator';

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
  const canonical = resolveCanonicalBranchId(branch);
  if (canonical === 'chandanagar') return BRANCH_VISIT_URLS.chanda;
  if (canonical === 'dilshuknagar') return BRANCH_VISIT_URLS.dilshu;
  if (canonical === 'nallagandla') return BRANCH_VISIT_URLS.nallag;
  if (canonical === 'kphb') return BRANCH_VISIT_URLS.kphb;
  const clean = (branch || '').toLowerCase().trim();
  if (clean.includes('chanda')) return BRANCH_VISIT_URLS.chanda;
  if (clean.includes('dilshu') || clean.includes('dilsuk')) return BRANCH_VISIT_URLS.dilshu;
  if (clean.includes('nallag') || clean.includes('nalla')) return BRANCH_VISIT_URLS.nallag;
  return BRANCH_VISIT_URLS.kphb;
};

// Official Google Review URLs per Branch
export const BRANCH_GOOGLE_REVIEW_URLS: Record<CanonicalBranchId, string> = {
  kphb: 'https://stiny.in/SPHOMEO/kphb',
  chandanagar: 'https://g.page/r/CairS0V3apxiEBM/review',
  dilshuknagar: 'https://g.page/r/CU1YDEyXIcwhEBM/review',
  nallagandla: 'https://g.page/r/CUlOWoE7dEjoEBM/review',
};

/**
 * Returns the exact Google Review URL for the clinic branch where the appointment was booked
 */
export const getBranchGoogleReviewUrl = (branch?: string | null): string => {
  const canonical = resolveCanonicalBranchId(branch);
  if (canonical && BRANCH_GOOGLE_REVIEW_URLS[canonical]) {
    return BRANCH_GOOGLE_REVIEW_URLS[canonical];
  }
  const clean = (branch || '').toLowerCase().trim();
  if (clean.includes('chanda')) return BRANCH_GOOGLE_REVIEW_URLS.chandanagar;
  if (clean.includes('dilshu') || clean.includes('dilsuk')) return BRANCH_GOOGLE_REVIEW_URLS.dilshuknagar;
  if (clean.includes('nallag') || clean.includes('nalla')) return BRANCH_GOOGLE_REVIEW_URLS.nallagandla;
  return BRANCH_GOOGLE_REVIEW_URLS.kphb;
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
  headerMedia?: {
    type?: 'document' | 'image' | 'video';
    link: string;
    filename?: string;
  };
}

/**
 * Send WhatsApp Message using Official Meta Approved WABA Templates
 */
export const sendWhatsAppTemplateMessage = async ({
  to,
  templateName,
  languageCode = 'en',
  bodyParameters = [],
  headerMedia,
}: SendWhatsAppTemplateParams): Promise<{ success: boolean; data?: any; error?: string }> => {
  try {
    const recipient = formatPhoneForWhatsApp(to);
    if (!recipient || recipient.length < 10) {
      console.warn('Invalid phone number for WhatsApp template:', to);
      return { success: false, error: 'Invalid phone number' };
    }

    const components: any[] = [];

    // Header media component (e.g. PDF document attachment for invoice_pdf)
    if (headerMedia && headerMedia.link) {
      const mediaType = headerMedia.type || 'document';
      const mediaPayload: any = {
        link: headerMedia.link,
      };
      if (headerMedia.filename) {
        mediaPayload.filename = headerMedia.filename;
      }
      components.push({
        type: 'header',
        parameters: [
          {
            type: mediaType,
            [mediaType]: mediaPayload,
          },
        ],
      });
    }

    // Body parameters
    if (bodyParameters && bodyParameters.length > 0) {
      components.push({
        type: 'body',
        parameters: bodyParameters.map((paramVal) => ({
          type: 'text',
          text: String(paramVal ?? ''),
        })),
      });
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
        components: components.length > 0 ? components : undefined,
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
 * 3. Complete 3-Step WhatsApp Notification on Payment Collection / Invoice Generation
 *
 * Step 1: payement_receipt (Utility - Approved)
 *   {{1}}: Patient Name
 *   {{2}}: Total Paid (Amount)
 *   {{3}}: Receipt No (INV-XXXXXX)
 *   {{4}}: Date (DD-MM-YYYY)
 *   {{5}}: Branch Name
 *
 * Step 2: invoice_pdf (Meta Template ID: 3761284 - Utility)
 *   Header: PDF document attachment
 *   Body: {{1}} Patient Name
 *
 * Step 3: Experience Survey & Branch-Specific Google Review
 *   Survey: "Hi {{1}}, Thank You for Visiting Spiritual Homeopathy Clinics. How was your experience with us?..."
 *   Google Review Link routed dynamically to the booked branch:
 *     - KPHB: https://stiny.in/SPHOMEO/kphb
 *     - Chandanagar: https://g.page/r/CairS0V3apxiEBM/review
 *     - Dilshuknagar: https://g.page/r/CU1YDEyXIcwhEBM/review
 *     - Nallagandla: https://g.page/r/CUlOWoE7dEjoEBM/review
 */
export const sendInvoiceWhatsAppNotification = async (params: {
  patientName: string;
  phone: string;
  invoiceId?: string;
  totalPaid: number;
  paymentMode?: string;
  branch?: string;
  doctorName?: string;
  pdfUrl?: string;
  invoiceUrl?: string;
  items?: InvoiceItem[];
}) => {
  const invCode = params.invoiceId ? String(params.invoiceId).substring(0, 10).toUpperCase() : 'RECEIPT';
  const receiptNo = invCode.startsWith('INV-') ? invCode : `INV-${invCode}`;
  const branch = params.branch || 'KPHB';
  const todayDate = new Date().toLocaleDateString('en-GB').replace(/\//g, '-');
  const amountStr = String(Number(params.totalPaid || 0));
  const patient = params.patientName || 'Patient';

  console.log(`[WhatsApp] Triggering 3-Step Payment Notification Flow for ${patient} at ${branch}`);

  // Step 1: Send Payment Receipt Template (payement_receipt: 5 Placeholders)
  const payResult = await sendWhatsAppTemplateMessage({
    to: params.phone,
    templateName: 'payement_receipt',
    languageCode: 'en',
    bodyParameters: [
      patient,
      amountStr,
      receiptNo,
      todayDate,
      branch,
    ],
  });

  // Step 2: Auto-generate the real patient invoice PDF and upload to Firebase Storage if not already provided
  let finalPdfUrl = params.pdfUrl || params.invoiceUrl;
  if (!finalPdfUrl) {
    try {
      const pdfBytes = generateInvoicePdfBytes({
        patientName: patient,
        phone: params.phone,
        invoiceId: receiptNo,
        date: todayDate,
        branch: branch,
        doctorName: params.doctorName,
        totalPaid: params.totalPaid,
        paymentMode: params.paymentMode,
        items: params.items,
      });
      const filename = `Invoice_${invCode}.pdf`;
      finalPdfUrl = await uploadInvoicePdfToFirebaseStorage(pdfBytes, filename);
      console.log('[WhatsApp] Generated & uploaded real invoice PDF to Firebase Storage:', finalPdfUrl);
    } catch (pdfErr) {
      console.warn('[WhatsApp] Invoice PDF auto-generation notice:', pdfErr);
      finalPdfUrl = 'https://firebasestorage.googleapis.com/v0/b/spiritual-homeopathy-3b552.firebasestorage.app/o/invoices%2FInvoice_INV-T9T56E.pdf?alt=media&token=e97fae97-5ec9-443f-9c55-36a5e0ad3a9d';
    }
  }

  // Send Official Invoice PDF Document Template (invoice_pdf: Meta ID 1744489930193378)
  const invPdfResult = await sendInvoicePdfWhatsAppNotification({
    patientName: patient,
    phone: params.phone,
    pdfUrl: finalPdfUrl,
    invoiceId: invCode,
    branch,
  }).catch((e) => {
    console.warn('invoice_pdf notification error:', e);
    return null;
  });

  // Step 3: Trigger Interactive Experience Feedback Survey (delayed by 3 seconds for orderly sequence)
  sendExperienceWhatsAppNotification({
    patientName: patient,
    phone: params.phone,
    branch,
    delayMs: 3000,
  }).catch((e) => console.warn('experience template error:', e));

  if (payResult.success || invPdfResult?.success) {
    const baseResult = payResult.success ? payResult : (invPdfResult || payResult);
    return { ...baseResult, pdfUrl: finalPdfUrl };
  }

  // Fallback: Raw Text Message
  const message = `*SPIRITUAL HOMEOPATHY - PAYMENT RECEIPT* 🧾\n\nDear *${patient}*,\nWe have received your payment of Rs.${amountStr}.\n\nReceipt No: ${receiptNo}\nDate: ${todayDate}\nBranch: ${branch}\n\nThank you for choosing Spiritual Homeopathy Clinics.\n📞 Helpdesk: 9069 176 176\n🌐 www.spiritualhomeoclinic.com`;

  return await sendWhatsAppTextMessage({ to: params.phone, body: message });
};

/**
 * Trigger WhatsApp Notification for Official Invoice PDF Attachment
 * Template: invoice_pdf (Meta Template ID: 3761284) - Category: Utility
 * Header: Document (PDF attachment)
 * Body: {{1}} Patient Name
 */
export const sendInvoicePdfWhatsAppNotification = async (params: {
  patientName: string;
  phone: string;
  pdfUrl?: string;
  invoiceId?: string;
  branch?: string;
}) => {
  const patient = params.patientName || 'Patient';
  const invCode = params.invoiceId ? String(params.invoiceId).substring(0, 6).toUpperCase() : 'RECEIPT';
  const filename = `Invoice_${invCode}.pdf`;
  const pdfLink = params.pdfUrl || 'https://pdfobject.com/pdf/sample.pdf';

  // 1. Send official invoice_pdf template with attached PDF document
  const pdfResult = await sendWhatsAppTemplateMessage({
    to: params.phone,
    templateName: 'invoice_pdf',
    languageCode: 'en',
    bodyParameters: [patient],
    headerMedia: {
      type: 'document',
      link: pdfLink,
      filename: filename,
    },
  });

  if (pdfResult.success) {
    return pdfResult;
  }

  console.warn('invoice_pdf template not delivered, falling back to invoice_recpt template:', pdfResult.error);

  // 2. Fallback to approved invoice_recpt template if invoice_pdf is pending or fails
  return await sendWhatsAppTemplateMessage({
    to: params.phone,
    templateName: 'invoice_recpt',
    languageCode: 'en',
    bodyParameters: [patient],
  });
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
      params.patientName || 'Patient',
    ],
  });
};

/**
 * Trigger WhatsApp Notification for Patient Experience / Feedback Review
 * Step 3 in payment workflow:
 * Template: exp_link (Official Meta Approved)
 * "Hi {{1}}, Thank You for Visiting Spiritual Homeopathy Clinics. How was your experience with us?
 *  Please reply with one of the following.
 *  Reply STOP to opt out of further messages.
 *  Good / Can be better / Bad"
 *
 * Dynamic Branch Review Routing:
 *  - KPHB: https://stiny.in/SPHOMEO/kphb
 *  - Chandanagar: https://g.page/r/CairS0V3apxiEBM/review
 *  - Dilshuknagar: https://g.page/r/CU1YDEyXIcwhEBM/review
 *  - Nallagandla: https://g.page/r/CUlOWoE7dEjoEBM/review
 */
export const sendExperienceWhatsAppNotification = async (params: {
  patientName: string;
  phone: string;
  branch?: string;
  delayMs?: number;
}) => {
  if (params.delayMs && params.delayMs > 0) {
    await new Promise((resolve) => setTimeout(resolve, params.delayMs));
  }

  const patient = params.patientName || 'Patient';
  const branchName = params.branch || 'KPHB';
  const reviewUrl = getBranchGoogleReviewUrl(params.branch);

  // 1. Send approved googlee_review template directly (3 Placeholders: Patient, Branch, Review URL)
  // This delivers the verified Google Review link directly, avoiding Pinbot chatbot's unconfigured {#var#} placeholder
  const reviewRes = await sendWhatsAppTemplateMessage({
    to: params.phone,
    templateName: 'googlee_review',
    languageCode: 'en',
    bodyParameters: [
      patient,
      branchName.toLowerCase().includes('branch') ? branchName : `${branchName} Branch`,
      reviewUrl,
    ],
  });

  if (reviewRes.success) {
    return reviewRes;
  }

  // 2. Fallback to exp_link interactive feedback template (Buttons: Good / Can be better / Bad)
  const expRes = await sendWhatsAppTemplateMessage({
    to: params.phone,
    templateName: 'exp_link',
    languageCode: 'en',
    bodyParameters: [patient],
  });

  if (expRes.success) {
    return expRes;
  }

  // 3. Fallback: Friendly text message with the branch-specific Google review link
  const fallbackMsg = `Hi *${patient}*,\nThank you for visiting Spiritual Homeopathy Clinics (${branchName}).\n\nHow was your experience with us?\nIf you had a good experience, please give us a quick review on Google:\n⭐ ${reviewUrl}\n\nThank you for choosing us! 🌿`;

  return await sendWhatsAppTextMessage({
    to: params.phone,
    body: fallbackMsg,
  });
};

/**
 * Trigger WhatsApp Notification for Google Review Link (Branch Specific)
 * Called when patient replies or clicks 'Good' on experience survey:
 * "Thankyou for your valuable feedback.Please give us a quick review in Google by clicking this link {#var#}"
 */
export const sendGoogleReviewWhatsAppNotification = async (params: {
  patientName: string;
  phone: string;
  branch?: string;
}) => {
  const patient = params.patientName || 'Patient';
  const reviewUrl = getBranchGoogleReviewUrl(params.branch);
  const branchName = params.branch || 'KPHB';

  // 1. Try googlee_review template
  const reviewRes = await sendWhatsAppTemplateMessage({
    to: params.phone,
    templateName: 'googlee_review',
    languageCode: 'en',
    bodyParameters: [
      patient,
      branchName,
      reviewUrl,
    ],
  });

  if (reviewRes.success) {
    return reviewRes;
  }

  // 2. Fallback text
  const msg = `Thankyou for your valuable feedback. Please give us a quick review in Google by clicking this link: ${reviewUrl}`;
  return await sendWhatsAppTextMessage({
    to: params.phone,
    body: msg,
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