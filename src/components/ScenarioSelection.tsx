import React from 'react';
import { useTranslation } from '../i18n';
import type { RelatedScenario } from '../types';
import { Icons } from '../constants';

interface ScenarioSelectionProps {
  scenarios: RelatedScenario[];
  selectedScenarios: string[];
  onToggleScenario: (scenarioId: string) => void;
  onScenarioClick: (scenarioId: string) => void;
}

const ScenarioSelection: React.FC<ScenarioSelectionProps> = ({
  scenarios,
  selectedScenarios,
  onToggleScenario,
  onScenarioClick
}) => {
  const { t } = useTranslation();

  if (scenarios.length === 0) {
    return <div className="text-sm text-slate-400">{t('research.noScenariosYet')}</div>;
  }

  return (
    <div className="space-y-4">
      {scenarios.map((scenario) => (
        <div
          key={scenario.id}
          className={`p-4 rounded-lg border transition-colors ${
            scenario.id.startsWith('suggested-')
              ? 'bg-indigo-900/50 border-indigo-600'
              : 'bg-slate-900/50 border-slate-600'
          }`}
        >
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <button
                  type="button"
                  className="flex items-center gap-2"
                  onClick={() => onToggleScenario(scenario.id)}
                >
                  {selectedScenarios.includes(scenario.id) ? (
                    <Icons.CheckSquare className="w-5 h-5 text-emerald-500" />
                  ) : (
                    <Icons.Square className="w-5 h-5 text-slate-500" />
                  )}
                  <span className="text-white font-medium text-left">{scenario.title}</span>
                </button>
                {scenario.id.startsWith('suggested-') && (
                  <span className="bg-indigo-500/20 text-indigo-300 text-xs px-2 py-0.5 rounded">
                    {t('research.suggested')}
                  </span>
                )}
              </div>
              <p className="text-slate-400 text-sm mb-3">{scenario.description}</p>
            </div>
            <div className="ml-4 flex flex-col gap-2">
              <span className={`px-2 py-1 rounded text-sm ${
                scenario.id.startsWith('suggested-')
                  ? 'bg-indigo-900/50 text-indigo-400'
                  : 'bg-emerald-900/50 text-emerald-400'
              }`}>
                {Math.round(scenario.relevanceScore * 10)}% {t('research.relevanceMatch')}
              </span>
              <button
                onClick={() => onScenarioClick(scenario.id)}
                className="text-sm px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors"
              >
                {t('common.view')}
              </button>
            </div>
          </div>
          <p className={`text-sm italic ${
            scenario.id.startsWith('suggested-') ? 'text-indigo-400/70' : 'text-slate-500'
          }`}>
            {scenario.relevanceReason}
          </p>
        </div>
      ))}
    </div>
  );
};

export default ScenarioSelection;