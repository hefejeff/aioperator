import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from '../i18n';
import type { CompanyResearch, Scenario, StoredEvaluationResult, Meeting, JourneyCollaborationConfig } from '../types';
import MeetingsList from './MeetingsList';
import { saveMeeting, getMeetings, updateMeeting, deleteMeeting, updateCompanySelectedDomains, updateCompanySelectedScenarios, updateCompanyPhaseWorkflows, saveDocuments, getDocuments, deleteDocument, updateCompanyJourneyStatus } from '../services/companyService';
import { analyzeDocumentCategory, analyzeRfpDocument } from '../services/geminiService';
import { extractTextFromPDF } from '../services/pdfExtractor';
import { db } from '../services/firebaseInit';
import { ref, set, query, orderByChild, equalTo, onValue, remove } from 'firebase/database';
import { CollaborationConfiguration } from './CollaborationConfiguration';

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
  onActiveTabChange?: (tab: 'info' | 'domains' | 'documents' | 'meetings' | 'collaboration') => void;
  onCreateScenario?: (context?: { companyId?: string; companyName?: string; domain?: string }) => void;
  initialActiveTab?: 'info' | 'domains' | 'documents' | 'meetings' | 'collaboration';
  showTabs?: boolean;
}

const CompanyResearchContent: React.FC<CompanyResearchContentProps> = ({
  companyInfo,
  scenarioRuns = {},
  scenariosById = {},
  companyId,
  userId,
  allScenarios = [],
  onSelectScenario,
  initialSelectedDomains = [],
  onSelectedDomainsChange,
  selectedScenarios = [],
  onActiveTabChange,
  onCreateScenario,
  initialActiveTab,
  showTabs = true,
}) => {
  const { t } = useTranslation();
  const renderInlineBold = (text: string) => {
    const parts = text.split(/(\*\*[^*]+\*\*)/g).filter(Boolean);
    return parts.map((part, idx) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return (
          <strong key={idx} className="font-semibold text-slate-900">
            {part.slice(2, -2)}
          </strong>
        );
      }
      return <span key={idx}>{part}</span>;
    });
  };

  const renderMarkdown = (text?: string) => {
    if (!text) {
      return <p className="text-slate-500 text-sm">No data provided.</p>;
    }

    const lines = text.split('\n');
    const blocks: React.ReactNode[] = [];
    let listItems: Array<{ text: string; indent: number }> = [];
    let listType: 'ol' | 'ul' | null = null;

    const flushList = () => {
      if (!listType || listItems.length === 0) return;
      const listClass = listType === 'ol' ? 'list-decimal' : 'list-disc';
      const ListTag = listType === 'ol' ? 'ol' : 'ul';
      blocks.push(
        <ListTag key={`list-${blocks.length}`} className={`list-inside space-y-1 text-sm text-slate-800 ${listClass}`}>
          {listItems.map((item, idx) => (
            <li key={idx} style={{ marginLeft: `${item.indent * 1.25}rem` }}>
              {renderInlineBold(item.text)}
            </li>
          ))}
        </ListTag>
      );
      listItems = [];
      listType = null;
    };

    lines.forEach((line) => {
      const trimmed = line.trim();
      if (!trimmed) {
        flushList();
        return;
      }

      const headingMatch = trimmed.match(/^(#{1,6})\s+(.*)$/);
      if (headingMatch) {
        flushList();
        const headingText = headingMatch[2];
        blocks.push(
          <h5 key={`heading-${blocks.length}`} className="text-sm font-bold text-slate-900 mt-2">
            {renderInlineBold(headingText)}
          </h5>
        );
        return;
      }

      const leadingSpaces = line.match(/^\s*/)?.[0]?.length || 0;
      const indentLevel = Math.floor(leadingSpaces / 2);
      const orderedMatch = trimmed.match(/^\d+\.\s+(.*)$/);
      const unorderedMatch = trimmed.match(/^[-*•]\s+(.*)$/);

      if (orderedMatch) {
        if (listType !== 'ol') {
          flushList();
          listType = 'ol';
        }
        listItems.push({ text: orderedMatch[1], indent: indentLevel });
        return;
      }

      if (unorderedMatch) {
        if (listType !== 'ul') {
          flushList();
          listType = 'ul';
        }
        listItems.push({ text: unorderedMatch[1], indent: indentLevel });
        return;
      }

      flushList();
      blocks.push(
        <p key={`p-${blocks.length}`} className="text-sm text-slate-800 leading-relaxed">
          {renderInlineBold(trimmed)}
        </p>
      );
    });

    flushList();

    return <div className="space-y-2">{blocks}</div>;
  };

  const buildModalCopyText = (doc: typeof selectedDocument) => {
    if (!doc) return '';
    const lines: string[] = [];
    const title = doc.title || 'Document';
    const type = doc.documentAnalysis?.category || doc.type || 'Document';
    const date = new Date(doc.uploadedAt).toLocaleString('en-US');

    lines.push(`# ${title}`);
    lines.push(`Type: ${type}`);
    lines.push(`Uploaded: ${date}`);
    lines.push('');

    const summary = doc.documentAnalysis?.summary || doc.context;
    if (summary) {
      lines.push('## Summary');
      lines.push(summary);
      lines.push('');
    }

    if (doc.documentAnalysis?.keyPoints?.length) {
      lines.push('## Key Points');
      doc.documentAnalysis.keyPoints.forEach((point) => {
        lines.push(`- ${point}`);
      });
      lines.push('');
    }

    if (doc.analysis) {
      lines.push('## RFP Analysis');
      lines.push('### Project Structure');
      lines.push(doc.analysis.projectStructure || '');
      lines.push('');
      lines.push('### Detailed Analysis');
      lines.push(doc.analysis.detailedAnalysis || '');
      lines.push('');
      lines.push('### Requirements');
      lines.push(doc.analysis.requirements || '');
      lines.push('');
      lines.push('### Timeline');
      lines.push(doc.analysis.timeline || '');
      lines.push('');
      lines.push('### Budget');
      lines.push(doc.analysis.budget || '');
      lines.push('');
      lines.push('### Stakeholders');
      lines.push(doc.analysis.stakeholders || '');
      lines.push('');
      lines.push('### Success Criteria');
      lines.push(doc.analysis.successCriteria || '');
      lines.push('');
      lines.push('### Risks');
      lines.push(doc.analysis.risks || '');
      lines.push('');
      lines.push('### Constraints');
      lines.push(doc.analysis.constraints || '');
      lines.push('');
      lines.push('### AI Recommendations');
      lines.push(doc.analysis.aiRecommendations || '');
      lines.push('');
      lines.push('### AI Capabilities');
      lines.push(doc.analysis.aiCapabilities || '');
      lines.push('');
      if (doc.analysis.clarificationNeeded) {
        lines.push('### Clarification Needed');
        lines.push(doc.analysis.clarificationNeeded);
        lines.push('');
      }
    }

    if (doc.fullText) {
      lines.push('## Full Document Text');
      lines.push(doc.fullText);
      lines.push('');
    }

    return lines.join('\n');
  };

  const handleCopyModalContent = async () => {
    if (!selectedDocument) return;
    const text = buildModalCopyText(selectedDocument);
    try {
      await navigator.clipboard.writeText(text);
    } catch (error) {
      console.error('Failed to copy content:', error);
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.left = '-9999px';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
    }
  };
  const [activeTab, setActiveTab] = useState<'info' | 'domains' | 'documents' | 'meetings' | 'collaboration'>(initialActiveTab || 'info');
  const [selectedDomains, setSelectedDomains] = useState<Set<string>>(new Set(initialSelectedDomains));
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [isLoadingMeetings, setIsLoadingMeetings] = useState(false);
  const [isAnalyzingDocument, setIsAnalyzingDocument] = useState(false);
  const [documents, setDocuments] = useState<Array<{ id: string; title: string; type: string; context: string; fullText: string; uploadedAt: number; fileName?: string; content?: string; url?: string; path?: string; documentAnalysis?: import('../types').DocumentAnalysis; analysis?: import('../types').RfpAnalysis }>>([]);
  const [selectedDocument, setSelectedDocument] = useState<{ id: string; title: string; type: string; context: string; fullText: string; uploadedAt: number; fileName?: string; content?: string; url?: string; path?: string; documentAnalysis?: import('../types').DocumentAnalysis; analysis?: import('../types').RfpAnalysis } | null>(null);
  const [isGeneratingPresentation, setIsGeneratingPresentation] = useState(false);
  const [presentationUrl, setPresentationUrl] = useState<string | null>(null);
  const [showPromptModal, setShowPromptModal] = useState(false);
  const [presentationPrompt, setPresentationPrompt] = useState('');
  const [presentations, setPresentations] = useState<Array<{
    generationId: string;
    status: string;
    createdAt: number;
    downloadUrl?: string;
    publicUrl?: string;
    devUrl?: string;
    companyName?: string;
    phase?: string;
  }>>([]);
  const [presentationPhase, setPresentationPhase] = useState<'phase1' | 'phase2' | ''>('');
  const [phase1Workflows, setPhase1Workflows] = useState<string[]>([]);
  const [phase2Workflows, setPhase2Workflows] = useState<string[]>([]);
  const isHydratingPhaseWorkflows = useRef(false);
  const [showUrlModal, setShowUrlModal] = useState(false);
  const [currentGenerationId, setCurrentGenerationId] = useState<string | null>(null);
  const [urlModalPublicUrl, setUrlModalPublicUrl] = useState('');
  const [urlModalDevUrl, setUrlModalDevUrl] = useState('');
  const [collaborationConfig, setCollaborationConfig] = useState<JourneyCollaborationConfig | undefined>(undefined);
  const [isSavingCollaborationConfig, setIsSavingCollaborationConfig] = useState(false);
  const [collaborationConfigStatus, setCollaborationConfigStatus] = useState<string | null>(null);
  
  // Initialize phase workflows from company data when available
  useEffect(() => {
    if (companyInfo) {
      // Type assertion to access the new fields
      const company = companyInfo as any;
      const nextPhase1 = Array.isArray(company.phase1Workflows) ? company.phase1Workflows : [];
      const nextPhase2 = Array.isArray(company.phase2Workflows) ? company.phase2Workflows : [];
      const phase1Changed = nextPhase1.join('|') !== phase1Workflows.join('|');
      const phase2Changed = nextPhase2.join('|') !== phase2Workflows.join('|');
      if (phase1Changed || phase2Changed) {
        isHydratingPhaseWorkflows.current = true;
        setPhase1Workflows(nextPhase1);
        setPhase2Workflows(nextPhase2);
      }
    }
  }, [companyInfo, phase1Workflows, phase2Workflows]);
  
  // Delete presentation handler
  const handleDeletePresentation = async (generationId: string) => {
    if (!window.confirm('Are you sure you want to delete this presentation? This action cannot be undone.')) {
      return;
    }
    
    try {
      const presentationRef = ref(db, `presentations/${generationId}`);
      await remove(presentationRef);
      console.log('Presentation deleted:', generationId);
    } catch (error) {
      console.error('Failed to delete presentation:', error);
      alert('Failed to delete presentation. Please try again.');
    }
  };
  
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
  
  // Real-time save phase workflow selections to Firebase when they change
  useEffect(() => {
    const savePhaseWorkflowsToFirebase = async () => {
      if (isHydratingPhaseWorkflows.current) {
        isHydratingPhaseWorkflows.current = false;
        return;
      }
      if (companyId && userId && (phase1Workflows.length > 0 || phase2Workflows.length > 0)) {
        try {
          await updateCompanyPhaseWorkflows(companyId, userId, phase1Workflows, phase2Workflows);
          console.log('Phase workflows saved to Firebase:', { phase1Workflows, phase2Workflows });
        } catch (error) {
          console.error('Failed to save phase workflows to Firebase:', error);
        }
      }
    };
    
    savePhaseWorkflowsToFirebase();
  }, [phase1Workflows, phase2Workflows, companyId, userId]);
  
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
  
  // Load presentations
  useEffect(() => {
    if (companyId) {
      const presentationsRef = ref(db, 'presentations');
      
      const presentationsQuery = query(
        presentationsRef,
        orderByChild('companyId'),
        equalTo(companyId)
      );
      
      const unsubscribe = onValue(presentationsQuery, (snapshot) => {
        const data = snapshot.val();
        if (data) {
          const presentationsList = Object.entries(data).map(([id, value]: [string, any]) => ({
            generationId: id,
            status: value.status,
            createdAt: value.createdAt,
            downloadUrl: value.downloadUrl,
            publicUrl: value.publicUrl,
            devUrl: value.devUrl,
            companyName: value.companyName,
            phase: value.phase,
          }));
          // Sort by most recent first
          presentationsList.sort((a, b) => b.createdAt - a.createdAt);
          setPresentations(presentationsList);
        } else {
          setPresentations([]);
        }
      });
      
      return () => unsubscribe();
    }
  }, [companyId]);
  
  // Load documents
  useEffect(() => {
    if (companyId) {
      (async () => {
        try {
          const fetchedDocuments = await getDocuments(companyId);
          const normalizedDocuments = fetchedDocuments.map((doc) => {
            const fallbackTitle = doc.fileName ? doc.fileName.replace(/\.[^/.]+$/, '') : 'Document';
            const normalizedContext = doc.context || doc.documentAnalysis?.summary || doc.content?.substring(0, 500) || '';
            return {
              ...doc,
              title: doc.title || doc.documentAnalysis?.title || fallbackTitle,
              type: doc.type || doc.documentAnalysis?.category || 'Document',
              context: normalizedContext,
              fullText: doc.fullText || doc.content || ''
            };
          });
          setDocuments(normalizedDocuments);
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
      console.log('Calling Gemini for document analysis...');
      const documentAnalysis = await analyzeDocumentCategory(text, file.name);
      let rfpAnalysis: import('../types').RfpAnalysis | undefined;
      if (documentAnalysis.category === 'RFP' || documentAnalysis.category === 'SOW') {
        console.log('Calling Gemini for RFP analysis...');
        rfpAnalysis = await analyzeRfpDocument(text);
      }
      
      console.log('Document analysis result:', documentAnalysis);
      
      // Create document with analysis results and full text
      const newDocument = {
        id: Date.now().toString(),
        title: documentAnalysis.title || file.name.replace(/\.[^/.]+$/, ''),
        type: documentAnalysis.category || 'General',
        context: documentAnalysis.summary || text.substring(0, 500),
        fullText: text,
        uploadedAt: Date.now(),
        documentAnalysis,
        ...(rfpAnalysis ? { analysis: rfpAnalysis } : {})
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
  
  // Generate presentation prompt based on completed workflows and domains
  const handleGeneratePresentation = async () => {
    if (!companyInfo || !userId) return;
    
    // Validate phase selection
    if (!presentationPhase) {
      alert('Please select a report type (Phase 1 or Phase 2)');
      return;
    }
    
    // Validate workflow selection for the chosen phase
    const selectedWorkflowIds = presentationPhase === 'phase1' ? phase1Workflows : phase2Workflows;
    if (selectedWorkflowIds.length === 0) {
      alert(`Please select at least one workflow for ${presentationPhase === 'phase1' ? 'Phase 1' : 'Phase 2'} by checking the boxes on the workflow cards`);
      return;
    }
    
    try {
      setIsGeneratingPresentation(true);
      setPresentationUrl(null);
      
      console.log('Starting presentation generation...');
      
      // Determine which workflows to include based on selected phase
      const selectedWorkflowIds = presentationPhase === 'phase1' ? phase1Workflows : phase2Workflows;
      
      console.log(`Including ${selectedWorkflowIds.length} workflows for ${presentationPhase}:`, selectedWorkflowIds);
      
      // Gather data about completed workflows, filtered by phase selection
      const completedWorkflows = Object.entries(scenarioRuns)
        .filter(([scenarioId, runs]) => runs.length > 0 && selectedWorkflowIds.includes(scenarioId))
        .map(([scenarioId, runs]) => {
          const scenario = scenariosById?.[scenarioId];
          // Get the latest run's demo URL
          const latestRun = runs[0];
          return {
            title: scenario?.title || 'Unknown Workflow',
            domain: scenario?.domain || 'General',
            description: scenario?.description || '',
            completedCount: runs.length,
            latestScore: runs[0]?.score || 0,
            demoUrl: latestRun?.demoPublishedUrl || ''
          };
        });
      
      // Get selected domains or all domains with completed workflows
      const targetDomains = selectedDomains.size > 0 
        ? Array.from(selectedDomains)
        : Array.from(new Set(completedWorkflows.map(w => w.domain)));
      
      // Group workflows by domain
      const workflowsByDomain: Record<string, typeof completedWorkflows> = {};
      completedWorkflows.forEach(workflow => {
        if (!workflowsByDomain[workflow.domain]) {
          workflowsByDomain[workflow.domain] = [];
        }
        workflowsByDomain[workflow.domain].push(workflow);
      });
      
      // Build domain slides with tables
      const domainSlides = targetDomains.map(domain => {
        const domainWorkflows = workflowsByDomain[domain] || [];
        
        return `
## ${domain}

| Priority | Core Process | Potential Agentic AI Use Cases | Detailed Use Case Description | Demo Link |
|----------|--------------|--------------------------------|-------------------------------|--------------------|
${domainWorkflows.map((workflow, idx) => 
  `| ${idx + 1} | ${workflow.title} | ${workflow.description.substring(0, 100)}... | Completed ${workflow.completedCount} time${workflow.completedCount !== 1 ? 's' : ''} with ${workflow.latestScore}% success rate | ${workflow.demoUrl ? `[Open demo](${workflow.demoUrl})` : 'Not published'} |`
).join('\n')}

### Value
${domain} workflows offer high value potential through faster resolution, reduced manual work, and improved efficiency. The solutions enable ${domainWorkflows.length} process${domainWorkflows.length !== 1 ? 'es' : ''} that can benefit from AI automation.

### Feasibility
Feasibility is ${domainWorkflows.length > 0 ? 'strong' : 'moderate'}, supported by proven workflows and repeatable patterns. Solutions can be implemented incrementally with existing infrastructure.

### Readiness
Readiness is ${domainWorkflows.length > 2 ? 'high' : 'moderate'}, with demonstrated capability through completed implementations. Team has experience with ${domainWorkflows.reduce((sum, w) => sum + w.completedCount, 0)} total workflow executions.
        `.trim();
      }).join('\n\n---\n\n');
      
      // Build presentation content based on selected phase
      const presentationText = presentationPhase === 'phase1' ? `
# Phase 1: Art of the Possible - Target Domains
## AI Automation Opportunity Assessment for ${companyInfo.name}

---

## Executive Summary

This presentation showcases AI automation opportunities and workflow implementations for ${companyInfo.name}.

**Company Overview:**
- Industry: ${companyInfo.currentResearch?.industry || 'Not specified'}
- Market Position: ${companyInfo.currentResearch?.marketPosition || 'Not specified'}
- AI Relevance: ${companyInfo.currentResearch?.aiRelevance?.current || 'Pending'}

---

## Target Business Domains

We've identified and analyzed ${targetDomains.length} key business domains for AI automation:

${targetDomains.map(domain => `- **${domain}**`).join('\n')}

These domains represent areas where AI workflow automation can deliver significant value and efficiency gains.

---

${domainSlides}

---

## Domain Stack Ranking

Strategic prioritization of business domains for AI automation initiatives based on automation potential, business impact, and implementation readiness.

| Rank | Domain | FTE Opportunity | Justification for Ranking |
|------|--------|-----------------|---------------------------|
${targetDomains.map((domain, idx) => {
  const domainWorkflows = workflowsByDomain[domain] || [];
  const totalExecutions = domainWorkflows.reduce((sum, w) => sum + w.completedCount, 0);
  const avgScore = domainWorkflows.length > 0 
    ? Math.round(domainWorkflows.reduce((sum, w) => sum + w.latestScore, 0) / domainWorkflows.length)
    : 0;
  
  const justification = [
    `${domain} represents ${domainWorkflows.length} automated workflow${domainWorkflows.length !== 1 ? 's' : ''} with proven implementation`,
    `Average success rate of ${avgScore}% across ${totalExecutions} execution${totalExecutions !== 1 ? 's' : ''}`,
    `${domainWorkflows.filter(w => w.demoUrl).length > 0 ? 'Live demos available showing production-ready solutions' : 'Strong potential for measurable efficiency gains'}`
  ].join(' • ');
  
  return `| ${idx + 1} | ${domain} | ${domainWorkflows.length * 0.25} - ${domainWorkflows.length * 0.5} | ${justification} |`;
}).join('\n')}

### Key Insights
- Domains ranked by combination of workflow maturity, execution success, and automation potential
- FTE estimates based on workflow complexity and automation coverage
- Higher-ranked domains show stronger near-term ROI and lower implementation risk

---

## Implementation Roadmap

### Phase 1: Quick Wins (0-3 months)
Focus on top-ranked domain with existing proven workflows and high success rates for immediate value demonstration.

### Phase 2: Scale & Optimize (3-6 months)
Expand to secondary domains, refine workflows based on Phase 1 learnings, and establish standardized processes.

### Phase 3: Enterprise Deployment (6-12 months)
Full deployment across remaining domains with comprehensive training, monitoring, and continuous improvement framework.

---

## Implementation Summary

**Total Workflows Analyzed:** ${completedWorkflows.length}
**Domains Covered:** ${targetDomains.length}
**Total Executions:** ${completedWorkflows.reduce((sum, w) => sum + w.completedCount, 0)}

${companyInfo.currentResearch?.aiRelevance?.recommendations?.length ? `
### Key Recommendations
${companyInfo.currentResearch.aiRelevance.recommendations.map(rec => `- ${rec}`).join('\n')}
` : ''}

---

## Next Steps

1. Prioritize domains based on value, feasibility, and readiness scores
2. Begin pilot implementations with highest-scoring workflows
3. Establish success metrics and monitoring framework
4. Plan phased rollout across remaining domains
5. Schedule regular reviews and optimization cycles

---

## Next Steps & Contact

For more information about AI automation solutions and implementation support, please contact your account team.

**Company:** ${companyInfo.name}
**Date:** ${new Date().toLocaleDateString()}
**Phase:** 1 - Art of the Possible
      `.trim() : `
# Phase 2: Deep Dive Analysis
## AI Automation Implementation for ${companyInfo.name}

---

## Executive Summary

This deep dive presentation provides detailed analysis of selected AI automation workflows, including technical requirements, implementation approach, ROI projections, and success metrics.

**Focus Areas:**
- Technical feasibility and architecture
- Implementation methodology
- ROI analysis and business case
- Risk mitigation strategies
- Detailed implementation roadmap

---

## Company Context

${companyInfo.currentResearch?.description || 'Leading organization ready for AI transformation'}

**Industry:** ${companyInfo.currentResearch?.industry || 'Not specified'}
**Market Position:** ${companyInfo.currentResearch?.marketPosition || 'Not specified'}

---

## Selected Workflows for Analysis

${availableDomains.map((domain) => {
  const domainWorkflows = allScenarios.filter(s => getScenarioDomain(s) === domain && s.type === 'TRAINING');
  const workflowsWithRuns = domainWorkflows.filter(w => scenarioRuns[w.id]?.length > 0);
  
  if (workflowsWithRuns.length === 0) return '';
  
  return `### ${domain} Deep Dive\n${workflowsWithRuns.slice(0, 3).map((w, idx) => {
    const runs = scenarioRuns[w.id] || [];
    const avgScore = runs.length > 0
      ? (runs.reduce((sum, r) => sum + (r.score || 0), 0) / runs.length).toFixed(1)
      : 'N/A';
    return `**${idx + 1}. ${w.title}**\n- Description: ${w.description || 'Workflow analysis'}\n- Average Score: ${avgScore}/100\n- Evaluation Count: ${runs.length}`;
  }).join('\\n\\n')}`;
}).filter(Boolean).join('\\n\\n---\\n\\n')}

---

## Domain Analysis Summary

${availableDomains.map((domain) => {
  const domainWorkflows = allScenarios.filter(s => getScenarioDomain(s) === domain && s.type === 'TRAINING');
  return `### ${domain}\n- Total Workflows: ${domainWorkflows.length}\n- Completed Runs: ${domainWorkflows.reduce((sum, w) => sum + (scenarioRuns[w.id]?.length || 0), 0)}\n- Readiness: ${domainWorkflows.length > 2 ? 'High' : 'Moderate'}`;
}).join('\\n\\n')}

---

## Technical Architecture

### Enterprise AI Platform
- **AI/ML Framework:** Production-grade automation engine
- **Integration Layer:** RESTful API architecture
- **Data Pipeline:** Real-time processing and analytics
- **Security:** Enterprise-grade security and compliance
- **Scalability:** Cloud-native, horizontally scalable

### Technology Components
- Natural Language Processing (NLP)
- Machine Learning Models
- Process Automation Engine
- Business Intelligence Dashboard
- Integration Middleware

---

## Implementation Methodology

### Agile Delivery Approach

**Sprint 1-2 (Weeks 1-4): Foundation**
- Environment setup and configuration
- Integration development
- Initial testing framework

**Sprint 3-4 (Weeks 5-8): Pilot**
- First workflow deployment
- User acceptance testing
- Performance monitoring

**Sprint 5-6 (Weeks 9-12): Scale**
- Additional workflow rollout
- Cross-domain integration
- User training completion

---

## ROI & Business Case

### Expected Benefits (Year 1)
- **Efficiency:** 45-65% reduction in manual processing time
- **Quality:** 35-50% error rate reduction
- **Cost:** 30-45% operational cost savings
- **Capacity:** 4-6x throughput increase without additional headcount

### Investment Summary
- **Platform & Licensing:** Initial setup and annual subscription
- **Implementation:** Integration, development, and deployment
- **Change Management:** Training and adoption program
- **Support:** Ongoing maintenance and optimization

### Payback Period
Expected ROI positive within 8-14 months

---

## Success Metrics & KPIs

### Operational Metrics
- Average processing time per workflow
- Transaction accuracy and error rates
- System uptime and availability
- User satisfaction scores

### Business Metrics
- Cost per transaction
- Throughput volume
- Resource utilization
- Compliance adherence

### Monitoring Dashboard
Real-time visibility into all key metrics with automated alerting

---

## Risk Assessment & Mitigation

### Technical Risks
**Risk:** Integration complexity with legacy systems
**Mitigation:** Phased integration approach, dedicated technical resources

**Risk:** Data quality and availability
**Mitigation:** Data governance framework, cleansing procedures

### Organizational Risks
**Risk:** User adoption and change resistance
**Mitigation:** Comprehensive training program, change champions

**Risk:** Stakeholder alignment
**Mitigation:** Regular communication, executive sponsorship

---

## Implementation Timeline

### 90-Day Detailed Roadmap

**Phase 1: Setup (Days 1-30)**
\u2713 Technical architecture finalization
\u2713 Environment provisioning
\u2713 Integration development begins
\u2713 Team onboarding complete

**Phase 2: Pilot (Days 31-60)**
\u2713 First workflow deployed to test environment
\u2713 UAT completion
\u2713 Performance baseline established
\u2192 Pilot launch

**Phase 3: Production (Days 61-90)**
\u2192 Production deployment
\u2192 Monitoring and optimization
\u2192 Additional workflow rollout
\u2192 Success metrics tracking

---

## Resource Plan

### Core Project Team
- **Project Manager:** Overall coordination and delivery
- **Technical Lead:** Architecture and technical decisions
- **Developers (2-3):** Integration and customization
- **Business Analyst:** Requirements and testing
- **Change Manager:** Training and adoption

### Business Stakeholders
- Executive Sponsor
- Domain Subject Matter Experts
- End User Representatives
- IT Operations Team

---

## Governance & Support

### Project Governance
- Weekly status meetings
- Bi-weekly steering committee updates
- Risk and issue escalation process
- Change control procedures

### Post-Implementation Support
- Level 1-3 support structure
- Knowledge base and documentation
- Continuous improvement process
- Quarterly business reviews

---

## Next Steps - Action Plan

1. **Executive Approval:** Secure budget and resource commitment
2. **Team Assembly:** Assign project team members
3. **Vendor Selection:** Finalize platform and partners (if needed)
4. **Kickoff:** Project initiation within 2 weeks
5. **Quick Wins:** Identify early value opportunities

### Immediate Actions (This Week)
- Approve project scope and budget
- Assign executive sponsor
- Schedule project kickoff
- Begin resource allocation

---

## Contact & Follow-Up

Ready to transform your operations with AI automation. Let's discuss the implementation details and timeline.

**Company:** ${companyInfo.name}
**Date:** ${new Date().toLocaleDateString()}
**Phase:** 2 - Deep Dive Analysis
      `.trim();
      
      console.log('Presentation text generated, length:', presentationText.length);
      setPresentationPrompt(presentationText);
      setShowPromptModal(true);
      
    } catch (error) {
      console.error('Failed to generate presentation:', error);
      alert(`Failed to generate presentation prompt: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsGeneratingPresentation(false);
    }
  };
  
  // Handle saving URLs from modal
  const handleSaveUrls = async () => {
    if (!currentGenerationId) return;
    
    try {
      if (urlModalPublicUrl) {
        await set(ref(db, `presentations/${currentGenerationId}/publicUrl`), urlModalPublicUrl);
      }
      if (urlModalDevUrl) {
        await set(ref(db, `presentations/${currentGenerationId}/devUrl`), urlModalDevUrl);
      }
      
      // Open the public URL if provided
      if (urlModalPublicUrl) {
        window.open(urlModalPublicUrl, '_blank');
      }
      
      // Reset and close modal
      setShowUrlModal(false);
      setUrlModalPublicUrl('');
      setUrlModalDevUrl('');
      setCurrentGenerationId(null);
      
      alert('URLs saved successfully!');
    } catch (error) {
      console.error('Failed to save URLs:', error);
      alert('Failed to save URLs. Please try again.');
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
  const getScenarioDomain = (scenario: Scenario) => scenario.domain || 'General';
  const availableDomains = Array.from(
    new Set(
      allScenarios
        .filter((scenario) => scenario.type === 'TRAINING')
        .map((scenario) => getScenarioDomain(scenario))
    )
  );
  
  // Filter scenario entries by selected domains
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

  const handleTabChange = (tab: 'info' | 'domains' | 'documents' | 'meetings' | 'collaboration') => {
    setActiveTab(tab);
    onActiveTabChange?.(tab);
  };

  useEffect(() => {
    if (initialActiveTab) {
      setActiveTab(initialActiveTab);
    }
  }, [initialActiveTab]);

  useEffect(() => {
    const company = companyInfo as any;
    const currentJourney = company?.currentJourneyId ? company?.journeys?.[company.currentJourneyId] : undefined;
    const existingConfig = currentJourney?.collaborationConfig || company?.journey?.collaborationConfig;
    setCollaborationConfig(existingConfig);
  }, [companyInfo]);

  const handleSaveCollaborationConfig = async (config: JourneyCollaborationConfig) => {
    if (!companyId || !userId || isSavingCollaborationConfig) return;

    setIsSavingCollaborationConfig(true);
    setCollaborationConfigStatus(null);

    try {
      await updateCompanyJourneyStatus(
        companyId,
        userId,
        {
          collaborationConfig: config,
          collaborationConfigComplete: true,
        }
      );

      setCollaborationConfig(config);
      setCollaborationConfigStatus('Collaboration configuration saved.');
    } catch (error) {
      console.error('Failed to save collaboration configuration:', error);
      setCollaborationConfigStatus('Failed to save collaboration configuration. Please try again.');
    } finally {
      setIsSavingCollaborationConfig(false);
    }
  };

  return (
    <>
      <div className="bg-wm-white border border-wm-neutral rounded-xl">
        {/* Tabs */}
        {showTabs && (
          <div className="flex border-b border-wm-neutral/30">
            <button
              onClick={() => handleTabChange('info')}
              className={`flex-1 px-6 py-4 font-bold transition-all ${
                activeTab === 'info'
                  ? 'text-wm-accent border-b-2 border-wm-accent bg-wm-accent/5'
                  : 'text-wm-blue/60 hover:text-wm-blue hover:bg-wm-neutral/10'
              }`}
            >
              Company Information
            </button>
            <button
              onClick={() => handleTabChange('domains')}
              className={`flex-1 px-6 py-4 font-bold transition-all ${
                activeTab === 'domains'
                  ? 'text-wm-accent border-b-2 border-wm-accent bg-wm-accent/5'
                  : 'text-wm-blue/60 hover:text-wm-blue hover:bg-wm-neutral/10'
              }`}
            >
              Target Domains
            </button>
            <button
              onClick={() => handleTabChange('documents')}
              className={`flex-1 px-6 py-4 font-bold transition-all ${
                activeTab === 'documents'
                  ? 'text-wm-accent border-b-2 border-wm-accent bg-wm-accent/5'
                  : 'text-wm-blue/60 hover:text-wm-blue hover:bg-wm-neutral/10'
              }`}
            >
              Documents
            </button>
            <button
              onClick={() => handleTabChange('meetings')}
              className={`flex-1 px-6 py-4 font-bold transition-all ${
                activeTab === 'meetings'
                  ? 'text-wm-accent border-b-2 border-wm-accent bg-wm-accent/5'
                  : 'text-wm-blue/60 hover:text-wm-blue hover:bg-wm-neutral/10'
              }`}
            >
              Meetings
            </button>
            <button
              onClick={() => handleTabChange('collaboration')}
              className={`flex-1 px-6 py-4 font-bold transition-all ${
                activeTab === 'collaboration'
                  ? 'text-wm-accent border-b-2 border-wm-accent bg-wm-accent/5'
                  : 'text-wm-blue/60 hover:text-wm-blue hover:bg-wm-neutral/10'
              }`}
            >
              Collaboration
            </button>
          </div>
        )}
      
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

        <div className="border-t border-wm-neutral pt-6">
          <h3 className="text-wm-blue font-bold mb-4">Collaboration Sources</h3>
          <CollaborationConfiguration
            config={collaborationConfig}
            isLoading={isSavingCollaborationConfig}
            onSave={handleSaveCollaborationConfig}
          />
          {collaborationConfigStatus && (
            <p className="mt-2 text-xs text-wm-blue/70">{collaborationConfigStatus}</p>
          )}
        </div>
          </div>
        )}

        {/* Target Domains Tab */}
        {activeTab === 'domains' && (
          <div>
            {(() => {
              const visibleWorkflows = selectedDomains.size > 0
                ? allScenarios.filter(
                    (scenario) => scenario.type === 'TRAINING' && scenario.domain && selectedDomains.has(scenario.domain)
                  )
                : [];
              const visibleWorkflowIds = visibleWorkflows.map((workflow) => workflow.id);
              const hasVisible = visibleWorkflowIds.length > 0;

              return (
                <div className="mb-6 bg-white border border-wm-neutral/30 rounded-xl p-4 shadow-sm">
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div>
                      <h3 className="text-sm font-bold text-wm-blue">Phase Workflow Selection</h3>
                      <p className="text-xs text-wm-blue/60 mt-1">
                        Step 1: Choose target domains. Step 2: Use the Phase 1 / Phase 2 checkboxes on each workflow card below.
                      </p>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-wm-blue/60">
                      <span className="px-2 py-1 rounded-full bg-wm-pink/10 text-wm-pink font-semibold border border-wm-pink/20">
                        Phase 1: {phase1Workflows.length}
                      </span>
                      <span className="px-2 py-1 rounded-full bg-wm-accent/10 text-wm-accent font-semibold border border-wm-accent/20">
                        Phase 2: {phase2Workflows.length}
                      </span>
                    </div>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={!hasVisible}
                      onClick={() => {
                        setPhase1Workflows((prev) => Array.from(new Set([...prev, ...visibleWorkflowIds])));
                      }}
                      className="px-3 py-2 text-xs font-bold rounded-lg bg-wm-pink/10 text-wm-pink border border-wm-pink/20 hover:bg-wm-pink/20 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Add visible to Phase 1
                    </button>
                    <button
                      type="button"
                      disabled={!hasVisible}
                      onClick={() => {
                        setPhase2Workflows((prev) => Array.from(new Set([...prev, ...visibleWorkflowIds])));
                      }}
                      className="px-3 py-2 text-xs font-bold rounded-lg bg-wm-accent/10 text-wm-accent border border-wm-accent/20 hover:bg-wm-accent/20 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Add visible to Phase 2
                    </button>
                    <button
                      type="button"
                      disabled={!hasVisible}
                      onClick={() => {
                        setPhase1Workflows((prev) => prev.filter((id) => !visibleWorkflowIds.includes(id)));
                        setPhase2Workflows((prev) => prev.filter((id) => !visibleWorkflowIds.includes(id)));
                      }}
                      className="px-3 py-2 text-xs font-bold rounded-lg bg-wm-neutral/10 text-wm-blue/70 border border-wm-neutral/20 hover:bg-wm-neutral/20 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Clear visible selections
                    </button>
                  </div>
                </div>
              );
            })()}

            {/* Target Domain Pills */}
            <div className="mb-6">
              <h3 className="text-sm font-bold text-wm-blue mb-3">Target Domains:</h3>
              <div className="flex flex-wrap gap-2">
                {availableDomains.map((domain) => {
                  const isSelected = selectedDomains.has(domain);
                  const workflowCount = allScenarios.filter(s => getScenarioDomain(s) === domain && s.type === 'TRAINING').length;
                  
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

            <div className="flex gap-6">
              {/* Workflows for Selected Domains */}
              <div className="flex-1 min-w-0">
                {selectedDomains.size > 0 && (
                  <div className="space-y-6">
                  {Array.from(selectedDomains).map((domain) => {
                    const userKey = userId ?? '';
                    const domainWorkflows = allScenarios.filter(
                      (scenario) => getScenarioDomain(scenario) === domain && scenario.type === 'TRAINING'
                    );
                    
                    if (domainWorkflows.length === 0) return null;
                    
                    // Sort workflows: 1) Selected scenarios, 2) Has runs, 3) Starred, 4) The rest
                    const sortedWorkflows = [...domainWorkflows].sort((a, b) => {
                      const aSelected = selectedScenarios?.includes(a.id);
                      const bSelected = selectedScenarios?.includes(b.id);
                      const aHasRuns = scenarioRuns[a.id]?.length > 0;
                      const bHasRuns = scenarioRuns[b.id]?.length > 0;
                      const aStarred = userKey ? !!a.favoritedBy?.[userKey] : false;
                      const bStarred = userKey ? !!b.favoritedBy?.[userKey] : false;
                      
                      // 1. Prioritize selected scenarios (including newly created)
                      if (aSelected && !bSelected) return -1;
                      if (!aSelected && bSelected) return 1;
                      
                      // 2. Prioritize workflows the user has run
                      if (aHasRuns && !bHasRuns) return -1;
                      if (!aHasRuns && bHasRuns) return 1;
                      
                      // 3. Then prioritize starred workflows
                      if (aStarred && !bStarred) return -1;
                      if (!aStarred && bStarred) return 1;
                      
                      // 4. Rest stay in their order
                      return 0;
                    });
                    
                    return (
                      <div key={domain} className="border border-wm-neutral/30 rounded-lg p-4 bg-white">
                        <div className="flex items-center gap-2 mb-4">
                          <h3 className="text-lg font-bold text-wm-blue">{domain} Workflows</h3>
                          <button
                            onClick={() => onCreateScenario?.({
                              companyId: companyId,
                              companyName: companyInfo?.name,
                              domain: domain
                            })}
                            className="p-1 bg-wm-accent text-white rounded-lg hover:bg-wm-accent/90 transition-colors"
                            title={`Create new workflow for ${domain}`}
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                          </button>
                        </div>
                        <div className="flex gap-3 overflow-x-auto pb-2" style={{ scrollbarWidth: 'thin' }}>
                          {sortedWorkflows.map((workflow) => {
                            const hasRuns = scenarioRuns[workflow.id]?.length > 0;
                            const isSelected = selectedScenarios?.includes(workflow.id);
                            const shouldHighlight = hasRuns || isSelected;
                            console.log(`Workflow ${workflow.id} (${workflow.title}):`, {
                              hasRuns,
                              isSelected,
                              shouldHighlight,
                              runsCount: scenarioRuns[workflow.id]?.length || 0,
                              runs: scenarioRuns[workflow.id]
                            });
                            
                            return (
                              <div
                                key={workflow.id}
                                role="button"
                                tabIndex={0}
                                onClick={() => onSelectScenario?.(workflow.id)}
                                onKeyDown={(event) => {
                                  if (event.key === 'Enter' || event.key === ' ') {
                                    event.preventDefault();
                                    onSelectScenario?.(workflow.id);
                                  }
                                }}
                                className={`flex-shrink-0 w-80 text-left p-3 border rounded-lg hover:shadow-md transition-all ${
                                  shouldHighlight
                                    ? 'border-wm-accent bg-wm-accent/10 hover:bg-wm-accent/20 ring-2 ring-wm-accent/30'
                                    : 'border-wm-neutral/30 bg-wm-neutral/5 hover:bg-wm-accent/5 hover:border-wm-accent'
                                }`}
                              >
                              {/* Phase Selection Checkboxes */}
                              <div className="flex items-center gap-3 mb-2 pb-2 border-b border-wm-neutral/20">
                                <label 
                                  className="flex items-center gap-1.5 text-xs font-medium cursor-pointer hover:text-wm-pink"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <input
                                    type="checkbox"
                                    checked={phase1Workflows.includes(workflow.id)}
                                    onChange={(e) => {
                                      e.stopPropagation();
                                      const newPhase1 = e.target.checked
                                        ? [...phase1Workflows, workflow.id]
                                        : phase1Workflows.filter(id => id !== workflow.id);
                                      setPhase1Workflows(newPhase1);
                                    }}
                                    className="rounded border-wm-neutral/30 text-wm-pink focus:ring-wm-pink"
                                  />
                                  <span>Phase 1</span>
                                </label>
                                <label 
                                  className="flex items-center gap-1.5 text-xs font-medium cursor-pointer hover:text-wm-accent"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <input
                                    type="checkbox"
                                    checked={phase2Workflows.includes(workflow.id)}
                                    onChange={(e) => {
                                      e.stopPropagation();
                                      const newPhase2 = e.target.checked
                                        ? [...phase2Workflows, workflow.id]
                                        : phase2Workflows.filter(id => id !== workflow.id);
                                      setPhase2Workflows(newPhase2);
                                    }}
                                    className="rounded border-wm-neutral/30 text-wm-accent focus:ring-wm-accent"
                                  />
                                  <span>Phase 2</span>
                                </label>
                              </div>
                              <div className="flex items-center justify-between mb-1">
                                <div className="font-bold text-wm-blue text-sm flex-1">
                                  {workflow.title}
                                </div>
                                <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                                  {userKey && workflow.favoritedBy?.[userKey] && (
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
                                  {scenarioRuns[workflow.id].slice(0, 2).map((evaluation) => (
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
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                  </div>
                )}
              </div>
              
              {/* Presentation Generator - Right Sidebar */}
              <div className="w-96 flex-shrink-0">
                <div className="sticky top-6 border border-wm-neutral/30 rounded-lg p-4 bg-gradient-to-br from-wm-pink/5 to-wm-accent/5">
                  <h3 className="text-lg font-bold text-wm-blue mb-4">Presentation Generator</h3>
                  
                  <div className="mb-4">
                    <label className="block text-sm font-bold text-wm-blue mb-2">
                      Report Type:
                    </label>
                    <select
                      value={presentationPhase}
                      onChange={(e) => setPresentationPhase(e.target.value as 'phase1' | 'phase2' | '')}
                      className="w-full px-3 py-2 border border-wm-neutral/30 rounded-lg bg-white text-wm-blue focus:outline-none focus:ring-2 focus:ring-wm-accent"
                    >
                      <option value="">-- Select Report Type --</option>
                      <option value="phase1">Phase 1 - Art of the Possible (Target Domains)</option>
                      <option value="phase2">Phase 2 - Deep Dive</option>
                    </select>
                  </div>
                  
                  <button
                  onClick={handleGeneratePresentation}
                  disabled={isGeneratingPresentation || !presentationPhase}
                  className="w-full mb-4 px-4 py-3 bg-wm-pink text-white font-bold rounded-lg hover:bg-wm-pink/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
                >
                  {isGeneratingPresentation ? 'Generating...' : 'Generate Presentation'}
                </button>
                
                {presentationUrl && (
                  <a
                    href={presentationUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block w-full mb-4 px-4 py-3 bg-green-600 text-white font-bold rounded-lg hover:bg-green-700 transition-colors text-center shadow-md"
                  >
                    Open Presentation
                  </a>
                )}
                
                {/* Presentations List */}
                {presentations.length > 0 && (
                  <div>
                    <h4 className="text-sm font-bold text-wm-blue mb-3">Generated Presentations:</h4>
                    <div className="space-y-2 max-h-96 overflow-y-auto" style={{ scrollbarWidth: 'thin' }}>
                      {presentations.map((presentation) => (
                        <div
                          key={presentation.generationId}
                          className="relative p-4 bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow"
                        >
                          {/* Delete icon in top right corner */}
                          <button
                            onClick={() => handleDeletePresentation(presentation.generationId)}
                            className="absolute top-2 right-2 p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors z-10"
                            title="Delete presentation"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                            </svg>
                          </button>

                          {/* Clickable card content */}
                          <a
                            href={presentation.devUrl || `https://gamma.app/doc/${presentation.generationId}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block pr-8 group"
                          >
                            <h3 className="text-base font-bold text-wm-blue mb-1 group-hover:text-wm-blue/80 transition-colors">
                              AI Automation Solutions
                            </h3>
                            <h4 className="text-lg font-semibold text-gray-900 mb-1 group-hover:text-wm-accent transition-colors">
                              {presentation.companyName || companyInfo.name}
                            </h4>
                            <p className="text-sm text-gray-600 mb-1">
                              {presentation.phase || 'Workflow Implementation & Opportunities'}
                            </p>
                            <div className="flex items-center gap-2 text-xs">
                              <span className="text-gray-500">
                                {new Date(presentation.createdAt).toLocaleDateString('en-US', {
                                  year: 'numeric',
                                  month: 'long',
                                  day: 'numeric'
                                })}
                              </span>
                              
                              {/* Dev badge */}
                              {presentation.devUrl && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full font-medium group-hover:bg-purple-200 transition-colors">
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M12.316 3.051a1 1 0 01.633 1.265l-4 12a1 1 0 11-1.898-.632l4-12a1 1 0 011.265-.633zM5.707 6.293a1 1 0 010 1.414L3.414 10l2.293 2.293a1 1 0 11-1.414 1.414l-3-3a1 1 0 010-1.414l3-3a1 1 0 011.414 0zm8.586 0a1 1 0 011.414 0l3 3a1 1 0 010 1.414l-3 3a1 1 0 11-1.414-1.414L16.586 10l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
                                  </svg>
                                  Dev
                                </span>
                              )}
                            </div>
                          </a>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
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
                          <td className="px-4 py-3 text-wm-accent font-bold text-sm">{doc.documentAnalysis?.category || doc.type}</td>
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
                      <div className="flex items-center gap-2">
                        <button
                          onClick={handleCopyModalContent}
                          className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-slate-700 border border-slate-200 rounded hover:bg-slate-100 transition-colors"
                          title="Copy for Word/Confluence"
                          type="button"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16h8M8 12h8m-6 8h6a2 2 0 002-2V8l-6-6H8a2 2 0 00-2 2v4" />
                          </svg>
                          Copy
                        </button>
                        <button
                          onClick={() => setSelectedDocument(null)}
                          className="flex-shrink-0 p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-200 rounded transition-colors"
                          title="Close"
                          type="button"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                  
                  {/* Modal Content */}
                  <div className="flex-1 overflow-y-auto px-6 py-6 bg-white">
                    <div className="mb-4">
                      <h4 className="text-sm font-bold text-slate-700 mb-2">Summary</h4>
                      <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                        <p className="text-slate-800 leading-relaxed text-sm">
                          {selectedDocument.documentAnalysis?.summary || selectedDocument.context}
                        </p>
                      </div>
                    </div>
                    {selectedDocument.documentAnalysis?.keyPoints?.length ? (
                      <div className="mb-6">
                        <h4 className="text-sm font-bold text-slate-700 mb-2">Key Points</h4>
                        <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                          <ul className="list-disc pl-5 space-y-1 text-sm text-slate-800">
                            {selectedDocument.documentAnalysis.keyPoints.map((point, idx) => (
                              <li key={idx}>{point}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    ) : null}
                    {selectedDocument.analysis ? (
                      <div className="mb-6 space-y-4">
                        <h4 className="text-sm font-bold text-slate-700">RFP Analysis</h4>
                        <div className="grid grid-cols-1 gap-4">
                          <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                            <p className="text-xs font-semibold text-slate-600 mb-1">Project Structure</p>
                            {renderMarkdown(selectedDocument.analysis.projectStructure)}
                          </div>
                          <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                            <p className="text-xs font-semibold text-slate-600 mb-1">Detailed Analysis</p>
                            {renderMarkdown(selectedDocument.analysis.detailedAnalysis)}
                          </div>
                          <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                            <p className="text-xs font-semibold text-slate-600 mb-1">Requirements</p>
                            {renderMarkdown(selectedDocument.analysis.requirements)}
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                              <p className="text-xs font-semibold text-slate-600 mb-1">Timeline</p>
                              {renderMarkdown(selectedDocument.analysis.timeline)}
                            </div>
                            <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                              <p className="text-xs font-semibold text-slate-600 mb-1">Budget</p>
                              {renderMarkdown(selectedDocument.analysis.budget)}
                            </div>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                              <p className="text-xs font-semibold text-slate-600 mb-1">Stakeholders</p>
                              {renderMarkdown(selectedDocument.analysis.stakeholders)}
                            </div>
                            <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                              <p className="text-xs font-semibold text-slate-600 mb-1">Success Criteria</p>
                              {renderMarkdown(selectedDocument.analysis.successCriteria)}
                            </div>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                              <p className="text-xs font-semibold text-slate-600 mb-1">Risks</p>
                              {renderMarkdown(selectedDocument.analysis.risks)}
                            </div>
                            <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                              <p className="text-xs font-semibold text-slate-600 mb-1">Constraints</p>
                              {renderMarkdown(selectedDocument.analysis.constraints)}
                            </div>
                          </div>
                          <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                            <p className="text-xs font-semibold text-slate-600 mb-1">AI Recommendations</p>
                            {renderMarkdown(selectedDocument.analysis.aiRecommendations)}
                          </div>
                          <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                            <p className="text-xs font-semibold text-slate-600 mb-1">AI Capabilities</p>
                            {renderMarkdown(selectedDocument.analysis.aiCapabilities)}
                          </div>
                          {selectedDocument.analysis.clarificationNeeded ? (
                            <div className="bg-amber-50 rounded-lg p-4 border border-amber-200">
                              <p className="text-xs font-semibold text-amber-700 mb-1">Clarification Needed</p>
                              {renderMarkdown(selectedDocument.analysis.clarificationNeeded)}
                            </div>
                          ) : null}
                        </div>
                      </div>
                    ) : null}
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

        {/* Collaboration Tab */}
        {activeTab === 'collaboration' && (
          <div className="space-y-4">
            <h3 className="text-wm-blue font-bold">Teams & SharePoint Configuration</h3>
            <p className="text-sm text-wm-blue/70">
              Connect a Teams channel and/or SharePoint folder so documents and meeting transcripts can be reused across all journey steps.
            </p>
            <CollaborationConfiguration
              config={collaborationConfig}
              isLoading={isSavingCollaborationConfig}
              onSave={handleSaveCollaborationConfig}
            />
            {collaborationConfigStatus && (
              <p className="text-xs text-wm-blue/70">{collaborationConfigStatus}</p>
            )}
          </div>
        )}
      </div>
    </div>

    {/* URL Input Modal */}
    {showUrlModal && (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4 shadow-xl">
          <h2 className="text-xl font-bold text-wm-blue mb-4">Add Presentation URLs</h2>
          <p className="text-sm text-gray-600 mb-4">
            Add the public and development URLs for this presentation:
          </p>
          
          <div className="space-y-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Public URL
              </label>
              <input
                type="url"
                placeholder="https://gamma.app/public/..."
                value={urlModalPublicUrl}
                onChange={(e) => setUrlModalPublicUrl(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-wm-pink"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Development URL
              </label>
              <input
                type="url"
                placeholder="https://gamma.app/docs/..."
                value={urlModalDevUrl}
                onChange={(e) => setUrlModalDevUrl(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-wm-pink"
              />
            </div>
          </div>
          
          <div className="flex gap-2 justify-end">
            <button
              onClick={() => {
                setShowUrlModal(false);
                setUrlModalPublicUrl('');
                setUrlModalDevUrl('');
                setCurrentGenerationId(null);
              }}
              className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              Skip
            </button>
            <button
              onClick={handleSaveUrls}
              className="px-4 py-2 bg-wm-pink text-white font-bold rounded-lg hover:bg-wm-pink/90 transition-colors"
            >
              Save URLs
            </button>
          </div>
        </div>
      </div>
    )}

    {/* Presentation Prompt Modal */}
    {showPromptModal && (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg shadow-lg p-6 max-w-3xl w-full mx-4">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div>
              <h3 className="text-lg font-bold text-wm-blue">Presentation Prompt</h3>
              <p className="text-sm text-wm-blue/70">
                Copy this prompt into your presentation tool.
              </p>
            </div>
            <button
              onClick={() => setShowPromptModal(false)}
              className="text-wm-blue/50 hover:text-wm-blue"
              aria-label="Close"
            >
              ✕
            </button>
          </div>
          <textarea
            readOnly
            value={presentationPrompt}
            className="w-full min-h-[320px] rounded-lg border border-wm-neutral/30 p-3 text-sm text-wm-blue"
          />
          <div className="mt-4 flex flex-wrap gap-2 justify-end">
            <button
              onClick={() => setShowPromptModal(false)}
              className="px-4 py-2 bg-wm-neutral/20 text-wm-blue font-bold rounded-lg hover:bg-wm-neutral/30 transition-colors"
            >
              Close
            </button>
            <button
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(presentationPrompt);
                } catch (error) {
                  console.error('Failed to copy prompt:', error);
                }
              }}
              className="px-4 py-2 bg-wm-accent text-white font-bold rounded-lg hover:bg-wm-accent/90 transition-colors"
            >
              Copy prompt
            </button>
          </div>
        </div>
      </div>
    )}
  </>
);
};

export default CompanyResearchContent;