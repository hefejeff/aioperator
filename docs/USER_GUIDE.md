# AI Operator Hub – User Guide

## 1. What It Does
Turn a business problem into:
- A structured workflow (text + visual diagram)
- A Product Requirements Document (PRD)
- An Elevator Pitch
- Saved versions (snapshots) you can restore later

## 2. Quick Start (New Visitor)
1. Landing page ("What’s Your Problem??"): enter domain, describe your problem, pick a target platform (Microsoft 365 / Google Workspace / Custom App / Custom Prompt(s) / Assistant(s) / Combination).
2. (Optional) View example preview → Sign up / Sign in.
3. You arrive at Home (Training / Scenario list). Pick a seed scenario or create your own.

## 3. Key Concepts
- Scenario: A use case template (or one you create).
- Workflow Explanation: Plain text steps describing how the process operates.
- Platform: Target environment (affects PRD + Pitch tone).
- Tools & Docs: Panel with AI actions (Evaluate, Pitch, PRD) + recent saved artifacts + Save Version.
- Favorites: Star scenarios to surface them first.
- Version Snapshot: Stores workflow + diagram + image + PRD + Pitch + evaluation at that moment.

## 4. Home (Scenario Catalog)
- Search / scroll scenarios.
- Domain pill (upper-left) shows business area.
- Star icon toggles favorite.
- Click a card to open the workflow console.

## 5. Creating a Scenario
1. Click “Create Scenario”.
2. Choose domain (or custom).
3. (Optional) Use AI Example to seed a problem statement.
4. Provide Title, Description (problem), Goal (target outcome).
5. Save.

## 6. Workflow Console (Operator Console)
Main Areas:
- Workflow Text Editor (top) – author or refine your process.
- Diagram Assist – generate / edit Mermaid flow diagram (optional).
- Tools & Docs (AI Actions):
  - Evaluate: AI scores and feedback.
  - Pitch: Generates editable elevator pitch; save for reuse.
  - PRD: Generates structured product doc; save for reuse.
  - Recent Docs: Quick links to latest saved Pitch / PRD.
  - Save Version: Name pre-filled (Scenario Title – Platform – Date). Stores *everything*.

## 7. Writing a Good Workflow Explanation
Keep each step concise:
1. Actor + Action + Purpose (e.g., “Agent triages ticket and labels priority”)
2. Mark AI vs Human decision points clearly (improves evaluation clarity).
3. End with measurable outcome (e.g., “Ticket resolved or escalated”).

## 8. Generating / Editing the Diagram
- Provide or refine Workflow Explanation first.
- Use AI Diagram generation if enabled, or paste Mermaid syntax.
- Toggle layout (TD or LR) if available.
- Export diagram if needed (PNG/SVG) from the diagram modal.

## 9. AI Actions (Tools & Docs)
Buttons disabled until you have workflow text.
- Evaluate: Returns score + feedback (improve steps then re-run).
- Pitch: Short narrative; edit before saving.
- PRD: Detailed sections (scope, actors, requirements, risks, metrics) tailored to platform.

Saved artifacts:
- After saving a Pitch or PRD, a link appears under Recent Docs for quick reopen.

## 10. Saving Versions
Use “Save Version” after meaningful changes:
Captured:
- Workflow text
- PRD + Pitch (if generated)
- Evaluation score / feedback (if run)
- Diagram code + SVG + uploaded image (if any)
Restoring: Opening a scenario auto-loads the most recent version if the editor is empty.

## 11. History (Past Evaluations)
- List shows prior evaluations.
- Clicking an item loads its workflow into the editor (creates a new version only when you explicitly Save Version or re-run AI actions + save).

## 12. Favorites
- Click the star on any scenario card.
- Favorites float to the top of Home.

## 13. Multi‑Language (English / Spanish)
- Change language in the header.
- Scenario creation auto-translates baseline templates.
- All main UI text reflected instantly.

## 14. Naming Conventions
- Saved PRDs / Pitches: Scenario Title – Platform – Date.
- Version Title: Edit before confirm (default: Scenario Title – Local Date/Time).
- Downloaded Filenames: PRD_<PlatformCode>_<YYYY-MM-DD>.md, Pitch_<PlatformCode>_<YYYY-MM-DD>.md

## 15. Images
- Optional workflow image upload (e.g., reference diagram).
- Included in each saved version snapshot.

## 16. Restoring Your Work
When reopening a scenario:
1. App checks latest workflow version (primary restore).
2. If missing embedded PRD/Pitch, it loads latest individual saved PRD/Pitch.

## 17. Troubleshooting
| Issue | Fix |
| ----- | ---- |
| Buttons disabled | Add Workflow Explanation text first |
| Diagram missing colors | Re-generate or ensure valid Mermaid syntax |
| Can’t save version | Ensure you are signed in; refresh if session expired |
| PRD/Pitch empty on reopen | Generate again then Save Version to embed |
| Favorite not sticking | Temporary network issue; retry (star outlines when inactive) |

## 18. Privacy & Data
Your saved artifacts (PRDs, Pitches, Versions, Evaluations) are private to your account. Public users cannot see internal content until they sign up.

## 19. Good Practices
- Evaluate after each major workflow revision.
- Save Version before drastically changing steps.
- Use Pitch for stakeholder quick buy‑in; PRD for implementation alignment.
- Keep domain accurate (improves AI context).

## 20. Glossary
- PRD: Product Requirements Document.
- Elevator Pitch: 1–3 sentence value proposition.
- Mermaid: Text-based diagram syntax used for flow charts.
- Snapshot / Version: A frozen bundle of current state.

## 21. Roadmap (Visible to Users – Optional)
- Version history browser
- Compare two versions (diff)
- Export to task trackers (Jira/Azure DevOps)
- Multi-platform PRD generation (side-by-side)

## 22. Support
If something breaks:
1. Refresh page.
2. Sign out / back in.
3. Rebuild diagram or rerun AI action.
4. Report issue with scenario name + timestamp.

_Last updated: 2025-08-27_
