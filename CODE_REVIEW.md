# Code Review Guide

A concise, repeatable checklist to keep changes safe, consistent, and easy to ship for this React + TypeScript + Vite + Firebase project.

## Goals
- Catch bugs and regressions early
- Protect security, privacy, and Firebase rules integrity
- Maintain UX quality (accessibility, i18n, performance)
- Keep the repo coherent (types, style, docs)

## Reviewer Quick Checklist
- Scope and clarity
  - PR title and description explain the problem and the solution
  - Screenshots/GIFs for UI changes; sample data when relevant
- Build health
  - Type-checks pass (tsc)
  - App builds (vite build)
- Tests and verification
  - Critical logic covered or manually verified
  - For diagram export or DB writes, verify happy path + 1 edge case
- Security and privacy
  - No secrets committed; api keys remain in env
  - User-supplied content is sanitized/escaped in UI
  - Firebase writes match rules; no unintended privilege escalation
- Firebase DB rules
  - Any new data paths are protected with rules
  - Role-only actions enforced by rules or backend
- UX quality
  - Accessible labels/roles; keyboard and focus states
  - i18n-safe strings (use `src/i18n.tsx` where applicable)
  - Dark mode/readability
- Performance
  - No heavy work on render; memoize where needed
  - Network calls batched/cached appropriately
  - Diagram conversions don’t block UI; avoid unnecessary re-renders
- Code quality
  - Types are accurate; null/undefined handled
  - Small, cohesive components/functions; no dead code
  - Clear naming; comments only where needed
- Docs and ops
  - README or in-code docs updated for behavior/config changes
  - PR links any related tickets/issues; includes rollback plan for risky changes

## Project-Specific Checks
- Realtime Database rules (`database.rules.json`)
  - Role management: only ADMIN/SUPER_ADMIN can write `/users/{uid}/role`
  - Users can update their own profile but not elevate role via parent writes
  - Indexing: add `.indexOn` when new queries are introduced
  - Deploy rules after changes (see Deploy section)
- Firebase service calls (`src/services/firebaseService.ts`)
  - All writes align with rules
  - Guard against missing/undefined fields before sending to DB
  - Avoid broad writes that could overwrite sibling data; prefer update()
- Diagram/SVG → PNG utilities
  - Keep conversion stable: background set, inline styles enforced
  - No regressions in LR/TD toggles and node color semantics
  - Avoid introducing foreignObject-only label dependencies
- Mermaid usage
  - Use `flowchart <dir>` and validated input; avoid injection vectors
  - If `securityLevel: 'loose'` is used, ensure content is still sanitized
- UI/Accessibility
  - Interactive elements have `role`, `aria-*`, labels
  - Modal interactions: trap focus, ESC closes, outside click closes if intended
- i18n
  - New user-facing strings added to `src/i18n.tsx`
  - No hard-coded English strings in components when i18n is expected

## Definition of Done by Change Type
- UI change
  - Screenshots/GIFs
  - A11y pass (tab, screen-reader labels)
  - i18n strings added
- Data model/DB path change
  - Rules updated + deployed
  - Migration/backfill plan if required
- Admin/role logic
  - Rules enforce restrictions; client only mirrors
  - Manual test: admin changes someone else’s role; non-admin cannot
- Diagram export logic
  - Manual test with at least one complex diagram (AI/Human nodes, LR and TD)
  - Verify no black PNG; colors and text render

## How to Review Locally
- Type-check
  - `npm run lint`
- Build
  - `npm run build`
- Run dev server
  - `npm run dev`
- Optional: Emulators (if configured)
  - Ensure `.env.local` points to the right Firebase project or emulator

## Deploy (Rules and Hosting)
- Realtime Database rules
  - `firebase deploy --only database -P <projectId>`
- Hosting (already configured for PR previews)
  - On merge, GitHub Actions deploys to Hosting (see `.github/workflows/*`)

## Review Comment Tips
- Be kind and specific; prefer “suggest” over “block” when possible
- Link to references (docs, code in repo) when requesting changes
- Offer small, concrete examples/snippets

## Approvals and Merge
- At least one approval for standard changes; two for risky ones (rules/security)
- Squash-merge preferred; use informative commit messages

## Rollback Plan
- For risky changes, include a brief rollback plan in the PR
- If rules cause issues, re-deploy last known good `database.rules.json`
