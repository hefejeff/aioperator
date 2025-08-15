import { db } from '../firebaseConfig';
import type firebase from 'firebase/compat/app';
import type { EvaluationResult, Scenario, StoredEvaluationResult, AggregatedEvaluationResult } from '../types';
import { ALL_SCENARIOS } from '../constants';

// For performance at scale, you should add indexes to your database rules file (e.g., database.rules.json):
// { "rules": { "evaluations": { "$uid": { ".indexOn": "scenarioId" } } } }

// Function to store or update user profile information
export const updateUserProfile = async (user: firebase.User): Promise<void> => {
  try {
    const userRef = db.ref(`users/${user.uid}`);
    // Use update to avoid overwriting other potential user-related data
    await userRef.update({
      displayName: user.displayName,
      email: user.email,
      photoURL: user.photoURL,
    });
  } catch (error) {
    console.error("Error updating user profile:", error);
    // Non-critical, so we don't throw
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

export const saveEvaluation = async (
  userId: string,
  scenarioId: string,
  evaluation: EvaluationResult,
  workflowExplanation: string,
  imageUrl: string | null
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
  } catch(error) {
    console.error("Failed to save evaluation to Firebase:", error);
    throw error; // Re-throw the error to be handled by the caller UI
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