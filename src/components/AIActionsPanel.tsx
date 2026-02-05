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
  onGeneratePrd: () => Promise<void> | void;
  onGeneratePitch: () => Promise<void> | void;
  onEvaluate: () => Promise<void> | void;
  prdLoading?: boolean;
  pitchLoading?: boolean;
  evalLoading?: boolean;
  disabled?: boolean; // global disable
  onSaveVersion?: () => void;
  savingVersion?: boolean;
  canSaveVersion?: boolean;
  hasEvaluationSaved?: boolean; // Hide save version after evaluation auto-saves
  t: (k: string) => string;
  lastSavedPrdTs?: number | null;
  lastSavedPitchTs?: number | null;
  onOpenLastPrd?: () => void;
  onOpenLastPitch?: () => void;
}

const AIActionsPanel: React.FC<AIActionsPanelProps> = ({
  platforms,
  approaches: _approaches,
  onPlatformChange: _onPlatformChange,
  onApproachesChange: _onApproachesChange,
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
  hasEvaluationSaved,
  t,
  lastSavedPrdTs,
  lastSavedPitchTs,
  onOpenLastPrd,
  onOpenLastPitch,
}) => {
  const [isRunningAll, setIsRunningAll] = useState(false);
  const [runAllStep, setRunAllStep] = useState<'idle' | 'prd' | 'pitch' | 'eval'>('idle');

  const hasWorkflow = workflowExplanation.trim().length > 0;
  const baseDisabled = disabled || !hasWorkflow;

  // Run All function - sequentially runs PRD, Pitch, and Evaluation
  const handleRunAll = async () => {
    if (baseDisabled || isRunningAll) return;
    
    setIsRunningAll(true);
    try {
      // Step 1: Generate PRD
      setRunAllStep('prd');
      await onGeneratePrd();
      
      // Step 2: Generate Pitch
      setRunAllStep('pitch');
      await onGeneratePitch();
      
      // Step 3: Run Evaluation
      setRunAllStep('eval');
      await onEvaluate();
      
    } catch (error) {
      console.error('Run All failed:', error);
    } finally {
      setRunAllStep('idle');
      setIsRunningAll(false);
    }
  };

  const clsBase = 'inline-flex items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-bold transition focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-white disabled:cursor-not-allowed disabled:opacity-60';
  const clsIndigo = clsBase + ' bg-wm-accent hover:bg-wm-accent/90 disabled:bg-wm-neutral disabled:text-wm-blue/50 text-white';
  const clsTeal = clsBase + ' bg-wm-pink hover:bg-wm-pink/90 disabled:bg-wm-neutral disabled:text-wm-blue/50 text-white';
  const clsAmber = clsBase + ' bg-wm-yellow hover:bg-wm-yellow/90 disabled:bg-wm-neutral disabled:text-wm-blue/50 text-wm-blue';
  const now = Date.now();
  const isNew = (ts?: number | null) => !!ts && (now - ts) < 2 * 60 * 1000; // < 2 minutes

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
      <header className="flex items-start justify-between">
        <div className="space-y-1">
          <h3 id="tools-docs-heading" className="text-sm font-bold tracking-wide text-wm-blue uppercase">
            {t('toolsDocs.title') || 'Tools & Docs'}
          </h3>
          <p className="text-xs text-wm-blue/60">
            {t('aiActions.subtitle').replace('{platform}', getPlatformDisplayNames())}
          </p>
        </div>
        <button
          type="button"
          onClick={handleRunAll}
          disabled={baseDisabled || isRunningAll}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-bold rounded-lg bg-gradient-to-r from-wm-accent via-wm-pink to-wm-yellow text-white hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md"
        >
          {isRunningAll ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              {runAllStep === 'prd' ? 'Creating PRD...' : runAllStep === 'pitch' ? 'Creating Pitch...' : runAllStep === 'eval' ? 'Evaluating...' : 'Running...'}
            </>
          ) : (
            <>
              <Icons.Sparkles />
              Run All
            </>
          )}
        </button>
      </header>

      <div className="grid gap-3 sm:grid-cols-3" role="group" aria-label="AI generation actions">
        <button
          type="button"
          onClick={onGeneratePrd}
          disabled={baseDisabled || !!prdLoading || isRunningAll}
          aria-disabled={baseDisabled || !!prdLoading || isRunningAll}
          className={`${clsIndigo} relative ${runAllStep === 'prd' ? 'ring-2 ring-wm-accent ring-offset-2' : ''}`}
        >
          {(prdLoading || runAllStep === 'prd') && (
            <span className="absolute -top-1 -right-1 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-wm-accent opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-wm-accent"></span>
            </span>
          )}
          {prdLoading || runAllStep === 'prd' ? t('loading') : (runAllStep === 'pitch' || runAllStep === 'eval') ? '✓ PRD' : t('prd.generateShort')}
        </button>
        <button
          type="button"
          onClick={onGeneratePitch}
          disabled={baseDisabled || !!pitchLoading || isRunningAll}
          aria-disabled={baseDisabled || !!pitchLoading || isRunningAll}
          className={`${clsTeal} relative ${runAllStep === 'pitch' ? 'ring-2 ring-wm-pink ring-offset-2' : ''}`}
        >
          {(pitchLoading || runAllStep === 'pitch') && (
            <span className="absolute -top-1 -right-1 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-wm-pink opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-wm-pink"></span>
            </span>
          )}
          {pitchLoading || runAllStep === 'pitch' ? t('loading') : runAllStep === 'eval' ? '✓ Pitch' : t('pitch.generateShort')}
        </button>
        <button
          type="button"
          onClick={onEvaluate}
          disabled={baseDisabled || !!evalLoading || isRunningAll}
          aria-disabled={baseDisabled || !!evalLoading || isRunningAll}
          className={`${clsAmber} relative ${runAllStep === 'eval' ? 'ring-2 ring-wm-yellow ring-offset-2' : ''}`}
        >
          {(evalLoading || runAllStep === 'eval') && (
            <span className="absolute -top-1 -right-1 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-wm-yellow opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-wm-yellow"></span>
            </span>
          )}
          {evalLoading || runAllStep === 'eval' ? t('loading') : t('evaluation.run')}
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

      {onSaveVersion && !hasEvaluationSaved && (
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
    </>
  );
};

export default AIActionsPanel;