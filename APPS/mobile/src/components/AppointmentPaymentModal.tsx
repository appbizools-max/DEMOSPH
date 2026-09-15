import React, { useState, useEffect, useRef } from 'react';
import {
  Modal, View, Text, StyleSheet, TouchableOpacity,
  TextInput, ScrollView, Alert, ActivityIndicator, SafeAreaView, Linking, Image, Share, NativeModules
} from 'react-native';
import { Ionicons, Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { sendInvoiceWhatsAppNotification } from '@app/shared';
import {
  getSafeDb, doc, updateDoc, setDoc, getDocs, collection, query, where, arrayUnion, addDoc
} from '../utils/firebaseSafe';
import { getStorage, ref as storageRef, uploadString, getDownloadURL } from 'firebase/storage';
import { getApp, getApps, initializeApp } from 'firebase/app';
import { SH_LOGO_BASE64 } from '../utils/logoBase64';

// Safe Firebase Storage reference
const getFirebaseStorage = () => {
  try {
    const app = getApps().length ? getApp() : initializeApp({
      apiKey: "AIzaSyAohSNLyeS6bYtnk2QvB4HGo0LbHDw9b6Q",
      authDomain: "spiritual-homeopathy-3b552.firebaseapp.com",
      projectId: "spiritual-homeopathy-3b552",
      storageBucket: "spiritual-homeopathy-3b552.firebasestorage.app",
      messagingSenderId: "81822616559",
      appId: "1:81822616559:web:98a0b9cd974938cc87841a"
    });
    return getStorage(app);
  } catch (e) {
    console.warn("Storage initialization warning:", e);
    return null;
  }
};

const uploadPrescriptionToStorage = async (dataOrUri: string, patId?: string): Promise<string> => {
  if (!dataOrUri) return '';
  if (dataOrUri.startsWith('http://') || dataOrUri.startsWith('https://')) {
    return dataOrUri;
  }
  try {
    const storage = getFirebaseStorage();
    if (!storage) throw new Error("Firebase Storage not available");

    const safePatId = (patId || 'unknown').toString().replace(/[^a-zA-Z0-9_-]/g, '_');
    const filename = `prescriptions/${safePatId}_${Date.now()}_${Math.random().toString(36).substring(2, 8)}.jpg`;
    const fileRef = storageRef(storage, filename);

    if (dataOrUri.startsWith('data:')) {
      await uploadString(fileRef, dataOrUri, 'data_url');
      const downloadUrl = await getDownloadURL(fileRef);
      return downloadUrl;
    }
  } catch (err) {
    console.warn("Firebase storage upload notice:", err);
  }
  return dataOrUri;
};
import { calculateDurationExpiry, getPatientVisitState } from '../utils/patientVisitState';
import { calculateRealBranchRevenue, syncBranchTargetToFirestore } from '../utils/branchRevenueCalculator';
import { receptionDataStore } from '../utils/receptionDataStore';
export interface CheckoutMedicineItem {
  id: string;
  name: string;
  amount: number;
  timing?: string;
}

export const DOSAGE_TIMING_OPTIONS = [
  { value: '', label: 'Select Pill Timing' },
  { value: 'M - A - N', label: 'M - A - N (Morning - Afternoon - Night)' },
  { value: 'M - - E', label: 'M - - E (Morning - Evening)' },
  { value: 'M - - N', label: 'M - - N (Morning - Night)' },
  { value: 'M - A -', label: 'M - A - (Morning - Afternoon)' },
  { value: '- A - N', label: '- A - N (Afternoon - Night)' },
  { value: 'M - - -', label: 'M - - - (Morning Only)' },
  { value: '- A -', label: '- A - (Afternoon Only)' },
  { value: '- - E', label: '- - E (Evening Only)' },
  { value: '- - N', label: '- - N (Night Only)' },
  { value: '1-0-1', label: '1-0-1 (Morning & Night)' },
  { value: '1-1-1', label: '1-1-1 (Morning, Afternoon, Night)' },
  { value: '1-0-0', label: '1-0-0 (Morning Only)' },
  { value: '0-0-1', label: '0-0-1 (Night Only)' },
  { value: 'SOS', label: 'SOS (As Needed)' },
];

export function distributeAmountEvenly(total: number, count: number): number[] {
  if (count <= 0) return [];
  if (count === 1) return [Math.max(0, total)];
  const safeTotal = Math.max(0, total);
  const base = Math.floor(safeTotal / count);
  const remainder = safeTotal - (base * count);
  const amounts = new Array(count).fill(base);
  for (let i = 0; i < remainder; i++) {
    amounts[count - 1 - i] += 1;
  }
  return amounts;
}

export interface AppointmentPaymentModalProps {
  visible: boolean;
  onDismiss: () => void;
  selectedPatientForPayment: any;
  includeConsultation?: boolean;
  setIncludeConsultation?: (val: boolean) => void;
  onPaymentSuccess?: (paymentData: any) => void;
}
export const AppointmentPaymentModal: React.FC<AppointmentPaymentModalProps> = ({
  visible,
  onDismiss,
  selectedPatientForPayment,
  includeConsultation = true,
  setIncludeConsultation,
  onPaymentSuccess,
}) => {
  const [showPatientDetails, setShowPatientDetails] = useState(false);
  const [targetAmount, setTargetAmount] = useState<number>(0);
  const [paymentTypePreset, setPaymentTypePreset] = useState<'consultation' | 'consultation_med' | 'split' | 'package'>('consultation');

  // Active Duration (IN-DUR) State
  const [activeDurationInfo, setActiveDurationInfo] = useState<{
    duration: string;
    expiryDate: string;
    startDate: string;
    daysRemaining: number;
  } | null>(null);

  // Care Package State
  const [existingActivePackage, setExistingActivePackage] = useState<any | null>(null);
  const [packageTotalAmountInput, setPackageTotalAmountInput] = useState<number | string>('');
  const [packageDurationInput, setPackageDurationInput] = useState<string>('3 Months');
  const [packageAdvancePaidInput, setPackageAdvancePaidInput] = useState<number | string>('');
  const [packageInstallmentInput, setPackageInstallmentInput] = useState<number | string>('');
  const [showPackageDurationModal, setShowPackageDurationModal] = useState(false);

  // Fee Checkbox Selection States
  const [includeConsultFee, setIncludeConsultFee] = useState<boolean>(true);
  const [includeMedicineFee, setIncludeMedicineFee] = useState<boolean>(false);
  const [includeDietFee, setIncludeDietFee] = useState<boolean>(false);
  const [includeOtherCharges, setIncludeOtherCharges] = useState<boolean>(false);

  // Fee Amount Inputs
  const [consultFeeInput, setConsultFeeInput] = useState<number>(0);
  const [medicineFeeInput, setMedicineFeeInput] = useState<number>(0);
  const [dietFeeInput, setDietFeeInput] = useState<number>(0);
  const [otherChargesInput, setOtherChargesInput] = useState<number>(0);
  const [discountInput, setDiscountInput] = useState<number>(0);
  const [showDiscountInput, setShowDiscountInput] = useState(false);

  // Duration & Individual Medicine Items
  const [medicineDuration, setMedicineDuration] = useState<string>('1 Month');
  const [medicineItems, setMedicineItems] = useState<CheckoutMedicineItem[]>([]);
  const [timingPickerItemIndex, setTimingPickerItemIndex] = useState<number | null>(null);

  // Payment Mode
  const [selectedPaymentMode, setSelectedPaymentMode] = useState<string>('Cash');
  const [splitMethod1, setSplitMethod1] = useState<string>('Cash');
  const [splitMethod2, setSplitMethod2] = useState<string>('UPI');
  const [splitAmount1, setSplitAmount1] = useState<string>('');
  const [splitAmount2, setSplitAmount2] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Prescription State (Mandatory to Collect Amount)
  const scrollViewRef = useRef<ScrollView | null>(null);
  const [uploadedPrescriptionList, setUploadedPrescriptionList] = useState<string[]>([]);
  const [isUploadingPrescription, setIsUploadingPrescription] = useState<boolean>(false);
  const [previewModalUrl, setPreviewModalUrl] = useState<string | null>(null);

  const [paymentSuccessPopup, setPaymentSuccessPopup] = useState<{
    patientName: string;
    totalPaid: number;
    paymentMode: string;
    completedInvoice: any;
  } | null>(null);
  const isAlreadyPaid = Boolean(
    (selectedPatientForPayment?.paymentStatus === 'paid' || selectedPatientForPayment?.status === 'completed') &&
    selectedPatientForPayment?.status !== 'collect_fee' &&
    selectedPatientForPayment?.feeCollectionNeeded !== true
  );
  const [invoiceApp, setInvoiceApp] = useState<any | null>(() => (
    selectedPatientForPayment && isAlreadyPaid ? selectedPatientForPayment : null
  ));
  const activeInvoice = invoiceApp || (isAlreadyPaid ? selectedPatientForPayment : null);

  const handleCancelOrDismiss = async () => {
    if (selectedPatientForPayment && !isAlreadyPaid && !paymentSuccessPopup) {
      const targetId = selectedPatientForPayment.id;
      const activeDb = getSafeDb();
      if (targetId && activeDb && (selectedPatientForPayment.status === 'collect_fee' || selectedPatientForPayment.feeCollectionNeeded === true)) {
        try {
          const resetPayload = {
            status: 'collect_fee',
            paymentStatus: 'pending',
            feeCollectionNeeded: true,
            paymentPending: true,
            updatedAt: new Date().toISOString()
          };
          await updateDoc(doc(activeDb, 'appointments', targetId), resetPayload).catch(() => { });
          await updateDoc(doc(activeDb, 'allpatients', targetId), resetPayload).catch(() => { });
          await updateDoc(doc(activeDb, 'patients', targetId), resetPayload).catch(() => { });
        } catch (e) { }
      }
    }
    onDismiss();
  };

  // Load existing prescriptions from appointment and Firestore prescriptions collection
  useEffect(() => {
    if (!selectedPatientForPayment || !visible) {
      setUploadedPrescriptionList([]);
      return;
    }
    const initialList: string[] = [];
    if (Array.isArray(selectedPatientForPayment.uploadedPrescriptions)) {
      initialList.push(...selectedPatientForPayment.uploadedPrescriptions);
    }
    if (selectedPatientForPayment.canvasPrescriptionUrl) {
      initialList.push(selectedPatientForPayment.canvasPrescriptionUrl);
    }
    if (selectedPatientForPayment.prescriptionUrl) {
      initialList.push(selectedPatientForPayment.prescriptionUrl);
    }
    setUploadedPrescriptionList(Array.from(new Set(initialList.filter(Boolean))));

    const fetchPrescriptions = async () => {
      try {
        const activeDb = getSafeDb();
        const targetId = selectedPatientForPayment.id || selectedPatientForPayment.patientDocId || selectedPatientForPayment.patientId;
        if (!targetId || !activeDb) return;
        const q = query(collection(activeDb, 'prescriptions'), where('appointmentId', '==', targetId));
        const snap = await getDocs(q);
        if (!snap.empty) {
          const found: string[] = [];
          snap.forEach(docSnap => {
            const d = docSnap.data();
            if (Array.isArray(d.uploadedPrescriptions)) found.push(...d.uploadedPrescriptions);
            if (d.canvasPrescriptionUrl) found.push(d.canvasPrescriptionUrl);
            if (d.prescriptionUrl) found.push(d.prescriptionUrl);
          });
          if (found.length > 0) {
            setUploadedPrescriptionList(prev => Array.from(new Set([...prev, ...found.filter(Boolean)])));
          }
        }
      } catch (e) {
        console.warn('Could not query prescriptions on mobile:', e);
      }
    };
    fetchPrescriptions();
  }, [selectedPatientForPayment, visible]);

  const handlePickPrescriptionFromGallery = async () => {
    if (!selectedPatientForPayment) return;
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Permission Required', 'Please allow gallery access to select prescription photos.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: true,
        selectionLimit: 0, // 0 = unlimited selection (no limit on number of images)
        quality: 0.3,
        base64: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setIsUploadingPrescription(true);
        const targetId = selectedPatientForPayment.id || selectedPatientForPayment.patientDocId || 'unknown';
        const newUrls: string[] = [];
        const activeDb = getSafeDb();
        for (const asset of result.assets) {
          const rawData = asset.base64 ? `data:image/jpeg;base64,${asset.base64}` : asset.uri;
          const cloudUrl = await uploadPrescriptionToStorage(rawData, targetId);
          if (cloudUrl) {
            newUrls.push(cloudUrl);
            if (selectedPatientForPayment.id && activeDb) {
              await updateDoc(doc(activeDb, 'appointments', selectedPatientForPayment.id), {
                uploadedPrescriptions: arrayUnion(cloudUrl),
                updatedAt: new Date().toISOString()
              }).catch(() => { });
              await updateDoc(doc(activeDb, 'allpatients', selectedPatientForPayment.id), {
                uploadedPrescriptions: arrayUnion(cloudUrl),
                updatedAt: new Date().toISOString()
              }).catch(() => { });
              await updateDoc(doc(activeDb, 'patients', selectedPatientForPayment.id), {
                uploadedPrescriptions: arrayUnion(cloudUrl),
                updatedAt: new Date().toISOString()
              }).catch(() => { });
            }
          }
        }
        setUploadedPrescriptionList(prev => Array.from(new Set([...prev, ...newUrls])));
        Alert.alert('Prescription Attached ✓', 'Prescription image uploaded successfully.');
      }
    } catch (err) {
      console.error('Gallery pick error:', err);
      Alert.alert('Error', 'Could not open device photo gallery.');
    } finally {
      setIsUploadingPrescription(false);
    }
  };

  const handleTakePrescriptionPhoto = async () => {
    if (!selectedPatientForPayment) return;
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Permission Required', 'Please allow camera access to take prescription photos.');
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        quality: 0.3, // Compresses camera capture down to ~150KB-250KB with clear text
        base64: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setIsUploadingPrescription(true);
        const targetId = selectedPatientForPayment.id || selectedPatientForPayment.patientDocId || 'unknown';
        const newUrls: string[] = [];
        const activeDb = getSafeDb();
        for (const asset of result.assets) {
          const rawData = asset.base64 ? `data:image/jpeg;base64,${asset.base64}` : asset.uri;
          const cloudUrl = await uploadPrescriptionToStorage(rawData, targetId);
          if (cloudUrl) {
            newUrls.push(cloudUrl);
            if (selectedPatientForPayment.id && activeDb) {
              await updateDoc(doc(activeDb, 'appointments', selectedPatientForPayment.id), {
                uploadedPrescriptions: arrayUnion(cloudUrl),
                updatedAt: new Date().toISOString()
              }).catch(() => { });
              await updateDoc(doc(activeDb, 'allpatients', selectedPatientForPayment.id), {
                uploadedPrescriptions: arrayUnion(cloudUrl),
                updatedAt: new Date().toISOString()
              }).catch(() => { });
              await updateDoc(doc(activeDb, 'patients', selectedPatientForPayment.id), {
                uploadedPrescriptions: arrayUnion(cloudUrl),
                updatedAt: new Date().toISOString()
              }).catch(() => { });
            }
          }
        }
        setUploadedPrescriptionList(prev => Array.from(new Set([...prev, ...newUrls])));
        Alert.alert('Prescription Attached ✓', 'Prescription photo captured and attached.');
      }
    } catch (err) {
      console.error('Camera capture error:', err);
      Alert.alert('Error', 'Could not access device camera.');
    } finally {
      setIsUploadingPrescription(false);
    }
  };

  const handleRemovePrescription = async (urlToRemove: string) => {
    Alert.alert(
      'Remove Prescription',
      'Are you sure you want to remove this prescription page?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            const updated = uploadedPrescriptionList.filter(u => u !== urlToRemove);
            setUploadedPrescriptionList(updated);
            const activeDb = getSafeDb();
            if (selectedPatientForPayment?.id && activeDb) {
              await updateDoc(doc(activeDb, 'appointments', selectedPatientForPayment.id), {
                uploadedPrescriptions: updated,
                updatedAt: new Date().toISOString()
              }).catch(() => { });
              await updateDoc(doc(activeDb, 'allpatients', selectedPatientForPayment.id), {
                uploadedPrescriptions: updated,
                updatedAt: new Date().toISOString()
              }).catch(() => { });
              await updateDoc(doc(activeDb, 'patients', selectedPatientForPayment.id), {
                uploadedPrescriptions: updated,
                updatedAt: new Date().toISOString()
              }).catch(() => { });
            }
          }
        }
      ]
    );
  };

  useEffect(() => {
    if (selectedPatientForPayment) {
      setPaymentSuccessPopup(null);
      const mFee = Number(selectedPatientForPayment.pharmacyFee || selectedPatientForPayment.medicineFeeRequested || selectedPatientForPayment.medicineFee) || 0;
      const cFee = mFee > 0 ? 0 : (selectedPatientForPayment.consultationFee !== undefined && selectedPatientForPayment.consultationFee !== null ? Number(selectedPatientForPayment.consultationFee) : 0);
      const dFee = Number(selectedPatientForPayment.dietFee || selectedPatientForPayment.dietFeeAmount || selectedPatientForPayment.dietPlan?.dietFeeAmount || selectedPatientForPayment.dietPlan?.dietFee) || 0;
      const oFee = Number(selectedPatientForPayment.otherCharges) || 0;
      const disc = Number(selectedPatientForPayment.discount) || 0;

      // Target Amount represents strictly the Doctor's Consultation + Medicine target (Diet Plan is completely separate)
      const explicitTarget = selectedPatientForPayment.targetAmount ?? selectedPatientForPayment.target_amount;
      let computedTarget = 0;
      if (explicitTarget !== undefined && explicitTarget !== null && Number(explicitTarget) > 0) {
        computedTarget = Number(explicitTarget);
      } else if (mFee > 0) {
        computedTarget = mFee;
      } else if (selectedPatientForPayment.totalAmount !== undefined && selectedPatientForPayment.totalAmount !== null && Number(selectedPatientForPayment.totalAmount) > 0) {
        // If totalAmount was provided, subtract diet fee so target is strictly consult + medicine
        computedTarget = Math.max(0, Number(selectedPatientForPayment.totalAmount) - dFee);
      } else if (cFee > 0) {
        computedTarget = cFee;
      } else {
        computedTarget = 1000;
      }

      setDietFeeInput(dFee);
      setOtherChargesInput(oFee);
      setDiscountInput(disc);
      setTargetAmount(computedTarget);

      // Care Package fields strictly from doctor prescription if present, else clean empty
      const presPkgTotal = Number(selectedPatientForPayment?.packageTotalAmount) || '';
      const presPkgAdvance = Number(selectedPatientForPayment?.packageAdvancePaid ?? selectedPatientForPayment?.packageFee) || '';
      const presPkgDuration = selectedPatientForPayment?.packageDuration || '3 Months';
      setPackageTotalAmountInput(presPkgTotal);
      setPackageAdvancePaidInput(presPkgAdvance);
      setPackageDurationInput(presPkgDuration);

      if (dFee > 0) {
        setIncludeDietFee(true);
      }

      if (mFee > 0 && cFee > 0) {
        setPaymentTypePreset('split');
        setIncludeConsultFee(true);
        setIncludeMedicineFee(true);
        if (cFee + mFee <= computedTarget) {
          setConsultFeeInput(cFee);
          setMedicineFeeInput(mFee);
        } else {
          setConsultFeeInput(cFee);
          setMedicineFeeInput(Math.max(0, computedTarget - cFee));
        }
      } else if (mFee > 0) {
        setPaymentTypePreset('consultation_med');
        setIncludeConsultFee(true);
        setIncludeMedicineFee(false);
        setConsultFeeInput(computedTarget);
        setMedicineFeeInput(0);
      } else {
        setPaymentTypePreset('consultation');
        setIncludeConsultFee(true);
        setIncludeMedicineFee(false);
        setConsultFeeInput(computedTarget > 0 ? computedTarget : 500);
        setMedicineFeeInput(0);
      }

      if (isAlreadyPaid) {
        setInvoiceApp(selectedPatientForPayment);
      } else {
        setInvoiceApp(null);
      }
    }
  }, [selectedPatientForPayment, visible]);

  // Query package_members with strict profile isolation
  useEffect(() => {
    if (!selectedPatientForPayment || !visible) {
      setExistingActivePackage(null);
      return;
    }

    const findPackage = async () => {
      try {
        const activeDb = getSafeDb();
        if (!activeDb) return;
        const snap = await getDocs(collection(activeDb, 'package_members'));
        const targetDocId = String(selectedPatientForPayment.patientDocId || selectedPatientForPayment.patient_id || selectedPatientForPayment.patientId || selectedPatientForPayment.id || '').trim();
        const cleanReg = String(selectedPatientForPayment.regId || selectedPatientForPayment.registrationId || selectedPatientForPayment.patientId || '').trim().toLowerCase();
        const cleanPhone = String(selectedPatientForPayment.phone || selectedPatientForPayment.phoneNumber || '').replace(/\D/g, '').slice(-10);
        const patName = String(selectedPatientForPayment.patientName || selectedPatientForPayment.name || '').trim().toLowerCase();

        let found: any = null;
        snap.forEach(docSnap => {
          if (found) return;
          const data = docSnap.data();
          const expTime = data.expiryDate ? new Date(data.expiryDate).getTime() : Infinity;
          if (!isNaN(expTime) && expTime < Date.now()) return;

          if (targetDocId && (data.patientDocId === targetDocId || docSnap.id === targetDocId || data.patientDocId === selectedPatientForPayment.id)) {
            found = { id: docSnap.id, ...data };
            return;
          }
          if (cleanReg && data.patientId && String(data.patientId).trim().toLowerCase() === cleanReg) {
            found = { id: docSnap.id, ...data };
            return;
          }
          if (cleanPhone && data.phone && String(data.phone).replace(/\D/g, '').slice(-10) === cleanPhone) {
            const mName = String(data.patientName || data.name || '').trim().toLowerCase();
            if (patName && (mName === patName || mName.includes(patName) || patName.includes(mName))) {
              found = { id: docSnap.id, ...data };
              return;
            }
          }
        });

        if (found) {
          setExistingActivePackage(found);
          setPaymentTypePreset('package');
          setIncludeConsultFee(false);
          setIncludeMedicineFee(false);
          setIncludeDietFee(false);
          setIncludeOtherCharges(false);
          const rem = Number(found.remainingAmount || 0);
          setPackageInstallmentInput(rem > 0 ? rem : 0);
        } else {
          setExistingActivePackage(null);
        }
      } catch (e) {
        console.error('Error finding package member in mobile checkout:', e);
      }
    };

    const checkActiveDuration = async () => {
      try {
        if (!selectedPatientForPayment || !visible) {
          setActiveDurationInfo(null);
          return;
        }

        const cleanPhone = (selectedPatientForPayment.phone || selectedPatientForPayment.phoneNumber || '').replace(/\D/g, '').slice(-10);
        const targetDocId = String(selectedPatientForPayment.patientDocId || selectedPatientForPayment.patient_id || selectedPatientForPayment.patientId || selectedPatientForPayment.id || '');
        const patName = String(selectedPatientForPayment.patientName || selectedPatientForPayment.name || '').trim().toLowerCase();
        const cleanReg = String(selectedPatientForPayment.regId || selectedPatientForPayment.registrationId || selectedPatientForPayment.patientId || '').trim().toLowerCase();

        const explicitTarget = selectedPatientForPayment.targetAmount ?? selectedPatientForPayment.target_amount;
        const hasExplicitTarget = explicitTarget !== undefined && explicitTarget !== null && Number(explicitTarget) > 0;
        const explicitTargetVal = hasExplicitTarget ? Number(explicitTarget) : (Number(selectedPatientForPayment.medicineFeeRequested || selectedPatientForPayment.medicineFee || 0));

        // 1. Check patient visit state using unified multi-collection pool
        try {
          const pool = receptionDataStore.getAllCollectionsPool();
          const pkgs = receptionDataStore.getPackageMembers();
          const visitState = getPatientVisitState(selectedPatientForPayment, pool, pkgs);
          if (visitState.type === 'IN_DUR') {
            setActiveDurationInfo({
              duration: visitState.durationLabel || 'Active Duration',
              expiryDate: visitState.expiryDate || '',
              startDate: selectedPatientForPayment.durationStartDate || selectedPatientForPayment.appointmentDate || new Date().toISOString(),
              daysRemaining: visitState.daysRemaining ?? 0
            });
            if (explicitTargetVal > 0) {
              setTargetAmount(explicitTargetVal);
              setConsultFeeInput(explicitTargetVal);
              setMedicineFeeInput(0);
              setIncludeConsultFee(true);
              setIncludeMedicineFee(false);
            } else {
              setTargetAmount(0);
              setConsultFeeInput(0);
              setMedicineFeeInput(0);
              setIncludeConsultFee(false);
              setIncludeMedicineFee(false);
            }
            return;
          }
        } catch (poolErr) {
          console.warn('Error reading visit state from pool in mobile checkout:', poolErr);
        }

        // Check current appointment fields first
        const curExpStr = selectedPatientForPayment.durationExpiryDate || selectedPatientForPayment.medicineDurationExpiryDate || selectedPatientForPayment.preferredFollowUpDate || selectedPatientForPayment.scheduledDate;
        if (curExpStr) {
          const expTime = new Date(curExpStr).getTime();
          if (!isNaN(expTime) && expTime >= Date.now()) {
            const daysLeft = Math.max(0, Math.ceil((expTime - Date.now()) / (1000 * 60 * 60 * 24)));
            setActiveDurationInfo({
              duration: selectedPatientForPayment.medicineDuration || selectedPatientForPayment.duration || selectedPatientForPayment.followUpInterval || 'Active Duration',
              expiryDate: curExpStr,
              startDate: selectedPatientForPayment.durationStartDate || selectedPatientForPayment.appointmentDate || new Date().toISOString(),
              daysRemaining: daysLeft
            });
            if (explicitTargetVal > 0) {
              setTargetAmount(explicitTargetVal);
              setConsultFeeInput(explicitTargetVal);
              setMedicineFeeInput(0);
              setIncludeConsultFee(true);
              setIncludeMedicineFee(false);
            } else {
              setTargetAmount(0);
              setConsultFeeInput(0);
              setMedicineFeeInput(0);
              setIncludeConsultFee(false);
              setIncludeMedicineFee(false);
            }
            return;
          }
        }

        // Query past completed appointments
        const activeDb = getSafeDb();
        if (!activeDb) return;
        const snap = await getDocs(collection(activeDb, 'appointments'));
        const pastList: any[] = [];
        snap.forEach(docSnap => {
          if (docSnap.id === selectedPatientForPayment.id) return;
          const d = { id: docSnap.id, ...docSnap.data() } as any;
          if (d.status !== 'completed' && d.paymentStatus !== 'paid') return;

          const dDocId = String(d.patientDocId || d.patient_id || d.patientId || d.id || '');
          const dReg = String(d.regId || d.registrationId || d.patientId || '').trim().toLowerCase();
          const dPhone = (d.phone || d.phoneNumber || '').replace(/\D/g, '').slice(-10);
          const dName = String(d.patientName || d.name || '').trim().toLowerCase();

          if (targetDocId && (dDocId === targetDocId || d.patientDocId === selectedPatientForPayment.id)) pastList.push(d);
          else if (cleanReg && dReg === cleanReg) pastList.push(d);
          else if (cleanPhone && dPhone === cleanPhone && patName && (dName === patName || dName.includes(patName))) pastList.push(d);
        });

        if (pastList.length > 0) {
          pastList.sort((a, b) => {
            const timeA = new Date(a.paymentCollectedAt || a.completedAt || a.appointmentDate || a.date || a.createdAt || 0).getTime();
            const timeB = new Date(b.paymentCollectedAt || b.completedAt || b.appointmentDate || b.date || b.createdAt || 0).getTime();
            return timeB - timeA;
          });

          const latestPast = pastList[0];
          const pastDur = latestPast.medicineDuration || latestPast.duration || latestPast.packageDuration;
          if (pastDur) {
            const pStart = latestPast.durationStartDate || latestPast.paymentCollectedAt || latestPast.completedAt || latestPast.appointmentDate || latestPast.date || latestPast.createdAt || new Date().toISOString();
            const pExpiry = latestPast.durationExpiryDate
              ? new Date(latestPast.durationExpiryDate)
              : calculateDurationExpiry(pStart, pastDur);

            if (pExpiry.getTime() >= Date.now()) {
              const daysLeft = Math.max(0, Math.ceil((pExpiry.getTime() - Date.now()) / (1000 * 60 * 60 * 24)));
              setActiveDurationInfo({
                duration: pastDur,
                expiryDate: pExpiry.toISOString(),
                startDate: pStart,
                daysRemaining: daysLeft
              });
              if (explicitTargetVal > 0) {
                setTargetAmount(explicitTargetVal);
                setConsultFeeInput(explicitTargetVal);
                setMedicineFeeInput(0);
                setIncludeConsultFee(true);
                setIncludeMedicineFee(false);
              } else {
                setTargetAmount(0);
                setConsultFeeInput(0);
                setMedicineFeeInput(0);
                setIncludeConsultFee(false);
                setIncludeMedicineFee(false);
              }
              return;
            }
          }
        }
        setActiveDurationInfo(null);
      } catch (e) {
        console.warn('Error checking active duration in mobile checkout:', e);
      }
    };

    findPackage();
    checkActiveDuration();
  }, [selectedPatientForPayment, visible]);

  // Handle Preset Pills
  const handlePresetSelect = (preset: 'consultation' | 'consultation_med' | 'split' | 'package') => {
    setPaymentTypePreset(preset);
    const currTarget = targetAmount > 0
      ? targetAmount
      : (Number(selectedPatientForPayment?.targetAmount ?? selectedPatientForPayment?.target_amount) || 0);
    const defaultConsult = Number(selectedPatientForPayment?.consultationFee) || 0;

    if (preset === 'consultation') {
      setIncludeConsultFee(true);
      setIncludeMedicineFee(false);
      setConsultFeeInput(currTarget);
      setMedicineFeeInput(0);
    } else if (preset === 'consultation_med') {
      setIncludeConsultFee(true);
      setIncludeMedicineFee(false);
      setConsultFeeInput(currTarget);
      setMedicineFeeInput(0);
    } else if (preset === 'split') {
      setIncludeConsultFee(true);
      setIncludeMedicineFee(true);
      // Split comes strictly from target amount only (e.g. 1000) and does not touch diet fee
      const cPortion = currTarget > defaultConsult ? defaultConsult : Math.round(currTarget / 2);
      const mPortion = Math.max(0, currTarget - cPortion);
      setConsultFeeInput(cPortion);
      setMedicineFeeInput(mPortion);
      setSelectedPaymentMode('Split');
      if (mPortion > 0) {
        if (medicineItems.length === 0) {
          // Starts with 1 medicine containing the full medicine target (e.g. 500)
          setMedicineItems([
            { id: '1', name: '', amount: mPortion, timing: '' }
          ]);
        } else {
          // Evenly re-split across existing medicines
          const splitAmounts = distributeAmountEvenly(mPortion, medicineItems.length);
          setMedicineItems(prev => prev.map((item, i) => ({
            ...item,
            amount: splitAmounts[i]
          })));
        }
      }
    } else if (preset === 'package') {
      setIncludeConsultFee(false);
      setIncludeMedicineFee(false);
      setIncludeDietFee(false);
      setIncludeOtherCharges(false);
      if (existingActivePackage) {
        const rem = Number(existingActivePackage.remainingAmount || 0);
        setPackageInstallmentInput(rem > 0 ? (rem > 1000 ? 1000 : rem) : 0);
      } else {
        const presPkgTotal = Number(selectedPatientForPayment?.packageTotalAmount) || '';
        const presPkgAdvance = Number(selectedPatientForPayment?.packageAdvancePaid ?? selectedPatientForPayment?.packageFee) || '';
        setPackageTotalAmountInput(presPkgTotal);
        setPackageAdvancePaidInput(presPkgAdvance);
        setPackageDurationInput(selectedPatientForPayment?.packageDuration || '3 Months');
      }
    }
  };

  const handleAddMedicineRow = () => {
    const newCount = medicineItems.length + 1;
    const targetTotal = medicineFeeInput > 0 ? medicineFeeInput : 500;
    const splitAmounts = distributeAmountEvenly(targetTotal, newCount);

    const updated = medicineItems.map((item, i) => ({
      ...item,
      amount: splitAmounts[i]
    }));

    updated.push({
      id: String(Date.now()),
      name: '',
      amount: splitAmounts[newCount - 1],
      timing: ''
    });

    setMedicineItems(updated);
    setMedicineFeeInput(targetTotal);
  };

  const handleRemoveMedicineItem = (idx: number) => {
    const remaining = medicineItems.filter((_, i) => i !== idx);
    if (remaining.length > 0) {
      const targetTotal = medicineFeeInput > 0 ? medicineFeeInput : 500;
      const splitAmounts = distributeAmountEvenly(targetTotal, remaining.length);
      const updated = remaining.map((item, i) => ({
        ...item,
        amount: splitAmounts[i]
      }));
      setMedicineItems(updated);
    } else {
      setMedicineItems([]);
    }
  };

  const handleUpdateMedicineItem = (idx: number, field: 'name' | 'amount' | 'timing', val: any) => {
    const updated = [...medicineItems];
    updated[idx] = { ...updated[idx], [field]: val };
    setMedicineItems(updated);
    if (field === 'amount') {
      const newTotal = updated.reduce((acc, m) => acc + (Number(m.amount) || 0), 0);
      setMedicineFeeInput(newTotal);
    }
  };

  const handleTargetAmountChange = (newTarget: number) => {
    setTargetAmount(newTarget);
    const defaultConsult = Number(selectedPatientForPayment?.consultationFee) || 0;
    if (paymentTypePreset === 'package') {
      // When preset is package, doctor's target fee is ignored - package has its own package amount
      return;
    }
    if (newTarget > 0) {
      if (paymentTypePreset === 'split') {
        setIncludeConsultFee(true);
        setIncludeMedicineFee(true);
        const cPortion = newTarget > defaultConsult && defaultConsult > 0 ? defaultConsult : Math.round(newTarget / 2);
        const mPortion = Math.max(0, newTarget - cPortion);
        setConsultFeeInput(cPortion);
        setMedicineFeeInput(mPortion);
        if (mPortion > 0) {
          if (medicineItems.length === 0) {
            setMedicineItems([{ id: '1', name: '', amount: mPortion, timing: '' }]);
          } else {
            const splitAmounts = distributeAmountEvenly(mPortion, medicineItems.length);
            setMedicineItems(prev => prev.map((item, i) => ({
              ...item,
              amount: splitAmounts[i]
            })));
          }
        }
      } else {
        // consultation or consultation_med
        setIncludeConsultFee(true);
        setConsultFeeInput(newTarget);
        setMedicineFeeInput(0);
      }
    } else {
      setConsultFeeInput(0);
      setMedicineFeeInput(0);
      if (activeDurationInfo) {
        setIncludeConsultFee(false);
        setIncludeMedicineFee(false);
      }
    }
  };

  const handleConsultFeeChange = (val: number) => {
    const safeTarget = targetAmount > 0 ? targetAmount : val;
    const cappedVal = targetAmount > 0 ? Math.min(val, safeTarget) : val;
    setConsultFeeInput(cappedVal);
    if (cappedVal > 0) {
      setIncludeConsultFee(true);
    }
    if (includeMedicineFee && targetAmount > 0) {
      const mPortion = Math.max(0, targetAmount - cappedVal);
      setMedicineFeeInput(mPortion);
      if (medicineItems.length > 0) {
        const splitAmounts = distributeAmountEvenly(mPortion, medicineItems.length);
        setMedicineItems(prev => prev.map((item, i) => ({
          ...item,
          amount: splitAmounts[i]
        })));
      }
    }
  };

  const handleMedicineFeeChange = (val: number) => {
    const safeTarget = targetAmount > 0 ? targetAmount : val;
    const cappedVal = targetAmount > 0 ? Math.min(val, safeTarget) : val;
    setMedicineFeeInput(cappedVal);
    if (cappedVal > 0) {
      setIncludeMedicineFee(true);
    }
    if (includeConsultFee && targetAmount > 0) {
      setConsultFeeInput(Math.max(0, targetAmount - cappedVal));
    }
    if (medicineItems.length > 0) {
      const splitAmounts = distributeAmountEvenly(cappedVal, medicineItems.length);
      setMedicineItems(prev => prev.map((item, i) => ({
        ...item,
        amount: splitAmounts[i]
      })));
    }
  };
  const activeConsultFee = includeConsultFee ? consultFeeInput : 0;
  const activeMedicineFee = includeMedicineFee ? medicineFeeInput : 0;
  const activeDietFee = includeDietFee ? dietFeeInput : 0;
  const activeOtherCharges = includeOtherCharges ? otherChargesInput : 0;
  const isPackageCoveredFully = existingActivePackage && Number(existingActivePackage.remainingAmount || 0) <= 0;
  const baseDue = activeConsultFee + activeMedicineFee + activeDietFee + activeOtherCharges - discountInput;
  let totalAmountDue = Math.max(0, baseDue);
  if (isPackageCoveredFully) {
    totalAmountDue = 0;
  } else if (existingActivePackage && paymentTypePreset === 'package') {
    totalAmountDue = Number(packageInstallmentInput) || 0;
  } else if (!existingActivePackage && paymentTypePreset === 'package') {
    totalAmountDue = Number(packageAdvancePaidInput) || 0;
  }
  const hasPrescription = uploadedPrescriptionList.length > 0 || Boolean(selectedPatientForPayment?.canvasPrescriptionUrl) || Boolean(selectedPatientForPayment?.prescriptionUrl);
  const handleConfirmCheckout = async () => {
    if (!selectedPatientForPayment) return;
    if (!hasPrescription) {
      Alert.alert(
        '⚠️ Prescription Required (Mandatory)',
        'Clinic policy strictly requires a prescription to be uploaded before fee collection. Please take a photo of the prescription or choose it from your gallery to proceed.',
        [{ text: 'OK' }]
      );
      scrollViewRef.current?.scrollTo({ y: 0, animated: true });
      return;
    }
    // 1. Mandatory Payment Method Validation
    if (!isPackageCoveredFully && totalAmountDue > 0) {
      if (!selectedPaymentMode || selectedPaymentMode.trim() === '') {
        Alert.alert(
          '⚠️ Payment Method Required (Mandatory)',
          'Please select a payment method (Cash, UPI, Card, Net Banking, or Split) before completing the payment.',
          [{ text: 'OK' }]
        );
        return;
      }
      if (selectedPaymentMode === 'Split') {
        const amt1 = Number(splitAmount1) || 0;
        const amt2 = Number(splitAmount2) || 0;
        if (!splitMethod1 || !splitMethod2 || amt1 <= 0 || amt2 <= 0) {
          Alert.alert(
            '⚠️ Invalid Split Payment',
            'Please select both payment methods and enter valid positive amounts for both split payment methods.',
            [{ text: 'OK' }]
          );
          return;
        }
        if (Math.abs((amt1 + amt2) - totalAmountDue) > 0.01) {
          Alert.alert(
            '⚠️ Split Payment Mismatch',
            `The sum of split amounts (₹${amt1} + ₹${amt2} = ₹${amt1 + amt2}) must equal the total amount due (₹${totalAmountDue}).`,
            [{ text: 'OK' }]
          );
          return;
        }
      }
    }
    setIsSubmitting(true);
    const paymentModeText =
      selectedPaymentMode === 'Split'
        ? `Split (${splitMethod1} ₹${Number(splitAmount1) || 0} + ${splitMethod2} ₹${Number(splitAmount2) || 0})`
        : (isPackageCoveredFully ? 'Package Covered (₹0)' : selectedPaymentMode);

    const isPkg = paymentTypePreset === 'package' || !!existingActivePackage;
    const packagePayload: any = {};
    if (isPkg) {
      packagePayload.isPackageMember = true;
      packagePayload.hasActivePackage = true;
      if (existingActivePackage) {
        packagePayload.packageDuration = existingActivePackage.duration || '3 Months';
        packagePayload.packageTotalAmount = Number(existingActivePackage.totalAmount || 0);
        packagePayload.packageAdvancePaid = Number(existingActivePackage.paidAmount || 0) + totalAmountDue;
        packagePayload.packageRemainingAmount = Math.max(0, Number(existingActivePackage.totalAmount || 0) - (Number(existingActivePackage.paidAmount || 0) + totalAmountDue));
        packagePayload.packageFee = totalAmountDue;
      } else {
        const pkgTot = Number(packageTotalAmountInput) || totalAmountDue;
        const pkgAdv = Number(packageAdvancePaidInput) || totalAmountDue;
        packagePayload.packageDuration = packageDurationInput || '3 Months';
        packagePayload.packageTotalAmount = pkgTot;
        packagePayload.packageAdvancePaid = pkgAdv;
        packagePayload.packageRemainingAmount = Math.max(0, pkgTot - pkgAdv);
        packagePayload.packageFee = totalAmountDue;
      }
    }
    const nowIso = new Date().toISOString();
    const isDurationFollowUp = activeDurationInfo && totalAmountDue === 0;
    let computedDurationStartDate = nowIso;
    let computedDurationExpiryDate = activeDurationInfo ? activeDurationInfo.expiryDate : calculateDurationExpiry(nowIso, medicineDuration).toISOString();
    let finalMedicineDuration = activeDurationInfo ? activeDurationInfo.duration : (medicineDuration || '1 Month');
    // If new duration was opted or fee entered, renew duration from today
    if ((includeMedicineFee || totalAmountDue > 0) && medicineDuration) {
      computedDurationStartDate = nowIso;
      computedDurationExpiryDate = calculateDurationExpiry(nowIso, medicineDuration).toISOString();
      finalMedicineDuration = medicineDuration;
    }

    const payload = {
      status: 'completed',
      paymentStatus: 'paid',
      paymentPending: false,
      feeCollectionNeeded: false,
      paymentCollectedAt: nowIso,
      consultationFee: isPkg ? 0 : activeConsultFee,
      medicineFee: isPkg ? 0 : activeMedicineFee,
      dietFee: isPkg ? 0 : activeDietFee,
      otherCharges: isPkg ? 0 : activeOtherCharges,
      discount: discountInput,
      targetAmount: isPkg ? totalAmountDue : targetAmount,
      totalPaid: totalAmountDue,
      paymentMode: paymentModeText,
      medicines: includeMedicineFee ? medicineItems : [],
      medicineDuration: finalMedicineDuration,
      durationStartDate: computedDurationStartDate,
      durationExpiryDate: computedDurationExpiryDate,
      isFollowUp: isDurationFollowUp || selectedPatientForPayment.isFollowUp || false,
      patientType: isDurationFollowUp ? 'in_duration_followup' : (isPkg ? 'package' : selectedPatientForPayment.patientType || 'standard'),
      notes: isDurationFollowUp
        ? `In-Duration Follow-up Visit (₹0 Covered • ${activeDurationInfo?.duration})`
        : (selectedPatientForPayment.notes || ''),
      uploadedPrescriptions: uploadedPrescriptionList,
      hasPrescription: true,
      prescriptionVerified: true,
      prescriptionVerifiedAt: nowIso,
      ...packagePayload,
      updatedAt: nowIso
    };

    try {
      const activeDb = getSafeDb();
      if (activeDb && selectedPatientForPayment.id) {
        const docId = selectedPatientForPayment.id;
        await updateDoc(doc(activeDb, 'appointments', docId), payload).catch(() => { });
        await updateDoc(doc(activeDb, 'allpatients', docId), payload).catch(() => { });
        await updateDoc(doc(activeDb, 'patients', docId), payload).catch(() => { });
      }

      // Ensure prescription record is saved in prescriptions collection
      if (uploadedPrescriptionList.length > 0 && activeDb) {
        addDoc(collection(activeDb, 'prescriptions'), {
          appointmentId: selectedPatientForPayment.id,
          patientId: selectedPatientForPayment.id,
          patientName: patientName,
          phone: patientPhone,
          doctorName: selectedPatientForPayment.doctorName || selectedPatientForPayment.doctor || 'Dr. Prashanth K Vaidya',
          branch: selectedPatientForPayment.branch || 'KPHB',
          uploadedPrescriptions: uploadedPrescriptionList,
          uploadedBy: 'Receptionist',
          createdAt: nowIso
        }).catch(() => { });
      }

      // Package Members Collection Updates
      if (existingActivePackage && paymentTypePreset === 'package' && totalAmountDue > 0) {
        const curPaid = Number(existingActivePackage.paidAmount || 0);
        const curTot = Number(existingActivePackage.totalAmount || 0);
        const newPaid = curPaid + totalAmountDue;
        const newRem = Math.max(0, curTot - newPaid);

        if (activeDb) {
          await updateDoc(doc(activeDb, 'package_members', existingActivePackage.id), {
            paidAmount: newPaid,
            remainingAmount: newRem,
            status: 'Active',
            updatedAt: new Date().toISOString(),
            paymentHistory: [
              ...(existingActivePackage.paymentHistory || []),
              {
                date: new Date().toISOString(),
                amount: totalAmountDue,
                paymentMode: paymentModeText,
                note: 'Package Due Payment',
                invoiceId: selectedPatientForPayment.id
              }
            ]
          }).catch(e => console.error('Error updating package_members in mobile:', e));
        }
      } else if (!existingActivePackage && paymentTypePreset === 'package') {
        let months = 3;
        if (packageDurationInput.includes('1 Month')) months = 1;
        else if (packageDurationInput.includes('2 Month')) months = 2;
        else if (packageDurationInput.includes('3 Month')) months = 3;
        else if (packageDurationInput.includes('4 Month')) months = 4;
        else if (packageDurationInput.includes('5 Month')) months = 5;
        else if (packageDurationInput.includes('6 Month')) months = 6;
        else if (packageDurationInput.includes('1 Year')) months = 12;

        const startDate = new Date();
        const expiryDate = new Date(startDate);
        expiryDate.setMonth(expiryDate.getMonth() + months);

        const cleanReg = selectedPatientForPayment.regId || selectedPatientForPayment.registrationId || selectedPatientForPayment.patientId || `SPH-${Date.now().toString().slice(-4)}`;
        const targetDocId = String(selectedPatientForPayment.patientDocId || selectedPatientForPayment.id);
        const pkgDocId = `PKG_${targetDocId.replace(/\W/g, '_')}`;

        const newPkgData = {
          id: pkgDocId,
          patientDocId: targetDocId,
          patientId: cleanReg,
          patientName: selectedPatientForPayment.patientName || selectedPatientForPayment.name || 'Patient',
          phone: (selectedPatientForPayment.phone || selectedPatientForPayment.phoneNumber || '').replace(/\D/g, '').slice(-10),
          branch: selectedPatientForPayment.branch || 'KPHB Branch',
          branchName: selectedPatientForPayment.branch || 'KPHB Branch',
          doctorName: selectedPatientForPayment.doctorName || selectedPatientForPayment.doctor || 'Dr. Prashanth k vaidya',
          packageName: 'Package',
          duration: packageDurationInput,
          durationMonths: months,
          startDate: startDate.toISOString(),
          paymentDate: startDate.toISOString(),
          expiryDate: expiryDate.toISOString(),
          totalAmount: Number(packageTotalAmountInput) || 0,
          paidAmount: Number(packageAdvancePaidInput) || 0,
          remainingAmount: Math.max(0, (Number(packageTotalAmountInput) || 0) - (Number(packageAdvancePaidInput) || 0)),
          status: 'Active',
          paymentHistory: [
            {
              date: startDate.toISOString(),
              amount: Number(packageAdvancePaidInput) || 0,
              paymentMode: paymentModeText,
              note: 'Initial Package Advance',
              invoiceId: selectedPatientForPayment.id
            }
          ],
          createdAt: startDate.toISOString(),
          updatedAt: startDate.toISOString()
        };

        if (activeDb) {
          await setDoc(doc(activeDb, 'package_members', pkgDocId), newPkgData).catch(e => console.error('Error creating package member in mobile:', e));
        }
      }

      // Trigger Leonas WhatsApp Invoice / Payment Receipt Notification
      sendInvoiceWhatsAppNotification({
        patientName: selectedPatientForPayment.patientName || selectedPatientForPayment.name || 'Patient',
        phone: selectedPatientForPayment.phone || selectedPatientForPayment.phoneNumber || '',
        invoiceId: selectedPatientForPayment.id,
        totalPaid: totalAmountDue,
        paymentMode: paymentModeText,
        branch: selectedPatientForPayment.branch || 'KPHB',
        doctorName: selectedPatientForPayment.doctorName || selectedPatientForPayment.doctor || selectedPatientForPayment.assignedDoctor || 'Dr. Prashanth K Vaidya'
      }).catch(err => console.error('WhatsApp invoice notification error:', err));

      const completedInvoice = { ...selectedPatientForPayment, ...payload };
      if (onPaymentSuccess) {
        onPaymentSuccess(completedInvoice);
      }

      // Automatically sync dynamic target reach and percentage for this branch to Firestore
      const targetBranch = selectedPatientForPayment.branch || selectedPatientForPayment.targetBranch || selectedPatientForPayment.branchName;
      if (targetBranch) {
        try {
          const liveApps = receptionDataStore.getAppointments();
          const livePkgs = receptionDataStore.getPackageMembers();
          const updatedApps = liveApps.map(a => a.id === selectedPatientForPayment.id ? { ...a, ...payload } : a);
          if (!updatedApps.some(a => a.id === selectedPatientForPayment.id)) {
            updatedApps.push(completedInvoice);
          }
          const calcRes = calculateRealBranchRevenue(targetBranch, updatedApps, livePkgs);
          syncBranchTargetToFirestore(targetBranch, calcRes.targetReached, calcRes.monthlyTarget).catch(() => { });
        } catch (syncErr) {
          console.warn('Branch target sync notice (mobile):', syncErr);
        }
      }

      // Show frontend popup modal with Patient Name, Amount Paid, and Payment Mode
      setPaymentSuccessPopup({
        patientName: selectedPatientForPayment.patientName || selectedPatientForPayment.name || 'Patient',
        totalPaid: totalAmountDue,
        paymentMode: paymentModeText,
        completedInvoice
      });
    } catch (err) {
      console.error("Error completing checkout:", err);
      Alert.alert("Error", "Failed to complete payment checkout. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!visible || !selectedPatientForPayment) return null;

  const patientName = selectedPatientForPayment.patientName || selectedPatientForPayment.name || 'Patient';
  const patientPhone = selectedPatientForPayment.phone || selectedPatientForPayment.phoneNumber || 'N/A';

  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={handleCancelOrDismiss}
    >
      {activeInvoice ? (
        <SafeAreaView style={styles.fullScreenContainer}>
          {/* Header Actions (Screen Only) */}
          <View style={{ paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f1f5f9', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#ffffff' }}>
            <TouchableOpacity onPress={onDismiss} style={{ padding: 4 }}>
              <Ionicons name="arrow-back" size={24} color="#0f172a" />
            </TouchableOpacity>
            <Text style={{ fontSize: 17, fontWeight: '800', color: '#0f172a' }}>Payment Receipt</Text>
            <TouchableOpacity onPress={onDismiss} style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="close" size={18} color="#0f172a" />
            </TouchableOpacity>
          </View>

          {/* Printable Mobile Receipt View (1:1 with Screenshot) */}
          <ScrollView style={{ flex: 1, backgroundColor: '#ffffff' }} contentContainerStyle={{ padding: 20 }}>
            {/* 1. Header Bar */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 6 }}>
              <Image source={require('../assets/sh_logo.png')} style={{ width: 150, height: 48, resizeMode: 'contain' }} />
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={{ fontSize: 11, fontWeight: '700', color: '#334155' }}>www.spiritualhomeoclinic.com</Text>
                <Text style={{ fontSize: 10, color: '#64748b', marginTop: 1 }}>support@spiritualhomeo.com</Text>
              </View>
            </View>

            {/* Lime Green Divider Line */}
            <View style={{ height: 4, backgroundColor: '#99cc00', width: '100%', marginVertical: 10, borderRadius: 2 }} />

            {/* 2. PAYMENT RECEIPT Header & Receipt Badge */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
              <Text style={{ fontSize: 18, fontWeight: '800', color: '#0f172a', letterSpacing: 0.4 }}>
                PAYMENT RECEIPT
              </Text>
              <View style={{ backgroundColor: '#e0f2fe', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 14 }}>
                <Text style={{ color: '#0284c7', fontSize: 10, fontWeight: '800' }}>RECEIPT</Text>
              </View>
            </View>

            {/* 3. PATIENT DETAILS Section */}
            <View style={{ marginBottom: 18 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10, gap: 6 }}>
                <Text style={{ fontSize: 10, fontWeight: '800', color: '#64748b', letterSpacing: 0.5 }}>PATIENT DETAILS</Text>
                <View style={{ flex: 1, height: 1, backgroundColor: '#e2e8f0' }} />
              </View>

              <View style={{ gap: 10 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: '#f1f5f9', paddingBottom: 6 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 9.5, fontWeight: '700', color: '#64748b' }}>PATIENT NAME</Text>
                    <Text style={{ fontSize: 13, fontWeight: '800', color: '#0f172a', marginTop: 1 }}>{patientName}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 9.5, fontWeight: '700', color: '#64748b' }}>PHONE NUMBER</Text>
                    <Text style={{ fontSize: 13, fontWeight: '800', color: '#0f172a', marginTop: 1 }}>+91 {patientPhone}</Text>
                  </View>
                </View>

                <View style={{ flexDirection: 'row', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: '#f1f5f9', paddingBottom: 6 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 9.5, fontWeight: '700', color: '#64748b' }}>CONSULTANT DOCTOR</Text>
                    <Text style={{ fontSize: 13, fontWeight: '800', color: '#0f172a', marginTop: 1 }}>{activeInvoice.doctorName || activeInvoice.doctor || 'Dr. Prashanth k vaidya'}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 9.5, fontWeight: '700', color: '#64748b' }}>CLINIC BRANCH</Text>
                    <Text style={{ fontSize: 13, fontWeight: '800', color: '#0f172a', marginTop: 1 }}>{activeInvoice.branch || 'Kphb'}</Text>
                  </View>
                </View>

                <View style={{ flexDirection: 'row', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: '#f1f5f9', paddingBottom: 6 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 9.5, fontWeight: '700', color: '#64748b' }}>APPOINTMENT SCHEDULE</Text>
                    <Text style={{ fontSize: 13, fontWeight: '800', color: '#0f172a', marginTop: 1 }}>
                      {activeInvoice.appointmentDate || activeInvoice.date || new Date().toLocaleDateString('en-GB')} at {activeInvoice.timeSlot || activeInvoice.time || '01:00 PM'}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 9.5, fontWeight: '700', color: '#64748b' }}>SPECIALTY</Text>
                    <Text style={{ fontSize: 13, fontWeight: '800', color: '#0f172a', marginTop: 1 }}>General Homeopathy</Text>
                  </View>
                </View>
              </View>
            </View>

            {/* 4. PAYMENT INFORMATION Section */}
            <View style={{ marginBottom: 18 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10, gap: 6 }}>
                <Text style={{ fontSize: 10, fontWeight: '800', color: '#64748b', letterSpacing: 0.5 }}>PAYMENT INFORMATION</Text>
                <View style={{ flex: 1, height: 1, backgroundColor: '#e2e8f0' }} />
              </View>

              <View style={{
                backgroundColor: '#e6f7ed', borderWidth: 1.5, borderColor: '#86efac', borderStyle: 'dashed', borderRadius: 14,
                padding: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'
              }}>
                <View>
                  <Text style={{ fontSize: 10, fontWeight: '800', color: '#166534' }}>TOTAL AMOUNT PAID</Text>
                  <Text style={{ fontSize: 28, fontWeight: '900', color: '#15803d', marginTop: 2 }}>
                    ₹{Number(activeInvoice.totalPaid || activeInvoice.targetAmount || 2000).toFixed(2)}
                  </Text>
                </View>

                <View style={{ alignItems: 'flex-end' }}>
                  <View style={{ backgroundColor: '#22c55e', paddingHorizontal: 14, paddingVertical: 5, borderRadius: 16 }}>
                    <Text style={{ color: '#ffffff', fontSize: 12, fontWeight: '800' }}>PAID ✓</Text>
                  </View>
                  <Text style={{ fontSize: 10, fontWeight: '800', color: '#166534', marginTop: 4, textTransform: 'uppercase' }}>
                    VIA {activeInvoice.paymentMode || 'UPI'}
                  </Text>
                </View>
              </View>
            </View>

            {/* 5. FEE BREAKDOWN Section */}
            <View style={{ marginBottom: 18 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10, gap: 6 }}>
                <Text style={{ fontSize: 10, fontWeight: '800', color: '#64748b', letterSpacing: 0.5 }}>FEE BREAKDOWN</Text>
                <View style={{ flex: 1, height: 1, backgroundColor: '#e2e8f0' }} />
              </View>

              <View style={{ borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 10, overflow: 'hidden' }}>
                <View style={{ flexDirection: 'row', backgroundColor: '#f8fafc', paddingHorizontal: 12, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#e2e8f0' }}>
                  <Text style={{ flex: 1, fontSize: 10, fontWeight: '800', color: '#64748b' }}>DESCRIPTION</Text>
                  <Text style={{ fontSize: 10, fontWeight: '800', color: '#64748b' }}>AMOUNT (₹)</Text>
                </View>

                {activeInvoice.medicines && activeInvoice.medicines.length > 0 ? (
                  activeInvoice.medicines.map((m: any, idx: number) => {
                    const medName = m.name && m.name.trim() ? m.name.trim() : `Medicine ${idx + 1}`;
                    const timingDisplay = m.timing && m.timing.trim() ? ` [${m.timing.trim()}]` : '';
                    const durationDisplay = activeInvoice.medicineDuration ? ` (${activeInvoice.medicineDuration})` : '';
                    return (
                      <View key={idx} style={{ flexDirection: 'row', paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' }}>
                        <Text style={{ flex: 1, fontSize: 12, color: '#334155', fontWeight: '500' }}>
                          {medName}{timingDisplay}{durationDisplay}
                        </Text>
                        <Text style={{ fontSize: 12, fontWeight: '700', color: '#0f172a' }}>₹{Number(m.amount).toFixed(2)}</Text>
                      </View>
                    );
                  })
                ) : (
                  Number(activeInvoice.medicineFee) > 0 && (
                    <View style={{ flexDirection: 'row', paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' }}>
                      <Text style={{ flex: 1, fontSize: 12, color: '#334155', fontWeight: '500' }}>
                        Medicine Fee{activeInvoice.medicineDuration ? ` (${activeInvoice.medicineDuration})` : ''}
                      </Text>
                      <Text style={{ fontSize: 12, fontWeight: '700', color: '#0f172a' }}>₹{Number(activeInvoice.medicineFee).toFixed(2)}</Text>
                    </View>
                  )
                )}
                {(Number(activeInvoice.packageFee) > 0 || activeInvoice.isPackageMember || Number(activeInvoice.packageTotalAmount) > 0) && (() => {
                  const dur = activeInvoice.packageDuration || '3 Months';
                  const tot = Number(activeInvoice.packageTotalAmount || activeInvoice.totalAmount || activeInvoice.totalPaid || 0);
                  const paid = Number(activeInvoice.totalPaid || activeInvoice.packageFee || 0);
                  const rem = Number(activeInvoice.packageRemainingAmount !== undefined ? activeInvoice.packageRemainingAmount : Math.max(0, tot - paid));
                  return (
                    <>
                      <View style={{ flexDirection: 'row', paddingHorizontal: 12, paddingVertical: 10, backgroundColor: '#f0fdf4', borderBottomWidth: 1, borderBottomColor: '#e2e8f0' }}>
                        <Text style={{ flex: 1, fontSize: 12, color: '#166534', fontWeight: '800' }}>
                          Package Enrollment & Treatment ({dur})
                        </Text>
                        <Text style={{ fontSize: 12, fontWeight: '800', color: '#166534' }}>₹{tot.toFixed(2)}</Text>
                      </View>
                      <View style={{ flexDirection: 'row', paddingHorizontal: 12, paddingVertical: 8, paddingLeft: 20, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' }}>
                        <Text style={{ flex: 1, fontSize: 11.5, color: '#475569', fontWeight: '600' }}>• Total Package Value</Text>
                        <Text style={{ fontSize: 11.5, fontWeight: '700', color: '#0f172a' }}>₹{tot.toFixed(2)}</Text>
                      </View>
                      <View style={{ flexDirection: 'row', paddingHorizontal: 12, paddingVertical: 8, paddingLeft: 20, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' }}>
                        <Text style={{ flex: 1, fontSize: 11.5, color: '#15803d', fontWeight: '700' }}>• Paid Amount Today</Text>
                        <Text style={{ fontSize: 11.5, fontWeight: '800', color: '#15803d' }}>₹{paid.toFixed(2)}</Text>
                      </View>
                      <View style={{ flexDirection: 'row', paddingHorizontal: 12, paddingVertical: 8, paddingLeft: 20, backgroundColor: '#fff7ed', borderBottomWidth: 1, borderBottomColor: '#cbd5e1' }}>
                        <Text style={{ flex: 1, fontSize: 11.5, color: '#c2410c', fontWeight: '800' }}>• Remaining Balance Due</Text>
                        <Text style={{ fontSize: 11.5, fontWeight: '900', color: rem <= 0 ? '#15803d' : '#ea580c' }}>
                          ₹{rem.toFixed(2)}{rem <= 0 ? ' (Cleared)' : ''}
                        </Text>
                      </View>
                    </>
                  );
                })()}
                {Number(activeInvoice.consultationFee) > 0 && (
                  <View style={{ flexDirection: 'row', paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' }}>
                    <Text style={{ flex: 1, fontSize: 12, color: '#334155', fontWeight: '500' }}>Consultation Fee</Text>
                    <Text style={{ fontSize: 12, fontWeight: '700', color: '#0f172a' }}>₹{Number(activeInvoice.consultationFee).toFixed(2)}</Text>
                  </View>
                )}
                {Number(activeInvoice.dietFee) > 0 && (
                  <View style={{ flexDirection: 'row', paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' }}>
                    <Text style={{ flex: 1, fontSize: 12, color: '#334155', fontWeight: '500' }}>Diet & Nutrition Fee</Text>
                    <Text style={{ fontSize: 12, fontWeight: '700', color: '#0f172a' }}>₹{Number(activeInvoice.dietFee).toFixed(2)}</Text>
                  </View>
                )}
                {Number(activeInvoice.otherCharges) > 0 && (
                  <View style={{ flexDirection: 'row', paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' }}>
                    <Text style={{ flex: 1, fontSize: 12, color: '#334155', fontWeight: '500' }}>Other Charges</Text>
                    <Text style={{ fontSize: 12, fontWeight: '700', color: '#0f172a' }}>₹{Number(activeInvoice.otherCharges).toFixed(2)}</Text>
                  </View>
                )}
                {Number(activeInvoice.discount) > 0 && (
                  <View style={{ flexDirection: 'row', paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' }}>
                    <Text style={{ flex: 1, fontSize: 12, color: '#ef4444', fontWeight: '500' }}>Discount Applied</Text>
                    <Text style={{ fontSize: 12, fontWeight: '700', color: '#ef4444' }}>- ₹{Number(activeInvoice.discount).toFixed(2)}</Text>
                  </View>
                )}
                {(!activeInvoice.medicineFee && !activeInvoice.consultationFee && !activeInvoice.dietFee && !activeInvoice.otherCharges) && (
                  <View style={{ flexDirection: 'row', paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' }}>
                    <Text style={{ flex: 1, fontSize: 12, color: '#334155', fontWeight: '500' }}>Medicine & Consultation Fee</Text>
                    <Text style={{ fontSize: 12, fontWeight: '700', color: '#0f172a' }}>₹{Number(activeInvoice.totalPaid || 2000).toFixed(2)}</Text>
                  </View>
                )}

                <View style={{ flexDirection: 'row', paddingHorizontal: 12, paddingVertical: 11, backgroundColor: '#ffffff' }}>
                  <Text style={{ flex: 1, fontSize: 12, fontWeight: '700', color: '#0f172a' }}>Payment Mode ({activeInvoice.paymentMode || 'UPI'})</Text>
                  <Text style={{ fontSize: 13, fontWeight: '800', color: '#0f172a' }}>₹{Number(activeInvoice.totalPaid || 2000).toFixed(2)}</Text>
                </View>
              </View>
            </View>

            {/* 6. Footer Meta & Disclaimer */}
            <View style={{ marginBottom: 16 }}>
              <Text style={{ fontSize: 10, color: '#94a3b8' }}>Payment ID: WALKIN_{(activeInvoice.paymentMode || 'UPI').toUpperCase().replace(/\s+/g, '_')}</Text>
              <Text style={{ fontSize: 10, color: '#94a3b8', marginTop: 2 }}>Issued At: {new Date().toLocaleDateString('en-GB')}, {new Date().toLocaleTimeString()}</Text>
              <Text style={{ fontSize: 10, color: '#cbd5e1', textAlign: 'center', marginTop: 10 }}>This is a computer generated bill.</Text>
            </View>

            {/* 7. Bottom Lime Green Banner Bar */}
            <View style={{
              backgroundColor: '#99cc00', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 4,
              flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'
            }}>
              <Text style={{ color: '#ffffff', fontSize: 10, fontWeight: '700' }}>📞 9069176176</Text>
              <Text style={{ color: '#ffffff', fontSize: 10, fontWeight: '700' }}>✉️ support@spiritualhomeo.com</Text>
              <Text style={{ color: '#ffffff', fontSize: 10, fontWeight: '700' }}>🌐 spiritualhomeoclinic.com</Text>
              <Text style={{ color: '#ffffff', fontSize: 10, fontWeight: '700' }}>📍 {(activeInvoice.branch || 'KPHB').toUpperCase()}</Text>
            </View>
          </ScrollView>

          {/* Action Buttons Footer */}
          <View style={{ paddingHorizontal: 16, paddingVertical: 12, borderTopWidth: 1, borderTopColor: '#e2e8f0', gap: 8, backgroundColor: '#ffffff' }}>
            <TouchableOpacity
              style={{ backgroundColor: '#16a34a', paddingVertical: 12, borderRadius: 10, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 6 }}
              onPress={async () => {
                const htmlContent = `
                  <!DOCTYPE html>
                  <html>
                  <head>
                    <meta charset="utf-8">
                    <style>
                      @page { size: A4 portrait; margin: 0; }
                      body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; padding: 28px 40px; color: #0f172a; margin: 0; background: #fff; line-height: 1.5; box-sizing: border-box; }
                      .header { display: flex; justify-content: space-between; align-items: center; padding-bottom: 10px; margin-bottom: 4px; }
                      .brand-title { color: #0284c7; font-size: 22px; font-weight: 900; letter-spacing: 0.5px; text-transform: uppercase; }
                      .brand-sub { font-size: 12px; color: #475569; margin-top: 3px; font-weight: 600; }
                      .lime-bar { height: 5px; background: #99cc00; width: 100%; margin: 10px 0 20px 0; border-radius: 3px; }
                      .title-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
                      .receipt-title { font-size: 20px; font-weight: 900; color: #0f172a; text-transform: uppercase; margin: 0; letter-spacing: 0.5px; }
                      .receipt-badge { background: #e0f2fe; color: #0284c7; padding: 5px 16px; border-radius: 20px; font-weight: 800; font-size: 11.5px; letter-spacing: 0.5px; }
                      .section-head { font-size: 11.5px; font-weight: 800; color: #475569; margin-bottom: 12px; letter-spacing: 0.8px; text-transform: uppercase; display: flex; align-items: center; gap: 8px; }
                      .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px 36px; margin-bottom: 22px; font-size: 13.5px; }
                      .grid-cell { border-bottom: 1px solid #e2e8f0; padding-bottom: 6px; }
                      .label { font-size: 10.5px; font-weight: 700; color: #64748b; text-transform: uppercase; margin-bottom: 3px; letter-spacing: 0.4px; }
                      .val { font-weight: 800; color: #0f172a; font-size: 14px; }
                      .pay-box { background: #e6f7ed; border: 2px dashed #86efac; border-radius: 14px; padding: 18px 24px; display: flex; justify-content: space-between; align-items: center; margin-bottom: 22px; }
                      .pay-amt { font-size: 32px; font-weight: 900; color: #15803d; margin-top: 3px; }
                      .paid-badge { background: #22c55e; color: #fff; padding: 6px 18px; border-radius: 20px; font-weight: 800; font-size: 13px; display: inline-block; letter-spacing: 0.5px; }
                      table { width: 100%; border-collapse: collapse; margin-bottom: 22px; font-size: 13.5px; }
                      th { background: #f8fafc; padding: 10px 14px; text-align: left; font-size: 11.5px; font-weight: 800; border-bottom: 1.5px solid #cbd5e1; color: #475569; letter-spacing: 0.4px; }
                      td { padding: 10px 14px; border-bottom: 1px solid #e2e8f0; font-weight: 600; }
                      .meta-info { font-size: 11px; color: #64748b; line-height: 1.6; margin-bottom: 20px; margin-top: 14px; }
                      .footer-bar { background: #99cc00; color: #fff; padding: 10px 16px; border-radius: 5px; display: flex; justify-content: space-between; align-items: center; font-size: 10.5px; font-weight: 800; margin-top: 24px; flex-wrap: wrap; gap: 8px; }
                    </style>
                  </head>
                  <body>
                    <div class="header">
                      <div>
                        <img src="data:image/png;base64,${SH_LOGO_BASE64}" width="260" height="52" style="height: 52px; width: 260px; max-width: 280px; object-fit: contain; display: block;" alt="SPIRITUAL HOMEOPATHY" />
                      </div>
                      <div style="text-align: right; font-size: 11px; font-weight: 700; color: #334155; line-height: 1.4;">
                        <div>www.spiritualhomeoclinic.com</div>
                        <div style="color: #64748b; font-weight: 500;">support@spiritualhomeo.com</div>
                      </div>
                    </div>
                    <div class="lime-bar"></div>
                    <div class="title-row">
                      <h1 class="receipt-title">PAYMENT RECEIPT</h1>
                      <span class="receipt-badge">RECEIPT</span>
                    </div>
                    <div class="section-head">PATIENT DETAILS</div>
                    <div class="grid">
                      <div class="grid-cell"><div class="label">PATIENT NAME</div><div class="val">${patientName}</div></div>
                      <div class="grid-cell"><div class="label">PHONE NUMBER</div><div class="val">+91 ${patientPhone}</div></div>
                      <div class="grid-cell"><div class="label">CONSULTANT DOCTOR</div><div class="val">${activeInvoice?.doctorName || activeInvoice?.doctor || 'Dr. Prashanth k vaidya'}</div></div>
                      <div class="grid-cell"><div class="label">CLINIC BRANCH</div><div class="val">${activeInvoice?.branch || 'Kphb'}</div></div>
                      <div class="grid-cell"><div class="label">APPOINTMENT SCHEDULE</div><div class="val">${activeInvoice?.appointmentDate || activeInvoice?.date || new Date().toLocaleDateString('en-GB')} at ${activeInvoice?.timeSlot || activeInvoice?.time || '01:00 PM'}</div></div>
                      <div class="grid-cell"><div class="label">SPECIALTY</div><div class="val">General Homeopathy</div></div>
                    </div>
                    <div class="section-head">PAYMENT INFORMATION</div>
                    <div class="pay-box">
                      <div>
                        <div class="label" style="color: #166534;">TOTAL AMOUNT PAID</div>
                        <div class="pay-amt">₹${Number(activeInvoice?.totalPaid || activeInvoice?.targetAmount || 2000).toFixed(2)}</div>
                      </div>
                      <div style="text-align: right;">
                        <span class="paid-badge">PAID ✓</span>
                        <div style="font-size: 11px; font-weight: 800; color: #166534; margin-top: 6px; text-transform: uppercase;">VIA ${activeInvoice?.paymentMode || 'UPI'}</div>
                      </div>
                    </div>
                    <div class="section-head">FEE BREAKDOWN</div>
                    <table>
                      <thead><tr><th>DESCRIPTION</th><th style="text-align: right;">AMOUNT (₹)</th></tr></thead>
                        ${(Number(activeInvoice?.packageFee) > 0 || activeInvoice?.isPackageMember || Number(activeInvoice?.packageTotalAmount) > 0)
                    ? `
                            <tr style="background-color: #f0fdf4; border-bottom: 1px solid #e2e8f0;">
                              <td style="color: #166534; font-weight: 800;">Package Enrollment & Treatment (${activeInvoice?.packageDuration || '3 Months'})</td>
                              <td style="text-align: right; font-weight: 900; color: #166534;">₹${Number(activeInvoice?.packageTotalAmount || activeInvoice?.totalAmount || activeInvoice?.totalPaid || 0).toFixed(2)}</td>
                            </tr>
                            <tr>
                              <td style="padding-left: 24px; color: #475569; font-weight: 600;">• Total Package Value</td>
                              <td style="text-align: right; font-weight: 700;">₹${Number(activeInvoice?.packageTotalAmount || activeInvoice?.totalAmount || activeInvoice?.totalPaid || 0).toFixed(2)}</td>
                            </tr>
                            <tr>
                              <td style="padding-left: 24px; color: #15803d; font-weight: 700;">• Paid Amount Today</td>
                              <td style="text-align: right; font-weight: 800; color: #15803d;">₹${Number(activeInvoice?.totalPaid || activeInvoice?.packageFee || 0).toFixed(2)}</td>
                            </tr>
                            <tr style="background-color: #fff7ed; border-bottom: 1.5px solid #cbd5e1;">
                              <td style="padding-left: 24px; color: #c2410c; font-weight: 800;">• Remaining Balance Due</td>
                              <td style="text-align: right; font-weight: 900; color: ${Number(activeInvoice?.packageRemainingAmount !== undefined ? activeInvoice?.packageRemainingAmount : Math.max(0, Number(activeInvoice?.packageTotalAmount || activeInvoice?.totalPaid) - Number(activeInvoice?.totalPaid))) <= 0 ? '#15803d' : '#ea580c'};">₹${Number(activeInvoice?.packageRemainingAmount !== undefined ? activeInvoice?.packageRemainingAmount : Math.max(0, Number(activeInvoice?.packageTotalAmount || activeInvoice?.totalPaid) - Number(activeInvoice?.totalPaid))).toFixed(2)}${Number(activeInvoice?.packageRemainingAmount !== undefined ? activeInvoice?.packageRemainingAmount : Math.max(0, Number(activeInvoice?.packageTotalAmount || activeInvoice?.totalPaid) - Number(activeInvoice?.totalPaid))) <= 0 ? ' (Cleared)' : ''}</td>
                            </tr>
                          `
                    : ''
                  }
                        ${activeInvoice?.medicines && activeInvoice.medicines.length > 0
                    ? activeInvoice.medicines.map((m: any, idx: number) => {
                      const medName = m.name && m.name.trim() ? m.name.trim() : `Medicine ${idx + 1}`;
                      const timingDisplay = m.timing && m.timing.trim() ? ` [${m.timing.trim()}]` : '';
                      const durationDisplay = activeInvoice?.medicineDuration ? ` (${activeInvoice.medicineDuration})` : '';
                      return `
                              <tr>
                                <td>${medName}${timingDisplay}${durationDisplay}</td>
                                <td style="text-align: right; font-weight: 700;">₹${Number(m.amount).toFixed(2)}</td>
                              </tr>
                            `;
                    }).join('')
                    : (Number(activeInvoice?.medicineFee) > 0 ? `<tr><td>Medicine Fee${activeInvoice?.medicineDuration ? ` (${activeInvoice?.medicineDuration})` : ''}</td><td style="text-align: right; font-weight: 700;">₹${Number(activeInvoice?.medicineFee).toFixed(2)}</td></tr>` : '')
                  }
                        ${Number(activeInvoice?.consultationFee) > 0 ? `<tr><td>Consultation Fee</td><td style="text-align: right; font-weight: 700;">₹${Number(activeInvoice?.consultationFee).toFixed(2)}</td></tr>` : ''}
                        ${Number(activeInvoice?.dietFee) > 0 ? `<tr><td>Diet & Nutrition Fee</td><td style="text-align: right; font-weight: 700;">₹${Number(activeInvoice?.dietFee).toFixed(2)}</td></tr>` : ''}
                        ${Number(activeInvoice?.otherCharges) > 0 ? `<tr><td>Other Charges</td><td style="text-align: right; font-weight: 700;">₹${Number(activeInvoice?.otherCharges).toFixed(2)}</td></tr>` : ''}
                        ${Number(activeInvoice?.discount) > 0 ? `<tr style="color: #ef4444;"><td>Discount Applied</td><td style="text-align: right; font-weight: 700;">- ₹${Number(activeInvoice?.discount).toFixed(2)}</td></tr>` : ''}
                        ${(!activeInvoice?.medicineFee && !activeInvoice?.consultationFee && !activeInvoice?.dietFee && !activeInvoice?.otherCharges) ? `<tr><td>Medicine & Consultation Fee</td><td style="text-align: right; font-weight: 700;">₹${Number(activeInvoice?.totalPaid || 2000).toFixed(2)}</td></tr>` : ''}
                        <tr style="font-weight: 800;"><td>Payment Mode (${activeInvoice?.paymentMode || 'UPI'})</td><td style="text-align: right;">₹${Number(activeInvoice?.totalPaid || 2000).toFixed(2)}</td></tr>
                      </tbody>
                    </table>
                    <div class="meta-info">
                      <div>Payment ID: WALKIN_${(activeInvoice?.paymentMode || 'UPI').toUpperCase().replace(/\s+/g, '_')}</div>
                      <div>Issued At: ${new Date().toLocaleDateString('en-GB')}, ${new Date().toLocaleTimeString()}</div>
                      <div style="text-align: center; margin-top: 12px; color: #94a3b8;">This is a computer generated bill.</div>
                    </div>
                    <div class="footer-bar">
                      <div style="white-space: nowrap;">📞 9069176176</div>
                      <div style="white-space: nowrap;">✉️ support@spiritualhomeo.com</div>
                      <div style="white-space: nowrap;">🌐 www.spiritualhomeoclinic.com</div>
                      <div style="white-space: nowrap;">📍 ${(activeInvoice?.branch || 'KPHB').toUpperCase()}</div>
                    </div>
                  </body>
                  </html>
                `;
                try {
                  let PrintModule: any = null;
                  let SharingModule: any = null;
                  try { PrintModule = require('expo-print'); } catch (e) { }
                  try { SharingModule = require('expo-sharing'); } catch (e) { }
                  if (PrintModule && typeof PrintModule.printToFileAsync === 'function') {
                    const pdfFile = await PrintModule.printToFileAsync({ html: htmlContent });
                    const cleanPhone = (patientPhone || '').replace(/\D/g, '').slice(-10);
                    const phoneDisplay = cleanPhone ? ` (+91 ${cleanPhone})` : '';

                    if (SharingModule && typeof SharingModule.shareAsync === 'function') {
                      await SharingModule.shareAsync(pdfFile.uri, {
                        mimeType: 'application/pdf',
                        dialogTitle: `Share Invoice PDF to ${patientName}${phoneDisplay}`,
                        UTI: 'com.adobe.pdf',
                      });
                      return;
                    } else {
                      await Share.share({
                        url: pdfFile.uri,
                        title: `Payment Receipt PDF - ${patientName}${phoneDisplay}`,
                      });
                      return;
                    }
                  }
                } catch (err: any) {
                  console.warn('PDF Share notice:', err?.message);
                }
              }}
            >
              <MaterialCommunityIcons name="whatsapp" size={18} color="#ffffff" />
              <Text style={{ color: '#ffffff', fontWeight: '800', fontSize: 14 }}>Share PDF Invoice (WhatsApp / Apps)</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={{ backgroundColor: '#258ec8', paddingVertical: 12, borderRadius: 10, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 6 }}
              onPress={async () => {
                const htmlContent = `
                  <!DOCTYPE html>
                  <html>
                  <head>
                    <meta charset="utf-8">
                    <style>
                      @page { size: A4 portrait; margin: 0; }
                      body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; padding: 36px 44px; color: #0f172a; margin: 0; background: #fff; line-height: 1.5; }
                      .header { display: flex; justify-content: space-between; align-items: center; padding-bottom: 12px; margin-bottom: 4px; }
                      .brand-title { color: #0284c7; font-size: 22px; font-weight: 900; letter-spacing: 0.5px; text-transform: uppercase; }
                      .brand-sub { font-size: 12px; color: #475569; margin-top: 3px; font-weight: 600; }
                      .lime-bar { height: 5px; background: #99cc00; width: 100%; margin: 10px 0 24px 0; border-radius: 3px; }
                      .title-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }
                      .receipt-title { font-size: 20px; font-weight: 900; color: #0f172a; text-transform: uppercase; margin: 0; letter-spacing: 0.5px; }
                      .receipt-badge { background: #e0f2fe; color: #0284c7; padding: 5px 16px; border-radius: 20px; font-weight: 800; font-size: 11.5px; letter-spacing: 0.5px; }
                      .section-head { font-size: 11.5px; font-weight: 800; color: #475569; margin-bottom: 14px; letter-spacing: 0.7px; text-transform: uppercase; display: flex; align-items: center; gap: 8px; }
                      .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px 36px; margin-bottom: 28px; font-size: 13.5px; }
                      .grid-cell { border-bottom: 1px solid #e2e8f0; padding-bottom: 8px; }
                      .label { font-size: 10.5px; font-weight: 700; color: #64748b; text-transform: uppercase; margin-bottom: 3px; letter-spacing: 0.4px; }
                      .val { font-weight: 800; color: #0f172a; font-size: 14.5px; }
                      .pay-box { background: #e6f7ed; border: 2px dashed #86efac; border-radius: 16px; padding: 22px 28px; display: flex; justify-content: space-between; align-items: center; margin-bottom: 28px; }
                      .pay-amt { font-size: 34px; font-weight: 900; color: #15803d; margin-top: 3px; }
                      .paid-badge { background: #22c55e; color: #fff; padding: 7px 18px; border-radius: 20px; font-weight: 800; font-size: 13.5px; display: inline-block; letter-spacing: 0.5px; }
                      table { width: 100%; border-collapse: collapse; margin-bottom: 28px; font-size: 13.5px; }
                      th { background: #f8fafc; padding: 12px 14px; text-align: left; font-size: 11.5px; font-weight: 800; border-bottom: 1.5px solid #cbd5e1; color: #475569; letter-spacing: 0.4px; }
                      td { padding: 12px 14px; border-bottom: 1px solid #f1f5f9; font-weight: 600; }
                      .meta-info { font-size: 11px; color: #64748b; line-height: 1.6; margin-bottom: 24px; margin-top: 16px; }
                      .footer-bar { background: #99cc00; color: #fff; padding: 10px 16px; border-radius: 5px; display: flex; justify-content: space-between; align-items: center; font-size: 10.5px; font-weight: 800; margin-top: 32px; flex-wrap: wrap; gap: 8px; }
                    </style>
                  </head>
                  <body>
                    <div class="header">
                      <div>
                        <div class="brand-title">SPIRITUAL HOMEOPATHY</div>
                        <div class="brand-sub">Multispecialty Homeopathy Clinic</div>
                      </div>
                      <div style="text-align: right; font-size: 11px; font-weight: 700; color: #334155; line-height: 1.4;">
                        <div>www.spiritualhomeoclinic.com</div>
                        <div style="color: #64748b; font-weight: 500;">support@spiritualhomeo.com</div>
                      </div>
                    </div>
                    <div class="lime-bar"></div>
                    <div class="title-row">
                      <h1 class="receipt-title">PAYMENT RECEIPT</h1>
                      <span class="receipt-badge">RECEIPT</span>
                    </div>
                    <div class="section-head">PATIENT DETAILS</div>
                    <div class="grid">
                      <div class="grid-cell"><div class="label">PATIENT NAME</div><div class="val">${patientName}</div></div>
                      <div class="grid-cell"><div class="label">PHONE NUMBER</div><div class="val">+91 ${patientPhone}</div></div>
                      <div class="grid-cell"><div class="label">CONSULTANT DOCTOR</div><div class="val">${activeInvoice?.doctorName || activeInvoice?.doctor || 'Dr. Prashanth k vaidya'}</div></div>
                      <div class="grid-cell"><div class="label">CLINIC BRANCH</div><div class="val">${activeInvoice?.branch || 'Kphb'}</div></div>
                      <div class="grid-cell"><div class="label">APPOINTMENT SCHEDULE</div><div class="val">${activeInvoice?.appointmentDate || activeInvoice?.date || new Date().toLocaleDateString('en-GB')} at ${activeInvoice?.timeSlot || activeInvoice?.time || '01:00 PM'}</div></div>
                      <div class="grid-cell"><div class="label">SPECIALTY</div><div class="val">General Homeopathy</div></div>
                    </div>
                    <div class="section-head">PAYMENT INFORMATION</div>
                    <div class="pay-box">
                      <div>
                        <div class="label" style="color: #166534;">TOTAL AMOUNT PAID</div>
                        <div class="pay-amt">₹${Number(activeInvoice?.totalPaid || activeInvoice?.targetAmount || 2000).toFixed(2)}</div>
                      </div>
                      <div style="text-align: right;">
                        <span class="paid-badge">PAID ✓</span>
                        <div style="font-size: 11px; font-weight: 800; color: #166534; margin-top: 6px; text-transform: uppercase;">VIA ${activeInvoice?.paymentMode || 'UPI'}</div>
                      </div>
                    </div>
                    <div class="section-head">FEE BREAKDOWN</div>
                    <table>
                      <thead><tr><th>DESCRIPTION</th><th style="text-align: right;">AMOUNT (₹)</th></tr></thead>
                        ${(Number(activeInvoice?.packageFee) > 0 || activeInvoice?.isPackageMember || Number(activeInvoice?.packageTotalAmount) > 0)
                    ? `
                            <tr style="background-color: #f0fdf4; border-bottom: 1px solid #e2e8f0;">
                              <td style="color: #166534; font-weight: 800;">Package Enrollment & Treatment (${activeInvoice?.packageDuration || '3 Months'})</td>
                              <td style="text-align: right; font-weight: 900; color: #166534;">₹${Number(activeInvoice?.packageTotalAmount || activeInvoice?.totalAmount || activeInvoice?.totalPaid || 0).toFixed(2)}</td>
                            </tr>
                            <tr>
                              <td style="padding-left: 24px; color: #475569; font-weight: 600;">• Total Package Value</td>
                              <td style="text-align: right; font-weight: 700;">₹${Number(activeInvoice?.packageTotalAmount || activeInvoice?.totalAmount || activeInvoice?.totalPaid || 0).toFixed(2)}</td>
                            </tr>
                            <tr>
                              <td style="padding-left: 24px; color: #15803d; font-weight: 700;">• Paid Amount Today</td>
                              <td style="text-align: right; font-weight: 800; color: #15803d;">₹${Number(activeInvoice?.totalPaid || activeInvoice?.packageFee || 0).toFixed(2)}</td>
                            </tr>
                            <tr style="background-color: #fff7ed; border-bottom: 1.5px solid #cbd5e1;">
                              <td style="padding-left: 24px; color: #c2410c; font-weight: 800;">• Remaining Balance Due</td>
                              <td style="text-align: right; font-weight: 900; color: ${Number(activeInvoice?.packageRemainingAmount !== undefined ? activeInvoice?.packageRemainingAmount : Math.max(0, Number(activeInvoice?.packageTotalAmount || activeInvoice?.totalPaid) - Number(activeInvoice?.totalPaid))) <= 0 ? '#15803d' : '#ea580c'};">₹${Number(activeInvoice?.packageRemainingAmount !== undefined ? activeInvoice?.packageRemainingAmount : Math.max(0, Number(activeInvoice?.packageTotalAmount || activeInvoice?.totalPaid) - Number(activeInvoice?.totalPaid))).toFixed(2)}${Number(activeInvoice?.packageRemainingAmount !== undefined ? activeInvoice?.packageRemainingAmount : Math.max(0, Number(activeInvoice?.packageTotalAmount || activeInvoice?.totalPaid) - Number(activeInvoice?.totalPaid))) <= 0 ? ' (Cleared)' : ''}</td>
                            </tr>
                          `
                    : ''
                  }
                        ${activeInvoice?.medicines && activeInvoice.medicines.length > 0
                    ? activeInvoice.medicines.map((m: any, idx: number) => {
                      const medName = m.name && m.name.trim() ? m.name.trim() : `Medicine ${idx + 1}`;
                      const timingDisplay = m.timing && m.timing.trim() ? ` [${m.timing.trim()}]` : '';
                      const durationDisplay = activeInvoice?.medicineDuration ? ` (${activeInvoice.medicineDuration})` : '';
                      return `
                              <tr>
                                <td>${medName}${timingDisplay}${durationDisplay}</td>
                                <td style="text-align: right; font-weight: 700;">₹${Number(m.amount).toFixed(2)}</td>
                              </tr>
                            `;
                    }).join('')
                    : (Number(activeInvoice?.medicineFee) > 0 ? `<tr><td>Medicine Fee${activeInvoice?.medicineDuration ? ` (${activeInvoice?.medicineDuration})` : ''}</td><td style="text-align: right; font-weight: 700;">₹${Number(activeInvoice?.medicineFee).toFixed(2)}</td></tr>` : '')
                  }
                        ${Number(activeInvoice?.consultationFee) > 0 ? `<tr><td>Consultation Fee</td><td style="text-align: right; font-weight: 700;">₹${Number(activeInvoice?.consultationFee).toFixed(2)}</td></tr>` : ''}
                        ${Number(activeInvoice?.dietFee) > 0 ? `<tr><td>Diet & Nutrition Fee</td><td style="text-align: right; font-weight: 700;">₹${Number(activeInvoice?.dietFee).toFixed(2)}</td></tr>` : ''}
                        ${Number(activeInvoice?.otherCharges) > 0 ? `<tr><td>Other Charges</td><td style="text-align: right; font-weight: 700;">₹${Number(activeInvoice?.otherCharges).toFixed(2)}</td></tr>` : ''}
                        ${Number(activeInvoice?.discount) > 0 ? `<tr style="color: #ef4444;"><td>Discount Applied</td><td style="text-align: right; font-weight: 700;">- ₹${Number(activeInvoice?.discount).toFixed(2)}</td></tr>` : ''}
                        ${(!activeInvoice?.medicineFee && !activeInvoice?.consultationFee && !activeInvoice?.dietFee && !activeInvoice?.otherCharges) ? `<tr><td>Medicine & Consultation Fee</td><td style="text-align: right; font-weight: 700;">₹${Number(activeInvoice?.totalPaid || 2000).toFixed(2)}</td></tr>` : ''}
                        <tr style="font-weight: 800;"><td>Payment Mode (${activeInvoice?.paymentMode || 'UPI'})</td><td style="text-align: right;">₹${Number(activeInvoice?.totalPaid || 2000).toFixed(2)}</td></tr>
                      </tbody>
                    </table>
                    <div class="meta-info">
                      <div>Payment ID: WALKIN_${(activeInvoice?.paymentMode || 'UPI').toUpperCase().replace(/\s+/g, '_')}</div>
                      <div>Issued At: ${new Date().toLocaleDateString('en-GB')}, ${new Date().toLocaleTimeString()}</div>
                      <div style="text-align: center; margin-top: 12px; color: #94a3b8;">This is a computer generated bill.</div>
                    </div>
                    <div class="footer-bar">
                      <div style="white-space: nowrap;">📞 9069176176</div>
                      <div style="white-space: nowrap;">✉️ support@spiritualhomeo.com</div>
                      <div style="white-space: nowrap;">🌐 www.spiritualhomeoclinic.com</div>
                      <div style="white-space: nowrap;">📍 ${(activeInvoice?.branch || 'KPHB').toUpperCase()}</div>
                    </div>
                  </body>
                  </html>
                `;
                try {
                  const getExpoModule = (modName: string) => {
                    try {
                      const r = (0, eval)('require');
                      return r(modName);
                    } catch (e) {
                      return null;
                    }
                  };
                  const Print = getExpoModule('expo-print');
                  if (Print && Print.printAsync) {
                    await Print.printAsync({ html: htmlContent });
                  } else {
                    Alert.alert('Notice', 'Native printing feature is ready.');
                  }
                } catch (e) {
                  Alert.alert('Notice', 'Could not open native printer preview.');
                }
              }}
            >
              <Feather name="printer" size={18} color="#ffffff" />
              <Text style={{ color: '#ffffff', fontWeight: '800', fontSize: 14 }}>Print / Download PDF</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={{ backgroundColor: '#64748b', paddingVertical: 11, borderRadius: 10, alignItems: 'center' }}
              onPress={onDismiss}
            >
              <Text style={{ color: '#ffffff', fontWeight: '800', fontSize: 14 }}>Done & Close ✓</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      ) : (
        <SafeAreaView style={styles.fullScreenContainer}>
          {/* Top Navigation Bar */}
          <View style={styles.topNavBar}>
            <TouchableOpacity onPress={handleCancelOrDismiss} style={styles.backBtn}>
              <Ionicons name="arrow-back" size={24} color="#0f172a" />
            </TouchableOpacity>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.headerTitle}>Appointment Payment</Text>
              <Text style={styles.headerSubtitle}>Review and complete payment</Text>
            </View>
            <TouchableOpacity onPress={handleCancelOrDismiss} style={styles.closeCircleBtn}>
              <Ionicons name="close" size={20} color="#0f172a" />
            </TouchableOpacity>
          </View>

          <ScrollView ref={scrollViewRef} style={styles.scrollBody} showsVerticalScrollIndicator={false}>
            {/* Patient Info Card */}
            <View style={styles.patientCardContainer}>
              <View style={styles.patientInfoLeft}>
                <View style={styles.patientAvatarCircle}>
                  <Ionicons name="person" size={20} color="#258ec8" />
                </View>
                <View>
                  <Text style={styles.patientNameText}>{patientName}</Text>
                  <Text style={styles.patientPhoneText}>{patientPhone}</Text>
                </View>
              </View>
              <TouchableOpacity
                style={styles.viewDetailsBtn}
                onPress={() => setShowPatientDetails(!showPatientDetails)}
              >
                <Text style={styles.viewDetailsBtnText}>
                  {showPatientDetails ? 'Hide Details' : 'View Details >'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Expandable Patient Details */}
            {showPatientDetails && (
              <View style={styles.expandedDetailsBox}>
                <Text style={styles.expDetailLine}>Doctor: <Text style={{ fontWeight: '700', color: '#0f172a' }}>{selectedPatientForPayment.doctor || selectedPatientForPayment.doctorName || 'Dr. Prashanth K Vaidya'}</Text></Text>
                <Text style={styles.expDetailLine}>Reg ID: <Text style={{ fontWeight: '700', color: '#258ec8' }}>{selectedPatientForPayment.regId || 'N/A'}</Text></Text>
                <Text style={styles.expDetailLine}>Branch: <Text style={{ fontWeight: '700', color: '#0f172a' }}>{selectedPatientForPayment.branch || 'Clinic'}</Text></Text>
              </View>
            )}

            {/* ---------------- PRESCRIPTION VERIFICATION & MANDATORY UPLOAD CARD ---------------- */}
            <View
              style={{
                backgroundColor: hasPrescription ? '#f0fdf4' : '#fef2f2',
                borderRadius: 14,
                borderWidth: 1.5,
                borderColor: hasPrescription ? '#86efac' : '#f87171',
                padding: 14,
                marginBottom: 14,
                shadowColor: hasPrescription ? '#16a34a' : '#dc2626',
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.08,
                shadowRadius: 3,
                elevation: 2,
              }}
            >
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Ionicons
                    name={hasPrescription ? 'document-text' : 'alert-circle'}
                    size={20}
                    color={hasPrescription ? '#16a34a' : '#dc2626'}
                  />
                  <Text style={{ fontSize: 13.5, fontWeight: '800', color: hasPrescription ? '#166534' : '#991b1b' }}>
                    Prescription Verification
                  </Text>
                </View>
                <View
                  style={{
                    backgroundColor: hasPrescription ? '#dcfce7' : '#fee2e2',
                    paddingHorizontal: 8,
                    paddingVertical: 3,
                    borderRadius: 8,
                    borderWidth: 1,
                    borderColor: hasPrescription ? '#bbf7d0' : '#fca5a5',
                  }}
                >
                  <Text
                    style={{
                      fontSize: 10.5,
                      fontWeight: '800',
                      color: hasPrescription ? '#15803d' : '#b91c1c',
                    }}
                  >
                    {hasPrescription ? '✓ Verified & Attached' : '⚠️ MANDATORY'}
                  </Text>
                </View>
              </View>

              {!hasPrescription && (
                <Text style={{ fontSize: 11.5, color: '#b91c1c', fontWeight: '600', marginBottom: 10, lineHeight: 16 }}>
                  Clinic policy requires a valid prescription to collect fee and complete checkout. Please take a photo or upload from gallery.
                </Text>
              )}

              {/* Thumbnails of attached prescriptions */}
              {uploadedPrescriptionList.length > 0 && (
                <View style={{ marginBottom: 12 }}>
                  <Text style={{ fontSize: 11, fontWeight: '700', color: '#475569', marginBottom: 6 }}>
                    Attached Prescriptions ({uploadedPrescriptionList.length}):
                  </Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                    {uploadedPrescriptionList.map((url, idx) => (
                      <View
                        key={`${url}_${idx}`}
                        style={{
                          width: 80,
                          height: 80,
                          borderRadius: 10,
                          overflow: 'hidden',
                          borderWidth: 1.5,
                          borderColor: '#cbd5e1',
                          backgroundColor: '#ffffff',
                          position: 'relative',
                        }}
                      >
                        <TouchableOpacity
                          activeOpacity={0.85}
                          onPress={() => setPreviewModalUrl(url)}
                          style={{ width: '100%', height: '100%' }}
                        >
                          <Image
                            source={{ uri: url }}
                            style={{ width: '100%', height: '100%', resizeMode: 'cover' }}
                          />
                          <View
                            style={{
                              position: 'absolute',
                              bottom: 2,
                              right: 2,
                              backgroundColor: 'rgba(0,0,0,0.6)',
                              borderRadius: 4,
                              paddingHorizontal: 4,
                              paddingVertical: 1,
                            }}
                          >
                            <Ionicons name="eye" size={12} color="#ffffff" />
                          </View>
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={() => handleRemovePrescription(url)}
                          style={{
                            position: 'absolute',
                            top: 3,
                            right: 3,
                            backgroundColor: '#dc2626',
                            width: 18,
                            height: 18,
                            borderRadius: 9,
                            alignItems: 'center',
                            justifyContent: 'center',
                            elevation: 3,
                          }}
                        >
                          <Ionicons name="close" size={12} color="#ffffff" />
                        </TouchableOpacity>
                      </View>
                    ))}
                  </ScrollView>
                </View>
              )}

              {/* Action Buttons: Camera & Gallery */}
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <TouchableOpacity
                  onPress={handleTakePrescriptionPhoto}
                  disabled={isUploadingPrescription}
                  style={{
                    flex: 1,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                    backgroundColor: '#ffffff',
                    borderWidth: 1.5,
                    borderColor: '#258ec8',
                    paddingVertical: 9,
                    borderRadius: 10,
                  }}
                >
                  <Ionicons name="camera" size={16} color="#0284c7" />
                  <Text style={{ fontSize: 12, fontWeight: '800', color: '#0284c7' }}>
                    Take Photo
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={handlePickPrescriptionFromGallery}
                  disabled={isUploadingPrescription}
                  style={{
                    flex: 1,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                    backgroundColor: '#ffffff',
                    borderWidth: 1.5,
                    borderColor: '#64748b',
                    paddingVertical: 9,
                    borderRadius: 10,
                  }}
                >
                  <Ionicons name="images" size={16} color="#475569" />
                  <Text style={{ fontSize: 12, fontWeight: '800', color: '#475569' }}>
                    Choose Gallery
                  </Text>
                </TouchableOpacity>
              </View>

              <Text style={{ fontSize: 10, color: '#64748b', textAlign: 'center', marginTop: 8 }}>
                No page limit • Multi-page supported • Photos auto-compressed
              </Text>

              {isUploadingPrescription && (
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 10 }}>
                  <ActivityIndicator size="small" color="#0284c7" />
                  <Text style={{ fontSize: 12, color: '#0284c7', fontWeight: '700' }}>
                    Uploading prescription to cloud...
                  </Text>
                </View>
              )}
            </View>

            {/* Active Package Member Banner */}
            {existingActivePackage && (
              <View style={{
                backgroundColor: '#f0fdf4',
                borderColor: '#86efac',
                borderWidth: 1.5,
                borderRadius: 14,
                padding: 14,
                marginBottom: 14
              }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Ionicons name="shield-checkmark" size={20} color="#16a34a" />
                    <Text style={{ fontSize: 14, fontWeight: '800', color: '#166534' }}>
                      Package Member
                    </Text>
                  </View>
                  <View style={{ backgroundColor: '#dcfce7', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 }}>
                    <Text style={{ fontSize: 11, fontWeight: '800', color: '#15803d' }}>
                      {existingActivePackage.duration || 'Package'}
                    </Text>
                  </View>
                </View>

                <View style={{ flexDirection: 'row', justifyContent: 'space-between', backgroundColor: '#ffffff', padding: 10, borderRadius: 10, borderWidth: 1, borderColor: '#dcfce7', marginBottom: 10 }}>
                  <View>
                    <Text style={{ fontSize: 10, fontWeight: '700', color: '#64748b' }}>TOTAL VALUE (LOCKED)</Text>
                    <Text style={{ fontSize: 15, fontWeight: '800', color: '#0f172a' }}>
                      ₹{Number(existingActivePackage.totalAmount || 0).toLocaleString('en-IN')}
                    </Text>
                  </View>
                  <View>
                    <Text style={{ fontSize: 10, fontWeight: '700', color: '#64748b' }}>ALREADY PAID</Text>
                    <Text style={{ fontSize: 15, fontWeight: '800', color: '#16a34a' }}>
                      ₹{Number(existingActivePackage.paidAmount || 0).toLocaleString('en-IN')}
                    </Text>
                  </View>
                  <View>
                    <Text style={{ fontSize: 10, fontWeight: '700', color: '#64748b' }}>PENDING BALANCE</Text>
                    <Text style={{ fontSize: 15, fontWeight: '800', color: Number(existingActivePackage.remainingAmount || 0) > 0 ? '#dc2626' : '#16a34a' }}>
                      ₹{Number(existingActivePackage.remainingAmount || 0).toLocaleString('en-IN')}
                    </Text>
                  </View>
                </View>

                {Number(existingActivePackage.remainingAmount || 0) <= 0 ? (
                  <View style={{ backgroundColor: '#dcfce7', padding: 8, borderRadius: 8, alignItems: 'center' }}>
                    <Text style={{ fontSize: 12, fontWeight: '800', color: '#15803d' }}>
                      ✓ Package Fully Paid • Consultation & Medicine ₹0 Covered
                    </Text>
                  </View>
                ) : (
                  <View style={{ gap: 8 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text style={{ fontSize: 11.5, fontWeight: '700', color: '#0f172a' }}>
                        Enter Remaining / Paying Amount Today (₹):
                      </Text>
                      <Text style={{ fontSize: 11, color: '#dc2626', fontWeight: '800' }}>
                        Due: ₹{Number(existingActivePackage.remainingAmount || 0).toLocaleString('en-IN')}
                      </Text>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: '#ffffff', borderWidth: 1.5, borderColor: '#258ec8', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 }}>
                        <Text style={{ fontSize: 15, fontWeight: '800', color: '#258ec8', marginRight: 4 }}>₹</Text>
                        <TextInput
                          style={{ flex: 1, fontSize: 15, fontWeight: '800', color: '#0f172a', padding: 0 }}
                          keyboardType="numeric"
                          value={packageInstallmentInput === '' ? '' : String(packageInstallmentInput)}
                          onChangeText={(v) => {
                            if (v.trim() === '') {
                              setPackageInstallmentInput('');
                            } else {
                              setPackageInstallmentInput(Math.min(Number(v) || 0, Number(existingActivePackage.remainingAmount || 0)));
                            }
                          }}
                          placeholder="Installment amount"
                        />
                      </View>
                      <TouchableOpacity
                        onPress={() => setPackageInstallmentInput(Number(existingActivePackage.remainingAmount || 0))}
                        style={{ backgroundColor: '#eff6ff', borderWidth: 1, borderColor: '#bae6fd', paddingHorizontal: 12, paddingVertical: 9, borderRadius: 8 }}
                      >
                        <Text style={{ fontSize: 11, fontWeight: '800', color: '#0284c7' }}>Pay Full Due</Text>
                      </TouchableOpacity>
                    </View>

                    {/* Live Preview for Mobile */}
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', backgroundColor: '#f8fafc', padding: 8, borderRadius: 6 }}>
                      <Text style={{ fontSize: 10.5, color: '#475569' }}>
                        New Paid: <Text style={{ fontWeight: '700', color: '#16a34a' }}>₹{(Number(existingActivePackage.paidAmount || 0) + (Number(packageInstallmentInput) || 0)).toLocaleString('en-IN')}</Text>
                      </Text>
                      <Text style={{ fontSize: 10.5, color: '#475569' }}>
                        New Due: <Text style={{ fontWeight: '700', color: Math.max(0, Number(existingActivePackage.remainingAmount || 0) - (Number(packageInstallmentInput) || 0)) > 0 ? '#dc2626' : '#16a34a' }}>₹{Math.max(0, Number(existingActivePackage.remainingAmount || 0) - (Number(packageInstallmentInput) || 0)).toLocaleString('en-IN')}</Text>
                      </Text>
                    </View>
                  </View>
                )}
              </View>
            )}

            {/* If patient is NOT an existing package member, show standard payment preset options */}
            {!existingActivePackage && (
              <>
                {/* Active Follow-up & Medicine Duration Banner (IN-DUR) */}
                {activeDurationInfo && (
                  <View style={{
                    backgroundColor: '#ecfdf5',
                    borderColor: '#10b981',
                    borderWidth: 1.5,
                    borderRadius: 14,
                    padding: 14,
                    marginBottom: 14,
                    gap: 8
                  }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <View style={{ backgroundColor: '#059669', paddingHorizontal: 7, paddingVertical: 2, borderRadius: 5 }}>
                          <Text style={{ fontSize: 10, fontWeight: '900', color: '#ffffff' }}>IN-DUR</Text>
                        </View>
                        <Text style={{ fontSize: 14, fontWeight: '800', color: '#065f46' }}>
                          Active Follow-up ({activeDurationInfo.duration})
                        </Text>
                      </View>
                      <Text style={{ fontSize: 11, fontWeight: '700', color: '#059669' }}>
                        {activeDurationInfo.daysRemaining} days left
                      </Text>
                    </View>

                    <View style={{
                      backgroundColor: '#ffffff',
                      borderRadius: 10,
                      padding: 10,
                      borderWidth: 1,
                      borderColor: '#a7f3d0',
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between'
                    }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 }}>
                        <Ionicons name="checkmark-circle" size={16} color="#16a34a" />
                        <Text style={{ fontSize: 12, fontWeight: '700', color: '#166534', flex: 1 }}>
                          Patient within active course. Fee pre-filled as ₹0.
                        </Text>
                      </View>
                      <View style={{ backgroundColor: '#dcfce7', paddingHorizontal: 6, paddingVertical: 3, borderRadius: 6 }}>
                        <Text style={{ fontSize: 10.5, fontWeight: '900', color: '#15803d' }}>₹0 Covered</Text>
                      </View>
                    </View>

                    <Text style={{ fontSize: 10.5, color: '#64748b' }}>
                      💡 If doctor prescribes fresh medicines, enter Target Amount & duration below to start new cycle.
                    </Text>
                  </View>
                )}

                {/* Section Title */}
                <Text style={styles.sectionHeading}>Select Payment Type</Text>

                {/* Target Amount Box */}
                {paymentTypePreset !== 'package' && (
                  <View style={styles.targetAmountBox}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.targetTitle}>Target Amount (Consultation + Medicine):</Text>
                      <Text style={styles.targetSubtext}>Split & presets calculate strictly within this target</Text>
                    </View>
                    <View style={styles.targetInputWrapper}>
                      <Text style={styles.rupeeSymbol}>₹</Text>
                      <TextInput
                        style={styles.targetInput}
                        keyboardType="numeric"
                        value={targetAmount === 0 ? '' : String(targetAmount)}
                        placeholder="0"
                        onChangeText={(v) => handleTargetAmountChange(Number(v) || 0)}
                      />
                    </View>
                  </View>
                )}

                {/* 4 Payment Preset Pills */}
                <View style={styles.presetPillsGrid}>
                  <TouchableOpacity
                    style={[styles.presetPill, paymentTypePreset === 'consultation' && styles.presetPillActive]}
                    onPress={() => handlePresetSelect('consultation')}
                  >
                    <Text style={[styles.presetPillText, paymentTypePreset === 'consultation' && styles.presetPillTextActive]}>
                      Consultation
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.presetPill, paymentTypePreset === 'consultation_med' && styles.presetPillActive]}
                    onPress={() => handlePresetSelect('consultation_med')}
                  >
                    <Text style={[styles.presetPillText, paymentTypePreset === 'consultation_med' && styles.presetPillTextActive]}>
                      Consultation & Medicine
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.presetPill, paymentTypePreset === 'split' && styles.presetPillActive]}
                    onPress={() => handlePresetSelect('split')}
                  >
                    <Text style={[styles.presetPillText, paymentTypePreset === 'split' && styles.presetPillTextActive]}>
                      Split
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.presetPill, paymentTypePreset === 'package' && styles.presetPillActive]}
                    onPress={() => handlePresetSelect('package')}
                  >
                    <Text style={[styles.presetPillText, paymentTypePreset === 'package' && styles.presetPillTextActive]}>
                      Package
                    </Text>
                  </TouchableOpacity>
                </View>
              </>
            )}

            {/* Package Enrollment Form (When Package Preset is opted and no active package yet) */}
            {paymentTypePreset === 'package' && !existingActivePackage && (
              <View style={{
                backgroundColor: '#ffffff',
                borderColor: '#e2e8f0',
                borderWidth: 1.5,
                borderRadius: 14,
                padding: 14,
                marginBottom: 14,
                gap: 12
              }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <MaterialCommunityIcons name="package-variant-closed" size={20} color="#258ec8" />
                    <Text style={{ fontSize: 14.5, fontWeight: '800', color: '#0f172a' }}>
                      Package Registration
                    </Text>
                  </View>
                  <View style={{ backgroundColor: '#eff6ff', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, borderWidth: 1, borderColor: '#bfdbfe' }}>
                    <Text style={{ fontSize: 10.5, fontWeight: '800', color: '#258ec8' }}>
                      Advance + Balance System
                    </Text>
                  </View>
                </View>

                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 11.5, fontWeight: '700', color: '#334155', marginBottom: 4 }}>
                      Total Package Amount (₹) *
                    </Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#ffffff', borderWidth: 1.5, borderColor: '#258ec8', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 6 }}>
                      <Text style={{ fontSize: 14, fontWeight: '800', color: '#258ec8', marginRight: 4 }}>₹</Text>
                      <TextInput
                        style={{ flex: 1, fontSize: 14, fontWeight: '800', color: '#0f172a', padding: 0 }}
                        keyboardType="numeric"
                        value={packageTotalAmountInput === '' ? '' : String(packageTotalAmountInput)}
                        onChangeText={(v) => setPackageTotalAmountInput(v.trim() === '' ? '' : Number(v) || 0)}
                        placeholder="Enter total cost"
                        placeholderTextColor="#94a3b8"
                      />
                    </View>
                  </View>

                  {/* Package Duration Dropdown Button */}
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 11.5, fontWeight: '700', color: '#334155', marginBottom: 4 }}>
                      Package Duration *
                    </Text>
                    <TouchableOpacity
                      onPress={() => setShowPackageDurationModal(true)}
                      activeOpacity={0.7}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        backgroundColor: '#ffffff',
                        borderWidth: 1.5,
                        borderColor: '#cbd5e1',
                        borderRadius: 8,
                        paddingHorizontal: 10,
                        paddingVertical: 7.5
                      }}
                    >
                      <Text style={{ fontSize: 13, fontWeight: '700', color: '#0f172a' }}>
                        {packageDurationInput || '3 Months'}
                      </Text>
                      <Ionicons name="chevron-down" size={16} color="#64748b" />
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 11.5, fontWeight: '700', color: '#334155', marginBottom: 4 }}>
                      Advance Paid Today (₹) *
                    </Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#ffffff', borderWidth: 1.5, borderColor: '#258ec8', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 6 }}>
                      <Text style={{ fontSize: 14, fontWeight: '800', color: '#258ec8', marginRight: 4 }}>₹</Text>
                      <TextInput
                        style={{ flex: 1, fontSize: 14, fontWeight: '800', color: '#0f172a', padding: 0 }}
                        keyboardType="numeric"
                        value={packageAdvancePaidInput === '' ? '' : String(packageAdvancePaidInput)}
                        onChangeText={(v) => setPackageAdvancePaidInput(v.trim() === '' ? '' : Number(v) || 0)}
                        placeholder="Enter advance"
                        placeholderTextColor="#94a3b8"
                      />
                    </View>
                  </View>

                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 11.5, fontWeight: '700', color: '#334155', marginBottom: 4 }}>
                      Remaining Balance Due (₹)
                    </Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 8 }}>
                      <Text style={{ fontSize: 14, fontWeight: '800', color: '#dc2626' }}>
                        ₹{Math.max(0, (Number(packageTotalAmountInput) || 0) - (Number(packageAdvancePaidInput) || 0)).toLocaleString('en-IN')}
                      </Text>
                    </View>
                  </View>
                </View>

                <View style={{ backgroundColor: '#eff6ff', borderWidth: 1, borderColor: '#bfdbfe', padding: 8, borderRadius: 8 }}>
                  <Text style={{ fontSize: 11, color: '#1e40af', fontWeight: '600' }}>
                    ℹ️ Package covers consultation and medicines for the duration. No separate consultation, medicine, or diet fees are charged.
                  </Text>
                </View>
              </View>
            )}

            {/* Checkbox Fee Cards (Active only when NOT Package Preset) */}
            {paymentTypePreset !== 'package' && (
              <>
                {/* 1. Consultation Fee */}
                <View style={[styles.feeCard, includeConsultFee && styles.feeCardActive]}>
                  <TouchableOpacity
                    style={styles.feeCardCheckRow}
                    onPress={() => setIncludeConsultFee(!includeConsultFee)}
                    activeOpacity={0.8}
                  >
                    <Ionicons
                      name={includeConsultFee ? "checkmark-circle" : "ellipse-outline"}
                      size={24}
                      color={includeConsultFee ? "#258ec8" : "#cbd5e1"}
                    />
                    <View style={{ flex: 1, marginLeft: 10 }}>
                      <Text style={styles.feeTitle}>
                        {paymentTypePreset === 'consultation_med' ? 'Consultation & Med Fee' : 'Consultation Fee'}
                      </Text>
                      <Text style={styles.feeSubtext}>
                        {paymentTypePreset === 'consultation_med'
                          ? 'Doctor Requested Consultation & Pharmacy Fee'
                          : 'Doctor Requested Consultation Fee'}
                      </Text>
                    </View>
                  </TouchableOpacity>
                  <View style={styles.feeInputWrapper}>
                    <Text style={styles.rupeeSymbolSmall}>₹</Text>
                    <TextInput
                      style={styles.feeNumberInput}
                      keyboardType="numeric"
                      value={String(consultFeeInput)}
                      onChangeText={(v) => handleConsultFeeChange(Number(v) || 0)}
                    />
                  </View>
                </View>

                {/* 2. Prescribed Medicines Fee */}
                <View style={[
                  styles.feeCard,
                  includeMedicineFee && styles.feeCardActive,
                  paymentTypePreset === 'consultation_med' && { opacity: 0.5, backgroundColor: '#f8fafc' },
                  includeMedicineFee && paymentTypePreset !== 'consultation_med' && { flexDirection: 'column', alignItems: 'stretch' }
                ]}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                    <TouchableOpacity
                      style={styles.feeCardCheckRow}
                      disabled={paymentTypePreset === 'consultation_med'}
                      onPress={() => setIncludeMedicineFee(!includeMedicineFee)}
                      activeOpacity={0.8}
                    >
                      <Ionicons
                        name={includeMedicineFee ? "checkmark-circle" : "ellipse-outline"}
                        size={24}
                        color={includeMedicineFee ? "#258ec8" : "#cbd5e1"}
                      />
                      <View style={{ flex: 1, marginLeft: 10 }}>
                        <Text style={[styles.feeTitle, paymentTypePreset === 'consultation_med' && { color: '#64748b' }]}>
                          Prescribed Medicines
                        </Text>
                        <Text style={styles.feeSubtext}>
                          {paymentTypePreset === 'consultation_med'
                            ? 'Disabled (Included in Consultation & Med Fee)'
                            : 'Prescribed Remedies / Pharmacy Fee'}
                        </Text>
                      </View>
                    </TouchableOpacity>
                    <View style={styles.feeInputWrapper}>
                      <Text style={[styles.rupeeSymbolSmall, paymentTypePreset === 'consultation_med' && { color: '#94a3b8' }]}>₹</Text>
                      <TextInput
                        editable={paymentTypePreset !== 'consultation_med'}
                        style={[styles.feeNumberInput, paymentTypePreset === 'consultation_med' && { color: '#94a3b8' }]}
                        keyboardType="numeric"
                        value={String(medicineFeeInput)}
                        onChangeText={(v) => handleMedicineFeeChange(Number(v) || 0)}
                      />
                    </View>
                  </View>

                  {/* Duration selector & Add Medicine list */}
                  {includeMedicineFee && paymentTypePreset !== 'consultation_med' && (
                    <View style={{
                      marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#f1f5f9'
                    }}>
                      {/* Duration Selection */}
                      <View style={{
                        backgroundColor: '#f8fafc', padding: 10, borderRadius: 10, borderWidth: 1, borderColor: '#e2e8f0', marginBottom: 12
                      }}>
                        <Text style={{ fontSize: 12, fontWeight: '700', color: '#1e293b', marginBottom: 8 }}>
                          Medicine Duration:
                        </Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
                          {['1 Month', '2 Months', '3 Months', '4 Months', '5 Months', '6 Months'].map(d => {
                            const isSelected = medicineDuration === d;
                            return (
                              <TouchableOpacity
                                key={d}
                                onPress={() => setMedicineDuration(d)}
                                style={{
                                  paddingHorizontal: 10,
                                  paddingVertical: 6,
                                  borderRadius: 8,
                                  backgroundColor: isSelected ? '#eff6ff' : '#ffffff',
                                  borderWidth: 1.5,
                                  borderColor: isSelected ? '#258ec8' : '#cbd5e1',
                                }}
                              >
                                <Text style={{
                                  fontSize: 11.5,
                                  fontWeight: isSelected ? '800' : '600',
                                  color: isSelected ? '#1d4ed8' : '#475569'
                                }}>
                                  {d}
                                </Text>
                              </TouchableOpacity>
                            );
                          })}
                        </ScrollView>
                      </View>

                      {/* Medicines List Header & Add Button */}
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                        <Text style={{ fontSize: 12.5, fontWeight: '800', color: '#0f172a' }}>
                          Itemized Medicines ({medicineItems.length})
                        </Text>
                        <TouchableOpacity
                          onPress={handleAddMedicineRow}
                          style={{
                            flexDirection: 'row', alignItems: 'center', gap: 4,
                            backgroundColor: '#eff6ff', borderWidth: 1, borderColor: '#93c5fd',
                            paddingHorizontal: 10, paddingVertical: 5, borderRadius: 6
                          }}
                        >
                          <Ionicons name="add" size={15} color="#1d4ed8" />
                          <Text style={{ fontSize: 11.5, fontWeight: '800', color: '#1d4ed8' }}>Add Medicine</Text>
                        </TouchableOpacity>
                      </View>

                      {/* Medicine Items Rows */}
                      {medicineItems.map((item, idx) => (
                        <View
                          key={item.id || idx}
                          style={{
                            flexDirection: 'row', alignItems: 'center', gap: 6,
                            backgroundColor: '#f8fafc', padding: 8, borderRadius: 8,
                            borderWidth: 1, borderColor: '#e2e8f0', marginBottom: 6
                          }}
                        >
                          <Text style={{ fontSize: 11.5, fontWeight: '700', color: '#64748b', width: 22 }}>
                            #{idx + 1}
                          </Text>
                          <TextInput
                            placeholder="Enter Medicine Name (e.g. Arnica 30C)"
                            placeholderTextColor="#94a3b8"
                            value={item.name}
                            onChangeText={(v) => handleUpdateMedicineItem(idx, 'name', v)}
                            style={{
                              flex: 1, backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#cbd5e1',
                              borderRadius: 6, paddingHorizontal: 8, paddingVertical: 5, fontSize: 12,
                              fontWeight: '600', color: '#0f172a'
                            }}
                          />
                          <TouchableOpacity
                            onPress={() => setTimingPickerItemIndex(idx)}
                            style={{
                              backgroundColor: item.timing ? '#eff6ff' : '#f8fafc',
                              borderWidth: 1,
                              borderColor: item.timing ? '#93c5fd' : '#cbd5e1',
                              borderRadius: 6,
                              paddingHorizontal: 8,
                              paddingVertical: 5,
                              flexDirection: 'row',
                              alignItems: 'center',
                              gap: 4
                            }}
                          >
                            <Text style={{
                              fontSize: 11,
                              fontWeight: item.timing ? '800' : '600',
                              color: item.timing ? '#1d4ed8' : '#64748b'
                            }}>
                              {item.timing ? item.timing : 'Select Pill Timing'}
                            </Text>
                            <Ionicons name="chevron-down" size={11} color={item.timing ? '#1d4ed8' : '#64748b'} />
                          </TouchableOpacity>
                          <View style={{
                            flexDirection: 'row', alignItems: 'center', backgroundColor: '#ffffff',
                            borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 6, paddingHorizontal: 6,
                            paddingVertical: 5, width: 75
                          }}>
                            <Text style={{ fontSize: 12, fontWeight: '700', color: '#258ec8', marginRight: 2 }}>₹</Text>
                            <TextInput
                              keyboardType="numeric"
                              placeholder="0"
                              placeholderTextColor="#94a3b8"
                              value={String(item.amount)}
                              onChangeText={(v) => handleUpdateMedicineItem(idx, 'amount', Number(v) || 0)}
                              style={{
                                flex: 1, textAlign: 'right', fontSize: 12, fontWeight: '700', color: '#0f172a', padding: 0
                              }}
                            />
                          </View>
                          <TouchableOpacity
                            onPress={() => handleRemoveMedicineItem(idx)}
                            style={{ padding: 4 }}
                          >
                            <Ionicons name="trash-outline" size={17} color="#ef4444" />
                          </TouchableOpacity>
                        </View>
                      ))}
                    </View>
                  )}
                </View>

                {/* 3. Diet Plan Fee */}
                <View style={[styles.feeCard, includeDietFee && styles.feeCardActive]}>
                  <TouchableOpacity
                    style={styles.feeCardCheckRow}
                    onPress={() => setIncludeDietFee(!includeDietFee)}
                    activeOpacity={0.8}
                  >
                    <Ionicons
                      name={includeDietFee ? "checkmark-circle" : "ellipse-outline"}
                      size={24}
                      color={includeDietFee ? "#258ec8" : "#cbd5e1"}
                    />
                    <View style={{ flex: 1, marginLeft: 10 }}>
                      <Text style={styles.feeTitle}>Diet Plan Fee</Text>
                      <Text style={styles.feeSubtext}>Diet & Nutrition Fee</Text>
                    </View>
                  </TouchableOpacity>
                  <View style={styles.feeInputWrapper}>
                    <Text style={styles.rupeeSymbolSmall}>₹</Text>
                    <TextInput
                      style={styles.feeNumberInput}
                      keyboardType="numeric"
                      value={String(dietFeeInput)}
                      onChangeText={(v) => setDietFeeInput(Number(v) || 0)}
                    />
                  </View>
                </View>

                {/* Medicine Discount Status Section */}
                <View style={styles.discountSectionCard}>
                  <Text style={styles.discountSectionTitle}>Medicine Discount Status</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 }}>
                    <TouchableOpacity
                      style={styles.requestDiscountBtn}
                      onPress={() => setShowDiscountInput(!showDiscountInput)}
                    >
                      <Text style={styles.requestDiscountBtnText}>Request Discount</Text>
                    </TouchableOpacity>

                    {showDiscountInput && (
                      <View style={styles.discountInputWrapper}>
                        <Text style={{ fontSize: 13, fontWeight: '700', color: '#ef4444', marginRight: 4 }}>- ₹</Text>
                        <TextInput
                          style={styles.discountInput}
                          keyboardType="numeric"
                          value={String(discountInput)}
                          onChangeText={(v) => setDiscountInput(Number(v) || 0)}
                        />
                      </View>
                    )}
                  </View>
                </View>
              </>
            )}

            {/* Payment Method Selector */}
            <Text style={[styles.sectionHeading, { marginTop: 18 }]}>Select Payment Method</Text>
            <View style={styles.paymentMethodGrid}>
              {['Cash', 'UPI / QR Code', 'Card', 'Split', 'Send Pay to app'].map((mode) => {
                const isActive = selectedPaymentMode === mode;
                return (
                  <TouchableOpacity
                    key={mode}
                    style={[styles.methodChip, isActive && styles.methodChipActive]}
                    onPress={() => {
                      setSelectedPaymentMode(mode);
                      if (mode === 'Split' && !splitAmount1 && !splitAmount2 && totalAmountDue > 0) {
                        const half1 = Math.round(totalAmountDue / 2);
                        const half2 = Math.max(0, totalAmountDue - half1);
                        setSplitAmount1(String(half1));
                        setSplitAmount2(String(half2));
                      }
                    }}
                  >
                    <Text style={[styles.methodChipText, isActive && styles.methodChipTextActive]}>
                      {mode}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Split Options - Any Combination */}
            {selectedPaymentMode === 'Split' && (
              <View style={[styles.splitBox, { flexDirection: 'column', gap: 10 }]}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: '#0369a1' }}>
                    Select Split Combination:
                  </Text>
                  <TouchableOpacity
                    onPress={() => {
                      const half1 = Math.round(totalAmountDue / 2);
                      const half2 = Math.max(0, totalAmountDue - half1);
                      setSplitAmount1(String(half1));
                      setSplitAmount2(String(half2));
                    }}
                    style={{
                      backgroundColor: '#e0f2fe', paddingHorizontal: 8, paddingVertical: 4,
                      borderRadius: 6, borderWidth: 1, borderColor: '#7dd3fc'
                    }}
                  >
                    <Text style={{ fontSize: 10.5, fontWeight: '700', color: '#0284c7' }}>
                      Auto 50/50 Split
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* 3 Quick Combo Chips */}
                <View style={{ flexDirection: 'row', gap: 6 }}>
                  {[
                    { id: 'cash_upi', label: 'Cash + UPI', m1: 'Cash', m2: 'UPI' },
                    { id: 'cash_card', label: 'Cash + Card', m1: 'Cash', m2: 'Card' },
                    { id: 'upi_card', label: 'UPI + Card', m1: 'UPI', m2: 'Card' },
                  ].map((combo) => {
                    const isComboActive =
                      (splitMethod1 === combo.m1 && splitMethod2 === combo.m2) ||
                      (splitMethod1 === combo.m2 && splitMethod2 === combo.m1);
                    return (
                      <TouchableOpacity
                        key={combo.id}
                        onPress={() => {
                          setSplitMethod1(combo.m1);
                          setSplitMethod2(combo.m2);
                        }}
                        style={{
                          flex: 1, paddingVertical: 6, borderRadius: 8,
                          backgroundColor: isComboActive ? '#0284c7' : '#ffffff',
                          borderWidth: 1, borderColor: isComboActive ? '#0284c7' : '#cbd5e1',
                          alignItems: 'center', justifyContent: 'center'
                        }}
                      >
                        <Text style={{
                          fontSize: 11, fontWeight: isComboActive ? '800' : '600',
                          color: isComboActive ? '#ffffff' : '#334155'
                        }}>
                          {combo.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* Two Method Inputs */}
                <View style={{ flexDirection: 'row', gap: 10, marginTop: 2 }}>
                  {/* Method 1 */}
                  <View style={{ flex: 1, backgroundColor: '#ffffff', padding: 8, borderRadius: 8, borderWidth: 1, borderColor: '#cbd5e1' }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                      <Text style={{ fontSize: 11, fontWeight: '700', color: '#64748b' }}>Method 1</Text>
                      <View style={{ flexDirection: 'row', gap: 4 }}>
                        {['Cash', 'UPI', 'Card'].map(m => (
                          <TouchableOpacity
                            key={m}
                            onPress={() => setSplitMethod1(m)}
                            style={{
                              paddingHorizontal: 5, paddingVertical: 2, borderRadius: 4,
                              backgroundColor: splitMethod1 === m ? '#0284c7' : '#f1f5f9'
                            }}
                          >
                            <Text style={{ fontSize: 9.5, fontWeight: '700', color: splitMethod1 === m ? '#ffffff' : '#64748b' }}>
                              {m}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#f8fafc', borderRadius: 6, paddingHorizontal: 8, borderWidth: 1, borderColor: '#cbd5e1' }}>
                      <Text style={{ fontSize: 12, fontWeight: '700', color: '#0369a1', marginRight: 4 }}>₹</Text>
                      <TextInput
                        style={{ flex: 1, fontSize: 13, fontWeight: '700', color: '#0f172a', textAlign: 'right', paddingVertical: 4 }}
                        keyboardType="numeric"
                        placeholder="0"
                        placeholderTextColor="#94a3b8"
                        value={splitAmount1}
                        onChangeText={(v) => {
                          setSplitAmount1(v);
                          const num = Number(v) || 0;
                          if (v !== '') {
                            setSplitAmount2(String(Math.max(0, totalAmountDue - num)));
                          }
                        }}
                      />
                    </View>
                  </View>

                  {/* Method 2 */}
                  <View style={{ flex: 1, backgroundColor: '#ffffff', padding: 8, borderRadius: 8, borderWidth: 1, borderColor: '#cbd5e1' }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                      <Text style={{ fontSize: 11, fontWeight: '700', color: '#64748b' }}>Method 2</Text>
                      <View style={{ flexDirection: 'row', gap: 4 }}>
                        {['Cash', 'UPI', 'Card'].map(m => (
                          <TouchableOpacity
                            key={m}
                            onPress={() => setSplitMethod2(m)}
                            style={{
                              paddingHorizontal: 5, paddingVertical: 2, borderRadius: 4,
                              backgroundColor: splitMethod2 === m ? '#0284c7' : '#f1f5f9'
                            }}
                          >
                            <Text style={{ fontSize: 9.5, fontWeight: '700', color: splitMethod2 === m ? '#ffffff' : '#64748b' }}>
                              {m}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#f8fafc', borderRadius: 6, paddingHorizontal: 8, borderWidth: 1, borderColor: '#cbd5e1' }}>
                      <Text style={{ fontSize: 12, fontWeight: '700', color: '#0369a1', marginRight: 4 }}>₹</Text>
                      <TextInput
                        style={{ flex: 1, fontSize: 13, fontWeight: '700', color: '#0f172a', textAlign: 'right', paddingVertical: 4 }}
                        keyboardType="numeric"
                        placeholder="0"
                        placeholderTextColor="#94a3b8"
                        value={splitAmount2}
                        onChangeText={setSplitAmount2}
                      />
                    </View>
                  </View>
                </View>

                {/* Balance Note */}
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={{ fontSize: 11, color: '#64748b', fontWeight: '600' }}>
                    Split Sum: <Text style={{ color: (Number(splitAmount1) || 0) + (Number(splitAmount2) || 0) === totalAmountDue ? '#16a34a' : '#ea580c', fontWeight: '700' }}>
                      ₹{(Number(splitAmount1) || 0) + (Number(splitAmount2) || 0)}
                    </Text> / ₹{totalAmountDue}
                  </Text>
                  {(Number(splitAmount1) || 0) + (Number(splitAmount2) || 0) === totalAmountDue ? (
                    <Text style={{ fontSize: 11, color: '#16a34a', fontWeight: '700' }}>✓ Balanced</Text>
                  ) : (
                    <Text style={{ fontSize: 11, color: '#ea580c', fontWeight: '600' }}>
                      Remaining: ₹{Math.max(0, totalAmountDue - ((Number(splitAmount1) || 0) + (Number(splitAmount2) || 0)))}
                    </Text>
                  )}
                </View>
              </View>
            )}

            {/* Total Amount Summary Banner */}
            <View style={[styles.totalBannerRow, { flexDirection: 'column', alignItems: 'stretch', gap: 6, paddingVertical: 14 }]}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={{ fontSize: 12, color: '#475569', fontWeight: '600' }}>Target Amount (Consult + Med):</Text>
                <Text style={{ fontSize: 13, color: '#0f172a', fontWeight: '700' }}>₹ {(activeConsultFee + activeMedicineFee).toLocaleString('en-IN')}</Text>
              </View>
              {includeDietFee && activeDietFee > 0 && (
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={{ fontSize: 12, color: '#15803d', fontWeight: '600' }}>+ Diet Plan Fee:</Text>
                  <Text style={{ fontSize: 13, color: '#15803d', fontWeight: '700' }}>₹ {activeDietFee.toLocaleString('en-IN')}</Text>
                </View>
              )}
              {discountInput > 0 && (
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={{ fontSize: 12, color: '#dc2626', fontWeight: '600' }}>- Medicine Discount:</Text>
                  <Text style={{ fontSize: 13, color: '#dc2626', fontWeight: '700' }}>- ₹ {discountInput.toLocaleString('en-IN')}</Text>
                </View>
              )}
              <View style={{ height: 1, backgroundColor: '#cbd5e1', marginVertical: 3 }} />
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={styles.totalBannerLabel}>TOTAL AMOUNT DUE:</Text>
                <Text style={styles.totalBannerValue}>₹ {totalAmountDue.toLocaleString('en-IN')}</Text>
              </View>
            </View>
          </ScrollView>

          {/* Action Buttons Footer */}
          <View style={styles.footerRow}>
            <TouchableOpacity style={styles.cancelFooterBtn} onPress={handleCancelOrDismiss}>
              <Text style={styles.cancelFooterBtnText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.confirmFooterBtn,
                !hasPrescription && { backgroundColor: '#dc2626' }
              ]}
              onPress={handleConfirmCheckout}
              disabled={isSubmitting || isUploadingPrescription}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#ffffff" size="small" />
              ) : (
                <View style={{ alignItems: 'center' }}>
                  {!hasPrescription && (
                    <Text style={{ color: '#fee2e2', fontSize: 10, fontWeight: '800', marginBottom: 2 }}>
                      ⚠️ UPLOAD PRESCRIPTION REQUIRED
                    </Text>
                  )}
                  <Text style={styles.confirmFooterBtnText}>
                    {hasPrescription ? 'Confirm Payment & Generate Invoice ✓' : 'Upload Prescription to Collect Fee (Mandatory)'}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      )}

      {/* ---------------- PAYMENT SUCCESS POPUP MODAL ---------------- */}
      {paymentSuccessPopup && (
        <View style={[StyleSheet.absoluteFillObject, styles.successBackdrop, { zIndex: 99999 }]}>
          <View style={styles.successCard}>
            <TouchableOpacity
              style={styles.successCloseBtn}
              onPress={() => {
                setPaymentSuccessPopup(null);
                onDismiss();
              }}
            >
              <Ionicons name="close" size={18} color="#64748b" />
            </TouchableOpacity>

            <View style={styles.successIconCircle}>
              <Ionicons name="checkmark-circle" size={48} color="#16a34a" />
            </View>

            <Text style={styles.successTitle}>Payment Successful!</Text>
            <Text style={styles.successSubtitle}>Fee has been collected and recorded successfully.</Text>

            {/* Highlighted Amount Box */}
            <View style={styles.successAmountBox}>
              <Text style={styles.successAmountLabel}>TOTAL AMOUNT COLLECTED</Text>
              <Text style={styles.successAmountValue}>
                ₹ {paymentSuccessPopup?.totalPaid ? paymentSuccessPopup.totalPaid.toLocaleString('en-IN') : '0'}
              </Text>
              <View style={styles.successModeBadge}>
                <Text style={styles.successModeBadgeText}>
                  Paid via {paymentSuccessPopup?.paymentMode || 'Cash'}
                </Text>
              </View>
            </View>

            {/* Patient Name Card */}
            <View style={styles.successPatientBox}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                <Text style={styles.successPatientLabel}>PATIENT NAME</Text>
                {!!selectedPatientForPayment?.regId && (
                  <Text style={styles.successPatientReg}>ID: {selectedPatientForPayment.regId}</Text>
                )}
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Ionicons name="person" size={16} color="#258ec8" />
                <Text style={styles.successPatientName}>
                  {paymentSuccessPopup?.patientName}
                </Text>
              </View>
              {!!selectedPatientForPayment?.phone && (
                <Text style={styles.successPatientPhone}>
                  📱 +91 {selectedPatientForPayment.phone}
                </Text>
              )}
            </View>

            {/* Action Buttons */}
            <TouchableOpacity
              style={styles.successViewInvoiceBtn}
              onPress={() => {
                if (paymentSuccessPopup?.completedInvoice) {
                  setInvoiceApp(paymentSuccessPopup.completedInvoice);
                }
                setPaymentSuccessPopup(null);
              }}
            >
              <Ionicons name="document-text-outline" size={18} color="#ffffff" style={{ marginRight: 6 }} />
              <Text style={styles.successViewInvoiceText}>View Digital Invoice ➔</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.successDoneBtn}
              onPress={() => {
                setPaymentSuccessPopup(null);
                onDismiss();
              }}
            >
              <Text style={styles.successDoneBtnText}>Done & Return to Dashboard</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Timing Picker Modal */}
      {timingPickerItemIndex !== null && (
        <View style={{
          position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.6)',
          justifyContent: 'center', alignItems: 'center', padding: 20, zIndex: 9999
        }}>
          <View style={{
            width: '100%', maxWidth: 360, backgroundColor: '#ffffff',
            borderRadius: 16, padding: 16, elevation: 10
          }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <Text style={{ fontSize: 15, fontWeight: '800', color: '#0f172a' }}>
                Select Dosage Timing
              </Text>
              <TouchableOpacity onPress={() => setTimingPickerItemIndex(null)} style={{ padding: 4 }}>
                <Ionicons name="close" size={20} color="#64748b" />
              </TouchableOpacity>
            </View>
            <ScrollView style={{ maxHeight: 320 }}>
              {DOSAGE_TIMING_OPTIONS.map((opt) => {
                const isSelected = timingPickerItemIndex !== null && medicineItems[timingPickerItemIndex]?.timing === opt.value;
                return (
                  <TouchableOpacity
                    key={opt.value}
                    onPress={() => {
                      if (timingPickerItemIndex !== null) {
                        handleUpdateMedicineItem(timingPickerItemIndex, 'timing', opt.value);
                      }
                      setTimingPickerItemIndex(null);
                    }}
                    style={{
                      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                      paddingVertical: 10, paddingHorizontal: 12, borderRadius: 10,
                      backgroundColor: isSelected ? '#eff6ff' : '#f8fafc', marginBottom: 6,
                      borderWidth: 1, borderColor: isSelected ? '#258ec8' : '#e2e8f0'
                    }}
                  >
                    <Text style={{ fontSize: 13, fontWeight: isSelected ? '800' : '600', color: isSelected ? '#1d4ed8' : '#1e293b' }}>
                      {opt.label}
                    </Text>
                    {isSelected && <Ionicons name="checkmark-circle" size={18} color="#258ec8" />}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </View>
      )}

      {/* Package Duration Selection Popup Modal */}
      {showPackageDurationModal && (
        <View style={{
          position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.6)',
          justifyContent: 'center', alignItems: 'center',
          padding: 20, zIndex: 99999
        }}>
          <View style={{
            width: '100%', maxWidth: 360, backgroundColor: '#ffffff',
            borderRadius: 16, padding: 18, elevation: 10
          }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <MaterialCommunityIcons name="calendar-clock" size={20} color="#258ec8" />
                <Text style={{ fontSize: 16, fontWeight: '800', color: '#0f172a' }}>
                  Select Package Duration
                </Text>
              </View>
              <TouchableOpacity onPress={() => setShowPackageDurationModal(false)} style={{ padding: 4 }}>
                <Ionicons name="close" size={20} color="#64748b" />
              </TouchableOpacity>
            </View>
            <ScrollView style={{ maxHeight: 320 }}>
              {['1 Month', '2 Months', '3 Months', '4 Months', '5 Months', '6 Months', '1 Year'].map((dur) => {
                const isSelected = packageDurationInput === dur;
                return (
                  <TouchableOpacity
                    key={dur}
                    onPress={() => {
                      setPackageDurationInput(dur);
                      setShowPackageDurationModal(false);
                    }}
                    style={{
                      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                      paddingVertical: 12, paddingHorizontal: 14, borderRadius: 10,
                      backgroundColor: isSelected ? '#eff6ff' : '#f8fafc', marginBottom: 6,
                      borderWidth: 1.5, borderColor: isSelected ? '#258ec8' : '#e2e8f0'
                    }}
                  >
                    <Text style={{ fontSize: 14, fontWeight: isSelected ? '800' : '600', color: isSelected ? '#1d4ed8' : '#1e293b' }}>
                      {dur}
                    </Text>
                    {isSelected && <Ionicons name="checkmark-circle" size={20} color="#258ec8" />}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </View>
      )}

      {/* Fullscreen Prescription Image Preview Modal */}
      {previewModalUrl && (
        <Modal
          visible={!!previewModalUrl}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setPreviewModalUrl(null)}
        >
          <View style={{
            flex: 1,
            backgroundColor: 'rgba(0, 0, 0, 0.92)',
            justifyContent: 'center',
            alignItems: 'center',
            padding: 16,
          }}>
            <TouchableOpacity
              onPress={() => setPreviewModalUrl(null)}
              style={{
                position: 'absolute',
                top: 40,
                right: 20,
                backgroundColor: 'rgba(255, 255, 255, 0.25)',
                width: 40,
                height: 40,
                borderRadius: 20,
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 10,
              }}
            >
              <Ionicons name="close" size={26} color="#ffffff" />
            </TouchableOpacity>
            <Image
              source={{ uri: previewModalUrl }}
              style={{ width: '100%', height: '80%', resizeMode: 'contain', borderRadius: 8 }}
            />
          </View>
        </Modal>
      )}
    </Modal>
  );
};

export default AppointmentPaymentModal;

const styles = StyleSheet.create({
  fullScreenContainer: {
    flex: 1,
    backgroundColor: '#ffffff'
  },
  topNavBar: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    backgroundColor: '#ffffff'
  },
  backBtn: {
    padding: 4
  },
  headerTitle: {
    fontSize: 19,
    fontWeight: '800',
    color: '#0f172a'
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 1
  },
  closeCircleBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center'
  },
  scrollBody: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 14
  },
  patientCardContainer: {
    backgroundColor: '#f0f7ff',
    borderRadius: 14,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#e0f2fe'
  },
  patientInfoLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10
  },
  patientAvatarCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#dbeafe',
    alignItems: 'center',
    justifyContent: 'center'
  },
  patientNameText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0f172a'
  },
  patientPhoneText: {
    fontSize: 12,
    color: '#475569',
    marginTop: 2
  },
  viewDetailsBtn: {
    borderWidth: 1,
    borderColor: '#258ec8',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#ffffff'
  },
  viewDetailsBtnText: {
    color: '#258ec8',
    fontSize: 12,
    fontWeight: '700'
  },
  expandedDetailsBox: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    padding: 10,
    marginTop: 8,
    gap: 4
  },
  expDetailLine: {
    fontSize: 12,
    color: '#64748b'
  },
  sectionHeading: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0f172a',
    marginTop: 18,
    marginBottom: 10
  },
  targetAmountBox: {
    borderWidth: 1,
    borderColor: '#93c5fd',
    backgroundColor: '#f8fafc',
    borderRadius: 14,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  targetTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a'
  },
  targetSubtext: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2
  },
  targetInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#258ec8',
    backgroundColor: '#ffffff',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 6,
    width: 90
  },
  rupeeSymbol: {
    fontSize: 15,
    fontWeight: '800',
    color: '#258ec8',
    marginRight: 4
  },
  targetInput: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0f172a',
    flex: 1,
    textAlign: 'right'
  },
  presetPillsGrid: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 12,
    marginBottom: 14
  },
  presetPill: {
    flex: 1,
    paddingVertical: 9,
    paddingHorizontal: 4,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center'
  },
  presetPillActive: {
    backgroundColor: '#eff6ff',
    borderColor: '#258ec8',
    borderWidth: 1.5
  },
  presetPillText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#475569',
    textAlign: 'center'
  },
  presetPillTextActive: {
    color: '#1d4ed8',
    fontWeight: '800'
  },
  feeCard: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    backgroundColor: '#ffffff',
    padding: 12,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  feeCardActive: {
    borderColor: '#93c5fd',
    backgroundColor: '#fafafa'
  },
  feeCardCheckRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1
  },
  feeTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a'
  },
  feeSubtext: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2
  },
  feeInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    width: 80,
    backgroundColor: '#ffffff'
  },
  rupeeSymbolSmall: {
    fontSize: 13,
    fontWeight: '700',
    color: '#258ec8',
    marginRight: 2
  },
  feeNumberInput: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
    flex: 1,
    textAlign: 'right'
  },
  discountSectionCard: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    padding: 12,
    marginTop: 4,
    marginBottom: 10
  },
  discountSectionTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0f172a'
  },
  requestDiscountBtn: {
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8
  },
  requestDiscountBtnText: {
    color: '#334155',
    fontSize: 12,
    fontWeight: '700'
  },
  discountInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#fecaca',
    backgroundColor: '#fff5f5',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    width: 90
  },
  discountInput: {
    fontSize: 13,
    fontWeight: '700',
    color: '#ef4444',
    flex: 1,
    textAlign: 'right'
  },
  paymentMethodGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12
  },
  methodChip: {
    width: '31%',
    paddingVertical: 9,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    backgroundColor: '#ffffff',
    alignItems: 'center'
  },
  methodChipActive: {
    borderColor: '#258ec8',
    backgroundColor: '#f0f9ff',
    borderWidth: 1.5
  },
  methodChipText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#475569'
  },
  methodChipTextActive: {
    color: '#258ec8',
    fontWeight: '800'
  },
  splitBox: {
    flexDirection: 'row',
    backgroundColor: '#f0f9ff',
    borderWidth: 1,
    borderColor: '#bae6fd',
    borderRadius: 10,
    padding: 10,
    marginBottom: 14
  },
  splitLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0369a1',
    marginBottom: 4
  },
  splitInput: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#7dd3fc',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    fontSize: 12,
    fontWeight: '700',
    color: '#0f172a'
  },
  totalBannerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderWidth: 1.5,
    borderColor: '#cbd5e1',
    borderRadius: 12,
    padding: 14,
    marginTop: 8,
    marginBottom: 20
  },
  totalBannerLabel: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0f172a'
  },
  totalBannerValue: {
    fontSize: 18,
    fontWeight: '800',
    color: '#16a34a'
  },
  footerRow: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10
  },
  cancelFooterBtn: {
    paddingHorizontal: 16,
    paddingVertical: 11,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    backgroundColor: '#ffffff'
  },
  cancelFooterBtnText: {
    color: '#475569',
    fontWeight: '700',
    fontSize: 13
  },
  confirmFooterBtn: {
    flex: 1,
    backgroundColor: '#16a34a',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center'
  },
  confirmFooterBtnText: {
    color: '#ffffff',
    fontWeight: '800',
    fontSize: 13
  },
  successBackdrop: {
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20
  },
  successCard: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 24,
    width: '100%',
    maxWidth: 380,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
    position: 'relative'
  },
  successCloseBtn: {
    position: 'absolute',
    top: 14,
    right: 14,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10
  },
  successIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#dcfce7',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16
  },
  successTitle: {
    fontSize: 21,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 4,
    textAlign: 'center'
  },
  successSubtitle: {
    fontSize: 13,
    color: '#64748b',
    marginBottom: 16,
    textAlign: 'center'
  },
  successAmountBox: {
    width: '100%',
    backgroundColor: '#f0fdf4',
    borderWidth: 1.5,
    borderColor: '#86efac',
    borderStyle: 'dashed',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    alignItems: 'center',
    marginBottom: 14
  },
  successAmountLabel: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#166534',
    letterSpacing: 0.8,
    textTransform: 'uppercase'
  },
  successAmountValue: {
    fontSize: 28,
    fontWeight: '900',
    color: '#15803d',
    marginVertical: 4
  },
  successModeBadge: {
    backgroundColor: '#dcfce7',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12
  },
  successModeBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#166534'
  },
  successPatientBox: {
    width: '100%',
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    padding: 12,
    marginBottom: 18
  },
  successPatientLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#64748b',
    letterSpacing: 0.5,
    textTransform: 'uppercase'
  },
  successPatientReg: {
    fontSize: 11,
    fontWeight: '700',
    color: '#258ec8'
  },
  successPatientName: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0f172a',
    flex: 1
  },
  successPatientPhone: {
    fontSize: 12,
    color: '#475569',
    marginTop: 3,
    marginLeft: 22
  },
  successViewInvoiceBtn: {
    width: '100%',
    backgroundColor: '#258ec8',
    paddingVertical: 13,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
    shadowColor: '#258ec8',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4
  },
  successViewInvoiceText: {
    color: '#ffffff',
    fontWeight: '800',
    fontSize: 14
  },
  successDoneBtn: {
    width: '100%',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center'
  },
  successDoneBtnText: {
    color: '#475569',
    fontWeight: '700',
    fontSize: 13.5
  }
});
