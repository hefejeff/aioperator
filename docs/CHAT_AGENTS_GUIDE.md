# AI Chat & Custom Agents Guide

## Overview
The AI Chat interface provides a full-screen ChatGPT-style experience with support for both default Gemini AI and custom OpenAI Assistants.

## Features

### Full-Screen Chat Interface
- Click the chat icon in the header to open
- Clean, distraction-free full-screen layout
- Keyboard shortcuts:
  - **Enter**: Send message
  - **Shift+Enter**: New line in message
  - **ESC**: Close chat

### AI Agent Sidebar
- Toggle sidebar with the menu button in chat header
- Lists all available AI agents:
  - Default Gemini AI (always available)
  - Your custom OpenAI Assistants
- Click any agent to switch context
- Conversation resets when switching agents

## Setting Up Custom OpenAI Agents

### Prerequisites
1. OpenAI Platform account (https://platform.openai.com)
2. OpenAI API key with Assistants API access

### Configuration Steps

1. **Add OpenAI API Key**
   - Copy `.env.example` to `.env.local`
   - Add your OpenAI API key:
     ```
     OPENAI_API_KEY=sk-proj-...your_key_here...
     ```

2. **Create Assistants in OpenAI**
   - Go to https://platform.openai.com/assistants
   - Click "Create"
   - Configure your assistant:
     - **Name**: Display name (e.g., "Business Strategist")
     - **Instructions**: System prompt defining behavior
     - **Model**: Choose GPT model (gpt-4, gpt-4-turbo, etc.)
     - **Tools**: Enable code interpreter, file search, etc.
   - Save the assistant

3. **Restart the App**
   - The app automatically loads your assistants on startup
   - They'll appear in the chat sidebar

### Example Assistant Configurations

#### Business Strategist
```
Name: Business Strategist
Model: gpt-4-turbo
Instructions: You are an expert business strategist with 20+ years of experience. 
You help with market analysis, business planning, competitive research, and strategic 
decision-making. Always provide data-driven insights and actionable recommendations.
```

#### Technical Architect
```
Name: Technical Architect
Model: gpt-4-turbo
Instructions: You are a senior software architect specializing in system design, 
cloud architecture, and scalable solutions. You provide detailed technical guidance, 
architecture diagrams, and best practices for building robust systems.
```

#### Marketing Specialist
```
Name: Marketing Specialist
Model: gpt-4
Instructions: You are a marketing expert focused on digital marketing, content strategy, 
and brand development. You help create marketing plans, analyze campaigns, and develop 
compelling content strategies.
```

## Usage Tips

### Switching Between Agents
- Each agent maintains its own conversation context
- Switching agents starts a fresh conversation
- Use different agents for different types of questions

### Best Practices
1. **Be specific**: Provide context and details in your questions
2. **Use the right agent**: Match your question to the agent's specialty
3. **Iterate**: Refine your questions based on responses
4. **Save important info**: Copy responses before switching agents

### Default AI (Gemini)
- Free to use (with Gemini API key)
- Great for general questions
- Fast response times
- Good for quick lookups and general assistance

### OpenAI Assistants
- Requires paid OpenAI API access
- More specialized based on your configuration
- Can use tools (code interpreter, file search)
- Maintains longer context windows

## API Costs

### Gemini API
- Free tier available
- Generous quotas for most use cases
- Configure at: https://ai.google.dev

### OpenAI Assistants API
- Pay-per-use pricing
- Costs vary by model:
  - GPT-4 Turbo: ~$0.01/1K tokens (input), ~$0.03/1K tokens (output)
  - GPT-4: ~$0.03/1K tokens (input), ~$0.06/1K tokens (output)
  - GPT-3.5 Turbo: ~$0.0005/1K tokens (input), ~$0.0015/1K tokens (output)
- Check current pricing: https://openai.com/pricing

## Troubleshooting

### Agents Not Loading
1. Verify `OPENAI_API_KEY` in `.env.local`
2. Check browser console for errors
3. Ensure API key has Assistants API access
4. Restart the development server

### Slow Responses
- OpenAI Assistants can take 2-10 seconds
- Check OpenAI API status: https://status.openai.com
- Consider using GPT-3.5 Turbo for faster responses

### Error Messages
- "OpenAI API key not configured": Add key to `.env.local`
- "Failed to create thread": Check API key permissions
- "Assistant run failed": Check assistant configuration in OpenAI dashboard

## Security Notes

- API keys are stored in `.env.local` (never commit this file)
- OpenAI calls are made client-side (consider server-side proxy for production)
- All conversations are ephemeral (not stored)
- No conversation history is sent to servers

## Future Enhancements

Planned features:
- [ ] Conversation history persistence
- [ ] Agent creation from UI
- [ ] File upload support for assistants with file search
- [ ] Code execution results display
- [ ] Multi-agent conversations
- [ ] Export conversation as markdown
