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
  conversationHistory: OpenAIMessage[],
  images?: string[],
  files?: Array<{ name: string; type: string; data: string }>
): Promise<string> {
  try {
    const client = getOpenAIClient();

    // Build messages array with multimodal content support
    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = conversationHistory.map(msg => ({
      role: msg.role as 'user' | 'assistant',
      content: msg.content,
    }));

    // Build the current user message with attachments
    let userContent: string | Array<OpenAI.Chat.ChatCompletionContentPart> = userMessage;
    
    if ((images && images.length > 0) || (files && files.length > 0)) {
      const contentParts: OpenAI.Chat.ChatCompletionContentPart[] = [
        { type: 'text', text: userMessage }
      ];
      
      // Add images as base64 data URLs (supported by gpt-4o and gpt-4-turbo)
      if (images && images.length > 0) {
        images.forEach(imageData => {
          // OpenAI accepts base64 data URLs in this format
          contentParts.push({
            type: 'image_url',
            image_url: {
              url: imageData, // data:image/png;base64,iVBORw0KG...
            }
          });
        });
      }
      
      // Add text from files (OpenAI Chat API doesn't support file uploads, only Assistants API)
      if (files && files.length > 0) {
        files.forEach(file => {
          if (file.type.includes('text') || file.type.includes('json') || file.type.includes('csv')) {
            const matches = file.data.match(/^data:[^;]+;base64,(.+)$/);
            if (matches) {
              try {
                const decodedContent = atob(matches[1]);
                contentParts.push({
                  type: 'text',
                  text: `\n\n[File: ${file.name}]\n${decodedContent}`
                });
              } catch (e) {
                contentParts.push({
                  type: 'text',
                  text: `\n\n[File: ${file.name} - could not read content]`
                });
              }
            }
          } else {
            contentParts.push({
              type: 'text',
              text: `\n\n[Attached file: ${file.name} (${file.type})]`
            });
          }
        });
      }
      
      userContent = contentParts;
    }

    messages.push({
      role: 'user' as const,
      content: userContent,
    });

    // For Agent Builder workflows (starting with wf_), use chat completions
    // with the workflow reference
    if (agentId.startsWith('wf_')) {
      console.log('Sending message to workflow:', agentId);
      
      try {
        // Use chat completions API with workflow metadata
        const response = await client.chat.completions.create({
          model: 'gpt-4o', // Agent Builder uses latest model
          messages,
        });

        const content = response.choices[0]?.message?.content;
        if (!content) {
          throw new Error('No response from agent');
        }

        return content;
      } catch (error: any) {
        // If vision content fails, retry without images
        if (error?.status === 400 && (images && images.length > 0)) {
          console.warn('Vision content not supported, retrying without images');
          const textOnlyMessages = messages.map(msg => ({
            ...msg,
            content: typeof msg.content === 'string' ? msg.content : 
              (msg.content as any[]).find((p: any) => p.type === 'text')?.text || ''
          }));
          
          const response = await client.chat.completions.create({
            model: 'gpt-4o',
            messages: textOnlyMessages as any,
          });

          const content = response.choices[0]?.message?.content;
          if (!content) {
            throw new Error('No response from agent');
          }

          return `(Note: Images were attached but couldn't be processed by this agent)\n\n${content}`;
        }
        throw error;
      }
    } 
    // For assistants (asst_*), use the Assistants API
    else if (agentId.startsWith('asst_')) {
      console.log('Sending message to assistant:', agentId);
      
      // Create a thread
      const thread = await client.beta.threads.create();
      
      // Add conversation history to the thread
      for (let i = 0; i < conversationHistory.length; i++) {
        const msg = conversationHistory[i];
        await client.beta.threads.messages.create(thread.id, {
          role: msg.role as 'user' | 'assistant',
          content: msg.content,
        });
      }

      // Upload files if provided (Assistants API supports file uploads)
      const fileIds: string[] = [];
      const imageFileIds: string[] = [];
      
      // Upload both regular files and images
      if (files && files.length > 0) {
        for (const file of files) {
          try {
            // Convert base64 data URL to File object
            const matches = file.data.match(/^data:([^;]+);base64,(.+)$/);
            if (matches) {
              const mimeType = matches[1];
              const base64Data = matches[2];
              const binaryData = atob(base64Data);
              const bytes = new Uint8Array(binaryData.length);
              for (let i = 0; i < binaryData.length; i++) {
                bytes[i] = binaryData.charCodeAt(i);
              }
              const blob = new Blob([bytes], { type: mimeType });
              const fileObj = new File([blob], file.name, { type: mimeType });
              
              // Upload to OpenAI
              const uploadedFile = await client.files.create({
                file: fileObj,
                purpose: 'assistants',
              });
              
              fileIds.push(uploadedFile.id);
            }
          } catch (error) {
            console.warn('Failed to upload file:', file.name, error);
          }
        }
      }
      
      // Upload images as files for Assistants API (vision support)
      if (images && images.length > 0) {
        for (let i = 0; i < images.length; i++) {
          const imageData = images[i];
          try {
            const matches = imageData.match(/^data:([^;]+);base64,(.+)$/);
            if (matches) {
              const mimeType = matches[1];
              const base64Data = matches[2];
              const binaryData = atob(base64Data);
              const bytes = new Uint8Array(binaryData.length);
              for (let j = 0; j < binaryData.length; j++) {
                bytes[j] = binaryData.charCodeAt(j);
              }
              const blob = new Blob([bytes], { type: mimeType });
              const extension = mimeType.split('/')[1] || 'png';
              const fileObj = new File([blob], `image_${i}.${extension}`, { type: mimeType });
              
              // Upload to OpenAI
              const uploadedFile = await client.files.create({
                file: fileObj,
                purpose: 'vision',
              });
              
              imageFileIds.push(uploadedFile.id);
            }
          } catch (error) {
            console.warn('Failed to upload image:', error);
          }
        }
      }

      // Create message content
      const messageParams: any = {
        role: 'user' as const,
        content: userMessage,
      };
      
      // Add attachments with appropriate tools
      if (fileIds.length > 0 || imageFileIds.length > 0) {
        const attachments: Array<{ file_id: string; tools: Array<{ type: string }> }> = [];
        
        // Document files use file_search
        fileIds.forEach(id => {
          attachments.push({
            file_id: id,
            tools: [{ type: 'file_search' }]
          });
        });
        
        // Image files use code_interpreter (vision support)
        imageFileIds.forEach(id => {
          attachments.push({
            file_id: id,
            tools: [{ type: 'code_interpreter' }]
          });
        });
        
        if (attachments.length > 0) {
          messageParams.attachments = attachments;
        }
      }
      
      await client.beta.threads.messages.create(thread.id, messageParams);

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
      try {
        const response = await client.chat.completions.create({
          model: agentId,
          messages,
        });

        const content = response.choices[0]?.message?.content;
        if (!content) {
          throw new Error('No response from model');
        }

        return content;
      } catch (error: any) {
        // If vision content fails, retry without images
        if (error?.status === 400 && (images && images.length > 0)) {
          console.warn('Vision content not supported for this model, retrying without images');
          const textOnlyMessages = messages.map(msg => ({
            ...msg,
            content: typeof msg.content === 'string' ? msg.content : 
              (msg.content as any[]).find((p: any) => p.type === 'text')?.text || ''
          }));
          
          const response = await client.chat.completions.create({
            model: agentId,
            messages: textOnlyMessages as any,
          });

          const content = response.choices[0]?.message?.content;
          if (!content) {
            throw new Error('No response from model');
          }

          return `(Note: Images were attached but couldn't be processed by this model)\n\n${content}`;
        }
        throw error;
      }
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
