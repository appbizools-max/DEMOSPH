import React, { useState, useEffect } from 'react';
import {
  Truck,
  Package,
  Search,
  ExternalLink,
  RefreshCw,
  PlusCircle,
  CheckCircle2,
  Clock,
  AlertCircle,
  ShieldCheck,
  MapPin,
  IndianRupee,
  Calendar,
  FileText,
  ChevronRight,
  Settings,
  Globe,
  ArrowRight,
  Printer,
  Navigation,
  Key,
  Layers,
  Send,
  Sparkles,
  Info,
  Building2,
  Scale,
  Plane,
  Check,
  XCircle
} from 'lucide-react';
import {
  getShiprocketConfig,
  saveShiprocketConfig,
  authenticateShiprocket,
  createCustomShiprocketOrder,
  getPickupLocations,
  checkCourierServiceability,
  trackByAwb,
  generateShippingLabel,
  requestCourierPickup,
  generateManifest,
  printManifest,
  getWeightDiscrepancies,
  cancelShiprocketOrder,
  getClinicShipmentRecords,
  saveClinicShipmentRecord,
  addShiprocketPickupLocation,
  calculateShiprocketWeight,
  ShiprocketConfig,
  CourierServiceabilityItem,
  TrackingResult,
  ClinicShipmentRecord,
  CreateShipmentPayload
} from '../../../services/shiprocketService';

const SHIPROCKET_PORTAL_URL = 'https://app.shiprocket.in';

export const ShiprocketPage: React.FC = () => {
  // Navigation Tabs
  const [activeTab, setActiveTab] = useState<'shipments' | 'create' | 'track' | 'rates' | 'discrepancy' | 'settings' | 'portal'>('shipments');
  // Config State
  const [config, setConfig] = useState<ShiprocketConfig>({
    email: '',
    password: '',
    token: '',
    pickupLocation: 'Primary',
    defaultWeight: 0.5,
    defaultLength: 10,
    defaultBreadth: 10,
    defaultHeight: 10,
    isConnected: false
  });
  const [isConfigLoading, setIsConfigLoading] = useState(true);
  const [isConnecting, setIsConnecting] = useState(false);
  const [configMessage, setConfigMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [shipments, setShipments] = useState<ClinicShipmentRecord[]>([]);
  const [isShipmentsLoading, setIsShipmentsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Create Order Form State with Full Pickup Location Fields
  const [orderForm, setOrderForm] = useState<{
    orderId: string;
    patientName: string;
    phone: string;
    email: string;
    address: string;
    city: string;
    state: string;
    pincode: string;
    pickupLocation: string;
    pickupContactName: string;
    pickupPhone: string;
    pickupEmail: string;
    pickupAddress: string;
    pickupAddress2: string;
    pickupCity: string;
    pickupState: string;
    pickupPincode: string;
    itemName: string;
    itemUnits: number;
    sellingPrice: number;
    paymentMethod: 'Prepaid' | 'COD';
    weight: number;
    length: number;
    breadth: number;
    height: number;
    comments: string;
    selectedCourierId?: number | null;
    selectedCourierName?: string;
    selectedCourierRate?: number | null;
    selectedCourierMode?: string;
    selectedCourierEtd?: string;
  }>({
    orderId: `SPH-${Math.floor(100000 + Math.random() * 900000)}`,
    patientName: '',
    phone: '',
    email: '',
    address: '',
    city: '',
    state: '',
    pincode: '',
    pickupLocation: '',
    pickupContactName: '',
    pickupPhone: '',
    pickupEmail: '',
    pickupAddress: '',
    pickupAddress2: '',
    pickupCity: '',
    pickupState: '',
    pickupPincode: '',
    itemName: '',
    itemUnits: 1,
    sellingPrice: '' as any,
    paymentMethod: 'Prepaid',
    weight: 0.5,
    length: 10,
    breadth: 10,
    height: 10,
    comments: '',
    selectedCourierId: null as number | null,
    selectedCourierName: '',
    selectedCourierRate: null as number | null,
    selectedCourierMode: '',
    selectedCourierEtd: ''
  });

  const [formCouriers, setFormCouriers] = useState<CourierServiceabilityItem[]>([]);
  const [isFormCouriersLoading, setIsFormCouriersLoading] = useState(false);
  const [formCouriersError, setFormCouriersError] = useState<string | null>(null);

  const [isSubmittingOrder, setIsSubmittingOrder] = useState(false);
  const [orderResult, setOrderResult] = useState<{ success: boolean; message: string; details?: any } | null>(null);

  const [isRegisteringPickup, setIsRegisteringPickup] = useState(false);
  const [pickupRegisterMsg, setPickupRegisterMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleRegisterPickupWithShiprocket = async () => {
    if (!orderForm.pickupLocation.trim()) {
      alert('Please enter a Pickup Location Name / Code.');
      return;
    }
    if (!orderForm.pickupAddress.trim()) {
      alert('Please enter a Pickup Street Address.');
      return;
    }
    if (!orderForm.pickupPincode.trim() || orderForm.pickupPincode.trim().length !== 6) {
      alert('Please enter a valid 6-digit Pickup Pincode.');
      return;
    }

    setIsRegisteringPickup(true);
    setPickupRegisterMsg(null);
    try {
      const res = await addShiprocketPickupLocation({
        pickup_location: orderForm.pickupLocation,
        name: orderForm.pickupContactName || 'Clinic Reception',
        email: orderForm.pickupEmail || 'sphclinics@gmail.com',
        phone: orderForm.pickupPhone || '8125384387',
        address: orderForm.pickupAddress,
        address_2: orderForm.pickupAddress2,
        city: orderForm.pickupCity || 'Hyderabad',
        state: orderForm.pickupState || 'Telangana',
        country: 'India',
        pin_code: orderForm.pickupPincode
      });
      if (res.success) {
        setPickupRegisterMsg({ type: 'success', text: res.message || 'Pickup location registered with Shiprocket successfully!' });
      } else {
        setPickupRegisterMsg({ type: 'error', text: res.message || 'Failed to register pickup location in Shiprocket' });
      }
    } catch (e: any) {
      setPickupRegisterMsg({ type: 'error', text: e.message || 'Error communicating with Shiprocket' });
    } finally {
      setIsRegisteringPickup(false);
    }
  };

  // Tracking State
  const [trackInput, setTrackInput] = useState('');
  const [isTrackingLoading, setIsTrackingLoading] = useState(false);
  const [trackingData, setTrackingData] = useState<TrackingResult | null>(null);
  const [trackingError, setTrackingError] = useState<string | null>(null);

  // Rates Calculator State
  const [pickupPincode, setPickupPincode] = useState('500081');
  const [deliveryPincode, setDeliveryPincode] = useState('');
  const [rateWeight, setRateWeight] = useState(0.5);
  const [rateLength, setRateLength] = useState(10);
  const [rateBreadth, setRateBreadth] = useState(10);
  const [rateHeight, setRateHeight] = useState(10);
  const [rateCod, setRateCod] = useState(false);
  const [rateResults, setRateResults] = useState<CourierServiceabilityItem[]>([]);
  const [isRateLoading, setIsRateLoading] = useState(false);
  const [rateError, setRateError] = useState<string | null>(null);

  // Iframe Reload Key
  const [iframeKey, setIframeKey] = useState(0);

  // Modal / Quick action states
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  // Load Initial Data
  useEffect(() => {
    loadConfiguration();
    loadShipments();
  }, []);

  const loadConfiguration = async () => {
    setIsConfigLoading(true);
    try {
      const cfg = await getShiprocketConfig();
      setConfig(cfg);

    } catch (e) {
      console.warn('Config load error', e);
    } finally {
      setIsConfigLoading(false);
    }
  };

  const loadShipments = async () => {
    setIsShipmentsLoading(true);
    try {
      const list = await getClinicShipmentRecords();
      setShipments(list);
    } catch (e) {
      console.warn('Shipments load error', e);
    } finally {
      setIsShipmentsLoading(false);
    }
  };

  // Handle Shiprocket Authentication
  const handleConnectShiprocket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!config.email || !config.password) {
      setConfigMessage({ type: 'error', text: 'Please enter both Shiprocket account Email and Password.' });
      return;
    }
    setIsConnecting(true);
    setConfigMessage(null);
    try {
      const res = await authenticateShiprocket(config.email, config.password);
      if (res.success && res.token) {
        setConfig(prev => ({ ...prev, token: res.token, isConnected: true }));
        setConfigMessage({ type: 'success', text: 'Connected to Shiprocket API successfully! API Token updated.' });
      } else {
        setConfigMessage({ type: 'error', text: res.message || 'Authentication failed' });
      }
    } catch (err: any) {
      setConfigMessage({ type: 'error', text: err.message || 'Error communicating with Shiprocket' });
    } finally {
      setIsConnecting(false);
    }
  };

  // Handle Warehouse Defaults Save
  const handleSaveConfig = async () => {
    try {
      const saved = await saveShiprocketConfig({
        pickupLocation: config.pickupLocation || 'Primary',
        defaultWeight: config.defaultWeight || 0.5
      });
      setConfig(saved);
      setConfigMessage({ type: 'success', text: 'Warehouse & parcel defaults saved successfully!' });
      setTimeout(() => setConfigMessage(null), 4000);
    } catch (e: any) {
      setConfigMessage({ type: 'error', text: e.message || 'Failed to save configuration' });
    }
  };

  // Handle Order Submission
  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!orderForm.patientName.trim()) {
      alert('Please enter patient recipient name.');
      return;
    }
    if (!orderForm.phone.trim() || orderForm.phone.replace(/\D/g, '').length < 10) {
      alert('Please enter a valid 10-digit mobile number.');
      return;
    }
    if (!orderForm.address.trim()) {
      alert('Please enter delivery address.');
      return;
    }
    if (!orderForm.pincode.trim() || orderForm.pincode.trim().length !== 6) {
      alert('Please enter a valid 6-digit postal pincode.');
      return;
    }

    setIsSubmittingOrder(true);
    setOrderResult(null);

    // Calculate official Shiprocket Chargeable Weight: Max(Dead Weight, (L*B*H)/5000)
    const weightCalc = calculateShiprocketWeight(
      orderForm.weight,
      orderForm.length,
      orderForm.breadth,
      orderForm.height
    );

    const payload: CreateShipmentPayload = {
      order_id: orderForm.orderId,
      pickup_location: orderForm.pickupLocation || config.pickupLocation || 'Primary',
      billing_customer_name: orderForm.patientName,
      billing_address: orderForm.address,
      billing_city: orderForm.city || 'Hyderabad',
      billing_pincode: orderForm.pincode,
      billing_state: orderForm.state || 'Telangana',
      billing_country: 'India',
      billing_email: orderForm.email || 'sphclinics@gmail.com',
      billing_phone: orderForm.phone,
      shipping_is_billing: true,
      order_items: [
        {
          name: orderForm.itemName || 'Homeopathic Medicines',
          sku: 'MED-PACK-01',
          units: Number(orderForm.itemUnits) || 1,
          selling_price: Number(orderForm.sellingPrice) || 0
        }
      ],
      payment_method: orderForm.paymentMethod,
      sub_total: Number(orderForm.sellingPrice) || 0,
      length: Number(orderForm.length) || 10,
      breadth: Number(orderForm.breadth) || 10,
      height: Number(orderForm.height) || 10,
      weight: weightCalc.chargeableWeight,
      branch_name: orderForm.pickupLocation || 'Primary',
      comment: orderForm.comments || 'Spiritual Homeopathy Medicine Dispatch',
      courier_company_id: orderForm.selectedCourierId || undefined,
      courier_name: orderForm.selectedCourierName || undefined
    };

    try {
      const res = await createCustomShiprocketOrder(payload);
      if (res.success) {
        setOrderResult({
          success: true,
          message: `Shipment order created successfully! Order ID: ${res.orderId}`,
          details: res
        });

        // Refresh list
        loadShipments();

        // Reset Order ID & fields for next parcel
        setOrderForm(prev => ({
          ...prev,
          orderId: `SPH-${Math.floor(100000 + Math.random() * 900000)}`,
          patientName: '',
          phone: '',
          email: '',
          address: '',
          city: '',
          pincode: '',
          selectedCourierId: null,
          selectedCourierName: '',
          selectedCourierRate: null,
          selectedCourierMode: '',
          selectedCourierEtd: ''
        }));
        setFormCouriers([]);
      } else {
        setOrderResult({
          success: false,
          message: res.message || 'Shiprocket order creation failed. Please check your credentials or parameters.',
          details: res.raw
        });
      }
    } catch (err: any) {
      setOrderResult({
        success: false,
        message: err.message || 'Unexpected error creating order'
      });
    } finally {
      setIsSubmittingOrder(false);
    }
  };

  // Fetch available Shiprocket courier methods directly for the active dispatch form
  const handleFetchOrderCouriers = async () => {
    const pickupPin = (orderForm.pickupPincode || '500072').trim();
    const deliveryPin = (orderForm.pincode || '').trim();
    if (!deliveryPin || deliveryPin.length !== 6) {
      setFormCouriersError('Please enter a valid 6-digit Patient Delivery Pincode in Section 2.');
      return;
    }
    if (!pickupPin || pickupPin.length !== 6) {
      setFormCouriersError('Please enter a valid 6-digit Pickup Pincode in Section 1.');
      return;
    }

    const weightInfo = calculateShiprocketWeight(
      orderForm.weight,
      orderForm.length,
      orderForm.breadth,
      orderForm.height
    );

    setIsFormCouriersLoading(true);
    setFormCouriersError(null);
    setFormCouriers([]);

    try {
      const res = await checkCourierServiceability(
        pickupPin,
        deliveryPin,
        weightInfo.chargeableWeight,
        orderForm.paymentMethod === 'COD',
        {
          length: Number(orderForm.length) || 10,
          breadth: Number(orderForm.breadth) || 10,
          height: Number(orderForm.height) || 10,
          declaredValue: Number(orderForm.sellingPrice) || 0
        }
      );

      if (res.success && res.couriers.length > 0) {
        setFormCouriers(res.couriers);
        // Default to lowest rate courier if not already picked
        if (!orderForm.selectedCourierId) {
          const cheapest = [...res.couriers].sort((a, b) => a.rate - b.rate)[0];
          if (cheapest) {
            setOrderForm(prev => ({
              ...prev,
              selectedCourierId: cheapest.courier_company_id,
              selectedCourierName: cheapest.courier_name,
              selectedCourierRate: cheapest.rate,
              selectedCourierMode: cheapest.mode || 'Surface',
              selectedCourierEtd: cheapest.etd
            }));
          }
        }
      } else {
        setFormCouriersError(res.message || 'No serviceable Shiprocket couriers found for this route.');
      }
    } catch (err: any) {
      setFormCouriersError(err.message || 'Error checking Shiprocket courier serviceability');
    } finally {
      setIsFormCouriersLoading(false);
    }
  };

  // Handle Track AWB
  const handleTrackSubmit = async (awbToTrack?: string) => {
    const code = (awbToTrack || trackInput).trim();
    if (!code) {
      setTrackingError('Please enter an AWB tracking code.');
      return;
    }

    setIsTrackingLoading(true);
    setTrackingError(null);
    setTrackingData(null);

    try {
      const res = await trackByAwb(code);
      if (res.success && res.data) {
        setTrackingData(res.data);
      } else {
        setTrackingError(res.message || 'No tracking information found for this AWB number.');
      }
    } catch (e: any) {
      setTrackingError(e.message || 'Error fetching tracking details');
    } finally {
      setIsTrackingLoading(false);
    }
  };

  // Handle Rate Calculation
  const handleCheckRates = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pickupPincode.trim() || pickupPincode.trim().length !== 6) {
      setRateError('Please enter a valid 6-digit pickup pincode.');
      return;
    }
    if (!deliveryPincode.trim() || deliveryPincode.trim().length !== 6) {
      setRateError('Please enter a valid 6-digit delivery pincode.');
      return;
    }

    const weightCalc = calculateShiprocketWeight(rateWeight, rateLength, rateBreadth, rateHeight);

    setIsRateLoading(true);
    setRateError(null);
    setRateResults([]);

    try {
      const res = await checkCourierServiceability(
        pickupPincode,
        deliveryPincode,
        weightCalc.chargeableWeight,
        rateCod,
        {
          length: Number(rateLength) || 10,
          breadth: Number(rateBreadth) || 10,
          height: Number(rateHeight) || 10
        }
      );
      if (res.success && res.couriers.length > 0) {
        setRateResults(res.couriers);
      } else {
        setRateError(res.message || 'No couriers serviceable for this route.');
      }
    } catch (e: any) {
      setRateError(e.message || 'Error checking courier rates');
    } finally {
      setIsRateLoading(false);
    }
  };

  // Quick Action: Print Label
  const handlePrintLabel = async (shipment: ClinicShipmentRecord) => {
    if (!shipment.shipment_id) {
      alert('Shipment ID is missing for this record. Label cannot be generated yet.');
      return;
    }
    setActionNotice(`Generating label for Order ${shipment.order_id}...`);
    try {
      const res = await generateShippingLabel(shipment.shipment_id);
      if (res.success && res.labelUrl) {
        window.open(res.labelUrl, '_blank');
        setActionNotice(`Label opened for printing in a new tab.`);
      } else {
        alert(res.message || 'Could not generate label from Shiprocket.');
      }
    } catch (e: any) {
      alert('Label generation error: ' + e.message);
    } finally {
      setTimeout(() => setActionNotice(null), 4000);
    }
  };

  // Quick Action: Request Pickup
  const handleRequestPickup = async (shipment: ClinicShipmentRecord) => {
    if (!shipment.shipment_id) {
      alert('Shipment ID is required to request courier pickup.');
      return;
    }
    setActionNotice(`Scheduling courier pickup for Order ${shipment.order_id}...`);
    try {
      const res = await requestCourierPickup(shipment.shipment_id);
      if (res.success) {
        alert(`Pickup Scheduled Successfully! Pickup Token: ${res.pickupToken || 'Confirmed'}`);
        loadShipments();
      } else {
        alert(res.message || 'Could not schedule pickup with Shiprocket.');
      }
    } catch (e: any) {
      alert('Pickup request error: ' + e.message);
    } finally {
      setActionNotice(null);
    }
  };

  // Quick Action: Generate Manifest
  const handleGenerateManifest = async (shipment: ClinicShipmentRecord) => {
    if (!shipment.shipment_id) {
      alert('Shipment ID is missing for this record. Manifest cannot be generated.');
      return;
    }
    setActionNotice(`Generating shipping manifest for Order ${shipment.order_id}...`);
    try {
      const res = await generateManifest([shipment.shipment_id]);
      if (res.success && res.manifestUrl) {
        window.open(res.manifestUrl, '_blank');
        setActionNotice(`Manifest PDF opened in a new tab.`);
      } else {
        alert(res.message || 'Manifest generation failed. AWB must be assigned and pickup requested first.');
      }
    } catch (e: any) {
      alert('Manifest generation error: ' + e.message);
    } finally {
      setTimeout(() => setActionNotice(null), 4000);
    }
  };

  // Quick Action: Cancel Order in Shiprocket
  const handleCancelOrder = async (shipment: ClinicShipmentRecord) => {
    const idToCancel = shipment.shipment_id || shipment.order_id;
    if (!idToCancel) return;
    if (!window.confirm(`Are you sure you want to cancel Order ${shipment.order_id} in Shiprocket?`)) {
      return;
    }
    setActionNotice(`Cancelling Order ${shipment.order_id} in Shiprocket...`);
    try {
      const res = await cancelShiprocketOrder([idToCancel]);
      if (res.success) {
        alert(res.message || 'Order successfully cancelled in Shiprocket!');
        loadShipments();
      } else {
        alert(res.message || 'Could not cancel order in Shiprocket.');
      }
    } catch (e: any) {
      alert('Order cancellation error: ' + e.message);
    } finally {
      setActionNotice(null);
    }
  };

  // Discrepancy State & Loader
  const [discrepancies, setDiscrepancies] = useState<any[]>([]);
  const [discrepancyText, setDiscrepancyText] = useState<{ upper?: string; lower?: string }>({});
  const [isDiscrepancyLoading, setIsDiscrepancyLoading] = useState(false);
  const [discrepancyError, setDiscrepancyError] = useState<string | null>(null);

  const loadDiscrepancies = async () => {
    setIsDiscrepancyLoading(true);
    setDiscrepancyError(null);
    try {
      const res = await getWeightDiscrepancies();
      if (res.success) {
        setDiscrepancies(res.discrepancies);
        setDiscrepancyText({ upper: res.upperFoldText, lower: res.lowerFoldText });
      } else {
        setDiscrepancyError(res.message || 'No discrepancy data returned.');
      }
    } catch (e: any) {
      setDiscrepancyError(e.message || 'Error loading discrepancy data');
    } finally {
      setIsDiscrepancyLoading(false);
    }
  };

  // Filter Shipments
  const filteredShipments = shipments.filter(s => {
    const matchesSearch =
      s.order_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.patient_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.patient_phone.includes(searchQuery) ||
      (s.awb_code && s.awb_code.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesStatus =
      statusFilter === 'ALL' ||
      (statusFilter === 'DELIVERED' && s.status.toLowerCase().includes('delivered')) ||
      (statusFilter === 'IN_TRANSIT' && (s.status.toLowerCase().includes('transit') || s.status.toLowerCase().includes('awb'))) ||
      (statusFilter === 'NEW' && (s.status.toLowerCase().includes('new') || s.status.toLowerCase().includes('order')));

    return matchesSearch && matchesStatus;
  });

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      {/* Top Banner & Header */}
      <div style={{
        background: '#ffffff',
        borderRadius: '16px',
        padding: '20px 24px',
        marginBottom: '20px',
        border: '1px solid #e2e8f0',
        boxShadow: '0 4px 16px rgba(0,0,0,0.03)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '16px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{
            background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
            padding: '14px',
            borderRadius: '14px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(79, 70, 229, 0.25)'
          }}>
            <Truck size={26} color="#ffffff" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <h1 style={{ fontSize: '22px', fontWeight: 800, color: '#0f172a', margin: 0, letterSpacing: '-0.3px' }}>
                Shiprocket Dispatch & Logistics
              </h1>
              <span style={{
                fontSize: '11px',
                fontWeight: 700,
                padding: '3px 10px',
                borderRadius: '20px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                background: config.isConnected || config.token ? '#f0fdf4' : '#fffbeb',
                color: config.isConnected || config.token ? '#16a34a' : '#b45309',
                border: `1px solid ${config.isConnected || config.token ? '#bbf7d0' : '#fde68a'}`
              }}>
                <span style={{
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  background: config.isConnected || config.token ? '#16a34a' : '#f59e0b'
                }} />
                {config.isConnected || config.token ? 'API Connected' : 'API Unconfigured'}
              </span>
            </div>
            <p style={{ fontSize: '13.5px', color: '#64748b', margin: '4px 0 0 0', fontWeight: 500 }}>
              Dispatch clinic medicines, generate courier AWBs, track live parcels & estimate delivery rates
            </p>
          </div>
        </div>

        {/* Quick Action Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <button
            onClick={() => setActiveTab('create')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
              color: '#ffffff',
              border: 'none',
              padding: '10px 18px',
              borderRadius: '10px',
              fontSize: '13px',
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(79, 70, 229, 0.25)',
              transition: 'all 0.2s ease'
            }}
          >
            <PlusCircle size={16} /> New Parcel Dispatch
          </button>

          <button
            onClick={() => setActiveTab('rates')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: '#f8fafc',
              color: '#334155',
              border: '1px solid #cbd5e1',
              padding: '10px 16px',
              borderRadius: '10px',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
          >
            <IndianRupee size={15} /> Rate Calculator
          </button>

          <button
            onClick={() => setActiveTab('settings')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: '#f8fafc',
              color: '#334155',
              border: '1px solid #cbd5e1',
              padding: '10px 16px',
              borderRadius: '10px',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
          >
            <Settings size={15} /> API Settings
          </button>
        </div>
      </div>

      {actionNotice && (
        <div style={{
          background: '#eff6ff',
          border: '1px solid #bfdbfe',
          borderRadius: '10px',
          padding: '10px 16px',
          marginBottom: '16px',
          color: '#1d4ed8',
          fontSize: '13px',
          fontWeight: 600,
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <Sparkles size={16} /> {actionNotice}
        </div>
      )}

      {/* Navigation Tabs Bar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        borderBottom: '2px solid #e2e8f0',
        marginBottom: '22px',
        overflowX: 'auto',
        paddingBottom: '2px'
      }}>
        {[
          { id: 'shipments', label: 'All Dispatches & Shipments', icon: Package, count: shipments.length },
          { id: 'create', label: 'Create New Shipment', icon: PlusCircle },
          { id: 'track', label: 'Track Live Shipment', icon: Navigation },
          { id: 'rates', label: 'Rate & ETA Calculator', icon: IndianRupee },
          { id: 'discrepancy', label: 'Weight Audits & Webhooks', icon: Scale },
          { id: 'settings', label: 'Shiprocket API Setup', icon: Settings },
          { id: 'portal', label: 'Shiprocket Web Console', icon: Globe }
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '11px 18px',
                fontSize: '13.5px',
                fontWeight: isActive ? 700 : 500,
                color: isActive ? '#4f46e5' : '#64748b',
                background: isActive ? '#f5f3ff' : 'transparent',
                border: 'none',
                borderBottom: isActive ? '3px solid #4f46e5' : '3px solid transparent',
                borderRadius: '8px 8px 0 0',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'all 0.15s ease'
              }}
            >
              <Icon size={16} color={isActive ? '#4f46e5' : '#64748b'} />
              {tab.label}
              {typeof tab.count === 'number' && (
                <span style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  padding: '2px 7px',
                  borderRadius: '12px',
                  background: isActive ? '#e0e7ff' : '#f1f5f9',
                  color: isActive ? '#4338ca' : '#64748b'
                }}>
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: ALL SHIPMENTS & ORDERS */}
      {/* ========================================================================= */}
      {activeTab === 'shipments' && (
        <div>
          {/* Quick Metrics */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '16px',
            marginBottom: '20px'
          }}>
            <div style={{
              background: '#ffffff',
              padding: '16px 20px',
              borderRadius: '14px',
              border: '1px solid #e2e8f0',
              display: 'flex',
              alignItems: 'center',
              gap: '14px'
            }}>
              <div style={{ background: '#e0e7ff', padding: '12px', borderRadius: '12px' }}>
                <Package size={22} color="#4338ca" />
              </div>
              <div>
                <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>Total Dispatches</div>
                <div style={{ fontSize: '22px', fontWeight: 800, color: '#0f172a' }}>{shipments.length}</div>
              </div>
            </div>

            <div style={{
              background: '#ffffff',
              padding: '16px 20px',
              borderRadius: '14px',
              border: '1px solid #e2e8f0',
              display: 'flex',
              alignItems: 'center',
              gap: '14px'
            }}>
              <div style={{ background: '#dcfce7', padding: '12px', borderRadius: '12px' }}>
                <CheckCircle2 size={22} color="#15803d" />
              </div>
              <div>
                <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>Delivered Parcels</div>
                <div style={{ fontSize: '22px', fontWeight: 800, color: '#15803d' }}>
                  {shipments.filter(s => s.status.toLowerCase().includes('delivered')).length}
                </div>
              </div>
            </div>

            <div style={{
              background: '#ffffff',
              padding: '16px 20px',
              borderRadius: '14px',
              border: '1px solid #e2e8f0',
              display: 'flex',
              alignItems: 'center',
              gap: '14px'
            }}>
              <div style={{ background: '#fef3c7', padding: '12px', borderRadius: '12px' }}>
                <Truck size={22} color="#b45309" />
              </div>
              <div>
                <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>In Transit / Out</div>
                <div style={{ fontSize: '22px', fontWeight: 800, color: '#b45309' }}>
                  {shipments.filter(s => s.status.toLowerCase().includes('transit') || s.status.toLowerCase().includes('awb')).length}
                </div>
              </div>
            </div>

            <div style={{
              background: '#ffffff',
              padding: '16px 20px',
              borderRadius: '14px',
              border: '1px solid #e2e8f0',
              display: 'flex',
              alignItems: 'center',
              gap: '14px'
            }}>
              <div style={{ background: '#fee2e2', padding: '12px', borderRadius: '12px' }}>
                <Clock size={22} color="#b91c1c" />
              </div>
              <div>
                <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>New / Pending Pickup</div>
                <div style={{ fontSize: '22px', fontWeight: 800, color: '#b91c1c' }}>
                  {shipments.filter(s => s.status.toLowerCase().includes('new') || s.status.toLowerCase().includes('placed')).length}
                </div>
              </div>
            </div>
          </div>

          {/* Search and Filters */}
          <div style={{
            background: '#ffffff',
            borderRadius: '14px',
            border: '1px solid #e2e8f0',
            padding: '16px 20px',
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '14px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: '1', minWidth: '260px' }}>
              <div style={{
                position: 'relative',
                width: '100%',
                maxWidth: '420px'
              }}>
                <Search size={16} color="#94a3b8" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                <input
                  type="text"
                  placeholder="Search by Order ID, Patient, Phone, or AWB..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '9px 12px 9px 38px',
                    borderRadius: '10px',
                    border: '1px solid #cbd5e1',
                    fontSize: '13px',
                    outline: 'none'
                  }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>Filter:</span>
              {(['ALL', 'NEW', 'IN_TRANSIT', 'DELIVERED'] as const).map(f => (
                <button
                  key={f}
                  onClick={() => setStatusFilter(f)}
                  style={{
                    padding: '6px 14px',
                    borderRadius: '8px',
                    fontSize: '12px',
                    fontWeight: 600,
                    border: '1px solid',
                    borderColor: statusFilter === f ? '#4f46e5' : '#cbd5e1',
                    background: statusFilter === f ? '#e0e7ff' : '#ffffff',
                    color: statusFilter === f ? '#4338ca' : '#475569',
                    cursor: 'pointer'
                  }}
                >
                  {f === 'ALL' ? 'All' : f === 'IN_TRANSIT' ? 'In Transit' : f === 'NEW' ? 'New Orders' : 'Delivered'}
                </button>
              ))}

              <button
                onClick={loadShipments}
                title="Refresh Dispatches"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '7px 12px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  background: '#f8fafc',
                  color: '#475569',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  marginLeft: '6px'
                }}
              >
                <RefreshCw size={13} className={isShipmentsLoading ? 'spin' : ''} />
              </button>
            </div>
          </div>

          {/* Shipments Table */}
          <div style={{
            background: '#ffffff',
            borderRadius: '16px',
            border: '1px solid #e2e8f0',
            overflow: 'hidden',
            boxShadow: '0 4px 14px rgba(0,0,0,0.03)'
          }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', fontWeight: 700 }}>
                    <th style={{ padding: '14px 16px' }}>Order ID & Date</th>
                    <th style={{ padding: '14px 16px' }}>Patient / Recipient</th>
                    <th style={{ padding: '14px 16px' }}>Destination</th>
                    <th style={{ padding: '14px 16px' }}>Items & Weight</th>
                    <th style={{ padding: '14px 16px' }}>Courier / AWB</th>
                    <th style={{ padding: '14px 16px' }}>Status</th>
                    <th style={{ padding: '14px 16px' }}>Payment</th>
                    <th style={{ padding: '14px 16px', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredShipments.length === 0 ? (
                    <tr>
                      <td colSpan={8} style={{ padding: '48px 20px', textAlign: 'center', color: '#64748b' }}>
                        <Package size={42} color="#cbd5e1" style={{ margin: '0 auto 12px auto', display: 'block' }} />
                        <div style={{ fontSize: '15px', fontWeight: 700, color: '#334155' }}>
                          No Shiprocket shipments found
                        </div>
                        <p style={{ fontSize: '13px', margin: '6px 0 16px 0', color: '#64748b' }}>
                          Dispatch your first medicine parcel to generate tracking and courier AWBs.
                        </p>
                        <button
                          onClick={() => setActiveTab('create')}
                          style={{
                            background: '#4f46e5',
                            color: '#ffffff',
                            border: 'none',
                            padding: '8px 18px',
                            borderRadius: '8px',
                            fontSize: '12.5px',
                            fontWeight: 700,
                            cursor: 'pointer'
                          }}
                        >
                          + Create First Shipment
                        </button>
                      </td>
                    </tr>
                  ) : (
                    filteredShipments.map((s, idx) => (
                      <tr
                        key={s.id || idx}
                        style={{
                          borderBottom: '1px solid #f1f5f9',
                          transition: 'background 0.15s ease'
                        }}
                      >
                        <td style={{ padding: '14px 16px' }}>
                          <div style={{ fontWeight: 700, color: '#0f172a' }}>{s.order_id}</div>
                          <div style={{ fontSize: '11.5px', color: '#94a3b8', marginTop: '2px' }}>
                            {s.created_at ? new Date(s.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Recent'}
                          </div>
                        </td>

                        <td style={{ padding: '14px 16px' }}>
                          <div style={{ fontWeight: 600, color: '#1e293b' }}>{s.patient_name}</div>
                          <div style={{ fontSize: '12px', color: '#64748b' }}>+91 {s.patient_phone}</div>
                        </td>

                        <td style={{ padding: '14px 16px' }}>
                          <div style={{ color: '#334155', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <MapPin size={13} color="#64748b" /> {s.destination || 'Hyderabad'}
                          </div>
                          <div style={{ fontSize: '11px', color: '#94a3b8', paddingLeft: '17px' }}>
                            PIN: {s.pincode}
                          </div>
                        </td>

                        <td style={{ padding: '14px 16px' }}>
                          <div style={{ color: '#334155', fontWeight: 500, maxWidth: '200px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {s.items_summary || 'Medicine Pack'}
                          </div>
                          <div style={{ fontSize: '11.5px', color: '#64748b' }}>
                            {s.weight_kg ? `${s.weight_kg} kg` : '0.5 kg'}
                          </div>
                        </td>

                        <td style={{ padding: '14px 16px' }}>
                          {s.awb_code ? (
                            <div>
                              <div style={{ fontWeight: 700, color: '#4f46e5', cursor: 'pointer' }} onClick={() => { setTrackInput(s.awb_code!); setActiveTab('track'); handleTrackSubmit(s.awb_code); }}>
                                {s.awb_code}
                              </div>
                              <div style={{ fontSize: '11px', color: '#64748b' }}>{s.courier_name || 'Assigned Courier'}</div>
                            </div>
                          ) : (
                            <span style={{ fontSize: '12px', color: '#94a3b8', fontStyle: 'italic' }}>AWB Pending</span>
                          )}
                        </td>

                        <td style={{ padding: '14px 16px' }}>
                          <span style={{
                            padding: '4px 10px',
                            borderRadius: '12px',
                            fontSize: '11.5px',
                            fontWeight: 700,
                            display: 'inline-block',
                            background: s.status.toLowerCase().includes('delivered')
                              ? '#dcfce7'
                              : s.status.toLowerCase().includes('transit')
                                ? '#fef3c7'
                                : '#e0e7ff',
                            color: s.status.toLowerCase().includes('delivered')
                              ? '#15803d'
                              : s.status.toLowerCase().includes('transit')
                                ? '#b45309'
                                : '#4338ca'
                          }}>
                            {s.status}
                          </span>
                        </td>

                        <td style={{ padding: '14px 16px' }}>
                          <div style={{ fontWeight: 700, color: '#0f172a' }}>₹{s.amount || 0}</div>
                          <span style={{
                            fontSize: '10.5px',
                            fontWeight: 600,
                            color: s.payment_method === 'COD' ? '#b45309' : '#15803d'
                          }}>
                            {s.payment_method}
                          </span>
                        </td>

                        <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '6px' }}>
                            {s.awb_code && (
                              <button
                                onClick={() => {
                                  setTrackInput(s.awb_code!);
                                  setActiveTab('track');
                                  handleTrackSubmit(s.awb_code);
                                }}
                                title="Track live package"
                                style={{
                                  padding: '6px 10px',
                                  borderRadius: '6px',
                                  border: '1px solid #cbd5e1',
                                  background: '#ffffff',
                                  color: '#4f46e5',
                                  fontSize: '12px',
                                  fontWeight: 600,
                                  cursor: 'pointer'
                                }}
                              >
                                Track
                              </button>
                            )}

                            {s.shipment_id && (
                              <button
                                onClick={() => handlePrintLabel(s)}
                                title="Print shipping label"
                                style={{
                                  padding: '6px 10px',
                                  borderRadius: '6px',
                                  border: '1px solid #cbd5e1',
                                  background: '#ffffff',
                                  color: '#475569',
                                  fontSize: '12px',
                                  cursor: 'pointer'
                                }}
                              >
                                <Printer size={13} />
                              </button>
                            )}

                            {s.shipment_id && (
                              <button
                                onClick={() => handleGenerateManifest(s)}
                                title="Generate Shipping Manifest PDF"
                                style={{
                                  padding: '6px 10px',
                                  borderRadius: '6px',
                                  border: '1px solid #cbd5e1',
                                  background: '#ffffff',
                                  color: '#4f46e5',
                                  fontSize: '12px',
                                  cursor: 'pointer'
                                }}
                              >
                                <FileText size={13} />
                              </button>
                            )}

                            <button
                              onClick={() => handleCancelOrder(s)}
                              title="Cancel Order in Shiprocket"
                              style={{
                                padding: '6px 10px',
                                borderRadius: '6px',
                                border: '1px solid #fecaca',
                                background: '#fef2f2',
                                color: '#ef4444',
                                fontSize: '12px',
                                cursor: 'pointer'
                              }}
                            >
                              <XCircle size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: CREATE NEW SHIPMENT / DISPATCH PARCEL */}
      {/* ========================================================================= */}
      {activeTab === 'create' && (
        <div style={{ maxWidth: '960px', margin: '0 auto' }}>
          <div style={{
            background: '#ffffff',
            borderRadius: '16px',
            border: '1px solid #e2e8f0',
            padding: '28px',
            boxShadow: '0 4px 16px rgba(0,0,0,0.03)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', borderBottom: '1px solid #f1f5f9', paddingBottom: '16px' }}>
              <div>
                <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                  Create Shiprocket Medicine Parcel Dispatch
                </h2>
                <p style={{ fontSize: '13px', color: '#64748b', margin: '3px 0 0 0' }}>
                  Generate a shipping order directly on Shiprocket with automated courier routing.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setOrderForm(prev => ({ ...prev, orderId: `SPH-${Math.floor(100000 + Math.random() * 900000)}` }))}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  background: '#f8fafc',
                  border: '1px solid #cbd5e1',
                  padding: '6px 12px',
                  borderRadius: '8px',
                  fontSize: '12px',
                  color: '#475569',
                  cursor: 'pointer'
                }}
              >
                <RefreshCw size={12} /> Regenerate ID
              </button>
            </div>

            {orderResult && (
              <div style={{
                borderRadius: '12px',
                padding: '14px 18px',
                marginBottom: '24px',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '12px',
                background: orderResult.success ? '#f0fdf4' : '#fef2f2',
                border: `1px solid ${orderResult.success ? '#bbf7d0' : '#fecaca'}`,
                color: orderResult.success ? '#15803d' : '#b91c1c'
              }}>
                {orderResult.success ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
                <div>
                  <div style={{ fontWeight: 700, fontSize: '14px' }}>
                    {orderResult.success ? 'Success!' : 'Order Creation Failed'}
                  </div>
                  <div style={{ fontSize: '13px', marginTop: '3px' }}>
                    {orderResult.message}
                  </div>
                  {orderResult.message?.includes('Shiprocket Authentication Notice') && (
                    <button
                      type="button"
                      onClick={() => setActiveTab('settings')}
                      style={{
                        marginTop: '10px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        background: '#4f46e5',
                        color: '#ffffff',
                        border: 'none',
                        padding: '7px 14px',
                        borderRadius: '8px',
                        fontSize: '12.5px',
                        fontWeight: 700,
                        cursor: 'pointer'
                      }}
                    >
                      <Settings size={14} /> Open Shiprocket API Setup
                    </button>
                  )}
                  {orderResult.details?.awbCode && (
                    <div style={{ marginTop: '8px', fontSize: '12.5px', fontWeight: 600 }}>
                      Assigned AWB: <span style={{ color: '#4f46e5' }}>{orderResult.details.awbCode}</span> ({orderResult.details.courierName})
                    </div>
                  )}
                </div>
              </div>
            )}

            <form onSubmit={handleCreateOrder}>
              {/* Section 1: Order ID & Complete Shiprocket Pickup Location */}
              <div style={{ marginBottom: '28px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                  <div style={{ fontSize: '13.5px', fontWeight: 800, color: '#4f46e5', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    1. Order ID & Shiprocket Pickup Location
                  </div>
                  <span style={{ fontSize: '11px', fontWeight: 700, color: '#16a34a', background: '#dcfce7', padding: '3px 8px', borderRadius: '6px' }}>
                    Courier Dispatch Point
                  </span>
                </div>

                {/* Order ID Input */}
                <div style={{ marginBottom: '18px', maxWidth: '320px' }}>
                  <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                    Shiprocket Order ID *
                  </label>
                  <input
                    type="text"
                    required
                    value={orderForm.orderId}
                    onChange={(e) => setOrderForm(prev => ({ ...prev, orderId: e.target.value }))}
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      fontSize: '13px',
                      fontWeight: 700,
                      background: '#ffffff',
                      color: '#0f172a'
                    }}
                  />
                </div>

                {/* Pickup Location Details Grid */}
                <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                    <div style={{ fontSize: '12.5px', fontWeight: 700, color: '#0f172a' }}>
                      Shiprocket Pickup Location Fields (Warehouse / Dispatch Point):
                    </div>
                    <button
                      type="button"
                      onClick={handleRegisterPickupWithShiprocket}
                      disabled={isRegisteringPickup}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '6px 12px',
                        borderRadius: '6px',
                        background: '#e0e7ff',
                        border: '1px solid #c7d2fe',
                        color: '#3730a3',
                        fontSize: '11.5px',
                        fontWeight: 700,
                        cursor: isRegisteringPickup ? 'not-allowed' : 'pointer'
                      }}
                    >
                      {isRegisteringPickup ? <RefreshCw size={12} className="spin" /> : <MapPin size={12} />}
                      Sync/Register in Shiprocket API
                    </button>
                  </div>

                  {pickupRegisterMsg && (
                    <div style={{
                      padding: '8px 12px',
                      borderRadius: '8px',
                      marginBottom: '14px',
                      fontSize: '12px',
                      fontWeight: 600,
                      background: pickupRegisterMsg.type === 'success' ? '#f0fdf4' : '#fef2f2',
                      border: `1px solid ${pickupRegisterMsg.type === 'success' ? '#bbf7d0' : '#fecaca'}`,
                      color: pickupRegisterMsg.type === 'success' ? '#15803d' : '#b91c1c'
                    }}>
                      {pickupRegisterMsg.text}
                    </div>
                  )}

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '5px' }}>
                        Pickup Location Code / Nickname *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. KPHB Clinic or Primary"
                        value={orderForm.pickupLocation}
                        onChange={(e) => setOrderForm(prev => ({ ...prev, pickupLocation: e.target.value }))}
                        style={{
                          width: '100%',
                          padding: '8px 12px',
                          borderRadius: '8px',
                          border: '1px solid #cbd5e1',
                          fontSize: '12.5px',
                          fontWeight: 600,
                          background: '#f8fafc'
                        }}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '5px' }}>
                        Dispatcher Contact Person *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Spiritual Homeopathy Dispatcher"
                        value={orderForm.pickupContactName}
                        onChange={(e) => setOrderForm(prev => ({ ...prev, pickupContactName: e.target.value }))}
                        style={{
                          width: '100%',
                          padding: '8px 12px',
                          borderRadius: '8px',
                          border: '1px solid #cbd5e1',
                          fontSize: '12.5px'
                        }}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '5px' }}>
                        Pickup Phone Number *
                      </label>
                      <input
                        type="tel"
                        required
                        placeholder="10-digit mobile"
                        value={orderForm.pickupPhone}
                        onChange={(e) => setOrderForm(prev => ({ ...prev, pickupPhone: e.target.value }))}
                        style={{
                          width: '100%',
                          padding: '8px 12px',
                          borderRadius: '8px',
                          border: '1px solid #cbd5e1',
                          fontSize: '12.5px'
                        }}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '5px' }}>
                        Pickup Email
                      </label>
                      <input
                        type="email"
                        placeholder="sphclinics@gmail.com"
                        value={orderForm.pickupEmail}
                        onChange={(e) => setOrderForm(prev => ({ ...prev, pickupEmail: e.target.value }))}
                        style={{
                          width: '100%',
                          padding: '8px 12px',
                          borderRadius: '8px',
                          border: '1px solid #cbd5e1',
                          fontSize: '12.5px'
                        }}
                      />
                    </div>

                    <div style={{ gridColumn: 'span 2' }}>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '5px' }}>
                        Pickup Street Address (Line 1) *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="Plot / Door No, Street, Colony"
                        value={orderForm.pickupAddress}
                        onChange={(e) => setOrderForm(prev => ({ ...prev, pickupAddress: e.target.value }))}
                        style={{
                          width: '100%',
                          padding: '8px 12px',
                          borderRadius: '8px',
                          border: '1px solid #cbd5e1',
                          fontSize: '12.5px'
                        }}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '5px' }}>
                        Landmark / Address Line 2
                      </label>
                      <input
                        type="text"
                        placeholder="Near Landmark / Hospital"
                        value={orderForm.pickupAddress2}
                        onChange={(e) => setOrderForm(prev => ({ ...prev, pickupAddress2: e.target.value }))}
                        style={{
                          width: '100%',
                          padding: '8px 12px',
                          borderRadius: '8px',
                          border: '1px solid #cbd5e1',
                          fontSize: '12.5px'
                        }}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '5px' }}>
                        City *
                      </label>
                      <input
                        type="text"
                        required
                        value={orderForm.pickupCity}
                        onChange={(e) => setOrderForm(prev => ({ ...prev, pickupCity: e.target.value }))}
                        style={{
                          width: '100%',
                          padding: '8px 12px',
                          borderRadius: '8px',
                          border: '1px solid #cbd5e1',
                          fontSize: '12.5px'
                        }}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '5px' }}>
                        State *
                      </label>
                      <input
                        type="text"
                        required
                        value={orderForm.pickupState}
                        onChange={(e) => setOrderForm(prev => ({ ...prev, pickupState: e.target.value }))}
                        style={{
                          width: '100%',
                          padding: '8px 12px',
                          borderRadius: '8px',
                          border: '1px solid #cbd5e1',
                          fontSize: '12.5px'
                        }}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '5px' }}>
                        Pickup Pincode *
                      </label>
                      <input
                        type="text"
                        required
                        maxLength={6}
                        placeholder="500072"
                        value={orderForm.pickupPincode}
                        onChange={(e) => setOrderForm(prev => ({ ...prev, pickupPincode: e.target.value.replace(/\D/g, '') }))}
                        style={{
                          width: '100%',
                          padding: '8px 12px',
                          borderRadius: '8px',
                          border: '1px solid #cbd5e1',
                          fontSize: '12.5px',
                          fontWeight: 700,
                          color: '#0f172a'
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Section 2: Patient Recipient Details */}
              <div style={{ marginBottom: '24px' }}>
                <div style={{ fontSize: '13px', fontWeight: 800, color: '#4f46e5', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '12px' }}>
                  2. Patient / Recipient Shipping Details
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px', marginBottom: '16px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                      Patient Full Name *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Ramesh Kumar"
                      value={orderForm.patientName}
                      onChange={(e) => setOrderForm(prev => ({ ...prev, patientName: e.target.value }))}
                      style={{
                        width: '100%',
                        padding: '9px 12px',
                        borderRadius: '8px',
                        border: '1px solid #cbd5e1',
                        fontSize: '13px'
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                      Mobile Number (10 digits) *
                    </label>
                    <input
                      type="tel"
                      required
                      placeholder="9876543210"
                      value={orderForm.phone}
                      onChange={(e) => setOrderForm(prev => ({ ...prev, phone: e.target.value.replace(/\D/g, '').slice(0, 10) }))}
                      style={{
                        width: '100%',
                        padding: '9px 12px',
                        borderRadius: '8px',
                        border: '1px solid #cbd5e1',
                        fontSize: '13px'
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                      Email Address (Optional)
                    </label>
                    <input
                      type="email"
                      value={orderForm.email}
                      onChange={(e) => setOrderForm(prev => ({ ...prev, email: e.target.value }))}
                      style={{
                        width: '100%',
                        padding: '9px 12px',
                        borderRadius: '8px',
                        border: '1px solid #cbd5e1',
                        fontSize: '13px'
                      }}
                    />
                  </div>
                </div>

                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                    Delivery Street Address *
                  </label>
                  <textarea
                    required
                    rows={2}
                    placeholder="House/Flat No, Landmark, Area street address"
                    value={orderForm.address}
                    onChange={(e) => setOrderForm(prev => ({ ...prev, address: e.target.value }))}
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      fontSize: '13px',
                      resize: 'vertical'
                    }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                      Postal Pincode (6 digits) *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. 500038"
                      value={orderForm.pincode}
                      onChange={(e) => setOrderForm(prev => ({ ...prev, pincode: e.target.value.replace(/\D/g, '').slice(0, 6) }))}
                      style={{
                        width: '100%',
                        padding: '9px 12px',
                        borderRadius: '8px',
                        border: '1px solid #cbd5e1',
                        fontSize: '13px',
                        fontWeight: 700
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                      City / District *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Hyderabad"
                      value={orderForm.city}
                      onChange={(e) => setOrderForm(prev => ({ ...prev, city: e.target.value }))}
                      style={{
                        width: '100%',
                        padding: '9px 12px',
                        borderRadius: '8px',
                        border: '1px solid #cbd5e1',
                        fontSize: '13px'
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                      State *
                    </label>
                    <input
                      type="text"
                      required
                      value={orderForm.state}
                      onChange={(e) => setOrderForm(prev => ({ ...prev, state: e.target.value }))}
                      style={{
                        width: '100%',
                        padding: '9px 12px',
                        borderRadius: '8px',
                        border: '1px solid #cbd5e1',
                        fontSize: '13px'
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Section 3: Parcel & Package Info */}
              <div style={{ marginBottom: '24px' }}>
                <div style={{ fontSize: '13px', fontWeight: 800, color: '#4f46e5', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '12px' }}>
                  3. Medicine Item, Box Size & Weight
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                      Item Description
                    </label>
                    <input
                      type="text"
                      value={orderForm.itemName}
                      onChange={(e) => setOrderForm(prev => ({ ...prev, itemName: e.target.value }))}
                      style={{
                        width: '100%',
                        padding: '9px 12px',
                        borderRadius: '8px',
                        border: '1px solid #cbd5e1',
                        fontSize: '13px'
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                      Quantity / Units
                    </label>
                    <input
                      type="number"
                      min={1}
                      value={orderForm.itemUnits}
                      onChange={(e) => setOrderForm(prev => ({ ...prev, itemUnits: Number(e.target.value) }))}
                      style={{
                        width: '100%',
                        padding: '9px 12px',
                        borderRadius: '8px',
                        border: '1px solid #cbd5e1',
                        fontSize: '13px'
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                      Total Declared Value (₹)
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={orderForm.sellingPrice}
                      onChange={(e) => setOrderForm(prev => ({ ...prev, sellingPrice: Number(e.target.value) }))}
                      style={{
                        width: '100%',
                        padding: '9px 12px',
                        borderRadius: '8px',
                        border: '1px solid #cbd5e1',
                        fontSize: '13px',
                        fontWeight: 700
                      }}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                      Weight (Kg) *
                    </label>
                    <input
                      type="number"
                      step="0.05"
                      min={0.1}
                      value={orderForm.weight}
                      onChange={(e) => setOrderForm(prev => ({ ...prev, weight: Number(e.target.value) }))}
                      style={{
                        width: '100%',
                        padding: '9px 12px',
                        borderRadius: '8px',
                        border: '1px solid #cbd5e1',
                        fontSize: '13px'
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                      Length (cm)
                    </label>
                    <input
                      type="number"
                      min={1}
                      value={orderForm.length}
                      onChange={(e) => setOrderForm(prev => ({ ...prev, length: Number(e.target.value) }))}
                      style={{
                        width: '100%',
                        padding: '9px 12px',
                        borderRadius: '8px',
                        border: '1px solid #cbd5e1',
                        fontSize: '13px'
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                      Breadth (cm)
                    </label>
                    <input
                      type="number"
                      min={1}
                      value={orderForm.breadth}
                      onChange={(e) => setOrderForm(prev => ({ ...prev, breadth: Number(e.target.value) }))}
                      style={{
                        width: '100%',
                        padding: '9px 12px',
                        borderRadius: '8px',
                        border: '1px solid #cbd5e1',
                        fontSize: '13px'
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                      Height (cm)
                    </label>
                    <input
                      type="number"
                      min={1}
                      value={orderForm.height}
                      onChange={(e) => setOrderForm(prev => ({ ...prev, height: Number(e.target.value) }))}
                      style={{
                        width: '100%',
                        padding: '9px 12px',
                        borderRadius: '8px',
                        border: '1px solid #cbd5e1',
                        fontSize: '13px'
                      }}
                    />
                  </div>
                </div>

                {/* Shiprocket Official Weight Calculation Card */}
                {(() => {
                  const weightCalc = calculateShiprocketWeight(
                    orderForm.weight,
                    orderForm.length,
                    orderForm.breadth,
                    orderForm.height
                  );
                  return (
                    <div style={{
                      background: 'linear-gradient(135deg, #f8fafc 0%, #eff6ff 100%)',
                      border: '1.5px solid #bfdbfe',
                      borderRadius: '12px',
                      padding: '16px 20px',
                      marginTop: '16px'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <Scale size={18} color="#4f46e5" />
                          <span style={{ fontSize: '13.5px', fontWeight: 800, color: '#0f172a' }}>
                            Shiprocket Official Weight Calculation
                          </span>
                        </div>
                        <span style={{
                          fontSize: '11px',
                          fontWeight: 700,
                          background: '#e0e7ff',
                          color: '#3730a3',
                          padding: '3px 9px',
                          borderRadius: '6px'
                        }}>
                          Formula: (L × B × H) / 5000
                        </span>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px', alignItems: 'center' }}>
                        <div style={{ background: '#ffffff', padding: '10px 14px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                          <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>Actual / Dead Weight</div>
                          <div style={{ fontSize: '16px', fontWeight: 800, color: '#0f172a', marginTop: '2px' }}>
                            {weightCalc.actualWeight} <span style={{ fontSize: '11px', fontWeight: 600, color: '#64748b' }}>kg</span>
                          </div>
                        </div>

                        <div style={{ background: '#ffffff', padding: '10px 14px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                          <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>Volumetric Weight</div>
                          <div style={{ fontSize: '16px', fontWeight: 800, color: '#0f172a', marginTop: '2px' }}>
                            {weightCalc.volumetricWeight} <span style={{ fontSize: '11px', fontWeight: 600, color: '#64748b' }}>kg</span>
                          </div>
                        </div>

                        <div style={{
                          background: '#ecfdf5',
                          padding: '10px 14px',
                          borderRadius: '10px',
                          border: '1.5px solid #a7f3d0'
                        }}>
                          <div style={{ fontSize: '11px', color: '#047857', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <span>Chargeable Weight</span>
                            <span style={{ fontSize: '9.5px', background: '#059669', color: '#fff', padding: '1px 5px', borderRadius: '4px' }}>
                              Shiprocket
                            </span>
                          </div>
                          <div style={{ fontSize: '18px', fontWeight: 900, color: '#065f46', marginTop: '2px' }}>
                            {weightCalc.chargeableWeight} <span style={{ fontSize: '11px', fontWeight: 600 }}>kg</span>
                          </div>
                        </div>

                        <div style={{ background: '#ffffff', padding: '10px 14px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                          <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>Billable Courier Slab</div>
                          <div style={{ fontSize: '16px', fontWeight: 800, color: '#4f46e5', marginTop: '2px' }}>
                            {weightCalc.billingSlab} <span style={{ fontSize: '11px', fontWeight: 600, color: '#64748b' }}>kg slab</span>
                          </div>
                        </div>
                      </div>

                      <div style={{ fontSize: '12px', color: '#475569', marginTop: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Info size={14} color="#6366f1" />
                        <span>
                          {weightCalc.isVolumetricHigher
                            ? `Volumetric Weight (${weightCalc.volumetricWeight} kg) exceeds Dead Weight (${weightCalc.actualWeight} kg). Shiprocket will bill based on Volumetric Weight.`
                            : `Dead Weight (${weightCalc.actualWeight} kg) is equal to or higher than Volumetric Weight (${weightCalc.volumetricWeight} kg). Shiprocket applies Dead Weight.`}
                        </span>
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* Section 4: Shiprocket Shipping Methods & Live Rates */}
              <div style={{ marginBottom: '28px', background: '#f8fafc', padding: '20px', borderRadius: '14px', border: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px', flexWrap: 'wrap', gap: '10px' }}>
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 800, color: '#4f46e5', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      4. Shiprocket Shipping Methods & Available Couriers
                    </div>
                    <p style={{ fontSize: '12px', color: '#64748b', margin: '3px 0 0 0' }}>
                      Query Shiprocket live API to see all serviceable couriers (Air/Surface), rates & delivery times
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={handleFetchOrderCouriers}
                    disabled={isFormCouriersLoading}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '8px 16px',
                      borderRadius: '8px',
                      background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
                      border: 'none',
                      color: '#ffffff',
                      fontSize: '12.5px',
                      fontWeight: 700,
                      cursor: isFormCouriersLoading ? 'not-allowed' : 'pointer',
                      boxShadow: '0 2px 8px rgba(79, 70, 229, 0.25)'
                    }}
                  >
                    {isFormCouriersLoading ? <RefreshCw size={13} className="spin" /> : <Truck size={13} />}
                    {isFormCouriersLoading ? 'Checking Shiprocket...' : 'Fetch Live Couriers & Rates'}
                  </button>
                </div>

                {formCouriersError && (
                  <div style={{
                    padding: '12px 14px',
                    borderRadius: '8px',
                    marginBottom: '14px',
                    background: '#fef2f2',
                    border: '1px solid #fecaca',
                    color: '#b91c1c',
                    fontSize: '12.5px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '12px',
                    flexWrap: 'wrap'
                  }}>
                    <div style={{ flex: 1 }}>{formCouriersError}</div>
                    {formCouriersError.includes('Shiprocket Authentication Notice') && (
                      <button
                        type="button"
                        onClick={() => setActiveTab('settings')}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          background: '#4f46e5',
                          color: '#ffffff',
                          border: 'none',
                          padding: '6px 14px',
                          borderRadius: '6px',
                          fontSize: '12px',
                          fontWeight: 700,
                          cursor: 'pointer',
                          whiteSpace: 'nowrap'
                        }}
                      >
                        <Settings size={13} /> Open Shiprocket Setup
                      </button>
                    )}
                  </div>
                )}

                {/* Courier Methods List */}
                {formCouriers.length > 0 ? (
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                      <span style={{ fontSize: '12px', fontWeight: 700, color: '#334155' }}>
                        Select Shipping Method / Courier Partner ({formCouriers.length} available):
                      </span>
                      <button
                        type="button"
                        onClick={() => setOrderForm(prev => ({
                          ...prev,
                          selectedCourierId: null,
                          selectedCourierName: '',
                          selectedCourierRate: null,
                          selectedCourierMode: '',
                          selectedCourierEtd: ''
                        }))}
                        style={{
                          fontSize: '11px',
                          color: '#4f46e5',
                          background: 'transparent',
                          border: 'none',
                          cursor: 'pointer',
                          fontWeight: 700
                        }}
                      >
                        Use Auto-Assign (Shiprocket Best Rate)
                      </button>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '10px' }}>
                      {/* Option for Auto Assign */}
                      <div
                        onClick={() => setOrderForm(prev => ({
                          ...prev,
                          selectedCourierId: null,
                          selectedCourierName: '',
                          selectedCourierRate: null,
                          selectedCourierMode: '',
                          selectedCourierEtd: ''
                        }))}
                        style={{
                          padding: '12px 14px',
                          borderRadius: '10px',
                          border: orderForm.selectedCourierId === null ? '2px solid #4f46e5' : '1px solid #cbd5e1',
                          background: orderForm.selectedCourierId === null ? '#eef2ff' : '#ffffff',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <div style={{ fontWeight: 800, fontSize: '13px', color: '#0f172a' }}>
                            ⚡ Auto-Assign Courier
                          </div>
                          {orderForm.selectedCourierId === null && (
                            <span style={{ fontSize: '10.5px', background: '#4f46e5', color: '#fff', padding: '2px 6px', borderRadius: '4px', fontWeight: 700 }}>
                              Selected
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: '11.5px', color: '#64748b', marginTop: '4px' }}>
                          Shiprocket automatically picks the fastest / lowest rate courier partner.
                        </div>
                      </div>

                      {/* Real Shiprocket Courier Cards */}
                      {formCouriers.map(courier => {
                        const isSelected = orderForm.selectedCourierId === courier.courier_company_id;
                        return (
                          <div
                            key={courier.courier_company_id}
                            onClick={() => setOrderForm(prev => ({
                              ...prev,
                              selectedCourierId: courier.courier_company_id,
                              selectedCourierName: courier.courier_name,
                              selectedCourierRate: courier.rate,
                              selectedCourierMode: courier.mode || 'Surface',
                              selectedCourierEtd: courier.etd
                            }))}
                            style={{
                              padding: '12px 14px',
                              borderRadius: '10px',
                              border: isSelected ? '2px solid #4f46e5' : '1px solid #e2e8f0',
                              background: isSelected ? '#eef2ff' : '#ffffff',
                              cursor: 'pointer',
                              transition: 'all 0.15s ease',
                              boxShadow: isSelected ? '0 2px 8px rgba(79, 70, 229, 0.15)' : 'none'
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                              <div style={{ fontWeight: 800, fontSize: '13px', color: '#0f172a' }}>
                                {courier.courier_name}
                              </div>
                              <span style={{
                                fontSize: '10px',
                                fontWeight: 700,
                                padding: '1px 6px',
                                borderRadius: '4px',
                                background: courier.mode === 'Air' ? '#dbeafe' : '#f1f5f9',
                                color: courier.mode === 'Air' ? '#1d4ed8' : '#475569'
                              }}>
                                {courier.mode === 'Air' ? '✈️ Air' : '🚚 Surface'}
                              </span>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '6px' }}>
                              <div style={{ fontSize: '11.5px', color: '#64748b' }}>
                                ETD: <strong>{courier.etd || `${courier.estimated_delivery_days} Days`}</strong>
                              </div>
                              <div style={{ fontSize: '14.5px', fontWeight: 800, color: '#16a34a' }}>
                                ₹{courier.rate}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div style={{
                    padding: '14px',
                    borderRadius: '8px',
                    background: '#ffffff',
                    border: '1px dashed #cbd5e1',
                    textAlign: 'center',
                    color: '#64748b',
                    fontSize: '12.5px'
                  }}>
                    Click <strong>"Fetch Live Couriers & Rates"</strong> above to see available Shiprocket courier methods, delivery times, and pricing.
                  </div>
                )}
              </div>

              {/* Section 5: Payment Method & Dispatch */}
              <div style={{ marginBottom: '28px', background: '#f8fafc', padding: '18px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, color: '#334155', marginBottom: '10px' }}>
                  5. Payment Method & Summary
                </label>
                <div style={{ display: 'flex', gap: '24px', marginBottom: '14px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13.5px', fontWeight: 600 }}>
                    <input
                      type="radio"
                      name="payment_method"
                      checked={orderForm.paymentMethod === 'Prepaid'}
                      onChange={() => setOrderForm(prev => ({ ...prev, paymentMethod: 'Prepaid' }))}
                    />
                    Prepaid (Paid by Patient at Clinic or Online)
                  </label>

                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13.5px', fontWeight: 600 }}>
                    <input
                      type="radio"
                      name="payment_method"
                      checked={orderForm.paymentMethod === 'COD'}
                      onChange={() => setOrderForm(prev => ({ ...prev, paymentMethod: 'COD' }))}
                    />
                    Cash On Delivery (COD collected by Courier)
                  </label>
                </div>

                {orderForm.selectedCourierName && (
                  <div style={{
                    background: '#e0e7ff',
                    border: '1px solid #c7d2fe',
                    borderRadius: '8px',
                    padding: '8px 12px',
                    fontSize: '12px',
                    color: '#3730a3',
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                  }}>
                    <span>Selected Courier Method: <strong>{orderForm.selectedCourierName}</strong> ({orderForm.selectedCourierMode || 'Surface'})</span>
                    {orderForm.selectedCourierRate !== null && <span>Rate: ₹{orderForm.selectedCourierRate}</span>}
                  </div>
                )}
              </div>

              {/* Submit Button */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                <button
                  type="button"
                  onClick={() => setActiveTab('shipments')}
                  style={{
                    padding: '11px 22px',
                    borderRadius: '10px',
                    border: '1px solid #cbd5e1',
                    background: '#ffffff',
                    color: '#475569',
                    fontSize: '13.5px',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={isSubmittingOrder}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '11px 28px',
                    borderRadius: '10px',
                    border: 'none',
                    background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
                    color: '#ffffff',
                    fontSize: '13.5px',
                    fontWeight: 700,
                    cursor: isSubmittingOrder ? 'not-allowed' : 'pointer',
                    boxShadow: '0 4px 14px rgba(79, 70, 229, 0.3)',
                    opacity: isSubmittingOrder ? 0.7 : 1
                  }}
                >
                  {isSubmittingOrder ? (
                    <>
                      <RefreshCw size={16} className="spin" />
                      Creating Order in Shiprocket...
                    </>
                  ) : (
                    <>
                      <Send size={16} />
                      Dispatch & Create in Shiprocket
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: LIVE TRACKING */}
      {/* ========================================================================= */}
      {activeTab === 'track' && (
        <div style={{ maxWidth: '860px', margin: '0 auto' }}>
          {/* Tracking Search Card */}
          <div style={{
            background: '#ffffff',
            borderRadius: '16px',
            border: '1px solid #e2e8f0',
            padding: '24px',
            marginBottom: '24px',
            boxShadow: '0 4px 16px rgba(0,0,0,0.03)'
          }}>
            <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a', margin: '0 0 6px 0' }}>
              Real-time Parcel Tracking
            </h2>
            <p style={{ fontSize: '13px', color: '#64748b', margin: '0 0 18px 0' }}>
              Enter the Shiprocket Airway Bill (AWB) or tracking number to fetch live scan checkpoints.
            </p>

            <div style={{ display: 'flex', gap: '10px' }}>
              <div style={{ position: 'relative', flex: 1 }}>
                <Navigation size={18} color="#94a3b8" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }} />
                <input
                  type="text"
                  placeholder="Enter AWB Code (e.g. 143242194384)..."
                  value={trackInput}
                  onChange={(e) => setTrackInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleTrackSubmit()}
                  style={{
                    width: '100%',
                    padding: '12px 14px 12px 42px',
                    borderRadius: '10px',
                    border: '1.5px solid #cbd5e1',
                    fontSize: '14px',
                    fontWeight: 600,
                    outline: 'none'
                  }}
                />
              </div>

              <button
                onClick={() => handleTrackSubmit()}
                disabled={isTrackingLoading}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '12px 24px',
                  borderRadius: '10px',
                  border: 'none',
                  background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
                  color: '#ffffff',
                  fontSize: '13.5px',
                  fontWeight: 700,
                  cursor: isTrackingLoading ? 'not-allowed' : 'pointer',
                  boxShadow: '0 2px 8px rgba(79, 70, 229, 0.25)'
                }}
              >
                {isTrackingLoading ? <RefreshCw size={16} className="spin" /> : <Search size={16} />}
                Track Status
              </button>
            </div>

            {trackingError && (
              <div style={{
                marginTop: '16px',
                padding: '12px 16px',
                borderRadius: '10px',
                background: '#fef2f2',
                border: '1px solid #fecaca',
                color: '#b91c1c',
                fontSize: '13px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '12px',
                flexWrap: 'wrap'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
                  <AlertCircle size={16} /> {trackingError}
                </div>
                {trackingError.includes('Shiprocket Authentication Notice') && (
                  <button
                    type="button"
                    onClick={() => setActiveTab('settings')}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      background: '#4f46e5',
                      color: '#ffffff',
                      border: 'none',
                      padding: '6px 14px',
                      borderRadius: '6px',
                      fontSize: '12px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    <Settings size={13} /> Open Shiprocket Setup
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Tracking Result View */}
          {trackingData && (
            <div style={{
              background: '#ffffff',
              borderRadius: '16px',
              border: '1px solid #e2e8f0',
              padding: '28px',
              boxShadow: '0 4px 16px rgba(0,0,0,0.03)'
            }}>
              {/* Header Details */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '14px',
                paddingBottom: '20px',
                borderBottom: '1px solid #f1f5f9'
              }}>
                <div>
                  <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>AWB NUMBER</div>
                  <div style={{ fontSize: '20px', fontWeight: 800, color: '#4f46e5', marginTop: '2px' }}>
                    {trackingData.awb_code}
                  </div>
                  <div style={{ fontSize: '13px', color: '#334155', fontWeight: 600, marginTop: '2px' }}>
                    Courier: {trackingData.courier_name}
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <div style={{
                    display: 'inline-block',
                    padding: '6px 14px',
                    borderRadius: '20px',
                    background: '#e0e7ff',
                    color: '#4338ca',
                    fontWeight: 800,
                    fontSize: '13px'
                  }}>
                    {trackingData.current_status || 'IN TRANSIT'}
                  </div>
                  {trackingData.expected_delivery_date && (
                    <div style={{ fontSize: '12px', color: '#64748b', marginTop: '6px' }}>
                      Expected Delivery: <strong>{trackingData.expected_delivery_date}</strong>
                    </div>
                  )}
                </div>
              </div>

              {/* Visual Stepper */}
              <div style={{ padding: '32px 10px 24px 10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'relative' }}>
                  {/* Progress Line */}
                  <div style={{
                    position: 'absolute',
                    top: '18px',
                    left: '5%',
                    right: '5%',
                    height: '3px',
                    background: '#e2e8f0',
                    zIndex: 1
                  }} />

                  {[
                    { label: 'Order Placed', done: true },
                    { label: 'Pickup Scheduled', done: true },
                    { label: 'In Transit', done: trackingData.current_status?.toLowerCase().includes('transit') || trackingData.current_status?.toLowerCase().includes('out') || trackingData.current_status?.toLowerCase().includes('delivered') },
                    { label: 'Out for Delivery', done: trackingData.current_status?.toLowerCase().includes('out') || trackingData.current_status?.toLowerCase().includes('delivered') },
                    { label: 'Delivered', done: trackingData.current_status?.toLowerCase().includes('delivered') }
                  ].map((step, idx) => (
                    <div key={idx} style={{ textAlign: 'center', zIndex: 2, position: 'relative' }}>
                      <div style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '50%',
                        background: step.done ? '#4f46e5' : '#ffffff',
                        border: `2px solid ${step.done ? '#4f46e5' : '#cbd5e1'}`,
                        color: step.done ? '#ffffff' : '#94a3b8',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        margin: '0 auto 8px auto',
                        fontWeight: 700,
                        fontSize: '13px'
                      }}>
                        {step.done ? <CheckCircle2 size={18} /> : idx + 1}
                      </div>
                      <div style={{ fontSize: '12px', fontWeight: step.done ? 700 : 500, color: step.done ? '#0f172a' : '#94a3b8' }}>
                        {step.label}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Scans Timeline */}
              {trackingData.scans && trackingData.scans.length > 0 && (
                <div style={{ marginTop: '24px' }}>
                  <h3 style={{ fontSize: '14px', fontWeight: 800, color: '#0f172a', marginBottom: '14px' }}>
                    Activity History & Checkpoints
                  </h3>
                  <div style={{ borderLeft: '2px solid #e2e8f0', paddingLeft: '20px', marginLeft: '10px' }}>
                    {trackingData.scans.map((scan, sIdx) => (
                      <div key={sIdx} style={{ position: 'relative', marginBottom: '20px' }}>
                        <div style={{
                          position: 'absolute',
                          left: '-26px',
                          top: '2px',
                          width: '10px',
                          height: '10px',
                          borderRadius: '50%',
                          background: sIdx === 0 ? '#4f46e5' : '#94a3b8'
                        }} />
                        <div style={{ fontSize: '13px', fontWeight: 700, color: '#1e293b' }}>
                          {scan.activity}
                        </div>
                        <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
                          {scan.location && <span>{scan.location} • </span>}
                          {scan.date}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: RATE & SERVICEABILITY CALCULATOR */}
      {/* ========================================================================= */}
      {activeTab === 'rates' && (
        <div style={{ maxWidth: '900px', margin: '0 auto' }}>
          <div style={{
            background: '#ffffff',
            borderRadius: '16px',
            border: '1px solid #e2e8f0',
            padding: '28px',
            boxShadow: '0 4px 16px rgba(0,0,0,0.03)'
          }}>
            <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a', margin: '0 0 6px 0' }}>
              Check Delivery Rates & Courier Serviceability
            </h2>
            <p style={{ fontSize: '13px', color: '#64748b', margin: '0 0 20px 0' }}>
              Compare shipping costs and delivery turnaround across courier partners (Delhivery, BlueDart, DTDC, Xpressbees, etc.)
            </p>

            <form onSubmit={handleCheckRates}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                    Pickup Pincode *
                  </label>
                  <input
                    type="text"
                    required
                    value={pickupPincode}
                    onChange={(e) => setPickupPincode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="e.g. 500081"
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      fontSize: '13px',
                      fontWeight: 700
                    }}
                  />
                  <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '3px' }}>Clinic Hyderabad Warehouse</div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                    Delivery Pincode *
                  </label>
                  <input
                    type="text"
                    required
                    value={deliveryPincode}
                    onChange={(e) => setDeliveryPincode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="e.g. 560001"
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      borderRadius: '8px',
                      border: '1.5px solid #4f46e5',
                      fontSize: '13px',
                      fontWeight: 700
                    }}
                  />
                  <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '3px' }}>Patient destination pincode</div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                    Actual Parcel Weight (Kg) *
                  </label>
                  <input
                    type="number"
                    step="0.05"
                    min={0.05}
                    value={rateWeight}
                    onChange={(e) => setRateWeight(Number(e.target.value))}
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      fontSize: '13px'
                    }}
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                  <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                    Payment Mode
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px', marginTop: '6px' }}>
                    <input
                      type="checkbox"
                      checked={rateCod}
                      onChange={(e) => setRateCod(e.target.checked)}
                    />
                    Include Cash on Delivery (COD)
                  </label>
                </div>
              </div>

              {/* Box Dimensions for Shiprocket Volumetric Weight Calculation */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px', marginBottom: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '5px' }}>
                    Length (cm)
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={rateLength}
                    onChange={(e) => setRateLength(Number(e.target.value))}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      fontSize: '12.5px'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '5px' }}>
                    Breadth (cm)
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={rateBreadth}
                    onChange={(e) => setRateBreadth(Number(e.target.value))}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      fontSize: '12.5px'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '5px' }}>
                    Height (cm)
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={rateHeight}
                    onChange={(e) => setRateHeight(Number(e.target.value))}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      fontSize: '12.5px'
                    }}
                  />
                </div>
              </div>

              {/* Live Shiprocket Weight Breakdown Card */}
              {(() => {
                const weightCalc = calculateShiprocketWeight(rateWeight, rateLength, rateBreadth, rateHeight);
                return (
                  <div style={{
                    background: '#f8fafc',
                    border: '1.5px solid #bfdbfe',
                    borderRadius: '12px',
                    padding: '14px 18px',
                    marginBottom: '20px'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Scale size={16} color="#4f46e5" />
                        <span style={{ fontSize: '13px', fontWeight: 800, color: '#0f172a' }}>
                          Shiprocket Weight Calculation Breakdown
                        </span>
                      </div>
                      <span style={{ fontSize: '11px', fontWeight: 700, color: '#3730a3', background: '#e0e7ff', padding: '2px 8px', borderRadius: '6px' }}>
                        Formula: (L × B × H) / 5000
                      </span>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '10px' }}>
                      <div style={{ background: '#ffffff', padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                        <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>Dead Weight</div>
                        <div style={{ fontSize: '15px', fontWeight: 800, color: '#0f172a', marginTop: '2px' }}>
                          {weightCalc.actualWeight} <span style={{ fontSize: '11px', fontWeight: 600, color: '#64748b' }}>kg</span>
                        </div>
                      </div>

                      <div style={{ background: '#ffffff', padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                        <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>Volumetric Weight</div>
                        <div style={{ fontSize: '15px', fontWeight: 800, color: '#0f172a', marginTop: '2px' }}>
                          {weightCalc.volumetricWeight} <span style={{ fontSize: '11px', fontWeight: 600, color: '#64748b' }}>kg</span>
                        </div>
                      </div>

                      <div style={{ background: '#ecfdf5', padding: '10px', borderRadius: '8px', border: '1.5px solid #a7f3d0' }}>
                        <div style={{ fontSize: '11px', color: '#047857', fontWeight: 700 }}>Chargeable Weight</div>
                        <div style={{ fontSize: '16px', fontWeight: 900, color: '#065f46', marginTop: '2px' }}>
                          {weightCalc.chargeableWeight} <span style={{ fontSize: '11px', fontWeight: 600 }}>kg</span>
                        </div>
                      </div>

                      <div style={{ background: '#ffffff', padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                        <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>Shiprocket Slab</div>
                        <div style={{ fontSize: '15px', fontWeight: 800, color: '#4f46e5', marginTop: '2px' }}>
                          {weightCalc.billingSlab} <span style={{ fontSize: '11px', fontWeight: 600, color: '#64748b' }}>kg slab</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}

              <button
                type="submit"
                disabled={isRateLoading}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '11px 24px',
                  borderRadius: '10px',
                  border: 'none',
                  background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
                  color: '#ffffff',
                  fontSize: '13.5px',
                  fontWeight: 700,
                  cursor: isRateLoading ? 'not-allowed' : 'pointer'
                }}
              >
                {isRateLoading ? <RefreshCw size={16} className="spin" /> : <IndianRupee size={16} />}
                {isRateLoading ? 'Querying Shiprocket API...' : 'Fetch Available Courier Rates & Methods'}
              </button>
            </form>

            {rateError && (
              <div style={{
                marginTop: '20px',
                padding: '12px 16px',
                borderRadius: '10px',
                background: '#fef2f2',
                border: '1px solid #fecaca',
                color: '#b91c1c',
                fontSize: '13px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '12px',
                flexWrap: 'wrap'
              }}>
                <div style={{ flex: 1 }}>{rateError}</div>
                {rateError.includes('Shiprocket Authentication Notice') && (
                  <button
                    type="button"
                    onClick={() => setActiveTab('settings')}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      background: '#4f46e5',
                      color: '#ffffff',
                      border: 'none',
                      padding: '6px 14px',
                      borderRadius: '6px',
                      fontSize: '12px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    <Settings size={13} /> Open Shiprocket Setup
                  </button>
                )}
              </div>
            )}

            {rateResults.length > 0 && (
              <div style={{ marginTop: '28px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                  <h3 style={{ fontSize: '15px', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                    Available Shiprocket Shipping Methods ({rateResults.length})
                  </h3>
                  <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>
                    Route: {pickupPincode} &rarr; {deliveryPincode}
                  </span>
                </div>

                <div style={{ display: 'grid', gap: '12px' }}>
                  {rateResults.map((courier) => (
                    <div
                      key={courier.courier_company_id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '16px 20px',
                        borderRadius: '12px',
                        border: '1px solid #e2e8f0',
                        background: '#ffffff',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
                        flexWrap: 'wrap',
                        gap: '12px'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                        <div style={{ background: '#f1f5f9', padding: '10px', borderRadius: '10px' }}>
                          <Truck size={20} color="#4f46e5" />
                        </div>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontWeight: 800, color: '#0f172a', fontSize: '14px' }}>
                              {courier.courier_name}
                            </span>
                            <span style={{
                              fontSize: '10.5px',
                              fontWeight: 700,
                              padding: '2px 7px',
                              borderRadius: '4px',
                              background: courier.mode === 'Air' ? '#dbeafe' : '#f1f5f9',
                              color: courier.mode === 'Air' ? '#1d4ed8' : '#475569'
                            }}>
                              {courier.mode === 'Air' ? '✈️ Air' : '🚚 Surface'}
                            </span>
                          </div>
                          <div style={{ fontSize: '12px', color: '#64748b', marginTop: '3px' }}>
                            Est. Delivery: <strong>{courier.etd || `${courier.estimated_delivery_days} Days`}</strong> • Rating: {courier.rating || 4.2} ★ • Min Wt: {courier.min_weight || 0.5} kg
                          </div>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '18px' }}>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: '18px', fontWeight: 800, color: '#15803d' }}>
                            ₹{courier.rate}
                          </div>
                          <div style={{ fontSize: '11px', color: '#64748b' }}>
                            {rateCod ? 'incl. COD fees' : 'Prepaid rate'}
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            setOrderForm(prev => ({
                              ...prev,
                              pincode: deliveryPincode,
                              selectedCourierId: courier.courier_company_id,
                              selectedCourierName: courier.courier_name,
                              selectedCourierRate: courier.rate,
                              selectedCourierMode: courier.mode || 'Surface',
                              selectedCourierEtd: courier.etd,
                              weight: rateWeight,
                              length: rateLength,
                              breadth: rateBreadth,
                              height: rateHeight
                            }));
                            setActiveTab('create');
                          }}
                          style={{
                            padding: '8px 14px',
                            borderRadius: '8px',
                            background: '#e0e7ff',
                            border: '1px solid #c7d2fe',
                            color: '#3730a3',
                            fontSize: '12px',
                            fontWeight: 700,
                            cursor: 'pointer'
                          }}
                        >
                          Book via This Courier &rarr;
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB: WEIGHT DISCREPANCY AUDITS & TRACKING WEBHOOKS */}
      {/* ========================================================================= */}
      {activeTab === 'discrepancy' && (
        <div style={{ maxWidth: '960px', margin: '0 auto' }}>
          <div style={{
            background: '#ffffff',
            borderRadius: '16px',
            border: '1px solid #e2e8f0',
            padding: '28px',
            boxShadow: '0 4px 16px rgba(0,0,0,0.03)',
            marginBottom: '24px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Scale size={22} color="#4f46e5" />
                  <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                    Shiprocket Weight Discrepancy & Billing Audit
                  </h2>
                </div>
                <p style={{ fontSize: '13px', color: '#64748b', margin: '4px 0 0 0' }}>
                  Verify weight adjustments and courier company scale re-evaluations via official API (GET /billing/discrepancy)
                </p>
              </div>

              <button
                type="button"
                onClick={loadDiscrepancies}
                disabled={isDiscrepancyLoading}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '9px 18px',
                  borderRadius: '10px',
                  background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
                  border: 'none',
                  color: '#ffffff',
                  fontSize: '12.5px',
                  fontWeight: 700,
                  cursor: isDiscrepancyLoading ? 'not-allowed' : 'pointer',
                  boxShadow: '0 2px 8px rgba(79, 70, 229, 0.25)'
                }}
              >
                <RefreshCw size={13} className={isDiscrepancyLoading ? 'spin' : ''} />
                {isDiscrepancyLoading ? 'Checking API...' : 'Fetch Live Discrepancies'}
              </button>
            </div>

            {/* Official Shiprocket Disclaimer Banner */}
            <div style={{
              background: '#eff6ff',
              border: '1px solid #bfdbfe',
              borderRadius: '12px',
              padding: '14px 18px',
              marginBottom: '20px'
            }}>
              <div style={{ fontSize: '13px', fontWeight: 700, color: '#1e40af', marginBottom: '4px' }}>
                Shiprocket Weight Discrepancy Policy:
              </div>
              <div style={{ fontSize: '12.5px', color: '#3b82f6', lineHeight: '1.5' }}>
                {discrepancyText.upper ||
                  'The entered weight for shipment was incorrect. Please allow deduction on the basis of correct charged weight as shared by the courier company (Delhivery, Blue Dart, DTDC, etc.).'}
              </div>
              <div style={{ fontSize: '11.5px', color: '#64748b', marginTop: '8px' }}>
                {discrepancyText.lower || 'Support: Call 011-39595108 or email support@shiprocket.in to raise dispute tickets.'}
              </div>
            </div>

            {discrepancyError && (
              <div style={{
                padding: '12px 16px',
                borderRadius: '10px',
                background: '#fef2f2',
                border: '1px solid #fecaca',
                color: '#b91c1c',
                fontSize: '13px',
                marginBottom: '16px'
              }}>
                {discrepancyError}
              </div>
            )}

            {/* Discrepancies Table / Empty State */}
            {discrepancies.length > 0 ? (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', textAlign: 'left' }}>
                      <th style={{ padding: '10px 14px', fontWeight: 700, color: '#475569' }}>Order / AWB</th>
                      <th style={{ padding: '10px 14px', fontWeight: 700, color: '#475569' }}>Courier</th>
                      <th style={{ padding: '10px 14px', fontWeight: 700, color: '#475569' }}>Entered Weight</th>
                      <th style={{ padding: '10px 14px', fontWeight: 700, color: '#475569' }}>Charged Weight</th>
                      <th style={{ padding: '10px 14px', fontWeight: 700, color: '#475569' }}>Difference</th>
                      <th style={{ padding: '10px 14px', fontWeight: 700, color: '#475569' }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {discrepancies.map((d, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '12px 14px', fontWeight: 700, color: '#0f172a' }}>{d.order_id || d.awb}</td>
                        <td style={{ padding: '12px 14px', color: '#64748b' }}>{d.courier_name || '-'}</td>
                        <td style={{ padding: '12px 14px', color: '#64748b' }}>{d.entered_weight} kg</td>
                        <td style={{ padding: '12px 14px', fontWeight: 700, color: '#dc2626' }}>{d.charged_weight} kg</td>
                        <td style={{ padding: '12px 14px', color: '#dc2626' }}>+{d.weight_diff} kg</td>
                        <td style={{ padding: '12px 14px' }}>
                          <span style={{ fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '4px', background: '#fee2e2', color: '#991b1b' }}>
                            {d.status || 'Pending Dispute'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div style={{
                textAlign: 'center',
                padding: '36px 20px',
                background: '#f8fafc',
                borderRadius: '12px',
                border: '1px dashed #cbd5e1'
              }}>
                <CheckCircle2 size={32} color="#16a34a" style={{ margin: '0 auto 8px auto' }} />
                <div style={{ fontSize: '14.5px', fontWeight: 700, color: '#0f172a' }}>
                  No Weight Discrepancies Recorded
                </div>
                <div style={{ fontSize: '12.5px', color: '#64748b', marginTop: '4px', maxWidth: '480px', margin: '4px auto 0 auto' }}>
                  All your medicine parcels were correctly measured according to Shiprocket's (L×B×H)/5000 volumetric formula and verified by couriers.
                </div>
              </div>
            )}
          </div>

          {/* Webhook Configuration Guide Box */}
          <div style={{
            background: '#ffffff',
            borderRadius: '16px',
            border: '1px solid #e2e8f0',
            padding: '28px',
            boxShadow: '0 4px 16px rgba(0,0,0,0.03)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
              <Globe size={22} color="#4f46e5" />
              <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                Shiprocket Tracking Webhook Specifications
              </h2>
            </div>
            <p style={{ fontSize: '13px', color: '#64748b', margin: '0 0 20px 0' }}>
              Configure automated webhook callbacks in your Shiprocket account (Settings &rarr; API &rarr; Webhooks) to receive real-time parcel checkpoint notifications
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px', marginBottom: '20px' }}>
              <div style={{ background: '#f8fafc', padding: '12px 16px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>HTTP METHOD</div>
                <div style={{ fontSize: '14px', fontWeight: 800, color: '#0f172a', marginTop: '2px' }}>POST</div>
              </div>
              <div style={{ background: '#f8fafc', padding: '12px 16px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>CONTENT TYPE</div>
                <div style={{ fontSize: '14px', fontWeight: 800, color: '#0f172a', marginTop: '2px' }}>application/json</div>
              </div>
              <div style={{ background: '#f8fafc', padding: '12px 16px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>SECURITY HEADER</div>
                <div style={{ fontSize: '14px', fontWeight: 800, color: '#4f46e5', marginTop: '2px' }}>x-api-key</div>
              </div>
              <div style={{ background: '#f8fafc', padding: '12px 16px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>RESPONSE CODE</div>
                <div style={{ fontSize: '14px', fontWeight: 800, color: '#16a34a', marginTop: '2px' }}>200 OK</div>
              </div>
            </div>

            <div style={{ background: '#0f172a', borderRadius: '12px', padding: '16px', color: '#f8fafc' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px', borderBottom: '1px solid #334155', paddingBottom: '8px' }}>
                <span style={{ fontSize: '12px', fontWeight: 700, color: '#94a3b8' }}>Sample Shiprocket Webhook Body (JSON)</span>
                <span style={{ fontSize: '11px', color: '#38bdf8', fontWeight: 600 }}>Real-Time Scans Format</span>
              </div>
              <pre style={{ margin: 0, fontSize: '11.5px', fontFamily: 'monospace', overflowX: 'auto', lineHeight: '1.5', color: '#e2e8f0' }}>
                {`{
  "awb": "19041424751540",
  "courier_name": "Delhivery Surface",
  "current_status": "IN TRANSIT",
  "order_id": "SPH-581920",
  "sr_order_id": 348456385,
  "etd": "2026-09-27 15:40:19",
  "scans": [
    {
      "date": "2026-09-24 11:59:16",
      "status": "X-UCI",
      "activity": "Manifested - Manifest uploaded",
      "location": "Hyderabad Hub (Telangana)"
    },
    {
      "date": "2026-09-24 15:32:17",
      "status": "X-PPOM",
      "activity": "In Transit - Shipment picked up",
      "location": "Hyderabad Hub (Telangana)"
    }
  ]
}`}
              </pre>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 6: API CREDENTIALS & SETTINGS */}
      {/* ========================================================================= */}
      {activeTab === 'settings' && (
        <div style={{ maxWidth: '860px', margin: '0 auto' }}>
          <div style={{
            background: '#ffffff',
            borderRadius: '16px',
            border: '1px solid #e2e8f0',
            padding: '28px',
            boxShadow: '0 4px 16px rgba(0,0,0,0.03)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
              <Key size={22} color="#4f46e5" />
              <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                Shiprocket API Configuration
              </h2>
            </div>
            <p style={{ fontSize: '13px', color: '#64748b', margin: '0 0 24px 0' }}>
              Connect your official Shiprocket account credentials. The token is securely stored and synchronized across all reception terminals.
            </p>

            {configMessage && (
              <div style={{
                padding: '14px 18px',
                borderRadius: '10px',
                marginBottom: '20px',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                background: configMessage.type === 'success' ? '#f0fdf4' : '#fef2f2',
                border: `1px solid ${configMessage.type === 'success' ? '#bbf7d0' : '#fecaca'}`,
                color: configMessage.type === 'success' ? '#15803d' : '#b91c1c',
                fontSize: '13px',
                fontWeight: 600
              }}>
                {configMessage.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
                {configMessage.text}
              </div>
            )}

            {/* Section 1: Official Account Login & Token Generation */}
            <div style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '14px',
              padding: '22px',
              marginBottom: '24px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
                <div style={{ fontWeight: 800, fontSize: '14px', color: '#1e293b' }}>
                  1. Shiprocket Account Login
                </div>
                {config.token && config.isConnected ? (
                  <span style={{ fontSize: '11.5px', fontWeight: 700, color: '#15803d', background: '#dcfce7', border: '1px solid #bbf7d0', padding: '3px 10px', borderRadius: '20px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#16a34a' }}></span> Connected & Active
                  </span>
                ) : (
                  <span style={{ fontSize: '11.5px', fontWeight: 700, color: '#b45309', background: '#fef3c7', border: '1px solid #fde68a', padding: '3px 10px', borderRadius: '20px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#d97706' }}></span> Not Connected
                  </span>
                )}
              </div>

              <p style={{ fontSize: '12.5px', color: '#64748b', margin: '0 0 16px 0' }}>
                Shiprocket authenticates via OAuth JWT Bearer tokens generated from your account credentials. You do not need to manage manual API keys.
              </p>

              <form onSubmit={handleConnectShiprocket}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px', marginBottom: '16px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                      Shiprocket Account Email *
                    </label>
                    <input
                      type="email"
                      required
                      placeholder="e.g. spiritualhomeopathy@gmail.com"
                      value={config.email || ''}
                      onChange={(e) => setConfig(prev => ({ ...prev, email: e.target.value }))}
                      style={{
                        width: '100%',
                        padding: '9px 12px',
                        borderRadius: '8px',
                        border: '1px solid #cbd5e1',
                        fontSize: '13px'
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                      Shiprocket Password *
                    </label>
                    <input
                      type="password"
                      required
                      placeholder="••••••••••••"
                      value={config.password || ''}
                      onChange={(e) => setConfig(prev => ({ ...prev, password: e.target.value }))}
                      style={{
                        width: '100%',
                        padding: '9px 12px',
                        borderRadius: '8px',
                        border: '1px solid #cbd5e1',
                        fontSize: '13px'
                      }}
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isConnecting}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '10px 22px',
                    borderRadius: '8px',
                    border: 'none',
                    background: '#4f46e5',
                    color: '#ffffff',
                    fontSize: '13px',
                    fontWeight: 700,
                    cursor: isConnecting ? 'not-allowed' : 'pointer'
                  }}
                >
                  {isConnecting ? <RefreshCw size={14} className="spin" /> : <Key size={14} />}
                  Connect & Generate Live Token
                </button>
              </form>
            </div>

            {/* Section 2: Warehouse & Dispatch Defaults */}
            <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '20px' }}>
              <div style={{ fontWeight: 800, fontSize: '14px', color: '#1e293b', marginBottom: '6px' }}>
                2. Warehouse & Parcel Defaults
              </div>
              <p style={{ fontSize: '12.5px', color: '#64748b', margin: '0 0 16px 0' }}>
                Default parameters pre-filled when creating new medicine dispatches.
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '20px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                    Default Pickup Location Name
                  </label>
                  <input
                    type="text"
                    value={config.pickupLocation || 'Primary'}
                    onChange={(e) => setConfig(prev => ({ ...prev, pickupLocation: e.target.value }))}
                    placeholder="e.g. Primary or Main Hub"
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      fontSize: '13px'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                    Default Weight (Kg)
                  </label>
                  <input
                    type="number"
                    step="0.05"
                    value={config.defaultWeight || 0.5}
                    onChange={(e) => setConfig(prev => ({ ...prev, defaultWeight: Number(e.target.value) }))}
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      fontSize: '13px'
                    }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  onClick={handleSaveConfig}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '10px 24px',
                    borderRadius: '8px',
                    border: 'none',
                    background: '#0f172a',
                    color: '#ffffff',
                    fontSize: '13px',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  <ShieldCheck size={15} /> Save Defaults & Sync
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 6: SHIPROCKET WEB CONSOLE (IFRAME) */}
      {/* ========================================================================= */}
      {activeTab === 'portal' && (
        <div style={{
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '16px',
          overflow: 'hidden',
          boxShadow: '0 4px 16px rgba(0,0,0,0.04)'
        }}>
          <div style={{
            background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
            padding: '12px 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid #e2e8f0'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Package size={16} color="#4f46e5" />
              <span style={{ fontSize: '13px', fontWeight: 700, color: '#334155' }}>
                Shiprocket Official Web Portal
              </span>
              <span style={{
                fontSize: '11px',
                fontWeight: 700,
                color: '#16a34a',
                background: '#f0fdf4',
                border: '1px solid #bbf7d0',
                padding: '2px 8px',
                borderRadius: '6px'
              }}>
                WEB EMBED
              </span>
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={() => setIframeKey(prev => prev + 1)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: '#ffffff',
                  border: '1px solid #cbd5e1',
                  padding: '6px 12px',
                  borderRadius: '8px',
                  fontSize: '12px',
                  fontWeight: 600,
                  color: '#475569',
                  cursor: 'pointer'
                }}
              >
                <RefreshCw size={13} /> Reload
              </button>
              <a
                href={SHIPROCKET_PORTAL_URL}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: '#4f46e5',
                  color: '#ffffff',
                  border: 'none',
                  padding: '6px 14px',
                  borderRadius: '8px',
                  fontSize: '12px',
                  fontWeight: 700,
                  textDecoration: 'none'
                }}
              >
                <ExternalLink size={13} /> Open in New Tab
              </a>
            </div>
          </div>

          <iframe
            key={iframeKey}
            src={SHIPROCKET_PORTAL_URL}
            title="Shiprocket Dashboard Console"
            style={{
              width: '100%',
              height: 'calc(100vh - 240px)',
              border: 'none',
              display: 'block'
            }}
            sandbox="allow-same-origin allow-scripts allow-popups allow-forms allow-top-navigation"
          />
        </div>
      )}
    </div>
  );
};
