import React from 'react';

export type AIActionsPlatform =
  | 'MS365'
  | 'GOOGLE'
  | 'CUSTOM'
  | 'CUSTOM_PROMPT'
  | 'ASSISTANT'
  | 'COMBINATION';

export interface AIActionsPanelProps {
  platforms: AIActionsPlatform[];
  onPlatformsChange: (platforms: AIActionsPlatform[]) => void;
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
  onPlatformsChange,
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
  const hasWorkflow = workflowExplanation.trim().length > 0;
  const baseDisabled = disabled || !hasWorkflow;

  const clsBase = 'inline-flex items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 disabled:cursor-not-allowed disabled:opacity-60';
  const clsIndigo = clsBase + ' bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-600 disabled:text-slate-300 text-white';
  const clsTeal = clsBase + ' bg-teal-600 hover:bg-teal-500 disabled:bg-slate-600 disabled:text-slate-300 text-white';
  const clsAmber = clsBase + ' bg-amber-600 hover:bg-amber-500 disabled:bg-slate-600 disabled:text-slate-300 text-white';
  const now = Date.now();
  const isNew = (ts?: number | null) => !!ts && (now - ts) < 2 * 60 * 1000; // < 2 minutes

  const allPlatforms: AIActionsPlatform[] = ['MS365', 'GOOGLE', 'CUSTOM', 'CUSTOM_PROMPT', 'ASSISTANT', 'COMBINATION'];
  
  const handlePlatformToggle = (platform: AIActionsPlatform) => {
    if (platforms.includes(platform)) {
      onPlatformsChange(platforms.filter(p => p !== platform));
    } else {
      onPlatformsChange([...platforms, platform]);
    }
  };

  const getPlatformDisplayNames = () => {
    if (platforms.length === 0) return t('aiActions.platformFallback') || 'your platform';
    if (platforms.length === 1) {
      const platform = platforms[0];
      return platform === 'MS365' ? t('platform.ms365') 
        : platform === 'GOOGLE' ? t('platform.google')
        : platform === 'CUSTOM' ? t('platform.custom')
        : platform === 'CUSTOM_PROMPT' ? t('platform.customPrompt')
        : platform === 'ASSISTANT' ? t('platform.assistant')
        : platform === 'COMBINATION' ? t('platform.combination')
        : platform;
    }
    return `${platforms.length} platforms`;
  };

  return (
    <section className="rounded-xl border border-slate-700 bg-slate-800/60 p-5 space-y-5" aria-labelledby="tools-docs-heading">
      <header className="space-y-1">
        <h3 id="tools-docs-heading" className="text-sm font-semibold tracking-wide text-slate-300 uppercase">
          {t('toolsDocs.title') || 'Tools & Docs'}
        </h3>
        <p className="text-xs text-slate-400">
          {t('aiActions.subtitle').replace('{platform}', getPlatformDisplayNames())}
        </p>
      </header>

      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <label className="text-xs font-medium text-slate-400">
            {t('aiActions.platformOptions') || 'Platform Options'}
          </label>
          {!hasWorkflow && (
            <span className="text-[11px] text-slate-400 ml-auto">
              {t('aiActions.needWorkflow')}
            </span>
          )}
        </div>
        <div className="grid grid-cols-2 gap-2">
          {allPlatforms.map((platform) => {
            const getTranslationKey = (p: AIActionsPlatform) => {
              switch (p) {
                case 'MS365': return 'platform.ms365';
                case 'GOOGLE': return 'platform.google';
                case 'CUSTOM': return 'platform.custom';
                case 'CUSTOM_PROMPT': return 'platform.customPrompt';
                case 'ASSISTANT': return 'platform.assistant';
                case 'COMBINATION': return 'platform.combination';
                default: return null;
              }
            };
            
            return (
              <label key={platform} className="flex items-center space-x-2 text-sm text-slate-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={platforms.includes(platform)}
                  onChange={() => handlePlatformToggle(platform)}
                  className="rounded border-slate-600 bg-slate-900 text-sky-600 focus:ring-sky-500 focus:ring-offset-slate-900"
                />
                <span>{t(getTranslationKey(platform) || '') || platform}</span>
              </label>
            );
          })}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3" role="group" aria-label="AI generation actions">
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
          onClick={onGeneratePrd}
          disabled={baseDisabled || !!prdLoading}
          aria-disabled={baseDisabled || !!prdLoading}
          className={clsIndigo}
        >
          {prdLoading ? t('loading') : t('prd.generateShort')}
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
        <div className="mt-2 rounded-lg border border-sky-700/50 bg-gradient-to-br from-slate-900/70 via-slate-900/40 to-slate-800/60 p-4 shadow-inner ring-1 ring-sky-500/10">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[11px] font-semibold tracking-wider text-sky-300 flex items-center gap-1">
              <span className="inline-block h-2 w-2 rounded-full bg-sky-400 animate-pulse" />
              {(t('toolsDocs.recent') || 'Recent Docs').toUpperCase()}
            </p>
            {(isNew(lastSavedPrdTs) || isNew(lastSavedPitchTs)) && (
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 animate-pulse">NEW</span>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {lastSavedPrdTs && (
              <button
                type="button"
                onClick={onOpenLastPrd}
                className="group relative inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-sky-700/30 hover:bg-sky-600/40 text-sky-300 hover:text-white text-xs font-medium border border-sky-600/40 hover:border-sky-500 transition"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z"/><path d="M8 10h4v1H8v-1zm0 2h4v1H8v-1z"/></svg>
                <span>{t('toolsDocs.latestPrd') || 'Latest PRD'}</span>
                <span className="text-[9px] text-slate-400 group-hover:text-slate-300 ml-1">{new Date(lastSavedPrdTs).toLocaleTimeString()}</span>
              </button>
            )}
            {lastSavedPitchTs && (
              <button
                type="button"
                onClick={onOpenLastPitch}
                className="group relative inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-violet-700/30 hover:bg-violet-600/40 text-violet-300 hover:text-white text-xs font-medium border border-violet-600/40 hover:border-violet-500 transition"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m6-6H6"/></svg>
                <span>{t('toolsDocs.latestPitch') || 'Latest Pitch'}</span>
                <span className="text-[9px] text-slate-400 group-hover:text-slate-300 ml-1">{new Date(lastSavedPitchTs).toLocaleTimeString()}</span>
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
            className="inline-flex items-center gap-2 rounded-md bg-slate-700 hover:bg-slate-600 disabled:opacity-50 px-4 py-2 text-sm text-slate-200"
          >
            {savingVersion ? (
              <div className="w-4 h-4 border-2 border-white/70 border-t-transparent rounded-full animate-spin" />
            ) : null}
            <span>Save Version</span>
          </button>
        </div>
      )}
    </section>
  );
};

export default AIActionsPanel;
