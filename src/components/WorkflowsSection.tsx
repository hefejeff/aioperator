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

  return (
    <div>
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold text-white mb-2">{t('dashboard.title')}</h2>
            <p className="text-slate-400">{t('dashboard.subtitle')}</p>
          </div>
          
          {/* Filters */}
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium text-slate-300">{t('dashboard.filters')}</span>
            <button
              onClick={onToggleStarred}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-200 ${
                showStarredOnly
                  ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                  : 'bg-slate-700/50 text-slate-400 border border-slate-600/50 hover:bg-slate-600/50 hover:text-slate-300'
              }`}
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
              <span className="text-sm font-medium">
                {showStarredOnly ? t('dashboard.starred') : t('dashboard.all')}
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Workflow Cards List */}
      {filteredScenarios.length > 0 ? (
        <div className="space-y-6 animate-in fade-in duration-500">
          {filteredScenarios.map((scenario, index) => (
            <div 
              key={scenario.id}
              className="animate-in slide-in-from-bottom duration-300"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <WorkflowCard
                scenario={scenario}
                workflowVersions={workflowsByScenario[scenario.id] || []}
                evaluations={evaluations}
                onViewDetails={onViewDetails}
                onViewWorkflow={onViewWorkflow}
                onStartTraining={onStartTraining}
                onToggleFavorite={onToggleFavorite}
                user={user}
              />
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-20 animate-in fade-in duration-700">
          <div className="relative max-w-md mx-auto">
            {/* Background glow effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-sky-500/10 via-blue-500/10 to-emerald-500/10 rounded-3xl blur-2xl animate-pulse"></div>
            
            {/* Icon container */}
            <div className="relative w-32 h-32 bg-gradient-to-br from-slate-800/60 to-slate-900/60 backdrop-blur-xl rounded-3xl flex items-center justify-center mx-auto mb-8 border border-slate-700/50 group hover:border-sky-500/30 transition-all duration-500">
              <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <div className="relative text-slate-400 group-hover:text-sky-400 transition-colors duration-300">
                <Icons.LightBulb />
              </div>
            </div>
            
            {/* Content */}
            <div className="relative">
              <h3 className="text-3xl font-bold text-white mb-4 bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">
                {showStarredOnly ? t('dashboard.noStarred') : t('dashboard.noWorkflows')}
              </h3>
              <p className="text-lg text-slate-400 mb-10 max-w-sm mx-auto leading-relaxed">
                {showStarredOnly 
                  ? t('dashboard.noStarredDesc')
                  : t('dashboard.noWorkflowsDesc')
                }
              </p>
              {!showStarredOnly && (
                <button
                  onClick={onCreateScenario}
                  className="group relative px-10 py-4 bg-gradient-to-r from-sky-500 to-blue-600 text-white font-semibold rounded-2xl hover:shadow-2xl hover:shadow-sky-500/25 transition-all duration-300 hover:-translate-y-1 backdrop-blur-sm border border-sky-400/20 hover:border-sky-300/40"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-white/10 to-transparent rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                  <span className="relative flex items-center gap-3">
                    <Icons.Plus />
                    <span className="text-lg">{t('dashboard.createFirst')}</span>
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