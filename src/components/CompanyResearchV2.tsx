import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import type { User } from 'firebase/auth';
import SidebarNav, { SidebarNavItem } from './SidebarNav';
import { Icons, ALL_SCENARIOS, DOMAIN_COLORS } from '../constants';
import { deleteCompany, deleteCompanyJourney, getCompany, getUserCompanies, updateCompanyJourneyStatus } from '../services/companyService';
import { researchCompany, AIModelId, AI_MODELS, generateChatResponse } from '../services/geminiService';
import { getScenarios, saveCompanyResearch, getJourneyStepSettings, getAllUserEvaluations, saveUserScenario, getUserProfile } from '../services/firebaseService';
import { extractTextFromPDF } from '../services/pdfExtractor';
import { extractTextFromDocx } from '../services/docxExtractor';
import { getSharePointFolderDocuments } from '../services/collaborationService';
import type { CompanyResearchEntry, UploadedDocument, CompanyResearch, FunctionalHighLevelMeeting, JourneyStepSettings, JourneyStepKey, CustomJourneyStep, JourneyCollaborationConfig, Role } from '../types';
import SearchInput from './SearchInput';
import { CollaborationConfiguration } from './CollaborationConfiguration';
import CreateScenarioForm, { ScenarioFormPayload } from './CreateScenarioForm';
import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragOverEvent,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  rectSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import * as XLSX from 'xlsx';

interface CompanyResearchV2Props {
  user: User;
}

// Auto-expanding textarea — grows to fit content, never scrolls
const AutoResizeTextarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ onChange, ...props }, ref) => {
  const innerRef = React.useRef<HTMLTextAreaElement>(null);
  const resolvedRef = (ref as React.RefObject<HTMLTextAreaElement>) ?? innerRef;

  const resize = () => {
    const el = resolvedRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  };

  React.useEffect(() => { resize(); });

  return (
    <textarea
      {...props}
      ref={resolvedRef}
      rows={1}
      style={{ resize: 'none', overflow: 'hidden', ...props.style }}
      onChange={(e) => { onChange?.(e); resize(); }}
    />
  );
});

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

type PendingCustomStageDraft = {
  tempId: string;
  stageTitle: string;
  stageDescription: string;
  stepTitle: string;
  stepDescription: string;
  phase?: string;
  aiModelId?: string;
  prompt?: string;
  desiredOutput?: string;
  selectedDocumentIds?: string[];
  selectedTranscriptIds?: string[];
  outputType?: 'CHAT_INTERFACE' | 'EXCEL_DOC' | 'PRESENTATION';
  excelTemplate?: {
    fileName: string;
    dataUrl: string;
    uploadedAt: number;
  };
  presentationTemplate?: {
    fileName: string;
    dataUrl: string;
    uploadedAt: number;
  };
};

type EditableAdditionalStageStepDraft = {
  id: string;
  title: string;
  description: string;
  aiModelId: AIModelId;
  prompt?: string;
  desiredOutput?: string;
  selectedDocumentIds: string[];
  selectedTranscriptIds: string[];
  outputType: 'CHAT_INTERFACE' | 'EXCEL_DOC' | 'PRESENTATION';
  excelTemplate: { fileName: string; dataUrl: string } | null;
  presentationTemplate: { fileName: string; dataUrl: string } | null;
  createdAt: number;
};

type PendingAdditionalStageStepDraft = {
  tempId: string;
  title: string;
  description: string;
  aiModelId: AIModelId;
  prompt?: string;
  desiredOutput?: string;
  selectedDocumentIds: string[];
  selectedTranscriptIds: string[];
  outputType: 'CHAT_INTERFACE' | 'EXCEL_DOC' | 'PRESENTATION';
  excelTemplate: { fileName: string; dataUrl: string } | null;
  presentationTemplate: { fileName: string; dataUrl: string } | null;
};

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

type ParsedMarkdownTable = {
  headers: string[];
  rows: string[][];
};

type ParsedMarkdownTableBlock = {
  beforeText: string;
  table: ParsedMarkdownTable;
  afterText: string;
};

const parseMarkdownTable = (text: string): ParsedMarkdownTable | null => {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  const parseRow = (line: string): string[] =>
    line
      .replace(/^\|/, '')
      .replace(/\|$/, '')
      .split('|')
      .map((cell) => cell.trim());

  const isSeparatorCell = (cell: string): boolean => /^:?-{3,}:?$/.test(cell.replace(/\s+/g, ''));

  for (let i = 0; i < lines.length - 1; i += 1) {
    if (!lines[i].includes('|') || !lines[i + 1].includes('|')) continue;

    const headers = parseRow(lines[i]);
    const separator = parseRow(lines[i + 1]);

    if (headers.length < 2) continue;
    if (separator.length !== headers.length) continue;
    if (!separator.every(isSeparatorCell)) continue;

    const rows: string[][] = [];
    for (let j = i + 2; j < lines.length; j += 1) {
      if (!lines[j].includes('|')) break;
      const row = parseRow(lines[j]);
      if (row.length !== headers.length) {
        const normalized = [...row.slice(0, headers.length)];
        while (normalized.length < headers.length) normalized.push('');
        rows.push(normalized);
      } else {
        rows.push(row);
      }
    }

    if (rows.length > 0) {
      return { headers, rows };
    }
  }

  return null;
};

const tableToCsv = (table: ParsedMarkdownTable): string => {
  const escapeCsvCell = (value: string): string => {
    if (/[",\n]/.test(value)) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  };

  return [table.headers, ...table.rows]
    .map((row) => row.map((cell) => escapeCsvCell(cell)).join(','))
    .join('\n');
};

const parseMarkdownTableBlock = (text: string): ParsedMarkdownTableBlock | null => {
  const rawLines = text.split(/\r?\n/);
  const parseRow = (line: string): string[] =>
    line
      .replace(/^\|/, '')
      .replace(/\|$/, '')
      .split('|')
      .map((cell) => cell.trim());
  const isSeparatorCell = (cell: string): boolean => /^:?-{3,}:?$/.test(cell.replace(/\s+/g, ''));

  for (let i = 0; i < rawLines.length - 1; i += 1) {
    const headerLine = rawLines[i].trim();
    const separatorLine = rawLines[i + 1].trim();
    if (!headerLine.includes('|') || !separatorLine.includes('|')) continue;

    const headers = parseRow(headerLine);
    const separators = parseRow(separatorLine);
    if (headers.length < 2) continue;
    if (separators.length !== headers.length) continue;
    if (!separators.every(isSeparatorCell)) continue;

    let end = i + 2;
    while (end < rawLines.length && rawLines[end].trim().includes('|')) {
      end += 1;
    }

    const tableText = rawLines.slice(i, end).join('\n');
    const parsedTable = parseMarkdownTable(tableText);
    if (!parsedTable) continue;

    return {
      beforeText: rawLines.slice(0, i).join('\n').trim(),
      table: parsedTable,
      afterText: rawLines.slice(end).join('\n').trim(),
    };
  }

  return null;
};

const SortableJourneyStepCard: React.FC<{
  step: JourneyStep;
  index: number;
  isVisible?: boolean;
  isToggleable?: boolean;
  isEnabled?: boolean;
  onToggle?: (enabled: boolean) => void;
  isSelected: boolean;
  isDragged: boolean;
  isDropTarget: boolean;
  onSelect: () => void;
}> = ({
  step,
  index,
  isVisible = true,
  isToggleable = false,
  isEnabled = true,
  onToggle,
  isSelected,
  isDragged,
  isDropTarget,
  onSelect
}) => {
  const draggable = step.id !== 'companyResearch';
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: step.id,
    disabled: !draggable,
  });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
  };
  const isCurrentStage = step.status === 'current';
  const isHighlightedStage = isCurrentStage || isSelected;

  return (
    <li ref={setNodeRef} style={style} className={draggable ? 'cursor-grab' : ''}>
      <button
        type="button"
        onClick={onSelect}
        {...(draggable ? attributes : {})}
        {...(draggable ? listeners : {})}
        style={isSelected
          ? { outline: '3px solid #1e3060', outlineOffset: '-1px' }
          : isCurrentStage
            ? { outline: '2px solid #1e3060', outlineOffset: '-1px' }
            : undefined}
        className={`w-full rounded-lg border px-3 py-2 text-left text-sm transition-all ${
          isCurrentStage
            ? 'border-gray-200 bg-gray-100 text-wm-blue shadow-sm'
            : step.status === 'next'
              ? 'border-wm-neutral/30 bg-wm-neutral/5 hover:bg-wm-neutral/10'
              : 'border-wm-neutral/20 bg-wm-neutral/10 text-wm-blue/50'
        } ${
          isSelected
            ? 'bg-blue-50'
            : ''
        } ${
          isDragged || isDragging
            ? 'opacity-60 scale-[0.99]'
            : ''
        } ${
          isDropTarget && !(isDragged || isDragging)
            ? 'ring-2 ring-wm-accent/35 border-wm-accent/60 bg-wm-accent/10'
            : ''
        }`}
        aria-pressed={isSelected}
        aria-disabled={step.locked && step.title !== 'Company Research'}
      >
        {isDropTarget && !(isDragged || isDragging) && (
          <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-wm-accent">Drop here (before this stage)</p>
        )}
        <div className="flex items-center gap-2">
          <span
            className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-sm font-bold ${
              isCurrentStage
                ? 'bg-wm-blue text-white ring-2 ring-white/80 shadow-sm'
                : step.status === 'next'
                  ? 'bg-wm-blue/10 text-wm-blue'
                  : 'bg-wm-neutral/30 text-wm-blue/50'
            }`}
          >
            {index + 1}
          </span>
          <span className={`font-semibold ${isCurrentStage ? 'text-wm-blue font-extrabold' : 'text-wm-blue/90'}`}>{step.title}</span>
          {isCurrentStage && (
            <span className="rounded-full bg-blue-900 px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-white shadow-sm">
              Current Stage
            </span>
          )}
          {step.locked && step.title !== 'Company Research' && (
            <span className="ml-2 text-sm text-wm-blue/40">Locked</span>
          )}
          {!isVisible && (
            <span className="ml-2 text-sm text-wm-blue/50">Hidden</span>
          )}
          <div className="ml-auto flex items-center gap-3">
            {isToggleable && (
              <input
                type="checkbox"
                checked={isEnabled}
                onPointerDown={(event) => event.stopPropagation()}
                onClick={(event) => event.stopPropagation()}
                onChange={(event) => {
                  event.stopPropagation();
                  onToggle?.(event.target.checked);
                }}
                aria-label={`Toggle visibility for ${step.title}`}
              />
            )}
            {draggable && (
              <span
                className="text-sm text-wm-blue/50 cursor-grab active:cursor-grabbing"
                title="Drag to reorder"
              >
                ⇅
              </span>
            )}
          </div>
        </div>
      </button>
    </li>
  );
};

const CompanyResearchV2: React.FC<CompanyResearchV2Props> = ({ user }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [companyName, setCompanyName] = useState<string | null>(null);
  const [companyResearch, setCompanyResearch] = useState<CompanyResearch | null>(null);
  const [companySelectedDomains, setCompanySelectedDomains] = useState<string[]>([]);
  const [companySelectedScenarios, setCompanySelectedScenarios] = useState<string[]>([]);
  const [journeys, setJourneys] = useState<Record<string, { id: string; createdAt: number; updatedAt: number; companyResearchComplete?: boolean; kickoffPresentationUrl?: string; kickoffSelectedDomains?: string[]; kickoffSelectedUseCases?: string[]; kickoffTemplateReference?: UploadedDocument | null; deepDiveTemplateReference?: UploadedDocument | null; kickoffMeetingNotes?: UploadedDocument[]; phase2SelectedDomains?: string[]; phase2SelectedUseCases?: string[]; functionalHighLevelMeetings?: FunctionalHighLevelMeeting[]; functionalDeepDiveMeetings?: FunctionalHighLevelMeeting[]; deepDiveSelectedDomains?: string[]; deepDiveSelectedUseCases?: string[]; customSteps?: CustomJourneyStep[]; journeyStepSettings?: Partial<JourneyStepSettings>; currentStepId?: string; stepOrder?: string[] }>>({});
  const [selectedJourneyId, setSelectedJourneyId] = useState<string | null>(null);
  const [isDeletingJourney, setIsDeletingJourney] = useState(false);
  const [isDeletingCompany, setIsDeletingCompany] = useState(false);
  const [userRole, setUserRole] = useState<Role>('USER');
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
  const [newStageTitle, setNewStageTitle] = useState('');
  const [newStageDescription, setNewStageDescription] = useState('');
  const [newCustomStepTitle, setNewCustomStepTitle] = useState('');
  const [newCustomStepDescription, setNewCustomStepDescription] = useState('');
  const [newCustomStepModelId, setNewCustomStepModelId] = useState<AIModelId>('gemini-2.5-pro');
  const [newCustomStepPrompt, setNewCustomStepPrompt] = useState('');
  const [newCustomStepDesiredOutput, setNewCustomStepDesiredOutput] = useState('');
  const [newCustomStepSelectedDocumentIds, setNewCustomStepSelectedDocumentIds] = useState<string[]>([]);
  const [newCustomStepSelectedTranscriptIds, setNewCustomStepSelectedTranscriptIds] = useState<string[]>([]);
  const [newCustomStepOutputType, setNewCustomStepOutputType] = useState<'CHAT_INTERFACE' | 'EXCEL_DOC' | 'PRESENTATION'>('CHAT_INTERFACE');
  const [newCustomStepExcelTemplate, setNewCustomStepExcelTemplate] = useState<{ fileName: string; dataUrl: string } | null>(null);
  const [newCustomStepPresentationTemplate, setNewCustomStepPresentationTemplate] = useState<{ fileName: string; dataUrl: string } | null>(null);
  const [newAdditionalStageStepTitle, setNewAdditionalStageStepTitle] = useState('');
  const [newAdditionalStageStepDescription, setNewAdditionalStageStepDescription] = useState('');
  const [newAdditionalStageStepModelId, setNewAdditionalStageStepModelId] = useState<AIModelId>('gemini-2.5-pro');
  const [newAdditionalStageStepPrompt, setNewAdditionalStageStepPrompt] = useState('');
  const [newAdditionalStageStepDesiredOutput, setNewAdditionalStageStepDesiredOutput] = useState('');
  const [newAdditionalStageStepSelectedDocumentIds, setNewAdditionalStageStepSelectedDocumentIds] = useState<string[]>([]);
  const [newAdditionalStageStepSelectedTranscriptIds, setNewAdditionalStageStepSelectedTranscriptIds] = useState<string[]>([]);
  const [newAdditionalStageStepOutputType, setNewAdditionalStageStepOutputType] = useState<'CHAT_INTERFACE' | 'EXCEL_DOC' | 'PRESENTATION'>('CHAT_INTERFACE');
  const [newAdditionalStageStepExcelTemplate, setNewAdditionalStageStepExcelTemplate] = useState<{ fileName: string; dataUrl: string } | null>(null);
  const [newAdditionalStageStepPresentationTemplate, setNewAdditionalStageStepPresentationTemplate] = useState<{ fileName: string; dataUrl: string } | null>(null);
  const [editingAdditionalStageSteps, setEditingAdditionalStageSteps] = useState<EditableAdditionalStageStepDraft[]>([]);
  const [pendingAdditionalStageSteps, setPendingAdditionalStageSteps] = useState<PendingAdditionalStageStepDraft[]>([]);
  const [openStepKey, setOpenStepKey] = useState<string | null>(null);
  const [customStepExcelTemplateOptions, setCustomStepExcelTemplateOptions] = useState<UploadedDocument[]>([]);
  const [customStepPresentationTemplateOptions, setCustomStepPresentationTemplateOptions] = useState<UploadedDocument[]>([]);
  const [isLoadingCustomStepExcelTemplates, setIsLoadingCustomStepExcelTemplates] = useState(false);
  const [isLoadingCustomStepPresentationTemplates, setIsLoadingCustomStepPresentationTemplates] = useState(false);
  const [isSavingCustomStep, setIsSavingCustomStep] = useState(false);
  const [customStepStatus, setCustomStepStatus] = useState<string | null>(null);
  const [customStepOutputStatus, setCustomStepOutputStatus] = useState<string | null>(null);
  const [editingCustomStepId, setEditingCustomStepId] = useState<string | null>(null);
  const [isCustomPromptExpanded, setIsCustomPromptExpanded] = useState(false);
  const [isCustomPromptEditing, setIsCustomPromptEditing] = useState(false);
  const [customPromptDraft, setCustomPromptDraft] = useState('');
  const [customStepChatInput, setCustomStepChatInput] = useState('');
  const [isCustomStepChatSending, setIsCustomStepChatSending] = useState(false);
  const [customStepChatByStepId, setCustomStepChatByStepId] = useState<Record<string, Array<{ role: 'user' | 'assistant'; content: string }>>>({});
  const [activeChildStepIndexByCustomStepId, setActiveChildStepIndexByCustomStepId] = useState<Record<string, number>>({});
  const [pendingAutoRunRequest, setPendingAutoRunRequest] = useState<{ customStepId: string; childIndex: number; message: string } | null>(null);
  const [nextStepLeadQuestionAskedByStepId, setNextStepLeadQuestionAskedByStepId] = useState<Record<string, boolean>>({});
  const [nextStepDocumentPromptDismissedByStepId, setNextStepDocumentPromptDismissedByStepId] = useState<Record<string, boolean>>({});
  const [selectedStepId, setSelectedStepId] = useState<string>('companyResearch');
  const [stageBuilderMode, setStageBuilderMode] = useState<'single' | 'multi'>('multi');
  const [isStageMetadataConfirmed, setIsStageMetadataConfirmed] = useState(false);
  const [pendingCustomStageChain, setPendingCustomStageChain] = useState<PendingCustomStageDraft[]>([]);
  const [journeyStepOverrides, setJourneyStepOverrides] = useState<Partial<JourneyStepSettings>>({});
  const [isSavingJourneyStepOverrides, setIsSavingJourneyStepOverrides] = useState(false);
  const [journeyStepOverridesStatus, setJourneyStepOverridesStatus] = useState<string | null>(null);
  const [journeyStepOrder, setJourneyStepOrder] = useState<string[]>([]);
  const [journeyStepOrderStatus, setJourneyStepOrderStatus] = useState<string | null>(null);
  const [draggedStepId, setDraggedStepId] = useState<string | null>(null);
  const [dragOverStepId, setDragOverStepId] = useState<string | null>(null);
  const [isJourneyStepManagerOpen, setIsJourneyStepManagerOpen] = useState(false);
  const [referenceCustomStageId, setReferenceCustomStageId] = useState<string | null>(null);
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
  const rerunnableCompanyName = (companyName || pendingCompanyName || '').trim();
  const canDeleteCompany = userRole === 'ADMIN' || userRole === 'SUPER_ADMIN';
  const defaultDomainSelection = useMemo(
    () => (libraryDomains.length > 0
      ? libraryDomains
      : Array.from(new Set(ALL_SCENARIOS.filter((scenario) => scenario.type === 'TRAINING').map((scenario) => scenario.domain).filter((domain): domain is string => Boolean(domain))))),
    [libraryDomains]
  );
  const kickoffDefaultDomainSelection = useMemo(
    () => (defaultDomainSelection.length > 0 ? [defaultDomainSelection[0]] : []),
    [defaultDomainSelection]
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
    if (!companySelectedDomains.length && hasResearch && kickoffDefaultDomainSelection.length > 0) {
      setCompanySelectedDomains(kickoffDefaultDomainSelection);
      kickoffTargetsDirtyRef.current = true;
    }
  }, [companySelectedDomains.length, hasResearch, kickoffDefaultDomainSelection]);

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
    const formatJourneyDate = (createdAt: number) =>
      new Date(createdAt).toLocaleDateString(undefined, {
        month: 'numeric',
        day: 'numeric'
      });
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
        label: `Journey ${index + 1} • ${formatJourneyDate(journey.createdAt)}`,
        icon: <Icons.Document className="w-4 h-4" />,
        onClick: () => {
          setSelectedJourneyId(journey.id);
          if (typeof window !== 'undefined') {
            localStorage.setItem('companyJourneyJourneyId', journey.id);
          }
          navigate(`/company2?companyId=${company.id}&journeyId=${journey.id}`);
        },
        onDelete: companyId === company.id && companyJourneys.length > 1
          ? () => {
              void handleDeleteJourney(company.id, journey.id, companyJourneys.length);
            }
          : undefined,
        canDelete: companyId === company.id && companyJourneys.length > 1 && !isDeletingJourney,
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
  const pillStripRef = useRef<HTMLDivElement>(null);
  const journeyStepOverridesDirtyRef = useRef(false);
  const researchRunLockRef = useRef<{ companyName: string; startedAt: number } | null>(null);

  useEffect(() => {
    const strip = pillStripRef.current;
    if (!strip) return;
    const active = strip.querySelector<HTMLElement>('[data-active-pill="true"]');
    if (!active) return;
    const offset = active.offsetLeft - strip.offsetWidth / 2 + active.offsetWidth / 2;
    strip.scrollTo({ left: offset, behavior: 'smooth' });
  }, [selectedStepId]);

  useEffect(() => {
    if (!location.pathname.startsWith('/company2')) {
      return;
    }

    const params = new URLSearchParams(location.search);
    const companyIdFromQuery = params.get('companyId');
    const journeyIdFromQuery = params.get('journeyId');
    const resolvedCompanyId = companyIdFromQuery || storedCompanyJourneyId;

    if (!companyIdFromQuery && resolvedCompanyId) {
      navigate(`/company2?companyId=${resolvedCompanyId}`, { replace: true });
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
        const sortedJourneyIds = Object.entries(companyJourneys)
          .sort(([, a]: any, [, b]: any) => (b?.createdAt || 0) - (a?.createdAt || 0))
          .map(([id]) => id);
        const isValidJourneyId = (candidate: string | null | undefined): candidate is string => !!candidate && !!companyJourneys[candidate];
        const activeJourneyId = isValidJourneyId(journeyIdFromQuery)
          ? journeyIdFromQuery
          : isValidJourneyId((company as any).currentJourneyId)
            ? (company as any).currentJourneyId
            : isValidJourneyId(storedJourneyId)
              ? storedJourneyId
              : (sortedJourneyIds[0] || null);
        const activeJourney = activeJourneyId ? companyJourneys[activeJourneyId] : (company as any).journey;

        if (resolvedCompanyId && activeJourneyId) {
          const hasMismatchedQueryJourney = !!journeyIdFromQuery && journeyIdFromQuery !== activeJourneyId;
          const missingQueryJourney = !journeyIdFromQuery;
          if (hasMismatchedQueryJourney || missingQueryJourney) {
            navigate(`/company2?companyId=${resolvedCompanyId}&journeyId=${activeJourneyId}`, { replace: true });
          }
        }
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
        setJourneyStepOrder(Array.isArray(activeJourney?.stepOrder) ? activeJourney.stepOrder : []);
        setIsCustomStepFormOpen(false);
        setNewCustomStepTitle('');
        setNewCustomStepDescription('');
        setNewCustomStepModelId('gemini-2.5-pro');
        setNewCustomStepPrompt('');
        setNewCustomStepDesiredOutput('');
        setNewCustomStepSelectedDocumentIds([]);
        setNewCustomStepSelectedTranscriptIds([]);
        setNewCustomStepOutputType('CHAT_INTERFACE');
        setNewCustomStepExcelTemplate(null);
        setNewCustomStepPresentationTemplate(null);
        setCustomStepExcelTemplateOptions([]);
        setCustomStepPresentationTemplateOptions([]);
        setCustomStepStatus(null);
        setJourneyStepOverridesStatus(null);
        setJourneyStepOrderStatus(null);
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

    getUserProfile(user.uid)
      .then((profile) => setUserRole((profile?.role as Role) || 'USER'))
      .catch(() => setUserRole('USER'));

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
4. Define immediate next stages for post-kickoff deep dive sessions

---

## Next Stages & Contact

**Company:** ${companyName || pendingCompanyName || 'Selected Company'}
**Date:** ${new Date().toLocaleDateString()}
**Phase:** 1 - Art of the Possible (Kickoff)
`.trim();
  };

  const handleToggleDomain = (domain: string) => {
    const toggledDomains = companySelectedDomains.includes(domain)
      ? companySelectedDomains.filter((item) => item !== domain)
      : [...companySelectedDomains, domain];
    const nextDomains = toggledDomains.length > 0
      ? toggledDomains
      : kickoffDefaultDomainSelection;

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

    const currentWorkflowImageUrl = currentWorkflowImage ? URL.createObjectURL(currentWorkflowImage) : null;

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
      ...(currentWorkflowImageUrl ? { currentWorkflowImage: currentWorkflowImageUrl } : {})
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
      setJourneyStepOverridesStatus('Journey stage visibility updated.');
    } catch (error) {
      console.error('Failed to save journey stage visibility settings:', error);
      setJourneyStepOverridesStatus('Failed to save journey stage visibility settings.');
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
    const normalizedName = name.trim();
    if (!normalizedName || isResearchRunning) return;

    const existingLock = researchRunLockRef.current;
    if (
      existingLock &&
      existingLock.companyName.toLowerCase() === normalizedName.toLowerCase()
    ) {
      return;
    }

    researchRunLockRef.current = {
      companyName: normalizedName,
      startedAt: Date.now()
    };

    setIsResearchRunning(true);
    setResearchError(null);
    setResearchResult(null);
    setDraftDocuments([]);
    setDraftTranscripts([]);
    setNewTranscript('');
    try {
      const model: AIModelId = 'gemini-2.5-pro';
      const researchData = await researchCompany({
        companyName: normalizedName,
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

      const trimmedName = normalizedName;
      setResearchResult(currentResearch);
      setPendingCompanyName(trimmedName);

      try {
        const autoCompanyId = await saveCompanyResearch(user.uid, trimmedName, currentResearch);
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
        const journeyQuery = refreshedJourneyId ? `&journeyId=${refreshedJourneyId}` : '';
        navigate(`/company2?companyId=${autoCompanyId}${journeyQuery}`, { replace: true });
      } catch (saveError) {
        console.error('Failed to auto-create company record:', saveError);
        setResearchError('Research completed, but saving the company failed. Please try saving again.');
      }
    } catch (error) {
      console.error('Company research failed:', error);
      setResearchError('Failed to run company research. Please try again.');
    } finally {
      setIsResearchRunning(false);
      researchRunLockRef.current = null;
    }
  };

  const handleRerunResearch = () => {
    if (!rerunnableCompanyName || isResearchRunning) return;
    setSelectedStepId('companyResearch');
    selectedStepDirtyRef.current = true;
    void runResearch(rerunnableCompanyName);
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

  const sanitizeCustomStageForSave = (stage: CustomJourneyStep): CustomJourneyStep => {
    const sanitized: CustomJourneyStep = {
      id: stage.id,
      title: stage.title,
      createdAt: stage.createdAt,
      updatedAt: stage.updatedAt,
    };

    if (typeof stage.authorId !== 'undefined') sanitized.authorId = stage.authorId;
    if (typeof stage.description !== 'undefined') sanitized.description = stage.description;
    if (typeof stage.phase !== 'undefined') sanitized.phase = stage.phase;
    if (typeof stage.aiModelId !== 'undefined') sanitized.aiModelId = stage.aiModelId;
    if (typeof stage.prompt !== 'undefined') sanitized.prompt = stage.prompt;
    if (Array.isArray(stage.promptVersions)) {
      sanitized.promptVersions = stage.promptVersions
        .filter((entry) => entry && typeof entry.prompt === 'string')
        .map((entry, index) => ({
          version: Number.isFinite(entry.version) ? entry.version : index + 1,
          prompt: entry.prompt,
          updatedAt: Number.isFinite(entry.updatedAt) ? entry.updatedAt : Date.now(),
          ...(entry.updatedBy ? { updatedBy: entry.updatedBy } : {})
        }));
    }
    if (Array.isArray(stage.steps)) {
      sanitized.steps = stage.steps
        .filter((child) => child && typeof child.id === 'string' && typeof child.title === 'string')
        .map((child, index) => ({
          id: child.id || `child-step-${index + 1}`,
          title: child.title,
          ...(typeof child.description !== 'undefined' ? { description: child.description } : {}),
          ...(typeof child.prompt !== 'undefined' ? { prompt: child.prompt } : {}),
          createdAt: Number.isFinite(child.createdAt) ? child.createdAt : Date.now(),
          updatedAt: Number.isFinite(child.updatedAt) ? child.updatedAt : Date.now()
        }));
    }
    if (typeof stage.selectedDocumentIds !== 'undefined') sanitized.selectedDocumentIds = stage.selectedDocumentIds;
    if (typeof stage.selectedTranscriptIds !== 'undefined') sanitized.selectedTranscriptIds = stage.selectedTranscriptIds;
    if (typeof stage.outputType !== 'undefined') sanitized.outputType = stage.outputType;
    if (typeof stage.excelTableTemplate !== 'undefined') sanitized.excelTableTemplate = stage.excelTableTemplate;

    if (stage.excelTemplate) {
      sanitized.excelTemplate = {
        fileName: stage.excelTemplate.fileName,
        dataUrl: stage.excelTemplate.dataUrl,
        uploadedAt: stage.excelTemplate.uploadedAt,
      };
    }

    if (stage.presentationTemplate) {
      sanitized.presentationTemplate = {
        fileName: stage.presentationTemplate.fileName,
        dataUrl: stage.presentationTemplate.dataUrl,
        uploadedAt: stage.presentationTemplate.uploadedAt,
      };
    }

    return sanitized;
  };

  const handleSaveCustomSteps = async (nextCustomSteps: CustomJourneyStep[]): Promise<boolean> => {
    if (!companyId || !selectedJourneyId) {
      setCustomStepStatus('Select a company journey before adding custom stages.');
      return false;
    }

    const sanitizedCustomStages = nextCustomSteps.map(sanitizeCustomStageForSave);

    setIsSavingCustomStep(true);
    setCustomStepStatus(null);
    try {
      await updateCompanyJourneyStatus(
        companyId,
        user.uid,
        { customSteps: sanitizedCustomStages },
        selectedJourneyId
      );
      setCustomSteps(sanitizedCustomStages);
      setJourneys((prev) => ({
        ...prev,
        [selectedJourneyId]: {
          ...prev[selectedJourneyId],
          customSteps: sanitizedCustomStages,
          updatedAt: Date.now()
        }
      }));
      setCustomStepStatus('Custom stages saved.');
      return true;
    } catch (error) {
      console.error('Failed to save custom journey stages:', error);
      setCustomStepStatus('Failed to save custom stages. Please try again.');
      return false;
    } finally {
      setIsSavingCustomStep(false);
    }
  };

  const handleSaveJourneyStepOrder = async (nextStepOrder: string[]) => {
    if (!companyId || !selectedJourneyId) {
      setJourneyStepOrderStatus('Select a company journey before reordering stages.');
      return;
    }

    try {
      await updateCompanyJourneyStatus(
        companyId,
        user.uid,
        { stepOrder: nextStepOrder },
        selectedJourneyId
      );
      setJourneyStepOrder(nextStepOrder);
      setJourneys((prev) => ({
        ...prev,
        [selectedJourneyId]: {
          ...prev[selectedJourneyId],
          stepOrder: nextStepOrder,
          updatedAt: Date.now()
        }
      }));
      setJourneyStepOrderStatus('Stage order saved.');
    } catch (error) {
      console.error('Failed to save journey stage order:', error);
      setJourneyStepOrderStatus('Failed to save stage order. Please try again.');
    }
  };

  const handleCreateCustomStep = async () => {
    const trimmedStageTitle = newStageTitle.trim();
    if (!trimmedStageTitle) {
      setCustomStepStatus('Stage title is required.');
      return;
    }

    const trimmedStageDescription = newStageDescription.trim();
    if (!trimmedStageDescription) {
      setCustomStepStatus('Stage description is required.');
      return;
    }

    const trimmedStepTitle = newCustomStepTitle.trim();
    if (!trimmedStepTitle) {
      setCustomStepStatus('First step name is required.');
      return;
    }

    const trimmedStepDescription = newCustomStepDescription.trim();
    if (!trimmedStepDescription) {
      setCustomStepStatus('First step description is required.');
      return;
    }

    const now = Date.now();
    const trimmedPrompt = newCustomStepPrompt.trim();
    const validDocumentIds = new Set(customStepDocumentOptions.map((item) => item.id));
    const validTranscriptIds = new Set(customStepTranscriptOptions.map((item) => item.id));
    const selectedModelIsGemini = geminiModelOptions.some((model) => model.id === newCustomStepModelId);
    const safeModelId: AIModelId = selectedModelIsGemini ? newCustomStepModelId : 'gemini-2.5-pro';
    const newStep: CustomJourneyStep = {
      id: `custom-step-${now}`,
      title: trimmedStageTitle,
      authorId: user.uid,
      description: trimmedStageDescription,
      phase: 'Custom',
      aiModelId: safeModelId,
      prompt: trimmedPrompt || undefined,
      promptVersions: trimmedPrompt
        ? [{ version: 1, prompt: trimmedPrompt, updatedAt: now, updatedBy: user.uid }]
        : undefined,
      steps: [{
        id: `stage-step-${now}`,
        title: trimmedStepTitle,
        description: trimmedStepDescription,
        aiModelId: safeModelId,
        prompt: trimmedPrompt || undefined,
        desiredOutput: newCustomStepDesiredOutput.trim() || undefined,
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
      }, ...pendingAdditionalStageSteps.map((childStepDraft, index) => ({
        id: `stage-step-${now + 1 + index}`,
        title: childStepDraft.title,
        description: childStepDraft.description,
        aiModelId: childStepDraft.aiModelId,
        prompt: childStepDraft.prompt || undefined,
        desiredOutput: childStepDraft.desiredOutput || undefined,
        selectedDocumentIds: childStepDraft.selectedDocumentIds.filter((id) => validDocumentIds.has(id)),
        selectedTranscriptIds: childStepDraft.selectedTranscriptIds.filter((id) => validTranscriptIds.has(id)),
        outputType: childStepDraft.outputType,
        excelTemplate: childStepDraft.outputType === 'EXCEL_DOC' && childStepDraft.excelTemplate
          ? { fileName: childStepDraft.excelTemplate.fileName, dataUrl: childStepDraft.excelTemplate.dataUrl, uploadedAt: now + 1 + index }
          : undefined,
        presentationTemplate: childStepDraft.outputType === 'PRESENTATION' && childStepDraft.presentationTemplate
          ? { fileName: childStepDraft.presentationTemplate.fileName, dataUrl: childStepDraft.presentationTemplate.dataUrl, uploadedAt: now + 1 + index }
          : undefined,
        createdAt: now + 1 + index,
        updatedAt: now + 1 + index,
      }))],
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
    const didSaveStages = await handleSaveCustomSteps(nextCustomSteps);
    if (!didSaveStages) return;
    const nextStepOrder = ['companyResearch', ...journeyStepOrder.filter((stepId) => stepId !== 'companyResearch')];
    if (!nextStepOrder.includes(`custom-${newStep.id}`)) {
      nextStepOrder.push(`custom-${newStep.id}`);
    }
    await handleSaveJourneyStepOrder(nextStepOrder);
    setEditingCustomStepId(newStep.id);
    setIsStageMetadataConfirmed(true);
    setIsCustomStepFormOpen(true);
    setCustomStepStatus('Custom stage saved. You can continue editing.');
    setSelectedStepId(`custom-${newStep.id}`);
    selectedStepDirtyRef.current = true;
  };

  const buildPendingCustomStageDraftFromForm = (): PendingCustomStageDraft | null => {
    const trimmedStageTitle = newStageTitle.trim();
    if (!trimmedStageTitle) {
      setCustomStepStatus('Stage title is required.');
      return null;
    }

    const trimmedStageDescription = newStageDescription.trim();
    if (!trimmedStageDescription) {
      setCustomStepStatus('Stage description is required.');
      return null;
    }

    const trimmedStepTitle = newCustomStepTitle.trim();
    if (!trimmedStepTitle) {
      setCustomStepStatus('First step name is required.');
      return null;
    }

    const trimmedStepDescription = newCustomStepDescription.trim();
    if (!trimmedStepDescription) {
      setCustomStepStatus('First step description is required.');
      return null;
    }

    const now = Date.now();
    const validDocumentIds = new Set(customStepDocumentOptions.map((item) => item.id));
    const validTranscriptIds = new Set(customStepTranscriptOptions.map((item) => item.id));
    const selectedModelIsGemini = geminiModelOptions.some((model) => model.id === newCustomStepModelId);
    const safeModelId: AIModelId = selectedModelIsGemini ? newCustomStepModelId : 'gemini-2.5-pro';

    return {
      tempId: `draft-${now}-${Math.random().toString(36).slice(2, 8)}`,
      stageTitle: trimmedStageTitle,
      stageDescription: trimmedStageDescription,
      stepTitle: trimmedStepTitle,
      stepDescription: trimmedStepDescription,
      phase: 'Custom',
      aiModelId: safeModelId,
      prompt: newCustomStepPrompt.trim() || undefined,
      desiredOutput: newCustomStepDesiredOutput.trim() || undefined,
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
    };
  };

  const resetCustomStageBuilderForm = () => {
    setEditingCustomStepId(null);
    setReferenceCustomStageId(null);
    setIsStageMetadataConfirmed(false);
    setNewStageTitle('');
    setNewStageDescription('');
    setNewCustomStepTitle('');
    setNewCustomStepDescription('');
    setNewCustomStepModelId('gemini-2.5-pro');
    setNewCustomStepPrompt('');
    setNewCustomStepDesiredOutput('');
    setNewCustomStepSelectedDocumentIds([]);
    setNewCustomStepSelectedTranscriptIds([]);
    setNewCustomStepOutputType('CHAT_INTERFACE');
    setNewCustomStepExcelTemplate(null);
    setNewCustomStepPresentationTemplate(null);
    setNewAdditionalStageStepTitle('');
    setNewAdditionalStageStepDescription('');
    setNewAdditionalStageStepModelId('gemini-2.5-pro');
    setNewAdditionalStageStepPrompt('');
    setNewAdditionalStageStepDesiredOutput('');
    setNewAdditionalStageStepSelectedDocumentIds([]);
    setNewAdditionalStageStepSelectedTranscriptIds([]);
    setNewAdditionalStageStepOutputType('CHAT_INTERFACE');
    setNewAdditionalStageStepExcelTemplate(null);
    setNewAdditionalStageStepPresentationTemplate(null);
    setEditingAdditionalStageSteps([]);
    setPendingAdditionalStageSteps([]);
  };

  const handleOpenCustomStageBuilderForEdit = (step: CustomJourneyStep) => {
    setEditingCustomStepId(step.id);
    setReferenceCustomStageId(null);
    setIsJourneyStepManagerOpen(true);
    setIsCustomStepFormOpen(true);
    setStageBuilderMode(Array.isArray(step.steps) && step.steps.length > 1 ? 'multi' : 'single');
    setIsStageMetadataConfirmed(true);
    setPendingCustomStageChain([]);
    setCustomStepStatus(null);

    setNewStageTitle(step.title || '');
    setNewStageDescription(step.description || '');
    const primaryChildStep = Array.isArray(step.steps) && step.steps.length > 0 ? step.steps[0] : null;
    setNewCustomStepTitle(primaryChildStep?.title || step.title || '');
    setNewCustomStepDescription(primaryChildStep?.description || step.description || '');
    setNewCustomStepModelId(((primaryChildStep?.aiModelId || step.aiModelId) as AIModelId) || 'gemini-2.5-pro');
    setNewCustomStepPrompt(primaryChildStep?.prompt || step.prompt || '');
    setNewCustomStepDesiredOutput(primaryChildStep?.desiredOutput || '');
    setNewCustomStepSelectedDocumentIds(Array.isArray(primaryChildStep?.selectedDocumentIds)
      ? primaryChildStep.selectedDocumentIds
      : (Array.isArray(step.selectedDocumentIds) ? step.selectedDocumentIds : []));
    setNewCustomStepSelectedTranscriptIds(Array.isArray(primaryChildStep?.selectedTranscriptIds)
      ? primaryChildStep.selectedTranscriptIds
      : (Array.isArray(step.selectedTranscriptIds) ? step.selectedTranscriptIds : []));
    setNewCustomStepOutputType(primaryChildStep?.outputType || step.outputType || 'CHAT_INTERFACE');
    setNewCustomStepExcelTemplate(primaryChildStep?.excelTemplate
      ? { fileName: primaryChildStep.excelTemplate.fileName, dataUrl: primaryChildStep.excelTemplate.dataUrl }
      : (step.excelTemplate
        ? { fileName: step.excelTemplate.fileName, dataUrl: step.excelTemplate.dataUrl }
        : null));
    setNewCustomStepPresentationTemplate(primaryChildStep?.presentationTemplate
      ? { fileName: primaryChildStep.presentationTemplate.fileName, dataUrl: primaryChildStep.presentationTemplate.dataUrl }
      : (step.presentationTemplate
        ? { fileName: step.presentationTemplate.fileName, dataUrl: step.presentationTemplate.dataUrl }
        : null));
    setEditingAdditionalStageSteps(
      (Array.isArray(step.steps) ? step.steps.slice(1) : []).map((childStep, index) => ({
        id: childStep.id || `stage-step-${step.id}-existing-${index}`,
        title: childStep.title || '',
        description: childStep.description || '',
        aiModelId: (childStep.aiModelId as AIModelId) || 'gemini-2.5-pro',
        prompt: childStep.prompt,
        desiredOutput: childStep.desiredOutput,
        selectedDocumentIds: Array.isArray(childStep.selectedDocumentIds) ? childStep.selectedDocumentIds : [],
        selectedTranscriptIds: Array.isArray(childStep.selectedTranscriptIds) ? childStep.selectedTranscriptIds : [],
        outputType: childStep.outputType || 'CHAT_INTERFACE',
        excelTemplate: childStep.excelTemplate
          ? { fileName: childStep.excelTemplate.fileName, dataUrl: childStep.excelTemplate.dataUrl }
          : null,
        presentationTemplate: childStep.presentationTemplate
          ? { fileName: childStep.presentationTemplate.fileName, dataUrl: childStep.presentationTemplate.dataUrl }
          : null,
        createdAt: childStep.createdAt || step.createdAt || Date.now(),
      }))
    );
    setNewAdditionalStageStepTitle('');
    setNewAdditionalStageStepDescription('');
    setNewAdditionalStageStepModelId('gemini-2.5-pro');
    setNewAdditionalStageStepPrompt('');
    setNewAdditionalStageStepDesiredOutput('');
    setNewAdditionalStageStepSelectedDocumentIds([]);
    setNewAdditionalStageStepSelectedTranscriptIds([]);
    setNewAdditionalStageStepOutputType('CHAT_INTERFACE');
    setNewAdditionalStageStepExcelTemplate(null);
    setNewAdditionalStageStepPresentationTemplate(null);
    setPendingAdditionalStageSteps([]);
  };

  const handleOpenCustomStageBuilderForCreate = (referenceStep?: CustomJourneyStep) => {
    setIsJourneyStepManagerOpen(true);
    setIsCustomStepFormOpen(true);
    setStageBuilderMode('single');
    setIsStageMetadataConfirmed(false);
    setPendingCustomStageChain([]);
    setCustomStepStatus(null);
    setReferenceCustomStageId(referenceStep?.id || null);
    resetCustomStageBuilderForm();
    setNewStageTitle('');
    setNewStageDescription('');
    setReferenceCustomStageId(referenceStep?.id || null);
  };

  const handleSaveEditedCustomStepFromBuilder = async () => {
    if (!editingCustomStepId) return;

    const trimmedStageTitle = newStageTitle.trim();
    if (!trimmedStageTitle) {
      setCustomStepStatus('Stage title is required.');
      return;
    }

    const trimmedStageDescription = newStageDescription.trim();
    if (!trimmedStageDescription) {
      setCustomStepStatus('Stage description is required.');
      return;
    }

    const trimmedStepTitle = newCustomStepTitle.trim();
    if (!trimmedStepTitle) {
      setCustomStepStatus('First step name is required.');
      return;
    }

    const trimmedStepDescription = newCustomStepDescription.trim();
    if (!trimmedStepDescription) {
      setCustomStepStatus('First step description is required.');
      return;
    }

    const now = Date.now();
    const validDocumentIds = new Set(customStepDocumentOptions.map((item) => item.id));
    const validTranscriptIds = new Set(customStepTranscriptOptions.map((item) => item.id));
    const selectedModelIsGemini = geminiModelOptions.some((model) => model.id === newCustomStepModelId);
    const safeModelId: AIModelId = selectedModelIsGemini ? newCustomStepModelId : 'gemini-2.5-pro';
    const nextPrompt = newCustomStepPrompt.trim();

    const safeEditableAdditionalSteps: Array<{
      id: string;
      title: string;
      description: string;
      aiModelId?: AIModelId;
      prompt?: string;
      desiredOutput?: string;
      selectedDocumentIds?: string[];
      selectedTranscriptIds?: string[];
      outputType?: 'CHAT_INTERFACE' | 'EXCEL_DOC' | 'PRESENTATION';
      excelTemplate?: { fileName: string; dataUrl: string; uploadedAt: number };
      presentationTemplate?: { fileName: string; dataUrl: string; uploadedAt: number };
      createdAt: number;
      updatedAt: number;
    }> = [];

    let hasInvalidExistingAdditionalStep = false;
    editingAdditionalStageSteps.forEach((childStep, index) => {
      const trimmedTitle = (childStep.title || '').trim();
      const trimmedDescription = (childStep.description || '').trim();
      if (!trimmedTitle || !trimmedDescription) {
        hasInvalidExistingAdditionalStep = true;
        return;
      }

      const childModelIsGemini = geminiModelOptions.some((model) => model.id === childStep.aiModelId);
      const safeChildModelId: AIModelId = childModelIsGemini ? childStep.aiModelId : 'gemini-2.5-pro';

      safeEditableAdditionalSteps.push({
        id: childStep.id || `stage-step-${editingCustomStepId}-existing-${index}`,
        title: trimmedTitle,
        description: trimmedDescription,
        aiModelId: safeChildModelId,
        prompt: (childStep.prompt || '').trim() || undefined,
        desiredOutput: (childStep.desiredOutput || '').trim() || undefined,
        selectedDocumentIds: (Array.isArray(childStep.selectedDocumentIds) ? childStep.selectedDocumentIds : []).filter((id) => validDocumentIds.has(id)),
        selectedTranscriptIds: (Array.isArray(childStep.selectedTranscriptIds) ? childStep.selectedTranscriptIds : []).filter((id) => validTranscriptIds.has(id)),
        outputType: childStep.outputType || 'CHAT_INTERFACE',
        excelTemplate: childStep.outputType === 'EXCEL_DOC' && childStep.excelTemplate
          ? {
              fileName: childStep.excelTemplate.fileName,
              dataUrl: childStep.excelTemplate.dataUrl,
              uploadedAt: now,
            }
          : undefined,
        presentationTemplate: childStep.outputType === 'PRESENTATION' && childStep.presentationTemplate
          ? {
              fileName: childStep.presentationTemplate.fileName,
              dataUrl: childStep.presentationTemplate.dataUrl,
              uploadedAt: now,
            }
          : undefined,
        createdAt: childStep.createdAt || now,
        updatedAt: now,
      });
    });

    if (hasInvalidExistingAdditionalStep) {
      setCustomStepStatus('Each additional step must include a name and description.');
      return;
    }

    const appendedAdditionalSteps = pendingAdditionalStageSteps.map((childStepDraft, index) => ({
      id: `stage-step-${editingCustomStepId}-${now}-${index}`,
      title: childStepDraft.title,
      description: childStepDraft.description,
      aiModelId: childStepDraft.aiModelId,
      prompt: childStepDraft.prompt,
      desiredOutput: (childStepDraft.desiredOutput || '').trim() || undefined,
      selectedDocumentIds: childStepDraft.selectedDocumentIds,
      selectedTranscriptIds: childStepDraft.selectedTranscriptIds,
      outputType: childStepDraft.outputType,
      excelTemplate: childStepDraft.outputType === 'EXCEL_DOC' && childStepDraft.excelTemplate
        ? {
            fileName: childStepDraft.excelTemplate.fileName,
            dataUrl: childStepDraft.excelTemplate.dataUrl,
            uploadedAt: now,
          }
        : undefined,
      presentationTemplate: childStepDraft.outputType === 'PRESENTATION' && childStepDraft.presentationTemplate
        ? {
            fileName: childStepDraft.presentationTemplate.fileName,
            dataUrl: childStepDraft.presentationTemplate.dataUrl,
            uploadedAt: now,
          }
        : undefined,
      createdAt: now,
      updatedAt: now
    }));

    const nextCustomSteps = customSteps.map((step) => {
      if (step.id !== editingCustomStepId) return step;

      const previousPrompt = (step.prompt || '').trim();
      const existingVersions = Array.isArray(step.promptVersions) ? step.promptVersions : [];
      const ensureBaseVersions = existingVersions.length > 0
        ? existingVersions
        : (previousPrompt
          ? [{ version: 1, prompt: previousPrompt, updatedAt: step.updatedAt || Date.now(), updatedBy: step.authorId || user.uid }]
          : []);
      const promptChanged = previousPrompt !== nextPrompt;
      const nextVersionNumber = ensureBaseVersions.length > 0
        ? Math.max(...ensureBaseVersions.map((entry) => Number.isFinite(entry.version) ? entry.version : 0)) + 1
        : 1;

      const existingChildSteps = Array.isArray(step.steps) ? step.steps : [];
      const existingPrimaryStep = existingChildSteps[0];

      return {
        ...step,
        title: trimmedStageTitle,
        description: trimmedStageDescription,
        aiModelId: safeModelId,
        prompt: nextPrompt || undefined,
        promptVersions: promptChanged
          ? [...ensureBaseVersions, {
              version: nextVersionNumber,
              prompt: nextPrompt,
              updatedAt: now,
              updatedBy: user.uid
            }]
          : ensureBaseVersions,
        selectedDocumentIds: newCustomStepSelectedDocumentIds.filter((id) => validDocumentIds.has(id)),
        selectedTranscriptIds: newCustomStepSelectedTranscriptIds.filter((id) => validTranscriptIds.has(id)),
        steps: [{
          id: existingPrimaryStep?.id || `stage-step-${step.id}`,
          title: trimmedStepTitle,
          description: trimmedStepDescription,
          aiModelId: safeModelId,
          prompt: nextPrompt || undefined,
          desiredOutput: newCustomStepDesiredOutput.trim() || undefined,
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
          createdAt: existingPrimaryStep?.createdAt || step.createdAt,
          updatedAt: now
        }, ...safeEditableAdditionalSteps, ...appendedAdditionalSteps],
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
        updatedAt: now
      } as CustomJourneyStep;
    });

    const didSaveStages = await handleSaveCustomSteps(nextCustomSteps);
    if (!didSaveStages) return;
    const updatedStage = nextCustomSteps.find((step) => step.id === editingCustomStepId);
    setEditingAdditionalStageSteps(
      (Array.isArray(updatedStage?.steps) ? updatedStage.steps.slice(1) : []).map((childStep, index) => ({
        id: childStep.id || `stage-step-${editingCustomStepId}-existing-${index}`,
        title: childStep.title || '',
        description: childStep.description || '',
        aiModelId: (childStep.aiModelId as AIModelId) || 'gemini-2.5-pro',
        prompt: childStep.prompt,
        desiredOutput: childStep.desiredOutput,
        selectedDocumentIds: Array.isArray(childStep.selectedDocumentIds) ? childStep.selectedDocumentIds : [],
        selectedTranscriptIds: Array.isArray(childStep.selectedTranscriptIds) ? childStep.selectedTranscriptIds : [],
        outputType: childStep.outputType || 'CHAT_INTERFACE',
        excelTemplate: childStep.excelTemplate
          ? { fileName: childStep.excelTemplate.fileName, dataUrl: childStep.excelTemplate.dataUrl }
          : null,
        presentationTemplate: childStep.presentationTemplate
          ? { fileName: childStep.presentationTemplate.fileName, dataUrl: childStep.presentationTemplate.dataUrl }
          : null,
        createdAt: childStep.createdAt || now,
      }))
    );
    setCustomStepStatus('Custom stage updated.');
    setSelectedStepId(`custom-${editingCustomStepId}`);
    selectedStepDirtyRef.current = true;
    setNewAdditionalStageStepTitle('');
    setNewAdditionalStageStepDescription('');
    setNewAdditionalStageStepModelId('gemini-2.5-pro');
    setNewAdditionalStageStepPrompt('');
    setNewAdditionalStageStepDesiredOutput('');
    setNewAdditionalStageStepSelectedDocumentIds([]);
    setNewAdditionalStageStepSelectedTranscriptIds([]);
    setNewAdditionalStageStepOutputType('CHAT_INTERFACE');
    setNewAdditionalStageStepExcelTemplate(null);
    setNewAdditionalStageStepPresentationTemplate(null);
    setPendingAdditionalStageSteps([]);
    setIsCustomStepFormOpen(true);
  };

  const handleQueueAdditionalStageStep = () => {
    const trimmedTitle = newAdditionalStageStepTitle.trim();
    if (!trimmedTitle) {
      setCustomStepStatus('Additional step name is required.');
      return;
    }

    const trimmedDescription = newAdditionalStageStepDescription.trim();
    if (!trimmedDescription) {
      setCustomStepStatus('Additional step description is required.');
      return;
    }

    const trimmedPrompt = newAdditionalStageStepPrompt.trim();
    const selectedModelIsGemini = geminiModelOptions.some((model) => model.id === newAdditionalStageStepModelId);
    const safeModelId: AIModelId = selectedModelIsGemini ? newAdditionalStageStepModelId : 'gemini-2.5-pro';
    const validDocumentIds = new Set(customStepDocumentOptions.map((item) => item.id));
    const validTranscriptIds = new Set(customStepTranscriptOptions.map((item) => item.id));
    setPendingAdditionalStageSteps((prev) => ([...prev, {
      tempId: `pending-stage-step-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      title: trimmedTitle,
      description: trimmedDescription,
      aiModelId: safeModelId,
      prompt: trimmedPrompt || undefined,
      desiredOutput: newAdditionalStageStepDesiredOutput.trim() || undefined,
      selectedDocumentIds: newAdditionalStageStepSelectedDocumentIds.filter((id) => validDocumentIds.has(id)),
      selectedTranscriptIds: newAdditionalStageStepSelectedTranscriptIds.filter((id) => validTranscriptIds.has(id)),
      outputType: newAdditionalStageStepOutputType,
      excelTemplate: newAdditionalStageStepOutputType === 'EXCEL_DOC' && newAdditionalStageStepExcelTemplate
        ? {
            fileName: newAdditionalStageStepExcelTemplate.fileName,
            dataUrl: newAdditionalStageStepExcelTemplate.dataUrl,
          }
        : null,
      presentationTemplate: newAdditionalStageStepOutputType === 'PRESENTATION' && newAdditionalStageStepPresentationTemplate
        ? {
            fileName: newAdditionalStageStepPresentationTemplate.fileName,
            dataUrl: newAdditionalStageStepPresentationTemplate.dataUrl,
          }
        : null,
    }]));
    setNewAdditionalStageStepTitle('');
    setNewAdditionalStageStepDescription('');
    setNewAdditionalStageStepModelId('gemini-2.5-pro');
    setNewAdditionalStageStepPrompt('');
    setNewAdditionalStageStepDesiredOutput('');
    setNewAdditionalStageStepSelectedDocumentIds([]);
    setNewAdditionalStageStepSelectedTranscriptIds([]);
    setNewAdditionalStageStepOutputType('CHAT_INTERFACE');
    setNewAdditionalStageStepExcelTemplate(null);
    setNewAdditionalStageStepPresentationTemplate(null);
    setCustomStepStatus('Additional step queued. Save stage changes to persist it.');
  };

  const handleUpdateExistingAdditionalStageStep = (
    stepId: string,
    updater: (draft: EditableAdditionalStageStepDraft) => EditableAdditionalStageStepDraft
  ) => {
    setEditingAdditionalStageSteps((prev) => prev.map((step) => (
      step.id === stepId ? updater(step) : step
    )));
    setCustomStepStatus(null);
  };

  const handleToggleExistingAdditionalStageStepDocument = (stepId: string, docId: string) => {
    handleUpdateExistingAdditionalStageStep(stepId, (draft) => ({
      ...draft,
      selectedDocumentIds: draft.selectedDocumentIds.includes(docId)
        ? draft.selectedDocumentIds.filter((id) => id !== docId)
        : [...draft.selectedDocumentIds, docId],
    }));
  };

  const handleToggleExistingAdditionalStageStepTranscript = (stepId: string, transcriptId: string) => {
    handleUpdateExistingAdditionalStageStep(stepId, (draft) => ({
      ...draft,
      selectedTranscriptIds: draft.selectedTranscriptIds.includes(transcriptId)
        ? draft.selectedTranscriptIds.filter((id) => id !== transcriptId)
        : [...draft.selectedTranscriptIds, transcriptId],
    }));
  };

  const handleUseSharePointExcelTemplateForExistingAdditionalStep = (stepId: string, doc: UploadedDocument) => {
    handleUpdateExistingAdditionalStageStep(stepId, (draft) => ({
      ...draft,
      outputType: 'EXCEL_DOC',
      excelTemplate: {
        fileName: doc.fileName,
        dataUrl: doc.url || '',
      },
    }));
    setCustomStepStatus(`Selected Excel template for additional step: ${doc.fileName}`);
  };

  const handleUseSharePointPresentationTemplateForExistingAdditionalStep = (stepId: string, doc: UploadedDocument) => {
    handleUpdateExistingAdditionalStageStep(stepId, (draft) => ({
      ...draft,
      outputType: 'PRESENTATION',
      presentationTemplate: {
        fileName: doc.fileName,
        dataUrl: doc.url || '',
      },
    }));
    setCustomStepStatus(`Selected PowerPoint template for additional step: ${doc.fileName}`);
  };

  const handleUseSharePointExcelTemplateForNewAdditionalStep = (doc: UploadedDocument) => {
    setNewAdditionalStageStepOutputType('EXCEL_DOC');
    setNewAdditionalStageStepExcelTemplate({ fileName: doc.fileName, dataUrl: doc.url || '' });
    setCustomStepStatus(`Selected Excel template for new additional step: ${doc.fileName}`);
  };

  const handleUseSharePointPresentationTemplateForNewAdditionalStep = (doc: UploadedDocument) => {
    setNewAdditionalStageStepOutputType('PRESENTATION');
    setNewAdditionalStageStepPresentationTemplate({ fileName: doc.fileName, dataUrl: doc.url || '' });
    setCustomStepStatus(`Selected PowerPoint template for new additional step: ${doc.fileName}`);
  };

  const handleRemoveExistingAdditionalStageStep = (stepId: string) => {
    setEditingAdditionalStageSteps((prev) => prev.filter((step) => step.id !== stepId));
    setCustomStepStatus('Additional step removed. Save stage changes to persist removal.');
  };

  const handleRemoveQueuedAdditionalStageStep = (tempId: string) => {
    setPendingAdditionalStageSteps((prev) => prev.filter((item) => item.tempId !== tempId));
  };

  const handleAddStageToSequence = () => {
    const draft = buildPendingCustomStageDraftFromForm();
    if (!draft) return;

    setPendingCustomStageChain((prev) => {
      const next = [...prev, draft];
      setCustomStepStatus(`Stage ${next.length} added. Add the next stage to continue your sequence.`);
      return next;
    });
    resetCustomStageBuilderForm();
  };

  const handleRemoveStageFromSequence = (tempId: string) => {
    setPendingCustomStageChain((prev) => prev.filter((item) => item.tempId !== tempId));
  };

  const handleSaveCustomStageSequence = async () => {
    const queued = [...pendingCustomStageChain];
    const hasUnsavedCurrentStage = !!newCustomStepTitle.trim();

    if (hasUnsavedCurrentStage) {
      const currentDraft = buildPendingCustomStageDraftFromForm();
      if (!currentDraft) return;
      queued.push(currentDraft);
    }

    if (queued.length === 0) {
      setCustomStepStatus('Add at least one stage to create a multi-stage sequence.');
      return;
    }

    const now = Date.now();
    const stagedSteps: CustomJourneyStep[] = queued.map((draft, index) => {
      const stageTimestamp = now + index;
      const chainPrefix = index > 0
        ? `This stage builds on previous stages in this sequence: ${queued.slice(0, index).map((item) => item.stageTitle).join(' → ')}. Use outputs from earlier stages as context.`
        : '';

      const chainedPrompt = chainPrefix
        ? (draft.prompt ? `${chainPrefix}\n\n${draft.prompt}` : chainPrefix)
        : draft.prompt;

      return {
        id: `custom-step-${stageTimestamp}-${index}`,
        title: draft.stageTitle,
        authorId: user.uid,
        description: draft.stageDescription,
        phase: draft.phase,
        aiModelId: draft.aiModelId,
        prompt: chainedPrompt,
        promptVersions: chainedPrompt
          ? [{ version: 1, prompt: chainedPrompt, updatedAt: stageTimestamp, updatedBy: user.uid }]
          : undefined,
        steps: [{
          id: `stage-step-${stageTimestamp}-${index}`,
          title: draft.stepTitle,
          description: draft.stepDescription,
          aiModelId: draft.aiModelId as AIModelId,
          prompt: chainedPrompt,
          desiredOutput: (draft.desiredOutput || '').trim() || undefined,
          selectedDocumentIds: draft.selectedDocumentIds,
          selectedTranscriptIds: draft.selectedTranscriptIds,
          outputType: draft.outputType,
          excelTemplate: draft.excelTemplate,
          presentationTemplate: draft.presentationTemplate,
          createdAt: stageTimestamp,
          updatedAt: stageTimestamp
        }],
        selectedDocumentIds: draft.selectedDocumentIds,
        selectedTranscriptIds: draft.selectedTranscriptIds,
        outputType: draft.outputType,
        excelTemplate: draft.excelTemplate,
        presentationTemplate: draft.presentationTemplate,
        createdAt: stageTimestamp,
        updatedAt: stageTimestamp,
      };
    });

    const nextCustomSteps = [...customSteps, ...stagedSteps];
    const didSaveStages = await handleSaveCustomSteps(nextCustomSteps);
    if (!didSaveStages) return;

    const nextStepOrder = ['companyResearch', ...journeyStepOrder.filter((stepId) => stepId !== 'companyResearch')];
    stagedSteps.forEach((stage) => {
      const customStageId = `custom-${stage.id}`;
      if (!nextStepOrder.includes(customStageId)) {
        nextStepOrder.push(customStageId);
      }
    });
    await handleSaveJourneyStepOrder(nextStepOrder);

    setPendingCustomStageChain([]);
    resetCustomStageBuilderForm();
    setIsCustomStepFormOpen(true);
    setStageBuilderMode('multi');
    setCustomStepStatus('Stage sequence saved. You can continue adding or editing stages.');
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

  const handleRemoveCustomStep = async (customStepId: string) => {
    const nextCustomSteps = customSteps.filter((step) => step.id !== customStepId);
    const didSaveStages = await handleSaveCustomSteps(nextCustomSteps);
    if (!didSaveStages) return;
    const nextStepOrder = journeyStepOrder.filter((stepId) => stepId !== `custom-${customStepId}`);
    await handleSaveJourneyStepOrder(nextStepOrder);
    setSelectedStepId('companyResearch');
    selectedStepDirtyRef.current = true;
  };

  const handleDeleteJourney = async (targetCompanyId: string, journeyIdToDelete: string, totalJourneys: number) => {
    if (!targetCompanyId || !journeyIdToDelete) return;
    if (totalJourneys <= 1) return;

    const confirmed = typeof window === 'undefined'
      ? true
      : window.confirm('Delete this journey? This cannot be undone.');
    if (!confirmed) return;

    setIsDeletingJourney(true);
    try {
      const { nextJourneyId, journeys: remainingJourneys } = await deleteCompanyJourney(
        targetCompanyId,
        user.uid,
        journeyIdToDelete
      );

      if (companyId === targetCompanyId) {
        setJourneys(remainingJourneys);
        setSelectedJourneyId(nextJourneyId);

        if (typeof window !== 'undefined') {
          if (nextJourneyId) {
            localStorage.setItem('companyJourneyJourneyId', nextJourneyId);
          } else {
            localStorage.removeItem('companyJourneyJourneyId');
          }
        }
      }

      navigate(
        nextJourneyId
          ? `/company2?companyId=${targetCompanyId}&journeyId=${nextJourneyId}`
          : `/company2?companyId=${targetCompanyId}`,
        { replace: true }
      );
    } catch (error: any) {
      console.error('Failed to delete journey:', error);
      const message = typeof error?.message === 'string' && error.message
        ? error.message
        : 'Failed to delete journey. Please try again.';
      if (typeof window !== 'undefined') {
        window.alert(message);
      }
    } finally {
      setIsDeletingJourney(false);
    }
  };

  const handleDeleteCompany = async () => {
    if (!companyId || !canDeleteCompany || isDeletingCompany) return;

    const confirmed = typeof window === 'undefined'
      ? true
      : window.confirm(`Delete company "${displayCompanyName}" and all journeys? This cannot be undone.`);
    if (!confirmed) return;

    setIsDeletingCompany(true);
    try {
      await deleteCompany(companyId, user.uid);
      if (typeof window !== 'undefined') {
        localStorage.removeItem('companyJourneyCompanyId');
        localStorage.removeItem('companyJourneyJourneyId');
      }
      navigate('/dashboard?section=companies', { replace: true });
    } catch (error: any) {
      console.error('Failed to delete company:', error);
      const message = typeof error?.message === 'string' && error.message
        ? error.message
        : 'Failed to delete company. Please try again.';
      if (typeof window !== 'undefined') {
        window.alert(message);
      }
    } finally {
      setIsDeletingCompany(false);
    }
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
        description: step.description || 'Custom journey stage',
        cta: 'Custom stage',
        locked: !companyId,
        isCustom: true,
        customStepId: step.id
      }));

      const baseSteps = [...staticSteps, ...dynamicSteps];
      if (!journeyStepOrder.length) {
        return baseSteps;
      }

      const stepById = new Map(baseSteps.map((step) => [step.id, step]));
      const reordered: JourneyStep[] = [];

      journeyStepOrder.forEach((stepId) => {
        const matched = stepById.get(stepId);
        if (!matched) return;
        reordered.push(matched);
        stepById.delete(stepId);
      });

      baseSteps.forEach((step) => {
        if (stepById.has(step.id)) {
          reordered.push(step);
        }
      });

      return reordered;
    },
    [companyId, customSteps, prerequisitesComplete, journeyStepOrder]
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

  const selectedStep = visibleOrderedSteps.find(step => step.id === selectedStepId) || visibleOrderedSteps[0];
  const draggedStepTitle = useMemo(
    () => orderedSteps.find((step) => step.id === draggedStepId)?.title || null,
    [draggedStepId, orderedSteps]
  );
  const dragOverStepTitle = useMemo(
    () => orderedSteps.find((step) => step.id === dragOverStepId)?.title || null,
    [dragOverStepId, orderedSteps]
  );
  const selectedCustomStep = selectedStep?.isCustom && selectedStep.customStepId
    ? customSteps.find((step) => step.id === selectedStep.customStepId) || null
    : null;
  const nextVisibleStep = useMemo(() => {
    const selectedIndex = visibleOrderedSteps.findIndex((step) => step.id === selectedStep?.id);
    if (selectedIndex < 0) return null;
    return visibleOrderedSteps[selectedIndex + 1] || null;
  }, [selectedStep?.id, visibleOrderedSteps]);
  const nextVisibleCustomStep = nextVisibleStep?.isCustom && nextVisibleStep.customStepId
    ? customSteps.find((step) => step.id === nextVisibleStep.customStepId) || null
    : null;
  const nextVisibleCustomPrimaryStep = Array.isArray(nextVisibleCustomStep?.steps) && nextVisibleCustomStep.steps.length > 0
    ? nextVisibleCustomStep.steps[0]
    : null;
  const nextVisibleStepOutputType = nextVisibleCustomPrimaryStep?.outputType || nextVisibleCustomStep?.outputType || null;
  const shouldPromptForNextStepDocument =
    !!selectedCustomStep
    && !!nextVisibleCustomStep
    && (nextVisibleStepOutputType === 'EXCEL_DOC' || nextVisibleStepOutputType === 'PRESENTATION')
    && !nextStepDocumentPromptDismissedByStepId[selectedCustomStep.id];

  const getResolvedChildStepsForCustomStep = (customStep: CustomJourneyStep) => {
    if (Array.isArray(customStep.steps) && customStep.steps.length > 0) {
      return customStep.steps;
    }

    return [{
      id: `legacy-child-${customStep.id}`,
      title: customStep.title,
      description: customStep.description,
      aiModelId: customStep.aiModelId,
      prompt: customStep.prompt,
      selectedDocumentIds: customStep.selectedDocumentIds,
      selectedTranscriptIds: customStep.selectedTranscriptIds,
      outputType: customStep.outputType || 'CHAT_INTERFACE',
      excelTemplate: customStep.excelTemplate,
      presentationTemplate: customStep.presentationTemplate,
      createdAt: customStep.createdAt,
      updatedAt: customStep.updatedAt,
    }];
  };

  const getActiveChildStepIndex = (customStepId: string) => {
    const rawIndex = activeChildStepIndexByCustomStepId[customStepId] ?? 0;
    const step = customSteps.find((item) => item.id === customStepId);
    if (!step) return 0;
    const count = getResolvedChildStepsForCustomStep(step).length;
    if (count <= 0) return 0;
    return Math.max(0, Math.min(rawIndex, count - 1));
  };

  const getNextChildStepNavigationInfo = (customStepId: string): { nextIndex: number; title: string; outputType: 'CHAT_INTERFACE' | 'EXCEL_DOC' | 'PRESENTATION'; description?: string } | null => {
    const step = customSteps.find((item) => item.id === customStepId);
    if (!step) return null;
    const childSteps = getResolvedChildStepsForCustomStep(step);
    if (childSteps.length <= 1) return null;

    const activeIndex = getActiveChildStepIndex(customStepId);
    const nextIndex = activeIndex + 1;
    if (nextIndex >= childSteps.length) return null;

    const nextChild = childSteps[nextIndex];
    return {
      nextIndex,
      title: nextChild.title || `Step ${nextIndex + 1}`,
      outputType: (nextChild.outputType || step.outputType || 'CHAT_INTERFACE') as 'CHAT_INTERFACE' | 'EXCEL_DOC' | 'PRESENTATION',
      description: nextChild.description,
    };
  };

  const getNextStepContext = (currentCustomStepId: string) => {
    const currentStepUiId = `custom-${currentCustomStepId}`;
    const currentUiIndex = visibleOrderedSteps.findIndex((step) => step.id === currentStepUiId);
    if (currentUiIndex < 0) return null;

    const nextUiStep = visibleOrderedSteps[currentUiIndex + 1];
    if (!nextUiStep) return null;

    if (!nextUiStep.isCustom || !nextUiStep.customStepId) {
      return {
        title: nextUiStep.title,
        description: nextUiStep.description || '',
        outputType: null as null | 'CHAT_INTERFACE' | 'EXCEL_DOC' | 'PRESENTATION'
      };
    }

    const nextCustom = customSteps.find((step) => step.id === nextUiStep.customStepId);
    if (!nextCustom) {
      return {
        title: nextUiStep.title,
        description: nextUiStep.description || '',
        outputType: null as null | 'CHAT_INTERFACE' | 'EXCEL_DOC' | 'PRESENTATION'
      };
    }

    const nextPrimary = Array.isArray(nextCustom.steps) && nextCustom.steps.length > 0
      ? nextCustom.steps[0]
      : null;
    const nextOutputType = (nextPrimary?.outputType || nextCustom.outputType || 'CHAT_INTERFACE') as 'CHAT_INTERFACE' | 'EXCEL_DOC' | 'PRESENTATION';

    return {
      title: nextCustom.title,
      description: nextCustom.description || nextPrimary?.description || '',
      outputType: nextOutputType
    };
  };

  const buildNextStepLeadQuestion = (currentCustomStepId: string): string | null => {
    if (nextStepLeadQuestionAskedByStepId[currentCustomStepId]) return null;

    const nextChildContext = getNextChildStepNavigationInfo(currentCustomStepId);
    if (nextChildContext) {
      if (nextChildContext.outputType === 'EXCEL_DOC') {
        return `Next, I can create the Excel document for "${nextChildContext.title}" in this stage. Would you like me to generate it now?`;
      }
      if (nextChildContext.outputType === 'PRESENTATION') {
        return `Next, I can create the presentation for "${nextChildContext.title}" in this stage. Would you like me to generate it now?`;
      }
      return `Would you like to continue to the next step in this stage: "${nextChildContext.title}"?`;
    }

    const nextContext = getNextStepContext(currentCustomStepId);
    if (!nextContext) {
      return 'Great progress. Would you like me to summarize this step into a final deliverable, or should we move to another stage?';
    }

    if (nextContext.outputType === 'EXCEL_DOC') {
      return `If you would like, I can create an Excel document for the next step, "${nextContext.title}", based on what we just produced. Would you like me to generate it now?`;
    }

    if (nextContext.outputType === 'PRESENTATION') {
      return `If you would like, I can create a presentation deck for the next step, "${nextContext.title}", based on this output. Would you like me to generate it now?`;
    }

    if (nextContext.outputType === 'CHAT_INTERFACE') {
      return `Great progress. Would you like to continue to the next step, "${nextContext.title}", now?`;
    }

    return `Great progress. If you would like, I can guide you into the next step, "${nextContext.title}"${nextContext.description ? ` (${nextContext.description})` : ''}. Should we continue?`;
  };

  const getNextStepNavigationInfo = (currentCustomStepId: string): { nextStepId: string; nextStepTitle: string; nextCustomStepId?: string } | null => {
    const currentStepUiId = `custom-${currentCustomStepId}`;
    const currentUiIndex = visibleOrderedSteps.findIndex((step) => step.id === currentStepUiId);
    if (currentUiIndex < 0) return null;
    const nextUiStep = visibleOrderedSteps[currentUiIndex + 1];
    if (!nextUiStep) return null;
    return {
      nextStepId: nextUiStep.id,
      nextStepTitle: nextUiStep.title,
      nextCustomStepId: nextUiStep.isCustom ? nextUiStep.customStepId : undefined,
    };
  };

  const buildAutoRunMessageForChildStep = (customStepId: string, childIndex: number): string => {
    const stage = customSteps.find((item) => item.id === customStepId);
    if (!stage) {
      return 'Please execute the current step now and generate the requested output.';
    }

    const childSteps = getResolvedChildStepsForCustomStep(stage);
    const child = childSteps[childIndex] || childSteps[0];
    if (!child) {
      return 'Please execute the current step now and generate the requested output.';
    }

    return [
      `Please execute this step now and generate the requested output.`,
      `Stage: ${stage.title}`,
      `Step: ${child.title}`,
      `Step description: ${child.description || stage.description || 'N/A'}`,
      `Output type: ${child.outputType || stage.outputType || 'CHAT_INTERFACE'}`,
      `Prompt: ${child.prompt || stage.prompt || 'Use the configured context and produce the best result.'}`,
      `Desired output: ${child.desiredOutput || 'N/A'}`,
    ].join('\n');
  };

  const isAffirmativeNextStepIntent = (text: string): boolean => {
    const normalized = text.trim().toLowerCase();
    if (!normalized) return false;
    return /\b(yes|yeah|yep|sure|ok|okay|continue|next|go ahead|proceed|do it|create|generate|start|let's go|lets go|move on|prd)\b/.test(normalized);
  };

  const customStepById = useMemo(
    () => new Map(customSteps.map((step) => [step.id, step])),
    [customSteps]
  );
  const selectedCustomChildSteps = useMemo(
    () => (selectedCustomStep ? getResolvedChildStepsForCustomStep(selectedCustomStep) : []),
    [selectedCustomStep, customSteps]
  );
  const selectedCustomActiveChildStepIndex = selectedCustomStep ? getActiveChildStepIndex(selectedCustomStep.id) : 0;
  const selectedCustomPrimaryStep = selectedCustomChildSteps[selectedCustomActiveChildStepIndex] || selectedCustomChildSteps[0] || null;
  const selectedCustomPrimaryOutputType = (selectedCustomPrimaryStep?.outputType || selectedCustomStep?.outputType || 'CHAT_INTERFACE') as 'CHAT_INTERFACE' | 'EXCEL_DOC' | 'PRESENTATION';
  const selectedCustomChatMessages = selectedCustomStep ? (customStepChatByStepId[selectedCustomStep.id] || []) : [];
  const selectedCustomExcelPreviewTable = useMemo(() => {
    if (selectedCustomPrimaryOutputType !== 'EXCEL_DOC') return null;

    for (let i = selectedCustomChatMessages.length - 1; i >= 0; i -= 1) {
      const message = selectedCustomChatMessages[i];
      if (message.role !== 'assistant') continue;
      const parsed = parseMarkdownTable(message.content || '');
      if (parsed) return parsed;
    }

    return null;
  }, [selectedCustomPrimaryOutputType, selectedCustomChatMessages]);
  const selectedCustomNextStepInfo = useMemo(
    () => (selectedCustomStep ? getNextStepNavigationInfo(selectedCustomStep.id) : null),
    [selectedCustomStep?.id, visibleOrderedSteps]
  );
  const referenceCustomStage = referenceCustomStageId
    ? customSteps.find((step) => step.id === referenceCustomStageId) || null
    : null;
  const selectedCustomStepDocumentLabels = useMemo(
    () => (selectedCustomStep?.selectedDocumentIds || []).map((id) => customStepDocumentLabelMap.get(id) || id),
    [selectedCustomStep?.selectedDocumentIds, customStepDocumentLabelMap]
  );
  const selectedCustomStepTranscriptLabels = useMemo(
    () => (selectedCustomStep?.selectedTranscriptIds || []).map((id) => customStepTranscriptLabelMap.get(id) || id),
    [selectedCustomStep?.selectedTranscriptIds, customStepTranscriptLabelMap]
  );
  const hasStageMetadataFields = !!newStageTitle.trim() && !!newStageDescription.trim();
  const hasCurrentStepRequiredFields = !!newCustomStepTitle.trim() && !!newCustomStepDescription.trim();
  const canSaveSingleCustomStage = hasStageMetadataFields && hasCurrentStepRequiredFields && isStageMetadataConfirmed;
  const canSaveMultiStageSequence = pendingCustomStageChain.length > 0
    || (hasStageMetadataFields && hasCurrentStepRequiredFields && isStageMetadataConfirmed);
  const requiresStageMetadataSetup = !editingCustomStepId && !isStageMetadataConfirmed;

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

  const buildDownloadBaseName = () => {
    const rawName = selectedCustomPrimaryStep?.title || selectedCustomStep?.title || 'excel-output';
    return rawName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '') || 'excel-output';
  };

  const downloadParsedTableAsCsv = (table: ParsedMarkdownTable, baseName: string) => {
    if (typeof window === 'undefined') return;
    const csv = tableToCsv(table);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${baseName}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  const downloadParsedTableAsXlsx = (table: ParsedMarkdownTable, baseName: string) => {
    const worksheet = XLSX.utils.aoa_to_sheet([
      table.headers,
      ...table.rows,
    ]);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Table');
    XLSX.writeFile(workbook, `${baseName}.xlsx`);
  };

  const handleDownloadExcelPreviewCsv = () => {
    if (!selectedCustomStep || !selectedCustomExcelPreviewTable || typeof window === 'undefined') {
      return;
    }

    try {
      downloadParsedTableAsCsv(selectedCustomExcelPreviewTable, buildDownloadBaseName());
      setCustomStepOutputStatus('Excel preview downloaded as CSV.');
    } catch (error) {
      console.error('Failed to download Excel preview CSV:', error);
      setCustomStepOutputStatus('Failed to download preview CSV.');
    }
  };

  const handleDownloadExcelPreviewXlsx = () => {
    if (!selectedCustomStep || !selectedCustomExcelPreviewTable) {
      return;
    }

    try {
      downloadParsedTableAsXlsx(selectedCustomExcelPreviewTable, buildDownloadBaseName());
      setCustomStepOutputStatus('Excel preview downloaded as .xlsx.');
    } catch (error) {
      console.error('Failed to download Excel preview XLSX:', error);
      setCustomStepOutputStatus('Failed to download preview .xlsx file.');
    }
  };

  const renderCustomStepChatMessageContent = (message: { role: 'user' | 'assistant'; content: string }) => {
    if (message.role !== 'assistant') {
      return message.content;
    }

    const parsedBlock = parseMarkdownTableBlock(message.content || '');
    if (!parsedBlock) {
      return message.content;
    }

    return (
      <div className="space-y-2">
        {parsedBlock.beforeText && (
          <p className="whitespace-pre-wrap">{parsedBlock.beforeText}</p>
        )}

        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={() => {
              try {
                downloadParsedTableAsXlsx(parsedBlock.table, buildDownloadBaseName());
                setCustomStepOutputStatus('Table downloaded as .xlsx.');
              } catch (error) {
                console.error('Failed to download chat table XLSX:', error);
                setCustomStepOutputStatus('Failed to download table as .xlsx.');
              }
            }}
            className="px-2.5 py-1 rounded-md border border-emerald-300 text-emerald-800 bg-emerald-50 hover:bg-emerald-100 text-sm font-semibold"
          >
            Download Excel
          </button>
          <button
            type="button"
            onClick={() => {
              try {
                downloadParsedTableAsCsv(parsedBlock.table, buildDownloadBaseName());
                setCustomStepOutputStatus('Table downloaded as CSV.');
              } catch (error) {
                console.error('Failed to download chat table CSV:', error);
                setCustomStepOutputStatus('Failed to download table as CSV.');
              }
            }}
            className="px-2.5 py-1 rounded-md border border-wm-neutral/30 text-wm-blue hover:bg-wm-neutral/10 text-sm font-semibold"
          >
            Download CSV
          </button>
        </div>

        <div className="overflow-x-auto rounded-md border border-wm-neutral/20 bg-white">
          <table className="min-w-full text-sm text-wm-blue">
            <thead className="bg-wm-neutral/10">
              <tr>
                {parsedBlock.table.headers.map((header, index) => (
                  <th
                    key={`chat-md-table-header-${index}`}
                    className="px-2.5 py-1.5 text-left font-semibold border-b border-wm-neutral/20"
                  >
                    {header || `Column ${index + 1}`}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {parsedBlock.table.rows.map((row, rowIndex) => (
                <tr key={`chat-md-table-row-${rowIndex}`} className={rowIndex % 2 === 0 ? 'bg-white' : 'bg-wm-neutral/5'}>
                  {row.map((cell, cellIndex) => (
                    <td
                      key={`chat-md-table-cell-${rowIndex}-${cellIndex}`}
                      className="px-2.5 py-1.5 border-b border-wm-neutral/10 align-top whitespace-pre-wrap"
                    >
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {parsedBlock.afterText && (
          <p className="whitespace-pre-wrap">{parsedBlock.afterText}</p>
        )}
      </div>
    );
  };

  const handleSaveInlineCustomPrompt = async () => {
    if (!selectedCustomStep) return;
    const nextPrompt = customPromptDraft.trim();
    const activeChildIndex = getActiveChildStepIndex(selectedCustomStep.id);
    const nextCustomSteps = customSteps.map((step) => {
      if (step.id !== selectedCustomStep.id) return step;

      const resolvedChildSteps = Array.isArray(step.steps) && step.steps.length > 0
        ? step.steps
        : [{
            id: `legacy-child-${step.id}`,
            title: step.title,
            description: step.description,
            aiModelId: step.aiModelId,
            prompt: step.prompt,
            selectedDocumentIds: step.selectedDocumentIds,
            selectedTranscriptIds: step.selectedTranscriptIds,
            outputType: step.outputType || 'CHAT_INTERFACE',
            excelTemplate: step.excelTemplate,
            presentationTemplate: step.presentationTemplate,
            createdAt: step.createdAt,
            updatedAt: step.updatedAt,
          }];
      const safeChildIndex = Math.max(0, Math.min(activeChildIndex, resolvedChildSteps.length - 1));
      const nextChildSteps = resolvedChildSteps.map((child, index) => (
        index === safeChildIndex
          ? {
              ...child,
              prompt: nextPrompt || undefined,
              updatedAt: Date.now(),
            }
          : child
      ));

      return {
        ...step,
        prompt: safeChildIndex === 0 ? (nextPrompt || undefined) : step.prompt,
        steps: nextChildSteps,
        updatedAt: Date.now(),
      };
    });

    const didSave = await handleSaveCustomSteps(nextCustomSteps);
    if (!didSave) return;
    setIsCustomPromptEditing(false);
    setCustomStepOutputStatus('Step prompt updated.');
  };

  const handleSendCustomStepChat = async (
    presetMessage?: string,
    skipNavigationIntentCheck = false,
    hideUserMessage = false
  ) => {
    if (!selectedCustomStep || isCustomStepChatSending) return;
    const userMessage = (presetMessage ?? customStepChatInput).trim();
    if (!userMessage) return;

    const stepId = selectedCustomStep.id;

    if (!skipNavigationIntentCheck && isAffirmativeNextStepIntent(userMessage)) {
      const nextChildStepInfo = getNextChildStepNavigationInfo(stepId);
      if (nextChildStepInfo) {
        setActiveChildStepIndexByCustomStepId((prev) => ({
          ...prev,
          [stepId]: nextChildStepInfo.nextIndex
        }));
        setNextStepLeadQuestionAskedByStepId((prev) => ({
          ...prev,
          [stepId]: false
        }));
        setCustomStepChatInput('');
        setPendingAutoRunRequest({
          customStepId: stepId,
          childIndex: nextChildStepInfo.nextIndex,
          message: buildAutoRunMessageForChildStep(stepId, nextChildStepInfo.nextIndex)
        });
        setCustomStepStatus(`Moved to next child step: ${nextChildStepInfo.title}. Running it now...`);
        return;
      }

      const nextStepInfo = getNextStepNavigationInfo(stepId);
      if (nextStepInfo) {
        if (nextStepInfo.nextCustomStepId) {
          setActiveChildStepIndexByCustomStepId((prev) => ({
            ...prev,
            [nextStepInfo.nextCustomStepId as string]: 0
          }));
          setPendingAutoRunRequest({
            customStepId: nextStepInfo.nextCustomStepId,
            childIndex: 0,
            message: buildAutoRunMessageForChildStep(nextStepInfo.nextCustomStepId, 0)
          });
        }
        setSelectedStepId(nextStepInfo.nextStepId);
        selectedStepDirtyRef.current = true;
        setCustomStepChatInput('');
        setCustomStepStatus(`Moved to next step: ${nextStepInfo.nextStepTitle}.${nextStepInfo.nextCustomStepId ? ' Running it now...' : ''}`);
        return;
      }
    }

    const previousMessages = customStepChatByStepId[stepId] || [];
    const activeChildSteps = getResolvedChildStepsForCustomStep(selectedCustomStep);
    const activeChild = activeChildSteps[getActiveChildStepIndex(stepId)] || activeChildSteps[0] || null;
    const activeOutputType = (activeChild?.outputType || selectedCustomStep.outputType || 'CHAT_INTERFACE') as 'CHAT_INTERFACE' | 'EXCEL_DOC' | 'PRESENTATION';
    const runtimeUserMessage = activeOutputType === 'EXCEL_DOC'
      ? `${userMessage}\n\nFormat requirement: include a clean markdown table (header row + separator row + data rows) so it can be previewed and exported to CSV.`
      : userMessage;
    const updatedMessages = hideUserMessage
      ? previousMessages
      : [...previousMessages, { role: 'user' as const, content: userMessage }];

    if (!hideUserMessage) {
      setCustomStepChatByStepId((prev) => ({
        ...prev,
        [stepId]: updatedMessages
      }));
    }
    if (!hideUserMessage) {
      setCustomStepChatInput('');
    }
    setIsCustomStepChatSending(true);
    setCustomStepOutputStatus(null);

    try {
      const contextPrefix = `Custom stage context:\n${buildCustomStepContextText(selectedCustomStep)}`;
      const aiResponse = await generateChatResponse(
        runtimeUserMessage,
        [{ role: 'assistant', content: contextPrefix }, ...previousMessages]
      );

      const leadQuestion = buildNextStepLeadQuestion(stepId);

      setCustomStepChatByStepId((prev) => ({
        ...prev,
        [stepId]: [
          ...(prev[stepId] || []),
          { role: 'assistant', content: aiResponse || 'No response returned.' },
          ...(leadQuestion ? [{ role: 'assistant' as const, content: leadQuestion }] : [])
        ]
      }));

      if (leadQuestion) {
        setNextStepLeadQuestionAskedByStepId((prev) => ({
          ...prev,
          [stepId]: true
        }));
      }
    } catch (error) {
      console.error('Failed to send custom step chat message:', error);
      const leadQuestion = buildNextStepLeadQuestion(stepId);
      setCustomStepChatByStepId((prev) => ({
        ...prev,
        [stepId]: [
          ...(prev[stepId] || []),
          { role: 'assistant', content: 'I could not respond right now. Please try again.' },
          ...(leadQuestion ? [{ role: 'assistant' as const, content: leadQuestion }] : [])
        ]
      }));
      if (leadQuestion) {
        setNextStepLeadQuestionAskedByStepId((prev) => ({
          ...prev,
          [stepId]: true
        }));
      }
    } finally {
      setIsCustomStepChatSending(false);
    }
  };

  const buildCustomStepContextText = (step: CustomJourneyStep) => {
    const childSteps = getResolvedChildStepsForCustomStep(step);
    const activeIndex = getActiveChildStepIndex(step.id);
    const activeChildStep = childSteps[activeIndex] || childSteps[0] || null;
    const docs = (activeChildStep?.selectedDocumentIds || step.selectedDocumentIds || []).map((id) => customStepDocumentLabelMap.get(id) || id);
    const transcripts = (activeChildStep?.selectedTranscriptIds || step.selectedTranscriptIds || []).map((id) => customStepTranscriptLabelMap.get(id) || id);

    return [
      `Stage Title: ${step.title}`,
      `Description: ${step.description || 'N/A'}`,
      `Current Step Title: ${activeChildStep?.title || step.title}`,
      `Current Step Description: ${activeChildStep?.description || step.description || 'N/A'}`,
      `AI Model: ${activeChildStep?.aiModelId || step.aiModelId || 'N/A'}`,
      `Output: ${activeChildStep?.outputType || step.outputType || 'CHAT_INTERFACE'}`,
      `Prompt: ${activeChildStep?.prompt || step.prompt || 'N/A'}`,
      `Desired output: ${activeChildStep?.desiredOutput || 'N/A'}`,
      `Documents: ${docs.length ? docs.join('; ') : 'None selected'}`,
      `Transcripts: ${transcripts.length ? transcripts.join('; ') : 'None selected'}`,
      `Excel file template: ${activeChildStep?.excelTemplate?.fileName || step.excelTemplate?.fileName || 'None'}`,
      `Presentation template: ${activeChildStep?.presentationTemplate?.fileName || step.presentationTemplate?.fileName || 'None'}`
    ].join('\n');
  };

  const reorderStepIds = (ids: string[], sourceId: string, targetId: string): string[] => {
    const sourceIndex = ids.indexOf(sourceId);
    const targetIndex = ids.indexOf(targetId);

    if (sourceIndex < 0 || targetIndex < 0 || sourceIndex === targetIndex) {
      return ids;
    }

    const next = [...ids];
    const [moved] = next.splice(sourceIndex, 1);
    next.splice(targetIndex, 0, moved);

    if (!next.includes('companyResearch')) {
      return next;
    }

    const withoutCompanyResearch = next.filter((id) => id !== 'companyResearch');
    return ['companyResearch', ...withoutCompanyResearch];
  };

  const stepDndSensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 }
    })
  );

  const handleStepSortDragStart = (event: DragStartEvent) => {
    const activeId = String(event.active.id);
    if (activeId === 'companyResearch') return;
    setDraggedStepId(activeId);
    setDragOverStepId(null);
    setJourneyStepOrderStatus(null);
  };

  const handleStepSortDragOver = (event: DragOverEvent) => {
    const overId = event.over?.id ? String(event.over.id) : null;
    setDragOverStepId(overId);
  };

  const handleStepSortDragCancel = () => {
    setDraggedStepId(null);
    setDragOverStepId(null);
  };

  const handleStepSortDragEnd = (event: DragEndEvent) => {
    const activeId = String(event.active.id);
    const overId = event.over?.id ? String(event.over.id) : null;

    if (!overId || activeId === overId) {
      setDraggedStepId(null);
      setDragOverStepId(null);
      return;
    }

    const currentIds = orderedSteps.map((item) => item.id);
    const nextOrder = reorderStepIds(currentIds, activeId, overId);

    if (nextOrder.join('|') !== currentIds.join('|')) {
      void handleSaveJourneyStepOrder(nextOrder);
    }

    setDraggedStepId(null);
    setDragOverStepId(null);
  };

  useEffect(() => {
    setCustomStepOutputStatus(null);
  }, [selectedStepId]);

  useEffect(() => {
    setCustomStepChatInput('');

    if (selectedCustomStep) {
      setCustomStepChatByStepId((prev) => {
        const existing = prev[selectedCustomStep.id] || [];
        const cleaned = existing.filter((message) => {
          if (message.role !== 'assistant') return true;
          return !message.content.startsWith('Prompt loaded:\n');
        });
        if (cleaned.length === existing.length) return prev;
        return {
          ...prev,
          [selectedCustomStep.id]: cleaned,
        };
      });
    }
  }, [selectedStepId, selectedCustomStep]);

  useEffect(() => {
    if (!pendingAutoRunRequest) return;
    if (!selectedCustomStep) return;
    if (selectedCustomStep.id !== pendingAutoRunRequest.customStepId) return;

    const activeIndex = getActiveChildStepIndex(selectedCustomStep.id);
    if (activeIndex !== pendingAutoRunRequest.childIndex) return;
    if (isCustomStepChatSending) return;

    const message = pendingAutoRunRequest.message;
    setPendingAutoRunRequest(null);
    void handleSendCustomStepChat(message, true, true);
  }, [
    pendingAutoRunRequest,
    selectedCustomStep?.id,
    activeChildStepIndexByCustomStepId,
    isCustomStepChatSending
  ]);

  useEffect(() => {
    setIsCustomPromptExpanded(false);
    setIsCustomPromptEditing(false);
    setCustomPromptDraft(selectedCustomPrimaryStep?.prompt || selectedCustomStep?.prompt || '');
  }, [selectedCustomStep?.id, selectedCustomPrimaryStep?.id, selectedCustomPrimaryStep?.prompt, selectedCustomStep?.prompt]);

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
        <div className="p-3 sm:p-4">
          <header className="mb-2">
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-2 min-w-0">
                <h1 className="text-2xl font-bold text-wm-blue truncate">{displayCompanyName}</h1>
              </div>
              {companyId && Object.keys(journeys).length > 0 && (
                <div className="flex items-center gap-2 ml-auto flex-shrink-0">
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
                        setJourneyStepOrder(Array.isArray(active?.stepOrder) ? active.stepOrder : []);
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
                        setNewCustomStepDesiredOutput('');
                        setNewCustomStepSelectedDocumentIds([]);
                        setNewCustomStepSelectedTranscriptIds([]);
                        setNewCustomStepOutputType('CHAT_INTERFACE');
                        setNewCustomStepExcelTemplate(null);
                        setNewCustomStepPresentationTemplate(null);
                        setCustomStepExcelTemplateOptions([]);
                        setCustomStepPresentationTemplateOptions([]);
                        setJourneyStepOverridesStatus(null);
                        setJourneyStepOrderStatus(null);
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
                <button
                  type="button"
                  onClick={handleRerunResearch}
                  disabled={isResearchRunning || !rerunnableCompanyName}
                  className={`px-3 py-2 text-sm font-semibold rounded-md border ${
                    isResearchRunning || !rerunnableCompanyName
                      ? 'border-wm-neutral/20 text-wm-blue/30 cursor-not-allowed'
                      : 'border-wm-accent/30 text-wm-accent hover:bg-wm-accent/10'
                  }`}
                >
                  {isResearchRunning ? 'Re-running...' : 'Re-run research'}
                </button>
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
                        stepOrder: [],
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
                    setJourneyStepOrder([]);
                    setIsCustomStepFormOpen(false);
                    setNewCustomStepTitle('');
                    setNewCustomStepDescription('');
                    setNewCustomStepModelId('gemini-2.5-pro');
                    setNewCustomStepPrompt('');
                    setNewCustomStepDesiredOutput('');
                    setNewCustomStepSelectedDocumentIds([]);
                    setNewCustomStepSelectedTranscriptIds([]);
                    setNewCustomStepOutputType('CHAT_INTERFACE');
                    setNewCustomStepExcelTemplate(null);
                    setNewCustomStepPresentationTemplate(null);
                    setCustomStepExcelTemplateOptions([]);
                    setCustomStepPresentationTemplateOptions([]);
                    setJourneyStepOverridesStatus(null);
                    setJourneyStepOrderStatus(null);
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
                  className="px-3 py-2 text-sm font-semibold rounded-md bg-wm-accent text-white hover:bg-wm-accent/90"
                >
                  New journey
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (!companyId || !selectedJourneyId) return;
                    void handleDeleteJourney(companyId, selectedJourneyId, journeyOptions.length);
                  }}
                  disabled={isDeletingJourney || !selectedJourneyId || journeyOptions.length <= 1}
                  className={`px-3 py-2 text-sm font-semibold rounded-md border ${
                    isDeletingJourney || !selectedJourneyId || journeyOptions.length <= 1
                      ? 'border-wm-neutral/20 text-wm-blue/30 cursor-not-allowed'
                      : 'border-wm-pink/30 text-wm-pink hover:bg-wm-pink/10'
                  }`}
                >
                  {isDeletingJourney ? 'Deleting...' : 'Delete journey'}
                </button>
                {canDeleteCompany && (
                  <button
                    type="button"
                    onClick={() => {
                      void handleDeleteCompany();
                    }}
                    disabled={isDeletingCompany || !companyId}
                    className={`px-3 py-2 text-sm font-semibold rounded-md border ${
                      isDeletingCompany || !companyId
                        ? 'border-wm-neutral/20 text-wm-blue/30 cursor-not-allowed'
                        : 'border-red-300 text-red-600 hover:bg-red-50'
                    }`}
                  >
                    {isDeletingCompany ? 'Deleting company...' : 'Delete company'}
                  </button>
                )}
                </div>
              )}
            </div>
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
              <p className="mt-2 text-sm text-wm-blue/50">
                Search for a company or start a new research entry.
              </p>
              {isResearchRunning && (
                <p className="mt-2 text-sm text-wm-blue/60">Running company research...</p>
              )}
              {researchError && (
                <p className="mt-2 text-sm text-wm-pink">{researchError}</p>
              )}
            </section>
          )}

          {hasResearch && (
            <section className="mb-6 rounded-xl border border-wm-neutral/30 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-wm-blue/60">Stage-by-stage guide</h2>
              <div className="flex items-center gap-2 ml-auto">
                <button
                  type="button"
                  onClick={() => {
                    const nextIsOpen = !isJourneyStepManagerOpen;
                    setIsJourneyStepManagerOpen(nextIsOpen);
                    if (nextIsOpen) {
                      setIsCreateUseCaseModalOpen(false);
                      setShowKickoffPromptModal(false);
                    }
                    if (!nextIsOpen) {
                      setIsCustomStepFormOpen(false);
                      setEditingCustomStepId(null);
                    }
                    setJourneyStepOverridesStatus(null);
                    setJourneyStepOrderStatus(null);
                  }}
                  className="px-3 py-2 rounded-lg border border-wm-neutral/30 text-wm-blue text-sm font-semibold hover:bg-wm-neutral/10"
                >
                  {isJourneyStepManagerOpen ? 'Close stage manager' : 'Manage journey stages'}
                </button>
              </div>
            </div>

            {isJourneyStepManagerOpen && (
              <div className="mt-3 rounded-lg border border-wm-neutral/20 bg-wm-neutral/5 p-3 space-y-2">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <p className="text-sm font-semibold uppercase tracking-wide text-wm-blue/60">Journey stage manager</p>
                  <button
                    type="button"
                    onClick={() => {
                      const nextOpen = !isCustomStepFormOpen;
                      setIsCustomStepFormOpen(nextOpen);
                      setEditingCustomStepId(null);
                      setReferenceCustomStageId(null);
                      if (nextOpen) {
                        setStageBuilderMode('single');
                        setPendingCustomStageChain([]);
                        setIsStageMetadataConfirmed(false);
                      }
                      setCustomStepStatus(null);
                    }}
                    className="px-3 py-2 rounded-lg bg-wm-accent text-white text-sm font-semibold hover:bg-wm-accent/90"
                  >
                    {isCustomStepFormOpen ? 'Close custom stage' : 'Add custom stage'}
                  </button>
                </div>
                <div className="flex items-center gap-3">
                  {isSavingJourneyStepOverrides && <p className="text-sm text-wm-blue/70">Saving...</p>}
                  {journeyStepOverridesStatus && <p className="text-sm text-wm-blue/70">{journeyStepOverridesStatus}</p>}
                  {journeyStepOrderStatus && <p className="text-sm text-wm-blue/70">{journeyStepOrderStatus}</p>}
                </div>

                <div className="mt-3 rounded-lg border border-wm-neutral/20 bg-white p-3">
                  <p className="text-sm font-semibold uppercase tracking-wide text-wm-blue/60">Order + visibility</p>
                  <p className="mt-1 text-sm text-wm-blue/60">Drag with ⇅ to reorder. Toggle checkboxes to show/hide stages.</p>

                  {draggedStepTitle && (
                    <div className="mt-2 rounded-lg border border-wm-accent/30 bg-wm-accent/5 px-3 py-2 text-sm text-wm-blue/80">
                      <span className="font-semibold">Moving:</span> {draggedStepTitle}
                      {dragOverStepTitle && (
                        <>
                          {' '}
                          <span className="font-semibold">→ Drop before:</span> {dragOverStepTitle}
                        </>
                      )}
                    </div>
                  )}

                  <DndContext
                    sensors={stepDndSensors}
                    collisionDetection={closestCenter}
                    onDragStart={handleStepSortDragStart}
                    onDragOver={handleStepSortDragOver}
                    onDragCancel={handleStepSortDragCancel}
                    onDragEnd={handleStepSortDragEnd}
                  >
                    <SortableContext items={orderedSteps.map((step) => step.id)} strategy={rectSortingStrategy}>
                      <ol className="mt-3 grid grid-cols-1 gap-2">
                        {orderedSteps.map((step, index) => (
                          <SortableJourneyStepCard
                            key={step.id}
                            step={step}
                            index={index}
                            isVisible={!step.settingKey || step.settingKey === 'companyResearch' || !!effectiveJourneyStepSettings[step.settingKey]}
                            isToggleable={!!step.settingKey && step.settingKey !== 'companyResearch' && !step.isCustom}
                            isEnabled={!step.settingKey || step.settingKey === 'companyResearch' || !!effectiveJourneyStepSettings[step.settingKey]}
                            onToggle={(enabled) => {
                              if (!step.settingKey || step.settingKey === 'companyResearch' || step.isCustom) return;
                              handleToggleJourneyStepVisibility(step.settingKey as JourneyStepKey, enabled);
                            }}
                            isSelected={selectedStepId === step.id}
                            isDragged={draggedStepId === step.id}
                            isDropTarget={dragOverStepId === step.id}
                            onSelect={() => {
                              if (!step.locked || step.title === 'Company Research') {
                                setSelectedStepId(step.id);
                                selectedStepDirtyRef.current = true;
                              }
                            }}
                          />
                        ))}
                      </ol>
                    </SortableContext>
                  </DndContext>
                </div>

                {selectedStep?.isCustom && selectedCustomStep && !isCustomStepFormOpen && (
                  <div className="mt-3 rounded-lg border border-wm-neutral/20 bg-white p-3">
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <div>
                        <p className="text-sm font-semibold uppercase tracking-wide text-wm-blue/60 mb-0.5">Selected custom stage</p>
                        <p className="text-base font-semibold text-wm-blue">{selectedCustomStep.title}</p>
                        {selectedCustomStep.description && (
                          <p className="text-sm text-wm-blue/60 mt-0.5">{selectedCustomStep.description}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleOpenCustomStageBuilderForEdit(selectedCustomStep)}
                          disabled={isSavingCustomStep}
                          className="px-3 py-2 rounded-lg text-sm font-semibold border border-wm-neutral/30 text-wm-blue hover:bg-wm-neutral/10"
                        >
                          Edit stage
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenCustomStageBuilderForCreate(selectedCustomStep)}
                          disabled={isSavingCustomStep}
                          className="px-3 py-2 rounded-lg text-sm font-semibold border border-wm-neutral/30 text-wm-blue hover:bg-wm-neutral/10"
                        >
                          Add new stage
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (selectedStep.customStepId) {
                              handleRemoveCustomStep(selectedStep.customStepId);
                            }
                          }}
                          disabled={isSavingCustomStep}
                          className={`px-3 py-2 rounded-lg text-sm font-semibold ${
                            isSavingCustomStep
                              ? 'bg-wm-neutral/20 text-wm-blue/40 cursor-not-allowed'
                              : 'bg-wm-pink/10 text-wm-pink hover:bg-wm-pink/20'
                          }`}
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {isCustomStepFormOpen && (
                  <div className="mt-3 rounded-lg border border-dashed border-wm-neutral/30 bg-wm-neutral/5 p-3 space-y-3 [&_button]:!text-sm [&_label]:!text-sm [&_li]:!text-sm [&_p]:!text-sm [&_span]:!text-sm [&_summary]:!text-sm">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-semibold uppercase tracking-wide text-wm-blue/60">Custom stage builder</p>
                      <div className="inline-flex items-center rounded-lg border border-wm-neutral/30 bg-white p-0.5">
                        <button
                          type="button"
                          onClick={() => {
                            setStageBuilderMode('single');
                            setPendingCustomStageChain([]);
                            setCustomStepStatus(null);
                          }}
                          className={`px-2.5 py-1.5 text-sm font-semibold rounded-md transition-colors ${
                            stageBuilderMode === 'single'
                              ? 'bg-wm-accent text-white'
                              : 'text-wm-blue hover:bg-wm-neutral/10'
                          }`}
                          aria-pressed={stageBuilderMode === 'single'}
                        >
                          Single step
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setStageBuilderMode('multi');
                            setCustomStepStatus(null);
                          }}
                          className={`px-2.5 py-1.5 text-sm font-semibold rounded-md transition-colors ${
                            stageBuilderMode === 'multi'
                              ? 'bg-wm-accent text-white'
                              : 'text-wm-blue hover:bg-wm-neutral/10'
                          }`}
                          aria-pressed={stageBuilderMode === 'multi'}
                        >
                          Multi step
                        </button>
                      </div>
                    </div>

                    {!editingCustomStepId && referenceCustomStage && (
                      <div className="rounded-lg border border-wm-neutral/20 bg-white p-2">
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-wm-blue/60">Previous stage reference</p>
                        <details className="mt-1 rounded border border-wm-neutral/20 bg-wm-neutral/5 group">
                          <summary className="cursor-pointer list-none px-2 py-1.5">
                            <div className="flex items-center justify-between gap-2">
                              <p className="text-sm font-semibold text-wm-blue">{referenceCustomStage.title}</p>
                              <span className="text-[11px] text-wm-blue/50 transition-transform duration-200 inline-block group-open:rotate-180">▼</span>
                            </div>
                          </summary>
                          <div className="border-t border-wm-neutral/20 px-2 py-2 space-y-1.5">
                            {referenceCustomStage.description && (
                              <p className="text-[11px] text-wm-blue/70"><span className="font-semibold">Description:</span> {referenceCustomStage.description}</p>
                            )}
                            {referenceCustomStage.prompt && (
                              <p className="text-[11px] text-wm-blue/70 whitespace-pre-wrap"><span className="font-semibold">Prompt:</span> {referenceCustomStage.prompt}</p>
                            )}
                            <p className="text-[11px] text-wm-blue/70"><span className="font-semibold">Output:</span> {referenceCustomStage.outputType || 'CHAT_INTERFACE'}</p>
                          </div>
                        </details>
                      </div>
                    )}

                    {stageBuilderMode === 'multi' && (
                      <div className="rounded-lg border border-wm-neutral/20 bg-white p-2">
                        <p className="text-sm text-wm-blue/70">
                          Add multiple steps to this stage. Use the “Additional Steps” section below to queue each step before saving.
                        </p>
                      </div>
                    )}

                    <div>
                      <label className="block text-sm font-semibold uppercase tracking-wide text-wm-blue/60 mb-1">Stage Name</label>
                      <input
                        type="text"
                        value={newStageTitle}
                        onChange={(event) => {
                          setNewStageTitle(event.target.value);
                          setCustomStepStatus(null);
                        }}
                        placeholder="Stage name"
                        className="w-full rounded-lg border border-wm-neutral/30 bg-white px-3 py-2 text-sm text-wm-blue"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold uppercase tracking-wide text-wm-blue/60 mb-1">Stage Description</label>
                      <textarea
                        value={newStageDescription}
                        onChange={(event) => setNewStageDescription(event.target.value)}
                        placeholder="Stage description"
                        rows={3}
                        className="w-full rounded-lg border border-wm-neutral/30 bg-white px-3 py-2 text-sm text-wm-blue"
                      />
                    </div>

                    {requiresStageMetadataSetup && (
                      <div className="rounded-lg border border-wm-neutral/20 bg-white p-3 space-y-2">
                        <p className="text-sm text-wm-blue/70">
                          First, create the stage shell with a required name and description. Then you can configure the first step under this stage.
                        </p>
                        <div className="flex justify-end">
                          <button
                            type="button"
                            onClick={() => {
                              if (!newStageDescription.trim()) {
                                setCustomStepStatus('Stage description is required.');
                                return;
                              }
                              if (!newStageTitle.trim()) {
                                setCustomStepStatus('Stage title is required.');
                                return;
                              }
                              setIsStageMetadataConfirmed(true);
                              setCustomStepStatus('Stage created. Now configure the first step.');
                            }}
                            disabled={!newStageTitle.trim() || !newStageDescription.trim()}
                            className={`px-3 py-2 rounded-lg text-sm font-semibold ${
                              !newStageTitle.trim() || !newStageDescription.trim()
                                ? 'bg-wm-neutral/20 text-wm-blue/40 cursor-not-allowed'
                                : 'bg-wm-accent text-white hover:bg-wm-accent/90'
                            }`}
                          >
                            Create stage and continue
                          </button>
                        </div>
                      </div>
                    )}

                    {!requiresStageMetadataSetup && (
                      <>
                        <details className="rounded-lg border border-wm-blue/20 bg-wm-blue/90" open>
                          <summary className="cursor-pointer list-none px-3 py-2">
                            <div className="flex items-center justify-between gap-2">
                              <p className="text-sm font-semibold uppercase tracking-wide text-white/70">Steps</p>
                              <span className="text-[11px] text-white/50">
                                {1 + editingAdditionalStageSteps.length + pendingAdditionalStageSteps.length} total
                              </span>
                            </div>
                          </summary>
                          <div className="border-t border-white/10 px-3 py-3 space-y-2">
                            <details className={`rounded border border-white/20 group transition-colors ${openStepKey === 'step-1' ? 'bg-white/10' : ''}`} open={openStepKey === 'step-1'}>
                              <summary className="cursor-pointer list-none px-2 py-1.5 rounded" onClick={(e) => { e.preventDefault(); setOpenStepKey(openStepKey === 'step-1' ? null : 'step-1'); }}>
                                <div className="flex items-center justify-between">
                                  <p className="text-sm font-semibold text-white">Step 1{newCustomStepTitle ? `: ${newCustomStepTitle}` : ''}</p>
                                  <span className="text-[11px] text-white/50 transition-transform duration-200 inline-block group-open:rotate-180">▼</span>
                                </div>
                              </summary>
                              <div className="border-t border-white/10 px-2 py-2 space-y-3">
                              <label className="block text-sm font-semibold uppercase tracking-wide text-white/70 mb-1">Step Name</label>
                              <input
                                type="text"
                                value={newCustomStepTitle}
                            onChange={(event) => {
                              setNewCustomStepTitle(event.target.value);
                              setCustomStepStatus(null);
                            }}
                            placeholder="First step name"
                            className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 placeholder-gray-400"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-semibold uppercase tracking-wide text-white/70 mb-1">Step Description</label>
                          <AutoResizeTextarea
                            value={newCustomStepDescription}
                            onChange={(event) => setNewCustomStepDescription(event.target.value)}
                            placeholder="First step description"
                            className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 placeholder-gray-400"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-semibold uppercase tracking-wide text-white/70 mb-1">AI Model Chooser</label>
                          <select
                            value={newCustomStepModelId}
                            onChange={(event) => setNewCustomStepModelId(event.target.value as AIModelId)}
                            className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800"
                          >
                            {geminiModelOptions.map((model) => (
                              <option key={model.id} value={model.id}>{model.name}</option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-sm font-semibold uppercase tracking-wide text-white/70 mb-1">Prompt</label>
                          <AutoResizeTextarea
                            value={newCustomStepPrompt}
                            onChange={(event) => setNewCustomStepPrompt(event.target.value)}
                            placeholder="Long prompt text"
                            className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 placeholder-gray-400"
                          />
                        </div>

                    <div>
                      <label className="block text-sm font-semibold uppercase tracking-wide text-white/70 mb-1">Document chooser</label>
                      {customStepDocumentOptions.length === 0 ? (
                        <p className="text-sm text-white/40">No documents available yet.</p>
                      ) : (
                        <div className="space-y-1.5 max-h-36 overflow-auto rounded-lg border border-white/20 bg-white/10 p-2">
                          {customStepDocumentOptions.map((doc) => (
                            <label key={doc.id} className="flex items-center gap-2 text-sm text-white/80">
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
                      <label className="block text-sm font-semibold uppercase tracking-wide text-white/70 mb-1">Meeting Transcripts chooser</label>
                      {customStepTranscriptOptions.length === 0 ? (
                        <p className="text-sm text-white/40">No transcripts available yet.</p>
                      ) : (
                        <div className="space-y-1.5 max-h-36 overflow-auto rounded-lg border border-white/20 bg-white/10 p-2">
                          {customStepTranscriptOptions.map((item) => (
                            <label key={item.id} className="flex items-center gap-2 text-sm text-white/80">
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
                      <label className="block text-sm font-semibold uppercase tracking-wide text-white/70 mb-1">Output</label>
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
                        className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800"
                      >
                        <option value="CHAT_INTERFACE">Chat Interface</option>
                        <option value="EXCEL_DOC">Excel Doc</option>
                        <option value="PRESENTATION">Presentation</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold uppercase tracking-wide text-white/70 mb-1">Desired Output (copy/paste)</label>
                      <AutoResizeTextarea
                        value={newCustomStepDesiredOutput}
                        onChange={(event) => setNewCustomStepDesiredOutput(event.target.value)}
                        placeholder="Paste an example of the exact output format/content you want for this step."
                        className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 placeholder-gray-400"
                      />
                    </div>

                    {newCustomStepOutputType === 'EXCEL_DOC' && (
                      <div>
                        <label className="block text-sm font-semibold uppercase tracking-wide text-white/70 mb-1">Excel template from SharePoint (optional)</label>
                        <button
                          type="button"
                          onClick={() => {
                            void loadCustomStepTemplatesFromSharePoint('EXCEL');
                          }}
                          disabled={isLoadingCustomStepExcelTemplates}
                          className={`px-3 py-2 rounded-lg text-sm font-semibold ${
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
                                  <p className="text-sm font-semibold text-wm-blue">{doc.fileName}</p>
                                  <p className="text-[11px] text-wm-blue/60">{doc.path || doc.url || 'SharePoint file'}</p>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => handleUseSharePointExcelTemplateForNewCustomStep(doc)}
                                  className="text-sm font-semibold text-wm-accent hover:underline"
                                >
                                  Use
                                </button>
                              </li>
                            ))}
                          </ul>
                        )}
                        {newCustomStepExcelTemplate && (
                          <p className="mt-1 text-sm text-white/60">Selected template: {newCustomStepExcelTemplate.fileName}</p>
                        )}
                      </div>
                    )}

                    {newCustomStepOutputType === 'PRESENTATION' && (
                      <div>
                        <label className="block text-sm font-semibold uppercase tracking-wide text-white/70 mb-1">PowerPoint template from SharePoint (optional)</label>
                        <button
                          type="button"
                          onClick={() => {
                            void loadCustomStepTemplatesFromSharePoint('PRESENTATION');
                          }}
                          disabled={isLoadingCustomStepPresentationTemplates}
                          className={`px-3 py-2 rounded-lg text-sm font-semibold ${
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
                                  <p className="text-sm font-semibold text-wm-blue">{doc.fileName}</p>
                                  <p className="text-[11px] text-wm-blue/60">{doc.path || doc.url || 'SharePoint file'}</p>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => handleUseSharePointPresentationTemplateForNewCustomStep(doc)}
                                  className="text-sm font-semibold text-wm-accent hover:underline"
                                >
                                  Use
                                </button>
                              </li>
                            ))}
                          </ul>
                        )}
                        {newCustomStepPresentationTemplate && (
                          <p className="mt-1 text-sm text-white/60">Selected template: {newCustomStepPresentationTemplate.fileName}</p>
                        )}
                      </div>
                    )}
                            </details>

                    {(editingCustomStepId || stageBuilderMode === 'multi') && (
                      <div className="border-t border-white/10 pt-3 space-y-2">
                        <p className="text-sm text-white/60">
                          {editingCustomStepId ? 'Add, edit, or remove child steps. Changes are applied when you save stage changes.' : 'Queue additional steps below. They will be saved when you save the stage.'}
                        </p>

                          {(editingAdditionalStageSteps.length > 0 || pendingAdditionalStageSteps.length > 0) && (
                            <div className="space-y-1.5">
                              {editingAdditionalStageSteps.map((existingStep, idx) => (
                                <details key={existingStep.id} className={`rounded border border-white/20 group transition-colors ${openStepKey === 'existing-' + existingStep.id ? 'bg-white/10' : ''}`} open={openStepKey === 'existing-' + existingStep.id}>
                                  <summary className="cursor-pointer list-none px-2 py-1.5" onClick={(e) => { e.preventDefault(); setOpenStepKey(openStepKey === 'existing-' + existingStep.id ? null : 'existing-' + existingStep.id); }}>
                                    <div className="flex items-center justify-between gap-2">
                                      <p className="text-sm font-semibold text-white">Step {idx + 2}{existingStep.title ? `: ${existingStep.title}` : ''}</p>
                                      <div className="flex items-center gap-2">
                                        <button
                                          type="button"
                                          onClick={(e) => { e.stopPropagation(); e.preventDefault(); handleRemoveExistingAdditionalStageStep(existingStep.id); }}
                                          className="text-[11px] font-semibold text-wm-pink hover:underline"
                                        >
                                          Remove
                                        </button>
                                        <span className="text-[11px] text-white/50 transition-transform duration-200 inline-block group-open:rotate-180">▼</span>
                                      </div>
                                    </div>
                                  </summary>
                                  <div className="border-t border-white/10 px-2 py-2 space-y-1.5">
                                    {(() => {
                                      const prevType = idx === 0 ? newCustomStepOutputType : editingAdditionalStageSteps[idx - 1].outputType;
                                      const prevLabel = prevType === 'EXCEL_DOC' ? 'Excel Document' : prevType === 'PRESENTATION' ? 'Presentation' : 'Chat Response';
                                      return (
                                        <div className="flex items-center gap-1.5 rounded bg-white/5 border border-white/10 px-2 py-1.5">
                                          <span className="text-white/40">↑</span>
                                          <span className="text-[11px] text-white/50">
                                            Uses output from{' '}<span className="font-semibold text-white/70">Step {idx + 1}</span>{' — '}<span className="font-semibold text-white/70">{prevLabel}</span>
                                          </span>
                                        </div>
                                      );
                                    })()}
                                    <div>
                                      <label className="block text-sm font-semibold uppercase tracking-wide text-white/70 mb-1">Step Name</label>
                                      <input
                                        type="text"
                                        value={existingStep.title}
                                        onChange={(event) => handleUpdateExistingAdditionalStageStep(existingStep.id, (draft) => ({ ...draft, title: event.target.value }))}
                                        placeholder="Additional step name"
                                        className="w-full rounded border border-gray-200 bg-white px-2 py-1.5 text-sm text-gray-800 placeholder-gray-400"
                                      />
                                    </div>
                                    <div>
                                      <label className="block text-sm font-semibold uppercase tracking-wide text-white/70 mb-1">Step Description</label>
                                      <AutoResizeTextarea
                                        value={existingStep.description}
                                        onChange={(event) => handleUpdateExistingAdditionalStageStep(existingStep.id, (draft) => ({ ...draft, description: event.target.value }))}
                                        placeholder="Additional step description"
                                        className="w-full rounded border border-gray-200 bg-white px-2 py-1.5 text-sm text-gray-800 placeholder-gray-400"
                                      />
                                    </div>
                                    <div>
                                      <label className="block text-sm font-semibold uppercase tracking-wide text-white/70 mb-1">AI Model Chooser</label>
                                      <select
                                        value={existingStep.aiModelId}
                                        onChange={(event) => handleUpdateExistingAdditionalStageStep(existingStep.id, (draft) => ({ ...draft, aiModelId: event.target.value as AIModelId }))}
                                        className="w-full rounded border border-gray-200 bg-white px-2 py-1.5 text-sm text-gray-800"
                                      >
                                        {geminiModelOptions.map((model) => (
                                          <option key={model.id} value={model.id}>{model.name}</option>
                                        ))}
                                      </select>
                                    </div>
                                    <div>
                                      <label className="block text-sm font-semibold uppercase tracking-wide text-white/70 mb-1">Prompt</label>
                                      <AutoResizeTextarea
                                        value={existingStep.prompt || ''}
                                        onChange={(event) => handleUpdateExistingAdditionalStageStep(existingStep.id, (draft) => ({ ...draft, prompt: event.target.value }))}
                                        placeholder="Optional additional step prompt"
                                        className="w-full rounded border border-gray-200 bg-white px-2 py-1.5 text-sm text-gray-800 placeholder-gray-400"
                                      />
                                    </div>
                                    <div>
                                      <label className="block text-sm font-semibold uppercase tracking-wide text-white/70 mb-1">Document Chooser</label>
                                    <div className="space-y-1 rounded border border-white/20 bg-white/10 p-2">
                                      {customStepDocumentOptions.length === 0 ? (
                                        <p className="text-[11px] text-white/40">No documents available yet.</p>
                                      ) : customStepDocumentOptions.map((doc) => (
                                        <label key={`${existingStep.id}-doc-${doc.id}`} className="flex items-center gap-2 text-sm text-white/80">
                                          <input
                                            type="checkbox"
                                            checked={existingStep.selectedDocumentIds.includes(doc.id)}
                                            onChange={() => handleToggleExistingAdditionalStageStepDocument(existingStep.id, doc.id)}
                                          />
                                          <span>{doc.label}</span>
                                        </label>
                                      ))}
                                    </div>
                                    </div>
                                    <div>
                                      <label className="block text-sm font-semibold uppercase tracking-wide text-white/70 mb-1">Meeting Transcripts Chooser</label>
                                    <div className="space-y-1 rounded border border-white/20 bg-white/10 p-2">
                                      {customStepTranscriptOptions.length === 0 ? (
                                        <p className="text-[11px] text-white/40">No transcripts available yet.</p>
                                      ) : customStepTranscriptOptions.map((item) => (
                                        <label key={`${existingStep.id}-transcript-${item.id}`} className="flex items-center gap-2 text-sm text-white/80">
                                          <input
                                            type="checkbox"
                                            checked={existingStep.selectedTranscriptIds.includes(item.id)}
                                            onChange={() => handleToggleExistingAdditionalStageStepTranscript(existingStep.id, item.id)}
                                          />
                                          <span>{item.label}</span>
                                        </label>
                                      ))}
                                    </div>
                                    </div>
                                    <div>
                                      <label className="block text-sm font-semibold uppercase tracking-wide text-white/70 mb-1">Output</label>
                                      <select
                                        value={existingStep.outputType}
                                        onChange={(event) => handleUpdateExistingAdditionalStageStep(existingStep.id, (draft) => {
                                          const nextOutput = event.target.value as 'CHAT_INTERFACE' | 'EXCEL_DOC' | 'PRESENTATION';
                                          return {
                                            ...draft,
                                            outputType: nextOutput,
                                            excelTemplate: nextOutput === 'EXCEL_DOC' ? draft.excelTemplate : null,
                                            presentationTemplate: nextOutput === 'PRESENTATION' ? draft.presentationTemplate : null,
                                          };
                                        })}
                                        className="w-full rounded border border-gray-200 bg-white px-2 py-1.5 text-sm text-gray-800"
                                      >
                                        <option value="CHAT_INTERFACE">Chat Interface</option>
                                        <option value="EXCEL_DOC">Excel Doc</option>
                                        <option value="PRESENTATION">Presentation</option>
                                      </select>
                                    </div>
                                    <div>
                                      <label className="block text-sm font-semibold uppercase tracking-wide text-white/70 mb-1">Desired Output (copy/paste)</label>
                                      <AutoResizeTextarea
                                        value={existingStep.desiredOutput || ''}
                                        onChange={(event) => handleUpdateExistingAdditionalStageStep(existingStep.id, (draft) => ({ ...draft, desiredOutput: event.target.value }))}
                                        placeholder="Paste desired output for this step"
                                        className="w-full rounded border border-gray-200 bg-white px-2 py-1.5 text-sm text-gray-800 placeholder-gray-400"
                                      />
                                    </div>
                                    {existingStep.outputType === 'EXCEL_DOC' && (
                                      <div>
                                        <label className="block text-sm font-semibold uppercase tracking-wide text-white/70 mb-1">Excel Template from SharePoint (optional)</label>
                                      <div className="space-y-1 rounded border border-white/20 bg-white/10 p-2">
                                        <button
                                          type="button"
                                          onClick={() => { void loadCustomStepTemplatesFromSharePoint('EXCEL'); }}
                                          disabled={isLoadingCustomStepExcelTemplates}
                                          className={`px-2 py-1 rounded text-sm font-semibold ${
                                            isLoadingCustomStepExcelTemplates
                                              ? 'bg-white/10 text-white/40 cursor-not-allowed'
                                              : 'bg-wm-accent text-white hover:bg-wm-accent/90'
                                          }`}
                                        >
                                          {isLoadingCustomStepExcelTemplates ? 'Loading...' : 'Load Excel files'}
                                        </button>
                                        {customStepExcelTemplateOptions.map((doc) => (
                                          <button
                                            key={`${existingStep.id}-excel-${doc.id}`}
                                            type="button"
                                            onClick={() => handleUseSharePointExcelTemplateForExistingAdditionalStep(existingStep.id, doc)}
                                            className="block w-full text-left text-[11px] text-white/70 hover:underline"
                                          >
                                            Use: {doc.fileName}
                                          </button>
                                        ))}
                                        {existingStep.excelTemplate && (
                                          <p className="text-[11px] text-white/60">Selected template: {existingStep.excelTemplate.fileName}</p>
                                        )}
                                      </div>
                                      </div>
                                    )}
                                    {existingStep.outputType === 'PRESENTATION' && (
                                      <div>
                                        <label className="block text-sm font-semibold uppercase tracking-wide text-white/70 mb-1">PowerPoint Template from SharePoint (optional)</label>
                                      <div className="space-y-1 rounded border border-white/20 bg-white/10 p-2">
                                        <button
                                          type="button"
                                          onClick={() => { void loadCustomStepTemplatesFromSharePoint('PRESENTATION'); }}
                                          disabled={isLoadingCustomStepPresentationTemplates}
                                          className={`px-2 py-1 rounded text-sm font-semibold ${
                                            isLoadingCustomStepPresentationTemplates
                                              ? 'bg-white/10 text-white/40 cursor-not-allowed'
                                              : 'bg-wm-accent text-white hover:bg-wm-accent/90'
                                          }`}
                                        >
                                          {isLoadingCustomStepPresentationTemplates ? 'Loading...' : 'Load PowerPoint files'}
                                        </button>
                                        {customStepPresentationTemplateOptions.map((doc) => (
                                          <button
                                            key={`${existingStep.id}-ppt-${doc.id}`}
                                            type="button"
                                            onClick={() => handleUseSharePointPresentationTemplateForExistingAdditionalStep(existingStep.id, doc)}
                                            className="block w-full text-left text-[11px] text-white/70 hover:underline"
                                          >
                                            Use: {doc.fileName}
                                          </button>
                                        ))}
                                        {existingStep.presentationTemplate && (
                                          <p className="text-[11px] text-white/60">Selected template: {existingStep.presentationTemplate.fileName}</p>
                                        )}
                                      </div>
                                      </div>
                                    )}
                                  </div>
                                </details>
                              ))}
                              {pendingAdditionalStageSteps.map((pendingStep, idx) => (
                                <details key={pendingStep.tempId} className={`rounded border border-white/20 group transition-colors ${openStepKey === 'pending-' + pendingStep.tempId ? 'bg-white/10' : ''}`} open={openStepKey === 'pending-' + pendingStep.tempId}>
                                  <summary className="cursor-pointer list-none px-2 py-1.5" onClick={(e) => { e.preventDefault(); setOpenStepKey(openStepKey === 'pending-' + pendingStep.tempId ? null : 'pending-' + pendingStep.tempId); }}>
                                    <div className="flex items-center justify-between gap-2">
                                      <p className="text-sm font-semibold text-white">Step {editingAdditionalStageSteps.length + idx + 2}: {pendingStep.title}</p>
                                      <div className="flex items-center gap-2">
                                        <button
                                          type="button"
                                          onClick={(e) => { e.stopPropagation(); e.preventDefault(); handleRemoveQueuedAdditionalStageStep(pendingStep.tempId); }}
                                          className="text-[11px] font-semibold text-wm-pink hover:underline"
                                        >
                                          Remove
                                        </button>
                                        <span className="text-[11px] text-white/50 transition-transform duration-200 inline-block group-open:rotate-180">▼</span>
                                      </div>
                                    </div>
                                  </summary>
                                  <div className="border-t border-white/10 px-2 py-2 space-y-1">
                                    {(() => {
                                      const prevType = idx === 0
                                        ? (editingAdditionalStageSteps.length > 0
                                            ? editingAdditionalStageSteps[editingAdditionalStageSteps.length - 1].outputType
                                            : newCustomStepOutputType)
                                        : pendingAdditionalStageSteps[idx - 1].outputType;
                                      const prevStepNum = editingAdditionalStageSteps.length + idx + 1;
                                      const prevLabel = prevType === 'EXCEL_DOC' ? 'Excel Document' : prevType === 'PRESENTATION' ? 'Presentation' : 'Chat Response';
                                      return (
                                        <div className="flex items-center gap-1.5 rounded bg-white/5 border border-white/10 px-2 py-1.5">
                                          <span className="text-white/40">↑</span>
                                          <span className="text-[11px] text-white/50">
                                            Uses output from{' '}<span className="font-semibold text-white/70">Step {prevStepNum}</span>{' — '}<span className="font-semibold text-white/70">{prevLabel}</span>
                                          </span>
                                        </div>
                                      );
                                    })()}
                                    <p className="text-[11px] text-white/70">{pendingStep.description}</p>
                                    <p className="text-[11px] text-white/50">Model: {geminiModelOptions.find((model) => model.id === pendingStep.aiModelId)?.name || pendingStep.aiModelId}</p>
                                    <p className="text-[11px] text-white/50">Output: {pendingStep.outputType}</p>
                                  </div>
                                </details>
                              ))}
                            </div>
                          )}

                          <details className={`rounded border border-white/20 transition-colors ${openStepKey === 'add-step' ? 'bg-white/10' : ''}`} open={openStepKey === 'add-step'}>
                            <summary className="cursor-pointer list-none px-2 py-1.5" onClick={(e) => { e.preventDefault(); setOpenStepKey(openStepKey === 'add-step' ? null : 'add-step'); }}>
                              <p className="text-sm font-semibold text-white">+ Add Step</p>
                            </summary>
                            <div className="border-t border-white/10 px-2 py-2 space-y-2">
                          {(() => {
                            const prevType = pendingAdditionalStageSteps.length > 0
                              ? pendingAdditionalStageSteps[pendingAdditionalStageSteps.length - 1].outputType
                              : editingAdditionalStageSteps.length > 0
                                ? editingAdditionalStageSteps[editingAdditionalStageSteps.length - 1].outputType
                                : newCustomStepOutputType;
                            const prevStepNum = editingAdditionalStageSteps.length + pendingAdditionalStageSteps.length + 1;
                            const prevLabel = prevType === 'EXCEL_DOC' ? 'Excel Document' : prevType === 'PRESENTATION' ? 'Presentation' : 'Chat Response';
                            return (
                              <div className="flex items-center gap-1.5 rounded bg-white/5 border border-white/10 px-2 py-1.5">
                                <span className="text-white/40">↑</span>
                                <span className="text-[11px] text-white/50">
                                  Uses output from{' '}<span className="font-semibold text-white/70">Step {prevStepNum}</span>{' — '}<span className="font-semibold text-white/70">{prevLabel}</span>
                                </span>
                              </div>
                            );
                          })()}
                          <div>
                            <label className="block text-sm font-semibold uppercase tracking-wide text-white/70 mb-1">New Step Name</label>
                            <input
                              type="text"
                              value={newAdditionalStageStepTitle}
                              onChange={(event) => setNewAdditionalStageStepTitle(event.target.value)}
                              placeholder="Additional step name"
                              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 placeholder-gray-400"
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-semibold uppercase tracking-wide text-white/70 mb-1">New Step Description</label>
                            <AutoResizeTextarea
                              value={newAdditionalStageStepDescription}
                              onChange={(event) => setNewAdditionalStageStepDescription(event.target.value)}
                              placeholder="Additional step description"
                              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 placeholder-gray-400"
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-semibold uppercase tracking-wide text-white/70 mb-1">AI Model Chooser</label>
                            <select
                              value={newAdditionalStageStepModelId}
                              onChange={(event) => setNewAdditionalStageStepModelId(event.target.value as AIModelId)}
                              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800"
                            >
                              {geminiModelOptions.map((model) => (
                                <option key={model.id} value={model.id}>{model.name}</option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <label className="block text-sm font-semibold uppercase tracking-wide text-white/70 mb-1">New Step Prompt (optional)</label>
                            <AutoResizeTextarea
                              value={newAdditionalStageStepPrompt}
                              onChange={(event) => setNewAdditionalStageStepPrompt(event.target.value)}
                              placeholder="Optional prompt for this additional step"
                              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 placeholder-gray-400"
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-semibold uppercase tracking-wide text-white/70 mb-1">Document chooser</label>
                            {customStepDocumentOptions.length === 0 ? (
                              <p className="text-sm text-white/40">No documents available yet.</p>
                            ) : (
                              <div className="space-y-1.5 max-h-28 overflow-auto rounded-lg border border-white/20 bg-white/10 p-2">
                                {customStepDocumentOptions.map((doc) => (
                                  <label key={`new-additional-doc-${doc.id}`} className="flex items-center gap-2 text-sm text-white/80">
                                    <input
                                      type="checkbox"
                                      checked={newAdditionalStageStepSelectedDocumentIds.includes(doc.id)}
                                      onChange={() => {
                                        setNewAdditionalStageStepSelectedDocumentIds((prev) => prev.includes(doc.id)
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
                            <label className="block text-sm font-semibold uppercase tracking-wide text-white/70 mb-1">Meeting Transcripts chooser</label>
                            {customStepTranscriptOptions.length === 0 ? (
                              <p className="text-sm text-white/40">No transcripts available yet.</p>
                            ) : (
                              <div className="space-y-1.5 max-h-28 overflow-auto rounded-lg border border-white/20 bg-white/10 p-2">
                                {customStepTranscriptOptions.map((item) => (
                                  <label key={`new-additional-transcript-${item.id}`} className="flex items-center gap-2 text-sm text-white/80">
                                    <input
                                      type="checkbox"
                                      checked={newAdditionalStageStepSelectedTranscriptIds.includes(item.id)}
                                      onChange={() => {
                                        setNewAdditionalStageStepSelectedTranscriptIds((prev) => prev.includes(item.id)
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
                            <label className="block text-sm font-semibold uppercase tracking-wide text-white/70 mb-1">Output</label>
                            <select
                              value={newAdditionalStageStepOutputType}
                              onChange={(event) => {
                                const nextOutput = event.target.value as 'CHAT_INTERFACE' | 'EXCEL_DOC' | 'PRESENTATION';
                                setNewAdditionalStageStepOutputType(nextOutput);
                                if (nextOutput !== 'EXCEL_DOC') setNewAdditionalStageStepExcelTemplate(null);
                                if (nextOutput !== 'PRESENTATION') setNewAdditionalStageStepPresentationTemplate(null);
                              }}
                              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800"
                            >
                              <option value="CHAT_INTERFACE">Chat Interface</option>
                              <option value="EXCEL_DOC">Excel Doc</option>
                              <option value="PRESENTATION">Presentation</option>
                            </select>
                          </div>

                          <div>
                            <label className="block text-sm font-semibold uppercase tracking-wide text-white/70 mb-1">Desired Output (copy/paste)</label>
                            <AutoResizeTextarea
                              value={newAdditionalStageStepDesiredOutput}
                              onChange={(event) => setNewAdditionalStageStepDesiredOutput(event.target.value)}
                              placeholder="Paste desired output for this additional step"
                              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 placeholder-gray-400"
                            />
                          </div>

                          {newAdditionalStageStepOutputType === 'EXCEL_DOC' && (
                            <div className="space-y-1">
                              <button
                                type="button"
                                onClick={() => { void loadCustomStepTemplatesFromSharePoint('EXCEL'); }}
                                disabled={isLoadingCustomStepExcelTemplates}
                                className={`px-3 py-2 rounded-lg text-sm font-semibold ${
                                  isLoadingCustomStepExcelTemplates
                                    ? 'bg-wm-neutral/20 text-wm-blue/40 cursor-not-allowed'
                                    : 'bg-wm-accent text-white hover:bg-wm-accent/90'
                                }`}
                              >
                                {isLoadingCustomStepExcelTemplates ? 'Loading...' : 'Load Excel files from SharePoint'}
                              </button>
                              {customStepExcelTemplateOptions.map((doc) => (
                                <button
                                  key={`new-additional-excel-${doc.id}`}
                                  type="button"
                                  onClick={() => handleUseSharePointExcelTemplateForNewAdditionalStep(doc)}
                                  className="block text-left text-sm font-semibold text-wm-accent hover:underline"
                                >
                                  Use {doc.fileName}
                                </button>
                              ))}
                              {newAdditionalStageStepExcelTemplate && (
                                <p className="text-sm text-white/60">Selected template: {newAdditionalStageStepExcelTemplate.fileName}</p>
                              )}
                            </div>
                          )}

                          {newAdditionalStageStepOutputType === 'PRESENTATION' && (
                            <div className="space-y-1">
                              <button
                                type="button"
                                onClick={() => { void loadCustomStepTemplatesFromSharePoint('PRESENTATION'); }}
                                disabled={isLoadingCustomStepPresentationTemplates}
                                className={`px-3 py-2 rounded-lg text-sm font-semibold ${
                                  isLoadingCustomStepPresentationTemplates
                                    ? 'bg-wm-neutral/20 text-wm-blue/40 cursor-not-allowed'
                                    : 'bg-wm-accent text-white hover:bg-wm-accent/90'
                                }`}
                              >
                                {isLoadingCustomStepPresentationTemplates ? 'Loading...' : 'Load PowerPoint files from SharePoint'}
                              </button>
                              {customStepPresentationTemplateOptions.map((doc) => (
                                <button
                                  key={`new-additional-ppt-${doc.id}`}
                                  type="button"
                                  onClick={() => handleUseSharePointPresentationTemplateForNewAdditionalStep(doc)}
                                  className="block text-left text-sm font-semibold text-wm-accent hover:underline"
                                >
                                  Use {doc.fileName}
                                </button>
                              ))}
                              {newAdditionalStageStepPresentationTemplate && (
                                <p className="text-sm text-white/60">Selected template: {newAdditionalStageStepPresentationTemplate.fileName}</p>
                              )}
                            </div>
                          )}

                          <div className="flex justify-end">
                            <button
                              type="button"
                              onClick={handleQueueAdditionalStageStep}
                              className="px-3 py-2 rounded-lg text-sm font-semibold bg-white/10 border border-white/20 text-white hover:bg-white/20"
                            >
                              Add Step to Stage
                            </button>
                          </div>
                            </div>
                          </details>
                      </div>
                    )}
                          </div>
                        </details>

                        <div className="pt-1 flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={editingCustomStepId ? handleSaveEditedCustomStepFromBuilder : handleCreateCustomStep}
                            disabled={isSavingCustomStep || !canSaveSingleCustomStage}
                            className={`px-3 py-2 rounded-lg text-sm font-semibold ${
                              isSavingCustomStep || !canSaveSingleCustomStage
                                ? 'bg-wm-neutral/20 text-wm-blue/40 cursor-not-allowed'
                                : 'bg-wm-accent text-white hover:bg-wm-accent/90'
                            }`}
                          >
                            {isSavingCustomStep ? 'Saving...' : (editingCustomStepId ? 'Save Stage Changes' : 'Save Custom Stage')}
                          </button>
                        </div>
                      </>
                    )}

                    {customStepStatus && <p className="text-sm text-wm-blue/60">{customStepStatus}</p>}
                  </div>
                )}
              </div>
            )}

            {!isJourneyStepManagerOpen && (
              <div className="mt-3 space-y-3">
                {/* Compact scrollable pill strip */}
                <div ref={pillStripRef} className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
                  {visibleOrderedSteps.map((step, index) => {
                    const isSelected = selectedStepId === step.id;
                    const isCurrent = step.status === 'current';
                    const isLocked = step.locked && step.title !== 'Company Research';
                    return (
                      <button
                        key={step.id}
                        type="button"
                        data-active-pill={isSelected ? 'true' : undefined}
                        onClick={() => {
                          if (!isLocked) {
                            setSelectedStepId(step.id);
                            selectedStepDirtyRef.current = true;
                          }
                        }}
                        disabled={isLocked}
                        className={`flex-shrink-0 inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm font-semibold transition-colors whitespace-nowrap ${
                          isSelected
                            ? 'border-wm-accent bg-wm-accent text-white shadow-sm'
                            : isCurrent
                              ? 'border-wm-accent/40 bg-wm-accent/5 text-wm-blue hover:bg-wm-accent/10'
                              : isLocked
                                ? 'border-wm-neutral/20 bg-wm-neutral/5 text-wm-blue/30 cursor-not-allowed'
                                : 'border-wm-neutral/30 bg-white text-wm-blue/70 hover:bg-wm-neutral/5'
                        }`}
                        aria-pressed={isSelected}
                      >
                        <span className={`inline-flex h-4 w-4 items-center justify-center rounded-full text-[10px] font-bold flex-shrink-0 ${
                          isSelected ? 'bg-white/20 text-white' : isCurrent ? 'bg-wm-accent/20 text-wm-accent' : 'bg-wm-neutral/20 text-wm-blue/50'
                        }`}>
                          {index + 1}
                        </span>
                        {step.title}
                      </button>
                    );
                  })}
                </div>

                {/* Active step detail card */}
                {(() => {
                  const step = visibleOrderedSteps.find((s) => s.id === selectedStepId);
                  if (!step) return null;
                  const stepIndex = visibleOrderedSteps.indexOf(step);
                  const prevStep = stepIndex > 0 ? visibleOrderedSteps[stepIndex - 1] : null;
                  const nextStep = stepIndex < visibleOrderedSteps.length - 1 ? visibleOrderedSteps[stepIndex + 1] : null;
                  const customStage = step.isCustom && step.customStepId ? customStepById.get(step.customStepId) : null;
                  const childSteps = customStage && Array.isArray(customStage.steps) ? customStage.steps : [];

                  return (
                    <div className={`rounded-lg border px-4 py-3 ${
                      step.status === 'current'
                        ? 'border-wm-accent/30 bg-wm-accent/5'
                        : 'border-wm-neutral/20 bg-wm-neutral/5'
                    }`}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className={`inline-flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                              step.status === 'current' ? 'bg-wm-accent text-white' : 'bg-wm-blue/10 text-wm-blue'
                            }`}>
                              {stepIndex + 1}
                            </span>
                            <span className="text-base font-bold text-wm-blue">{step.title}</span>
                            {step.isCustom && (
                              <span className="rounded-full border border-wm-accent/30 bg-wm-accent/10 px-2 py-0.5 text-[11px] font-semibold text-wm-accent">Custom</span>
                            )}
                          </div>
                          {step.description && (
                            <p className="mt-1 text-sm text-wm-blue/60 ml-8">{step.description}</p>
                          )}
                          {childSteps.length > 0 && (
                            <div className="mt-2 ml-8 flex flex-wrap gap-1.5">
                              {childSteps.map((cs, ci) => (
                                <span key={ci} className="inline-flex items-center gap-1 rounded-full border border-wm-neutral/20 bg-white px-2 py-0.5 text-[11px] text-wm-blue/70">
                                  <span className="font-semibold text-wm-blue/40">{ci + 1}</span>
                                  {cs.title}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <button
                            type="button"
                            onClick={() => { if (prevStep && (!prevStep.locked || prevStep.title === 'Company Research')) { setSelectedStepId(prevStep.id); selectedStepDirtyRef.current = true; } }}
                            disabled={!prevStep || (prevStep.locked && prevStep.title !== 'Company Research')}
                            className="p-1.5 rounded-lg border border-wm-neutral/20 text-wm-blue/50 hover:text-wm-blue hover:bg-wm-neutral/10 disabled:opacity-30 disabled:cursor-not-allowed"
                            aria-label="Previous step"
                          >◀</button>
                          <button
                            type="button"
                            onClick={() => { if (nextStep && (!nextStep.locked || nextStep.title === 'Company Research')) { setSelectedStepId(nextStep.id); selectedStepDirtyRef.current = true; } }}
                            disabled={!nextStep || (nextStep.locked && nextStep.title !== 'Company Research')}
                            className="p-1.5 rounded-lg border border-wm-neutral/20 text-wm-blue/50 hover:text-wm-blue hover:bg-wm-neutral/10 disabled:opacity-30 disabled:cursor-not-allowed"
                            aria-label="Next step"
                          >▶</button>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}
          </section>
          )}

          {!isJourneyStepManagerOpen && (
          <>

          {selectedStep?.isCustom && companyId && (
            <section className="mb-6 rounded-xl border border-wm-neutral/30 bg-white p-4 shadow-sm [&_button]:!text-sm [&_input]:!text-sm [&_li]:!text-sm [&_p]:!text-sm [&_span]:!text-sm [&_summary]:!text-sm [&_textarea]:!text-sm">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div>
                  <h2 className="text-lg font-semibold text-wm-blue">{selectedStep.title}</h2>
                  <p className="text-sm text-wm-blue/60 mt-1">{selectedStep.description}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsJourneyStepManagerOpen(true)}
                    className="px-3 py-2 rounded-lg text-sm font-semibold border border-wm-neutral/30 text-wm-blue hover:bg-wm-neutral/10"
                  >
                    Manage stages
                  </button>
                </div>
              </div>
              <p className="mt-4 text-sm text-wm-blue/70">
                This is a custom journey stage. Use this area to track bespoke work items for this customer journey.
              </p>
              {selectedCustomStep && (
                <div className="mt-4 rounded-lg border border-wm-neutral/20 bg-wm-neutral/5 p-3 space-y-3 text-sm text-wm-blue/80">
                  <div className="flex flex-wrap gap-2">
                    <span className="inline-flex items-center rounded-full bg-white border border-wm-neutral/30 px-2.5 py-1 text-sm">
                      <span className="font-semibold text-wm-blue mr-1">Model</span>
                      {selectedCustomStep.aiModelId || 'Not set'}
                    </span>
                    <span className="inline-flex items-center rounded-full bg-white border border-wm-neutral/30 px-2.5 py-1 text-sm">
                      <span className="font-semibold text-wm-blue mr-1">Output</span>
                      {selectedCustomStep.outputType === 'EXCEL_DOC' ? 'Excel Doc' : selectedCustomStep.outputType === 'PRESENTATION' ? 'Presentation' : 'Chat Interface'}
                    </span>
                    <span className="inline-flex items-center rounded-full bg-white border border-wm-neutral/30 px-2.5 py-1 text-sm">
                      <span className="font-semibold text-wm-blue mr-1">Docs</span>
                      {(selectedCustomStep.selectedDocumentIds || []).length}
                    </span>
                    <span className="inline-flex items-center rounded-full bg-white border border-wm-neutral/30 px-2.5 py-1 text-sm">
                      <span className="font-semibold text-wm-blue mr-1">Transcripts</span>
                      {(selectedCustomStep.selectedTranscriptIds || []).length}
                    </span>
                    <span className="inline-flex items-center rounded-full bg-white border border-wm-neutral/30 px-2.5 py-1 text-sm">
                      <span className="font-semibold text-wm-blue mr-1">Child steps</span>
                      {selectedCustomChildSteps.length}
                    </span>
                  </div>

                  {selectedCustomChildSteps.length > 0 && (
                    <details className="rounded-lg border border-wm-neutral/20 bg-white px-3 py-2">
                      <summary className="cursor-pointer text-sm font-semibold text-wm-blue">
                        View stage steps ({selectedCustomChildSteps.length})
                      </summary>
                      <ol className="mt-2 space-y-2">
                        {selectedCustomChildSteps.map((child, childIndex) => (
                          <li key={child.id} className="rounded border border-wm-neutral/20 bg-wm-neutral/5 px-2 py-1.5">
                            <p className="text-sm font-semibold text-wm-blue">Step {childIndex + 1}: {child.title}</p>
                            {child.description && (
                              <p className="text-[11px] text-wm-blue/70 mt-0.5">{child.description}</p>
                            )}
                          </li>
                        ))}
                      </ol>
                    </details>
                  )}

                  {(selectedCustomStepDocumentLabels.length > 0 || selectedCustomStepTranscriptLabels.length > 0) && (
                    <details className="rounded-lg border border-wm-neutral/20 bg-white px-3 py-2">
                      <summary className="cursor-pointer text-sm font-semibold text-wm-blue">
                        View selected sources ({selectedCustomStepDocumentLabels.length + selectedCustomStepTranscriptLabels.length})
                      </summary>
                      <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                          <p className="text-[11px] font-semibold uppercase tracking-wide text-wm-blue/60 mb-1">Documents</p>
                          {selectedCustomStepDocumentLabels.length === 0 ? (
                            <p className="text-sm text-wm-blue/50">None selected</p>
                          ) : (
                            <ul className="list-disc pl-4 text-sm space-y-1 max-h-24 overflow-auto">
                              {selectedCustomStepDocumentLabels.map((label, index) => (
                                <li key={`doc-${label}-${index}`}>{label}</li>
                              ))}
                            </ul>
                          )}
                        </div>
                        <div>
                          <p className="text-[11px] font-semibold uppercase tracking-wide text-wm-blue/60 mb-1">Meeting transcripts</p>
                          {selectedCustomStepTranscriptLabels.length === 0 ? (
                            <p className="text-sm text-wm-blue/50">None selected</p>
                          ) : (
                            <ul className="list-disc pl-4 text-sm space-y-1 max-h-24 overflow-auto">
                              {selectedCustomStepTranscriptLabels.map((label, index) => (
                                <li key={`tr-${label}-${index}`}>{label}</li>
                              ))}
                            </ul>
                          )}
                        </div>
                      </div>
                    </details>
                  )}

                  {selectedCustomStep && (
                    <div className="rounded-lg border border-wm-accent/20 bg-white p-3">
                      <div className="mb-2 rounded-lg border border-wm-neutral/20 bg-wm-neutral/5 p-2">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="text-sm text-wm-blue/80">
                              Current step in stage: <span className="font-semibold">{selectedCustomPrimaryStep?.title || `Step ${selectedCustomActiveChildStepIndex + 1}`}</span>
                            </p>
                            {(selectedCustomPrimaryStep?.description || selectedCustomStep.description) && (
                              <p className="mt-1 text-[11px] text-wm-blue/70 whitespace-pre-wrap">
                                {selectedCustomPrimaryStep?.description || selectedCustomStep.description}
                              </p>
                            )}
                            {selectedCustomChildSteps.length > 1 && (
                              <p className="text-[11px] text-wm-blue/60">
                                Step {selectedCustomActiveChildStepIndex + 1} of {selectedCustomChildSteps.length}
                              </p>
                            )}
                          </div>
                          {!isCustomPromptEditing && (
                            <button
                              type="button"
                              onClick={() => {
                                if (isCustomPromptExpanded) {
                                  setIsCustomPromptExpanded(false);
                                  return;
                                }
                                setIsCustomPromptExpanded(true);
                                setCustomPromptDraft(selectedCustomPrimaryStep?.prompt || selectedCustomStep.prompt || '');
                                setIsCustomPromptEditing(true);
                              }}
                              className="text-[11px] font-semibold text-wm-accent hover:underline"
                            >
                              {isCustomPromptExpanded ? 'less...' : 'more...'}
                            </button>
                          )}
                        </div>

                        {(isCustomPromptEditing || isCustomPromptExpanded) && (
                          <div className="mt-2 border-t border-wm-neutral/20 pt-2">
                            <p className="text-[11px] font-semibold uppercase tracking-wide text-wm-blue/60">Step prompt</p>
                            {isCustomPromptEditing ? (
                              <div className="mt-1 space-y-2">
                                <textarea
                                  value={customPromptDraft}
                                  onChange={(event) => setCustomPromptDraft(event.target.value)}
                                  rows={6}
                                  className="w-full rounded-lg border border-wm-neutral/30 bg-white px-3 py-2 text-sm text-wm-blue"
                                />
                                <div className="flex items-center gap-2 justify-end">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setIsCustomPromptEditing(false);
                                      setIsCustomPromptExpanded(false);
                                      setCustomPromptDraft(selectedCustomPrimaryStep?.prompt || selectedCustomStep.prompt || '');
                                    }}
                                    className="px-2.5 py-1.5 rounded-md text-sm font-semibold border border-wm-neutral/30 text-wm-blue hover:bg-wm-neutral/10"
                                  >
                                    Cancel
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      void handleSaveInlineCustomPrompt();
                                    }}
                                    disabled={isSavingCustomStep}
                                    className={`px-2.5 py-1.5 rounded-md text-sm font-semibold ${
                                      isSavingCustomStep
                                        ? 'bg-wm-neutral/20 text-wm-blue/40 cursor-not-allowed'
                                        : 'bg-wm-accent text-white hover:bg-wm-accent/90'
                                    }`}
                                  >
                                    Save prompt
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <p className={`mt-1 text-sm text-wm-blue/80 whitespace-pre-wrap ${isCustomPromptExpanded ? '' : 'line-clamp-2'}`}>
                                {selectedCustomPrimaryStep?.prompt || selectedCustomStep.prompt || 'No prompt provided.'}
                              </p>
                            )}
                          </div>
                        )}
                      </div>

                      {selectedCustomNextStepInfo && (
                        <div className="mb-2 rounded-lg border border-wm-neutral/20 bg-wm-neutral/5 p-2 flex items-center justify-between gap-2">
                          <p className="text-sm text-wm-blue/80">
                            Next step: <span className="font-semibold">{selectedCustomNextStepInfo.nextStepTitle}</span>
                          </p>
                          <button
                            type="button"
                            onClick={() => {
                              if (selectedCustomNextStepInfo.nextCustomStepId) {
                                setActiveChildStepIndexByCustomStepId((prev) => ({
                                  ...prev,
                                  [selectedCustomNextStepInfo.nextCustomStepId as string]: 0
                                }));
                                setPendingAutoRunRequest({
                                  customStepId: selectedCustomNextStepInfo.nextCustomStepId,
                                  childIndex: 0,
                                  message: buildAutoRunMessageForChildStep(selectedCustomNextStepInfo.nextCustomStepId, 0)
                                });
                              }
                              setSelectedStepId(selectedCustomNextStepInfo.nextStepId);
                              selectedStepDirtyRef.current = true;
                              setCustomStepStatus(`Moved to next step: ${selectedCustomNextStepInfo.nextStepTitle}.${selectedCustomNextStepInfo.nextCustomStepId ? ' Running it now...' : ''}`);
                            }}
                            className="px-2.5 py-1.5 rounded-md bg-wm-accent text-white text-sm font-semibold hover:bg-wm-accent/90"
                          >
                            Go to next step
                          </button>
                        </div>
                      )}
                      {shouldPromptForNextStepDocument && (
                        <div className="mb-2 rounded-lg border border-wm-accent/25 bg-wm-accent/5 p-2">
                          <p className="text-sm text-wm-blue/80">
                            The next step is <span className="font-semibold">{nextVisibleCustomStep?.title}</span> and uses
                            {' '}<span className="font-semibold">{nextVisibleStepOutputType === 'EXCEL_DOC' ? 'Excel' : 'Presentation'}</span> output.
                            {' '}Would you like me to create that document for you?
                          </p>
                          <div className="mt-2 flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                const prompt = `Yes, please create the ${nextVisibleStepOutputType === 'EXCEL_DOC' ? 'Excel document' : 'presentation'} for the next step (${nextVisibleCustomStep?.title || 'next step'}). Use the configured template and selected sources.`;
                                void handleSendCustomStepChat(prompt);
                              }}
                              className="px-2.5 py-1.5 rounded-md bg-wm-accent text-white text-sm font-semibold hover:bg-wm-accent/90"
                            >
                              Yes, create it
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                if (!selectedCustomStep) return;
                                setNextStepDocumentPromptDismissedByStepId((prev) => ({
                                  ...prev,
                                  [selectedCustomStep.id]: true
                                }));
                              }}
                              className="px-2.5 py-1.5 rounded-md border border-wm-neutral/30 text-sm font-semibold text-wm-blue hover:bg-wm-neutral/10"
                            >
                              Not now
                            </button>
                          </div>
                        </div>
                      )}
                      {selectedCustomPrimaryStep?.desiredOutput && (
                        <div className="mb-2 rounded-lg border border-wm-neutral/20 bg-wm-neutral/5 p-2">
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-sm font-semibold uppercase tracking-wide text-wm-blue/60">Desired output</p>
                            <button
                              type="button"
                              onClick={() => {
                                void handleCopyCustomOutputText(selectedCustomPrimaryStep.desiredOutput || '');
                              }}
                              className="text-sm font-semibold text-wm-accent hover:underline"
                            >
                              Copy
                            </button>
                          </div>
                          <textarea
                            value={selectedCustomPrimaryStep.desiredOutput || ''}
                            readOnly
                            rows={3}
                            className="mt-1 w-full rounded border border-wm-neutral/30 bg-white px-2 py-1.5 text-sm text-wm-blue"
                          />
                        </div>
                      )}
                      {selectedCustomPrimaryOutputType === 'EXCEL_DOC' && (
                        <div className="mb-2 rounded-lg border border-emerald-200 bg-emerald-50/60 p-3">
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-sm font-semibold uppercase tracking-wide text-emerald-800">Excel preview</p>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={handleDownloadExcelPreviewXlsx}
                                disabled={!selectedCustomExcelPreviewTable}
                                className={`px-2.5 py-1.5 rounded-md text-sm font-semibold ${
                                  selectedCustomExcelPreviewTable
                                    ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                                    : 'bg-wm-neutral/20 text-wm-blue/40 cursor-not-allowed'
                                }`}
                              >
                                Download Excel
                              </button>
                              <button
                                type="button"
                                onClick={handleDownloadExcelPreviewCsv}
                                disabled={!selectedCustomExcelPreviewTable}
                                className={`px-2.5 py-1.5 rounded-md text-sm font-semibold ${
                                  selectedCustomExcelPreviewTable
                                    ? 'bg-white border border-emerald-300 text-emerald-800 hover:bg-emerald-100/50'
                                    : 'bg-wm-neutral/20 text-wm-blue/40 cursor-not-allowed'
                                }`}
                              >
                                Download CSV
                              </button>
                            </div>
                          </div>

                          {selectedCustomExcelPreviewTable ? (
                            <div className="mt-2 overflow-x-auto rounded-lg border border-emerald-200 bg-white">
                              <table className="min-w-full text-sm text-wm-blue">
                                <thead className="bg-emerald-100/70">
                                  <tr>
                                    {selectedCustomExcelPreviewTable.headers.map((header, index) => (
                                      <th
                                        key={`excel-preview-header-${index}`}
                                        className="px-3 py-2 text-left font-semibold text-emerald-900 border-b border-emerald-200"
                                      >
                                        {header || `Column ${index + 1}`}
                                      </th>
                                    ))}
                                  </tr>
                                </thead>
                                <tbody>
                                  {selectedCustomExcelPreviewTable.rows.map((row, rowIndex) => (
                                    <tr key={`excel-preview-row-${rowIndex}`} className={rowIndex % 2 === 0 ? 'bg-white' : 'bg-emerald-50/40'}>
                                      {row.map((cell, cellIndex) => (
                                        <td
                                          key={`excel-preview-cell-${rowIndex}-${cellIndex}`}
                                          className="px-3 py-2 align-top border-b border-emerald-100 whitespace-pre-wrap"
                                        >
                                          {cell}
                                        </td>
                                      ))}
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          ) : (
                            <p className="mt-2 text-sm text-emerald-900/80">
                              Run this step to generate a table preview. The response should include a markdown table for download.
                            </p>
                          )}
                        </div>
                      )}
                      {((customStepChatByStepId[selectedCustomStep.id] || []).length === 0) ? (
                        <div className="flex gap-2">
                          <textarea
                            value={customStepChatInput}
                            onChange={(event) => setCustomStepChatInput(event.target.value)}
                            onKeyDown={(event) => {
                              if (event.key === 'Enter' && !event.shiftKey) {
                                event.preventDefault();
                                void handleSendCustomStepChat();
                              }
                            }}
                            placeholder="Type your first request..."
                            rows={2}
                            className="flex-1 rounded-lg border border-wm-neutral/30 bg-white px-3 py-2 text-sm text-wm-blue"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              void handleSendCustomStepChat();
                            }}
                            disabled={isCustomStepChatSending || !customStepChatInput.trim()}
                            className={`px-3 py-2 rounded-lg text-sm font-semibold ${
                              isCustomStepChatSending || !customStepChatInput.trim()
                                ? 'bg-wm-neutral/20 text-wm-blue/40 cursor-not-allowed'
                                : 'bg-wm-accent text-white hover:bg-wm-accent/90'
                            }`}
                          >
                            Send
                          </button>
                        </div>
                      ) : (
                        <>
                          <p className="text-sm font-semibold text-wm-blue">Chat Interface Component</p>
                          <p className="text-sm text-wm-blue/60 mt-1">
                            Enter a short request describing what you want this stage to produce (question, summary, draft, or analysis) and include any specific constraints.
                          </p>

                          <div className="mt-2 rounded-lg border border-wm-neutral/20 bg-wm-neutral/5 p-2 h-64 overflow-auto space-y-2">
                            {(customStepChatByStepId[selectedCustomStep.id] || []).map((message, index) => (
                              <div
                                key={`${selectedCustomStep.id}-msg-${index}`}
                                className={`max-w-[90%] rounded-lg px-3 py-2 text-sm whitespace-pre-wrap ${
                                  message.role === 'user'
                                    ? 'ml-auto bg-wm-accent text-white'
                                    : 'mr-auto bg-white border border-wm-neutral/20 text-wm-blue'
                                }`}
                              >
                                {renderCustomStepChatMessageContent(message)}
                              </div>
                            ))}
                            {isCustomStepChatSending && (
                              <div className="mr-auto bg-white border border-wm-neutral/20 text-wm-blue rounded-lg px-3 py-2 text-sm">
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
                              className="flex-1 rounded-lg border border-wm-neutral/30 bg-white px-3 py-2 text-sm text-wm-blue"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                void handleSendCustomStepChat();
                              }}
                              disabled={isCustomStepChatSending || !customStepChatInput.trim()}
                              className={`px-3 py-2 rounded-lg text-sm font-semibold ${
                                isCustomStepChatSending || !customStepChatInput.trim()
                                  ? 'bg-wm-neutral/20 text-wm-blue/40 cursor-not-allowed'
                                  : 'bg-wm-accent text-white hover:bg-wm-accent/90'
                              }`}
                            >
                              Send
                            </button>
                          </div>
                        </>
                      )}

                    </div>
                  )}

                  {customStepOutputStatus && (
                    <p className="text-sm text-wm-blue/60">{customStepOutputStatus}</p>
                  )}
                </div>
              )}
            </section>
          )}
          {selectedStep?.title === 'Target Domains' && companyId && (
            <section className="mb-6 rounded-xl border border-wm-neutral/30 bg-white p-4 shadow-sm">
              <div className="mb-5 border-b border-wm-neutral/20 pb-4">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-wm-blue/60 mb-2">3) SharePoint presentation reference</h3>
                <p className="text-sm text-wm-blue/60 mb-3">
                  Use presentations from your configured SharePoint folder. The selected deck will guide kickoff presentation output style.
                </p>
                <button
                  type="button"
                  onClick={handleLoadSharePointPresentations}
                  disabled={isSavingKickoffTemplateReference}
                  className={`px-3 py-2 rounded-lg text-sm font-semibold ${
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
                          <p className="text-sm text-wm-blue/60">{doc.path || doc.url || 'SharePoint file'}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleUseSharePointPresentationAsTemplate(doc)}
                          disabled={isSavingKickoffTemplateReference}
                          className="text-sm font-semibold text-wm-accent hover:underline"
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
                      <p className="text-sm text-wm-blue/60">Selected {new Date(kickoffTemplateReference.uploadedAt).toLocaleString()}</p>
                    </div>
                    <button
                      type="button"
                      onClick={handleRemoveKickoffTemplateReference}
                      disabled={isSavingKickoffTemplateReference}
                      className="text-sm font-semibold text-wm-pink hover:underline"
                    >
                      Remove
                    </button>
                  </div>
                )}
                {kickoffTemplateStatus && (
                  <p className="mt-2 text-sm text-wm-blue/70">{kickoffTemplateStatus}</p>
                )}
              </div>

              <div className="flex items-start justify-between gap-3 flex-wrap mb-4">
                <div>
                  <h2 className="text-lg font-semibold text-wm-blue">Target Domains & Kickoff Pitch Use Cases</h2>
                  <p className="text-sm text-wm-blue/60">
                    Focus on the domains and use cases you want to target and pitch during the kickoff meeting.
                  </p>
                </div>
                <span className="text-sm font-semibold px-2 py-1 rounded-full bg-wm-accent/10 text-wm-accent">
                  {selectedKickoffUseCases.length} use case{selectedKickoffUseCases.length === 1 ? '' : 's'} selected
                </span>
              </div>

              <div className="mb-4">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-wm-blue/60 mb-2">1) Choose potential domains</h3>
                <div className="flex flex-wrap gap-2">
                  {defaultDomainSelection.map((domain) => {
                    const isSelected = companySelectedDomains.includes(domain);
                    return (
                      <button
                        key={domain}
                        type="button"
                        onClick={() => handleToggleDomain(domain)}
                        className={`px-3 py-1.5 rounded-full text-sm font-semibold border transition-colors ${
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
                <h3 className="text-sm font-semibold uppercase tracking-wide text-wm-blue/60 mb-2">2) Pick kickoff pitch use cases</h3>
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
                            <p className="text-sm text-wm-blue/50 mt-1">No process use cases found in the library for this domain.</p>
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
                              className="px-2.5 py-1 text-sm font-semibold rounded-md border border-wm-accent/40 text-wm-accent hover:bg-wm-accent/10"
                            >
                              + Create use case
                            </button>
                          </div>
                          <div className="flex gap-3 overflow-x-auto pb-1 pr-1 scrollbar-hide">
                            {[...domainUseCases]
                              .sort((a, b) => {
                                const aJourneyCustom = a.userId === user.uid;
                                const bJourneyCustom = b.userId === user.uid;
                                if (aJourneyCustom !== bJourneyCustom) return aJourneyCustom ? -1 : 1;

                                const aSelected = companySelectedScenarios.includes(a.id);
                                const bSelected = companySelectedScenarios.includes(b.id);
                                if (aSelected !== bSelected) return aSelected ? -1 : 1;

                                return (a.title || '').localeCompare(b.title || '');
                              })
                              .map((scenario) => {
                              const checked = companySelectedScenarios.includes(scenario.id);
                              const isJourneyCreated = scenario.userId === user.uid;
                              const creatorLabel = user.displayName || user.email || 'You';
                              const creatorInitials = (user.displayName || user.email?.split('@')[0] || 'U')
                                .split(/\s+/)
                                .filter(Boolean)
                                .slice(0, 2)
                                .map((part) => part[0]?.toUpperCase() || '')
                                .join('') || 'U';
                              const fallbackDemoUrl = (scenario as { demoPublishedUrl?: string | null; demoProjectUrl?: string | null }).demoPublishedUrl
                                || (scenario as { demoPublishedUrl?: string | null; demoProjectUrl?: string | null }).demoProjectUrl
                                || null;
                              const latestDemoUrl = (scenario.process ? latestDemoUrlByProcess[scenario.process.trim()] : null) || fallbackDemoUrl;
                              return (
                                <div
                                  key={scenario.id}
                                  onClick={() => navigate(`/scenario/${scenario.id}`)}
                                  role="button"
                                  aria-label={`Open use case ${scenario.title}`}
                                  tabIndex={0}
                                  onKeyDown={(event) => {
                                    if (event.key === 'Enter' || event.key === ' ') {
                                      event.preventDefault();
                                      navigate(`/scenario/${scenario.id}`);
                                    }
                                  }}
                                  className={`relative w-[320px] min-w-[320px] flex-shrink-0 rounded-lg border p-3 cursor-pointer transition-all duration-200 bg-white shadow-sm ${
                                    checked
                                      ? isJourneyCreated
                                        ? 'border-wm-pink ring-2 ring-wm-pink/20 bg-wm-pink/5'
                                        : 'border-wm-accent ring-2 ring-wm-accent/20'
                                      : isJourneyCreated
                                        ? 'border-wm-pink/50 bg-wm-pink/5 hover:border-wm-pink'
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
                                    {isJourneyCreated && (
                                      <span
                                        className="inline-flex items-center rounded-full border border-wm-pink/20 bg-wm-pink/10 p-0.5"
                                        title={`Created by ${creatorLabel}`}
                                      >
                                        {user.photoURL ? (
                                          <img
                                            src={user.photoURL}
                                            alt={`${creatorLabel} avatar`}
                                            className="h-5 w-5 rounded-full object-cover"
                                          />
                                        ) : (
                                          <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-wm-pink/20 text-[10px] font-semibold text-wm-pink">
                                            {creatorInitials}
                                          </span>
                                        )}
                                      </span>
                                    )}
                                  </div>

                                  <div className="pt-12">
                                    <p className="text-sm font-semibold text-wm-blue pr-6 leading-snug">{scenario.title}</p>
                                    {scenario.description && (
                                      <p className="text-sm text-wm-blue/60 mt-1 line-clamp-3">{scenario.description}</p>
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
                  <p className="text-sm text-wm-blue/60">
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
                <label className="block text-sm font-semibold uppercase tracking-wide text-wm-blue/60 mb-2">
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
                    className="mt-2 inline-flex text-sm font-semibold text-wm-accent hover:underline"
                  >
                    Open kickoff presentation
                  </a>
                )}
                {kickoffUrlStatus && (
                  <p className="mt-2 text-sm text-wm-blue/70">{kickoffUrlStatus}</p>
                )}
              </div>

              <div className="mt-6 border-t border-wm-neutral/20 pt-5">
                <h3 className="text-sm font-semibold text-wm-blue">Kickoff Meeting Notes</h3>
                <p className="text-sm text-wm-blue/60 mt-1">
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
                <span className="text-sm font-semibold px-2 py-1 rounded-full bg-wm-accent/10 text-wm-accent">
                  {hypothesisBreakdown.length} hypothesis target{hypothesisBreakdown.length === 1 ? '' : 's'}
                </span>
              </div>

              {kickoffMeetingNotes.length === 0 ? (
                <div className="mt-4 rounded-lg border border-wm-neutral/20 bg-wm-neutral/5 p-4">
                  <p className="text-sm text-wm-blue/70">
                    Add kickoff meeting notes in the Kickoff Meeting stage to generate high-level hypotheses.
                  </p>
                </div>
              ) : (
                <>
                  <div className="mt-5">
                    <h3 className="text-sm font-semibold uppercase tracking-wide text-wm-blue/60 mb-2">Kickoff Notes Summary</h3>
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
                    <h3 className="text-sm font-semibold uppercase tracking-wide text-wm-blue/60 mb-3">
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
                            <p className="mt-2 text-sm text-wm-blue/70"><span className="font-semibold">Why now:</span> {item.why}</p>
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
                    <h3 className="text-sm font-semibold uppercase tracking-wide text-wm-blue/60 mb-2">
                      Phase 2 Target Domains & Functions
                    </h3>
                    <p className="text-sm text-wm-blue/70">
                      Choose the actual domains/functions to pursue in phase 2 based on the recommendations above.
                    </p>
                  </div>
                  <span className="text-sm font-semibold px-2 py-1 rounded-full bg-wm-accent/10 text-wm-accent">
                    {phase2SelectedUseCases.length} function target{phase2SelectedUseCases.length === 1 ? '' : 's'} selected
                  </span>
                </div>

                <div className="mt-4">
                  <h4 className="text-sm font-semibold uppercase tracking-wide text-wm-blue/60 mb-2">1) Choose domains</h4>
                  <div className="flex flex-wrap gap-2">
                    {defaultDomainSelection.map((domain) => {
                      const selected = phase2SelectedDomains.includes(domain);
                      return (
                        <button
                          key={domain}
                          type="button"
                          onClick={() => handleTogglePhase2Domain(domain)}
                          className={`px-3 py-1.5 rounded-full text-sm font-semibold border transition-colors ${
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
                  <h4 className="text-sm font-semibold uppercase tracking-wide text-wm-blue/60 mb-2">2) Choose functions / use cases</h4>
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
                              <p className="text-sm text-wm-blue/50 mt-1">No process use cases found in the library for this domain.</p>
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
                                className="px-2.5 py-1 text-sm font-semibold rounded-md border border-wm-accent/40 text-wm-accent hover:bg-wm-accent/10"
                              >
                                + Create use case
                              </button>
                            </div>
                            <div className="flex gap-3 overflow-x-auto pb-1 pr-1 scrollbar-hide">
                              {[...domainUseCases]
                                .sort((a, b) => {
                                  const aJourneyCustom = a.userId === user.uid;
                                  const bJourneyCustom = b.userId === user.uid;
                                  if (aJourneyCustom !== bJourneyCustom) return aJourneyCustom ? -1 : 1;

                                  const aSelected = phase2SelectedUseCases.includes(a.id);
                                  const bSelected = phase2SelectedUseCases.includes(b.id);
                                  if (aSelected !== bSelected) return aSelected ? -1 : 1;

                                  return (a.title || '').localeCompare(b.title || '');
                                })
                                .map((scenario) => {
                                const checked = phase2SelectedUseCases.includes(scenario.id);
                                const isJourneyCreated = scenario.userId === user.uid;
                                const creatorLabel = user.displayName || user.email || 'You';
                                const creatorInitials = (user.displayName || user.email?.split('@')[0] || 'U')
                                  .split(/\s+/)
                                  .filter(Boolean)
                                  .slice(0, 2)
                                  .map((part) => part[0]?.toUpperCase() || '')
                                  .join('') || 'U';
                                const isRecommended = recommendedScenarioIds.has(scenario.id);
                                const fallbackDemoUrl = (scenario as { demoPublishedUrl?: string | null; demoProjectUrl?: string | null }).demoPublishedUrl
                                  || (scenario as { demoPublishedUrl?: string | null; demoProjectUrl?: string | null }).demoProjectUrl
                                  || null;
                                const latestDemoUrl = (scenario.process ? latestDemoUrlByProcess[scenario.process.trim()] : null) || fallbackDemoUrl;
                                return (
                                  <div
                                    key={scenario.id}
                                    onClick={() => navigate(`/scenario/${scenario.id}`)}
                                    role="button"
                                    aria-label={`Open use case ${scenario.title}`}
                                    tabIndex={0}
                                    onKeyDown={(event) => {
                                      if (event.key === 'Enter' || event.key === ' ') {
                                        event.preventDefault();
                                        navigate(`/scenario/${scenario.id}`);
                                      }
                                    }}
                                    className={`relative w-[320px] min-w-[320px] flex-shrink-0 rounded-lg border p-3 cursor-pointer transition-all duration-200 bg-white shadow-sm ${
                                      checked
                                        ? isJourneyCreated
                                          ? 'border-wm-pink ring-2 ring-wm-pink/20 bg-wm-pink/5'
                                          : 'border-wm-accent ring-2 ring-wm-accent/20'
                                        : isJourneyCreated
                                          ? 'border-wm-pink/50 bg-wm-pink/5 hover:border-wm-pink'
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
                                      {isJourneyCreated && (
                                        <span
                                          className="inline-flex items-center rounded-full border border-wm-pink/20 bg-wm-pink/10 p-0.5"
                                          title={`Created by ${creatorLabel}`}
                                        >
                                          {user.photoURL ? (
                                            <img
                                              src={user.photoURL}
                                              alt={`${creatorLabel} avatar`}
                                              className="h-5 w-5 rounded-full object-cover"
                                            />
                                          ) : (
                                            <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-wm-pink/20 text-[10px] font-semibold text-wm-pink">
                                              {creatorInitials}
                                            </span>
                                          )}
                                        </span>
                                      )}
                                    </div>

                                    <div className="pt-12">
                                      <p className="text-sm font-semibold text-wm-blue pr-6 leading-snug">{scenario.title}</p>
                                      {scenario.description && (
                                        <p className="text-sm text-wm-blue/60 mt-1 line-clamp-3">{scenario.description}</p>
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
                    <p className="text-sm text-wm-blue/70">{phase2TargetsStatus}</p>
                  )}
                  {isSavingPhase2Targets && <p className="text-sm text-wm-blue/70">Saving...</p>}
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
                  className="px-3 py-2 text-sm font-semibold rounded-md bg-wm-accent text-white hover:bg-wm-accent/90"
                >
                  Add meeting
                </button>
              </div>

              <div className="mt-4 grid grid-cols-1 lg:grid-cols-3 gap-4">
                <div className="rounded-lg border border-wm-neutral/20 p-3 lg:col-span-1">
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-wm-blue/60 mb-2">Meetings</h3>
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
                            <p className="text-sm text-wm-blue/60 mt-1">{meeting.domain} • {meeting.functionName}</p>
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
                          <label className="block text-sm font-semibold uppercase tracking-wide text-wm-blue/60 mb-1">Domain</label>
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
                          <label className="block text-sm font-semibold uppercase tracking-wide text-wm-blue/60 mb-1">Function</label>
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
                        <label className="block text-sm font-semibold uppercase tracking-wide text-wm-blue/60 mb-1">Meeting presentation URL</label>
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
                            className="px-3 py-2 text-sm font-semibold rounded-md border border-wm-pink/40 text-wm-pink hover:bg-wm-pink/5"
                          >
                            Remove meeting
                          </button>
                        </div>
                        {selectedFunctionalMeeting.presentationUrl?.trim() && (
                          <a
                            href={selectedFunctionalMeeting.presentationUrl.trim()}
                            target="_blank"
                            rel="noreferrer"
                            className="mt-2 inline-flex text-sm font-semibold text-wm-accent hover:underline"
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
                  <p className="text-sm text-wm-blue/70">Saving...</p>
                )}
                {functionalMeetingsStatus && (
                  <p className="text-sm text-wm-blue/70">{functionalMeetingsStatus}</p>
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
                  className="px-3 py-2 text-sm font-semibold rounded-md bg-wm-accent text-white hover:bg-wm-accent/90"
                >
                  Add meeting
                </button>
              </div>

              <div className="mt-4 grid grid-cols-1 lg:grid-cols-3 gap-4">
                <div className="rounded-lg border border-wm-neutral/20 p-3 lg:col-span-1">
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-wm-blue/60 mb-2">Meetings</h3>
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
                            <p className="text-sm text-wm-blue/60 mt-1">{meeting.domain} • {meeting.functionName}</p>
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
                          <label className="block text-sm font-semibold uppercase tracking-wide text-wm-blue/60 mb-1">Domain</label>
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
                          <label className="block text-sm font-semibold uppercase tracking-wide text-wm-blue/60 mb-1">Function</label>
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
                        <label className="block text-sm font-semibold uppercase tracking-wide text-wm-blue/60 mb-1">Meeting presentation URL</label>
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
                            className="px-3 py-2 text-sm font-semibold rounded-md border border-wm-pink/40 text-wm-pink hover:bg-wm-pink/5"
                          >
                            Remove meeting
                          </button>
                        </div>
                        {selectedDeepDiveMeeting.presentationUrl?.trim() && (
                          <a
                            href={selectedDeepDiveMeeting.presentationUrl.trim()}
                            target="_blank"
                            rel="noreferrer"
                            className="mt-2 inline-flex text-sm font-semibold text-wm-accent hover:underline"
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
                  <p className="text-sm text-wm-blue/70">Saving...</p>
                )}
                {deepDiveMeetingsStatus && (
                  <p className="text-sm text-wm-blue/70">{deepDiveMeetingsStatus}</p>
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
                <span className="text-sm font-semibold px-2 py-1 rounded-full bg-wm-accent/10 text-wm-accent">
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
                    <h3 className="text-sm font-semibold uppercase tracking-wide text-wm-blue/60 mb-2">Functional High-Level Notes Summary</h3>
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
                    <h4 className="text-sm font-semibold uppercase tracking-wide text-wm-blue/60 mb-2">Select one PowerPoint template from SharePoint (optional)</h4>
                    <p className="text-sm text-wm-blue/60 mb-3">
                      Load files from the configured SharePoint folder, then choose one PowerPoint deck as the style reference.
                    </p>
                    <button
                      type="button"
                      onClick={handleLoadDeepDiveSharePointPresentations}
                      disabled={isLoadingDeepDiveSharePointPresentations || isSavingDeepDiveTemplateReference}
                      className={`px-3 py-2 rounded-lg text-sm font-semibold ${
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
                              <p className="text-sm text-wm-blue/60">{doc.path || doc.url || 'SharePoint file'}</p>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleUseSharePointPresentationAsDeepDiveTemplate(doc)}
                              disabled={isSavingDeepDiveTemplateReference}
                              className="text-sm font-semibold text-wm-accent hover:underline"
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
                          <p className="text-sm text-wm-blue/60">Selected {new Date(deepDiveTemplateReference.uploadedAt).toLocaleString()}</p>
                        </div>
                        <button
                          type="button"
                          onClick={handleRemoveDeepDiveTemplateReference}
                          disabled={isSavingDeepDiveTemplateReference}
                          className="text-sm font-semibold text-wm-pink hover:underline"
                        >
                          Remove
                        </button>
                      </div>
                    )}
                    {deepDiveTemplateStatus && (
                      <p className="mt-2 text-sm text-wm-blue/70">{deepDiveTemplateStatus}</p>
                    )}
                  </div>

                  <div className="mt-6 border-t border-wm-neutral/20 pt-5">
                    <h3 className="text-sm font-semibold uppercase tracking-wide text-wm-blue/60 mb-3">
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
                    <h3 className="text-sm font-semibold uppercase tracking-wide text-wm-blue/60 mb-2">
                      Deep Dive Target Domains & Functions
                    </h3>
                    <p className="text-sm text-wm-blue/70">
                      Choose the domains/functions to pursue in deep-dive sessions based on Functional High-Level findings.
                    </p>
                  </div>
                  <span className="text-sm font-semibold px-2 py-1 rounded-full bg-wm-accent/10 text-wm-accent">
                    {deepDiveSelectedUseCases.length} function target{deepDiveSelectedUseCases.length === 1 ? '' : 's'} selected
                  </span>
                </div>

                <div className="mt-4">
                  <h4 className="text-sm font-semibold uppercase tracking-wide text-wm-blue/60 mb-2">1) Choose domains</h4>
                  <div className="flex flex-wrap gap-2">
                    {defaultDomainSelection.map((domain) => {
                      const selected = deepDiveSelectedDomains.includes(domain);
                      return (
                        <button
                          key={domain}
                          type="button"
                          onClick={() => handleToggleDeepDiveDomain(domain)}
                          className={`px-3 py-1.5 rounded-full text-sm font-semibold border transition-colors ${
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
                  <h4 className="text-sm font-semibold uppercase tracking-wide text-wm-blue/60 mb-2">2) Choose functions / use cases</h4>
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
                              <p className="text-sm text-wm-blue/50 mt-1">No process use cases found in the library for this domain.</p>
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
                                className="px-2.5 py-1 text-sm font-semibold rounded-md border border-wm-accent/40 text-wm-accent hover:bg-wm-accent/10"
                              >
                                + Create use case
                              </button>
                            </div>
                            <div className="flex gap-3 overflow-x-auto pb-1 pr-1 scrollbar-hide">
                              {[...domainUseCases]
                                .sort((a, b) => {
                                  const aJourneyCustom = a.userId === user.uid;
                                  const bJourneyCustom = b.userId === user.uid;
                                  if (aJourneyCustom !== bJourneyCustom) return aJourneyCustom ? -1 : 1;

                                  const aSelected = deepDiveSelectedUseCases.includes(a.id);
                                  const bSelected = deepDiveSelectedUseCases.includes(b.id);
                                  if (aSelected !== bSelected) return aSelected ? -1 : 1;

                                  return (a.title || '').localeCompare(b.title || '');
                                })
                                .map((scenario) => {
                                const checked = deepDiveSelectedUseCases.includes(scenario.id);
                                const isJourneyCreated = scenario.userId === user.uid;
                                const creatorLabel = user.displayName || user.email || 'You';
                                const creatorInitials = (user.displayName || user.email?.split('@')[0] || 'U')
                                  .split(/\s+/)
                                  .filter(Boolean)
                                  .slice(0, 2)
                                  .map((part) => part[0]?.toUpperCase() || '')
                                  .join('') || 'U';
                                const isRecommended = deepDiveRecommendedScenarioIds.has(scenario.id);
                                const fallbackDemoUrl = (scenario as { demoPublishedUrl?: string | null; demoProjectUrl?: string | null }).demoPublishedUrl
                                  || (scenario as { demoPublishedUrl?: string | null; demoProjectUrl?: string | null }).demoProjectUrl
                                  || null;
                                const latestDemoUrl = (scenario.process ? latestDemoUrlByProcess[scenario.process.trim()] : null) || fallbackDemoUrl;
                                return (
                                  <div
                                    key={scenario.id}
                                    onClick={() => navigate(`/scenario/${scenario.id}`)}
                                    role="button"
                                    aria-label={`Open use case ${scenario.title}`}
                                    tabIndex={0}
                                    onKeyDown={(event) => {
                                      if (event.key === 'Enter' || event.key === ' ') {
                                        event.preventDefault();
                                        navigate(`/scenario/${scenario.id}`);
                                      }
                                    }}
                                    className={`relative w-[320px] min-w-[320px] flex-shrink-0 rounded-lg border p-3 cursor-pointer transition-all duration-200 bg-white shadow-sm ${
                                      checked
                                        ? isJourneyCreated
                                          ? 'border-wm-pink ring-2 ring-wm-pink/20 bg-wm-pink/5'
                                          : 'border-wm-accent ring-2 ring-wm-accent/20'
                                        : isJourneyCreated
                                          ? 'border-wm-pink/50 bg-wm-pink/5 hover:border-wm-pink'
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
                                      {isJourneyCreated && (
                                        <span
                                          className="inline-flex items-center rounded-full border border-wm-pink/20 bg-wm-pink/10 p-0.5"
                                          title={`Created by ${creatorLabel}`}
                                        >
                                          {user.photoURL ? (
                                            <img
                                              src={user.photoURL}
                                              alt={`${creatorLabel} avatar`}
                                              className="h-5 w-5 rounded-full object-cover"
                                            />
                                          ) : (
                                            <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-wm-pink/20 text-[10px] font-semibold text-wm-pink">
                                              {creatorInitials}
                                            </span>
                                          )}
                                        </span>
                                      )}
                                    </div>

                                    <div className="pt-12">
                                      <p className="text-sm font-semibold text-wm-blue pr-6 leading-snug">{scenario.title}</p>
                                      {scenario.description && (
                                        <p className="text-sm text-wm-blue/60 mt-1 line-clamp-3">{scenario.description}</p>
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
                    <p className="text-sm text-wm-blue/70">{deepDiveTargetsStatus}</p>
                  )}
                  {isSavingDeepDiveTargets && <p className="text-sm text-wm-blue/70">Saving...</p>}
                </div>
              </div>
            </section>
          )}

          {hasResearch && selectedStep?.title === 'Company Research' && (
            <section className="mb-6 rounded-xl border border-wm-neutral/30 bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-wm-blue/60">Company research results</h2>
                <button
                  type="button"
                  onClick={handleRerunResearch}
                  disabled={isResearchRunning || !rerunnableCompanyName}
                  className={`px-3 py-1.5 text-sm font-semibold rounded-md border ${
                    isResearchRunning || !rerunnableCompanyName
                      ? 'border-wm-neutral/20 text-wm-blue/30 cursor-not-allowed'
                      : 'border-wm-accent/30 text-wm-accent hover:bg-wm-accent/10'
                  }`}
                >
                  {isResearchRunning ? 'Re-running...' : 'Re-run research'}
                </button>
              </div>
              <div className="mt-3 overflow-x-auto rounded-lg border border-wm-neutral/20">
                <table className="w-full text-sm">
                  <tbody className="divide-y divide-wm-neutral/10">
                    <tr className="align-top">
                      <th className="w-56 min-w-44 bg-wm-neutral/5 px-3 py-2 text-left font-semibold text-wm-blue/70">Summary</th>
                      <td className="px-3 py-2 text-wm-blue/70 leading-relaxed">{activeResearch?.description || 'No summary available.'}</td>
                    </tr>
                    <tr className="align-top">
                      <th className="w-56 min-w-44 bg-wm-neutral/5 px-3 py-2 text-left font-semibold text-wm-blue/70">Industry</th>
                      <td className="px-3 py-2 text-wm-blue/70">{activeResearch?.industry || 'Not specified'}</td>
                    </tr>
                    <tr className="align-top">
                      <th className="w-56 min-w-44 bg-wm-neutral/5 px-3 py-2 text-left font-semibold text-wm-blue/70">Market Position</th>
                      <td className="px-3 py-2 text-wm-blue/70">{activeResearch?.marketPosition || 'Not specified'}</td>
                    </tr>
                    <tr className="align-top">
                      <th className="w-56 min-w-44 bg-wm-neutral/5 px-3 py-2 text-left font-semibold text-wm-blue/70">Top Challenges</th>
                      <td className="px-3 py-2 text-wm-blue/70">
                        <ul className="list-disc list-outside pl-5 space-y-1.5 leading-relaxed">
                          {(activeResearch?.challenges || []).slice(0, 8).map((item, index) => (
                            <li key={`${item}-${index}`}>{item}</li>
                          ))}
                          {activeResearch?.challenges?.length === 0 && <li>No challenges listed.</li>}
                        </ul>
                      </td>
                    </tr>
                    <tr className="align-top">
                      <th className="w-56 min-w-44 bg-wm-neutral/5 px-3 py-2 text-left font-semibold text-wm-blue/70">AI Optimization Opportunities</th>
                      <td className="px-3 py-2 text-wm-blue/70">
                        <ul className="list-disc list-outside pl-5 space-y-1.5 leading-relaxed">
                          {(activeResearch?.opportunities || []).slice(0, 10).map((item, index) => (
                            <li key={`${item}-${index}`}>{item}</li>
                          ))}
                          {activeResearch?.opportunities?.length === 0 && <li>No opportunities listed yet.</li>}
                        </ul>
                      </td>
                    </tr>
                    <tr className="align-top">
                      <th className="w-56 min-w-44 bg-wm-neutral/5 px-3 py-2 text-left font-semibold text-wm-blue/70">Priority AI Use Cases</th>
                      <td className="px-3 py-2 text-wm-blue/70">
                        <ul className="list-disc list-outside pl-5 space-y-1.5 leading-relaxed">
                          {(activeResearch?.useCases || []).slice(0, 10).map((item, index) => (
                            <li key={`${item}-${index}`}>{item}</li>
                          ))}
                          {activeResearch?.useCases?.length === 0 && <li>No use cases listed yet.</li>}
                        </ul>
                      </td>
                    </tr>
                    <tr className="align-top">
                      <th className="w-56 min-w-44 bg-wm-neutral/5 px-3 py-2 text-left font-semibold text-wm-blue/70">AI Readiness & Potential</th>
                      <td className="px-3 py-2 text-wm-blue/70 leading-relaxed">
                        <p>
                          <span className="font-semibold text-wm-blue">Current:</span> {activeResearch?.aiRelevance?.current || 'Not specified'}
                        </p>
                        <p className="mt-1">
                          <span className="font-semibold text-wm-blue">Potential:</span> {activeResearch?.aiRelevance?.potential || 'Not specified'}
                        </p>
                      </td>
                    </tr>
                    <tr className="align-top">
                      <th className="w-56 min-w-44 bg-wm-neutral/5 px-3 py-2 text-left font-semibold text-wm-blue/70">Recommended Next Actions</th>
                      <td className="px-3 py-2 text-wm-blue/70">
                        <ul className="list-disc list-outside pl-5 space-y-1.5 leading-relaxed">
                          {(activeResearch?.aiRelevance?.recommendations || []).slice(0, 10).map((item, index) => (
                            <li key={`${item}-${index}`}>{item}</li>
                          ))}
                          {activeResearch?.aiRelevance?.recommendations?.length === 0 && <li>No recommendations listed yet.</li>}
                        </ul>
                      </td>
                    </tr>
                  </tbody>
                </table>
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
                <p className="mt-2 text-sm text-wm-blue/70">{collaborationConfigStatus}</p>
              )}
            </div>
          )}

          </>
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
