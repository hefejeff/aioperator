# Workflow Assistant – Technical Overview

## 1. Purpose
End-to-end workspace for designing, evaluating, and packaging AI-augmented business workflows (workflow text → diagram → PRD / Pitch → evaluation → version snapshots).

## 2. Architecture Summary
| Layer | Tech | Notes |
|-------|------|-------|
| UI | React + TypeScript + Vite + Tailwind | SPA, modular components |
| Auth | Firebase Auth | Email/password or provider (extendable) |
| Data | Firebase Realtime Database | Hierarchical JSON, client SDK |
| AI | Google Gemini APIs | Text generation, evaluation, diagram assist prompts |
| Diagrams | Mermaid (client render) | SVG render + PNG export via canvas |
| i18n | Custom context | English / Spanish toggle |
| Hosting | Firebase Hosting | Static asset deployment |

## 3. Core Data Paths (Realtime DB)
```
users/{uid}
scenarios/{scenarioId}
userScenarios/{uid}/{scenarioId}
evaluations/{uid}/{pushId}
prds/{uid}/{pushId}
pitches/{uid}/{pushId}
workflowVersions/{uid}/{scenarioId}/{pushId}
leaderboards/{scenarioId}/{uid}
```

## 4. Artifact Types
- Evaluation: score + feedback snapshot (not a version unless saved separately)
- PRD: Platform-specific structured markdown
- Pitch: Short narrative markdown
- Workflow Version: Immutable bundle (workflowExplanation, PRD/Pitch copies, evaluation snapshot, mermaidCode, mermaidSvg, imageBase64, imageMimeType)

## 5. Key Components
| Component | Responsibility |
|-----------|---------------|
| PublicLanding | Guest funnel & AI example generation |
| TrainingView | Scenario list (seed + user + favorites) |
| ScenarioCard | Scenario display + favorite toggle |
| OperatorConsole | Core editing + AI actions + versioning |
| AIActionsPanel (Tools & Docs) | Evaluate / Generate PRD / Pitch / Save Version / Recent Docs |
| CreateScenarioForm | User scenario creation with AI example assist |
| RightSidebar | (Optional) stats, library, tips |
| Header | Branding, language switch, auth controls |

## 6. AI Service Functions (Gemini)
Implemented in `src/services/geminiService.ts` (names may vary):
- `generateText(prompt, imagePart?, options)` – generic helper
- `generatePRD(goal, steps, mermaidCode, platform)` → structured sections → markdown
- `generateElevatorPitch(workflowText, platform)`
- `evaluateOperatorPerformance(workflowText, platform)` → { score, feedback }
- Diagram assist prompt: infers mermaid code with error correction loop

### Prompt Patterns
- Clear role framing ("You are an expert ...")
- Deterministic section headers
- JSON pre-structure for PRD before markdown transformation
- Platform contextual hints (Microsoft 365 vs Google Workspace vs Custom App vs Custom Prompt(s) vs Assistant(s) vs Combination)

## 7. Mermaid Workflow Handling
1. User/AI produces textual workflow.
2. Optional AI converts to mermaid code.
3. Render via Mermaid API (initialized once with theme overrides).
4. Inject inline styles (stroke/fill) to stabilize export.
5. Export options: keep raw SVG, convert to PNG (canvas @2x scale) → base64.

## 8. Versioning Flow
```
User edits workflow → (optional) generate PRD/Pitch → (optional) evaluate → Save Version
↓
Push node under workflowVersions/{uid}/{scenarioId}/{autoId}
```
Auto-restore: On scenario open, if editor empty, load newest version; fallback to latest standalone PRD/Pitch if version lacks them.

## 9. Favorites
`favoritedBy/{uid}: true` stored under each scenario (seed or user scenario). Client aggregates to prioritize favorites.

## 10. Security Rules (Highlights)
- Restrict write operations to `auth.uid` matching the path owner (prds, pitches, evaluations, workflowVersions).
- Allow read of seed scenarios; restrict modification except `favoritedBy` branch.
- Users can create `userScenarios/{uid}` overrides for customization.
- Role elevation: only allowed via admin path logic (client is best-effort; enforce server-side for production).

## 11. Evaluation & Leaderboards
- Each evaluation saved under `evaluations/{uid}` with scenarioId and timestamp.
- Leaderboard per scenario stores highest score per user: `leaderboards/{scenarioId}/{uid}`.
- Global aggregation done client-side (averages across scenarios) when needed.

## 12. i18n Strategy
- Translation map in `src/i18n.tsx`.
- `useTranslation()` hook returns t(key) with fallback.
- Add keys in both English & Spanish; missing key detection via console warning (optional future enhancement).

## 13. Naming Conventions
- PRD / Pitch Save Title: `Scenario Title – <Platform> – <Locale Date>`
- Filenames (download): `PRD_<PLATFORMCODE>_<YYYY-MM-DD>.md`, `Pitch_<PLATFORMCODE>_<YYYY-MM-DD>.md`
- Version Default: `Scenario Title – <Locale DateTime>` (user editable)

## 14. Error Handling Patterns
| Area | Approach |
|------|----------|
| AI calls | try/catch + user alert (TODO: toast system) |
| Firebase writes | catch & alert; permission errors logged |
| Mermaid render | capture parse errors, show inline message |
| Diagram export | fallback to alert if clipboard/write fails |

## 15. Performance Considerations
- Batch parallel fetches on scenario open (evaluations + versions + latest artifacts).
- Sort on client (small data expectation). Indexes can be added for scale (`.indexOn` scenarioId in evaluations, etc.).
- Debounce future expensive AI requests (not yet required given user-driven triggers).

## 16. Potential Improvements / Roadmap (Tech)
- Add version diff view (text + Mermaid structural diff)
- Migrate to Firestore for richer querying & indexing
- Server-side AI proxy for key secrecy + rate limiting
- Toast/notification system replacing alert()
- Offline caching layer for last-opened scenario
- Accessibility audit + automated tests

## 17. Testing Strategy (Current / Planned)
Current: Manual exploratory. Planned:
- Unit tests for mermaid transform & prompt assembly
- Integration tests (mock Gemini) for PRD generation shape
- Snapshot tests for OperatorConsole UI states

## 18. Deployment Workflow
1. Local dev: `npm run dev`
2. Build: `npm run build` (Vite outputs to `dist/`)
3. Deploy rules (if changed): `firebase deploy --only database`
4. Deploy hosting: `firebase deploy --only hosting`
5. Post-deploy smoke test: open scenario, generate PRD, save version, refresh to confirm auto-restore.

## 19. Environment Variables
`.env.local` (not committed) example:
```
VITE_GEMINI_API_KEY=sk-...
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
```
(Exact variable names depend on `firebaseConfig.ts`; keep only those actually used to avoid leaks.)

## 20. Security Hardening Ideas
- Add per-user rate limit counters for AI endpoints
- Validate mermaidCode against allowlist grammar before rendering
- Sanitize AI-generated markdown (DOMPurify) before injecting (if converting to HTML)
- Cloud Functions for privileged role changes & usage analytics

## 21. Troubleshooting Matrix
| Symptom | Likely Cause | Resolution |
|---------|--------------|-----------|
| permission_denied saving version | Missing rule or auth expired | Re-auth, redeploy `database.rules.json` |
| PRD/Pitch not restored | Version missing embedded copy | Generate, then Save Version again |
| Diagram empty | Mermaid parse error | Open diagram modal, fix syntax, re-render |
| Black/transparent PNG export | Missing background inline style | Ensure export function injects background rect |
| Favorites disappear after refresh | Write failed silently | Check console + rules for favoritedBy path |

## 22. File / Module Highlights
- `src/components/OperatorConsole.tsx`: Core editing, AI actions integration, auto-restore logic
- `src/services/firebaseService.ts`: All DB CRUD helpers
- `src/services/geminiService.ts`: AI invocation & prompt shaping
- `src/i18n.tsx`: Translation setup
- `database.rules.json`: Access control & structure

## 23. Extension Points
Hooks to add:
- `useVersionHistory(scenarioId)` – cached pagination
- `useDebouncedAiDraft(text)` – live improvement suggestions
- `useArtifactExporter()` – multi-format outputs (PDF/Docx)

## 24. Glossary
| Term | Definition |
|------|------------|
| Scenario | Workflow use case (seed or user-defined) |
| Workflow Explanation | Numbered textual process steps |
| Version Snapshot | Immutable saved bundle of current state |
| PRD | Product Requirements Document |
| Pitch | Concise value proposition |
| Mermaid | Text syntax for diagrams -> SVG |

## 25. Last Updated
2025-08-27
