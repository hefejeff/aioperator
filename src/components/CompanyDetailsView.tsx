import React, { useState, useEffect } from 'react';
import { Icons } from '../constants';
import { useTranslation } from '../i18n';
import type { CompanyResearch, Company, RelatedScenario, Scenario } from '../types';
import { getRelatedScenarios, getCompanyResearch } from '../services/firebaseService';
import { updateCompanySelectedScenarios } from '../services/companyService';
import { findRelevantScenarios } from '../services/geminiService';
import ScenarioSelection from './ScenarioSelection';
import ResearchSidebar from './ResearchSidebar';

interface CompanyDetailsViewProps {
  userId: string;
  company: Company;
  onBack: () => void;
  onCreateScenario: (context?: { companyId?: string; companyName?: string }) => void;
  onSelectScenario: (scenarioId: string) => void;
}

const CompanyDetailsView: React.FC<CompanyDetailsViewProps> = ({
  userId,
  company,
  onBack,
  onCreateScenario,
  onSelectScenario
}) => {
  const [error, setError] = useState<string | null>(null);
  const [companyInfo, setCompanyInfo] = useState<CompanyResearch | null>(null);
  const [relatedScenarios, setRelatedScenarios] = useState<RelatedScenario[]>([]);
  const [selectedScenarios, setSelectedScenarios] = useState<string[]>(company.selectedScenarios || []);
  const [isLoadingScenarios, setIsLoadingScenarios] = useState(false);
  const [isLoadingDetails, setIsLoadingDetails] = useState(true);
  const { t } = useTranslation();

  // Load company info when component mounts
  useEffect(() => {
    const loadCompanyInfo = async () => {
      setIsLoadingDetails(true);
      try {
        // If we already have company info in props, use that
        if (company.research) {
          setCompanyInfo(company.research);
        } else {
          // Otherwise fetch it
          const research = await getCompanyResearch(company.id);
          if (research) {
            setCompanyInfo(research);
          } else {
            setError(t('research.noCompanyFound'));
          }
        }
      } catch (error) {
        console.error('Failed to load company info:', error);
        setError(t('research.failedToLoadResearch'));
      } finally {
        setIsLoadingDetails(false);
      }
    };

    loadCompanyInfo();
  }, [company, userId]);

  // Load related scenarios when component mounts
  useEffect(() => {
    const loadScenarios = async () => {
      setIsLoadingScenarios(true);
      try {
        const scenarios = await getRelatedScenarios(company.id);
        setRelatedScenarios(scenarios);
      } catch (error) {
        console.error('Failed to load related scenarios:', error);
      } finally {
        setIsLoadingScenarios(false);
      }
    };

    loadScenarios();
  }, [userId, company.name]);

  const handleFindOpportunities = async () => {
    setIsLoadingScenarios(true);
    try {
      // Get research data
      const research = await getCompanyResearch(company.id);
      if (!research) {
        throw new Error('No research found for company');
      }

      // Generate new suggested scenarios
      const suggestedScenarios = await findRelevantScenarios(companyInfo || research, [], true);
      
      // Add new suggestions to existing scenarios
      const updatedScenarios = [...relatedScenarios, ...suggestedScenarios]
        .filter(scenario => scenario && typeof scenario.relevanceScore === 'number')
        .sort((a, b) => b.relevanceScore - a.relevanceScore);

      setRelatedScenarios(updatedScenarios);
    } catch (error) {
      console.error('Failed to find opportunities:', error);
    } finally {
      setIsLoadingScenarios(false);
    }
  };

  useEffect(() => {
    const handleScenarioCreated = (event: Event) => {
      const detail = (event as CustomEvent<{ scenario: Scenario; companyId?: string }>).detail;
      if (!detail || detail.companyId !== company.id) {
        return;
      }

      const { scenario } = detail;
      setSelectedScenarios(prev =>
        prev.includes(scenario.id) ? prev : [...prev, scenario.id]
      );

      setRelatedScenarios(prev => {
        if (prev.some(s => s.id === scenario.id)) {
          return prev;
        }
        const enrichedScenario: RelatedScenario = {
          ...scenario,
          relevanceScore: 100,
          relevanceReason: t('research.manualScenarioReason')
        };
        return [enrichedScenario, ...prev];
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
  }, [company.id, t]);

  const handleToggleScenario = async (scenarioId: string) => {
    try {
      const updatedScenarios = selectedScenarios.includes(scenarioId)
        ? selectedScenarios.filter(id => id !== scenarioId)
        : [...selectedScenarios, scenarioId];
      
      // Optimistically update UI
      setSelectedScenarios(updatedScenarios);
      
      // Save to database
      await updateCompanySelectedScenarios(company.id, userId, updatedScenarios);
      onSelectScenario(scenarioId); // Notify parent component of the change
    } catch (error) {
      console.error('Failed to update selected scenarios:', error);
      // Revert on error
      setSelectedScenarios(selectedScenarios);
    }
  };

  const LoadingSkeleton = () => (
    <div className="animate-pulse space-y-6 lg:mr-80">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <div className="h-4 w-20 bg-slate-700 rounded mb-2"></div>
          <div className="h-8 w-48 bg-slate-700 rounded"></div>
        </div>
      </div>

      {/* Content */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
        <div className="h-6 w-40 bg-slate-700 rounded mb-6"></div>
        <div className="space-y-6">
          {[...Array(5)].map((_, i) => (
            <div key={i}>
              <div className="h-5 w-32 bg-slate-700 rounded mb-3"></div>
              <div className="h-4 w-full bg-slate-700/50 rounded"></div>
              {i % 2 === 1 && (
                <div className="mt-2">
                  <div className="h-4 w-3/4 bg-slate-700/50 rounded"></div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* History */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
        <div className="h-6 w-40 bg-slate-700 rounded mb-6"></div>
        {[...Array(2)].map((_, i) => (
          <div key={i} className="relative bg-slate-900/50 border border-slate-700 rounded-xl p-6 mb-4">
            <div className="h-5 w-48 bg-slate-700 rounded mb-4"></div>
            <div className="space-y-4">
              {[...Array(3)].map((_, j) => (
                <div key={j}>
                  <div className="h-4 w-32 bg-slate-700 rounded mb-2"></div>
                  <div className="h-4 w-full bg-slate-700/50 rounded"></div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  if (isLoadingDetails) {
    return (
      <>
        <LoadingSkeleton />
        <ResearchSidebar
          relatedScenarios={[]}
          isOpen={true}
          onClose={() => {}}
          onSelectScenario={onSelectScenario}
          onCreateScenario={() => onCreateScenario({
            companyId: company.id,
            companyName: company.name
          })}
          selectedScenarios={[]}
          onToggleScenario={() => {}}
          isLoadingOpportunities={true}
          userId={userId}
          onFindOpportunities={() => {}}
          companyId={company.id}
          companyName={company.name}
        />
      </>
    );
  }

  if (error) {
    return (
      <>
        <div className="space-y-6 lg:mr-80">
          <div className="flex justify-between items-center">
            <div>
              <button
                onClick={onBack}
                className="text-blue-400 hover:text-blue-300 transition-colors mb-2 flex items-center gap-1"
              >
                <Icons.ChevronLeft className="w-4 h-4" />
                {t('common.back')}
              </button>
            </div>
          </div>
          <div className="bg-red-900/30 border-l-4 border-red-500 text-red-300 p-6 rounded-r-lg">
            <div className="flex items-start gap-3">
              <div className="p-1">
                <Icons.ChevronLeft className="w-5 h-5 text-red-500" />
              </div>
              <div>
                <h3 className="text-lg font-medium text-red-200 mb-2">{t('common.error')}</h3>
                <p className="text-red-300 mb-4">{error}</p>
                <button
                  onClick={() => window.location.reload()}
                  className="px-4 py-2 bg-red-500/20 text-red-300 rounded hover:bg-red-500/30 transition-colors flex items-center gap-2"
                >
                  <Icons.ChevronLeft className="w-4 h-4" />
                  {t('common.retry')}
                </button>
              </div>
            </div>
          </div>
        </div>
        <ResearchSidebar
          relatedScenarios={relatedScenarios}
          isOpen={true}
          onClose={() => {}}
          onSelectScenario={onSelectScenario}
          onCreateScenario={() => onCreateScenario({
            companyId: company.id,
            companyName: company.name
          })}
          selectedScenarios={selectedScenarios}
          onToggleScenario={handleToggleScenario}
          isLoadingOpportunities={isLoadingScenarios}
          userId={userId}
          onFindOpportunities={handleFindOpportunities}
          companyId={company.id}
          companyName={company.name}
        />
      </>
    );
  }

  return (
    <>
      <div className="space-y-6 lg:mr-80">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <button
              onClick={onBack}
              className="text-blue-400 hover:text-blue-300 transition-colors mb-2 flex items-center gap-1"
            >
              <Icons.ChevronLeft className="w-4 h-4" />
              {t('common.back')}
            </button>
            <h1 className="text-2xl font-semibold text-white">{company.name}</h1>
          </div>
        </div>

      {/* Current Research Details */}
      {company.research?.currentResearch && (
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-white mb-6">{t('research.companyInfo')}</h2>
          
          <div className="space-y-6">
            <div>
              <h3 className="text-white font-medium mb-2">{t('research.description')}</h3>
              <p className="text-slate-300">{company.research.currentResearch.description}</p>
            </div>

            <div>
              <h3 className="text-white font-medium mb-2">{t('research.industry')}</h3>
              <p className="text-slate-300">{company.research.currentResearch.industry}</p>
            </div>

            <div>
              <h3 className="text-white font-medium mb-2">{t('research.marketPosition')}</h3>
              <p className="text-slate-300">{company.research.currentResearch.marketPosition}</p>
            </div>

            <div>
              <h3 className="text-white font-medium mb-2">{t('research.products')}</h3>
              <ul className="list-disc list-inside text-slate-300 space-y-1">
                {company.research.currentResearch.products?.map((product, index) => (
                  <li key={index}>{product}</li>
                ))}
              </ul>
            </div>

            <div>
              <h3 className="text-white font-medium mb-2">{t('research.competitors')}</h3>
              <ul className="list-disc list-inside text-slate-300 space-y-1">
                {company.research.currentResearch.competitors?.map((competitor, index) => (
                  <li key={index}>{competitor}</li>
                ))}
              </ul>
            </div>

            <div>
              <h3 className="text-white font-medium mb-2">{t('research.challenges')}</h3>
              <ul className="list-disc list-inside text-slate-300 space-y-1">
                {company.research.currentResearch.challenges?.map((challenge, index) => (
                  <li key={index}>{challenge}</li>
                ))}
              </ul>
            </div>

            <div>
              <h3 className="text-white font-medium mb-2">{t('research.opportunities')}</h3>
              <ul className="list-disc list-inside text-slate-300 space-y-1">
                {company.research.currentResearch.opportunities?.map((opportunity, index) => (
                  <li key={index}>{opportunity}</li>
                ))}
              </ul>
            </div>

            <div>
              <h3 className="text-white font-medium mb-2">{t('research.aiUseCases')}</h3>
              <ul className="list-disc list-inside text-slate-300 space-y-1">
                {company.research.currentResearch.useCases?.map((useCase, index) => (
                  <li key={index}>{useCase}</li>
                ))}
              </ul>
            </div>

            <div className="border-t border-slate-700 pt-6">
              <h3 className="text-white font-medium mb-4">{t('research.aiAnalysis')}</h3>
              
              <div className="space-y-4">
                <div>
                  <h4 className="text-slate-300 font-medium mb-2">{t('research.currentAI')}</h4>
                  <p className="text-slate-400">{company.research.currentResearch.aiRelevance?.current}</p>
                </div>
                
                <div>
                  <h4 className="text-slate-300 font-medium mb-2">{t('research.potentialAI')}</h4>
                  <p className="text-slate-400">{company.research.currentResearch.aiRelevance?.potential}</p>
                </div>
                
                <div>
                  <h4 className="text-slate-300 font-medium mb-2">{t('research.aiRecommendations')}</h4>
                  <ul className="list-disc list-inside text-slate-400 space-y-1">
                    {company.research.currentResearch.aiRelevance?.recommendations?.map((rec, index) => (
                      <li key={index}>{rec}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Research History */}
      {company.research?.history && company.research.history.length > 0 && (
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-white mb-4">{t('research.history')}</h2>
          <div className="space-y-6">
            {company.research.history.map((entry, index) => (
              <div key={index} className="relative bg-slate-900/50 border border-slate-700 rounded-xl p-6">
                <div className="absolute -left-2 top-6 w-4 h-4 bg-blue-500 rounded-full border-4 border-slate-800" />
                <div className="mb-4">
                  <div className="text-sm text-blue-400 font-medium mb-1">
                    {new Date(entry.timestamp).toLocaleDateString(undefined, {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </div>
                  <div className="text-xs text-slate-500">
                    Research Update #{company.research.history.length - index}
                  </div>
                </div>
                <div className="space-y-6">
                  <div>
                    <h4 className="text-white font-medium mb-2">{t('research.description')}</h4>
                    <p className="text-slate-300">{entry.description}</p>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <h4 className="text-white font-medium mb-2">{t('research.industry')}</h4>
                      <p className="text-slate-300">{entry.industry}</p>
                    </div>
                    <div>
                      <h4 className="text-white font-medium mb-2">{t('research.marketPosition')}</h4>
                      <p className="text-slate-300">{entry.marketPosition}</p>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-white font-medium mb-2">{t('research.products')}</h4>
                    <ul className="list-disc list-inside text-slate-300 space-y-1">
                      {entry.products?.map((product, i) => (
                        <li key={i}>{product}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <h4 className="text-white font-medium mb-2">{t('research.challenges')}</h4>
                      <ul className="list-disc list-inside text-slate-300 space-y-1">
                        {entry.challenges.map((challenge, i) => (
                          <li key={i}>{challenge}</li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <h4 className="text-white font-medium mb-2">{t('research.opportunities')}</h4>
                      <ul className="list-disc list-inside text-slate-300 space-y-1">
                        {entry.opportunities.map((opportunity, i) => (
                          <li key={i}>{opportunity}</li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  <div className="border-t border-slate-700 pt-6">
                    <h4 className="text-white font-medium mb-4">{t('research.aiAnalysis')}</h4>
                    <div className="space-y-4">
                      <div>
                        <h5 className="text-slate-300 font-medium mb-2">{t('research.currentAI')}</h5>
                        <p className="text-slate-400">{entry.aiRelevance.current}</p>
                      </div>
                      <div>
                        <h5 className="text-slate-300 font-medium mb-2">{t('research.potentialAI')}</h5>
                        <p className="text-slate-400">{entry.aiRelevance.potential}</p>
                      </div>
                      <div>
                        <h5 className="text-slate-300 font-medium mb-2">{t('research.aiRecommendations')}</h5>
                        <ul className="list-disc list-inside text-slate-400 space-y-1">
                          {entry.aiRelevance.recommendations.map((rec, i) => (
                            <li key={i}>{rec}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Scenario Management */}
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-semibold text-white">{t('research.relevantOpportunities')}</h2>
            <div className="flex gap-3">
              <button
                onClick={handleFindOpportunities}
                disabled={isLoadingScenarios}
                className="px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
              >
                {isLoadingScenarios ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    {t('research.finding')}
                  </>
                ) : (
                  <>
                    <Icons.Search className="w-4 h-4" />
                    {t('research.findOpportunities')}
                  </>
                )}
              </button>
              <button
                onClick={() => onCreateScenario({
                  companyId: company.id,
                  companyName: company.name
                })}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
              >
                <Icons.Plus className="w-4 h-4" />
                {t('research.createScenario')}
              </button>
            </div>
          </div>

          <div className="mt-4">
            <ScenarioSelection
              scenarios={relatedScenarios}
              selectedScenarios={selectedScenarios}
              onToggleScenario={handleToggleScenario}
              onScenarioClick={onSelectScenario}
            />
          </div>
        </div>
      </div>

      <ResearchSidebar
        relatedScenarios={relatedScenarios}
        isOpen={true}
        onClose={() => {}}
        onSelectScenario={onSelectScenario}
        onCreateScenario={() => onCreateScenario({
          companyId: company.id,
          companyName: company.name
        })}
        selectedScenarios={selectedScenarios}
        onToggleScenario={handleToggleScenario}
        isLoadingOpportunities={isLoadingScenarios}
        userId={userId}
        onFindOpportunities={handleFindOpportunities}
        companyId={company.id}
        companyName={company.name}
      />
    </>
  );
};

export default CompanyDetailsView;