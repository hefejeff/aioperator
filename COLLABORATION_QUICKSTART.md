# Quick Start: Journey Collaboration Configuration

## What Changed?

After company research is complete, journey creators can now connect Teams Channels and/or SharePoint folders to make all documents and meeting transcripts available to all journey steps.

## New Files

```
src/
├── services/
│   └── collaborationService.ts          (210 lines - new service)
└── components/
    └── CollaborationConfiguration.tsx   (260 lines - new UI component)

docs/
└── COLLABORATION_CONFIG.md              (Architecture & implementation guide)

COLLABORATION_IMPLEMENTATION.md          (Summary & integration guide)
```

## Type Changes

**New Types Added:**
- `TeamsChannelConfig` - Teams metadata
- `SharePointFolderConfig` - SharePoint metadata
- `JourneyCollaborationConfig` - Combined configuration

**Updated Types:**
- `CompanyJourney.collaborationConfigComplete` - Boolean flag
- `CompanyJourney.collaborationConfig` - Configuration object
- `Company.journey.collaborationConfigComplete` - Boolean flag
- `Company.journey.collaborationConfig` - Configuration object

## Key Functions

### Configuration Service (`collaborationService.ts`)

```typescript
// Create configurations
configureTeamsChannel(channelId, channelName, teamId, teamName)
configureSharePointFolder(folderId, folderPath, siteName)
createCollaborationConfig(teamsConfig, sharePointConfig, userId)

// Validate & display
isCollaborationConfigValid(config) → boolean
getCollaborationConfigSummary(config) → string

// Future: Document retrieval
getSharePointFolderDocuments(config, accessToken) → Promise<UploadedDocument[]>
getTeamsChannelTranscripts(config, accessToken) → Promise<UploadedDocument[]>

// Future: OAuth
initiateGraphOAuthFlow(redirectUri) → string
exchangeCodeForToken(code, redirectUri) → Promise<string>
```

### UI Component (`CollaborationConfiguration.tsx`)

```tsx
<CollaborationConfiguration
  config={journeyCollaborationConfig}
  isLoading={isSaving}
  onSave={handleSave}
/>
```

Features:
- Teams Channel input fields
- SharePoint Folder input fields
- Validation (min 1 service required)
- Status badge (Connected/Not Connected)
- Error/success messaging

## Integration Example

```tsx
import { CollaborationConfiguration } from './CollaborationConfiguration';
import { JourneyCollaborationConfig } from '../types';
import { updateCompanyJourneyStatus } from '../services/companyService';

// In component state
const [collaborationConfig, setCollaborationConfig] = useState<JourneyCollaborationConfig>();
const [isConfigComplete, setIsConfigComplete] = useState(false);

// Handler
const handleSaveCollaboration = async (config: JourneyCollaborationConfig) => {
  await updateCompanyJourneyStatus(
    companyId,
    userId,
    {
      collaborationConfig: config,
      collaborationConfigComplete: true
    },
    journeyId
  );
  setCollaborationConfig(config);
  setIsConfigComplete(true);
};

// Render - Show after company research complete
{isCompanyResearchComplete && !isConfigComplete && (
  <CollaborationConfiguration
    config={collaborationConfig}
    isLoading={isSaving}
    onSave={handleSaveCollaboration}
  />
)}
```

## Database Structure

Journeys now store in Firebase:

```json
{
  "id": "journey-123",
  "companyResearchComplete": true,
  "collaborationConfigComplete": true,
  "collaborationConfig": {
    "teamsChannel": {
      "channelId": "19:xxx",
      "channelName": "#general",
      "teamId": "team-123",
      "teamName": "My Team",
      "connectedAt": 1708102800000
    },
    "sharePointFolder": null,
    "configuredAt": 1708102800000,
    "configuredBy": "user-123"
  }
}
```

## Journey Workflow

```
1. Company Research Complete
   ↓
2. [NEW] Configure Teams/SharePoint
   ↓
3. Kickoff Meeting (auto-access all docs)
   ↓
4. Functional High-Level (auto-access all docs)
   ↓
5. Functional Deep Dive (auto-access all docs)
   ↓
6. ... all subsequent steps have unified document context
```

## Microsoft Graph Integration (Future)

Service is ready for Graph API:

```typescript
// Currently: Placeholders
const docs = await getSharePointFolderDocuments(config, token);
const transcripts = await getTeamsChannelTranscripts(config, token);

// Will call Microsoft Graph API v1.0:
// GET /sites/{siteId}/drive/items/{folderId}/children
// GET /teams/{teamId}/channels/{channelId}/messages
```

To enable:
1. Register Azure AD app
2. Set `VITE_MICROSOFT_CLIENT_ID` env var
3. Implement Graph API calls in `collaborationService.ts`
4. Set up OAuth redirect handler

## Status

✅ **MVP Ready**
- Types defined
- UI component created
- Service layer ready
- Build passing
- Backward compatible

⏳ **Phase 2 (Future)**
- Microsoft Graph API integration
- Real document fetching
- OAuth flow
- Auto-sync documents

## Error Handling

Component includes:
- Input validation (at least 1 service required)
- Try/catch error display
- Success message feedback
- Reset button to undo changes

## Build Status

✅ Build passing
✅ No TypeScript errors
✅ No new warnings
✅ Tests compiling correctly

## Documentation

- **[COLLABORATION_CONFIG.md](docs/COLLABORATION_CONFIG.md)** - Full technical guide
- **[COLLABORATION_IMPLEMENTATION.md](COLLABORATION_IMPLEMENTATION.md)** - Implementation summary
- **[This file]** - Quick reference
