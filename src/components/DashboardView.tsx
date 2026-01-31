import React, { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import { 
  getScenarios, 
  getAllUserWorkflowVersions, 
  saveUserScenario, 
  toggleFavoriteScenario,
  listCompanyResearch
} from '../services/firebaseService';
import { getDatabase, ref, get } from 'firebase/database';
import type { Scenario, WorkflowVersion, Company, StoredEvaluationResult } from '../types';
import CreateScenarioForm, { ScenarioFormPayload } from './CreateScenarioForm';
import CompaniesSection from './CompaniesSection';

interface DashboardViewProps {
  user: User;
  onStartTraining: (scenario?: Scenario) => void;
  onNavigateToScenario: (scenarioId: string) => void;
  onViewWorkflow: (workflowId: string) => void;
  onScenarioCreated?: (newScenario: Scenario) => void;
  handleNavigate: (view: 'DASHBOARD' | 'TRAINING' | 'ADMIN' | 'RESEARCH', companyId?: string) => void;
}

const DashboardView: React.FC<DashboardViewProps> = ({ user, onStartTraining, onScenarioCreated, handleNavigate }) => {
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [workflowVersions, setWorkflowVersions] = useState<WorkflowVersion[]>([]);
  const [evaluations, setEvaluations] = useState<StoredEvaluationResult[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showStarredOnly, setShowStarredOnly] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [expandedWorkflowId, setExpandedWorkflowId] = useState<string | null>(null);

  // Function to handle starting new company research
  const handleStartNewResearch = () => {
    handleNavigate('RESEARCH');
  };

  // Filter companies based on search query
  const filteredCompanies = companies.filter(company =>
    company.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSelectCompany = (company: Company) => {
    setSearchQuery('');
    setShowSuggestions(false);
    handleNavigate('RESEARCH', company.id);
  };

  const handleStartNewWithSearch = () => {
    setShowSuggestions(false);
    handleNavigate('RESEARCH');
    // Could optionally pre-fill with searchQuery
  };

  useEffect(() => {
    console.log('DashboardView useEffect triggered');
    const fetchData = async () => {
      console.log('fetchData called, user:', user?.uid);
      if (!user || user.isAnonymous) {
        console.log('User is anonymous or missing');
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setError(null);
        console.log('Starting to fetch dashboard data...');

        // Fetch all data in parallel
        const [scenariosData, workflowData, companyResearchData, evaluationsData] = await Promise.all([
          getScenarios(user.uid),
          getAllUserWorkflowVersions(user.uid),
          listCompanyResearch(user.uid),
          (async () => {
            const db = getDatabase();
            const evaluationsRef = ref(db, `evaluations/${user.uid}`);
            const snapshot = await get(evaluationsRef);
            if (snapshot.exists()) {
              const data = snapshot.val();
              return Object.entries(data).map(([id, value]) => ({ id, ...(value as Omit<StoredEvaluationResult, 'id'>) }));
            }
            return [];
          })()
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
        
        console.log('Dashboard Data Loaded:');
        console.log('- Scenarios:', scenariosData.length);
        console.log('- Workflow Versions:', workflowData.length);
        console.log('- Evaluations:', evaluationsData.length);
        console.log('- All evaluations:', evaluationsData);
      } catch (e) {
        console.error('Could not fetch dashboard data', e);
        setError('Failed to load dashboard data');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [user]);

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
        <div className="bg-wm-pink/10 border border-wm-pink/20 rounded-lg p-4 text-wm-pink">
          <p>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-wm-white">
      {/* Create Process Modal */}
      {showCreateModal && (
        <CreateScenarioForm
          onSave={handleScenarioCreated}
          onClose={() => setShowCreateModal(false)}
        />
      )}
      
      {/* Main Content Grid */}
      <div className="container mx-auto px-4 sm:px-6 md:px-8 py-16">
        <div className="w-full">
          
          {/* Company Search Box */}
          <div className="mb-8 max-w-2xl mx-auto">
            <div className="relative">
              <div className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setShowSuggestions(e.target.value.length > 0);
                  }}
                  onFocus={() => setShowSuggestions(searchQuery.length > 0)}
                  placeholder="Search for a company or start new research..."
                  className="w-full px-4 py-3 pl-12 bg-white border-2 border-slate-300 rounded-lg text-slate-900 placeholder-slate-500 focus:outline-none focus:border-wm-blue focus:ring-4 focus:ring-wm-blue/20 transition-all shadow-sm"
                />
                <svg
                  className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>

              {/* Suggestions Dropdown */}
              {showSuggestions && (
                <div className="absolute z-10 w-full mt-2 bg-white border-2 border-slate-300 rounded-lg shadow-2xl max-h-96 overflow-y-auto">
                  {filteredCompanies.length > 0 ? (
                    <>
                      <div className="px-4 py-2 text-xs text-slate-600 font-bold border-b-2 border-slate-200 bg-slate-50">
                        EXISTING COMPANIES
                      </div>
                      {filteredCompanies.map((company) => (
                        <button
                          key={company.id}
                          onClick={() => handleSelectCompany(company)}
                          className="w-full px-4 py-3 text-left hover:bg-wm-blue/10 transition-colors border-b border-slate-200 last:border-0 flex items-center justify-between group"
                        >
                          <div>
                            <div className="text-slate-900 font-bold">{company.name}</div>
                            <div className="text-xs text-slate-600 mt-1">
                              Last updated: {new Date(company.lastUpdated).toLocaleDateString()}
                            </div>
                          </div>
                          <svg className="w-5 h-5 text-slate-400 group-hover:text-wm-blue transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </button>
                      ))}
                    </>
                  ) : searchQuery.length > 0 ? (
                    <div className="px-4 py-3 text-slate-600 text-sm">
                      No companies found matching "{searchQuery}"
                    </div>
                  ) : null}
                  
                  {/* Start New Research Option */}
                  <button
                    onClick={handleStartNewWithSearch}
                    className="w-full px-4 py-3 text-left bg-wm-blue/5 hover:bg-wm-blue/15 transition-colors border-t-2 border-wm-blue/30 flex items-center gap-3"
                  >
                    <svg className="w-5 h-5 text-wm-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    <div>
                      <div className="text-wm-blue font-bold">Start New Company Research</div>
                      <div className="text-xs text-slate-700 mt-0.5">Research a new company</div>
                    </div>
                  </button>
                </div>
              )}
            </div>
          </div>
          
          {/* Main Content - 2/3 Companies + 1/3 Workflows */}
          <div className="flex gap-8">
            {/* Companies Section - 2/3 width */}
            <div className="w-2/3">
              <CompaniesSection
                companies={companies}
                onStartNewResearch={handleStartNewResearch}
                handleNavigate={handleNavigate}
              />
            </div>

            {/* Workflows Library Sidebar - 1/3 width */}
            <div className="w-1/3">
              <div className="sticky top-4">
                <h2 className="text-2xl font-bold text-wm-blue mb-4">Workflow Library</h2>
                <div className="space-y-3">
                  {scenarios.slice(0, 10).map((scenario) => {
                    // Count use cases (workflow versions) for this scenario
                    const useCases = workflowVersions.filter(wv => wv.scenarioId === scenario.id);
                    const isExpanded = expandedWorkflowId === scenario.id;
                    
                    return (
                      <div
                        key={scenario.id}
                        className="bg-white border border-slate-200 rounded-lg hover:border-wm-blue hover:shadow-md transition-all"
                      >
                        {/* Main workflow card */}
                        <div
                          onClick={() => handleStartTraining(scenario)}
                          className="p-4 cursor-pointer group"
                        >
                          <div className="flex items-start justify-between mb-2">
                            <h3 className="text-sm font-bold text-slate-900 group-hover:text-wm-blue transition-colors line-clamp-2">
                              {scenario.title}
                            </h3>
                            {scenario.favoritedBy?.[user.uid] && (
                              <svg className="w-4 h-4 text-wm-yellow flex-shrink-0 ml-2" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                              </svg>
                            )}
                          </div>
                          <p className="text-xs text-slate-600 line-clamp-2 mb-2">
                            {scenario.description}
                          </p>
                          <div className="flex items-center justify-between">
                            {scenario.domain && (
                              <span className="inline-block px-2 py-1 bg-slate-100 text-slate-700 text-xs font-semibold rounded">
                                {scenario.domain}
                              </span>
                            )}
                            {useCases.length > 0 && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setExpandedWorkflowId(isExpanded ? null : scenario.id);
                                }}
                                className="text-xs text-wm-blue hover:text-wm-blue/80 font-medium flex items-center gap-1"
                              >
                                {useCases.length} {useCases.length === 1 ? 'use case' : 'use cases'}
                                <svg
                                  className={`w-3 h-3 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Expandable use cases list */}
                        {isExpanded && useCases.length > 0 && (
                          <div className="border-t border-slate-200 bg-slate-50">
                            {useCases.map((useCase, index) => (
                              <div
                                key={useCase.id}
                                className="px-4 py-3 border-b border-slate-200 last:border-0"
                              >
                                <div className="text-xs font-semibold text-slate-700 mb-1">
                                  {useCase.versionTitle || `Use Case #${index + 1}`}
                                </div>
                                {(() => {
                                  // Check workflow version for demo URLs first
                                  const hasDirectDemoUrls = useCase.demoProjectUrl || useCase.demoPublishedUrl;
                                  
                                  // Fall back to evaluation if workflow version doesn't have demo URLs
                                  const evaluation = !hasDirectDemoUrls && useCase.sourceEvaluationId 
                                    ? evaluations.find(e => e.id === useCase.sourceEvaluationId)
                                    : null;
                                  
                                  const projectUrl = useCase.demoProjectUrl || evaluation?.demoProjectUrl;
                                  const publishedUrl = useCase.demoPublishedUrl || evaluation?.demoPublishedUrl;
                                  const hasDemoUrls = projectUrl || publishedUrl;
                                  
                                  return (
                                    <div className="flex flex-wrap gap-2 mt-2">
                                      {projectUrl && (
                                        <a
                                          href={projectUrl}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          onClick={(e) => e.stopPropagation()}
                                          className="text-xs text-wm-blue hover:underline flex items-center gap-1"
                                        >
                                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                          </svg>
                                          Demo Project
                                        </a>
                                      )}
                                      {publishedUrl && (
                                        <a
                                          href={publishedUrl}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          onClick={(e) => e.stopPropagation()}
                                          className="text-xs text-wm-blue hover:underline flex items-center gap-1"
                                        >
                                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                          </svg>
                                          Published Demo
                                        </a>
                                      )}
                                      {!hasDemoUrls && (
                                        <span className="text-xs text-slate-400 italic">
                                          No demo URLs available
                                        </span>
                                      )}
                                    </div>
                                  );
                                })()}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                  {scenarios.length === 0 && (
                    <div className="text-center py-8 text-slate-500 text-sm">
                      No workflows available
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default DashboardView;
