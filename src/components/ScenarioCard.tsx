

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
}

const ScenarioCard: React.FC<ScenarioCardProps> = ({ scenario, onSelect, isFavorited, onToggleFavorite, favoriteBusy }) => {
  const isCustom = !!scenario.userId;
  const { t, lang } = useTranslation();
  const localizedTitle = lang === 'Spanish' && scenario.title_es ? scenario.title_es : scenario.title;
  const localizedDescription = lang === 'Spanish' && scenario.description_es ? scenario.description_es : scenario.description;

  return (
    <div 
      className="bg-white rounded-lg p-6 border border-wm-neutral/30 hover:border-wm-accent transition-all duration-200 cursor-pointer flex flex-col justify-between transform hover:scale-105 relative shadow-sm"
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
      {/* Domain and Sub-domain pills */}
      <div className="absolute top-2 left-2 z-10 flex gap-1.5 flex-wrap max-w-[70%]">
        {scenario.domain && (
          <span className={`text-[11px] leading-tight uppercase tracking-wide px-2 py-1 rounded-full font-semibold shadow-sm ${DOMAIN_COLORS[scenario.domain] || DOMAIN_COLORS['General']}`}>{scenario.domain}</span>
        )}
        {scenario.process && (
          <span className="text-[10px] leading-tight tracking-wide px-2 py-1 rounded-full font-medium bg-wm-accent/10 text-wm-accent border border-wm-accent/20">{scenario.process}</span>
        )}
      </div>
      {/* Industry badge */}
      {scenario.industry && (
        <div className="absolute top-9 left-2 z-10 flex justify-start">
          <span className="text-[10px] leading-tight uppercase tracking-wide px-2 py-0.5 rounded-full font-medium bg-wm-blue/10 text-wm-blue border border-wm-blue/20">{scenario.industry}</span>
        </div>
      )}
      <div className="flex-grow">
        <div className="mb-2 pt-12">
          <h3 className="text-xl font-bold text-wm-accent pr-4">{localizedTitle}</h3>
        </div>
  <p className="text-wm-blue/60 text-sm mb-4 line-clamp-3">{localizedDescription}</p>
      </div>
      <button className="mt-4 text-sm font-bold text-white bg-wm-accent/80 hover:bg-wm-accent py-2 rounded-md transition-colors w-full">
        {t('scenario.start')}
      </button>
    </div>
  );
};

export default ScenarioCard;