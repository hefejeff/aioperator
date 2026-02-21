/**
 * Microsoft Teams & SharePoint Integration Service
 * Handles authentication and data retrieval from Teams Channels and SharePoint folders
 */

import type { 
  TeamsChannelConfig, 
  SharePointFolderConfig, 
  JourneyCollaborationConfig,
  UploadedDocument 
} from '../types';

/**
 * Get Teams Channel configuration from user input
 * In production, this would redirect to Microsoft authentication and graph API
 */
export async function configureTeamsChannel(
  channelId: string,
  channelName: string,
  teamId: string,
  teamName: string
): Promise<TeamsChannelConfig> {
  // TODO: Validate channel exists via Microsoft Graph API
  // GET /v1.0/teams/{teamId}/channels/{channelId}
  
  return {
    channelId,
    channelName,
    teamId,
    teamName,
    connectedAt: Date.now(),
  };
}

/**
 * Get SharePoint Folder configuration from user input
 * In production, this would redirect to Microsoft authentication and graph API
 */
export async function configureSharePointFolder(
  folderId: string,
  folderPath: string,
  siteName: string
): Promise<SharePointFolderConfig> {
  // TODO: Validate folder exists via Microsoft Graph API
  // GET /v1.0/sites/{siteId}/drive/items/{folderId}
  
  return {
    folderId,
    folderPath,
    siteName,
    connectedAt: Date.now(),
  };
}

/**
 * Save collaboration configuration for a journey
 */
export function createCollaborationConfig(
  teamsChannel?: TeamsChannelConfig,
  sharePointFolder?: SharePointFolderConfig,
  userId?: string
): JourneyCollaborationConfig {
  return {
    teamsChannel,
    sharePointFolder,
    configuredAt: Date.now(),
    configuredBy: userId,
  };
}

/**
 * Fetch documents from SharePoint folder
 * Returns list of document metadata and content
 * 
 * In production, would call:
 * GET /v1.0/sites/{siteId}/drive/items/{folderId}/children
 */
export async function getSharePointFolderDocuments(
  config: SharePointFolderConfig,
  accessToken?: string
): Promise<UploadedDocument[]> {
  if (!accessToken) {
    throw new Error('SharePoint access token required');
  }

  try {
    // TODO: Implement actual Microsoft Graph API call
    // const response = await fetch(
    //   `https://graph.microsoft.com/v1.0/sites/{siteId}/drive/items/${config.folderId}/children`,
    //   { headers: { Authorization: `Bearer ${accessToken}` } }
    // );
    
    // Placeholder: return empty array for now
    console.log('Fetching documents from SharePoint:', config.folderPath);
    return [];
  } catch (error) {
    console.error('Failed to fetch SharePoint documents:', error);
    throw error;
  }
}

/**
 * Fetch meeting transcripts from Teams channel
 * Returns list of message content that can be treated as transcripts
 * 
 * In production, would call:
 * GET /v1.0/teams/{teamId}/channels/{channelId}/messages
 */
export async function getTeamsChannelTranscripts(
  config: TeamsChannelConfig,
  accessToken?: string
): Promise<UploadedDocument[]> {
  if (!accessToken) {
    throw new Error('Teams access token required');
  }

  try {
    // TODO: Implement actual Microsoft Graph API call
    // const response = await fetch(
    //   `https://graph.microsoft.com/v1.0/teams/${config.teamId}/channels/${config.channelId}/messages?$top=${limit}`,
    //   { headers: { Authorization: `Bearer ${accessToken}` } }
    // );
    
    // Placeholder: return empty array for now
    console.log('Fetching transcripts from Teams channel:', config.channelName);
    return [];
  } catch (error) {
    console.error('Failed to fetch Teams channel messages:', error);
    throw error;
  }
}

/**
 * Validate that the collaboration config is properly connected
 */
export function isCollaborationConfigValid(config?: JourneyCollaborationConfig): boolean {
  if (!config) return false;
  
  const hasTeamsConfig = !!(config.teamsChannel?.channelId && config.teamsChannel?.teamId);
  const hasSharePointConfig = !!(config.sharePointFolder?.folderId && config.sharePointFolder?.siteName);
  
  return hasTeamsConfig || hasSharePointConfig;
}

/**
 * Get human-readable summary of collaboration config
 */
export function getCollaborationConfigSummary(config?: JourneyCollaborationConfig): string {
  if (!config || !isCollaborationConfigValid(config)) {
    return 'No collaboration configured';
  }

  const parts: string[] = [];
  
  if (config.teamsChannel) {
    parts.push(`Teams: ${config.teamsChannel.channelName}`);
  }
  
  if (config.sharePointFolder) {
    parts.push(`SharePoint: ${config.sharePointFolder.folderPath}`);
  }

  return parts.join(' • ');
}

/**
 * Initiate Microsoft Graph OAuth flow for Teams/SharePoint access
 * Redirects user to Microsoft authentication
 */
export function initiateGraphOAuthFlow(redirectUri: string): string {
  const clientId = process.env.VITE_MICROSOFT_CLIENT_ID;
  
  if (!clientId) {
    throw new Error('Microsoft client ID not configured');
  }

  const scopes = [
    'Team.ReadBasic.All',
    'TeamSettings.Read.All',
    'Sites.Read.All',
    'Files.Read.All',
  ].join('%20');

  const params = new URLSearchParams({
    client_id: clientId,
    response_type: 'code',
    redirect_uri: redirectUri,
    scope: scopes,
    response_mode: 'query',
    state: generateStateToken(),
  });

  return `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?${params.toString()}`;
}

/**
 * Exchange OAuth authorization code for access token
 */
export async function exchangeCodeForToken(code: string, redirectUri: string): Promise<string> {
  const clientId = process.env.VITE_MICROSOFT_CLIENT_ID;
  const clientSecret = process.env.VITE_MICROSOFT_CLIENT_SECRET;
  
  if (!clientId || !clientSecret) {
    throw new Error('Microsoft credentials not configured');
  }

  try {
    // TODO: This should be called from a backend function to keep client_secret secure
    const response = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }).toString(),
    });

    if (!response.ok) {
      throw new Error('Failed to exchange code for token');
    }

    const data = await response.json();
    return data.access_token;
  } catch (error) {
    console.error('OAuth token exchange failed:', error);
    throw error;
  }
}

/**
 * Generate a random state token for OAuth flow
 */
function generateStateToken(): string {
  return Math.random().toString(36).substring(7) + Math.random().toString(36).substring(7);
}
