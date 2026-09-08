import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc,
  addDoc, 
  updateDoc, 
  deleteDoc, 
  onSnapshot, 
  query, 
  where, 
  serverTimestamp,
  QueryConstraint
} from 'firebase/firestore';
import { db } from './config';
import { SPH_OFFICIAL_BRANCHES, Branch } from '../types';
/**
 * Generic Firestore Helper Functions
 */

export async function ensureOfficialBranchesInFirestore() {
  if (!db) return;
  try {
    for (const key of Object.keys(SPH_OFFICIAL_BRANCHES)) {
      const branch = SPH_OFFICIAL_BRANCHES[key];
      const docRef = doc(db, 'branches', branch.id);
      await setDoc(docRef, {
        ...branch,
        updatedAt: serverTimestamp()
      }, { merge: true });
    }
  } catch (err) {
    console.warn("Firestore Branch Sync Note:", err);
  }
}

export async function createDocument<T>(collectionName: string, data: Omit<T, 'id'>) {
  if (!db) throw new Error("Firebase DB not initialized. Call initFirebase() first.");
  const colRef = collection(db, collectionName);
  const docRef = await addDoc(colRef, {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
  return docRef.id;
}

export async function getDocumentById<T>(collectionName: string, id: string): Promise<T | null> {
  if (!db) throw new Error("Firebase DB not initialized. Call initFirebase() first.");
  const docRef = doc(db, collectionName, id);
  const snapshot = await getDoc(docRef);
  if (snapshot.exists()) {
    return { id: snapshot.id, ...snapshot.data() } as T;
  }
  return null;
}

export async function fetchCollection<T>(collectionName: string, ...constraints: QueryConstraint[]): Promise<T[]> {
  if (!db) throw new Error("Firebase DB not initialized. Call initFirebase() first.");
  const colRef = collection(db, collectionName);
  const q = query(colRef, ...constraints);
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as T));
}

export function subscribeToCollection<T>(
  collectionName: string, 
  onUpdate: (data: T[]) => void,
  ...constraints: QueryConstraint[]
) {
  if (!db) throw new Error("Firebase DB not initialized. Call initFirebase() first.");
  const colRef = collection(db, collectionName);
  const q = query(colRef, ...constraints);
  
  return onSnapshot(q, (snapshot) => {
    const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as T));
    onUpdate(items);
  });
}

export async function updateDocument<T>(collectionName: string, id: string, data: Partial<T>) {
  if (!db) throw new Error("Firebase DB not initialized. Call initFirebase() first.");
  const docRef = doc(db, collectionName, id);
  await updateDoc(docRef, {
    ...data,
    updatedAt: serverTimestamp()
  });
}

export async function removeDocument(collectionName: string, id: string) {
  if (!db) throw new Error("Firebase DB not initialized. Call initFirebase() first.");
  const docRef = doc(db, collectionName, id);
  await deleteDoc(docRef);
}
