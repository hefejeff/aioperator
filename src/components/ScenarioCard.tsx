

import React from 'react';
import { useTranslation } from '../i18n';
import type { Scenario, StoredEvaluationResult } from '../types';
import { Icons, DOMAIN_COLORS } from '../constants';

interface ScenarioCardProps {
  scenario: Scenario;
  onSelect: (scenario: Scenario) => void;
  onDelete?: (scenarioId: string) => void;
  isFavorited?: boolean;
  onToggleFavorite?: (scenario: Scenario) => void;
  favoriteBusy?: boolean;
  evaluations?: StoredEvaluationResult[];
}

const ScenarioCard: React.FC<ScenarioCardProps> = ({ scenario, onSelect, isFavorited, onToggleFavorite, favoriteBusy, evaluations }) => {
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
      {/* Domain pill row (right-justified) */}
      {scenario.domain && (
        <div className="absolute top-2 left-2 z-10 flex justify-start">
          <span className={`text-[11px] leading-tight uppercase tracking-wide px-2 py-1 rounded-full font-semibold shadow-sm ${DOMAIN_COLORS[scenario.domain] || DOMAIN_COLORS['General']}`}>{scenario.domain}</span>
        </div>
      )}
      <div className="flex-grow">
        <div className="mb-2 pt-6">
          <h3 className="text-xl font-bold text-wm-accent pr-4">{localizedTitle}</h3>
        </div>
  <p className="text-wm-blue/60 text-sm mb-4">{localizedDescription}</p>
        
        {/* Demo URLs from evaluations */}
        {evaluations && evaluations.length > 0 && (
          <div className="mt-3 pt-3 border-t border-wm-neutral/20 space-y-2">
            <p className="text-xs font-bold text-wm-blue/70 uppercase tracking-wide mb-2">
              {evaluations.length} Run{evaluations.length !== 1 ? 's' : ''}
            </p>
            {evaluations.slice(0, 3).map((evaluation, idx) => (
              <div key={evaluation.id} className="flex items-center gap-2 text-xs">
                {evaluation.demoProjectUrl && (
                  <a
                    href={evaluation.demoProjectUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-wm-accent hover:text-wm-accent/80 font-bold flex items-center gap-1"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                    Demo {idx + 1}
                  </a>
                )}
                {evaluation.demoPublishedUrl && (
                  <a
                    href={evaluation.demoPublishedUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-wm-pink hover:text-wm-pink/80 font-bold flex items-center gap-1"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                    Published {idx + 1}
                  </a>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
      <button className="mt-4 text-sm font-bold text-white bg-wm-accent/80 hover:bg-wm-accent py-2 rounded-md transition-colors w-full">
        {t('scenario.start')}
      </button>
    </div>
  );
};

export default ScenarioCard;