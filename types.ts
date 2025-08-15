

export interface Scenario {
  id: string;
  title: string;
  description: string;
  goal: string;
  type: 'TRAINING' | 'EVALUATION';
  userId?: string; // ID of the user who created this scenario
}

export interface UserProfile {
  uid: string;
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
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