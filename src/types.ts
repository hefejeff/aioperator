

export interface UseCase {
  id: string;
  title: string;
  // Optional Spanish translations
  title_es?: string;
  description: string;
  description_es?: string;
  goal: string;
  goal_es?: string;
  domain?: string;
  process?: string; // Specific process within the domain (e.g., 'Lead Qualification' within 'Sales')
  process_es?: string;
  valueDrivers?: string; // Business value this use case will deliver
  valueDrivers_es?: string;
  painPoints?: string; // Problems this use case solves
  painPoints_es?: string;
  platform?: string; // Target platform (AI_CHOICE, MS365, GOOGLE, CUSTOM)
  type: 'TRAINING' | 'EVALUATION';
  userId?: string; // ID of the user who created this use case
  favoritedBy?: Record<string, true>; // map of userId -> true for quick lookup
  currentWorkflowImage?: string | null; // Base64 data URL for the current workflow image
}

// Keep Scenario as alias for backward compatibility
export type Scenario = UseCase;

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
  workflowVersionId?: string; // ID of the corresponding workflow version if one exists
  demoProjectUrl?: string | null; // Google AI Studio project URL
  demoPublishedUrl?: string | null; // Published demo URL
  demoPrompt?: string | null; // Generated demo prompt text
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

// Meeting types
export interface Meeting {
  id: string;
  companyId: string;
  title: string;
  date: string; // ISO date string
  time: string; // HH:mm format
  participants: string[]; // Array of participant names/emails
  transcript: string; // Meeting transcript/notes
  summary?: string; // AI-generated or manual summary
  createdAt: number;
  updatedAt: number;
}

// Company types
export interface Company {
  id: string;
  name: string;
  createdBy: string;
  createdAt: number;
  lastUpdated: number;
  selectedScenarios: string[]; // Array of scenario IDs selected for this company
  selectedDomains?: string[]; // Array of domain names user has selected/toggled on
  meetings?: Meeting[]; // Array of meetings for this company
  research: CompanyResearch;
}

export interface RfpAnalysis {
  summary: string;
  projectStructure: string;
  detailedAnalysis: string;
  timeline: string;
  budget: string;
  requirements: string;
  stakeholders: string;
  successCriteria: string;
  risks: string;
  aiRecommendations: string;
  aiCapabilities: string;
  constraints: string;
  clarificationNeeded: string;
}

// Document category types
export type DocumentCategory = 'RFP' | 'SOW' | 'CONTRACT' | 'PROPOSAL' | 'REQUIREMENTS' | 'TECHNICAL' | 'FINANCIAL' | 'OTHER';

export interface DocumentAnalysis {
  category: DocumentCategory;
  title: string;
  summary: string;
  keyPoints: string[];
  analyzedAt: number;
}

// Company Research types
export interface UploadedDocument {
  id: string;
  content: string;
  fileName: string;
  uploadedAt: number;
  url?: string;
  path?: string;
  analysis?: RfpAnalysis;
  documentAnalysis?: DocumentAnalysis;
  isAnalyzing?: boolean;
}

export interface CompanyResearchEntry {
  description: string;
  industry: string;
  products: string[];
  challenges: string[];
  opportunities: string[];
  marketPosition: string;
  competitors: string[];
  useCases: string[];
  rfpDocument?: {
    content: string;
    fileName: string;
    uploadedAt: number;
    url?: string;
    path?: string;
    analysis?: RfpAnalysis;
  };
  documents?: UploadedDocument[]; // Support up to 5 documents
  aiRelevance: {
    current: string;
    potential: string;
    recommendations: string[];
  };
  timestamp: number;
}

export interface CompanyResearch {
  name: string;
  currentResearch: CompanyResearchEntry;
  history: CompanyResearchEntry[];
  lastUpdated: number;
  selectedScenarios?: string[]; // Array of scenario IDs selected for this company
}

export interface RelatedScenario extends Scenario {
  relevanceScore: number;
  relevanceReason: string;
}

// Team collaboration types
export type TeamRole = 'OWNER' | 'EDITOR' | 'VIEWER';

export interface TeamMember {
  userId: string;
  email: string;
  displayName: string | null;
  role: TeamRole;
  addedAt: number;
  addedBy: string; // userId of who added this member
}

export interface WorkflowTeam {
  workflowId: string;
  members: Record<string, TeamMember>; // userId -> TeamMember
  invitations?: Record<string, PendingInvitation>; // email -> PendingInvitation
}

export interface PendingInvitation {
  email: string;
  role: TeamRole;
  invitedBy: string; // userId
  invitedAt: number;
  token: string; // unique invitation token
}

// Core platforms (base options)
export type CorePlatform = 'AI_CHOICE' | 'MS365' | 'GOOGLE' | 'CUSTOM';

// Individual approaches within platforms
export type PlatformApproach = 
  // Power Platform approaches
  | 'POWER_APPS'
  | 'POWER_AUTOMATE'
  | 'POWER_BI'
  | 'POWER_VIRTUAL_AGENTS'
  // Google Workspace approaches
  | 'APP_SHEETS'
  // Common approaches
  | 'CUSTOM_PROMPT'
  | 'ASSISTANT'
  | 'COMBINATION';

// Combined type for backward compatibility
export type Platform = CorePlatform | PlatformApproach;

// Saved PRD document
export interface SavedPrd {
  id: string;
  userId: string;
  scenarioId: string;
  scenarioTitle?: string;
  platform: Platform;
  markdown: string;
  timestamp: number;
}

// Saved Elevator Pitch document
export interface SavedPitch {
  id: string;
  userId: string;
  scenarioId: string;
  scenarioTitle?: string;
  markdown: string;
  timestamp: number;
}

// Stored workflow version snapshot (manual save separate from evaluations)
export interface WorkflowVersion {
  id: string;
  userId: string;
  scenarioId: string;
  workflowExplanation: string;
  prdMarkdown: string | null;
  pitchMarkdown: string | null;
  evaluationScore: number | null;
  evaluationFeedback: string | null;
  sourceEvaluationId: string | null;
  versionTitle: string | null;
  mermaidCode: string | null;
  mermaidSvg: string | null;
  imageBase64: string | null;
  imageMimeType: string | null;
  demoProjectUrl?: string | null; // Google AI Studio project URL
  demoPublishedUrl?: string | null; // Published demo URL
  demoPrompt?: string | null; // Generated demo prompt text
  leanCanvas?: any; // Optional saved Lean Canvas data
  lastModified?: number; // Timestamp of last modification
  team?: WorkflowTeam; // Optional team collaboration data
  timestamp: number;
}