import React, { useState, useCallback, useRef } from 'react';
import type firebase from 'firebase/compat/app';
import type { Scenario, EvaluationResult, StoredEvaluationResult, LeaderboardEntry, Platform } from '../types';
import { generateText, generatePRD, prdToMarkdown, generateElevatorPitch, elevatorPitchToMarkdown } from '../services/geminiService';
import { getEvaluations, savePrd, savePitch } from '../services/firebaseService';
import { Icons } from '../constants';
import LeaderboardSidebar from './LeaderboardSidebar';
import { useTranslation } from '../i18n';
import { useDiagramAsImage } from './useDiagramAsImage';

interface OperatorConsoleProps {
  scenario: Scenario;
  onBack: () => void;
  user: firebase.User;
  onEvaluationCompleted: (scenarioId: string, newScore: number) => void;
}

export const LoadingSpinner: React.FC = () => (
    <div className="flex items-center justify-center space-x-2">
        <div className="w-2 h-2 rounded-full bg-sky-400 animate-pulse [animation-delay:-0.3s]"></div>
        <div className="w-2 h-2 rounded-full bg-sky-400 animate-pulse [animation-delay:-0.15s]"></div>
        <div className="w-2 h-2 rounded-full bg-sky-400 animate-pulse"></div>
    </div>
);

const OperatorConsole: React.FC<OperatorConsoleProps> = ({ scenario, onBack, user, onEvaluationCompleted: _onEvaluationCompleted }) => {
  const [workflowExplanation, setWorkflowExplanation] = useState('');
  const [evaluation] = useState<EvaluationResult | null>(null);
  const [isLoading] = useState(false);
  const [image, setImage] = useState<{ base64: string; mimeType: string; dataUrl: string } | null>(null);
  const [pastEvaluations, setPastEvaluations] = useState<StoredEvaluationResult[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);
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
  // Feature flag for pro users (placeholder: always true)
  const isProOrAbove = true;

  // File/image handlers (placeholders)
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setImage({
        base64: (reader.result as string).split(',')[1],
        mimeType: file.type,
        dataUrl: reader.result as string,
      });
    };
    reader.readAsDataURL(file);
  };
  const handleRemoveImage = () => setImage(null);

  // PRD handlers (placeholders)
  const handleGeneratePrd = async () => {
    setPrdLoading(true);
    try {
      const prd = await generatePRD(localizedGoal, workflowExplanation, image ? image.base64 : null, prdPlatform);
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
    a.download = 'prd.md';
    a.click();
    URL.revokeObjectURL(url);
  };

  // Elevator Pitch handlers
  const handleGeneratePitch = async () => {
    if (pitchLoading) return;
    setPitchLoading(true);
    try {
      const ep = await generateElevatorPitch(localizedGoal, workflowExplanation);
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
    a.download = 'elevator-pitch.md';
    a.click();
    URL.revokeObjectURL(url);
  };

  // Evaluation submit handler (placeholder)
  const handleSubmitForEvaluation = () => {
    alert('Evaluation submitted (placeholder)');
  };
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [historyModalEval, setHistoryModalEval] = useState<StoredEvaluationResult | null>(null);
  const [historyModalWorkflow, setHistoryModalWorkflow] = useState('');
  const [prdPlatform, setPrdPlatform] = useState<Platform>('MS365');
  const [prdLoading, setPrdLoading] = useState(false);
  const [prdMarkdown, setPrdMarkdown] = useState('');
  const [isPrdOpen, setIsPrdOpen] = useState(false);
  const [savingPrd, setSavingPrd] = useState(false);
  // Elevator pitch state
  const [isPitchOpen, setIsPitchOpen] = useState(false);
  const [pitchMarkdown, setPitchMarkdown] = useState('');
  const [pitchLoading, setPitchLoading] = useState(false);
  const [savingPitch, setSavingPitch] = useState(false);
  // Leaderboard state (dummy initial values)
  const [leaderboard] = useState<LeaderboardEntry[]>([]);
  const [isLoadingLeaderboard] = useState(false);

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
      const imagePart = image ? { base64: image.base64, mimeType: image.mimeType } : null;
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
  }, [assistLoading, image, localizedGoal, workflowExplanation]);


  const openHistoryModal = useCallback((item: StoredEvaluationResult) => {
  console.debug('[OperatorConsole] Opening history modal for item', item?.id);
    setHistoryModalEval(item);
    setHistoryModalWorkflow(item.workflowExplanation || '');
    setHistoryModalOpen(true);
  }, []);

  const handleGeneratePrdFromHistoryModal = useCallback(async () => {
    if (!historyModalEval) return;
    if (prdLoading) return;
    setPrdLoading(true);
    try {
      const prd = await generatePRD(localizedGoal, historyModalWorkflow || '', null, prdPlatform);
      const md = prdToMarkdown(prd);
      setPrdMarkdown(md);
      setIsPrdOpen(true);
    } catch (e) {
      console.error('PRD generation (history modal) failed:', e);
      alert('PRD generation failed. Try again.');
    } finally {
      setPrdLoading(false);
    }
  }, [historyModalEval, prdLoading, localizedGoal, historyModalWorkflow, prdPlatform]);

  const handleGeneratePitchFromHistoryModal = useCallback(async () => {
    if (!historyModalEval) return;
    if (pitchLoading) return;
    setPitchLoading(true);
    try {
      const ep = await generateElevatorPitch(localizedGoal, historyModalWorkflow || '');
      const md = elevatorPitchToMarkdown(ep);
      setPitchMarkdown(md);
      setIsPitchOpen(true);
    } catch (e) {
      console.error('Elevator pitch generation (history modal) failed:', e);
      alert('Elevator pitch generation failed. Try again.');
    } finally {
      setPitchLoading(false);
    }
  }, [historyModalEval, pitchLoading, localizedGoal, historyModalWorkflow]);

  // Using the custom hook for diagram conversion
  const handleDiagramAsImage = useDiagramAsImage(mermaidSvg, setImage, setIsMermaidOpen);

  const handleSavePrd = useCallback(async () => {
    if (savingPrd) return;
    try {
      setSavingPrd(true);
      await savePrd(user.uid, scenario.id, prdPlatform, prdMarkdown, localizedTitle);
      alert('PRD saved to your library.');
    } catch (e) {
      console.error('Save PRD failed:', e);
      alert('Failed to save PRD.');
    } finally {
      setSavingPrd(false);
    }
  }, [savingPrd, user?.uid, scenario?.id, prdPlatform, prdMarkdown, localizedTitle]);

  const handleSavePitch = useCallback(async () => {
    if (savingPitch) return;
    try {
      setSavingPitch(true);
      await savePitch(user.uid, scenario.id, pitchMarkdown, localizedTitle);
      alert('Elevator pitch saved to your library.');
    } catch (e) {
      console.error('Save Elevator Pitch failed:', e);
      alert('Failed to save Elevator Pitch.');
    } finally {
      setSavingPitch(false);
    }
  }, [savingPitch, user?.uid, scenario?.id, pitchMarkdown, localizedTitle]);

  // Load scenario history for this user and scenario
  React.useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        setIsLoadingHistory(true);
        if (!user?.uid || !scenario?.id) {
          setPastEvaluations([]);
          return;
        }
        const list = await getEvaluations(user.uid, scenario.id);
        if (!cancelled) setPastEvaluations(list);
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
          <button onClick={onBack} className="flex items-center space-x-2 text-sm text-sky-400 hover:text-sky-300 mb-6 transition-colors">
            <Icons.ChevronLeft />
            <span>{t('operator.back')}</span>
          </button>

          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6 mb-6">
            <h1 className="text-2xl font-bold text-white mb-2">{localizedTitle}</h1>
            <p className="text-slate-400 mb-4">{localizedDescription}</p>
            <div className="bg-slate-900 border border-slate-600 rounded-lg p-4">
              <h2 className="font-semibold text-sky-400 mb-1">{lang === 'es' ? 'Tu Objetivo:' : 'Your Goal:'}</h2>
              <p className="text-slate-300">{localizedGoal}</p>
            </div>
          </div>

          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-white">{t('operator.design')}</h2>
              {isProOrAbove && (
                <button
                  type="button"
                  onClick={handleAiAssist}
                  disabled={assistLoading}
                  title={t('operator.aiAssist')}
                  aria-label={t('operator.aiAssist')}
                  className="p-2 rounded-md text-sky-300 hover:text-white hover:bg-sky-700/30 transition-colors disabled:opacity-60"
                >
                  {assistLoading ? (
                    <div className="w-4 h-4 border-2 border-sky-300 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Icons.Sparkles />
                  )}
                </button>
              )}
            </div>

            <div className="flex flex-col mb-6">
              <label htmlFor="workflow" className="text-lg font-semibold mb-2">1. {t('operator.explain')}</label>
              <p className="text-sm text-slate-400 mb-3">{t('operator.explainHelper')}</p>
              <textarea
                id="workflow"
                value={workflowExplanation}
                onChange={(e) => setWorkflowExplanation(e.target.value)}
                placeholder={"e.g., Step 1 (AI): Ingest customer email and categorize intent. Step 2 (Human): Review high-priority tickets..."}
                className="flex-grow bg-slate-900 border border-slate-600 rounded-lg p-4 text-slate-200 focus:ring-2 focus:ring-sky-500 focus:outline-none transition-shadow w-full"
                rows={10}
              />
            </div>

            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <label className="text-lg font-semibold">2. {t('operator.visual')}</label>
                {isProOrAbove && (
                  <button
                    type="button"
                    onClick={handleAiDiagramAssist}
                    disabled={diagramAssistLoading}
                    title={t('operator.aiDiagramAssist')}
                    aria-label={t('operator.aiDiagramAssist')}
                    className="p-2 rounded-md text-emerald-300 hover:text-white hover:bg-emerald-700/30 transition-colors disabled:opacity-60"
                  >
                    {diagramAssistLoading ? (
                      <div className="w-4 h-4 border-2 border-emerald-300 border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Icons.Sparkles />
                    )}
                  </button>
                )}
              </div>
              <div className="bg-slate-800 border-2 border-dashed border-slate-600 rounded-xl p-6 text-center transition-colors hover:border-sky-500">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept="image/*"
                  className="hidden"
                  aria-hidden="true"
                />
                {!image ? (
                  <div className="cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                    <Icons.Upload />
                    <p className="mt-2 text-sm text-slate-400">{t('operator.uploadHint')}</p>
                    <span className="mt-4 inline-block bg-slate-700 text-white font-bold py-2 px-4 rounded-lg hover:bg-slate-600 transition-colors">
                      {t('operator.selectImage')}
                    </span>
                  </div>
                ) : (
                  <div>
                    <div className="relative inline-block">
                      <img src={image.dataUrl} alt="Workflow preview" className="max-h-60 rounded-lg mx-auto shadow-lg" />
                      <button
                        onClick={handleRemoveImage}
                        className="absolute -top-2 -right-2 bg-red-600 text-white rounded-full p-1 leading-none hover:bg-red-500 transition-colors"
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

            {/* PRD generator */}
            <div className="mb-6">
              <label className="block text-lg font-semibold mb-2">3. Generate PRD</label>
              <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
                <div className="flex items-center gap-2">
                  <span className="text-slate-300">Platform:</span>
                  <select
                    value={prdPlatform}
                    onChange={(e)=> setPrdPlatform(e.target.value as Platform)}
                    className="bg-slate-900 border border-slate-600 text-slate-200 rounded px-2 py-1"
                    aria-label="Select target platform"
                  >
                    <option value="MS365">Microsoft 365</option>
                    <option value="GOOGLE">Google Workspace</option>
                    <option value="CUSTOM">Custom App</option>
                  </select>
                </div>
                <button
                  type="button"
                  onClick={handleGeneratePrd}
                  disabled={prdLoading}
                  className="inline-flex items-center gap-2 px-3 py-2 rounded-md bg-emerald-600 text-white hover:bg-emerald-500 disabled:opacity-60"
                >
                  {prdLoading ? <div className="w-4 h-4 border-2 border-white/80 border-t-transparent rounded-full animate-spin"/> : <Icons.Sparkles />}
                  <span>Generate PRD</span>
                </button>
              </div>
            </div>

            {/* Elevator Pitch generator */}
            <div className="mb-6">
              <label className="block text-lg font-semibold mb-2">4. Elevator Pitch</label>
              <div className="flex gap-3 items-center">
                <button
                  type="button"
                  onClick={handleGeneratePitch}
                  disabled={pitchLoading}
                  className="inline-flex items-center gap-2 px-3 py-2 rounded-md bg-violet-600 text-white hover:bg-violet-500 disabled:opacity-60"
                >
                  {pitchLoading ? <div className="w-4 h-4 border-2 border-white/80 border-t-transparent rounded-full animate-spin"/> : <Icons.Sparkles />}
                  <span>Generate Elevator Pitch</span>
                </button>
              </div>
            </div>

            <button
              onClick={handleSubmitForEvaluation}
              disabled={isLoading || !workflowExplanation}
              className="w-full flex items-center justify-center bg-sky-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-sky-500 transition-colors disabled:bg-slate-700 disabled:cursor-not-allowed"
            >
              {isLoading ? <LoadingSpinner /> : t('operator.evaluate')}
            </button>
          </div>

          {evaluation && (
            <div className="mt-8 bg-slate-800 border border-slate-700 rounded-xl p-6 animate-fade-in-up">
              <h2 className="text-xl font-bold mb-4 text-center">{t('operator.feedback')}</h2>
              <div className="text-center mb-4">
                <p className="text-slate-400">Your Score</p>
                <p className="text-6xl font-extrabold text-sky-400">{evaluation.score}<span className="text-3xl font-medium text-slate-500">/10</span></p>
              </div>
              <div>
                <h3 className="font-semibold text-sky-400 mb-1">{t('operator.aiFeedback')}</h3>
                <p className="text-slate-300 whitespace-pre-wrap">{evaluation.feedback}</p>
              </div>
            </div>
          )}

          <div className="mt-8">
            <h2 className="text-xl font-bold mb-4 text-center">{t('operator.historyTitle')}</h2>
            {isLoadingHistory ? (
              <div className="text-center p-4"><LoadingSpinner /></div>
            ) : pastEvaluations.length > 0 ? (
              <div className="space-y-4">
                {pastEvaluations.map(item => (
                  <div
                    key={item.id}
                    className="bg-slate-800 border border-slate-700 rounded-xl p-4 animate-fade-in-up cursor-pointer hover:border-emerald-500 transition-colors"
                    tabIndex={0}
                    role="button"
                    aria-label="Open historic evaluation"
                    onClick={() => openHistoryModal(item)}
                    onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') openHistoryModal(item); }}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-sm text-slate-400">{new Date(item.timestamp).toLocaleString()}</p>
                        <p className="text-slate-300 mt-2 whitespace-pre-wrap text-sm">{item.feedback.substring(0, 150)}...</p>
                      </div>
                      <div className="text-right ml-4 flex-shrink-0">
                        <p className="text-slate-400 text-sm">{t('history.score')}</p>
                        <p className="text-3xl font-bold text-sky-400">{item.score}<span className="text-lg text-slate-500">/10</span></p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-slate-400 p-4">{t('operator.noHistoryScenario')}</p>
            )}
          </div>
        </div>

        {/* Right Sidebar */}
        <aside className="w-full lg:w-96 flex-shrink-0">
          <div className="lg:sticky lg:top-24 h-fit">
            <LeaderboardSidebar
              leaderboard={leaderboard}
              isLoading={isLoadingLeaderboard}
            />
          </div>
        </aside>
      </div>

      {/* Modals rendered as siblings after main content for valid JSX structure */}
      {historyModalOpen && historyModalEval && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" onClick={() => setHistoryModalOpen(false)}>
          <div className="bg-slate-900 border border-slate-700 rounded-xl max-w-2xl w-full p-4 md:p-6 max-h-[85vh] overflow-y-auto" onClick={(e)=>e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-white font-semibold">Historic Evaluation</h3>
              <button onClick={() => setHistoryModalOpen(false)} className="p-2 rounded-md text-slate-300 hover:text-white hover:bg-slate-700/50" aria-label="Close">
                <Icons.X />
              </button>
            </div>
            <div className="mb-4">
              <label className="block text-slate-300 text-sm mb-1">Workflow Explanation</label>
              <textarea
                className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-slate-200 text-sm"
                rows={8}
                value={historyModalWorkflow}
                onChange={e => setHistoryModalWorkflow(e.target.value)}
              />
            </div>
            <div className="mb-4">
              <label className="block text-slate-300 text-sm mb-1">AI Feedback</label>
              <div className="bg-slate-800 border border-slate-700 rounded p-2 text-slate-200 text-sm whitespace-pre-wrap min-h-[60px]">{historyModalEval.feedback}</div>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 sm:items-center sm:justify-end">
              <div className="text-xs text-slate-400 flex-1">Platform: {prdPlatform === 'MS365' ? 'Microsoft 365' : prdPlatform === 'GOOGLE' ? 'Google Workspace' : 'Custom App'}</div>
              <button
                type="button"
                onClick={handleGeneratePrdFromHistoryModal}
                disabled={prdLoading}
                className="inline-flex items-center gap-2 px-3 py-2 rounded-md bg-emerald-600 text-white hover:bg-emerald-500 disabled:opacity-60"
              >
                {prdLoading ? <div className="w-4 h-4 border-2 border-white/80 border-t-transparent rounded-full animate-spin"/> : <Icons.Sparkles />}
                <span>Generate PRD</span>
              </button>
              <button
                type="button"
                onClick={handleGeneratePitchFromHistoryModal}
                disabled={pitchLoading}
                className="inline-flex items-center gap-2 px-3 py-2 rounded-md bg-violet-600 text-white hover:bg-violet-500 disabled:opacity-60"
              >
                {pitchLoading ? <div className="w-4 h-4 border-2 border-white/80 border-t-transparent rounded-full animate-spin"/> : <Icons.Sparkles />}
                <span>Elevator Pitch</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {isMermaidOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" onClick={() => setIsMermaidOpen(false)}>
          <div className="bg-slate-900 border border-slate-700 rounded-xl max-w-3xl w-full p-4 md:p-6 max-h-[90vh] overflow-y-auto" onClick={(e)=>e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-white font-semibold">{t('operator.previewTitle')}</h3>
              <button onClick={() => setIsMermaidOpen(false)} className="p-2 rounded-md text-slate-300 hover:text-white hover:bg-slate-700/50" aria-label="Close">
                <Icons.X />
              </button>
            </div>
            <div className="bg-slate-800/60 border border-slate-700 rounded-lg p-3 max-h-[60vh] overflow-auto">
              {mermaidError ? (
                <p className="text-red-400 text-sm">{mermaidError}</p>
              ) : mermaidSvg ? (
                <div dangerouslySetInnerHTML={{ __html: mermaidSvg }} />
              ) : (
                <div className="text-slate-400 text-sm">No preview available.</div>
              )}
            </div>
            <div className="mt-4 flex flex-col sm:flex-row gap-2 sm:gap-3 sm:items-center sm:justify-end">
              <button onClick={copyMermaidToClipboard} className="px-3 py-2 rounded-md bg-slate-800 border border-slate-600 text-slate-200 hover:bg-slate-700">
                {t('operator.copyMermaid')}
              </button>
              <button onClick={copySvgToClipboard} disabled={!mermaidSvg} className="px-3 py-2 rounded-md bg-slate-800 border border-slate-600 text-slate-200 disabled:opacity-60 hover:bg-slate-700">
                Copy SVG
              </button>
              <button onClick={handleDiagramAsImage} className="px-3 py-2 rounded-md bg-sky-600 text-white hover:bg-sky-500">
                {t('operator.useAsImage')}
              </button>
            </div>
            <div className="mt-3">
              <label className="block text-slate-300 text-sm mb-1">Mermaid</label>
              <textarea className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-slate-200 text-sm" rows={6} value={mermaidCode} onChange={(e)=>setMermaidCode(e.target.value)} />
              <div className="mt-2 flex justify-end">
                <button onClick={async ()=>{ await renderMermaid(mermaidCode); }} className="text-sm px-3 py-1.5 rounded-md bg-slate-800 border border-slate-600 text-slate-200 hover:bg-slate-700">{t('operator.refreshPreview')}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {isPrdOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" onClick={() => setIsPrdOpen(false)}>
          <div className="bg-slate-900 border border-slate-700 rounded-xl max-w-3xl w-full p-4 md:p-6 max-h-[85vh] overflow-y-auto" onClick={(e)=>e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-white font-semibold">PRD Preview</h3>
              <button onClick={() => setIsPrdOpen(false)} className="p-2 rounded-md text-slate-300 hover:text-white hover:bg-slate-700/50" aria-label="Close">
                <Icons.X />
              </button>
            </div>
            <div className="bg-slate-800/60 border border-slate-700 rounded-lg p-3 max-h-[60vh] overflow-auto">
              <pre className="whitespace-pre-wrap text-slate-200 text-sm">{prdMarkdown}</pre>
            </div>
            <div className="mt-4 flex flex-col sm:flex-row gap-2 sm:gap-3 sm:items-center sm:justify-end">
              <button onClick={copyPrdToClipboard} className="px-3 py-2 rounded-md bg-slate-800 border border-slate-600 text-slate-200 hover:bg-slate-700">Copy PRD</button>
              <button onClick={downloadPrd} className="px-3 py-2 rounded-md bg-sky-600 text-white hover:bg-sky-500">Download .md</button>
              <button onClick={handleSavePrd} disabled={savingPrd || !prdMarkdown} className="px-3 py-2 rounded-md bg-emerald-600 text-white hover:bg-emerald-500 disabled:opacity-60">
                {savingPrd ? <div className="w-4 h-4 border-2 border-white/80 border-t-transparent rounded-full animate-spin inline-block mr-2"/> : null}
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {isPitchOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" onClick={() => setIsPitchOpen(false)}>
          <div className="bg-slate-900 border border-slate-700 rounded-xl max-w-3xl w-full p-4 md:p-6 max-h-[85vh] overflow-y-auto" onClick={(e)=>e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-white font-semibold">Elevator Pitch</h3>
              <button onClick={() => setIsPitchOpen(false)} className="p-2 rounded-md text-slate-300 hover:text-white hover:bg-slate-700/50" aria-label="Close">
                <Icons.X />
              </button>
            </div>
            <div className="bg-slate-800/60 border border-slate-700 rounded-lg p-3 max-h-[60vh] overflow-auto">
              <textarea
                value={pitchMarkdown}
                onChange={(e) => setPitchMarkdown(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-slate-200 text-sm"
                rows={16}
                aria-label="Elevator Pitch Markdown"
              />
            </div>
            <div className="mt-4 flex flex-col sm:flex-row gap-2 sm:gap-3 sm:items-center sm:justify-end">
              <button onClick={copyPitchToClipboard} className="px-3 py-2 rounded-md bg-slate-800 border border-slate-600 text-slate-200 hover:bg-slate-700">Copy</button>
              <button onClick={downloadPitch} className="px-3 py-2 rounded-md bg-violet-600 text-white hover:bg-violet-500">Download .md</button>
              <button onClick={handleSavePitch} disabled={savingPitch || !pitchMarkdown} className="px-3 py-2 rounded-md bg-emerald-600 text-white hover:bg-emerald-500 disabled:opacity-60">
                {savingPitch ? <div className="w-4 h-4 border-2 border-white/80 border-t-transparent rounded-full animate-spin inline-block mr-2"/> : null}
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default OperatorConsole;