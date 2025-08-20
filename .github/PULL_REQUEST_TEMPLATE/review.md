# PR Review Checklist

Link to Guide: ../CODE_REVIEW.md

## Summary
- What does this PR change?
- Why is it needed?

## Screenshots
- Attach GIFs/images for UI changes

## Local Verification
- [ ] tsc passes (`npm run lint`)
- [ ] build passes (`npm run build`)
- [ ] manual test cases covered

## Security & Privacy
- [ ] no secrets in code
- [ ] user input sanitized where rendered
- [ ] Firebase writes align with rules

## Firebase Rules (if applicable)
- [ ] rules updated in `database.rules.json`
- [ ] deployed via `firebase deploy --only database -P <projectId>`

## i18n & A11y
- [ ] strings added to `src/i18n.tsx`
- [ ] labels/roles present; keyboard flows verified

## Risk & Rollback
- [ ] risks documented
- [ ] rollback plan included
