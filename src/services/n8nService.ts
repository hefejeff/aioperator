export interface WorkflowStep {
  id: string;
  label: string;
  actor: 'human' | 'ai';
  index: number;
}

export interface N8NNode {
  id: string;
  name: string;
  type: string;
  position: [number, number];
  parameters: Record<string, any>;
  typeVersion?: number;
}

export interface N8NWorkflow {
  name: string;
  nodes: N8NNode[];
  connections: Record<string, { main: Array<Array<{ node: string; type: string; index: number }>> }>;
  settings?: {
    saveExecutionProgress?: boolean;
    executionOrder?: string;
  };
  tags?: Array<{ name: string }>;
}

/**
 * Parse workflow explanation text into structured steps
 */
export function parseWorkflowSteps(text: string): WorkflowStep[] {
  const steps: WorkflowStep[] = [];
  const lines = text
    .split(/\n+/)
    .map(line => line.trim())
    .filter(line => line.length > 0);

  // Match different step formats: "Step X:", "X.", or "X)"
  const stepPattern = /^(?:Step\s*)?(\d+)[.):]\s*(.+)$/i;
  
  lines.forEach(line => {
    const match = line.match(stepPattern);
    if (match) {
      const [, stepNum, content] = match;
      const index = parseInt(stepNum, 10) - 1;
      
      // Determine if it's a human or AI step
      const isHuman = /\(human\)/i.test(content);
      const isAI = /\(ai\)/i.test(content);
      
      // Clean up the step text
      const label = content
        .replace(/\((human|ai)\)/i, '')
        .trim();

      if (label) {
        steps.push({
          id: `step${index + 1}`,
          label,
          actor: isHuman ? 'human' : isAI ? 'ai' : 'ai', // Default to AI if not specified
          index
        });
      }
    }
  });

  return steps.sort((a, b) => a.index - b.index);
}

/**
 * Generate a base N8N node structure
 */
export function createBaseNode(
  id: string,
  name: string,
  type: string,
  position: [number, number],
  parameters: Record<string, any> = {}
): N8NNode {
  return {
    id,
    name,
    type,
    parameters,
    typeVersion: 1,
    position
  };
}

/**
 * Calculate node position in the workflow grid
 */
export function calculateNodePosition(index: number, _totalSteps: number): [number, number] {
  // Start from left to right with some spacing
  const xSpacing = 300;
  
  // For simple linear workflows, just space them horizontally
  return [index * xSpacing + 100, 300];
}

/**
 * Create a webhook node for user input
 */
export function createWebhookNode(id: string, name: string, position: [number, number], path: string): N8NNode {
  return createBaseNode(id, name, 'n8n-nodes-base.webhook', position, {
    httpMethod: 'POST',
    path,
    options: {
      responseData: 'json',
      responseCode: 200
    }
  });
}

/**
 * Create an HTTP request node (e.g., for API calls)
 */
export function createHttpNode(
  id: string,
  name: string,
  position: [number, number],
  url: string,
  method = 'POST',
  headers: Record<string, string> = {},
  body: any = undefined
): N8NNode {
  return createBaseNode(id, name, 'n8n-nodes-base.httpRequest', position, {
    url,
    method,
    headers,
    body,
    options: {
      allowUnauthorizedCerts: false,
      jsonParameters: true,
      timeout: 10000
    }
  });
}

/**
 * Create a function node for custom logic
 */
export function createFunctionNode(
  id: string,
  name: string,
  position: [number, number],
  code: string
): N8NNode {
  return createBaseNode(id, name, 'n8n-nodes-base.function', position, {
    functionCode: code
  });
}

/**
 * Create response node for webhooks
 */
export function createResponseNode(
  id: string,
  name: string,
  position: [number, number],
  responseData: any = { success: true }
): N8NNode {
  return createBaseNode(id, name, 'n8n-nodes-base.respondToWebhook', position, {
    responseBody: responseData,
    responseCode: 200
  });
}

/**
 * Generate connections between nodes
 */
export function generateConnections(steps: WorkflowStep[]): Record<string, { main: Array<Array<{ node: string; type: string; index: number }>> }> {
  const connections: Record<string, { main: Array<Array<{ node: string; type: string; index: number }>> }> = {};
  
  for (let i = 0; i < steps.length - 1; i++) {
    const currentStep = steps[i];
    const nextStep = steps[i + 1];
    
    connections[currentStep.id] = {
      main: [[{
        node: nextStep.id,
        type: 'main',
        index: 0
      }]]
    };
  }
  
  return connections;
}

/**
 * Push a workflow to local n8n instance
 * Note: For local development, this downloads the workflow JSON file
 * For production, you would set up a backend proxy to avoid CORS
 */
export async function pushWorkflowToN8N(workflow: N8NWorkflow): Promise<{ success: boolean; workflowId?: string; url?: string; error?: string }> {
  try {
    // For local development, download the workflow JSON file
    // Users can manually import it into n8n
    const workflowJson = JSON.stringify(workflow, null, 2);
    const blob = new Blob([workflowJson], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${workflow.name.replace(/\s+/g, '_')}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    const n8nUrl = import.meta.env.VITE_N8N_API_URL?.replace('/api/v1', '') || 'http://localhost:5678';

    return {
      success: true,
      url: n8nUrl,
    };
  } catch (error) {
    console.error('Error downloading workflow:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}

/**
 * Check if n8n is available
 */
export async function checkN8NConnection(): Promise<boolean> {
  // For local development, we can't check due to CORS
  // Just check if the URL is configured
  const n8nUrl = import.meta.env.VITE_N8N_API_URL || 'http://localhost:5678/api/v1';
  return !!n8nUrl;
}