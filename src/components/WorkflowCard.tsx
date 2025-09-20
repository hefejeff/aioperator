import React from 'react';
import type { Scenario, WorkflowVersion, AggregatedEvaluationResult } from '../types';
import { Icons } from '../constants';
import { useTranslation } from '../i18n';

interface WorkflowCardProps {
  scenario: Scenario;
  workflowVersions: WorkflowVersion[];
  evaluations: AggregatedEvaluationResult[];
  onViewDetails: (scenarioId: string) => void;
  onViewWorkflow: (workflowId: string) => void;
  onStartTraining: (scenario: Scenario) => void;
}

const WorkflowCard: React.FC<WorkflowCardProps> = ({ 
  scenario, 
  workflowVersions, 
  evaluations,
  onViewDetails,
  onViewWorkflow,
  onStartTraining 
}) => {
  const { t } = useTranslation();
  
  // Calculate progress metrics
  const totalWorkflows = workflowVersions.length;
  const evaluationsForScenario = evaluations.filter(evaluation => evaluation.scenarioId === scenario.id);

  // Helper function to get platform color styling
  const getPlatformColor = (platform: string): string => {
    switch (platform) {
      case 'MS 365':
        return 'text-blue-300 border border-blue-500/20';
      case 'Google':
        return 'text-green-300 border border-green-500/20';
      case 'Assistant':
        return 'text-purple-300 border border-purple-500/20';
      case 'Combo':
        return 'text-orange-300 border border-orange-500/20';
      case 'Prompt':
        return 'text-yellow-300 border border-yellow-500/20';
      default:
        return 'text-slate-300 border border-slate-500/20';
    }
  };

  // Helper function to infer platform from PRD content
  const inferPlatform = (prdMarkdown: string | null): string => {
    if (!prdMarkdown) return 'Custom';
    
    const prdLower = prdMarkdown.toLowerCase();
    if (prdLower.includes('microsoft') || prdLower.includes('office') || prdLower.includes('365') || prdLower.includes('teams') || prdLower.includes('outlook')) {
      return 'MS 365';
    } else if (prdLower.includes('google') || prdLower.includes('workspace') || prdLower.includes('gmail') || prdLower.includes('drive') || prdLower.includes('sheets')) {
      return 'Google';
    } else if (prdLower.includes('assistant') || prdLower.includes('chatbot') || prdLower.includes('ai assistant')) {
      return 'Assistant';
    } else if (prdLower.includes('combination') || prdLower.includes('multiple platform') || prdLower.includes('hybrid')) {
      return 'Combo';
    } else if (prdLower.includes('custom prompt') || prdLower.includes('prompt')) {
      return 'Prompt';
    } else {
      return 'Custom';
    }
  };

  // Format last activity date
  const formatLastActivity = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return t('dashboard.today');
    if (diffDays === 1) return t('dashboard.yesterday');
    if (diffDays < 7) return t('dashboard.daysAgo', { count: diffDays });
    if (diffDays < 30) return t('dashboard.weeksAgo', { count: Math.floor(diffDays / 7) });
    return date.toLocaleDateString();
  };

  const hasActivity = totalWorkflows > 0 || evaluationsForScenario.length > 0;

  return (
    <div className="group relative bg-slate-800/50 border border-slate-700 rounded-xl hover:bg-slate-800 hover:border-sky-500 transition-all duration-300 transform hover:-translate-y-1">
      {/* Header */}
      <div className="p-6 border-b border-slate-700/50">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <h3 className="text-xl font-bold text-slate-100 mb-2 line-clamp-2">
              {scenario.title}
            </h3>
            <p className="text-slate-400 text-sm line-clamp-3 mb-3">
              {scenario.description}
            </p>
            <div className="flex items-center gap-2 text-xs">
              <span className={`px-2 py-1 rounded-full font-medium ${
                scenario.type === 'TRAINING' 
                  ? 'bg-green-500/10 text-green-400 border border-green-500/20' 
                  : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
              }`}>
                {scenario.type === 'TRAINING' ? t('dashboard.training') : t('dashboard.evaluation')}
              </span>
              {scenario.domain && (
                <span className="px-2 py-1 bg-slate-700/50 text-slate-300 rounded-full">
                  {scenario.domain}
                </span>
              )}
            </div>
          </div>
          <div className="flex-shrink-0 ml-4">
            {hasActivity ? (
              <div className="w-12 h-12 bg-sky-500/10 rounded-lg flex items-center justify-center group-hover:bg-sky-500/20 transition-colors">
                <Icons.Check />
              </div>
            ) : (
              <div className="w-12 h-12 bg-slate-700/50 rounded-lg flex items-center justify-center group-hover:bg-slate-700 transition-colors">
                <Icons.LightBulb />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Workflow History */}
      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-sm font-medium text-slate-300">{t('dashboard.workflowHistory')}</h4>
          <span className="text-xs text-slate-500">{workflowVersions.length} {t('dashboard.workflows').toLowerCase()}</span>
        </div>
        
        {workflowVersions.length > 0 ? (
          <div className="space-y-3 max-h-48 overflow-y-auto">
            {workflowVersions.slice(0, 5).map((workflow) => (
              <div 
                key={workflow.id}
                className="flex items-start justify-between p-3 bg-slate-800/30 rounded-lg hover:bg-slate-800/50 transition-colors cursor-pointer"
                onClick={() => onViewWorkflow(workflow.id)}
              >
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-slate-200 truncate mb-1">
                    {workflow.versionTitle || t('workflowDetail.untitled')}
                  </div>
                  <div className="mb-1">
                    <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${getPlatformColor(inferPlatform(workflow.prdMarkdown))} bg-slate-700/30`}>
                      {inferPlatform(workflow.prdMarkdown)}
                    </span>
                  </div>
                  <div className="text-xs text-slate-400">
                    {formatLastActivity(workflow.timestamp)}
                  </div>
                </div>
              </div>
            ))}
            {workflowVersions.length > 5 && (
              <div className="text-center">
                <button
                  onClick={() => onViewDetails(scenario.id)}
                  className="text-xs text-sky-400 hover:text-sky-300 transition-colors"
                >
                  {t('dashboard.viewAllWorkflows', { count: workflowVersions.length })}
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-6">
            <div className="text-slate-500 text-sm mb-2">{t('dashboard.noWorkflows')}</div>
            <button
              onClick={() => onStartTraining(scenario)}
              className="px-4 py-2 bg-sky-500/10 text-sky-400 border border-sky-500/20 rounded-lg hover:bg-sky-500/20 hover:border-sky-500/40 transition-all duration-200 text-sm font-medium"
            >
              {t('dashboard.start')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default WorkflowCard;