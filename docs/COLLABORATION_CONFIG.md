# Journey Collaboration Configuration

## Overview

After company research is complete, the journey creator can now assign a Teams Channel and/or SharePoint folder to the journey. This enables all subsequent journey steps to access company-specific documents and meeting transcripts without manual re-uploading.

## Architecture

### New Types (`src/types.ts`)

```typescript
interface TeamsChannelConfig {
  channelId: string;
  channelName: string;
  teamId: string;
  teamName: string;
  connectedAt: number;
}

interface SharePointFolderConfig {
  folderId: string;
  folderPath: string;
  siteName: string;
  connectedAt: number;
}

interface JourneyCollaborationConfig {
  teamsChannel?: TeamsChannelConfig;
  sharePointFolder?: SharePointFolderConfig;
  configuredAt?: number;
  configuredBy?: string;
}
```

### Services

#### `src/services/collaborationService.ts`

Handles Teams and SharePoint integration:

- `configureTeamsChannel()` - Validate and configure Teams Channel
- `configureSharePointFolder()` - Validate and configure SharePoint folder
- `createCollaborationConfig()` - Create collaboration config object
- `getSharePointFolderDocuments()` - Fetch documents from SharePoint
- `getTeamsChannelTranscripts()` - Fetch meeting transcripts from Teams
- `isCollaborationConfigValid()` - Check if config is properly connected
- `getCollaborationConfigSummary()` - Human-readable config summary
- `initiateGraphOAuthFlow()` - Start Microsoft Graph OAuth flow
- `exchangeCodeForToken()` - Exchange OAuth code for access token

### Components

#### `src/components/CollaborationConfiguration.tsx`

React component for configuring collaboration:

```tsx
<CollaborationConfiguration
  config={activeJourney?.collaborationConfig}
  isLoading={isSaving}
  onSave={handleSaveCollaborationConfig}
/>
```

Features:
- Teams Channel ID/Name input
- SharePoint Folder ID/Path input
- Validation (at least one service required)
- Visual feedback (Connected/Not Connected status)
- Error and success messages

### Updated Journey Structure

Journey objects now include:

```typescript
interface CompanyJourney {
  // ... existing fields
  collaborationConfigComplete?: boolean;
  collaborationConfig?: JourneyCollaborationConfig;
  // ... rest of fields
}
```

## Workflow Integration

### Journey Steps Flow

1. **Company Research** (existing)
   - User completes company research and domain selection
   - Uploads/attaches documents for research

2. **Collaboration Configuration** (NEW - after company research)
   - User configures Teams Channel and/or SharePoint folder
   - System validates access and connectivity
   - Configuration is saved to journey

3. **Kickoff Meeting & Beyond** (existing, now enhanced)
   - All subsequent steps have access to:
     - Documents from company research
     - Documents from Teams Channel
     - Documents from SharePoint folder
     - Meeting transcripts and notes
   - AI agents can reference unified document context

## Usage in CompanyResearchV2

To integrate into `CompanyResearchV2.tsx`:

```tsx
// Add to state
const [collaborationConfig, setCollaborationConfig] = useState<JourneyCollaborationConfig | undefined>(
  activeJourney?.collaborationConfig
);
const [isCollaborationConfigComplete, setIsCollaborationConfigComplete] = useState(
  activeJourney?.collaborationConfigComplete || false
);

// Handle save
const handleSaveCollaborationConfig = async (config: JourneyCollaborationConfig) => {
  if (!companyId) return;
  
  await updateCompanyJourneyStatus(
    companyId,
    user.uid,
    {
      collaborationConfig: config,
      collaborationConfigComplete: true
    },
    selectedJourneyId || undefined
  );
  
  setCollaborationConfig(config);
  setIsCollaborationConfigComplete(true);
};

// Render component
const prerequisitesComplete = isCompanyResearchComplete && isCollaborationConfigComplete;

// In journey steps UI:
{isCompanyResearchComplete && !isCollaborationConfigComplete && (
  <CollaborationConfiguration
    config={collaborationConfig}
    isLoading={isSaving}
    onSave={handleSaveCollaborationConfig}
  />
)}
```

## Microsoft Graph Integration (Future Enhancement)

### Current Implementation

The service includes placeholder stubs for Microsoft Graph API calls:

- `getSharePointFolderDocuments()` - Ready for Graph API integration
- `getTeamsChannelTranscripts()` - Ready for Graph API integration
- `initiateGraphOAuthFlow()` - OAuth flow ready
- `exchangeCodeForToken()` - Token exchange ready

### To Enable Microsoft Graph Access

1. Register Azure AD application
2. Set environment variables:
   ```
   VITE_MICROSOFT_CLIENT_ID=your-client-id
   VITE_MICROSOFT_CLIENT_SECRET=your-client-secret (backend only)
   ```

3. Implement Graph API calls in `collaborationService.ts`:
   ```typescript
   // Replace placeholder with actual API call
   const response = await fetch(
     `https://graph.microsoft.com/v1.0/sites/{siteId}/drive/items/${folderId}/children`,
     { headers: { Authorization: `Bearer ${accessToken}` } }
   );
   ```

4. Add OAuth redirect handler in backend

### Required Microsoft Graph Permissions

- `Team.ReadBasic.All` - Read Teams team metadata
- `TeamSettings.Read.All` - Read Teams channel settings
- `Sites.Read.All` - Read SharePoint sites
- `Files.Read.All` - Read files and folders

## Data Flow

```
Company Research Complete
         ↓
    [Journey Created]
         ↓
Collaboration Configuration
         ↓
    [Teams/SharePoint Connected]
         ↓
All Subsequent Steps
  ├─ Can access company research docs
  ├─ Can access Teams channel docs
  ├─ Can access SharePoint folder docs
  └─ Can reference all transcripts
```

## Benefits

1. **Unified Context**: AI agents have access to all company documents in one place
2. **No Manual Upload**: Documents flow automatically from Teams/SharePoint
3. **Scalability**: Handles large document libraries
4. **Real-time Sync**: Future enhancements can auto-sync document updates
5. **Audit Trail**: All document access is tracked and timestamped

## Future Enhancements

- [ ] Auto-sync documents from Teams/SharePoint on a schedule
- [ ] Document versioning and change tracking
- [ ] Document search across all sources
- [ ] Integration with OneDrive
- [ ] Real-time collaboration with Teams desktop client
- [ ] Document classification and tagging automation
- [ ] Full Microsoft Graph API implementation
- [ ] One-click setup with OAuth
