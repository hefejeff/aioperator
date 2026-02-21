# Integration Checklist: Adding Collaboration to CompanyResearchV2

## Step-by-Step Integration Guide

### Step 1: Import the Component

Add to imports at top of `CompanyResearchV2.tsx`:

```tsx
import { CollaborationConfiguration } from './CollaborationConfiguration';
import type { JourneyCollaborationConfig } from '../types';
```

### Step 2: Add State Variables

Add these to the component state (around line 248 where other journey states are):

```tsx
// After isCompanyResearchComplete state:
const [collaborationConfig, setCollaborationConfig] = useState<JourneyCollaborationConfig | undefined>(
  undefined
);
const [isCollaborationConfigComplete, setIsCollaborationConfigComplete] = useState(false);
const [isSavingCollaborationConfig, setIsSavingCollaborationConfig] = useState(false);
const [collaborationConfigStatus, setCollaborationConfigStatus] = useState<string | null>(null);
```

### Step 3: Load Config When Journey Loads

Update the effect that loads journey data (around line 290-310). 

In the section where you set `setIsCompanyResearchComplete`:

```tsx
// After this line:
setIsCompanyResearchComplete(!!activeJourney?.companyResearchComplete);

// Add these lines:
setCollaborationConfig(activeJourney?.collaborationConfig);
setIsCollaborationConfigComplete(!!activeJourney?.collaborationConfigComplete);
```

### Step 4: Create Save Handler

Add this handler function (place it with other handlers around line 1370):

```tsx
const handleSaveCollaborationConfig = async (config: JourneyCollaborationConfig) => {
  if (!companyId) return;
  setIsSavingCollaborationConfig(true);
  setCollaborationConfigStatus(null);
  
  try {
    await updateCompanyJourneyStatus(
      companyId,
      user.uid,
      {
        collaborationConfig: config,
        collaborationConfigComplete: true
      },
      selectedJourneyId || undefined
    );

    if (selectedJourneyId) {
      setJourneys((prev) => ({
        ...prev,
        [selectedJourneyId]: {
          ...prev[selectedJourneyId],
          collaborationConfig: config,
          collaborationConfigComplete: true,
          updatedAt: Date.now()
        }
      }));
    }

    setCollaborationConfig(config);
    setIsCollaborationConfigComplete(true);
    setCollaborationConfigStatus('Collaboration configuration saved successfully.');
  } catch (error) {
    console.error('Failed to save collaboration config:', error);
    setCollaborationConfigStatus(
      error instanceof Error 
        ? error.message 
        : 'Failed to save collaboration configuration. Please try again.'
    );
  } finally {
    setIsSavingCollaborationConfig(false);
  }
};
```

### Step 5: Update Prerequisites Check

Find the line with `prerequisitesComplete`:

```tsx
// Around line 370, change from:
const prerequisitesComplete = isCompanyResearchComplete || hasResearch;

// To:
const prerequisitesComplete = isCompanyResearchComplete && isCollaborationConfigComplete;
```

### Step 6: Add UI Component

Find where the journey steps are rendered (look for where kickoffUseCases is rendered).

Add this section right after company research is confirmed, before the kickoff section:

```tsx
{/* Collaboration Configuration Section */}
{isCompanyResearchComplete && !isCollaborationConfigComplete && (
  <div className="mb-8">
    <CollaborationConfiguration
      config={collaborationConfig}
      isLoading={isSavingCollaborationConfig}
      onSave={handleSaveCollaborationConfig}
    />
    {collaborationConfigStatus && (
      <div className={`mt-2 p-3 rounded ${
        collaborationConfigStatus.includes('failed') || collaborationConfigStatus.includes('Failed')
          ? 'bg-red-50 text-red-700 border border-red-200'
          : 'bg-green-50 text-green-700 border border-green-200'
      }`}>
        <p className="text-sm">{collaborationConfigStatus}</p>
      </div>
    )}
  </div>
)}

{/* Or show status if already configured */}
{isCollaborationConfigComplete && (
  <div className="mb-8 p-4 bg-green-50 border border-green-200 rounded-lg">
    <p className="text-sm text-green-900">
      <strong>✓ Collaboration Configured:</strong> {
        collaborationConfig?.teamsChannel?.channelName && collaborationConfig?.sharePointFolder?.folderPath
          ? `Teams (#${collaborationConfig.teamsChannel.channelName}) & SharePoint (${collaborationConfig.sharePointFolder.folderPath})`
          : collaborationConfig?.teamsChannel?.channelName
          ? `Teams (#${collaborationConfig.teamsChannel.channelName})`
          : `SharePoint (${collaborationConfig?.sharePointFolder?.folderPath})`
      }
    </p>
  </div>
)}
```

### Step 7: Reset When Needed

If there's a "restart research" or "new journey" handler, add:

```tsx
// When clearing research:
setCollaborationConfig(undefined);
setIsCollaborationConfigComplete(false);
```

### Step 8: Test

1. Start company research
2. After research completes, you should see the CollaborationConfiguration component
3. Enter Teams Channel info OR SharePoint Folder info OR both
4. Click "Save Configuration"
5. Should show success message
6. Component should collapse and show "Connected" status
7. Refresh page - configuration should persist

## Verification Checklist

- [ ] TypeScript compiles without errors
- [ ] Component renders after company research
- [ ] Can enter Teams channel info
- [ ] Can enter SharePoint folder info
- [ ] Validation requires at least one service
- [ ] Save button works
- [ ] Success message appears
- [ ] Configuration persists after page refresh
- [ ] Status badge shows "Connected"
- [ ] Can edit existing configuration
- [ ] Reset button restores original values
- [ ] Build passes without errors

## Files to Modify

| File | Line(s) | Change |
|------|---------|--------|
| `src/components/CompanyResearchV2.tsx` | ~1-50 | Add imports |
| `src/components/CompanyResearchV2.tsx` | ~248 | Add state variables (4 new) |
| `src/components/CompanyResearchV2.tsx` | ~290-310 | Load config in journey effect |
| `src/components/CompanyResearchV2.tsx` | ~370 | Update prerequisitesComplete |
| `src/components/CompanyResearchV2.tsx` | ~1370 | Add handleSaveCollaborationConfig |
| `src/components/CompanyResearchV2.tsx` | ~1500-1600 (estimated) | Render component in UI |

## Common Issues

**Issue:** Component not showing
- Check that `isCompanyResearchComplete` is true
- Check that `!isCollaborationConfigComplete` is true
- Check console for errors

**Issue:** Save not working
- Verify `companyId` is set
- Check browser console for error details
- Verify Firebase rules allow write

**Issue:** TypeScript errors
- Ensure types are imported: `JourneyCollaborationConfig`
- Check that service is imported: `updateCompanyJourneyStatus`
- Verify handler function signature matches

**Issue:** Data not persisting
- Check Firebase Realtime Database
- Verify journey record has `collaborationConfig` field
- Check browser's Application tab for localStorage

## Questions?

Refer to:
1. `docs/COLLABORATION_CONFIG.md` - Architecture details
2. `COLLABORATION_IMPLEMENTATION.md` - Implementation overview  
3. `COLLABORATION_QUICKSTART.md` - Quick reference
4. `src/services/collaborationService.ts` - Service implementation
5. `src/components/CollaborationConfiguration.tsx` - Component code
