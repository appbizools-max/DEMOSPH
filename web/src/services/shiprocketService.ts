/**
 * Shiprocket API Service for Spiritual Homeopathy Clinics
 * Documentation: https://apidocs.shiprocket.in/
 */

import { doc, getDoc, setDoc, collection, addDoc, getDocs, query, orderBy, limit, updateDoc } from 'firebase/firestore';
import { db } from '@app/shared';

export interface ShiprocketConfig {
  apiKey?: string;
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
  courier_company_id?: number;
  courier_name?: string;
}

/**
 * Calculate Volumetric and Chargeable Weight according to official Shiprocket standard:
 * Formula: (Length cm * Breadth cm * Height cm) / 5000 = Volumetric Weight (Kg)
 * Chargeable Weight = Math.max(Actual Dead Weight, Volumetric Weight)
 * Billable Slab = Rounded to nearest 0.5 Kg slab
 */
export function calculateShiprocketWeight(
  actualWeightKg: number | string,
  lengthCm: number | string = 10,
  breadthCm: number | string = 10,
  heightCm: number | string = 10
) {
  const actual = Math.max(0, parseFloat(String(actualWeightKg)) || 0);
  const l = Math.max(0, parseFloat(String(lengthCm)) || 0);
  const b = Math.max(0, parseFloat(String(breadthCm)) || 0);
  const h = Math.max(0, parseFloat(String(heightCm)) || 0);

  // Shiprocket Volumetric Weight Formula: (L * B * H) / 5000
  const volumetric = l > 0 && b > 0 && h > 0 ? Number(((l * b * h) / 5000).toFixed(3)) : 0;
  const chargeable = Number(Math.max(actual, volumetric).toFixed(3));
  // Courier billing slab (Shiprocket calculates in 0.5kg steps)
  const billingSlab = Math.max(0.5, Math.ceil(chargeable * 2) / 2);

  return {
    actualWeight: actual,
    volumetricWeight: volumetric,
    chargeableWeight: chargeable,
    billingSlab: Number(billingSlab.toFixed(1)),
    isVolumetricHigher: volumetric > actual
  };
}

export interface CourierServiceabilityItem {
  courier_company_id: number;
  courier_name: string;
  rate: number;
  etd: string;
  estimated_delivery_days: string | number;
  cod: number;
  mode?: 'Air' | 'Surface' | string;
  min_weight?: number;
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
export const DEFAULT_SHIPROCKET_API_KEY = '';
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
  let localConfig: ShiprocketConfig = {
    apiKey: '',
    token: '',
    isConnected: false,
    pickupLocation: 'Primary',
    defaultWeight: 0.5
  };
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (raw) {
      localConfig = { ...localConfig, ...JSON.parse(raw) };
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
          isConnected: !!(firestoreConfig.token || localConfig.token)
        };
        try {
          localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(merged));
        } catch (_) { }
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
    isConnected: !!(config.token || current.token)
  };

  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
  } catch (e) { }

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
 * Safely parse response from Shiprocket API.
 * Shiprocket returns plain text "Invalid Token\n" on 401 Unauthorized, which crashes res.json().
 */
async function safeParseApiResponse(res: Response): Promise<{ ok: boolean; status: number; data: any; rawText: string }> {
  let text = '';
  try {
    text = await res.text();
  } catch (e) {
    text = '';
  }

  let parsed: any = null;
  try {
    parsed = text ? JSON.parse(text) : null;
  } catch {
    parsed = null;
  }

  // Handle plain-text token or auth failure
  if (!res.ok || res.status === 401) {
    const trimmed = text.trim();
    if (res.status === 401 || trimmed.toLowerCase().includes('invalid token') || trimmed.toLowerCase().includes('unauthorized')) {
      return {
        ok: false,
        status: 401,
        data: {
          status: 401,
          message: 'Shiprocket Authentication Notice (Invalid Token): The configured token is expired or invalid. Please enter your Shiprocket account Email & Password under "Shiprocket API Setup" to generate an active JWT token.'
        },
        rawText: text
      };
    }
  }

  return {
    ok: res.ok,
    status: res.status,
    data: parsed || (text ? { message: text.trim() } : {}),
    rawText: text
  };
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

    const { ok, data } = await safeParseApiResponse(res);

    if (ok && data.token) {
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
      const { ok: fbOk, data: fallbackData } = await safeParseApiResponse(fallbackRes);
      if (fbOk && fallbackData.token) {
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
    } catch (fallbackErr) { }

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
  let token = (config.token || config.apiKey || '').trim();
  if (token.startsWith('Bearer ')) {
    token = token.slice(7).trim();
  }
  if (!token) {
    throw new Error('Shiprocket account is not connected. Please log in with your Shiprocket Email & Password in Shiprocket API Setup to generate an active JWT token.');
  }
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
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
    const { ok, data } = await safeParseApiResponse(res);
    if (ok && data.data?.shipping_address) {
      const addresses = data.data.shipping_address.map((loc: any) => loc.pickup_location || loc.name);
      return { success: true, locations: addresses.filter(Boolean) };
    }
    return { success: false, locations: ['Primary'], message: data.message || 'No pickup locations found' };
  } catch (e: any) {
    return { success: false, locations: ['Primary'], message: e.message };
  }
}

export interface ShiprocketPickupPayload {
  pickup_location: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  address_2?: string;
  city: string;
  state: string;
  country?: string;
  pin_code: string;
}

/**
 * Register a new Pickup Location in Shiprocket API
 */
export async function addShiprocketPickupLocation(payload: ShiprocketPickupPayload): Promise<{ success: boolean; message: string; data?: any }> {
  try {
    const headers = await getAuthHeaders();
    const res = await fetch(`${getApiBaseUrl()}/settings/company/addpickup`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        pickup_location: payload.pickup_location.trim(),
        name: payload.name.trim(),
        email: payload.email.trim(),
        phone: payload.phone.replace(/\D/g, '').slice(-10),
        address: payload.address.trim(),
        address_2: payload.address_2 ? payload.address_2.trim() : '',
        city: payload.city.trim(),
        state: payload.state.trim(),
        country: payload.country || 'India',
        pin_code: payload.pin_code.trim()
      })
    });
    const { ok, data } = await safeParseApiResponse(res);
    if (ok && (data.success || data.pickup_id || data.address_id || res.status === 200)) {
      return { success: true, message: data.message || 'Pickup location registered with Shiprocket successfully!', data };
    }
    return { success: false, message: data.message || 'Failed to register pickup location in Shiprocket' };
  } catch (e: any) {
    return { success: false, message: e.message || 'Network error adding pickup location' };
  }
}

/**
 * Check Courier Serviceability & Rates between two pincodes directly from Shiprocket
 */
export async function checkCourierServiceability(
  pickupPostcode: string,
  deliveryPostcode: string,
  weight: number = 0.5,
  cod: boolean = false,
  dimensions?: { length?: number; breadth?: number; height?: number; declaredValue?: number }
): Promise<{ success: boolean; couriers: CourierServiceabilityItem[]; message?: string }> {
  try {
    const headers = await getAuthHeaders();
    const queryParams: Record<string, string> = {
      pickup_postcode: pickupPostcode.trim(),
      delivery_postcode: deliveryPostcode.trim(),
      weight: weight.toString(),
      cod: cod ? '1' : '0'
    };

    if (dimensions?.length) queryParams.length = String(dimensions.length);
    if (dimensions?.breadth) queryParams.breadth = String(dimensions.breadth);
    if (dimensions?.height) queryParams.height = String(dimensions.height);
    if (dimensions?.declaredValue) queryParams.declared_value = String(dimensions.declaredValue);

    const query = new URLSearchParams(queryParams);
    const res = await fetch(`${getApiBaseUrl()}/courier/serviceability/?${query.toString()}`, {
      method: 'GET',
      headers
    });

    const { ok, data } = await safeParseApiResponse(res);
    if (ok && data.status === 200 && data.data?.available_courier_companies) {
      const couriers: CourierServiceabilityItem[] = data.data.available_courier_companies.map((c: any) => {
        const isAir = c.mode === 0 || c.is_surface === 0 || /air/i.test(c.courier_name || '') || /express/i.test(c.courier_name || '');
        return {
          courier_company_id: c.courier_company_id,
          courier_name: c.courier_name,
          rate: Number(c.rate || c.freight_charge || 0),
          etd: c.etd || `${c.estimated_delivery_days || 3} Days`,
          estimated_delivery_days: c.estimated_delivery_days || '3',
          cod: c.cod,
          mode: isAir ? 'Air' : 'Surface',
          min_weight: Number(c.min_weight || 0.5),
          rating: Number(c.rating || 4.2),
          call_before_delivery: c.call_before_delivery,
          tracking_performance: c.tracking_performance
        };
      });
      return { success: true, couriers };
    }
    return { success: false, couriers: [], message: data.message || 'No available couriers found for this pincode.' };
  } catch (e: any) {
    return { success: false, couriers: [], message: e.message || 'Error checking serviceability' };
  }
}

/**
 * Assign Courier Method and generate AWB via Shiprocket API
 */
export async function assignCourierAwb(
  shipmentId: number | string,
  courierId?: number | string
): Promise<{ success: boolean; awbCode?: string; courierName?: string; courierCompanyId?: number; message: string; raw?: any }> {
  try {
    const headers = await getAuthHeaders();
    const payload: any = {
      shipment_id: Number(shipmentId)
    };
    if (courierId) {
      payload.courier_id = Number(courierId);
    }

    const res = await fetch(`${getApiBaseUrl()}/courier/assign/awb`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload)
    });
    const { ok, data } = await safeParseApiResponse(res);
    const responseData = data.response?.data || data.data || data;

    if (ok && (responseData.awb_code || data.status === 200 || data.awb_code)) {
      const awb = responseData.awb_code || data.awb_code;
      const courier = responseData.courier_name || data.courier_name;
      const companyId = responseData.courier_company_id || data.courier_company_id;
      return {
        success: true,
        awbCode: awb,
        courierName: courier,
        courierCompanyId: companyId,
        message: 'AWB and courier assigned successfully via Shiprocket!',
        raw: data
      };
    }
    return {
      success: false,
      message: data.message || responseData.error || 'Courier assignment pending in Shiprocket'
    };
  } catch (e: any) {
    return {
      success: false,
      message: e.message || 'Network exception assigning courier AWB'
    };
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

    const { ok, data } = await safeParseApiResponse(res);

    if (ok && (data.order_id || data.shipment_id || data.status === 'NEW' || data.status_code === 1)) {
      const orderId = String(data.order_id || payload.order_id);
      const shipmentId = data.shipment_id;
      let awbCode = data.awb_code || '';
      let courierName = data.courier_name || payload.courier_name || '';

      // If courier method chosen or shipment needs AWB assignment:
      if (shipmentId && (payload.courier_company_id || !awbCode)) {
        try {
          const assignRes = await assignCourierAwb(shipmentId, payload.courier_company_id);
          if (assignRes.success && assignRes.awbCode) {
            awbCode = assignRes.awbCode;
            if (assignRes.courierName) courierName = assignRes.courierName;
          }
        } catch (e) {
          console.warn('[Shiprocket] Courier assignment warning:', e);
        }
      }

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
        message: awbCode
          ? `Order created & AWB (${awbCode} - ${courierName}) assigned via Shiprocket!`
          : 'Order successfully created in Shiprocket!',
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
    const { ok, data } = await safeParseApiResponse(res);

    if (ok && data.tracking_data) {
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
    const { ok, data } = await safeParseApiResponse(res);
    if (ok && data.label_url) {
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
    const { ok, data } = await safeParseApiResponse(res);
    if (ok && (data.response?.pickup_scheduled_date || data.pickup_status === 1)) {
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
 * Generate Shipping Manifest PDF for shipments
 * Endpoint: POST /v1/external/manifests/generate
 */
export async function generateManifest(shipmentIds: (number | string)[]): Promise<{
  success: boolean;
  manifestUrl?: string;
  message: string;
  raw?: any;
}> {
  try {
    const headers = await getAuthHeaders();
    const res = await fetch(`${getApiBaseUrl()}/manifests/generate`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        shipment_id: shipmentIds.map(Number)
      })
    });
    const { ok, data } = await safeParseApiResponse(res);
    if (ok && (data.status === 1 || data.manifest_url)) {
      return {
        success: true,
        manifestUrl: data.manifest_url,
        message: 'Manifest generated successfully!',
        raw: data
      };
    }
    return {
      success: false,
      message: data.message || 'AWB must be assigned and pickup requested to generate manifest.'
    };
  } catch (e: any) {
    return {
      success: false,
      message: e.message || 'Network error generating manifest'
    };
  }
}

/**
 * Print Shipping Manifest
 * Endpoint: POST /v1/external/manifests/print
 */
export async function printManifest(orderIds: (number | string)[]): Promise<{
  success: boolean;
  manifestUrl?: string;
  message: string;
}> {
  try {
    const headers = await getAuthHeaders();
    const res = await fetch(`${getApiBaseUrl()}/manifests/print`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        order_ids: orderIds.map(Number)
      })
    });
    const { ok, data } = await safeParseApiResponse(res);
    if (ok && data.manifest_url) {
      return {
        success: true,
        manifestUrl: data.manifest_url,
        message: 'Manifest ready for print'
      };
    }
    return {
      success: false,
      message: data.message || 'Manifest print failed. Manifest must be generated first.'
    };
  } catch (e: any) {
    return {
      success: false,
      message: e.message || 'Network error printing manifest'
    };
  }
}

/**
 * Fetch Weight Discrepancies from Shiprocket Billing API
 * Endpoint: GET /v1/external/billing/discrepancy
 */
export async function getWeightDiscrepancies(): Promise<{
  success: boolean;
  discrepancies: any[];
  upperFoldText?: string;
  lowerFoldText?: string;
  message?: string;
}> {
  try {
    const headers = await getAuthHeaders();
    const res = await fetch(`${getApiBaseUrl()}/billing/discrepancy`, {
      method: 'GET',
      headers
    });
    const { ok, data } = await safeParseApiResponse(res);
    if (ok && (data.status === 200 || Array.isArray(data.data))) {
      return {
        success: true,
        discrepancies: data.data || [],
        upperFoldText: data.upper_fold_text,
        lowerFoldText: data.lower_fild_text || data.lower_fold_text
      };
    }
    return {
      success: false,
      discrepancies: [],
      message: data.message || 'No discrepancy data returned from Shiprocket'
    };
  } catch (e: any) {
    return {
      success: false,
      discrepancies: [],
      message: e.message || 'Error fetching discrepancy data'
    };
  }
}

/**
 * Cancel an Order in Shiprocket
 * Endpoint: POST /v1/external/orders/cancel
 */
export async function cancelShiprocketOrder(orderIds: (number | string)[]): Promise<{
  success: boolean;
  message: string;
}> {
  try {
    const headers = await getAuthHeaders();
    const res = await fetch(`${getApiBaseUrl()}/orders/cancel`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        ids: orderIds.map(id => isNaN(Number(id)) ? id : Number(id))
      })
    });
    const { ok, data } = await safeParseApiResponse(res);
    if (ok && (data.status === 200 || data.status_code === 200)) {
      return {
        success: true,
        message: data.message || 'Order cancelled successfully in Shiprocket!'
      };
    }
    return {
      success: false,
      message: data.message || 'Failed to cancel order in Shiprocket.'
    };
  } catch (e: any) {
    return {
      success: false,
      message: e.message || 'Network exception cancelling order'
    };
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
