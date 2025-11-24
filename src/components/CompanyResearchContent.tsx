import React from 'react';
import { useTranslation } from '../i18n';
import type { CompanyResearch, Scenario, StoredEvaluationResult } from '../types';

interface CompanyResearchContentProps {
  companyInfo: CompanyResearch;
  scenarioRuns?: Record<string, StoredEvaluationResult[]>;
  scenariosById?: Record<string, Scenario>;
  isScenarioRunsLoading?: boolean;
  onViewWorkflow?: (workflowId: string) => void;
  selectedRunIds?: string[];
  onToggleRunId?: (runId: string) => void;
  onGeneratePrompt?: () => void;
  onCreatePresentation?: () => void;
}

const CompanyResearchContent: React.FC<CompanyResearchContentProps> = ({
  companyInfo,
  scenarioRuns = {},
  scenariosById = {},
  isScenarioRunsLoading = false,
  onViewWorkflow,
  selectedRunIds = [],
  onToggleRunId,
  onGeneratePrompt,
  onCreatePresentation,
}) => {
  const { t } = useTranslation();
  const scenarioEntries = Object.entries(scenarioRuns)
    .filter(([, runs]) => Array.isArray(runs) && runs.length > 0)
    .sort(([, runsA], [, runsB]) => {
      const latestA = runsA[0]?.timestamp ?? 0;
      const latestB = runsB[0]?.timestamp ?? 0;
      return latestB - latestA;
    });

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
      <h2 className="text-lg font-semibold text-white mb-6">{t('research.companyInfo')}</h2>
      
      <div className="space-y-6">
        <div>
          <h3 className="text-white font-medium mb-2">{t('research.description')}</h3>
          <p className="text-slate-300">{companyInfo?.currentResearch?.description || ''}</p>
        </div>

        <div>
          <h3 className="text-white font-medium mb-2">{t('research.industry')}</h3>
          <p className="text-slate-300">{companyInfo?.currentResearch?.industry || ''}</p>
        </div>

        <div>
          <h3 className="text-white font-medium mb-2">{t('research.marketPosition')}</h3>
          <p className="text-slate-300">{companyInfo?.currentResearch?.marketPosition || ''}</p>
        </div>

        <div>
          <h3 className="text-white font-medium mb-2">{t('research.products')}</h3>
          <ul className="list-disc list-inside text-slate-300 space-y-1">
            {companyInfo?.currentResearch?.products?.map((product, index) => (
              <li key={index}>{product}</li>
            )) || []}
          </ul>
        </div>

        <div>
          <h3 className="text-white font-medium mb-2">{t('research.competitors')}</h3>
          <ul className="list-disc list-inside text-slate-300 space-y-1">
            {companyInfo?.currentResearch?.competitors?.map((competitor, index) => (
              <li key={index}>{competitor}</li>
            )) || []}
          </ul>
        </div>

        <div>
          <h3 className="text-white font-medium mb-2">{t('research.challenges')}</h3>
          <ul className="list-disc list-inside text-slate-300 space-y-1">
            {companyInfo?.currentResearch?.challenges?.map((challenge, index) => (
              <li key={index}>{challenge}</li>
            )) || []}
          </ul>
        </div>

        <div>
          <h3 className="text-white font-medium mb-2">{t('research.opportunities')}</h3>
          <ul className="list-disc list-inside text-slate-300 space-y-1">
            {companyInfo?.currentResearch?.opportunities?.map((opportunity, index) => (
              <li key={index}>{opportunity}</li>
            )) || []}
          </ul>
        </div>

        <div>
          <h3 className="text-white font-medium mb-2">{t('research.aiUseCases')}</h3>
          <ul className="list-disc list-inside text-slate-300 space-y-1">
            {companyInfo?.currentResearch?.useCases?.map((useCase, index) => (
              <li key={index}>{useCase}</li>
            )) || []}
          </ul>
        </div>

        <div className="border-t border-slate-700 pt-6">
          <h3 className="text-white font-medium mb-4">{t('research.aiAnalysis')}</h3>
          
          <div className="space-y-4">
            <div>
              <h4 className="text-slate-300 font-medium mb-2">{t('research.currentAI')}</h4>
              <p className="text-slate-400">{companyInfo?.currentResearch?.aiRelevance?.current || ''}</p>
            </div>
            
            <div>
              <h4 className="text-slate-300 font-medium mb-2">{t('research.potentialAI')}</h4>
              <p className="text-slate-400">{companyInfo?.currentResearch?.aiRelevance?.potential || ''}</p>
            </div>
            
            <div>
              <h4 className="text-slate-300 font-medium mb-2">{t('research.aiRecommendations')}</h4>
              <ul className="list-disc list-inside text-slate-400 space-y-1">
                {companyInfo?.currentResearch?.aiRelevance?.recommendations?.map((rec, index) => (
                  <li key={index}>{rec}</li>
                )) || []}
              </ul>
            </div>
          </div>
        </div>

        <div className="border-t border-slate-700 pt-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-white font-medium">{t('research.scenarioRuns')}</h3>
            {onGeneratePrompt && selectedRunIds.length > 0 && (
              <div className="flex gap-2">
                <button
                  onClick={onGeneratePrompt}
                  className="px-3 py-1.5 bg-purple-600 text-white text-sm rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-2"
                >
                  Generate Presentation Prompt
                </button>
                {onCreatePresentation && (
                  <button
                    onClick={onCreatePresentation}
                    className="px-3 py-1.5 bg-emerald-600 text-white text-sm rounded-lg hover:bg-emerald-700 transition-colors flex items-center gap-2"
                  >
                    Create Presentation
                  </button>
                )}
              </div>
            )}
          </div>
          {isScenarioRunsLoading ? (
            <div className="space-y-3">
              <div className="h-4 bg-slate-700/60 rounded w-1/2 animate-pulse"></div>
              <div className="h-4 bg-slate-700/60 rounded w-2/3 animate-pulse"></div>
              <div className="h-4 bg-slate-700/60 rounded w-1/3 animate-pulse"></div>
            </div>
          ) : scenarioEntries.length > 0 ? (
            <div className="space-y-4">
              {scenarioEntries.map(([scenarioId, runs]) => {
                const scenario = scenariosById[scenarioId];
                return (
                  <div key={scenarioId} className="bg-slate-900/40 border border-slate-700 rounded-lg p-4">
                    <h4 className="text-white font-medium mb-3">{scenario?.title || t('research.unknownScenario')}</h4>
                    <ul className="space-y-2">
                      {runs.map(run => {
                        const formattedDate = run.timestamp ? new Date(run.timestamp).toLocaleString() : t('research.unknownRunDate');
                        const scoreLabel = typeof run.score === 'number' ? t('research.runScore', { score: Math.round(run.score) }) : null;
                        const hasWorkflowVersion = Boolean(run.workflowVersionId);

                        return (
                          <li key={run.id} className="flex items-start gap-3">
                            {onToggleRunId && (
                              <div className="pt-3">
                                <input
                                  type="checkbox"
                                  checked={selectedRunIds.includes(run.id)}
                                  onChange={() => onToggleRunId(run.id)}
                                  className="w-4 h-4 rounded border-slate-600 bg-slate-700 text-blue-600 focus:ring-blue-500 focus:ring-offset-slate-800"
                                />
                              </div>
                            )}
                            <button
                              type="button"
                              onClick={() => hasWorkflowVersion && onViewWorkflow?.(run.workflowVersionId!)}
                              className={`w-full text-left text-slate-300 text-sm flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between rounded-md px-3 py-2 ${hasWorkflowVersion ? 'hover:bg-slate-700/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500' : 'cursor-default opacity-70'}`}
                              disabled={!hasWorkflowVersion}
                            >
                              <span className="font-medium text-white">{scenario?.title || t('research.untitledVersion')}</span>
                              <span className="text-slate-400 text-xs sm:text-sm flex flex-col sm:flex-row sm:items-center sm:gap-2">
                                {scoreLabel && <span>{scoreLabel}</span>}
                                <span>{t('research.ranOn', { date: formattedDate })}</span>
                              </span>
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-slate-400">{t('research.noScenarioRuns')}</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default CompanyResearchContent;