import React from 'react';
import { useTranslation } from '../i18n';
import { User } from 'firebase/auth';
import { Icons } from '../constants';
import type { Scenario, WorkflowVersion, AggregatedEvaluationResult } from '../types';
import WorkflowCard from './WorkflowCard';

interface WorkflowsSectionProps {
  user: User;
  scenarios: Scenario[];
  workflowVersions: WorkflowVersion[];
  evaluations: AggregatedEvaluationResult[];
  showStarredOnly: boolean;
  onToggleStarred: () => void;
  onViewDetails: (scenarioId: string) => void;
  onViewWorkflow: (workflowId: string) => void;
  onStartTraining: (scenario: Scenario) => void;
  onToggleFavorite: (scenario: Scenario) => Promise<void>;
  onCreateScenario: () => void;
}

const WorkflowsSection: React.FC<WorkflowsSectionProps> = ({
  user,
  scenarios,
  workflowVersions,
  evaluations,
  showStarredOnly,
  onToggleStarred,
  onViewDetails,
  onViewWorkflow,
  onStartTraining,
  onToggleFavorite,
  onCreateScenario
}) => {
  const { t } = useTranslation();
  const [expandedScenarios, setExpandedScenarios] = React.useState<Set<string>>(() => new Set());

  // Group workflow versions by scenario
  const workflowsByScenario = workflowVersions.reduce((acc, workflow) => {
    if (!acc[workflow.scenarioId]) {
      acc[workflow.scenarioId] = [];
    }
    acc[workflow.scenarioId].push(workflow);
    return acc;
  }, {} as Record<string, WorkflowVersion[]>);

  // Filter scenarios to only show those with completed workflows
  const scenariosWithWorkflows = scenarios.filter(scenario => 
    workflowsByScenario[scenario.id] && workflowsByScenario[scenario.id].length > 0
  );

  // Apply star filter
  const filteredScenarios = showStarredOnly 
    ? scenariosWithWorkflows.filter(scenario => scenario.favoritedBy?.[user.uid])
    : scenariosWithWorkflows;

  // Sort scenarios: 1) Has runs, 2) Starred, 3) Rest
  const sortedScenarios = [...filteredScenarios].sort((a, b) => {
    const aHasRuns = workflowsByScenario[a.id]?.length > 0;
    const bHasRuns = workflowsByScenario[b.id]?.length > 0;
    const aStarred = !!a.favoritedBy?.[user.uid];
    const bStarred = !!b.favoritedBy?.[user.uid];

    // 1. Prioritize workflows the user has run
    if (aHasRuns && !bHasRuns) return -1;
    if (!aHasRuns && bHasRuns) return 1;

    // 2. Then prioritize starred workflows
    if (aStarred && !bStarred) return -1;
    if (!aStarred && bStarred) return 1;

    // 3. Rest stay in their order
    return 0;
  });

  const toggleScenarioExpansion = (scenarioId: string) => {
    setExpandedScenarios(prev => {
      const next = new Set(prev);
      if (next.has(scenarioId)) {
        next.delete(scenarioId);
      } else {
        next.add(scenarioId);
      }
      return next;
    });
  };

  return (
    <div className="bg-wm-white rounded-2xl p-6 border border-wm-neutral shadow-lg">
      <div className="mb-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold text-wm-blue flex items-center gap-2">
            <svg className="w-5 h-5 text-wm-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            {t('dashboard.workflows')}
          </h2>
          
          <div className="flex items-center gap-1.5">
            <button
              onClick={onCreateScenario}
              className="p-1.5 bg-wm-accent text-wm-white rounded-md hover:bg-wm-accent/90 transition-colors"
              title={t('dashboard.newWorkflow')}
            >
              <Icons.Plus className="w-4 h-4" />
            </button>

            <button
              onClick={onToggleStarred}
              className={`p-1.5 rounded-md transition-all duration-200 ${
                showStarredOnly
                  ? 'bg-wm-yellow/20 text-wm-blue border border-wm-yellow/40'
                  : 'bg-wm-neutral/40 text-wm-blue/60 border border-wm-neutral hover:bg-wm-neutral/60'
              }`}
              title={showStarredOnly ? t('dashboard.starred') : t('dashboard.all')}
            >
              <svg
                className={`w-4 h-4 transition-all duration-200 ${
                  showStarredOnly ? 'fill-current' : 'fill-none stroke-current'
                }`}
                viewBox="0 0 24 24"
                strokeWidth="2"
              >
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
              </svg>
            </button>
          </div>
        </div>
        <p className="text-xs text-wm-blue/50">{t('dashboard.workflowsSubtitle')}</p>
      </div>

      {/* Workflow Cards List */}
      {sortedScenarios.length > 0 ? (
        <div className="space-y-3 animate-in fade-in duration-500 max-h-[calc(100vh-16rem)] overflow-y-auto pr-2">
          {sortedScenarios.map((scenario, index) => {
            const isExpanded = expandedScenarios.has(scenario.id);
            const isFavorited = !!scenario.favoritedBy?.[user.uid];
            const workflowCount = workflowsByScenario[scenario.id]?.length ?? 0;

            return (
              <div 
                key={scenario.id}
                className="animate-in slide-in-from-bottom duration-300"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="bg-wm-neutral/20 border border-wm-neutral rounded-xl p-3 hover:border-wm-accent/40 transition-all duration-200 hover:shadow-lg">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => toggleScenarioExpansion(scenario.id)}
                      className="flex-1 flex items-center justify-between gap-2 text-left px-3 py-2 rounded-lg hover:bg-wm-neutral/40 transition-colors min-w-0"
                    >
                      <div className="min-w-0 flex-1">
                        <h3 className="text-sm font-bold text-wm-blue truncate">{scenario.title}</h3>
                        <div className="flex items-center gap-2 text-xs text-wm-blue/60 mt-1">
                          <span className="uppercase tracking-wider font-medium whitespace-nowrap">{workflowCount} {t('dashboard.workflows')}</span>
                          {scenario.domain && <span className="text-wm-accent truncate">• {scenario.domain}</span>}
                        </div>
                      </div>
                      <span className={`flex-shrink-0 text-wm-blue/60 transition-transform ${isExpanded ? 'rotate-90' : '-rotate-90'}`}>
                        <Icons.ChevronLeft className="w-4 h-4" />
                      </span>
                    </button>

                    {onToggleFavorite && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleFavorite(scenario);
                        }}
                        className={`flex-shrink-0 p-2 rounded-lg transition-all duration-200 ${
                          isFavorited
                            ? 'bg-wm-yellow/20 text-wm-blue border border-wm-yellow/40 shadow-lg'
                            : 'bg-wm-neutral/40 text-wm-blue/60 border border-wm-neutral hover:bg-wm-neutral/60 hover:text-wm-blue hover:border-wm-yellow/40'
                        }`}
                        aria-label={isFavorited ? t('dashboard.unfavorite') : t('dashboard.favorite')}
                      >
                        <svg
                          className={`w-4 h-4 transition-all duration-200 ${
                            isFavorited ? 'fill-current' : 'fill-none stroke-current'
                          }`}
                          viewBox="0 0 24 24"
                          strokeWidth="2"
                        >
                          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                        </svg>
                      </button>
                    )}
                  </div>

                  {isExpanded && (
                    <div className="mt-3 border-t border-wm-neutral pt-3 max-h-96 overflow-y-auto">
                      <WorkflowCard
                        scenario={scenario}
                        workflowVersions={workflowsByScenario[scenario.id] || []}
                        evaluations={evaluations}
                        onViewDetails={onViewDetails}
                        onViewWorkflow={onViewWorkflow}
                        onStartTraining={onStartTraining}
                        onToggleFavorite={onToggleFavorite}
                        user={user}
                        showFavoriteButton={false}
                      />
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-16 animate-in fade-in duration-700">
          <div className="relative max-w-xs mx-auto">            
            {/* Icon container */}
            <div className="relative w-20 h-20 bg-wm-neutral/30 rounded-2xl flex items-center justify-center mx-auto mb-6 border border-wm-neutral shadow-lg">
              <div className="text-wm-blue/40">
                <Icons.LightBulb className="w-8 h-8" />
              </div>
            </div>
            
            {/* Content */}
            <div className="relative">
              <h3 className="text-lg font-bold text-wm-blue mb-3">
                {showStarredOnly ? t('dashboard.noStarred') : t('dashboard.noWorkflows')}
              </h3>
              <p className="text-sm text-wm-blue/60 mb-8 max-w-xs mx-auto leading-relaxed">
                {showStarredOnly 
                  ? t('dashboard.noStarredDesc')
                  : t('dashboard.noWorkflowsDesc')
                }
              </p>
              {!showStarredOnly && (
                <button
                  onClick={onCreateScenario}
                  className="px-6 py-3 bg-wm-accent text-wm-white text-sm font-bold rounded-xl hover:bg-wm-accent/90 transition-all duration-300 shadow-lg hover:shadow-xl"
                >
                  <span className="flex items-center gap-2">
                    <Icons.Plus className="w-4 h-4" />
                    <span>{t('dashboard.createFirst')}</span>
                  </span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WorkflowsSection;