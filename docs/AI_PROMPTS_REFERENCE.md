# AI Prompts Reference
## AI Operator Training Hub

**Version:** 1.0  
**Last Updated:** February 2, 2026  
**Purpose:** Comprehensive catalog of all AI prompts used in the application

---

## Table of Contents
1. [Company Research Prompts](#company-research-prompts)
2. [Scenario Relevance & Generation](#scenario-relevance--generation)
3. [Document Analysis Prompts](#document-analysis-prompts)
4. [Workflow Evaluation Prompts](#workflow-evaluation-prompts)
5. [PRD Generation Prompts](#prd-generation-prompts)
6. [Elevator Pitch Generation](#elevator-pitch-generation)
7. [Translation Prompts](#translation-prompts)
8. [Scenario Generation Prompts](#scenario-generation-prompts)
9. [Chat & Conversation Prompts](#chat--conversation-prompts)
10. [Presentation Generation](#presentation-generation)
11. [Mermaid Diagram Assistance](#mermaid-diagram-assistance)

---

## Company Research Prompts

### Location
- **File:** `src/services/geminiService.ts`
- **Function:** `researchCompany()`
- **Model:** Configurable (Gemini 2.5 Pro, Gemini 2.5 Flash, etc.)

### System Instruction
```
You are an expert business analyst and AI consultant. Research the given company and provide a comprehensive analysis including:
- Company overview and core business
- Industry analysis
- Key products/services
- Market challenges and opportunities
- Current market position and competitors
- Use cases for AI/automation
- Current AI implementation status
- Potential AI opportunities

Format the response as structured JSON matching the specified schema.
```

### Complete User Prompt with Context
```
Research and analyze [Company Name], focusing on their business operations and AI/automation opportunities.

[IF RFP CONTENT PROVIDED:]
Additionally, analyze this RFP document from the company:
[Full text content of RFP document - can be thousands of words]
```

### Example Complete Prompt
```
Research and analyze Acme Corporation, focusing on their business operations and AI/automation opportunities.

Additionally, analyze this RFP document from the company:
[Full RFP document content extracted from PDF/Word, including all sections, requirements, specifications, timelines, budget information, etc.]
```

### Response Schema
```json
{
  "name": "string",
  "description": "string",
  "industry": "string",
  "products": ["array of strings"],
  "challenges": ["array of strings"],
  "opportunities": ["array of strings"],
  "marketPosition": "string",
  "competitors": ["array of strings"],
  "useCases": ["array of strings"],
  "aiRelevance": {
    "current": "string",
    "potential": "string",
    "recommendations": ["array of strings"]
  },
  "lastUpdated": "number"
}
```

---

## Scenario Relevance & Generation

### Location
- **File:** `src/services/geminiService.ts`
- **Function:** `findRelevantScenarios()`
- **Model:** Gemini 2.5 Pro

### System Instruction (Matching Existing Scenarios)
```
You are an AI training consultant. Based on the company research provided, analyze the list of training scenarios and identify which ones are most relevant. Consider:
- Industry alignment
- Similar challenges/opportunities
- AI implementation needs
- Skill development opportunities
- How scenario value drivers align with company goals
- How scenario pain points match company challenges

Return a ranked list of relevant scenarios with explanations. Prioritize scenarios whose value drivers and pain points closely match the company's needs.
```

### Complete User Prompt (Matching)
```
Analyze these training scenarios and identify which ones would be most relevant and valuable for this company based on their profile, challenges, and opportunities.

Company Research:
{
  "name": "Acme Corporation",
  "description": "Leading manufacturing company specializing in industrial automation",
  "industry": "Manufacturing",
  "products": [
    "Industrial robots",
    "Automation systems",
    "Quality control equipment"
  ],
  "challenges": [
    "Manual quality inspection processes",
    "Inventory management inefficiencies",
    "Maintenance scheduling"
  ],
  "opportunities": [
    "AI-powered predictive maintenance",
    "Computer vision quality inspection",
    "Automated supply chain optimization"
  ],
  "marketPosition": "Market leader in industrial automation sector",
  "competitors": ["CompetitorA", "CompetitorB"],
  "useCases": [
    "Predictive equipment failure detection",
    "Automated defect detection",
    "Supply chain forecasting"
  ],
  "aiRelevance": {
    "current": "Basic automation systems without AI integration",
    "potential": "High potential for ML-powered predictive analytics and computer vision",
    "recommendations": [
      "Implement computer vision for quality control",
      "Deploy predictive maintenance algorithms",
      "Automate inventory optimization"
    ]
  },
  "lastUpdated": 1738540800000
}

Available Scenarios:
[
  {
    "id": "scenario-001",
    "title": "Automated Quality Inspection",
    "description": "Implement computer vision system for automated defect detection",
    "goal": "Reduce manual inspection time by 80%",
    "domain": "Manufacturing",
    "type": "TRAINING",
    "valueDrivers": "Cost reduction, Quality improvement, Faster throughput",
    "painPoints": "Manual inspection errors, Slow process, High labor costs",
    "createdBy": "user-123"
  },
  {
    "id": "scenario-002",
    "title": "Predictive Maintenance System",
    "description": "ML model to predict equipment failures before they occur",
    "goal": "Prevent 90% of unexpected downtime",
    "domain": "Operations",
    "type": "EVALUATION",
    "valueDrivers": "Reduced downtime, Cost savings, Extended equipment life",
    "painPoints": "Unexpected failures, Reactive maintenance, Lost production",
    "createdBy": "user-456"
  }
  // ... additional scenarios
]
```

### System Instruction (Generating New Suggestions)
```
You are an AI training consultant. Based on the company research provided, generate 2-3 new training scenario suggestions that would be valuable for this company. Consider:
- Industry specific challenges
- Company's current AI maturity
- Identified opportunities
- Skill gaps and development needs
- Value drivers that align with business goals
- Pain points that need to be addressed

Generate scenarios that are specific to their context and aligned with their goals. Include specific value drivers and pain points for each scenario.
```

### Complete User Prompt (Generating New Suggestions)
```
Based on this company analysis, generate 2-3 NEW training scenario suggestions that would help this company improve their AI and automation capabilities. Focus on their specific industry challenges and opportunities.

Company Research:
{
  "name": "Acme Corporation",
  "description": "Leading manufacturing company specializing in industrial automation",
  "industry": "Manufacturing",
  "products": [
    "Industrial robots",
    "Automation systems",
    "Quality control equipment"
  ],
  "challenges": [
    "Manual quality inspection processes taking 4 hours per batch",
    "Inventory management inefficiencies causing 15% stockouts",
    "Reactive maintenance leading to 20% unplanned downtime"
  ],
  "opportunities": [
    "AI-powered predictive maintenance could reduce downtime by 80%",
    "Computer vision quality inspection could reduce inspection time by 90%",
    "Automated supply chain optimization could reduce stockouts by 70%"
  ],
  "marketPosition": "Market leader controlling 35% of industrial automation sector",
  "competitors": ["Siemens AG", "ABB Ltd", "Rockwell Automation"],
  "useCases": [
    "Predictive equipment failure detection using sensor data",
    "Automated defect detection using computer vision",
    "Supply chain demand forecasting using ML models"
  ],
  "aiRelevance": {
    "current": "Basic PLC automation without AI integration, manual data analysis",
    "potential": "High potential: existing sensor infrastructure, large historical datasets, clear ROI opportunities",
    "recommendations": [
      "Pilot computer vision system on main production line",
      "Deploy predictive maintenance for critical equipment",
      "Implement ML-powered inventory optimization",
      "Establish data pipeline for real-time analytics"
    ]
  },
  "employeeCount": 2500,
  "website": "https://acmecorp.com",
  "lastUpdated": 1738540800000
}
```

### Response Schema (Suggestions)
```json
[
  {
    "id": "string",
    "title": "string",
    "description": "string",
    "goal": "string",
    "domain": "string",
    "type": "TRAINING or EVALUATION",
    "valueDrivers": "string",
    "painPoints": "string",
    "relevanceScore": "number (0-1)",
    "relevanceReason": "string"
  }
]
```

---

## Document Analysis Prompts

### 1. Document Category Analysis

#### Location
- **File:** `src/services/geminiService.ts`
- **Function:** `analyzeDocumentCategory()`
- **Model:** Gemini 2.0 Flash

#### System Instruction
```
You are an expert document analyst. Your task is to analyze the provided document and:
1. Categorize it into one of the following types: RFP, SOW, CONTRACT, PROPOSAL, REQUIREMENTS, TECHNICAL, FINANCIAL, OTHER
2. Extract a concise, meaningful title (max 50 characters) - NOT the filename
3. Provide a brief summary (2-3 sentences)
4. Identify 3-5 key points from the document

Category definitions:
- RFP: Request for Proposal documents seeking vendor bids
- SOW: Statement of Work defining project scope and deliverables
- CONTRACT: Legal agreements, terms and conditions
- PROPOSAL: Submitted proposals or bids
- REQUIREMENTS: Requirements documents, specifications
- TECHNICAL: Technical documentation, architecture docs, API specs
- FINANCIAL: Budget documents, financial reports, pricing
- OTHER: Any document that doesn't fit the above categories
```

#### Complete User Prompt
```
Analyze this document and categorize it.

Filename: Enterprise_RFP_Q1_2026.pdf

Document Content:
[First 15,000 characters of extracted document text]

Example:
REQUEST FOR PROPOSAL
Enterprise AI Platform Implementation

Issued by: XYZ Corporation
Issue Date: January 15, 2026
Response Deadline: March 1, 2026

1. EXECUTIVE SUMMARY
XYZ Corporation is seeking qualified vendors to implement a comprehensive AI platform
to enhance our customer service, supply chain, and business intelligence capabilities.
The selected vendor will be responsible for...

2. PROJECT OVERVIEW
2.1 Background
XYZ Corporation is a Fortune 500 company with $5B in annual revenue, operating in
25 countries with 10,000+ employees. We currently have limited AI capabilities and
seek to transform our operations through strategic AI implementation...

2.2 Objectives
- Reduce customer service response time by 60%
- Improve supply chain forecast accuracy to >95%
- Enable real-time business intelligence across all departments
- Achieve ROI within 18 months

3. SCOPE OF WORK
3.1 Phase 1: Customer Service AI (Months 1-6)
   - Implement conversational AI chatbot
   - Integrate with existing CRM (Salesforce)
   - Train on 100K+ historical support tickets
   - Deploy across web, mobile, and messaging platforms

3.2 Phase 2: Supply Chain Optimization (Months 4-9)
   - Deploy demand forecasting ML models
   - Integrate with SAP ERP system
   - Real-time inventory optimization
   - Automated reorder point calculations

[... content continues up to 15,000 character limit]
```

**Note:** The content is truncated to 15,000 characters for faster analysis while still providing sufficient context for accurate categorization.

#### Response Schema
```json
{
  "category": "enum[RFP, SOW, CONTRACT, PROPOSAL, REQUIREMENTS, TECHNICAL, FINANCIAL, OTHER]",
  "title": "string (max 50 chars)",
  "summary": "string (2-3 sentences)",
  "keyPoints": ["array of 3-5 strings"]
}
```

### 2. RFP Document Analysis

#### Location
- **File:** `src/services/geminiService.ts`
- **Function:** `analyzeRfpDocument()`
- **Model:** Gemini 2.5 Pro

#### System Instruction
```
You are an expert AI consultant analyzing an RFP (Request for Proposal) document.

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
- Note ANY project-specific AI opportunities
```

#### Complete User Prompt with Full RFP Content
```
Your primary task is to create a detailed project hierarchy from this RFP, breaking down all projects, sub-projects, and their relationships. Start by identifying the main projects, then map out all sub-projects and their dependencies. After that, analyze additional RFP details.

RFP Content:
[COMPLETE RFP DOCUMENT TEXT - Can be 50-200+ pages including:
- Executive Summary
- Project Overview and Objectives
- Scope of Work with all sub-projects
- Technical Requirements and Specifications
- Timeline and Milestones
- Budget and Cost Constraints
- Deliverables for each project phase
- Acceptance Criteria and Success Metrics
- Compliance and Regulatory Requirements
- Vendor Qualifications
- Submission Requirements
- All appendices and attachments

Example structure:
"REQUEST FOR PROPOSAL
Project: Enterprise AI Transformation Program

1. EXECUTIVE SUMMARY
XYZ Corporation seeks qualified vendors to implement a comprehensive AI transformation across three major business units...

2. PROJECT STRUCTURE
2.1 Main Project: Customer Service AI Enhancement
    2.1.1 Sub-project: Chatbot Development
    2.1.2 Sub-project: Voice AI Integration
    2.1.3 Sub-project: Analytics Dashboard

2.2 Main Project: Supply Chain Optimization
    2.2.1 Sub-project: Demand Forecasting
    2.2.2 Sub-project: Inventory Management
    2.2.3 Sub-project: Logistics Routing

3. TECHNICAL REQUIREMENTS
- Cloud infrastructure: AWS or Azure
- Security: SOC 2 Type II compliance required
- Integration: REST APIs with existing SAP system
..."]

Required format:
1. Start with a visual project hierarchy showing parent-child relationships
2. Then provide detailed analysis for each project and sub-project
3. Finally add program-level analysis

Remember: Project structure and relationships are the TOP priority.
```

#### Response Schema
```json
{
  "summary": "string - comprehensive RFP overview",
  "projectStructure": "string - detailed project breakdown",
  "detailedAnalysis": "string - in-depth requirements analysis",
  "timeline": "string - timeline information",
  "budget": "string - budget information",
  "requirements": "string - comprehensive requirements",
  "stakeholders": "string - stakeholder information",
  "successCriteria": "string - success criteria",
  "risks": "string - identified risks",
  "aiRecommendations": "string - AI implementation recommendations",
  "aiCapabilities": "string - required AI capabilities",
  "constraints": "string - constraints and limitations",
  "clarificationNeeded": "string - areas needing clarification"
}
```

### 3. General Document Analysis (with Gemini)

#### Location
- **File:** `src/services/geminiService.ts`
- **Function:** `analyzeDocumentWithGemini()`
- **Model:** Gemini 2.5 Pro

#### User Prompt
```
Analyze the following document and extract:
1. A clear, concise title for the document
2. The document type (e.g., Contract, Policy, Report, Procedure, Manual, etc.)
3. A brief summary/context of what this document is about (100-200 words)

Document file name: {fileName}

Document content:
{documentText}

Respond ONLY with a valid JSON object (no markdown, no code blocks):
{
  "title": "extracted title",
  "type": "document type",
  "context": "summary of the document"
}
```

---

## Workflow Evaluation Prompts

### Location
- **File:** `src/services/geminiService.ts`
- **Function:** `evaluateOperatorPerformance()`
- **Model:** Gemini 2.5 Flash

### System Instruction
```
You are an expert AI Business Process Consultant. Your task is to evaluate a user's proposed workflow for a given business task. The user will provide a text description of their workflow and may provide a visual diagram. Your evaluation should assess the clarity, efficiency, and logical soundness of the flow. Specifically, critique their decisions on what to automate with AI versus what to keep human-in-the-loop. Provide a quantitative score (1-10) and qualitative, constructive feedback to help them improve their design.
```

### Complete User Prompt with Full Context
```
Evaluate the following proposed workflow:
---
**Task Goal:** Automate customer support ticket routing and response generation
---
**User's Workflow Explanation:** 
1. Customer submits support ticket via email or web form
2. AI classifier analyzes ticket content and categorizes by:
   - Priority (High/Medium/Low)
   - Category (Technical/Billing/General)
   - Sentiment (Positive/Negative/Neutral)
3. Rule engine routes ticket to appropriate team based on classification
4. AI generates suggested response based on knowledge base and ticket history
5. Human agent reviews AI suggestion and can:
   - Accept and send immediately
   - Modify before sending
   - Escalate to senior agent
6. After resolution, AI learns from agent's modifications to improve future suggestions
7. System tracks metrics: resolution time, customer satisfaction, AI acceptance rate
---
[IF IMAGE PROVIDED:]
The user also provided the attached workflow diagram for context.
[Image data included as inline base64-encoded PNG/JPEG showing Mermaid flowchart or hand-drawn diagram]
---
Please provide your evaluation based on the criteria in your instructions.
```

### Image Data Format (when provided)
```javascript
{
  inlineData: {
    data: "base64_encoded_image_data_here...",
    mimeType: "image/png" // or "image/jpeg"
  }
}
```

### Response Schema
```json
{
  "score": "integer (1-10)",
  "feedback": "string - constructive feedback on workflow design"
}
```

---

## PRD Generation Prompts

### Location
- **File:** `src/services/geminiService.ts`
- **Function:** `generatePRD()`
- **Model:** Gemini 2.5 Pro

### Platform Guidance
The system includes platform-specific guidance for different targets:

```javascript
const platformGuidance = {
  MS365: 'Target Microsoft 365. Prefer Power Automate flows, Power Apps for UI, SharePoint/Dataverse for data, Outlook/Teams connectors, and Copilot Studio where appropriate.',
  
  GOOGLE: 'Target Google Workspace. Prefer Apps Script/Vertex AI, AppSheet for UI, Sheets/Drive for data, Gmail/Calendar/Chat integrations.',
  
  CUSTOM: 'Target a custom web application. Recommend a modern stack (e.g., React + Node/Cloud Functions + Firebase/Firestore) and any ML integration where helpful.',
  
  CUSTOM_PROMPT: 'Use custom prompt-based automation. There is no specific platform; tailor prompts to your chosen environment or API.',
  
  ASSISTANT: 'Target AI assistant integration. Design for conversational interfaces (e.g., chatbots) and leverage platforms like Dialogflow or Azure Bot Service.',
  
  COMBINATION: 'Combine custom prompts with assistant capabilities. Support both batch workflows and conversational interactions as needed.',
  
  POWER_APPS: 'Focus on Microsoft Power Apps for low-code application development, leveraging built-in connectors and custom components.',
  
  POWER_AUTOMATE: 'Design workflow automation using Microsoft Power Automate flows, integrating with Microsoft 365 and custom connectors.',
  
  POWER_BI: 'Implement data visualization and analytics solutions using Microsoft Power BI, connecting to various data sources.',
  
  POWER_VIRTUAL_AGENTS: 'Create chatbots and virtual agents using Microsoft Power Virtual Agents, integrating with Power Platform services.',
  
  APP_SHEETS: 'Build no-code applications using Google App Sheets, leveraging its integration with Google Workspace services.'
}
```

### System Instruction
```
You are a senior product manager. Produce a crisp, complete Product Requirements Document (PRD) based on the user goal, steps, and optional Mermaid flowchart. Keep scope pragmatic and shippable in 2-3 iterations. Use clear bullet points.

[IF MULTIPLE PLATFORMS:]
Multiple Platform Implementation: Generate separate implementation options for each platform. Format as "Option 1: [Platform Name]", "Option 2: [Platform Name]", etc. for each section that differs by platform.
```

### Complete User Content with Full Context
```
Inputs:
- Goal: Automate invoice processing from receipt to payment approval

- Steps:
1. Receive invoice via email attachment or portal upload
2. Extract data using OCR: vendor name, amount, date, line items, PO number
3. Validate extracted data against purchase order in ERP system
4. Flag discrepancies for manual review (price variance >5%, quantity mismatch, etc.)
5. Route approved invoices to appropriate manager based on:
   - Amount threshold ($0-1K: automatic, $1K-10K: manager, >$10K: director)
   - Department budget code
   - Vendor category
6. Send approval request with invoice preview and comparison to PO
7. If approved: Schedule payment in accounting system
8. If rejected: Notify accounts payable with rejection reason
9. Track metrics: processing time, approval rate, exception rate
10. Generate weekly summary report for finance team

[IF MERMAID PROVIDED:]
- Mermaid Flowchart:
graph TD
    A[Invoice Received] --> B[OCR Data Extraction]
    B --> C{Validation Check}
    C -->|Valid| D{Amount Check}
    C -->|Invalid| E[Manual Review Queue]
    D -->|< $1K| F[Auto-Approve]
    D -->|$1K-$10K| G[Manager Approval]
    D -->|> $10K| H[Director Approval]
    F --> I[Schedule Payment]
    G -->|Approved| I
    G -->|Rejected| J[Notify AP]
    H -->|Approved| I
    H -->|Rejected| J
    I --> K[Payment Processed]
    K --> L[Update Records]

- Target Platforms:
1. MS365: Target Microsoft 365. Prefer Power Automate flows, Power Apps for UI, SharePoint/Dataverse for data, Outlook/Teams connectors, and Copilot Studio where appropriate.
2. POWER_AUTOMATE: Design workflow automation using Microsoft Power Automate flows, integrating with Microsoft 365 and custom connectors.
3. CUSTOM: Target a custom web application. Recommend a modern stack (e.g., React + Node/Cloud Functions + Firebase/Firestore) and any ML integration where helpful.
```

### Response Schema
```json
{
  "title": "string",
  "overview": "string",
  "problemStatement": "string",
  "goals": ["array of strings"],
  "nonGoals": ["array of strings"],
  "usersAndPersonas": ["array of strings"],
  "requirements": {
    "functional": ["array of strings"],
    "nonFunctional": ["array of strings"]
  },
  "successMetrics": ["array of strings"],
  "risksAndMitigations": ["array of strings"],
  "milestones": ["array of strings"],
  "techPlan": "string - platform-specific plan"
}
```

---

## Elevator Pitch Generation

### Location
- **File:** `src/services/geminiService.ts`
- **Function:** `generateElevatorPitch()`
- **Model:** Gemini 2.5 Pro

### System Instruction
```
You are a pitch coach. Create a punchy, credible elevator pitch from the user's goal and workflow steps.

Rules:
- Be specific and concrete. Avoid fluff.
- Highlight audience, problem, solution, differentiation, and outcomes.
- Produce two variants: 30s and 90s.
- Keep jargon minimal.
- Include a professional slide presentation outline (8-12 slides) suitable for a business pitch deck.
- The slide deck should follow standard pitch deck structure: Title/Hook, Problem, Solution, How It Works, Market/Audience, Competition/Differentiation, Outcomes/Benefits, Business Model (if applicable), Roadmap/Next Steps, Call to Action, and optional Q&A slide.
- Each slide should have a clear title, 3-5 bullet points or key content items, and optional speaker notes for the presenter.

[IF MULTIPLE PLATFORMS:]
Multiple Platform Implementation: Mention that this solution can be implemented across {N} different platforms ({platforms}), providing flexibility for different technology stacks.

[IF SINGLE PLATFORM:]
Target Platform: This solution is designed for {platform}.
```

### Complete User Content
```
Inputs:
- Goal: Automate customer onboarding process to reduce time from weeks to days

- Steps:
1. Customer fills out digital intake form with company details, requirements, preferences
2. AI validates and enriches data: company size, industry classification, risk assessment
3. System generates customized contract based on service tier and requirements
4. Route contract to legal review if non-standard terms detected
5. Send contract for e-signature via DocuSign with automated reminders
6. Upon signature, AI creates customer record in CRM with all details
7. Provision access: create user accounts, assign licenses, configure permissions
8. AI generates personalized onboarding plan based on customer profile
9. Schedule kickoff call and send calendar invite with agenda
10. Assign customer success manager based on industry expertise and workload
11. Trigger automated welcome email sequence with resources and training links
12. Monitor onboarding progress and send alerts for any delays

[IF PLATFORMS PROVIDED:]
- Target Platforms: MS365, POWER_AUTOMATE, POWER_APPS
```

### Response Schema
```json
{
  "oneLiner": "string",
  "problem": "string",
  "solution": "string",
  "targetAudience": "string",
  "differentiation": ["array of strings"],
  "outcomes": ["array of strings"],
  "callToAction": "string",
  "pitches": {
    "seconds30": "string - 30 second pitch",
    "seconds90": "string - 90 second pitch"
  },
  "slidePresentation": {
    "slides": [
      {
        "slideNumber": "number",
        "title": "string",
        "content": ["array of strings - bullet points"],
        "speakerNotes": "string (optional)"
      }
    ]
  }
}
```

---

## Translation Prompts

### 1. Scenario Form Translation

#### Location
- **File:** `src/components/CreateScenarioForm.tsx`
- **Function:** `tryTranslate()`
- **Model:** Gemini 2.5 Flash

#### Complete User Prompt
```
Translate the following text to Spanish. Keep the meaning and tone, be concise, and return only the translated text:

Automate invoice processing from receipt to payment approval using OCR data extraction, automated validation against purchase orders, intelligent routing based on approval thresholds, and real-time tracking with exception handling for discrepancies.
```

#### Example Response
```
Automatizar el procesamiento de facturas desde la recepción hasta la aprobación de pago utilizando extracción de datos OCR, validación automática contra órdenes de compra, enrutamiento inteligente basado en umbrales de aprobación y seguimiento en tiempo real con manejo de excepciones para discrepancias.
```

#### Another Example (English to Spanish)
```
Translate the following text to Spanish. Keep the meaning and tone, be concise, and return only the translated text:

This workflow enables customer support teams to respond 3x faster by automating ticket classification, routing, and suggested response generation while maintaining human oversight for quality assurance.
```

**Temperature:** 0.2 (for consistency)

### 2. Training View Translation

#### Location
- **File:** `src/components/TrainingView.tsx`
- **Function:** `translateText()`
- **Model:** Gemini 2.5 Flash

#### Complete User Prompt
```
Translate the following text to English. Keep meaning and tone, be concise. Return only the translated text:

Este escenario de entrenamiento ayuda a los operadores a comprender cómo diseñar flujos de trabajo de IA efectivos para automatizar procesos empresariales complejos mientras mantienen el control humano apropiado en puntos de decisión críticos.
```

#### Example Response
```
This training scenario helps operators understand how to design effective AI workflows to automate complex business processes while maintaining appropriate human control at critical decision points.
```

**Temperature:** 0.2 (for consistency)

---

## Scenario Generation Prompts

### 1. Public Landing Page Examples

#### Location
- **File:** `src/components/PublicLanding.tsx`
- **Function:** `generateExample()`
- **Model:** Gemini 2.5 Flash

#### Complete User Prompt Examples by Domain

**Sales Domain:**
```
Provide a concise (<=110 words) real-world business problem in the Sales domain that would benefit from AI workflow automation. Focus only on the pain and current inefficiencies; do not propose a solution. Start directly with the problem (no heading).
```

**Example Response:**
```
B2B sales teams spend 4-5 hours daily on manual lead qualification, reviewing company websites, LinkedIn profiles, and news to determine if prospects match ideal customer profiles. This manual research creates a 3-day lag between lead assignment and first outreach, causing 35% of hot leads to go cold. Sales reps waste time on unqualified prospects while high-value opportunities slip through. Deal scoring is inconsistent across reps, leading to misprioritized pipelines. Territory managers lack real-time visibility into lead quality and distribution, making it impossible to balance workloads effectively or identify coaching opportunities.
```

**Customer Support Domain:**
```
Provide a concise (<=110 words) real-world business problem in the Customer Support domain that would benefit from AI workflow automation. Focus only on the pain and current inefficiencies; do not propose a solution. Start directly with the problem (no heading).
```

**Example Response:**
```
Customer support teams receive 500+ tickets daily across email, chat, and phone, requiring 2-3 hours of manual triage each morning. Tickets often get misrouted between L1, L2, and specialist teams, causing 24-hour delays and customer frustration. Agents spend 40% of their time searching knowledge bases and past tickets for solutions instead of helping customers. Priority assessment is subjective, leading to VIP customers waiting while low-priority issues get addressed first. Response times average 8 hours for email tickets, well below the 2-hour SLA. Management lacks visibility into trending issues or agent performance.
```

**Temperature:** 0.5

**Example Domains:** Sales, Operations, HR, Finance, Customer Support

### 2. Domain-Specific Workflow Generation

#### Location
- **File:** `src/components/CreateScenarioForm.tsx`
- **Function:** `handleGenerateExample()`
- **Model:** Gemini 2.5 Flash

#### Domain-Specific Prompts
Each domain has multiple prompt variations for diversity:

**Sales:**
- Create a workflow for automating lead scoring and qualification in a B2B sales environment
- Design a process for automated follow-up sequences after sales demos
- Build a system for territory assignment and opportunity distribution
- Create a workflow for competitive analysis and proposal customization

**HR:**
- Design an automated candidate screening and interview scheduling system
- Create a workflow for employee onboarding and document collection
- Build a performance review reminder and feedback collection process
- Design a system for tracking PTO requests and coverage arrangements

**Finance:**
- Create an automated expense report processing and approval workflow
- Design a system for monthly financial close and reconciliation tasks
- Build a workflow for vendor payment approvals and processing
- Create an automated budget variance reporting system

**Operations:**
- Design a workflow for supply chain disruption monitoring and response
- Create a system for quality control issue tracking and resolution
- Build an automated inventory reorder and vendor notification process
- Design a workflow for maintenance scheduling and equipment tracking

**Logistics:**
- Create an automated shipment tracking and customer notification system
- Design a workflow for route optimization and delivery scheduling
- Build a system for warehouse capacity planning and allocation
- Create a process for freight audit and carrier performance tracking

**Healthcare:**
- Design a patient appointment reminder and preparation workflow
- Create a system for medical record requests and transfer processing
- Build a workflow for insurance verification and pre-authorization
- Design an automated lab result notification and follow-up system

**Manufacturing:**
- Create a workflow for production line efficiency monitoring and alerts
- Design a system for quality defect tracking and root cause analysis
- Build an automated materials planning and procurement process
- Create a workflow for equipment downtime tracking and maintenance scheduling

**Legal:**
- Design a contract review and approval workflow with stakeholder routing
- Create a system for legal document template management and generation
- Build a workflow for compliance deadline tracking and notifications
- Design an automated client intake and conflict checking process

**Procurement:**
- Create a workflow for vendor evaluation and selection processes
- Design a system for purchase requisition approval and routing
- Build an automated contract renewal notification system
- Create a workflow for spend analysis and budget tracking

**Marketing:**
- Design a workflow for content approval and publication scheduling
- Create a system for lead nurturing campaign automation
- Build a workflow for event planning and attendee management
- Design an automated competitor monitoring and alert system

**IT:**
- Create a workflow for incident escalation and resolution tracking
- Design a system for software license management and renewal alerts
- Build an automated user access provisioning and deprovisioning process
- Create a workflow for security vulnerability assessment and patching

**Customer Support:**
- Design a workflow for ticket routing based on customer tier and issue type
- Create a system for automated knowledge base article suggestions
- Build a workflow for customer satisfaction follow-up and feedback collection
- Design an escalation process for high-priority customer issues

#### Complete User Prompt Example (Sales Domain)
```
Create a workflow for automated lead scoring and qualification in a B2B sales environment. You must respond with EXACTLY this format:

TITLE: "A specific, actionable title for this workflow"
CURRENT_PROCESS: "A detailed description of the current manual process with specific pain points and inefficiencies"
DESIRED_OUTCOME: "Concrete, measurable outcomes and success criteria that would be achieved"
VALUE_DRIVERS: "3-5 key business value drivers (e.g., cost savings, time reduction, quality improvement)"
PAIN_POINTS: "3-5 specific pain points and problems this workflow will solve"

Make this example specific to Sales with realistic details, metrics, and business impact. Avoid generic responses.
```

#### Example AI Response
```
TITLE: "Automated B2B Lead Scoring and Real-Time Qualification Workflow"

CURRENT_PROCESS: "Sales development reps manually research each inbound lead by reviewing company websites, LinkedIn profiles, recent news, and firmographic data from multiple sources. This process takes 15-20 minutes per lead, creating a 24-48 hour delay before first contact. Scoring criteria are applied inconsistently across reps, leading to 40% of high-value leads being initially classified as low priority. Territory assignment happens through manual spreadsheet management, causing frequent duplicates and gaps in coverage. The team processes 200+ leads weekly but can only deeply qualify 30-40 due to time constraints."

DESIRED_OUTCOME: "Achieve instant lead scoring upon form submission with 95%+ accuracy in predicting conversion potential. Reduce time-to-first-contact from 48 hours to under 2 hours for high-priority leads. Enable SDRs to qualify 150+ leads weekly (4x improvement) by eliminating manual research. Increase sales-qualified lead (SQL) conversion rate from 12% to 25% through better targeting. Provide real-time lead quality dashboards showing scoring trends, source performance, and rep workload distribution."

VALUE_DRIVERS: "Reduce cost per qualified lead by 60% through automation, Increase SQL conversion rate from 12% to 25%, Accelerate time-to-first-contact by 95% (48 hours to 2 hours), Enable 4x lead processing capacity per SDR, Improve forecast accuracy with predictive lead scores"

PAIN_POINTS: "Manual research takes 15-20 minutes per lead causing massive delays, Inconsistent scoring criteria leads to 40% misclassification rate, High-value leads go cold during 48-hour qualification lag, SDRs waste time on leads that will never convert, Territory managers lack real-time visibility into pipeline health"
```

#### Another Complete Example (HR Domain)
```
Design an automated candidate screening and interview scheduling system. You must respond with EXACTLY this format:

TITLE: "A specific, actionable title for this workflow"
CURRENT_PROCESS: "A detailed description of the current manual process with specific pain points and inefficiencies"
DESIRED_OUTCOME: "Concrete, measurable outcomes and success criteria that would be achieved"
VALUE_DRIVERS: "3-5 key business value drivers (e.g., cost savings, time reduction, quality improvement)"
PAIN_POINTS: "3-5 specific pain points and problems this workflow will solve"

Make this example specific to HR with realistic details, metrics, and business impact. Avoid generic responses.
```

**Temperature:** 0.4

### 3. Bulk Workflow Generation (Admin)

#### Location
- **File:** `src/components/BusinessDomainManagement.tsx`
- **Function:** `handleGenerateWorkflows()`
- **Model:** Gemini 2.5 Flash

#### Complete User Prompt Example
```
Generate 6 unique and complete workflow automation use cases for the Customer Support domain. For each use case, provide ALL of the following fields:

For each of the 6 use cases, return in EXACTLY this format:

USE_CASE_1:
TITLE: [Specific, actionable title for this workflow - one sentence]
PROCESS: [Short process name, 5 words or less, like "Invoice Processing" or "Lead Qualification"]
CURRENT_PROCESS: [Detailed description of the current manual process with specific pain points and inefficiencies - 2-3 sentences with realistic details and metrics]
DESIRED_OUTCOME: [Concrete, measurable outcomes and success criteria - 2-3 sentences with specific improvements and metrics]
VALUE_DRIVERS: [List 3-5 key business value drivers separated by commas, like: Reduce processing time by 70%, Eliminate manual data entry, Improve accuracy to 99.5%, Cut operational costs by $50K annually]
PAIN_POINTS: [List 3-5 specific pain points separated by commas, like: High error rate in manual data entry, 8-hour turnaround time, Lack of real-time visibility, Staff burnout from repetitive tasks]

USE_CASE_2:
[repeat format]

...through USE_CASE_6

Make each use case specific to Customer Support with realistic details, metrics, and business impact. Focus on different processes within Customer Support to ensure variety and coverage of common automation opportunities.
```

#### Example AI Response (First 2 of 6)
```
USE_CASE_1:
TITLE: Intelligent Ticket Routing with AI-Powered Priority Classification and Automated Assignment to Specialized Support Teams
PROCESS: Ticket Routing & Classification
CURRENT_PROCESS: Support managers manually review and route 500+ incoming tickets daily across email, chat, web forms, and phone transcripts. Each ticket requires 3-5 minutes of review to determine priority (urgent/high/medium/low), category (technical/billing/account/general), and appropriate team assignment. Misrouting occurs in 25% of cases, requiring reassignment and causing average 4-hour delays. VIP customer tickets often aren't identified quickly, leading to SLA violations and escalations. The team uses basic keyword filters that miss context, resulting in technical issues going to billing team and vice versa.
DESIRED_OUTCOME: Achieve 95%+ accurate automatic ticket classification and routing within 30 seconds of ticket creation. Reduce misrouting rate from 25% to under 3% through context-aware AI analysis. Automatically identify and flag VIP customers, high-value accounts, and urgent issues for immediate escalation. Provide real-time routing analytics showing ticket distribution, queue depths, and team utilization. Enable support managers to focus on complex escalations instead of spending 4+ hours daily on triage.
VALUE_DRIVERS: Reduce ticket routing time from 3-5 minutes to under 30 seconds (95% improvement), Decrease misrouting rate from 25% to 3% saving 8 hours daily in rework, Eliminate 100% of VIP customer SLA violations through instant priority flagging, Enable managers to redeploy 4 hours daily from triage to customer escalations, Improve first-response time by 60% through accurate initial routing
PAIN_POINTS: Manual triage of 500+ daily tickets consumes 4+ manager hours, 25% misrouting rate causes delays and customer frustration, VIP customer tickets not identified quickly leading to SLA violations, Keyword-based filters miss contextual nuances causing routing errors, Support managers have no time for strategic work or escalation handling

USE_CASE_2:
TITLE: Automated Knowledge Base Search with AI-Generated Response Suggestions and Real-Time Answer Validation
PROCESS: Response Generation & KB Search
CURRENT_PROCESS: Support agents spend 40% of their time (3+ hours daily) manually searching through a 5,000+ article knowledge base, past ticket histories, and internal documentation to find solutions. Search yields poor results due to inconsistent terminology, forcing agents to try multiple queries or escalate to senior staff. Each knowledge base search takes 5-8 minutes, during which customers wait. New agents take 4-6 weeks to become proficient with KB navigation. Common questions get answered inconsistently across the team, leading to customer confusion when they contact support multiple times.
DESIRED_OUTCOME: Provide instant AI-generated response suggestions based on ticket content, past successful resolutions, and KB articles with 85%+ agent acceptance rate. Reduce average knowledge search time from 5-8 minutes to under 30 seconds through semantic search and automatic answer retrieval. Enable new agents to reach productivity in 1-2 weeks instead of 4-6 weeks by providing guided response suggestions. Ensure response consistency across the team with 95%+ adherence to approved solutions. Track which KB articles are most/least useful to guide content improvement efforts.
VALUE_DRIVERS: Reduce resolution time by 40% through instant answer suggestions, Cut new agent training time from 6 weeks to 2 weeks (67% reduction), Improve response consistency from 60% to 95% across all agents, Enable agents to handle 50% more tickets daily through faster search, Identify and update 200+ outdated KB articles through usage analytics
PAIN_POINTS: Agents waste 3+ hours daily searching poorly organized knowledge base, Inconsistent search results require multiple query attempts and escalations, New agents take 6 weeks to learn KB navigation causing training burden, Common questions get different answers from different agents, No visibility into which KB articles are actually helpful vs outdated

[...USE_CASE_3 through USE_CASE_6 would follow same format]
```

**Temperature:** 0.7

---

## Chat & Conversation Prompts

### Location
- **File:** `src/services/geminiService.ts`
- **Function:** `generateChatResponse()`
- **Model:** Gemini 2.0 Flash Exp

### System Instruction
```
You are a helpful AI assistant specializing in business strategy, product development, and AI automation. 
You provide clear, concise, and actionable advice. You can help with:
- Business strategy and planning
- Product requirements and specifications
- AI and automation solutions
- Market research and analysis
- Workflow optimization
- Technical architecture and design
- Document analysis and summarization
- Image analysis and description

Be professional, friendly, and insightful in your responses.
```

### Complete Conversation Context Structure

The system builds a full conversation history array with all messages:

```javascript
// Example conversation history passed to the model:
const contents = [
  {
    role: 'user',
    parts: [{ text: 'Can you help me analyze this business problem?' }]
  },
  {
    role: 'model',
    parts: [{ text: 'Of course! I\'d be happy to help analyze your business problem. Please describe the situation, including any relevant context like your industry, the specific challenge you\'re facing, and what outcomes you\'re hoping to achieve.' }]
  },
  {
    role: 'user',
    parts: [{ text: 'Our manufacturing company has a 20% defect rate in quality control. Manual inspection takes 4 hours per batch.' }]
  },
  {
    role: 'model',
    parts: [{ text: 'A 20% defect rate is significant. Let me analyze this:\n\n1. Root Causes to Investigate:\n- Inconsistent manual inspection standards\n- Inspector fatigue over 4-hour shifts\n- Late detection in production process\n\n2. Automation Opportunity:\nComputer vision systems can:\n- Inspect 100% of products in real-time\n- Achieve >99% accuracy\n- Reduce inspection time by 95%\n\n3. Recommended Approach:\n- Pilot on one product line\n- Train model on defect images\n- Keep human oversight initially\n\nWould you like me to outline a detailed implementation plan?' }]
  },
  {
    role: 'user',
    parts: [
      { text: 'Yes, and here\'s an image of our current process flow' },
      {
        inlineData: {
          mimeType: 'image/png',
          data: 'iVBORw0KGgoAAAANSUhEUgAA...[base64 continues]'
        }
      }
    ]
  }
];
```

### Current User Message with Images and Files

When the user sends a new message with attachments:

```javascript
// Current message parts array:
currentParts = [
  { text: 'Based on this workflow diagram and the attached requirements doc, can you suggest improvements?' },
  
  // Image attachment(s)
  {
    inlineData: {
      mimeType: 'image/jpeg',
      data: '/9j/4AAQSkZJRgABAQEAYABgAAD...[base64 image data]'
    }
  },
  
  // Text file content
  { 
    text: '\n\n[File: requirements.txt]\nFunctional Requirements:\n1. System must process 1000 invoices per day\n2. Accuracy must exceed 98%\n3. Average processing time under 30 seconds\n4. Support PDF, Word, and image formats\n5. Integrate with SAP ERP system\n...' 
  },
  
  // JSON file content
  {
    text: '\n\n[File: config.json]\n{\n  "thresholds": {\n    "autoApprove": 1000,\n    "managerApproval": 10000\n  },\n  "departments": ["Sales", "Marketing", "Operations"]\n}'
  },
  
  // Binary file (not readable as text)
  { text: '\n\n[Attached file: data.xlsx (application/vnd.openxmlformats-officedocument.spreadsheetml.sheet)]' }
];

// This gets added to conversation history:
contents.push({
  role: 'user',
  parts: currentParts
});
```

### Complete Request Structure
```javascript
const request = {
  model: 'gemini-2.0-flash-exp',
  contents: contents, // Full conversation history array shown above
  config: {
    systemInstruction: 'You are a helpful AI assistant specializing in business strategy, product development, and AI automation...'
  }
};
```

---

## Presentation Generation

### Location
- **File:** `src/services/geminiService.ts`
- **Function:** `generatePresentationWebsite()`
- **Model:** Gemini 2.5 Pro

### System Instruction
```
You are an expert web developer and designer specializing in creating high-impact sales presentations.
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

The content should be based strictly on the provided prompt.
If branding guidelines are provided, strictly adhere to the color palette, typography, and design principles described.
```

### Complete User Prompt with Full Context
```
[USER'S PRESENTATION CONTENT REQUEST:]
Create a professional sales presentation website for Acme Manufacturing showcasing our AI-powered quality inspection solution.

Include these sections:
1. Executive Summary - Overview of the solution and key benefits
2. The Problem - Current manual inspection challenges (20% defect rate, 4-hour inspection time)
3. Our Solution - Computer vision-powered automated inspection system
4. How It Works - Technical approach with ML model, camera integration, real-time alerts
5. ROI Analysis - Cost savings, efficiency gains, quality improvements
6. Implementation Roadmap - 3-phase deployment over 6 months
7. Success Stories - Reference customers and results
8. Next Steps - CTA for pilot program

Target audience: Manufacturing executives and operations managers
Tone: Professional, data-driven, confidence-inspiring

[IF BRANDING CONTEXT PROVIDED:]

BRANDING GUIDELINES:
# West Monroe Brand Guidelines

## Color Palette
- Primary: #000033 (wm-blue) - Deep navy blue for headers and primary elements
- Accent: #0045FF (wm-accent) - Bright blue for interactive elements and highlights
- Secondary: #F500A0 (wm-pink) - Bold pink for call-to-actions and emphasis
- Tertiary: #F2E800 (wm-yellow) - Vibrant yellow for alerts and highlights
- Neutral: #CBD2DA (wm-neutral) - Light gray for backgrounds and subtle elements

## Typography
- Headings: Inter font family, bold weight (700), large sizes (32-48px)
- Body: Inter font family, regular weight (400), 16-18px
- Use clear hierarchy with consistent spacing

## Design Principles
- Bold and confident: Use strong colors and clear statements
- Data-driven: Include charts, metrics, and quantified results
- Professional: Clean layouts, generous white space, professional imagery
- Modern: Contemporary design patterns, smooth animations, responsive

## Component Guidelines
- Cards: White background, subtle shadow, rounded corners (8px)
- Buttons: wm-accent or wm-pink background, white text, 12px padding
- Sections: Full-width, alternating background colors (white/wm-neutral)
- Charts: Use brand colors, clear labels, interactive when possible

[IF BRANDING FILES PROVIDED:]
Please use the attached branding documents to guide the visual style of the presentation.

[Files attached as base64-encoded data]
File 1: brand-guidelines.pdf (mimeType: application/pdf, data: JVBERi0xLjQKJeLj...)
File 2: logo.svg (mimeType: image/svg+xml, data: PHN2ZyB4bWxucz0iaH...)
```

### Parts Array Structure
```javascript
const parts = [
  { 
    text: '[Full user prompt text shown above including presentation content request]'
  },
  { 
    text: '\n\nBRANDING GUIDELINES:\n[Complete branding context with color codes, typography, design principles]'
  },
  {
    inlineData: {
      mimeType: 'application/pdf',
      data: 'JVBERi0xLjQKJeLjz9MKMyAwIG9i...[base64 PDF data]'
    }
  },
  {
    inlineData: {
      mimeType: 'image/svg+xml',
      data: 'PHN2ZyB4bWxucz0iaHR0cDovL3...[base64 SVG data]'
    }
  }
];
```

### Response Format
Plain text containing complete HTML code (no markdown wrapping)

---

## Mermaid Diagram Assistance

### Location
- **File:** `src/services/geminiService.ts`
- **Function:** `generateText()`
- **Model:** Gemini 2.5 Flash

### System Instruction (for Workflow Assistance)
```
You are an AI workflow assistant. Your task is to help explain workflow processes clearly and comprehensively. If a workflow diagram is provided, carefully analyze it and incorporate its details into your explanation. Pay special attention to:
- The sequence and dependencies between steps
- Decision points and conditional flows
- Integration points between AI and human tasks
- Data flows and handoffs between systems
- Error handling and edge cases
```

### User Prompt (with Image)
```
Based on the provided workflow diagram and considering all its details, {prompt}
```

### User Prompt (without Image)
```
{prompt}
```

**Configuration Options:**
- Temperature: configurable (default varies by use case)
- Candidate Count: configurable

---

## Gamma Presentation Generation

### Location
- **File:** `src/components/CompanyResearchContent.tsx`
- **Function:** `handleGeneratePresentation()`
- **Uses:** Gamma API via `gammaService.ts`

### Complete Presentation Text Template with Real Data

This is the exact markdown text sent to Gamma API for presentation generation:

```markdown
# AI Automation Solutions Presentation
## Acme Manufacturing Corporation

---

## Executive Summary

This presentation showcases AI automation opportunities and workflow implementations for Acme Manufacturing Corporation.

**Company Overview:**
- Industry: Manufacturing - Industrial Automation
- Employee Count: 2,500
- Website: https://acmecorp.com

**AI Readiness Score:** 8.5/10

**Analysis Summary:**
Acme Manufacturing Corporation is a leading industrial automation company with strong potential for AI-powered workflow optimization. Current manual processes in quality control, maintenance scheduling, and inventory management present significant automation opportunities. The company has established infrastructure and data collection systems that create favorable conditions for AI implementation.

---

## Target Business Domains

We've identified and analyzed 4 key business domains for AI automation:

- **Manufacturing**
- **Operations**
- **Supply Chain**
- **Quality Assurance**

These domains represent areas where AI workflow automation can deliver significant value and efficiency gains through computer vision, predictive analytics, and intelligent process automation.

---

## Manufacturing Domain

| Priority | Core Process | Potential Agentic AI Use Cases | Detailed Use Case Description | Demo Published URL |
|----------|--------------|--------------------------------|-------------------------------|--------------------|
| 1 | Automated Quality Inspection | Computer vision-powered defect detection system for real-time quality assurance | Completed 15 time(s) with 94% success rate. Workflow automates visual inspection using trained ML model, reduces inspection time from 4 hours to 15 minutes per batch, flags defects with 98% accuracy. | https://example.com/demo/quality-inspection |
| 2 | Production Line Optimization | AI-driven production scheduling and resource allocation for maximum throughput | Completed 8 time(s) with 87% success rate. Optimizes production schedules based on order priority, machine availability, and material constraints. Improved on-time delivery by 35%. | Not published |
| 3 | Equipment Monitoring & Alerts | Real-time anomaly detection for production equipment with predictive maintenance | Completed 12 time(s) with 91% success rate. Monitors sensor data from 50+ machines, predicts failures 72 hours in advance, reduced unplanned downtime by 60%. | https://example.com/demo/equipment-monitoring |

### Value
Manufacturing workflows offer high value potential through faster defect detection (95% time reduction), reduced manual inspection labor ($200K annual savings), improved product quality (98% accuracy vs 82% manual), and decreased downtime (60% reduction). The solutions enable 3 proven processes that can benefit from immediate AI automation deployment.

### Feasibility
Feasibility is strong, supported by 15+ successful workflow executions and repeatable patterns across production lines. Existing camera infrastructure and sensor networks provide necessary data inputs. Solutions can be implemented incrementally starting with pilot production line with minimal disruption.

### Readiness
Readiness is high, with demonstrated capability through 35 total completed implementations across 3 workflows. Team has hands-on experience with computer vision deployment, ML model training, and production integration. Clear ROI demonstrated through pilot programs.

---

## Operations Domain

| Priority | Core Process | Potential Agentic AI Use Cases | Detailed Use Case Description | Demo Published URL |
|----------|--------------|--------------------------------|-------------------------------|--------------------|
| 1 | Predictive Maintenance System | ML-powered equipment failure prediction using sensor data and maintenance history | Completed 18 time(s) with 92% success rate. Analyzes vibration, temperature, and performance metrics to predict failures 48-72 hours in advance. Prevented $500K in emergency repairs. | https://example.com/demo/predictive-maintenance |
| 2 | Workforce Scheduling | AI-driven shift planning optimizing skills, availability, and production demands | Completed 6 time(s) with 83% success rate. Automated scheduling for 200+ workers across 3 shifts, considering certifications, preferences, and workload. Reduced scheduling time from 8 hours to 30 minutes. | Not published |

### Value
Operations workflows deliver value through minimized unplanned downtime (80% reduction), optimized maintenance costs ($500K annual savings), improved workforce utilization (25% efficiency gain), and better resource allocation. Solutions address 2 critical operational processes with proven automation patterns.

### Feasibility
Feasibility is strong with 18+ successful executions of predictive maintenance workflows. Existing SCADA systems and maintenance logs provide comprehensive historical data. Integration with current CMMS system is straightforward via REST APIs.

### Readiness
Readiness is high with 24 total workflow executions demonstrating operational maturity. Maintenance team trained on AI insights interpretation. Clear success metrics established and consistently achieved across implementations.

---

## Supply Chain Domain

| Priority | Core Process | Potential Agentic AI Use Cases | Detailed Use Case Description | Demo Published URL |
|----------|--------------|--------------------------------|-------------------------------|--------------------|
| 1 | Demand Forecasting | ML model predicting product demand using historical sales, market trends, and seasonality | Completed 10 time(s) with 89% success rate. Forecast accuracy improved from 72% to 94%, reduced stockouts by 65%, optimized inventory carrying costs by $300K annually. | https://example.com/demo/demand-forecast |
| 2 | Inventory Optimization | Automated reorder point calculation and purchase order generation | Completed 7 time(s) with 86% success rate. Maintains optimal inventory levels for 500+ SKUs, automated 90% of routine purchase orders, reduced excess inventory by 40%. | Not published |

### Value
Supply chain workflows reduce stockout incidents (65% reduction), optimize inventory levels ($300K carrying cost savings), improve forecast accuracy (72% to 94%), and automate procurement (90% of orders). Solutions cover 2 high-impact supply chain processes.

### Feasibility
Feasibility is moderate to strong with 10 successful forecasting implementations. Historical sales data (5+ years) provides solid training foundation. Integration with existing ERP (SAP) requires custom connector development but well-documented APIs available.

### Readiness
Readiness is moderate with 17 total executions. Supply chain team familiar with forecast models but needs training on AI-generated insights interpretation. Pilot program demonstrated clear value, building confidence for broader rollout.

---

## Domain Stack Ranking

Strategic prioritization of business domains for AI automation initiatives based on automation potential, business impact, and implementation readiness.

| Rank | Domain | FTE Opportunity | Justification for Ranking |
|------|--------|-----------------|---------------------------|
| 1 | Manufacturing | 1.5 FTE | Highest execution count (35 completions), proven 94% success rate, clear ROI ($200K annual savings), strong readiness with trained team, existing infrastructure supports immediate scale |
| 2 | Operations | 1.25 FTE | Strong track record (24 completions), 92% success rate, substantial cost avoidance ($500K in prevented repairs), high business impact through downtime reduction, well-established integration patterns |
| 3 | Supply Chain | 1.0 FTE | Moderate execution history (17 completions), 89% success rate, measurable financial impact ($300K inventory optimization), requires some ERP integration work but clear path forward |
| 4 | Quality Assurance | 0.5 FTE | Emerging domain with 8 completions, 88% success rate, complements Manufacturing initiatives, provides additional quality control layer, can leverage existing computer vision infrastructure |

### Key Insights
- Domains ranked by combination of workflow execution maturity (completion count), demonstrated success rates, quantified business impact, and implementation readiness
- FTE estimates based on workflow complexity, automation coverage, and expected time savings (1 FTE = 2,080 hours annually)
- Top-ranked domains (Manufacturing, Operations) show stronger near-term ROI (6-9 month payback) and lower implementation risk due to proven patterns
- Manufacturing domain leads with 35 total executions, highest success rate (94%), and most mature team capabilities
- Operations domain shows highest cost avoidance potential ($500K+) through predictive maintenance
- Supply Chain requires moderate ERP integration effort but delivers strong inventory optimization benefits
- Quality Assurance provides strategic complement to Manufacturing with shared infrastructure

---

## Implementation Roadmap

### Phase 1: Quick Wins (0-3 months)
**Focus:** Manufacturing domain - Deploy automated quality inspection and equipment monitoring workflows

**Deliverables:**
- Pilot computer vision quality inspection on Line 3 (highest volume)
- Deploy predictive maintenance for 10 critical machines
- Train 15 operators on AI-assisted workflows
- Establish baseline metrics and KPI tracking

**Expected Outcomes:**
- 60% reduction in manual inspection time
- 50% decrease in unplanned equipment downtime
- $80K cost savings in first quarter
- Validated approach for Phase 2 expansion

### Phase 2: Scale & Optimize (3-6 months)
**Focus:** Expand Manufacturing coverage + Launch Operations domain workflows

**Deliverables:**
- Scale quality inspection to all 5 production lines
- Expand predictive maintenance to 50+ machines
- Implement workforce scheduling optimization
- Deploy operations monitoring dashboard
- Refine ML models based on Phase 1 learnings

**Expected Outcomes:**
- 95% quality inspection automation across facility
- $150K cumulative quarterly savings
- 80% reduction in scheduling labor
- Established CoE (Center of Excellence) for AI workflows

### Phase 3: Enterprise Deployment (6-12 months)
**Focus:** Supply Chain integration + Quality Assurance + Organization-wide adoption

**Deliverables:**
- Deploy demand forecasting and inventory optimization
- Complete ERP (SAP) integration
- Implement quality assurance workflow suite
- Comprehensive training program (100+ employees)
- Enterprise monitoring and continuous improvement framework
- Executive dashboard with ROI tracking

**Expected Outcomes:**
- 90% forecast accuracy across all product lines
- 65% reduction in stockouts
- $500K+ total annual savings realized
- Full-stack AI automation platform operational
- Scalable patterns for future domain expansion

---

## Implementation Summary

**Total Workflows Analyzed:** 8 distinct automation workflows across 4 business domains
**Domains Covered:** Manufacturing (3 workflows), Operations (2 workflows), Supply Chain (2 workflows), Quality Assurance (1 workflow)
**Total Executions:** 84 completed workflow runs demonstrating proven patterns and consistent results
**Average Success Rate:** 90% across all workflows (range: 83-94%)
**Projected Annual Savings:** $1M+ through efficiency gains, cost avoidance, and quality improvements
**Implementation Timeline:** 12 months for full enterprise deployment across all domains
**Required Investment:** $400K (infrastructure, training, integration) with 6-month ROI payback

### Key Recommendations
1. **Start with Manufacturing Domain (Phase 1):** Highest readiness, proven success (35 executions), clear ROI, strong team capability. Deploy quality inspection and equipment monitoring immediately for quick wins.

2. **Establish AI Center of Excellence:** Create dedicated team to manage ML model training, deployment, monitoring, and continuous improvement. Include cross-functional members from IT, Operations, and domain experts.

3. **Invest in Data Infrastructure:** Ensure robust data pipelines from production equipment, quality systems, and ERP. Clean, reliable data is critical for ML model accuracy and long-term success.

4. **Prioritize Change Management:** Conduct comprehensive training for 100+ employees across all affected departments. Address concerns proactively, demonstrate value early, and celebrate wins to build organizational confidence.

5. **Implement Phased Rollout:** Follow 3-phase roadmap to minimize risk, validate approaches, and build momentum. Start with high-confidence workflows before tackling more complex integrations.

6. **Focus on Measurable Outcomes:** Establish clear KPIs for each workflow (time savings, cost reduction, quality improvement, accuracy rates). Track religiously and report progress to maintain executive sponsorship.

7. **Plan for ERP Integration:** Allocate resources for SAP connector development in Phase 3 to enable full Supply Chain automation. Engage SAP specialists early to scope integration complexity.

8. **Build Feedback Loops:** Create mechanisms for operators to flag AI prediction errors, suggest improvements, and contribute domain expertise. Continuous model refinement is essential for sustained performance.

---

## Next Steps

1. **Executive Sponsorship:** Secure C-level commitment and budget approval for $400K investment with 6-month ROI target. Establish steering committee for governance and strategic oversight.

2. **Phase 1 Kickoff (Week 1-2):** Assemble project team, finalize quality inspection pilot scope, procure necessary hardware/software, and begin Line 3 baseline data collection.

3. **Infrastructure Setup (Month 1):** Configure data pipelines, establish ML training environment, deploy edge computing hardware for computer vision, and integrate with existing systems.

4. **Pilot Deployment (Month 2-3):** Launch quality inspection on Line 3, deploy predictive maintenance for 10 machines, conduct operator training, and validate performance against success criteria.

5. **Success Metrics & Monitoring (Ongoing):** Implement real-time KPI dashboards tracking inspection time, defect detection rate, equipment uptime, cost savings, and user adoption. Weekly review cycles with project team.

6. **Phase 2 Planning (Month 3):** Begin Phase 2 scoping based on Phase 1 learnings. Prioritize scaling decisions, refine resource requirements, and schedule Operations domain deployments.

7. **Change Management Program (Month 1-12):** Launch comprehensive communication plan, conduct role-specific training sessions, establish AI champion network, and create feedback channels for continuous improvement.

8. **Quarterly Business Reviews:** Schedule executive updates at 3, 6, 9, and 12 months to report progress, demonstrate ROI, address challenges, and align on strategic adjustments.

---

## Contact & Follow-Up

For more information about AI automation solutions and implementation support, please contact your account team.

**Company:** Acme Manufacturing Corporation  
**Project:** Enterprise AI Automation Initiative  
**Date:** February 2, 2026  
**Prepared by:** West Monroe AI Solutions Team  
**Contact:** solutions@westmonroe.com

**Ready to get started?** Schedule a workshop to dive deeper into your highest-priority workflows and create a detailed implementation plan.
```

### Data Structure Sent to Gamma API

```typescript
{
  text: "[Complete markdown text shown above]",
  mode: "pptx" // Request PowerPoint format
}
```

### Key Data Points in Template

The template pulls from multiple data sources:

1. **Company Information:**
   - `companyInfo.companyName`
   - `companyInfo.currentResearch.industry`
   - `companyInfo.employeeCount`
   - `companyInfo.website`
   - `companyInfo.currentResearch.description`
   - `companyInfo.currentResearch.aiRelevance.relevanceScore`

2. **Domain Data (for each selected domain):**
   - Domain name from `selectedDomains` Set
   - Scenarios filtered by `domain` property
   - Workflow execution history from `scenarioRuns`
   - Success rates calculated from run data
   - Demo URLs from `scenario.demoUrl`

3. **Scenario/Workflow Data:**
   - `scenario.title` - Workflow name
   - `scenario.description` - Detailed use case description
   - `scenario.domain` - Business domain classification
   - `scenario.valueDrivers` - Business value proposition
   - `scenario.painPoints` - Problems addressed
   - Execution count from `runs` array
   - Average score from `run.score` values

4. **Recommendations:**
   - From `companyInfo.currentResearch.aiRelevance.recommendations`

### Template Variables Explained

- **{companyName}** → `companyInfo.companyName`
- **{industry}** → `companyInfo.currentResearch.industry`
- **{employeeCount}** → `companyInfo.employeeCount`
- **{website}** → `companyInfo.website`
- **{relevanceScore}** → `companyInfo.currentResearch.aiRelevance.relevanceScore`
- **{domain}** → Each domain from `selectedDomains`
- **{workflow.title}** → Scenario title from filtered scenarios
- **{workflow.description}** → Scenario description
- **{count}** → Number of completed runs for this scenario
- **{score}%** → Average score from all runs
- **{demoUrl}** → `scenario.demoUrl` or "Not published"
- **{recommendations}** → Array from aiRelevance recommendations

---

## Prompt Best Practices

### 1. Temperature Settings
| Use Case | Temperature | Reasoning |
|----------|-------------|-----------|
| Translation | 0.2 | Consistency and accuracy |
| Scenario Generation | 0.4 | Balance creativity with structure |
| Public Examples | 0.5 | More creative and varied |
| Bulk Workflows | 0.7 | High diversity needed |
| General Text | Default | Context-dependent |

### 2. Structured Output
Most prompts use JSON response schemas to ensure:
- Consistent data structure
- Type safety
- Easy parsing
- Validation

### 3. System Instructions
All major AI interactions include:
- Role definition (expert, consultant, analyst)
- Task clarification
- Output format requirements
- Quality guidelines

### 4. Context Enrichment
Prompts include relevant context:
- Company research data
- Scenario information
- Platform specifications
- User workflow descriptions
- Visual diagrams (when available)

### 5. Fallback Handling
All prompts include error handling with:
- Try-catch blocks
- Fallback responses
- Console logging
- User-friendly error messages

---

## Model Selection Guidelines

### Gemini 2.5 Pro
**Use for:**
- Company research (complex analysis)
- PRD generation (detailed requirements)
- Elevator pitch (comprehensive narratives)
- RFP analysis (deep document understanding)
- Presentation websites (complex code generation)
- Scenario relevance matching (nuanced comparisons)

**Characteristics:**
- Most capable model
- Better reasoning
- Handles complex tasks
- More expensive/slower

### Gemini 2.5 Flash
**Use for:**
- Workflow evaluations
- General text generation
- Workflow explanations
- Diagram assistance
- Document category analysis

**Characteristics:**
- Fast and efficient
- Good for quick tasks
- Cost-effective
- Still high quality

### Gemini 2.0 Flash
**Use for:**
- Document category analysis
- Quick classifications
- Simple extractions

**Characteristics:**
- Previous generation
- Reliable fallback
- Good performance/cost ratio

### Gemini 2.0 Flash Exp
**Use for:**
- Chat conversations
- Interactive assistance
- Real-time responses

**Characteristics:**
- Experimental features
- Optimized for chat
- Low latency

---

## Integration Points

### 1. OpenAI Integration
When OpenAI models are selected (GPT-4o, GPT-4 Turbo, GPT-5.2):
- **File:** `src/services/openaiService.ts`
- **Function:** `researchCompanyWithOpenAI()`
- **Fallback:** Automatically routes to OpenAI service

### 2. Gamma API Integration
For presentation generation:
- **File:** `src/services/gammaService.ts`
- **Function:** `generateGammaPresentation()`
- **Requires:** User-provided API key
- **Supports:** PPTX format
- **Features:** Polling for completion status

---

## Prompt Versioning

### Version History
Track prompt changes to understand:
- Performance improvements
- Output quality changes
- Cost optimizations
- User feedback integration

### Recommended Approach
1. Document prompt changes in Git commits
2. A/B test significant prompt modifications
3. Track success metrics per prompt version
4. Maintain backward compatibility when possible

---

## Monitoring & Optimization

### Key Metrics
- **Response Time:** Track API latency
- **Success Rate:** Monitor successful completions
- **Output Quality:** User feedback and ratings
- **Cost:** Token usage per prompt
- **Error Rate:** Failed generations

### Optimization Strategies
1. **Prompt Engineering:**
   - Iteratively refine based on outputs
   - Add examples for clarity
   - Simplify complex instructions

2. **Model Selection:**
   - Use fastest suitable model
   - Consider cost vs. quality tradeoffs
   - Test different models for specific tasks

3. **Caching:**
   - Cache common translations
   - Store reusable generations
   - Implement prompt result caching

4. **Batching:**
   - Combine related requests
   - Reduce API calls
   - Improve user experience

---

## Security Considerations

### API Keys
- Never expose in client code
- Store in environment variables
- Use proxy services for production
- Implement rate limiting

### User Input
- Sanitize before sending to AI
- Validate input length
- Filter sensitive information
- Log anonymized requests

### Output Validation
- Verify JSON structure
- Check for malicious content
- Sanitize before display
- Handle parsing errors gracefully

---

## Future Enhancements

### Potential Additions
1. **Prompt Templates Library**
   - User-customizable prompts
   - Industry-specific variants
   - Saved prompt history

2. **A/B Testing Framework**
   - Compare prompt variations
   - Measure user satisfaction
   - Automated optimization

3. **Prompt Analytics Dashboard**
   - Usage statistics
   - Success rates
   - Cost analysis
   - Performance trends

4. **Multi-language Support**
   - Extended beyond English/Spanish
   - Cultural adaptations
   - Regional variations

5. **Fine-tuned Models**
   - Domain-specific training
   - Company-specific customization
   - Improved accuracy

---

## Appendix: Prompt Templates

### Generic Workflow Analysis
```
Analyze this workflow and provide:
1. Clarity assessment (1-10)
2. Efficiency score (1-10)
3. AI vs Human task balance
4. Improvement suggestions
5. Risk factors

Workflow: {description}
Goal: {goal}
```

### Document Summarization
```
Summarize this document focusing on:
- Main purpose and audience
- Key decisions or requirements
- Action items and deadlines
- Notable risks or concerns

Document: {content}
```

### Business Problem Analysis
```
Analyze this business problem:
- Root causes
- Current impact
- Stakeholders affected
- Potential solutions
- Implementation challenges

Problem: {description}
Context: {context}
```

---

**Document Maintenance:**
- Update when new prompts are added
- Document prompt performance changes
- Track model version updates
- Note breaking changes

**Contact:**
For questions about prompt engineering or optimization, contact the development team.

---

**Last Updated:** February 2, 2026  
**Version:** 1.0
