import React, { useEffect, useState } from 'react';
import { useTranslation } from '../i18n';
import type { CompanyResearch, Scenario, StoredEvaluationResult, Meeting } from '../types';
import MeetingsList from './MeetingsList';
import { saveMeeting, getMeetings, updateMeeting, deleteMeeting, updateCompanySelectedDomains, updateCompanySelectedScenarios, saveDocuments, getDocuments, deleteDocument } from '../services/companyService';
import { analyzeDocumentWithGemini } from '../services/geminiService';
import { extractTextFromPDF } from '../services/pdfExtractor';

interface CompanyResearchContentProps {
  companyInfo: CompanyResearch;
  scenarioRuns?: Record<string, StoredEvaluationResult[]>;
  scenariosById?: Record<string, Scenario>;
  isScenarioRunsLoading?: boolean;
  onViewWorkflow?: (workflowId: string, companyName?: string, companyId?: string) => void;
  companyId?: string;
  userId?: string;
  selectedRunIds?: string[];
  onToggleRunId?: (runId: string) => void;
  onGenerateDiviPrompt?: () => void;
  isCreatingWordPressPage?: boolean;
  wordPressPageUrl?: string | null;
  onCreatePresentation?: () => void;
  onDeleteRun?: (runId: string) => void;
  documentUploadSection?: React.ReactNode;
  allScenarios?: Scenario[];
  onSelectScenario?: (scenarioId: string) => void;
  initialSelectedDomains?: string[];
  onSelectedDomainsChange?: (domains: string[]) => void;
  selectedScenarios?: string[];
  onSelectedScenariosChange?: (scenarios: string[]) => void;
}

const CompanyResearchContent: React.FC<CompanyResearchContentProps> = ({
  companyInfo,
  scenarioRuns = {},
  scenariosById = {},
  isScenarioRunsLoading = false,
  onViewWorkflow,
  companyId,
  userId,
  selectedRunIds = [],
  onToggleRunId,
  onGenerateDiviPrompt,
  isCreatingWordPressPage = false,
  wordPressPageUrl = null,
  onCreatePresentation,
  onDeleteRun,
  documentUploadSection,
  allScenarios = [],
  onSelectScenario,
  initialSelectedDomains = [],
  onSelectedDomainsChange,
  selectedScenarios = [],
  onSelectedScenariosChange,
}) => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<'info' | 'domains' | 'documents' | 'meetings'>('info');
  const [selectedDomains, setSelectedDomains] = useState<Set<string>>(new Set(initialSelectedDomains));
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [isLoadingMeetings, setIsLoadingMeetings] = useState(false);
  const [showOpportunityModal, setShowOpportunityModal] = useState(false);
  const [opportunitySelectedDomain, setOpportunitySelectedDomain] = useState<string>('');
  const [opportunitySearchType, setOpportunitySearchType] = useState<'library' | 'new'>('library');
  const [isAnalyzingDocument, setIsAnalyzingDocument] = useState(false);
  const [documents, setDocuments] = useState<Array<{ id: string; title: string; type: string; context: string; fullText: string; uploadedAt: number }>>([]);
  const [selectedDocument, setSelectedDocument] = useState<{ id: string; title: string; type: string; context: string; fullText: string; uploadedAt: number } | null>(null);
  
  // Update selected domains when initialSelectedDomains changes
  useEffect(() => {
    setSelectedDomains(new Set(initialSelectedDomains));
  }, [initialSelectedDomains.join(',')]); // Join to create a stable dependency
  
  // Real-time save to Firebase when selected domains change
  useEffect(() => {
    const saveDomainsToFirebase = async () => {
      if (companyId && userId) {
        try {
          const domainsArray = Array.from(selectedDomains);
          await updateCompanySelectedDomains(companyId, userId, domainsArray);
          console.log('Domains saved to Firebase in real-time:', domainsArray);
        } catch (error) {
          console.error('Failed to save domains to Firebase:', error);
        }
      }
    };
    
    saveDomainsToFirebase();
  }, [selectedDomains, companyId, userId]);
  
  // Real-time save selectedScenarios to Firebase when they change
  useEffect(() => {
    const saveScenariosToFirebase = async () => {
      if (companyId && userId && selectedScenarios.length > 0) {
        try {
          await updateCompanySelectedScenarios(companyId, userId, selectedScenarios);
          console.log('Scenarios saved to Firebase in real-time:', selectedScenarios);
        } catch (error) {
          console.error('Failed to save scenarios to Firebase:', error);
        }
      }
    };
    
    saveScenariosToFirebase();
  }, [selectedScenarios, companyId, userId]);
  
  // Load meetings
  useEffect(() => {
    if (companyId) {
      (async () => {
        try {
          setIsLoadingMeetings(true);
          const fetchedMeetings = await getMeetings(companyId);
          setMeetings(fetchedMeetings);
        } catch (error) {
          console.error('Failed to load meetings:', error);
        } finally {
          setIsLoadingMeetings(false);
        }
      })();
    }
  }, [companyId]);
  
  // Load documents
  useEffect(() => {
    if (companyId) {
      (async () => {
        try {
          const fetchedDocuments = await getDocuments(companyId);
          setDocuments(fetchedDocuments);
        } catch (error) {
          console.error('Failed to load documents:', error);
        }
      })();
    }
  }, [companyId]);
  
  // Save documents to Firebase whenever they change
  useEffect(() => {
    if (companyId && documents.length > 0) {
      (async () => {
        try {
          await saveDocuments(companyId, documents);
        } catch (error) {
          console.error('Failed to save documents:', error);
        }
      })();
    }
  }, [documents, companyId]);
  
  const handleAddMeeting = async (meeting: Omit<Meeting, 'id' | 'companyId' | 'createdAt' | 'updatedAt'>) => {
    if (!companyId) return;
    try {
      const newMeeting = await saveMeeting(companyId, meeting);
      setMeetings([...meetings, newMeeting]);
    } catch (error) {
      console.error('Failed to add meeting:', error);
      throw error;
    }
  };

  const handleUpdateMeeting = async (meetingId: string, meeting: Omit<Meeting, 'id' | 'companyId' | 'createdAt' | 'updatedAt'>) => {
    if (!companyId) return;
    try {
      await updateMeeting(companyId, meetingId, meeting);
      setMeetings(meetings.map(m => m.id === meetingId ? { ...m, ...meeting, updatedAt: Date.now() } : m));
    } catch (error) {
      console.error('Failed to update meeting:', error);
      throw error;
    }
  };

  const handleDeleteMeeting = async (meetingId: string) => {
    if (!companyId) return;
    try {
      await deleteMeeting(companyId, meetingId);
      setMeetings(meetings.filter(m => m.id !== meetingId));
    } catch (error) {
      console.error('Failed to delete meeting:', error);
      throw error;
    }
  };

  const handleAnalyzeDocument = async (file: File) => {
    try {
      setIsAnalyzingDocument(true);
      console.log('=== Starting document analysis ===');
      console.log('File name:', file.name);
      console.log('File size:', file.size);
      console.log('File type:', file.type);
      
      let text = '';
      
      // Check if file is PDF
      if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
        console.log('PDF detected, extracting text...');
        alert('Extracting text from PDF... This may take a moment.');
        try {
          text = await extractTextFromPDF(file);
          console.log('PDF text extracted successfully, length:', text.length);
          
          if (!text || text.trim().length < 10) {
            throw new Error('PDF appears to be empty or text could not be extracted. The PDF may contain only images or be password-protected.');
          }
        } catch (pdfError) {
          console.error('PDF extraction failed:', pdfError);
          setIsAnalyzingDocument(false);
          throw new Error('Failed to extract text from PDF. Please ensure the PDF is not password-protected and contains readable text.');
        }
      } else {
        // Read as text for non-PDF files
        console.log('Reading file as text...');
        text = await file.text();
        console.log('File read successfully, length:', text.length);
        
        // Check if this looks like binary PDF data
        if (text.startsWith('%PDF')) {
          console.error('File appears to be PDF but was not detected as such');
          setIsAnalyzingDocument(false);
          throw new Error('File appears to be a PDF. Please save it with a .pdf extension.');
        }
      }
      
      console.log('First 500 chars of content:', text.substring(0, 500));
      
      // Call Gemini to analyze the document
      console.log('Calling Gemini...');
      const analysis = await analyzeDocumentWithGemini(text, file.name);
      
      console.log('Document analysis result:', analysis);
      
      // Create document with analysis results and full text
      const newDocument = {
        id: Date.now().toString(),
        title: analysis.title || file.name.replace(/\.[^/.]+$/, ''),
        type: analysis.type || 'General',
        context: analysis.context || text.substring(0, 500),
        fullText: text,
        uploadedAt: Date.now()
      };
      
      // Save to state (and eventually Firebase)
      setDocuments([...documents, newDocument]);
      
      console.log('Document saved:', newDocument);
      setIsAnalyzingDocument(false);
      alert('Document uploaded and analyzed successfully!');
    } catch (error) {
      console.error('=== Failed to analyze document ===', error);
      setIsAnalyzingDocument(false);
      alert(`Error: ${error instanceof Error ? error.message : 'Unknown error occurred'}`);
    }
  };
  
  // Debug logging
  console.log('CompanyResearchContent render:', {
    scenarioRunsKeys: Object.keys(scenarioRuns),
    scenarioRunsCounts: Object.entries(scenarioRuns).map(([id, runs]) => ({ id, count: runs.length })),
    allScenariosCount: allScenarios.length,
    activeTab  // Add this to see which tab is active
  });
  
  // Available business domains
  const availableDomains = [
    'Sales',
    'HR',
    'Finance',
    'Operations',
    'Marketing',
    'Customer Service',
    'IT',
    'Legal',
    'Supply Chain',
    'Product',
    'Engineering',
    'Healthcare'
  ];
  
  const scenarioEntries = Object.entries(scenarioRuns)
    .filter(([, runs]) => Array.isArray(runs) && runs.length > 0)
    .sort(([, runsA], [, runsB]) => {
      const latestA = runsA[0]?.timestamp ?? 0;
      const latestB = runsB[0]?.timestamp ?? 0;
      return latestB - latestA;
    });

  // Get domains that actually have scenario runs
  const domainsWithRuns = new Set(
    scenarioEntries
      .map(([scenarioId]) => scenariosById?.[scenarioId]?.domain)
      .filter(Boolean)
  );

  // Filter scenario entries by selected domains
  const filteredScenarioEntries = selectedDomains.size === 0
    ? scenarioEntries
    : scenarioEntries.filter(([scenarioId]) => {
        const domain = scenariosById?.[scenarioId]?.domain;
        return domain && selectedDomains.has(domain);
      });

  const toggleDomain = (domain: string) => {
    setSelectedDomains(prev => {
      const next = new Set(prev);
      if (next.has(domain)) {
        next.delete(domain);
      } else {
        next.add(domain);
      }
      // Notify parent of change
      if (onSelectedDomainsChange) {
        onSelectedDomainsChange(Array.from(next));
      }
      // Also persist selectedScenarios to Firebase when toggling domains
      if (companyId && userId && selectedScenarios.length > 0) {
        updateCompanySelectedScenarios(companyId, userId, selectedScenarios)
          .then(() => console.log('Scenarios persisted after domain toggle'))
          .catch(error => console.error('Failed to persist scenarios:', error));
      }
      return next;
    });
  };

  return (
    <div className="bg-wm-white border border-wm-neutral rounded-xl">
      {/* Tabs */}
      <div className="flex border-b border-wm-neutral/30">
        <button
          onClick={() => setActiveTab('info')}
          className={`flex-1 px-6 py-4 font-bold transition-all ${
            activeTab === 'info'
              ? 'text-wm-accent border-b-2 border-wm-accent bg-wm-accent/5'
              : 'text-wm-blue/60 hover:text-wm-blue hover:bg-wm-neutral/10'
          }`}
        >
          Company Information
        </button>
        <button
          onClick={() => setActiveTab('domains')}
          className={`flex-1 px-6 py-4 font-bold transition-all ${
            activeTab === 'domains'
              ? 'text-wm-accent border-b-2 border-wm-accent bg-wm-accent/5'
              : 'text-wm-blue/60 hover:text-wm-blue hover:bg-wm-neutral/10'
          }`}
        >
          Target Domains
        </button>
        <button
          onClick={() => setActiveTab('documents')}
          className={`flex-1 px-6 py-4 font-bold transition-all ${
            activeTab === 'documents'
              ? 'text-wm-accent border-b-2 border-wm-accent bg-wm-accent/5'
              : 'text-wm-blue/60 hover:text-wm-blue hover:bg-wm-neutral/10'
          }`}
        >
          Documents
        </button>
        <button
          onClick={() => setActiveTab('meetings')}
          className={`flex-1 px-6 py-4 font-bold transition-all ${
            activeTab === 'meetings'
              ? 'text-wm-accent border-b-2 border-wm-accent bg-wm-accent/5'
              : 'text-wm-blue/60 hover:text-wm-blue hover:bg-wm-neutral/10'
          }`}
        >
          Meetings
        </button>
      </div>
      
      <div className="p-6">
        {/* Company Information Tab */}
        {activeTab === 'info' && (
          <div className="space-y-6">
        <div>
          <h3 className="text-wm-blue font-bold mb-2">{t('research.description')}</h3>
          <p className="text-wm-blue/70">{companyInfo?.currentResearch?.description || ''}</p>
        </div>

        <div>
          <h3 className="text-wm-blue font-bold mb-2">{t('research.industry')}</h3>
          <p className="text-wm-blue/70">{companyInfo?.currentResearch?.industry || ''}</p>
        </div>

        <div>
          <h3 className="text-wm-blue font-bold mb-2">{t('research.marketPosition')}</h3>
          <p className="text-wm-blue/70">{companyInfo?.currentResearch?.marketPosition || ''}</p>
        </div>

        <div>
          <h3 className="text-wm-blue font-bold mb-2">{t('research.products')}</h3>
          <ul className="list-disc list-inside text-wm-blue/70 space-y-1">
            {companyInfo?.currentResearch?.products?.map((product, index) => (
              <li key={index}>{product}</li>
            )) || []}
          </ul>
        </div>

        <div>
          <h3 className="text-wm-blue font-bold mb-2">{t('research.competitors')}</h3>
          <ul className="list-disc list-inside text-wm-blue/70 space-y-1">
            {companyInfo?.currentResearch?.competitors?.map((competitor, index) => (
              <li key={index}>{competitor}</li>
            )) || []}
          </ul>
        </div>

        <div>
          <h3 className="text-wm-blue font-bold mb-2">{t('research.challenges')}</h3>
          <ul className="list-disc list-inside text-wm-blue/70 space-y-1">
            {companyInfo?.currentResearch?.challenges?.map((challenge, index) => (
              <li key={index}>{challenge}</li>
            )) || []}
          </ul>
        </div>

        <div>
          <h3 className="text-wm-blue font-bold mb-2">{t('research.opportunities')}</h3>
          <ul className="list-disc list-inside text-wm-blue/70 space-y-1">
            {companyInfo?.currentResearch?.opportunities?.map((opportunity, index) => (
              <li key={index}>{opportunity}</li>
            )) || []}
          </ul>
        </div>

        <div>
          <h3 className="text-wm-blue font-bold mb-2">{t('research.aiUseCases')}</h3>
          <ul className="list-disc list-inside text-wm-blue/70 space-y-1">
            {companyInfo?.currentResearch?.useCases?.map((useCase, index) => (
              <li key={index}>{useCase}</li>
            )) || []}
          </ul>
        </div>

        <div className="border-t border-wm-neutral pt-6">
          <h3 className="text-wm-blue font-bold mb-4">{t('research.aiAnalysis')}</h3>
          
          <div className="space-y-4">
            <div>
              <h4 className="text-wm-blue/80 font-bold mb-2">{t('research.currentAI')}</h4>
              <p className="text-wm-blue/60">{companyInfo?.currentResearch?.aiRelevance?.current || ''}</p>
            </div>
            
            <div>
              <h4 className="text-wm-blue/80 font-bold mb-2">{t('research.potentialAI')}</h4>
              <p className="text-wm-blue/60">{companyInfo?.currentResearch?.aiRelevance?.potential || ''}</p>
            </div>
            
            <div>
              <h4 className="text-wm-blue/80 font-bold mb-2">{t('research.aiRecommendations')}</h4>
              <ul className="list-disc list-inside text-wm-blue/60 space-y-1">
                {companyInfo?.currentResearch?.aiRelevance?.recommendations?.map((rec, index) => (
                  <li key={index}>{rec}</li>
                )) || []}
              </ul>
            </div>
          </div>
        </div>
          </div>
        )}

        {/* Target Domains Tab */}
        {activeTab === 'domains' && (
          <div>
            {/* Find Opportunities Button */}
            <div className="mb-6 flex gap-3">
              <button
                onClick={() => {
                  console.log('=== Find Opportunities clicked ===');
                  setShowOpportunityModal(true);
                  console.log('Modal state set to true');
                }}
                className="px-4 py-2 bg-wm-accent text-white font-bold rounded-lg hover:bg-wm-accent/90 transition-colors"
              >
                Find Opportunities
              </button>
            </div>

            {/* Target Domain Pills */}
            <div className="mb-6">
              <h3 className="text-sm font-bold text-wm-blue mb-3">Target Domains:</h3>
              <div className="flex flex-wrap gap-2">
                {availableDomains.map((domain) => {
                  const hasRuns = domainsWithRuns.has(domain);
                  const isSelected = selectedDomains.has(domain);
                  const workflowCount = allScenarios.filter(s => s.domain === domain && s.type === 'TRAINING').length;
                  
                  return (
                    <button
                      key={domain}
                      onClick={() => toggleDomain(domain)}
                      className={`px-4 py-2 rounded-full text-sm font-bold transition-all ${
                        isSelected
                          ? 'bg-wm-accent text-white shadow-md'
                          : 'bg-wm-neutral/20 text-wm-blue hover:bg-wm-neutral/30'
                      }`}
                    >
                      {domain}
                      {workflowCount > 0 && (
                        <span className="ml-1.5 text-xs opacity-70">
                          ({workflowCount})
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
              {selectedDomains.size > 0 && (
                <button
                  onClick={() => {
                    setSelectedDomains(new Set());
                    if (onSelectedDomainsChange) {
                      onSelectedDomainsChange([]);
                    }
                  }}
                  className="mt-3 text-xs text-wm-accent hover:text-wm-accent/80 font-bold"
                >
                  Clear selection
                </button>
              )}
            </div>

            {/* Workflows for Selected Domains */}
            {selectedDomains.size > 0 && (
              <div className="space-y-6">
                {Array.from(selectedDomains).map((domain) => {
                  const domainWorkflows = allScenarios.filter(
                    (scenario) => scenario.domain === domain && scenario.type === 'TRAINING'
                  );
                  
                  if (domainWorkflows.length === 0) return null;
                  
                  // Sort workflows: 1) Has runs, 2) Starred, 3) The rest
                  const sortedWorkflows = [...domainWorkflows].sort((a, b) => {
                    const aHasRuns = scenarioRuns[a.id]?.length > 0;
                    const bHasRuns = scenarioRuns[b.id]?.length > 0;
                    const aStarred = !!a.favoritedBy?.[userId];
                    const bStarred = !!b.favoritedBy?.[userId];
                    
                    // 1. Prioritize workflows the user has run
                    if (aHasRuns && !bHasRuns) return -1;
                    if (!aHasRuns && bHasRuns) return 1;
                    
                    // 2. Then prioritize starred workflows
                    if (aStarred && !bStarred) return -1;
                    if (!aStarred && bStarred) return 1;
                    
                    // 3. Rest stay in their order
                    return 0;
                  });
                  
                  return (
                    <div key={domain} className="border border-wm-neutral/30 rounded-lg p-4 bg-white">
                      <h3 className="text-lg font-bold text-wm-blue mb-4">{domain} Workflows</h3>
                      <div className="flex gap-3 overflow-x-auto pb-2" style={{ scrollbarWidth: 'thin' }}>
                        {sortedWorkflows.map((workflow) => {
                          const hasRuns = scenarioRuns[workflow.id]?.length > 0;
                          console.log(`Workflow ${workflow.id} (${workflow.title}):`, {
                            hasRuns,
                            runsCount: scenarioRuns[workflow.id]?.length || 0,
                            runs: scenarioRuns[workflow.id]
                          });
                          
                          return (
                            <button
                              key={workflow.id}
                              onClick={() => onSelectScenario?.(workflow.id)}
                              className={`flex-shrink-0 w-80 text-left p-3 border rounded-lg hover:shadow-md transition-all ${
                                hasRuns
                                  ? 'border-wm-accent bg-wm-accent/10 hover:bg-wm-accent/20 ring-2 ring-wm-accent/30'
                                  : 'border-wm-neutral/30 bg-wm-neutral/5 hover:bg-wm-accent/5 hover:border-wm-accent'
                              }`}
                            >
                              <div className="flex items-center justify-between mb-1">
                                <div className="font-bold text-wm-blue text-sm flex-1">
                                  {workflow.title}
                                </div>
                                <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                                  {workflow.favoritedBy?.[userId] && (
                                    <svg className="w-4 h-4 text-wm-yellow fill-current" viewBox="0 0 24 24">
                                      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                                    </svg>
                                  )}
                                  {hasRuns && (
                                    <div className="px-2 py-0.5 bg-wm-accent text-white text-xs font-bold rounded-full">
                                      {scenarioRuns[workflow.id].length}
                                    </div>
                                  )}
                                </div>
                              </div>
                              {workflow.description && (
                                <div className="text-xs text-wm-blue/60 line-clamp-2">
                                  {workflow.description}
                                </div>
                              )}
                              {workflow.process && (
                                <div className="mt-2 text-xs text-wm-accent font-bold">
                                  {workflow.process}
                                </div>
                              )}
                              {/* Demo URLs from evaluations */}
                              {scenarioRuns[workflow.id] && scenarioRuns[workflow.id].length > 0 && (
                                <div className="mt-3 pt-3 border-t border-wm-neutral/20 space-y-1.5">
                                  {scenarioRuns[workflow.id].slice(0, 2).map((evaluation, idx) => (
                                    <div key={evaluation.id} className="flex items-center gap-2 text-xs flex-wrap">
                                      {evaluation.demoProjectUrl && (
                                        <a
                                          href={evaluation.demoProjectUrl}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="text-wm-accent hover:text-wm-accent/80 font-bold flex items-center gap-1"
                                          onClick={(e) => e.stopPropagation()}
                                        >
                                          <svg className="w-3 h-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                          </svg>
                                          <span>Demo</span>
                                        </a>
                                      )}
                                      {evaluation.demoPublishedUrl && (
                                        <a
                                          href={evaluation.demoPublishedUrl}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="text-wm-pink hover:text-wm-pink/80 font-bold flex items-center gap-1"
                                          onClick={(e) => e.stopPropagation()}
                                        >
                                          <svg className="w-3 h-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                          </svg>
                                          <span>Published</span>
                                        </a>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
        
        {/* Use Case Runs Section */}
        <div className={`${selectedDomains.size > 0 ? 'border-t border-wm-neutral pt-6 mt-6' : ''}`}>
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-wm-blue font-bold text-lg">{t('research.scenarioRuns')}</h3>
            {selectedRunIds.length > 0 && (
              <div className="flex gap-2">
                {onGenerateDiviPrompt && (
                  <button
                    onClick={onGenerateDiviPrompt}
                    disabled={isCreatingWordPressPage}
                    className="px-3 py-1.5 bg-wm-accent text-wm-white text-sm font-bold rounded-lg hover:bg-wm-accent/90 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isCreatingWordPressPage ? (
                      <>
                        <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Creating Page...
                      </>
                    ) : (
                      'Create WordPress Page'
                    )}
                  </button>
                )}
                {onCreatePresentation && (
                  <button
                    onClick={onCreatePresentation}
                    className="px-3 py-1.5 bg-wm-accent text-wm-white text-sm font-bold rounded-lg hover:bg-wm-accent/90 transition-colors flex items-center gap-2"
                  >
                    Gen AI Prompt
                  </button>
                )}
              </div>
            )}
          </div>
          {wordPressPageUrl && (
            <div className="mb-4 p-3 bg-wm-accent/10 border border-wm-accent/30 rounded-lg">
              <p className="text-wm-accent text-sm">
                ✓ WordPress page created successfully!{' '}
                <a 
                  href={wordPressPageUrl} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="underline hover:text-wm-accent/80"
                >
                  View Page →
                </a>
              </p>
            </div>
          )}
          {isScenarioRunsLoading ? (
            <div className="space-y-3">
              <div className="h-4 bg-wm-neutral/60 rounded w-1/2 animate-pulse"></div>
              <div className="h-4 bg-wm-neutral/60 rounded w-2/3 animate-pulse"></div>
              <div className="h-4 bg-wm-neutral/60 rounded w-1/3 animate-pulse"></div>
            </div>
          ) : filteredScenarioEntries.length > 0 ? (
            <div className="space-y-4">
              {filteredScenarioEntries.map(([scenarioId, runs]) => {
                const scenario = scenariosById[scenarioId];
                return (
                  <div key={scenarioId} className="bg-wm-neutral/20 border border-wm-neutral rounded-lg p-4">
                    <h4 className="text-wm-blue font-bold mb-3">{scenario?.title || t('research.unknownScenario')}</h4>
                    <ul className="space-y-2">
                      {runs.map(run => {
                        const formattedDate = run.timestamp ? new Date(run.timestamp).toLocaleString() : t('research.unknownRunDate');
                        const scoreLabel = typeof run.score === 'number' ? t('research.runScore', { score: Math.round(run.score) }) : null;
                        const hasWorkflowVersion = Boolean(run.workflowVersionId);

                        return (
                          <li key={run.id} className="flex items-start gap-3">
                            {onToggleRunId && (
                              <div className="pt-3">
                                <input
                                  type="checkbox"
                                  checked={selectedRunIds.includes(run.id)}
                                  onChange={() => onToggleRunId(run.id)}
                                  className="w-4 h-4 rounded border-wm-neutral bg-wm-white text-wm-accent focus:ring-wm-accent focus:ring-offset-wm-white"
                                />
                              </div>
                            )}
                            <button
                              type="button"
                              onClick={() => hasWorkflowVersion && onViewWorkflow?.(run.workflowVersionId!, companyInfo.name, companyId)}
                              className={`flex-1 text-left text-wm-blue/70 text-sm flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between rounded-md px-3 py-2 ${hasWorkflowVersion ? 'hover:bg-wm-neutral/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-wm-accent' : 'cursor-default opacity-70'}`}
                              disabled={!hasWorkflowVersion}
                            >
                              <span className="font-bold text-wm-blue">{scenario?.title || t('research.untitledVersion')}</span>
                              <span className="text-wm-blue/50 text-xs sm:text-sm flex flex-col sm:flex-row sm:items-center sm:gap-2">
                                {scoreLabel && <span>{scoreLabel}</span>}
                                <span>{t('research.ranOn', { date: formattedDate })}</span>
                              </span>
                            </button>
                            {onDeleteRun && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (window.confirm(t('research.confirmDeleteRun'))) {
                                    onDeleteRun(run.id);
                                  }
                                }}
                                className="p-2 text-wm-pink hover:bg-wm-pink/10 rounded-md transition-colors flex-shrink-0"
                                title={t('common.delete')}
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-wm-blue/50">{t('research.noScenarioRuns')}</p>
          )}
        </div>
          </div>
        )}

        {/* Documents Tab */}
        {activeTab === 'documents' && (
          <div>
            {/* Upload Document */}
            <div className="mb-6">
              <label className="inline-block">
                <input
                  type="file"
                  accept=".pdf,.txt,.doc,.docx"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      console.log('File selected for upload:', file.name);
                      handleAnalyzeDocument(file);
                      // Reset input
                      e.target.value = '';
                    }
                  }}
                  disabled={isAnalyzingDocument}
                  className="hidden"
                />
                <button
                  type="button"
                  disabled={isAnalyzingDocument}
                  className="px-4 py-2 bg-wm-accent text-white font-bold rounded-lg hover:bg-wm-accent/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  onClick={(e) => {
                    (e.currentTarget.previousElementSibling as HTMLInputElement)?.click();
                  }}
                >
                  {isAnalyzingDocument ? 'Analyzing...' : '+ Upload Document'}
                </button>
              </label>
            </div>

            {/* Documents Table */}
            {documents.length > 0 && (
              <div>
                <h3 className="text-sm font-bold text-wm-blue mb-3">Uploaded Documents</h3>
                <div className="overflow-x-auto border border-wm-neutral/30 rounded-lg">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-wm-neutral/30 bg-wm-neutral/5">
                        <th className="text-left px-4 py-3 font-bold text-wm-blue">Title</th>
                        <th className="text-left px-4 py-3 font-bold text-wm-blue">Type</th>
                        <th className="text-left px-4 py-3 font-bold text-wm-blue">Date Uploaded</th>
                        <th className="text-center px-4 py-3 font-bold text-wm-blue w-12">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {documents.map((doc) => (
                        <tr 
                          key={doc.id} 
                          className="border-b border-wm-neutral/30 hover:bg-wm-neutral/10 transition-colors cursor-pointer"
                          onClick={() => setSelectedDocument(doc)}
                        >
                          <td className="px-4 py-3 text-wm-blue font-semibold">{doc.title}</td>
                          <td className="px-4 py-3 text-wm-accent font-bold text-sm">{doc.type}</td>
                          <td className="px-4 py-3 text-wm-blue/70 text-sm">
                            {new Date(doc.uploadedAt).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </td>
                          <td className="px-4 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                            <button
                              onClick={async () => {
                                console.log('Delete document:', doc.id);
                                setDocuments(documents.filter(d => d.id !== doc.id));
                                if (companyId) {
                                  try {
                                    await deleteDocument(companyId, doc.id);
                                  } catch (error) {
                                    console.error('Failed to delete document from Firebase:', error);
                                  }
                                }
                              }}
                              className="p-1 text-wm-pink hover:text-wm-pink/80 transition-colors"
                              title="Delete document"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Document Viewer Modal */}
            {selectedDocument && (
              <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-lg shadow-2xl max-w-3xl w-full max-h-[85vh] overflow-hidden flex flex-col">
                  {/* Modal Header */}
                  <div className="bg-slate-50 px-6 py-4 border-b border-slate-200">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <h3 className="text-xl font-bold text-slate-900 mb-2">{selectedDocument.title}</h3>
                        <div className="flex items-center gap-3">
                          <span className="inline-block px-2.5 py-1 bg-wm-accent text-white font-bold text-xs rounded">
                            {selectedDocument.type}
                          </span>
                          <span className="text-xs text-slate-600">
                            {new Date(selectedDocument.uploadedAt).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={() => setSelectedDocument(null)}
                        className="flex-shrink-0 p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-200 rounded transition-colors"
                        title="Close"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  </div>
                  
                  {/* Modal Content */}
                  <div className="flex-1 overflow-y-auto px-6 py-6 bg-white">
                    <div className="mb-4">
                      <h4 className="text-sm font-bold text-slate-700 mb-2">Summary</h4>
                      <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                        <p className="text-slate-800 leading-relaxed text-sm">
                          {selectedDocument.context}
                        </p>
                      </div>
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-700 mb-2">Full Document Text</h4>
                      <div className="bg-slate-50 rounded-lg p-6 border border-slate-200 max-h-96 overflow-y-auto">
                        <p className="text-slate-800 leading-relaxed whitespace-pre-wrap text-sm font-mono">
                          {selectedDocument.fullText}
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  {/* Modal Footer */}
                  <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex justify-end">
                    <button
                      onClick={() => setSelectedDocument(null)}
                      className="px-4 py-2 bg-wm-accent hover:bg-wm-accent/90 text-white font-semibold text-sm rounded transition-colors"
                    >
                      Close
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Meetings Tab */}
        {/* Meetings Tab */}
        {activeTab === 'meetings' && (
          <div>
            <h3 className="text-xl font-bold text-wm-blue mb-4">Meetings</h3>
            <MeetingsList
              meetings={meetings}
              onAddMeeting={handleAddMeeting}
              onUpdateMeeting={handleUpdateMeeting}
              onDeleteMeeting={handleDeleteMeeting}
              isLoading={isLoadingMeetings}
            />
          </div>
        )}

        {/* Find Opportunities Modal */}
        {showOpportunityModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-lg p-6 max-w-md w-full mx-4">
              <h3 className="text-lg font-bold text-wm-blue mb-4">Find Opportunities</h3>
              
              <div className="space-y-4">
                {/* Domain Selection */}
                <div>
                  <label className="block text-sm font-bold text-wm-blue mb-2">
                    Select Domain
                  </label>
                  <select
                    value={opportunitySelectedDomain}
                    onChange={(e) => {
                      console.log('Domain selected:', e.target.value);
                      setOpportunitySelectedDomain(e.target.value);
                    }}
                    className="w-full px-3 py-2 border border-wm-neutral/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-wm-accent"
                  >
                    <option value="">Choose a domain...</option>
                    {availableDomains.map((domain) => (
                      <option key={domain} value={domain}>
                        {domain}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Search Type Selection */}
                <div>
                  <label className="block text-sm font-bold text-wm-blue mb-2">
                    Search Type
                  </label>
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="searchType"
                        value="library"
                        checked={opportunitySearchType === 'library'}
                        onChange={(e) => {
                          console.log('Search type selected:', e.target.value);
                          setOpportunitySearchType('library');
                        }}
                        className="w-4 h-4"
                      />
                      <span className="text-sm text-wm-blue">Workflows from Library</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="searchType"
                        value="new"
                        checked={opportunitySearchType === 'new'}
                        onChange={(e) => {
                          console.log('Search type selected:', e.target.value);
                          setOpportunitySearchType('new');
                        }}
                        className="w-4 h-4"
                      />
                      <span className="text-sm text-wm-blue">Generate New Ideas</span>
                    </label>
                  </div>
                </div>
              </div>

              {/* Modal Actions */}
              <div className="flex gap-2 mt-6">
                <button
                  onClick={() => {
                    console.log('Starting search with domain:', opportunitySelectedDomain, 'type:', opportunitySearchType);
                    if (opportunitySelectedDomain) {
                      // TODO: Implement search logic here
                      console.log('Search would execute here');
                      setShowOpportunityModal(false);
                    }
                  }}
                  disabled={!opportunitySelectedDomain}
                  className="flex-1 px-4 py-2 bg-wm-accent text-white font-bold rounded-lg hover:bg-wm-accent/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Search
                </button>
                <button
                  onClick={() => {
                    console.log('Closing modal');
                    setShowOpportunityModal(false);
                  }}
                  className="flex-1 px-4 py-2 bg-wm-neutral/20 text-wm-blue font-bold rounded-lg hover:bg-wm-neutral/30 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Document Upload Modal */}
        {/* Removed - using direct file upload instead */}
      </div>
    </div>
  );
};

export default CompanyResearchContent;