import React, { useEffect, useState } from 'react';
import { Icons } from '../constants';
import type firebase from 'firebase/compat/app';
import { getAllUserWorkflowVersions, getScenarios } from '../services/firebaseService';
import type { WorkflowVersion, Scenario } from '../types';

interface RightSidebarProps {
  user: firebase.User | null;
  onSelectWorkflow?: (workflowId: string) => void;
  isOpen?: boolean;
  onClose?: () => void;
}

const RightSidebar: React.FC<RightSidebarProps> = ({ user, onSelectWorkflow, isOpen = false, onClose }) => {
  // Workflows state
  const [workflows, setWorkflows] = useState<WorkflowVersion[]>([]);
  const [isLoadingWorkflows, setIsLoadingWorkflows] = useState(false);
  // Scenarios state for workflow display
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  // Remove local drawer state since it's now controlled externally

  // const { t } = useTranslation(); // Removed since we're using static text

  const loadWorkflows = async () => {
    if (!user) return;
    
    setIsLoadingWorkflows(true);
    try {
      const userWorkflows = await getAllUserWorkflowVersions(user.uid);
      setWorkflows(userWorkflows);
    } catch (error) {
      console.error('Failed to load workflows:', error);
    } finally {
      setIsLoadingWorkflows(false);
    }
  };

  const loadScenarios = async () => {
    if (!user) return;
    
    try {
      const userScenarios = await getScenarios(user.uid);
      setScenarios(userScenarios);
    } catch (error) {
      console.error('Failed to load scenarios:', error);
    }
  };

  // Helper function to get scenario information for a workflow
  const getScenarioInfo = (scenarioId: string) => {
    return scenarios.find(s => s.id === scenarioId);
  };

  // Helper function to truncate problem description
  const truncateDescription = (description: string, maxLength: number = 150) => {
    if (description.length <= maxLength) return description;
    return description.substring(0, maxLength).trim() + '...';
  };

  useEffect(() => {
    if (!user) return;

    loadWorkflows();
    loadScenarios();

    // Listen for updates so the sidebar stays fresh when new scores are saved elsewhere in the app
    const onUpdate = () => { /* leaderboard removed */ };
    window.addEventListener('leaderboard-updated', onUpdate as EventListener);
    return () => {
      window.removeEventListener('leaderboard-updated', onUpdate as EventListener);
    };
  }, [user]);

  return (
    <>
      {/* Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
          onClick={onClose}
        />
      )}

      {/* Side Drawer */}
      <aside
        className={`fixed top-0 left-0 h-full w-80 bg-slate-900/95 backdrop-blur-md border-r border-slate-700/60 shadow-2xl z-50 transform transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="p-4 h-full flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between mb-4 pb-4 border-b border-slate-700/50">
            <div className="flex items-center gap-2">
              <Icons.Document />
              <h2 className="text-lg font-semibold text-white">My Workflows</h2>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-slate-800/60 rounded-lg transition-colors"
              title="Close drawer"
            >
              <Icons.X />
            </button>
          </div>

          {/* Content */}
          {user && (
            <div className="flex-1 overflow-hidden">
              {isLoadingWorkflows ? (
                <div className="flex items-center justify-center py-8">
                  <div className="text-sm text-slate-400">Loading workflows...</div>
                </div>
              ) : workflows.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <Icons.Document />
                  <div className="text-sm text-slate-400 mb-2">No workflows yet</div>
                  <div className="text-xs text-slate-500">Create your first workflow to get started</div>
                </div>
              ) : (
                <div className="space-y-3 overflow-y-auto h-full pr-2">
                  {workflows.map((workflow) => {
                    const scenario = getScenarioInfo(workflow.scenarioId);
                    
                    return (
                      <div
                        key={workflow.id}
                        onClick={() => {
                          onSelectWorkflow?.(workflow.id);
                          onClose?.();
                        }}
                        className="p-4 rounded-lg bg-slate-800/60 hover:bg-slate-700/60 cursor-pointer transition-colors border border-slate-700/30 hover:border-slate-600/50"
                      >
                        <div className="text-xs text-slate-400 mb-2">
                          {new Date(workflow.timestamp).toLocaleDateString()}
                        </div>
                        
                        <div className="text-sm font-medium text-white mb-2">
                          {workflow.versionTitle || 'Untitled Workflow'}
                        </div>
                        
                        {scenario && (
                          <div className="text-xs text-slate-300 leading-relaxed">
                            {truncateDescription(`${scenario.title}: ${scenario.description}`, 120)}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </aside>
    </>
  );
};

export default RightSidebar;