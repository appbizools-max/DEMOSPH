/**
 * Media Manager Service for Spiritual Homeopathy Clinics
 * Supports Folders, Stored URLs (Google Drive, Cloud links, Reports), Files & Patient Association
 */

import {
  collection,
  doc,
  addDoc,
  getDocs,
  deleteDoc,
  updateDoc,
  query,
  orderBy,
  limit,
  onSnapshot,
  where
} from 'firebase/firestore';
import { db } from '@app/shared';

export type MediaCategory =
  | 'lab_reports'
  | 'xrays_scans'
  | 'prescriptions'
  | 'clinical_photos'
  | 'consent_forms'
  | 'clinic_media';

export interface ClinicFolder {
  id?: string;
  name: string;
  description?: string;
  color?: string; // hex code or color name
  patientId?: string;
  patientName?: string;
  patientPhone?: string;
  branchName?: string;
  itemCount?: number;
  createdBy: string;
  createdAt: string; // ISO string
}

export interface ClinicMediaItem {
  id?: string;
  folderId?: string; // ID of the folder it belongs to, or empty/'root'
  folderName?: string;
  title: string;
  type: 'url' | 'file' | 'image' | 'pdf';
  url: string; // Stored web URL or Base64 Data URL
  urlType?: 'google_drive' | 'dropbox' | 'onedrive' | 'youtube' | 'pdf_link' | 'cloud_storage' | 'web_link';
  category: MediaCategory;
  fileName?: string;
  fileSizeFormatted?: string;
  patientId?: string;
  patientName?: string;
  patientPhone?: string;
  doctorName?: string;
  branchName?: string;
  recordDate: string; // YYYY-MM-DD
  notes?: string;
  tags?: string[];
  uploadedBy: string;
  createdAt: string; // ISO string
}

export const MEDIA_CATEGORIES: { id: MediaCategory; label: string; color: string; bg: string }[] = [
  { id: 'lab_reports', label: 'Lab & Blood Reports', color: '#258ec8', bg: '#e0f2fe' },
  { id: 'xrays_scans', label: 'X-Rays & Imaging Scans', color: '#7c3aed', bg: '#ede9fe' },
  { id: 'prescriptions', label: 'Prescriptions & Records', color: '#059669', bg: '#d1fae5' },
  { id: 'clinical_photos', label: 'Clinical Photos (Progression)', color: '#d97706', bg: '#fef3c7' },
  { id: 'consent_forms', label: 'Consent Forms & IDs', color: '#dc2626', bg: '#fee2e2' },
  { id: 'clinic_media', label: 'Clinic & Marketing Media', color: '#475569', bg: '#f1f5f9' },
];

/**
 * Detect URL service type (Google Drive, Dropbox, YouTube, etc.)
 */
export function detectUrlType(urlStr: string): ClinicMediaItem['urlType'] {
  if (!urlStr) return 'web_link';
  const lower = urlStr.toLowerCase();
  if (lower.includes('drive.google.com') || lower.includes('docs.google.com')) return 'google_drive';
  if (lower.includes('dropbox.com')) return 'dropbox';
  if (lower.includes('onedrive') || lower.includes('1drv.ms') || lower.includes('sharepoint.com')) return 'onedrive';
  if (lower.includes('youtube.com') || lower.includes('youtu.be')) return 'youtube';
  if (lower.endsWith('.pdf') || lower.includes('/pdf/')) return 'pdf_link';
  return 'cloud_storage';
}

/**
 * Create a new folder in Firestore
 */
export async function createClinicFolder(folder: Omit<ClinicFolder, 'id' | 'createdAt'>): Promise<string> {
  if (!db) throw new Error('Database is not initialized');
  const payload: ClinicFolder = {
    ...folder,
    color: folder.color || '#258ec8',
    itemCount: 0,
    createdAt: new Date().toISOString()
  };
  const colRef = collection(db, 'clinic_media_folders');
  const docRef = await addDoc(colRef, payload);
  return docRef.id;
}

/**
 * Subscribe to all folders
 */
export function subscribeToClinicFolders(onUpdate: (folders: ClinicFolder[]) => void): () => void {
  if (!db) {
    onUpdate([]);
    return () => {};
  }
  const colRef = collection(db, 'clinic_media_folders');
  const q = query(colRef, orderBy('createdAt', 'desc'), limit(100));

  return onSnapshot(
    q,
    (snapshot) => {
      const list: ClinicFolder[] = [];
      snapshot.forEach(docSnap => {
        list.push({
          id: docSnap.id,
          ...docSnap.data() as any
        });
      });
      onUpdate(list);
    },
    (err) => {
      console.warn('[MediaManager] Folders subscription notice:', err);
    }
  );
}

/**
 * Delete a folder from Firestore
 */
export async function deleteClinicFolder(folderId: string): Promise<boolean> {
  if (!db || !folderId) return false;
  try {
    await deleteDoc(doc(db, 'clinic_media_folders', folderId));
    return true;
  } catch (err) {
    console.error('[MediaManager] Error deleting folder:', err);
    return false;
  }
}

/**
 * Add a new Media item (URL or file) to Firestore
 */
export async function addClinicMediaItem(item: Omit<ClinicMediaItem, 'id' | 'createdAt'>): Promise<string> {
  if (!db) throw new Error('Database is not initialized');

  const detectedType = item.type === 'url' ? detectUrlType(item.url) : undefined;
  const payload: ClinicMediaItem = {
    ...item,
    urlType: item.urlType || detectedType,
    createdAt: new Date().toISOString()
  };

  const colRef = collection(db, 'clinic_media_items');
  const docRef = await addDoc(colRef, payload);

  // If inside a folder, increment folder itemCount
  if (item.folderId) {
    try {
      const folderRef = doc(db, 'clinic_media_folders', item.folderId);
      // We don't fail if increment fails
      updateDoc(folderRef, {
        itemCount: (item as any).folderItemCount ? (item as any).folderItemCount + 1 : 1
      }).catch(() => {});
    } catch (_) {}
  }

  return docRef.id;
}

/**
 * Subscribe to all media items (optionally filtered by folderId)
 */
export function subscribeToClinicMediaItems(
  onUpdate: (items: ClinicMediaItem[]) => void,
  folderId?: string
): () => void {
  if (!db) {
    onUpdate([]);
    return () => {};
  }

  const colRef = collection(db, 'clinic_media_items');
  let q = query(colRef, orderBy('createdAt', 'desc'), limit(250));

  return onSnapshot(
    q,
    (snapshot) => {
      const list: ClinicMediaItem[] = [];
      snapshot.forEach(docSnap => {
        const data = docSnap.data() as ClinicMediaItem;
        if (!folderId || data.folderId === folderId) {
          list.push({
            id: docSnap.id,
            ...data
          });
        }
      });
      onUpdate(list);
    },
    (err) => {
      console.warn('[MediaManager] Media items subscription notice:', err);
    }
  );
}

/**
 * Fetch or listen to media items for a specific patient (by phone, id, or name)
 */
export function subscribeToPatientMedia(
  patientQuery: string,
  onUpdate: (items: ClinicMediaItem[], folders: ClinicFolder[]) => void
): () => void {
  if (!db || !patientQuery) {
    onUpdate([], []);
    return () => {};
  }

  const clean = patientQuery.trim().toLowerCase();

  // Listen to items
  const unsubItems = onSnapshot(collection(db, 'clinic_media_items'), (snap) => {
    const matchedItems: ClinicMediaItem[] = [];
    snap.forEach(d => {
      const item = { id: d.id, ...d.data() } as ClinicMediaItem;
      const pName = (item.patientName || '').toLowerCase();
      const pPhone = (item.patientPhone || '').replace(/\D/g, '');
      const pId = (item.patientId || '').toLowerCase();

      if (
        (clean.length >= 10 && pPhone.includes(clean.slice(-10))) ||
        (clean.length > 2 && pName.includes(clean)) ||
        (pId && pId === clean)
      ) {
        matchedItems.push(item);
      }
    });

    // Also fetch folders for this patient
    getDocs(collection(db, 'clinic_media_folders')).then(folderSnap => {
      const matchedFolders: ClinicFolder[] = [];
      folderSnap.forEach(fd => {
        const folder = { id: fd.id, ...fd.data() } as ClinicFolder;
        const fName = (folder.patientName || folder.name || '').toLowerCase();
        const fPhone = (folder.patientPhone || '').replace(/\D/g, '');
        const fId = (folder.patientId || '').toLowerCase();

        if (
          (clean.length >= 10 && fPhone.includes(clean.slice(-10))) ||
          (clean.length > 2 && fName.includes(clean)) ||
          (fId && fId === clean)
        ) {
          matchedFolders.push(folder);
        }
      });
      onUpdate(matchedItems, matchedFolders);
    }).catch(() => {
      onUpdate(matchedItems, []);
    });
  });

  return () => unsubItems();
}

/**
 * Delete a media item
 */
export async function deleteClinicMediaItem(itemId: string): Promise<boolean> {
  if (!db || !itemId) return false;
  try {
    await deleteDoc(doc(db, 'clinic_media_items', itemId));
    return true;
  } catch (err) {
    console.error('[MediaManager] Error deleting item:', err);
    return false;
  }
}
