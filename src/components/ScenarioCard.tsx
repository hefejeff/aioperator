

import React from 'react';
import { useTranslation } from '../i18n';
import type { Scenario } from '../types';
import { Icons, DOMAIN_COLORS } from '../constants';

interface ScenarioCardProps {
  scenario: Scenario;
  onSelect: (scenario: Scenario) => void;
  highScore?: number;
  averageScore?: number;
  onDelete?: (scenarioId: string) => void;
  onTranslate?: (scenario: Scenario) => void;
  isFavorited?: boolean;
  onToggleFavorite?: (scenario: Scenario) => void;
  favoriteBusy?: boolean;
}

const ScenarioCard: React.FC<ScenarioCardProps> = ({ scenario, onSelect, highScore, averageScore, onTranslate, isFavorited, onToggleFavorite, favoriteBusy }) => {
  const isCustom = !!scenario.userId;
  const { t, lang } = useTranslation();
  const localizedTitle = lang === 'Spanish' && scenario.title_es ? scenario.title_es : scenario.title;
  const localizedDescription = lang === 'Spanish' && scenario.description_es ? scenario.description_es : scenario.description;

  return (
    <div 
      className="bg-slate-800 rounded-lg p-6 border border-slate-700 hover:border-sky-500 transition-all duration-200 cursor-pointer flex flex-col justify-between transform hover:scale-105 relative"
      onClick={() => onSelect(scenario)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter') onSelect(scenario); }}
    >
      {/* Action cluster (favorite, custom badge, delete) */}
      <div className="absolute top-2 right-2 flex items-center gap-2 z-10">
        {isCustom && (
          <span className="text-[10px] leading-none bg-sky-900 text-sky-300 px-2 py-1 rounded-full font-semibold uppercase tracking-wide">{t('scenario.custom')}</span>
        )}
        <button
          onClick={(e) => { e.stopPropagation(); if (!favoriteBusy && onToggleFavorite) onToggleFavorite(scenario); }}
          disabled={favoriteBusy}
          className={`p-1 rounded-full transition-colors disabled:opacity-60 ${isFavorited ? 'text-yellow-400 hover:text-yellow-300' : 'text-slate-400 hover:text-slate-200'}`}
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
            className="text-red-400 hover:text-red-300 p-1 rounded-full"
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
          <h3 className="text-xl font-bold text-sky-400 pr-4">{localizedTitle}</h3>
        </div>
  <p className="text-slate-400 text-sm mb-4">{localizedDescription}</p>
        
        {(highScore !== undefined || averageScore !== undefined) && (
          <div className="space-y-2">
            {highScore !== undefined && (
                <div className="flex items-center space-x-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                    <p className="text-sm font-semibold text-slate-300">
                        {t('scenario.highScore')}: <span className="font-bold text-yellow-400">{highScore}/10</span>
                    </p>
                </div>
            )}
            {averageScore !== undefined && (
                <div className="flex items-center space-x-2">
                    <Icons.ChartBar />
                    <p className="text-sm font-semibold text-slate-300">
                        {t('scenario.avgScore')}: <span className="font-bold text-sky-400">{averageScore.toFixed(1)}/10</span>
                    </p>
                </div>
            )}
          </div>
        )}
      </div>
      <button className="mt-4 text-sm font-semibold text-white bg-sky-600/50 hover:bg-sky-500/70 py-2 rounded-md transition-colors w-full">
        {t('scenario.start')}
      </button>
      {/* Translate button for scenarios missing translations */}
      {(!scenario.title_es || !scenario.description_es || !scenario.goal_es) && (
        <button
          onClick={(e) => { e.stopPropagation(); if (typeof onTranslate === 'function') onTranslate(scenario); }}
          className="mt-2 text-xs font-medium text-slate-800 bg-amber-400 hover:bg-amber-300 py-1 rounded-md transition-colors w-full"
        >
          {t('scenario.translate')}
        </button>
      )}
    </div>
  );
};

export default ScenarioCard;