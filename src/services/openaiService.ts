/**
 * OpenAI Agents SDK Service
 * Handles communication with OpenAI Agents (from Agent Builder)
 */

import OpenAI from 'openai';
import { CUSTOM_AGENTS } from '../config/agents';

interface OpenAIMessage {
  role: 'user' | 'assistant';
  content: string;
}

// Initialize OpenAI client
const getOpenAIClient = () => {
  const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
  
  if (!apiKey) {
    throw new Error('OpenAI API key not configured');
  }

  return new OpenAI({
    apiKey,
    dangerouslyAllowBrowser: true, // Required for client-side usage
  });
};

/**
 * Send a message to an OpenAI Agent using the standard OpenAI SDK
 */
export async function sendMessageToAssistant(
  agentId: string,
  userMessage: string,
  conversationHistory: OpenAIMessage[]
): Promise<string> {
  try {
    const client = getOpenAIClient();

    // Build messages array
    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
      ...conversationHistory.map(msg => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
      })),
      {
        role: 'user' as const,
        content: userMessage,
      },
    ];

    // For Agent Builder workflows (starting with wf_), use chat completions
    // with the workflow reference
    if (agentId.startsWith('wf_')) {
      console.log('Sending message to workflow:', agentId);
      
      // Use chat completions API with workflow metadata
      const response = await client.chat.completions.create({
        model: 'gpt-4o', // Agent Builder uses latest model
        messages,
        // Note: Workflow metadata might need to be passed differently
        // This is experimental - OpenAI's Agent Builder API is still evolving
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No response from agent');
      }

      return content;
    } 
    // For assistants (asst_*), use the Assistants API
    else if (agentId.startsWith('asst_')) {
      console.log('Sending message to assistant:', agentId);
      
      // Create a thread
      const thread = await client.beta.threads.create();
      
      // Add all messages to the thread
      for (const msg of messages) {
        await client.beta.threads.messages.create(thread.id, {
          role: msg.role as 'user' | 'assistant',
          content: msg.content as string,
        });
      }

      // Run the assistant
      const run = await client.beta.threads.runs.createAndPoll(thread.id, {
        assistant_id: agentId,
      });

      if (run.status === 'completed') {
        const threadMessages = await client.beta.threads.messages.list(thread.id);
        const lastMessage = threadMessages.data[0];
        
        if (lastMessage.content[0].type === 'text') {
          return lastMessage.content[0].text.value;
        }
      }

      throw new Error(`Assistant run failed with status: ${run.status}`);
    }
    // For fine-tuned models (ft:*), use as model directly
    else {
      const response = await client.chat.completions.create({
        model: agentId,
        messages,
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No response from model');
      }

      return content;
    }
  } catch (error) {
    console.error('OpenAI Agent error:', error);
    throw new Error('Failed to get response from OpenAI Agent');
  }
}

/**
 * List available OpenAI Agents and Assistants using the SDK
 */
export async function listAssistants(): Promise<Array<{
  id: string;
  name: string;
  description: string;
  model: string;
  domainPk?: string;
}>> {
  const agents: Array<{
    id: string;
    name: string;
    description: string;
    model: string;
    domainPk?: string;
  }> = [];

  try {
    const client = getOpenAIClient();

    // Try to list fine-tuned models (which might include agents)
    try {
      const models = await client.models.list();
      console.log('All models:', models.data);
      
      // Filter for user-owned or fine-tuned models
      models.data.forEach(model => {
        if (model.id.startsWith('ft:') || 
            (model.owned_by !== 'openai' && 
             model.owned_by !== 'system' && 
             model.owned_by !== 'openai-dev' &&
             model.owned_by !== 'openai-internal')) {
          agents.push({
            id: model.id,
            name: model.id.replace('ft:', '').replace(/-/g, ' '),
            description: `Fine-tuned model - ${model.owned_by}`,
            model: model.id,
          });
        }
      });
    } catch (error) {
      console.warn('Could not list models:', error);
    }

    // List assistants from OpenAI
    try {
      const assistants = await client.beta.assistants.list();
      console.log('Found assistants:', assistants.data);
      
      assistants.data.forEach(assistant => {
        agents.push({
          id: assistant.id,
          name: assistant.name || 'Unnamed Assistant',
          description: assistant.description || assistant.instructions?.substring(0, 100) || 'OpenAI Assistant',
          model: assistant.model,
        });
      });
    } catch (error) {
      console.warn('Could not list assistants:', error);
    }

    // Note: Agent Builder workflows (wf_*) are not accessible via public API
    // They must be configured in src/config/agents.ts with domain_pk
    
    console.log('Adding custom agents from config:', CUSTOM_AGENTS);
    
    // Add custom configured agents (including Agent Builder workflows)
    CUSTOM_AGENTS.forEach(agent => {
      if (!agents.find(a => a.id === agent.id)) {
        const configuredAgent = {
          id: agent.id,
          name: agent.name,
          description: agent.description,
          model: agent.model || 'gpt-4o',
          domainPk: agent.domainPk,
        };
        console.log('Adding configured agent:', configuredAgent);
        agents.push(configuredAgent);
      }
    });

    console.log('Final agent list:', agents);
    return agents;
  } catch (error) {
    console.error('Error listing agents:', error);
    return [];
  }
}
