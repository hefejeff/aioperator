import React, { useState, useEffect } from 'react';
import { Icons } from '../constants';
import { useTranslation } from '../i18n';
import RfpUploadField from './RfpUploadField';
import type { CompanyResearch as CompanyInfo, CompanyResearchEntry, RelatedScenario, Company, Scenario, StoredEvaluationResult } from '../types';
import ResearchSidebar from './ResearchSidebar';
import { getScenarios, getCompanyResearch, saveCompanyResearch, getEvaluations } from '../services/firebaseService';
import { researchCompany, findRelevantScenarios } from '../services/geminiService';
import { saveCompany, getCompany, updateCompanySelectedScenarios } from '../services/companyService';
import { ref, onValue } from 'firebase/database';
import { db } from '../services/firebaseInit';
import ResearchListView from './ResearchListView';
import RfpAnalysisView from './RfpAnalysisView';
import CompanyResearchContent from './CompanyResearchContent';

interface CompanyResearchProps {
  userId: string;
  initialCompany?: string;  // This is now expected to be a company ID
  onSelectScenario?: (scenario: Scenario) => void;
  onCreateScenario?: (context?: { companyId?: string; companyName?: string }) => void;
  onViewWorkflow?: (workflowId: string) => void;
}

type View = 'LIST' | 'RESEARCH';

const CompanyResearch: React.FC<CompanyResearchProps> = ({
  userId,
  initialCompany,
  onSelectScenario,
  onCreateScenario,
  onViewWorkflow,
}) => {
  const [view, setView] = useState<View>(initialCompany ? 'RESEARCH' : 'LIST');
  const [companyName, setCompanyName] = useState('');
  const [isLoadingResearch, setIsLoadingResearch] = useState(false);
  const [isLoadingOpportunities, setIsLoadingOpportunities] = useState(false);
  const [, setIsCreatingCompany] = useState(false);
  const [companyInfo, setCompanyInfo] = useState<CompanyInfo | null>(null);
  const [relatedScenarios, setRelatedScenarios] = useState<RelatedScenario[]>([]);
  const [selectedScenarios, setSelectedScenarios] = useState<string[]>([]);
  const [rfpDocument, setRfpDocument] = useState<{
    content: string;
    fileName: string;
    uploadedAt: number;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedCompanyName, setSelectedCompanyName] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [currentCompanyId, setCurrentCompanyId] = useState<string | null>(null);
  const [scenarioCatalog, setScenarioCatalog] = useState<Record<string, Scenario>>({});
  const [scenarioRuns, setScenarioRuns] = useState<Record<string, StoredEvaluationResult[]>>({});
  const [isLoadingScenarioRuns, setIsLoadingScenarioRuns] = useState(false);

  const { t } = useTranslation();

  // Helper function to keep local catalog of scenarios for lookup when rendering history
  const updateScenarioCatalog = (scenariosToTrack: Scenario[]) => {
    if (!Array.isArray(scenariosToTrack) || scenariosToTrack.length === 0) {
      return;
    }

    setScenarioCatalog(prev => {
      const nextCatalog = { ...prev };
      scenariosToTrack.forEach(s => {
        if (s?.id) {
          nextCatalog[s.id] = s;
        }
      });
      return nextCatalog;
    });
  };

  // Helper function to load selected scenarios into the sidebar
  const loadSelectedScenariosIntoSidebar = async (scenarios: string[]) => {
    if (scenarios.length === 0) {
      return;
    }

    const existingScenarios = await getScenarios(userId);
    updateScenarioCatalog(existingScenarios);

    const selectedScenarioObjects = existingScenarios
      .filter(scenario => scenarios.includes(scenario.id))
      .map(scenario => ({
        ...scenario,
        relevanceScore: 1,
        relevanceReason: 'Previously selected scenario'
      }));

    setRelatedScenarios(prev => {
      if (selectedScenarioObjects.length === 0) {
        return prev;
      }

      const seenIds = new Set(prev.map(scenario => scenario.id));
      const merged = [...prev];

      selectedScenarioObjects.forEach(scenario => {
        if (!seenIds.has(scenario.id)) {
          seenIds.add(scenario.id);
          merged.push(scenario);
        }
      });

      return merged;
    });
  };

  const loadExistingResearch = async (companyId: string) => {
    setIsLoadingResearch(true);
    setError(null);
    try {
      // Try to get company by ID - don't filter by userId to allow viewing others' research
      const company = await getCompany(companyId);
      console.log('Found company:', company);
      
      if (!company) {
        console.log('No existing company found');
        setError(t('research.noCompanyFound'));
        setScenarioCatalog({});
        setScenarioRuns({});
        return;
      }
      
      // Check if user owns this company
      const isOwner = company.createdBy === userId;
      console.log('Company ownership:', { isOwner, createdBy: company.createdBy, currentUser: userId });
      
      setCurrentCompanyId(company.id);
      setCompanyName(company.name);
      
      try {
        // Set company research info if it exists
        if (company.research) {
          setCompanyInfo(company.research);
        }

        // Always set the selected scenarios if they exist
        if (company.selectedScenarios) {
          setSelectedScenarios(company.selectedScenarios);
          // Load selected scenarios into sidebar
          await loadSelectedScenariosIntoSidebar(company.selectedScenarios);
        }
      } catch (researchError) {
        console.error('Failed to load research data:', researchError);
        setError(t('research.failedToLoadResearch'));
      }
    } catch (error) {
      console.error('Failed to load existing research:', error);
      setError(t('common.error'));
    } finally {
      setIsLoadingResearch(false);
    }
  };

  useEffect(() => {
    const handleScenarioCreated = (event: Event) => {
      const detail = (event as CustomEvent<{ scenario: Scenario; companyId?: string }>).detail;
      if (!detail || !detail.companyId || detail.companyId !== currentCompanyId) {
        return;
      }

      const { scenario } = detail;
      setSelectedScenarios(prev =>
        prev.includes(scenario.id) ? prev : [...prev, scenario.id]
      );

      setScenarioCatalog(prev => ({ ...prev, [scenario.id]: scenario }));

      setRelatedScenarios(prev => {
        if (prev.some(s => s.id === scenario.id)) {
          return prev;
        }
        const manualScenario: RelatedScenario = {
          ...scenario,
          relevanceScore: 100,
          relevanceReason: t('research.manualScenarioReason')
        };
        return [manualScenario, ...prev];
      });
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('company-scenario-created', handleScenarioCreated as EventListener);
    }

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('company-scenario-created', handleScenarioCreated as EventListener);
      }
    };
  }, [currentCompanyId, t]);

  useEffect(() => {
    let isActive = true;

    const loadScenarioRuns = async () => {
      if (!selectedScenarios.length) {
        setScenarioRuns({});
        setIsLoadingScenarioRuns(false);
        return;
      }

      setIsLoadingScenarioRuns(true);
      try {
        const runEntries = await Promise.all(
          selectedScenarios.map(async scenarioId => {
            const runs = await getEvaluations(userId, scenarioId);
            return [scenarioId, runs] as [string, StoredEvaluationResult[]];
          })
        );

        if (!isActive) {
          return;
        }

        const nextRuns: Record<string, StoredEvaluationResult[]> = {};
        runEntries.forEach(([scenarioId, runs]) => {
          nextRuns[scenarioId] = runs;
        });
        setScenarioRuns(nextRuns);
      } catch (runError) {
        console.error('Failed to load scenario runs:', runError);
      } finally {
        if (isActive) {
          setIsLoadingScenarioRuns(false);
        }
      }
    };

    loadScenarioRuns();

    return () => {
      isActive = false;
    };
  }, [selectedScenarios, userId]);

  const handleResearch = async () => {
    if (!companyName.trim()) return;
    if (isLoadingResearch) return; // Prevent multiple concurrent research requests

    setIsLoadingResearch(true);
    setError(null);
    try {
      // Research company
      const researchData = await researchCompany({
        companyName,
        rfpContent: rfpDocument?.content
      });

      // Get existing research if any
      let existingResearch = null;
      if (currentCompanyId) {
        existingResearch = await getCompanyResearch(currentCompanyId);
      }
      
      // Ensure researchData has the correct shape
      if (!researchData.currentResearch || typeof researchData.currentResearch !== 'object') {
        throw new Error('Invalid research data structure: missing currentResearch');
      }

      const currentResearch: CompanyResearchEntry = {
        description: researchData.currentResearch.description || '',
        industry: researchData.currentResearch.industry || '',
        marketPosition: researchData.currentResearch.marketPosition || '',
        products: researchData.currentResearch.products || [],
        challenges: researchData.currentResearch.challenges || [],
        opportunities: researchData.currentResearch.opportunities || [],
        competitors: researchData.currentResearch.competitors || [],
        useCases: researchData.currentResearch.useCases || [],
        ...(rfpDocument && { rfpDocument }),
        aiRelevance: {
          current: researchData.currentResearch.aiRelevance?.current || '',
          potential: researchData.currentResearch.aiRelevance?.potential || '',
          recommendations: researchData.currentResearch.aiRelevance?.recommendations || []
        },
        timestamp: Date.now()
      };

      const history = existingResearch ? 
        [currentResearch, ...existingResearch.history] :
        [currentResearch];

      const updatedInfo: CompanyInfo = { 
        name: companyName,
        currentResearch,
        history,
        lastUpdated: Date.now()
      };
      setCompanyInfo(updatedInfo);

      // Save all research data to Firebase and create company record
      setIsCreatingCompany(true);
      try {
        // First check if YOU already have a company with this name
        const existingCompany = await getCompany(companyName, userId);
        console.log('Existing company check for current user:', existingCompany);
        
        // If we found an existing company (yours), update selected scenarios state
        if (existingCompany?.selectedScenarios) {
          setSelectedScenarios(existingCompany.selectedScenarios);
          // Load selected scenarios into sidebar
          await loadSelectedScenariosIntoSidebar(existingCompany.selectedScenarios);
        } else {
          // Reset related scenarios when it's a new company
          setRelatedScenarios([]);
          setSelectedScenarios([]);
        }

        // Save the research data
        await saveCompanyResearch(userId, companyName, researchData.currentResearch);
        
        // Create or update YOUR company record
        const savedCompany = await saveCompany(
          userId,
          companyName,
          updatedInfo,
          existingCompany?.selectedScenarios || []
        );
        
        // Set the company ID and scenarios after creation
        if (savedCompany && savedCompany.id) {
          console.log('Company created/updated successfully:', {
            id: savedCompany.id,
            name: savedCompany.name,
            createdBy: savedCompany.createdBy,
            selectedScenarios: savedCompany.selectedScenarios,
            isYours: savedCompany.createdBy === userId
          });
          setCurrentCompanyId(savedCompany.id);
          if (savedCompany.selectedScenarios) {
            setSelectedScenarios(savedCompany.selectedScenarios);
            await loadSelectedScenariosIntoSidebar(savedCompany.selectedScenarios);
          }
        } else {
          console.error('Company save returned invalid data:', savedCompany);
        }
      } finally {
        setIsCreatingCompany(false);
      }
    } catch (error) {
      console.error('Research failed:', error);
      setError(t('common.error'));
    } finally {
      setIsLoadingResearch(false);
    }
  };

  const handleKeyPress = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter') {
      handleResearch();
    }
  };

  const handleSelectCompany = (companyId: string) => {
    setSelectedCompanyName(companyId);
    setView('RESEARCH');
    loadExistingResearch(companyId);
  };

  const handleNewResearch = () => {
    setView('RESEARCH');
    setSelectedCompanyName(null);
    setCompanyInfo(null);
    setRelatedScenarios([]);
    setSelectedScenarios([]);
    setCompanyName('');
    setScenarioCatalog({});
    setScenarioRuns({});
    setIsLoadingScenarioRuns(false);
  };

  // Effect to load company research when switching to RESEARCH view with a selected company
  useEffect(() => {
    if (view === 'RESEARCH') {
      const companyId = selectedCompanyName || initialCompany;
      if (companyId) {
        loadExistingResearch(companyId);
      }

      // Set up real-time listener for company changes
      if (currentCompanyId) {
        const companyRef = ref(db, `companies/${currentCompanyId}`);
        const unsubscribe = onValue(companyRef, (snapshot) => {
          if (snapshot.exists()) {
            const companyData = snapshot.val() as Company;
            
            // Update company info if research data changes
            if (companyData.research) {
              const currentJson = JSON.stringify(companyInfo?.currentResearch);
              const newJson = JSON.stringify(companyData.research.currentResearch);
              if (currentJson !== newJson) {
                setCompanyInfo(companyData.research);
              }
            }

            // Update selected scenarios if they change
            if (companyData.selectedScenarios) {
              const scenariosJson = JSON.stringify(selectedScenarios);
              const newScenariosJson = JSON.stringify(companyData.selectedScenarios);
              if (scenariosJson !== newScenariosJson) {
                setSelectedScenarios(companyData.selectedScenarios);
                loadSelectedScenariosIntoSidebar(companyData.selectedScenarios);
              }
            }
          }
        });
        
        // Return cleanup function
        return () => {
          unsubscribe();
        };
      }
    }
  }, [view, selectedCompanyName, initialCompany, currentCompanyId]);

  const handleScenarioSelect = (scenario: Scenario) => {
    onSelectScenario?.(scenario);
  };

  const handleFindOpportunities = async () => {
    if (!companyInfo || !currentCompanyId) return;
    
    setIsLoadingOpportunities(true);
    try {
      // Clear any previously selected scenarios when finding opportunities (UI only)
      setSelectedScenarios([]);

      // First, get all existing scenarios
      const existingScenarios = await getScenarios(userId);

      // Match against existing scenarios in the user's library
      const matchedScenarios = await findRelevantScenarios(companyInfo, existingScenarios);
      const normalizedMatches = matchedScenarios
        .filter(match => match.relevanceScore >= 0.1)
        .map((match) => ({
          ...match,
          relevanceReason: match.relevanceReason || 'Matched to company profile'
        }));
      
      // Then, generate AI-suggested scenarios based on company research
      const suggestedScenarios = await findRelevantScenarios(companyInfo, [], true);

      // Combine and sort by relevance score - only show relevant scenarios
      const combinedScenarios = [
        ...normalizedMatches,
        ...suggestedScenarios
      ]
        .filter(scenario => scenario && typeof scenario.relevanceScore === 'number')
        // Remove duplicates based on scenario ID
        .filter((scenario, index, self) => 
          index === self.findIndex(s => s.id === scenario.id)
        )
        .sort((a, b) => b.relevanceScore - a.relevanceScore);
      
      // Update the UI with relevant scenarios (none pre-selected)
      setRelatedScenarios(combinedScenarios);
      setIsSidebarOpen(true);
    } catch (error) {
      console.error('Failed to find opportunities:', error);
      setError(t('research.findOpportunitiesError'));
    } finally {
      setIsLoadingOpportunities(false);
    }
  };

  if (view === 'LIST') {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-semibold text-white">{t('research.researchList')}</h1>
          <button
            onClick={handleNewResearch}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            <Icons.Plus className="w-5 h-5" />
            {t('research.newResearch')}
          </button>
        </div>
        <ResearchListView 
          userId={userId} 
          onSelectCompany={handleSelectCompany}
          handleNavigate={(_view, companyId) => {
            if (companyId) {
              setSelectedCompanyName(companyId);
              setView('RESEARCH');
              loadExistingResearch(companyId);
            }
          }}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6 lg:mr-80">
      {/* Research Sidebar */}
      <ResearchSidebar
        relatedScenarios={relatedScenarios}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        onSelectScenario={handleScenarioSelect}
        onFindOpportunities={handleFindOpportunities}
        onCreateScenario={() => onCreateScenario?.({
          companyId: currentCompanyId ?? undefined,
          companyName: companyName || undefined
        })}
        selectedScenarios={selectedScenarios}
        onToggleScenario={async (scenarioId: string) => {
          if (!currentCompanyId) {
            console.error('No company ID available');
            setError(t('research.noCompanyToSaveScenarios'));
            return;
          }
          
          try {
            const updatedScenarios = selectedScenarios.includes(scenarioId)
              ? selectedScenarios.filter(id => id !== scenarioId)
              : [...selectedScenarios, scenarioId];
            
            // Optimistically update the UI
            setSelectedScenarios(updatedScenarios);
            
            // Try to save to database
            try {
              console.log('Attempting to save selected scenarios:', {
                companyId: currentCompanyId,
                userId,
                scenarios: updatedScenarios
              });
              await updateCompanySelectedScenarios(currentCompanyId, userId, updatedScenarios);
              console.log('Successfully saved selected scenarios');
            } catch (authError: any) {
              // If not authorized (user doesn't own this company), just keep the UI state
              if (authError.message?.includes('Not authorized')) {
                console.warn('Viewing company in read-only mode - selections not saved to database');
                setError(t('research.readOnlyMode'));
                // Keep the local UI state but don't persist to database
              } else {
                console.error('Error saving scenarios:', authError);
                throw authError; // Re-throw other errors
              }
            }

            // Keep existing scenarios and add selected ones if they're not already present
            const existingScenarios = await getScenarios(userId);
            const updatedRelatedScenarios = [...relatedScenarios];
            
            // Add newly selected scenario if it's not already in the list
            if (!relatedScenarios.some(s => s.id === scenarioId) && updatedScenarios.includes(scenarioId)) {
              const scenario = existingScenarios.find(s => s.id === scenarioId);
              if (scenario) {
                updatedRelatedScenarios.push({
                  ...scenario,
                  relevanceScore: 1,
                  relevanceReason: 'Selected scenario'
                });
              }
            }

            // Update the related scenarios list
            setRelatedScenarios(updatedRelatedScenarios);
          } catch (error) {
            console.error('Failed to update selected scenarios:', error);
            setError(t('research.failedToSaveScenarios'));
            // Revert the local state if save fails
            setSelectedScenarios(selectedScenarios);
          }
        }}
        isLoadingOpportunities={isLoadingOpportunities}
        userId={userId}
        companyId={currentCompanyId ?? undefined}
        companyName={companyName || undefined}
      />

      {/* Search Input */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-white">{t('research.title')}</h1>
          <button
            onClick={() => setView('LIST')}
            className="text-blue-400 hover:text-blue-300 transition-colors mt-2 flex items-center gap-1"
          >
            <Icons.ChevronLeft className="w-4 h-4" />
            {t('common.back')}
          </button>
        </div>
        <button
          onClick={() => setSelectedCompanyName(null)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
        >
          {t('research.clearCompany')}
        </button>
      </div>

      <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
        <div className="space-y-4">
          <div className="flex gap-2">
            <input
              type="text"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={t('research.searchPlaceholder')}
              className="flex-1 bg-slate-900 text-white p-3 rounded-lg border border-slate-600 focus:border-emerald-500 focus:outline-none"
            />
            <button
              onClick={handleResearch}
              disabled={isLoadingResearch || !companyName.trim()}
              className="px-6 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isLoadingResearch ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  {t('research.searching')}
                </>
              ) : (
                <>
                  <Icons.Search className="w-5 h-5" />
                  {t('common.search')}
                </>
              )}
            </button>
          </div>
          <RfpUploadField
            companyId={currentCompanyId}
            onUploadSuccess={async () => {
              if (currentCompanyId) {
                // Add a small delay to allow for RFP analysis to complete
                await new Promise(resolve => setTimeout(resolve, 1000));
                // Then reload the company data to get the latest RFP analysis
                await loadExistingResearch(currentCompanyId);
                setRfpDocument(null);
              }
            }}
            onUploadError={(error) => {
              console.error('RFP upload failed:', error);
              setError(t('research.rfpUploadError'));
            }}
            onDelete={async () => {
              if (currentCompanyId) {
                setRfpDocument(null);
                // Add a small delay to allow for RFP deletion to complete
                await new Promise(resolve => setTimeout(resolve, 1000));
                // Then reload the company data
                await loadExistingResearch(currentCompanyId);
              }
            }}
          />
        </div>
      </div>

      {error && (
        <div className="bg-red-900/30 border-l-4 border-red-500 text-red-300 p-4 rounded-r-lg">
          {error}
        </div>
      )}

      {/* Research Results */}
      <div>
        {companyInfo && (
          <div className="space-y-8">
            {/* Company Research Section */}
            <CompanyResearchContent
              companyInfo={companyInfo}
              scenarioRuns={scenarioRuns}
              scenariosById={scenarioCatalog}
              isScenarioRunsLoading={isLoadingScenarioRuns}
              onViewWorkflow={onViewWorkflow}
            />

            {/* RFP Analysis Section - Completely Separate */}
            {companyInfo?.currentResearch?.rfpDocument?.analysis ? (
              <RfpAnalysisView 
                analysis={companyInfo.currentResearch.rfpDocument.analysis} 
              />
            ) : companyInfo?.currentResearch?.rfpDocument && (
              <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
                <div className="animate-pulse flex space-x-4">
                  <div className="flex-1 space-y-4 py-1">
                    <div className="h-4 bg-slate-700 rounded w-3/4"></div>
                    <div className="space-y-2">
                      <div className="h-4 bg-slate-700 rounded"></div>
                      <div className="h-4 bg-slate-700 rounded w-5/6"></div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default CompanyResearch;