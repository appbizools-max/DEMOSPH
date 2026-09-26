import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Linking,
  ScrollView,
  TextInput,
  Alert,
  ActivityIndicator
} from 'react-native';
import { Feather, MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { collection, onSnapshot, query, orderBy, limit, doc, getDoc } from 'firebase/firestore';
import { db } from '@app/shared';

export const DEFAULT_SHIPROCKET_API_KEY = '';
const SHIPROCKET_PORTAL_URL = 'https://app.shiprocket.in';
const SHIPROCKET_TRACK_PUBLIC_URL = 'https://shiprocket.co/tracking';
const SHIPROCKET_API_BASE = 'https://apiv2.shiprocket.in/v1/external';

async function safeParseResponse(res: Response): Promise<{ ok: boolean; status: number; data: any }> {
  let text = '';
  try {
    text = await res.text();
  } catch {
    text = '';
  }
  let parsed: any = null;
  try {
    parsed = text ? JSON.parse(text) : null;
  } catch {
    parsed = null;
  }

  if (!res.ok || res.status === 401) {
    const trimmed = text.trim();
    if (res.status === 401 || trimmed.toLowerCase().includes('invalid token') || trimmed.toLowerCase().includes('unauthorized')) {
      return {
        ok: false,
        status: 401,
        data: {
          message: 'Shiprocket Authentication Notice: Token is invalid or expired. Please generate a new JWT token in Shiprocket Setup on the Web Portal.'
        }
      };
    }
  }

  return {
    ok: res.ok,
    status: res.status,
    data: parsed || (text ? { message: text.trim() } : {})
  };
}

export const ShiprocketScreen: React.FC = () => {
  const [apiKey, setApiKey] = useState(DEFAULT_SHIPROCKET_API_KEY);
  const [activeTab, setActiveTab] = useState<'track' | 'rates' | 'recent' | 'portal'>('track');

  // Track State
  const [awbNumber, setAwbNumber] = useState('');
  const [isTracking, setIsTracking] = useState(false);
  const [trackingResult, setTrackingResult] = useState<any | null>(null);
  const [trackingError, setTrackingError] = useState<string | null>(null);
  // Rate Calculator State
  const [pickupPostcode, setPickupPostcode] = useState('500072');
  const [deliveryPostcode, setDeliveryPostcode] = useState('');
  const [calcWeight, setCalcWeight] = useState('0.5');
  const [calcLength, setCalcLength] = useState('10');
  const [calcBreadth, setCalcBreadth] = useState('10');
  const [calcHeight, setCalcHeight] = useState('10');
  const [isCalculatingRates, setIsCalculatingRates] = useState(false);
  const [rateResults, setRateResults] = useState<any[]>([]);
  const [rateError, setRateError] = useState<string | null>(null);

  // Recent Shipments
  const [recentShipments, setRecentShipments] = useState<any[]>([]);
  const [isLoadingShipments, setIsLoadingShipments] = useState(true);
  // Load API config from Firestore
  useEffect(() => {
    if (!db) return;
    const fetchConfig = async () => {
      try {
        const snap = await getDoc(doc(db, 'settings', 'shiprocket'));
        if (snap.exists()) {
          const data = snap.data();
          if (data.token || data.apiKey) {
            setApiKey(data.token || data.apiKey);
          }
        }
      } catch (e) {
        console.warn('Error fetching shiprocket config in mobile:', e);
      }
    };
    fetchConfig();
    // Listen to recent shipments
    const q = query(collection(db, 'shipments'), orderBy('created_at', 'desc'), limit(15));
    const unsub = onSnapshot(q, (snapshot) => {
      const list: any[] = [];
      snapshot.forEach(docSnap => {
        list.push({ id: docSnap.id, ...docSnap.data() });
      });
      setRecentShipments(list);
      setIsLoadingShipments(false);
    }, (err) => {
      console.warn('Shipments listener error:', err);
      setIsLoadingShipments(false);
    });

    return () => unsub();
  }, []);
  const handleOpenPortal = (url: string = SHIPROCKET_PORTAL_URL) => {
    Linking.openURL(url).catch(() => {
      Alert.alert('Error', 'Unable to open Shiprocket link. Please verify internet connection.');
    });
  };
  // Perform Live Tracking using Shiprocket API
  const handleLiveTrack = async (targetAwb?: string) => {
    const code = (targetAwb || awbNumber).trim();
    if (!code) {
      Alert.alert('Missing AWB', 'Please enter an AWB or Order Tracking code.');
      return;
    }
    setIsTracking(true);
    setTrackingResult(null);
    setTrackingError(null);
    try {
      let activeKey = (apiKey || DEFAULT_SHIPROCKET_API_KEY).trim();
      if (activeKey.startsWith('Bearer ')) activeKey = activeKey.slice(7).trim();
      if (!activeKey) {
        setTrackingError('Shiprocket account not connected. Please log in on the Web Portal under Shiprocket Setup.');
        return;
      }

      const res = await fetch(`${SHIPROCKET_API_BASE}/courier/track/awb/${encodeURIComponent(code)}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${activeKey}`
        }
      });

      const { ok, data } = await safeParseResponse(res);

      if (ok && data.tracking_data) {
        const trackData = data.tracking_data;
        const shipmentData = trackData.shipment_track?.[0] || trackData.shipment_track_activities?.[0] || {};
        setTrackingResult({
          awb: code,
          courier: shipmentData.courier_name || trackData.courier_name || 'Standard Courier',
          status: shipmentData.current_status || trackData.track_status || 'In Transit',
          origin: shipmentData.origin || 'Hyderabad, Telangana',
          destination: shipmentData.destination || '-',
          etd: shipmentData.edd || trackData.expected_date || '-',
          scans: trackData.shipment_track_activities || []
        });
      } else {
        // Fallback or public tracking option
        setTrackingError(data.message || 'Tracking details not yet updated by courier partner.');
      }
    } catch (err: any) {
      // If direct API blocked, allow opening public web tracking
      setTrackingError('Direct API network timeout. You can open live tracking in browser.');
    } finally {
      setIsTracking(false);
    }
  };

  // Check Courier Serviceability & Rates with Shiprocket Volumetric Weight Calculation
  const handleCalculateRates = async () => {
    if (!deliveryPostcode || deliveryPostcode.length !== 6) {
      Alert.alert('Invalid Pincode', 'Please enter a valid 6-digit delivery pincode.');
      return;
    }

    setIsCalculatingRates(true);
    setRateResults([]);
    setRateError(null);

    try {
      let activeKey = (apiKey || DEFAULT_SHIPROCKET_API_KEY).trim();
      if (activeKey.startsWith('Bearer ')) activeKey = activeKey.slice(7).trim();
      if (!activeKey) {
        setRateError('Shiprocket account not connected. Please log in on the Web Portal under Shiprocket Setup.');
        return;
      }

      const deadWeight = parseFloat(calcWeight) || 0.5;
      const l = parseFloat(calcLength) || 10;
      const b = parseFloat(calcBreadth) || 10;
      const h = parseFloat(calcHeight) || 10;

      // Shiprocket Volumetric Weight Formula: (L x B x H) / 5000
      const volWeight = (l * b * h) / 5000;
      const chargeableWeight = Math.max(deadWeight, volWeight);

      const url = `${SHIPROCKET_API_BASE}/courier/serviceability?pickup_postcode=${pickupPostcode}&delivery_postcode=${deliveryPostcode}&weight=${chargeableWeight.toFixed(2)}&cod=0&length=${l}&breadth=${b}&height=${h}`;

      const res = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${activeKey}`
        }
      });

      const { ok, data } = await safeParseResponse(res);
      if (ok && data.data?.available_courier_companies?.length > 0) {
        setRateResults(data.data.available_courier_companies);
      } else {
        setRateError(data.message || 'No available courier partners found for this destination pincode.');
      }
    } catch (e: any) {
      setRateError('Failed to fetch courier serviceability. Check internet or API key.');
    } finally {
      setIsCalculatingRates(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer} showsVerticalScrollIndicator={false}>
      {/* Top Banner */}
      <View style={styles.headerCard}>
        <View style={styles.headerLeft}>
          <View style={styles.iconCircle}>
            <MaterialCommunityIcons name="truck-fast" size={26} color="#ffffff" />
          </View>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={styles.headerTitle}>Shiprocket Dispatch</Text>
              <View style={styles.liveBadge}>
                <View style={styles.liveDot} />
                <Text style={styles.liveBadgeText}>API ACTIVE</Text>
              </View>
            </View>
            <Text style={styles.headerSub}>Medicine parcel booking, rate calculator & courier tracking</Text>
          </View>
        </View>

        {/* API Key info chip */}
        <View style={styles.apiKeyChip}>
          <Feather name="key" size={12} color="#a5b4fc" />
          <Text style={styles.apiKeyText}>
            Key: {apiKey.slice(0, 8)}••••••••{apiKey.slice(-6)}
          </Text>
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'track' && styles.tabButtonActive]}
          onPress={() => setActiveTab('track')}
        >
          <Feather name="navigation" size={14} color={activeTab === 'track' ? '#4f46e5' : '#64748b'} />
          <Text style={[styles.tabButtonText, activeTab === 'track' && styles.tabButtonTextActive]}>Track AWB</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'rates' && styles.tabButtonActive]}
          onPress={() => setActiveTab('rates')}
        >
          <MaterialCommunityIcons name="calculator" size={15} color={activeTab === 'rates' ? '#4f46e5' : '#64748b'} />
          <Text style={[styles.tabButtonText, activeTab === 'rates' && styles.tabButtonTextActive]}>Rates & ETA</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'recent' && styles.tabButtonActive]}
          onPress={() => setActiveTab('recent')}
        >
          <Feather name="package" size={14} color={activeTab === 'recent' ? '#4f46e5' : '#64748b'} />
          <Text style={[styles.tabButtonText, activeTab === 'recent' && styles.tabButtonTextActive]}>
            Dispatches ({recentShipments.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'portal' && styles.tabButtonActive]}
          onPress={() => setActiveTab('portal')}
        >
          <Feather name="external-link" size={14} color={activeTab === 'portal' ? '#4f46e5' : '#64748b'} />
          <Text style={[styles.tabButtonText, activeTab === 'portal' && styles.tabButtonTextActive]}>Portal</Text>
        </TouchableOpacity>
      </View>

      {/* TAB 1: TRACK AWB */}
      {activeTab === 'track' && (
        <View>
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>
              <Feather name="search" size={15} color="#4f46e5" /> Live Shipment Tracker
            </Text>
            <Text style={styles.sectionDesc}>Enter courier Airway Bill (AWB) number to track delivery progress:</Text>

            <View style={styles.searchRow}>
              <View style={styles.inputWrapper}>
                <Feather name="package" size={16} color="#94a3b8" style={{ marginRight: 8 }} />
                <TextInput
                  style={styles.textInput}
                  placeholder="e.g. 143258790123 / AWB"
                  placeholderTextColor="#94a3b8"
                  value={awbNumber}
                  onChangeText={setAwbNumber}
                  autoCapitalize="none"
                  returnKeyType="search"
                  onSubmitEditing={() => handleLiveTrack()}
                />
                {awbNumber.length > 0 && (
                  <TouchableOpacity onPress={() => setAwbNumber('')} style={{ padding: 4 }}>
                    <Ionicons name="close-circle" size={16} color="#94a3b8" />
                  </TouchableOpacity>
                )}
              </View>

              <TouchableOpacity
                style={styles.trackBtn}
                onPress={() => handleLiveTrack()}
                disabled={isTracking}
                activeOpacity={0.8}
              >
                {isTracking ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <>
                    <Feather name="navigation" size={14} color="#ffffff" />
                    <Text style={styles.trackBtnText}>Track</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>

            {/* Tracking Result View */}
            {trackingResult && (
              <View style={styles.resultBox}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <View>
                    <Text style={styles.resultAwb}>AWB #{trackingResult.awb}</Text>
                    <Text style={styles.resultCourier}>{trackingResult.courier}</Text>
                  </View>
                  <View style={styles.statusBadge}>
                    <Text style={styles.statusBadgeText}>{trackingResult.status}</Text>
                  </View>
                </View>

                <View style={styles.routeRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.routeLabel}>ORIGIN</Text>
                    <Text style={styles.routeVal}>{trackingResult.origin}</Text>
                  </View>
                  <Feather name="arrow-right" size={16} color="#94a3b8" />
                  <View style={{ flex: 1, alignItems: 'flex-end' }}>
                    <Text style={styles.routeLabel}>DESTINATION</Text>
                    <Text style={styles.routeVal}>{trackingResult.destination}</Text>
                  </View>
                </View>

                <View style={styles.eddRow}>
                  <Feather name="calendar" size={13} color="#2563eb" />
                  <Text style={styles.eddText}>Estimated Delivery: {trackingResult.etd}</Text>
                </View>

                {trackingResult.scans && trackingResult.scans.length > 0 && (
                  <View style={{ marginTop: 14 }}>
                    <Text style={styles.scansTitle}>Recent Scan Activities:</Text>
                    {trackingResult.scans.slice(0, 4).map((scan: any, i: number) => (
                      <View key={i} style={styles.scanItem}>
                        <View style={styles.scanDot} />
                        <View style={{ flex: 1 }}>
                          <Text style={styles.scanStatus}>{scan.activity || scan.status}</Text>
                          <Text style={styles.scanMeta}>{scan.location} • {scan.date}</Text>
                        </View>
                      </View>
                    ))}
                  </View>
                )}

                <TouchableOpacity
                  style={styles.openPublicBtn}
                  onPress={() => Linking.openURL(`${SHIPROCKET_TRACK_PUBLIC_URL}/${encodeURIComponent(trackingResult.awb)}`)}
                >
                  <Feather name="external-link" size={13} color="#4f46e5" />
                  <Text style={styles.openPublicBtnText}>Open Public Courier Tracking Page</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Error / Fallback with Browser Track */}
            {trackingError && (
              <View style={styles.errorBox}>
                <Feather name="info" size={16} color="#d97706" style={{ marginTop: 2 }} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.errorText}>{trackingError}</Text>
                  {awbNumber.trim().length > 0 && (
                    <TouchableOpacity
                      onPress={() => Linking.openURL(`${SHIPROCKET_TRACK_PUBLIC_URL}/${encodeURIComponent(awbNumber.trim())}`)}
                      style={{ marginTop: 6 }}
                    >
                      <Text style={styles.errorLink}>Open "{awbNumber.trim()}" on Shiprocket Web Tracker &rarr;</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            )}
          </View>
        </View>
      )}

      {/* TAB 2: RATE & ETA CALCULATOR */}
      {activeTab === 'rates' && (
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>
            <MaterialCommunityIcons name="calculator" size={16} color="#4f46e5" /> Courier Rates & Serviceability
          </Text>
          <Text style={styles.sectionDesc}>Check courier partner delivery fees & speed for medicines:</Text>

          <View style={{ gap: 12, marginBottom: 14 }}>
            <View>
              <Text style={styles.inputLabel}>Pickup Pincode (Clinic Warehouse)</Text>
              <TextInput
                style={styles.formInput}
                value={pickupPostcode}
                onChangeText={setPickupPostcode}
                keyboardType="numeric"
                maxLength={6}
              />
            </View>

            <View>
              <Text style={styles.inputLabel}>Delivery Pincode (Patient Address)</Text>
              <TextInput
                style={styles.formInput}
                placeholder="e.g. 500038 / 500072"
                placeholderTextColor="#94a3b8"
                value={deliveryPostcode}
                onChangeText={setDeliveryPostcode}
                keyboardType="numeric"
                maxLength={6}
              />
            </View>

            <View>
              <Text style={styles.inputLabel}>Parcel Dead Weight (Kg)</Text>
              <TextInput
                style={styles.formInput}
                value={calcWeight}
                onChangeText={setCalcWeight}
                keyboardType="decimal-pad"
              />
            </View>

            {/* Box Dimensions */}
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <View style={{ flex: 1 }}>
                <Text style={styles.inputLabel}>Length (cm)</Text>
                <TextInput
                  style={styles.formInput}
                  value={calcLength}
                  onChangeText={setCalcLength}
                  keyboardType="numeric"
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.inputLabel}>Breadth (cm)</Text>
                <TextInput
                  style={styles.formInput}
                  value={calcBreadth}
                  onChangeText={setCalcBreadth}
                  keyboardType="numeric"
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.inputLabel}>Height (cm)</Text>
                <TextInput
                  style={styles.formInput}
                  value={calcHeight}
                  onChangeText={setCalcHeight}
                  keyboardType="numeric"
                />
              </View>
            </View>

            {/* Shiprocket Volumetric Weight Breakdown */}
            {(() => {
              const actual = parseFloat(calcWeight) || 0.5;
              const l = parseFloat(calcLength) || 10;
              const b = parseFloat(calcBreadth) || 10;
              const h = parseFloat(calcHeight) || 10;
              const vol = Number(((l * b * h) / 5000).toFixed(3));
              const chargeable = Number(Math.max(actual, vol).toFixed(3));
              return (
                <View style={{
                  backgroundColor: '#f1f5f9',
                  borderRadius: 10,
                  padding: 12,
                  borderWidth: 1,
                  borderColor: '#cbd5e1'
                }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                    <Text style={{ fontSize: 11, fontWeight: '700', color: '#475569' }}>
                      Shiprocket Weight Calculation
                    </Text>
                    <Text style={{ fontSize: 10, fontWeight: '700', color: '#4f46e5' }}>
                      (L×B×H)/5000
                    </Text>
                  </View>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text style={{ fontSize: 11, color: '#64748b' }}>Dead: {actual} kg</Text>
                    <Text style={{ fontSize: 11, color: '#64748b' }}>Vol: {vol} kg</Text>
                    <Text style={{ fontSize: 12, fontWeight: '800', color: '#16a34a' }}>
                      Chargeable: {chargeable} kg
                    </Text>
                  </View>
                </View>
              );
            })()}

            <TouchableOpacity
              style={styles.primaryBtn}
              onPress={handleCalculateRates}
              disabled={isCalculatingRates}
              activeOpacity={0.8}
            >
              {isCalculatingRates ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <>
                  <Feather name="search" size={15} color="#ffffff" />
                  <Text style={styles.primaryBtnText}>Fetch Available Couriers & Rates</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          {rateError && (
            <View style={styles.errorBox}>
              <Feather name="alert-triangle" size={16} color="#ef4444" />
              <Text style={[styles.errorText, { color: '#b91c1c' }]}>{rateError}</Text>
            </View>
          )}

          {rateResults.length > 0 && (
            <View style={{ marginTop: 14 }}>
              <Text style={styles.courierListTitle}>Available Delivery Partners ({rateResults.length}):</Text>
              {rateResults.slice(0, 8).map((c: any, i: number) => {
                const isAir = c.mode === 0 || c.is_surface === 0 || /air/i.test(c.courier_name || '') || /express/i.test(c.courier_name || '');
                return (
                  <View key={i} style={styles.courierCard}>
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Text style={styles.courierName}>{c.courier_name}</Text>
                        <View style={{
                          backgroundColor: isAir ? '#dbeafe' : '#f1f5f9',
                          paddingHorizontal: 5,
                          paddingVertical: 1,
                          borderRadius: 4
                        }}>
                          <Text style={{ fontSize: 9.5, fontWeight: '700', color: isAir ? '#1d4ed8' : '#475569' }}>
                            {isAir ? 'Air' : 'Surface'}
                          </Text>
                        </View>
                      </View>
                      <Text style={styles.courierEtd}>Est. Delivery: {c.estimated_delivery_days || c.etd} days</Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={styles.courierRate}>₹{c.rate}</Text>
                      <Text style={styles.courierRating}>Rating: {c.rating || 4.2} ★</Text>
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </View>
      )}

      {/* TAB 3: RECENT DISPATCHES */}
      {activeTab === 'recent' && (
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>
            <Feather name="package" size={15} color="#4f46e5" /> Recent Clinic Shipments
          </Text>
          <Text style={styles.sectionDesc}>Parcels dispatched through Shiprocket from web or clinic terminals:</Text>

          {isLoadingShipments ? (
            <ActivityIndicator size="small" color="#4f46e5" style={{ marginVertical: 20 }} />
          ) : recentShipments.length === 0 ? (
            <View style={{ padding: 24, alignItems: 'center' }}>
              <Feather name="inbox" size={32} color="#cbd5e1" style={{ marginBottom: 8 }} />
              <Text style={{ fontSize: 13, color: '#64748b', fontWeight: '600' }}>No shipments recorded yet</Text>
              <Text style={{ fontSize: 11.5, color: '#94a3b8', textAlign: 'center', marginTop: 4 }}>
                Dispatches created on Web Reception or Mobile will appear here with live AWB status.
              </Text>
            </View>
          ) : (
            <View style={{ gap: 10, marginTop: 10 }}>
              {recentShipments.map(s => (
                <View key={s.id} style={styles.shipmentCard}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.shipmentPatient}>{s.patient_name || 'Patient Package'}</Text>
                      <Text style={styles.shipmentMeta}>
                        Order #{s.order_id} • {s.destination || s.city || 'Telangana'} ({s.pincode})
                      </Text>
                    </View>
                    <View style={styles.shipmentBadge}>
                      <Text style={styles.shipmentBadgeText}>{s.status || 'BOOKED'}</Text>
                    </View>
                  </View>

                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#f1f5f9' }}>
                    <View>
                      <Text style={{ fontSize: 11, color: '#64748b' }}>
                        AWB: <Text style={{ fontWeight: '700', color: '#0f172a' }}>{s.awb_code || 'Pending Assign'}</Text>
                      </Text>
                    </View>
                    {s.awb_code ? (
                      <TouchableOpacity
                        style={styles.miniTrackBtn}
                        onPress={() => {
                          setAwbNumber(s.awb_code);
                          setActiveTab('track');
                          handleLiveTrack(s.awb_code);
                        }}
                      >
                        <Feather name="navigation" size={12} color="#ffffff" />
                        <Text style={styles.miniTrackBtnText}>Track</Text>
                      </TouchableOpacity>
                    ) : null}
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>
      )}

      {/* TAB 4: QUICK PORTAL OPERATIONS */}
      {activeTab === 'portal' && (
        <View>
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>
              <MaterialCommunityIcons name="web" size={16} color="#4f46e5" /> Shiprocket Operations
            </Text>
            <Text style={styles.sectionDesc}>One-tap shortcuts to Shiprocket merchant portal modules:</Text>

            <View style={styles.portalGrid}>
              <TouchableOpacity
                style={styles.portalCard}
                onPress={() => handleOpenPortal('https://app.shiprocket.in/orders')}
                activeOpacity={0.7}
              >
                <View style={[styles.portalIconBox, { backgroundColor: '#eff6ff' }]}>
                  <Feather name="plus-circle" size={20} color="#2563eb" />
                </View>
                <Text style={styles.portalCardTitle}>New Orders</Text>
                <Text style={styles.portalCardSub}>Create or view pending shipments</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.portalCard}
                onPress={() => handleOpenPortal('https://app.shiprocket.in/shipments')}
                activeOpacity={0.7}
              >
                <View style={[styles.portalIconBox, { backgroundColor: '#f0fdf4' }]}>
                  <MaterialCommunityIcons name="truck-delivery-outline" size={22} color="#16a34a" />
                </View>
                <Text style={styles.portalCardTitle}>All Couriers</Text>
                <Text style={styles.portalCardSub}>In-transit, delivered & RTOs</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.portalCard}
                onPress={() => handleOpenPortal('https://app.shiprocket.in/manifest')}
                activeOpacity={0.7}
              >
                <View style={[styles.portalIconBox, { backgroundColor: '#fdf4ff' }]}>
                  <Feather name="printer" size={20} color="#9333ea" />
                </View>
                <Text style={styles.portalCardTitle}>Print Labels</Text>
                <Text style={styles.portalCardSub}>Download barcode manifests</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.portalCard}
                onPress={() => handleOpenPortal('https://app.shiprocket.in/pickups')}
                activeOpacity={0.7}
              >
                <View style={[styles.portalIconBox, { backgroundColor: '#fff7ed' }]}>
                  <Feather name="clock" size={20} color="#ea580c" />
                </View>
                <Text style={styles.portalCardTitle}>Pickups</Text>
                <Text style={styles.portalCardSub}>Schedule courier executive pickup</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.fullPortalBtn}
              onPress={() => handleOpenPortal(SHIPROCKET_PORTAL_URL)}
              activeOpacity={0.8}
            >
              <Feather name="external-link" size={15} color="#ffffff" />
              <Text style={styles.fullPortalBtnText}>Launch Shiprocket Full Web Dashboard</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Protocol Checklist Card */}
      <View style={styles.infoCard}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 }}>
          <Feather name="shield" size={16} color="#0284c7" />
          <Text style={styles.infoTitle}>Clinic Medicine Dispatch Checklist</Text>
        </View>
        <Text style={styles.infoBullet}>• Verify patient delivery pincode & mobile number before packing.</Text>
        <Text style={styles.infoBullet}>• Wrap homeopathic bottles in bubble protection to prevent breakage.</Text>
        <Text style={styles.infoBullet}>• Paste AWB shipping label clearly on package top surface.</Text>
        <Text style={styles.infoBullet}>• Maintain physical signature on manifest sheet during courier handover.</Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 40,
  },
  headerCard: {
    backgroundColor: '#1e1b4b',
    borderRadius: 16,
    padding: 18,
    marginBottom: 14,
    shadowColor: '#1e1b4b',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 4,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  iconCircle: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: '#4f46e5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#ffffff',
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#064e3b',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#059669',
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#34d399',
  },
  liveBadgeText: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#a7f3d0',
    letterSpacing: 0.5,
  },
  headerSub: {
    fontSize: 12,
    color: '#cbd5e1',
    marginTop: 2,
    lineHeight: 16,
  },
  apiKeyChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#312e81',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#4338ca',
  },
  apiKeyText: {
    fontSize: 11,
    color: '#c7d2fe',
    fontFamily: 'monospace',
    fontWeight: '600',
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 4,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    gap: 4,
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 8,
    borderRadius: 8,
  },
  tabButtonActive: {
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#c7d2fe',
  },
  tabButtonText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#64748b',
  },
  tabButtonTextActive: {
    color: '#4f46e5',
    fontWeight: '700',
  },
  sectionCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 3,
  },
  sectionDesc: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 12,
  },
  searchRow: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
  },
  inputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 44,
  },
  textInput: {
    flex: 1,
    fontSize: 13,
    color: '#0f172a',
    paddingVertical: 0,
  },
  trackBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#4f46e5',
    paddingHorizontal: 16,
    height: 44,
    borderRadius: 10,
    justifyContent: 'center',
    minWidth: 80,
  },
  trackBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  resultBox: {
    marginTop: 16,
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  resultAwb: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a',
  },
  resultCourier: {
    fontSize: 12,
    color: '#4f46e5',
    fontWeight: '600',
    marginTop: 2,
  },
  statusBadge: {
    backgroundColor: '#dcfce7',
    borderWidth: 1,
    borderColor: '#86efac',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#15803d',
    textTransform: 'uppercase',
  },
  routeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    padding: 10,
    borderRadius: 8,
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  routeLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#94a3b8',
    marginBottom: 2,
  },
  routeVal: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
  },
  eddRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#eff6ff',
    padding: 8,
    borderRadius: 6,
    marginTop: 8,
  },
  eddText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#1e40af',
  },
  scansTitle: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#475569',
    marginBottom: 8,
  },
  scanItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 8,
  },
  scanDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#6366f1',
    marginTop: 4,
  },
  scanStatus: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1e293b',
  },
  scanMeta: {
    fontSize: 10.5,
    color: '#64748b',
    marginTop: 1,
  },
  openPublicBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingTop: 12,
    marginTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  openPublicBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#4f46e5',
  },
  errorBox: {
    marginTop: 12,
    backgroundColor: '#fffbeb',
    borderWidth: 1,
    borderColor: '#fef3c7',
    padding: 12,
    borderRadius: 10,
    flexDirection: 'row',
    gap: 8,
    alignItems: 'flex-start',
  },
  errorText: {
    fontSize: 12,
    color: '#b45309',
    fontWeight: '500',
    lineHeight: 16,
  },
  errorLink: {
    fontSize: 12,
    color: '#4f46e5',
    fontWeight: '700',
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 4,
  },
  formInput: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 13,
    color: '#0f172a',
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#4f46e5',
    paddingVertical: 12,
    borderRadius: 10,
    marginTop: 4,
  },
  primaryBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  courierListTitle: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 8,
  },
  courierCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
  },
  courierName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
  },
  courierEtd: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
  },
  courierRate: {
    fontSize: 14,
    fontWeight: '800',
    color: '#16a34a',
  },
  courierRating: {
    fontSize: 10.5,
    fontWeight: '600',
    color: '#d97706',
    marginTop: 2,
  },
  shipmentCard: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    padding: 12,
  },
  shipmentPatient: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#0f172a',
  },
  shipmentMeta: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
  },
  shipmentBadge: {
    backgroundColor: '#dbeafe',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 4,
  },
  shipmentBadgeText: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#1d4ed8',
  },
  miniTrackBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#4f46e5',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  miniTrackBtnText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700',
  },
  portalGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 14,
  },
  portalCard: {
    width: '48%',
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  portalIconBox: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  portalCardTitle: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 2,
  },
  portalCardSub: {
    fontSize: 10.5,
    color: '#64748b',
  },
  fullPortalBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#1e1b4b',
    paddingVertical: 12,
    borderRadius: 10,
  },
  fullPortalBtnText: {
    color: '#ffffff',
    fontSize: 12.5,
    fontWeight: '700',
  },
  infoCard: {
    backgroundColor: '#f0f9ff',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#bae6fd',
    marginTop: 4,
  },
  infoTitle: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#0369a1',
  },
  infoBullet: {
    fontSize: 11,
    color: '#334155',
    lineHeight: 16,
    marginTop: 2,
  },
});
