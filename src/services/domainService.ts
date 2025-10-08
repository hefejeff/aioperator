import { Domain } from '../types/domain';
import type firebase from 'firebase/compat/app';
import { db } from './firebaseInit';
import { collection, doc, getDocs, getDoc, addDoc, updateDoc, deleteDoc, runTransaction } from 'firebase/firestore';

export async function listDomains(): Promise<Domain[]> {
  const snapshot = await getDocs(collection(db, 'domains'));
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  } as Domain));
}

export async function getDomain(id: string): Promise<Domain | null> {
  const docRef = doc(db, 'domains', id);
  const docSnap = await getDoc(docRef);
  if (!docSnap.exists()) return null;
  return {
    id: docSnap.id,
    ...docSnap.data()
  } as Domain;
}

export async function createDomain(
  _adminUid: string,
  data: Omit<Domain, 'id' | 'createdAt' | 'updatedAt' | 'workflowCount' | 'activeUsers' | 'lastWorkflowCreated' | 'monthlyUsage'>
): Promise<Domain | null> {
  const now = Date.now();
  const domainData = {
    ...data,
    createdAt: now,
    updatedAt: now,
    workflowCount: 0,
    activeUsers: 0,
    lastWorkflowCreated: null,
    monthlyUsage: {
      workflows: 0,
      apiCalls: 0
    }
  };

  try {
    const docRef = await addDoc(collection(db, 'domains'), domainData);
    return {
      id: docRef.id,
      ...domainData
    };
  } catch (error) {
    console.error('Error creating domain:', error);
    return null;
  }
}

export async function updateDomain(
  _adminUid: string,
  domainId: string,
  updates: Partial<Domain>
): Promise<boolean> {
  try {
    const updateData = {
      ...updates,
      updatedAt: Date.now()
    };
    
    const docRef = doc(db, 'domains', domainId);
    await updateDoc(docRef, updateData);
    return true;
  } catch (error) {
    console.error('Error updating domain:', error);
    return false;
  }
}

export async function deleteDomain(_adminUid: string, domainId: string): Promise<boolean> {
  try {
    const docRef = doc(db, 'domains', domainId);
    await deleteDoc(docRef);
    return true;
  } catch (error) {
    console.error('Error deleting domain:', error);
    return false;
  }
}

export async function incrementDomainStats(
  domainId: string,
  stats: {
    workflows?: number;
    apiCalls?: number;
    activeUsers?: number;
  }
): Promise<void> {
  const docRef = doc(db, 'domains', domainId);
  
  await runTransaction(db, async (transaction) => {
    const docSnap = await transaction.get(docRef);
    if (!docSnap.exists()) return;

    const data = docSnap.data();
    const updates: Record<string, unknown> = {
      updatedAt: Date.now()
    };

    if (stats.workflows) {
      updates.workflowCount = (data.workflowCount || 0) + stats.workflows;
      updates['monthlyUsage.workflows'] = (data.monthlyUsage?.workflows || 0) + stats.workflows;
      updates.lastWorkflowCreated = Date.now();
    }

    if (stats.apiCalls) {
      updates['monthlyUsage.apiCalls'] = (data.monthlyUsage?.apiCalls || 0) + stats.apiCalls;
    }

    if (stats.activeUsers) {
      updates.activeUsers = (data.activeUsers || 0) + stats.activeUsers;
    }

    transaction.update(docRef, updates);
  });
}