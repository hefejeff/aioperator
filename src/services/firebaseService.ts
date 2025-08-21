import { db } from '../firebaseConfig';
import type firebase from 'firebase/compat/app';
import type { EvaluationResult, Scenario, StoredEvaluationResult, AggregatedEvaluationResult, LeaderboardEntry, UserProfile, Role, Platform, SavedPrd, SavedPitch } from '../types';
import { ALL_SCENARIOS } from '../constants';

// For performance at scale, you should add indexes to your database rules file (e.g., database.rules.json):
// { "rules": { "evaluations": { "$uid": { ".indexOn": "scenarioId" } } } }

// Function to store or update user profile information
export const updateUserProfile = async (user: firebase.User): Promise<void> => {
  try {
    const userRef = db.ref(`users/${user.uid}`);
    // Use update to avoid overwriting other potential user-related data
    // Fetch existing profile to preserve preferences like preferredLanguage
    const snapshot = await userRef.get();
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

    await userRef.update(updates);
  } catch (error) {
    console.error("Error updating user profile:", error);
    // Non-critical, so we don't throw
  }
};

export const getUserProfile = async (uid: string): Promise<import('../types').UserProfile | null> => {
  try {
    const userRef = db.ref(`users/${uid}`);
    const snapshot = await userRef.get();
    if (!snapshot.exists()) return null;
  return { uid, ...(snapshot.val() as Omit<UserProfile, 'uid'>) } as UserProfile;
  } catch (error) {
    console.error('Failed to fetch user profile:', error);
    return null;
  }
};

export const setUserPreferences = async (uid: string, prefs: { displayName?: string | null; photoURL?: string | null; preferredLanguage?: 'English' | 'Spanish' | null; }) => {
  try {
    const userRef = db.ref(`users/${uid}`);
    await userRef.update(prefs);
    return true;
  } catch (error) {
    console.error('Failed to save user preferences:', error);
    return false;
  }
};

// Function to seed the database with initial scenarios if they don't exist
export const seedScenarios = async (): Promise<void> => {
    try {
        const scenariosRef = db.ref('scenarios');
        const snapshot = await scenariosRef.get();
        if (!snapshot.exists()) {
            console.log('No scenarios found. Seeding database...');
            const updates: { [key: string]: Scenario } = {};
            ALL_SCENARIOS.forEach(scenario => {
                updates[scenario.id] = scenario;
            });
            await scenariosRef.set(updates);
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
        const scenariosRef = db.ref('scenarios');
        const snapshot = await scenariosRef.get();
        let scenarios: Scenario[] = [];
        if (snapshot.exists()) {
            const data = snapshot.val();
            if (data && typeof data === 'object') {
                scenarios = Object.values(data);
            }
        }

        // Fetch user-specific scenarios if a userId is provided
        if (userId) {
            const userScenariosRef = db.ref(`userScenarios/${userId}`);
            const userSnapshot = await userScenariosRef.get();
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
        const userScenariosRef = db.ref(`userScenarios/${userId}`);
        const newScenarioRef = userScenariosRef.push();
        const newScenario: Scenario = {
            ...scenarioData,
            id: newScenarioRef.key!,
            type: 'TRAINING', // All user-created scenarios are for training
            userId: userId,
        };
        await newScenarioRef.set(newScenario);
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
      const ref = db.ref(`userScenarios/${scenario.userId}/${scenario.id}`);
      await ref.update(scenario as any);
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
    const ref = db.ref(`userScenarios/${userId}/${scenarioId}`);
    // Ensure the override includes id and userId so it behaves like a user-created scenario
  // Build payload but remove any keys with undefined values to satisfy Realtime DB set constraints
  const rawPayload = { id: scenarioId, userId, ...data } as Record<string, any>;
  const payload = Object.fromEntries(Object.entries(rawPayload).filter(([_, v]) => typeof v !== 'undefined')) as any;
  await ref.set(payload);
  } catch (error) {
    console.error(`Failed to create user scenario override for ${scenarioId}:`, error);
    throw error;
  }
};

export const deleteUserScenario = async (userId: string, scenarioId: string): Promise<void> => {
  try {
    const scenarioRef = db.ref(`userScenarios/${userId}/${scenarioId}`);
    await scenarioRef.remove();
  } catch (error) {
    console.error(`Failed to delete scenario ${scenarioId} for user ${userId}:`, error);
    throw error;
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
    const userEvaluationsRef = db.ref(`evaluations/${userId}`).push();
    await userEvaluationsRef.set(evaluationData);
    
    // After successful save, update leaderboard if it's a new high score
    if (displayName) { // Only update if display name is available
      const leaderboardRef = db.ref(`leaderboards/${scenarioId}/${userId}`);
      const snapshot = await leaderboardRef.get();
      const currentBestScore = snapshot.exists() ? snapshot.val().score : 0;

      if (evaluation.score > currentBestScore) {
          await leaderboardRef.set({
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
    const leaderboardsRef = db.ref('leaderboards');
    const snapshot = await leaderboardsRef.get();
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
    const usersRef = db.ref('users');
    const snapshot = await usersRef.get();
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
    const ref = db.ref(`users/${targetUid}/role`);
    await ref.set(newRole);
    return true;
  } catch (error) {
    console.error('Failed to set user role:', error);
    return false;
  }
};

export const getEvaluations = async (userId: string, scenarioId: string): Promise<StoredEvaluationResult[]> => {
  try {
    const userEvaluationsRef = db.ref(`evaluations/${userId}`);
    const evaluationsQuery = userEvaluationsRef.orderByChild('scenarioId').equalTo(scenarioId);
    const snapshot = await evaluationsQuery.get();
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
    const userEvaluationsRef = db.ref(`evaluations/${userId}`);
    const snapshot = await userEvaluationsRef.get();

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
    const leaderboardRef = db.ref(`leaderboards/${scenarioId}`);
    // Order by score (ascending) and take the last 5 for the top scores.
    const query = leaderboardRef.orderByChild('score').limitToLast(5);
    const snapshot = await query.get();
    if (snapshot.exists()) {
      const data = snapshot.val();
      const entries: LeaderboardEntry[] = Object.values(data);
      // Firebase returns ascending, so we reverse to get descending order.
      return entries.sort((a, b) => b.score - a.score);
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
    const prdRef = db.ref(`prds/${userId}`).push();
    const payload = {
      userId,
      scenarioId,
      scenarioTitle: scenarioTitle ?? null,
      platform,
      markdown,
      timestamp: Date.now(),
    };
    await prdRef.set(payload);
    return prdRef.key as string;
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
    const pitchRef = db.ref(`pitches/${userId}`).push();
    const payload = {
      userId,
      scenarioId,
      scenarioTitle: scenarioTitle ?? null,
      markdown,
      timestamp: Date.now(),
    };
    await pitchRef.set(payload);
    return pitchRef.key as string;
  } catch (error) {
    console.error('Failed to save Elevator Pitch:', error);
    throw error;
  }
};

// Get saved PRDs for a user
export const getSavedPrds = async (userId: string): Promise<SavedPrd[]> => {
  try {
    const ref = db.ref(`prds/${userId}`);
    const snap = await ref.get();
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
    const ref = db.ref(`pitches/${userId}`);
    const snap = await ref.get();
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