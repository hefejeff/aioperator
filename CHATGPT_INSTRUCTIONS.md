# ChatGPT Instructions – Workflow Assistant

Purpose
- Provide clear, project-specific guidance for using ChatGPT (and similar LLMs) when editing or extending this repo.

Project snapshot
- Stack: React + TypeScript + Vite + Tailwind CSS
- State/backend: Firebase (Auth/Firestore/Storage) via `src/services/firebaseService.ts`
- LLM: Google Gemini via `@google/genai` in `src/services/geminiService.ts`
- App code lives under `src/` (treat `src/` as source of truth when duplicates exist at root)

Tone and response style
- Be concise, actionable, and impersonal. Avoid fluff. Prefer bullet lists and short paragraphs.
- Default to Markdown with minimal formatting; tables only when they add clear value.
- When code edits are requested, produce complete, runnable changes touching all necessary files.

Editing rules and conventions
- Prefer editing files under `src/`:
  - UI: `src/components/*`, entry points `src/App.tsx`, `src/index.tsx`.
  - Services: `src/services/*` for Firebase/LLM calls.
  - Types/constants: `src/types.ts`, `src/constants.tsx`.
- Keep public APIs stable unless refactoring across all usages.
- TypeScript strictness: add/maintain types; avoid `any` unless justified.
- Styling: Tailwind-first; avoid inline styles unless dynamic.
- Do not hardcode secrets. Use environment variables and existing config patterns.

LLM usage guidelines
- For Gemini calls, route changes through `src/services/geminiService.ts`.
- If introducing new model behaviors, prefer configurable "system" text and keep prompts in code or a dedicated `prompts/` folder.
- Include minimal guardrails in prompts (safety, refusal criteria, JSON schemas where applicable).

Firebase guidelines
- Use the existing service layer for reads/writes; avoid direct SDK calls in components.
- Validate inputs, handle errors gracefully, and surface user-friendly messages.

Testing and verification
- At minimum, ensure TypeScript builds and app renders. Lint for obvious issues.
- For public behavior changes, add small usage notes to `README.md`.

Security and privacy
- Never commit API keys or credentials. Redact user data from logs.
- Respect roles and permissions; don’t escalate client-side.

Common prompt patterns
- Fix a bug
  - Inputs: file(s) with error, stack trace, expected behavior.
  - Output: precise diff(s), brief rationale, and verification notes.
- Add a UI feature
  - Inputs: user flow, acceptance criteria, where it lives in the UI.
  - Output: component(s) + wiring (state, services), minimal styling with Tailwind, and smoke test notes.
- Extend LLM evaluation
  - Inputs: target behavior, schema shape, scoring rubric.
  - Output: updated `geminiService` function with `responseSchema`, clear system prompt, and error handling.

Project-specific heuristics
- Duplicate root files exist (historical). Prefer `src/` versions.
- Keep component responsibilities narrow; push IO/logic into services.
- Favor small, composable components and explicit props.

Definition of done
- Build passes, no type errors, and the feature is navigable from existing views.
- Docs updated if behavior or usage changed.
