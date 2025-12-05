import React, { useState, useEffect } from 'react';
import { Icons } from '../constants';
import { useTranslation } from '../i18n';
import RfpUploadField from './RfpUploadField';
import type { CompanyResearch as CompanyInfo, CompanyResearchEntry, RelatedScenario, Company, Scenario, StoredEvaluationResult } from '../types';
import ResearchSidebar from './ResearchSidebar';
import { getScenarios, getCompanyResearch, saveCompanyResearch, getEvaluations, getLatestPrdForScenario, getLatestPitchForScenario, getWorkflowVersions } from '../services/firebaseService';
import { researchCompany, findRelevantScenarios, generatePresentationWebsite } from '../services/geminiService';
import { saveCompany, getCompany, updateCompanySelectedScenarios } from '../services/companyService';
import { createWordPressPage, isWordPressConfigured } from '../services/wordpressService';
import { ref, onValue } from 'firebase/database';
import { db } from '../services/firebaseInit';
import ResearchListView from './ResearchListView';
import RfpAnalysisView from './RfpAnalysisView';
import CompanyResearchContent from './CompanyResearchContent';

interface CompanyResearchProps {
  userId: string;
  initialCompany?: string;  // This is now expected to be a company ID
  startWithNewForm?: boolean; // Start directly in research form view
  onSelectScenario?: (scenario: Scenario, companyName?: string) => void;
  onCreateScenario?: (context?: { companyId?: string; companyName?: string }) => void;
  onViewWorkflow?: (workflowId: string) => void;
}

type View = 'LIST' | 'RESEARCH';

const CompanyResearch: React.FC<CompanyResearchProps> = ({
  userId,
  initialCompany,
  startWithNewForm,
  onSelectScenario,
  onCreateScenario,
  onViewWorkflow,
}) => {
  const [view, setView] = useState<View>(initialCompany || startWithNewForm ? 'RESEARCH' : 'LIST');
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
  const [selectedRunIds, setSelectedRunIds] = useState<string[]>([]);
  const [showPromptModal, setShowPromptModal] = useState(false);
  const [generatedPrompt, setGeneratedPrompt] = useState('');
  const [isGeneratingPresentation, setIsGeneratingPresentation] = useState(false);
  const [presentationUrl, setPresentationUrl] = useState<string | null>(null);
  const [showCopiedMessage, setShowCopiedMessage] = useState(false);
  const [isCreatingWordPressPage, setIsCreatingWordPressPage] = useState(false);
  const [wordPressPageUrl, setWordPressPageUrl] = useState<string | null>(null);

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
            // Get evaluations (scored runs)
            const evaluations = await getEvaluations(userId, scenarioId);
            
            // Get workflow versions (saved work)
            const workflowVersions = await getWorkflowVersions(userId, scenarioId);
            
            // Get IDs of evaluations that already have workflow versions linked
            const linkedWorkflowIds = new Set(
              evaluations.map(e => e.workflowVersionId).filter(Boolean)
            );
            
            // Convert workflow versions that don't have evaluations to a compatible format
            const unlinkedWorkflows: StoredEvaluationResult[] = workflowVersions
              .filter(wv => !linkedWorkflowIds.has(wv.id))
              .map(wv => ({
                id: wv.id,
                userId: wv.userId,
                scenarioId: scenarioId,
                score: wv.evaluationScore || 0,
                feedback: wv.evaluationFeedback || 'Saved workflow (not evaluated)',
                workflowExplanation: wv.workflowExplanation,
                imageUrl: wv.imageBase64 ? `data:${wv.imageMimeType || 'image/png'};base64,${wv.imageBase64}` : null,
                workflowVersionId: wv.id,
                timestamp: wv.timestamp,
              }));
            
            // Combine evaluations with unlinked workflow versions
            const combinedRuns = [...evaluations, ...unlinkedWorkflows]
              .sort((a, b) => b.timestamp - a.timestamp);
            
            return [scenarioId, combinedRuns] as [string, StoredEvaluationResult[]];
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
    onSelectScenario?.(scenario, companyName || selectedCompanyName || undefined);
  };

  const handleToggleRunId = (runId: string) => {
    setSelectedRunIds(prev => 
      prev.includes(runId) ? prev.filter(id => id !== runId) : [...prev, runId]
    );
  };

  const getPresentationPrompt = () => {
    if (!companyInfo || !selectedRunIds.length) return '';

    // Gather selected runs
    const selectedRuns: { scenario: Scenario; run: StoredEvaluationResult }[] = [];
    
    Object.entries(scenarioRuns).forEach(([scenarioId, runs]) => {
      runs.forEach(run => {
        if (selectedRunIds.includes(run.id)) {
          const scenario = scenarioCatalog[scenarioId];
          if (scenario) {
            selectedRuns.push({ scenario, run });
          }
        }
      });
    });

    return `Create a professional sales presentation website for ${companyInfo.name} using West Monroe branding.

Company Overview:
${companyInfo.currentResearch.description}

Industry: ${companyInfo.currentResearch.industry}
Market Position: ${companyInfo.currentResearch.marketPosition}

Key Challenges:
${companyInfo.currentResearch.challenges.map(c => `- ${c}`).join('\n')}

Proposed AI Solutions:
${selectedRuns.map(({ scenario, run }) => `
Scenario: ${scenario.title}
Solution Overview: ${run.workflowExplanation}
Impact Score: ${run.score}/100
Key Benefits:
- Addresses specific challenge: ${scenario.goal}
- Demonstrates clear ROI through automated workflow
`).join('\n')}

Please structure the website presentation to include:
1. Executive Summary
2. Company Analysis & Challenges
3. Proposed AI Solutions (showcasing the selected scenarios)
4. Implementation Roadmap
5. Expected ROI & Impact

The tone should be professional, consultative, and focused on digital transformation. Use West Monroe's signature style: bold, clean, and data-driven.`;
  };

  const handleGeneratePrompt = () => {
    const prompt = getPresentationPrompt();
    if (!prompt) return;
    setGeneratedPrompt(prompt);
    setShowPromptModal(true);
  };

  const handleGenerateDiviPrompt = async () => {
    if (!companyInfo || !selectedRunIds.length) return;

    // Check if WordPress is configured
    if (!isWordPressConfigured()) {
      setError('WordPress is not configured. Please set VITE_WP_BASE_URL, VITE_WP_USERNAME, and VITE_WP_APP_PASSWORD in your environment variables.');
      return;
    }

    // Gather selected runs
    const selectedRuns: { scenario: Scenario; run: StoredEvaluationResult }[] = [];
    
    Object.entries(scenarioRuns).forEach(([scenarioId, runs]) => {
      runs.forEach(run => {
        if (selectedRunIds.includes(run.id)) {
          const scenario = scenarioCatalog[scenarioId];
          if (scenario) {
            selectedRuns.push({ scenario, run });
          }
        }
      });
    });

    setIsCreatingWordPressPage(true);
    setWordPressPageUrl(null);
    setError(null);

    try {
      // Fetch PRD and Pitch data for each selected scenario
      const solutionsWithDetails = await Promise.all(
        selectedRuns.map(async ({ scenario, run }) => {
          // Fetch PRD for this scenario
          const prd = await getLatestPrdForScenario(userId, scenario.id);
          // Fetch Pitch for this scenario
          const pitch = await getLatestPitchForScenario(userId, scenario.id);
          
          // Extract key info from PRD markdown for summary
          let prdSummary = '';
          let prdKeyFeatures: string[] = [];
          if (prd?.markdown) {
            // Try to extract summary from PRD
            const summaryMatch = prd.markdown.match(/##\s*(?:Executive\s+)?Summary[^\n]*\n+([\s\S]*?)(?=\n##|$)/i);
            if (summaryMatch) {
              prdSummary = summaryMatch[1].trim().substring(0, 300);
            }
            // Try to extract key features
            const featuresMatch = prd.markdown.match(/##\s*(?:Key\s+)?Features[^\n]*\n+([\s\S]*?)(?=\n##|$)/i);
            if (featuresMatch) {
              const featureLines = featuresMatch[1].match(/[-*]\s+(.+)/g);
              if (featureLines) {
                prdKeyFeatures = featureLines.slice(0, 4).map(f => f.replace(/^[-*]\s+/, '').trim());
              }
            }
          }
          
          // Extract value proposition summary from pitch
          let valueProposition = '';
          if (pitch?.markdown) {
            // Try to extract value prop from pitch
            const valueMatch = pitch.markdown.match(/##\s*Value\s+Proposition[^\n]*\n+([\s\S]*?)(?=\n##|$)/i);
            if (valueMatch) {
              valueProposition = valueMatch[1].trim().substring(0, 300);
            } else {
              // Fallback: use the first paragraph as value prop
              const firstPara = pitch.markdown.match(/^(?:#+.*\n)?\n*([\s\S]*?)(?:\n\n|$)/);
              if (firstPara) {
                valueProposition = firstPara[1].trim().substring(0, 200);
              }
            }
          }
          
          return {
            title: scenario.title,
            description: run.workflowExplanation || scenario.description || '',
            impactScore: run.score || 0,
            keyBenefit: scenario.goal || '',
            // Summary extracts
            prdSummary,
            prdKeyFeatures,
            valueProposition,
            // Full content for tabs
            problemStatement: scenario.description || scenario.goal || '',
            prdMarkdown: prd?.markdown || '',
            pitchMarkdown: pitch?.markdown || '',
          };
        })
      );

      const pageTitle = `AI Solutions for ${companyInfo.name}`;
      const pageContent = {
        companyName: companyInfo.name,
        industry: companyInfo.currentResearch.industry,
        description: companyInfo.currentResearch.description,
        marketPosition: companyInfo.currentResearch.marketPosition,
        // Additional company research fields
        challenges: companyInfo.currentResearch.challenges,
        opportunities: companyInfo.currentResearch.opportunities,
        products: companyInfo.currentResearch.products,
        competitors: companyInfo.currentResearch.competitors,
        aiRelevance: companyInfo.currentResearch.aiRelevance,
        // Solutions with full PRD and pitch content for tabs
        solutions: solutionsWithDetails,
      };

      const response = await createWordPressPage(pageTitle, pageContent, 'draft');
      setWordPressPageUrl(response.link);      // Open the page in a new tab
      window.open(response.link, '_blank');
    } catch (err) {
      console.error('Failed to create WordPress page:', err);
      setError(err instanceof Error ? err.message : 'Failed to create WordPress page. Please try again.');
    } finally {
      setIsCreatingWordPressPage(false);
    }
  };

  const fetchBrandingContext = async (): Promise<string> => {
    try {
      const response = await fetch('/branding/BRANDING.md');
      if (!response.ok) {
        console.warn('Failed to fetch branding guidelines');
        return '';
      }
      return await response.text();
    } catch (error) {
      console.error('Error loading branding guidelines:', error);
      return '';
    }
  };

  const handleCreatePresentation = async () => {
    const prompt = getPresentationPrompt();
    if (!prompt) return;

    setIsGeneratingPresentation(true);
    try {
      const brandingContext = await fetchBrandingContext();
      // Pass brandingContext as the 3rd argument, files (2nd arg) is undefined
      const html = await generatePresentationWebsite(prompt, undefined, brandingContext);
      const blob = new Blob([html], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      setPresentationUrl(url);
    } catch (error) {
      console.error('Failed to create presentation:', error);
      setError('Failed to create presentation. Please try again.');
    } finally {
      setIsGeneratingPresentation(false);
    }
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
          <h1 className="text-2xl font-bold text-wm-blue">{t('research.researchList')}</h1>
          <button
            onClick={handleNewResearch}
            className="px-4 py-2 bg-wm-accent text-white rounded-lg hover:bg-wm-accent/90 transition-colors flex items-center gap-2 font-bold"
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
          <h1 className="text-2xl font-bold text-wm-blue">{t('research.title')}</h1>
          <button
            onClick={() => setView('LIST')}
            className="text-wm-accent hover:text-wm-accent/80 transition-colors mt-2 flex items-center gap-1 font-bold"
          >
            <Icons.ChevronLeft className="w-4 h-4" />
            {t('common.back')}
          </button>
        </div>
        <button
          onClick={() => setSelectedCompanyName(null)}
          className="px-4 py-2 bg-wm-accent text-white rounded-lg hover:bg-wm-accent/90 transition-colors flex items-center gap-2 font-bold"
        >
          {t('research.clearCompany')}
        </button>
      </div>

      <div className="bg-white border border-wm-neutral/30 rounded-xl p-6 shadow-sm">
        <div className="space-y-4">
          <div className="flex gap-2">
            <input
              type="text"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={t('research.searchPlaceholder')}
              className="flex-1 bg-wm-neutral/10 text-wm-blue p-3 rounded-lg border border-wm-neutral/30 focus:border-wm-accent focus:outline-none placeholder:text-wm-blue/40"
            />
            <button
              onClick={handleResearch}
              disabled={isLoadingResearch || !companyName.trim()}
              className="px-6 py-3 bg-wm-accent text-white rounded-lg hover:bg-wm-accent/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 font-bold"
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
        <div className="bg-wm-pink/10 border-l-4 border-wm-pink text-wm-pink p-4 rounded-r-lg">
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
              selectedRunIds={selectedRunIds}
              onToggleRunId={handleToggleRunId}
              onGeneratePrompt={handleGeneratePrompt}
              onGenerateDiviPrompt={handleGenerateDiviPrompt}
              isCreatingWordPressPage={isCreatingWordPressPage}
              wordPressPageUrl={wordPressPageUrl}
              onCreatePresentation={handleCreatePresentation}
            />

            {/* RFP Analysis Section - Completely Separate */}
            {companyInfo?.currentResearch?.rfpDocument?.analysis ? (
              <RfpAnalysisView 
                analysis={companyInfo.currentResearch.rfpDocument.analysis} 
              />
            ) : companyInfo?.currentResearch?.rfpDocument && (
              <div className="bg-white border border-wm-neutral/30 rounded-xl p-6 shadow-sm">
                <div className="animate-pulse flex space-x-4">
                  <div className="flex-1 space-y-4 py-1">
                    <div className="h-4 bg-wm-neutral/40 rounded w-3/4"></div>
                    <div className="space-y-2">
                      <div className="h-4 bg-wm-neutral/40 rounded"></div>
                      <div className="h-4 bg-wm-neutral/40 rounded w-5/6"></div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Prompt Generation Modal */}
      {showPromptModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white border border-wm-neutral/30 rounded-xl p-6 max-w-2xl w-full max-h-[90vh] flex flex-col shadow-xl">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-wm-blue">Generated Presentation Prompt</h2>
              <button 
                onClick={() => setShowPromptModal(false)}
                className="text-wm-blue/50 hover:text-wm-blue"
              >
                <Icons.X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto bg-wm-neutral/10 p-4 rounded-lg mb-4 border border-wm-neutral/30">
              <pre className="whitespace-pre-wrap text-wm-blue/80 font-mono text-sm">
                {generatedPrompt}
              </pre>
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowPromptModal(false)}
                className="px-4 py-2 text-wm-blue/70 hover:text-wm-blue font-bold"
              >
                Close
              </button>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(generatedPrompt);
                  // Optional: Show copied toast
                }}
                className="px-4 py-2 bg-wm-accent text-white rounded-lg hover:bg-wm-accent/90 flex items-center gap-2 font-bold"
              >
                <Icons.Copy className="w-4 h-4" />
                Copy to Clipboard
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Presentation Created Modal */}
      {presentationUrl && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white border border-wm-neutral/30 rounded-xl p-6 max-w-md w-full shadow-xl">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-wm-blue">Presentation Created</h2>
              <button 
                onClick={() => setPresentationUrl(null)}
                className="text-wm-blue/50 hover:text-wm-blue"
              >
                <Icons.X className="w-6 h-6" />
              </button>
            </div>
            
            <p className="text-wm-blue/70 mb-6">
              Your sales presentation website has been generated successfully.
            </p>

            <div className="flex flex-col gap-3">
              <a
                href={presentationUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-3 bg-wm-accent text-white rounded-lg hover:bg-wm-accent/90 text-center font-bold"
              >
                View Presentation
              </a>
              
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-wm-neutral"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white text-wm-blue/50">or continue editing</span>
                </div>
              </div>

              <div className="space-y-2">
                <a
                  href="https://aistudio.google.com/prompts/new_chat?model=gemini-1.5-pro"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`px-4 py-3 rounded-lg text-center flex items-center justify-center gap-2 transition-all w-full font-bold ${
                    showCopiedMessage 
                      ? 'bg-wm-accent text-white hover:bg-wm-accent/90' 
                      : 'bg-wm-neutral/30 text-wm-blue hover:bg-wm-neutral/50'
                  }`}
                  onClick={() => {
                    const prompt = getPresentationPrompt();
                    if (prompt) {
                      navigator.clipboard.writeText(prompt);
                      setShowCopiedMessage(true);
                      setTimeout(() => setShowCopiedMessage(false), 3000);
                    }
                  }}
                >
                  <span>{showCopiedMessage ? 'Prompt Copied! Paste in AI Studio' : 'Continue in Google AI Studio'}</span>
                  {!showCopiedMessage && <Icons.ExternalLink className="w-4 h-4 text-wm-blue/50" />}
                </a>
                <p className="text-xs text-wm-blue/50 text-center">
                  The prompt will be automatically copied to your clipboard.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Loading Overlay */}
      {isGeneratingPresentation && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white border border-wm-neutral/30 rounded-xl p-8 flex flex-col items-center shadow-xl">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-wm-accent mb-4"></div>
            <h3 className="text-xl font-bold text-wm-blue mb-2">Creating Presentation...</h3>
            <p className="text-wm-blue/60">Generating website content with Gemini AI</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default CompanyResearch;