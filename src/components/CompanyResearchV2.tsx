import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import type { User } from 'firebase/auth';
import SidebarNav, { SidebarNavItem } from './SidebarNav';
import { Icons, ALL_SCENARIOS, DOMAIN_COLORS } from '../constants';
import { getCompany, getUserCompanies, updateCompanyJourneyStatus } from '../services/companyService';
import { researchCompany, AIModelId, AI_MODELS, generateChatResponse } from '../services/geminiService';
import { getScenarios, saveCompanyResearch, getJourneyStepSettings, getAllUserEvaluations, saveUserScenario } from '../services/firebaseService';
import { extractTextFromPDF } from '../services/pdfExtractor';
import { extractTextFromDocx } from '../services/docxExtractor';
import { getSharePointFolderDocuments } from '../services/collaborationService';
import type { CompanyResearchEntry, UploadedDocument, CompanyResearch, FunctionalHighLevelMeeting, JourneyStepSettings, JourneyStepKey, CustomJourneyStep, JourneyCollaborationConfig } from '../types';
import SearchInput from './SearchInput';
import { CollaborationConfiguration } from './CollaborationConfiguration';
import CreateScenarioForm, { ScenarioFormPayload } from './CreateScenarioForm';

interface CompanyResearchV2Props {
  user: User;
}

type JourneyStep = {
  id: string;
  settingKey?: JourneyStepKey;
  title: string;
  phase: string;
  status: 'current' | 'next' | 'later';
  description: string;
  cta: string;
  locked: boolean;
  isCustom?: boolean;
  customStepId?: string;
};

type UseCaseCreateSource = 'kickoff' | 'phase2' | 'deepDive';

const NOTE_STOP_WORDS = new Set([
  'the', 'and', 'for', 'that', 'with', 'from', 'this', 'have', 'will', 'your', 'you', 'are', 'was', 'were', 'been', 'into', 'about',
  'during', 'after', 'before', 'across', 'their', 'them', 'they', 'then', 'than', 'there', 'where', 'which', 'while', 'would', 'could',
  'should', 'also', 'our', 'out', 'use', 'using', 'used', 'can', 'may', 'more', 'most', 'some', 'such', 'over', 'under', 'each', 'phase',
  'meeting', 'meetings', 'kickoff', 'notes'
]);

const tokenize = (text: string): string[] =>
  text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((token) => token.length > 2 && !NOTE_STOP_WORDS.has(token));

const sanitizeTemplateText = (value: string): string =>
  value
    .replace(/[^\x20-\x7E\n\r\t]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const CompanyResearchV2: React.FC<CompanyResearchV2Props> = ({ user }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [companyName, setCompanyName] = useState<string | null>(null);
  const [companyResearch, setCompanyResearch] = useState<CompanyResearch | null>(null);
  const [companySelectedDomains, setCompanySelectedDomains] = useState<string[]>([]);
  const [companySelectedScenarios, setCompanySelectedScenarios] = useState<string[]>([]);
  const [journeys, setJourneys] = useState<Record<string, { id: string; createdAt: number; updatedAt: number; companyResearchComplete?: boolean; kickoffPresentationUrl?: string; kickoffSelectedDomains?: string[]; kickoffSelectedUseCases?: string[]; kickoffTemplateReference?: UploadedDocument | null; deepDiveTemplateReference?: UploadedDocument | null; kickoffMeetingNotes?: UploadedDocument[]; phase2SelectedDomains?: string[]; phase2SelectedUseCases?: string[]; functionalHighLevelMeetings?: FunctionalHighLevelMeeting[]; functionalDeepDiveMeetings?: FunctionalHighLevelMeeting[]; deepDiveSelectedDomains?: string[]; deepDiveSelectedUseCases?: string[]; customSteps?: CustomJourneyStep[]; journeyStepSettings?: Partial<JourneyStepSettings>; currentStepId?: string }>>({});
  const [selectedJourneyId, setSelectedJourneyId] = useState<string | null>(null);
  const [userCompanies, setUserCompanies] = useState<Array<{ id: string; name: string; journeys?: Record<string, { id: string; createdAt: number }> }>>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const [pendingCompanyName, setPendingCompanyName] = useState<string | null>(null);
  const [isResearchRunning, setIsResearchRunning] = useState(false);
  const [researchError, setResearchError] = useState<string | null>(null);
  const [researchResult, setResearchResult] = useState<CompanyResearchEntry | null>(null);
  const [draftDocuments, setDraftDocuments] = useState<UploadedDocument[]>([]);
  const [draftTranscripts, setDraftTranscripts] = useState<string[]>([]);
  const [newTranscript, setNewTranscript] = useState('');
  const [isSavingProject, setIsSavingProject] = useState(false);
  const [libraryDomains, setLibraryDomains] = useState<string[]>([]);
  const [libraryUseCases, setLibraryUseCases] = useState<typeof ALL_SCENARIOS>([]);
  const [allEvaluations, setAllEvaluations] = useState<Array<{ scenarioId: string; timestamp: number; demoPublishedUrl?: string | null; demoProjectUrl?: string | null }>>([]);
  const [kickoffPrompt, setKickoffPrompt] = useState('');
  const [showKickoffPromptModal, setShowKickoffPromptModal] = useState(false);
  const [isCreateUseCaseModalOpen, setIsCreateUseCaseModalOpen] = useState(false);
  const [createUseCaseDomain, setCreateUseCaseDomain] = useState<string>('General');
  const [createUseCaseSource, setCreateUseCaseSource] = useState<UseCaseCreateSource>('kickoff');
  const [kickoffPresentationUrl, setKickoffPresentationUrl] = useState('');
  const [isSavingKickoffPresentationUrl, setIsSavingKickoffPresentationUrl] = useState(false);
  const [kickoffUrlStatus, setKickoffUrlStatus] = useState<string | null>(null);
  const [kickoffTemplateReference, setKickoffTemplateReference] = useState<UploadedDocument | null>(null);
  const [isSavingKickoffTemplateReference, setIsSavingKickoffTemplateReference] = useState(false);
  const [kickoffTemplateStatus, setKickoffTemplateStatus] = useState<string | null>(null);
  const [sharePointPresentationOptions, setSharePointPresentationOptions] = useState<UploadedDocument[]>([]);
  const [deepDiveTemplateReference, setDeepDiveTemplateReference] = useState<UploadedDocument | null>(null);
  const [deepDiveSharePointPresentationOptions, setDeepDiveSharePointPresentationOptions] = useState<UploadedDocument[]>([]);
  const [isLoadingDeepDiveSharePointPresentations, setIsLoadingDeepDiveSharePointPresentations] = useState(false);
  const [isSavingDeepDiveTemplateReference, setIsSavingDeepDiveTemplateReference] = useState(false);
  const [deepDiveTemplateStatus, setDeepDiveTemplateStatus] = useState<string | null>(null);
  const [kickoffMeetingNotes, setKickoffMeetingNotes] = useState<UploadedDocument[]>([]);
  const [newKickoffMeetingNote, setNewKickoffMeetingNote] = useState('');
  const [isSavingKickoffMeetingNotes, setIsSavingKickoffMeetingNotes] = useState(false);
  const [kickoffNotesStatus, setKickoffNotesStatus] = useState<string | null>(null);
  const [isKickoffDropActive, setIsKickoffDropActive] = useState(false);
  const [phase2SelectedDomains, setPhase2SelectedDomains] = useState<string[]>([]);
  const [phase2SelectedUseCases, setPhase2SelectedUseCases] = useState<string[]>([]);
  const [isSavingPhase2Targets, setIsSavingPhase2Targets] = useState(false);
  const [phase2TargetsStatus, setPhase2TargetsStatus] = useState<string | null>(null);
  const [functionalHighLevelMeetings, setFunctionalHighLevelMeetings] = useState<FunctionalHighLevelMeeting[]>([]);
  const [selectedFunctionalMeetingId, setSelectedFunctionalMeetingId] = useState<string | null>(null);
  const [newFunctionalMeetingNote, setNewFunctionalMeetingNote] = useState('');
  const [isFunctionalDropActive, setIsFunctionalDropActive] = useState(false);
  const [isSavingFunctionalMeetings, setIsSavingFunctionalMeetings] = useState(false);
  const [functionalMeetingsStatus, setFunctionalMeetingsStatus] = useState<string | null>(null);
  const [functionalDeepDiveMeetings, setFunctionalDeepDiveMeetings] = useState<FunctionalHighLevelMeeting[]>([]);
  const [selectedDeepDiveMeetingId, setSelectedDeepDiveMeetingId] = useState<string | null>(null);
  const [newDeepDiveMeetingNote, setNewDeepDiveMeetingNote] = useState('');
  const [isDeepDiveDropActive, setIsDeepDiveDropActive] = useState(false);
  const [isSavingDeepDiveMeetings, setIsSavingDeepDiveMeetings] = useState(false);
  const [deepDiveMeetingsStatus, setDeepDiveMeetingsStatus] = useState<string | null>(null);
  const [deepDiveSelectedDomains, setDeepDiveSelectedDomains] = useState<string[]>([]);
  const [deepDiveSelectedUseCases, setDeepDiveSelectedUseCases] = useState<string[]>([]);
  const [isSavingDeepDiveTargets, setIsSavingDeepDiveTargets] = useState(false);
  const [deepDiveTargetsStatus, setDeepDiveTargetsStatus] = useState<string | null>(null);
  const [customSteps, setCustomSteps] = useState<CustomJourneyStep[]>([]);
  const [isCustomStepFormOpen, setIsCustomStepFormOpen] = useState(false);
  const [newCustomStepTitle, setNewCustomStepTitle] = useState('');
  const [newCustomStepDescription, setNewCustomStepDescription] = useState('');
  const [newCustomStepModelId, setNewCustomStepModelId] = useState<AIModelId>('gemini-2.5-pro');
  const [newCustomStepPrompt, setNewCustomStepPrompt] = useState('');
  const [newCustomStepSelectedDocumentIds, setNewCustomStepSelectedDocumentIds] = useState<string[]>([]);
  const [newCustomStepSelectedTranscriptIds, setNewCustomStepSelectedTranscriptIds] = useState<string[]>([]);
  const [newCustomStepOutputType, setNewCustomStepOutputType] = useState<'CHAT_INTERFACE' | 'EXCEL_DOC' | 'PRESENTATION'>('CHAT_INTERFACE');
  const [newCustomStepExcelTemplate, setNewCustomStepExcelTemplate] = useState<{ fileName: string; dataUrl: string } | null>(null);
  const [newCustomStepPresentationTemplate, setNewCustomStepPresentationTemplate] = useState<{ fileName: string; dataUrl: string } | null>(null);
  const [customStepExcelTemplateOptions, setCustomStepExcelTemplateOptions] = useState<UploadedDocument[]>([]);
  const [customStepPresentationTemplateOptions, setCustomStepPresentationTemplateOptions] = useState<UploadedDocument[]>([]);
  const [isLoadingCustomStepExcelTemplates, setIsLoadingCustomStepExcelTemplates] = useState(false);
  const [isLoadingCustomStepPresentationTemplates, setIsLoadingCustomStepPresentationTemplates] = useState(false);
  const [isSavingCustomStep, setIsSavingCustomStep] = useState(false);
  const [customStepStatus, setCustomStepStatus] = useState<string | null>(null);
  const [customStepOutputStatus, setCustomStepOutputStatus] = useState<string | null>(null);
  const [customStepChatInput, setCustomStepChatInput] = useState('');
  const [isCustomStepChatSending, setIsCustomStepChatSending] = useState(false);
  const [customStepChatByStepId, setCustomStepChatByStepId] = useState<Record<string, Array<{ role: 'user' | 'assistant'; content: string }>>>({});
  const [selectedStepId, setSelectedStepId] = useState<string>('companyResearch');
  const [journeyStepOverrides, setJourneyStepOverrides] = useState<Partial<JourneyStepSettings>>({});
  const [isSavingJourneyStepOverrides, setIsSavingJourneyStepOverrides] = useState(false);
  const [journeyStepOverridesStatus, setJourneyStepOverridesStatus] = useState<string | null>(null);
  const [isJourneyStepManagerOpen, setIsJourneyStepManagerOpen] = useState(false);
  const [journeyStepSettings, setJourneyStepSettings] = useState<JourneyStepSettings>({
    companyResearch: true,
    targetDomains: true,
    kickoffMeeting: true,
    makeHypothesesHighLevel: true,
    functionalHighLevel: true,
    makeHypothesesDeepDive: true,
    functionalDeepDive: true,
    designIntegrationStrategy: true,
    createDevelopmentDocumentation: true
  });

  const storedCompanyJourneyId = typeof window !== 'undefined'
    ? localStorage.getItem('companyJourneyCompanyId')
    : null;
  const storedJourneyId = typeof window !== 'undefined'
    ? localStorage.getItem('companyJourneyJourneyId')
    : null;
  const displayCompanyName = companyName || pendingCompanyName || 'Company Journey (New)';
  const defaultDomainSelection = useMemo(
    () => (libraryDomains.length > 0
      ? libraryDomains
      : Array.from(new Set(ALL_SCENARIOS.filter((scenario) => scenario.type === 'TRAINING').map((scenario) => scenario.domain).filter((domain): domain is string => Boolean(domain))))),
    [libraryDomains]
  );
  const activeResearch = researchResult || companyResearch?.currentResearch || null;
  const hasResearch = !!activeResearch;
  const allLibraryTrainingUseCases = useMemo(() => {
    const byId = new Map<string, (typeof ALL_SCENARIOS)[number]>();
    [...ALL_SCENARIOS, ...libraryUseCases]
      .filter((scenario) => scenario.type === 'TRAINING')
      .forEach((scenario) => {
        byId.set(scenario.id, scenario);
      });
    return Array.from(byId.values());
  }, [libraryUseCases]);

  const journeyOptions = useMemo(() => {
    const byIdentity = new Map<string, { id: string; createdAt: number; updatedAt: number }>();

    Object.entries(journeys).forEach(([journeyKey, journey]) => {
      const normalizedId = journey?.id || journeyKey;
      if (!normalizedId) return;
      if (byIdentity.has(normalizedId)) return;
      byIdentity.set(normalizedId, {
        id: normalizedId,
        createdAt: journey?.createdAt || 0,
        updatedAt: journey?.updatedAt || 0,
      });
    });

    const byCreatedAt = new Map<string, { id: string; createdAt: number; updatedAt: number }>();

    Array.from(byIdentity.values()).forEach((journey) => {
      const createdAtKey = journey.createdAt > 0 ? String(Math.floor(journey.createdAt / 1000)) : `id:${journey.id}`;
      const existing = byCreatedAt.get(createdAtKey);
      if (!existing) {
        byCreatedAt.set(createdAtKey, journey);
        return;
      }

      const shouldPreferCurrent = selectedJourneyId === journey.id && selectedJourneyId !== existing.id;
      const shouldPreferNewest = journey.updatedAt > existing.updatedAt;
      if (shouldPreferCurrent || shouldPreferNewest) {
        byCreatedAt.set(createdAtKey, journey);
      }
    });

    return Array.from(byCreatedAt.values()).sort((a, b) => b.createdAt - a.createdAt);
  }, [journeys, selectedJourneyId]);

  const latestDemoUrlByProcess = useMemo(() => {
    const scenarioById = new Map(allLibraryTrainingUseCases.map((scenario) => [scenario.id, scenario]));
    const latestByProcess: Record<string, { timestamp: number; url: string }> = {};

    allEvaluations.forEach((evaluation) => {
      const scenario = scenarioById.get(evaluation.scenarioId);
      const processKey = scenario?.process?.trim();
      if (!processKey) return;

      const demoUrl = evaluation.demoPublishedUrl || evaluation.demoProjectUrl;
      if (!demoUrl) return;

      const existing = latestByProcess[processKey];
      if (!existing || evaluation.timestamp > existing.timestamp) {
        latestByProcess[processKey] = {
          timestamp: evaluation.timestamp,
          url: demoUrl
        };
      }
    });

    return Object.entries(latestByProcess).reduce<Record<string, string>>((acc, [process, value]) => {
      acc[process] = value.url;
      return acc;
    }, {});
  }, [allEvaluations, allLibraryTrainingUseCases]);

  useEffect(() => {
    if (!companySelectedDomains.length && hasResearch && defaultDomainSelection.length > 0) {
      setCompanySelectedDomains(defaultDomainSelection);
      kickoffTargetsDirtyRef.current = true;
    }
  }, [companySelectedDomains.length, hasResearch, defaultDomainSelection]);

  useEffect(() => {
    if (!user?.uid) return;
    getScenarios(user.uid)
      .then((scenarios) => {
        const combined = [...ALL_SCENARIOS, ...scenarios];
        setLibraryUseCases(scenarios);
        const domains = Array.from(
          new Set(
            combined
              .filter((scenario) => scenario.type === 'TRAINING')
              .map((scenario) => scenario.domain)
              .filter((domain): domain is string => Boolean(domain))
          )
        ).sort((a, b) => a.localeCompare(b));
        setLibraryDomains(domains);
      })
      .catch((error) => {
        console.error('Failed to load library domains:', error);
      });
  }, [user]);

  useEffect(() => {
    if (!user?.uid) {
      setAllEvaluations([]);
      return;
    }

    getAllUserEvaluations(user.uid)
      .then((evaluations) => {
        setAllEvaluations(evaluations);
      })
      .catch((error) => {
        console.error('Failed to load evaluations for demo links:', error);
        setAllEvaluations([]);
      });
  }, [user?.uid]);

  useEffect(() => {
    getJourneyStepSettings()
      .then((settings) => setJourneyStepSettings(settings))
      .catch((error) => {
        console.error('Failed to load journey step settings:', error);
      });
  }, []);

  const companyChildren: SidebarNavItem[] = userCompanies.map((company) => {
    const companyJourneys = Object.values(company.journeys || {}).sort((a, b) => b.createdAt - a.createdAt);
    return {
      id: `company-${company.id}`,
      label: company.name,
      icon: <Icons.Building className="w-4 h-4" />,
      onClick: () => {
        const firstJourney = companyJourneys[0];
        const journeyQuery = firstJourney ? `&journeyId=${firstJourney.id}` : '';
        navigate(`/company2?companyId=${company.id}${journeyQuery}`);
      },
      isActive: companyId === company.id,
      children: companyJourneys.map((journey, index) => ({
        id: `company-${company.id}-journey-${journey.id}`,
        label: `Journey ${index + 1} • ${new Date(journey.createdAt).toLocaleString()}`,
        icon: <Icons.Document className="w-4 h-4" />,
        onClick: () => {
          setSelectedJourneyId(journey.id);
          if (typeof window !== 'undefined') {
            localStorage.setItem('companyJourneyJourneyId', journey.id);
          }
          navigate(`/company2?companyId=${company.id}&journeyId=${journey.id}`);
        },
        isActive: companyId === company.id && selectedJourneyId === journey.id
      }))
    };
  });

  const menuItems: SidebarNavItem[] = [
    {
      id: 'overview',
      label: 'Dashboard',
      icon: <Icons.Home className="w-5 h-5" />,
      onClick: () => navigate('/dashboard'),
      isActive: location.pathname.startsWith('/dashboard') && !location.search.includes('section=')
    },
    {
      id: 'companies',
      label: 'Companies',
      icon: <Icons.Building className="w-5 h-5" />,
      onClick: () => navigate('/dashboard?section=companies'),
      isActive: location.pathname.startsWith('/company2') || location.pathname.startsWith('/research') || location.search.includes('section=companies'),
      children: companyChildren
    },
    {
      id: 'processes',
      label: 'Processes',
      icon: <Icons.Workflow className="w-5 h-5" />,
      onClick: () => navigate('/library'),
      isActive: location.pathname.startsWith('/library'),
      children: []
    },
    {
      id: 'settings',
      label: 'Output History',
      icon: <Icons.Document className="w-5 h-5" />,
      onClick: () => navigate('/dashboard?section=settings'),
      isActive: location.search.includes('section=settings')
    }
  ];

  const [isCompanyResearchComplete, setIsCompanyResearchComplete] = useState(false);
  const [collaborationConfig, setCollaborationConfig] = useState<JourneyCollaborationConfig | undefined>(undefined);
  const [isCollaborationConfigComplete, setIsCollaborationConfigComplete] = useState(false);
  const [isSavingCollaborationConfig, setIsSavingCollaborationConfig] = useState(false);
  const [collaborationConfigStatus, setCollaborationConfigStatus] = useState<string | null>(null);
  const kickoffUrlDirtyRef = useRef(false);
  const kickoffTargetsDirtyRef = useRef(false);
  const kickoffNotesDirtyRef = useRef(false);
  const phase2TargetsDirtyRef = useRef(false);
  const functionalMeetingsDirtyRef = useRef(false);
  const deepDiveMeetingsDirtyRef = useRef(false);
  const deepDiveTargetsDirtyRef = useRef(false);
  const selectedStepDirtyRef = useRef(false);
  const journeyStepOverridesDirtyRef = useRef(false);

  useEffect(() => {
    if (!location.pathname.startsWith('/company2')) {
      return;
    }

    const params = new URLSearchParams(location.search);
    const companyIdFromQuery = params.get('companyId');
    const journeyIdFromQuery = params.get('journeyId');
    const resolvedCompanyId = companyIdFromQuery || storedCompanyJourneyId;

    if (!companyIdFromQuery && resolvedCompanyId) {
      const nextJourney = journeyIdFromQuery || storedJourneyId;
      const query = nextJourney ? `companyId=${resolvedCompanyId}&journeyId=${nextJourney}` : `companyId=${resolvedCompanyId}`;
      navigate(`/company2?${query}`, { replace: true });
    }

    if (!resolvedCompanyId) {
      setCompanyId(null);
      setCompanyName(null);
      setIsCompanyResearchComplete(false);
      return;
    }

    setCompanyId(resolvedCompanyId);
    getCompany(resolvedCompanyId)
      .then((company) => {
        if (!company) {
          setCompanyName(null);
          setIsCompanyResearchComplete(false);
          return;
        }
        setCompanyName(company.name || null);
        setCompanyResearch(company.research || null);
        if (company.research?.currentResearch) {
          setResearchResult(company.research.currentResearch);
        }
        const companyJourneys = (company as any).journeys || {};
        setJourneys(companyJourneys);
        const activeJourneyId = journeyIdFromQuery || (company as any).currentJourneyId || storedJourneyId || null;
        const activeJourney = activeJourneyId ? companyJourneys[activeJourneyId] : (company as any).journey;
        const fallbackKickoffDomains = company.selectedDomains || [];
        const fallbackKickoffUseCases = company.selectedScenarios || [];
        const fallbackPhase2Domains = Array.isArray(activeJourney?.kickoffSelectedDomains)
          ? activeJourney.kickoffSelectedDomains
          : fallbackKickoffDomains;
        const fallbackPhase2UseCases = Array.isArray(activeJourney?.kickoffSelectedUseCases)
          ? activeJourney.kickoffSelectedUseCases
          : fallbackKickoffUseCases;
        setCompanySelectedDomains(
          Array.isArray(activeJourney?.kickoffSelectedDomains)
            ? activeJourney.kickoffSelectedDomains
            : fallbackKickoffDomains
        );
        setCompanySelectedScenarios(
          Array.isArray(activeJourney?.kickoffSelectedUseCases)
            ? activeJourney.kickoffSelectedUseCases
            : fallbackKickoffUseCases
        );
        setSelectedJourneyId(activeJourneyId);
        setIsCompanyResearchComplete(!!activeJourney?.companyResearchComplete);
        setCollaborationConfig(activeJourney?.collaborationConfig);
        setIsCollaborationConfigComplete(!!activeJourney?.collaborationConfigComplete);
        setKickoffPresentationUrl(activeJourney?.kickoffPresentationUrl || '');
        setKickoffTemplateReference(activeJourney?.kickoffTemplateReference || null);
        setDeepDiveTemplateReference(activeJourney?.deepDiveTemplateReference || null);
        setKickoffMeetingNotes(activeJourney?.kickoffMeetingNotes || []);
        setPhase2SelectedDomains(
          Array.isArray(activeJourney?.phase2SelectedDomains)
            ? activeJourney.phase2SelectedDomains
            : fallbackPhase2Domains
        );
        setPhase2SelectedUseCases(
          Array.isArray(activeJourney?.phase2SelectedUseCases)
            ? activeJourney.phase2SelectedUseCases
            : fallbackPhase2UseCases
        );
        setDeepDiveSelectedDomains(
          Array.isArray(activeJourney?.deepDiveSelectedDomains)
            ? activeJourney.deepDiveSelectedDomains
            : (Array.isArray(activeJourney?.phase2SelectedDomains) ? activeJourney.phase2SelectedDomains : fallbackPhase2Domains)
        );
        setDeepDiveSelectedUseCases(
          Array.isArray(activeJourney?.deepDiveSelectedUseCases)
            ? activeJourney.deepDiveSelectedUseCases
            : (Array.isArray(activeJourney?.phase2SelectedUseCases) ? activeJourney.phase2SelectedUseCases : fallbackPhase2UseCases)
        );
        const loadedFunctionalMeetings = Array.isArray(activeJourney?.functionalHighLevelMeetings)
          ? activeJourney.functionalHighLevelMeetings
          : [];
        const loadedDeepDiveMeetings = Array.isArray(activeJourney?.functionalDeepDiveMeetings)
          ? activeJourney.functionalDeepDiveMeetings
          : [];
        const loadedCustomSteps = Array.isArray(activeJourney?.customSteps)
          ? activeJourney.customSteps
          : [];
        setFunctionalHighLevelMeetings(loadedFunctionalMeetings);
        setSelectedFunctionalMeetingId(loadedFunctionalMeetings[0]?.id || null);
        setFunctionalDeepDiveMeetings(loadedDeepDiveMeetings);
        setSelectedDeepDiveMeetingId(loadedDeepDiveMeetings[0]?.id || null);
        setCustomSteps(loadedCustomSteps);
        setJourneyStepOverrides(activeJourney?.journeyStepSettings || {});
        setSelectedStepId(activeJourney?.currentStepId || 'companyResearch');
        setIsCustomStepFormOpen(false);
        setNewCustomStepTitle('');
        setNewCustomStepDescription('');
        setNewCustomStepModelId('gemini-2.5-pro');
        setNewCustomStepPrompt('');
        setNewCustomStepSelectedDocumentIds([]);
        setNewCustomStepSelectedTranscriptIds([]);
        setNewCustomStepOutputType('CHAT_INTERFACE');
        setNewCustomStepExcelTemplate(null);
        setNewCustomStepPresentationTemplate(null);
        setCustomStepExcelTemplateOptions([]);
        setCustomStepPresentationTemplateOptions([]);
        setCustomStepStatus(null);
        setJourneyStepOverridesStatus(null);
        setIsJourneyStepManagerOpen(false);
        kickoffUrlDirtyRef.current = false;
        kickoffTargetsDirtyRef.current = false;
        kickoffNotesDirtyRef.current = false;
        phase2TargetsDirtyRef.current = false;
        functionalMeetingsDirtyRef.current = false;
        deepDiveMeetingsDirtyRef.current = false;
        deepDiveTargetsDirtyRef.current = false;
        selectedStepDirtyRef.current = false;
        journeyStepOverridesDirtyRef.current = false;
        if (typeof window !== 'undefined' && activeJourneyId) {
          localStorage.setItem('companyJourneyJourneyId', activeJourneyId);
        }
      })
      .catch(() => {
        setCompanyName(null);
        setIsCompanyResearchComplete(false);
      });
  }, [location.pathname, location.search, navigate, storedCompanyJourneyId, storedJourneyId]);

  useEffect(() => {
    if (!user?.uid) return;
    getUserCompanies(user.uid)
      .then((companies) => {
        const simplified = companies.map((company) => ({
          id: company.id,
          name: company.name,
          journeys: company.journeys
        }));
        setUserCompanies(simplified);
      })
      .catch((error) => {
        console.error('Failed to load user companies:', error);
        setUserCompanies([]);
      });
  }, [user]);


  const prerequisitesComplete = isCompanyResearchComplete || hasResearch;

  const kickoffUseCases = useMemo(
    () => allLibraryTrainingUseCases.filter((scenario) => {
      if (scenario.type !== 'TRAINING') return false;
      if (!companySelectedDomains.length) return true;
      return !!scenario.domain && companySelectedDomains.includes(scenario.domain);
    }),
    [allLibraryTrainingUseCases, companySelectedDomains]
  );

  const selectedKickoffUseCases = useMemo(
    () => allLibraryTrainingUseCases.filter((scenario) => companySelectedScenarios.includes(scenario.id)),
    [allLibraryTrainingUseCases, companySelectedScenarios]
  );

  const kickoffNotesCombined = useMemo(
    () => kickoffMeetingNotes.map((note) => note.content || '').join('\n\n').trim(),
    [kickoffMeetingNotes]
  );

  const kickoffNotesSummary = useMemo(() => {
    if (!kickoffNotesCombined) return [] as string[];
    const candidateSentences = kickoffNotesCombined
      .replace(/\s+/g, ' ')
      .split(/(?<=[.!?])\s+/)
      .map((sentence) => sentence.trim())
      .filter((sentence) => sentence.length > 35);

    const unique: string[] = [];
    for (const sentence of candidateSentences) {
      const normalized = sentence.toLowerCase();
      if (!unique.some((item) => item.toLowerCase() === normalized)) {
        unique.push(sentence);
      }
      if (unique.length >= 5) break;
    }
    return unique;
  }, [kickoffNotesCombined]);

  const hypothesisBreakdown = useMemo(() => {
    if (!kickoffNotesCombined) return [] as Array<{ domain: string; scenarioId: string; useCaseTitle: string; functionName: string; why: string; score: number }>;

    const noteTokenSet = new Set(tokenize(kickoffNotesCombined));
    const prioritizedDomains = companySelectedDomains.length
      ? companySelectedDomains
      : Array.from(new Set(selectedKickoffUseCases.map((scenario) => scenario.domain || 'General')));

    return prioritizedDomains
      .flatMap((domain) => {
        const domainUseCases = selectedKickoffUseCases
          .filter((scenario) => (scenario.domain || 'General') === domain)
          .slice(0, 8);

        return domainUseCases.map((scenario) => {
          const scenarioTokens = tokenize(`${scenario.title} ${scenario.process || ''} ${scenario.description || ''}`);
          const matchedKeywords = Array.from(new Set(scenarioTokens.filter((token) => noteTokenSet.has(token))));
          const score = matchedKeywords.length;
          const why = matchedKeywords.length > 0
            ? `Kickoff notes repeatedly reference ${matchedKeywords.slice(0, 4).join(', ')}, which aligns with this use case.`
            : `This use case supports the ${domain} domain priority discussed during kickoff and is a strong candidate for high-level validation.`;

          return {
            domain,
            scenarioId: scenario.id,
            useCaseTitle: scenario.title,
            functionName: scenario.process || 'General Function',
            why,
            score
          };
        });
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 12);
  }, [kickoffNotesCombined, companySelectedDomains, selectedKickoffUseCases]);

  const phase2UseCases = useMemo(
    () => allLibraryTrainingUseCases.filter((scenario) => {
      if (scenario.type !== 'TRAINING') return false;
      if (!phase2SelectedDomains.length) return true;
      return !!scenario.domain && phase2SelectedDomains.includes(scenario.domain);
    }),
    [allLibraryTrainingUseCases, phase2SelectedDomains]
  );

  const recommendedScenarioIds = useMemo(
    () => new Set(hypothesisBreakdown.map((item) => item.scenarioId)),
    [hypothesisBreakdown]
  );

  const selectedPhase2UseCases = useMemo(
    () => allLibraryTrainingUseCases.filter((scenario) => phase2SelectedUseCases.includes(scenario.id)),
    [allLibraryTrainingUseCases, phase2SelectedUseCases]
  );

  const selectedFunctionalMeeting = useMemo(
    () => functionalHighLevelMeetings.find((meeting) => meeting.id === selectedFunctionalMeetingId) || null,
    [functionalHighLevelMeetings, selectedFunctionalMeetingId]
  );

  const selectedDeepDiveMeeting = useMemo(
    () => functionalDeepDiveMeetings.find((meeting) => meeting.id === selectedDeepDiveMeetingId) || null,
    [functionalDeepDiveMeetings, selectedDeepDiveMeetingId]
  );

  const functionalHighLevelNotesCombined = useMemo(
    () => functionalHighLevelMeetings
      .flatMap((meeting) => [
        `${meeting.domain} ${meeting.functionName}`,
        ...(meeting.notes || []).map((note) => note.content || '')
      ])
      .join('\n\n')
      .trim(),
    [functionalHighLevelMeetings]
  );

  const deepDiveNotesSummary = useMemo(() => {
    if (!functionalHighLevelNotesCombined) return [] as string[];
    const candidateSentences = functionalHighLevelNotesCombined
      .replace(/\s+/g, ' ')
      .split(/(?<=[.!?])\s+/)
      .map((sentence) => sentence.trim())
      .filter((sentence) => sentence.length > 35);

    const unique: string[] = [];
    for (const sentence of candidateSentences) {
      const normalized = sentence.toLowerCase();
      if (!unique.some((item) => item.toLowerCase() === normalized)) {
        unique.push(sentence);
      }
      if (unique.length >= 5) break;
    }
    return unique;
  }, [functionalHighLevelNotesCombined]);

  const deepDiveSourceUseCases = useMemo(
    () => (selectedPhase2UseCases.length > 0 ? selectedPhase2UseCases : selectedKickoffUseCases),
    [selectedPhase2UseCases, selectedKickoffUseCases]
  );

  const deepDiveHypothesisBreakdown = useMemo(() => {
    if (!functionalHighLevelNotesCombined) return [] as Array<{ domain: string; scenarioId: string; useCaseTitle: string; functionName: string; why: string; score: number }>;

    const noteTokenSet = new Set(tokenize(functionalHighLevelNotesCombined));
    const prioritizedDomains = deepDiveSelectedDomains.length
      ? deepDiveSelectedDomains
      : (phase2SelectedDomains.length ? phase2SelectedDomains : Array.from(new Set(deepDiveSourceUseCases.map((scenario) => scenario.domain || 'General'))));

    return prioritizedDomains
      .flatMap((domain) => {
        const domainUseCases = deepDiveSourceUseCases
          .filter((scenario) => (scenario.domain || 'General') === domain)
          .slice(0, 8);

        return domainUseCases.map((scenario) => {
          const scenarioTokens = tokenize(`${scenario.title} ${scenario.process || ''} ${scenario.description || ''}`);
          const matchedKeywords = Array.from(new Set(scenarioTokens.filter((token) => noteTokenSet.has(token))));
          const score = matchedKeywords.length;
          const why = matchedKeywords.length > 0
            ? `Functional high-level notes repeatedly reference ${matchedKeywords.slice(0, 4).join(', ')}, indicating deep-dive priority.`
            : `This use case is aligned with functional high-level findings and should be validated in deep dive sessions.`;

          return {
            domain,
            scenarioId: scenario.id,
            useCaseTitle: scenario.title,
            functionName: scenario.process || 'General Function',
            why,
            score
          };
        });
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 12);
  }, [functionalHighLevelNotesCombined, deepDiveSelectedDomains, phase2SelectedDomains, deepDiveSourceUseCases]);

  const deepDiveUseCases = useMemo(
    () => allLibraryTrainingUseCases.filter((scenario) => {
      if (scenario.type !== 'TRAINING') return false;
      if (!deepDiveSelectedDomains.length) return true;
      return !!scenario.domain && deepDiveSelectedDomains.includes(scenario.domain);
    }),
    [allLibraryTrainingUseCases, deepDiveSelectedDomains]
  );

  const deepDiveRecommendedScenarioIds = useMemo(
    () => new Set(deepDiveHypothesisBreakdown.map((item) => item.scenarioId)),
    [deepDiveHypothesisBreakdown]
  );

  const selectedDeepDiveUseCases = useMemo(
    () => allLibraryTrainingUseCases.filter((scenario) => deepDiveSelectedUseCases.includes(scenario.id)),
    [allLibraryTrainingUseCases, deepDiveSelectedUseCases]
  );

  const customStepDocumentOptions = useMemo(() => {
    const byId = new Map<string, { id: string; label: string }>();
    const researchDocuments = activeResearch?.documents || [];

    [...researchDocuments, ...draftDocuments].forEach((doc) => {
      if (!doc?.id) return;
      if (byId.has(doc.id)) return;
      byId.set(doc.id, {
        id: doc.id,
        label: doc.fileName || 'Untitled document'
      });
    });

    return Array.from(byId.values());
  }, [activeResearch?.documents, draftDocuments]);

  const customStepTranscriptOptions = useMemo(() => {
    const options: Array<{ id: string; label: string }> = [];

    draftTranscripts.forEach((transcript, index) => {
      const preview = transcript.trim().slice(0, 70);
      options.push({
        id: `draft-transcript-${index}`,
        label: preview ? `Draft transcript ${index + 1}: ${preview}${transcript.length > 70 ? '…' : ''}` : `Draft transcript ${index + 1}`
      });
    });

    kickoffMeetingNotes.forEach((note) => {
      options.push({
        id: `kickoff-${note.id}`,
        label: `Kickoff: ${note.fileName || 'Meeting note'}`
      });
    });

    functionalHighLevelMeetings.forEach((meeting) => {
      (meeting.notes || []).forEach((note) => {
        options.push({
          id: `fhl-${meeting.id}-${note.id}`,
          label: `${meeting.domain} / ${meeting.functionName}: ${note.fileName || 'Meeting note'}`
        });
      });
    });

    return options;
  }, [draftTranscripts, kickoffMeetingNotes, functionalHighLevelMeetings]);

  const customStepDocumentLabelMap = useMemo(
    () => new Map(customStepDocumentOptions.map((item) => [item.id, item.label])),
    [customStepDocumentOptions]
  );

  const geminiModelOptions = useMemo(
    () => AI_MODELS.filter((model) => model.provider === 'google'),
    []
  );

  const customStepTranscriptLabelMap = useMemo(
    () => new Map(customStepTranscriptOptions.map((item) => [item.id, item.label])),
    [customStepTranscriptOptions]
  );

  useEffect(() => {
    if (functionalHighLevelMeetings.length > 0 || selectedPhase2UseCases.length === 0) return;
    const seededMeetings: FunctionalHighLevelMeeting[] = selectedPhase2UseCases.slice(0, 6).map((useCase, index) => ({
      id: `fhl-${Date.now()}-${index}`,
      domain: useCase.domain || 'General',
      functionName: useCase.process || useCase.title,
      presentationUrl: '',
      notes: [],
      createdAt: Date.now(),
      updatedAt: Date.now()
    }));
    setFunctionalHighLevelMeetings(seededMeetings);
    setSelectedFunctionalMeetingId(seededMeetings[0]?.id || null);
  }, [functionalHighLevelMeetings.length, selectedPhase2UseCases]);

  useEffect(() => {
    if (functionalDeepDiveMeetings.length > 0 || selectedDeepDiveUseCases.length === 0) return;
    const seededMeetings: FunctionalHighLevelMeeting[] = selectedDeepDiveUseCases.slice(0, 6).map((useCase, index) => ({
      id: `fdd-${Date.now()}-${index}`,
      domain: useCase.domain || 'General',
      functionName: useCase.process || useCase.title,
      presentationUrl: '',
      notes: [],
      createdAt: Date.now(),
      updatedAt: Date.now()
    }));
    setFunctionalDeepDiveMeetings(seededMeetings);
    setSelectedDeepDiveMeetingId(seededMeetings[0]?.id || null);
  }, [functionalDeepDiveMeetings.length, selectedDeepDiveUseCases]);

  useEffect(() => {
    if (!deepDiveSelectedDomains.length && phase2SelectedDomains.length > 0) {
      setDeepDiveSelectedDomains(phase2SelectedDomains);
    }
    if (!deepDiveSelectedUseCases.length && phase2SelectedUseCases.length > 0) {
      setDeepDiveSelectedUseCases(phase2SelectedUseCases);
    }
  }, [deepDiveSelectedDomains.length, deepDiveSelectedUseCases.length, phase2SelectedDomains, phase2SelectedUseCases]);

  useEffect(() => {
    if (!companyId || isSavingKickoffPresentationUrl || !kickoffUrlDirtyRef.current) return;
    const timer = window.setTimeout(() => {
      kickoffUrlDirtyRef.current = false;
      handleSaveKickoffPresentationUrl();
    }, 700);
    return () => window.clearTimeout(timer);
  }, [companyId, selectedJourneyId, kickoffPresentationUrl, isSavingKickoffPresentationUrl]);

  useEffect(() => {
    if (!companyId || !kickoffTargetsDirtyRef.current) return;
    const timer = window.setTimeout(() => {
      kickoffTargetsDirtyRef.current = false;
      handleSaveKickoffTargets();
    }, 700);
    return () => window.clearTimeout(timer);
  }, [companyId, selectedJourneyId, companySelectedDomains, companySelectedScenarios]);

  useEffect(() => {
    if (!companyId || !selectedStepDirtyRef.current || !selectedStepId) return;
    const timer = window.setTimeout(() => {
      selectedStepDirtyRef.current = false;
      handleSaveCurrentJourneyStep(selectedStepId);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [companyId, selectedJourneyId, selectedStepId]);

  useEffect(() => {
    if (!companyId || !journeyStepOverridesDirtyRef.current) return;
    const timer = window.setTimeout(() => {
      journeyStepOverridesDirtyRef.current = false;
      handleSaveJourneyStepOverrides();
    }, 400);
    return () => window.clearTimeout(timer);
  }, [companyId, selectedJourneyId, journeyStepOverrides]);

  useEffect(() => {
    if (!companyId || isSavingKickoffMeetingNotes || !kickoffNotesDirtyRef.current) return;
    const timer = window.setTimeout(() => {
      kickoffNotesDirtyRef.current = false;
      handleSaveKickoffMeetingNotes();
    }, 700);
    return () => window.clearTimeout(timer);
  }, [companyId, selectedJourneyId, kickoffMeetingNotes, isSavingKickoffMeetingNotes]);

  useEffect(() => {
    if (!companyId || isSavingPhase2Targets || !phase2TargetsDirtyRef.current) return;
    const timer = window.setTimeout(() => {
      phase2TargetsDirtyRef.current = false;
      handleSavePhase2Targets();
    }, 700);
    return () => window.clearTimeout(timer);
  }, [companyId, selectedJourneyId, phase2SelectedDomains, phase2SelectedUseCases, isSavingPhase2Targets]);

  useEffect(() => {
    if (!companyId || isSavingFunctionalMeetings || !functionalMeetingsDirtyRef.current) return;
    const timer = window.setTimeout(() => {
      functionalMeetingsDirtyRef.current = false;
      handleSaveFunctionalMeetings();
    }, 700);
    return () => window.clearTimeout(timer);
  }, [companyId, selectedJourneyId, functionalHighLevelMeetings, isSavingFunctionalMeetings]);

  useEffect(() => {
    if (!companyId || isSavingDeepDiveMeetings || !deepDiveMeetingsDirtyRef.current) return;
    const timer = window.setTimeout(() => {
      deepDiveMeetingsDirtyRef.current = false;
      handleSaveDeepDiveMeetings();
    }, 700);
    return () => window.clearTimeout(timer);
  }, [companyId, selectedJourneyId, functionalDeepDiveMeetings, isSavingDeepDiveMeetings]);

  useEffect(() => {
    if (!companyId || isSavingDeepDiveTargets || !deepDiveTargetsDirtyRef.current) return;
    const timer = window.setTimeout(() => {
      deepDiveTargetsDirtyRef.current = false;
      handleSaveDeepDiveTargets();
    }, 700);
    return () => window.clearTimeout(timer);
  }, [companyId, selectedJourneyId, deepDiveSelectedDomains, deepDiveSelectedUseCases, isSavingDeepDiveTargets]);

  const buildKickoffPresentationPrompt = (
    selectedUseCases: Array<(typeof ALL_SCENARIOS)[number]>,
    selectedDomains: string[],
    templateReference?: UploadedDocument | null
  ): string => {
    const targetDomains = selectedDomains.length
      ? selectedDomains
      : Array.from(new Set(selectedUseCases.map((item) => item.domain || 'General')));

    const workflowsByDomain = targetDomains.map((domain) => {
      const useCases = selectedUseCases.filter((item) => (item.domain || 'General') === domain);
      return {
        domain,
        useCases
      };
    });

    const domainSlides = workflowsByDomain
      .filter((item) => item.useCases.length > 0)
      .map(({ domain, useCases }) => `
## ${domain}

| Priority | Core Process | Potential Agentic AI Use Cases | Detailed Use Case Description |
|----------|--------------|--------------------------------|-------------------------------|
${useCases.map((useCase, idx) => `| ${idx + 1} | ${useCase.process || useCase.title} | ${useCase.title} | ${(useCase.description || '').substring(0, 180)}... |`).join('\n')}

### Value
${domain} has strong kickoff potential with ${useCases.length} targeted process use case${useCases.length === 1 ? '' : 's'} selected for early stakeholder alignment.

### Feasibility
These use cases are sourced from the scenario library and can be positioned as practical near-term opportunities for pilot initiatives.

### Readiness
Readiness is moderate-to-high for kickoff discussions, with clear process narratives and candidate use cases to prioritize.
`).join('\n\n---\n\n');

    const templateGuidance = templateReference
  ? `
---

## Example Deck Style Reference

Use the uploaded example presentation as the design and storytelling baseline.

- Reference file: ${templateReference.fileName}
- Match the example's slide flow, section ordering, heading style, and tone.
- Keep formatting concise and executive-ready.
- If uncertainty exists, prioritize consistency with the example deck over novelty.

### Extracted Reference Notes
${(templateReference.content || '').substring(0, 2000) || 'No extractable text was found in the file. Use filename + expected visual style as reference.'}
`
  : '';

    return `
# Phase 1: Art of the Possible - Kickoff Presentation
## AI Automation Opportunity Assessment for ${companyName || pendingCompanyName || 'Selected Company'}

---

## Executive Summary

This kickoff presentation outlines target domains and process use cases to prioritize with stakeholders.

**Company Overview:**
- Industry: ${activeResearch?.industry || 'Not specified'}
- Market Position: ${activeResearch?.marketPosition || 'Not specified'}
- AI Relevance: ${activeResearch?.aiRelevance?.current || 'Pending'}

---

## Target Business Domains

${targetDomains.map((domain) => `- **${domain}**`).join('\n')}

---

${templateGuidance}

${domainSlides}

---

## Kickoff Recommendations

1. Confirm top 2-3 domains for initial focus
2. Prioritize selected process use cases by business impact and feasibility
3. Align sponsors, owners, and expected outcomes for pilot execution
4. Define immediate next steps for post-kickoff deep dive sessions

---

## Next Steps & Contact

**Company:** ${companyName || pendingCompanyName || 'Selected Company'}
**Date:** ${new Date().toLocaleDateString()}
**Phase:** 1 - Art of the Possible (Kickoff)
`.trim();
  };

  const handleToggleDomain = (domain: string) => {
    const nextDomains = companySelectedDomains.includes(domain)
      ? companySelectedDomains.filter((item) => item !== domain)
      : [...companySelectedDomains, domain];

    setCompanySelectedDomains(nextDomains);

    const validScenarioIds = new Set(
      allLibraryTrainingUseCases
        .filter((scenario) => scenario.type === 'TRAINING' && (!nextDomains.length || (scenario.domain && nextDomains.includes(scenario.domain))))
        .map((scenario) => scenario.id)
    );
    const nextSelectedScenarios = companySelectedScenarios.filter((id) => validScenarioIds.has(id));
    if (nextSelectedScenarios.length !== companySelectedScenarios.length) {
      setCompanySelectedScenarios(nextSelectedScenarios);
    }

    kickoffTargetsDirtyRef.current = true;
  };

  const handleToggleKickoffUseCase = (scenarioId: string) => {
    const next = companySelectedScenarios.includes(scenarioId)
      ? companySelectedScenarios.filter((id) => id !== scenarioId)
      : [...companySelectedScenarios, scenarioId];
    setCompanySelectedScenarios(next);
    kickoffTargetsDirtyRef.current = true;
  };

  const handleOpenCreateUseCaseModal = (domain: string, source: UseCaseCreateSource) => {
    setCreateUseCaseDomain(domain || 'General');
    setCreateUseCaseSource(source);
    setIsCreateUseCaseModalOpen(true);
  };

  const handleCreateUseCase = async (data: ScenarioFormPayload) => {
    const { title, description, goal, domain, title_es, description_es, goal_es, process, valueDrivers, painPoints, currentWorkflowImage } = data;

    const newScenario = await saveUserScenario(user.uid, {
      title,
      description,
      goal,
      domain: domain || 'General',
      title_es,
      description_es,
      goal_es,
      process,
      valueDrivers,
      painPoints,
      currentWorkflowImage: currentWorkflowImage ? URL.createObjectURL(currentWorkflowImage) : undefined
    });

    setLibraryUseCases((prev) => {
      if (prev.some((scenario) => scenario.id === newScenario.id)) return prev;
      return [newScenario, ...prev];
    });

    const scenarioDomain = newScenario.domain || 'General';

    if (createUseCaseSource === 'kickoff') {
      setCompanySelectedDomains((prev) => (prev.includes(scenarioDomain) ? prev : [...prev, scenarioDomain]));
      setCompanySelectedScenarios((prev) => (prev.includes(newScenario.id) ? prev : [...prev, newScenario.id]));
      kickoffTargetsDirtyRef.current = true;
    } else if (createUseCaseSource === 'phase2') {
      setPhase2SelectedDomains((prev) => (prev.includes(scenarioDomain) ? prev : [...prev, scenarioDomain]));
      setPhase2SelectedUseCases((prev) => (prev.includes(newScenario.id) ? prev : [...prev, newScenario.id]));
      phase2TargetsDirtyRef.current = true;
      setPhase2TargetsStatus('New use case created and selected.');
    } else {
      setDeepDiveSelectedDomains((prev) => (prev.includes(scenarioDomain) ? prev : [...prev, scenarioDomain]));
      setDeepDiveSelectedUseCases((prev) => (prev.includes(newScenario.id) ? prev : [...prev, newScenario.id]));
      deepDiveTargetsDirtyRef.current = true;
      setDeepDiveTargetsStatus('New use case created and selected.');
    }
  };

  const handleCreateKickoffPresentationPrompt = () => {
    if (!activeResearch || selectedKickoffUseCases.length === 0) return;
    const promptText = buildKickoffPresentationPrompt(selectedKickoffUseCases, companySelectedDomains, kickoffTemplateReference);

    setKickoffPrompt(promptText);
    setShowKickoffPromptModal(true);
  };

  const handleSaveKickoffTargets = async () => {
    if (!companyId) return;

    try {
      await updateCompanyJourneyStatus(
        companyId,
        user.uid,
        {
          kickoffSelectedDomains: companySelectedDomains,
          kickoffSelectedUseCases: companySelectedScenarios
        },
        selectedJourneyId || undefined
      );

      if (selectedJourneyId) {
        setJourneys((prev) => ({
          ...prev,
          [selectedJourneyId]: {
            ...prev[selectedJourneyId],
            kickoffSelectedDomains: companySelectedDomains,
            kickoffSelectedUseCases: companySelectedScenarios,
            updatedAt: Date.now()
          }
        }));
      }
    } catch (error) {
      console.error('Failed to save kickoff target selections:', error);
    }
  };

  const handleSaveCurrentJourneyStep = async (stepId: string) => {
    if (!companyId) return;

    try {
      await updateCompanyJourneyStatus(
        companyId,
        user.uid,
        { currentStepId: stepId },
        selectedJourneyId || undefined
      );

      if (selectedJourneyId) {
        setJourneys((prev) => ({
          ...prev,
          [selectedJourneyId]: {
            ...prev[selectedJourneyId],
            currentStepId: stepId,
            updatedAt: Date.now()
          }
        }));
      }
    } catch (error) {
      console.error('Failed to save current journey step:', error);
    }
  };

  const handleSaveJourneyStepOverrides = async () => {
    if (!companyId) return;
    setIsSavingJourneyStepOverrides(true);
    try {
      await updateCompanyJourneyStatus(
        companyId,
        user.uid,
        { journeyStepSettings: journeyStepOverrides },
        selectedJourneyId || undefined
      );

      if (selectedJourneyId) {
        setJourneys((prev) => ({
          ...prev,
          [selectedJourneyId]: {
            ...prev[selectedJourneyId],
            journeyStepSettings: journeyStepOverrides,
            updatedAt: Date.now()
          }
        }));
      }
      setJourneyStepOverridesStatus('Journey step visibility updated.');
    } catch (error) {
      console.error('Failed to save journey step visibility settings:', error);
      setJourneyStepOverridesStatus('Failed to save journey step visibility settings.');
    } finally {
      setIsSavingJourneyStepOverrides(false);
    }
  };

  const handleToggleJourneyStepVisibility = (settingKey: JourneyStepKey, enabled: boolean) => {
    if (settingKey === 'companyResearch') return;
    const defaultValue = !!journeyStepSettings[settingKey];
    const nextOverrides = { ...journeyStepOverrides };
    if (enabled === defaultValue) {
      delete nextOverrides[settingKey];
    } else {
      nextOverrides[settingKey] = enabled;
    }
    setJourneyStepOverrides(nextOverrides);
    setJourneyStepOverridesStatus(null);
    journeyStepOverridesDirtyRef.current = true;
  };

  const handleLoadSharePointPresentations = async () => {
    if (!collaborationConfig?.sharePointFolder) {
      setSharePointPresentationOptions([]);
      setKickoffTemplateStatus('Configure a SharePoint folder in Collaboration first.');
      return;
    }

    const graphAccessToken = (import.meta.env.VITE_MICROSOFT_GRAPH_ACCESS_TOKEN as string | undefined) || undefined;
    if (!graphAccessToken) {
      setSharePointPresentationOptions([]);
      setKickoffTemplateStatus('Missing Microsoft Graph token. Set VITE_MICROSOFT_GRAPH_ACCESS_TOKEN to list SharePoint presentations.');
      return;
    }

    setIsSavingKickoffTemplateReference(true);
    setKickoffTemplateStatus(null);

    try {
      const docs = await getSharePointFolderDocuments(collaborationConfig.sharePointFolder, graphAccessToken);
      const deckDocs = docs.filter((doc) => {
        const lower = (doc.fileName || '').toLowerCase();
        return lower.endsWith('.ppt') || lower.endsWith('.pptx');
      });
      setSharePointPresentationOptions(deckDocs);
      setKickoffTemplateStatus(
        deckDocs.length > 0
          ? `Loaded ${deckDocs.length} PowerPoint file${deckDocs.length === 1 ? '' : 's'} from SharePoint.`
          : 'No PowerPoint files were found in the configured SharePoint folder.'
      );
    } catch (error) {
      console.error('Failed to load SharePoint presentations:', error);
      setSharePointPresentationOptions([]);
      setKickoffTemplateStatus('Failed to load presentations from SharePoint folder.');
    } finally {
      setIsSavingKickoffTemplateReference(false);
    }
  };

  const handleUseSharePointPresentationAsTemplate = async (doc: UploadedDocument) => {
    if (!companyId || isSavingKickoffTemplateReference) return;
    setIsSavingKickoffTemplateReference(true);
    setKickoffTemplateStatus(null);

    try {
      const templateReference: UploadedDocument = {
        id: doc.id || `kickoff-template-${Date.now()}`,
        fileName: doc.fileName,
        content: sanitizeTemplateText(doc.content || ''),
        uploadedAt: Date.now(),
        url: doc.url,
        path: doc.path,
      };

      await updateCompanyJourneyStatus(
        companyId,
        user.uid,
        { kickoffTemplateReference: templateReference },
        selectedJourneyId || undefined
      );

      if (selectedJourneyId) {
        setJourneys((prev) => ({
          ...prev,
          [selectedJourneyId]: {
            ...prev[selectedJourneyId],
            kickoffTemplateReference: templateReference,
            updatedAt: Date.now()
          }
        }));
      }

      setKickoffTemplateReference(templateReference);
      setKickoffTemplateStatus(`Using '${templateReference.fileName}' as kickoff presentation style reference.`);
    } catch (error) {
      console.error('Failed to set kickoff template reference:', error);
      setKickoffTemplateStatus('Failed to set selected SharePoint presentation as style reference.');
    } finally {
      setIsSavingKickoffTemplateReference(false);
    }
  };

  const handleRemoveKickoffTemplateReference = async () => {
    if (!companyId || isSavingKickoffTemplateReference) return;
    setIsSavingKickoffTemplateReference(true);
    setKickoffTemplateStatus(null);

    try {
      await updateCompanyJourneyStatus(
        companyId,
        user.uid,
        { kickoffTemplateReference: null },
        selectedJourneyId || undefined
      );

      if (selectedJourneyId) {
        setJourneys((prev) => ({
          ...prev,
          [selectedJourneyId]: {
            ...prev[selectedJourneyId],
            kickoffTemplateReference: null,
            updatedAt: Date.now()
          }
        }));
      }

      setKickoffTemplateReference(null);
      setKickoffTemplateStatus('Example presentation removed.');
    } catch (error) {
      console.error('Failed to remove kickoff template reference:', error);
      setKickoffTemplateStatus('Failed to remove example presentation. Please try again.');
    } finally {
      setIsSavingKickoffTemplateReference(false);
    }
  };

  const handleSaveKickoffPresentationUrl = async () => {
    if (!companyId || isSavingKickoffPresentationUrl) return;
    setIsSavingKickoffPresentationUrl(true);
    setKickoffUrlStatus(null);
    try {
      const normalizedUrl = kickoffPresentationUrl.trim();
      await updateCompanyJourneyStatus(
        companyId,
        user.uid,
        { kickoffPresentationUrl: normalizedUrl },
        selectedJourneyId || undefined
      );

      if (selectedJourneyId) {
        setJourneys((prev) => ({
          ...prev,
          [selectedJourneyId]: {
            ...prev[selectedJourneyId],
            kickoffPresentationUrl: normalizedUrl,
            updatedAt: Date.now()
          }
        }));
      }

      setKickoffUrlStatus(normalizedUrl ? 'Kickoff presentation URL auto-saved.' : 'Kickoff presentation URL cleared.');
    } catch (error) {
      console.error('Failed to save kickoff presentation URL:', error);
      setKickoffUrlStatus('Failed to save kickoff presentation URL. Please try again.');
    } finally {
      setIsSavingKickoffPresentationUrl(false);
    }
  };

  const handleSaveCollaborationConfig = async (config: JourneyCollaborationConfig) => {
    if (!companyId || isSavingCollaborationConfig) return;
    setIsSavingCollaborationConfig(true);
    setCollaborationConfigStatus(null);
    try {
      await updateCompanyJourneyStatus(
        companyId,
        user.uid,
        { 
          collaborationConfig: config,
          collaborationConfigComplete: true 
        },
        selectedJourneyId || undefined
      );

      if (selectedJourneyId) {
        setJourneys((prev) => ({
          ...prev,
          [selectedJourneyId]: {
            ...prev[selectedJourneyId],
            collaborationConfig: config,
            collaborationConfigComplete: true,
            updatedAt: Date.now()
          }
        }));
      }

      setCollaborationConfig(config);
      setCollaborationConfigStatus('Collaboration configuration saved successfully.');
      setIsCollaborationConfigComplete(true);
    } catch (error) {
      console.error('Failed to save collaboration configuration:', error);
      setCollaborationConfigStatus('Failed to save collaboration configuration. Please try again.');
    } finally {
      setIsSavingCollaborationConfig(false);
    }
  };

  const handleKickoffMeetingUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setKickoffNotesStatus(null);
    const uploadedNotes: UploadedDocument[] = [];
    const uploadWarnings: string[] = [];

    await Promise.all(
      Array.from(files).map((file) =>
        new Promise<void>(async (resolve) => {
          try {
            let content = '';
            const lowerName = file.name.toLowerCase();
            const isPdf = file.type === 'application/pdf' || lowerName.endsWith('.pdf');
            const isDocx = file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || lowerName.endsWith('.docx');

            if (isPdf) {
              content = await extractTextFromPDF(file);
            } else if (isDocx) {
              content = await extractTextFromDocx(file);
            } else {
              content = await file.text();
            }

            uploadedNotes.push({
              id: `${file.name}-${Date.now()}`,
              content,
              fileName: file.name,
              uploadedAt: Date.now()
            });
          } catch (error) {
            console.error('Failed to parse kickoff meeting note file:', file.name, error);
            uploadWarnings.push(`${file.name}: ${error instanceof Error ? error.message : 'Failed to parse file'}`);
          } finally {
            resolve();
          }
        })
      )
    );

    if (uploadedNotes.length > 0) {
      setKickoffMeetingNotes((prev) => [...prev, ...uploadedNotes]);
      kickoffNotesDirtyRef.current = true;
    }

    if (uploadWarnings.length > 0) {
      setKickoffNotesStatus(`Some files could not be processed: ${uploadWarnings.slice(0, 2).join(' • ')}`);
    } else if (uploadedNotes.length > 0) {
      setKickoffNotesStatus(`Added ${uploadedNotes.length} meeting note file${uploadedNotes.length === 1 ? '' : 's'}.`);
    }
  };

  const handleAddKickoffMeetingNote = () => {
    if (!newKickoffMeetingNote.trim()) return;
    const nextNote: UploadedDocument = {
      id: `kickoff-note-${Date.now()}`,
      content: newKickoffMeetingNote.trim(),
      fileName: `Pasted Kickoff Note ${kickoffMeetingNotes.length + 1}.txt`,
      uploadedAt: Date.now()
    };
    setKickoffMeetingNotes((prev) => [...prev, nextNote]);
    kickoffNotesDirtyRef.current = true;
    setNewKickoffMeetingNote('');
    setKickoffNotesStatus(null);
  };

  const handleSaveKickoffMeetingNotes = async () => {
    if (!companyId || isSavingKickoffMeetingNotes) return;
    setIsSavingKickoffMeetingNotes(true);
    setKickoffNotesStatus(null);
    try {
      await updateCompanyJourneyStatus(
        companyId,
        user.uid,
        { kickoffMeetingNotes },
        selectedJourneyId || undefined
      );

      if (selectedJourneyId) {
        setJourneys((prev) => ({
          ...prev,
          [selectedJourneyId]: {
            ...prev[selectedJourneyId],
            kickoffMeetingNotes,
            updatedAt: Date.now()
          }
        }));
      }

      setKickoffNotesStatus('Kickoff meeting notes auto-saved.');
    } catch (error) {
      console.error('Failed to save kickoff meeting notes:', error);
      setKickoffNotesStatus('Failed to save kickoff meeting notes. Please try again.');
    } finally {
      setIsSavingKickoffMeetingNotes(false);
    }
  };

  const handleTogglePhase2Domain = (domain: string) => {
    const nextDomains = phase2SelectedDomains.includes(domain)
      ? phase2SelectedDomains.filter((item) => item !== domain)
      : [...phase2SelectedDomains, domain];

    setPhase2SelectedDomains(nextDomains);
    setPhase2SelectedUseCases((prev) => {
      const allowed = new Set(
        allLibraryTrainingUseCases
          .filter((scenario) => scenario.type === 'TRAINING' && (!nextDomains.length || (scenario.domain && nextDomains.includes(scenario.domain))))
          .map((scenario) => scenario.id)
      );
      return prev.filter((id) => allowed.has(id));
    });
    phase2TargetsDirtyRef.current = true;
    setPhase2TargetsStatus(null);
  };

  const handleTogglePhase2UseCase = (scenarioId: string) => {
    setPhase2SelectedUseCases((prev) => (
      prev.includes(scenarioId)
        ? prev.filter((id) => id !== scenarioId)
        : [...prev, scenarioId]
    ));
    phase2TargetsDirtyRef.current = true;
    setPhase2TargetsStatus(null);
  };

  const handleSavePhase2Targets = async () => {
    if (!companyId || isSavingPhase2Targets) return;
    setIsSavingPhase2Targets(true);
    setPhase2TargetsStatus(null);
    try {
      await updateCompanyJourneyStatus(
        companyId,
        user.uid,
        {
          phase2SelectedDomains,
          phase2SelectedUseCases
        },
        selectedJourneyId || undefined
      );

      if (selectedJourneyId) {
        setJourneys((prev) => ({
          ...prev,
          [selectedJourneyId]: {
            ...prev[selectedJourneyId],
            phase2SelectedDomains,
            phase2SelectedUseCases,
            updatedAt: Date.now()
          }
        }));
      }

      setPhase2TargetsStatus('Phase 2 targeting auto-saved.');
    } catch (error) {
      console.error('Failed to save phase 2 targeting:', error);
      setPhase2TargetsStatus('Failed to save phase 2 targeting. Please try again.');
    } finally {
      setIsSavingPhase2Targets(false);
    }
  };

  const handleCreatePhase2PresentationPrompt = () => {
    if (!activeResearch || selectedPhase2UseCases.length === 0) return;
    const promptText = buildKickoffPresentationPrompt(selectedPhase2UseCases, phase2SelectedDomains, kickoffTemplateReference);
    setKickoffPrompt(promptText);
    setShowKickoffPromptModal(true);
  };

  const handleToggleDeepDiveDomain = (domain: string) => {
    const nextDomains = deepDiveSelectedDomains.includes(domain)
      ? deepDiveSelectedDomains.filter((item) => item !== domain)
      : [...deepDiveSelectedDomains, domain];

    setDeepDiveSelectedDomains(nextDomains);
    setDeepDiveSelectedUseCases((prev) => {
      const allowed = new Set(
        allLibraryTrainingUseCases
          .filter((scenario) => scenario.type === 'TRAINING' && (!nextDomains.length || (scenario.domain && nextDomains.includes(scenario.domain))))
          .map((scenario) => scenario.id)
      );
      return prev.filter((id) => allowed.has(id));
    });
    deepDiveTargetsDirtyRef.current = true;
    setDeepDiveTargetsStatus(null);
  };

  const handleToggleDeepDiveUseCase = (scenarioId: string) => {
    setDeepDiveSelectedUseCases((prev) => (
      prev.includes(scenarioId)
        ? prev.filter((id) => id !== scenarioId)
        : [...prev, scenarioId]
    ));
    deepDiveTargetsDirtyRef.current = true;
    setDeepDiveTargetsStatus(null);
  };

  const handleSaveDeepDiveTargets = async () => {
    if (!companyId || isSavingDeepDiveTargets) return;
    setIsSavingDeepDiveTargets(true);
    setDeepDiveTargetsStatus(null);
    try {
      await updateCompanyJourneyStatus(
        companyId,
        user.uid,
        {
          deepDiveSelectedDomains,
          deepDiveSelectedUseCases
        },
        selectedJourneyId || undefined
      );

      if (selectedJourneyId) {
        setJourneys((prev) => ({
          ...prev,
          [selectedJourneyId]: {
            ...prev[selectedJourneyId],
            deepDiveSelectedDomains,
            deepDiveSelectedUseCases,
            updatedAt: Date.now()
          }
        }));
      }

      setDeepDiveTargetsStatus('Deep dive targets auto-saved.');
    } catch (error) {
      console.error('Failed to save deep dive targets:', error);
      setDeepDiveTargetsStatus('Failed to save deep dive targets. Please try again.');
    } finally {
      setIsSavingDeepDiveTargets(false);
    }
  };

  const handleCreateDeepDivePresentationPrompt = () => {
    if (!activeResearch || selectedDeepDiveUseCases.length === 0) return;
    const promptText = buildKickoffPresentationPrompt(
      selectedDeepDiveUseCases,
      deepDiveSelectedDomains,
      deepDiveTemplateReference || kickoffTemplateReference
    );
    setKickoffPrompt(promptText);
    setShowKickoffPromptModal(true);
  };

  const handleLoadDeepDiveSharePointPresentations = async () => {
    if (!collaborationConfig?.sharePointFolder) {
      setDeepDiveSharePointPresentationOptions([]);
      setDeepDiveTemplateStatus('Configure a SharePoint folder in Collaboration first.');
      return;
    }

    const graphAccessToken = (import.meta.env.VITE_MICROSOFT_GRAPH_ACCESS_TOKEN as string | undefined) || undefined;
    if (!graphAccessToken) {
      setDeepDiveSharePointPresentationOptions([]);
      setDeepDiveTemplateStatus('Missing Microsoft Graph token. Set VITE_MICROSOFT_GRAPH_ACCESS_TOKEN to list SharePoint presentations.');
      return;
    }

    setIsLoadingDeepDiveSharePointPresentations(true);
    setDeepDiveTemplateStatus(null);

    try {
      const docs = await getSharePointFolderDocuments(collaborationConfig.sharePointFolder, graphAccessToken);
      const deckDocs = docs.filter((doc) => {
        const lower = (doc.fileName || '').toLowerCase();
        return lower.endsWith('.ppt') || lower.endsWith('.pptx');
      });
      setDeepDiveSharePointPresentationOptions(deckDocs);
      setDeepDiveTemplateStatus(
        deckDocs.length > 0
          ? `Loaded ${deckDocs.length} PowerPoint file${deckDocs.length === 1 ? '' : 's'} from SharePoint.`
          : 'No PowerPoint files were found in the configured SharePoint folder.'
      );
    } catch (error) {
      console.error('Failed to load deep dive SharePoint presentations:', error);
      setDeepDiveSharePointPresentationOptions([]);
      setDeepDiveTemplateStatus('Failed to load PowerPoint files from SharePoint folder.');
    } finally {
      setIsLoadingDeepDiveSharePointPresentations(false);
    }
  };

  const handleUseSharePointPresentationAsDeepDiveTemplate = async (doc: UploadedDocument) => {
    if (!companyId || isSavingDeepDiveTemplateReference) return;
    setIsSavingDeepDiveTemplateReference(true);
    setDeepDiveTemplateStatus(null);

    try {
      const normalized = sanitizeTemplateText(doc.content || '').slice(0, 12000);
      const templateReference: UploadedDocument = {
        id: doc.id || `deep-dive-template-${Date.now()}`,
        fileName: doc.fileName,
        content: normalized || `Deep dive template reference selected: ${doc.fileName}`,
        uploadedAt: Date.now(),
        url: doc.url,
        path: doc.path
      };

      await updateCompanyJourneyStatus(
        companyId,
        user.uid,
        { deepDiveTemplateReference: templateReference },
        selectedJourneyId || undefined
      );

      if (selectedJourneyId) {
        setJourneys((prev) => ({
          ...prev,
          [selectedJourneyId]: {
            ...prev[selectedJourneyId],
            deepDiveTemplateReference: templateReference,
            updatedAt: Date.now()
          }
        }));
      }

      setDeepDiveTemplateReference(templateReference);
      setDeepDiveTemplateStatus(`Using '${templateReference.fileName}' as deep dive presentation style reference.`);
    } catch (error) {
      console.error('Failed to set deep dive template reference from SharePoint:', error);
      setDeepDiveTemplateStatus('Failed to set selected SharePoint presentation as style reference.');
    } finally {
      setIsSavingDeepDiveTemplateReference(false);
    }
  };

  const handleUploadDeepDiveTemplateReference = async (files: FileList | null) => {
    if (!files || files.length === 0 || !companyId || isSavingDeepDiveTemplateReference) return;

    const file = files[0];
    const lowerName = file.name.toLowerCase();
    setIsSavingDeepDiveTemplateReference(true);
    setDeepDiveTemplateStatus(null);

    try {
      let extractedContent = '';

      if (file.type === 'application/pdf' || lowerName.endsWith('.pdf')) {
        extractedContent = await extractTextFromPDF(file);
      } else if (
        file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
        lowerName.endsWith('.docx')
      ) {
        extractedContent = await extractTextFromDocx(file);
      } else {
        const rawText = await file.text();
        extractedContent = sanitizeTemplateText(rawText);
      }

      const normalized = sanitizeTemplateText(extractedContent).slice(0, 12000);
      const templateReference: UploadedDocument = {
        id: `deep-dive-template-${Date.now()}`,
        fileName: file.name,
        content: normalized || `Deep dive template reference uploaded: ${file.name}`,
        uploadedAt: Date.now()
      };

      await updateCompanyJourneyStatus(
        companyId,
        user.uid,
        { deepDiveTemplateReference: templateReference },
        selectedJourneyId || undefined
      );

      if (selectedJourneyId) {
        setJourneys((prev) => ({
          ...prev,
          [selectedJourneyId]: {
            ...prev[selectedJourneyId],
            deepDiveTemplateReference: templateReference,
            updatedAt: Date.now()
          }
        }));
      }

      setDeepDiveTemplateReference(templateReference);
      setDeepDiveTemplateStatus(
        normalized
          ? 'Deep dive template uploaded. Presentation prompts will follow this example style.'
          : 'Deep dive template uploaded. Text extraction was limited, but style guidance will still be applied.'
      );
    } catch (error) {
      console.error('Failed to upload deep dive template reference:', error);
      setDeepDiveTemplateStatus('Failed to upload deep dive template. Please try again.');
    } finally {
      setIsSavingDeepDiveTemplateReference(false);
    }
  };

  const handleRemoveDeepDiveTemplateReference = async () => {
    if (!companyId || isSavingDeepDiveTemplateReference) return;
    setIsSavingDeepDiveTemplateReference(true);
    setDeepDiveTemplateStatus(null);

    try {
      await updateCompanyJourneyStatus(
        companyId,
        user.uid,
        { deepDiveTemplateReference: null },
        selectedJourneyId || undefined
      );

      if (selectedJourneyId) {
        setJourneys((prev) => ({
          ...prev,
          [selectedJourneyId]: {
            ...prev[selectedJourneyId],
            deepDiveTemplateReference: null,
            updatedAt: Date.now()
          }
        }));
      }

      setDeepDiveTemplateReference(null);
      setDeepDiveTemplateStatus('Deep dive template removed.');
    } catch (error) {
      console.error('Failed to remove deep dive template reference:', error);
      setDeepDiveTemplateStatus('Failed to remove deep dive template. Please try again.');
    } finally {
      setIsSavingDeepDiveTemplateReference(false);
    }
  };

  const updateSelectedFunctionalMeeting = (updater: (meeting: FunctionalHighLevelMeeting) => FunctionalHighLevelMeeting) => {
    if (!selectedFunctionalMeetingId) return;
    setFunctionalHighLevelMeetings((prev) => prev.map((meeting) => (
      meeting.id === selectedFunctionalMeetingId
        ? updater({ ...meeting })
        : meeting
    )));
    functionalMeetingsDirtyRef.current = true;
    setFunctionalMeetingsStatus(null);
  };

  const handleAddFunctionalHighLevelMeeting = () => {
    const seedUseCase = selectedPhase2UseCases[functionalHighLevelMeetings.length] || selectedPhase2UseCases[0];
    if (newCustomStepOutputType === 'EXCEL_DOC' && !newCustomStepExcelTemplate) {
      setCustomStepStatus('Select an Excel template from SharePoint before saving this step.');
      return;
    }

    if (newCustomStepOutputType === 'PRESENTATION' && !newCustomStepPresentationTemplate) {
      setCustomStepStatus('Select a PowerPoint template from SharePoint before saving this step.');
      return;
    }

    const now = Date.now();
    const meeting: FunctionalHighLevelMeeting = {
      id: `fhl-${now}`,
      domain: seedUseCase?.domain || phase2SelectedDomains[0] || 'General',
      functionName: seedUseCase?.process || seedUseCase?.title || 'New Function Meeting',
      presentationUrl: '',
      notes: [],
      createdAt: now,
      updatedAt: now
    };
    setFunctionalHighLevelMeetings((prev) => [...prev, meeting]);
    setSelectedFunctionalMeetingId(meeting.id);
    functionalMeetingsDirtyRef.current = true;
    setFunctionalMeetingsStatus(null);
  };

  const handleRemoveFunctionalHighLevelMeeting = (meetingId: string) => {
    setFunctionalHighLevelMeetings((prev) => {
      const next = prev.filter((meeting) => meeting.id !== meetingId);
      if (selectedFunctionalMeetingId === meetingId) {
        setSelectedFunctionalMeetingId(next[0]?.id || null);
      }
      return next;
    });
    functionalMeetingsDirtyRef.current = true;
    setFunctionalMeetingsStatus(null);
  };

  const handleFunctionalMeetingUpload = async (files: FileList | null) => {
    if (!selectedFunctionalMeetingId || !files || files.length === 0) return;

    const uploadedNotes: UploadedDocument[] = [];
    const uploadWarnings: string[] = [];

    await Promise.all(
      Array.from(files).map((file) =>
        new Promise<void>(async (resolve) => {
          try {
            let content = '';
            const lowerName = file.name.toLowerCase();
            const isPdf = file.type === 'application/pdf' || lowerName.endsWith('.pdf');
            const isDocx = file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || lowerName.endsWith('.docx');

            if (isPdf) {
              content = await extractTextFromPDF(file);
            } else if (isDocx) {
              content = await extractTextFromDocx(file);
            } else {
              content = await file.text();
            }

            uploadedNotes.push({
              id: `${file.name}-${Date.now()}`,
              content,
              fileName: file.name,
              uploadedAt: Date.now()
            });
          } catch (error) {
            console.error('Failed to parse functional high-level note file:', file.name, error);
            uploadWarnings.push(`${file.name}: ${error instanceof Error ? error.message : 'Failed to parse file'}`);
          } finally {
            resolve();
          }
        })
      )
    );

    if (uploadedNotes.length > 0) {
      updateSelectedFunctionalMeeting((meeting) => ({
        ...meeting,
        notes: [...meeting.notes, ...uploadedNotes],
        updatedAt: Date.now()
      }));
    }

    if (uploadWarnings.length > 0) {
      setFunctionalMeetingsStatus(`Some files could not be processed: ${uploadWarnings.slice(0, 2).join(' • ')}`);
    } else if (uploadedNotes.length > 0) {
      setFunctionalMeetingsStatus(`Added ${uploadedNotes.length} note file${uploadedNotes.length === 1 ? '' : 's'} to this meeting.`);
    }
  };

  const handleAddFunctionalMeetingNote = () => {
    if (!selectedFunctionalMeetingId || !newFunctionalMeetingNote.trim()) return;
    const nextNote: UploadedDocument = {
      id: `fhl-note-${Date.now()}`,
      content: newFunctionalMeetingNote.trim(),
      fileName: `Pasted High-Level Note ${Date.now()}.txt`,
      uploadedAt: Date.now()
    };

    updateSelectedFunctionalMeeting((meeting) => ({
      ...meeting,
      notes: [...meeting.notes, nextNote],
      updatedAt: Date.now()
    }));
    setNewFunctionalMeetingNote('');
  };

  const handleSaveFunctionalMeetings = async () => {
    if (!companyId || isSavingFunctionalMeetings) return;
    setIsSavingFunctionalMeetings(true);
    setFunctionalMeetingsStatus(null);
    try {
      await updateCompanyJourneyStatus(
        companyId,
        user.uid,
        { functionalHighLevelMeetings },
        selectedJourneyId || undefined
      );

      if (selectedJourneyId) {
        setJourneys((prev) => ({
          ...prev,
          [selectedJourneyId]: {
            ...prev[selectedJourneyId],
            functionalHighLevelMeetings,
            updatedAt: Date.now()
          }
        }));
      }

      setFunctionalMeetingsStatus('Functional high-level meetings auto-saved.');
    } catch (error) {
      console.error('Failed to save functional high-level meetings:', error);
      setFunctionalMeetingsStatus('Failed to save functional high-level meetings. Please try again.');
    } finally {
      setIsSavingFunctionalMeetings(false);
    }
  };

  const updateSelectedDeepDiveMeeting = (updater: (meeting: FunctionalHighLevelMeeting) => FunctionalHighLevelMeeting) => {
    if (!selectedDeepDiveMeetingId) return;
    setFunctionalDeepDiveMeetings((prev) => prev.map((meeting) => (
      meeting.id === selectedDeepDiveMeetingId
        ? updater({ ...meeting })
        : meeting
    )));
    deepDiveMeetingsDirtyRef.current = true;
    setDeepDiveMeetingsStatus(null);
  };

  const handleAddFunctionalDeepDiveMeeting = () => {
    const seedUseCase = selectedDeepDiveUseCases[functionalDeepDiveMeetings.length] || selectedDeepDiveUseCases[0];
    const now = Date.now();
    const meeting: FunctionalHighLevelMeeting = {
      id: `fdd-${now}`,
      domain: seedUseCase?.domain || deepDiveSelectedDomains[0] || 'General',
      functionName: seedUseCase?.process || seedUseCase?.title || 'New Deep Dive Meeting',
      presentationUrl: '',
      notes: [],
      createdAt: now,
      updatedAt: now
    };
    setFunctionalDeepDiveMeetings((prev) => [...prev, meeting]);
    setSelectedDeepDiveMeetingId(meeting.id);
    deepDiveMeetingsDirtyRef.current = true;
    setDeepDiveMeetingsStatus(null);
  };

  const handleRemoveFunctionalDeepDiveMeeting = (meetingId: string) => {
    setFunctionalDeepDiveMeetings((prev) => {
      const next = prev.filter((meeting) => meeting.id !== meetingId);
      if (selectedDeepDiveMeetingId === meetingId) {
        setSelectedDeepDiveMeetingId(next[0]?.id || null);
      }
      return next;
    });
    deepDiveMeetingsDirtyRef.current = true;
    setDeepDiveMeetingsStatus(null);
  };

  const handleDeepDiveMeetingUpload = async (files: FileList | null) => {
    if (!selectedDeepDiveMeetingId || !files || files.length === 0) return;

    const uploadedNotes: UploadedDocument[] = [];
    const uploadWarnings: string[] = [];

    await Promise.all(
      Array.from(files).map((file) =>
        new Promise<void>(async (resolve) => {
          try {
            let content = '';
            const lowerName = file.name.toLowerCase();
            const isPdf = file.type === 'application/pdf' || lowerName.endsWith('.pdf');
            const isDocx = file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || lowerName.endsWith('.docx');

            if (isPdf) {
              content = await extractTextFromPDF(file);
            } else if (isDocx) {
              content = await extractTextFromDocx(file);
            } else {
              content = await file.text();
            }

            uploadedNotes.push({
              id: `${file.name}-${Date.now()}`,
              content,
              fileName: file.name,
              uploadedAt: Date.now()
            });
          } catch (error) {
            console.error('Failed to parse functional deep dive note file:', file.name, error);
            uploadWarnings.push(`${file.name}: ${error instanceof Error ? error.message : 'Failed to parse file'}`);
          } finally {
            resolve();
          }
        })
      )
    );

    if (uploadedNotes.length > 0) {
      updateSelectedDeepDiveMeeting((meeting) => ({
        ...meeting,
        notes: [...meeting.notes, ...uploadedNotes],
        updatedAt: Date.now()
      }));
    }

    if (uploadWarnings.length > 0) {
      setDeepDiveMeetingsStatus(`Some files could not be processed: ${uploadWarnings.slice(0, 2).join(' • ')}`);
    } else if (uploadedNotes.length > 0) {
      setDeepDiveMeetingsStatus(`Added ${uploadedNotes.length} note file${uploadedNotes.length === 1 ? '' : 's'} to this meeting.`);
    }
  };

  const handleAddDeepDiveMeetingNote = () => {
    if (!selectedDeepDiveMeetingId || !newDeepDiveMeetingNote.trim()) return;
    const nextNote: UploadedDocument = {
      id: `fdd-note-${Date.now()}`,
      content: newDeepDiveMeetingNote.trim(),
      fileName: `Pasted Deep Dive Note ${Date.now()}.txt`,
      uploadedAt: Date.now()
    };

    updateSelectedDeepDiveMeeting((meeting) => ({
      ...meeting,
      notes: [...meeting.notes, nextNote],
      updatedAt: Date.now()
    }));
    setNewDeepDiveMeetingNote('');
  };

  const handleSaveDeepDiveMeetings = async () => {
    if (!companyId || isSavingDeepDiveMeetings) return;
    setIsSavingDeepDiveMeetings(true);
    setDeepDiveMeetingsStatus(null);
    try {
      await updateCompanyJourneyStatus(
        companyId,
        user.uid,
        { functionalDeepDiveMeetings },
        selectedJourneyId || undefined
      );

      if (selectedJourneyId) {
        setJourneys((prev) => ({
          ...prev,
          [selectedJourneyId]: {
            ...prev[selectedJourneyId],
            functionalDeepDiveMeetings,
            updatedAt: Date.now()
          }
        }));
      }

      setDeepDiveMeetingsStatus('Functional deep dive meetings auto-saved.');
    } catch (error) {
      console.error('Failed to save functional deep dive meetings:', error);
      setDeepDiveMeetingsStatus('Failed to save functional deep dive meetings. Please try again.');
    } finally {
      setIsSavingDeepDiveMeetings(false);
    }
  };

  const runResearch = async (name: string) => {
    if (!name.trim() || isResearchRunning) return;
    setIsResearchRunning(true);
    setResearchError(null);
    setResearchResult(null);
    setDraftDocuments([]);
    setDraftTranscripts([]);
    setNewTranscript('');
    try {
      const model: AIModelId = 'gemini-2.5-pro';
      const researchData = await researchCompany({
        companyName: name.trim(),
        rfpContent: undefined,
        model
      });

      const currentResearch: CompanyResearchEntry = {
        description: researchData.currentResearch?.description || '',
        industry: researchData.currentResearch?.industry || '',
        marketPosition: researchData.currentResearch?.marketPosition || '',
        products: researchData.currentResearch?.products || [],
        challenges: researchData.currentResearch?.challenges || [],
        opportunities: researchData.currentResearch?.opportunities || [],
        competitors: researchData.currentResearch?.competitors || [],
        useCases: researchData.currentResearch?.useCases || [],
        aiRelevance: {
          current: researchData.currentResearch?.aiRelevance?.current || '',
          potential: researchData.currentResearch?.aiRelevance?.potential || '',
          recommendations: researchData.currentResearch?.aiRelevance?.recommendations || []
        },
        timestamp: Date.now()
      };

      const trimmedName = name.trim();
      setResearchResult(currentResearch);
      setPendingCompanyName(trimmedName);

      try {
        const autoCompanyId = await saveCompanyResearch(user.uid, trimmedName, currentResearch);
        await updateCompanyJourneyStatus(autoCompanyId, user.uid, {
          companyResearchComplete: true
        }, selectedJourneyId || undefined);
        const refreshed = await getCompany(autoCompanyId, user.uid);
        const refreshedJourneyId = (refreshed as any)?.currentJourneyId || null;
        if (typeof window !== 'undefined') {
          localStorage.setItem('companyJourneyCompanyId', autoCompanyId);
          if (refreshedJourneyId) {
            localStorage.setItem('companyJourneyJourneyId', refreshedJourneyId);
          }
        }
        setCompanyId(autoCompanyId);
        setCompanyName(trimmedName);
        setSelectedJourneyId(refreshedJourneyId);
        setIsCompanyResearchComplete(true);
      } catch (saveError) {
        console.error('Failed to auto-create company record:', saveError);
        setResearchError('Research completed, but saving the company failed. Please try saving again.');
      }
    } catch (error) {
      console.error('Company research failed:', error);
      setResearchError('Failed to run company research. Please try again.');
    } finally {
      setIsResearchRunning(false);
    }
  };

  const handleDocumentUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const nextDocs: UploadedDocument[] = [];

    await Promise.all(
      Array.from(files).map((file) =>
        new Promise<void>((resolve) => {
          const reader = new FileReader();
          reader.onload = () => {
            nextDocs.push({
              id: `${file.name}-${Date.now()}`,
              content: typeof reader.result === 'string' ? reader.result : '',
              fileName: file.name,
              uploadedAt: Date.now()
            });
            resolve();
          };
          reader.onerror = () => resolve();
          reader.readAsText(file);
        })
      )
    );

    setDraftDocuments((prev) => [...prev, ...nextDocs]);
  };

  const handleAddTranscript = () => {
    if (!newTranscript.trim()) return;
    setDraftTranscripts((prev) => [...prev, newTranscript.trim()]);
    setNewTranscript('');
  };

  const handleSaveProject = async () => {
    if (!pendingCompanyName || !researchResult || isSavingProject) return;
    setIsSavingProject(true);
    try {
      const transcriptDocs: UploadedDocument[] = draftTranscripts.map((text, index) => ({
        id: `transcript-${index + 1}-${Date.now()}`,
        content: text,
        fileName: `Meeting Transcript ${index + 1}.txt`,
        uploadedAt: Date.now()
      }));

      const researchEntry: Omit<CompanyResearchEntry, 'timestamp'> = {
        ...researchResult,
        documents: [...draftDocuments, ...transcriptDocs]
      };

      const newCompanyId = await saveCompanyResearch(user.uid, pendingCompanyName, researchEntry);
      await updateCompanyJourneyStatus(newCompanyId, user.uid, {
        companyResearchComplete: true,
        documentsUploaded: draftDocuments.length > 0,
        transcriptsUploaded: draftTranscripts.length > 0
      }, selectedJourneyId || undefined);

      const refreshed = await getCompany(newCompanyId, user.uid);
      const refreshedJourneyId = (refreshed as any)?.currentJourneyId || null;

      if (typeof window !== 'undefined') {
        localStorage.setItem('companyJourneyCompanyId', newCompanyId);
        if (refreshedJourneyId) {
          localStorage.setItem('companyJourneyJourneyId', refreshedJourneyId);
        }
      }

      setCompanyId(newCompanyId);
      setCompanyName(pendingCompanyName);
      setSelectedJourneyId(refreshedJourneyId);
      setIsCompanyResearchComplete(true);
      const journeyQuery = refreshedJourneyId ? `&journeyId=${refreshedJourneyId}` : '';
      navigate(`/company2?companyId=${newCompanyId}${journeyQuery}`, { replace: true });
    } catch (error) {
      console.error('Failed to save company project:', error);
      setResearchError('Failed to save company project. Please try again.');
    } finally {
      setIsSavingProject(false);
    }
  };

  const handleSaveCustomSteps = async (nextCustomSteps: CustomJourneyStep[]) => {
    if (!companyId || !selectedJourneyId) {
      setCustomStepStatus('Select a company journey before adding custom steps.');
      return;
    }

    setIsSavingCustomStep(true);
    setCustomStepStatus(null);
    try {
      await updateCompanyJourneyStatus(
        companyId,
        user.uid,
        { customSteps: nextCustomSteps },
        selectedJourneyId
      );
      setCustomSteps(nextCustomSteps);
      setJourneys((prev) => ({
        ...prev,
        [selectedJourneyId]: {
          ...prev[selectedJourneyId],
          customSteps: nextCustomSteps,
          updatedAt: Date.now()
        }
      }));
      setCustomStepStatus('Custom steps saved.');
    } catch (error) {
      console.error('Failed to save custom journey steps:', error);
      setCustomStepStatus('Failed to save custom steps. Please try again.');
    } finally {
      setIsSavingCustomStep(false);
    }
  };

  const handleCreateCustomStep = async () => {
    const trimmedTitle = newCustomStepTitle.trim();
    if (!trimmedTitle) {
      setCustomStepStatus('Step title is required.');
      return;
    }

    const now = Date.now();
    const validDocumentIds = new Set(customStepDocumentOptions.map((item) => item.id));
    const validTranscriptIds = new Set(customStepTranscriptOptions.map((item) => item.id));
    const selectedModelIsGemini = geminiModelOptions.some((model) => model.id === newCustomStepModelId);
    const safeModelId: AIModelId = selectedModelIsGemini ? newCustomStepModelId : 'gemini-2.5-pro';
    const newStep: CustomJourneyStep = {
      id: `custom-step-${now}`,
      title: trimmedTitle,
      description: newCustomStepDescription.trim() || undefined,
      phase: 'Custom',
      aiModelId: safeModelId,
      prompt: newCustomStepPrompt.trim() || undefined,
      selectedDocumentIds: newCustomStepSelectedDocumentIds.filter((id) => validDocumentIds.has(id)),
      selectedTranscriptIds: newCustomStepSelectedTranscriptIds.filter((id) => validTranscriptIds.has(id)),
      outputType: newCustomStepOutputType,
      excelTemplate: newCustomStepOutputType === 'EXCEL_DOC' && newCustomStepExcelTemplate
        ? {
            fileName: newCustomStepExcelTemplate.fileName,
            dataUrl: newCustomStepExcelTemplate.dataUrl,
            uploadedAt: now
          }
        : undefined,
      presentationTemplate: newCustomStepOutputType === 'PRESENTATION' && newCustomStepPresentationTemplate
        ? {
            fileName: newCustomStepPresentationTemplate.fileName,
            dataUrl: newCustomStepPresentationTemplate.dataUrl,
            uploadedAt: now
          }
        : undefined,
      createdAt: now,
      updatedAt: now
    };

    const nextCustomSteps = [...customSteps, newStep];
    await handleSaveCustomSteps(nextCustomSteps);
    setNewCustomStepTitle('');
    setNewCustomStepDescription('');
    setNewCustomStepModelId('gemini-2.5-pro');
    setNewCustomStepPrompt('');
    setNewCustomStepSelectedDocumentIds([]);
    setNewCustomStepSelectedTranscriptIds([]);
    setNewCustomStepOutputType('CHAT_INTERFACE');
    setNewCustomStepExcelTemplate(null);
    setNewCustomStepPresentationTemplate(null);
    setCustomStepExcelTemplateOptions([]);
    setCustomStepPresentationTemplateOptions([]);
    setIsCustomStepFormOpen(false);
    setSelectedStepId(`custom-${newStep.id}`);
    selectedStepDirtyRef.current = true;
  };

  const loadCustomStepTemplatesFromSharePoint = async (templateType: 'EXCEL' | 'PRESENTATION') => {
    if (!collaborationConfig?.sharePointFolder) {
      if (templateType === 'EXCEL') {
        setCustomStepExcelTemplateOptions([]);
      } else {
        setCustomStepPresentationTemplateOptions([]);
      }
      setCustomStepStatus('Configure a SharePoint folder in Collaboration first.');
      return;
    }

    const graphAccessToken = (import.meta.env.VITE_MICROSOFT_GRAPH_ACCESS_TOKEN as string | undefined) || undefined;
    if (!graphAccessToken) {
      if (templateType === 'EXCEL') {
        setCustomStepExcelTemplateOptions([]);
      } else {
        setCustomStepPresentationTemplateOptions([]);
      }
      setCustomStepStatus('Missing Microsoft Graph token. Set VITE_MICROSOFT_GRAPH_ACCESS_TOKEN to list SharePoint files.');
      return;
    }

    if (templateType === 'EXCEL') {
      setIsLoadingCustomStepExcelTemplates(true);
    } else {
      setIsLoadingCustomStepPresentationTemplates(true);
    }
    setCustomStepStatus(null);

    try {
      const docs = await getSharePointFolderDocuments(collaborationConfig.sharePointFolder, graphAccessToken);
      const filteredDocs = docs.filter((doc) => {
        const lower = (doc.fileName || '').toLowerCase();
        if (templateType === 'EXCEL') {
          return lower.endsWith('.xlsx') || lower.endsWith('.xls') || lower.endsWith('.csv');
        }
        return lower.endsWith('.ppt') || lower.endsWith('.pptx');
      });

      if (templateType === 'EXCEL') {
        setCustomStepExcelTemplateOptions(filteredDocs);
      } else {
        setCustomStepPresentationTemplateOptions(filteredDocs);
      }

      setCustomStepStatus(
        filteredDocs.length > 0
          ? `Loaded ${filteredDocs.length} ${templateType === 'EXCEL' ? 'Excel' : 'PowerPoint'} file${filteredDocs.length === 1 ? '' : 's'} from SharePoint.`
          : `No ${templateType === 'EXCEL' ? 'Excel' : 'PowerPoint'} files were found in the configured SharePoint folder.`
      );
    } catch (error) {
      console.error('Failed to load custom step template files from SharePoint:', error);
      if (templateType === 'EXCEL') {
        setCustomStepExcelTemplateOptions([]);
      } else {
        setCustomStepPresentationTemplateOptions([]);
      }
      setCustomStepStatus('Failed to load template files from SharePoint folder.');
    } finally {
      if (templateType === 'EXCEL') {
        setIsLoadingCustomStepExcelTemplates(false);
      } else {
        setIsLoadingCustomStepPresentationTemplates(false);
      }
    }
  };

  const handleUseSharePointExcelTemplateForNewCustomStep = (doc: UploadedDocument) => {
    setNewCustomStepExcelTemplate({
      fileName: doc.fileName,
      dataUrl: doc.url || ''
    });
    setCustomStepStatus(`Using '${doc.fileName}' as Excel template.`);
  };

  const handleUseSharePointPresentationTemplateForNewCustomStep = (doc: UploadedDocument) => {
    setNewCustomStepPresentationTemplate({
      fileName: doc.fileName,
      dataUrl: doc.url || ''
    });
    setCustomStepStatus(`Using '${doc.fileName}' as PowerPoint template.`);
  };

  const handleUseSharePointExcelTemplateForSelectedStep = async (doc: UploadedDocument) => {
    if (!selectedCustomStep) return;
    await handleUpdateCustomStep(selectedCustomStep.id, (step) => ({
      ...step,
      excelTemplate: {
        fileName: doc.fileName,
        dataUrl: doc.url || '',
        uploadedAt: Date.now()
      }
    }));
    setCustomStepOutputStatus('Excel template updated from SharePoint.');
  };

  const handleUseSharePointPresentationTemplateForSelectedStep = async (doc: UploadedDocument) => {
    if (!selectedCustomStep) return;
    await handleUpdateCustomStep(selectedCustomStep.id, (step) => ({
      ...step,
      presentationTemplate: {
        fileName: doc.fileName,
        dataUrl: doc.url || '',
        uploadedAt: Date.now()
      }
    }));
    setCustomStepOutputStatus('PowerPoint template updated from SharePoint.');
  };

  const handleRemoveCustomStep = async (customStepId: string) => {
    const nextCustomSteps = customSteps.filter((step) => step.id !== customStepId);
    await handleSaveCustomSteps(nextCustomSteps);
    setSelectedStepId('companyResearch');
    selectedStepDirtyRef.current = true;
  };

  const orderedSteps = useMemo<JourneyStep[]>(
    () => {
      const staticSteps: JourneyStep[] = [
      {
        id: 'companyResearch',
        settingKey: 'companyResearch',
        title: 'Company Research',
        phase: 'MVP',
        status: 'current',
        description: 'Gather baseline company context and prioritize areas for discovery.',
        cta: !companyId
          ? 'Select a company'
          : prerequisitesComplete
            ? 'Completed'
            : 'Go to research',
        locked: false
      },
      {
        id: 'targetDomains',
        settingKey: 'targetDomains',
        title: 'Target Domains',
        phase: 'MVP',
        status: 'next',
        description: 'Select priority domains and workflows for presentations and delivery planning.',
        cta: 'Select domains',
        locked: !prerequisitesComplete || !companyId
      },
      {
        id: 'kickoffMeeting',
        settingKey: 'kickoffMeeting',
        title: 'Kickoff Meeting',
        phase: 'MVP',
        status: 'next',
        description: 'Align on goals, stakeholders, and initial hypotheses for transformation.',
        cta: 'Create kickoff brief',
        locked: !prerequisitesComplete || !companyId
      },
      {
        id: 'makeHypothesesHighLevel',
        settingKey: 'makeHypothesesHighLevel',
        title: 'Make Hypotheses (High‑level)',
        phase: 'MVP',
        status: 'next',
        description: 'Generate high‑level hypotheses to guide functional discovery.',
        cta: 'Generate hypotheses',
        locked: !prerequisitesComplete || !companyId
      },
      {
        id: 'functionalHighLevel',
        settingKey: 'functionalHighLevel',
        title: 'Functional High‑Level',
        phase: 'MVP',
        status: 'next',
        description: 'Create functional high‑level assessments across priority areas.',
        cta: 'Create assessments',
        locked: !prerequisitesComplete || !companyId
      },
      {
        id: 'makeHypothesesDeepDive',
        settingKey: 'makeHypothesesDeepDive',
        title: 'Make Hypotheses (Deep Dive)',
        phase: 'Post MVP 2',
        status: 'later',
        description: 'Refine hypotheses with deeper operational and data signals.',
        cta: 'Not available',
        locked: !prerequisitesComplete || !companyId
      },
      {
        id: 'functionalDeepDive',
        settingKey: 'functionalDeepDive',
        title: 'Functional Deep Dive',
        phase: 'Post MVP 2',
        status: 'later',
        description: 'Run deep‑dive diagnostics and capture detailed requirements.',
        cta: 'Not available',
        locked: !prerequisitesComplete || !companyId
      },
      {
        id: 'designIntegrationStrategy',
        settingKey: 'designIntegrationStrategy',
        title: 'Design Integration Strategy',
        phase: 'Post MVP 3',
        status: 'later',
        description: 'Define the integrated target state and sequencing approach.',
        cta: 'Not available',
        locked: !prerequisitesComplete || !companyId
      },
      {
        id: 'createDevelopmentDocumentation',
        settingKey: 'createDevelopmentDocumentation',
        title: 'Create Development Documentation',
        phase: 'Post MVP 3',
        status: 'later',
        description: 'Produce implementation artifacts for engineering delivery.',
        cta: 'Not available',
        locked: !prerequisitesComplete || !companyId
      }
      ];

      const dynamicSteps: JourneyStep[] = customSteps.map((step) => ({
        id: `custom-${step.id}`,
        title: step.title,
        phase: step.phase || 'Custom',
        status: 'next',
        description: step.description || 'Custom journey step',
        cta: 'Custom step',
        locked: !companyId,
        isCustom: true,
        customStepId: step.id
      }));

      return [...staticSteps, ...dynamicSteps];
    },
    [companyId, customSteps, prerequisitesComplete]
  );

  const effectiveJourneyStepSettings = useMemo<JourneyStepSettings>(
    () => ({
      ...journeyStepSettings,
      ...journeyStepOverrides,
      companyResearch: true
    }),
    [journeyStepSettings, journeyStepOverrides]
  );

  const visibleOrderedSteps = useMemo(
    () => orderedSteps.filter((step) => {
      if (!step.settingKey) return true;
      return step.settingKey === 'companyResearch' || !!effectiveJourneyStepSettings[step.settingKey];
    }),
    [orderedSteps, effectiveJourneyStepSettings]
  );

  const configurableJourneySteps = useMemo(
    () => orderedSteps.filter((step) => !!step.settingKey && step.settingKey !== 'companyResearch' && !step.isCustom),
    [orderedSteps]
  );

  const selectedStep = visibleOrderedSteps.find(step => step.id === selectedStepId) || visibleOrderedSteps[0];
  const selectedCustomStep = selectedStep?.isCustom && selectedStep.customStepId
    ? customSteps.find((step) => step.id === selectedStep.customStepId) || null
    : null;
  const selectedCustomStepDocumentLabels = useMemo(
    () => (selectedCustomStep?.selectedDocumentIds || []).map((id) => customStepDocumentLabelMap.get(id) || id),
    [selectedCustomStep?.selectedDocumentIds, customStepDocumentLabelMap]
  );
  const selectedCustomStepTranscriptLabels = useMemo(
    () => (selectedCustomStep?.selectedTranscriptIds || []).map((id) => customStepTranscriptLabelMap.get(id) || id),
    [selectedCustomStep?.selectedTranscriptIds, customStepTranscriptLabelMap]
  );

  const handleCopyCustomOutputText = async (text: string) => {
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(text);
        setCustomStepOutputStatus('Copied to clipboard.');
      } else {
        setCustomStepOutputStatus('Clipboard is not available in this browser.');
      }
    } catch (error) {
      console.error('Failed to copy custom step output:', error);
      setCustomStepOutputStatus('Failed to copy. Please try again.');
    }
  };

  const handleUpdateCustomStep = async (
    stepId: string,
    updater: (step: CustomJourneyStep) => CustomJourneyStep
  ) => {
    const nextCustomSteps = customSteps.map((step) => (
      step.id === stepId
        ? updater({ ...step, updatedAt: Date.now() })
        : step
    ));
    await handleSaveCustomSteps(nextCustomSteps);
  };

  const handleSendCustomStepChat = async () => {
    if (!selectedCustomStep || isCustomStepChatSending) return;
    const userMessage = customStepChatInput.trim();
    if (!userMessage) return;

    const stepId = selectedCustomStep.id;
    const previousMessages = customStepChatByStepId[stepId] || [];
    const updatedMessages = [...previousMessages, { role: 'user' as const, content: userMessage }];
    setCustomStepChatByStepId((prev) => ({
      ...prev,
      [stepId]: updatedMessages
    }));
    setCustomStepChatInput('');
    setIsCustomStepChatSending(true);
    setCustomStepOutputStatus(null);

    try {
      const contextPrefix = `Custom step context:\n${buildCustomStepContextText(selectedCustomStep)}`;
      const aiResponse = await generateChatResponse(
        userMessage,
        [{ role: 'assistant', content: contextPrefix }, ...previousMessages]
      );

      setCustomStepChatByStepId((prev) => ({
        ...prev,
        [stepId]: [...(prev[stepId] || []), { role: 'assistant', content: aiResponse || 'No response returned.' }]
      }));
    } catch (error) {
      console.error('Failed to send custom step chat message:', error);
      setCustomStepChatByStepId((prev) => ({
        ...prev,
        [stepId]: [
          ...(prev[stepId] || []),
          { role: 'assistant', content: 'I could not respond right now. Please try again.' }
        ]
      }));
    } finally {
      setIsCustomStepChatSending(false);
    }
  };

  const buildCustomStepContextText = (step: CustomJourneyStep) => {
    const docs = (step.selectedDocumentIds || []).map((id) => customStepDocumentLabelMap.get(id) || id);
    const transcripts = (step.selectedTranscriptIds || []).map((id) => customStepTranscriptLabelMap.get(id) || id);

    return [
      `Step Title: ${step.title}`,
      `Description: ${step.description || 'N/A'}`,
      `AI Model: ${step.aiModelId || 'N/A'}`,
      `Output: ${step.outputType || 'CHAT_INTERFACE'}`,
      `Prompt: ${step.prompt || 'N/A'}`,
      `Documents: ${docs.length ? docs.join('; ') : 'None selected'}`,
      `Transcripts: ${transcripts.length ? transcripts.join('; ') : 'None selected'}`,
      `Excel file template: ${step.excelTemplate?.fileName || 'None'}`,
      `Presentation template: ${step.presentationTemplate?.fileName || 'None'}`
    ].join('\n');
  };

  const buildCustomStepExcelCsv = (step: CustomJourneyStep) => {
    const docs = (step.selectedDocumentIds || []).map((id) => customStepDocumentLabelMap.get(id) || id);
    const transcripts = (step.selectedTranscriptIds || []).map((id) => customStepTranscriptLabelMap.get(id) || id);
    const baseFields: Array<[string, string]> = [
      ['Title', step.title],
      ['Description', step.description || ''],
      ['AI Model', step.aiModelId || ''],
      ['Output', step.outputType || 'CHAT_INTERFACE'],
      ['Prompt', step.prompt || ''],
      ['Documents', docs.join(' | ')],
      ['Transcripts', transcripts.join(' | ')]
    ];
    const rows = [
      ['Field', 'Value'],
      ...baseFields
    ];

    return rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
  };

  useEffect(() => {
    setCustomStepOutputStatus(null);
  }, [selectedStepId]);

  useEffect(() => {
    if (selectedCustomStep && (selectedCustomStep.outputType || 'CHAT_INTERFACE') === 'CHAT_INTERFACE') {
      const promptText = (selectedCustomStep.prompt || '').trim();
      setCustomStepChatInput(promptText);

      if (promptText) {
        setCustomStepChatByStepId((prev) => {
          const existing = prev[selectedCustomStep.id] || [];
          if (existing.length > 0) {
            return prev;
          }
          return {
            ...prev,
            [selectedCustomStep.id]: [
              {
                role: 'assistant',
                content: `Prompt loaded:\n${promptText}`
              }
            ]
          };
        });
      }
      return;
    }

    setCustomStepChatInput('');
  }, [selectedStepId]);

  useEffect(() => {
    if (!visibleOrderedSteps.some((step) => step.id === selectedStepId)) {
      setSelectedStepId(visibleOrderedSteps[0]?.id);
      selectedStepDirtyRef.current = true;
    }
  }, [visibleOrderedSteps, selectedStepId]);

  return (
    <div className="flex h-screen bg-wm-white">
      <SidebarNav
        user={user}
        items={menuItems}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
      />
      <main className="flex-1 overflow-auto bg-wm-neutral/5">
        <div className="p-6">
          <header className="mb-6">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <h1 className="text-2xl font-semibold text-wm-blue">{displayCompanyName}</h1>
                <p className="text-wm-blue/60">
                  {companyName || pendingCompanyName
                    ? `Company: ${companyName || pendingCompanyName}`
                    : 'Run a company search to begin research.'}
                </p>
              </div>
            </div>
            {companyId && Object.keys(journeys).length > 0 && (
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <div>
                  <label className="block text-xs font-semibold text-wm-blue/60 mb-1">Company journey</label>
                  <select
                    value={selectedJourneyId || ''}
                    onChange={async (event) => {
                      const nextJourneyId = event.target.value || null;
                      setSelectedJourneyId(nextJourneyId);
                      if (typeof window !== 'undefined' && nextJourneyId) {
                        localStorage.setItem('companyJourneyJourneyId', nextJourneyId);
                      }
                      if (companyId && nextJourneyId) {
                        await updateCompanyJourneyStatus(companyId, user.uid, {}, nextJourneyId);
                        navigate(`/company2?companyId=${companyId}&journeyId=${nextJourneyId}`, { replace: true });
                        const active = journeys[nextJourneyId];
                        const fallbackKickoffDomains = active?.kickoffSelectedDomains || [];
                        const fallbackKickoffUseCases = active?.kickoffSelectedUseCases || [];
                        const fallbackPhase2Domains = active?.phase2SelectedDomains || fallbackKickoffDomains;
                        const fallbackPhase2UseCases = active?.phase2SelectedUseCases || fallbackKickoffUseCases;
                        setCompanySelectedDomains(
                          Array.isArray(active?.kickoffSelectedDomains)
                            ? active.kickoffSelectedDomains
                            : fallbackKickoffDomains
                        );
                        setCompanySelectedScenarios(
                          Array.isArray(active?.kickoffSelectedUseCases)
                            ? active.kickoffSelectedUseCases
                            : fallbackKickoffUseCases
                        );
                        setIsCompanyResearchComplete(!!active?.companyResearchComplete);
                        setKickoffPresentationUrl(active?.kickoffPresentationUrl || '');
                        setKickoffTemplateReference(active?.kickoffTemplateReference || null);
                        setDeepDiveTemplateReference(active?.deepDiveTemplateReference || null);
                        setKickoffMeetingNotes(active?.kickoffMeetingNotes || []);
                        setPhase2SelectedDomains(
                          Array.isArray(active?.phase2SelectedDomains)
                            ? active.phase2SelectedDomains
                            : fallbackPhase2Domains
                        );
                        setPhase2SelectedUseCases(
                          Array.isArray(active?.phase2SelectedUseCases)
                            ? active.phase2SelectedUseCases
                            : fallbackPhase2UseCases
                        );
                        setDeepDiveSelectedDomains(
                          Array.isArray(active?.deepDiveSelectedDomains)
                            ? active.deepDiveSelectedDomains
                            : (Array.isArray(active?.phase2SelectedDomains) ? active.phase2SelectedDomains : fallbackPhase2Domains)
                        );
                        setDeepDiveSelectedUseCases(
                          Array.isArray(active?.deepDiveSelectedUseCases)
                            ? active.deepDiveSelectedUseCases
                            : (Array.isArray(active?.phase2SelectedUseCases) ? active.phase2SelectedUseCases : fallbackPhase2UseCases)
                        );
                        const loadedFunctionalMeetings = Array.isArray(active?.functionalHighLevelMeetings)
                          ? active.functionalHighLevelMeetings
                          : [];
                        const loadedDeepDiveMeetings = Array.isArray(active?.functionalDeepDiveMeetings)
                          ? active.functionalDeepDiveMeetings
                          : [];
                        const loadedCustomSteps = Array.isArray(active?.customSteps)
                          ? active.customSteps
                          : [];
                        setFunctionalHighLevelMeetings(loadedFunctionalMeetings);
                        setSelectedFunctionalMeetingId(loadedFunctionalMeetings[0]?.id || null);
                        setFunctionalDeepDiveMeetings(loadedDeepDiveMeetings);
                        setSelectedDeepDiveMeetingId(loadedDeepDiveMeetings[0]?.id || null);
                        setCustomSteps(loadedCustomSteps);
                        setJourneyStepOverrides(active?.journeyStepSettings || {});
                        setSelectedStepId(active?.currentStepId || 'companyResearch');
                        setSharePointPresentationOptions([]);
                        setDeepDiveSharePointPresentationOptions([]);
                        setKickoffUrlStatus(null);
                        setKickoffTemplateStatus(null);
                        setDeepDiveTemplateStatus(null);
                        setKickoffNotesStatus(null);
                        setPhase2TargetsStatus(null);
                        setFunctionalMeetingsStatus(null);
                        setDeepDiveMeetingsStatus(null);
                        setDeepDiveTargetsStatus(null);
                        setCustomStepStatus(null);
                        setIsCustomStepFormOpen(false);
                        setNewCustomStepTitle('');
                        setNewCustomStepDescription('');
                        setNewCustomStepModelId('gemini-2.5-pro');
                        setNewCustomStepPrompt('');
                        setNewCustomStepSelectedDocumentIds([]);
                        setNewCustomStepSelectedTranscriptIds([]);
                        setNewCustomStepOutputType('CHAT_INTERFACE');
                        setNewCustomStepExcelTemplate(null);
                        setNewCustomStepPresentationTemplate(null);
                        setCustomStepExcelTemplateOptions([]);
                        setCustomStepPresentationTemplateOptions([]);
                        setJourneyStepOverridesStatus(null);
                        setIsJourneyStepManagerOpen(false);
                        kickoffUrlDirtyRef.current = false;
                        kickoffTargetsDirtyRef.current = false;
                        kickoffNotesDirtyRef.current = false;
                        phase2TargetsDirtyRef.current = false;
                        functionalMeetingsDirtyRef.current = false;
                        deepDiveMeetingsDirtyRef.current = false;
                        deepDiveTargetsDirtyRef.current = false;
                        selectedStepDirtyRef.current = false;
                        journeyStepOverridesDirtyRef.current = false;
                      }
                    }}
                    className="rounded-md border border-wm-neutral/30 bg-white px-3 py-2 text-sm text-wm-blue"
                  >
                    {journeyOptions.map((journey, index) => (
                        <option key={journey.id} value={journey.id}>
                          {`Journey ${index + 1} • ${new Date(journey.createdAt).toLocaleString()}`}
                        </option>
                      ))}
                  </select>
                </div>
                <button
                  type="button"
                  onClick={async () => {
                    if (!companyId) return;
                    const newJourneyId = `journey-${Date.now()}`;
                    await updateCompanyJourneyStatus(
                      companyId,
                      user.uid,
                      {
                        companyResearchComplete: false,
                        currentStepId: 'companyResearch',
                        journeyStepSettings: {},
                        kickoffSelectedDomains: companySelectedDomains,
                        kickoffSelectedUseCases: companySelectedScenarios,
                        phase2SelectedDomains: companySelectedDomains,
                        phase2SelectedUseCases: companySelectedScenarios,
                        deepDiveSelectedDomains: companySelectedDomains,
                        deepDiveSelectedUseCases: companySelectedScenarios
                      },
                      newJourneyId
                    );
                    if (typeof window !== 'undefined') {
                      localStorage.setItem('companyJourneyJourneyId', newJourneyId);
                    }
                    const refreshed = await getCompany(companyId, user.uid);
                    const refreshedJourneys = (refreshed as any)?.journeys || {};
                    setJourneys(refreshedJourneys);
                    setSelectedJourneyId(newJourneyId);
                    setIsCompanyResearchComplete(false);
                    setSharePointPresentationOptions([]);
                    setDeepDiveSharePointPresentationOptions([]);
                    setKickoffPresentationUrl('');
                    setKickoffTemplateReference(null);
                    setDeepDiveTemplateReference(null);
                    setKickoffMeetingNotes([]);
                    setNewKickoffMeetingNote('');
                    setCompanySelectedDomains(companySelectedDomains);
                    setCompanySelectedScenarios(companySelectedScenarios);
                    setPhase2SelectedDomains(companySelectedDomains);
                    setPhase2SelectedUseCases(companySelectedScenarios);
                    setDeepDiveSelectedDomains(companySelectedDomains);
                    setDeepDiveSelectedUseCases(companySelectedScenarios);
                    setFunctionalHighLevelMeetings([]);
                    setSelectedFunctionalMeetingId(null);
                    setNewFunctionalMeetingNote('');
                    setFunctionalDeepDiveMeetings([]);
                    setSelectedDeepDiveMeetingId(null);
                    setNewDeepDiveMeetingNote('');
                    setCustomSteps([]);
                    setJourneyStepOverrides({});
                    setSelectedStepId('companyResearch');
                    setIsCustomStepFormOpen(false);
                    setNewCustomStepTitle('');
                    setNewCustomStepDescription('');
                    setNewCustomStepModelId('gemini-2.5-pro');
                    setNewCustomStepPrompt('');
                    setNewCustomStepSelectedDocumentIds([]);
                    setNewCustomStepSelectedTranscriptIds([]);
                    setNewCustomStepOutputType('CHAT_INTERFACE');
                    setNewCustomStepExcelTemplate(null);
                    setNewCustomStepPresentationTemplate(null);
                    setCustomStepExcelTemplateOptions([]);
                    setCustomStepPresentationTemplateOptions([]);
                    setJourneyStepOverridesStatus(null);
                    setIsJourneyStepManagerOpen(false);
                    setKickoffUrlStatus(null);
                    setKickoffTemplateStatus(null);
                    setDeepDiveTemplateStatus(null);
                    setKickoffNotesStatus(null);
                    setPhase2TargetsStatus(null);
                    setFunctionalMeetingsStatus(null);
                    setDeepDiveMeetingsStatus(null);
                    setDeepDiveTargetsStatus(null);
                    setCustomStepStatus(null);
                    kickoffUrlDirtyRef.current = false;
                    kickoffTargetsDirtyRef.current = false;
                    kickoffNotesDirtyRef.current = false;
                    phase2TargetsDirtyRef.current = false;
                    functionalMeetingsDirtyRef.current = false;
                    deepDiveMeetingsDirtyRef.current = false;
                    deepDiveTargetsDirtyRef.current = false;
                    selectedStepDirtyRef.current = false;
                    journeyStepOverridesDirtyRef.current = false;
                    navigate(`/company2?companyId=${companyId}&journeyId=${newJourneyId}`, { replace: true });
                  }}
                  className="mt-5 px-3 py-2 text-xs font-semibold rounded-md bg-wm-accent text-white hover:bg-wm-accent/90"
                >
                  New journey
                </button>
              </div>
            )}
          </header>

          {!researchResult && (
            <section className="mb-6">
              <div className="flex items-center gap-3 flex-wrap">
                <div className="flex-1 min-w-[260px] relative">
                  <SearchInput
                    type="text"
                    value={searchQuery}
                    onChange={(event) => {
                      setSearchQuery(event.target.value);
                      setShowSearchDropdown(true);
                    }}
                    onFocus={() => setShowSearchDropdown(true)}
                    onBlur={() => setTimeout(() => setShowSearchDropdown(false), 200)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' && searchQuery.trim()) {
                        runResearch(searchQuery.trim());
                      }
                    }}
                    placeholder="Search or start company research..."
                    inputClassName="py-2"
                  />
                  {showSearchDropdown && searchQuery.trim() && (
                    <div className="absolute z-20 mt-2 w-full rounded-xl border border-wm-accent/30 bg-white shadow-xl">
                      <button
                        type="button"
                        onClick={() => {
                          runResearch(searchQuery.trim());
                        }}
                        className="w-full px-5 py-3 text-left hover:bg-wm-accent/10 transition-colors"
                      >
                        <div className="flex items-center gap-2 text-sm font-semibold text-wm-accent">
                          <Icons.Plus className="w-4 h-4" />
                          {`New research of "${searchQuery.trim()}"`}
                        </div>
                      </button>
                    </div>
                  )}
                </div>
              </div>
              <p className="mt-2 text-xs text-wm-blue/50">
                Search for a company or start a new research entry.
              </p>
              {isResearchRunning && (
                <p className="mt-2 text-xs text-wm-blue/60">Running company research...</p>
              )}
              {researchError && (
                <p className="mt-2 text-xs text-wm-pink">{researchError}</p>
              )}
            </section>
          )}

          {hasResearch && (
            <section className="mb-6 rounded-xl border border-wm-neutral/30 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-wm-blue/60">Step-by-step guide</h2>
              <div className="flex items-center gap-2 ml-auto">
                <button
                  type="button"
                  onClick={() => {
                    setIsJourneyStepManagerOpen((prev) => !prev);
                    setJourneyStepOverridesStatus(null);
                  }}
                  className="px-3 py-2 rounded-lg border border-wm-neutral/30 text-wm-blue text-sm font-semibold hover:bg-wm-neutral/10"
                >
                  {isJourneyStepManagerOpen ? 'Close step manager' : 'Manage journey steps'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsCustomStepFormOpen((prev) => !prev);
                    setCustomStepStatus(null);
                  }}
                  className="px-3 py-2 rounded-lg bg-wm-accent text-white text-sm font-semibold hover:bg-wm-accent/90"
                >
                  {isCustomStepFormOpen ? 'Close custom step' : 'Add custom step'}
                </button>
              </div>
            </div>

            {isJourneyStepManagerOpen && (
              <div className="mt-3 rounded-lg border border-wm-neutral/20 bg-wm-neutral/5 p-3 space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-wm-blue/60">Journey step visibility</p>
                {configurableJourneySteps.length === 0 ? (
                  <p className="text-xs text-wm-blue/60">No configurable steps available.</p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {configurableJourneySteps.map((step) => {
                      const key = step.settingKey as JourneyStepKey;
                      const enabled = !!effectiveJourneyStepSettings[key];
                      return (
                        <label key={step.id} className="flex items-center justify-between gap-3 rounded-md border border-wm-neutral/20 bg-white px-3 py-2 text-sm text-wm-blue">
                          <span>{step.title}</span>
                          <input
                            type="checkbox"
                            checked={enabled}
                            onChange={(event) => handleToggleJourneyStepVisibility(key, event.target.checked)}
                          />
                        </label>
                      );
                    })}
                  </div>
                )}
                <div className="flex items-center gap-3">
                  {isSavingJourneyStepOverrides && <p className="text-xs text-wm-blue/70">Saving...</p>}
                  {journeyStepOverridesStatus && <p className="text-xs text-wm-blue/70">{journeyStepOverridesStatus}</p>}
                </div>
              </div>
            )}

            <div className="mt-4">
              {isCustomStepFormOpen && (
                <div className="mt-3 rounded-lg border border-dashed border-wm-neutral/30 bg-wm-neutral/5 p-3 space-y-3">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wide text-wm-blue/60 mb-1">Title</label>
                    <input
                      type="text"
                      value={newCustomStepTitle}
                      onChange={(event) => {
                        setNewCustomStepTitle(event.target.value);
                        setCustomStepStatus(null);
                      }}
                      placeholder="Custom step title"
                      className="w-full rounded-lg border border-wm-neutral/30 bg-white px-3 py-2 text-sm text-wm-blue"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wide text-wm-blue/60 mb-1">Description</label>
                    <textarea
                      value={newCustomStepDescription}
                      onChange={(event) => setNewCustomStepDescription(event.target.value)}
                      placeholder="Long description"
                      rows={3}
                      className="w-full rounded-lg border border-wm-neutral/30 bg-white px-3 py-2 text-sm text-wm-blue"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wide text-wm-blue/60 mb-1">AI Model Chooser</label>
                    <select
                      value={newCustomStepModelId}
                      onChange={(event) => setNewCustomStepModelId(event.target.value as AIModelId)}
                      className="w-full rounded-lg border border-wm-neutral/30 bg-white px-3 py-2 text-sm text-wm-blue"
                    >
                      {geminiModelOptions.map((model) => (
                        <option key={model.id} value={model.id}>{model.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wide text-wm-blue/60 mb-1">Prompt</label>
                    <textarea
                      value={newCustomStepPrompt}
                      onChange={(event) => setNewCustomStepPrompt(event.target.value)}
                      placeholder="Long prompt text"
                      rows={4}
                      className="w-full rounded-lg border border-wm-neutral/30 bg-white px-3 py-2 text-sm text-wm-blue"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wide text-wm-blue/60 mb-1">Document chooser</label>
                    {customStepDocumentOptions.length === 0 ? (
                      <p className="text-xs text-wm-blue/50">No documents available yet.</p>
                    ) : (
                      <div className="space-y-1.5 max-h-36 overflow-auto rounded-lg border border-wm-neutral/20 bg-white p-2">
                        {customStepDocumentOptions.map((doc) => (
                          <label key={doc.id} className="flex items-center gap-2 text-sm text-wm-blue">
                            <input
                              type="checkbox"
                              checked={newCustomStepSelectedDocumentIds.includes(doc.id)}
                              onChange={() => {
                                setNewCustomStepSelectedDocumentIds((prev) => prev.includes(doc.id)
                                  ? prev.filter((id) => id !== doc.id)
                                  : [...prev, doc.id]);
                              }}
                            />
                            <span>{doc.label}</span>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wide text-wm-blue/60 mb-1">Meeting Transcripts chooser</label>
                    {customStepTranscriptOptions.length === 0 ? (
                      <p className="text-xs text-wm-blue/50">No transcripts available yet.</p>
                    ) : (
                      <div className="space-y-1.5 max-h-36 overflow-auto rounded-lg border border-wm-neutral/20 bg-white p-2">
                        {customStepTranscriptOptions.map((item) => (
                          <label key={item.id} className="flex items-center gap-2 text-sm text-wm-blue">
                            <input
                              type="checkbox"
                              checked={newCustomStepSelectedTranscriptIds.includes(item.id)}
                              onChange={() => {
                                setNewCustomStepSelectedTranscriptIds((prev) => prev.includes(item.id)
                                  ? prev.filter((id) => id !== item.id)
                                  : [...prev, item.id]);
                              }}
                            />
                            <span>{item.label}</span>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wide text-wm-blue/60 mb-1">Output</label>
                    <select
                      value={newCustomStepOutputType}
                      onChange={(event) => {
                        const nextOutput = event.target.value as 'CHAT_INTERFACE' | 'EXCEL_DOC' | 'PRESENTATION';
                        setNewCustomStepOutputType(nextOutput);
                        if (nextOutput !== 'EXCEL_DOC') {
                          setNewCustomStepExcelTemplate(null);
                        }
                        if (nextOutput !== 'PRESENTATION') {
                          setNewCustomStepPresentationTemplate(null);
                        }
                      }}
                      className="w-full rounded-lg border border-wm-neutral/30 bg-white px-3 py-2 text-sm text-wm-blue"
                    >
                      <option value="CHAT_INTERFACE">Chat Interface</option>
                      <option value="EXCEL_DOC">Excel Doc</option>
                      <option value="PRESENTATION">Presentation</option>
                    </select>
                  </div>

                  {newCustomStepOutputType === 'EXCEL_DOC' && (
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wide text-wm-blue/60 mb-1">Excel template from SharePoint</label>
                      <button
                        type="button"
                        onClick={() => {
                          void loadCustomStepTemplatesFromSharePoint('EXCEL');
                        }}
                        disabled={isLoadingCustomStepExcelTemplates}
                        className={`px-3 py-2 rounded-lg text-xs font-semibold ${
                          isLoadingCustomStepExcelTemplates
                            ? 'bg-wm-neutral/20 text-wm-blue/40 cursor-not-allowed'
                            : 'bg-wm-accent text-white hover:bg-wm-accent/90'
                        }`}
                      >
                        {isLoadingCustomStepExcelTemplates ? 'Loading...' : 'Load Excel files from SharePoint'}
                      </button>
                      {customStepExcelTemplateOptions.length > 0 && (
                        <ul className="mt-2 space-y-2 max-h-40 overflow-auto rounded-lg border border-wm-neutral/20 bg-white p-2">
                          {customStepExcelTemplateOptions.map((doc) => (
                            <li key={doc.id} className="flex items-center justify-between gap-2 rounded border border-wm-neutral/20 px-2 py-1.5">
                              <div>
                                <p className="text-xs font-semibold text-wm-blue">{doc.fileName}</p>
                                <p className="text-[11px] text-wm-blue/60">{doc.path || doc.url || 'SharePoint file'}</p>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleUseSharePointExcelTemplateForNewCustomStep(doc)}
                                className="text-xs font-semibold text-wm-accent hover:underline"
                              >
                                Use
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                      {newCustomStepExcelTemplate && (
                        <p className="mt-1 text-xs text-wm-blue/60">Selected template: {newCustomStepExcelTemplate.fileName}</p>
                      )}
                    </div>
                  )}

                  {newCustomStepOutputType === 'PRESENTATION' && (
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wide text-wm-blue/60 mb-1">PowerPoint template from SharePoint</label>
                      <button
                        type="button"
                        onClick={() => {
                          void loadCustomStepTemplatesFromSharePoint('PRESENTATION');
                        }}
                        disabled={isLoadingCustomStepPresentationTemplates}
                        className={`px-3 py-2 rounded-lg text-xs font-semibold ${
                          isLoadingCustomStepPresentationTemplates
                            ? 'bg-wm-neutral/20 text-wm-blue/40 cursor-not-allowed'
                            : 'bg-wm-accent text-white hover:bg-wm-accent/90'
                        }`}
                      >
                        {isLoadingCustomStepPresentationTemplates ? 'Loading...' : 'Load PowerPoint files from SharePoint'}
                      </button>
                      {customStepPresentationTemplateOptions.length > 0 && (
                        <ul className="mt-2 space-y-2 max-h-40 overflow-auto rounded-lg border border-wm-neutral/20 bg-white p-2">
                          {customStepPresentationTemplateOptions.map((doc) => (
                            <li key={doc.id} className="flex items-center justify-between gap-2 rounded border border-wm-neutral/20 px-2 py-1.5">
                              <div>
                                <p className="text-xs font-semibold text-wm-blue">{doc.fileName}</p>
                                <p className="text-[11px] text-wm-blue/60">{doc.path || doc.url || 'SharePoint file'}</p>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleUseSharePointPresentationTemplateForNewCustomStep(doc)}
                                className="text-xs font-semibold text-wm-accent hover:underline"
                              >
                                Use
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                      {newCustomStepPresentationTemplate && (
                        <p className="mt-1 text-xs text-wm-blue/60">Selected template: {newCustomStepPresentationTemplate.fileName}</p>
                      )}
                    </div>
                  )}

                  <div className="pt-1 flex justify-end">
                    <button
                      type="button"
                      onClick={handleCreateCustomStep}
                      disabled={isSavingCustomStep || (newCustomStepOutputType === 'EXCEL_DOC' && !newCustomStepExcelTemplate) || (newCustomStepOutputType === 'PRESENTATION' && !newCustomStepPresentationTemplate)}
                      className={`px-3 py-2 rounded-lg text-sm font-semibold ${
                        isSavingCustomStep || (newCustomStepOutputType === 'EXCEL_DOC' && !newCustomStepExcelTemplate) || (newCustomStepOutputType === 'PRESENTATION' && !newCustomStepPresentationTemplate)
                          ? 'bg-wm-neutral/20 text-wm-blue/40 cursor-not-allowed'
                          : 'bg-wm-accent text-white hover:bg-wm-accent/90'
                      }`}
                    >
                      {isSavingCustomStep ? 'Saving...' : 'Save Custom Step'}
                    </button>
                  </div>

                  {customStepStatus && <p className="text-xs text-wm-blue/60">{customStepStatus}</p>}
                </div>
              )}
            </div>

            <ol className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
              {visibleOrderedSteps.map((step, index) => (
                <li key={step.id}>
                  <button
                    type="button"
                    onClick={() => {
                      if (!step.locked || step.title === 'Company Research') {
                        setSelectedStepId(step.id);
                        selectedStepDirtyRef.current = true;
                      }
                    }}
                    className={`w-full rounded-lg border px-3 py-2 text-left text-sm transition-colors ${
                      step.status === 'current'
                        ? 'border-wm-accent/40 bg-wm-accent/5'
                        : step.status === 'next'
                          ? 'border-wm-neutral/30 bg-wm-neutral/5 hover:bg-wm-neutral/10'
                          : 'border-wm-neutral/20 bg-wm-neutral/10 text-wm-blue/50'
                    } ${
                      selectedStepId === step.id
                        ? 'ring-2 ring-wm-accent/20'
                        : ''
                    }`}
                    aria-pressed={selectedStepId === step.id}
                    aria-disabled={step.locked && step.title !== 'Company Research'}
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                          step.status === 'current'
                            ? 'bg-wm-accent text-white'
                            : step.status === 'next'
                              ? 'bg-wm-blue/10 text-wm-blue'
                              : 'bg-wm-neutral/30 text-wm-blue/50'
                        }`}
                      >
                        {index + 1}
                      </span>
                      <span className="font-semibold text-wm-blue/90">{step.title}</span>
                      {step.locked && step.title !== 'Company Research' && (
                        <span className="ml-2 text-xs text-wm-blue/40">Locked</span>
                      )}
                    </div>
                  </button>
                </li>
              ))}
            </ol>
          </section>
          )}

          {selectedStep?.isCustom && companyId && (
            <section className="mb-6 rounded-xl border border-wm-neutral/30 bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div>
                  <h2 className="text-lg font-semibold text-wm-blue">{selectedStep.title}</h2>
                  <p className="text-sm text-wm-blue/60 mt-1">{selectedStep.description}</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (selectedStep.customStepId) {
                      handleRemoveCustomStep(selectedStep.customStepId);
                    }
                  }}
                  disabled={isSavingCustomStep}
                  className={`px-3 py-2 rounded-lg text-xs font-semibold ${
                    isSavingCustomStep
                      ? 'bg-wm-neutral/20 text-wm-blue/40 cursor-not-allowed'
                      : 'bg-wm-pink/10 text-wm-pink hover:bg-wm-pink/20'
                  }`}
                >
                  Remove custom step
                </button>
              </div>
              <p className="mt-4 text-sm text-wm-blue/70">
                This is a custom journey step. Use this area to track bespoke work items for this customer journey.
              </p>
              {selectedCustomStep && (
                <div className="mt-4 rounded-lg border border-wm-neutral/20 bg-wm-neutral/5 p-3 space-y-3 text-sm text-wm-blue/80">
                  <div className="flex flex-wrap gap-2">
                    <span className="inline-flex items-center rounded-full bg-white border border-wm-neutral/30 px-2.5 py-1 text-xs">
                      <span className="font-semibold text-wm-blue mr-1">Model</span>
                      {selectedCustomStep.aiModelId || 'Not set'}
                    </span>
                    <span className="inline-flex items-center rounded-full bg-white border border-wm-neutral/30 px-2.5 py-1 text-xs">
                      <span className="font-semibold text-wm-blue mr-1">Output</span>
                      {selectedCustomStep.outputType === 'EXCEL_DOC' ? 'Excel Doc' : selectedCustomStep.outputType === 'PRESENTATION' ? 'Presentation' : 'Chat Interface'}
                    </span>
                    <span className="inline-flex items-center rounded-full bg-white border border-wm-neutral/30 px-2.5 py-1 text-xs">
                      <span className="font-semibold text-wm-blue mr-1">Docs</span>
                      {(selectedCustomStep.selectedDocumentIds || []).length}
                    </span>
                    <span className="inline-flex items-center rounded-full bg-white border border-wm-neutral/30 px-2.5 py-1 text-xs">
                      <span className="font-semibold text-wm-blue mr-1">Transcripts</span>
                      {(selectedCustomStep.selectedTranscriptIds || []).length}
                    </span>
                  </div>

                  <div className="rounded-lg border border-wm-neutral/20 bg-white px-3 py-2">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-wm-blue/60">Prompt</p>
                    <p className="mt-1 text-xs text-wm-blue/80 line-clamp-2">{selectedCustomStep.prompt || 'No prompt provided.'}</p>
                  </div>

                  {(selectedCustomStepDocumentLabels.length > 0 || selectedCustomStepTranscriptLabels.length > 0) && (
                    <details className="rounded-lg border border-wm-neutral/20 bg-white px-3 py-2">
                      <summary className="cursor-pointer text-xs font-semibold text-wm-blue">
                        View selected sources ({selectedCustomStepDocumentLabels.length + selectedCustomStepTranscriptLabels.length})
                      </summary>
                      <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                          <p className="text-[11px] font-semibold uppercase tracking-wide text-wm-blue/60 mb-1">Documents</p>
                          {selectedCustomStepDocumentLabels.length === 0 ? (
                            <p className="text-xs text-wm-blue/50">None selected</p>
                          ) : (
                            <ul className="list-disc pl-4 text-xs space-y-1 max-h-24 overflow-auto">
                              {selectedCustomStepDocumentLabels.map((label, index) => (
                                <li key={`doc-${label}-${index}`}>{label}</li>
                              ))}
                            </ul>
                          )}
                        </div>
                        <div>
                          <p className="text-[11px] font-semibold uppercase tracking-wide text-wm-blue/60 mb-1">Meeting transcripts</p>
                          {selectedCustomStepTranscriptLabels.length === 0 ? (
                            <p className="text-xs text-wm-blue/50">None selected</p>
                          ) : (
                            <ul className="list-disc pl-4 text-xs space-y-1 max-h-24 overflow-auto">
                              {selectedCustomStepTranscriptLabels.map((label, index) => (
                                <li key={`tr-${label}-${index}`}>{label}</li>
                              ))}
                            </ul>
                          )}
                        </div>
                      </div>
                    </details>
                  )}

                  {(selectedCustomStep.outputType || 'CHAT_INTERFACE') === 'CHAT_INTERFACE' && (
                    <div className="rounded-lg border border-wm-accent/20 bg-white p-3">
                      <p className="text-sm font-semibold text-wm-blue">Chat Interface Component</p>
                      <p className="text-xs text-wm-blue/60 mt-1">Use this embedded chat to run the custom-step prompt with selected sources.</p>

                      <div className="mt-2 rounded-lg border border-wm-neutral/20 bg-wm-neutral/5 p-2 h-64 overflow-auto space-y-2">
                        {((customStepChatByStepId[selectedCustomStep.id] || []).length === 0) && (
                          <p className="text-xs text-wm-blue/50">No messages yet. Ask your first question.</p>
                        )}
                        {(customStepChatByStepId[selectedCustomStep.id] || []).map((message, index) => (
                          <div
                            key={`${selectedCustomStep.id}-msg-${index}`}
                            className={`max-w-[90%] rounded-lg px-3 py-2 text-xs whitespace-pre-wrap ${
                              message.role === 'user'
                                ? 'ml-auto bg-wm-accent text-white'
                                : 'mr-auto bg-white border border-wm-neutral/20 text-wm-blue'
                            }`}
                          >
                            {message.content}
                          </div>
                        ))}
                        {isCustomStepChatSending && (
                          <div className="mr-auto bg-white border border-wm-neutral/20 text-wm-blue rounded-lg px-3 py-2 text-xs">
                            Thinking...
                          </div>
                        )}
                      </div>

                      <div className="mt-2 flex gap-2">
                        <textarea
                          value={customStepChatInput}
                          onChange={(event) => setCustomStepChatInput(event.target.value)}
                          onKeyDown={(event) => {
                            if (event.key === 'Enter' && !event.shiftKey) {
                              event.preventDefault();
                              void handleSendCustomStepChat();
                            }
                          }}
                          placeholder="Type a message..."
                          rows={2}
                          className="flex-1 rounded-lg border border-wm-neutral/30 bg-white px-3 py-2 text-xs text-wm-blue"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            void handleSendCustomStepChat();
                          }}
                          disabled={isCustomStepChatSending || !customStepChatInput.trim()}
                          className={`px-3 py-2 rounded-lg text-xs font-semibold ${
                            isCustomStepChatSending || !customStepChatInput.trim()
                              ? 'bg-wm-neutral/20 text-wm-blue/40 cursor-not-allowed'
                              : 'bg-wm-accent text-white hover:bg-wm-accent/90'
                          }`}
                        >
                          Send
                        </button>
                      </div>

                    </div>
                  )}

                  {(selectedCustomStep.outputType || 'CHAT_INTERFACE') === 'EXCEL_DOC' && (
                    <div className="rounded-lg border border-wm-accent/20 bg-white p-3">
                      <p className="text-sm font-semibold text-wm-blue">Excel Doc Component</p>
                      <p className="text-xs text-wm-blue/60 mt-1">Download a CSV that can be opened in Excel.</p>
                      <div className="mt-2 rounded-lg border border-wm-neutral/20 bg-wm-neutral/5 p-2">
                        <p className="text-xs font-semibold text-wm-blue">Template file</p>
                        {selectedCustomStep.excelTemplate ? (
                          <div className="mt-1 flex items-center gap-2 flex-wrap">
                            <span className="text-xs text-wm-blue/70">{selectedCustomStep.excelTemplate.fileName}</span>
                            {selectedCustomStep.excelTemplate.dataUrl && (
                              <a
                                href={selectedCustomStep.excelTemplate.dataUrl}
                                download={selectedCustomStep.excelTemplate.fileName}
                                className="text-xs font-semibold text-wm-accent hover:underline"
                              >
                                Download template
                              </a>
                            )}
                          </div>
                        ) : (
                          <p className="mt-1 text-xs text-wm-blue/60">No template attached.</p>
                        )}
                        <button
                          type="button"
                          onClick={() => {
                            void loadCustomStepTemplatesFromSharePoint('EXCEL');
                          }}
                          disabled={isLoadingCustomStepExcelTemplates}
                          className={`mt-2 px-3 py-2 rounded-lg text-xs font-semibold ${
                            isLoadingCustomStepExcelTemplates
                              ? 'bg-wm-neutral/20 text-wm-blue/40 cursor-not-allowed'
                              : 'bg-wm-accent text-white hover:bg-wm-accent/90'
                          }`}
                        >
                          {isLoadingCustomStepExcelTemplates ? 'Loading...' : 'Load Excel files from SharePoint'}
                        </button>
                        {customStepExcelTemplateOptions.length > 0 && (
                          <ul className="mt-2 space-y-2 max-h-40 overflow-auto rounded-lg border border-wm-neutral/20 bg-white p-2">
                            {customStepExcelTemplateOptions.map((doc) => (
                              <li key={doc.id} className="flex items-center justify-between gap-2 rounded border border-wm-neutral/20 px-2 py-1.5">
                                <div>
                                  <p className="text-xs font-semibold text-wm-blue">{doc.fileName}</p>
                                  <p className="text-[11px] text-wm-blue/60">{doc.path || doc.url || 'SharePoint file'}</p>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => {
                                    void handleUseSharePointExcelTemplateForSelectedStep(doc);
                                  }}
                                  className="text-xs font-semibold text-wm-accent hover:underline"
                                >
                                  Use
                                </button>
                              </li>
                            ))}
                          </ul>
                        )}
                        <p className="mt-1 text-[11px] text-wm-blue/50">Select a replacement template from the configured SharePoint folder.</p>
                      </div>
                      <div className="mt-2 flex items-center gap-2 flex-wrap">
                        <a
                          href={`data:text/csv;charset=utf-8,${encodeURIComponent(buildCustomStepExcelCsv(selectedCustomStep))}`}
                          download={`${selectedCustomStep.title.replace(/\s+/g, '-').toLowerCase() || 'custom-step'}.csv`}
                          className="px-3 py-2 rounded-lg bg-wm-accent text-white text-xs font-semibold hover:bg-wm-accent/90"
                        >
                          Download CSV
                        </a>
                        <button
                          type="button"
                          onClick={() => handleCopyCustomOutputText(buildCustomStepExcelCsv(selectedCustomStep))}
                          className="px-3 py-2 rounded-lg border border-wm-neutral/30 text-xs font-semibold text-wm-blue hover:bg-wm-neutral/10"
                        >
                          Copy CSV
                        </button>
                      </div>
                    </div>
                  )}

                  {(selectedCustomStep.outputType || 'CHAT_INTERFACE') === 'PRESENTATION' && (
                    <div className="rounded-lg border border-wm-accent/20 bg-white p-3">
                      <p className="text-sm font-semibold text-wm-blue">Presentation Component</p>
                      <p className="text-xs text-wm-blue/60 mt-1">Copy a slide-ready outline for presentation tools.</p>
                      <div className="mt-2 rounded-lg border border-wm-neutral/20 bg-wm-neutral/5 p-2">
                        <p className="text-xs font-semibold text-wm-blue">PowerPoint template file</p>
                        {selectedCustomStep.presentationTemplate ? (
                          <div className="mt-1 flex items-center gap-2 flex-wrap">
                            <span className="text-xs text-wm-blue/70">{selectedCustomStep.presentationTemplate.fileName}</span>
                            {selectedCustomStep.presentationTemplate.dataUrl && (
                              <a
                                href={selectedCustomStep.presentationTemplate.dataUrl}
                                download={selectedCustomStep.presentationTemplate.fileName}
                                className="text-xs font-semibold text-wm-accent hover:underline"
                              >
                                Download template
                              </a>
                            )}
                          </div>
                        ) : (
                          <p className="mt-1 text-xs text-wm-blue/60">No template attached.</p>
                        )}
                        <button
                          type="button"
                          onClick={() => {
                            void loadCustomStepTemplatesFromSharePoint('PRESENTATION');
                          }}
                          disabled={isLoadingCustomStepPresentationTemplates}
                          className={`mt-2 px-3 py-2 rounded-lg text-xs font-semibold ${
                            isLoadingCustomStepPresentationTemplates
                              ? 'bg-wm-neutral/20 text-wm-blue/40 cursor-not-allowed'
                              : 'bg-wm-accent text-white hover:bg-wm-accent/90'
                          }`}
                        >
                          {isLoadingCustomStepPresentationTemplates ? 'Loading...' : 'Load PowerPoint files from SharePoint'}
                        </button>
                        {customStepPresentationTemplateOptions.length > 0 && (
                          <ul className="mt-2 space-y-2 max-h-40 overflow-auto rounded-lg border border-wm-neutral/20 bg-white p-2">
                            {customStepPresentationTemplateOptions.map((doc) => (
                              <li key={doc.id} className="flex items-center justify-between gap-2 rounded border border-wm-neutral/20 px-2 py-1.5">
                                <div>
                                  <p className="text-xs font-semibold text-wm-blue">{doc.fileName}</p>
                                  <p className="text-[11px] text-wm-blue/60">{doc.path || doc.url || 'SharePoint file'}</p>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => {
                                    void handleUseSharePointPresentationTemplateForSelectedStep(doc);
                                  }}
                                  className="text-xs font-semibold text-wm-accent hover:underline"
                                >
                                  Use
                                </button>
                              </li>
                            ))}
                          </ul>
                        )}
                        <p className="mt-1 text-[11px] text-wm-blue/50">Select a replacement template from the configured SharePoint folder.</p>
                      </div>
                      <textarea
                        readOnly
                        value={`# ${selectedCustomStep.title}\n\n## Objective\n${selectedCustomStep.description || 'Define the objective'}\n\n## Prompt\n${selectedCustomStep.prompt || 'No prompt provided'}\n\n## Template\n${selectedCustomStep.presentationTemplate?.fileName || 'No PowerPoint template selected'}\n\n## Source Documents\n${selectedCustomStepDocumentLabels.length ? selectedCustomStepDocumentLabels.map((label) => `- ${label}`).join('\n') : '- None selected'}\n\n## Source Meeting Transcripts\n${selectedCustomStepTranscriptLabels.length ? selectedCustomStepTranscriptLabels.map((label) => `- ${label}`).join('\n') : '- None selected'}\n\n## Suggested Output\nPresentation`}
                        rows={10}
                        className="mt-2 w-full rounded-lg border border-wm-neutral/30 bg-wm-neutral/5 px-3 py-2 text-xs text-wm-blue"
                      />
                      <button
                        type="button"
                        onClick={() => handleCopyCustomOutputText(`# ${selectedCustomStep.title}\n\n## Objective\n${selectedCustomStep.description || 'Define the objective'}\n\n## Prompt\n${selectedCustomStep.prompt || 'No prompt provided'}\n\n## Template\n${selectedCustomStep.presentationTemplate?.fileName || 'No PowerPoint template selected'}\n\n## Source Documents\n${selectedCustomStepDocumentLabels.length ? selectedCustomStepDocumentLabels.map((label) => `- ${label}`).join('\n') : '- None selected'}\n\n## Source Meeting Transcripts\n${selectedCustomStepTranscriptLabels.length ? selectedCustomStepTranscriptLabels.map((label) => `- ${label}`).join('\n') : '- None selected'}\n\n## Suggested Output\nPresentation`)}
                        className="mt-2 px-3 py-2 rounded-lg bg-wm-accent text-white text-xs font-semibold hover:bg-wm-accent/90"
                      >
                        Copy presentation outline
                      </button>
                    </div>
                  )}

                  {customStepOutputStatus && (
                    <p className="text-xs text-wm-blue/60">{customStepOutputStatus}</p>
                  )}
                </div>
              )}
            </section>
          )}

          {selectedStep?.title === 'Target Domains' && companyId && (
            <section className="mb-6 rounded-xl border border-wm-neutral/30 bg-white p-4 shadow-sm">
              <div className="mb-5 border-b border-wm-neutral/20 pb-4">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-wm-blue/60 mb-2">3) SharePoint presentation reference</h3>
                <p className="text-xs text-wm-blue/60 mb-3">
                  Use presentations from your configured SharePoint folder. The selected deck will guide kickoff presentation output style.
                </p>
                <button
                  type="button"
                  onClick={handleLoadSharePointPresentations}
                  disabled={isSavingKickoffTemplateReference}
                  className={`px-3 py-2 rounded-lg text-xs font-semibold ${
                    isSavingKickoffTemplateReference
                      ? 'bg-wm-neutral/20 text-wm-blue/40 cursor-not-allowed'
                      : 'bg-wm-accent text-white hover:bg-wm-accent/90'
                  }`}
                >
                  {isSavingKickoffTemplateReference ? 'Loading...' : 'Load presentations from SharePoint'}
                </button>

                {sharePointPresentationOptions.length > 0 && (
                  <ul className="mt-3 space-y-2">
                    {sharePointPresentationOptions.map((doc) => (
                      <li key={doc.id} className="rounded-lg border border-wm-neutral/20 bg-white p-3 flex items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-wm-blue">{doc.fileName}</p>
                          <p className="text-xs text-wm-blue/60">{doc.path || doc.url || 'SharePoint file'}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleUseSharePointPresentationAsTemplate(doc)}
                          disabled={isSavingKickoffTemplateReference}
                          className="text-xs font-semibold text-wm-accent hover:underline"
                        >
                          Use as reference
                        </button>
                      </li>
                    ))}
                  </ul>
                )}

                {kickoffTemplateReference && (
                  <div className="mt-3 rounded-lg border border-wm-neutral/20 bg-wm-neutral/5 p-3 flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-wm-blue">{kickoffTemplateReference.fileName}</p>
                      <p className="text-xs text-wm-blue/60">Selected {new Date(kickoffTemplateReference.uploadedAt).toLocaleString()}</p>
                    </div>
                    <button
                      type="button"
                      onClick={handleRemoveKickoffTemplateReference}
                      disabled={isSavingKickoffTemplateReference}
                      className="text-xs font-semibold text-wm-pink hover:underline"
                    >
                      Remove
                    </button>
                  </div>
                )}
                {kickoffTemplateStatus && (
                  <p className="mt-2 text-xs text-wm-blue/70">{kickoffTemplateStatus}</p>
                )}
              </div>

              <div className="flex items-start justify-between gap-3 flex-wrap mb-4">
                <div>
                  <h2 className="text-lg font-semibold text-wm-blue">Target Domains & Kickoff Pitch Use Cases</h2>
                  <p className="text-sm text-wm-blue/60">
                    Focus on the domains and use cases you want to target and pitch during the kickoff meeting.
                  </p>
                </div>
                <span className="text-xs font-semibold px-2 py-1 rounded-full bg-wm-accent/10 text-wm-accent">
                  {selectedKickoffUseCases.length} use case{selectedKickoffUseCases.length === 1 ? '' : 's'} selected
                </span>
              </div>

              <div className="mb-4">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-wm-blue/60 mb-2">1) Choose potential domains</h3>
                <div className="flex flex-wrap gap-2">
                  {defaultDomainSelection.map((domain) => {
                    const isSelected = companySelectedDomains.includes(domain);
                    return (
                      <button
                        key={domain}
                        type="button"
                        onClick={() => handleToggleDomain(domain)}
                        className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                          isSelected
                            ? 'bg-wm-accent text-white border-wm-accent'
                            : 'bg-white text-wm-blue border-wm-neutral/30 hover:border-wm-accent/40'
                        }`}
                      >
                        {domain}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wide text-wm-blue/60 mb-2">2) Pick kickoff pitch use cases</h3>
                {kickoffUseCases.length === 0 ? (
                  <p className="text-sm text-wm-blue/60">No use cases available for the selected domains.</p>
                ) : (
                  <div className="space-y-4">
                    {(companySelectedDomains.length ? companySelectedDomains : defaultDomainSelection).map((domain) => {
                      const domainUseCases = kickoffUseCases.filter((scenario) => (scenario.domain || 'General') === domain);
                      if (domainUseCases.length === 0) {
                        return (
                          <div key={domain} className="rounded-lg border border-wm-neutral/20 p-3">
                            <p className="text-sm font-semibold text-wm-blue">{domain}</p>
                            <p className="text-xs text-wm-blue/50 mt-1">No process use cases found in the library for this domain.</p>
                          </div>
                        );
                      }

                      return (
                        <div key={domain} className="rounded-lg border border-wm-neutral/20 p-3">
                          <div className="mb-2 flex items-center justify-between gap-2 flex-wrap">
                            <p className="text-sm font-semibold text-wm-blue">{domain}</p>
                            <button
                              type="button"
                              onClick={() => handleOpenCreateUseCaseModal(domain, 'kickoff')}
                              className="px-2.5 py-1 text-xs font-semibold rounded-md border border-wm-accent/40 text-wm-accent hover:bg-wm-accent/10"
                            >
                              + Create use case
                            </button>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {domainUseCases.map((scenario) => {
                              const checked = companySelectedScenarios.includes(scenario.id);
                              const fallbackDemoUrl = (scenario as { demoPublishedUrl?: string | null; demoProjectUrl?: string | null }).demoPublishedUrl
                                || (scenario as { demoPublishedUrl?: string | null; demoProjectUrl?: string | null }).demoProjectUrl
                                || null;
                              const latestDemoUrl = (scenario.process ? latestDemoUrlByProcess[scenario.process.trim()] : null) || fallbackDemoUrl;
                              return (
                                <div
                                  key={scenario.id}
                                  onClick={() => handleToggleKickoffUseCase(scenario.id)}
                                  role="checkbox"
                                  aria-checked={checked}
                                  tabIndex={0}
                                  onKeyDown={(event) => {
                                    if (event.key === 'Enter' || event.key === ' ') {
                                      event.preventDefault();
                                      handleToggleKickoffUseCase(scenario.id);
                                    }
                                  }}
                                  className={`relative rounded-lg border p-3 cursor-pointer transition-all duration-200 bg-white shadow-sm ${
                                    checked
                                      ? 'border-wm-accent ring-2 ring-wm-accent/20'
                                      : 'border-wm-neutral/30 hover:border-wm-accent'
                                  }`}
                                >
                                  <div className="absolute top-2 right-2">
                                    <input
                                      type="checkbox"
                                      checked={checked}
                                      onChange={() => handleToggleKickoffUseCase(scenario.id)}
                                      onClick={(event) => event.stopPropagation()}
                                      className="h-4 w-4"
                                    />
                                  </div>

                                  <div className="absolute top-2 left-2 z-10 flex flex-wrap gap-1.5 max-w-[80%]">
                                    <span className={`text-[11px] leading-tight uppercase tracking-wide px-2 py-1 rounded-full font-semibold ${DOMAIN_COLORS[scenario.domain || 'General'] || DOMAIN_COLORS['General']}`}>
                                      {scenario.domain || 'General'}
                                    </span>
                                    <span className="text-[10px] leading-tight tracking-wide px-2 py-1 rounded-full font-medium bg-wm-accent/10 text-wm-accent border border-wm-accent/20">
                                      {scenario.process || 'General process'}
                                    </span>
                                  </div>

                                  <div className="pt-12">
                                    <p className="text-sm font-semibold text-wm-blue pr-6 leading-snug">{scenario.title}</p>
                                    {scenario.description && (
                                      <p className="text-xs text-wm-blue/60 mt-1 line-clamp-3">{scenario.description}</p>
                                    )}
                                    {latestDemoUrl && (
                                      <div className="mt-2">
                                        <a
                                          href={latestDemoUrl}
                                          target="_blank"
                                          rel="noreferrer"
                                          onClick={(event) => event.stopPropagation()}
                                          className="inline-flex items-center gap-1 text-[11px] font-semibold text-wm-accent hover:underline"
                                          title="Open most recent use case demo"
                                        >
                                          <Icons.ExternalLink className="w-3.5 h-3.5" />
                                          Demo
                                        </a>
                                      </div>
                                    )}
                                  </div>
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

              {selectedKickoffUseCases.length > 0 && (
                <div className="mt-5 pt-4 border-t border-wm-neutral/20 flex items-center justify-between gap-3 flex-wrap">
                  <p className="text-xs text-wm-blue/60">
                    {selectedKickoffUseCases.length} process use case{selectedKickoffUseCases.length === 1 ? '' : 's'} selected for kickoff.
                  </p>
                  <button
                    type="button"
                    onClick={handleCreateKickoffPresentationPrompt}
                    className="px-4 py-2 rounded-lg bg-wm-accent text-white text-sm font-semibold hover:bg-wm-accent/90"
                  >
                    Create Kickoff Presentation
                  </button>
                </div>
              )}
            </section>
          )}

          {selectedStep?.title === 'Kickoff Meeting' && companyId && (
            <section className="mb-6 rounded-xl border border-wm-neutral/30 bg-white p-4 shadow-sm">
              <h2 className="text-lg font-semibold text-wm-blue">Kickoff Meeting</h2>
              <p className="text-sm text-wm-blue/60 mt-1">
                Paste the Gamma kickoff presentation URL so the journey tracks the final deck.
              </p>
              <div className="mt-4">
                <label className="block text-xs font-semibold uppercase tracking-wide text-wm-blue/60 mb-2">
                  Kickoff presentation URL
                </label>
                <div className="flex flex-col md:flex-row gap-2">
                  <input
                    type="url"
                    value={kickoffPresentationUrl}
                    onChange={(event) => {
                      setKickoffPresentationUrl(event.target.value);
                      kickoffUrlDirtyRef.current = true;
                      setKickoffUrlStatus(null);
                    }}
                    placeholder="https://gamma.app/docs/..."
                    className="flex-1 rounded-lg border border-wm-neutral/30 px-3 py-2 text-sm text-wm-blue"
                  />
                </div>
                {kickoffPresentationUrl.trim() && (
                  <a
                    href={kickoffPresentationUrl.trim()}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-2 inline-flex text-xs font-semibold text-wm-accent hover:underline"
                  >
                    Open kickoff presentation
                  </a>
                )}
                {kickoffUrlStatus && (
                  <p className="mt-2 text-xs text-wm-blue/70">{kickoffUrlStatus}</p>
                )}
              </div>

              <div className="mt-6 border-t border-wm-neutral/20 pt-5">
                <h3 className="text-sm font-semibold text-wm-blue">Kickoff Meeting Notes</h3>
                <p className="text-xs text-wm-blue/60 mt-1">
                  Meeting notes and transcripts are managed in the connected SharePoint folder.
                </p>
                <div className="mt-3 rounded-lg border border-wm-neutral/20 bg-wm-neutral/5 p-3">
                  <p className="text-sm text-wm-blue/70">
                    Add kickoff documents and transcripts directly to the configured SharePoint folder. This page no longer accepts manual note uploads or pasted transcripts.
                  </p>
                </div>
              </div>
            </section>
          )}

          {selectedStep?.title === 'Make Hypotheses (High‑level)' && companyId && (
            <section className="mb-6 rounded-xl border border-wm-neutral/30 bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div>
                  <h2 className="text-lg font-semibold text-wm-blue">High-Level Hypotheses</h2>
                  <p className="text-sm text-wm-blue/60 mt-1">
                    Summary and targeting recommendations generated from kickoff meeting notes.
                  </p>
                </div>
                <span className="text-xs font-semibold px-2 py-1 rounded-full bg-wm-accent/10 text-wm-accent">
                  {hypothesisBreakdown.length} hypothesis target{hypothesisBreakdown.length === 1 ? '' : 's'}
                </span>
              </div>

              {kickoffMeetingNotes.length === 0 ? (
                <div className="mt-4 rounded-lg border border-wm-neutral/20 bg-wm-neutral/5 p-4">
                  <p className="text-sm text-wm-blue/70">
                    Add kickoff meeting notes in the Kickoff Meeting step to generate high-level hypotheses.
                  </p>
                </div>
              ) : (
                <>
                  <div className="mt-5">
                    <h3 className="text-xs font-semibold uppercase tracking-wide text-wm-blue/60 mb-2">Kickoff Notes Summary</h3>
                    {kickoffNotesSummary.length === 0 ? (
                      <p className="text-sm text-wm-blue/70">Notes were captured, but there is not enough sentence-level detail yet to summarize.</p>
                    ) : (
                      <ul className="list-disc list-inside space-y-2 text-sm text-wm-blue/70">
                        {kickoffNotesSummary.map((item, index) => (
                          <li key={`${item.slice(0, 24)}-${index}`}>{item}</li>
                        ))}
                      </ul>
                    )}
                  </div>

                  <div className="mt-6 border-t border-wm-neutral/20 pt-5">
                    <h3 className="text-xs font-semibold uppercase tracking-wide text-wm-blue/60 mb-3">
                      Domain / Function / Use Case Breakdown
                    </h3>
                    {hypothesisBreakdown.length === 0 ? (
                      <p className="text-sm text-wm-blue/70">
                        Select target domains and kickoff use cases first, then return here for hypothesis guidance.
                      </p>
                    ) : (
                      <div className="space-y-3">
                        {hypothesisBreakdown.map((item, index) => (
                          <article key={`${item.domain}-${item.useCaseTitle}-${index}`} className="rounded-lg border border-wm-neutral/20 p-3">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                              <div>
                                <p className="text-[11px] uppercase tracking-wide text-wm-blue/50">Domain</p>
                                <p className="text-sm font-semibold text-wm-blue">{item.domain}</p>
                              </div>
                              <div>
                                <p className="text-[11px] uppercase tracking-wide text-wm-blue/50">Function / Process</p>
                                <p className="text-sm font-semibold text-wm-blue">{item.functionName}</p>
                              </div>
                              <div>
                                <p className="text-[11px] uppercase tracking-wide text-wm-blue/50">Use Case to Target</p>
                                <p className="text-sm font-semibold text-wm-blue">{item.useCaseTitle}</p>
                              </div>
                            </div>
                            <p className="mt-2 text-xs text-wm-blue/70"><span className="font-semibold">Why now:</span> {item.why}</p>
                          </article>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}

              <div className="mt-6 border-t border-wm-neutral/20 pt-5">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div>
                    <h3 className="text-xs font-semibold uppercase tracking-wide text-wm-blue/60 mb-2">
                      Phase 2 Target Domains & Functions
                    </h3>
                    <p className="text-sm text-wm-blue/70">
                      Choose the actual domains/functions to pursue in phase 2 based on the recommendations above.
                    </p>
                  </div>
                  <span className="text-xs font-semibold px-2 py-1 rounded-full bg-wm-accent/10 text-wm-accent">
                    {phase2SelectedUseCases.length} function target{phase2SelectedUseCases.length === 1 ? '' : 's'} selected
                  </span>
                </div>

                <div className="mt-4">
                  <h4 className="text-xs font-semibold uppercase tracking-wide text-wm-blue/60 mb-2">1) Choose domains</h4>
                  <div className="flex flex-wrap gap-2">
                    {defaultDomainSelection.map((domain) => {
                      const selected = phase2SelectedDomains.includes(domain);
                      return (
                        <button
                          key={domain}
                          type="button"
                          onClick={() => handleTogglePhase2Domain(domain)}
                          className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                            selected
                              ? 'bg-wm-accent text-white border-wm-accent'
                              : 'bg-white text-wm-blue border-wm-neutral/30 hover:border-wm-accent/40'
                          }`}
                        >
                          {domain}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="mt-4">
                  <h4 className="text-xs font-semibold uppercase tracking-wide text-wm-blue/60 mb-2">2) Choose functions / use cases</h4>
                  {phase2UseCases.length === 0 ? (
                    <p className="text-sm text-wm-blue/70">No use cases available for the selected domains.</p>
                  ) : (
                    <div className="space-y-4">
                      {(phase2SelectedDomains.length ? phase2SelectedDomains : defaultDomainSelection).map((domain) => {
                        const domainUseCases = phase2UseCases.filter((scenario) => (scenario.domain || 'General') === domain);
                        if (domainUseCases.length === 0) {
                          return (
                            <div key={domain} className="rounded-lg border border-wm-neutral/20 p-3">
                              <p className="text-sm font-semibold text-wm-blue">{domain}</p>
                              <p className="text-xs text-wm-blue/50 mt-1">No process use cases found in the library for this domain.</p>
                            </div>
                          );
                        }

                        return (
                          <div key={domain} className="rounded-lg border border-wm-neutral/20 p-3">
                            <div className="mb-2 flex items-center justify-between gap-2 flex-wrap">
                              <p className="text-sm font-semibold text-wm-blue">{domain}</p>
                              <button
                                type="button"
                                onClick={() => handleOpenCreateUseCaseModal(domain, 'phase2')}
                                className="px-2.5 py-1 text-xs font-semibold rounded-md border border-wm-accent/40 text-wm-accent hover:bg-wm-accent/10"
                              >
                                + Create use case
                              </button>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              {domainUseCases.map((scenario) => {
                                const checked = phase2SelectedUseCases.includes(scenario.id);
                                const isRecommended = recommendedScenarioIds.has(scenario.id);
                                const fallbackDemoUrl = (scenario as { demoPublishedUrl?: string | null; demoProjectUrl?: string | null }).demoPublishedUrl
                                  || (scenario as { demoPublishedUrl?: string | null; demoProjectUrl?: string | null }).demoProjectUrl
                                  || null;
                                const latestDemoUrl = (scenario.process ? latestDemoUrlByProcess[scenario.process.trim()] : null) || fallbackDemoUrl;
                                return (
                                  <div
                                    key={scenario.id}
                                    onClick={() => handleTogglePhase2UseCase(scenario.id)}
                                    role="checkbox"
                                    aria-checked={checked}
                                    tabIndex={0}
                                    onKeyDown={(event) => {
                                      if (event.key === 'Enter' || event.key === ' ') {
                                        event.preventDefault();
                                        handleTogglePhase2UseCase(scenario.id);
                                      }
                                    }}
                                    className={`relative rounded-lg border p-3 cursor-pointer transition-all duration-200 bg-white shadow-sm ${
                                      checked
                                        ? 'border-wm-accent ring-2 ring-wm-accent/20'
                                        : 'border-wm-neutral/30 hover:border-wm-accent'
                                    }`}
                                  >
                                    <div className="absolute top-2 right-2">
                                      <input
                                        type="checkbox"
                                        checked={checked}
                                        onChange={() => handleTogglePhase2UseCase(scenario.id)}
                                        onClick={(event) => event.stopPropagation()}
                                        className="h-4 w-4"
                                      />
                                    </div>

                                    <div className="absolute top-2 left-2 z-10 flex flex-wrap gap-1.5 max-w-[80%]">
                                      <span className={`text-[11px] leading-tight uppercase tracking-wide px-2 py-1 rounded-full font-semibold ${DOMAIN_COLORS[scenario.domain || 'General'] || DOMAIN_COLORS['General']}`}>
                                        {scenario.domain || 'General'}
                                      </span>
                                      <span className="text-[10px] leading-tight tracking-wide px-2 py-1 rounded-full font-medium bg-wm-accent/10 text-wm-accent border border-wm-accent/20">
                                        {scenario.process || 'General process'}
                                      </span>
                                    </div>

                                    <div className="pt-12">
                                      <p className="text-sm font-semibold text-wm-blue pr-6 leading-snug">{scenario.title}</p>
                                      {scenario.description && (
                                        <p className="text-xs text-wm-blue/60 mt-1 line-clamp-3">{scenario.description}</p>
                                      )}
                                      {isRecommended && (
                                        <p className="text-[11px] font-semibold text-wm-accent mt-2">Recommended from kickoff notes</p>
                                      )}
                                      {latestDemoUrl && (
                                        <div className="mt-2">
                                          <a
                                            href={latestDemoUrl}
                                            target="_blank"
                                            rel="noreferrer"
                                            onClick={(event) => event.stopPropagation()}
                                            className="inline-flex items-center gap-1 text-[11px] font-semibold text-wm-accent hover:underline"
                                            title="Open most recent use case demo"
                                          >
                                            <Icons.ExternalLink className="w-3.5 h-3.5" />
                                            Demo
                                          </a>
                                        </div>
                                      )}
                                    </div>
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

                <div className="mt-4 flex items-center justify-between gap-3 flex-wrap">
                  {phase2SelectedUseCases.length > 0 && (
                    <button
                      type="button"
                      onClick={handleCreatePhase2PresentationPrompt}
                      className="px-4 py-2 rounded-lg bg-wm-accent text-white text-sm font-semibold hover:bg-wm-accent/90"
                    >
                      Create Presentation
                    </button>
                  )}
                  {phase2TargetsStatus && (
                    <p className="text-xs text-wm-blue/70">{phase2TargetsStatus}</p>
                  )}
                  {isSavingPhase2Targets && <p className="text-xs text-wm-blue/70">Saving...</p>}
                </div>
              </div>
            </section>
          )}

          {selectedStep?.title === 'Functional High‑Level' && companyId && (
            <section className="mb-6 rounded-xl border border-wm-neutral/30 bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div>
                  <h2 className="text-lg font-semibold text-wm-blue">Functional High-Level Meetings</h2>
                  <p className="text-sm text-wm-blue/60 mt-1">
                    Capture presentation URLs, notes, and documents for multiple domain/function high-level meetings.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleAddFunctionalHighLevelMeeting}
                  className="px-3 py-2 text-xs font-semibold rounded-md bg-wm-accent text-white hover:bg-wm-accent/90"
                >
                  Add meeting
                </button>
              </div>

              <div className="mt-4 grid grid-cols-1 lg:grid-cols-3 gap-4">
                <div className="rounded-lg border border-wm-neutral/20 p-3 lg:col-span-1">
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-wm-blue/60 mb-2">Meetings</h3>
                  {functionalHighLevelMeetings.length === 0 ? (
                    <p className="text-sm text-wm-blue/60">No meetings yet. Click “Add meeting”.</p>
                  ) : (
                    <ul className="space-y-2">
                      {functionalHighLevelMeetings.map((meeting, index) => (
                        <li key={meeting.id}>
                          <button
                            type="button"
                            onClick={() => setSelectedFunctionalMeetingId(meeting.id)}
                            className={`w-full text-left rounded-lg border px-3 py-2 text-sm ${
                              selectedFunctionalMeetingId === meeting.id
                                ? 'border-wm-accent bg-wm-accent/5'
                                : 'border-wm-neutral/30 hover:border-wm-blue/40'
                            }`}
                          >
                            <p className="font-semibold text-wm-blue">Meeting {index + 1}</p>
                            <p className="text-xs text-wm-blue/60 mt-1">{meeting.domain} • {meeting.functionName}</p>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div className="rounded-lg border border-wm-neutral/20 p-3 lg:col-span-2">
                  {!selectedFunctionalMeeting ? (
                    <p className="text-sm text-wm-blue/60">Select a meeting to add details.</p>
                  ) : (
                    <>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-semibold uppercase tracking-wide text-wm-blue/60 mb-1">Domain</label>
                          <input
                            type="text"
                            value={selectedFunctionalMeeting.domain}
                            onChange={(event) => updateSelectedFunctionalMeeting((meeting) => ({
                              ...meeting,
                              domain: event.target.value,
                              updatedAt: Date.now()
                            }))}
                            className="w-full rounded-lg border border-wm-neutral/30 px-3 py-2 text-sm text-wm-blue"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold uppercase tracking-wide text-wm-blue/60 mb-1">Function</label>
                          <input
                            type="text"
                            value={selectedFunctionalMeeting.functionName}
                            onChange={(event) => updateSelectedFunctionalMeeting((meeting) => ({
                              ...meeting,
                              functionName: event.target.value,
                              updatedAt: Date.now()
                            }))}
                            className="w-full rounded-lg border border-wm-neutral/30 px-3 py-2 text-sm text-wm-blue"
                          />
                        </div>
                      </div>

                      <div className="mt-4">
                        <label className="block text-xs font-semibold uppercase tracking-wide text-wm-blue/60 mb-1">Meeting presentation URL</label>
                        <div className="flex flex-col md:flex-row gap-2">
                          <input
                            type="url"
                            value={selectedFunctionalMeeting.presentationUrl || ''}
                            onChange={(event) => updateSelectedFunctionalMeeting((meeting) => ({
                              ...meeting,
                              presentationUrl: event.target.value,
                              updatedAt: Date.now()
                            }))}
                            placeholder="https://gamma.app/docs/..."
                            className="flex-1 rounded-lg border border-wm-neutral/30 px-3 py-2 text-sm text-wm-blue"
                          />
                          <button
                            type="button"
                            onClick={() => handleRemoveFunctionalHighLevelMeeting(selectedFunctionalMeeting.id)}
                            className="px-3 py-2 text-xs font-semibold rounded-md border border-wm-pink/40 text-wm-pink hover:bg-wm-pink/5"
                          >
                            Remove meeting
                          </button>
                        </div>
                        {selectedFunctionalMeeting.presentationUrl?.trim() && (
                          <a
                            href={selectedFunctionalMeeting.presentationUrl.trim()}
                            target="_blank"
                            rel="noreferrer"
                            className="mt-2 inline-flex text-xs font-semibold text-wm-accent hover:underline"
                          >
                            Open meeting presentation
                          </a>
                        )}
                      </div>

                      <div className="mt-4 rounded-lg border border-wm-neutral/20 bg-wm-neutral/5 p-3">
                        <p className="text-sm text-wm-blue/70">
                          Meeting documents and transcripts are managed in SharePoint. Add files to the configured folder to keep this journey aligned with source artifacts.
                        </p>
                      </div>
                    </>
                  )}
                </div>
              </div>

              <div className="mt-4 flex items-center justify-end gap-3">
                {isSavingFunctionalMeetings && (
                  <p className="text-xs text-wm-blue/70">Saving...</p>
                )}
                {functionalMeetingsStatus && (
                  <p className="text-xs text-wm-blue/70">{functionalMeetingsStatus}</p>
                )}
              </div>
            </section>
          )}

          {selectedStep?.title === 'Functional Deep Dive' && companyId && (
            <section className="mb-6 rounded-xl border border-wm-neutral/30 bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div>
                  <h2 className="text-lg font-semibold text-wm-blue">Functional Deep Dive Meetings</h2>
                  <p className="text-sm text-wm-blue/60 mt-1">
                    Capture presentation URLs, notes, and documents for multiple domain/function deep dive meetings.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleAddFunctionalDeepDiveMeeting}
                  className="px-3 py-2 text-xs font-semibold rounded-md bg-wm-accent text-white hover:bg-wm-accent/90"
                >
                  Add meeting
                </button>
              </div>

              <div className="mt-4 grid grid-cols-1 lg:grid-cols-3 gap-4">
                <div className="rounded-lg border border-wm-neutral/20 p-3 lg:col-span-1">
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-wm-blue/60 mb-2">Meetings</h3>
                  {functionalDeepDiveMeetings.length === 0 ? (
                    <p className="text-sm text-wm-blue/60">No meetings yet. Click “Add meeting”.</p>
                  ) : (
                    <ul className="space-y-2">
                      {functionalDeepDiveMeetings.map((meeting, index) => (
                        <li key={meeting.id}>
                          <button
                            type="button"
                            onClick={() => setSelectedDeepDiveMeetingId(meeting.id)}
                            className={`w-full text-left rounded-lg border px-3 py-2 text-sm ${
                              selectedDeepDiveMeetingId === meeting.id
                                ? 'border-wm-accent bg-wm-accent/5'
                                : 'border-wm-neutral/30 hover:border-wm-blue/40'
                            }`}
                          >
                            <p className="font-semibold text-wm-blue">Meeting {index + 1}</p>
                            <p className="text-xs text-wm-blue/60 mt-1">{meeting.domain} • {meeting.functionName}</p>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div className="rounded-lg border border-wm-neutral/20 p-3 lg:col-span-2">
                  {!selectedDeepDiveMeeting ? (
                    <p className="text-sm text-wm-blue/60">Select a meeting to add details.</p>
                  ) : (
                    <>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-semibold uppercase tracking-wide text-wm-blue/60 mb-1">Domain</label>
                          <input
                            type="text"
                            value={selectedDeepDiveMeeting.domain}
                            onChange={(event) => updateSelectedDeepDiveMeeting((meeting) => ({
                              ...meeting,
                              domain: event.target.value,
                              updatedAt: Date.now()
                            }))}
                            className="w-full rounded-lg border border-wm-neutral/30 px-3 py-2 text-sm text-wm-blue"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold uppercase tracking-wide text-wm-blue/60 mb-1">Function</label>
                          <input
                            type="text"
                            value={selectedDeepDiveMeeting.functionName}
                            onChange={(event) => updateSelectedDeepDiveMeeting((meeting) => ({
                              ...meeting,
                              functionName: event.target.value,
                              updatedAt: Date.now()
                            }))}
                            className="w-full rounded-lg border border-wm-neutral/30 px-3 py-2 text-sm text-wm-blue"
                          />
                        </div>
                      </div>

                      <div className="mt-4">
                        <label className="block text-xs font-semibold uppercase tracking-wide text-wm-blue/60 mb-1">Meeting presentation URL</label>
                        <div className="flex flex-col md:flex-row gap-2">
                          <input
                            type="url"
                            value={selectedDeepDiveMeeting.presentationUrl || ''}
                            onChange={(event) => updateSelectedDeepDiveMeeting((meeting) => ({
                              ...meeting,
                              presentationUrl: event.target.value,
                              updatedAt: Date.now()
                            }))}
                            placeholder="https://gamma.app/docs/..."
                            className="flex-1 rounded-lg border border-wm-neutral/30 px-3 py-2 text-sm text-wm-blue"
                          />
                          <button
                            type="button"
                            onClick={() => handleRemoveFunctionalDeepDiveMeeting(selectedDeepDiveMeeting.id)}
                            className="px-3 py-2 text-xs font-semibold rounded-md border border-wm-pink/40 text-wm-pink hover:bg-wm-pink/5"
                          >
                            Remove meeting
                          </button>
                        </div>
                        {selectedDeepDiveMeeting.presentationUrl?.trim() && (
                          <a
                            href={selectedDeepDiveMeeting.presentationUrl.trim()}
                            target="_blank"
                            rel="noreferrer"
                            className="mt-2 inline-flex text-xs font-semibold text-wm-accent hover:underline"
                          >
                            Open meeting presentation
                          </a>
                        )}
                      </div>

                      <div className="mt-4 rounded-lg border border-wm-neutral/20 bg-wm-neutral/5 p-3">
                        <p className="text-sm text-wm-blue/70">
                          Meeting documents and transcripts are managed in SharePoint. Add files to the configured folder to keep this journey aligned with source artifacts.
                        </p>
                      </div>
                    </>
                  )}
                </div>
              </div>

              <div className="mt-4 flex items-center justify-end gap-3">
                {isSavingDeepDiveMeetings && (
                  <p className="text-xs text-wm-blue/70">Saving...</p>
                )}
                {deepDiveMeetingsStatus && (
                  <p className="text-xs text-wm-blue/70">{deepDiveMeetingsStatus}</p>
                )}
              </div>
            </section>
          )}

          {selectedStep?.title === 'Make Hypotheses (Deep Dive)' && companyId && (
            <section className="mb-6 rounded-xl border border-wm-neutral/30 bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div>
                  <h2 className="text-lg font-semibold text-wm-blue">Deep Dive Hypotheses</h2>
                  <p className="text-sm text-wm-blue/60 mt-1">
                    Summary and targeting recommendations generated from Functional High-Level meeting notes and documents.
                  </p>
                </div>
                <span className="text-xs font-semibold px-2 py-1 rounded-full bg-wm-accent/10 text-wm-accent">
                  {deepDiveHypothesisBreakdown.length} hypothesis target{deepDiveHypothesisBreakdown.length === 1 ? '' : 's'}
                </span>
              </div>

              {functionalHighLevelMeetings.length === 0 ? (
                <div className="mt-4 rounded-lg border border-wm-neutral/20 bg-wm-neutral/5 p-4">
                  <p className="text-sm text-wm-blue/70">
                    Add Functional High-Level meetings first to generate deep dive hypotheses.
                  </p>
                </div>
              ) : (
                <>
                  <div className="mt-5">
                    <h3 className="text-xs font-semibold uppercase tracking-wide text-wm-blue/60 mb-2">Functional High-Level Notes Summary</h3>
                    {deepDiveNotesSummary.length === 0 ? (
                      <p className="text-sm text-wm-blue/70">Notes were captured, but there is not enough sentence-level detail yet to summarize.</p>
                    ) : (
                      <ul className="list-disc list-inside space-y-2 text-sm text-wm-blue/70">
                        {deepDiveNotesSummary.map((item, index) => (
                          <li key={`${item.slice(0, 24)}-${index}`}>{item}</li>
                        ))}
                      </ul>
                    )}
                  </div>

                  <div className="mt-5 border-t border-wm-neutral/20 pt-4">
                    <h4 className="text-xs font-semibold uppercase tracking-wide text-wm-blue/60 mb-2">Select one PowerPoint template from SharePoint (optional)</h4>
                    <p className="text-xs text-wm-blue/60 mb-3">
                      Load files from the configured SharePoint folder, then choose one PowerPoint deck as the style reference.
                    </p>
                    <button
                      type="button"
                      onClick={handleLoadDeepDiveSharePointPresentations}
                      disabled={isLoadingDeepDiveSharePointPresentations || isSavingDeepDiveTemplateReference}
                      className={`px-3 py-2 rounded-lg text-xs font-semibold ${
                        isLoadingDeepDiveSharePointPresentations || isSavingDeepDiveTemplateReference
                          ? 'bg-wm-neutral/20 text-wm-blue/40 cursor-not-allowed'
                          : 'bg-wm-accent text-white hover:bg-wm-accent/90'
                      }`}
                    >
                      {isLoadingDeepDiveSharePointPresentations ? 'Loading...' : 'Load PowerPoint files from SharePoint'}
                    </button>

                    {deepDiveSharePointPresentationOptions.length > 0 && (
                      <ul className="mt-3 space-y-2">
                        {deepDiveSharePointPresentationOptions.map((doc) => (
                          <li key={doc.id} className="rounded-lg border border-wm-neutral/20 bg-white p-3 flex items-center justify-between gap-3">
                            <div>
                              <p className="text-sm font-semibold text-wm-blue">{doc.fileName}</p>
                              <p className="text-xs text-wm-blue/60">{doc.path || doc.url || 'SharePoint file'}</p>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleUseSharePointPresentationAsDeepDiveTemplate(doc)}
                              disabled={isSavingDeepDiveTemplateReference}
                              className="text-xs font-semibold text-wm-accent hover:underline"
                            >
                              Use as reference
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}

                    {deepDiveTemplateReference && (
                      <div className="mt-3 rounded-lg border border-wm-neutral/20 bg-wm-neutral/5 p-3 flex items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-wm-blue">{deepDiveTemplateReference.fileName}</p>
                          <p className="text-xs text-wm-blue/60">Selected {new Date(deepDiveTemplateReference.uploadedAt).toLocaleString()}</p>
                        </div>
                        <button
                          type="button"
                          onClick={handleRemoveDeepDiveTemplateReference}
                          disabled={isSavingDeepDiveTemplateReference}
                          className="text-xs font-semibold text-wm-pink hover:underline"
                        >
                          Remove
                        </button>
                      </div>
                    )}
                    {deepDiveTemplateStatus && (
                      <p className="mt-2 text-xs text-wm-blue/70">{deepDiveTemplateStatus}</p>
                    )}
                  </div>

                  <div className="mt-6 border-t border-wm-neutral/20 pt-5">
                    <h3 className="text-xs font-semibold uppercase tracking-wide text-wm-blue/60 mb-3">
                      Domain / Function / Use Case Breakdown
                    </h3>
                    {deepDiveHypothesisBreakdown.length === 0 ? (
                      <p className="text-sm text-wm-blue/70">
                        Ensure Functional High-Level meetings include notes and documents, then return here for deep-dive guidance.
                      </p>
                    ) : (
                      <div className="overflow-x-auto rounded-lg border border-wm-neutral/20">
                        <table className="min-w-full border-collapse text-sm">
                          <thead>
                            <tr className="bg-wm-neutral/20 text-left text-wm-blue">
                              <th className="px-3 py-2 font-semibold border-b border-wm-neutral/30">Domain</th>
                              <th className="px-3 py-2 font-semibold border-b border-wm-neutral/30">Function / Process</th>
                              <th className="px-3 py-2 font-semibold border-b border-wm-neutral/30">Use Case to Target</th>
                              <th className="px-3 py-2 font-semibold border-b border-wm-neutral/30">Why now</th>
                              <th className="px-3 py-2 font-semibold border-b border-wm-neutral/30 text-center">Score</th>
                            </tr>
                          </thead>
                          <tbody>
                            {deepDiveHypothesisBreakdown.map((item, index) => (
                              <tr
                                key={`${item.domain}-${item.useCaseTitle}-${index}`}
                                className="odd:bg-white even:bg-wm-neutral/5"
                              >
                                <td className="px-3 py-2 align-top border-b border-wm-neutral/20 text-wm-blue font-semibold">{item.domain}</td>
                                <td className="px-3 py-2 align-top border-b border-wm-neutral/20 text-wm-blue/90">{item.functionName}</td>
                                <td className="px-3 py-2 align-top border-b border-wm-neutral/20 text-wm-blue/90">{item.useCaseTitle}</td>
                                <td className="px-3 py-2 align-top border-b border-wm-neutral/20 text-wm-blue/80">{item.why}</td>
                                <td className="px-3 py-2 align-top border-b border-wm-neutral/20 text-center text-wm-blue/80">{item.score}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </>
              )}

              <div className="mt-6 border-t border-wm-neutral/20 pt-5">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div>
                    <h3 className="text-xs font-semibold uppercase tracking-wide text-wm-blue/60 mb-2">
                      Deep Dive Target Domains & Functions
                    </h3>
                    <p className="text-sm text-wm-blue/70">
                      Choose the domains/functions to pursue in deep-dive sessions based on Functional High-Level findings.
                    </p>
                  </div>
                  <span className="text-xs font-semibold px-2 py-1 rounded-full bg-wm-accent/10 text-wm-accent">
                    {deepDiveSelectedUseCases.length} function target{deepDiveSelectedUseCases.length === 1 ? '' : 's'} selected
                  </span>
                </div>

                <div className="mt-4">
                  <h4 className="text-xs font-semibold uppercase tracking-wide text-wm-blue/60 mb-2">1) Choose domains</h4>
                  <div className="flex flex-wrap gap-2">
                    {defaultDomainSelection.map((domain) => {
                      const selected = deepDiveSelectedDomains.includes(domain);
                      return (
                        <button
                          key={domain}
                          type="button"
                          onClick={() => handleToggleDeepDiveDomain(domain)}
                          className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                            selected
                              ? 'bg-wm-accent text-white border-wm-accent'
                              : 'bg-white text-wm-blue border-wm-neutral/30 hover:border-wm-accent/40'
                          }`}
                        >
                          {domain}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="mt-4">
                  <h4 className="text-xs font-semibold uppercase tracking-wide text-wm-blue/60 mb-2">2) Choose functions / use cases</h4>
                  {deepDiveUseCases.length === 0 ? (
                    <p className="text-sm text-wm-blue/70">No use cases available for the selected domains.</p>
                  ) : (
                    <div className="space-y-4">
                      {(deepDiveSelectedDomains.length ? deepDiveSelectedDomains : defaultDomainSelection).map((domain) => {
                        const domainUseCases = deepDiveUseCases.filter((scenario) => (scenario.domain || 'General') === domain);
                        if (domainUseCases.length === 0) {
                          return (
                            <div key={domain} className="rounded-lg border border-wm-neutral/20 p-3">
                              <p className="text-sm font-semibold text-wm-blue">{domain}</p>
                              <p className="text-xs text-wm-blue/50 mt-1">No process use cases found in the library for this domain.</p>
                            </div>
                          );
                        }

                        return (
                          <div key={domain} className="rounded-lg border border-wm-neutral/20 p-3">
                            <div className="mb-2 flex items-center justify-between gap-2 flex-wrap">
                              <p className="text-sm font-semibold text-wm-blue">{domain}</p>
                              <button
                                type="button"
                                onClick={() => handleOpenCreateUseCaseModal(domain, 'deepDive')}
                                className="px-2.5 py-1 text-xs font-semibold rounded-md border border-wm-accent/40 text-wm-accent hover:bg-wm-accent/10"
                              >
                                + Create use case
                              </button>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              {domainUseCases.map((scenario) => {
                                const checked = deepDiveSelectedUseCases.includes(scenario.id);
                                const isRecommended = deepDiveRecommendedScenarioIds.has(scenario.id);
                                const fallbackDemoUrl = (scenario as { demoPublishedUrl?: string | null; demoProjectUrl?: string | null }).demoPublishedUrl
                                  || (scenario as { demoPublishedUrl?: string | null; demoProjectUrl?: string | null }).demoProjectUrl
                                  || null;
                                const latestDemoUrl = (scenario.process ? latestDemoUrlByProcess[scenario.process.trim()] : null) || fallbackDemoUrl;
                                return (
                                  <div
                                    key={scenario.id}
                                    onClick={() => handleToggleDeepDiveUseCase(scenario.id)}
                                    role="checkbox"
                                    aria-checked={checked}
                                    tabIndex={0}
                                    onKeyDown={(event) => {
                                      if (event.key === 'Enter' || event.key === ' ') {
                                        event.preventDefault();
                                        handleToggleDeepDiveUseCase(scenario.id);
                                      }
                                    }}
                                    className={`relative rounded-lg border p-3 cursor-pointer transition-all duration-200 bg-white shadow-sm ${
                                      checked
                                        ? 'border-wm-accent ring-2 ring-wm-accent/20'
                                        : 'border-wm-neutral/30 hover:border-wm-accent'
                                    }`}
                                  >
                                    <div className="absolute top-2 right-2">
                                      <input
                                        type="checkbox"
                                        checked={checked}
                                        onChange={() => handleToggleDeepDiveUseCase(scenario.id)}
                                        onClick={(event) => event.stopPropagation()}
                                        className="h-4 w-4"
                                      />
                                    </div>

                                    <div className="absolute top-2 left-2 z-10 flex flex-wrap gap-1.5 max-w-[80%]">
                                      <span className={`text-[11px] leading-tight uppercase tracking-wide px-2 py-1 rounded-full font-semibold ${DOMAIN_COLORS[scenario.domain || 'General'] || DOMAIN_COLORS['General']}`}>
                                        {scenario.domain || 'General'}
                                      </span>
                                      <span className="text-[10px] leading-tight tracking-wide px-2 py-1 rounded-full font-medium bg-wm-accent/10 text-wm-accent border border-wm-accent/20">
                                        {scenario.process || 'General process'}
                                      </span>
                                    </div>

                                    <div className="pt-12">
                                      <p className="text-sm font-semibold text-wm-blue pr-6 leading-snug">{scenario.title}</p>
                                      {scenario.description && (
                                        <p className="text-xs text-wm-blue/60 mt-1 line-clamp-3">{scenario.description}</p>
                                      )}
                                      {isRecommended && (
                                        <p className="text-[11px] font-semibold text-wm-accent mt-2">Recommended from functional high-level findings</p>
                                      )}
                                      {latestDemoUrl && (
                                        <div className="mt-2">
                                          <a
                                            href={latestDemoUrl}
                                            target="_blank"
                                            rel="noreferrer"
                                            onClick={(event) => event.stopPropagation()}
                                            className="inline-flex items-center gap-1 text-[11px] font-semibold text-wm-accent hover:underline"
                                            title="Open most recent use case demo"
                                          >
                                            <Icons.ExternalLink className="w-3.5 h-3.5" />
                                            Demo
                                          </a>
                                        </div>
                                      )}
                                    </div>
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

                <div className="mt-4 flex items-center justify-between gap-3 flex-wrap">
                  {deepDiveSelectedUseCases.length > 0 && (
                    <button
                      type="button"
                      onClick={handleCreateDeepDivePresentationPrompt}
                      className="px-4 py-2 rounded-lg bg-wm-accent text-white text-sm font-semibold hover:bg-wm-accent/90"
                    >
                      Create Presentation
                    </button>
                  )}
                  {deepDiveTargetsStatus && (
                    <p className="text-xs text-wm-blue/70">{deepDiveTargetsStatus}</p>
                  )}
                  {isSavingDeepDiveTargets && <p className="text-xs text-wm-blue/70">Saving...</p>}
                </div>
              </div>
            </section>
          )}

          {hasResearch && selectedStep?.title === 'Company Research' && (
            <section className="mb-6 rounded-xl border border-wm-neutral/30 bg-white p-4 shadow-sm">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-wm-blue/60">Company research results</h2>
              <div className="mt-3 grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <h3 className="text-xs font-semibold text-wm-blue/70">Summary</h3>
                  <p className="text-sm text-wm-blue/70 mt-1">{activeResearch?.description || 'No summary available.'}</p>
                </div>
                <div>
                  <h3 className="text-xs font-semibold text-wm-blue/70">Industry</h3>
                  <p className="text-sm text-wm-blue/70 mt-1">{activeResearch?.industry || 'Not specified'}</p>
                </div>
                <div>
                  <h3 className="text-xs font-semibold text-wm-blue/70">Market Position</h3>
                  <p className="text-sm text-wm-blue/70 mt-1">{activeResearch?.marketPosition || 'Not specified'}</p>
                </div>
                <div>
                  <h3 className="text-xs font-semibold text-wm-blue/70">Top Challenges</h3>
                  <ul className="mt-1 text-sm text-wm-blue/70 list-disc list-inside space-y-1">
                    {(activeResearch?.challenges || []).slice(0, 4).map((item, index) => (
                      <li key={`${item}-${index}`}>{item}</li>
                    ))}
                    {activeResearch?.challenges?.length === 0 && <li>No challenges listed.</li>}
                  </ul>
                </div>
              </div>
            </section>
          )}

          {hasResearch && selectedStep?.title === 'Company Research' && (
            <div className="mb-6">
              <CollaborationConfiguration
                config={collaborationConfig}
                isLoading={isSavingCollaborationConfig}
                onSave={handleSaveCollaborationConfig}
              />
              {collaborationConfigStatus && (
                <p className="mt-2 text-xs text-wm-blue/70">{collaborationConfigStatus}</p>
              )}
            </div>
          )}

          {isCreateUseCaseModalOpen && (
            <CreateScenarioForm
              initialDomain={createUseCaseDomain}
              onSave={handleCreateUseCase}
              onClose={() => setIsCreateUseCaseModalOpen(false)}
            />
          )}

          {showKickoffPromptModal && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-lg shadow-lg p-6 max-w-3xl w-full mx-4">
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div>
                    <h3 className="text-lg font-bold text-wm-blue">Kickoff Presentation Prompt</h3>
                    <p className="text-sm text-wm-blue/70">Copy this prompt and use it to generate the kickoff presentation.</p>
                  </div>
                  <button
                    onClick={() => setShowKickoffPromptModal(false)}
                    className="text-wm-blue/50 hover:text-wm-blue"
                    aria-label="Close"
                  >
                    ✕
                  </button>
                </div>
                <textarea
                  readOnly
                  value={kickoffPrompt}
                  className="w-full min-h-[320px] rounded-lg border border-wm-neutral/30 p-3 text-sm text-wm-blue"
                />
                <div className="mt-4 flex flex-wrap gap-2 justify-end">
                  <button
                    onClick={() => setShowKickoffPromptModal(false)}
                    className="px-4 py-2 bg-wm-neutral/20 text-wm-blue font-bold rounded-lg hover:bg-wm-neutral/30 transition-colors"
                  >
                    Close
                  </button>
                  <button
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(kickoffPrompt);
                      } catch (error) {
                        console.error('Failed to copy kickoff prompt:', error);
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

        </div>
      </main>
    </div>
  );
};

export default CompanyResearchV2;
