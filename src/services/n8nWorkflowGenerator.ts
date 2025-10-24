import { parseWorkflowSteps, type N8NWorkflow, type N8NNode } from './n8nService';
import {
  AI_ANALYSIS_NODE_TEMPLATE,
  WEBHOOK_INPUT_NODE_TEMPLATE,
  HUMAN_APPROVAL_NODE_TEMPLATE,
  ERROR_HANDLING_FUNCTION_TEMPLATE,
  API_RESPONSE_TEMPLATE,
  DATA_TRANSFORM_FUNCTION_TEMPLATE,
  NOTIFICATION_NODE_TEMPLATE
} from './n8nTemplates';

interface NodeConfig {
  id: string;
  name: string;
  type: string;
  position: [number, number];
  parameters?: Record<string, any>;
}

interface WorkflowGenerationOptions {
  platform?: 'MS 365' | 'Google' | 'Assistant' | 'Custom' | 'Combo' | 'Prompt';
  approach?: 'Automated' | 'Hybrid' | 'Assisted';
}

/**
 * Generate an N8N workflow from a text description with platform and approach options
 */
export function generateN8NWorkflow(workflowExplanation: string, options: WorkflowGenerationOptions = {}): N8NWorkflow {
  // Parse steps from the explanation
  const steps = parseWorkflowSteps(workflowExplanation);
  if (!steps.length) {
    throw new Error('No workflow steps found in explanation');
  }

  const nodes: Array<NodeConfig & { parameters: Record<string, any> }> = [];
  const connections: Record<string, { main: Array<Array<{ node: string; type: string; index: number }>> }> = {};

  // Add initial webhook for workflow trigger with platform context
  const triggerNode = {
    ...WEBHOOK_INPUT_NODE_TEMPLATE,
    id: 'workflow_trigger',
    name: `Workflow Trigger (${options.platform || 'Generic'})`,
    type: 'n8n-nodes-base.webhook',
    position: [100, 300] as [number, number],
    parameters: {
      ...WEBHOOK_INPUT_NODE_TEMPLATE.parameters,
      // Add platform and approach metadata
      additionalFields: {
        platform: options.platform || 'Generic',
        approach: options.approach || 'Automated'
      }
    }
  };
  nodes.push(triggerNode);
  
  let previousNodeId = triggerNode.id;
  let xPos = 400;
  const yPos = 300;

  // Process each step
  steps.forEach((step) => {
    const currentNodeId = step.id;

    // Create nodes based on step type
    if (step.actor === 'ai') {
      // Determine the appropriate AI integration based on platform
      const aiNodeType = options.platform === 'Assistant' ? 'n8n-nodes-base.openAi' : 'n8n-nodes-base.httpRequest';
      const aiNodeTemplate = options.platform === 'Assistant' 
        ? {
            ...AI_ANALYSIS_NODE_TEMPLATE,
            parameters: {
              ...AI_ANALYSIS_NODE_TEMPLATE.parameters,
              model: 'gpt-4-turbo',
              // Add Assistant-specific configuration
              systemMessage: `You are an AI assistant helping with ${options.platform} automation workflows.`
            }
          }
        : AI_ANALYSIS_NODE_TEMPLATE;

      // AI step - Create AI analysis node
      nodes.push({
        ...aiNodeTemplate,
        id: `${currentNodeId}_ai`,
        name: `AI Analysis: ${step.label} (${options.platform || 'Generic'})`,
        type: aiNodeType,
        position: [xPos, yPos] as [number, number]
      });

      // Add transform node to process AI response with platform-specific logic
      const transformCode = options.platform ? 
        `// Platform-specific transformation for ${options.platform}\n` +
        `const inputData = $input.first().json;\n\n` +
        `return [{\n` +
        `  json: {\n` +
        `    ...inputData,\n` +
        `    platform: '${options.platform}',\n` +
        `    transformed: true,\n` +
        `    timestamp: new Date().toISOString()\n` +
        `  }\n` +
        `}];`
        : DATA_TRANSFORM_FUNCTION_TEMPLATE.parameters.functionCode;

      nodes.push({
        ...DATA_TRANSFORM_FUNCTION_TEMPLATE,
        id: `${currentNodeId}_transform`,
        name: `Process AI Response: ${step.label} (${options.platform || 'Generic'})`,
        type: 'n8n-nodes-base.function',
        position: [xPos + 200, yPos] as [number, number],
        parameters: {
          functionCode: transformCode
        }
      });

      // Connect nodes
      connections[previousNodeId] = {
        main: [[{ node: `${currentNodeId}_ai`, type: 'main', index: 0 }]]
      };
      connections[`${currentNodeId}_ai`] = {
        main: [[{ node: `${currentNodeId}_transform`, type: 'main', index: 0 }]]
      };
      
      previousNodeId = `${currentNodeId}_transform`;
    } else {
      // Human step - Create platform-specific notification and approval nodes
      const notificationType = options.platform === 'MS 365' ? 'n8n-nodes-base.microsoftTeams' :
                             options.platform === 'Google' ? 'n8n-nodes-base.gmail' :
                             'n8n-nodes-base.httpRequest';

      // Configure notification based on platform and approach
      const notificationConfig = {
        ...NOTIFICATION_NODE_TEMPLATE,
        parameters: {
          ...NOTIFICATION_NODE_TEMPLATE.parameters,
          // Add platform-specific notification settings
          bodyParametersJson: {
            ...NOTIFICATION_NODE_TEMPLATE.parameters.bodyParametersJson,
            platform: options.platform || 'Generic',
            approach: options.approach || 'Automated',
            requiresAction: options.approach === 'Hybrid' || options.approach === 'Assisted'
          }
        }
      };

      nodes.push({
        ...notificationConfig,
        id: `${currentNodeId}_notify`,
        name: `Notify Human: ${step.label} (${options.platform || 'Generic'})`,
        type: notificationType,
        position: [xPos, yPos] as [number, number]
      });

      // Only add approval node for Hybrid or Assisted approaches
      if (options.approach === 'Hybrid' || options.approach === 'Assisted') {
        nodes.push({
          ...HUMAN_APPROVAL_NODE_TEMPLATE,
          id: `${currentNodeId}_approval`,
          name: `Human Approval: ${step.label} (${options.platform || 'Generic'})`,
          type: 'n8n-nodes-base.webhook',
          position: [xPos + 200, yPos] as [number, number],
          parameters: {
            ...HUMAN_APPROVAL_NODE_TEMPLATE.parameters,
            path: `workflow/approve/${currentNodeId}`,
            additionalFields: {
              platform: options.platform || 'Generic',
              approach: options.approach
            }
          }
        });
      }

      // Connect nodes
      connections[previousNodeId] = {
        main: [[{ node: `${currentNodeId}_notify`, type: 'main', index: 0 }]]
      };
      if (options.approach === 'Hybrid' || options.approach === 'Assisted') {
        connections[`${currentNodeId}_notify`] = {
          main: [[{ node: `${currentNodeId}_approval`, type: 'main', index: 0 }]]
        };
        previousNodeId = `${currentNodeId}_approval`;
      } else {
        previousNodeId = `${currentNodeId}_notify`;
      }
    }

    // Update x position for next step
    xPos += 400;
  });

  // Add final response node
  const responseNode = {
    ...API_RESPONSE_TEMPLATE,
    id: 'workflow_response',
    name: 'Final Response',
    type: 'n8n-nodes-base.respondToWebhook',
    position: [xPos, yPos] as [number, number]
  };
  nodes.push(responseNode);
  
  // Connect final step to response
  connections[previousNodeId] = {
    main: [[{ node: 'workflow_response', type: 'main', index: 0 }]]
  };

  // Add error handling node that catches all errors
  const errorNode = {
    ...ERROR_HANDLING_FUNCTION_TEMPLATE,
    id: 'error_handler',
    name: 'Error Handler',
    type: 'n8n-nodes-base.function',
    position: [xPos, yPos + 200] as [number, number]
  };
  nodes.push(errorNode);

  return {
    name: 'Generated Workflow',
    nodes: nodes as unknown as N8NNode[],
    connections,
    settings: {
      saveExecutionProgress: true,
      executionOrder: 'v1'
    },
    tags: [
      { name: 'generated' },
      { name: 'workflow' },
    ]
  };
}

/**
 * Generate Mermaid diagram from N8N workflow
 */
export function workflowToMermaid(workflow: N8NWorkflow): string {
  const lines: string[] = [
    'graph LR',
    'classDef ai fill:#bfdbfe,stroke:#1d4ed8,color:#111827,stroke-width:2px',
    'classDef human fill:#fde68a,stroke:#b45309,color:#111827,stroke-width:2px'
  ];

  // Add nodes
  workflow.nodes.forEach(node => {
    const id = node.id.replace(/[^a-zA-Z0-9]/g, '_');
    const label = node.name.replace(/[[\]]/g, '');
    
    // Determine node class based on type/name
    let nodeClass = '';
    if (node.name.toLowerCase().includes('ai')) {
      nodeClass = ':::ai';
    } else if (node.name.toLowerCase().includes('human')) {
      nodeClass = ':::human';
    }

    lines.push(`${id}["${label}"]${nodeClass}`);
  });

  // Add connections
  Object.entries(workflow.connections).forEach(([fromId, conn]) => {
    conn.main?.forEach(mainArr => {
      mainArr.forEach(({ node: toId }) => {
        const fromClean = fromId.replace(/[^a-zA-Z0-9]/g, '_');
        const toClean = toId.replace(/[^a-zA-Z0-9]/g, '_');
        lines.push(`${fromClean} --> ${toClean}`);
      });
    });
  });

  return lines.join('\n');
}

/**
 * Convert N8N workflow to a simplified text description
 */
export function workflowToText(workflow: N8NWorkflow): string {
  const steps: string[] = [];
  let currentNode = workflow.nodes.find(n => n.type === 'n8n-nodes-base.webhook' && n.name === 'Workflow Trigger');
  
  while (currentNode) {
    const name = currentNode.name.replace(/^(AI Analysis: |Human Approval: |Process AI Response: |Notify Human: )/, '');
    if (!name.includes('Trigger') && !name.includes('Response')) {
      const type = currentNode.name.toLowerCase().includes('ai') ? '(AI)' : '(Human)';
      steps.push(`${name} ${type}`);
    }
    
    // Find next connected node
    const connections = workflow.connections[currentNode.id]?.main?.[0] || [];
    const nextNodeId = connections[0]?.node;
    currentNode = workflow.nodes.find(n => n.id === nextNodeId);
  }

  return steps.map((step, i) => `Step ${i + 1}: ${step}`).join('\n');
}