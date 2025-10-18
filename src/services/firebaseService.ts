import { db } from './firebaseInit';
import { ref, get, push, set, update, remove, query, orderByChild, equalTo } from 'firebase/database';
import type { 
  WorkflowVersion,
  TeamMember, 
  TeamRole, 
  WorkflowTeam, 
  PendingInvitation,
  Scenario,
  StoredEvaluationResult,
  EvaluationResult,
  LeaderboardEntry,
  SavedPitch,
  SavedPrd,
  Platform,
  AggregatedEvaluationResult,
  UserProfile,
  Role
} from '../types';
import { ALL_SCENARIOS } from '../constants';

// Get evaluations for a specific user and scenario
// Get all evaluations for a user across all scenarios
export const getAllUserEvaluations = async (userId: string): Promise<AggregatedEvaluationResult[]> => {
  try {
    const userEvaluationsRef = ref(db, `evaluations/${userId}`);
    const snapshot = await get(userEvaluationsRef);
    
    if (!snapshot.exists()) {
      return [];
    }

    const evaluations: AggregatedEvaluationResult[] = [];
    const evaluationsData = snapshot.val();

    // Get all scenarios to look up titles
    const scenariosRef = ref(db, 'scenarios');
    const scenariosSnapshot = await get(scenariosRef);
    const scenariosData = scenariosSnapshot.exists() ? scenariosSnapshot.val() : {};

    // Convert object to array and include scenario titles
    for (const [id, evaluation] of Object.entries<any>(evaluationsData)) {
      const scenarioTitle = scenariosData[evaluation.scenarioId]?.title || 'Unknown Scenario';
      evaluations.push({
        id,
        ...(evaluation as Omit<StoredEvaluationResult, 'id'>),
        scenarioTitle
      });
    }

    // Sort by timestamp, most recent first
    return evaluations.sort((a, b) => b.timestamp - a.timestamp);
  } catch (error) {
    console.error('Failed to fetch user evaluations:', error);
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
): Promise<string> => {
  try {
    // First save the workflow version to get its ID
    const workflowVersionId = await saveWorkflowVersion(userId, scenarioId, workflowExplanation, null, {
      evaluationScore: evaluation.score,
      evaluationFeedback: evaluation.feedback,
      imageBase64: imageUrl ? imageUrl.split(',')[1] : null,
      imageMimeType: imageUrl ? imageUrl.split(';')[0].split(':')[1] : null
    });

    // Now save the evaluation with a reference to the workflow version
    const evaluationData: Omit<StoredEvaluationResult, 'id'> = {
      ...evaluation,
      userId,
      scenarioId,
      workflowExplanation,
      imageUrl,
      workflowVersionId,
      timestamp: Date.now(),
    };

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
        // Notify UI that the global leaderboard may have changed so other components can refresh
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

    return workflowVersionId; // Return the workflow version ID for reference
  } catch(error) {
    console.error("Failed to save evaluation to Firebase:", error);
    throw error; // Re-throw the error to be handled by the caller UI
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
    if (!workflowId) {
      console.warn('No workflowId provided to getWorkflowVersion');
      return null;
    }

    console.log('Looking for workflow ID:', workflowId, 'for user:', userId);

    // If userId is provided, try searching in that user's evaluations first
    if (userId) {
      const evaluationsRef = ref(db, `evaluations/${userId}`);
      const evaluationsSnap = await get(evaluationsRef);
      if (evaluationsSnap.exists()) {
        const evaluationsData = evaluationsSnap.val();
        // Look for an evaluation that references this workflow ID
        for (const evalId in evaluationsData) {
          const evaluation = evaluationsData[evalId];
          if (evaluation.workflowVersionId === workflowId) {
            // Found the workflow ID in an evaluation, now we can find the workflow
            const workflowRef = ref(db, `workflowVersions/${userId}/${evaluation.scenarioId}/${workflowId}`);
            const workflowSnap = await get(workflowRef);
            if (workflowSnap.exists()) {
              console.log('Found workflow through user evaluations:', { scenarioId: evaluation.scenarioId, workflowId });
              return {
                id: workflowId,
                scenarioId: evaluation.scenarioId,
                userId,
                ...workflowSnap.val()
              };
            }
          }
        }
      }
      
      // If not found in evaluations, try searching through user scenarios path
      const userScenariosRef = ref(db, `workflowVersions/${userId}`);
      const userScenariosSnap = await get(userScenariosRef);
      if (userScenariosSnap.exists()) {
        const data = userScenariosSnap.val();
        for (const scenarioId in data) {
          const workflowRef = ref(db, `workflowVersions/${userId}/${scenarioId}/${workflowId}`);
          const workflowSnap = await get(workflowRef);
          if (workflowSnap.exists()) {
            console.log('Found workflow through user scenarios:', { scenarioId, workflowId });
            return {
              id: workflowId,
              scenarioId,
              userId,
              ...workflowSnap.val()
            };
          }
        }
      }
    }

    // If not found with userId or no userId provided, search through all evaluations
    const evaluationsRef = ref(db, 'evaluations');
    const evaluationsSnap = await get(evaluationsRef);
    if (evaluationsSnap.exists()) {
      const evaluationsData = evaluationsSnap.val();
      // Search through all users' evaluations
      for (const uid in evaluationsData) {
        const userEvaluations = evaluationsData[uid];
        for (const evalId in userEvaluations) {
          const evaluation = userEvaluations[evalId];
          if (evaluation.workflowVersionId === workflowId) {
            try {
              const workflowRef = ref(db, `workflowVersions/${uid}/${evaluation.scenarioId}/${workflowId}`);
              const workflowSnap = await get(workflowRef);
              if (workflowSnap.exists()) {
                console.log('Found workflow through evaluations:', { uid, scenarioId: evaluation.scenarioId, workflowId });
                return {
                  id: workflowId,
                  scenarioId: evaluation.scenarioId,
                  userId: uid,
                  ...workflowSnap.val()
                };
              }
            } catch (err) {
              console.error('Error fetching workflow from evaluation reference:', err);
              // Continue searching other evaluations
              continue;
            }
          }
        }
      }
    }

    // If not found through evaluations, try direct search in workflowVersions
    const allWorkflowsRef = ref(db, 'workflowVersions');
    const allWorkflowsSnap = await get(allWorkflowsRef);
    if (allWorkflowsSnap.exists()) {
      const allWorkflowsData = allWorkflowsSnap.val();
      for (const uid in allWorkflowsData) {
        for (const scenarioId in allWorkflowsData[uid]) {
          if (allWorkflowsData[uid][scenarioId][workflowId]) {
            console.log('Found workflow through direct search:', { uid, scenarioId, workflowId });
            return {
              id: workflowId,
              scenarioId,
              userId: uid,
              ...allWorkflowsData[uid][scenarioId][workflowId]
            };
          }
        }
      }
    }

    // Not found anywhere
    console.log('Workflow not found:', workflowId);
    return null;
  } catch (error) {
    console.error('Failed to load workflow version:', error);
    return null;
  }
};

// Save a new workflow version
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

// Update an existing workflow version
export const updateWorkflowVersion = async (
  workflowId: string,
  userId: string,
  scenarioId: string,
  updates: Partial<WorkflowVersion>
): Promise<void> => {
  try {
    console.log('Updating workflow version:', { workflowId, userId, scenarioId, updates });
    
    const workflowRef = ref(db, `workflowVersions/${userId}/${scenarioId}/${workflowId}`);
    
    // Add lastModified timestamp to updates
    const updateData = {
      ...updates,
      lastModified: Date.now()
    };
    
    await update(workflowRef, updateData);
    console.log('Workflow version updated successfully');
  } catch (error) {
    console.error('Failed to update workflow version:', error);
    throw error;
  }
};

// Get team information for a workflow
export const getWorkflowTeam = async (workflowId: string, userId: string, scenarioId: string): Promise<WorkflowTeam | null> => {
  try {
    const teamRef = ref(db, `workflowVersions/${userId}/${scenarioId}/${workflowId}/team`);
    const snapshot = await get(teamRef);
    
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
    const usersRef = ref(db, 'users');
    const snapshot = await get(query(usersRef, orderByChild('email'), equalTo(memberEmail)));
    
    if (!snapshot.exists()) {
      throw new Error('User not found with this email address');
    }
    
    const userData = snapshot.val();
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
    const teamRef = ref(db, `workflowVersions/${workflowOwnerId}/${scenarioId}/${workflowId}/team/members/${memberUserId}`);
    await set(teamRef, teamMember);
    
    // Also update workflowId in the team structure
    const workflowIdRef = ref(db, `workflowVersions/${workflowOwnerId}/${scenarioId}/${workflowId}/team/workflowId`);
    await set(workflowIdRef, workflowId);
    
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
    const teamMemberRef = ref(db, `workflowVersions/${workflowOwnerId}/${scenarioId}/${workflowId}/team/members/${memberUserId}`);
    await remove(teamMemberRef);
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
    const roleRef = ref(db, `workflowVersions/${workflowOwnerId}/${scenarioId}/${workflowId}/team/members/${memberUserId}/role`);
    await set(roleRef, newRole);
  } catch (error) {
    console.error('Failed to update team member role:', error);
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

// Create invitation token and store pending invitation
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

// Get all scenarios available to a user (including public and user-created)
export const getScenarios = async (userId: string): Promise<Scenario[]> => {
  try {
    const scenariosRef = ref(db, 'scenarios');
    const snapshot = await get(scenariosRef);
    
    if (!snapshot.exists()) {
      return [];
    }
    
    const scenarios: Scenario[] = [];
    const data = snapshot.val();
    
    // Convert object to array and include all scenarios user has access to
    for (const [id, scenario] of Object.entries<any>(data)) {
      // Include scenario if it's public or created by the user
      if (!scenario.userId || scenario.userId === userId) {
        scenarios.push({
          id,
          ...(scenario as Omit<Scenario, 'id'>)
        });
      }
    }
    
    return scenarios;
  } catch (error) {
    console.error('Failed to fetch scenarios:', error);
    throw error;
  }
};

// Save a new user-created scenario
export const saveUserScenario = async (userId: string, scenario: Omit<Scenario, 'id' | 'type'>): Promise<Scenario> => {
  try {
    const scenariosRef = ref(db, 'scenarios');
    const newScenarioRef = push(scenariosRef);
    
    const scenarioData = {
      ...scenario,
      userId,
      type: 'TRAINING' as const,
      favoritedBy: {}
    };
    
    await set(newScenarioRef, scenarioData);
    
    return {
      id: newScenarioRef.key as string,
      ...scenarioData
    };
  } catch (error) {
    console.error('Failed to save user scenario:', error);
    throw error;
  }
};

// Toggle favorite status of a scenario for a user
export const toggleFavoriteScenario = async (userId: string, scenario: Scenario): Promise<boolean> => {
  try {
    const favoritesRef = ref(db, `scenarios/${scenario.id}/favoritedBy/${userId}`);
    const isFavorited = scenario.favoritedBy?.[userId];
    
    if (isFavorited) {
      // Remove favorite
      await remove(favoritesRef);
      return false;
    } else {
      // Add favorite
      await set(favoritesRef, true);
      return true;
    }
  } catch (error) {
    console.error('Failed to toggle favorite scenario:', error);
    throw error;
  }
};

// Delete a user's scenario
export const deleteUserScenario = async (userId: string, scenarioId: string): Promise<void> => {
  try {
    const scenarioRef = ref(db, `scenarios/${scenarioId}`);
    const snapshot = await get(scenarioRef);
    
    if (!snapshot.exists()) {
      throw new Error('Scenario not found');
    }
    
    const scenario = snapshot.val();
    if (scenario.userId !== userId) {
      throw new Error('Not authorized to delete this scenario');
    }
    
    await remove(scenarioRef);
  } catch (error) {
    console.error('Failed to delete scenario:', error);
    throw error;
  }
};

// Update an existing scenario
export const updateScenario = async (scenario: Scenario): Promise<void> => {
  try {
    const scenarioRef = ref(db, `scenarios/${scenario.id}`);
    await update(scenarioRef, scenario);
  } catch (error) {
    console.error('Failed to update scenario:', error);
    throw error;
  }
};

// Get a user's favorite scenario IDs
export const getUserFavoriteScenarioIds = async (userId: string): Promise<Set<string>> => {
  try {
    const scenariosRef = ref(db, 'scenarios');
    const snapshot = await get(scenariosRef);
    
    if (!snapshot.exists()) {
      return new Set();
    }
    
    const favoriteIds = new Set<string>();
    const scenarios = snapshot.val();
    
    for (const [id, scenario] of Object.entries<any>(scenarios)) {
      if (scenario.favoritedBy?.[userId]) {
        favoriteIds.add(id);
      }
    }
    
    return favoriteIds;
  } catch (error) {
    console.error('Failed to get user favorite scenarios:', error);
    throw error;
  }
};

// Create a user-specific override for a scenario
export const createUserScenarioOverride = async (
  userId: string,
  scenarioId: string,
  override: Partial<Scenario>
): Promise<void> => {
  try {
    const overrideRef = ref(db, `userScenarioOverrides/${userId}/${scenarioId}`);
    await update(overrideRef, {
      ...override,
      updatedAt: Date.now()
    });
  } catch (error) {
    console.error('Failed to create scenario override:', error);
    throw error;
  }
};

// Delete a user and their data (admin only)
export const deleteUser = async (adminUserId: string, targetUserId: string): Promise<boolean> => {
  try {
    // First verify admin permissions
    const adminRef = ref(db, `users/${adminUserId}`);
    const adminSnap = await get(adminRef);
    if (!adminSnap.exists()) throw new Error('Admin not found');
    const adminData = adminSnap.val();
    if (adminData.role !== 'SUPER_ADMIN' && adminData.role !== 'ADMIN') {
      throw new Error('Not authorized');
    }

    // Delete user's data
    const batch = [
      remove(ref(db, `users/${targetUserId}`)),
      remove(ref(db, `evaluations/${targetUserId}`)),
      remove(ref(db, `workflowVersions/${targetUserId}`)),
      remove(ref(db, `userScenarioOverrides/${targetUserId}`))
    ];

    // Also remove user's favorites from all scenarios
    const scenariosRef = ref(db, 'scenarios');
    const scenariosSnap = await get(scenariosRef);
    if (scenariosSnap.exists()) {
      const scenarios = scenariosSnap.val();
      for (const [scenarioId, scenario] of Object.entries<any>(scenarios)) {
        if (scenario.favoritedBy?.[targetUserId]) {
          batch.push(remove(ref(db, `scenarios/${scenarioId}/favoritedBy/${targetUserId}`)));
        }
        // If scenario was created by this user, delete it
        if (scenario.userId === targetUserId) {
          batch.push(remove(ref(db, `scenarios/${scenarioId}`)));
        }
      }
    }

    await Promise.all(batch);
    return true;
  } catch (error) {
    console.error('Failed to delete user:', error);
    return false;
  }
};

// List all users (admin only)
export const listAllUsers = async (): Promise<UserProfile[]> => {
  try {
    const usersRef = ref(db, 'users');
    const snapshot = await get(usersRef);
    
    if (!snapshot.exists()) {
      return [];
    }
    
    const users: UserProfile[] = [];
    const data = snapshot.val();
    
    for (const [uid, user] of Object.entries<any>(data)) {
      users.push({
        uid,
        displayName: user.displayName || null,
        email: user.email || null,
        photoURL: user.photoURL || null,
        preferredLanguage: user.preferredLanguage || 'English',
        role: (user.role as Role | undefined) || 'USER'
      });
    }
    
    return users;
  } catch (error) {
    console.error('Failed to list users:', error);
    throw error;
  }
};

// Set a user's role (admin only)
export const setUserRole = async (adminUserId: string, targetUserId: string, newRole: Role): Promise<boolean> => {
  try {
    // First verify admin permissions
    const adminRef = ref(db, `users/${adminUserId}`);
    const adminSnap = await get(adminRef);
    if (!adminSnap.exists()) throw new Error('Admin not found');
    const adminData = adminSnap.val();
    if (adminData.role !== 'SUPER_ADMIN' && adminData.role !== 'ADMIN') {
      throw new Error('Not authorized');
    }

    // Update user's role
    const userRef = ref(db, `users/${targetUserId}`);
    await update(userRef, { role: newRole });
    return true;
  } catch (error) {
    console.error('Failed to set user role:', error);
    return false;
  }
};

// Get global leaderboard
export const getGlobalLeaderboard = async (limit: number = 10): Promise<LeaderboardEntry[]> => {
  try {
    const leaderboardsRef = ref(db, 'leaderboards');
    const snapshot = await get(leaderboardsRef);
    
    if (!snapshot.exists()) {
      return [];
    }
    
    const leaderboardData = snapshot.val();
    const entries: { uid: string; displayName: string; totalScore: number }[] = [];
    const userScores: Record<string, number> = {};
    
    // Calculate total scores across all scenarios
    for (const scenarioEntries of Object.values<Record<string, { score: number; displayName: string; uid: string }>>(leaderboardData)) {
      for (const [uid, entry] of Object.entries(scenarioEntries)) {
        if (!userScores[uid]) {
          userScores[uid] = 0;
          entries.push({
            uid,
            displayName: entry.displayName,
            totalScore: 0
          });
        }
        userScores[uid] += entry.score;
      }
    }
    
    // Update total scores and calculate averages
    entries.forEach(entry => {
      entry.totalScore = userScores[entry.uid];
    });
    
    // Sort by total score and take top N
    return entries
      .sort((a, b) => b.totalScore - a.totalScore)
      .slice(0, limit)
      .map(entry => ({
        uid: entry.uid,
        displayName: entry.displayName,
        score: Math.round(entry.totalScore)
      }));
  } catch (error) {
    console.error('Failed to get global leaderboard:', error);
    return [];
  }
};

// Get all users
export const getAllUsers = async (): Promise<UserProfile[]> => {
  try {
    const usersRef = ref(db, 'users');
    const snapshot = await get(usersRef);
    
    if (!snapshot.exists()) {
      return [];
    }
    
    const users: UserProfile[] = [];
    const data = snapshot.val();
    
    for (const [uid, user] of Object.entries<any>(data)) {
      users.push({
        uid,
        displayName: user.displayName || null,
        email: user.email || null,
        photoURL: user.photoURL || null,
        preferredLanguage: user.preferredLanguage || 'English',
        role: (user.role as Role | undefined) || 'USER'
      });
    }
    
    return users;
  } catch (error) {
    console.error('Failed to get all users:', error);
    throw error;
  }
};

// Get a specific scenario by ID
export const getScenarioById = async (scenarioId: string, userId?: string): Promise<Scenario | null> => {
  try {
    // First try to get scenario from main scenarios path
    const scenarioRef = ref(db, `scenarios/${scenarioId}`);
    const snapshot = await get(scenarioRef);
    
    if (!snapshot.exists()) {
      return null;
    }

    const scenarioData = snapshot.val();
    
    // If userId provided, check for user-specific overrides
    if (userId) {
      const overrideRef = ref(db, `userScenarioOverrides/${userId}/${scenarioId}`);
      const overrideSnapshot = await get(overrideRef);
      
      if (overrideSnapshot.exists()) {
        // Merge override data with base scenario
        Object.assign(scenarioData, overrideSnapshot.val());
      }
    }
    
    return {
      id: scenarioId,
      ...scenarioData
    };
  } catch (error) {
    console.error('Failed to get scenario:', error);
    throw error;
  }
};

// Get the latest PRD for a scenario
export const getLatestPrdForScenario = async (userId: string, scenarioId: string): Promise<SavedPrd | null> => {
  try {
    const prdsRef = ref(db, `prds/${userId}`);
    const snapshot = await get(prdsRef);
    
    if (!snapshot.exists()) {
      return null;
    }
    
    const prds = Object.entries<any>(snapshot.val())
      .map(([id, prd]) => ({
        id,
        ...(prd as Omit<SavedPrd, 'id'>)
      }))
      .filter(prd => prd.scenarioId === scenarioId)
      .sort((a, b) => b.timestamp - a.timestamp);
    
    return prds[0] || null;
  } catch (error) {
    console.error('Failed to get latest PRD:', error);
    throw error;
  }
};

// Get the latest pitch for a scenario
export const getLatestPitchForScenario = async (userId: string, scenarioId: string): Promise<SavedPitch | null> => {
  try {
    const pitchesRef = ref(db, `pitches/${userId}`);
    const snapshot = await get(pitchesRef);
    
    if (!snapshot.exists()) {
      return null;
    }
    
    const pitches = Object.entries<any>(snapshot.val())
      .map(([id, pitch]) => ({
        id,
        ...(pitch as Omit<SavedPitch, 'id'>)
      }))
      .filter(pitch => pitch.scenarioId === scenarioId)
      .sort((a, b) => b.timestamp - a.timestamp);
    
    return pitches[0] || null;
  } catch (error) {
    console.error('Failed to get latest pitch:', error);
    throw error;
  }
};

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
    const invitationRef = ref(db, `workflowVersions/${workflowOwnerId}/${scenarioId}/${workflowId}/team/invitations/${email.replace(/\./g, '_')}`);
    await set(invitationRef, invitation);
    
    return token;
  } catch (error) {
    console.error('Failed to create invitation:', error);
    throw error;
  }
};

export const getUserProfile = async (userId: string): Promise<UserProfile | null> => {
  try {
    const userRef = ref(db, `users/${userId}`);
    const snapshot = await get(userRef);
    
    if (!snapshot.exists()) {
      return null;
    }
    
    const userData = snapshot.val();
    return {
      uid: userId,
      email: userData.email || null,
      displayName: userData.displayName || null,
      photoURL: userData.photoURL || null,
      preferredLanguage: userData.preferredLanguage || 'English',
      role: userData.role || 'USER'
    };
  } catch (error) {
    console.error('Failed to get user profile:', error);
    throw error;
  }
};

export const setUserPreferences = async (
  userId: string, 
  preferences: UserProfile
): Promise<boolean> => {
  try {
    const userRef = ref(db, `users/${userId}`);
    await update(userRef, preferences);
    return true;
  } catch (error) {
    console.error('Failed to update user preferences:', error);
    return false;
  }
};

export const seedScenarios = async (): Promise<void> => {
  try {
    // First check if any scenarios exist
    const scenariosRef = ref(db, 'scenarios');
    const snapshot = await get(scenariosRef);
    
    // If scenarios already exist, don't seed
    if (snapshot.exists()) {
      console.log('Scenarios already exist, skipping seed');
      return;
    }
    
    console.log('No scenarios found, seeding default scenarios');
    
    // Add each default scenario from constants
    const batch = ALL_SCENARIOS.map((scenario: Omit<Scenario, 'favoritedBy'>) => {
      const newRef = push(scenariosRef);
      return set(newRef, {
        ...scenario,
        favoritedBy: {}  // Initialize empty favorites for each scenario
      });
    });
    
    await Promise.all(batch);
    console.log('Successfully seeded default scenarios');
  } catch (error) {
    console.error('Failed to seed scenarios:', error);
    throw error;
  }
};

export const updateUserProfile = async (user: { uid: string, email: string | null, displayName: string | null, photoURL: string | null }): Promise<void> => {
  try {
    const userRef = ref(db, `users/${user.uid}`);
    
    // Get existing user data first
    const snapshot = await get(userRef);
    const existingData = snapshot.exists() ? snapshot.val() : {};
    
    // Update user data, preserving existing fields
    await update(userRef, {
      ...existingData,
      email: user.email,
      displayName: user.displayName,
      photoURL: user.photoURL,
      lastLogin: Date.now(),
      // Preserve existing role and preferences, defaulting if not set
      role: existingData.role || 'USER',
      preferredLanguage: existingData.preferredLanguage || 'English'
    });
  } catch (error) {
    console.error('Failed to update user profile:', error);
    throw error;
  }
};