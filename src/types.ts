

export interface Scenario {
  id: string;
  title: string;
  // Optional Spanish translations
  title_es?: string;
  description: string;
  description_es?: string;
  goal: string;
  goal_es?: string;
  domain?: string;
  type: 'TRAINING' | 'EVALUATION';
  userId?: string; // ID of the user who created this scenario
}

export interface UserProfile {
  uid: string;
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
  preferredLanguage?: 'English' | 'Spanish' | null;
  role?: Role | null;
}

export interface EvaluationResult {
  score: number;
  feedback: string;
}

export interface StoredEvaluationResult extends EvaluationResult {
  id: string; // The evaluation's own push ID
  userId: string;
  scenarioId: string;
  timestamp: number;
  workflowExplanation: string;
  imageUrl: string | null;
}

export interface AggregatedEvaluationResult extends StoredEvaluationResult {
  scenarioTitle: string;
}

export interface LeaderboardEntry {
  uid: string;
  displayName: string;
  score: number;
}

export type Role = 'SUPER_ADMIN' | 'ADMIN' | 'PRO_USER' | 'USER';