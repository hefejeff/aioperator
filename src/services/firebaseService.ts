import { db } from './firebaseInit';
import type firebase from 'firebase/compat/app';
import type { EvaluationResult, Scenario, StoredEvaluationResult, AggregatedEvaluationResult, LeaderboardEntry, UserProfile, Role, Platform, SavedPrd, SavedPitch, WorkflowVersion } from '../types';
import { ALL_SCENARIOS } from '../constants';
import { ref, get, push, set, update, remove, query, orderByChild, equalTo } from 'firebase/database';

// For performance at scale, you should add indexes to your database rules file (e.g., database.rules.json):
// { "rules": { "evaluations": { "$uid": { ".indexOn": "scenarioId" } } } }

// Function to store or update user profile information
export const updateUserProfile = async (user: firebase.User): Promise<void> => {
  try {
    const userRef = ref(db, `users/${user.uid}`);
    // Use update to avoid overwriting other potential user-related data
    // Fetch existing profile to preserve preferences like preferredLanguage
    const snapshot = await get(userRef);
    const existing = snapshot.exists() ? snapshot.val() : {};
    // Build an updates object only with defined values to avoid Firebase errors
    const updates: Record<string, any> = {};
    updates.displayName = user.displayName ?? existing.displayName;
    updates.email = user.email ?? existing.email;
    // Only include photoURL if it's defined (even null is acceptable if user intends to clear it)
    if (typeof user.photoURL !== 'undefined') {
      updates.photoURL = user.photoURL ?? existing.photoURL ?? null;
    }
    updates.preferredLanguage = existing.preferredLanguage ?? 'English';

    await update(userRef, updates);
  } catch (error) {
    console.error("Error updating user profile:", error);
    // Non-critical, so we don't throw
  }
};

export const getUserProfile = async (uid: string): Promise<import('../types').UserProfile | null> => {
  try {
    const userRef = ref(db, `users/${uid}`);
    const snapshot = await get(userRef);
    if (!snapshot.exists()) return null;
    return { uid, ...(snapshot.val() as Omit<UserProfile, 'uid'>) } as UserProfile;
  } catch (error) {
    console.error('Failed to fetch user profile:', error);
    return null;
  }
};

export const setUserPreferences = async (uid: string, prefs: { displayName?: string | null; photoURL?: string | null; preferredLanguage?: 'English' | 'Spanish' | null; }) => {
  try {
    const userRef = ref(db, `users/${uid}`);
    await update(userRef, prefs);
    return true;
  } catch (error) {
    console.error('Failed to save user preferences:', error);
    return false;
  }
};

// Function to seed the database with initial scenarios if they don't exist
export const seedScenarios = async (): Promise<void> => {
    try {
        const scenariosRef = ref(db, 'scenarios');
        const snapshot = await get(scenariosRef);
        if (!snapshot.exists()) {
            console.log('No scenarios found. Seeding database...');
            const updates: { [key: string]: Scenario } = {};
            ALL_SCENARIOS.forEach(scenario => {
                updates[scenario.id] = scenario;
            });
            await set(scenariosRef, updates);
            console.log('Database seeded successfully.');
        }
    } catch (error) {
        console.error("Error seeding scenarios:", error);
        throw error;
    }
};

// Function to fetch all scenarios, including user-created ones
export const getScenarios = async (userId?: string): Promise<Scenario[]> => {
    try {
        const scenariosRef = ref(db, 'scenarios');
        const snapshot = await get(scenariosRef);
        let scenarios: Scenario[] = [];
        if (snapshot.exists()) {
            const data = snapshot.val();
            if (data && typeof data === 'object') {
                scenarios = Object.values(data);
            }
        }

        // Fetch user-specific scenarios if a userId is provided
        if (userId) {
            const userScenariosRef = ref(db, `userScenarios/${userId}`);
            const userSnapshot = await get(userScenariosRef);
            if (userSnapshot.exists()) {
                const userData = userSnapshot.val();
                scenarios.push(...Object.values(userData) as Scenario[]);
            }
        }
        return scenarios;
    } catch (error) {
        console.error("Error fetching scenarios:", error);
        throw error;
    }
};

// Function to save a new user-created scenario
export const saveUserScenario = async (userId: string, scenarioData: Omit<Scenario, 'id' | 'type' | 'userId'>): Promise<Scenario> => {
    try {
        const userScenariosRef = ref(db, `userScenarios/${userId}`);
        const newScenarioRef = push(userScenariosRef);
        const newScenario: Scenario = {
            ...scenarioData,
            id: newScenarioRef.key!,
            type: 'TRAINING', // All user-created scenarios are for training
            userId: userId,
        };
        await set(newScenarioRef, newScenario);
        return newScenario;
    } catch (error) {
        console.error("Error saving user scenario:", error);
        throw error;
    }
};

// Update an existing scenario (either seeded scenarios or user-created ones)
export const updateScenario = async (scenario: Scenario): Promise<void> => {
  try {
    if (scenario.userId) {
      const scenarioRef = ref(db, `userScenarios/${scenario.userId}/${scenario.id}`);
      await update(scenarioRef, scenario as any);
    } else {
      // Seeded scenario (no userId): do not update the global seeded copy.
      // Callers should use createUserScenarioOverride(userId, scenarioId, data) instead.
      throw new Error(
        `Refusing to update seeded scenario ${scenario.id}. ` +
        `Use createUserScenarioOverride(userId, scenarioId, data) to create a per-user override.`
      );
    }
  } catch (error) {
    console.error(`Failed to update scenario ${scenario.id}:`, error);
    throw error;
  }
};

// Create a per-user override copy of a seeded scenario. This stores the scenario under
// `userScenarios/{userId}/{scenarioId}` and sets userId so the UI treats it as custom.
export const createUserScenarioOverride = async (userId: string, scenarioId: string, data: Partial<Scenario>): Promise<void> => {
  try {
    const scenarioRef = ref(db, `userScenarios/${userId}/${scenarioId}`);
    // Ensure the override includes id and userId so it behaves like a user-created scenario
    // Build payload but remove any keys with undefined values to satisfy Realtime DB set constraints
    const rawPayload = { id: scenarioId, userId, ...data } as Record<string, any>;
    const payload = Object.fromEntries(Object.entries(rawPayload).filter(([_, v]) => typeof v !== 'undefined')) as any;
    await set(scenarioRef, payload);
  } catch (error) {
    console.error(`Failed to create user scenario override for ${scenarioId}:`, error);
    throw error;
  }
};

export const deleteUserScenario = async (userId: string, scenarioId: string): Promise<void> => {
  try {
    const scenarioRef = ref(db, `userScenarios/${userId}/${scenarioId}`);
    await remove(scenarioRef);
  } catch (error) {
    console.error(`Failed to delete scenario ${scenarioId} for user ${userId}:`, error);
    throw error;
  }
};

// Toggle favorite for a scenario (works for seeded and user scenarios via override path for user scenarios)
export const toggleFavoriteScenario = async (userId: string, scenario: Scenario): Promise<boolean> => {
  try {
    const path = scenario.userId ? `userScenarios/${scenario.userId}/${scenario.id}` : `scenarios/${scenario.id}`;
    const favoriteRef = ref(db, path + `/favoritedBy/${userId}`);
    const snap = await get(favoriteRef);
    if (snap.exists()) {
      await remove(favoriteRef);
      return false; // now unfavorited
    } else {
      await set(favoriteRef, true);
      return true; // now favorited
    }
  } catch (e) {
    console.error('Failed to toggle favorite scenario', e);
    throw e;
  }
};

// Fetch favorites for user (returns scenario IDs)
export const getUserFavoriteScenarioIds = async (userId: string): Promise<Set<string>> => {
  try {
    // Need to scan both seeded and user scenarios; for efficiency at scale you'd index a reverse mapping.
    const all = await getScenarios(userId);
    const favs = new Set<string>();
    all.forEach(s => { if (s.favoritedBy && s.favoritedBy[userId]) favs.add(s.id); });
    return favs;
  } catch (e) {
    console.error('Failed to load favorite scenario ids', e);
    return new Set();
  }
};

export const saveEvaluation = async (
  userId: string,
  scenarioId: string,
  evaluation: EvaluationResult,
  workflowExplanation: string,
  imageUrl: string | null,
  displayName: string | null
): Promise<void> => {
  const evaluationData: Omit<StoredEvaluationResult, 'id'> = {
      ...evaluation,
      userId,
      scenarioId,
      workflowExplanation,
      imageUrl,
      timestamp: Date.now(),
  };

  try {
    const userEvaluationsRef = ref(db, `evaluations/${userId}`);
    const newEvaluationRef = push(userEvaluationsRef);
    await set(newEvaluationRef, evaluationData);
    
    // After successful save, update leaderboard if it's a new high score
    if (displayName) { // Only update if display name is available
      const leaderboardRef = ref(db, `leaderboards/${scenarioId}/${userId}`);
      const snapshot = await get(leaderboardRef);
      const currentBestScore = snapshot.exists() ? snapshot.val().score : 0;

      if (evaluation.score > currentBestScore) {
          await set(leaderboardRef, {
            score: evaluation.score,
            displayName: displayName,
            uid: userId,
          });
          // Notify UI that the global leaderboard may have changed so other components can refresh.
          try {
            if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
              window.dispatchEvent(new CustomEvent('leaderboard-updated'));
            }
          } catch (e) {
            // Non-fatal if the environment doesn't support window events
            console.debug('Could not dispatch leaderboard-updated event', e);
          }
      }
    }
  } catch(error) {
    console.error("Failed to save evaluation to Firebase:", error);
    throw error; // Re-throw the error to be handled by the caller UI
  }
};

// Aggregate per-user averages across all scenarios and return the top N operators.
export const getGlobalLeaderboard = async (topN = 5): Promise<LeaderboardEntry[]> => {
  try {
    const leaderboardsRef = ref(db, 'leaderboards');
    const snapshot = await get(leaderboardsRef);
    if (!snapshot.exists()) return [];

    const data = snapshot.val();
    // data shape: { [scenarioId]: { [uid]: { score, displayName, uid } } }
    const perUser: Record<string, { total: number; count: number; displayName?: string }> = {};

    for (const scenarioId in data) {
      const entriesForScenario = data[scenarioId];
      if (!entriesForScenario || typeof entriesForScenario !== 'object') continue;
      for (const uid in entriesForScenario) {
        const entry = entriesForScenario[uid] as LeaderboardEntry;
        if (!perUser[uid]) perUser[uid] = { total: 0, count: 0, displayName: entry.displayName };
        perUser[uid].total += entry.score || 0;
        perUser[uid].count += 1;
        if (!perUser[uid].displayName && entry.displayName) perUser[uid].displayName = entry.displayName;
      }
    }

    const aggregated: LeaderboardEntry[] = Object.entries(perUser).map(([uid, agg]) => ({
      uid,
      displayName: agg.displayName || 'Unknown',
      // use a one-decimal average to make comparisons meaningful
      score: Math.round((agg.total / Math.max(1, agg.count)) * 10) / 10,
    }));

    // Sort descending and return the top N
    return aggregated.sort((a, b) => b.score - a.score).slice(0, topN);
  } catch (error) {
    console.error('Failed to compute global leaderboard:', error);
    return [];
  }
};

// Admin: list all user profiles (requires permissive DB rules or admin backend)
export const listAllUsers = async (): Promise<UserProfile[]> => {
  try {
    const usersRef = ref(db, 'users');
    const snapshot = await get(usersRef);
    if (!snapshot.exists()) return [];
    const data = snapshot.val();
    return Object.entries<any>(data).map(([uid, profile]) => ({ uid, ...(profile as Omit<UserProfile, 'uid'>) }));
  } catch (error) {
    console.error('Failed to list users:', error);
    return [];
  }
};

// Admin: set a user's role; authorizerUid can be used for server-side checks if you add Cloud Functions later
export const setUserRole = async (_authorizerUid: string, targetUid: string, newRole: Role): Promise<boolean> => {
  try {
    // Client-side gating is best-effort; enforce with DB rules or Cloud Functions in production
    const userRoleRef = ref(db, `users/${targetUid}/role`);
    await set(userRoleRef, newRole);
    return true;
  } catch (error) {
    console.error('Failed to set user role:', error);
    return false;
  }
};

// Admin: delete a user and all their data; authorizerUid can be used for server-side checks if you add Cloud Functions later
export const deleteUser = async (_authorizerUid: string, targetUid: string): Promise<boolean> => {
  try {
    // Delete user data from multiple locations
    const updates: Record<string, null> = {};
    
    // Remove user profile
    updates[`users/${targetUid}`] = null;
    
    // Remove user's scenarios
    updates[`scenarios/${targetUid}`] = null;
    
    // Remove user's workflow versions  
    updates[`workflowVersions/${targetUid}`] = null;
    
    // Remove user's evaluations
    updates[`evaluations/${targetUid}`] = null;
    
    // Apply all deletions atomically
    const dbRoot = ref(db);
    await update(dbRoot, updates);
    
    console.log(`Successfully deleted user ${targetUid} and all associated data`);
    return true;
  } catch (error) {
    console.error('Failed to delete user:', error);
    return false;
  }
};

export const getEvaluations = async (userId: string, scenarioId: string): Promise<StoredEvaluationResult[]> => {
  try {
    const userEvaluationsRef = ref(db, `evaluations/${userId}`);
    const evaluationsQuery = query(userEvaluationsRef, orderByChild('scenarioId'), equalTo(scenarioId));
    const snapshot = await get(evaluationsQuery);
    if (snapshot.exists()) {
      const data = snapshot.val();
      // Convert object to array and reverse to show newest first
      return Object.entries(data).map(([id, value]) => ({ id, ...(value as Omit<StoredEvaluationResult, 'id'>) })).sort((a,b) => b.timestamp - a.timestamp);
    }
    return [];
  } catch(error) {
    console.error(`Firebase fetch failed for scenario ${scenarioId}:`, error);
    throw error; // Re-throw to be handled by the UI
  }
};

export const getAllUserEvaluations = async (userId: string): Promise<AggregatedEvaluationResult[]> => {
  try {
    const userEvaluationsRef = ref(db, `evaluations/${userId}`);
    const snapshot = await get(userEvaluationsRef);

    if (!snapshot.exists()) {
      return [];
    }

    const allEvaluations: AggregatedEvaluationResult[] = [];
    const data = snapshot.val(); // This will be an object of { pushId: evaluation, ... }
    
    // Fetch all scenarios to build a map, including user-specific ones
    const allDbScenarios = await getScenarios(userId);
    const scenarioMap = new Map(allDbScenarios.map(s => [s.id, s.title]));
    // Also include default scenarios in the map as a fallback
    ALL_SCENARIOS.forEach(s => {
        if (!scenarioMap.has(s.id)) {
            scenarioMap.set(s.id, s.title);
        }
    });

    for (const pushId in data) {
      const evaluation = data[pushId] as Omit<StoredEvaluationResult, 'id'>;
      const scenarioTitle = scenarioMap.get(evaluation.scenarioId) || 'Unknown Scenario';
      allEvaluations.push({
        id: pushId,
        ...evaluation,
        scenarioTitle,
      });
    }
    
    // Sort by timestamp, newest first
    allEvaluations.sort((a, b) => b.timestamp - a.timestamp);

    return allEvaluations;
  } catch (error) {
    console.error("Firebase fetch failed for all user evaluations:", error);
    throw error; // Re-throw to be handled by the UI
  }
};

export const getLeaderboardForScenario = async (scenarioId: string): Promise<LeaderboardEntry[]> => {
  try {
    const leaderboardRef = ref(db, `leaderboards/${scenarioId}`);
    // Order by score (ascending) and take the last 5 for the top scores.
    const leaderboardQuery = query(leaderboardRef, orderByChild('score'));
    const snapshot = await get(leaderboardQuery);
    if (snapshot.exists()) {
      const data = snapshot.val();
      const entries: LeaderboardEntry[] = Object.values(data);
      // Sort descending and take top 5
      return entries.sort((a, b) => b.score - a.score).slice(0, 5);
    }
    return [];
  } catch (error) {
    console.error(`Firebase error fetching leaderboard for scenario ${scenarioId}:`, error);
    // Don't throw, just return empty so UI doesn't break on offline mode.
    return [];
  }
};

// Save a generated PRD for later retrieval
export const savePrd = async (
  userId: string,
  scenarioId: string,
  platform: Platform,
  markdown: string,
  scenarioTitle?: string
): Promise<string> => {
  try {
    console.log('Attempting to save PRD:', { userId, scenarioId, platform, scenarioTitle });
    const prdsRef = ref(db, `prds/${userId}`);
    const newPrdRef = push(prdsRef);
    const payload = {
      userId,
      scenarioId,
      scenarioTitle: scenarioTitle ?? null,
      platform,
      markdown,
      timestamp: Date.now(),
    };
    console.log('PRD payload:', payload);
    await set(newPrdRef, payload);
    console.log('PRD saved successfully with key:', newPrdRef.key);
    return newPrdRef.key as string;
  } catch (error) {
    console.error('Failed to save PRD:', error);
    throw error;
  }
};

// Save a generated Elevator Pitch for later retrieval
export const savePitch = async (
  userId: string,
  scenarioId: string,
  markdown: string,
  scenarioTitle?: string
): Promise<string> => {
  try {
    console.log('Attempting to save Pitch:', { userId, scenarioId, scenarioTitle });
    const pitchesRef = ref(db, `pitches/${userId}`);
    const newPitchRef = push(pitchesRef);
    const payload = {
      userId,
      scenarioId,
      scenarioTitle: scenarioTitle ?? null,
      markdown,
      timestamp: Date.now(),
    };
    console.log('Pitch payload:', payload);
    await set(newPitchRef, payload);
    console.log('Pitch saved successfully with key:', newPitchRef.key);
    return newPitchRef.key as string;
  } catch (error) {
    console.error('Failed to save Elevator Pitch:', error);
    throw error;
  }
};

// Save a raw workflow explanation version for a scenario (version history separate from evaluations)
export const saveWorkflowVersion = async (
  userId: string,
  scenarioId: string,
  workflowExplanation: string,
  sourceEvaluationId?: string | null,
  options?: {
    prdMarkdown?: string | null;
    pitchMarkdown?: string | null;
    evaluationScore?: number | null;
    evaluationFeedback?: string | null;
    versionTitle?: string | null;
    mermaidCode?: string | null;
    mermaidSvg?: string | null;
    imageBase64?: string | null;
    imageMimeType?: string | null;
  }
): Promise<string> => {
  try {
    console.log('Attempting to save Workflow Version:', { userId, scenarioId, versionTitle: options?.versionTitle });
    const workflowsRef = ref(db, `workflowVersions/${userId}/${scenarioId}`);
    const newWorkflowRef = push(workflowsRef);
    const payload = {
      userId,
      scenarioId,
      workflowExplanation,
      sourceEvaluationId: sourceEvaluationId || null,
      prdMarkdown: options?.prdMarkdown ?? null,
      pitchMarkdown: options?.pitchMarkdown ?? null,
      evaluationScore: options?.evaluationScore ?? null,
      evaluationFeedback: options?.evaluationFeedback ?? null,
      versionTitle: options?.versionTitle ?? null,
      mermaidCode: options?.mermaidCode ?? null,
      mermaidSvg: options?.mermaidSvg ?? null,
      imageBase64: options?.imageBase64 ?? null,
      imageMimeType: options?.imageMimeType ?? null,
      timestamp: Date.now(),
    };
    console.log('Workflow Version payload:', payload);
    await set(newWorkflowRef, payload);
    console.log('Workflow Version saved successfully with key:', newWorkflowRef.key);
    return newWorkflowRef.key as string;
  } catch (error) {
    console.error('Failed to save workflow version:', error);
    throw error;
  }
};

// Get saved PRDs for a user
export const getSavedPrds = async (userId: string): Promise<SavedPrd[]> => {
  try {
    const prdsRef = ref(db, `prds/${userId}`);
    const snap = await get(prdsRef);
    if (!snap.exists()) return [];
    const data = snap.val();
    return Object.entries<any>(data)
      .map(([id, v]) => ({ id, ...(v as Omit<SavedPrd, 'id'>) }))
      .sort((a, b) => b.timestamp - a.timestamp);
  } catch (error) {
    console.error('Failed to load saved PRDs:', error);
    return [];
  }
};

// Get saved Elevator Pitches for a user
export const getSavedPitches = async (userId: string): Promise<SavedPitch[]> => {
  try {
    const pitchesRef = ref(db, `pitches/${userId}`);
    const snap = await get(pitchesRef);
    if (!snap.exists()) return [];
    const data = snap.val();
    return Object.entries<any>(data)
      .map(([id, v]) => ({ id, ...(v as Omit<SavedPitch, 'id'>) }))
      .sort((a, b) => b.timestamp - a.timestamp);
  } catch (error) {
    console.error('Failed to load saved Elevator Pitches:', error);
    return [];
  }
};

// Get latest PRD for a user + scenario
export const getLatestPrdForScenario = async (userId: string, scenarioId: string): Promise<SavedPrd | null> => {
  try {
    const prdsRef = ref(db, `prds/${userId}`);
    // Query by scenarioId (client-side filter since RTDB per-path index not yet defined)
    const snap = await get(prdsRef);
    if (!snap.exists()) return null;
    const data = snap.val();
    const matches: (SavedPrd & { id: string })[] = [];
    for (const key in data) {
      const item = data[key];
      if (item.scenarioId === scenarioId) {
        matches.push({ id: key, ...(item as Omit<SavedPrd, 'id'>) });
      }
    }
    if (!matches.length) return null;
    matches.sort((a,b) => b.timestamp - a.timestamp);
    return matches[0];
  } catch (e) {
    console.error('Failed to get latest PRD for scenario', e);
    return null;
  }
};

// Get latest Pitch for a user + scenario
export const getLatestPitchForScenario = async (userId: string, scenarioId: string): Promise<SavedPitch | null> => {
  try {
    const pitchesRef = ref(db, `pitches/${userId}`);
    const snap = await get(pitchesRef);
    if (!snap.exists()) return null;
    const data = snap.val();
    const matches: (SavedPitch & { id: string })[] = [];
    for (const key in data) {
      const item = data[key];
      if (item.scenarioId === scenarioId) {
        matches.push({ id: key, ...(item as Omit<SavedPitch, 'id'>) });
      }
    }
    if (!matches.length) return null;
    matches.sort((a,b) => b.timestamp - a.timestamp);
    return matches[0];
  } catch (e) {
    console.error('Failed to get latest Pitch for scenario', e);
    return null;
  }
};

// Get workflow versions for a user & scenario
export const getWorkflowVersions = async (userId: string, scenarioId: string): Promise<WorkflowVersion[]> => {
  try {
    const workflowsRef = ref(db, `workflowVersions/${userId}/${scenarioId}`);
    const snap = await get(workflowsRef);
    if (!snap.exists()) return [];
    const data = snap.val();
    return Object.entries<any>(data)
      .map(([id, v]) => ({ id, ...(v as Omit<WorkflowVersion, 'id'>) }))
      .sort((a,b) => b.timestamp - a.timestamp);
  } catch (error) {
    console.error('Failed to load workflow versions:', error);
    return [];
  }
};

// Get all workflow versions for a user across all scenarios
export const getAllUserWorkflowVersions = async (userId: string): Promise<WorkflowVersion[]> => {
  try {
    const workflowsRef = ref(db, `workflowVersions/${userId}`);
    const snap = await get(workflowsRef);
    if (!snap.exists()) return [];
    const data = snap.val();
    const allVersions: WorkflowVersion[] = [];
    
    // Iterate through all scenarios for this user
    Object.entries<any>(data).forEach(([scenarioId, scenarioVersions]) => {
      Object.entries<any>(scenarioVersions).forEach(([versionId, version]) => {
        allVersions.push({ 
          id: versionId, 
          scenarioId, 
          ...(version as Omit<WorkflowVersion, 'id' | 'scenarioId'>) 
        });
      });
    });
    
    // Sort by timestamp, most recent first
    return allVersions.sort((a, b) => b.timestamp - a.timestamp);
  } catch (error) {
    console.error('Failed to load all user workflow versions:', error);
    return [];
  }
};

// Get a specific workflow version by ID
export const getWorkflowVersion = async (workflowId: string, userId?: string): Promise<WorkflowVersion | null> => {
  try {
    console.log('Looking for workflow ID:', workflowId, 'for user:', userId);
    
    if (userId) {
      // If userId is provided, search only in that user's data
      const ref = db.ref(`workflowVersions/${userId}`);
      const snap = await ref.get();
      if (!snap.exists()) {
        console.log('No workflowVersions data exists for user:', userId);
        return null;
      }
      
      const data = snap.val();
      console.log('User workflow data structure:', Object.keys(data));
      
      // Search through all scenarios for this user
      for (const scenarioId in data) {
        console.log(`Checking scenario ${scenarioId}, workflows:`, Object.keys(data[scenarioId]));
        if (data[scenarioId][workflowId]) {
          console.log('Found workflow!');
          return {
            id: workflowId,
            scenarioId,
            userId,
            ...data[scenarioId][workflowId]
          };
        }
      }
    } else {
      // Fallback to global search if no userId provided
      const ref = db.ref('workflowVersions');
      const snap = await ref.get();
      if (!snap.exists()) {
        console.log('No workflowVersions data exists');
        return null;
      }
      
      const data = snap.val();
      console.log('WorkflowVersions data structure:', Object.keys(data));
      
      // Search through all users and scenarios
      for (const userIdKey in data) {
        console.log(`Checking user ${userIdKey}, scenarios:`, Object.keys(data[userIdKey]));
        for (const scenarioId in data[userIdKey]) {
          console.log(`Checking scenario ${scenarioId}, workflows:`, Object.keys(data[userIdKey][scenarioId]));
          if (data[userIdKey][scenarioId][workflowId]) {
            console.log('Found workflow!');
            return {
              id: workflowId,
              scenarioId,
              userId: userIdKey,
              ...data[userIdKey][scenarioId][workflowId]
            };
          }
        }
      }
    }
    
    console.log('Workflow not found');
    return null;
  } catch (error) {
    console.error('Failed to load workflow version:', error);
    return null;
  }
};

// Get a specific scenario by ID
export const getScenarioById = async (scenarioId: string, userId?: string): Promise<Scenario | null> => {
  try {
    const scenarios = await getScenarios(userId);
    return scenarios.find(s => s.id === scenarioId) || null;
  } catch (error) {
    console.error('Failed to load scenario:', error);
    return null;
  }
};

// Update an existing workflow version
export const updateWorkflowVersion = async (
  workflowId: string,
  userId: string,
  scenarioId: string,
  updates: Partial<WorkflowVersion>
): Promise<void> => {
  try {
    console.log('Updating workflow version:', { workflowId, userId, scenarioId, updates });
    
    const ref = db.ref(`workflowVersions/${userId}/${scenarioId}/${workflowId}`);
    
    // Add lastModified timestamp to updates
    const updateData = {
      ...updates,
      lastModified: Date.now()
    };
    
    await ref.update(updateData);
    console.log('Workflow version updated successfully');
  } catch (error) {
    console.error('Failed to update workflow version:', error);
    throw error;
  }
};

// Team collaboration functions
import type { TeamMember, TeamRole, WorkflowTeam, PendingInvitation } from '../types';

// Get team information for a workflow
export const getWorkflowTeam = async (workflowId: string, userId: string, scenarioId: string): Promise<WorkflowTeam | null> => {
  try {
    const ref = db.ref(`workflowVersions/${userId}/${scenarioId}/${workflowId}/team`);
    const snapshot = await ref.get();
    
    if (!snapshot.exists()) {
      return null;
    }
    
    return snapshot.val() as WorkflowTeam;
  } catch (error) {
    console.error('Failed to get workflow team:', error);
    return null;
  }
};

// Add a team member to a workflow
export const addTeamMember = async (
  workflowId: string,
  workflowOwnerId: string,
  scenarioId: string,
  memberEmail: string,
  role: TeamRole,
  addedBy: string
): Promise<void> => {
  try {
    // Get user profile by email to get userId and displayName
    const usersRef = db.ref('users');
    const userQuery = await usersRef.orderByChild('email').equalTo(memberEmail).get();
    
    if (!userQuery.exists()) {
      throw new Error('User not found with this email address');
    }
    
    const userData = userQuery.val();
    const memberUserId = Object.keys(userData)[0];
    const memberProfile = userData[memberUserId];
    
    const teamMember: TeamMember = {
      userId: memberUserId,
      email: memberEmail,
      displayName: memberProfile.displayName || null,
      role,
      addedAt: Date.now(),
      addedBy
    };
    
    // Add member to team
    const teamRef = db.ref(`workflowVersions/${workflowOwnerId}/${scenarioId}/${workflowId}/team/members/${memberUserId}`);
    await teamRef.set(teamMember);
    
    // Also update workflowId in the team structure
    const workflowIdRef = db.ref(`workflowVersions/${workflowOwnerId}/${scenarioId}/${workflowId}/team/workflowId`);
    await workflowIdRef.set(workflowId);
    
  } catch (error) {
    console.error('Failed to add team member:', error);
    throw error;
  }
};

// Remove a team member from a workflow
export const removeTeamMember = async (
  workflowId: string,
  workflowOwnerId: string,
  scenarioId: string,
  memberUserId: string
): Promise<void> => {
  try {
    const teamMemberRef = db.ref(`workflowVersions/${workflowOwnerId}/${scenarioId}/${workflowId}/team/members/${memberUserId}`);
    await teamMemberRef.remove();
  } catch (error) {
    console.error('Failed to remove team member:', error);
    throw error;
  }
};

// Update team member role
export const updateTeamMemberRole = async (
  workflowId: string,
  workflowOwnerId: string,
  scenarioId: string,
  memberUserId: string,
  newRole: TeamRole
): Promise<void> => {
  try {
    const roleRef = db.ref(`workflowVersions/${workflowOwnerId}/${scenarioId}/${workflowId}/team/members/${memberUserId}/role`);
    await roleRef.set(newRole);
  } catch (error) {
    console.error('Failed to update team member role:', error);
    throw error;
  }
};

// Create invitation token and store pending invitation
export const createInvitation = async (
  workflowId: string,
  workflowOwnerId: string,
  scenarioId: string,
  email: string,
  role: TeamRole,
  invitedBy: string
): Promise<string> => {
  try {
    // Generate unique invitation token
    const token = `invite_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const invitation: PendingInvitation = {
      email,
      role,
      invitedBy,
      invitedAt: Date.now(),
      token
    };
    
    // Store invitation
    const invitationRef = db.ref(`workflowVersions/${workflowOwnerId}/${scenarioId}/${workflowId}/team/invitations/${email.replace(/\./g, '_')}`);
    await invitationRef.set(invitation);
    
    return token;
  } catch (error) {
    console.error('Failed to create invitation:', error);
    throw error;
  }
};

// Get all workflows that a user has access to (as owner or team member)
export const getUserAccessibleWorkflows = async (userId: string): Promise<WorkflowVersion[]> => {
  try {
    const workflows: WorkflowVersion[] = [];
    
    // Get workflows owned by user
    const ownedWorkflows = await getAllUserWorkflowVersions(userId);
    workflows.push(...ownedWorkflows);
    
    // Get workflows where user is a team member
    // This requires querying all workflow versions and checking team membership
    // For now, we'll implement a simplified version that can be optimized later
    
    return workflows;
  } catch (error) {
    console.error('Failed to get user accessible workflows:', error);
    return [];
  }
};

// Get all users for collaboration dropdown
export const getAllUsers = async (): Promise<UserProfile[]> => {
  try {
    const usersRef = db.ref('users');
    const snapshot = await usersRef.get();
    
    if (!snapshot.exists()) {
      return [];
    }
    
    const usersData = snapshot.val();
    const users: UserProfile[] = [];
    
    for (const uid in usersData) {
      const userData = usersData[uid];
      users.push({
        uid,
        displayName: userData.displayName || null,
        email: userData.email || null,
        photoURL: userData.photoURL || null,
        preferredLanguage: userData.preferredLanguage || null,
        role: userData.role || null
      });
    }
    
    return users.filter(user => user.email); // Only return users with email addresses
  } catch (error) {
    console.error('Failed to get all users:', error);
    return [];
  }
};