import { GoogleGenAI, Type } from "@google/genai";
import type { 
  EvaluationResult, 
  Platform, 
  CompanyResearch, 
  Scenario, 
  RelatedScenario,
  RfpAnalysis
} from '../types';

const apiKey = process.env.GOOGLE_AI_API_KEY || process.env.API_KEY;

if (!apiKey) {
  throw new Error("Google AI API key not set. Please set VITE_GOOGLE_AI_API_KEY or API_KEY in your environment variables.");
}

const ai = new GoogleGenAI({ apiKey });

interface ImagePart {
  base64: string;
  mimeType: string;
}

interface ResearchCompanyParams {
  companyName: string;
  rfpContent?: string;
}

export async function analyzeRfpDocument(content: string): Promise<RfpAnalysis> {
  const systemInstruction = `You are an expert AI consultant analyzing an RFP (Request for Proposal) document.

FOCUS ON PROJECT STRUCTURE FIRST:
1. Create a hierarchical breakdown of ALL projects and sub-projects mentioned in the RFP
2. For EACH project and sub-project, identify:
   - Project name/identifier
   - Parent project (if it's a sub-project)
   - Project scope and objectives
   - Specific deliverables
   - Dependencies on other projects
   - Key technical requirements
   - Timeline and milestones
   - Budget allocation (if specified)
   - Project-specific stakeholders

Then analyze additional RFP details including:
1. Technical specifications and standards
2. Overall program deadlines and phases
3. Total budget and cost constraints
4. Key stakeholders and roles
5. Success metrics and acceptance criteria
6. Risks and challenges
7. Required technologies and integrations
8. Compliance requirements and regulations

REQUIRED OUTPUT FORMAT:
1. Project Hierarchy (MUST include):
   - Main project list with clear parent-child relationships
   - Each project's key details organized under its entry
   - Direct quotes from RFP for critical project definitions
   - Cross-references between dependent projects

2. Project-Specific Details:
   - Create separate sections for each major project
   - List all sub-projects and components
   - Include verbatim requirements and specifications
   - Note dependencies and integration points

3. Additional Analysis:
   - Program-level requirements and standards
   - Cross-project dependencies and risks
   - Technology stack and integration requirements
   - Compliance and regulatory considerations
   - AI implementation opportunities for each project

IMPORTANT RULES:
- Start with a clear project tree showing the hierarchy
- Always maintain relationships between projects
- Quote directly from the RFP for project definitions
- Flag any ambiguous project relationships
- Identify where projects intersect or depend on each other
- Note ANY project-specific AI opportunities`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-pro",
      contents: `Your primary task is to create a detailed project hierarchy from this RFP, breaking down all projects, sub-projects, and their relationships. Start by identifying the main projects, then map out all sub-projects and their dependencies. After that, analyze additional RFP details.

RFP Content:
${content}

Required format:
1. Start with a visual project hierarchy showing parent-child relationships
2. Then provide detailed analysis for each project and sub-project
3. Finally add program-level analysis

Remember: Project structure and relationships are the TOP priority.`,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            summary: { 
              type: Type.STRING,
              description: "Comprehensive overview of the entire RFP, including all major components and unique aspects"
            },
            projectStructure: {
              type: Type.STRING,
              description: "Detailed breakdown of all projects, sub-projects, and their relationships as specified in the RFP"
            },
            detailedAnalysis: {
              type: Type.STRING,
              description: "In-depth analysis of all requirements, specifications, and details from the RFP, maintaining original structure"
            },
            timeline: { 
              type: Type.STRING,
              description: "All timeline-related information, phases, and milestones found in the RFP"
            },
            budget: { 
              type: Type.STRING,
              description: "All budget and cost-related information found in the RFP"
            },
            requirements: { 
              type: Type.STRING,
              description: "Comprehensive list of all requirements found, maintaining their original context and structure"
            },
            stakeholders: { 
              type: Type.STRING,
              description: "All identified stakeholders and their roles/responsibilities"
            },
            successCriteria: { 
              type: Type.STRING,
              description: "All success criteria, acceptance criteria, and evaluation metrics mentioned"
            },
            risks: { 
              type: Type.STRING,
              description: "All identified risks, challenges, and potential issues"
            },
            aiRecommendations: { 
              type: Type.STRING,
              description: "Strategic recommendations for AI implementation based on the RFP analysis"
            },
            aiCapabilities: { 
              type: Type.STRING,
              description: "Required AI capabilities and potential integration points"
            },
            constraints: { 
              type: Type.STRING,
              description: "All constraints, limitations, and compliance requirements"
            },
            clarificationNeeded: { 
              type: Type.STRING,
              description: "Areas requiring clarification or additional information"
            }
          },
          required: ["summary", "projectStructure", "detailedAnalysis", "requirements", "aiRecommendations", "aiCapabilities"]
        }
      }
    });

    const result = JSON.parse(response.text ?? '{}');
    return result as RfpAnalysis;
  } catch (error) {
    console.error("Error analyzing RFP document:", error);
    return {
      summary: "Error analyzing document",
      projectStructure: "Analysis failed",
      detailedAnalysis: "Analysis failed",
      requirements: "Analysis failed",
      successCriteria: "Analysis failed",
      aiRecommendations: "Analysis failed",
      aiCapabilities: "Analysis failed",
      timeline: "",
      budget: "",
      stakeholders: "",
      risks: "",
      constraints: "",
      clarificationNeeded: ""
    };
  }
}

export async function researchCompany({ companyName, rfpContent }: ResearchCompanyParams): Promise<CompanyResearch> {
  const systemInstruction = `You are an expert business analyst and AI consultant. Research the given company and provide a comprehensive analysis including:
- Company overview and core business
- Industry analysis
- Key products/services
- Market challenges and opportunities
- Current market position and competitors
- Use cases for AI/automation
- Current AI implementation status
- Potential AI opportunities
Format the response as structured JSON matching the specified schema.`;

  try {
    const rfpContext = rfpContent ? `\n\nAdditionally, analyze this RFP document from the company:\n${rfpContent}` : '';
    
    const response = await ai.models.generateContent({
      model: "gemini-2.5-pro",
      contents: `Research and analyze ${companyName}, focusing on their business operations and AI/automation opportunities.${rfpContext}`,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING },
            description: { type: Type.STRING },
            industry: { type: Type.STRING },
            products: { type: Type.ARRAY, items: { type: Type.STRING } },
            challenges: { type: Type.ARRAY, items: { type: Type.STRING } },
            opportunities: { type: Type.ARRAY, items: { type: Type.STRING } },
            marketPosition: { type: Type.STRING },
            competitors: { type: Type.ARRAY, items: { type: Type.STRING } },
            useCases: { type: Type.ARRAY, items: { type: Type.STRING } },
            aiRelevance: {
              type: Type.OBJECT,
              properties: {
                current: { type: Type.STRING },
                potential: { type: Type.STRING },
                recommendations: { type: Type.ARRAY, items: { type: Type.STRING } }
              },
              required: ["current", "potential", "recommendations"]
            },
            lastUpdated: { type: Type.NUMBER }
          },
          required: ["name", "description", "industry", "products", "challenges", "opportunities", "marketPosition", "competitors", "useCases", "aiRelevance", "lastUpdated"]
        }
      }
    });

    const rawResponse = JSON.parse(response.text ?? '{}');
    const result: CompanyResearch = {
      name: rawResponse.name,
      currentResearch: {
        description: rawResponse.description || '',
        industry: rawResponse.industry || '',
        marketPosition: rawResponse.marketPosition || '',
        products: rawResponse.products || [],
        challenges: rawResponse.challenges || [],
        opportunities: rawResponse.opportunities || [],
        competitors: rawResponse.competitors || [],
        useCases: rawResponse.useCases || [],
        aiRelevance: {
          current: rawResponse.aiRelevance?.current || '',
          potential: rawResponse.aiRelevance?.potential || '',
          recommendations: rawResponse.aiRelevance?.recommendations || []
        },
        timestamp: Date.now()
      },
      history: [],
      lastUpdated: Date.now()
    };
    return result;
  } catch (error) {
    console.error("Error researching company:", error);
    throw new Error("Failed to research company");
  }
}

export async function findRelevantScenarios(
  companyResearch: CompanyResearch,
  allScenarios: Scenario[],
  generateSuggestions: boolean = false
): Promise<RelatedScenario[]> {
  const systemInstruction = generateSuggestions 
    ? `You are an AI training consultant. Based on the company research provided, generate 2-3 new training scenario suggestions that would be valuable for this company. Consider:
- Industry specific challenges
- Company's current AI maturity
- Identified opportunities
- Skill gaps and development needs
Generate scenarios that are specific to their context and aligned with their goals.`
    : `You are an AI training consultant. Based on the company research provided, analyze the list of training scenarios and identify which ones are most relevant. Consider:
- Industry alignment
- Similar challenges/opportunities
- AI implementation needs
- Skill development opportunities
Return a ranked list of relevant scenarios with explanations.`;

  try {
    const prompt = generateSuggestions
      ? `Based on this company analysis, generate 2-3 NEW training scenario suggestions that would help this company improve their AI and automation capabilities. Focus on their specific industry challenges and opportunities.\n\nCompany Research:\n${JSON.stringify(companyResearch, null, 2)}`
      : `Analyze these training scenarios and identify which ones would be most relevant and valuable for this company based on their profile, challenges, and opportunities.\n\nCompany Research:\n${JSON.stringify(companyResearch, null, 2)}\n\nAvailable Scenarios:\n${JSON.stringify(allScenarios, null, 2)}`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-pro",
      contents: prompt,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: generateSuggestions ? {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING },
              title: { type: Type.STRING },
              description: { type: Type.STRING },
              goal: { type: Type.STRING },
              domain: { type: Type.STRING },
              type: { type: Type.STRING, enum: ["TRAINING", "EVALUATION"] },
              relevanceScore: { type: Type.NUMBER },
              relevanceReason: { type: Type.STRING }
            },
            required: ["title", "description", "goal", "type", "relevanceScore", "relevanceReason"]
          }
        } : {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING },
              relevanceScore: { type: Type.NUMBER },
              relevanceReason: { type: Type.STRING }
            },
            required: ["id", "relevanceScore", "relevanceReason"]
          }
        }
      }
    });

    const text = response.text ?? '[]';
    let matches: any = [];
    try {
      matches = JSON.parse(text);
    } catch (parseErr) {
      console.warn('Unable to parse scenario relevance response:', text);
      matches = [];
    }
    console.log('Raw matches from AI:', matches);
    
    if (generateSuggestions) {
      // For suggested scenarios, ensure they have unique IDs and all required fields
      const suggestions = matches.map((scenario: any, index: number) => {
        const rawScore = typeof scenario.relevanceScore === 'number'
          ? scenario.relevanceScore
          : parseFloat(String(scenario.relevanceScore ?? ''));
        const normalizedScore = Number.isFinite(rawScore)
          ? Math.max(0.1, Math.min(1, rawScore))
          : 0.8;

        return {
          ...scenario,
          id: `suggested-${Date.now()}-${index}`, // Generate unique IDs for suggested scenarios
          type: 'TRAINING',
          favoritedBy: {},
          relevanceScore: normalizedScore, // Ensure numerical relevance scores
          relevanceReason: scenario.relevanceReason || 'Generated based on company profile'
        };
      });
      console.log('Generated suggestions:', suggestions);
      return suggestions as RelatedScenario[];
    }
    
    // For matching existing scenarios, ensure we have all the scenario data and relevance information
    const relevantScenarios = matches
      .map((match: any) => {
        const id = match.id || match.scenarioId || match.identifier;
        return {
          ...match,
          id
        };
      })
      .map((match: any) => {
        const scenarioId = match.id;
        if (!scenarioId) {
          console.log('Match missing scenario ID, skipping:', match);
          return null;
        }
        const scenario = allScenarios.find(s => s.id === scenarioId);
        if (!scenario) {
          console.log('Could not find matching scenario for:', scenarioId);
          return null;
        }
        
        const rawScore = typeof match.relevanceScore === 'number'
          ? match.relevanceScore
          : parseFloat(String(match.relevanceScore ?? ''));
        // Ensure a minimum relevance score of 0.1 to prevent filtering
        // and clamp to maximum of 1.0 for consistency
        const normalizedScore = Number.isFinite(rawScore)
          ? Math.max(0.1, Math.min(1, rawScore))
          : 0.5;

        const result = {
          ...scenario,
          relevanceScore: normalizedScore,
          relevanceReason: match.relevanceReason || 'Matched based on scenario content'
        };
        console.log('Mapped scenario:', result);
        return result;
      })
      .filter((s: RelatedScenario | null): s is RelatedScenario => s !== null);
    
    console.log('Final relevant scenarios:', relevantScenarios);
    return relevantScenarios;
  } catch (error) {
    console.error("Error finding relevant scenarios:", error);
    return [];
  }
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
  targetAudience: string;    // Who it's for
  differentiation: string[]; // Why it's better / unique
  outcomes: string[];        // Tangible benefits/impact
  callToAction: string;      // Ask or next step
  pitches: {
    seconds30: string;       // 30s version
    seconds90: string;       // 90s version
  };
  slidePresentation?: {      // Professional slide deck outline
    slides: Array<{
      slideNumber: number;
      title: string;
      content: string[];     // Bullet points or key content
      speakerNotes?: string; // Optional presenter notes
    }>;
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
- Include a professional slide presentation outline (8-12 slides) suitable for a business pitch deck.
- The slide deck should follow standard pitch deck structure: Title/Hook, Problem, Solution, How It Works, Market/Audience, Competition/Differentiation, Outcomes/Benefits, Business Model (if applicable), Roadmap/Next Steps, Call to Action, and optional Q&A slide.
- Each slide should have a clear title, 3-5 bullet points or key content items, and optional speaker notes for the presenter.
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
            },
            slidePresentation: {
              type: Type.OBJECT,
              properties: {
                slides: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      slideNumber: { type: Type.NUMBER },
                      title: { type: Type.STRING },
                      content: { type: Type.ARRAY, items: { type: Type.STRING } },
                      speakerNotes: { type: Type.STRING }
                    },
                    required: ['slideNumber', 'title', 'content']
                  }
                }
              },
              required: ['slides']
            }
          },
          required: ['oneLiner','problem','solution','targetAudience','differentiation','outcomes','callToAction','pitches','slidePresentation']
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
      },
      slidePresentation: {
        slides: []
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
  
  // Add slide presentation if available
  if (ep.slidePresentation?.slides?.length) {
    lines.push('');
    lines.push('---');
    lines.push('');
    lines.push('# Slide Presentation Outline');
    lines.push('');
    
    ep.slidePresentation.slides.forEach(slide => {
      lines.push(`## Slide ${slide.slideNumber}: ${slide.title}`);
      lines.push('');
      
      if (slide.content?.length) {
        slide.content.forEach(point => {
          lines.push(`- ${point}`);
        });
      }
      
      if (slide.speakerNotes) {
        lines.push('');
        lines.push('**Speaker Notes:**');
        lines.push(slide.speakerNotes);
      }
      
      lines.push('');
    });
  }
  return lines.join('\n');
}

/**
 * Generate a chat response using conversation history with image and file support
 */
export async function generateChatResponse(
  userMessage: string,
  conversationHistory: Array<{ role: string; content: string }>,
  images?: string[],
  files?: Array<{ name: string; type: string; data: string }>
): Promise<string> {
  const systemInstruction = `You are a helpful AI assistant specializing in business strategy, product development, and AI automation. 
You provide clear, concise, and actionable advice. You can help with:
- Business strategy and planning
- Product requirements and specifications
- AI and automation solutions
- Market research and analysis
- Workflow optimization
- Technical architecture and design
- Document analysis and summarization
- Image analysis and description

Be professional, friendly, and insightful in your responses.`;

  try {
    // Build the conversation context
    const contents = conversationHistory.map(msg => ({
      role: msg.role === 'user' ? 'user' : 'model',
      parts: [{ text: msg.content }],
    }));

    // Prepare the current user message parts
    const currentParts: any[] = [{ text: userMessage }];
    
    // Add images if provided
    if (images && images.length > 0) {
      images.forEach(imageData => {
        // Extract base64 data and mime type from data URL
        const matches = imageData.match(/^data:([^;]+);base64,(.+)$/);
        if (matches) {
          currentParts.push({
            inlineData: {
              mimeType: matches[1],
              data: matches[2]
            }
          });
        }
      });
    }
    
    // Add file content as text if provided (for text-based files)
    if (files && files.length > 0) {
      files.forEach(file => {
        if (file.type.includes('text') || file.type.includes('json') || file.type.includes('csv')) {
          // Decode base64 text files
          const matches = file.data.match(/^data:[^;]+;base64,(.+)$/);
          if (matches) {
            try {
              const decodedContent = atob(matches[1]);
              currentParts.push({ text: `\n\n[File: ${file.name}]\n${decodedContent}` });
            } catch (e) {
              currentParts.push({ text: `\n\n[File: ${file.name} - could not read content]` });
            }
          }
        } else {
          currentParts.push({ text: `\n\n[Attached file: ${file.name} (${file.type})]` });
        }
      });
    }

    // Add the current user message
    contents.push({
      role: 'user',
      parts: currentParts,
    });

    const request: any = {
      model: 'gemini-2.0-flash-exp',
      contents,
      config: {
        systemInstruction,
      },
    };

    const result = await ai.models.generateContent(request);
    return result.text || '';
  } catch (error) {
    console.error('Chat generation error:', error);
    throw new Error('Failed to generate chat response');
  }
}

export async function generatePresentationWebsite(prompt: string): Promise<string> {
  const systemInstruction = `You are an expert web developer and designer specializing in creating high-impact sales presentations.
Your task is to generate a single-file HTML website that serves as a professional sales presentation.
The website should:
- Be fully responsive and modern.
- Use West Monroe branding (bold, clean, data-driven, professional).
- Include sections for Executive Summary, Company Analysis, Proposed Solutions, Roadmap, and ROI.
- Use Tailwind CSS via CDN for styling.
- Include interactive elements (e.g., smooth scrolling, simple animations) where appropriate.
- Be self-contained in a single HTML file (CSS and JS included).
- NOT require any external assets other than standard CDNs (like Tailwind or FontAwesome).
- Be ready to be opened in a browser directly.

The content should be based strictly on the provided prompt.`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-pro',
      contents: { parts: [{ text: prompt }] },
      config: {
        systemInstruction,
        responseMimeType: 'text/plain', // We want HTML code
      }
    });

    let html = response.text ?? '';
    // Clean up markdown code blocks if present
    html = html.replace(/^```html\n/, '').replace(/\n```$/, '');
    return html;
  } catch (error) {
    console.error('Error generating presentation website:', error);
    throw new Error('Failed to generate presentation website');
  }
}