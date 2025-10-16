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
  EvaluationResult
} from '../types';

// Get evaluations for a specific user and scenario
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