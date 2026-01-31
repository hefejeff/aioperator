# Product Requirements Document (PRD)
## AI Operator Training Hub - Azure Infrastructure Rebuild

---

## Executive Summary

This PRD outlines the complete requirements for rebuilding the AI Operator Training Hub application on Microsoft Azure infrastructure. The platform enables organizations to train operators on AI workflow design, evaluate their performance, conduct company research, and generate professional presentations for sales enablement.

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Business Objectives](#2-business-objectives)
3. [User Personas](#3-user-personas)
4. [System Architecture](#4-system-architecture)
5. [Epics & Features](#5-epics--features)
6. [Technical Requirements](#6-technical-requirements)
7. [Data Models](#7-data-models)
8. [API Specifications](#8-api-specifications)
9. [Security Requirements](#9-security-requirements)
10. [Success Metrics](#10-success-metrics)
11. [Timeline & Milestones](#11-timeline--milestones)

---

## 1. Project Overview

### 1.1 Product Vision

The AI Operator Training Hub is a web-based platform that enables organizations to:
- Train employees on AI workflow design and automation
- Evaluate operator proficiency through scenario-based assessments
- Conduct AI-powered company research for sales enablement
- Generate professional presentations and WordPress pages with brand compliance

### 1.2 Current Technology Stack (Firebase)

| Component | Current Technology |
|-----------|-------------------|
| Frontend | React 18 + TypeScript + Vite |
| Styling | Tailwind CSS |
| Authentication | Firebase Authentication |
| Database | Firebase Realtime Database |
| File Storage | Firebase Storage |
| AI Services | Google Gemini API, OpenAI API |
| Hosting | Firebase Hosting |

### 1.3 Target Technology Stack (Azure)

| Component | Azure Technology |
|-----------|-----------------|
| Frontend Hosting | Azure Static Web Apps |
| Authentication | Azure Active Directory B2C |
| Database | Azure Database for PostgreSQL |
| File Storage | Azure Blob Storage |
| AI Services | Azure OpenAI Service + Google Gemini API |
| API Layer | Azure Functions (Serverless) |
| CDN | Azure Front Door |
| Monitoring | Azure Application Insights |
| Key Management | Azure Key Vault |

---

## 2. Business Objectives

### 2.1 Primary Goals

1. **Enterprise Readiness**: Migrate to Azure for enterprise compliance (SOC 2, HIPAA, FedRAMP)
2. **Scalability**: Support 10,000+ concurrent users with auto-scaling
3. **Integration**: Native integration with Microsoft 365 and Azure AD
4. **Cost Optimization**: Leverage Azure consumption-based pricing
5. **Brand Compliance**: Enforce West Monroe brand guidelines across all outputs

### 2.2 Key Performance Indicators (KPIs)

| KPI | Target |
|-----|--------|
| Page Load Time | < 2 seconds |
| API Response Time | < 500ms (p95) |
| Uptime | 99.9% |
| User Adoption | 80% of licensed users active monthly |
| Training Completion Rate | 70% within 30 days |

---

## 3. User Personas

### 3.1 Operator (Primary User)

- **Role**: Business analyst, consultant, or operations specialist
- **Goals**: Learn AI workflow design, complete training scenarios, achieve high evaluation scores
- **Pain Points**: Complex AI tools, lack of guided learning paths

### 3.2 Sales Professional

- **Role**: Account executive, business development representative
- **Goals**: Generate company research, create branded presentations, identify AI opportunities
- **Pain Points**: Manual research processes, inconsistent branding

### 3.3 Administrator

- **Role**: Training manager, IT administrator
- **Goals**: Manage users, create custom scenarios, monitor progress, configure integrations
- **Pain Points**: Limited visibility into user progress, manual scenario creation

### 3.4 Company Administrator

- **Role**: Organization owner, department head
- **Goals**: View aggregate analytics, manage licenses, configure SSO
- **Pain Points**: Compliance reporting, cost management

---

## 4. System Architecture

### 4.1 High-Level Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              Azure Front Door (CDN)                          │
└─────────────────────────────────────────────────────────────────────────────┘
                                        │
                    ┌───────────────────┼───────────────────┐
                    ▼                   ▼                   ▼
        ┌───────────────────┐ ┌─────────────────┐ ┌─────────────────────┐
        │  Azure Static     │ │  Azure API      │ │  Azure Blob         │
        │  Web Apps         │ │  Management     │ │  Storage            │
        │  (React Frontend) │ │                 │ │  (Documents/Images) │
        └───────────────────┘ └────────┬────────┘ └─────────────────────┘
                                       │
                    ┌──────────────────┼──────────────────┐
                    ▼                  ▼                  ▼
        ┌───────────────────┐ ┌─────────────────┐ ┌─────────────────────┐
        │  Azure Functions  │ │  Azure OpenAI   │ │  Azure AD B2C       │
        │  (Serverless API) │ │  Service        │ │  (Authentication)   │
        └─────────┬─────────┘ └─────────────────┘ └─────────────────────┘
                  │
        ┌─────────┴─────────┐
        ▼                   ▼
┌───────────────────┐ ┌─────────────────────┐
│  Azure PostgreSQL │ │  Azure Key Vault    │
│  (SQL Database)   │ │  (Secrets)          │
└───────────────────┘ └─────────────────────┘
```

### 4.2 Data Flow

1. **User Authentication**: Azure AD B2C → JWT Token → Frontend
2. **API Requests**: Frontend → Azure API Management → Azure Functions → PostgreSQL
3. **AI Processing**: Azure Functions → Azure OpenAI / Gemini API → Response
4. **File Operations**: Frontend → Azure Functions → Azure Blob Storage

---

## 5. Epics & Features

---

### Epic 1: Azure Infrastructure Setup

**Description**: Establish the foundational Azure infrastructure with proper security, networking, and monitoring.

**User Stories**:

| ID | Story | Acceptance Criteria | Priority |
|----|-------|---------------------|----------|
| 1.1 | As a DevOps engineer, I need to create Azure resource groups with proper tagging | Resources organized by environment (dev/staging/prod) with cost center tags | P0 |
| 1.2 | As a DevOps engineer, I need to configure Azure Front Door for CDN and WAF | SSL termination, DDoS protection, geo-routing enabled | P0 |
| 1.3 | As a DevOps engineer, I need to set up Azure Key Vault for secrets management | All API keys and connection strings stored in Key Vault with RBAC | P0 |
| 1.4 | As a DevOps engineer, I need to configure Application Insights for monitoring | Dashboard with key metrics, alerting rules, log analytics workspace | P0 |
| 1.5 | As a DevOps engineer, I need to set up CI/CD pipelines in Azure DevOps | Automated build, test, and deployment to all environments | P0 |
| 1.6 | As a DevOps engineer, I need to configure virtual network and private endpoints | PostgreSQL and Blob Storage accessible only via private endpoints | P1 |

**Technical Tasks**:
- [ ] Create Azure subscription and management groups
- [ ] Deploy Bicep/Terraform templates for infrastructure as code
- [ ] Configure Azure Policy for compliance
- [ ] Set up Azure Monitor workbooks
- [ ] Create deployment slots for zero-downtime deployments

---

### Epic 2: Authentication & Authorization

**Description**: Implement enterprise-grade authentication using Azure AD B2C with support for SSO, MFA, and role-based access control.

**User Stories**:

| ID | Story | Acceptance Criteria | Priority |
|----|-------|---------------------|----------|
| 2.1 | As a user, I can sign up with email/password | Email verification, password complexity requirements met | P0 |
| 2.2 | As a user, I can sign in with Microsoft account | OAuth 2.0 flow with Microsoft identity provider | P0 |
| 2.3 | As a user, I can sign in with Google account | OAuth 2.0 flow with Google identity provider | P0 |
| 2.4 | As an admin, I can require MFA for all users | TOTP and SMS-based MFA options available | P1 |
| 2.5 | As an enterprise user, I can sign in with my company SSO | SAML/OIDC federation with corporate identity providers | P1 |
| 2.6 | As a user, I can reset my password securely | Self-service password reset with email verification | P0 |
| 2.7 | As an admin, I can assign roles to users | Admin, Operator, Viewer roles with granular permissions | P0 |

**Data Model - User Profile**:

```typescript
interface UserProfile {
  id: string;                    // Azure AD B2C object ID
  email: string;
  displayName: string;
  photoUrl?: string;
  roles: ('admin' | 'operator' | 'viewer')[];
  organizationId?: string;
  preferences: {
    language: 'en' | 'es';
    theme: 'light' | 'dark';
    notifications: boolean;
  };
  createdAt: string;             // ISO 8601
  lastLoginAt: string;           // ISO 8601
  isActive: boolean;
}
```

**Technical Tasks**:
- [ ] Configure Azure AD B2C tenant
- [ ] Create custom user flows (sign-up, sign-in, password reset)
- [ ] Implement MSAL.js in React frontend
- [ ] Create Azure Function middleware for token validation
- [ ] Implement role-based access control (RBAC) decorator

---

### Epic 3: Database Layer (Azure Database for PostgreSQL)

**Description**: Migrate from Firebase Realtime Database to Azure Database for PostgreSQL with proper schema design, indexing, and data migration.

**User Stories**:

| ID | Story | Acceptance Criteria | Priority |
|----|-------|---------------------|----------|
| 3.1 | As a developer, I need PostgreSQL tables for all entities | Tables created with proper schema and indexes | P0 |
| 3.2 | As a developer, I need data access layer with TypeScript SDK | Repository pattern with CRUD operations for all entities | P0 |
| 3.3 | As a DevOps engineer, I need backup and restore procedures | Point-in-time restore enabled, 30-day retention | P0 |
| 3.4 | As a developer, I need triggers for real-time updates | Azure Functions triggered by PostgreSQL notifications | P1 |
| 3.5 | As a data engineer, I need migration scripts from Firebase | One-time migration with data validation | P0 |

**Table Design**:

| Table | Primary Key | Foreign Keys | Description |
|-------|-------------|--------------|-------------|
| users | id (UUID) | organization_id | User profiles and preferences |
| organizations | id (UUID) | - | Organization/tenant data |
| scenarios | id (UUID) | organization_id | Training scenarios (default + custom) |
| evaluations | id (UUID) | user_id, scenario_id | User evaluation results |
| workflows | id (UUID) | user_id, scenario_id | Saved workflow versions |
| companies | id (UUID) | user_id | Company research data |
| documents | id (UUID) | company_id | Uploaded documents and analysis |

**Technical Tasks**:
- [ ] Design PostgreSQL schema with proper normalization
- [ ] Implement repository pattern with TypeScript (using Prisma or TypeORM)
- [ ] Create indexes for common queries
- [ ] Set up query optimization and connection pooling
- [ ] Build Firebase to PostgreSQL migration tool
- [ ] Configure auto-scale compute and storage

---

### Epic 4: File Storage (Azure Blob Storage)

**Description**: Implement secure file storage for documents, images, and generated assets using Azure Blob Storage.

**User Stories**:

| ID | Story | Acceptance Criteria | Priority |
|----|-------|---------------------|----------|
| 4.1 | As a user, I can upload documents (PDF, DOC, DOCX, TXT) | Files up to 50MB, virus scanning enabled | P0 |
| 4.2 | As a user, I can upload workflow images (PNG, JPG, WEBP) | Image optimization, thumbnail generation | P0 |
| 4.3 | As a user, I can view/download my uploaded files | SAS token generation with expiry | P0 |
| 4.4 | As a user, I can delete my uploaded files | Soft delete with 7-day recovery window | P0 |
| 4.5 | As an admin, I can set storage quotas per user | Quota enforcement with usage tracking | P1 |

**Container Structure**:

```
storage-account/
├── documents/
│   └── {userId}/
│       └── {companyId}/
│           └── {documentId}_{filename}
├── workflow-images/
│   └── {userId}/
│       └── {scenarioId}/
│           └── {timestamp}_{filename}
├── generated-assets/
│   └── {userId}/
│       └── presentations/
│       └── exports/
└── branding/
    └── logos/
    └── templates/
```

**Technical Tasks**:
- [ ] Create storage account with hierarchical namespace
- [ ] Configure lifecycle management policies
- [ ] Implement SAS token generation in Azure Functions
- [ ] Set up Azure CDN for static assets
- [ ] Integrate Microsoft Defender for Storage (virus scanning)
- [ ] Build file upload/download API endpoints

---

### Epic 5: AI Services Integration

**Description**: Integrate Azure OpenAI Service and Google Gemini API for workflow generation, document analysis, and evaluation.

**User Stories**:

| ID | Story | Acceptance Criteria | Priority |
|----|-------|---------------------|----------|
| 5.1 | As a user, I can generate AI workflow designs | Mermaid diagram + explanation generated in < 30s | P0 |
| 5.2 | As a user, I can have my workflow evaluated by AI | Score 0-100 with detailed feedback | P0 |
| 5.3 | As a user, I can generate a PRD from my workflow | Markdown PRD with sections: Overview, Requirements, Timeline | P0 |
| 5.4 | As a user, I can generate a pitch/presentation | Elevator pitch with value proposition | P0 |
| 5.5 | As a user, uploaded documents are auto-categorized | Category (RFP, SOW, etc.) + title + summary extracted | P0 |
| 5.6 | As a user, I can research companies with AI | Industry analysis, challenges, opportunities identified | P0 |
| 5.7 | As a user, I can chat with AI assistants | OpenAI Assistants API with file search and code interpreter | P1 |

**AI Service Configuration**:

```typescript
interface AIServiceConfig {
  azureOpenAI: {
    endpoint: string;           // e.g., https://{name}.openai.azure.com/
    deployments: {
      gpt4: string;             // GPT-4 deployment name
      gpt4Vision: string;       // GPT-4 Vision deployment name
      embedding: string;        // text-embedding-ada-002
    };
    apiVersion: string;         // e.g., 2024-02-15-preview
  };
  gemini: {
    apiKey: string;             // Stored in Key Vault
    model: string;              // e.g., gemini-1.5-flash
  };
}
```

**Technical Tasks**:
- [ ] Deploy Azure OpenAI resource with required models
- [ ] Implement prompt templates for each AI feature
- [ ] Create retry logic with exponential backoff
- [ ] Implement token usage tracking and cost attribution
- [ ] Build AI response caching layer (Redis)
- [ ] Create fallback logic (Azure OpenAI ↔ Gemini)

---

### Epic 6: Scenario Management

**Description**: Enable creation, management, and assignment of training scenarios for operators.

**User Stories**:

| ID | Story | Acceptance Criteria | Priority |
|----|-------|---------------------|----------|
| 6.1 | As a user, I can view available training scenarios | Scenarios displayed in cards with difficulty, domain, best score | P0 |
| 6.2 | As a user, I can filter scenarios by domain | Filter by: Customer Service, Finance, Healthcare, etc. | P0 |
| 6.3 | As a user, I can star/favorite scenarios | Starred scenarios appear first in list | P1 |
| 6.4 | As an admin, I can create custom scenarios | Title, description, goal, domain, difficulty, ideal solution | P0 |
| 6.5 | As an admin, I can edit/delete custom scenarios | Only creator or org admin can modify | P0 |
| 6.6 | As an admin, I can assign scenarios to users/groups | Assignments tracked with due dates | P1 |

**Data Model - Scenario**:

```typescript
interface Scenario {
  id: string;
  title: string;
  title_es?: string;
  description: string;
  description_es?: string;
  goal: string;
  goal_es?: string;
  domain: 'customer_service' | 'finance' | 'healthcare' | 'hr' | 'operations' | 'sales' | 'it' | 'custom';
  difficulty: 1 | 2 | 3 | 4 | 5;
  type: 'TRAINING' | 'EVALUATION';
  idealSolution?: string;
  createdBy: string;            // userId or 'system'
  organizationId?: string;
  isDefault: boolean;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}
```

**Technical Tasks**:
- [ ] Create scenarios API endpoints (CRUD)
- [ ] Implement scenario seed data migration
- [ ] Build admin scenario management UI
- [ ] Create scenario assignment workflow
- [ ] Implement scenario analytics (completion rates, avg scores)

---

### Epic 7: Operator Console (Training Interface)

**Description**: Build the core training interface where operators design AI workflows, receive feedback, and iterate on solutions.

**User Stories**:

| ID | Story | Acceptance Criteria | Priority |
|----|-------|---------------------|----------|
| 7.1 | As a user, I can view scenario details (goal, description) | Scenario header with all metadata visible | P0 |
| 7.2 | As a user, I can upload a current workflow image | Drag-drop or click to upload, image preview shown | P0 |
| 7.3 | As a user, I can select target platform | Microsoft 365 / Google Workspace / Custom options | P0 |
| 7.4 | As a user, I can write/edit workflow explanation | Rich text area with character count | P0 |
| 7.5 | As a user, I can generate AI workflow design | Mermaid diagram rendered with copy/download options | P0 |
| 7.6 | As a user, I can run evaluation on my workflow | Score displayed with detailed feedback breakdown | P0 |
| 7.7 | As a user, I can view version history | List of saved versions with timestamps and scores | P0 |
| 7.8 | As a user, I can save/load workflow versions | Auto-save every 60 seconds, manual save option | P0 |
| 7.9 | As a user, I can generate PRD document | Markdown preview with export to PDF option | P0 |
| 7.10 | As a user, I can generate pitch presentation | Value proposition and elevator pitch generated | P0 |
| 7.11 | As a user, I can run all processes at once | "Run All" button executes PRD → Pitch → Evaluation sequentially | P0 |

**Technical Tasks**:
- [ ] Build responsive operator console layout
- [ ] Implement Mermaid.js diagram rendering
- [ ] Create workflow version management
- [ ] Build evaluation feedback UI components
- [ ] Implement auto-save functionality
- [ ] Create PDF export functionality

---

### Epic 8: Company Research Module

**Description**: Enable AI-powered company research with document analysis, scenario mapping, and presentation generation.

**User Stories**:

| ID | Story | Acceptance Criteria | Priority |
|----|-------|---------------------|----------|
| 8.1 | As a user, I can search/add companies for research | Company name input with AI-powered info gathering | P0 |
| 8.2 | As a user, I can view company research results | Summary, challenges, opportunities, AI relevance displayed | P0 |
| 8.3 | As a user, I can upload documents for a company | Up to 5 documents with auto-categorization | P0 |
| 8.4 | As a user, I can select relevant scenarios for a company | Multi-select from available scenarios | P0 |
| 8.5 | As a user, I can run scenarios in company context | Company name displayed in scenario console | P0 |
| 8.6 | As a user, I can view scenario run history | List of runs with scores, timestamps, links to details | P0 |
| 8.7 | As a user, I can delete scenario runs | Confirmation dialog, soft delete | P0 |
| 8.8 | As a user, I can generate presentation prompt | Prompt for Google AI Studio with company + scenarios data | P0 |
| 8.9 | As a user, I can create WordPress page | Divi-compatible page created via WordPress REST API | P1 |

**Data Model - Company Research**:

```typescript
interface CompanyResearch {
  id: string;
  userId: string;
  name: string;
  description?: string;
  industry?: string;
  marketPosition?: string;
  challenges?: string[];
  opportunities?: string[];
  products?: string[];
  competitors?: string[];
  aiRelevance?: {
    currentUsage: string;
    potential: string;
    recommendations: string[];
  };
  selectedScenarios: string[];
  documents: UploadedDocument[];
  createdAt: string;
  updatedAt: string;
}

interface UploadedDocument {
  id: string;
  fileName: string;
  fileSize: number;
  contentType: string;
  url: string;
  path: string;
  uploadedAt: string;
  isAnalyzing: boolean;
  documentAnalysis?: {
    category: 'RFP' | 'SOW' | 'CONTRACT' | 'PROPOSAL' | 'REQUIREMENTS' | 'TECHNICAL' | 'FINANCIAL' | 'OTHER';
    title: string;
    summary: string;
    keyPoints: string[];
    analyzedAt: string;
  };
}
```

**Technical Tasks**:
- [ ] Build company search/creation UI
- [ ] Implement document upload with drag-drop
- [ ] Create document analysis pipeline
- [ ] Build scenario selection interface
- [ ] Implement presentation prompt generator
- [ ] Create WordPress integration service

---

### Epic 9: AI Workflow Builder Integration

**Description**: Integrate with external AI workflow builders and provide code generation for n8n, Power Automate, and other platforms.

**User Stories**:

| ID | Story | Acceptance Criteria | Priority |
|----|-------|---------------------|----------|
| 9.1 | As a user, I can generate n8n workflow JSON | Valid n8n workflow JSON exported | P1 |
| 9.2 | As a user, I can generate Power Automate flow | Flow definition compatible with Power Automate | P2 |
| 9.3 | As a user, I can search documentation | RAG-powered search across tool docs | P1 |
| 9.4 | As a user, I can chat with AI about tools | Context-aware AI assistant for workflow building | P1 |

**Technical Tasks**:
- [ ] Build n8n workflow generator service
- [ ] Create Power Automate flow exporter
- [ ] Implement documentation RAG pipeline
- [ ] Build tools & docs chat interface

---

### Epic 10: Admin Dashboard

**Description**: Provide administrative capabilities for managing users, scenarios, organizations, and system configuration.

**User Stories**:

| ID | Story | Acceptance Criteria | Priority |
|----|-------|---------------------|----------|
| 10.1 | As an admin, I can view all users in my organization | User list with search, filter, pagination | P0 |
| 10.2 | As an admin, I can edit user roles | Assign/revoke admin, operator, viewer roles | P0 |
| 10.3 | As an admin, I can view training analytics | Completion rates, avg scores, time spent charts | P0 |
| 10.4 | As an admin, I can manage custom scenarios | CRUD for organization-specific scenarios | P0 |
| 10.5 | As an admin, I can configure AI settings | Model selection, API keys, usage limits | P1 |
| 10.6 | As an admin, I can export reports | PDF/CSV exports of user progress | P1 |
| 10.7 | As a super admin, I can manage organizations | Multi-tenant organization management | P1 |

**Technical Tasks**:
- [ ] Build admin dashboard layout
- [ ] Create user management API and UI
- [ ] Implement analytics aggregation functions
- [ ] Build report generation service
- [ ] Create organization management interface

---

### Epic 11: Internationalization (i18n)

**Description**: Support multiple languages with complete translation coverage.

**User Stories**:

| ID | Story | Acceptance Criteria | Priority |
|----|-------|---------------------|----------|
| 11.1 | As a user, I can switch between English and Spanish | Language persisted in user preferences | P0 |
| 11.2 | As a user, all UI text is translated | 100% translation coverage for supported languages | P0 |
| 11.3 | As an admin, I can manage translations | Translation management interface | P2 |

**Translation Structure**:

```typescript
interface TranslationKeys {
  common: {
    save: string;
    cancel: string;
    delete: string;
    loading: string;
    error: string;
    success: string;
  };
  auth: {
    signIn: string;
    signUp: string;
    signOut: string;
  };
  scenarios: {
    title: string;
    create: string;
  };
  research: {
    companyName: string;
    analyze: string;
  };
}
```

**Technical Tasks**:
- [ ] Set up react-i18next with namespace support
- [ ] Extract all hardcoded strings to translation files
- [ ] Implement language detection and persistence
- [ ] Create translation validation scripts
- [ ] Add RTL support infrastructure (future)

---

### Epic 12: Branding & Theming

**Description**: Implement West Monroe brand guidelines with customizable theming support.

**User Stories**:

| ID | Story | Acceptance Criteria | Priority |
|----|-------|---------------------|----------|
| 12.1 | As a user, I see consistent West Monroe branding | Colors, fonts, logo per brand guidelines | P0 |
| 12.2 | As a user, generated presentations follow brand guidelines | Correct colors, fonts, layouts in outputs | P0 |
| 12.3 | As an admin, I can customize organization branding | Logo upload, primary color selection | P2 |

**Brand Configuration**:

```typescript
const BRAND_COLORS = {
  groundedBlue: '#000033',    // Primary text, logos
  white: '#FFFFFF',           // Backgrounds
  highlightYellow: '#F2E800', // Highlight graphics only
  accentBlue: '#0045FF',      // Primary CTAs, links
  accentPink: '#F500A0',      // Secondary accent, stats
  supportNeutral: '#CBD2DA',  // Backgrounds, borders
};

const TYPOGRAPHY = {
  fontFamily: 'Arial, sans-serif',
  headings: {
    fontWeight: 700,          // Bold
  },
  body: {
    fontWeight: 400,          // Regular
    lineHeight: 1.6,
  },
};
```

**Technical Tasks**:
- [ ] Configure Tailwind with brand color palette
- [ ] Create brand-compliant component library
- [ ] Build presentation template system
- [ ] Implement WordPress/Divi theme generator

---

### Epic 13: Navigation & Routing

**Description**: Implement client-side routing with breadcrumbs, deep linking, and proper browser history support.

**User Stories**:

| ID | Story | Acceptance Criteria | Priority |
|----|-------|---------------------|----------|
| 13.1 | As a user, I can navigate using browser back/forward | All navigation states preserved | P0 |
| 13.2 | As a user, I can bookmark/share deep links | Direct links to scenarios, companies work | P0 |
| 13.3 | As a user, I see breadcrumb navigation | Clickable breadcrumbs on all pages | P0 |
| 13.4 | As a user, page URLs reflect current view | SEO-friendly URLs | P0 |

**Route Structure**:

| Path | Component | Description |
|------|-----------|-------------|
| `/` | Redirect | → `/dashboard` (authenticated) or `/login` |
| `/dashboard` | DashboardView | Main dashboard with companies and workflows |
| `/training` | TrainingView | Scenario library |
| `/scenario/:id` | OperatorConsole | Training scenario interface |
| `/research` | CompanyResearch | Company list |
| `/research/:companyId` | CompanyResearch | Company detail view |
| `/workflow/:id` | WorkflowDetailView | Saved workflow detail |
| `/admin` | AdminDashboard | Admin interface |
| `/profile` | ProfileView | User settings |

**Technical Tasks**:
- [ ] Configure React Router v6
- [ ] Implement route guards for authentication
- [ ] Create Breadcrumbs component
- [ ] Add meta tags for SEO
- [ ] Implement 404 handling

---

### Epic 14: Performance & Optimization

**Description**: Optimize application performance for fast load times and smooth user experience.

**User Stories**:

| ID | Story | Acceptance Criteria | Priority |
|----|-------|---------------------|----------|
| 14.1 | As a user, the app loads quickly | < 2s initial load, < 100ms navigation | P0 |
| 14.2 | As a user, AI operations show progress | Loading indicators, progress bars | P0 |
| 14.3 | As a user, I can work offline temporarily | Service worker caches critical assets | P2 |

**Technical Tasks**:
- [ ] Implement code splitting with React.lazy
- [ ] Configure Vite for optimal bundling
- [ ] Set up Azure CDN caching rules
- [ ] Implement API response caching
- [ ] Add skeleton loading states
- [ ] Configure service worker for offline support
- [ ] Implement virtual scrolling for large lists

---

### Epic 15: Testing & Quality Assurance

**Description**: Establish comprehensive testing strategy with automated testing pipelines.

**User Stories**:

| ID | Story | Acceptance Criteria | Priority |
|----|-------|---------------------|----------|
| 15.1 | As a developer, I have unit tests for all services | 80% code coverage on services | P0 |
| 15.2 | As a developer, I have integration tests for APIs | All API endpoints tested | P0 |
| 15.3 | As a developer, I have E2E tests for critical flows | Login, scenario completion, research flows tested | P0 |
| 15.4 | As a developer, I have accessibility tests | WCAG 2.1 AA compliance verified | P1 |

**Testing Stack**:

| Type | Tool | Coverage Target |
|------|------|-----------------|
| Unit Tests | Vitest | 80% |
| Component Tests | React Testing Library | Key components |
| E2E Tests | Playwright | Critical user flows |
| Accessibility | axe-core | WCAG 2.1 AA |
| Performance | Lighthouse CI | Score > 90 |

**Technical Tasks**:
- [ ] Configure Vitest with coverage reporting
- [ ] Write unit tests for all services
- [ ] Create component test suite
- [ ] Set up Playwright for E2E testing
- [ ] Configure CI pipeline for automated testing
- [ ] Implement accessibility testing

---

## 6. Technical Requirements

### 6.1 Frontend Requirements

| Requirement | Specification |
|-------------|---------------|
| Framework | React 18+ with TypeScript 5+ |
| Build Tool | Vite 5+ |
| Styling | Tailwind CSS 3+ |
| State Management | React Context + Hooks (or Zustand if needed) |
| Routing | React Router v6 |
| Forms | React Hook Form + Zod validation |
| HTTP Client | Axios or native fetch with retry logic |
| Charts | Recharts or Chart.js |
| Diagrams | Mermaid.js |
| i18n | react-i18next |

### 6.2 Backend Requirements (Azure Functions)

| Requirement | Specification |
|-------------|---------------|
| Runtime | Node.js 20 LTS |
| Language | TypeScript 5+ |
| Framework | Azure Functions v4 |
| Authentication | MSAL.js token validation |
| Validation | Zod schemas |
| Logging | Azure Application Insights |
| Rate Limiting | Azure API Management policies |

### 6.3 Database Requirements (PostgreSQL)

| Requirement | Specification |
|-------------|---------------|
| Service | Azure Database for PostgreSQL - Flexible Server |
| Version | PostgreSQL 16 |
| Compute | Burstable B2s (dev) / General Purpose D4s_v3 (prod) |
| Storage | 32GB - 256GB with auto-grow |
| High Availability | Zone-redundant HA (production) |
| Backup | Automated backups with 35-day retention, PITR |
| Connection Pooling | PgBouncer enabled |

### 6.4 Storage Requirements (Blob Storage)

| Requirement | Specification |
|-------------|---------------|
| Tier | Hot (frequently accessed) |
| Redundancy | ZRS (Zone-Redundant Storage) |
| Access | Private with SAS tokens |
| Lifecycle | Archive after 90 days, delete after 365 days |
| Security | Microsoft Defender for Storage |

---

## 7. Data Models

### 7.1 Complete Entity Relationship

```
┌─────────────────┐       ┌─────────────────┐
│   Organization  │───────│      User       │
└─────────────────┘       └────────┬────────┘
                                   │
         ┌─────────────────────────┼─────────────────────────┐
         │                         │                         │
         ▼                         ▼                         ▼
┌─────────────────┐       ┌─────────────────┐       ┌─────────────────┐
│    Scenario     │       │    Company      │       │    Workflow     │
└────────┬────────┘       │    Research     │       │    Version      │
         │                └────────┬────────┘       └─────────────────┘
         │                         │
         ▼                         ▼
┌─────────────────┐       ┌─────────────────┐
│   Evaluation    │       │    Document     │
└─────────────────┘       └─────────────────┘
```

### 7.2 Full TypeScript Interfaces

```typescript
// ============ User & Auth ============
export interface UserProfile {
  id: string;
  email: string;
  displayName: string;
  photoUrl?: string;
  roles: UserRole[];
  organizationId?: string;
  preferences: UserPreferences;
  createdAt: string;
  lastLoginAt: string;
  isActive: boolean;
}

export type UserRole = 'super_admin' | 'org_admin' | 'admin' | 'operator' | 'viewer';

export interface UserPreferences {
  language: 'en' | 'es';
  theme: 'light' | 'dark' | 'system';
  notifications: {
    email: boolean;
    inApp: boolean;
  };
  defaultPlatform: Platform;
}

// ============ Organization ============
export interface Organization {
  id: string;
  name: string;
  domain?: string;
  logo?: string;
  settings: OrganizationSettings;
  subscription: SubscriptionTier;
  createdAt: string;
  updatedAt: string;
}

export interface OrganizationSettings {
  ssoEnabled: boolean;
  mfaRequired: boolean;
  allowedDomains: string[];
  branding?: {
    primaryColor: string;
    logo: string;
  };
}

export type SubscriptionTier = 'free' | 'professional' | 'enterprise';

// ============ Scenarios ============
export interface Scenario {
  id: string;
  title: string;
  title_es?: string;
  description: string;
  description_es?: string;
  goal: string;
  goal_es?: string;
  domain: ScenarioDomain;
  difficulty: 1 | 2 | 3 | 4 | 5;
  type: 'TRAINING' | 'EVALUATION';
  idealSolution?: string;
  createdBy: string;
  organizationId?: string;
  isDefault: boolean;
  tags: string[];
  estimatedMinutes?: number;
  prerequisites?: string[];
  createdAt: string;
  updatedAt: string;
}

export type ScenarioDomain = 
  | 'customer_service'
  | 'finance'
  | 'healthcare'
  | 'hr'
  | 'operations'
  | 'sales'
  | 'it'
  | 'legal'
  | 'marketing'
  | 'custom';

// ============ Workflows ============
export interface WorkflowVersion {
  id: string;
  scenarioId: string;
  userId: string;
  companyId?: string;
  platform: Platform;
  explanation: string;
  mermaidDiagram?: string;
  currentWorkflowImage?: string;
  prd?: string;
  pitch?: string;
  evaluation?: EvaluationResult;
  createdAt: string;
  updatedAt: string;
}

export type Platform = 'microsoft365' | 'google' | 'custom';

// ============ Evaluations ============
export interface EvaluationResult {
  id: string;
  scenarioId: string;
  userId: string;
  workflowVersionId: string;
  score: number;
  feedback: string;
  breakdown?: {
    clarity: number;
    completeness: number;
    efficiency: number;
    innovation: number;
    feasibility: number;
  };
  aiModel: string;
  createdAt: string;
}

// ============ Company Research ============
export interface CompanyResearch {
  id: string;
  userId: string;
  name: string;
  description?: string;
  industry?: string;
  website?: string;
  size?: 'startup' | 'smb' | 'mid-market' | 'enterprise';
  marketPosition?: string;
  challenges?: string[];
  opportunities?: string[];
  products?: string[];
  competitors?: string[];
  aiRelevance?: AIRelevance;
  selectedScenarios: string[];
  documents: UploadedDocument[];
  createdAt: string;
  updatedAt: string;
}

export interface AIRelevance {
  currentUsage: string;
  potential: string;
  recommendations: string[];
  readinessScore?: number;
}

// ============ Documents ============
export interface UploadedDocument {
  id: string;
  companyId: string;
  fileName: string;
  fileSize: number;
  contentType: string;
  url: string;
  path: string;
  uploadedAt: string;
  isAnalyzing: boolean;
  documentAnalysis?: DocumentAnalysis;
  content?: string;
}

export interface DocumentAnalysis {
  category: DocumentCategory;
  title: string;
  summary: string;
  keyPoints: string[];
  entities?: {
    organizations: string[];
    people: string[];
    dates: string[];
    amounts: string[];
  };
  analyzedAt: string;
}

export type DocumentCategory = 
  | 'RFP'
  | 'SOW'
  | 'CONTRACT'
  | 'PROPOSAL'
  | 'REQUIREMENTS'
  | 'TECHNICAL'
  | 'FINANCIAL'
  | 'LEGAL'
  | 'OTHER';
```

---

## 8. API Specifications

### 8.1 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| **Authentication** |||
| POST | /api/auth/token | Exchange auth code for tokens |
| POST | /api/auth/refresh | Refresh access token |
| **Users** |||
| GET | /api/users/me | Get current user profile |
| PUT | /api/users/me | Update current user profile |
| GET | /api/users | List users (admin) |
| **Scenarios** |||
| GET | /api/scenarios | List available scenarios |
| POST | /api/scenarios | Create custom scenario |
| GET | /api/scenarios/:id | Get scenario details |
| PUT | /api/scenarios/:id | Update scenario |
| DELETE | /api/scenarios/:id | Delete scenario |
| **Evaluations** |||
| GET | /api/evaluations | List user evaluations |
| POST | /api/evaluations | Save evaluation result |
| DELETE | /api/evaluations/:id | Delete evaluation |
| **Workflows** |||
| GET | /api/workflows | List saved workflows |
| POST | /api/workflows | Save workflow version |
| GET | /api/workflows/:id | Get workflow details |
| DELETE | /api/workflows/:id | Delete workflow |
| **Companies** |||
| GET | /api/companies | List researched companies |
| POST | /api/companies | Create company research |
| GET | /api/companies/:id | Get company details |
| PUT | /api/companies/:id | Update company research |
| DELETE | /api/companies/:id | Delete company |
| **Documents** |||
| POST | /api/companies/:id/documents | Upload document |
| DELETE | /api/companies/:id/documents/:docId | Delete document |
| **AI** |||
| POST | /api/ai/generate-workflow | Generate AI workflow |
| POST | /api/ai/evaluate | Evaluate workflow |
| POST | /api/ai/generate-prd | Generate PRD |
| POST | /api/ai/generate-pitch | Generate pitch |
| POST | /api/ai/analyze-document | Analyze uploaded document |
| POST | /api/ai/research-company | Research company |
| POST | /api/ai/chat | Chat with AI assistant |

### 8.2 API Response Format

```typescript
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
  meta?: {
    page?: number;
    pageSize?: number;
    total?: number;
    hasMore?: boolean;
  };
}
```

---

## 9. Security Requirements

### 9.1 Authentication & Authorization

| Requirement | Implementation |
|-------------|----------------|
| Authentication | Azure AD B2C with JWT tokens |
| Token Lifetime | Access: 1 hour, Refresh: 24 hours |
| MFA | Optional (configurable per org) |
| Session Management | Secure, HttpOnly cookies |
| RBAC | Role-based with organization scope |

### 9.2 Data Protection

| Requirement | Implementation |
|-------------|----------------|
| Encryption at Rest | Azure Storage Service Encryption (AES-256) |
| Encryption in Transit | TLS 1.3 |
| PII Handling | Encrypted, access logged |
| Data Residency | US regions (configurable) |
| Backup Encryption | Customer-managed keys (CMK) |

### 9.3 Network Security

| Requirement | Implementation |
|-------------|----------------|
| WAF | Azure Front Door WAF (OWASP rules) |
| DDoS Protection | Azure DDoS Protection Standard |
| Private Endpoints | Cosmos DB, Blob Storage |
| API Rate Limiting | Azure API Management |
| IP Restrictions | Admin endpoints restricted |

### 9.4 Compliance

| Standard | Status |
|----------|--------|
| SOC 2 Type II | Inherited from Azure |
| GDPR | Data processing agreements |
| HIPAA | BAA available |
| CCPA | Privacy controls implemented |

---

## 10. Success Metrics

### 10.1 Technical Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Page Load Time (LCP) | < 2.5s | Lighthouse / RUM |
| API Response Time (p95) | < 500ms | Application Insights |
| Error Rate | < 0.1% | Application Insights |
| Uptime | 99.9% | Azure Monitor |
| Build Time | < 3 min | Azure DevOps |

### 10.2 Business Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| User Activation | 80% complete first scenario | Cosmos DB analytics |
| Training Completion | 70% complete assigned training | Cosmos DB analytics |
| Average Evaluation Score | > 70/100 | Cosmos DB analytics |
| Research → Presentation | 50% conversion | Cosmos DB analytics |
| DAU/MAU Ratio | > 0.4 | Azure AD B2C + analytics |

---

## 11. Timeline & Milestones

### 11.1 Phase 1: Foundation (Weeks 1-4)

| Week | Deliverables |
|------|--------------|
| 1 | Azure infrastructure setup, CI/CD pipelines |
| 2 | Azure AD B2C configuration, authentication flow |
| 3 | Cosmos DB setup, data models, repositories |
| 4 | Azure Blob Storage, file upload/download APIs |

### 11.2 Phase 2: Core Features (Weeks 5-10)

| Week | Deliverables |
|------|--------------|
| 5-6 | Scenario management, CRUD APIs |
| 7-8 | Operator console, AI integration |
| 9-10 | Evaluation system, workflow versioning |

### 11.3 Phase 3: Research & Presentations (Weeks 11-14)

| Week | Deliverables |
|------|--------------|
| 11-12 | Company research module |
| 13-14 | Document analysis, presentation generation |

### 11.4 Phase 4: Admin & Polish (Weeks 15-18)

| Week | Deliverables |
|------|--------------|
| 15-16 | Admin dashboard, analytics |
| 17-18 | Performance optimization, testing, documentation |

### 11.5 Milestone Summary

| Milestone | Target Date | Criteria |
|-----------|-------------|----------|
| M1: Infrastructure Ready | Week 4 | All Azure resources deployed, auth working |
| M2: MVP | Week 10 | Core training flow complete |
| M3: Beta | Week 14 | All features complete, internal testing |
| M4: GA | Week 18 | Production deployment, documentation complete |

---

## Appendix A: Azure Resource Naming Convention

```
{resource-type}-{application}-{environment}-{region}-{instance}

Examples:
- rg-aitraining-prod-eastus-001          (Resource Group)
- cosmos-aitraining-prod-eastus-001      (Cosmos DB)
- st-aitraining-prod-eastus-001          (Storage Account)
- func-aitraining-prod-eastus-001        (Function App)
- apim-aitraining-prod-eastus-001        (API Management)
- kv-aitraining-prod-eastus-001          (Key Vault)
- ai-aitraining-prod-eastus-001          (Application Insights)
- swa-aitraining-prod-001                (Static Web App)
- afd-aitraining-prod-001                (Azure Front Door)
```

---

## Appendix B: Environment Variables

```bash
# Azure AD B2C
VITE_AZURE_AD_CLIENT_ID=
VITE_AZURE_AD_AUTHORITY=
VITE_AZURE_AD_REDIRECT_URI=

# API
VITE_API_BASE_URL=

# Feature Flags
VITE_ENABLE_OFFLINE_MODE=false
VITE_ENABLE_DEBUG_LOGGING=false

# Backend (Azure Functions)
COSMOS_CONNECTION_STRING=
STORAGE_CONNECTION_STRING=
AZURE_OPENAI_ENDPOINT=
AZURE_OPENAI_API_KEY=
GEMINI_API_KEY=
WORDPRESS_BASE_URL=
WORDPRESS_USERNAME=
WORDPRESS_APP_PASSWORD=
```

---

## Document Control

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2024-12-05 | AI Assistant | Initial PRD |

---

*This PRD is a living document and will be updated as requirements evolve during the development process.*
