import type { Node, Connection } from 'n8n-workflow';

export interface WorkflowStep {
  id: string;
  label: string;
  actor: 'human' | 'ai';
  index: number;
}

export interface N8NWorkflow {
  name: string;
  nodes: Node[];
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
): Node {
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
export function calculateNodePosition(index: number, totalSteps: number): [number, number] {
  // Start from left to right with some spacing
  const xSpacing = 300;
  const ySpacing = 200;
  
  // For simple linear workflows, just space them horizontally
  return [index * xSpacing + 100, 300];
}

/**
 * Create a webhook node for user input
 */
export function createWebhookNode(id: string, name: string, position: [number, number], path: string): Node {
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
): Node {
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
): Node {
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
): Node {
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