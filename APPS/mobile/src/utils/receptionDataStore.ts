import { getSafeDb, collection, onSnapshot, getDocs, query, limit } from './firebaseSafe';

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

  private unsubApp: (() => void) | null = null;
  private unsubPat: (() => void) | null = null;
  private unsubPatientsCol: (() => void) | null = null;
  private unsubPkg: (() => void) | null = null;
  private unsubPrescriptions: (() => void) | null = null;
  private unsubPatientProfiles: (() => void) | null = null;
  private unsubFollowups: (() => void) | null = null;
  private unsubConsultations: (() => void) | null = null;

  private rawAllAppointments: any[] = [];
  private rawAllFromAllPatients: any[] = [];
  private appsFromAppointments: any[] = [];
  private appsFromAllPatients: any[] = [];
  private patientsFromPatientsCol: any[] = [];
  private rawPrescriptions: any[] = [];
  private rawPatientProfiles: any[] = [];
  private rawFollowups: any[] = [];
  private rawConsultations: any[] = [];

  private isStarted = false;

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

    // 1. Add all appointments from 'appointments' collection by document ID
    for (const item of this.appsFromAppointments) {
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

    // 2. Merge records from 'allpatients' collection
    for (const item of this.appsFromAllPatients) {
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

    const list = Array.from(combinedMap.values());
    list.sort((a, b) => {
      const dateA = String(a.appointmentDate || a.date || a.createdAt || '');
      const dateB = String(b.appointmentDate || b.date || b.createdAt || '');
      return dateB.localeCompare(dateA);
    });

    this.appointments = list;

    // Compact pool across essential collections: appointments, allpatients, patients, package_members
    this.allCollectionsPool = [
      ...this.rawAllAppointments,
      ...this.rawAllFromAllPatients,
      ...this.patientsFromPatientsCol,
      ...this.packageMembersList,
    ];

    this.isLoaded = true;
    this.notify();
  }

  private batchTimer: any = null;

  private sanitizeHistoryDoc(data: any, id: string, collectionName: string) {
    return {
      id,
      docId: id,
      collectionName,
      patientName: data.patientName || data.name || data.fullName || '',
      phone: data.phone || data.phoneNumber || data.mobile || '',
      regId: data.regId || data.registrationId || data.patientId || data.uhid || '',
      patientDocId: data.patientDocId || data.patient_id || data.patientId || '',
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
    }, 200);
  }

  public startListeners() {
    const activeDb = getSafeDb();
    if (this.isStarted || !activeDb) return;
    this.isStarted = true;

    // 1. Subscribe to package_members (Essential for package dues & duration check)
    try {
      this.unsubPkg = onSnapshot(collection(activeDb, 'package_members'), (snap) => {
        const list: any[] = [];
        snap.forEach(d => list.push({ id: d.id, ...d.data() }));
        this.packageMembersList = list;
        this.scheduleMergeAndSet();
      }, (err) => console.warn('Mobile package members store sync notice:', err));
    } catch (e) {
      console.warn('Mobile package members listener setup error:', e);
    }

    // 2. Subscribe to appointments (Essential for live queue, limited to 400 most recent for fast loading)
    try {
      this.unsubApp = onSnapshot(query(collection(activeDb, 'appointments'), limit(400)), (snapshot) => {
        const list: any[] = [];
        snapshot.forEach((snap) => {
          list.push({ ...snap.data(), id: snap.id, docId: snap.id, collectionName: 'appointments' });
        });
        this.appsFromAppointments = list;
        this.rawAllAppointments = list;
        this.scheduleMergeAndSet();
      }, (err) => console.warn('Appointments store listener notice:', err));
    } catch (e) {
      console.warn('Appointments store listener setup error:', e);
    }

    // 3. Subscribe to allpatients (Essential for reception directory, limited to 400 most recent for fast loading)
    try {
      this.unsubPat = onSnapshot(query(collection(activeDb, 'allpatients'), limit(400)), (snapshot) => {
        const queueList: any[] = [];
        const allList: any[] = [];
        snapshot.forEach((snap) => {
          const data = snap.data();
          const item = { ...data, id: snap.id, docId: snap.id, collectionName: 'allpatients' };
          allList.push(item);
          if (data.appointmentDate || data.date || data.appointmentTime || data.doctor || data.status) {
            queueList.push(item);
          }
        });
        this.appsFromAllPatients = queueList;
        this.rawAllFromAllPatients = allList;
        this.scheduleMergeAndSet();
      }, (err) => console.warn('Mobile allpatients store listener notice:', err));
    } catch (e) {
      console.warn('Mobile allpatients store listener setup error:', e);
    }

    // 4. One-time background load of historical patients collection (limited to 200 to prevent heavy websocket streaming)
    try {
      getDocs(query(collection(activeDb, 'patients'), limit(200))).then((snapshot) => {
        const list: any[] = [];
        snapshot.forEach((snap) => {
          list.push(this.sanitizeHistoryDoc(snap.data(), snap.id, 'patients'));
        });
        this.patientsFromPatientsCol = list;
        this.scheduleMergeAndSet();
      }).catch((err) => console.warn('Mobile historical patients load notice:', err));
    } catch (e) {
      console.warn('Mobile patients store load setup error:', e);
    }
  }
}

export const receptionDataStore = new ReceptionDataStore();
