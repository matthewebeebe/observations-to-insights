import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { db } from './firebase';
import type { Project, Observation, Harm, Criterion, Strategy } from './types';

// Helper to convert Firestore timestamps to Dates
function convertTimestamp(timestamp: Timestamp | Date | undefined): Date {
  if (!timestamp) return new Date();
  if (timestamp instanceof Timestamp) {
    return timestamp.toDate();
  }
  return timestamp;
}

// ============ PROJECTS ============

export async function getProjects(userId: string): Promise<Project[]> {
  if (!db) throw new Error('Firestore not initialized');

  // Note: Using only where() to avoid needing a composite index
  // Sort client-side instead
  const q = query(
    collection(db, 'projects'),
    where('userId', '==', userId)
  );

  const snapshot = await getDocs(q);
  const projects = snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
    createdAt: convertTimestamp(doc.data().createdAt),
    updatedAt: convertTimestamp(doc.data().updatedAt),
  })) as Project[];

  // Sort by updatedAt descending client-side
  return projects.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
}

export async function getProject(projectId: string): Promise<Project | null> {
  if (!db) throw new Error('Firestore not initialized');

  const docRef = doc(db, 'projects', projectId);
  const docSnap = await getDoc(docRef);

  if (!docSnap.exists()) return null;

  return {
    id: docSnap.id,
    ...docSnap.data(),
    createdAt: convertTimestamp(docSnap.data().createdAt),
    updatedAt: convertTimestamp(docSnap.data().updatedAt),
  } as Project;
}

export async function createProject(userId: string, name: string): Promise<string> {
  if (!db) throw new Error('Firestore not initialized');

  const docRef = await addDoc(collection(db, 'projects'), {
    userId,
    name,
    tags: [],
    archived: false,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return docRef.id;
}

export async function updateProject(projectId: string, data: Partial<Project>): Promise<void> {
  if (!db) throw new Error('Firestore not initialized');

  const docRef = doc(db, 'projects', projectId);
  await updateDoc(docRef, {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteProject(projectId: string): Promise<void> {
  if (!db) throw new Error('Firestore not initialized');

  // Delete all related data first
  await deleteObservationsByProject(projectId);
  await deleteHarmsByProject(projectId);
  await deleteCriteriaByProject(projectId);
  await deleteStrategiesByProject(projectId);

  const docRef = doc(db, 'projects', projectId);
  await deleteDoc(docRef);
}

// ============ OBSERVATIONS ============

export async function getObservations(projectId: string): Promise<Observation[]> {
  if (!db) throw new Error('Firestore not initialized');

  const q = query(
    collection(db, 'observations'),
    where('projectId', '==', projectId)
  );

  const snapshot = await getDocs(q);
  const observations = snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
    createdAt: convertTimestamp(doc.data().createdAt),
  })) as Observation[];

  return observations.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
}

export async function createObservation(projectId: string, content: string): Promise<string> {
  if (!db) throw new Error('Firestore not initialized');

  const docRef = await addDoc(collection(db, 'observations'), {
    projectId,
    content,
    createdAt: serverTimestamp(),
  });

  // Update project timestamp
  await updateProject(projectId, {});

  return docRef.id;
}

export async function deleteObservation(observationId: string): Promise<void> {
  if (!db) throw new Error('Firestore not initialized');

  const docRef = doc(db, 'observations', observationId);
  await deleteDoc(docRef);
}

async function deleteObservationsByProject(projectId: string): Promise<void> {
  if (!db) return;

  const q = query(collection(db, 'observations'), where('projectId', '==', projectId));
  const snapshot = await getDocs(q);

  await Promise.all(snapshot.docs.map(doc => deleteDoc(doc.ref)));
}

// ============ HARMS ============

export async function getHarms(projectId: string): Promise<Harm[]> {
  if (!db) throw new Error('Firestore not initialized');

  const q = query(
    collection(db, 'harms'),
    where('projectId', '==', projectId)
  );

  const snapshot = await getDocs(q);
  const harms = snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
    createdAt: convertTimestamp(doc.data().createdAt),
  })) as Harm[];

  return harms.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
}

export async function createHarm(projectId: string, observationIds: string[], content: string): Promise<string> {
  if (!db) throw new Error('Firestore not initialized');

  const docRef = await addDoc(collection(db, 'harms'), {
    projectId,
    observationIds,
    content,
    createdAt: serverTimestamp(),
  });

  await updateProject(projectId, {});

  return docRef.id;
}

export async function deleteHarm(harmId: string): Promise<void> {
  if (!db) throw new Error('Firestore not initialized');

  const docRef = doc(db, 'harms', harmId);
  await deleteDoc(docRef);
}

async function deleteHarmsByProject(projectId: string): Promise<void> {
  if (!db) return;

  const q = query(collection(db, 'harms'), where('projectId', '==', projectId));
  const snapshot = await getDocs(q);

  await Promise.all(snapshot.docs.map(doc => deleteDoc(doc.ref)));
}

// ============ CRITERIA ============

export async function getCriteria(projectId: string): Promise<Criterion[]> {
  if (!db) throw new Error('Firestore not initialized');

  const q = query(
    collection(db, 'criteria'),
    where('projectId', '==', projectId)
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
  })) as Criterion[];
}

export async function createCriterion(projectId: string, harmId: string, content: string): Promise<string> {
  if (!db) throw new Error('Firestore not initialized');

  const docRef = await addDoc(collection(db, 'criteria'), {
    projectId,
    harmId,
    content,
  });

  await updateProject(projectId, {});

  return docRef.id;
}

export async function deleteCriterion(criterionId: string): Promise<void> {
  if (!db) throw new Error('Firestore not initialized');

  const docRef = doc(db, 'criteria', criterionId);
  await deleteDoc(docRef);
}

async function deleteCriteriaByProject(projectId: string): Promise<void> {
  if (!db) return;

  const q = query(collection(db, 'criteria'), where('projectId', '==', projectId));
  const snapshot = await getDocs(q);

  await Promise.all(snapshot.docs.map(doc => deleteDoc(doc.ref)));
}

// ============ STRATEGIES ============

export async function getStrategies(projectId: string): Promise<Strategy[]> {
  if (!db) throw new Error('Firestore not initialized');

  const q = query(
    collection(db, 'strategies'),
    where('projectId', '==', projectId)
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
  })) as Strategy[];
}

export async function createStrategy(
  projectId: string,
  criterionId: string,
  content: string,
  strategyType?: 'confront' | 'avoid' | 'minimize'
): Promise<string> {
  if (!db) throw new Error('Firestore not initialized');

  const data: Record<string, unknown> = {
    projectId,
    criterionId,
    content,
  };

  // Only add strategyType if it's defined (Firestore doesn't allow undefined values)
  if (strategyType) {
    data.strategyType = strategyType;
  }

  const docRef = await addDoc(collection(db, 'strategies'), data);

  await updateProject(projectId, {});

  return docRef.id;
}

export async function deleteStrategy(strategyId: string): Promise<void> {
  if (!db) throw new Error('Firestore not initialized');

  const docRef = doc(db, 'strategies', strategyId);
  await deleteDoc(docRef);
}

async function deleteStrategiesByProject(projectId: string): Promise<void> {
  if (!db) return;

  const q = query(collection(db, 'strategies'), where('projectId', '==', projectId));
  const snapshot = await getDocs(q);

  await Promise.all(snapshot.docs.map(doc => deleteDoc(doc.ref)));
}
