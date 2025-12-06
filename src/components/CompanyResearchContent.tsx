import React from 'react';
import { useTranslation } from '../i18n';
import type { CompanyResearch, Scenario, StoredEvaluationResult } from '../types';

interface CompanyResearchContentProps {
  companyInfo: CompanyResearch;
  scenarioRuns?: Record<string, StoredEvaluationResult[]>;
  scenariosById?: Record<string, Scenario>;
  isScenarioRunsLoading?: boolean;
  onViewWorkflow?: (workflowId: string, companyName?: string, companyId?: string) => void;
  companyId?: string;
  selectedRunIds?: string[];
  onToggleRunId?: (runId: string) => void;
  onGenerateDiviPrompt?: () => void;
  isCreatingWordPressPage?: boolean;
  wordPressPageUrl?: string | null;
  onCreatePresentation?: () => void;
  onDeleteRun?: (runId: string) => void;
}

const CompanyResearchContent: React.FC<CompanyResearchContentProps> = ({
  companyInfo,
  scenarioRuns = {},
  scenariosById = {},
  isScenarioRunsLoading = false,
  onViewWorkflow,
  companyId,
  selectedRunIds = [],
  onToggleRunId,
  onGenerateDiviPrompt,
  isCreatingWordPressPage = false,
  wordPressPageUrl = null,
  onCreatePresentation,
  onDeleteRun,
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
    <div className="bg-wm-white border border-wm-neutral rounded-xl p-6">
      <h2 className="text-lg font-bold text-wm-blue mb-6">{t('research.companyInfo')}</h2>
      
      <div className="space-y-6">
        <div>
          <h3 className="text-wm-blue font-bold mb-2">{t('research.description')}</h3>
          <p className="text-wm-blue/70">{companyInfo?.currentResearch?.description || ''}</p>
        </div>

        <div>
          <h3 className="text-wm-blue font-bold mb-2">{t('research.industry')}</h3>
          <p className="text-wm-blue/70">{companyInfo?.currentResearch?.industry || ''}</p>
        </div>

        <div>
          <h3 className="text-wm-blue font-bold mb-2">{t('research.marketPosition')}</h3>
          <p className="text-wm-blue/70">{companyInfo?.currentResearch?.marketPosition || ''}</p>
        </div>

        <div>
          <h3 className="text-wm-blue font-bold mb-2">{t('research.products')}</h3>
          <ul className="list-disc list-inside text-wm-blue/70 space-y-1">
            {companyInfo?.currentResearch?.products?.map((product, index) => (
              <li key={index}>{product}</li>
            )) || []}
          </ul>
        </div>

        <div>
          <h3 className="text-wm-blue font-bold mb-2">{t('research.competitors')}</h3>
          <ul className="list-disc list-inside text-wm-blue/70 space-y-1">
            {companyInfo?.currentResearch?.competitors?.map((competitor, index) => (
              <li key={index}>{competitor}</li>
            )) || []}
          </ul>
        </div>

        <div>
          <h3 className="text-wm-blue font-bold mb-2">{t('research.challenges')}</h3>
          <ul className="list-disc list-inside text-wm-blue/70 space-y-1">
            {companyInfo?.currentResearch?.challenges?.map((challenge, index) => (
              <li key={index}>{challenge}</li>
            )) || []}
          </ul>
        </div>

        <div>
          <h3 className="text-wm-blue font-bold mb-2">{t('research.opportunities')}</h3>
          <ul className="list-disc list-inside text-wm-blue/70 space-y-1">
            {companyInfo?.currentResearch?.opportunities?.map((opportunity, index) => (
              <li key={index}>{opportunity}</li>
            )) || []}
          </ul>
        </div>

        <div>
          <h3 className="text-wm-blue font-bold mb-2">{t('research.aiUseCases')}</h3>
          <ul className="list-disc list-inside text-wm-blue/70 space-y-1">
            {companyInfo?.currentResearch?.useCases?.map((useCase, index) => (
              <li key={index}>{useCase}</li>
            )) || []}
          </ul>
        </div>

        <div className="border-t border-wm-neutral pt-6">
          <h3 className="text-wm-blue font-bold mb-4">{t('research.aiAnalysis')}</h3>
          
          <div className="space-y-4">
            <div>
              <h4 className="text-wm-blue/80 font-bold mb-2">{t('research.currentAI')}</h4>
              <p className="text-wm-blue/60">{companyInfo?.currentResearch?.aiRelevance?.current || ''}</p>
            </div>
            
            <div>
              <h4 className="text-wm-blue/80 font-bold mb-2">{t('research.potentialAI')}</h4>
              <p className="text-wm-blue/60">{companyInfo?.currentResearch?.aiRelevance?.potential || ''}</p>
            </div>
            
            <div>
              <h4 className="text-wm-blue/80 font-bold mb-2">{t('research.aiRecommendations')}</h4>
              <ul className="list-disc list-inside text-wm-blue/60 space-y-1">
                {companyInfo?.currentResearch?.aiRelevance?.recommendations?.map((rec, index) => (
                  <li key={index}>{rec}</li>
                )) || []}
              </ul>
            </div>
          </div>
        </div>

        <div className="border-t border-wm-neutral pt-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-wm-blue font-bold">{t('research.scenarioRuns')}</h3>
            {selectedRunIds.length > 0 && (
              <div className="flex gap-2">
                {onGenerateDiviPrompt && (
                  <button
                    onClick={onGenerateDiviPrompt}
                    disabled={isCreatingWordPressPage}
                    className="px-3 py-1.5 bg-wm-accent text-wm-white text-sm font-bold rounded-lg hover:bg-wm-accent/90 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isCreatingWordPressPage ? (
                      <>
                        <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Creating Page...
                      </>
                    ) : (
                      'Create WordPress Page'
                    )}
                  </button>
                )}
                {onCreatePresentation && (
                  <button
                    onClick={onCreatePresentation}
                    className="px-3 py-1.5 bg-wm-accent text-wm-white text-sm font-bold rounded-lg hover:bg-wm-accent/90 transition-colors flex items-center gap-2"
                  >
                    Gen AI Prompt
                  </button>
                )}
              </div>
            )}
          </div>
          {wordPressPageUrl && (
            <div className="mb-4 p-3 bg-wm-accent/10 border border-wm-accent/30 rounded-lg">
              <p className="text-wm-accent text-sm">
                ✓ WordPress page created successfully!{' '}
                <a 
                  href={wordPressPageUrl} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="underline hover:text-wm-accent/80"
                >
                  View Page →
                </a>
              </p>
            </div>
          )}
          {isScenarioRunsLoading ? (
            <div className="space-y-3">
              <div className="h-4 bg-wm-neutral/60 rounded w-1/2 animate-pulse"></div>
              <div className="h-4 bg-wm-neutral/60 rounded w-2/3 animate-pulse"></div>
              <div className="h-4 bg-wm-neutral/60 rounded w-1/3 animate-pulse"></div>
            </div>
          ) : scenarioEntries.length > 0 ? (
            <div className="space-y-4">
              {scenarioEntries.map(([scenarioId, runs]) => {
                const scenario = scenariosById[scenarioId];
                return (
                  <div key={scenarioId} className="bg-wm-neutral/20 border border-wm-neutral rounded-lg p-4">
                    <h4 className="text-wm-blue font-bold mb-3">{scenario?.title || t('research.unknownScenario')}</h4>
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
                                  className="w-4 h-4 rounded border-wm-neutral bg-wm-white text-wm-accent focus:ring-wm-accent focus:ring-offset-wm-white"
                                />
                              </div>
                            )}
                            <button
                              type="button"
                              onClick={() => hasWorkflowVersion && onViewWorkflow?.(run.workflowVersionId!, companyInfo.name, companyId)}
                              className={`flex-1 text-left text-wm-blue/70 text-sm flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between rounded-md px-3 py-2 ${hasWorkflowVersion ? 'hover:bg-wm-neutral/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-wm-accent' : 'cursor-default opacity-70'}`}
                              disabled={!hasWorkflowVersion}
                            >
                              <span className="font-bold text-wm-blue">{scenario?.title || t('research.untitledVersion')}</span>
                              <span className="text-wm-blue/50 text-xs sm:text-sm flex flex-col sm:flex-row sm:items-center sm:gap-2">
                                {scoreLabel && <span>{scoreLabel}</span>}
                                <span>{t('research.ranOn', { date: formattedDate })}</span>
                              </span>
                            </button>
                            {onDeleteRun && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (window.confirm(t('research.confirmDeleteRun'))) {
                                    onDeleteRun(run.id);
                                  }
                                }}
                                className="p-2 text-wm-pink hover:bg-wm-pink/10 rounded-md transition-colors flex-shrink-0"
                                title={t('common.delete')}
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-wm-blue/50">{t('research.noScenarioRuns')}</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default CompanyResearchContent;