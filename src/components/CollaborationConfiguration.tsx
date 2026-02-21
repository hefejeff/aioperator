/**
 * Journey Collaboration Configuration UI
 * Allows users to configure Teams Channel and SharePoint folder for a journey
 * Makes documents/transcripts available to all journey steps
 */

import React, { useState } from 'react';
import type { JourneyCollaborationConfig } from '../types';
import { Icons } from '../constants';

interface CollaborationConfigurationProps {
  config?: JourneyCollaborationConfig;
  isLoading?: boolean;
  onSave: (config: JourneyCollaborationConfig) => Promise<void>;
}

export const CollaborationConfiguration: React.FC<CollaborationConfigurationProps> = ({ 
  config,
  isLoading = false,
  onSave 
}) => {
  const [isExpanded, setIsExpanded] = useState(!config);
  const [teamsChannelId, setTeamsChannelId] = useState(config?.teamsChannel?.channelId || '');
  const [teamsChannelName, setTeamsChannelName] = useState(config?.teamsChannel?.channelName || '');
  const [teamsTeamId, setTeamsTeamId] = useState(config?.teamsChannel?.teamId || '');
  const [teamsTeamName, setTeamsTeamName] = useState(config?.teamsChannel?.teamName || '');
  
  const [sharePointFolderId, setSharePointFolderId] = useState(config?.sharePointFolder?.folderId || '');
  const [sharePointFolderPath, setSharePointFolderPath] = useState(config?.sharePointFolder?.folderPath || '');
  const [sharePointSiteName, setSharePointSiteName] = useState(config?.sharePointFolder?.siteName || '');
  
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const isValid = (teamsChannelId && teamsTeamId) || (sharePointFolderId && sharePointSiteName);
  const hasConfig = !!(config?.teamsChannel || config?.sharePointFolder);

  const handleSave = async () => {
    if (!isValid) {
      setError('Please provide either Teams Channel or SharePoint Folder information');
      return;
    }

    try {
      setError(null);
      setSuccessMessage(null);

      const newConfig: JourneyCollaborationConfig = {};
      
      if (teamsChannelId && teamsTeamId) {
        newConfig.teamsChannel = {
          channelId: teamsChannelId,
          channelName: teamsChannelName,
          teamId: teamsTeamId,
          teamName: teamsTeamName,
          connectedAt: Date.now()
        };
      }

      if (sharePointFolderId && sharePointSiteName) {
        newConfig.sharePointFolder = {
          folderId: sharePointFolderId,
          folderPath: sharePointFolderPath,
          siteName: sharePointSiteName,
          connectedAt: Date.now()
        };
      }

      await onSave(newConfig);
      setSuccessMessage('Collaboration configuration saved. Documents and transcripts will now be available to all journey steps.');
      setIsExpanded(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save collaboration configuration');
    }
  };

  const handleReset = () => {
    setTeamsChannelId(config?.teamsChannel?.channelId || '');
    setTeamsChannelName(config?.teamsChannel?.channelName || '');
    setTeamsTeamId(config?.teamsChannel?.teamId || '');
    setTeamsTeamName(config?.teamsChannel?.teamName || '');
    setSharePointFolderId(config?.sharePointFolder?.folderId || '');
    setSharePointFolderPath(config?.sharePointFolder?.folderPath || '');
    setSharePointSiteName(config?.sharePointFolder?.siteName || '');
    setError(null);
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <Icons.Link className="w-5 h-5 text-wm-accent" />
          <div className="text-left">
            <h3 className="font-semibold text-gray-900">Collaboration Configuration</h3>
            {hasConfig && <p className="text-sm text-gray-600 mt-1">Connected to Teams and/or SharePoint</p>}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {hasConfig && (
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
              Connected
            </span>
          )}
          <Icons.ChevronRight className={`w-5 h-5 text-gray-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
        </div>
      </button>

      {/* Content */}
      {isExpanded && (
        <div className="border-t border-gray-200 px-6 py-4 bg-gray-50">
          {/* Info Box */}
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-900">
              <strong>After company research is complete,</strong> connect a Teams Channel and/or SharePoint folder to make all documents and meeting transcripts available to all subsequent journey steps.
            </p>
          </div>

          <div className="space-y-6">
            {/* Teams Channel Configuration */}
            <div className="space-y-3">
              <h4 className="font-semibold text-gray-900">MS Teams</h4>
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Team ID
                  </label>
                  <input
                    type="text"
                    value={teamsTeamId}
                    onChange={(e) => setTeamsTeamId(e.target.value)}
                    placeholder="team-id-xyz"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-wm-accent"
                    disabled={isLoading}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Team Name
                  </label>
                  <input
                    type="text"
                    value={teamsTeamName}
                    onChange={(e) => setTeamsTeamName(e.target.value)}
                    placeholder="My Team"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-wm-accent"
                    disabled={isLoading}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Channel ID
                  </label>
                  <input
                    type="text"
                    value={teamsChannelId}
                    onChange={(e) => setTeamsChannelId(e.target.value)}
                    placeholder="channel-id-abc"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-wm-accent"
                    disabled={isLoading}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Channel Name
                  </label>
                  <input
                    type="text"
                    value={teamsChannelName}
                    onChange={(e) => setTeamsChannelName(e.target.value)}
                    placeholder="#general"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-wm-accent"
                    disabled={isLoading}
                  />
                </div>
              </div>
            </div>

            {/* SharePoint Configuration */}
            <div className="space-y-3">
              <h4 className="font-semibold text-gray-900">SharePoint Folder</h4>
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Site Name
                  </label>
                  <input
                    type="text"
                    value={sharePointSiteName}
                    onChange={(e) => setSharePointSiteName(e.target.value)}
                    placeholder="company-site"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-wm-accent"
                    disabled={isLoading}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Folder ID
                  </label>
                  <input
                    type="text"
                    value={sharePointFolderId}
                    onChange={(e) => setSharePointFolderId(e.target.value)}
                    placeholder="folder-id-xyz"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-wm-accent"
                    disabled={isLoading}
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Folder Path
                  </label>
                  <input
                    type="text"
                    value={sharePointFolderPath}
                    onChange={(e) => setSharePointFolderPath(e.target.value)}
                    placeholder="/sites/company-site/Shared Documents/Project"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-wm-accent"
                    disabled={isLoading}
                  />
                </div>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            {/* Success Message */}
            {successMessage && (
              <div className="p-3 bg-green-50 border border-green-200 rounded-md">
                <p className="text-sm text-green-700">{successMessage}</p>
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={handleReset}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors disabled:opacity-50"
                disabled={isLoading}
              >
                Reset
              </button>
              <button
                onClick={handleSave}
                disabled={isLoading || !isValid}
                className="px-4 py-2 text-sm font-medium text-white bg-wm-accent rounded-md hover:bg-opacity-90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Saving...' : 'Save Configuration'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
