import React, { useState, useCallback, useRef, useEffect } from 'react';
import type { User } from 'firebase/auth';
import type { Scenario, EvaluationResult, StoredEvaluationResult, Platform } from '../types';
import type { AIActionsPlatform } from './AIActionsPanel';
import { generateText, generatePRD, prdToMarkdown, generateElevatorPitch, elevatorPitchToMarkdown } from '../services/geminiService';
import { getEvaluations, saveEvaluation, savePrd, savePitch, saveWorkflowVersion } from '../services/firebaseService';
import { evaluateOperatorPerformance } from '../services/geminiService';
import { generateGammaPresentation, getGammaApiKey, setGammaApiKey, clearGammaApiKey } from '../services/gammaService';
import { Icons } from '../constants';
import AIActionsPanel from './AIActionsPanel';
import { useTranslation } from '../i18n';
import { useDiagramAsImage } from './useDiagramAsImage';
import Breadcrumbs from './Breadcrumbs';

interface OperatorConsoleProps {
  scenario: Scenario;
  user: User;
  onEvaluationCompleted: (scenarioId: string, newScore: number) => void;
  onViewWorkflow?: (workflowId: string) => void;
  companyName?: string;
  companyId?: string;
  onNavigateToDashboard?: () => void;
  onNavigateToResearch?: () => void;
}

export const LoadingSpinner: React.FC = () => (
    <div className="flex items-center justify-center space-x-2">
        <div className="w-2 h-2 rounded-full bg-sky-400 animate-pulse [animation-delay:-0.3s]"></div>
        <div className="w-2 h-2 rounded-full bg-sky-400 animate-pulse [animation-delay:-0.15s]"></div>
        <div className="w-2 h-2 rounded-full bg-sky-400 animate-pulse"></div>
    </div>
);

const OperatorConsole: React.FC<OperatorConsoleProps> = ({ scenario, user, onEvaluationCompleted: _onEvaluationCompleted, onViewWorkflow, companyName, companyId, onNavigateToDashboard, onNavigateToResearch }) => {
  const [workflowExplanation, setWorkflowExplanation] = useState('');
  const [evaluation, setEvaluation] = useState<(EvaluationResult & { demoProjectUrl?: string; demoPublishedUrl?: string; demoPrompt?: string }) | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [currentImage, setCurrentImage] = useState<{ base64: string; mimeType: string; dataUrl: string } | null>(null);
  const [proposedImage, setProposedImage] = useState<{ base64: string; mimeType: string; dataUrl: string } | null>(null);
  const [pastEvaluations, setPastEvaluations] = useState<StoredEvaluationResult[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const currentImageInputRef = useRef<HTMLInputElement>(null);
  const proposedImageInputRef = useRef<HTMLInputElement>(null);
  // const [role, setRole] = useState<Role | null>(null);
  const [assistLoading, setAssistLoading] = useState(false);
  const [diagramAssistLoading, setDiagramAssistLoading] = useState(false);
  const [mermaidCode, setMermaidCode] = useState<string>('');
  const [mermaidSvg, setMermaidSvg] = useState<string>('');
  const [isMermaidOpen, setIsMermaidOpen] = useState(false);
  const [mermaidError, setMermaidError] = useState<string | null>(null);
  // Translation and scenario localization
  const { t } = useTranslation();
  // Language detection fallback
  const lang = (typeof navigator !== 'undefined' && (navigator.language || (navigator as any).userLanguage || 'en').split('-')[0]) || 'en';
  // Helper to get localized field
  function getLocalized(field: any): string {
    if (!field) return '';
    if (typeof field === 'string') return field;
    if (typeof field === 'object') {
      return field[lang] || field['en'] || Object.values(field)[0] || '';
    }
    return '';
  }
  const localizedTitle = getLocalized(scenario?.title);
  const localizedDescription = getLocalized(scenario?.description);
  const localizedGoal = getLocalized(scenario?.goal);
  
  // Editable versions of title, description, and goal
  const [editableTitle, setEditableTitle] = useState(localizedTitle);
  const [editableDescription, setEditableDescription] = useState(localizedDescription);
  const [editableGoal, setEditableGoal] = useState(localizedGoal);
  const [valueDrivers, setValueDrivers] = useState(scenario?.valueDrivers || '');
  const [painPoints, setPainPoints] = useState(scenario?.painPoints || '');
  
  // Update editable fields when scenario changes
  useEffect(() => {
    setEditableTitle(localizedTitle);
    setEditableDescription(localizedDescription);
    setEditableGoal(localizedGoal);
    setValueDrivers(scenario?.valueDrivers || '');
    setPainPoints(scenario?.painPoints || '');
  }, [localizedTitle, localizedDescription, localizedGoal, scenario?.valueDrivers, scenario?.painPoints]);
  
  // Feature flag for pro users (placeholder: always true)
  const isProOrAbove = true;

  // File/image handlers (placeholders)
  const handleCurrentImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    console.log('Current workflow image change triggered');
    const file = e.target.files?.[0];
    if (!file) {
      console.log('No file selected');
      return;
    }
    console.log('File selected:', file.name, file.type);
    const reader = new FileReader();
    reader.onload = () => {
      console.log('File read successfully');
      setCurrentImage({
        base64: (reader.result as string).split(',')[1],
        mimeType: file.type,
        dataUrl: reader.result as string,
      });
      setIsCurrentWorkflowModalOpen(false);
    };
    reader.onerror = (error) => {
      console.error('Error reading file:', error);
    };
    reader.readAsDataURL(file);
  };

  const handleProposedImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setProposedImage({
        base64: (reader.result as string).split(',')[1],
        mimeType: file.type,
        dataUrl: reader.result as string,
      });
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveCurrentImage = () => setCurrentImage(null);
  const handleRemoveProposedImage = () => setProposedImage(null);

  // PRD handlers (placeholders)
  const handleGeneratePrd = async () => {
    setPrdLoading(true);
    try {
      const prd = await generatePRD(localizedGoal, workflowExplanation, proposedImage ? proposedImage.base64 : null, prdPlatforms);
      const md = prdToMarkdown(prd);
      setPrdMarkdown(md);
      setIsPrdOpen(true);
    } catch (e) {
      alert('PRD generation failed. Try again.');
    } finally {
      setPrdLoading(false);
    }
  };
  const copyPrdToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(prdMarkdown);
    } catch (e) {
      alert('Could not copy PRD.');
    }
  };
  const downloadPrd = () => {
    const blob = new Blob([prdMarkdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
  const platformLabelShort = prdPlatforms.length === 1 
    ? (prdPlatforms[0] === 'MS365' ? 'MS365' : prdPlatforms[0] === 'GOOGLE' ? 'GOOGLE' : 'CUSTOM')
    : 'MULTI';
  const dateStr = new Date().toISOString().split('T')[0];
  a.download = `PRD_${platformLabelShort}_${dateStr}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Elevator Pitch handlers
  const handleGeneratePitch = async () => {
    if (pitchLoading) return;
    setPitchLoading(true);
    try {
      const ep = await generateElevatorPitch(localizedGoal, workflowExplanation, prdPlatforms);
      const md = elevatorPitchToMarkdown(ep);
      setPitchMarkdown(md);
      setIsPitchOpen(true);
    } catch (e) {
      console.error('Elevator pitch generation failed:', e);
      alert('Elevator pitch generation failed. Try again.');
    } finally {
      setPitchLoading(false);
    }
  };
  const copyPitchToClipboard = async () => {
    try { await navigator.clipboard.writeText(pitchMarkdown); } catch { alert('Could not copy pitch.'); }
  };
  const downloadPitch = () => {
    const blob = new Blob([pitchMarkdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
  const platformLabelShort = prdPlatforms.length === 1 
    ? (prdPlatforms[0] === 'MS365' ? 'MS365' : prdPlatforms[0] === 'GOOGLE' ? 'GOOGLE' : 'CUSTOM')
    : 'MULTI';
  const dateStr = new Date().toISOString().split('T')[0];
  a.download = `Pitch_${platformLabelShort}_${dateStr}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Generate Google AI Studio demo prompt
  const handleGenerateDemoPrompt = async () => {
    // Trigger evaluation in background if not already done and workflow explanation exists
    if (!evaluation && workflowExplanation.trim() && !isLoading) {
      // Start evaluation in background without waiting for it
      handleSubmitForEvaluation().catch(err => {
        console.error('Background evaluation failed:', err);
        // Don't block prompt generation if evaluation fails
      });
    }

    let prompt = `Create a working demo for the following AI-enhanced workflow:

## Use Case
**Title:** ${localizedTitle}
**Description:** ${localizedDescription}
**Goal:** ${localizedGoal}

`;

    // Include PRD if available
    if (prdMarkdown && prdMarkdown.trim()) {
      prompt += `## Product Requirements Document (PRD)

${prdMarkdown}

`;
    }

    // Include Pitch if available
    if (pitchMarkdown && pitchMarkdown.trim()) {
      prompt += `## Business Pitch

${pitchMarkdown}

`;
    }

    // Include workflow explanation if available
    if (workflowExplanation && workflowExplanation.trim()) {
      prompt += `## Proposed Workflow

${workflowExplanation}

`;
    }

    prompt += `## Requirements for the Demo
1. Create a functional prototype that demonstrates the key steps of this workflow
2. Show how AI is integrated at each stage where specified
3. Include realistic sample data and interactions
4. Demonstrate the before/after improvement clearly
5. Make it interactive where possible
6. Include brief annotations explaining what's happening at each step

## Technical Considerations
- Use appropriate APIs and integrations for the workflow described
- Implement AI features using appropriate models (e.g., Gemini, GPT, Claude)
- Focus on core functionality rather than production-ready code
- Include comments explaining the AI integration points
- Provide setup instructions and dependencies
- Choose the most suitable tech stack for demonstrating the workflow

## West Monroe Branding Requirements
This demo is for **West Monroe**, a consulting firm that helps organizations modernize their operations through AI and technology.

### Brand Identity
- **Philosophy**: Clear and Human - communicate complex ideas in a direct, accessible, and impactful way
- **Voice**: Professional yet approachable, confident, and helpful
- **Core Colors**: 
  - Primary: Grounded Blue (#000033) and White (#FFFFFF)
  - Accents: Accent Blue (#0045FF), Accent Pink (#F500A0)
  - Highlight: Yellow (#F2E800) - use sparingly for emphasis
- **Typography**: Arial (Bold for headers, Regular for body)

### Visual Design for Demo
- Use West Monroe colors in the UI (primary blue #000033 for headers/text, white backgrounds)
- Apply accent colors (#0045FF, #F500A0) for buttons, highlights, and key UI elements
- Keep layouts clean with generous white space
- Use Arial font family throughout
- Be visually professional yet approachable

### Messaging & Content
- Headers should be bold, clear, and direct
- Use simple, jargon-free language
- Emphasize the business value and ROI of the AI solution
- Show how West Monroe helps clients "do better work" through AI
- Include phrases like "AI-enhanced workflow", "operational efficiency", "intelligent automation"

## Deliverables
Please provide:
1. Working code for the demo with West Monroe branding applied
2. Setup/installation instructions
3. Sample data or test cases
4. Brief documentation of the AI components used
5. Screenshots showing the branded UI (optional but recommended)

Make this demo impressive, clearly branded for West Monroe, and demonstrate the value proposition of the AI-enhanced workflow in a clear and human way.`;
    
    setDemoPrompt(prompt);
    setIsDemoPromptOpen(true);
  };

  const copyDemoPromptToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(demoPrompt);
      alert('Demo prompt copied! Paste it into Google AI Studio.');
    } catch {
      alert('Could not copy prompt. Please select and copy manually.');
    }
  };

  const copyAndOpenGoogleAIStudio = async () => {
    try {
      // Copy to clipboard first
      await navigator.clipboard.writeText(demoPrompt);
      
      // Small delay to ensure clipboard is set before opening new window
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Confirm copy was successful
      const copiedText = await navigator.clipboard.readText();
      if (copiedText === demoPrompt) {
        alert('✓ Prompt copied to clipboard! Opening Google AI Studio...\n\nPress Ctrl+V (or Cmd+V on Mac) to paste.');
        // Open Google AI Studio in a new tab after user sees the alert
        setTimeout(() => {
          window.open('https://aistudio.google.com/app/prompts/new_chat', '_blank');
        }, 100);
      } else {
        throw new Error('Clipboard verification failed');
      }
    } catch (error) {
      console.error('Copy failed:', error);
      alert('Could not copy prompt. Please use the "Copy to Clipboard" button first, then manually open Google AI Studio.');
    }
  };

  const handleSaveDemoUrls = async () => {
    if (!evaluation) {
      alert('No evaluation found to save to. Generating evaluation in background...');
      // Trigger evaluation if not done yet
      if (workflowExplanation.trim() && !isLoading) {
        await handleSubmitForEvaluation();
      } else {
        alert('Please add a workflow explanation first.');
        return;
      }
    }
    
    setSavingDemoUrls(true);
    try {
      // Find the most recent evaluation for this scenario
      const evaluationsRef = await import('firebase/database').then(mod => mod.ref);
      const db = (await import('../services/firebaseInit')).db;
      const get = await import('firebase/database').then(mod => mod.get);
      const update = await import('firebase/database').then(mod => mod.update);
      
      const userEvaluationsRef = evaluationsRef(db, `evaluations/${user.uid}`);
      const snapshot = await get(userEvaluationsRef);
      
      if (snapshot.exists()) {
        const evaluations = snapshot.val();
        // Find the most recent evaluation for this scenario
        let latestEvalId = null;
        let latestTimestamp = 0;
        let latestWorkflowVersionId = null;
        
        Object.entries(evaluations).forEach(([id, evalData]: [string, any]) => {
          if (evalData.scenarioId === scenario.id && evalData.timestamp > latestTimestamp) {
            latestEvalId = id;
            latestTimestamp = evalData.timestamp;
            latestWorkflowVersionId = evalData.workflowVersionId;
          }
        });
        
        if (latestEvalId) {
          const updatedData = {
            demoProjectUrl: demoProjectUrl.trim() || null,
            demoPublishedUrl: demoPublishedUrl.trim() || null,
            demoPrompt: demoPrompt.trim() || null
          };
          
          // Update the evaluation with demo URLs
          await update(evaluationsRef(db, `evaluations/${user.uid}/${latestEvalId}`), updatedData);
          
          // Also update the corresponding workflow version with demo URLs
          if (latestWorkflowVersionId) {
            await update(
              evaluationsRef(db, `workflowVersions/${user.uid}/${scenario.id}/${latestWorkflowVersionId}`),
              updatedData
            );
          }
          
          // Update local evaluation state to show saved prompt immediately
          setEvaluation(prev => prev ? { ...prev, ...updatedData } as any : prev);
          
          // Close modal and show success
          setIsDemoPromptOpen(false);
          alert('Demo saved successfully!');
        }
      }
    } catch (error) {
      console.error('Failed to save demo:', error);
      alert('Failed to save demo. Please try again.');
    } finally {
      setSavingDemoUrls(false);
    }
  };

  // Evaluation submit handler
  const handleSubmitForEvaluation = useCallback(async () => {
    if (isLoading || !workflowExplanation.trim()) return;
    setIsLoading(true);
    setEvaluation(null);
    try {
      const imagePart = proposedImage ? { base64: proposedImage.base64, mimeType: proposedImage.mimeType } : null;
      const result = await evaluateOperatorPerformance(localizedGoal, workflowExplanation, imagePart);
      setEvaluation(result);

      // Save evaluation to Firebase
      const imageUrl = proposedImage?.dataUrl || null;
      await saveEvaluation(
        user.uid,
        scenario.id, 
        result,
        workflowExplanation,
        imageUrl,
        user.displayName,
        companyId
      );
      
      // Update local history state with new entry
      const newEntry: StoredEvaluationResult = {
        id: `new-${Date.now()}`,  // Temporary ID until refresh
        userId: user.uid,
        scenarioId: scenario.id,
        score: result.score,
        feedback: result.feedback,
        workflowExplanation,
        imageUrl,
        timestamp: Date.now()
      };

      // Update state and notify parent of completion
      setPastEvaluations(prev => [newEntry, ...prev]);
      _onEvaluationCompleted(scenario.id, result.score);
    } catch (e) {
      console.error('Evaluation failed', e);
      alert('Evaluation failed. Try again.');
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, workflowExplanation, proposedImage, localizedGoal]);
  // Historic evaluation selection (modal removed; direct load)
  const [highlightEditor, setHighlightEditor] = useState(false);
  const [prdPlatforms, setPrdPlatforms] = useState<Platform[]>(['AI_CHOICE']);
  const [prdLoading, setPrdLoading] = useState(false);
  const [prdMarkdown, setPrdMarkdown] = useState('');
  const [isPrdOpen, setIsPrdOpen] = useState(false);
  const [savingPrd, setSavingPrd] = useState(false);
  const [lastSavedPrdTs, setLastSavedPrdTs] = useState<number | null>(null);
  // Elevator pitch state
  const [isPitchOpen, setIsPitchOpen] = useState(false);
  const [pitchMarkdown, setPitchMarkdown] = useState('');
  const [pitchLoading, setPitchLoading] = useState(false);
  const [savingPitch, setSavingPitch] = useState(false);
  const [isCurrentWorkflowModalOpen, setIsCurrentWorkflowModalOpen] = useState(false);
  const [lastSavedPitchTs, setLastSavedPitchTs] = useState<number | null>(null);
  
  // Gamma AI presentation state
  const [generatingGamma, setGeneratingGamma] = useState(false);
  const [gammaDownloadUrl, setGammaDownloadUrl] = useState<string | null>(null);
  const [gammaError, setGammaError] = useState<string | null>(null);
  
  // Demo prompt state
  const [isDemoPromptOpen, setIsDemoPromptOpen] = useState(false);
  const [demoPrompt, setDemoPrompt] = useState('');
  const [demoProjectUrl, setDemoProjectUrl] = useState('');
  const [demoPublishedUrl, setDemoPublishedUrl] = useState('');
  const [savingDemoUrls, setSavingDemoUrls] = useState(false);
  const [showSavedPrompt, setShowSavedPrompt] = useState(false);
  
  const [savingVersion, setSavingVersion] = useState(false);
  const [isVersionNameOpen, setIsVersionNameOpen] = useState(false);
  const [versionTitleInput, setVersionTitleInput] = useState('');

  // ...existing code...

  const renderMermaid = useCallback(async (code: string) => {
    try {
    const mermaid = (await import('mermaid')).default;
    mermaid.initialize({ 
        startOnLoad: false,
        theme: 'base',
        flowchart: {
          htmlLabels: false,
          useMaxWidth: false,
      curve: 'basis',
          nodeSpacing: 50,
          rankSpacing: 50,
          padding: 20,
        },
        themeVariables: {
          'fontFamily': 'Arial, -apple-system, BlinkMacSystemFont, sans-serif',
          'fontSize': '16px',
          'primaryColor': '#bfdbfe',
          'primaryBorderColor': '#1d4ed8',
          'primaryTextColor': '#111827',
          'secondaryColor': '#fde68a',
          'secondaryBorderColor': '#b45309',
          'secondaryTextColor': '#111827',
          'tertiaryColor': '#0f172a',
          'tertiaryBorderColor': '#475569',
          'nodeBorder': '2px',
          'mainBkg': '#0f172a',
          'nodeBkg': '#bfdbfe',
          'clusterBkg': '#0f172a',
          'titleColor': '#ffffff',
          'edgeLabelBackground': '#0f172a',
          'nodeTextColor': '#111827',
          'lineColor': '#475569',
          'textColor': '#111827'
        },
        sequence: {
          useMaxWidth: false,
          boxMargin: 20,
          boxTextMargin: 10,
          noteMargin: 20,
          messageMargin: 40,
          mirrorActors: false
        },
        securityLevel: 'loose'
      });
      
      // Clean up and normalize the code to a single flowchart directive
      let diagramCode = code.trim();
      const dirMatch = diagramCode.match(/^(?:graph|flowchart)\s+(TD|TB|LR|RL|BT)/i);
      const direction = dirMatch ? dirMatch[1].toUpperCase() : 'TD';
      // Remove any existing directive lines
      diagramCode = diagramCode
        .split('\n')
        .filter(l => !/^\s*(graph|flowchart)\s+/i.test(l))
        .join('\n');
      // Prepend normalized directive
      diagramCode = `flowchart ${direction}\n${diagramCode}`;
      
      // Add class definitions if missing
      const classDefsNeeded = [
        'classDef human fill:#fde68a,stroke:#b45309,color:#111827,stroke-width:1px',
        'classDef ai fill:#bfdbfe,stroke:#1d4ed8,color:#111827,stroke-width:1px'
      ];
      
      classDefsNeeded.forEach(def => {
        if (!diagramCode.includes(def.split(' ')[0])) {
          diagramCode = diagramCode.replace(/graph TD\n/, `graph TD\n${def}\n`);
        }
      });
      
      // Ensure proper spacing and line breaks
      diagramCode = diagramCode
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0)
        .join('\n');
      
  console.log('Processed diagram code:', diagramCode);
      
      // Add necessary fonts to ensure text renders correctly
      const fontStyle = document.createElement('style');
      fontStyle.textContent = `
        @import url('https://fonts.googleapis.com/css2?family=Arial:wght@400;700&display=swap');
        .mermaid { 
          font-family: Arial, sans-serif !important;
          background: #0f172a; 
        }
        .mermaid .node rect { 
          fill: #bfdbfe !important;
          stroke: #1d4ed8 !important;
          stroke-width: 2px !important;
        }
        .mermaid .node.human rect { 
          fill: #fde68a !important;
          stroke: #b45309 !important;
        }
        .mermaid .node.ai rect { 
          fill: #bfdbfe !important;
          stroke: #1d4ed8 !important;
        }
        .mermaid text { 
          fill: #111827 !important;
          font-family: Arial, sans-serif !important;
        }
        .mermaid .edgePath .path {
          stroke: #475569 !important;
          stroke-width: 2px !important;
        }
      `;
      document.head.appendChild(fontStyle);
      
      const { svg } = await mermaid.render(`mmd-${Date.now()}`, diagramCode);
      
      // Clean up font style
      document.head.removeChild(fontStyle);
      
      setMermaidSvg(svg);
      setMermaidError(null);
    } catch (e: any) {
      console.error('Mermaid render failed:', e);
      setMermaidSvg('');
      setMermaidError(`Failed to render diagram. ${e?.message ? 'Error: ' + e.message : ''} You can still copy the Mermaid code.`);
      // Try to auto-fix using the LLM by asking it to correct syntax
      try {
        const fixPrompt = `Fix the following Mermaid flowchart so it parses correctly.\nRules:\n- Return Mermaid code only (no backticks).\n- Start with: flowchart TD\n- Define classes if missing:\n  classDef human fill:#fde68a,stroke:#b45309,color:#111827,stroke-width:1px;\n  classDef ai fill:#bfdbfe,stroke:#1d4ed8,color:#111827,stroke-width:1px;\n- Use simple node IDs like A1, B1, C1...\n- Put labels in square brackets, e.g., A1[My Step (AI)].\n- Keep edges like A1 --> B1.\n- Where a label contains (Human), add: class A1 human. Where (AI), add: class A1 ai.\n- Preserve the intent of the diagram.\n\nBroken code:\n${code}`;
        const fixedRaw = await generateText(fixPrompt, null, { temperature: 0.1 });
        const fixed = sanitizeMermaid(fixedRaw);
        setMermaidCode(fixed);
  const mermaid = (await import('mermaid')).default;
  mermaid.initialize({ startOnLoad: false, theme: 'dark', securityLevel: 'loose' });
  const normalized = normalizeMermaid(fixed);
  const { svg } = await mermaid.render(`mmd-${Date.now()}`, normalized);
        setMermaidSvg(svg);
        setMermaidError(null);
      } catch (fixErr) {
        console.error('Auto-fix of Mermaid failed:', fixErr);
        // Deterministic fallback from step text
        try {
          const fallback = buildBasicMermaidFromSteps(workflowExplanation);
          setMermaidCode(fallback);
          const mermaid = (await import('mermaid')).default;
          mermaid.initialize({ startOnLoad: false, theme: 'dark', securityLevel: 'loose' });
          const { svg } = await mermaid.render(`mmd-${Date.now()}`, fallback);
          setMermaidSvg(svg);
          setMermaidError(null);
        } catch (fallbackErr) {
          console.error('Fallback Mermaid generation failed:', fallbackErr);
        }
      }
    }
  }, [workflowExplanation]);

  const sanitizeMermaid = (raw: string) => {
    // First, ensure we have a string to work with
    if (!raw) return '';
    
    // Strip code fences and trim
    let s = raw.trim().replace(/^```[a-zA-Z]*\n?/, '').replace(/```\s*$/, '');
    
    // Split into lines, clean up, and remove empty ones
    let lines = s.split('\n')
      .map(l => l.trim())
      .filter(Boolean)
      .filter(l => !l.startsWith('graph') && !l.startsWith('flowchart')); // Remove any existing graph directives
    
    // Start with clean directive and class definitions
    const cleanedLines = [
      'flowchart TD',
      'classDef human fill:#fde68a,stroke:#b45309,color:#111827,stroke-width:1px',
      'classDef ai fill:#bfdbfe,stroke:#1d4ed8,color:#111827,stroke-width:1px'
    ];
    
    // Process each line
    lines.forEach(line => {
      if (line.includes('[')) {
        // Handle node definitions
        if (!line.includes('-->')) {
          // Match node ID and label, preserving the (AI) or (Human) suffix
          const match = line.match(/([A-Za-z0-9_]+)\s*\[(.*?)\]/);
          if (match) {
            const [, id, label] = match;
            const cleanLabel = label.replace(/^["']|["']$/g, '').replace(/\\"/g, '"');
            cleanedLines.push(`${id}["${cleanLabel}"]`);
            
            // Add class based on label content
            if (cleanLabel.toLowerCase().includes('(human)')) {
              cleanedLines.push(`class ${id} human`);
            } else if (cleanLabel.toLowerCase().includes('(ai)')) {
              cleanedLines.push(`class ${id} ai`);
            }
          }
        } else {
          // Handle connection lines that might contain node definitions
          const parts = line.split('-->').map(part => part.trim());
          parts.forEach(part => {
            if (part.includes('[')) {
              const match = part.match(/([A-Za-z0-9_]+)\s*\[(.*?)\]/);
              if (match) {
                const [, id, label] = match;
                const cleanLabel = label.replace(/^["']|["']$/g, '').replace(/\\"/g, '"');
                cleanedLines.push(`${id}["${cleanLabel}"]`);
                
                if (cleanLabel.toLowerCase().includes('(human)')) {
                  cleanedLines.push(`class ${id} human`);
                } else if (cleanLabel.toLowerCase().includes('(ai)')) {
                  cleanedLines.push(`class ${id} ai`);
                }
              }
            }
          });
          // Add the connection
          cleanedLines.push(parts.join(' --> '));
        }
      }
      // Pass through class assignments and connections without node definitions
      else if (line.startsWith('class ') || (line.includes('-->') && !line.includes('['))) {
        cleanedLines.push(line);
      }
    });
    
    return cleanedLines.join('\n');
  };

  const normalizeMermaid = (raw: string) => {
    let s = sanitizeMermaid(raw);
    
    // Ensure we start with flowchart directive
    if (!/^\s*flowchart\s+TD/i.test(s)) {
      s = `flowchart TD\n${s.replace(/^\s*flowchart\s+[^\n]+\n?/i, '')}`;
    }
    
    // Normalize line breaks
    s = s.replace(/[;\n]+/g, '\n').trim();
    
    // Split into lines for processing
    let lines = s.split('\n').map(l => l.trim()).filter(l => l);
    
    // Process each line
    lines = lines.flatMap(line => {
      // Split lines with multiple definitions
      if (line.includes('-->') && line.includes('[')) {
        return line.split(/\s*-->\s*/).map(part => {
          if (part.includes('[')) return part;
          return `${part} -->`;
        });
      }
      return [line];
    });
    
    // Ensure class definitions are at the top
    const classDefs = lines.filter(l => l.startsWith('classDef'));
    const otherLines = lines.filter(l => !l.startsWith('classDef'));
    
    // Rebuild the diagram
    s = [
      'flowchart TD',
      ...classDefs,
      ...otherLines
    ].join('\n');
    
    // Add mandatory class definitions if missing
    if (!s.includes('classDef human')) {
      s = s.replace(/flowchart TD\n/, 'flowchart TD\nclassDef human fill:#fde68a,stroke:#b45309,color:#111827,stroke-width:1px\n');
    }
    if (!s.includes('classDef ai')) {
      s = s.replace(/flowchart TD\n/, 'flowchart TD\nclassDef ai fill:#bfdbfe,stroke:#1d4ed8,color:#111827,stroke-width:1px\n');
    }
    
    // Final cleanup
    s = s.replace(/\[\s*"/g, '["')  // Fix spacing in node labels
         .replace(/"\s*\]/g, '"]')
         .replace(/\s+-->\s+/g, ' --> ')  // Normalize arrow spacing
         .replace(/\\"/g, '"')  // Unescape quotes in labels
         .replace(/([A-Za-z0-9_]+)\s*\[\s*([^\]]+?)\s*\]/g, '$1["$2"]');  // Ensure proper node label syntax
    
    return s;
  };

  const buildBasicMermaidFromSteps = (text: string) => {
    const lines = text
      .split(/\n+/)
      .map(l => l.trim())
      .filter(l => l.length > 0);
    const stepLines = lines.filter(l => /^(Step\s*\d+\s*:|\d+\.|\d+\))/i.test(l));
    const useLines = stepLines.length > 0 ? stepLines : lines;
    const nodes: string[] = [];
    const ids: string[] = [];
    const idFor = (i: number) => `S${i+1}`;
    const cleanLabel = (s: string) => s.replace(/^Step\s*\d+\s*:\s*/i,'').replace(/^\d+[\.)]\s*/,'').trim();
    const esc = (s: string) => s.replace(/"/g, '\\"');
    const classLines: string[] = [];
    useLines.forEach((l, i) => {
      const id = idFor(i);
      ids.push(id);
      const label = esc(cleanLabel(l)).slice(0, 160);
      nodes.push(`${id}["${label}"]`);
      const low = l.toLowerCase();
      if (low.includes('(ai)')) classLines.push(`class ${id} ai`);
      else if (low.includes('(human)')) classLines.push(`class ${id} human`);
    });
    const edges: string[] = [];
    for (let i = 0; i < ids.length - 1; i++) {
      edges.push(`${ids[i]} --> ${ids[i+1]}`);
    }
    const classDefs = [
      'classDef human fill:#fde68a,stroke:#b45309,color:#111827,stroke-width:1px;',
      'classDef ai fill:#bfdbfe,stroke:#1d4ed8,color:#111827,stroke-width:1px;',
    ];
    const mer = ['flowchart TD', ...classDefs, ...nodes, ...edges, ...classLines].join('\n');
    return mer;
  };

  const handleAiDiagramAssist = useCallback(async () => {
    if (diagramAssistLoading) return;
    if (!workflowExplanation.trim()) {
      alert('Please write your Step 1 explanation first.');
      return;
    }
    setDiagramAssistLoading(true);
    try {
  const prompt = `Create a Mermaid flowchart for this workflow.
Rules:
1. Start exactly with:
   graph TD
   classDef human fill:#fde68a,stroke:#b45309,color:#111827,stroke-width:2px
   classDef ai fill:#bfdbfe,stroke:#1d4ed8,color:#111827,stroke-width:2px

2. For each step:
   - Use simple IDs: A1, B1, C1...
   - Format nodes: A1["Step text (AI)"] or B1["Step text (Human)"]
   - Keep text under 120 chars
   - After each node with (Human): class A1 human
   - After each node with (AI): class A1 ai

3. Connect nodes: A1 --> B1

4. Each line should contain only ONE item:
   - One node definition
   - One class assignment
   - One connection

5. Example:
   flowchart TD
   classDef human fill:#fde68a,stroke:#b45309,color:#111827,stroke-width:2px
   classDef ai fill:#bfdbfe,stroke:#1d4ed8,color:#111827,stroke-width:2px
   A1["Process Data (AI)"]
   class A1 ai
   B1["Review Results (Human)"]
   class B1 human
   A1 --> B1

Steps to convert:
${workflowExplanation}`;
      const codeRaw = await generateText(prompt, null, { temperature: 0.3 });
      const code = sanitizeMermaid(codeRaw);
      setMermaidCode(code);
      await renderMermaid(code);
      setIsMermaidOpen(true);
    } catch (e) {
      console.error('AI Diagram Assist failed:', e);
      alert('AI Diagram Assist failed. Please try again.');
    } finally {
      setDiagramAssistLoading(false);
    }
  }, [diagramAssistLoading, workflowExplanation, renderMermaid]);

  const copyMermaidToClipboard = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(mermaidCode);
    } catch (e) {
      console.error('Copy failed:', e);
      alert('Could not copy to clipboard.');
    }
  }, [mermaidCode]);

  const copySvgToClipboard = useCallback(async () => {
    try {
      if (!mermaidSvg) return;
      await navigator.clipboard.writeText(mermaidSvg);
    } catch (e) {
      console.error('Copy SVG failed:', e);
      alert('Could not copy SVG to clipboard.');
    }
  }, [mermaidSvg]);

  const handleAiAssist = useCallback(async () => {
    if (assistLoading) return;
    setAssistLoading(true);
    try {
      const prompt = `You are an expert workflow designer. Draft a clear, concise workflow explanation for the following goal.

Goal: "${localizedGoal}"

Guidelines:
- Use numbered steps (Step 1:, Step 2:, ...).
- Mark each step as (AI) or (Human) explicitly.
- Keep it direct and practical (6-10 steps max).
- If helpful, include brief reasoning in parentheses.

Return only the steps.`;
      const imagePart = proposedImage ? { base64: proposedImage.base64, mimeType: proposedImage.mimeType } : null;
      const suggestion = await generateText(prompt, imagePart, { temperature: 0.5 });
      if (!suggestion) {
        alert('AI Assist could not generate a suggestion right now.');
      } else {
        if (workflowExplanation.trim()) {
          const useIt = window.confirm('Replace current text with AI draft?');
          if (useIt) {
            setWorkflowExplanation(suggestion.trim());
          }
        } else {
          setWorkflowExplanation(suggestion.trim());
        }
      }
    } catch (e) {
      console.error('AI Assist failed:', e);
      alert('AI Assist failed. Please try again.');
    } finally {
      setAssistLoading(false);
    }
  }, [assistLoading, proposedImage, localizedGoal, workflowExplanation]);


  const openHistoryModal = useCallback((item: StoredEvaluationResult) => {
    // If onViewWorkflow is provided and we have a workflow version ID, navigate to workflow details
    if (onViewWorkflow && item.workflowVersionId) {
      onViewWorkflow(item.workflowVersionId);
      return;
    }

    // Fallback to loading in editor if no navigation handler or no workflow version
    console.debug('[OperatorConsole] Loading historic evaluation into editor', item?.id);
    const text = item.workflowExplanation || '';
    setWorkflowExplanation(text);
    try { window.scrollTo({ top: 0, behavior: 'smooth' }); } catch {}
    setHighlightEditor(true);
    setTimeout(() => setHighlightEditor(false), 1200);
    // focus textarea
    setTimeout(() => {
      const ta = document.getElementById('workflow');
      if (ta) (ta as HTMLTextAreaElement).focus();
    }, 350);
  }, [onViewWorkflow]);

  // Removed modal-specific generation callbacks (historic selection now loads directly into editor)

  // Using the custom hook for diagram conversion
  const handleDiagramAsImage = useDiagramAsImage(mermaidSvg, setProposedImage, setIsMermaidOpen);

  // Monitor currentImage state changes
  React.useEffect(() => {
    console.log('Current image state changed:', currentImage ? 'Image set' : 'No image');
  }, [currentImage]);

  // Reset state when scenario changes and set initial image if it exists
  React.useEffect(() => {
    // Reset state
    setWorkflowExplanation('');
    setEvaluation(null);
    setMermaidCode('');
    setMermaidSvg('');
    setCurrentImage(null);
    setProposedImage(null);

    // Set initial image only if it's from the current scenario
    if (scenario?.currentWorkflowImage) {
      setCurrentImage({
        dataUrl: scenario.currentWorkflowImage,
        base64: scenario.currentWorkflowImage.split(',')[1],
        mimeType: scenario.currentWorkflowImage.split(',')[0].split(':')[1].split(';')[0]
      });
    }
  }, [scenario?.id]); // Only run when scenario ID changes

  const handleSavePrd = useCallback(async () => {
    if (savingPrd) return;
    try {
      setSavingPrd(true);
      console.log('handleSavePrd called with:', { user: user?.uid, scenario: scenario?.id, prdPlatforms });
      const getPlatformLabel = (platforms: Platform[]) => {
        if (platforms.length === 0) return 'Custom';
        if (platforms.length === 1) {
          const platform = platforms[0];
          return platform === 'MS365' ? t('platform.ms365')
            : platform === 'GOOGLE' ? t('platform.google')
            : platform === 'CUSTOM' ? t('platform.custom')
            : platform === 'CUSTOM_PROMPT' ? t('platform.customPrompt')
            : platform === 'ASSISTANT' ? t('platform.assistant')
            : platform === 'COMBINATION' ? t('platform.combination')
            : platform;
        }
        return `${platforms.length} Platforms`;
      };
      const platformLabel = getPlatformLabel(prdPlatforms);
      const datedTitle = `${localizedTitle || 'Workflow'} – ${platformLabel} – ${new Date().toLocaleDateString()}`;
      // For now, save with the first platform or 'MULTI' if multiple
      const saveWithPlatform = prdPlatforms.length > 0 ? prdPlatforms[0] : 'CUSTOM';
      await savePrd(user.uid, scenario.id, saveWithPlatform, prdMarkdown, datedTitle);
      setLastSavedPrdTs(Date.now());
      setIsPrdOpen(false);
    } catch (e) {
      console.error('Save PRD failed:', e);
      alert('Failed to save PRD.');
    } finally {
      setSavingPrd(false);
    }
  }, [savingPrd, user?.uid, scenario?.id, prdPlatforms, prdMarkdown, localizedTitle, t]);

  const handleSavePitch = useCallback(async () => {
    if (savingPitch) return;
    try {
      setSavingPitch(true);
      console.log('handleSavePitch called with:', { user: user?.uid, scenario: scenario?.id, prdPlatforms });
      const getPlatformLabel = (platforms: Platform[]) => {
        if (platforms.length === 0) return 'Custom';
        if (platforms.length === 1) {
          const platform = platforms[0];
          return platform === 'MS365' ? t('platform.ms365')
            : platform === 'GOOGLE' ? t('platform.google')
            : platform === 'CUSTOM' ? t('platform.custom')
            : platform === 'CUSTOM_PROMPT' ? t('platform.customPrompt')
            : platform === 'ASSISTANT' ? t('platform.assistant')
            : platform === 'COMBINATION' ? t('platform.combination')
            : platform;
        }
        return `${platforms.length} Platforms`;
      };
      const platformLabel = getPlatformLabel(prdPlatforms);
      const datedTitle = `${localizedTitle || 'Workflow'} – ${platformLabel} – ${new Date().toLocaleDateString()}`;
      await savePitch(user.uid, scenario.id, pitchMarkdown, datedTitle);
      setLastSavedPitchTs(Date.now());
      setIsPitchOpen(false);
    } catch (e) {
      console.error('Save Elevator Pitch failed:', e);
      alert('Failed to save Elevator Pitch.');
    } finally {
      setSavingPitch(false);
    }
  }, [savingPitch, user?.uid, scenario?.id, pitchMarkdown, localizedTitle, prdPlatforms, t]);

  const handleGenerateGammaPresentation = useCallback(async () => {
    if (generatingGamma) return;
    
    // Extract slide presentation section from pitch markdown
    const slideSection = pitchMarkdown.split('# Slide Presentation Outline')[1];
    if (!slideSection || !slideSection.trim()) {
      setGammaError('No slide presentation outline found. Generate a pitch first.');
      return;
    }
    
    // Check for API key
    let apiKey = getGammaApiKey();
    if (!apiKey) {
      const userKey = prompt('Please enter your Gamma AI API key:\n\nGet it from https://gamma.app/settings\n\n⚠️ Requires Pro/Ultra/Teams/Business plan');
      if (!userKey || !userKey.trim()) {
        setGammaError('Gamma AI API key is required');
        return;
      }
      setGammaApiKey(userKey.trim());
      apiKey = userKey.trim();
    }
    
    console.log('Gamma API Key check:', {
      hasKey: !!apiKey,
      keyLength: apiKey?.length,
      keyPrefix: apiKey?.substring(0, 10),
    });
    
    try {
      setGeneratingGamma(true);
      setGammaError(null);
      setGammaDownloadUrl(null);
      
      // Call Firebase Cloud Function to generate presentation
      const result = await generateGammaPresentation(
        slideSection.trim(),
        apiKey,
        'pptx'
      );
      
      if (result.status === 'completed' && result.downloadUrl) {
        setGammaDownloadUrl(result.downloadUrl);
      } else if (result.status === 'failed') {
        setGammaError(result.error || 'Presentation generation failed');
      } else {
        setGammaError('Unexpected response from Gamma AI');
      }
    } catch (error: any) {
      console.error('Gamma presentation generation failed:', error);
      
      let errorMessage = error.message || 'Failed to generate presentation';
      
      // Provide more helpful error messages
      if (error.message?.includes('Invalid API key')) {
        errorMessage = 'Invalid Gamma API key. Please verify:\n' +
          '1. You have a valid Gamma account at gamma.app\n' +
          '2. API access is enabled (may require paid plan)\n' +
          '3. API key is correctly copied from your Gamma dashboard\n\n' +
          'Visit https://gamma.app/ to check your account status.';
      }
      
      setGammaError(errorMessage);
    } finally {
      setGeneratingGamma(false);
    }
  }, [generatingGamma, pitchMarkdown]);

  const handleSaveWorkflowVersion = useCallback(async () => {
    if (savingVersion) return;
    if (!workflowExplanation.trim()) {
      alert('Nothing to save. Add a workflow explanation first.');
      return;
    }
    const defaultName = `${localizedTitle || 'Workflow'} – ${new Date().toLocaleString()}`;
    setVersionTitleInput(defaultName);
    setIsVersionNameOpen(true);
  }, [savingVersion, workflowExplanation, localizedTitle]);

  const confirmSaveVersion = useCallback(async () => {
    if (savingVersion) return;
    try {
      setSavingVersion(true);
      await saveWorkflowVersion(
        user.uid,
        scenario.id,
        workflowExplanation,
        null,
        {
          prdMarkdown: prdMarkdown || null,
          pitchMarkdown: pitchMarkdown || null,
          evaluationScore: evaluation ? evaluation.score : null,
          evaluationFeedback: evaluation ? evaluation.feedback : null,
          versionTitle: versionTitleInput.trim() || null,
    mermaidCode: mermaidCode || null,
    mermaidSvg: mermaidSvg || null,
    imageBase64: proposedImage?.base64 || null,
    imageMimeType: proposedImage?.mimeType || null,
          demoProjectUrl: demoProjectUrl || null,
          demoPublishedUrl: demoPublishedUrl || null,
          demoPrompt: demoPrompt || null,
        }
      );
      setIsVersionNameOpen(false);
      alert('Workflow version snapshot saved.');
    } catch (e) {
      console.error('Save workflow version failed:', e);
      alert('Failed to save workflow version.');
    } finally {
      setSavingVersion(false);
    }
  }, [savingVersion, user?.uid, scenario?.id, workflowExplanation, prdMarkdown, pitchMarkdown, evaluation, versionTitleInput, mermaidCode, mermaidSvg, proposedImage, demoProjectUrl, demoPublishedUrl, demoPrompt]);

  // Load scenario history (evaluations) and latest workflow/doc artifacts for this scenario
  React.useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        setIsLoadingHistory(true);
        if (!user?.uid || !scenario?.id) {
          setPastEvaluations([]);
          return;
        }
        const evals = await getEvaluations(user.uid, scenario.id);
        if (!cancelled) {
          setPastEvaluations(evals);
        }
      } catch (e) {
        console.error('Failed to load history:', e);
        if (!cancelled) setPastEvaluations([]);
      } finally {
        if (!cancelled) setIsLoadingHistory(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [user?.uid, scenario?.id]);

  return (
    <>
      <div className="flex flex-col lg:flex-row gap-8 max-w-7xl mx-auto animate-fade-in">
        {/* Main Console */}
        <div className="w-full lg:flex-1 min-w-0">
          {/* Breadcrumbs */}
          <Breadcrumbs
            items={[
              { label: t('nav.dashboard'), onClick: onNavigateToDashboard },
              ...(companyName ? [{ label: companyName, onClick: onNavigateToResearch }] : []),
              { label: localizedTitle, isCurrent: true }
            ]}
          />

          {/* Company Context Banner */}
          {companyName && (
            <div className="mb-4 px-4 py-3 bg-wm-accent/10 border border-wm-accent/30 rounded-lg flex items-center gap-3">
              <div className="w-8 h-8 bg-wm-accent/20 rounded-full flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-wm-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <div>
                <p className="text-xs font-bold text-wm-accent/70 uppercase tracking-wide">Running scenario for</p>
                <p className="text-lg font-bold text-wm-accent">{companyName}</p>
              </div>
            </div>
          )}

          <div className="bg-white border border-wm-neutral/30 rounded-xl p-6 mb-6 shadow-sm">
            <div className="mb-4">
              <label className="block text-xs font-bold text-wm-blue/70 mb-1">Title</label>
              <input
                type="text"
                value={editableTitle}
                onChange={(e) => setEditableTitle(e.target.value)}
                className="w-full text-2xl font-bold text-wm-blue bg-transparent border-b-2 border-transparent hover:border-wm-neutral/30 focus:border-wm-accent focus:outline-none transition-colors"
                placeholder="Enter use case title"
              />
            </div>
            <div className="bg-wm-neutral/10 border border-wm-neutral/30 rounded-lg p-4 mb-4">
              <div className="flex items-center justify-between mb-2">
                <h2 className="font-bold text-wm-accent">{lang === 'es' ? 'Proceso Actual:' : 'Current Process:'}</h2>
                <button
                  onClick={() => setIsCurrentWorkflowModalOpen(true)}
                  className="px-3 py-1 text-xs font-bold rounded-md bg-wm-accent text-white hover:bg-wm-accent/90 transition-colors flex items-center gap-1"
                >
                  <Icons.Upload />
                  Current Workflow
                </button>
              </div>
              <textarea
                value={editableDescription}
                onChange={(e) => setEditableDescription(e.target.value)}
                rows={5}
                className="w-full text-wm-blue/70 bg-white border border-wm-neutral/30 rounded-lg p-3 hover:border-wm-neutral/50 focus:border-wm-accent focus:outline-none transition-colors resize-y"
                placeholder="Describe the current process"
              />
              {currentImage && (
                <div className="mt-3 relative">
                  <img src={currentImage.dataUrl} alt="Current workflow" className="max-h-48 rounded-lg shadow-lg" />
                  <button
                    onClick={handleRemoveCurrentImage}
                    className="absolute -top-2 -right-2 bg-wm-pink text-white rounded-full p-1 leading-none hover:bg-wm-pink/80 transition-colors"
                    aria-label="Remove image"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              )}
            </div>
            <div className="bg-wm-neutral/10 border border-wm-neutral/30 rounded-lg p-4 mb-4">
              <h2 className="font-bold text-wm-accent mb-2">{lang === 'es' ? 'Resultado Deseado:' : 'Desired Outcome:'}</h2>
              <textarea
                value={editableGoal}
                onChange={(e) => setEditableGoal(e.target.value)}
                rows={5}
                className="w-full text-wm-blue/70 bg-white border border-wm-neutral/30 rounded-lg p-3 hover:border-wm-neutral/50 focus:border-wm-accent focus:outline-none transition-colors resize-y"
                placeholder="Enter desired outcome"
              />
            </div>
            
            {/* Value Drivers */}
            <div className="bg-wm-neutral/10 border border-wm-neutral/30 rounded-lg p-4 mb-4">
              <h2 className="font-bold text-wm-accent mb-2">{lang === 'es' ? 'Generadores de Valor:' : 'Value Drivers:'}</h2>
              <textarea
                value={valueDrivers}
                onChange={(e) => setValueDrivers(e.target.value)}
                rows={5}
                className="w-full text-wm-blue/70 bg-white border border-wm-neutral/30 rounded-lg p-3 hover:border-wm-neutral/50 focus:border-wm-accent focus:outline-none transition-colors resize-y"
                placeholder="What business value will this deliver?"
              />
            </div>
            
            {/* Pain Points */}
            <div className="bg-wm-neutral/10 border border-wm-neutral/30 rounded-lg p-4">
              <h2 className="font-bold text-wm-accent mb-2">{lang === 'es' ? 'Puntos de Dolor:' : 'Pain Points:'}</h2>
              <textarea
                value={painPoints}
                onChange={(e) => setPainPoints(e.target.value)}
                rows={5}
                className="w-full text-wm-blue/70 bg-white border border-wm-neutral/30 rounded-lg p-3 hover:border-wm-neutral/50 focus:border-wm-accent focus:outline-none transition-colors resize-y"
                placeholder="What problems does this solve?"
              />
            </div>


            {/* Platform Selector */}
            <div className="mt-6">
              <label className="text-sm font-bold text-wm-blue mb-2 block">Platform</label>
              <div className="grid grid-cols-4 gap-2">
                {(['AI_CHOICE', 'MS365', 'GOOGLE', 'CUSTOM'] as const).map((platform) => {
                  const getPlatformLabel = (p: string) => {
                    switch (p) {
                      case 'AI_CHOICE': return 'AI Choice';
                      case 'MS365': return 'Microsoft 365';
                      case 'GOOGLE': return 'Google Workspace';
                      case 'CUSTOM': return 'Custom Integration';
                      default: return p;
                    }
                  };
                  return (
                    <label key={platform} className="flex items-center space-x-2 text-sm text-wm-blue cursor-pointer bg-wm-neutral/10 p-3 rounded-lg hover:bg-wm-neutral/20 transition-colors">
                      <input
                        type="radio"
                        name="platform"
                        checked={prdPlatforms[0] === platform}
                        onChange={() => setPrdPlatforms([platform])}
                        className="border-wm-neutral/50 bg-white text-wm-accent focus:ring-wm-accent focus:ring-offset-white"
                      />
                      <span>{getPlatformLabel(platform)}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="bg-white border border-wm-neutral/30 rounded-xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-wm-blue">Proposed Workflow</h2>
              {isProOrAbove && (
                <button
                  type="button"
                  onClick={handleAiAssist}
                  disabled={assistLoading}
                  title={t('operator.aiAssist')}
                  aria-label={t('operator.aiAssist')}
                  className="p-2 rounded-md text-wm-accent hover:text-wm-accent/80 hover:bg-wm-accent/10 transition-colors disabled:opacity-60"
                >
                  {assistLoading ? (
                    <div className="w-4 h-4 border-2 border-wm-accent border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Icons.Sparkles />
                  )}
                </button>
              )}
            </div>

            <div className="flex flex-col mb-6">
              <label htmlFor="workflow" className="text-lg font-bold text-wm-blue mb-2">1. {t('operator.explain')}</label>
              <p className="text-sm text-wm-blue/50 mb-3">{t('operator.explainHelper')}</p>
              <textarea
                id="workflow"
                value={workflowExplanation}
                onChange={(e) => setWorkflowExplanation(e.target.value)}
                placeholder={"e.g., Step 1 (AI): Ingest customer email and categorize intent. Step 2 (Human): Review high-priority tickets..."}
                className={`flex-grow bg-wm-neutral/10 text-wm-blue placeholder:text-wm-blue/40 border ${highlightEditor ? 'border-wm-yellow ring-2 ring-wm-yellow/60' : 'border-wm-neutral/30'} rounded-lg p-4 focus:ring-2 focus:ring-wm-accent focus:outline-none transition-shadow w-full`}
                rows={10}
                aria-live="polite"
              />
            </div>

            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <label className="text-lg font-bold text-wm-blue">2. {t('operator.visual')}</label>
                {isProOrAbove && (
                  <button
                    type="button"
                    onClick={handleAiDiagramAssist}
                    disabled={diagramAssistLoading}
                    title={t('operator.aiDiagramAssist')}
                    aria-label={t('operator.aiDiagramAssist')}
                    className="p-2 rounded-md text-wm-accent hover:text-wm-accent/80 hover:bg-wm-accent/10 transition-colors disabled:opacity-60"
                  >
                    {diagramAssistLoading ? (
                      <div className="w-4 h-4 border-2 border-wm-accent border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Icons.Sparkles />
                    )}
                  </button>
                )}
              </div>
              <div className="bg-wm-neutral/10 border-2 border-dashed border-wm-neutral/50 rounded-xl p-6 text-center transition-colors hover:border-wm-accent">
                <input
                  type="file"
                  ref={proposedImageInputRef}
                  onChange={handleProposedImageChange}
                  accept="image/*"
                  className="hidden"
                  aria-hidden="true"
                />
                {!proposedImage ? (
                  <div className="cursor-pointer" onClick={() => proposedImageInputRef.current?.click()}>
                    <Icons.Upload />
                    <p className="mt-2 text-sm text-wm-blue/50">{t('operator.uploadHint')}</p>
                    <span className="mt-4 inline-block bg-wm-accent text-white font-bold py-2 px-4 rounded-lg hover:bg-wm-accent/90 transition-colors">
                      {t('operator.selectImage')}
                    </span>
                  </div>
                ) : (
                  <div>
                    <div className="relative inline-block">
                      <img src={proposedImage.dataUrl} alt="Workflow preview" className="max-h-60 rounded-lg mx-auto shadow-lg" />
                      <button
                        onClick={handleRemoveProposedImage}
                        className="absolute -top-2 -right-2 bg-wm-pink text-white rounded-full p-1 leading-none hover:bg-wm-pink/80 transition-colors"
                        aria-label="Remove image"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Demo Prompt Button - Available anytime */}
            <div className="mb-6 p-4 bg-gradient-to-r from-wm-accent/10 to-wm-pink/10 border border-wm-accent/30 rounded-lg">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 mt-1">
                  <svg className="w-5 h-5 text-wm-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-wm-blue mb-1">Create a Working Demo</h3>
                  <p className="text-sm text-wm-blue/70 mb-3">
                    Generate a comprehensive prompt for Google AI Studio to build a prototype with West Monroe branding.
                    {(prdMarkdown?.trim() || pitchMarkdown?.trim()) && ' (Includes your PRD and pitch content)'}
                  </p>
                  
                  {/* Show saved URLs if they exist - always visible */}
                  {(evaluation?.demoProjectUrl || evaluation?.demoPublishedUrl) && (
                    <div className="mb-3">
                      <span className="text-xs font-bold text-wm-blue/70 block mb-2">Demo Links</span>
                      <div className="space-y-2">
                        {evaluation.demoProjectUrl && (
                          <div className="bg-gradient-to-r from-wm-accent/10 to-wm-pink/10 border-l-4 border-wm-accent rounded-lg p-3">
                            <label className="text-xs font-bold text-wm-accent block mb-1 flex items-center gap-1">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                              </svg>
                              Google AI Studio Project
                            </label>
                            <a
                              href={evaluation.demoProjectUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-wm-blue hover:text-wm-accent underline break-all flex items-center gap-1 font-medium"
                            >
                              {evaluation.demoProjectUrl}
                              <svg className="w-3 h-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                              </svg>
                            </a>
                          </div>
                        )}
                        {evaluation.demoPublishedUrl && (
                          <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-l-4 border-green-500 rounded-lg p-3">
                            <label className="text-xs font-bold text-green-700 block mb-1 flex items-center gap-1">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                              Published Demo
                            </label>
                            <a
                              href={evaluation.demoPublishedUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-wm-blue hover:text-green-700 underline break-all flex items-center gap-1 font-medium"
                            >
                              {evaluation.demoPublishedUrl}
                              <svg className="w-3 h-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                              </svg>
                            </a>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                  
                  {/* Show saved prompt if it exists */}
                  {evaluation?.demoPrompt && (
                    <div className="mb-3">
                      <button
                        onClick={() => setShowSavedPrompt(!showSavedPrompt)}
                        className="flex items-center gap-2 text-sm text-wm-blue/70 hover:text-wm-blue transition-colors"
                      >
                        <svg className={`w-4 h-4 transition-transform ${showSavedPrompt ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                        {showSavedPrompt ? 'Hide' : 'View'} saved prompt
                      </button>
                      {showSavedPrompt && (
                        <div className="mt-2 bg-white border border-wm-neutral/30 rounded-lg p-3">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-bold text-wm-blue/70">Your Saved Prompt</span>
                            <span className="text-xs text-wm-blue/50">{evaluation.demoPrompt.length} characters</span>
                          </div>
                          <div className="max-h-60 overflow-y-auto bg-wm-neutral/5 rounded p-2">
                            <pre className="text-xs text-wm-blue/80 whitespace-pre-wrap font-mono">{evaluation.demoPrompt}</pre>
                          </div>
                          
                          <button
                            onClick={() => {
                              setDemoPrompt(evaluation.demoPrompt || '');
                              setIsDemoPromptOpen(true);
                            }}
                            className="mt-2 text-xs text-wm-accent hover:text-wm-accent/80 font-bold"
                          >
                            Edit this prompt →
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                  
                  <button
                    onClick={handleGenerateDemoPrompt}
                    className="px-4 py-2 rounded-lg bg-gradient-to-r from-wm-accent to-wm-pink text-white hover:from-wm-accent/90 hover:to-wm-pink/90 font-bold transition-all shadow-sm hover:shadow-md"
                  >
                    <span className="flex items-center gap-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                      </svg>
                      {evaluation?.demoPrompt ? 'Generate New Prompt' : 'Generate Demo Prompt'}
                    </span>
                  </button>
                </div>
              </div>
            </div>

            {/* Consolidated AI Actions Panel */}
            <div className="mt-10">
              <AIActionsPanel
                platforms={[prdPlatforms[0] as AIActionsPlatform || 'MS365']}
                approaches={[]}
                onPlatformChange={(platform) => setPrdPlatforms([platform])}
                onApproachesChange={() => {}}
                workflowExplanation={workflowExplanation}
                onGeneratePrd={handleGeneratePrd}
                onGeneratePitch={handleGeneratePitch}
                onEvaluate={handleSubmitForEvaluation}
                prdLoading={prdLoading}
                pitchLoading={pitchLoading}
                evalLoading={isLoading}
                onSaveVersion={handleSaveWorkflowVersion}
                savingVersion={savingVersion}
                canSaveVersion={!!workflowExplanation.trim()}
                hasEvaluationSaved={!!evaluation}
                t={t}
                lastSavedPrdTs={lastSavedPrdTs}
                lastSavedPitchTs={lastSavedPitchTs}
                onOpenLastPrd={() => setIsPrdOpen(true)}
                onOpenLastPitch={() => setIsPitchOpen(true)}
              />
            </div>
          </div>

          {evaluation && (
            <div className="mt-8 bg-white border border-wm-neutral/30 rounded-xl p-6 animate-fade-in-up shadow-sm">
              <h2 className="text-xl font-bold mb-4 text-center text-wm-blue">{t('operator.feedback')}</h2>
              <div className="text-center mb-4">
                <p className="text-wm-blue/60">Your Score</p>
                <p className="text-6xl font-extrabold text-wm-accent">{evaluation.score}<span className="text-3xl font-medium text-wm-blue/40">/10</span></p>
              </div>
              <div>
                <h3 className="font-bold text-wm-accent mb-1">{t('operator.aiFeedback')}</h3>
                <p className="text-wm-blue/70 whitespace-pre-wrap">{evaluation.feedback}</p>
              </div>
            </div>
          )}

          <div className="mt-8">
            <h2 className="text-xl font-bold mb-4 text-center text-wm-blue">{t('operator.historyTitle')}</h2>
            {isLoadingHistory ? (
              <div className="text-center p-4"><LoadingSpinner /></div>
            ) : pastEvaluations.length > 0 ? (
              <div className="space-y-4">
                {pastEvaluations.map(item => (
                  <div
                    key={item.id}
                    className="bg-white border border-wm-neutral/30 rounded-xl p-4 animate-fade-in-up cursor-pointer hover:border-wm-accent transition-colors shadow-sm"
                    tabIndex={0}
                    role="button"
                    aria-label="Open historic evaluation"
                    onClick={() => openHistoryModal(item)}
                    onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') openHistoryModal(item); }}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-sm text-wm-blue/50">{new Date(item.timestamp).toLocaleString()}</p>
                        <p className="text-wm-blue/70 mt-2 whitespace-pre-wrap text-sm">{item.feedback.substring(0, 150)}...</p>
                      </div>
                      <div className="text-right ml-4 flex-shrink-0">
                        <p className="text-wm-blue/50 text-sm">{t('history.score')}</p>
                        <p className="text-3xl font-bold text-wm-accent">{item.score}<span className="text-lg text-wm-blue/40">/10</span></p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-wm-blue/50 p-4">{t('operator.noHistoryScenario')}</p>
            )}
          </div>
        </div>

  {/* (Removed unused empty aside that previously held a sidebar) */}
      </div>

      {/* Modals rendered as siblings after main content for valid JSX structure */}
  {/* Historic modal removed: historic selection now loads directly into editor */}

      {isMermaidOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" onClick={() => setIsMermaidOpen(false)}>
          <div className="bg-white border border-wm-neutral/30 rounded-xl max-w-3xl w-full p-4 md:p-6 max-h-[90vh] overflow-y-auto shadow-xl" onClick={(e)=>e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-wm-blue font-bold">{t('operator.previewTitle')}</h3>
              <button onClick={() => setIsMermaidOpen(false)} className="p-2 rounded-md text-wm-blue/50 hover:text-wm-blue hover:bg-wm-neutral/20" aria-label="Close">
                <Icons.X />
              </button>
            </div>
            <div className="bg-wm-neutral/10 border border-wm-neutral/30 rounded-lg p-3 max-h-[60vh] overflow-auto">
              {mermaidError ? (
                <p className="text-wm-pink text-sm">{mermaidError}</p>
              ) : mermaidSvg ? (
                <div dangerouslySetInnerHTML={{ __html: mermaidSvg }} />
              ) : (
                <div className="text-wm-blue/50 text-sm">No preview available.</div>
              )}
            </div>
            <div className="mt-4 flex flex-col sm:flex-row gap-2 sm:gap-3 sm:items-center sm:justify-end">
              <button onClick={copyMermaidToClipboard} className="px-3 py-2 rounded-md bg-wm-neutral/20 border border-wm-neutral/30 text-wm-blue hover:bg-wm-neutral/30 font-bold">
                {t('operator.copyMermaid')}
              </button>
              <button onClick={copySvgToClipboard} disabled={!mermaidSvg} className="px-3 py-2 rounded-md bg-wm-neutral/20 border border-wm-neutral/30 text-wm-blue disabled:opacity-60 hover:bg-wm-neutral/30 font-bold">
                Copy SVG
              </button>
              <button onClick={handleDiagramAsImage} className="px-3 py-2 rounded-md bg-wm-accent text-white hover:bg-wm-accent/90 font-bold">
                {t('operator.useAsImage')}
              </button>
            </div>
            <div className="mt-3">
              <label className="block text-wm-blue/70 text-sm mb-1">Mermaid</label>
              <textarea className="w-full bg-wm-neutral/10 border border-wm-neutral/30 rounded p-2 text-wm-blue text-sm" rows={6} value={mermaidCode} onChange={(e)=>setMermaidCode(e.target.value)} />
              <div className="mt-2 flex justify-end">
                <button onClick={async ()=>{ await renderMermaid(mermaidCode); }} className="text-sm px-3 py-1.5 rounded-md bg-wm-neutral/20 border border-wm-neutral/30 text-wm-blue hover:bg-wm-neutral/30 font-bold">{t('operator.refreshPreview')}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {isPrdOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" onClick={() => setIsPrdOpen(false)}>
          <div className="bg-white border border-wm-neutral/30 rounded-xl max-w-3xl w-full p-4 md:p-6 max-h-[85vh] overflow-y-auto shadow-xl" onClick={(e)=>e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-wm-blue font-bold">PRD Preview</h3>
              <button onClick={() => setIsPrdOpen(false)} className="p-2 rounded-md text-wm-blue/50 hover:text-wm-blue hover:bg-wm-neutral/20" aria-label={t('modalActions.close')}>
                <Icons.X />
              </button>
            </div>
            <div className="bg-wm-neutral/10 border border-wm-neutral/30 rounded-lg p-3 max-h-[60vh] overflow-auto">
              <pre className="whitespace-pre-wrap text-wm-blue/80 text-sm">{prdMarkdown}</pre>
            </div>
            <div className="mt-4 flex flex-col sm:flex-row gap-2 sm:gap-3 sm:items-center sm:justify-end">
              <button onClick={copyPrdToClipboard} className="px-3 py-2 rounded-md bg-wm-neutral/20 border border-wm-neutral/30 text-wm-blue hover:bg-wm-neutral/30 font-bold">
                <span className="flex items-center gap-2">
                  <Icons.Copy />
                  {t('modalActions.copy')}
                </span>
              </button>
              <button onClick={downloadPrd} className="px-3 py-2 rounded-md bg-wm-pink text-white hover:bg-wm-pink/90 font-bold">
                <span className="flex items-center gap-2">
                  <Icons.Download />
                  {t('modalActions.download')}
                </span>
              </button>
              <button onClick={handleSavePrd} disabled={savingPrd || !prdMarkdown} className="px-3 py-2 rounded-md bg-wm-accent text-white hover:bg-wm-accent/90 disabled:opacity-60 font-bold">
                <span className="flex items-center gap-2">
                  {savingPrd ? <div className="w-4 h-4 border-2 border-white/80 border-t-transparent rounded-full animate-spin"/> : <Icons.Save />}
                  {t('modalActions.save')}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {isPitchOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" onClick={() => setIsPitchOpen(false)}>
          <div className="bg-white border border-wm-neutral/30 rounded-xl max-w-3xl w-full p-4 md:p-6 max-h-[85vh] overflow-y-auto shadow-xl" onClick={(e)=>e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-wm-blue font-bold">Elevator Pitch</h3>
              <button onClick={() => setIsPitchOpen(false)} className="p-2 rounded-md text-wm-blue/50 hover:text-wm-blue hover:bg-wm-neutral/20" aria-label={t('modalActions.close')}>
                <Icons.X />
              </button>
            </div>
            <div className="bg-wm-neutral/10 border border-wm-neutral/30 rounded-lg p-3 max-h-[60vh] overflow-auto">
              <textarea
                value={pitchMarkdown}
                onChange={(e) => setPitchMarkdown(e.target.value)}
                className="w-full bg-white border border-wm-neutral/30 rounded p-2 text-wm-blue text-sm"
                rows={16}
                aria-label="Elevator Pitch Markdown"
              />
            </div>
            
            {/* Gamma AI Section */}
            {pitchMarkdown.includes('# Slide Presentation Outline') && (
              <div className="mt-4 p-3 bg-wm-neutral/10 border border-wm-neutral/30 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-bold text-wm-blue">Create PowerPoint Presentation</h4>
                  {getGammaApiKey() && (
                    <button
                      onClick={() => {
                        if (confirm('Clear stored Gamma API key?')) {
                          clearGammaApiKey();
                          alert('API key cleared. You will be prompted for a new key on next generation.');
                        }
                      }}
                      className="text-xs text-wm-blue/50 hover:text-wm-blue underline"
                    >
                      Reset API Key
                    </button>
                  )}
                </div>
                <p className="text-xs text-wm-blue/50 mb-2">
                  Generate a professional PowerPoint presentation from your slide outline using Gamma AI
                </p>
                <div className="mb-3 p-2 bg-wm-yellow/20 border border-wm-yellow/50 rounded text-xs text-wm-blue/80">
                  <strong>⚠️ Requires Gamma Pro/Ultra/Teams/Business plan</strong><br/>
                  API access requires a paid Gamma subscription. Get your API key at{' '}
                  <a href="https://gamma.app/settings" target="_blank" rel="noopener noreferrer" className="underline hover:text-wm-accent">
                    gamma.app/settings
                  </a>
                </div>
                <button
                  onClick={handleGenerateGammaPresentation}
                  disabled={generatingGamma}
                  className="w-full px-4 py-2 rounded-md bg-wm-pink text-white hover:bg-wm-pink/90 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 font-bold"
                >
                  {generatingGamma ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/80 border-t-transparent rounded-full animate-spin" />
                      Generating Presentation...
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                      </svg>
                      Create PowerPoint with Gamma AI
                    </>
                  )}
                </button>
                
                {gammaDownloadUrl && (
                  <div className="mt-3 p-2 bg-wm-accent/10 border border-wm-accent rounded flex items-center justify-between">
                    <span className="text-xs text-wm-accent font-bold">✓ Presentation ready!</span>
                    <a
                      href={gammaDownloadUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1 text-xs bg-wm-accent text-white rounded hover:bg-wm-accent/90 font-bold"
                    >
                      Download PPTX
                    </a>
                  </div>
                )}
                
                {gammaError && (
                  <div className="mt-3 p-2 bg-wm-pink/10 border border-wm-pink rounded">
                    <span className="text-xs text-wm-pink">⚠ {gammaError}</span>
                  </div>
                )}
              </div>
            )}
            
            <div className="mt-4 flex flex-col sm:flex-row gap-2 sm:gap-3 sm:items-center sm:justify-end">
              <button onClick={copyPitchToClipboard} className="px-3 py-2 rounded-md bg-wm-neutral/20 border border-wm-neutral/30 text-wm-blue hover:bg-wm-neutral/30 font-bold">
                <span className="flex items-center gap-2">
                  <Icons.Copy />
                  {t('modalActions.copy')}
                </span>
              </button>
              <button onClick={downloadPitch} className="px-3 py-2 rounded-md bg-wm-pink text-white hover:bg-wm-pink/90 font-bold">
                <span className="flex items-center gap-2">
                  <Icons.Download />
                  {t('modalActions.download')}
                </span>
              </button>
              <button onClick={handleSavePitch} disabled={savingPitch || !pitchMarkdown} className="px-3 py-2 rounded-md bg-wm-accent text-white hover:bg-wm-accent/90 disabled:opacity-60 font-bold">
                <span className="flex items-center gap-2">
                  {savingPitch ? <div className="w-4 h-4 border-2 border-white/80 border-t-transparent rounded-full animate-spin"/> : <Icons.Save />}
                  {t('modalActions.save')}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {isVersionNameOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" onClick={() => !savingVersion && setIsVersionNameOpen(false)}>
          <div className="bg-white border border-wm-neutral/30 rounded-xl max-w-md w-full p-5 shadow-xl" onClick={(e)=>e.stopPropagation()}>
            <h3 className="text-wm-blue font-bold mb-2">Name this version</h3>
            <p className="text-wm-blue/60 text-sm mb-4">Provide a short label to identify this saved workflow snapshot.</p>
            <input
              type="text"
              value={versionTitleInput}
              onChange={(e)=> setVersionTitleInput(e.target.value)}
              className="w-full bg-wm-neutral/10 border border-wm-neutral/30 rounded-md px-3 py-2 text-wm-blue text-sm focus:outline-none focus:ring-2 focus:ring-wm-accent"
              placeholder="Version title"
              autoFocus
            />
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => !savingVersion && setIsVersionNameOpen(false)}
                className="px-3 py-2 text-sm rounded-md text-wm-blue/70 hover:text-wm-blue hover:bg-wm-neutral/20 font-bold"
                disabled={savingVersion}
              >Cancel</button>
              <button
                type="button"
                onClick={confirmSaveVersion}
                disabled={savingVersion}
                className="px-4 py-2 text-sm rounded-md bg-wm-accent hover:bg-wm-accent/90 text-white inline-flex items-center gap-2 disabled:opacity-50 font-bold"
              >
                {savingVersion && <div className="w-4 h-4 border-2 border-white/70 border-t-transparent rounded-full animate-spin" />}
                Save Version
              </button>
            </div>
          </div>
        </div>
      )}

      {isDemoPromptOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" onClick={() => setIsDemoPromptOpen(false)}>
          <div className="bg-white border border-wm-neutral/30 rounded-xl max-w-4xl w-full p-4 md:p-6 max-h-[90vh] overflow-y-auto shadow-xl" onClick={(e)=>e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-wm-blue font-bold text-lg">Google AI Studio Demo Prompt</h3>
                <p className="text-sm text-wm-blue/60 mt-1">Copy this prompt and paste it into <a href="https://aistudio.google.com" target="_blank" rel="noopener noreferrer" className="text-wm-accent hover:underline">Google AI Studio</a></p>
              </div>
              <button onClick={() => setIsDemoPromptOpen(false)} className="p-2 rounded-md text-wm-blue/50 hover:text-wm-blue hover:bg-wm-neutral/20" aria-label="Close">
                <Icons.X />
              </button>
            </div>
            <div className="bg-wm-neutral/10 border border-wm-neutral/30 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <label className="block text-xs font-bold text-wm-blue/70">Edit Your Prompt</label>
                <div className="flex items-center gap-2">
                  <button
                    onClick={copyDemoPromptToClipboard}
                    className="text-xs text-wm-accent hover:text-wm-accent/80 font-bold flex items-center gap-1 transition-colors"
                    title="Copy to clipboard"
                  >
                    <Icons.Copy className="w-4 h-4" />
                    Copy
                  </button>
                  <span className="text-xs text-wm-blue/50">{demoPrompt.length} characters</span>
                </div>
              </div>
              <textarea
                value={demoPrompt}
                onChange={(e) => setDemoPrompt(e.target.value)}
                className="w-full bg-white border border-wm-neutral/30 rounded-md p-3 text-sm text-wm-blue font-mono focus:outline-none focus:ring-2 focus:ring-wm-accent resize-y"
                rows={20}
                placeholder="Your demo prompt will appear here..."
              />
            </div>
            
            {/* Demo URLs Section */}
            <div className="mt-4 p-4 bg-wm-neutral/10 border border-wm-neutral/30 rounded-lg">
              <h4 className="text-sm font-bold text-wm-blue mb-3">Save Your Demo</h4>
              <p className="text-xs text-wm-blue/60 mb-3">Save your edited prompt and demo URLs for future reference.</p>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs text-wm-blue/70 mb-1">Google AI Studio Project URL</label>
                  <input
                    type="url"
                    value={demoProjectUrl}
                    onChange={(e) => setDemoProjectUrl(e.target.value)}
                    placeholder="https://aistudio.google.com/app/prompts/..."
                    className="w-full bg-white border border-wm-neutral/30 rounded-md px-3 py-2 text-sm text-wm-blue focus:outline-none focus:ring-2 focus:ring-wm-accent"
                  />
                </div>
                <div>
                  <label className="block text-xs text-wm-blue/70 mb-1">Published Demo URL</label>
                  <input
                    type="url"
                    value={demoPublishedUrl}
                    onChange={(e) => setDemoPublishedUrl(e.target.value)}
                    placeholder="https://your-demo-url.com"
                    className="w-full bg-white border border-wm-neutral/30 rounded-md px-3 py-2 text-sm text-wm-blue focus:outline-none focus:ring-2 focus:ring-wm-accent"
                  />
                </div>
                <button
                  onClick={handleSaveDemoUrls}
                  disabled={savingDemoUrls}
                  className="w-full px-4 py-2 rounded-md bg-wm-blue text-white hover:bg-wm-blue/90 disabled:opacity-50 disabled:cursor-not-allowed font-bold text-sm flex items-center justify-center gap-2"
                >
                  {savingDemoUrls ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/80 border-t-transparent rounded-full animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Icons.Save />
                      Save Prompt & URLs
                    </>
                  )}
                </button>
              </div>
            </div>
            
            <div className="mt-4 flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-end">
              <button onClick={copyDemoPromptToClipboard} className="px-4 py-2 rounded-md bg-wm-neutral/20 border border-wm-neutral/30 text-wm-blue hover:bg-wm-neutral/30 font-bold">
                <span className="flex items-center gap-2">
                  <Icons.Copy />
                  Copy to Clipboard
                </span>
              </button>
              <button
                onClick={copyAndOpenGoogleAIStudio}
                className="px-4 py-2 rounded-md bg-gradient-to-r from-wm-accent to-wm-pink text-white hover:opacity-90 font-bold"
              >
                <span className="flex items-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                  Copy & Open Google AI Studio
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Current Workflow Upload Modal */}
      {isCurrentWorkflowModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setIsCurrentWorkflowModalOpen(false)}>
          <div className="bg-white border border-wm-neutral/30 rounded-xl shadow-2xl p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-wm-blue">Upload Current Workflow</h3>
              <button onClick={() => setIsCurrentWorkflowModalOpen(false)} className="text-wm-blue/50 hover:text-wm-blue">
                <Icons.X />
              </button>
            </div>
            <input
              type="file"
              ref={currentImageInputRef}
              onChange={handleCurrentImageChange}
              accept="image/*"
              className="hidden"
            />
            <div 
              onClick={() => currentImageInputRef.current?.click()}
              className="cursor-pointer flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-wm-neutral/50 hover:border-wm-accent rounded-lg bg-wm-neutral/10 hover:bg-wm-neutral/20 transition-all"
            >
              <Icons.Upload />
              <p className="mt-3 text-sm text-wm-blue/60 text-center">Upload a screenshot or diagram of your current process</p>
              <span className="mt-4 inline-block bg-wm-accent text-white font-bold py-2 px-4 rounded-lg hover:bg-wm-accent/90 transition-colors">
                Select Image
              </span>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default OperatorConsole;