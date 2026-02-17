import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { User } from 'firebase/auth';
import { 
  getAllUserEvaluations, 
  getScenarios, 
  getAllUserWorkflowVersions, 
  saveUserScenario, 
  toggleFavoriteScenario,
  listCompanyResearch,
  searchOtherUsersCompanies,
  migrateCompanyInfoForUserRuns,
  backfillUnknownCompanyForUserRuns,
  getUserProfile
} from '../services/firebaseService';
import type { Scenario, WorkflowVersion, AggregatedEvaluationResult, Company, Role } from '../types';
import { deleteCompany } from '../services/companyService';
import CreateScenarioForm, { ScenarioFormPayload } from './CreateScenarioForm';
import { Icons, ALL_SCENARIOS } from '../constants';
import SearchInput from './SearchInput';
import SidebarNav, { SidebarNavItem } from './SidebarNav';

interface Dashboard2Props {
  user: User;
  onStartTraining?: (scenario?: Scenario) => void;
  onViewWorkflow?: (workflowId: string) => void;
  onScenarioCreated?: (newScenario: Scenario) => void;
  handleNavigate?: (view: 'DASHBOARD' | 'TRAINING' | 'ADMIN' | 'RESEARCH', companyId?: string) => void;
  onNavigateToScenario?: (scenarioId: string) => void;
}

type MenuSection = 'overview' | 'companies' | 'settings';

// Collapsible Companies Table with Scenarios Sub-component
interface CompaniesTableProps {
  companies: Company[];
  scenarios: Scenario[];
  workflowVersions: WorkflowVersion[];
  onNavigateToResearch: (companyId?: string) => void;
  onStartTraining?: (scenario?: Scenario) => void;
  onNavigateToScenario?: (scenarioId: string) => void;
  onViewWorkflow?: (workflowId: string) => void;
}

const CompaniesTableWithScenarios: React.FC<CompaniesTableProps> = ({
  companies,
  scenarios,
  workflowVersions,
  onNavigateToResearch,
  onStartTraining,
  onNavigateToScenario,
  onViewWorkflow
}) => {
  const [expandedCompanies, setExpandedCompanies] = useState<Record<string, boolean>>({});
  const [expandedTab, setExpandedTab] = useState<Record<string, 'scenarios' | 'docs' | 'assets'>>({});

  // Get the most recent workflow version for a scenario
  const getLatestVersionForScenario = (scenarioId: string): WorkflowVersion | undefined => {
    const scenarioVersions = workflowVersions.filter(v => v.scenarioId === scenarioId);
    if (scenarioVersions.length === 0) return undefined;
    return scenarioVersions.sort((a, b) => b.timestamp - a.timestamp)[0];
  };

  const toggleExpanded = (companyId: string) => {
    setExpandedCompanies(prev => ({
      ...prev,
      [companyId]: !prev[companyId]
    }));
    // Default to scenarios tab when expanding
    if (!expandedCompanies[companyId]) {
      setExpandedTab(prev => ({ ...prev, [companyId]: 'scenarios' }));
    }
  };

  const setTab = (companyId: string, tab: 'scenarios' | 'docs' | 'assets') => {
    setExpandedTab(prev => ({ ...prev, [companyId]: tab }));
  };

  // Get scenarios for a company based on selectedScenarios
  const getCompanyScenarios = (company: Company): Scenario[] => {
    if (!company.selectedScenarios || company.selectedScenarios.length === 0) {
      return [];
    }
    // Match selected scenario IDs with actual scenarios from ALL_SCENARIOS or user scenarios
    const allAvailable = [...ALL_SCENARIOS, ...scenarios];
    return company.selectedScenarios
      .map(id => allAvailable.find(s => s.id === id))
      .filter((s): s is Scenario => s !== undefined);
  };

  // Get documents for a company
  const getCompanyDocs = (company: Company) => {
    console.log('=== getCompanyDocs DEBUG ===');
    console.log('Company name:', company.name);
    console.log('Full company object:', company);
    console.log('company.research:', company.research);
    console.log('company.research?.currentResearch:', company.research?.currentResearch);
    console.log('documents:', company.research?.currentResearch?.documents);
    
    const docs = company.research?.currentResearch?.documents || [];
    const rfp = company.research?.currentResearch?.rfpDocument;
    
    console.log('Extracted docs array:', docs);
    console.log('Docs length:', docs.length);
    
    if (rfp) {
      return [{ ...rfp, id: 'rfp-doc', isRfp: true }, ...docs];
    }
    return docs;
  };

  if (companies.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-wm-neutral/20 shadow-sm">
        <div className="p-4 border-b border-wm-neutral/20">
          <h3 className="font-semibold text-wm-blue text-lg">Companies</h3>
        </div>
        <div className="p-12 text-center">
          <Icons.Building className="w-16 h-16 text-wm-neutral mx-auto mb-4" />
          <p className="text-wm-blue/60 text-lg">No companies yet</p>
          <p className="text-wm-blue/40 text-sm mt-2">Start your first company research to get started</p>
          <button
            onClick={() => onNavigateToResearch()}
            className="mt-6 px-6 py-3 bg-wm-blue text-white rounded-lg hover:bg-wm-blue/90 transition-colors"
          >
            Start Research
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-wm-neutral/20 shadow-sm overflow-hidden">
      <div className="p-4 border-b border-wm-neutral/20">
        <h3 className="font-semibold text-wm-blue text-lg">Companies ({companies.length})</h3>
      </div>
      
      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-wm-neutral/5 border-b border-wm-neutral/20">
            <tr>
              <th className="text-left py-3 px-4 font-semibold text-wm-blue/70 text-sm w-10"></th>
              <th className="text-left py-3 px-4 font-semibold text-wm-blue/70 text-sm">Company Name</th>
              <th className="text-left py-3 px-4 font-semibold text-wm-blue/70 text-sm">Industry</th>
              <th className="text-center py-3 px-4 font-semibold text-wm-blue/70 text-sm">Processes</th>
              <th className="text-center py-3 px-4 font-semibold text-wm-blue/70 text-sm">Docs</th>
              <th className="text-center py-3 px-4 font-semibold text-wm-blue/70 text-sm">Assets</th>
              <th className="text-left py-3 px-4 font-semibold text-wm-blue/70 text-sm">Last Updated</th>
              <th className="text-right py-3 px-4 font-semibold text-wm-blue/70 text-sm">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-wm-neutral/10">
            {companies.map((company) => {
              const isExpanded = expandedCompanies[company.id];
              const companyScenarios = getCompanyScenarios(company);
              const companyDocs = getCompanyDocs(company);
              const currentTab = expandedTab[company.id] || 'scenarios';
              // For now, assets could be use case versions, presentations, etc.
              const hasContent = companyScenarios.length > 0 || companyDocs.length > 0;
              
              return (
                <React.Fragment key={company.id}>
                  {/* Company Row */}
                  <tr className="hover:bg-wm-neutral/5 transition-colors">
                    <td className="py-3 px-4">
                      {hasContent && (
                        <button
                          onClick={() => toggleExpanded(company.id)}
                          className="p-1 hover:bg-wm-neutral/10 rounded transition-colors"
                        >
                          {isExpanded ? (
                            <Icons.ChevronDown className="w-4 h-4 text-wm-blue/60" />
                          ) : (
                            <Icons.ChevronRight className="w-4 h-4 text-wm-blue/60" />
                          )}
                        </button>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <div 
                        className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity"
                        onClick={() => onNavigateToResearch(company.id)}
                      >
                        <div className="w-10 h-10 bg-wm-blue/10 rounded-lg flex items-center justify-center flex-shrink-0">
                          <Icons.Building className="w-5 h-5 text-wm-blue" />
                        </div>
                        <span className="font-medium text-wm-blue hover:underline">{company.name}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-wm-blue/70">
                        {company.research?.currentResearch?.industry || '—'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => { toggleExpanded(company.id); setTab(company.id, 'scenarios'); }}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 text-sm rounded-full transition-colors ${
                          companyScenarios.length > 0 
                            ? 'bg-wm-accent/10 text-wm-accent hover:bg-wm-accent/20' 
                            : 'bg-wm-neutral/10 text-wm-blue/50'
                        }`}
                      >
                        <Icons.FileText className="w-3.5 h-3.5" />
                        {companyScenarios.length}
                      </button>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => { toggleExpanded(company.id); setTab(company.id, 'docs'); }}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 text-sm rounded-full transition-colors ${
                          companyDocs.length > 0 
                            ? 'bg-blue-100 text-blue-600 hover:bg-blue-200' 
                            : 'bg-wm-neutral/10 text-wm-blue/50'
                        }`}
                      >
                        <Icons.Document className="w-3.5 h-3.5" />
                        {companyDocs.length}
                      </button>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => { toggleExpanded(company.id); setTab(company.id, 'assets'); }}
                        className="inline-flex items-center gap-1 px-2.5 py-1 bg-purple-100 text-purple-600 hover:bg-purple-200 text-sm rounded-full transition-colors"
                      >
                        <Icons.Workflow className="w-3.5 h-3.5" />
                        View
                      </button>
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-wm-blue/60 text-sm">
                        {company.lastUpdated 
                          ? new Date(company.lastUpdated).toLocaleDateString()
                          : '—'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => onNavigateToResearch(company.id)}
                        className="px-3 py-1.5 text-sm text-wm-blue hover:bg-wm-blue/10 rounded-lg transition-colors"
                      >
                        Manage
                      </button>
                    </td>
                  </tr>
                  
                  {/* Expanded Content */}
                  {isExpanded && hasContent && (
                    <tr>
                      <td colSpan={8} className="bg-wm-neutral/5 py-0">
                        <div className="pl-14 pr-4 py-4">
                          {/* Tabs */}
                          <div className="flex gap-1 mb-4 border-b border-wm-neutral/20">
                            <button
                              onClick={() => setTab(company.id, 'scenarios')}
                              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                                currentTab === 'scenarios'
                                  ? 'border-wm-accent text-wm-accent'
                                  : 'border-transparent text-wm-blue/60 hover:text-wm-blue'
                              }`}
                            >
                              Scenarios ({companyScenarios.length})
                            </button>
                            <button
                              onClick={() => setTab(company.id, 'docs')}
                              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                                currentTab === 'docs'
                                  ? 'border-blue-500 text-blue-600'
                                  : 'border-transparent text-wm-blue/60 hover:text-wm-blue'
                              }`}
                            >
                              Documents ({companyDocs.length})
                            </button>
                            <button
                              onClick={() => setTab(company.id, 'assets')}
                              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                                currentTab === 'assets'
                                  ? 'border-purple-500 text-purple-600'
                                  : 'border-transparent text-wm-blue/60 hover:text-wm-blue'
                              }`}
                            >
                              Created Assets
                            </button>
                          </div>

                          {/* Scenarios Tab */}
                          {currentTab === 'scenarios' && (
                            <div className="space-y-2">
                              {companyScenarios.length === 0 ? (
                                <p className="text-wm-blue/50 text-sm py-4">No processes selected for this company</p>
                              ) : (
                                companyScenarios.map((scenario) => {
                                  const latestVersion = getLatestVersionForScenario(scenario.id);
                                  return (
                                    <div
                                      key={scenario.id}
                                      className="p-3 bg-white rounded-lg border border-wm-neutral/20 hover:border-wm-blue/30 transition-colors"
                                    >
                                      <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3 flex-1 min-w-0">
                                          <div className="w-8 h-8 bg-wm-accent/10 rounded-lg flex items-center justify-center flex-shrink-0">
                                            <Icons.FileText className="w-4 h-4 text-wm-accent" />
                                          </div>
                                          <div className="min-w-0">
                                            <p className="font-medium text-wm-blue text-sm">{scenario.title}</p>
                                            {scenario.domain && (
                                              <span className="text-xs text-wm-blue/50">{scenario.domain}</span>
                                            )}
                                          </div>
                                        </div>
                                        {onStartTraining && (
                                          <button
                                            onClick={() => onStartTraining(scenario)}
                                            className="px-3 py-1 text-xs bg-wm-accent text-white rounded-lg hover:bg-wm-accent/90 transition-colors flex-shrink-0 ml-2"
                                          >
                                            Run Scenario
                                          </button>
                                        )}
                                      </div>
                                      
                                      {/* Latest Version Section */}
                                      {latestVersion ? (
                                        <button
                                          onClick={() => onViewWorkflow?.(latestVersion.id)}
                                          className="mt-2 w-full p-2 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg hover:border-green-400 transition-colors text-left group"
                                        >
                                          <div className="flex items-center gap-2">
                                            <Icons.CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
                                            <div className="flex-1 min-w-0">
                                              <p className="text-xs font-medium text-green-800 group-hover:underline truncate">
                                                {latestVersion.versionTitle || 'Latest Version'}
                                              </p>
                                              <p className="text-xs text-green-600">
                                                Saved {new Date(latestVersion.timestamp).toLocaleDateString()}
                                                {latestVersion.evaluationScore !== null && (
                                                  <span className="ml-2">• Score: {latestVersion.evaluationScore}/100</span>
                                                )}
                                              </p>
                                            </div>
                                            <Icons.ChevronRight className="w-4 h-4 text-green-500 group-hover:translate-x-0.5 transition-transform" />
                                          </div>
                                        </button>
                                      ) : (
                                        <div className="mt-2 p-2 bg-gray-50 border border-gray-200 rounded-lg text-center">
                                          <p className="text-xs text-gray-500">No saved versions yet</p>
                                        </div>
                                      )}
                                    </div>
                                  );
                                })
                              )}
                            </div>
                          )}

                          {/* Documents Tab */}
                          {currentTab === 'docs' && (
                            <div className="space-y-2">
                              {companyDocs.length === 0 ? (
                                <div className="text-center py-6">
                                  <Icons.Document className="w-10 h-10 text-wm-neutral mx-auto mb-2" />
                                  <p className="text-wm-blue/50 text-sm">No documents uploaded</p>
                                  <button
                                    onClick={() => onNavigateToResearch(company.id)}
                                    className="mt-3 px-4 py-1.5 text-sm bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                                  >
                                    Upload Documents
                                  </button>
                                </div>
                              ) : (
                                companyDocs.map((doc: any) => (
                                  <div
                                    key={doc.id}
                                    className="flex items-center justify-between p-3 bg-white rounded-lg border border-wm-neutral/20 hover:border-blue-300 transition-colors"
                                  >
                                    <div className="flex items-center gap-3">
                                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                                        doc.isRfp ? 'bg-amber-100' : 'bg-blue-100'
                                      }`}>
                                        <Icons.Document className={`w-4 h-4 ${
                                          doc.isRfp ? 'text-amber-600' : 'text-blue-600'
                                        }`} />
                                      </div>
                                      <div>
                                        <p className="font-medium text-wm-blue text-sm">{doc.fileName}</p>
                                        <div className="flex items-center gap-2 mt-0.5">
                                          {doc.isRfp && (
                                            <span className="text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded">RFP</span>
                                          )}
                                          {doc.documentAnalysis?.category && (
                                            <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">
                                              {doc.documentAnalysis.category}
                                            </span>
                                          )}
                                          <span className="text-xs text-wm-blue/40">
                                            {new Date(doc.uploadedAt).toLocaleDateString()}
                                          </span>
                                        </div>
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      {doc.analysis && (
                                        <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">
                                          Analyzed
                                        </span>
                                      )}
                                      {doc.url && (
                                        <a
                                          href={doc.url}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="px-3 py-1 text-xs text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                        >
                                          View
                                        </a>
                                      )}
                                    </div>
                                  </div>
                                ))
                              )}
                            </div>
                          )}

                          {/* Assets Tab */}
                          {currentTab === 'assets' && (
                            <div className="space-y-2">
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                {/* Presentations */}
                                <div className="p-4 bg-white rounded-lg border border-wm-neutral/20">
                                  <div className="flex items-center gap-2 mb-2">
                                    <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                                      <Icons.Document className="w-4 h-4 text-purple-600" />
                                    </div>
                                    <span className="font-medium text-wm-blue text-sm">Presentations</span>
                                  </div>
                                  <p className="text-xs text-wm-blue/50 mb-3">Generated sales decks and demos</p>
                                  <button
                                    onClick={() => onNavigateToResearch(company.id)}
                                    className="w-full px-3 py-1.5 text-xs bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors"
                                  >
                                    Create Presentation
                                  </button>
                                </div>

                                {/* Workflows */}
                                <div className="p-4 bg-white rounded-lg border border-wm-neutral/20">
                                  <div className="flex items-center gap-2 mb-2">
                                    <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                                      <Icons.Workflow className="w-4 h-4 text-green-600" />
                                    </div>
                                    <span className="font-medium text-wm-blue text-sm">Use Cases</span>
                                  </div>
                                  <p className="text-xs text-wm-blue/50 mb-3">Automation use cases created</p>
                                  <button
                                    onClick={() => onNavigateToResearch(company.id)}
                                    className="w-full px-3 py-1.5 text-xs bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
                                  >
                                    View Use Cases
                                  </button>
                                </div>

                                {/* Reports */}
                                <div className="p-4 bg-white rounded-lg border border-wm-neutral/20">
                                  <div className="flex items-center gap-2 mb-2">
                                    <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                                      <Icons.BarChart className="w-4 h-4 text-blue-600" />
                                    </div>
                                    <span className="font-medium text-wm-blue text-sm">Reports</span>
                                  </div>
                                  <p className="text-xs text-wm-blue/50 mb-3">Analysis and ROI reports</p>
                                  <button
                                    onClick={() => onNavigateToResearch(company.id)}
                                    className="w-full px-3 py-1.5 text-xs bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                                  >
                                    Generate Report
                                  </button>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// Scenarios & Versions Table with Selection for Presentation
interface ScenariosVersionsTableProps {
  scenarios: Scenario[];
  workflowVersions: WorkflowVersion[];
  onViewWorkflow?: (workflowId: string) => void;
}

const ScenariosVersionsTable: React.FC<ScenariosVersionsTableProps> = ({
  scenarios,
  workflowVersions,
  onViewWorkflow
}) => {
  const [expandedScenarios, setExpandedScenarios] = useState<Record<string, boolean>>({});
  const [selectedVersions, setSelectedVersions] = useState<Set<string>>(new Set());
  const [showPromptModal, setShowPromptModal] = useState(false);
  const [generatedPrompt, setGeneratedPrompt] = useState('');

  const toggleExpanded = (scenarioId: string) => {
    setExpandedScenarios(prev => ({
      ...prev,
      [scenarioId]: !prev[scenarioId]
    }));
  };

  const toggleVersionSelection = (versionId: string) => {
    setSelectedVersions(prev => {
      const newSet = new Set(prev);
      if (newSet.has(versionId)) {
        newSet.delete(versionId);
      } else {
        newSet.add(versionId);
      }
      return newSet;
    });
  };

  const selectAllVersionsForScenario = (scenarioId: string) => {
    const scenarioVersions = workflowVersions.filter(v => v.scenarioId === scenarioId);
    setSelectedVersions(prev => {
      const newSet = new Set(prev);
      const allSelected = scenarioVersions.every(v => newSet.has(v.id));
      if (allSelected) {
        // Deselect all
        scenarioVersions.forEach(v => newSet.delete(v.id));
      } else {
        // Select all
        scenarioVersions.forEach(v => newSet.add(v.id));
      }
      return newSet;
    });
  };

  // Group versions by scenario
  const versionsByScenario = workflowVersions.reduce((acc, version) => {
    if (!acc[version.scenarioId]) {
      acc[version.scenarioId] = [];
    }
    acc[version.scenarioId].push(version);
    return acc;
  }, {} as Record<string, WorkflowVersion[]>);

  // Get all scenarios including ALL_SCENARIOS
  const allScenarios = [...ALL_SCENARIOS, ...scenarios];
  const scenariosWithVersions = allScenarios.filter(s => versionsByScenario[s.id]?.length > 0);

  const generatePresentationPrompt = () => {
    if (selectedVersions.size === 0) return;

    const selectedItems: { scenario: Scenario; version: WorkflowVersion }[] = [];
    
    selectedVersions.forEach(versionId => {
      const version = workflowVersions.find(v => v.id === versionId);
      if (version) {
        const scenario = allScenarios.find(s => s.id === version.scenarioId);
        if (scenario) {
          selectedItems.push({ scenario, version });
        }
      }
    });

    const prompt = `Create a professional sales presentation showcasing AI automation solutions.

Selected AI Solutions with Working Demos:
${selectedItems.map(({ scenario, version }, index) => `
═══════════════════════════════════════════════════════════════
SOLUTION ${index + 1}: ${scenario.title}
═══════════════════════════════════════════════════════════════

Business Problem:
${scenario.description}

Goal:
${scenario.goal}

Complete Workflow Implementation:
${version.workflowExplanation}

Impact Score: ${version.evaluationScore || 'N/A'}/100
${version.versionTitle ? `Version: ${version.versionTitle}` : ''}

---
WORKING DEMO FOR ${scenario.title.toUpperCase()}:

Create an INTERACTIVE DEMO section for this solution that includes:

1. **Live Input Form**: Create a realistic input form where users can enter sample data relevant to this workflow. Include:
   - Appropriate input fields based on the workflow steps
   - Placeholder text showing example values
   - A "Run Demo" button

2. **Simulated Processing Animation**: When the demo runs, show:
   - A step-by-step progress indicator matching the workflow steps
   - Brief animated transitions between steps (1-2 seconds each)
   - Visual indicators showing AI vs Human decision points

3. **Sample Output Display**: After the "processing" completes, display:
   - Realistic sample output that would result from this workflow
   - Key metrics or KPIs that would be generated
   - Before/After comparison if applicable

4. **ROI Calculator**: Include an interactive calculator showing:
   - Time saved per execution
   - Estimated cost savings (monthly/annually)
   - Productivity improvement percentage
---
`).join('\n')}

Please structure the presentation to include:
1. Executive Summary
2. For EACH solution above:
   a. Problem statement and business impact
   b. Solution overview with workflow diagram
   c. **WORKING INTERACTIVE DEMO** (as specified above)
   d. Expected ROI and metrics
3. Implementation Roadmap
4. Next Steps

CRITICAL: Each solution MUST have its own fully functional interactive demo.`;

    setGeneratedPrompt(prompt);
    setShowPromptModal(true);
  };

  const copyPromptToClipboard = () => {
    navigator.clipboard.writeText(generatedPrompt);
  };

  if (scenariosWithVersions.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-wm-neutral/20 shadow-sm">
        <div className="p-4 border-b border-wm-neutral/20">
          <h3 className="font-semibold text-wm-blue text-lg">Scenarios & Versions</h3>
        </div>
        <div className="p-12 text-center">
          <Icons.FileText className="w-16 h-16 text-wm-neutral mx-auto mb-4" />
          <p className="text-wm-blue/60 text-lg">No use case versions yet</p>
          <p className="text-wm-blue/40 text-sm mt-2">Complete scenario training to create use case versions</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="bg-white rounded-xl border border-wm-neutral/20 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-wm-neutral/20 flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-wm-blue text-lg">Scenarios & Versions</h3>
            <p className="text-sm text-wm-blue/60 mt-1">
              Select versions to generate a presentation prompt
            </p>
          </div>
          <button
            onClick={generatePresentationPrompt}
            disabled={selectedVersions.size === 0}
            className={`px-4 py-2 rounded-lg transition-colors flex items-center gap-2 text-sm ${
              selectedVersions.size > 0
                ? 'bg-wm-accent text-white hover:bg-wm-accent/90'
                : 'bg-wm-neutral/20 text-wm-blue/40 cursor-not-allowed'
            }`}
          >
            <Icons.Document className="w-4 h-4" />
            Gen AI Prompt ({selectedVersions.size})
          </button>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-wm-neutral/5 border-b border-wm-neutral/20">
              <tr>
                <th className="text-left py-3 px-4 font-semibold text-wm-blue/70 text-sm w-10"></th>
                <th className="text-left py-3 px-4 font-semibold text-wm-blue/70 text-sm w-10"></th>
                <th className="text-left py-3 px-4 font-semibold text-wm-blue/70 text-sm">Scenario / Version</th>
                <th className="text-left py-3 px-4 font-semibold text-wm-blue/70 text-sm">Domain</th>
                <th className="text-left py-3 px-4 font-semibold text-wm-blue/70 text-sm">Score</th>
                <th className="text-left py-3 px-4 font-semibold text-wm-blue/70 text-sm">Date</th>
                <th className="text-right py-3 px-4 font-semibold text-wm-blue/70 text-sm">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-wm-neutral/10">
              {scenariosWithVersions.map((scenario) => {
                const versions = versionsByScenario[scenario.id] || [];
                const isExpanded = expandedScenarios[scenario.id];
                const selectedCount = versions.filter(v => selectedVersions.has(v.id)).length;
                const allSelected = versions.length > 0 && selectedCount === versions.length;
                
                return (
                  <React.Fragment key={scenario.id}>
                    {/* Scenario Row */}
                    <tr className="hover:bg-wm-neutral/5 transition-colors bg-wm-neutral/5">
                      <td className="py-3 px-4">
                        <button
                          onClick={() => toggleExpanded(scenario.id)}
                          className="p-1 hover:bg-wm-neutral/10 rounded transition-colors"
                        >
                          {isExpanded ? (
                            <Icons.ChevronDown className="w-4 h-4 text-wm-blue/60" />
                          ) : (
                            <Icons.ChevronRight className="w-4 h-4 text-wm-blue/60" />
                          )}
                        </button>
                      </td>
                      <td className="py-3 px-4">
                        <input
                          type="checkbox"
                          checked={allSelected}
                          onChange={() => selectAllVersionsForScenario(scenario.id)}
                          className="w-4 h-4 rounded border-wm-neutral/30 text-wm-accent focus:ring-wm-accent"
                        />
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-wm-accent/10 rounded-lg flex items-center justify-center flex-shrink-0">
                            <Icons.FileText className="w-5 h-5 text-wm-accent" />
                          </div>
                          <div>
                            <span className="font-semibold text-wm-blue">{scenario.title}</span>
                            <p className="text-xs text-wm-blue/50">{versions.length} version{versions.length !== 1 ? 's' : ''}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="inline-block px-2 py-1 bg-wm-blue/10 text-wm-blue text-xs rounded">
                          {scenario.domain || 'General'}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-wm-blue/60">—</span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-wm-blue/60">—</span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        {selectedCount > 0 && (
                          <span className="text-xs text-wm-accent font-medium">
                            {selectedCount} selected
                          </span>
                        )}
                      </td>
                    </tr>
                    
                    {/* Version Rows */}
                    {isExpanded && versions.map((version) => (
                      <tr 
                        key={version.id}
                        className={`hover:bg-wm-neutral/5 transition-colors ${
                          selectedVersions.has(version.id) ? 'bg-wm-accent/5' : ''
                        }`}
                      >
                        <td className="py-3 px-4"></td>
                        <td className="py-3 px-4">
                          <input
                            type="checkbox"
                            checked={selectedVersions.has(version.id)}
                            onChange={() => toggleVersionSelection(version.id)}
                            className="w-4 h-4 rounded border-wm-neutral/30 text-wm-accent focus:ring-wm-accent"
                          />
                        </td>
                        <td className="py-3 px-4 pl-14">
                          <div className="flex items-center gap-2">
                            <Icons.Workflow className="w-4 h-4 text-wm-blue/40" />
                            <span className="text-wm-blue">
                              {version.versionTitle || `Version ${new Date(version.timestamp).toLocaleDateString()}`}
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <span className="text-wm-blue/50">—</span>
                        </td>
                        <td className="py-3 px-4">
                          {version.evaluationScore !== null ? (
                            <span className={`font-medium ${
                              version.evaluationScore >= 80 ? 'text-green-600' :
                              version.evaluationScore >= 60 ? 'text-amber-600' : 'text-red-600'
                            }`}>
                              {version.evaluationScore}%
                            </span>
                          ) : (
                            <span className="text-wm-blue/50">—</span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <span className="text-sm text-wm-blue/60">
                            {new Date(version.timestamp).toLocaleDateString()}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          {onViewWorkflow && (
                            <button
                              onClick={() => onViewWorkflow(version.id)}
                              className="px-3 py-1.5 text-sm text-wm-blue hover:bg-wm-blue/10 rounded-lg transition-colors"
                            >
                              View
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Prompt Modal */}
      {showPromptModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[80vh] flex flex-col">
            <div className="p-4 border-b border-wm-neutral/20 flex items-center justify-between">
              <h3 className="font-semibold text-wm-blue text-lg">Generated Presentation Prompt</h3>
              <button
                onClick={() => setShowPromptModal(false)}
                className="p-2 hover:bg-wm-neutral/10 rounded-lg transition-colors"
              >
                <Icons.X className="w-5 h-5 text-wm-blue/60" />
              </button>
            </div>
            <div className="flex-1 overflow-auto p-4">
              <pre className="whitespace-pre-wrap text-sm text-wm-blue/80 font-mono bg-wm-neutral/5 p-4 rounded-lg">
                {generatedPrompt}
              </pre>
            </div>
            <div className="p-4 border-t border-wm-neutral/20 flex justify-end gap-3">
              <button
                onClick={() => setShowPromptModal(false)}
                className="px-4 py-2 text-wm-blue hover:bg-wm-neutral/10 rounded-lg transition-colors"
              >
                Close
              </button>
              <button
                onClick={copyPromptToClipboard}
                className="px-4 py-2 bg-wm-accent text-white rounded-lg hover:bg-wm-accent/90 transition-colors flex items-center gap-2"
              >
                <Icons.Copy className="w-4 h-4" />
                Copy to Clipboard
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

const Dashboard2: React.FC<Dashboard2Props> = ({ 
  user, 
  onStartTraining, 
  onViewWorkflow, 
  onScenarioCreated, 
  handleNavigate,
  onNavigateToScenario
}) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState<MenuSection>('companies');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  
  // Data states
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [workflowVersions, setWorkflowVersions] = useState<WorkflowVersion[]>([]);
  const [evaluations, setEvaluations] = useState<AggregatedEvaluationResult[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [userRole, setUserRole] = useState<Role>('USER');
  
  // UI states
  const [showCreateModal, setShowCreateModal] = useState(false);
  
  // Search states
  const [companySearchQuery, setCompanySearchQuery] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [otherUsersCompanies, setOtherUsersCompanies] = useState<Company[]>([]);
  const [isSearchingOthers, setIsSearchingOthers] = useState(false);
  const [expandedRecentProcesses, setExpandedRecentProcesses] = useState<Record<string, boolean>>({});
  const isAdminUser = userRole === 'ADMIN' || userRole === 'SUPER_ADMIN';

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const sectionParam = params.get('section');
    if (sectionParam === 'overview' || sectionParam === 'companies' || sectionParam === 'settings') {
      setActiveSection(sectionParam);
    }
  }, [location.search]);
  
  // Search for other users' companies when query changes
  useEffect(() => {
    const searchOthers = async () => {
      if (!companySearchQuery.trim() || !user) {
        setOtherUsersCompanies([]);
        return;
      }
      
      setIsSearchingOthers(true);
      try {
        const results = await searchOtherUsersCompanies(user.uid, companySearchQuery);
        setOtherUsersCompanies(results);
      } catch (error) {
        console.error('Error searching other users companies:', error);
        setOtherUsersCompanies([]);
      } finally {
        setIsSearchingOthers(false);
      }
    };
    
    // Debounce the search
    const timeoutId = setTimeout(searchOthers, 300);
    return () => clearTimeout(timeoutId);
  }, [companySearchQuery, user]);
  
  // Filter companies based on search query
  const filteredCompanies = companySearchQuery.trim() 
    ? companies.filter(c => 
        c.name.toLowerCase().includes(companySearchQuery.toLowerCase())
      )
    : companies;
  
  // Check if search matches any existing company
  const hasExactMatch = companies.some(
    c => c.name.toLowerCase() === companySearchQuery.trim().toLowerCase()
  );
  const showCreateOption = isSearchFocused && !hasExactMatch;

  useEffect(() => {
    const fetchData = async () => {
      if (!user || user.isAnonymous) {
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);

        const profile = await getUserProfile(user.uid);
        setUserRole(profile?.role || 'USER');

        if (typeof window !== 'undefined') {
          const migrationKey = `migration-company-info-runs-v1:${user.uid}`;
          if (!window.localStorage.getItem(migrationKey)) {
            try {
              await migrateCompanyInfoForUserRuns(user.uid);
              window.localStorage.setItem(migrationKey, 'done');
            } catch (migrationError) {
              console.warn('Company info migration skipped:', migrationError);
            }
          }
        }

        const [scenariosData, workflowData, evaluationsData, companyResearchData] = await Promise.all([
          getScenarios(user.uid),
          getAllUserWorkflowVersions(user.uid),
          getAllUserEvaluations(user.uid),
          listCompanyResearch(user.uid)
        ]);

        const transformedCompanies = companyResearchData;

        if (typeof window !== 'undefined') {
          const nikeCompany = transformedCompanies.find(company => company.name.toLowerCase() === 'nike');
          if (nikeCompany) {
            const backfillKey = `backfill-unknown-company-nike-v1:${user.uid}`;
            if (!window.localStorage.getItem(backfillKey)) {
              try {
                await backfillUnknownCompanyForUserRuns(user.uid, nikeCompany.name);
                window.localStorage.setItem(backfillKey, 'done');
              } catch (backfillError) {
                console.warn('Nike backfill skipped:', backfillError);
              }
            }
          }
        }

        setScenarios(scenariosData);
        setWorkflowVersions(workflowData);
        setEvaluations(evaluationsData);
        setCompanies(transformedCompanies);
      } catch (e) {
        console.error('Could not fetch dashboard data', e);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [user]);

  // Listen for document upload events to refresh company data
  useEffect(() => {
    const handleDocumentUploaded = () => {
      // Refetch company data when a document is uploaded
      if (user && !user.isAnonymous) {
        listCompanyResearch(user.uid).then(companyResearchData => {
          setCompanies(companyResearchData);
        }).catch(err => {
          console.error('Failed to refresh companies after document upload:', err);
        });
      }
    };

    window.addEventListener('document-uploaded', handleDocumentUploaded);
    window.addEventListener('document-deleted', handleDocumentUploaded);
    return () => {
      window.removeEventListener('document-uploaded', handleDocumentUploaded);
      window.removeEventListener('document-deleted', handleDocumentUploaded);
    };
  }, [user]);

  // Handlers
  const handleScenarioCreated = async (data: ScenarioFormPayload) => {
    try {
      const { title, description, goal, domain, title_es, description_es, goal_es } = data;
      const newScenario = await saveUserScenario(user.uid, {
        title,
        description,
        goal,
        domain: domain || 'General',
        title_es,
        description_es,
        goal_es
      });
      
      setShowCreateModal(false);
      if (onScenarioCreated) {
        onScenarioCreated(newScenario);
      }
      onStartTraining?.(newScenario);
    } catch (error) {
      console.error('Failed to create scenario:', error);
    }
  };

  const handleToggleFavorite = async (scenario: Scenario) => {
    try {
      const newFavoriteState = await toggleFavoriteScenario(user.uid, scenario);
      setScenarios(prevScenarios => 
        prevScenarios.map(s => 
          s.id === scenario.id 
            ? {
                ...s,
                favoritedBy: newFavoriteState 
                  ? { ...s.favoritedBy, [user.uid]: true }
                  : Object.fromEntries(Object.entries(s.favoritedBy || {}).filter(([key]) => key !== user.uid))
              }
            : s
        )
      );
    } catch (error) {
      console.error('Failed to toggle favorite:', error);
    }
  };

  const allAvailableScenarios = [...ALL_SCENARIOS, ...scenarios];

  const companyItems: SidebarNavItem[] = [...companies]
    .sort((a, b) => (b.lastUpdated || 0) - (a.lastUpdated || 0))
    .slice(0, 5)
    .map((company) => ({
      id: `company-${company.id}`,
      label: company.name,
      icon: <Icons.Building className="w-4 h-4" />,
      onClick: () => handleNavigate?.('RESEARCH', company.id)
    }));

  const processRuns = evaluations.length > 0
    ? evaluations.map(run => ({ scenarioId: run.scenarioId, timestamp: run.timestamp }))
    : workflowVersions.map(run => ({ scenarioId: run.scenarioId, timestamp: run.timestamp }));

  const processByScenario = new Map<string, number>();
  processRuns.forEach((run) => {
    const current = processByScenario.get(run.scenarioId);
    if (!current || run.timestamp > current) {
      processByScenario.set(run.scenarioId, run.timestamp);
    }
  });

  const processItems: SidebarNavItem[] = Array.from(processByScenario.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([scenarioId]) => {
      const scenario = allAvailableScenarios.find(s => s.id === scenarioId);
      return {
        id: `process-${scenarioId}`,
        label: scenario?.title || 'Untitled process',
        icon: <Icons.Workflow className="w-4 h-4" />,
        onClick: () => {
          if (scenario) {
            onStartTraining?.(scenario);
          }
        }
      };
    });

  const menuItems: SidebarNavItem[] = [
    {
      id: 'overview',
      label: 'Dashboard',
      icon: <Icons.ClipboardCheck className="w-5 h-5" />,
      onClick: () => navigate('/dashboard'),
      isActive: location.pathname.startsWith('/dashboard') && !location.search.includes('section=')
    },
    {
      id: 'companies',
      label: 'Companies',
      icon: <Icons.Building className="w-5 h-5" />,
      onClick: () => navigate('/dashboard?section=companies'),
      isActive: location.pathname.startsWith('/company2') || location.pathname.startsWith('/research') || location.search.includes('section=companies'),
      children: companyItems
    },
    {
      id: 'processes',
      label: 'Processes',
      icon: <Icons.Workflow className="w-5 h-5" />,
      onClick: () => navigate('/library'),
      isActive: location.pathname.startsWith('/library')
    },
    {
      id: 'settings',
      label: 'Output History',
      icon: <Icons.Document className="w-5 h-5" />,
      onClick: () => navigate('/dashboard?section=settings'),
      isActive: location.search.includes('section=settings')
    }
  ];

  if (isLoading) {
    return (
      <div className="flex h-screen bg-wm-white">
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-wm-blue"></div>
          <span className="ml-3 text-wm-blue/70">Loading dashboard...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-wm-white">
      <SidebarNav
        user={user}
        items={menuItems}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
      />

      {/* Main Content Area */}
      <main className="flex-1 overflow-auto bg-wm-neutral/5">
        <div className="p-6 h-full flex flex-col">
          {/* Overview Section - Companies Table and Scenarios/Versions */}
          {activeSection === 'overview' && (
            <div className="space-y-8">
              <div className="text-center space-y-4">
                <h2 className="text-2xl font-semibold text-wm-blue">
                  Company Research Center
                </h2>
                <div className="flex items-center justify-center">
                  <div className="relative w-full max-w-2xl">
                    <SearchInput
                      type="text"
                      value={companySearchQuery}
                      onChange={(e) => setCompanySearchQuery(e.target.value)}
                      onFocus={() => setIsSearchFocused(true)}
                      onBlur={() => setTimeout(() => setIsSearchFocused(false), 200)}
                      placeholder="Search a company to explore"
                    />

                    {isSearchFocused && (
                      <div className="absolute top-full mt-2 w-full bg-white border-2 border-wm-accent/30 rounded-xl shadow-xl max-h-96 overflow-y-auto z-50">
                        {filteredCompanies.length > 0 && (
                          <div className="p-2">
                            <p className="text-xs text-wm-blue/50 px-4 py-2 uppercase font-medium">Your Companies</p>
                            {filteredCompanies.slice(0, 5).map((company) => (
                              <button
                                key={company.id}
                                onClick={() => {
                                  handleNavigate?.('RESEARCH', company.id);
                                  setCompanySearchQuery('');
                                }}
                                className="w-full px-6 py-3 text-left hover:bg-wm-accent/10 transition-colors border-b border-wm-neutral/10 last:border-b-0"
                              >
                                <div className="flex items-start gap-3">
                                  <Icons.Building className="w-4 h-4 text-wm-blue/60" />
                                  <div className="flex-1 min-w-0">
                                    <div className="font-bold text-wm-blue">{company.name}</div>
                                    <div className="text-sm text-wm-blue/60 line-clamp-1">
                                      {company.research?.currentResearch?.industry || 'Industry not specified'}
                                    </div>
                                  </div>
                                </div>
                              </button>
                            ))}
                          </div>
                        )}

                        {(otherUsersCompanies.length > 0 || isSearchingOthers) && (
                          <div className="border-t border-wm-neutral/10 p-2">
                            <p className="text-xs text-wm-blue/50 px-4 py-2 uppercase font-medium flex items-center gap-2">
                              <Icons.Users className="w-3 h-3" />
                              Other Users' Research
                              {isSearchingOthers && <span className="text-wm-accent">...</span>}
                            </p>
                            {otherUsersCompanies.slice(0, 5).map((company) => (
                              <button
                                key={company.id}
                                onClick={() => {
                                  handleNavigate?.('RESEARCH', company.id);
                                  setCompanySearchQuery('');
                                }}
                                className="w-full px-6 py-3 text-left hover:bg-wm-accent/10 transition-colors border-b border-wm-neutral/10 last:border-b-0"
                              >
                                <div className="flex items-start gap-3">
                                  <Icons.Building className="w-4 h-4 text-purple-400" />
                                  <div className="flex-1 min-w-0">
                                    <span className="text-wm-blue">{company.name}</span>
                                    <span className="ml-2 text-xs text-purple-500 bg-purple-100 px-1.5 py-0.5 rounded">shared</span>
                                  </div>
                                </div>
                              </button>
                            ))}
                          </div>
                        )}

                        {showCreateOption && (
                          <div className="border-t border-wm-neutral/10 p-2">
                            <button
                              onClick={() => {
                                handleNavigate?.('RESEARCH');
                                if (companySearchQuery.trim()) {
                                  sessionStorage.setItem('newCompanyName', companySearchQuery.trim());
                                  localStorage.removeItem('lastViewedCompany');
                                } else {
                                  sessionStorage.removeItem('newCompanyName');
                                  localStorage.removeItem('lastViewedCompany');
                                }
                                setCompanySearchQuery('');
                              }}
                              className="w-full px-6 py-3 text-left bg-wm-accent/5 hover:bg-wm-accent/10 transition-colors font-bold text-wm-accent flex items-center gap-2"
                            >
                              <Icons.Plus className="w-4 h-4" />
                              {companySearchQuery.trim()
                                ? `New research of "${companySearchQuery.trim()}"`
                                : 'New Company Research'}
                            </button>
                          </div>
                        )}

                        {companySearchQuery.trim().length > 0 && filteredCompanies.length === 0 && otherUsersCompanies.length === 0 && !isSearchingOthers && !showCreateOption && (
                          <div className="px-6 py-4 text-center text-wm-blue/50">
                            No companies found matching "{companySearchQuery}"
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <section className="lg:col-span-2 bg-white rounded-xl border border-wm-neutral/20 shadow-sm p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-wm-blue">Recent Companies</h3>
                      <p className="text-sm text-wm-blue/60">Manage and analyze organizations you work with</p>
                    </div>
                  </div>
                  {companies.length === 0 ? (
                    <div className="text-center py-10 text-wm-blue/60">No companies yet.</div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {[...companies]
                        .sort((a, b) => (b.lastUpdated || 0) - (a.lastUpdated || 0))
                        .slice(0, 6)
                        .map((company) => (
                          <div
                            key={company.id}
                            className="w-full text-left border border-wm-neutral/20 rounded-lg p-4 hover:shadow-sm hover:border-wm-blue/30 transition"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <button
                                onClick={() => handleNavigate?.('RESEARCH', company.id)}
                                className="text-left flex-1"
                              >
                                <p className="text-sm font-semibold text-wm-blue">{company.name}</p>
                                <p className="text-xs text-wm-blue/50 mt-1">
                                  {company.research?.currentResearch?.industry || 'Industry not specified'}
                                </p>
                              </button>
                              {isAdminUser && (
                                <button
                                  type="button"
                                  onClick={async (event) => {
                                    event.stopPropagation();
                                    if (!window.confirm(`Delete ${company.name}? This cannot be undone.`)) {
                                      return;
                                    }
                                    try {
                                      await deleteCompany(company.id, user.uid);
                                      setCompanies((prev) => prev.filter((item) => item.id !== company.id));
                                    } catch (error) {
                                      console.error('Failed to delete company:', error);
                                      const message = error instanceof Error ? error.message : 'Unknown error';
                                      alert(`Failed to delete company: ${message}`);
                                    }
                                  }}
                                  className="p-2 rounded-md text-wm-pink hover:bg-wm-pink/10"
                                  aria-label={`Delete ${company.name}`}
                                  title="Delete company"
                                >
                                  <Icons.Trash className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                            <div className="mt-3 text-xs text-wm-blue/50">
                              {company.selectedScenarios?.length || 0} processes • Updated {company.lastUpdated ? new Date(company.lastUpdated).toLocaleDateString() : '—'}
                            </div>
                          </div>
                        ))}
                    </div>
                  )}
                </section>

                <section className="bg-white rounded-xl border border-wm-neutral/20 shadow-sm p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-wm-blue">Recent Processes</h3>
                      <p className="text-sm text-wm-blue/60">Quickly access your recent processes</p>
                    </div>
                  </div>
                  {workflowVersions.length === 0 ? (
                    <div className="text-center py-10 text-wm-blue/60">No processes yet.</div>
                  ) : (
                    <div className="space-y-3">
                      {(() => {
                        const allAvailableScenarios = [...ALL_SCENARIOS, ...scenarios];
                        const useEvaluations = evaluations.length > 0;
                        const runs = useEvaluations
                          ? evaluations.map(run => ({
                              id: run.id,
                              scenarioId: run.scenarioId,
                              scenarioTitle: run.scenarioTitle,
                              companyName: run.companyName ?? null,
                              timestamp: run.timestamp,
                              workflowId: run.workflowVersionId || null
                            }))
                          : workflowVersions.map(run => ({
                              id: run.id,
                              scenarioId: run.scenarioId,
                              scenarioTitle: null,
                              companyName: run.companyName ?? null,
                              timestamp: run.timestamp,
                              workflowId: run.id
                            }));

                        const sortedRuns = [...runs].sort((a, b) => b.timestamp - a.timestamp);
                        const grouped = new Map<string, { scenarioId: string; latestTimestamp: number; runs: typeof runs }>();
                        sortedRuns.forEach((run) => {
                          const existing = grouped.get(run.scenarioId);
                          if (!existing) {
                            grouped.set(run.scenarioId, {
                              scenarioId: run.scenarioId,
                              latestTimestamp: run.timestamp,
                              runs: [run]
                            });
                          } else {
                            existing.runs.push(run);
                          }
                        });

                        return Array.from(grouped.values())
                          .sort((a, b) => b.latestTimestamp - a.latestTimestamp)
                          .map((group) => {
                            const scenario = allAvailableScenarios.find(s => s.id === group.scenarioId);
                            const latestRun = group.runs[0];
                            const remainingRuns = group.runs.slice(1);
                            const runsToShow = remainingRuns.slice(0, 3);
                            const isExpanded = !!expandedRecentProcesses[group.scenarioId];
                            return (
                              <div
                                key={group.scenarioId}
                                className={`w-full text-left border border-wm-neutral/20 rounded-lg p-4 transition-all ${
                                  scenario && onStartTraining
                                    ? 'hover:border-wm-accent/40 hover:bg-wm-neutral/5'
                                    : 'opacity-70 cursor-not-allowed'
                                }`}
                              >
                                <div className="flex items-start justify-between gap-3">
                                  <div>
                                    <a
                                      href="#"
                                      onClick={(event) => {
                                        event.preventDefault();
                                        if (scenario) {
                                          onStartTraining?.(scenario);
                                        }
                                      }}
                                      className={`text-sm font-semibold ${
                                        scenario && onStartTraining
                                          ? 'text-wm-blue hover:text-wm-accent underline'
                                          : 'text-wm-blue/60 cursor-not-allowed'
                                      }`}
                                      aria-disabled={!scenario || !onStartTraining}
                                    >
                                      {scenario?.title || latestRun.scenarioTitle || 'Untitled process'}
                                    </a>
                                    <p className="text-xs text-wm-blue/50">
                                      {scenario?.domain || 'General'}
                                    </p>
                                    {latestRun ? (
                                      <p className="text-xs text-wm-blue/50">
                                        Latest run:{' '}
                                        {latestRun.workflowId ? (
                                          <a
                                            href="#"
                                            onClick={(event) => {
                                              event.preventDefault();
                                              event.stopPropagation();
                                              onViewWorkflow?.(latestRun.workflowId as string);
                                            }}
                                            className="text-wm-blue hover:text-wm-accent underline"
                                          >
                                            {(latestRun.companyName || 'Unknown company')} • {new Date(latestRun.timestamp).toLocaleDateString()}
                                          </a>
                                        ) : (
                                          <span>
                                            {(latestRun.companyName || 'Unknown company')} • {new Date(latestRun.timestamp).toLocaleDateString()}
                                          </span>
                                        )}
                                      </p>
                                    ) : (
                                      <p className="text-xs text-wm-blue/50">
                                        No runs yet
                                      </p>
                                    )}
                                  </div>
                                </div>
                                {remainingRuns.length > 0 && (
                                  <div className="mt-3 pt-3 border-t border-wm-neutral/10 space-y-2">
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setExpandedRecentProcesses(prev => ({
                                          ...prev,
                                          [group.scenarioId]: !prev[group.scenarioId]
                                        }))
                                      }
                                      className="text-xs text-wm-accent hover:text-wm-accent/80"
                                    >
                                      {isExpanded ? 'Hide' : 'Show'} {remainingRuns.length} previous run{remainingRuns.length === 1 ? '' : 's'}
                                    </button>
                                    {isExpanded && (
                                      <div className="space-y-2">
                                        {runsToShow.map((run) => (
                                          <div
                                            key={run.id}
                                            className="flex items-center justify-between gap-3"
                                          >
                                            <div className="min-w-0">
                                              {run.workflowId ? (
                                                <a
                                                  href="#"
                                                  onClick={(event) => {
                                                    event.preventDefault();
                                                    event.stopPropagation();
                                                    onViewWorkflow?.(run.workflowId as string);
                                                  }}
                                                  className="text-xs font-medium text-wm-blue hover:text-wm-accent underline truncate block"
                                                >
                                                  {(run.companyName || 'Unknown company')} • {new Date(run.timestamp).toLocaleDateString()}
                                                </a>
                                              ) : (
                                                <span className="text-xs font-medium text-wm-blue truncate block">
                                                  {(run.companyName || 'Unknown company')} • {new Date(run.timestamp).toLocaleDateString()}
                                                </span>
                                              )}
                                              <p className="text-[11px] text-wm-blue/50">
                                                {new Date(run.timestamp).toLocaleDateString()}
                                              </p>
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            );
                          });
                      })()}
                    </div>
                  )}
                </section>
              </div>
            </div>
          )}

          {/* Companies Section */}
          {activeSection === 'companies' && (
            <div className="space-y-6">
              <div className="bg-white rounded-xl border border-wm-neutral/20 shadow-sm">
                <div className="p-6 border-b border-wm-neutral/20">
                  <div className="text-center space-y-4">
                    <h3 className="text-xl font-semibold text-wm-blue">All Companies</h3>
                    <div className="flex items-center justify-center">
                      <div className="relative w-full max-w-2xl">
                        <SearchInput
                          type="text"
                          value={companySearchQuery}
                          onChange={(e) => setCompanySearchQuery(e.target.value)}
                          onFocus={() => setIsSearchFocused(true)}
                          onBlur={() => setTimeout(() => setIsSearchFocused(false), 200)}
                          placeholder="Search a company to explore"
                        />

                        {isSearchFocused && (
                          <div className="absolute top-full mt-2 w-full bg-white border-2 border-wm-accent/30 rounded-xl shadow-xl max-h-96 overflow-y-auto z-50">
                            {/* Your Companies Section */}
                            {filteredCompanies.length > 0 && (
                              <div className="p-2">
                                <p className="text-xs text-wm-blue/50 px-4 py-2 uppercase font-medium">Your Companies</p>
                                {filteredCompanies.slice(0, 5).map((company) => (
                                  <button
                                    key={company.id}
                                    onClick={() => {
                                      handleNavigate?.('RESEARCH', company.id);
                                      setCompanySearchQuery('');
                                    }}
                                    className="w-full px-6 py-3 text-left hover:bg-wm-accent/10 transition-colors border-b border-wm-neutral/10 last:border-b-0"
                                  >
                                    <div className="flex items-start gap-3">
                                      <Icons.Building className="w-4 h-4 text-wm-blue/60" />
                                      <div className="flex-1 min-w-0">
                                        <div className="font-bold text-wm-blue">{company.name}</div>
                                        <div className="text-sm text-wm-blue/60 line-clamp-1">
                                          {company.research?.currentResearch?.industry || 'Industry not specified'}
                                        </div>
                                      </div>
                                    </div>
                                  </button>
                                ))}
                              </div>
                            )}

                            {/* Other Users' Research Section */}
                            {(otherUsersCompanies.length > 0 || isSearchingOthers) && (
                              <div className="border-t border-wm-neutral/10 p-2">
                                <p className="text-xs text-wm-blue/50 px-4 py-2 uppercase font-medium flex items-center gap-2">
                                  <Icons.Users className="w-3 h-3" />
                                  Other Users' Research
                                  {isSearchingOthers && <span className="text-wm-accent">...</span>}
                                </p>
                                {otherUsersCompanies.slice(0, 5).map((company) => (
                                  <button
                                    key={company.id}
                                    onClick={() => {
                                      handleNavigate?.('RESEARCH', company.id);
                                      setCompanySearchQuery('');
                                    }}
                                    className="w-full px-6 py-3 text-left hover:bg-purple-50 transition-colors border-b border-wm-neutral/10 last:border-b-0"
                                  >
                                    <div className="flex items-start gap-3">
                                      <Icons.Building className="w-4 h-4 text-purple-400" />
                                      <div className="flex-1 min-w-0">
                                        <div className="font-bold text-wm-blue">{company.name}</div>
                                        <div className="text-xs text-purple-500 bg-purple-100 inline-block mt-1 px-1.5 py-0.5 rounded">
                                          shared
                                        </div>
                                      </div>
                                    </div>
                                  </button>
                                ))}
                              </div>
                            )}

                            {showCreateOption && (
                              <div className="border-t border-wm-neutral/10 p-2">
                                <button
                                  onClick={() => {
                                    handleNavigate?.('RESEARCH');
                                    if (companySearchQuery.trim()) {
                                      sessionStorage.setItem('newCompanyName', companySearchQuery.trim());
                                      localStorage.removeItem('lastViewedCompany');
                                    } else {
                                      sessionStorage.removeItem('newCompanyName');
                                      localStorage.removeItem('lastViewedCompany');
                                    }
                                    setCompanySearchQuery('');
                                  }}
                                  className="w-full px-6 py-3 text-left hover:bg-wm-accent/10 transition-colors"
                                >
                                  <div className="flex items-center gap-2">
                                    <Icons.Plus className="w-4 h-4 text-wm-accent" />
                                    <span className="text-wm-accent font-medium">
                                      {companySearchQuery.trim()
                                        ? `New research of "${companySearchQuery.trim()}"`
                                        : 'New Company Research'}
                                    </span>
                                  </div>
                                </button>
                              </div>
                            )}

                            {companySearchQuery.trim().length > 0 && filteredCompanies.length === 0 && otherUsersCompanies.length === 0 && !isSearchingOthers && !showCreateOption && (
                              <div className="p-4 text-center text-sm text-wm-blue/50">
                                No companies found
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => handleNavigate?.('RESEARCH')}
                      className="mx-auto px-4 py-2 bg-wm-accent text-white text-sm rounded-lg hover:bg-wm-accent/90 transition-colors flex items-center gap-2"
                    >
                      <Icons.Plus className="w-4 h-4" />
                      Add Company
                    </button>
                  </div>
                </div>
                <div className="p-4">
                  {filteredCompanies.length === 0 ? (
                    <div className="text-center py-12">
                      <Icons.Building className="w-12 h-12 text-wm-neutral mx-auto mb-4" />
                      <p className="text-wm-blue/60">
                        {companySearchQuery.trim() ? 'No matching companies' : 'No companies yet'}
                      </p>
                      {!companySearchQuery.trim() && (
                        <button
                          onClick={() => handleNavigate?.('RESEARCH')}
                          className="mt-4 px-4 py-2 bg-wm-blue text-white rounded-lg hover:bg-wm-blue/90 transition-colors"
                        >
                          Start Your First Research
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {filteredCompanies.map((company) => (
                        <div 
                          key={company.id}
                          className="p-4 border border-wm-neutral/20 rounded-lg hover:border-wm-blue/30 hover:shadow-md cursor-pointer transition-all"
                          onClick={() => handleNavigate?.('RESEARCH', company.id)}
                        >
                          <div className="flex items-start gap-3">
                            <div className="w-12 h-12 bg-wm-blue/10 rounded-lg flex items-center justify-center flex-shrink-0">
                              <Icons.Building className="w-6 h-6 text-wm-blue" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className="font-semibold text-wm-blue truncate">{company.name}</h4>
                              <p className="text-sm text-wm-blue/60 mt-1">
                                {company.research?.currentResearch?.industry || 'Industry not specified'}
                              </p>
                              <div className="flex items-center gap-2 mt-2">
                                <span className="text-xs bg-wm-neutral/10 text-wm-blue/70 px-2 py-1 rounded">
                                  {company.selectedScenarios?.length || 0} scenarios
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}


          {/* Settings Section */}
          {activeSection === 'settings' && (
            <div className="space-y-6">
              {(() => {
                const allAvailableScenarios = [...ALL_SCENARIOS, ...scenarios];
                const companyMap = new Map<string, { name: string; presentations: { label: string; url: string; timestamp: number }[]; demos: { label: string; url: string; timestamp: number }[] }>();

                workflowVersions.forEach((workflow) => {
                  const companyName = workflow.companyName || 'Unknown company';
                  const scenario = allAvailableScenarios.find(s => s.id === workflow.scenarioId);
                  const labelBase = workflow.versionTitle || scenario?.title || 'Untitled process';
                  const entry = companyMap.get(companyName) || { name: companyName, presentations: [], demos: [] };

                  if (workflow.gammaDownloadUrl) {
                    entry.presentations.push({
                      label: `${labelBase} • ${new Date(workflow.timestamp).toLocaleDateString()}`,
                      url: workflow.gammaDownloadUrl,
                      timestamp: workflow.timestamp
                    });
                  }

                  if (workflow.demoProjectUrl) {
                    entry.demos.push({
                      label: `${labelBase} • Demo Project • ${new Date(workflow.timestamp).toLocaleDateString()}`,
                      url: workflow.demoProjectUrl,
                      timestamp: workflow.timestamp
                    });
                  }
                  if (workflow.demoPublishedUrl) {
                    entry.demos.push({
                      label: `${labelBase} • Published Demo • ${new Date(workflow.timestamp).toLocaleDateString()}`,
                      url: workflow.demoPublishedUrl,
                      timestamp: workflow.timestamp
                    });
                  }

                  companyMap.set(companyName, entry);
                });

                evaluations.forEach((evaluation) => {
                  const companyName = evaluation.companyName || 'Unknown company';
                  const scenario = allAvailableScenarios.find(s => s.id === evaluation.scenarioId);
                  const labelBase = scenario?.title || evaluation.scenarioTitle || 'Untitled process';
                  const entry = companyMap.get(companyName) || { name: companyName, presentations: [], demos: [] };

                  if (evaluation.demoProjectUrl) {
                    entry.demos.push({
                      label: `${labelBase} • Demo Project • ${new Date(evaluation.timestamp).toLocaleDateString()}`,
                      url: evaluation.demoProjectUrl,
                      timestamp: evaluation.timestamp
                    });
                  }
                  if (evaluation.demoPublishedUrl) {
                    entry.demos.push({
                      label: `${labelBase} • Published Demo • ${new Date(evaluation.timestamp).toLocaleDateString()}`,
                      url: evaluation.demoPublishedUrl,
                      timestamp: evaluation.timestamp
                    });
                  }

                  companyMap.set(companyName, entry);
                });

                const companiesWithOutput = Array.from(companyMap.values())
                  .map((company) => ({
                    ...company,
                    presentations: company.presentations.sort((a, b) => b.timestamp - a.timestamp),
                    demos: company.demos.sort((a, b) => b.timestamp - a.timestamp)
                  }))
                  .filter((company) => company.presentations.length > 0 || company.demos.length > 0)
                  .sort((a, b) => a.name.localeCompare(b.name));

                if (companiesWithOutput.length === 0) {
                  return (
                    <div className="bg-white rounded-xl border border-wm-neutral/20 shadow-sm p-6 text-center text-wm-blue/60">
                      No output history yet.
                    </div>
                  );
                }

                return companiesWithOutput.map((company) => (
                  <div key={company.name} className="bg-white rounded-xl border border-wm-neutral/20 shadow-sm">
                    <div className="p-4 border-b border-wm-neutral/20">
                      <h3 className="font-semibold text-wm-blue">{company.name}</h3>
                    </div>
                    <div className="p-4 space-y-4">
                      <div>
                        <h4 className="text-sm font-semibold text-wm-blue/80 mb-2">Presentations</h4>
                        {company.presentations.length === 0 ? (
                          <p className="text-sm text-wm-blue/50">No presentations yet.</p>
                        ) : (
                          <ul className="space-y-2">
                            {company.presentations.map((item, idx) => (
                              <li key={`${item.url}-${idx}`}>
                                <a
                                  href={item.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-sm text-wm-blue hover:text-wm-accent underline"
                                >
                                  {item.label}
                                </a>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold text-wm-blue/80 mb-2">Demos</h4>
                        {company.demos.length === 0 ? (
                          <p className="text-sm text-wm-blue/50">No demos yet.</p>
                        ) : (
                          <ul className="space-y-2">
                            {company.demos.map((item, idx) => (
                              <li key={`${item.url}-${idx}`}>
                                <a
                                  href={item.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-sm text-wm-blue hover:text-wm-accent underline"
                                >
                                  {item.label}
                                </a>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </div>
                  </div>
                ));
              })()}
            </div>
          )}
        </div>
      </main>

      {/* Create Process Modal */}
      {showCreateModal && (
        <CreateScenarioForm
          onSave={handleScenarioCreated}
          onClose={() => setShowCreateModal(false)}
        />
      )}
    </div>
  );
};

export default Dashboard2;
