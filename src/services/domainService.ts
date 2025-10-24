import { ref, get, push, set, update, remove, runTransaction } from 'firebase/database';
import { db } from './firebaseInit';
import type { Domain } from '../types/domain';

const domainsRef = () => ref(db, 'domains');

export async function listDomains(): Promise<Domain[]> {
  const snapshot = await get(domainsRef());
  if (!snapshot.exists()) {
    return [];
  }

  const data = snapshot.val();
  return Object.entries<any>(data).map(([id, value]) => ({
    id,
    ...(value as Omit<Domain, 'id'>)
  }));
}

export async function getDomain(id: string): Promise<Domain | null> {
  const snapshot = await get(ref(db, `domains/${id}`));
  if (!snapshot.exists()) {
    return null;
  }

  return {
    id,
    ...(snapshot.val() as Omit<Domain, 'id'>)
  };
}

export async function createDomain(
  _adminUid: string,
  data: Omit<Domain, 'id' | 'createdAt' | 'updatedAt' | 'workflowCount' | 'activeUsers' | 'lastWorkflowCreated' | 'monthlyUsage'>
): Promise<Domain | null> {
  try {
    const now = Date.now();
    const newRef = push(domainsRef());
    if (!newRef.key) {
      throw new Error('Failed to allocate domain key');
    }

    const domainData: Domain = {
      id: newRef.key,
      name: data.name,
      settings: data.settings || { allowedEmails: [] },
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

    await set(newRef, {
      name: domainData.name,
      settings: domainData.settings,
      createdAt: domainData.createdAt,
      updatedAt: domainData.updatedAt,
      workflowCount: domainData.workflowCount,
      activeUsers: domainData.activeUsers,
      lastWorkflowCreated: domainData.lastWorkflowCreated,
      monthlyUsage: domainData.monthlyUsage
    });

    return domainData;
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
    const updateData: Partial<Domain> = {
      ...updates,
      updatedAt: Date.now()
    };

    // Prevent updating immutable fields
    delete updateData.id;

    await update(ref(db, `domains/${domainId}`), updateData as any);
    return true;
  } catch (error) {
    console.error('Error updating domain:', error);
    return false;
  }
}

export async function deleteDomain(_adminUid: string, domainId: string): Promise<boolean> {
  try {
    await remove(ref(db, `domains/${domainId}`));
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
  const domainRef = ref(db, `domains/${domainId}`);

  await runTransaction(domainRef, (currentData) => {
    if (!currentData) {
      return currentData;
    }

    const nextData = {
      ...currentData,
      updatedAt: Date.now(),
      workflowCount: currentData.workflowCount || 0,
      activeUsers: currentData.activeUsers || 0,
      monthlyUsage: {
        workflows: currentData.monthlyUsage?.workflows || 0,
        apiCalls: currentData.monthlyUsage?.apiCalls || 0
      }
    } as Domain;

    if (stats.workflows) {
      nextData.workflowCount += stats.workflows;
      nextData.monthlyUsage.workflows += stats.workflows;
      nextData.lastWorkflowCreated = Date.now();
    }

    if (stats.apiCalls) {
      nextData.monthlyUsage.apiCalls += stats.apiCalls;
    }

    if (stats.activeUsers) {
      nextData.activeUsers += stats.activeUsers;
    }

    return nextData;
  });
}