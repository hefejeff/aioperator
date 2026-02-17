

import React from 'react';
import { useTranslation } from '../i18n';
import type { Scenario } from '../types';
import { Icons, DOMAIN_COLORS } from '../constants';

interface ScenarioCardProps {
  scenario: Scenario;
  onSelect: (scenario: Scenario) => void;
  onDelete?: (scenarioId: string) => void;
  isFavorited?: boolean;
  onToggleFavorite?: (scenario: Scenario) => void;
  favoriteBusy?: boolean;
  processUseCaseCount?: number;
  latestDemoUrl?: string | null;
}

const ScenarioCard: React.FC<ScenarioCardProps> = ({
  scenario,
  onSelect,
  isFavorited,
  onToggleFavorite,
  favoriteBusy,
  processUseCaseCount,
  latestDemoUrl
}) => {
  const isCustom = !!scenario.userId;
  const { t, lang } = useTranslation();
  const localizedTitle = lang === 'Spanish' && scenario.title_es ? scenario.title_es : scenario.title;
  const localizedDescription = lang === 'Spanish' && scenario.description_es ? scenario.description_es : scenario.description;

  return (
    <div 
      className="bg-white rounded-lg p-4 border border-wm-neutral/30 hover:border-wm-accent transition-all duration-200 cursor-pointer flex flex-col transform hover:scale-[1.02] relative shadow-sm"
      onClick={() => onSelect(scenario)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter') onSelect(scenario); }}
    >
      {/* Action cluster (favorite, custom badge, delete) */}
      <div className="absolute top-2 right-2 flex items-center gap-2 z-10">
        {isCustom && (
          <span className="text-[10px] leading-none bg-wm-accent/20 text-wm-accent px-2 py-1 rounded-full font-bold uppercase tracking-wide">{t('scenario.custom')}</span>
        )}
        <button
          onClick={(e) => { e.stopPropagation(); if (!favoriteBusy && onToggleFavorite) onToggleFavorite(scenario); }}
          disabled={favoriteBusy}
          className={`p-1 rounded-full transition-colors disabled:opacity-60 ${isFavorited ? 'text-wm-yellow hover:text-wm-yellow/80' : 'text-wm-blue/40 hover:text-wm-blue/60'}`}
          aria-label={isFavorited ? t('scenario.unfavorite') : t('scenario.favorite')}
          title={isFavorited ? t('scenario.unfavorite') : t('scenario.favorite')}
        >
          {favoriteBusy ? (
            <span className="inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
          ) : isFavorited ? <Icons.StarSolid /> : <Icons.Star />}
        </button>
        {isCustom && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (confirm('Delete this scenario? This cannot be undone.')) {
                const ev = new CustomEvent('scenario-delete', { detail: { id: scenario.id } });
                window.dispatchEvent(ev);
              }
            }}
            className="text-wm-pink hover:text-wm-pink/80 p-1 rounded-full"
            aria-label={t('scenario.delete')}
            title={t('scenario.delete')}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>
      {/* Badges */}
      <div className="absolute top-2 left-2 z-10 flex flex-col gap-1 max-w-[75%]">
        <div className="flex flex-wrap gap-1.5">
          {scenario.domain && (
            <span className={`text-[11px] leading-tight uppercase tracking-wide px-2 py-1 rounded-full font-semibold shadow-sm ${DOMAIN_COLORS[scenario.domain] || DOMAIN_COLORS['General']}`}>{scenario.domain}</span>
          )}
          {scenario.process && (
            <span className="text-[10px] leading-tight tracking-wide px-2 py-1 rounded-full font-medium bg-wm-accent/10 text-wm-accent border border-wm-accent/20">{scenario.process}</span>
          )}
        </div>
        {scenario.industry && (
          <span className="text-[10px] leading-tight uppercase tracking-wide px-2 py-0.5 rounded-full font-medium bg-wm-blue/10 text-wm-blue border border-wm-blue/20">{scenario.industry}</span>
        )}
      </div>
      <div>
        <div className="mb-2 pt-12">
          <h3 className="text-lg font-bold text-wm-accent pr-4 leading-snug">{localizedTitle}</h3>
        </div>
        <p className="text-wm-blue/60 text-xs mb-3 line-clamp-3">{localizedDescription}</p>
      </div>

      <div className="mt-2 flex items-center justify-between gap-2">
        <span className="text-[11px] text-wm-blue/70 font-semibold bg-wm-blue/10 border border-wm-blue/20 px-2 py-1 rounded-full">
          {(processUseCaseCount || 0)} use case{(processUseCaseCount || 0) === 1 ? '' : 's'} in this process
        </span>
        {latestDemoUrl && (
          <a
            href={latestDemoUrl}
            target="_blank"
            rel="noreferrer"
            onClick={(event) => event.stopPropagation()}
            className="inline-flex items-center gap-1 text-[11px] font-semibold text-wm-accent hover:underline"
            title="Open most recent use case demo"
          >
            <Icons.ExternalLink className="w-3.5 h-3.5" />
            Demo
          </a>
        )}
      </div>
    </div>
  );
};

export default ScenarioCard;