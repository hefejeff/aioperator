import React, { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import { 
  getAllUserEvaluations, 
  getScenarios, 
  getAllUserWorkflowVersions, 
  saveUserScenario, 
  toggleFavoriteScenario,
  listCompanyResearch
} from '../services/firebaseService';
import type { Scenario, WorkflowVersion, AggregatedEvaluationResult, Company } from '../types';
import CreateScenarioForm, { ScenarioFormPayload } from './CreateScenarioForm';
import CompaniesSection from './CompaniesSection';
import WorkflowsSection from './WorkflowsSection';

interface DashboardViewProps {
  user: User;
  onStartTraining: (scenario?: Scenario) => void;
  onNavigateToScenario: (scenarioId: string) => void;
  onViewWorkflow: (workflowId: string) => void;
  onScenarioCreated?: (newScenario: Scenario) => void;
  handleNavigate: (view: 'DASHBOARD' | 'TRAINING' | 'ADMIN' | 'RESEARCH', companyId?: string) => void;
}

const DashboardView: React.FC<DashboardViewProps> = ({ user, onStartTraining, onNavigateToScenario, onViewWorkflow, onScenarioCreated, handleNavigate }) => {
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [workflowVersions, setWorkflowVersions] = useState<WorkflowVersion[]>([]);
  const [evaluations, setEvaluations] = useState<AggregatedEvaluationResult[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showStarredOnly, setShowStarredOnly] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [companies, setCompanies] = useState<Company[]>([]);

  // Function to handle starting new company research
  const handleStartNewResearch = () => {
    handleNavigate('RESEARCH');
  };

  useEffect(() => {
    const fetchData = async () => {
      if (!user || user.isAnonymous) {
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setError(null);

        // Fetch all data in parallel
        const [scenariosData, workflowData, evaluationsData, companyResearchData] = await Promise.all([
          getScenarios(user.uid),
          getAllUserWorkflowVersions(user.uid),
          getAllUserEvaluations(user.uid),
          listCompanyResearch(user.uid)
        ]);

        // Transform company research data to match Company interface and deduplicate
        const transformedCompanies = companyResearchData.reduce((uniqueCompanies, researchData) => {
          const { name, currentResearch, history, lastUpdated, selectedScenarios = [] } = researchData;
          const resolvedLastUpdated = lastUpdated ?? Date.now();
          const existingCompany = uniqueCompanies.find(c => c.name.toLowerCase() === name.toLowerCase());
          
          // If company exists, update it only if the new data is more recent
          if (existingCompany) {
            if (resolvedLastUpdated > existingCompany.lastUpdated) {
              existingCompany.lastUpdated = resolvedLastUpdated;
              existingCompany.selectedScenarios = selectedScenarios;
              existingCompany.research = {
                name,
                currentResearch,
                history: [...(history || []), ...(existingCompany.research.history || [])],
                lastUpdated: resolvedLastUpdated
              };
            }
            return uniqueCompanies;
          }

          // If company doesn't exist, add it
          uniqueCompanies.push({
            id: `${name.toLowerCase()}_${Date.now()}`, // Ensure unique ID
            name,
            createdBy: user.uid,
            createdAt: resolvedLastUpdated,
            lastUpdated: resolvedLastUpdated,
            selectedScenarios,
            research: {
              name,
              currentResearch,
              history: history || [],
              lastUpdated: resolvedLastUpdated
            }
          });

          return uniqueCompanies;
        }, [] as Company[]);

        setScenarios(scenariosData);
        setWorkflowVersions(workflowData);
        setEvaluations(evaluationsData);
        setCompanies(transformedCompanies);
      } catch (e) {
        console.error('Could not fetch dashboard data', e);
        setError('Failed to load dashboard data');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [user]);

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

  const handleViewDetails = (scenarioId: string) => {
    onNavigateToScenario(scenarioId);
  };

  const handleStartTraining = (scenario: Scenario) => {
    onStartTraining(scenario);
  };

  const handleScenarioCreated = async (data: ScenarioFormPayload) => {
    try {
      const { title, description, goal, domain, title_es, description_es, goal_es } = data;
      const newScenario = await saveUserScenario(user.uid, {
        title,
        description,
        goal,
        domain: domain || 'General',
        title_es,
        description_es,
        goal_es
      });
      
      setShowCreateModal(false);
      if (onScenarioCreated) {
        onScenarioCreated(newScenario);
      }
      onStartTraining(newScenario);
    } catch (error) {
      console.error('Failed to create scenario:', error);
    }
  };

  const handleToggleFavorite = async (scenario: Scenario) => {
    try {
      const newFavoriteState = await toggleFavoriteScenario(user.uid, scenario);
      
      // Update the scenarios state to reflect the change
      setScenarios(prevScenarios => 
        prevScenarios.map(s => 
          s.id === scenario.id 
            ? {
                ...s,
                favoritedBy: newFavoriteState 
                  ? { ...s.favoritedBy, [user.uid]: true }
                  : Object.fromEntries(Object.entries(s.favoritedBy || {}).filter(([key]) => key !== user.uid))
              }
            : s
        )
      );
    } catch (error) {
      console.error('Failed to toggle favorite:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="animate-fade-in-up">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-500"></div>
          <span className="ml-3 text-slate-400">Loading dashboard...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="animate-fade-in-up">
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 text-red-400">
          <p>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Create Scenario Modal */}
      {showCreateModal && (
        <CreateScenarioForm
          onSave={handleScenarioCreated}
          onClose={() => setShowCreateModal(false)}
        />
      )}
      
      {/* Main Content Grid */}
      <div className="container mx-auto px-4 sm:px-6 md:px-8 py-16">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Companies Section - 2/3 width */}
          <div className="lg:col-span-2 order-1 lg:order-1">
            <CompaniesSection
              companies={companies}
              onStartNewResearch={handleStartNewResearch}
              handleNavigate={handleNavigate}
            />
          </div>
          
          {/* Workflows Section - 1/3 width, sticky sidebar */}
          <div className="lg:col-span-1 order-2 lg:order-2">
            <div className="lg:sticky lg:top-24">
              <WorkflowsSection
                user={user}
                scenarios={filteredScenarios}
                workflowVersions={workflowVersions}
                evaluations={evaluations}
                showStarredOnly={showStarredOnly}
                onToggleStarred={() => setShowStarredOnly(!showStarredOnly)}
                onViewDetails={handleViewDetails}
                onViewWorkflow={onViewWorkflow}
                onStartTraining={handleStartTraining}
                onToggleFavorite={handleToggleFavorite}
                onCreateScenario={() => setShowCreateModal(true)}
              />
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default DashboardView;
