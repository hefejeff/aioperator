<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/1s96r2IfCyZ-naByeplaGn-_8AgKgmjF2

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Copy `.env.example` to `.env.local` and configure:
   - `API_KEY` - Your Gemini API key (required)
   - `OPENAI_API_KEY` - Your OpenAI API key (optional, for custom AI agents)
   - Firebase configuration variables (required)
   - `VITE_GAMMA_API_KEY` - Gamma AI API key (optional, for presentation generation)
3. Run the app:
   `npm run dev`

## Features

### AI Chat Interface
- Full-screen ChatGPT-style interface
- Switch between default Gemini AI and custom OpenAI Assistants
- Support for personal OpenAI agents in the right sidebar
- Press ESC to close, Enter to send, Shift+Enter for new lines

### Custom AI Agents
To use your own OpenAI Assistants:
1. Add your `VITE_OPENAI_API_KEY` to `.env.local`
2. Create assistants at https://platform.openai.com/assistants
3. The app will automatically list your available assistants in the chat sidebar

### Agent Builder Workflows with ChatKit
To use OpenAI Agent Builder workflows:
1. Add your `VITE_OPENAI_API_KEY` to `.env.local`
2. Create your workflow at https://platform.openai.com/agents
3. Add the workflow to `src/config/agents.ts` with:
   - Workflow ID (starts with `wf_`)
   - Domain PK (starts with `domain_pk_`)
4. The workflow will appear in the chat sidebar and use ChatKit for the interface

### n8n Workflow Integration
Export workflows to n8n for automation:
1. In the Operator Console, generate an n8n workflow from your automation steps
2. Click "Download for n8n" to save the workflow JSON file
3. Open n8n at http://localhost:5678
4. Click "Workflows" → "Import from File" → Select the downloaded JSON
5. Your workflow is ready to customize with all steps, AI integrations, and human approval nodes configured!


## Contributor notes

- See CHATGPT_INSTRUCTIONS.md for concise guidance on using ChatGPT and LLMs with this repo.

## User Guide

For end‑user instructions (scenarios, workflow design, AI actions, saving versions) see: [User Guide](./docs/USER_GUIDE.md)

## Generate a PRD from your workflow

- In Operator Console, write your numbered steps and optionally build a Mermaid flowchart (AI Diagram Assist can help).
- Under "Generate PRD":
   - Choose a platform: Microsoft 365, Google Workspace, Custom App, Custom Prompt(s), Assistant(s), or Combination.
   - Click "Generate PRD" to create a platform-tailored Product Requirements Document.
- In the PRD preview modal, you can copy the Markdown or download it as a .md file.
