

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
}

const ScenarioCard: React.FC<ScenarioCardProps> = ({ scenario, onSelect, highScore, averageScore, onTranslate }) => {
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
      {isCustom && (
          <div className="absolute top-2 right-2 flex items-center space-x-2 z-10">
          <span className="text-xs bg-sky-900 text-sky-300 px-2 py-1 rounded-full font-semibold">{t('scenario.custom')}</span>
          {/* delete button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (confirm('Delete this scenario? This cannot be undone.')) {
                // call parent's delete via a custom event -- parent should pass onDelete prop
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
        </div>
      )}
      <div className="flex-grow">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-xl font-bold text-sky-400">{localizedTitle}</h3>
          {scenario.domain && (
            <span className={`text-xs uppercase px-2 py-1 rounded-full font-semibold ${DOMAIN_COLORS[scenario.domain] || DOMAIN_COLORS['General']}`}>{scenario.domain}</span>
          )}
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
                        High Score: <span className="font-bold text-yellow-400">{highScore}/10</span>
                    </p>
                </div>
            )}
            {averageScore !== undefined && (
                <div className="flex items-center space-x-2">
                    <Icons.ChartBar />
                    <p className="text-sm font-semibold text-slate-300">
                        Avg Score: <span className="font-bold text-sky-400">{averageScore.toFixed(1)}/10</span>
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