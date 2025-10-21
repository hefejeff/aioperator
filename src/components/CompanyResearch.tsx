import React, { useState, useEffect } from 'react';
import { Icons } from '../constants';
import { useTranslation } from '../i18n';
import type { CompanyResearch as CompanyInfo, CompanyResearchEntry, RelatedScenario, Company } from '../types';
import ResearchSidebar from './ResearchSidebar';
import { getScenarios, getCompanyResearch, getRelatedScenarios, saveCompanyResearch } from '../services/firebaseService';
import { researchCompany, findRelevantScenarios } from '../services/geminiService';
import { saveCompany, getCompany, updateCompanySelectedScenarios } from '../services/companyService';
import { ref, onValue } from 'firebase/database';
import { db } from '../services/firebaseInit';
import ResearchListView from './ResearchListView';

interface CompanyResearchProps {
  userId: string;
  initialCompany?: string;  // This is now expected to be a company ID
  onSelectScenario?: (scenarioId: string) => void;
  onCreateScenario?: () => void;
}

type View = 'LIST' | 'RESEARCH';

const CompanyResearch: React.FC<CompanyResearchProps> = ({ userId, initialCompany, onSelectScenario, onCreateScenario }) => {
  const [view, setView] = useState<View>(initialCompany ? 'RESEARCH' : 'LIST');
  const [companyName, setCompanyName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isCreatingCompany, setIsCreatingCompany] = useState(false);
  const [companyInfo, setCompanyInfo] = useState<CompanyInfo | null>(null);
  const [relatedScenarios, setRelatedScenarios] = useState<RelatedScenario[]>([]);
  const [selectedScenarios, setSelectedScenarios] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [selectedCompanyName, setSelectedCompanyName] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [currentCompanyId, setCurrentCompanyId] = useState<string | null>(null);

  const { t } = useTranslation();

  // Helper function to load selected scenarios into the sidebar
  const loadSelectedScenariosIntoSidebar = async (scenarios: string[]) => {
    if (scenarios.length > 0) {
      const existingScenarios = await getScenarios(userId);
      const selectedScenarioObjects = existingScenarios
        .filter(scenario => scenarios.includes(scenario.id))
        .map(scenario => ({
          ...scenario,
          relevanceScore: 1,
          relevanceReason: 'Previously selected scenario'
        }));
      setRelatedScenarios(selectedScenarioObjects);
    }
  };

  const loadExistingResearch = async (companyId: string) => {
    setIsLoading(true);
    setError(null);
    try {
      // Try to get company by ID
      const company = await getCompany(companyId);
      console.log('Found company:', company);
      
      if (!company) {
        console.log('No existing company found');
        setError(t('research.noCompanyFound'));
        return;
      }
      
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
      setIsLoading(false);
    }
  };

  const handleResearch = async () => {
    if (!companyName.trim()) return;

    setIsLoading(true);
    setError(null);
    try {
      // Research company
      const researchData = await researchCompany(companyName);

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
        // First check if company already exists
        const existingCompany = await getCompany(companyName, userId);
        
        // If we found an existing company, update selected scenarios state
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
        
        // Create or update company record
        const savedCompany = await saveCompany(
          userId,
          companyName,
          updatedInfo,
          existingCompany?.selectedScenarios || []
        );
        
        // Set the company ID and scenarios after creation
        if (savedCompany && savedCompany.id) {
          setCurrentCompanyId(savedCompany.id);
          if (savedCompany.selectedScenarios) {
            setSelectedScenarios(savedCompany.selectedScenarios);
            await loadSelectedScenariosIntoSidebar(savedCompany.selectedScenarios);
          }
        }
      } finally {
        setIsCreatingCompany(false);
      }
    } catch (error) {
      console.error('Research failed:', error);
      setError(t('common.error'));
    } finally {
      setIsLoading(false);
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
  };

  // Effect to load company research when switching to RESEARCH view with a selected company
  useEffect(() => {
    if (view === 'RESEARCH') {
      const companyId = selectedCompanyName || initialCompany;
      if (companyId) {
        loadExistingResearch(companyId);
      }

      // Set up real-time listener for selected scenarios changes
      if (currentCompanyId) {
        const companyRef = ref(db, `companies/${currentCompanyId}`);
        const unsubscribe = onValue(companyRef, (snapshot) => {
          if (snapshot.exists()) {
            const companyData = snapshot.val() as Company;
            if (companyData.selectedScenarios) {
              setSelectedScenarios(companyData.selectedScenarios);
              loadSelectedScenariosIntoSidebar(companyData.selectedScenarios);
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

  const handleScenarioSelect = (scenarioId: string) => {
    onSelectScenario?.(scenarioId);
  };

  const handleFindOpportunities = async () => {
    if (!companyInfo || !currentCompanyId) return;
    
    setIsLoading(true);
    try {
      // First, get all existing scenarios
      const existingScenarios = await getScenarios(userId);
      
      // Get existing selected scenarios that might not be in the current results
      const selectedScenarioObjects = existingScenarios
        .filter(scenario => selectedScenarios.includes(scenario.id))
        .map(scenario => ({
          ...scenario,
          relevanceScore: 1, // Ensure selected scenarios show up with high relevance
          relevanceReason: 'Previously selected scenario'
        }));

      // Get matches from existing scenarios
      const matchedScenarios = await findRelevantScenarios(companyInfo, existingScenarios);
      
      // Then, generate suggested scenarios
      const suggestedScenarios = await findRelevantScenarios(companyInfo, [], true);
      
      // Combine and sort by relevance score
      const combinedScenarios = [
        ...selectedScenarioObjects, // Add selected scenarios first
        ...matchedScenarios,
        ...suggestedScenarios
      ]
        .filter(scenario => scenario && typeof scenario.relevanceScore === 'number')
        // Remove duplicates based on scenario ID
        .filter((scenario, index, self) => 
          index === self.findIndex(s => s.id === scenario.id)
        )
        .sort((a, b) => b.relevanceScore - a.relevanceScore);
      
      // Update the UI with the related scenarios but don't save them
      setRelatedScenarios(combinedScenarios);
    } catch (error) {
      console.error('Failed to find opportunities:', error);
      setError(t('research.findOpportunitiesError'));
    } finally {
      setIsLoading(false);
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
        onCreateScenario={onCreateScenario}
        selectedScenarios={selectedScenarios}
        onToggleScenario={async (scenarioId: string) => {
          if (!currentCompanyId) {
            console.error('No company ID available');
            return;
          }
          
          try {
            const updatedScenarios = selectedScenarios.includes(scenarioId)
              ? selectedScenarios.filter(id => id !== scenarioId)
              : [...selectedScenarios, scenarioId];
            
            // Optimistically update the UI
            setSelectedScenarios(updatedScenarios);
            
            // Save to database
            await updateCompanySelectedScenarios(currentCompanyId, userId, updatedScenarios);

            // Update the sidebar to show selected scenarios
            await loadSelectedScenariosIntoSidebar(updatedScenarios);
          } catch (error) {
            console.error('Failed to update selected scenarios:', error);
            // Revert the local state if save fails
            setSelectedScenarios(selectedScenarios);
          }
        }}
        onSuggestSelected={handleFindOpportunities}
        isLoading={isLoading}
        userId={userId}
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
            disabled={isLoading || !companyName.trim()}
            className="px-6 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isLoading ? (
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
      </div>

      {error && (
        <div className="bg-red-900/30 border-l-4 border-red-500 text-red-300 p-4 rounded-r-lg">
          {error}
        </div>
      )}

      {/* Research Results */}
      <div>
        {companyInfo && (
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
            <h2 className="text-lg font-semibold text-white mb-6">{t('research.companyInfo')}</h2>
            
            <div className="space-y-6">
              <div>
                <h3 className="text-white font-medium mb-2">{t('research.description')}</h3>
                <p className="text-slate-300">{companyInfo?.currentResearch?.description || ''}</p>
              </div>

              <div>
                <h3 className="text-white font-medium mb-2">{t('research.industry')}</h3>
                <p className="text-slate-300">{companyInfo?.currentResearch?.industry || ''}</p>
              </div>

              <div>
                <h3 className="text-white font-medium mb-2">{t('research.marketPosition')}</h3>
                <p className="text-slate-300">{companyInfo?.currentResearch?.marketPosition || ''}</p>
              </div>

              <div>
                <h3 className="text-white font-medium mb-2">{t('research.products')}</h3>
                <ul className="list-disc list-inside text-slate-300 space-y-1">
                  {companyInfo?.currentResearch?.products?.map((product, index) => (
                    <li key={index}>{product}</li>
                  )) || []}
                </ul>
              </div>

              <div>
                <h3 className="text-white font-medium mb-2">{t('research.competitors')}</h3>
                <ul className="list-disc list-inside text-slate-300 space-y-1">
                  {companyInfo?.currentResearch?.competitors?.map((competitor, index) => (
                    <li key={index}>{competitor}</li>
                  )) || []}
                </ul>
              </div>

              <div>
                <h3 className="text-white font-medium mb-2">{t('research.challenges')}</h3>
                <ul className="list-disc list-inside text-slate-300 space-y-1">
                  {companyInfo?.currentResearch?.challenges?.map((challenge, index) => (
                    <li key={index}>{challenge}</li>
                  )) || []}
                </ul>
              </div>

              <div>
                <h3 className="text-white font-medium mb-2">{t('research.opportunities')}</h3>
                <ul className="list-disc list-inside text-slate-300 space-y-1">
                  {companyInfo?.currentResearch?.opportunities?.map((opportunity, index) => (
                    <li key={index}>{opportunity}</li>
                  )) || []}
                </ul>
              </div>

              <div>
                <h3 className="text-white font-medium mb-2">{t('research.aiUseCases')}</h3>
                <ul className="list-disc list-inside text-slate-300 space-y-1">
                  {companyInfo?.currentResearch?.useCases?.map((useCase, index) => (
                    <li key={index}>{useCase}</li>
                  )) || []}
                </ul>
              </div>

              <div className="border-t border-slate-700 pt-6">
                <h3 className="text-white font-medium mb-4">{t('research.aiAnalysis')}</h3>
                
                <div className="space-y-4">
                  <div>
                    <h4 className="text-slate-300 font-medium mb-2">{t('research.currentAI')}</h4>
                    <p className="text-slate-400">{companyInfo?.currentResearch?.aiRelevance?.current || ''}</p>
                  </div>
                  
                  <div>
                    <h4 className="text-slate-300 font-medium mb-2">{t('research.potentialAI')}</h4>
                    <p className="text-slate-400">{companyInfo?.currentResearch?.aiRelevance?.potential || ''}</p>
                  </div>
                  
                  <div>
                    <h4 className="text-slate-300 font-medium mb-2">{t('research.aiRecommendations')}</h4>
                    <ul className="list-disc list-inside text-slate-400 space-y-1">
                      {companyInfo?.currentResearch?.aiRelevance?.recommendations?.map((rec, index) => (
                        <li key={index}>{rec}</li>
                      )) || []}
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CompanyResearch;