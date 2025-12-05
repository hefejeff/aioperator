import React, { useState } from 'react';
import { Icons } from '../constants';
import { CorePlatform, PlatformApproach } from '../types';

// Re-export types for component usage
export type AIActionsPlatform = CorePlatform;
export type AIActionsApproach = PlatformApproach;

export interface AIActionsPanelProps {
  platforms: AIActionsPlatform[];
  approaches: AIActionsApproach[];
  onPlatformChange: (platform: AIActionsPlatform) => void;
  onApproachesChange: (approaches: AIActionsApproach[]) => void;
  workflowExplanation: string;
  onGeneratePrd: () => void;
  onGeneratePitch: () => void;
  onEvaluate: () => void;
  prdLoading?: boolean;
  pitchLoading?: boolean;
  evalLoading?: boolean;
  disabled?: boolean; // global disable
  onSaveVersion?: () => void;
  savingVersion?: boolean;
  canSaveVersion?: boolean;
  t: (k: string) => string;
  lastSavedPrdTs?: number | null;
  lastSavedPitchTs?: number | null;
  onOpenLastPrd?: () => void;
  onOpenLastPitch?: () => void;
}

const AIActionsPanel: React.FC<AIActionsPanelProps> = ({
  platforms,
  approaches,
  onPlatformChange,
  onApproachesChange,
  workflowExplanation,
  onGeneratePrd,
  onGeneratePitch,
  onEvaluate,
  prdLoading,
  pitchLoading,
  evalLoading,
  disabled,
  onSaveVersion,
  savingVersion,
  canSaveVersion,
  t,
  lastSavedPrdTs,
  lastSavedPitchTs,
  onOpenLastPrd,
  onOpenLastPitch,
}) => {
  const [isN8NGenerating, setIsN8NGenerating] = useState(false);
  const [n8nWorkflow, setN8nWorkflow] = useState('');
  const [isPushingToN8N, setIsPushingToN8N] = useState(false);
  const [pushResult, setPushResult] = useState<{ success: boolean; url?: string; error?: string } | null>(null);
  const [n8nAvailable, setN8nAvailable] = useState(false);

  const hasWorkflow = workflowExplanation.trim().length > 0;
  const baseDisabled = disabled || !hasWorkflow;

  // Check if n8n is available on component mount
  React.useEffect(() => {
    const checkN8N = async () => {
      const { checkN8NConnection } = await import('../services/n8nService');
      const available = await checkN8NConnection();
      setN8nAvailable(available);
    };
    checkN8N();
  }, []);

  const clsBase = 'inline-flex items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-bold transition focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-white disabled:cursor-not-allowed disabled:opacity-60';
  const clsIndigo = clsBase + ' bg-wm-accent hover:bg-wm-accent/90 disabled:bg-wm-neutral disabled:text-wm-blue/50 text-white';
  const clsTeal = clsBase + ' bg-wm-pink hover:bg-wm-pink/90 disabled:bg-wm-neutral disabled:text-wm-blue/50 text-white';
  const clsAmber = clsBase + ' bg-wm-yellow hover:bg-wm-yellow/90 disabled:bg-wm-neutral disabled:text-wm-blue/50 text-wm-blue';
  const now = Date.now();
  const isNew = (ts?: number | null) => !!ts && (now - ts) < 2 * 60 * 1000; // < 2 minutes

  const handlePlatformSelect = (platform: AIActionsPlatform) => {
    onPlatformChange(platform);
  };

  const handleApproachSelect = (approach: AIActionsApproach) => {
    const updatedApproaches = approaches.includes(approach)
      ? approaches.filter(a => a !== approach)
      : [...approaches, approach];
    onApproachesChange(updatedApproaches);
  };

  const getPlatformDisplayNames = () => {
    if (platforms.length === 0) return t('aiActions.platformFallback') || 'your platform';
    const platform = platforms[0];
    return platform === 'MS365' ? t('platform.ms365') 
      : platform === 'GOOGLE' ? t('platform.google')
      : platform === 'CUSTOM' ? t('platform.custom')
      : platform;
  };

  return (
    <>
    <section className="rounded-xl border border-wm-neutral/30 bg-white p-5 space-y-5 shadow-sm" aria-labelledby="tools-docs-heading">
      <header className="space-y-1">
        <h3 id="tools-docs-heading" className="text-sm font-bold tracking-wide text-wm-blue uppercase">
          {t('toolsDocs.title') || 'Tools & Docs'}
        </h3>
        <p className="text-xs text-wm-blue/60">
          {t('aiActions.subtitle').replace('{platform}', getPlatformDisplayNames())}
        </p>
      </header>

      <div className="space-y-5">
        {/* Core Platforms Section */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <label className="text-xs font-bold text-wm-blue/70">
              {'Platform'}
            </label>
            {!hasWorkflow && (
              <span className="text-[11px] text-wm-blue/50 ml-auto">
                {t('aiActions.needWorkflow')}
              </span>
            )}
          </div>
          <div className="grid grid-cols-3 gap-2">
            {['MS365', 'GOOGLE', 'CUSTOM'].map((platform) => {
              const getPlatformLabel = (p: AIActionsPlatform) => {
                switch (p) {
                  case 'MS365': return 'Microsoft 365';
                  case 'GOOGLE': return 'Google Workspace';
                  case 'CUSTOM': return 'Custom Integration';
                  default: return null;
                }
              };
                
              return (
                <label key={platform} className="flex items-center space-x-2 text-sm text-wm-blue cursor-pointer">
                  <input
                    type="radio"
                    name="platform"
                    checked={platforms[0] === platform}
                    onChange={() => handlePlatformSelect(platform as AIActionsPlatform)}
                    className="border-wm-neutral/50 bg-white text-wm-accent focus:ring-wm-accent focus:ring-offset-white"
                  />
                  <span>{getPlatformLabel(platform as AIActionsPlatform) || platform}</span>
                </label>
              );
            })}
          </div>
        </div>

        {/* Advanced Integration Section */}
        <div className="space-y-3 pt-2 border-t border-wm-neutral/30">
          <div className="flex items-center gap-2">
            <label className="text-xs font-bold text-wm-blue/70">
              {'Approach'}
            </label>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {(() => {
              // Define available approaches for each platform
              const platformApproaches: Record<AIActionsPlatform, AIActionsApproach[]> = {
                'MS365': ['POWER_APPS', 'POWER_AUTOMATE', 'POWER_BI', 'POWER_VIRTUAL_AGENTS', 'CUSTOM_PROMPT', 'ASSISTANT'],
                'GOOGLE': ['APP_SHEETS', 'CUSTOM_PROMPT', 'ASSISTANT', 'COMBINATION'],
                'CUSTOM': ['CUSTOM_PROMPT']
              };

              // Get all available approaches for selected platforms
              const availableApproaches = platforms.length > 0
                ? [...new Set(platforms.flatMap(p => platformApproaches[p]))]
                : [];

              if (availableApproaches.length === 0) {
                return (
                  <div className="col-span-2 text-center text-sm text-wm-blue/50 py-2">
                    Select a platform to see available approaches
                  </div>
                );
              }

              const getApproachLabel = (p: AIActionsApproach) => {
                switch (p) {
                  // Power Platform
                  case 'POWER_APPS': return 'Power Apps';
                  case 'POWER_AUTOMATE': return 'Power Automate';
                  case 'POWER_BI': return 'Power BI';
                  case 'POWER_VIRTUAL_AGENTS': return 'Power Virtual Agents';
                  // Google Workspace
                  case 'APP_SHEETS': return 'App Sheets';
                  // Standard approaches
                  case 'CUSTOM_PROMPT': return 'Custom Prompt';
                  case 'ASSISTANT': return 'AI Assistant';
                  case 'COMBINATION': return 'Combined Approach';
                  default: return null;
                }
              };

              return (
                <>
                  {availableApproaches.map((approach) => (
                    <label key={approach} className="flex items-center space-x-2 text-sm text-wm-blue cursor-pointer">
                      <input
                        type="checkbox"
                        checked={approaches.includes(approach)}
                        onChange={() => handleApproachSelect(approach)}
                        className="rounded border-wm-neutral/50 bg-white text-wm-accent focus:ring-wm-accent focus:ring-offset-white"
                      />
                      <span>{getApproachLabel(approach) || approach}</span>
                    </label>
                  ))}
                </>
              );
            })()}
          </div>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3" role="group" aria-label="AI generation actions">
        <button
          type="button"
          onClick={onGeneratePrd}
          disabled={baseDisabled || !!prdLoading}
          aria-disabled={baseDisabled || !!prdLoading}
          className={clsIndigo}
        >
          {prdLoading ? t('loading') : t('prd.generateShort')}
        </button>
        <button
          type="button"
          onClick={onGeneratePitch}
          disabled={baseDisabled || !!pitchLoading}
          aria-disabled={baseDisabled || !!pitchLoading}
          className={clsTeal}
        >
          {pitchLoading ? t('loading') : t('pitch.generateShort')}
        </button>
        <button
          type="button"
          onClick={onEvaluate}
          disabled={baseDisabled || !!evalLoading}
          aria-disabled={baseDisabled || !!evalLoading}
          className={clsAmber}
        >
          {evalLoading ? t('loading') : t('evaluation.run')}
        </button>
      </div>

      {(lastSavedPrdTs || lastSavedPitchTs) && (
        <div className="mt-2 rounded-lg border border-wm-accent/30 bg-wm-accent/5 p-4 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[11px] font-bold tracking-wider text-wm-accent flex items-center gap-1">
              <span className="inline-block h-2 w-2 rounded-full bg-wm-accent animate-pulse" />
              {(t('toolsDocs.recent') || 'Recent Docs').toUpperCase()}
            </p>
            {(isNew(lastSavedPrdTs) || isNew(lastSavedPitchTs)) && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-wm-yellow/30 text-wm-blue border border-wm-yellow/50 animate-pulse">NEW</span>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {lastSavedPrdTs && (
              <button
                type="button"
                onClick={onOpenLastPrd}
                className="group relative inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-wm-accent/10 hover:bg-wm-accent/20 text-wm-accent hover:text-wm-accent text-xs font-bold border border-wm-accent/30 hover:border-wm-accent/50 transition"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z"/><path d="M8 10h4v1H8v-1zm0 2h4v1H8v-1z"/></svg>
                <span>{t('toolsDocs.latestPrd') || 'Latest PRD'}</span>
                <span className="text-[9px] text-wm-blue/50 group-hover:text-wm-blue/70 ml-1">{new Date(lastSavedPrdTs).toLocaleTimeString()}</span>
              </button>
            )}
            {lastSavedPitchTs && (
              <button
                type="button"
                onClick={onOpenLastPitch}
                className="group relative inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-wm-pink/10 hover:bg-wm-pink/20 text-wm-pink hover:text-wm-pink text-xs font-bold border border-wm-pink/30 hover:border-wm-pink/50 transition"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m6-6H6"/></svg>
                <span>{t('toolsDocs.latestPitch') || 'Latest Pitch'}</span>
                <span className="text-[9px] text-wm-blue/50 group-hover:text-wm-blue/70 ml-1">{new Date(lastSavedPitchTs).toLocaleTimeString()}</span>
              </button>
            )}
          </div>
        </div>
      )}

      {onSaveVersion && (
        <div className="pt-2 flex justify-end">
          <button
            type="button"
            onClick={onSaveVersion}
            disabled={!!savingVersion || !(canSaveVersion ?? hasWorkflow)}
            className="inline-flex items-center gap-2 rounded-md bg-wm-neutral/30 hover:bg-wm-neutral/50 disabled:opacity-50 px-4 py-2 text-sm font-bold text-wm-blue"
          >
            {savingVersion ? (
              <div className="w-4 h-4 border-2 border-wm-blue/70 border-t-transparent rounded-full animate-spin" />
            ) : null}
            <span>Save Version</span>
          </button>
        </div>
      )}
    </section>

    {/* N8N Workflow Generator Section */}
    <section className="mt-4 rounded-xl border border-wm-neutral/30 bg-white p-5 space-y-5 shadow-sm" aria-labelledby="n8n-heading">
      <header className="space-y-1">
        <div className="flex items-center gap-2">
          <h3 id="n8n-heading" className="text-sm font-bold tracking-wide text-wm-blue uppercase">
            N8N Workflow Generator
          </h3>
          <div className="flex-1" />
          <img src="https://n8n.io/favicon.ico" alt="N8N Logo" className="h-5 w-5" />
        </div>
        <p className="text-xs text-wm-blue/60">
          Generate an N8N workflow from your automation scenario
        </p>
      </header>

      <div className="space-y-4">
        {!n8nWorkflow && (
          <button
            type="button"
            onClick={async () => {
              setIsN8NGenerating(true);
              try {
                const { generateN8NWorkflow } = await import('../services/n8nWorkflowGenerator');
                const workflow = generateN8NWorkflow(workflowExplanation);
                setN8nWorkflow(JSON.stringify(workflow, null, 2));
              } catch (error) {
                console.error('Failed to generate N8N workflow:', error);
              } finally {
                setIsN8NGenerating(false);
              }
            }}
            disabled={!hasWorkflow || isN8NGenerating}
            className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-bold transition-all duration-200 ${
              !hasWorkflow
                ? 'bg-wm-neutral/30 text-wm-blue/40 cursor-not-allowed'
                : isN8NGenerating
                ? 'bg-wm-pink/20 text-wm-pink cursor-wait'
                : 'bg-wm-pink/20 text-wm-pink hover:bg-wm-pink/30 hover:text-wm-pink'
            } border ${
              !hasWorkflow
                ? 'border-wm-neutral/30'
                : 'border-wm-pink/30 hover:border-wm-pink/50'
            }`}
          >
            {isN8NGenerating ? (
              <>
                <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                <span>Generating N8N Workflow...</span>
              </>
            ) : (
              <>
                <Icons.Sparkles />
                <span>Generate N8N Workflow</span>
              </>
            )}
          </button>
        )}

        {n8nWorkflow && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-wm-blue">Generated Workflow</h4>
              <div className="flex items-center gap-2">
                {n8nAvailable && (
                  <button
                    type="button"
                    onClick={async () => {
                      setIsPushingToN8N(true);
                      setPushResult(null);
                      try {
                        const { pushWorkflowToN8N } = await import('../services/n8nService');
                        const workflow = JSON.parse(n8nWorkflow);
                        const result = await pushWorkflowToN8N(workflow);
                        setPushResult(result);
                        if (result.success && result.url) {
                          // Show success message, file was downloaded
                          setTimeout(() => {
                            setPushResult({ ...result, url: result.url });
                          }, 100);
                        }
                      } catch (error) {
                        console.error('Failed to download workflow:', error);
                        setPushResult({
                          success: false,
                          error: error instanceof Error ? error.message : 'Unknown error'
                        });
                      } finally {
                        setIsPushingToN8N(false);
                      }
                    }}
                    disabled={isPushingToN8N}
                    className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-bold text-wm-pink bg-wm-pink/10 hover:bg-wm-pink/20 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isPushingToN8N ? (
                      <>
                        <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                        <span>Downloading...</span>
                      </>
                    ) : (
                      <>
                        <Icons.Download />
                        <span>Download for n8n</span>
                      </>
                    )}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(n8nWorkflow);
                  }}
                  className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-bold text-wm-blue bg-wm-neutral/30 hover:bg-wm-neutral/50 rounded-md transition-colors"
                >
                  <Icons.Document />
                  <span>Copy</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setN8nWorkflow('');
                    setPushResult(null);
                  }}
                  className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-bold text-wm-pink bg-wm-pink/10 hover:bg-wm-pink/20 rounded-md transition-colors"
                >
                  <Icons.Trash />
                  <span>Clear</span>
                </button>
              </div>
            </div>
            
            {pushResult && (
              <div className={`p-3 rounded-lg ${pushResult.success ? 'bg-green-50 border border-green-300' : 'bg-wm-pink/10 border border-wm-pink/30'}`}>
                <p className={`text-sm font-bold ${pushResult.success ? 'text-green-700' : 'text-wm-pink'}`}>
                  {pushResult.success ? (
                    <>
                      ✓ Workflow downloaded! Import it in n8n: 
                      <a 
                        href={pushResult.url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="ml-1 underline hover:text-green-600"
                      >
                        Open n8n →
                      </a>
                    </>
                  ) : (
                    <>
                      ✗ Failed to download: {pushResult.error}
                    </>
                  )}
                </p>
              </div>
            )}
            
            <div className="relative group">
              <pre className="overflow-x-auto p-4 rounded-lg bg-wm-blue/5 border border-wm-neutral/30 text-sm text-wm-blue">
                <code>{n8nWorkflow}</code>
              </pre>
              <div className="absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-white/90 to-transparent pointer-events-none" />
            </div>
          </div>
        )}

        <div className="flex items-center gap-2 p-3 rounded-lg bg-wm-neutral/10 border border-wm-neutral/30">
          <Icons.Beaker />
          <p className="text-xs text-wm-blue/60">
            Download your workflow as JSON and import it into n8n: Click "Workflows" → "Import from File" → Select the downloaded JSON file.
          </p>
        </div>
      </div>
    </section>
    </>
  );
};

export default AIActionsPanel;