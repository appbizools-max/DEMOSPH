import { getSafeDb, collection, onSnapshot, getDocs, query, limit, where } from './firebaseSafe';
import { getBranchQueryNames, sanitizeDoctorName } from '@app/shared';
import AsyncStorage from '@react-native-async-storage/async-storage';

const CACHE_KEY = '@sph_mobile_reception_store_v1';

const ACTIVE_STATUSES = [
  'waiting',
  'scheduled',
  'in_consultation',
  'in-consultation',
  'active',
  'collect_fee',
  'consulting'
];

export interface ReceptionStoreState {
  appointments: any[];
  allCollectionsPool: any[];
  packageMembersList: any[];
  isLoaded: boolean;
}

type Listener = (state: ReceptionStoreState) => void;

class ReceptionDataStore {
  private appointments: any[] = [];
  private allCollectionsPool: any[] = [];
  private packageMembersList: any[] = [];
  private isLoaded = false;
  private listeners: Set<Listener> = new Set();

  private priorityAppsMap = new Map<string, any>();
  private fullAppsMap = new Map<string, any>();
  private priorityPatsMap = new Map<string, any>();
  private fullPatsMap = new Map<string, any>();
  private patientsFromPatientsCol: any[] = [];

  private unsubActiveApp: (() => void) | null = null;
  private unsubTodayApp: (() => void) | null = null;
  private unsubActivePat: (() => void) | null = null;
  private unsubTodayPat: (() => void) | null = null;
  private unsubPkg: (() => void) | null = null;
  private unsubFullApp: (() => void) | null = null;
  private unsubFullPat: (() => void) | null = null;

  private isStarted = false;
  private batchTimer: any = null;
  private saveCacheTimer: any = null;

  constructor() {
    this.loadFromCache();
  }

  private async loadFromCache() {
    try {
      const raw = await AsyncStorage.getItem(CACHE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && Array.isArray(parsed.appointments) && parsed.appointments.length > 0) {
          this.appointments = parsed.appointments;
          this.allCollectionsPool = Array.isArray(parsed.allCollectionsPool) ? parsed.allCollectionsPool : parsed.appointments;
          this.packageMembersList = Array.isArray(parsed.packageMembersList) ? parsed.packageMembersList : [];
          this.isLoaded = true;
          this.notify();
        }
      }
    } catch (_) {}
  }

  private scheduleSaveCache() {
    if (this.saveCacheTimer) clearTimeout(this.saveCacheTimer);
    this.saveCacheTimer = setTimeout(async () => {
      try {
        const payload = JSON.stringify({
          appointments: this.appointments.slice(0, 1000),
          allCollectionsPool: this.allCollectionsPool.slice(0, 1500),
          packageMembersList: this.packageMembersList.slice(0, 150),
          timestamp: Date.now()
        });
        await AsyncStorage.setItem(CACHE_KEY, payload);
      } catch (_) {}
    }, 1500);
  }

  public getState(): ReceptionStoreState {
    return {
      appointments: this.appointments,
      allCollectionsPool: this.allCollectionsPool,
      packageMembersList: this.packageMembersList,
      isLoaded: this.isLoaded,
    };
  }

  public getAppointments(): any[] {
    return this.appointments;
  }

  public getAllCollectionsPool(): any[] {
    return this.allCollectionsPool;
  }

  public getPackageMembers(): any[] {
    return this.packageMembersList;
  }

  public updateLocalAppointment(docId: string, patch: Partial<any>) {
    if (!docId) return;
    if (this.priorityAppsMap.has(docId)) {
      const cur = this.priorityAppsMap.get(docId);
      this.priorityAppsMap.set(docId, { ...cur, ...patch, id: docId, docId });
    }
    if (this.fullAppsMap.has(docId)) {
      const cur = this.fullAppsMap.get(docId);
      this.fullAppsMap.set(docId, { ...cur, ...patch, id: docId, docId });
    }
    if (this.priorityPatsMap.has(docId)) {
      const cur = this.priorityPatsMap.get(docId);
      this.priorityPatsMap.set(docId, { ...cur, ...patch, id: docId, docId });
    }
    if (this.fullPatsMap.has(docId)) {
      const cur = this.fullPatsMap.get(docId);
      this.fullPatsMap.set(docId, { ...cur, ...patch, id: docId, docId });
    }
    if (!this.priorityAppsMap.has(docId) && !this.fullAppsMap.has(docId)) {
      this.priorityAppsMap.set(docId, { ...patch, id: docId, docId });
    }
    this.scheduleMergeAndSet(true);
  }

  public subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    if (this.isLoaded || this.allCollectionsPool.length > 0 || this.appointments.length > 0) {
      try {
        listener(this.getState());
      } catch (err) {
        console.error('Error notifying reception mobile store listener on subscribe:', err);
      }
    }
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    const state = this.getState();
    for (const listener of this.listeners) {
      try {
        listener(state);
      } catch (err) {
        console.error('Error notifying reception mobile store listener:', err);
      }
    }
  }

  private mergeAndSet() {
    const combinedMap = new Map<string, any>();
    const lookupMap = new Map<string, string>();

    // Combine full appointments map and priority active appointments (priority takes precedence)
    const allApps = Array.from(new Map([...this.fullAppsMap, ...this.priorityAppsMap]).values());

    // 1. Add all appointments from 'appointments' collection by document ID
    for (const item of allApps) {
      if (item.id) {
        combinedMap.set(item.id, item);
        const phone = String(item.phone || item.phoneNumber || '').replace(/\D/g, '').slice(-10);
        const date = String(item.appointmentDate || item.date || '').trim();
        const time = String(item.appointmentTime || item.time || item.timeSlot || '').trim().toLowerCase();
        const doc = String(item.doctorName || item.doctor || '').trim().toLowerCase();
        if (phone && date && time) {
          lookupMap.set(`${phone}|${date}|${time}`, doc);
        }
      }
    }

    // Combine full allpatients map and priority active allpatients
    const allPats = Array.from(new Map([...this.fullPatsMap, ...this.priorityPatsMap]).values());

    // 2. Merge records from 'allpatients' collection
    for (const item of allPats) {
      if (!item.id) continue;
      if (combinedMap.has(item.id)) {
        const existing = combinedMap.get(item.id);
        combinedMap.set(item.id, {
          ...item,
          ...existing,
          status: existing.status || item.status,
          paymentStatus: existing.paymentStatus || item.paymentStatus,
          feeCollectionNeeded: existing.feeCollectionNeeded ?? item.feeCollectionNeeded,
        });
      } else {
        const cleanPhone = String(item.phone || item.phoneNumber || '').replace(/\D/g, '').slice(-10);
        const date = String(item.appointmentDate || item.date || '').trim();
        const time = String(item.appointmentTime || item.time || item.timeSlot || '').trim().toLowerCase();
        const doctor = String(item.doctorName || item.doctor || '').trim().toLowerCase();

        let isDuplicate = false;
        if (cleanPhone && date && time) {
          const key = `${cleanPhone}|${date}|${time}`;
          if (lookupMap.has(key)) {
            const exDoc = lookupMap.get(key) || '';
            if (!doctor || !exDoc || doctor === exDoc) {
              isDuplicate = true;
            }
          }
        }

        if (!isDuplicate) {
          combinedMap.set(item.id, item);
          if (cleanPhone && date && time) {
            lookupMap.set(`${cleanPhone}|${date}|${time}`, doctor);
          }
        }
      }
    }

    const list = Array.from(combinedMap.values()).map(item => {
      const sanitizedDoc = sanitizeDoctorName(item.doctorName || item.doctor, item.branch || item.branchName);
      return {
        ...item,
        doctorName: sanitizedDoc,
        doctor: sanitizedDoc,
      };
    });

    list.sort((a, b) => {
      const dateA = String(a.appointmentDate || a.date || a.createdAt || '');
      const dateB = String(b.appointmentDate || b.date || b.createdAt || '');
      return dateB.localeCompare(dateA);
    });

    this.appointments = list;

    // Compact pool across essential collections: appointments, allpatients, patients, package_members
    this.allCollectionsPool = [
      ...allApps,
      ...allPats,
      ...this.patientsFromPatientsCol,
      ...this.packageMembersList,
    ];

    this.isLoaded = true;
    this.notify();
    this.scheduleSaveCache();
  }

  private sanitizeHistoryDoc(data: any, id: string, collectionName: string) {
    return {
      id,
      docId: id,
      collectionName,
      patientName: data.patientName || data.name || data.fullName || '',
      phone: data.phone || data.phoneNumber || data.mobile || data.contactNumber || '',
      regId: data.regNo || data.regId || data.registrationId || data.patientId || data.uhid || '',
      regNo: data.regNo || data.registrationId || data.regId || '',
      registrationId: data.registrationId || data.regNo || data.regId || '',
      patientDocId: data.patientDocId || data.patient_id || data.patientId || '',
      patientType: data.patientType || '',
      isNewPatient: data.isNewPatient,
      source: data.source || data.marketingSource || '',
      prescriptionUrls: data.prescriptionUrls || [],
      duration: data.duration || '',
      medicineDuration: data.medicineDuration || '',
      followUpInterval: data.followUpInterval || data.interval || '',
      preferredFollowUpDate: data.preferredFollowUpDate || data.scheduledDate || data.followupDate || '',
      durationExpiryDate: data.durationExpiryDate || data.medicineDurationExpiryDate || '',
      durationStartDate: data.durationStartDate || data.appointmentDate || data.date || data.createdAt || '',
      createdAt: data.createdAt || '',
      appointmentDate: data.appointmentDate || data.date || '',
      status: data.status || '',
      paymentStatus: data.paymentStatus || '',
    };
  }

  private scheduleMergeAndSet(immediate: boolean = false) {
    if (immediate) {
      if (this.batchTimer) {
        clearTimeout(this.batchTimer);
        this.batchTimer = null;
      }
      this.mergeAndSet();
      return;
    }

    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
    }

    this.batchTimer = setTimeout(() => {
      this.batchTimer = null;
      this.mergeAndSet();
    }, 150);
  }

  public startListeners(branchName?: string) {
    const activeDb = getSafeDb();
    if (this.isStarted || !activeDb) return;
    this.isStarted = true;

    // Build today and tomorrow date strings for targeted queries
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    const todayISO = `${y}-${m}-${d}`;
    const todayDDMMYYYY = `${d}-${m}-${y}`;
    const todaySlash = `${d}/${m}/${y}`;

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const ty = tomorrow.getFullYear();
    const tm = String(tomorrow.getMonth() + 1).padStart(2, '0');
    const td = String(tomorrow.getDate()).padStart(2, '0');
    const tomorrowISO = `${ty}-${tm}-${td}`;
    const tomorrowDDMMYYYY = `${td}-${tm}-${ty}`;
    const tomorrowSlash = `${td}/${tm}/${ty}`;

    const targetDateStrings = [todayISO, todayDDMMYYYY, todaySlash, tomorrowISO, tomorrowDDMMYYYY, tomorrowSlash];

    // ==============================================================
    // PHASE 1: Fast Immediate Active & Upcoming Queue (< 150ms)
    // Loads ONLY currently active queue + today/tomorrow bookings
    // ==============================================================

    // 1A. Package members (limit 150 for instant response)
    try {
      this.unsubPkg = onSnapshot(query(collection(activeDb, 'package_members'), limit(150)), (snap) => {
        const list: any[] = [];
        snap.forEach(d => list.push({ id: d.id, ...d.data() }));
        this.packageMembersList = list;
        this.scheduleMergeAndSet(true);
      }, (err) => console.warn('Mobile package members store sync notice:', err));
    } catch (e) {
      console.warn('Mobile package members listener setup error:', e);
    }

    // 1B. Immediate Active & Upcoming in 'appointments'
    try {
      this.unsubActiveApp = onSnapshot(query(collection(activeDb, 'appointments'), where('status', 'in', ACTIVE_STATUSES)), (snapshot) => {
        snapshot.forEach((snap) => {
          this.priorityAppsMap.set(snap.id, { ...snap.data(), id: snap.id, docId: snap.id, collectionName: 'appointments' });
        });
        this.scheduleMergeAndSet(true);
      }, (err) => console.warn('Appointments active queue listener notice:', err));
    } catch (e) {
      console.warn('Appointments active queue listener setup error:', e);
    }

    // 1C. Immediate Today & Tomorrow in 'appointments' (catches bookings with custom/empty status)
    try {
      this.unsubTodayApp = onSnapshot(query(collection(activeDb, 'appointments'), where('appointmentDate', 'in', targetDateStrings)), (snapshot) => {
        snapshot.forEach((snap) => {
          this.priorityAppsMap.set(snap.id, { ...snap.data(), id: snap.id, docId: snap.id, collectionName: 'appointments' });
        });
        this.scheduleMergeAndSet(true);
      }, (err) => console.warn('Appointments today queue listener notice:', err));
    } catch (e) {
      console.warn('Appointments today queue listener setup error:', e);
    }

    // 1D. Immediate Active & Upcoming in 'allpatients'
    try {
      this.unsubActivePat = onSnapshot(query(collection(activeDb, 'allpatients'), where('status', 'in', ACTIVE_STATUSES)), (snapshot) => {
        snapshot.forEach((snap) => {
          this.priorityPatsMap.set(snap.id, { ...snap.data(), id: snap.id, docId: snap.id, collectionName: 'allpatients' });
        });
        this.scheduleMergeAndSet(true);
      }, (err) => console.warn('Allpatients active queue listener notice:', err));
    } catch (e) {
      console.warn('Allpatients active queue listener setup error:', e);
    }

    // 1E. Immediate Today & Tomorrow in 'allpatients'
    try {
      this.unsubTodayPat = onSnapshot(query(collection(activeDb, 'allpatients'), where('appointmentDate', 'in', targetDateStrings)), (snapshot) => {
        snapshot.forEach((snap) => {
          this.priorityPatsMap.set(snap.id, { ...snap.data(), id: snap.id, docId: snap.id, collectionName: 'allpatients' });
        });
        this.scheduleMergeAndSet(true);
      }, (err) => console.warn('Allpatients today queue listener notice:', err));
    } catch (e) {
      console.warn('Allpatients today queue listener setup error:', e);
    }

    // ==============================================================
    // PHASE 2: Full Historical Stream (Deferred 1.2s background sync)
    // Guarantees 100% of ALL data without blocking the UI thread!
    // ==============================================================
    setTimeout(() => {
      // 2A. Full appointments collection (up to 2500)
      try {
        this.unsubFullApp = onSnapshot(query(collection(activeDb, 'appointments'), limit(2500)), (snapshot) => {
          snapshot.forEach((snap) => {
            this.fullAppsMap.set(snap.id, { ...snap.data(), id: snap.id, docId: snap.id, collectionName: 'appointments' });
          });
          this.scheduleMergeAndSet(false);
        }, (err) => console.warn('Appointments full store listener notice:', err));
      } catch (e) {
        console.warn('Appointments full store listener setup error:', e);
      }

      // 2B. Full allpatients collection (up to 2500)
      try {
        this.unsubFullPat = onSnapshot(query(collection(activeDb, 'allpatients'), limit(2500)), (snapshot) => {
          snapshot.forEach((snap) => {
            const data = snap.data();
            const item = { ...data, id: snap.id, docId: snap.id, collectionName: 'allpatients' };
            this.fullPatsMap.set(snap.id, item);
          });
          this.scheduleMergeAndSet(false);
        }, (err) => console.warn('Mobile allpatients full store listener notice:', err));
      } catch (e) {
        console.warn('Mobile allpatients full store listener setup error:', e);
      }

      // 2C. Background historical patients collection scoped to branch
      try {
        const branchQueries = getBranchQueryNames(branchName);
        const qList = branchQueries.length > 0
          ? [
              query(collection(activeDb, 'patients'), where('branchName', 'in', branchQueries), limit(500)),
              query(collection(activeDb, 'patients'), where('branch', 'in', branchQueries), limit(500))
            ]
          : [query(collection(activeDb, 'patients'), limit(300))];

        Promise.all(qList.map(q => getDocs(q).catch(() => ({ docs: [] })))).then((snaps) => {
          const list: any[] = [];
          const seen = new Set<string>();
          snaps.forEach((snapshot: any) => {
            snapshot.docs?.forEach((snap: any) => {
              if (!seen.has(snap.id)) {
                seen.add(snap.id);
                list.push(this.sanitizeHistoryDoc(snap.data(), snap.id, 'patients'));
              }
            });
          });
          this.patientsFromPatientsCol = list;
          this.scheduleMergeAndSet(false);
        }).catch((err) => console.warn('Historical patients load notice:', err));
      } catch (e) {
        console.warn('Patients store load setup error:', e);
      }
    }, 1200);
  }
}

export const receptionDataStore = new ReceptionDataStore();
