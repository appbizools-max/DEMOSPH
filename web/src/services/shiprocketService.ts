/**
 * Shiprocket API Service for Spiritual Homeopathy Clinics
 * Documentation: https://apidocs.shiprocket.in/
 */

import { doc, getDoc, setDoc, collection, addDoc, getDocs, query, orderBy, limit, updateDoc } from 'firebase/firestore';
import { db } from '@app/shared';

export interface ShiprocketConfig {
  email?: string;
  password?: string;
  token?: string;
  tokenExpiry?: string;
  pickupLocation?: string;
  defaultLength?: number;
  defaultBreadth?: number;
  defaultHeight?: number;
  defaultWeight?: number;
  isConnected?: boolean;
  lastConnectedAt?: string;
}

export interface ShiprocketOrderItem {
  name: string;
  sku: string;
  units: number;
  selling_price: number;
  discount?: number;
  tax?: number;
}

export interface CreateShipmentPayload {
  order_id: string;
  order_date?: string; // YYYY-MM-DD HH:mm
  pickup_location: string;
  channel_id?: string;
  comment?: string;
  billing_customer_name: string;
  billing_last_name?: string;
  billing_address: string;
  billing_address_2?: string;
  billing_city: string;
  billing_pincode: string;
  billing_state: string;
  billing_country?: string;
  billing_email?: string;
  billing_phone: string;
  shipping_is_billing: boolean;
  order_items: ShiprocketOrderItem[];
  payment_method: 'Prepaid' | 'COD';
  sub_total: number;
  length: number;
  breadth: number;
  height: number;
  weight: number;
  patient_id?: string;
  branch_name?: string;
}

export interface CourierServiceabilityItem {
  courier_company_id: number;
  courier_name: string;
  rate: number;
  etd: string;
  estimated_delivery_days: string | number;
  cod: number;
  call_before_delivery?: string;
  tracking_performance?: string;
  rating?: number;
}

export interface TrackingActivity {
  date: string;
  status: string;
  activity: string;
  location: string;
  'sr-status'?: string;
}

export interface TrackingResult {
  awb_code?: string;
  courier_name?: string;
  current_status?: string;
  expected_delivery_date?: string;
  origin?: string;
  destination?: string;
  scans?: TrackingActivity[];
  raw?: any;
}

export interface ClinicShipmentRecord {
  id?: string;
  order_id: string;
  shipment_id?: number | string;
  awb_code?: string;
  courier_name?: string;
  patient_name: string;
  patient_phone: string;
  destination: string;
  pincode: string;
  branch_name?: string;
  status: string;
  payment_method: 'Prepaid' | 'COD';
  amount: number;
  items_summary: string;
  weight_kg: number;
  pickup_location: string;
  created_at: string;
  label_url?: string;
}

const LOCAL_STORAGE_KEY = '@sph_shiprocket_config_v1';
const API_BASE_PROXY = '/api/shiprocket/v1/external';
const API_BASE_DIRECT = 'https://apiv2.shiprocket.in/v1/external';

/**
 * Helper to determine base API URL (proxy if available in web browser, direct fallback)
 */
function getApiBaseUrl(): string {
  if (typeof window !== 'undefined' && window.location.origin) {
    return API_BASE_PROXY;
  }
  return API_BASE_DIRECT;
}

/**
 * Retrieve Shiprocket configuration from Firestore or LocalStorage
 */
export async function getShiprocketConfig(): Promise<ShiprocketConfig> {
  // 1. Try local cache first for responsiveness
  let localConfig: ShiprocketConfig = {};
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (raw) {
      localConfig = JSON.parse(raw);
    }
  } catch (e) {
    console.warn('[Shiprocket] Local cache parse warning:', e);
  }

  // 2. Fetch from Firestore settings
  if (db) {
    try {
      const snap = await getDoc(doc(db, 'settings', 'shiprocket'));
      if (snap.exists()) {
        const firestoreConfig = snap.data() as ShiprocketConfig;
        const merged: ShiprocketConfig = {
          ...localConfig,
          ...firestoreConfig,
          // Preserve local token if still valid
          token: firestoreConfig.token || localConfig.token
        };
        try {
          localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(merged));
        } catch (_) {}
        return merged;
      }
    } catch (err) {
      console.warn('[Shiprocket] Firestore config read warning:', err);
    }
  }

  return localConfig;
}

/**
 * Save Shiprocket configuration to Firestore & LocalStorage
 */
export async function saveShiprocketConfig(config: Partial<ShiprocketConfig>): Promise<ShiprocketConfig> {
  const current = await getShiprocketConfig();
  const updated: ShiprocketConfig = {
    ...current,
    ...config,
    pickupLocation: config.pickupLocation || current.pickupLocation || 'Primary',
    defaultWeight: config.defaultWeight ?? current.defaultWeight ?? 0.5,
    defaultLength: config.defaultLength ?? current.defaultLength ?? 10,
    defaultBreadth: config.defaultBreadth ?? current.defaultBreadth ?? 10,
    defaultHeight: config.defaultHeight ?? current.defaultHeight ?? 10,
  };

  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
  } catch (e) {}

  if (db) {
    try {
      await setDoc(doc(db, 'settings', 'shiprocket'), updated, { merge: true });
    } catch (e) {
      console.warn('[Shiprocket] Failed to sync config to Firestore:', e);
    }
  }

  return updated;
}

/**
 * Authenticate with Shiprocket and obtain Bearer JWT Token
 */
export async function authenticateShiprocket(email: string, password: string): Promise<{ success: boolean; token?: string; message: string }> {
  const baseUrl = getApiBaseUrl();
  const url = `${baseUrl}/auth/login`;

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: email.trim(),
        password: password.trim()
      })
    });

    const data = await res.json();

    if (res.ok && data.token) {
      await saveShiprocketConfig({
        email: email.trim(),
        password: password.trim(),
        token: data.token,
        isConnected: true,
        lastConnectedAt: new Date().toISOString()
      });

      return {
        success: true,
        token: data.token,
        message: 'Successfully authenticated with Shiprocket API'
      };
    } else {
      return {
        success: false,
        message: data.message || 'Shiprocket authentication failed. Please verify credentials.'
      };
    }
  } catch (err: any) {
    // If proxy failed, try direct fetch fallback
    try {
      const directUrl = `${API_BASE_DIRECT}/auth/login`;
      const fallbackRes = await fetch(directUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password: password.trim() })
      });
      const fallbackData = await fallbackRes.json();
      if (fallbackRes.ok && fallbackData.token) {
        await saveShiprocketConfig({
          email: email.trim(),
          token: fallbackData.token,
          isConnected: true,
          lastConnectedAt: new Date().toISOString()
        });
        return {
          success: true,
          token: fallbackData.token,
          message: 'Connected successfully via direct API endpoint'
        };
      }
    } catch (fallbackErr) {}

    return {
      success: false,
      message: err?.message || 'Network error reaching Shiprocket server'
    };
  }
}

/**
 * Internal helper to get authorized headers
 */
async function getAuthHeaders(): Promise<HeadersInit> {
  const config = await getShiprocketConfig();
  if (!config.token) {
    throw new Error('Shiprocket API Token is missing. Please configure credentials in Shiprocket Settings.');
  }
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${config.token}`
  };
}

/**
 * Fetch registered Pickup Locations from Shiprocket
 */
export async function getPickupLocations(): Promise<{ success: boolean; locations: string[]; message?: string }> {
  try {
    const headers = await getAuthHeaders();
    const res = await fetch(`${getApiBaseUrl()}/settings/company/pickup`, {
      method: 'GET',
      headers
    });
    const data = await res.json();
    if (res.ok && data.data?.shipping_address) {
      const addresses = data.data.shipping_address.map((loc: any) => loc.pickup_location || loc.name);
      return { success: true, locations: addresses.filter(Boolean) };
    }
    return { success: false, locations: ['Primary'], message: data.message || 'No pickup locations found' };
  } catch (e: any) {
    return { success: false, locations: ['Primary'], message: e.message };
  }
}

/**
 * Check Courier Serviceability & Rates between two pincodes
 */
export async function checkCourierServiceability(
  pickupPostcode: string,
  deliveryPostcode: string,
  weight: number = 0.5,
  cod: boolean = false
): Promise<{ success: boolean; couriers: CourierServiceabilityItem[]; message?: string }> {
  try {
    const headers = await getAuthHeaders();
    const query = new URLSearchParams({
      pickup_postcode: pickupPostcode.trim(),
      delivery_postcode: deliveryPostcode.trim(),
      weight: weight.toString(),
      cod: cod ? '1' : '0'
    });

    const res = await fetch(`${getApiBaseUrl()}/courier/serviceability/?${query.toString()}`, {
      method: 'GET',
      headers
    });

    const data = await res.json();
    if (res.ok && data.status === 200 && data.data?.available_courier_companies) {
      const couriers: CourierServiceabilityItem[] = data.data.available_courier_companies.map((c: any) => ({
        courier_company_id: c.courier_company_id,
        courier_name: c.courier_name,
        rate: Number(c.rate || 0),
        etd: c.etd || '2-4 Days',
        estimated_delivery_days: c.estimated_delivery_days || '3',
        cod: c.cod,
        rating: c.rating || 4.2
      }));
      return { success: true, couriers };
    }
    return { success: false, couriers: [], message: data.message || 'No available couriers found for this pincode.' };
  } catch (e: any) {
    return { success: false, couriers: [], message: e.message || 'Error checking serviceability' };
  }
}

/**
 * Create a Custom Adhoc Order in Shiprocket
 */
export async function createCustomShiprocketOrder(payload: CreateShipmentPayload): Promise<{
  success: boolean;
  orderId?: string;
  shipmentId?: number;
  awbCode?: string;
  courierName?: string;
  message: string;
  raw?: any;
}> {
  try {
    const headers = await getAuthHeaders();
    const now = new Date();
    const formattedDate = payload.order_date || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    // Clean Indian Phone
    const cleanPhone = (payload.billing_phone || '').replace(/\D/g, '').slice(-10);

    const body = {
      order_id: payload.order_id,
      order_date: formattedDate,
      pickup_location: payload.pickup_location || 'Primary',
      channel_id: payload.channel_id || '',
      comment: payload.comment || 'Spiritual Homeopathy Medicine Dispatch',
      billing_customer_name: payload.billing_customer_name.trim(),
      billing_last_name: payload.billing_last_name ? payload.billing_last_name.trim() : '',
      billing_address: payload.billing_address.trim(),
      billing_address_2: payload.billing_address_2 || '',
      billing_city: payload.billing_city.trim(),
      billing_pincode: payload.billing_pincode.trim(),
      billing_state: payload.billing_state.trim(),
      billing_country: payload.billing_country || 'India',
      billing_email: payload.billing_email?.trim() || 'sphclinics@gmail.com',
      billing_phone: cleanPhone,
      shipping_is_billing: true,
      order_items: payload.order_items.map(item => ({
        name: item.name,
        sku: item.sku || 'MED-SPH',
        units: item.units || 1,
        selling_price: item.selling_price || 0,
        discount: item.discount || 0,
        tax: item.tax || 0
      })),
      payment_method: payload.payment_method || 'Prepaid',
      sub_total: payload.sub_total || 0,
      length: payload.length || 10,
      breadth: payload.breadth || 10,
      height: payload.height || 10,
      weight: payload.weight || 0.5
    };

    const res = await fetch(`${getApiBaseUrl()}/orders/create/adhoc`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body)
    });

    const data = await res.json();

    if (res.ok && (data.order_id || data.shipment_id || data.status === 'NEW' || data.status_code === 1)) {
      const orderId = String(data.order_id || payload.order_id);
      const shipmentId = data.shipment_id;
      const awbCode = data.awb_code || '';
      const courierName = data.courier_name || '';

      // Persist to clinic firestore shipments database
      await saveClinicShipmentRecord({
        order_id: orderId,
        shipment_id: shipmentId,
        awb_code: awbCode,
        courier_name: courierName,
        patient_name: payload.billing_customer_name,
        patient_phone: cleanPhone,
        destination: `${payload.billing_city}, ${payload.billing_state}`,
        pincode: payload.billing_pincode,
        branch_name: payload.branch_name || 'Clinic',
        status: awbCode ? 'AWB Assigned' : 'Order Placed',
        payment_method: payload.payment_method,
        amount: payload.sub_total,
        items_summary: payload.order_items.map(i => `${i.name} (x${i.units})`).join(', '),
        weight_kg: payload.weight,
        pickup_location: payload.pickup_location,
        created_at: new Date().toISOString()
      });

      return {
        success: true,
        orderId,
        shipmentId,
        awbCode,
        courierName,
        message: 'Order successfully created in Shiprocket!',
        raw: data
      };
    } else {
      return {
        success: false,
        message: data.message || (data.errors ? JSON.stringify(data.errors) : 'Failed to create order in Shiprocket'),
        raw: data
      };
    }
  } catch (err: any) {
    console.error('[Shiprocket] Order creation error:', err);
    return {
      success: false,
      message: err.message || 'Network exception while creating Shiprocket order'
    };
  }
}

/**
 * Track shipment by AWB Code
 */
export async function trackByAwb(awb: string): Promise<{ success: boolean; data?: TrackingResult; message?: string }> {
  try {
    const headers = await getAuthHeaders();
    const res = await fetch(`${getApiBaseUrl()}/courier/track/awb/${awb.trim()}`, {
      method: 'GET',
      headers
    });
    const data = await res.json();

    if (res.ok && data.tracking_data) {
      const track = data.tracking_data;
      const scanList: TrackingActivity[] = (track.shipment_track_activities || []).map((a: any) => ({
        date: a.date,
        status: a.status,
        activity: a.activity,
        location: a.location,
        'sr-status': a['sr-status']
      }));

      return {
        success: true,
        data: {
          awb_code: awb,
          courier_name: track.shipment_track?.[0]?.courier_name || 'Courier Partner',
          current_status: track.shipment_track?.[0]?.current_status || 'In Transit',
          expected_delivery_date: track.shipment_track?.[0]?.edd || '',
          origin: track.shipment_track?.[0]?.origin || '',
          destination: track.shipment_track?.[0]?.destination || '',
          scans: scanList,
          raw: data
        }
      };
    }

    return {
      success: false,
      message: data.message || 'Tracking information not available yet'
    };
  } catch (e: any) {
    return { success: false, message: e.message };
  }
}

/**
 * Generate Shipping Label PDF for a given Shipment ID
 */
export async function generateShippingLabel(shipmentId: number | string): Promise<{ success: boolean; labelUrl?: string; message?: string }> {
  try {
    const headers = await getAuthHeaders();
    const res = await fetch(`${getApiBaseUrl()}/courier/generate/label`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        shipment_id: [Number(shipmentId)]
      })
    });
    const data = await res.json();
    if (res.ok && data.label_url) {
      return { success: true, labelUrl: data.label_url };
    }
    return { success: false, message: data.message || 'Failed to generate shipping label' };
  } catch (e: any) {
    return { success: false, message: e.message };
  }
}

/**
 * Request Courier Pickup for a Shipment ID
 */
export async function requestCourierPickup(shipmentId: number | string): Promise<{ success: boolean; pickupToken?: string; message: string }> {
  try {
    const headers = await getAuthHeaders();
    const res = await fetch(`${getApiBaseUrl()}/courier/generate/pickup`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        shipment_id: [Number(shipmentId)]
      })
    });
    const data = await res.json();
    if (res.ok && (data.response?.pickup_scheduled_date || data.pickup_status === 1)) {
      return {
        success: true,
        pickupToken: data.response?.pickup_token_number,
        message: 'Pickup requested successfully!'
      };
    }
    return {
      success: false,
      message: data.message || data.response?.data || 'Could not schedule pickup'
    };
  } catch (e: any) {
    return { success: false, message: e.message };
  }
}

/**
 * Save Shipment Record to Firestore
 */
export async function saveClinicShipmentRecord(record: ClinicShipmentRecord): Promise<string | null> {
  if (!db) return null;
  try {
    const colRef = collection(db, 'shiprocket_shipments');
    const docRef = await addDoc(colRef, {
      ...record,
      timestamp: new Date().getTime()
    });
    return docRef.id;
  } catch (e) {
    console.warn('[Shiprocket] Failed to save shipment record to Firestore:', e);
    return null;
  }
}

/**
 * Fetch Clinic Shipment Records from Firestore
 */
export async function getClinicShipmentRecords(): Promise<ClinicShipmentRecord[]> {
  if (!db) {
    // Return mock / local demo records if firestore unavailable
    return [];
  }
  try {
    const colRef = collection(db, 'shiprocket_shipments');
    const q = query(colRef, orderBy('created_at', 'desc'), limit(50));
    const snap = await getDocs(q);
    const list: ClinicShipmentRecord[] = [];
    snap.forEach(docSnap => {
      list.push({
        id: docSnap.id,
        ...docSnap.data() as any
      });
    });
    return list;
  } catch (e) {
    console.warn('[Shiprocket] Error loading shipment records from Firestore:', e);
    return [];
  }
}
