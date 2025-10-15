import { GoogleGenAI, Type } from "@google/genai";
import type { EvaluationResult, Platform } from '../types';

if (!process.env.API_KEY) {
  throw new Error("API_KEY environment variable not set");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

interface ImagePart {
  base64: string;
  mimeType: string;
}

export async function generateText(prompt: string, image: ImagePart | null, opts?: { temperature?: number; candidateCount?: number; }): Promise<string> {
  try {
    const systemInstruction = `You are an AI workflow assistant. Your task is to help explain workflow processes clearly and comprehensively. If a workflow diagram is provided, carefully analyze it and incorporate its details into your explanation. Pay special attention to:
- The sequence and dependencies between steps
- Decision points and conditional flows
- Integration points between AI and human tasks
- Data flows and handoffs between systems
- Error handling and edge cases`;

    let contents: any;

    if (image) {
      const parts = [
        {
          inlineData: {
            data: image.base64,
            mimeType: image.mimeType,
          },
        },
        { text: `Based on the provided workflow diagram and considering all its details, ${prompt}` },
      ];
      contents = { parts: parts };
    } else {
      contents = prompt;
    }

    const request: any = {
      model: 'gemini-2.5-flash',
      contents: contents,
    };
    if (opts) {
      request.config = {};
      if (typeof opts.temperature === 'number') request.config.temperature = opts.temperature;
      if (typeof opts.candidateCount === 'number') request.candidates = opts.candidateCount;
    }

    if (!request.config) request.config = {};
    request.config.systemInstruction = systemInstruction;

    const response = await ai.models.generateContent(request);
  return response.text ?? '';
  } catch (error) {
    console.error("Error generating text:", error);
    return "Sorry, I encountered an error while generating a response. Please check the console for details.";
  }
}

export async function evaluateOperatorPerformance(
  taskGoal: string,
  userWorkflow: string,
  image: ImagePart | null
): Promise<EvaluationResult> {
  const systemInstruction = `You are an expert AI Business Process Consultant. Your task is to evaluate a user's proposed workflow for a given business task. The user will provide a text description of their workflow and may provide a visual diagram. Your evaluation should assess the clarity, efficiency, and logical soundness of the flow. Specifically, critique their decisions on what to automate with AI versus what to keep human-in-the-loop. Provide a quantitative score (1-10) and qualitative, constructive feedback to help them improve their design.`;
  
  const userInteractionText = `Evaluate the following proposed workflow:
---
**Task Goal:** ${taskGoal}
---
**User's Workflow Explanation:** ${userWorkflow}
---
${image ? "The user also provided the attached workflow diagram for context.\n---" : ""}
Please provide your evaluation based on the criteria in your instructions.`;

  const parts: any[] = [{ text: userInteractionText }];
  if (image) {
    parts.push({
      inlineData: {
        data: image.base64,
        mimeType: image.mimeType,
      },
    });
  }

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: { parts: parts },
      config: {
        systemInstruction: systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            score: {
              type: Type.INTEGER,
              description: "An integer score from 1 to 10 for the user's workflow design."
            },
            feedback: {
              type: Type.STRING,
              description: "Constructive feedback on the user's workflow, critiquing their choices about AI automation vs. human steps, and providing suggestions for improvement."
            }
          },
          required: ["score", "feedback"],
        },
      },
    });

  const jsonText = (response.text ?? '').trim();
  const result = JSON.parse(jsonText);
    return result as EvaluationResult;
  } catch (error) {
    console.error("Error evaluating performance:", error);
    return {
      score: 0,
      feedback: "Could not evaluate performance due to an API error. Please check the console.",
    };
  }
}

export interface PRD {
  title: string;
  overview: string;
  problemStatement: string;
  goals: string[];
  nonGoals?: string[];
  usersAndPersonas?: string[];
  requirements: {
    functional: string[];
    nonFunctional: string[];
  };
  successMetrics: string[];
  risksAndMitigations?: string[];
  milestones?: string[];
  techPlan: string; // platform-specific plan
}

export async function generatePRD(
  goal: string,
  stepsText: string,
  mermaidCode: string | null,
  platforms: Platform[]
): Promise<PRD> {
  const platformGuidance: Record<Platform, string> = {
    MS365:
      'Target Microsoft 365. Prefer Power Automate flows, Power Apps for UI, SharePoint/Dataverse for data, Outlook/Teams connectors, and Copilot Studio where appropriate.',
    GOOGLE:
      'Target Google Workspace. Prefer Apps Script/Vertex AI, AppSheet for UI, Sheets/Drive for data, Gmail/Calendar/Chat integrations.',
    CUSTOM:
      'Target a custom web application. Recommend a modern stack (e.g., React + Node/Cloud Functions + Firebase/Firestore) and any ML integration where helpful.',
    CUSTOM_PROMPT:
      'Use custom prompt-based automation. There is no specific platform; tailor prompts to your chosen environment or API.',
    ASSISTANT:
      'Target AI assistant integration. Design for conversational interfaces (e.g., chatbots) and leverage platforms like Dialogflow or Azure Bot Service.',
    COMBINATION:
      'Combine custom prompts with assistant capabilities. Support both batch workflows and conversational interactions as needed.',
    POWER_APPS:
      'Focus on Microsoft Power Apps for low-code application development, leveraging built-in connectors and custom components.',
    POWER_AUTOMATE:
      'Design workflow automation using Microsoft Power Automate flows, integrating with Microsoft 365 and custom connectors.',
    POWER_BI:
      'Implement data visualization and analytics solutions using Microsoft Power BI, connecting to various data sources.',
    POWER_VIRTUAL_AGENTS:
      'Create chatbots and virtual agents using Microsoft Power Virtual Agents, integrating with Power Platform services.',
    APP_SHEETS:
      'Build no-code applications using Google App Sheets, leveraging its integration with Google Workspace services.'
  };

  const multiPlatformGuidance = platforms.length > 1 
    ? `Multiple Platform Implementation: Generate separate implementation options for each platform. Format as "Option 1: [Platform Name]", "Option 2: [Platform Name]", etc. for each section that differs by platform.`
    : '';

  const platformsList = platforms.map((p, index) => 
    `${index + 1}. ${p}: ${platformGuidance[p]}`
  ).join('\n');

  const systemInstruction = `You are a senior product manager. Produce a crisp, complete Product Requirements Document (PRD) based on the user goal, steps, and optional Mermaid flowchart. Keep scope pragmatic and shippable in 2-3 iterations. Use clear bullet points. ${multiPlatformGuidance}`;

  const userContent = `Inputs:\n- Goal: ${goal}\n- Steps:\n${stepsText}\n${mermaidCode ? `- Mermaid Flowchart:\n${mermaidCode}` : ''}\n- Target Platforms:\n${platformsList}`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-pro',
      contents: { parts: [{ text: userContent }] },
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            overview: { type: Type.STRING },
            problemStatement: { type: Type.STRING },
            goals: { type: Type.ARRAY, items: { type: Type.STRING } },
            nonGoals: { type: Type.ARRAY, items: { type: Type.STRING } },
            usersAndPersonas: { type: Type.ARRAY, items: { type: Type.STRING } },
            requirements: {
              type: Type.OBJECT,
              properties: {
                functional: { type: Type.ARRAY, items: { type: Type.STRING } },
                nonFunctional: { type: Type.ARRAY, items: { type: Type.STRING } },
              },
              required: ['functional', 'nonFunctional']
            },
            successMetrics: { type: Type.ARRAY, items: { type: Type.STRING } },
            risksAndMitigations: { type: Type.ARRAY, items: { type: Type.STRING } },
            milestones: { type: Type.ARRAY, items: { type: Type.STRING } },
            techPlan: { type: Type.STRING }
          },
          required: ['title','overview','problemStatement','goals','requirements','successMetrics','techPlan']
        }
      }
    });

    const json = (response.text ?? '').trim();
    return JSON.parse(json) as PRD;
  } catch (error) {
    console.error('Error generating PRD:', error);
    // Minimal fallback
    return {
      title: `${goal} – PRD (Draft)`,
      overview: 'AI could not generate a detailed PRD. This is a placeholder. Try again shortly.',
      problemStatement: 'Unavailable',
      goals: [goal],
      requirements: { functional: [], nonFunctional: [] },
      successMetrics: [],
      techPlan: `Target: ${platforms.join(', ')}`
    };
  }
}

export function prdToMarkdown(prd: PRD): string {
  const lines: string[] = [];
  lines.push(`# ${prd.title}`);
  lines.push('');
  lines.push('## Overview');
  lines.push(prd.overview);
  lines.push('');
  lines.push('## Problem Statement');
  lines.push(prd.problemStatement);
  lines.push('');
  lines.push('## Goals');
  prd.goals.forEach(g => lines.push(`- ${g}`));
  if (prd.nonGoals?.length) {
    lines.push('');
    lines.push('## Non-Goals');
    prd.nonGoals.forEach(g => lines.push(`- ${g}`));
  }
  if (prd.usersAndPersonas?.length) {
    lines.push('');
    lines.push('## Users & Personas');
    prd.usersAndPersonas.forEach(u => lines.push(`- ${u}`));
  }
  lines.push('');
  lines.push('## Requirements');
  lines.push('### Functional');
  prd.requirements.functional.forEach(r => lines.push(`- ${r}`));
  lines.push('### Non-Functional');
  prd.requirements.nonFunctional.forEach(r => lines.push(`- ${r}`));
  lines.push('');
  lines.push('## Success Metrics');
  prd.successMetrics.forEach(m => lines.push(`- ${m}`));
  if (prd.risksAndMitigations?.length) {
    lines.push('');
    lines.push('## Risks & Mitigations');
    prd.risksAndMitigations.forEach(r => lines.push(`- ${r}`));
  }
  if (prd.milestones?.length) {
    lines.push('');
    lines.push('## Milestones');
    prd.milestones.forEach(m => lines.push(`- ${m}`));
  }
  lines.push('');
  lines.push('## Technical Plan');
  lines.push(prd.techPlan);
  return lines.join('\n');
}

// Elevator Pitch generation
export interface ElevatorPitch {
  oneLiner: string;          // A crisp one-liner value prop
  problem: string;           // The core problem/opportunity
  solution: string;          // What we provide and how it works
  targetAudience: string;    // Who it’s for
  differentiation: string[]; // Why it’s better / unique
  outcomes: string[];        // Tangible benefits/impact
  callToAction: string;      // Ask or next step
  pitches: {
    seconds30: string;       // 30s version
    seconds90: string;       // 90s version
  };
}

export async function generateElevatorPitch(
  goal: string,
  stepsText: string,
  platforms?: Platform[]
): Promise<ElevatorPitch> {
  const multiPlatformGuidance = platforms && platforms.length > 1 
    ? `Multiple Platform Implementation: Mention that this solution can be implemented across ${platforms.length} different platforms (${platforms.join(', ')}), providing flexibility for different technology stacks.`
    : platforms && platforms.length === 1
    ? `Target Platform: This solution is designed for ${platforms[0]}.`
    : '';

  const systemInstruction = `You are a pitch coach. Create a punchy, credible elevator pitch from the user's goal and workflow steps.
Rules:
- Be specific and concrete. Avoid fluff.
- Highlight audience, problem, solution, differentiation, and outcomes.
- Produce two variants: 30s and 90s.
- Keep jargon minimal.
${multiPlatformGuidance}`;

  const userContent = `Inputs:\n- Goal: ${goal}\n- Steps:\n${stepsText}${platforms ? `\n- Target Platforms: ${platforms.join(', ')}` : ''}`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-pro',
      contents: { parts: [{ text: userContent }] },
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            oneLiner: { type: Type.STRING },
            problem: { type: Type.STRING },
            solution: { type: Type.STRING },
            targetAudience: { type: Type.STRING },
            differentiation: { type: Type.ARRAY, items: { type: Type.STRING } },
            outcomes: { type: Type.ARRAY, items: { type: Type.STRING } },
            callToAction: { type: Type.STRING },
            pitches: {
              type: Type.OBJECT,
              properties: {
                seconds30: { type: Type.STRING },
                seconds90: { type: Type.STRING },
              },
              required: ['seconds30','seconds90']
            }
          },
          required: ['oneLiner','problem','solution','targetAudience','differentiation','outcomes','callToAction','pitches']
        }
      }
    });

    const json = (response.text ?? '').trim();
    return JSON.parse(json) as ElevatorPitch;
  } catch (error) {
    console.error('Error generating elevator pitch:', error);
    // Minimal fallback
    return {
      oneLiner: goal,
      problem: 'Unavailable',
      solution: 'Unavailable',
      targetAudience: 'Unavailable',
      differentiation: [],
      outcomes: [],
      callToAction: 'Contact us to learn more.',
      pitches: {
        seconds30: `We help with: ${goal}.`,
        seconds90: `We help with: ${goal}. Using the described workflow, we streamline the process and improve outcomes.`,
      }
    };
  }
}

export function elevatorPitchToMarkdown(ep: ElevatorPitch): string {
  const lines: string[] = [];
  lines.push(`# Elevator Pitch`);
  lines.push('');
  lines.push(`**One-liner:** ${ep.oneLiner}`);
  lines.push('');
  lines.push('## Problem');
  lines.push(ep.problem);
  lines.push('');
  lines.push('## Solution');
  lines.push(ep.solution);
  lines.push('');
  lines.push('## Target Audience');
  lines.push(ep.targetAudience);
  if (ep.differentiation?.length) {
    lines.push('');
    lines.push('## Differentiation');
    ep.differentiation.forEach(d => lines.push(`- ${d}`));
  }
  if (ep.outcomes?.length) {
    lines.push('');
    lines.push('## Outcomes');
    ep.outcomes.forEach(o => lines.push(`- ${o}`));
  }
  lines.push('');
  lines.push('## Call to Action');
  lines.push(ep.callToAction);
  lines.push('');
  lines.push('## 30-second Version');
  lines.push(ep.pitches.seconds30);
  lines.push('');
  lines.push('## 90-second Version');
  lines.push(ep.pitches.seconds90);
  return lines.join('\n');
}
