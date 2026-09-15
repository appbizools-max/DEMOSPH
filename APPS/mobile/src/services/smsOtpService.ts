/**
 * Spiritual Homeopathy Mobile SMS OTP Service
 * Gateway: https://smslogin.co/v3/api.php
 * Template ID: 1777178867791586062
 * Sender ID: SPHMEO
 * Format: "Your OTP is {#var#}. It is valid for 5 minutes. Please do not share this OTP with anyone.\n\nSpiritual Homeopathy Clinics"
 */

import { getFirestore, doc, getDoc, setDoc } from 'firebase/firestore';
import { getApp, getApps } from 'firebase/app';

export const SMS_CONFIG = {
  baseUrl: 'https://smslogin.co/v3/api.php',
  username: 'SPHOMEO',
  apikey: 'b93e415cf967f949dfff',
  senderid: 'SPHMEO',
  templateid: '1777178867791586062',
};

export interface SendSmsOtpResult {
  success: boolean;
  message: string;
  otp?: string;
  response?: string;
  isCredentialsError?: boolean;
}

const getSafeDb = () => {
  if (getApps().length > 0) {
    return getFirestore(getApp());
  }
  return null;
};

/**
 * Generate a 4-digit random OTP
 */
export function generate4DigitOtp(): string {
  return Math.floor(1000 + Math.random() * 9000).toString();
}

/**
 * Normalize an Indian phone number to 10 digits and 12 digits (with 91 prefix)
 */
export function normalizePhoneForSms(phone: string): { clean10: string; fullMobileWith91: string } {
  const digits = (phone || '').replace(/\D/g, '');
  const clean10 = digits.length > 10 ? digits.slice(-10) : digits;
  const fullMobileWith91 = clean10.length === 10 ? `91${clean10}` : digits;
  return { clean10, fullMobileWith91 };
}

/**
 * Update SMS Gateway credentials in Firestore and local config
 */
export async function updateSmsGatewayCredentials(username: string, apikey: string): Promise<boolean> {
  SMS_CONFIG.username = username.trim();
  SMS_CONFIG.apikey = apikey.trim();
  const db = getSafeDb();
  if (db) {
    try {
      await setDoc(doc(db, 'settings', 'sms_gateway'), {
        username: username.trim(),
        apikey: apikey.trim(),
        updatedAt: new Date().toISOString()
      }, { merge: true });
      return true;
    } catch (e) {
      console.warn('Could not save SMS credentials to Firestore:', e);
    }
  }
  return false;
}

/**
 * Send 4-digit OTP SMS using the registered DLT template
 */
export async function sendSmsOtp(phone: string, otp: string): Promise<SendSmsOtpResult> {
  const { clean10, fullMobileWith91 } = normalizePhoneForSms(phone);

  if (!clean10 || clean10.length !== 10) {
    return {
      success: false,
      message: 'Invalid mobile number. Must be a valid 10-digit number.'
    };
  }

  // Check Firestore for live configured credentials
  let activeUsername = SMS_CONFIG.username;
  let activeApiKey = SMS_CONFIG.apikey;
  const db = getSafeDb();
  if (db) {
    try {
      const snap = await getDoc(doc(db, 'settings', 'sms_gateway'));
      if (snap.exists()) {
        const data = snap.data();
        if (data.username && data.apikey) {
          activeUsername = data.username.trim();
          activeApiKey = data.apikey.trim();
        }
      }
    } catch (e) {
      // ignore
    }
  }

  // Exact DLT template message format
  const smsMessage = `Your OTP is ${otp}. It is valid for 5 minutes. Please do not share this OTP with anyone.\n\nSpiritual Homeopathy Clinics`;

  const queryParams = [
    `username=${encodeURIComponent(activeUsername)}`,
    `apikey=${encodeURIComponent(activeApiKey)}`,
    `senderid=${encodeURIComponent(SMS_CONFIG.senderid)}`,
    `mobile=${encodeURIComponent(fullMobileWith91)}`,
    `message=${encodeURIComponent(smsMessage)}`,
    `templateid=${encodeURIComponent(SMS_CONFIG.templateid)}`
  ].join('&');

  console.log('\n======================================================================');
  console.log(`🔑 [SPH SMS OTP GENERATED] 🔑`);
  console.log(`📱 Target Mobile: +91 ${clean10}`);
  console.log(`🔐 OTP CODE: >>> ${otp} <<<`);
  console.log('======================================================================\n');

  const requestUrl = `${SMS_CONFIG.baseUrl}?${queryParams}`;

  try {
    const res = await fetch(requestUrl, {
      method: 'GET',
    });

    const responseText = await res.text();
    console.log(`[MOBILE_SMS_OTP] Gateway Response:`, responseText);

    const isError = responseText.toLowerCase().includes('error') || responseText.toLowerCase().includes('invalid');
    const isCredentialsError = responseText.toLowerCase().includes('invalid credentials');

    if (isError) {
      return {
        success: false,
        message: isCredentialsError
          ? `SMS Gateway Error: Invalid Credentials for account "${activeUsername}". Please update with your real smslogin.co credentials.`
          : `SMS Gateway Error: ${responseText}`,
        otp,
        response: responseText,
        isCredentialsError
      };
    }

    return {
      success: true,
      message: `OTP sent successfully to +91 ${clean10}`,
      otp,
      response: responseText
    };
  } catch (err: any) {
    console.warn(`[MOBILE_SMS_OTP] Gateway call notice:`, err?.message || err);
    return {
      success: false,
      message: `Network error connecting to SMS Gateway`,
      otp
    };
  }
}
