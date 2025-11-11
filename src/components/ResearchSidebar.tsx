import React, { useEffect, useState } from 'react';
import { Icons } from '../constants';
import type { RelatedScenario, WorkflowVersion, Scenario } from '../types';
import { useTranslation } from '../i18n';
import { getWorkflowVersions } from '../services/firebaseService';

interface ScenarioCreationContext {
  companyId?: string;
  companyName?: string;
}

interface ResearchSidebarProps {
  relatedScenarios: RelatedScenario[];
  isOpen?: boolean;
  onClose?: () => void;
  onSelectScenario?: (scenario: Scenario) => void;
  onFindOpportunities?: () => void;
  onCreateScenario?: (context?: ScenarioCreationContext) => void;
  selectedScenarios?: string[];
  onToggleScenario?: (scenarioId: string) => void;
  isLoadingOpportunities?: boolean;
  userId: string;
  companyId?: string;
  companyName?: string;
}

const ResearchSidebar: React.FC<ResearchSidebarProps> = ({
  relatedScenarios,
  isOpen = false,
  onClose,
  onSelectScenario,
  onFindOpportunities,
  onCreateScenario,
  selectedScenarios = [],
  onToggleScenario,
  isLoadingOpportunities = false,
  userId,
  companyId,
  companyName
}) => {
  const { t } = useTranslation();
  const [workflowExamples, setWorkflowExamples] = useState<Record<string, WorkflowVersion[]>>({});
  const [expandedScenario, setExpandedScenario] = useState<string | null>(null);

  useEffect(() => {
    const loadWorkflowExamples = async () => {
      const examples: Record<string, WorkflowVersion[]> = {};
      for (const scenario of relatedScenarios) {
        const versions = await getWorkflowVersions(userId, scenario.id);
        if (versions.length > 0) {
          examples[scenario.id] = versions.sort((a, b) => 
            (b.evaluationScore || 0) - (a.evaluationScore || 0)
          ).slice(0, 3); // Get top 3 highest scoring workflows
        }
      }
      setWorkflowExamples(examples);
    };

    if (relatedScenarios.length > 0) {
      loadWorkflowExamples();
    }
  }, [relatedScenarios, userId]);

  return (
    <>
      {/* Overlay */}
      {isOpen && (
        <div
          className="fixed inset-x-0 top-16 bottom-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Side Drawer */}
      <aside
        className={`fixed top-16 right-0 bottom-0 w-80 bg-slate-900/95 backdrop-blur-md border-l border-slate-700/60 shadow-2xl z-50 transform transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="p-4 h-full flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between mb-4 pb-4 border-b border-slate-700/50">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-3">
                <Icons.LightBulb />
                <h2 className="text-lg font-semibold text-white">{t('research.relevantOpportunities')}</h2>
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-slate-800/60 rounded-lg transition-colors lg:hidden ml-auto"
                  title="Close drawer"
                >
                  <Icons.X />
                </button>
              </div>
              <div>
                <h3 className="text-sm font-medium text-slate-400 mb-2">{t('research.findNew')}</h3>
                <div className="flex gap-2">
                  <button
                    onClick={onFindOpportunities}
                    disabled={isLoadingOpportunities}
                    className="flex-1 px-3 py-1.5 bg-emerald-600 text-white text-sm rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-1"
                  >
                    {isLoadingOpportunities ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                    ) : (
                      <Icons.Search className="w-4 h-4" />
                    )}
                    {t('research.findOpportunities')}
                  </button>
                  <button
                    onClick={() => onCreateScenario?.({
                      companyId,
                      companyName
                    })}
                    className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-1"
                  >
                    <Icons.Plus className="w-4 h-4" />
                    {t('research.suggestOpportunity')}
                  </button>
                </div>
                <div className="mt-4 border-b border-slate-700/50" />
              </div>
            </div>
          </div>

          {/* Selected Scenarios Section */}
          <div className="mb-4 pb-4 border-b border-slate-700/50">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-white">{t('research.selectedScenarios')}</h3>
            </div>
            {selectedScenarios.length === 0 ? (
              <div className="text-xs text-slate-500">{t('research.noSelectedScenarios')}</div>
            ) : (
              <div className="space-y-2">
                {relatedScenarios
                  .filter(scenario => selectedScenarios.includes(scenario.id))
                  .map(scenario => (
                    <div 
                      key={scenario.id}
                      className="flex items-center justify-between p-2 rounded bg-slate-800/60 border border-slate-700/30"
                    >
                      <button
                        onClick={() => onSelectScenario?.(scenario)}
                        className="text-xs text-white truncate hover:text-emerald-400 transition-colors text-left flex-1"
                      >
                        {scenario.title}
                      </button>
                      <button 
                        onClick={() => {
                          onToggleScenario?.(scenario.id);
                        }}
                        className="text-xs text-red-400 hover:text-red-300 transition-colors ml-2"
                      >
                        {t('research.removeFromSelected')}
                      </button>
                    </div>
                  ))}
              </div>
            )}
          </div>

          {/* Main Content */}
          <div className="flex-1 overflow-hidden">
            {relatedScenarios.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Icons.Search className="w-8 h-8 text-slate-600 mb-3" />
                <div className="text-sm text-slate-400 mb-2">{t('research.noScenariosYet')}</div>
                <div className="text-xs text-slate-500 px-8">{t('research.searchCompanyFirst')}</div>
              </div>
            ) : (
              <div className="space-y-3 overflow-y-auto h-full pr-2">
                {relatedScenarios.map((scenario) => (
                  <div
                    key={scenario.id}
                    className="rounded-lg bg-slate-800/60 border border-slate-700/30"
                  >
                    {/* Scenario Header */}
                    <div
                      onClick={() => setExpandedScenario(
                        expandedScenario === scenario.id ? null : scenario.id
                      )}
                      className="p-4 cursor-pointer hover:bg-slate-700/60 transition-colors group"
                    >
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <div
                              onClick={(e) => {
                                e.stopPropagation();
                                onToggleScenario?.(scenario.id);
                              }}
                              className="shrink-0 flex items-center justify-center w-5 h-5 rounded border cursor-pointer transition-colors hover:border-emerald-500 hover:bg-slate-700/60 border-slate-600"
                            >
                              {selectedScenarios.includes(scenario.id) ? (
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-emerald-500" viewBox="0 0 20 20" fill="currentColor">
                                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                </svg>
                              ) : (
                                <div className="w-3 h-3 rounded transition-colors group-hover:bg-emerald-500/20" />
                              )}
                            </div>
                            <h3 className="text-sm font-medium text-white group-hover:text-emerald-400 transition-colors">
                              {scenario.title}
                            </h3>
                          </div>
                        </div>
                        <div className="shrink-0">
                          <span className="bg-emerald-900/50 text-emerald-400 px-2 py-1 rounded text-xs">
                            {Math.round(scenario.relevanceScore * 10)}% {t('research.relevanceMatch')}
                          </span>
                        </div>
                      </div>
                      
                      <p className="text-xs text-slate-300 leading-relaxed mb-3">
                        {scenario.description}
                      </p>
                      
                      <p className="text-xs italic text-slate-500">
                        {scenario.relevanceReason}
                      </p>
                    </div>

                    {/* Workflow Examples */}
                    {expandedScenario === scenario.id && workflowExamples[scenario.id]?.length > 0 && (
                      <div className="border-t border-slate-700/30 p-4">
                        <h4 className="text-xs font-medium text-white mb-3">{t('research.workflowExamples')}</h4>
                        <div className="space-y-3">
                          {workflowExamples[scenario.id].map((workflow) => (
                            <div
                              key={workflow.id}
                              onClick={() => onSelectScenario?.(scenario)}
                              className="p-3 rounded bg-slate-900/60 hover:bg-slate-800/60 cursor-pointer transition-colors border border-slate-700/30 group"
                            >
                              <div className="flex items-center justify-between gap-2 mb-2">
                                <h5 className="text-xs font-medium text-emerald-400">
                                  {workflow.versionTitle || t('research.workflowVersion')}
                                </h5>
                                {workflow.evaluationScore && (
                                  <span className="text-xs bg-emerald-900/30 text-emerald-400 px-2 py-0.5 rounded">
                                    {t('research.score')}: {workflow.evaluationScore}
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-slate-400 line-clamp-2">
                                {workflow.workflowExplanation}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* View All Button */}
                    <div className="border-t border-slate-700/30 p-3">
                      <button
                        onClick={() => onSelectScenario?.(scenario)}
                        className="w-full text-xs text-emerald-400 hover:text-emerald-300 transition-colors flex items-center justify-center gap-1"
                      >
                        <Icons.ChevronLeft className="w-4 h-4 transform rotate-180" />
                        {t('research.viewScenario')}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </aside>
    </>
  );
};

export default ResearchSidebar;