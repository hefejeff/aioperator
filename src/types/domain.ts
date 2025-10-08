export interface Domain {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  workflowCount: number;
  activeUsers: number;
  lastWorkflowCreated: number | null;
  monthlyUsage: {
    workflows: number;
    apiCalls: number;
  };
  settings: {
    allowedEmails: string[];
    maxWorkflows?: number;
    maxApiCalls?: number;
  };
}

export interface DomainStats {
  totalWorkflows: number;
  totalUsers: number;
  monthlyActiveUsers: number;
  apiUsage: {
    current: number;
    limit: number;
  };
}