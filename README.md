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
1. Add your `OPENAI_API_KEY` to `.env.local`
2. Create assistants at https://platform.openai.com/assistants
3. The app will automatically list your available assistants in the chat sidebar


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
