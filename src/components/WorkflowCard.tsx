import React from 'react';
import type { User } from 'firebase/auth';
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
  onToggleFavorite?: (scenario: Scenario) => void;
  user?: User;
}

const WorkflowCard: React.FC<WorkflowCardProps> = ({ 
  scenario, 
  workflowVersions, 
  evaluations,
  onViewDetails,
  onViewWorkflow,
  onStartTraining,
  onToggleFavorite,
  user
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
    <div className="group relative bg-gradient-to-br from-slate-800/60 to-slate-900/60 backdrop-blur-xl border border-slate-700/50 rounded-2xl hover:border-sky-500/50 transition-all duration-300 transform hover:-translate-y-2 hover:shadow-2xl hover:shadow-sky-500/10">
      {/* Gradient overlay for depth */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
      
      {/* Header */}
      <div className="relative p-6 border-b border-slate-700/30">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <h3 className="text-xl font-bold text-white mb-3 line-clamp-2 group-hover:text-sky-100 transition-colors">
              {scenario.title}
            </h3>
            <p className="text-slate-400 text-sm line-clamp-3 mb-4 leading-relaxed">
              {scenario.description}
            </p>
            <div className="flex items-center gap-3 text-xs">
              <span className={`px-3 py-1.5 rounded-lg font-medium backdrop-blur-sm ${
                scenario.type === 'TRAINING' 
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' 
                  : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
              }`}>
                {scenario.type === 'TRAINING' ? t('dashboard.training') : t('dashboard.evaluation')}
              </span>
              {scenario.domain && (
                <span className="px-3 py-1.5 bg-slate-700/40 text-slate-300 rounded-lg backdrop-blur-sm border border-slate-600/30">
                  {scenario.domain}
                </span>
              )}
            </div>
          </div>
          
          {/* Star button */}
          {onToggleFavorite && user && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggleFavorite(scenario);
              }}
              className={`flex-shrink-0 ml-4 p-2 rounded-lg transition-all duration-200 ${
                scenario.favoritedBy?.[user.uid]
                  ? 'bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30'
                  : 'bg-slate-700/50 text-slate-400 hover:bg-slate-600/60 hover:text-yellow-400'
              }`}
            >
              <svg
                className={`w-5 h-5 transition-all duration-200 ${
                  scenario.favoritedBy?.[user.uid] ? 'fill-current' : 'fill-none stroke-current'
                }`}
                viewBox="0 0 24 24"
                strokeWidth="2"
              >
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
              </svg>
            </button>
          )}
          <div className="flex-shrink-0 ml-6">
            {hasActivity ? (
              <div className="w-14 h-14 bg-gradient-to-br from-sky-500/20 to-blue-600/20 backdrop-blur-sm rounded-xl flex items-center justify-center group-hover:from-sky-500/30 group-hover:to-blue-600/30 transition-all duration-300 border border-sky-500/20 group-hover:border-sky-400/40">
                <Icons.Check />
              </div>
            ) : (
              <div className="w-14 h-14 bg-gradient-to-br from-slate-700/40 to-slate-800/40 backdrop-blur-sm rounded-xl flex items-center justify-center group-hover:from-slate-600/50 group-hover:to-slate-700/50 transition-all duration-300 border border-slate-600/30">
                <Icons.LightBulb />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Workflow History */}
      <div className="relative p-6">
        <div className="flex items-center justify-between mb-6">
          <h4 className="text-sm font-semibold text-slate-200 uppercase tracking-wider">{t('dashboard.workflowHistory')}</h4>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500">{workflowVersions.length}</span>
            <span className="text-xs text-slate-400 font-medium">{t('dashboard.workflows').toLowerCase()}</span>
          </div>
        </div>
        
        {workflowVersions.length > 0 ? (
          <div className="space-y-3 max-h-56 overflow-y-auto pr-1 scrollbar-thin scrollbar-glow">
            {workflowVersions.slice(0, 5).map((workflow, index) => (
              <div 
                key={workflow.id}
                className="group/item flex items-start justify-between p-4 bg-gradient-to-br from-slate-800/30 to-slate-900/30 backdrop-blur-sm rounded-xl hover:from-slate-700/40 hover:to-slate-800/40 transition-all duration-200 cursor-pointer border border-slate-700/20 hover:border-slate-600/40"
                onClick={() => onViewWorkflow(workflow.id)}
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="text-sm font-semibold text-slate-100 truncate group-hover/item:text-sky-200 transition-colors">
                      {workflow.versionTitle || t('workflowDetail.untitled')}
                    </div>
                    <div className="flex-shrink-0">
                      <span className={`px-2.5 py-1 text-xs rounded-md font-medium ${getPlatformColor(inferPlatform(workflow.prdMarkdown))} bg-slate-800/50 backdrop-blur-sm`}>
                        {inferPlatform(workflow.prdMarkdown)}
                      </span>
                    </div>
                  </div>
                  <div className="text-xs text-slate-400 flex items-center gap-2">
                    <Icons.Star />
                    <span>{formatLastActivity(workflow.timestamp)}</span>
                  </div>
                </div>
                <div className="flex-shrink-0 ml-4 opacity-0 group-hover/item:opacity-100 transition-opacity">
                  <div className="w-8 h-8 bg-sky-500/20 rounded-lg flex items-center justify-center">
                    <Icons.ChevronLeft />
                  </div>
                </div>
              </div>
            ))}
            {workflowVersions.length > 5 && (
              <div className="text-center pt-2">
                <button
                  onClick={() => onViewDetails(scenario.id)}
                  className="text-xs text-sky-400 hover:text-sky-300 transition-colors font-medium px-3 py-2 rounded-lg hover:bg-sky-500/10 border border-transparent hover:border-sky-500/20"
                >
                  {t('dashboard.viewAllWorkflows', { count: workflowVersions.length })}
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-gradient-to-br from-slate-700/30 to-slate-800/30 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-slate-600/30">
              <Icons.Plus />
            </div>
            <div className="text-slate-400 text-sm mb-4 leading-relaxed">{t('dashboard.noWorkflows')}</div>
            <button
              onClick={() => onStartTraining(scenario)}
              className="px-6 py-3 bg-gradient-to-r from-sky-500/20 to-blue-600/20 text-sky-300 border border-sky-500/30 rounded-xl hover:from-sky-500/30 hover:to-blue-600/30 hover:border-sky-400/50 transition-all duration-200 text-sm font-semibold backdrop-blur-sm"
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