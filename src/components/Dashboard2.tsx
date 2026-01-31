import React, { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import { 
  getAllUserEvaluations, 
  getScenarios, 
  getAllUserWorkflowVersions, 
  saveUserScenario, 
  toggleFavoriteScenario,
  listCompanyResearch,
  searchOtherUsersCompanies
} from '../services/firebaseService';
import type { Scenario, WorkflowVersion, AggregatedEvaluationResult, Company } from '../types';
import CreateScenarioForm, { ScenarioFormPayload } from './CreateScenarioForm';
import { Icons, ALL_SCENARIOS } from '../constants';

interface Dashboard2Props {
  user: User;
  onStartTraining?: (scenario?: Scenario) => void;
  onViewWorkflow?: (workflowId: string) => void;
  onScenarioCreated?: (newScenario: Scenario) => void;
  handleNavigate?: (view: 'DASHBOARD' | 'TRAINING' | 'ADMIN' | 'RESEARCH', companyId?: string) => void;
  onNavigateToScenario?: (scenarioId: string) => void;
}

type MenuSection = 'overview' | 'companies' | 'workflows' | 'settings';

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
    const docs = company.research?.currentResearch?.documents || [];
    const rfp = company.research?.currentResearch?.rfpDocument;
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
  const [activeSection, setActiveSection] = useState<MenuSection>('overview');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  
  // Data states
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [workflowVersions, setWorkflowVersions] = useState<WorkflowVersion[]>([]);
  const [evaluations, setEvaluations] = useState<AggregatedEvaluationResult[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // UI states
  const [showCreateModal, setShowCreateModal] = useState(false);
  
  // Search states
  const [companySearchQuery, setCompanySearchQuery] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [otherUsersCompanies, setOtherUsersCompanies] = useState<Company[]>([]);
  const [isSearchingOthers, setIsSearchingOthers] = useState(false);
  const [expandedProcesses, setExpandedProcesses] = useState<Record<string, boolean>>({});
  
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
  const showCreateOption = companySearchQuery.trim().length > 0 && !hasExactMatch;

  useEffect(() => {
    const fetchData = async () => {
      if (!user || user.isAnonymous) {
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);

        const [scenariosData, workflowData, evaluationsData, companyResearchData] = await Promise.all([
          getScenarios(user.uid),
          getAllUserWorkflowVersions(user.uid),
          getAllUserEvaluations(user.uid),
          listCompanyResearch(user.uid)
        ]);

        // Transform company research data
        const transformedCompanies = companyResearchData.reduce((uniqueCompanies, researchData) => {
          const { name, currentResearch, history, lastUpdated, selectedScenarios = [] } = researchData;
          const resolvedLastUpdated = lastUpdated ?? Date.now();
          const existingCompany = uniqueCompanies.find(c => c.name.toLowerCase() === name.toLowerCase());
          
          if (existingCompany) {
            if (resolvedLastUpdated > existingCompany.lastUpdated) {
              existingCompany.lastUpdated = resolvedLastUpdated;
              existingCompany.selectedScenarios = selectedScenarios;
              existingCompany.research = {
                name,
                currentResearch,
                history: [...(history || []), ...(existingCompany.research.history || [])],
                lastUpdated: resolvedLastUpdated
              };
            }
            return uniqueCompanies;
          }

          uniqueCompanies.push({
            id: `${name.toLowerCase()}_${Date.now()}`,
            name,
            createdBy: user.uid,
            createdAt: resolvedLastUpdated,
            lastUpdated: resolvedLastUpdated,
            selectedScenarios,
            research: {
              name,
              currentResearch,
              history: history || [],
              lastUpdated: resolvedLastUpdated
            }
          });

          return uniqueCompanies;
        }, [] as Company[]);

        setScenarios(scenariosData);
        setWorkflowVersions(workflowData);
        setEvaluations(evaluationsData);
        setCompanies(transformedCompanies);
        
        console.log('Dashboard2 Data Loaded:', {
          scenariosCount: scenariosData.length,
          workflowVersionsCount: workflowData.length,
          evaluationsCount: evaluationsData.length,
          evaluationsWithDemoUrls: evaluationsData.filter(e => e.demoProjectUrl || e.demoPublishedUrl).length,
          workflowsWithDemoUrls: workflowData.filter(w => w.demoProjectUrl || w.demoPublishedUrl).length,
          sampleEvaluation: evaluationsData[0],
          sampleWorkflow: workflowData[0]
        });
      } catch (e) {
        console.error('Could not fetch dashboard data', e);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
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

  // Menu items configuration
  const menuItems: { id: MenuSection; label: string; icon: React.ReactNode }[] = [
    { id: 'overview', label: 'Overview', icon: <Icons.Home className="w-5 h-5" /> },
    { id: 'companies', label: 'Companies', icon: <Icons.Building className="w-5 h-5" /> },
    { id: 'workflows', label: 'Use Cases', icon: <Icons.Workflow className="w-5 h-5" /> },
    { id: 'settings', label: 'Settings', icon: <Icons.Settings className="w-5 h-5" /> },
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
      {/* Left Sidebar */}
      <aside 
        className={`${isSidebarCollapsed ? 'w-16' : 'w-64'} bg-white border-r border-wm-neutral/20 flex flex-col transition-all duration-300 ease-in-out`}
      >
        {/* Sidebar Header */}
        <div className="p-4 border-b border-wm-neutral/20">
          <div className="flex items-center justify-between">
            {!isSidebarCollapsed && (
              <h1 className="text-lg font-bold text-wm-blue">AI Operator Hub</h1>
            )}
            <button 
              onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
              className="p-2 hover:bg-wm-neutral/10 rounded-lg transition-colors text-wm-blue/70"
            >
              {isSidebarCollapsed ? (
                <Icons.ChevronRight className="w-5 h-5" />
              ) : (
                <Icons.ChevronLeft className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>

        {/* Navigation Menu */}
        <nav className="flex-1 py-4">
          <ul className="space-y-1 px-2">
            {menuItems.map((item) => (
              <li key={item.id}>
                <button
                  onClick={() => setActiveSection(item.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 ${
                    activeSection === item.id
                      ? 'bg-wm-blue text-white'
                      : 'text-wm-blue/70 hover:bg-wm-neutral/10 hover:text-wm-blue'
                  }`}
                  title={isSidebarCollapsed ? item.label : undefined}
                >
                  {item.icon}
                  {!isSidebarCollapsed && (
                    <span className="font-medium">{item.label}</span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        </nav>

        {/* Sidebar Footer - User Info */}
        <div className="p-4 border-t border-wm-neutral/20">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-wm-accent flex items-center justify-center text-sm font-bold text-white">
              {user.displayName?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase() || '?'}
            </div>
            {!isSidebarCollapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-wm-blue truncate">{user.displayName || 'User'}</p>
                <p className="text-xs text-wm-blue/50 truncate">{user.email}</p>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-auto bg-wm-neutral/5">
        {/* Top Bar */}
        <header className="bg-white border-b border-wm-neutral/20 px-6 py-4 sticky top-0 z-10">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-wm-blue capitalize">{activeSection}</h2>
              <p className="text-sm text-wm-blue/60">
                {activeSection === 'overview' && 'Your dashboard at a glance'}
                {activeSection === 'companies' && 'Manage your company research'}
                {activeSection === 'workflows' && 'View and manage your use cases'}
                {activeSection === 'settings' && 'Configure your preferences'}
              </p>
            </div>
            {activeSection !== 'workflows' && (
              <div className="flex items-center gap-3">
                {/* Company Search Experience */}
                <div className="relative">
                  <div className="flex items-center">
                    <div className="relative">
                      <Icons.Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-wm-blue/40" />
                      <input
                        type="text"
                        value={companySearchQuery}
                        onChange={(e) => setCompanySearchQuery(e.target.value)}
                        onFocus={() => setIsSearchFocused(true)}
                        onBlur={() => setTimeout(() => setIsSearchFocused(false), 200)}
                        placeholder="Research Company"
                        className="pl-9 pr-4 py-2 w-64 border border-wm-neutral/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-wm-accent/50 focus:border-wm-accent text-sm"
                      />
                      {companySearchQuery && (
                        <button
                          onClick={() => setCompanySearchQuery('')}
                          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-wm-blue/40 hover:text-wm-blue"
                        >
                          <Icons.X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                  
                  {/* Search Dropdown */}
                  {isSearchFocused && companySearchQuery.trim() && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-wm-neutral/20 rounded-lg shadow-lg z-50 max-h-80 overflow-y-auto min-w-[320px]">
                      {/* Your Companies Section */}
                      {filteredCompanies.length > 0 && (
                        <div className="p-2">
                          <p className="text-xs text-wm-blue/50 px-2 py-1 uppercase font-medium">Your Companies</p>
                          {filteredCompanies.slice(0, 5).map((company) => (
                            <button
                              key={company.id}
                              onClick={() => {
                                handleNavigate?.('RESEARCH', company.id);
                                setCompanySearchQuery('');
                              }}
                              className="w-full px-3 py-2 text-left hover:bg-wm-blue/5 rounded-md flex items-center gap-2 text-sm"
                            >
                              <Icons.Building className="w-4 h-4 text-wm-blue/60" />
                              <span className="text-wm-blue">{company.name}</span>
                            </button>
                          ))}
                        </div>
                      )}
                      
                      {/* Other Users' Research Section */}
                      {(otherUsersCompanies.length > 0 || isSearchingOthers) && (
                        <div className="border-t border-wm-neutral/10 p-2">
                          <p className="text-xs text-wm-blue/50 px-2 py-1 uppercase font-medium flex items-center gap-2">
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
                              className="w-full px-3 py-2 text-left hover:bg-purple-50 rounded-md flex items-center gap-2 text-sm group"
                            >
                              <Icons.Building className="w-4 h-4 text-purple-400" />
                              <div className="flex-1 min-w-0">
                                <span className="text-wm-blue">{company.name}</span>
                                <span className="ml-2 text-xs text-purple-500 bg-purple-100 px-1.5 py-0.5 rounded">
                                  shared
                                </span>
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                      
                      {showCreateOption && (
                        <div className="border-t border-wm-neutral/10 p-2">
                          <button
                            onClick={() => {
                              // Navigate to research view with pre-filled company name
                              handleNavigate?.('RESEARCH');
                              // Store the company name to be used in the research form
                              sessionStorage.setItem('newCompanyName', companySearchQuery.trim());
                              setCompanySearchQuery('');
                            }}
                            className="w-full px-3 py-2 text-left hover:bg-wm-accent/10 rounded-md flex items-center gap-2 text-sm"
                          >
                            <Icons.Plus className="w-4 h-4 text-wm-accent" />
                            <span className="text-wm-accent font-medium">Create "{companySearchQuery.trim()}"</span>
                          </button>
                        </div>
                      )}
                      
                      {filteredCompanies.length === 0 && otherUsersCompanies.length === 0 && !isSearchingOthers && !showCreateOption && (
                        <div className="p-4 text-center text-sm text-wm-blue/50">
                          No companies found
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </header>

        {/* Content Area */}
        <div className="p-6">
          {/* Overview Section - Companies Table and Scenarios/Versions */}
          {activeSection === 'overview' && (
            <div className="space-y-6">
              {/* Show filtered indicator when searching */}
              {companySearchQuery.trim() && (
                <div className="flex items-center gap-2 text-sm text-wm-blue/60 bg-wm-blue/5 px-4 py-2 rounded-lg">
                  <Icons.Search className="w-4 h-4" />
                  <span>
                    Showing {filteredCompanies.length} {filteredCompanies.length === 1 ? 'company' : 'companies'} matching "{companySearchQuery}"
                  </span>
                  <button
                    onClick={() => setCompanySearchQuery('')}
                    className="ml-auto text-wm-accent hover:text-wm-accent/80"
                  >
                    Clear search
                  </button>
                </div>
              )}
              <CompaniesTableWithScenarios 
                companies={filteredCompanies}
                scenarios={scenarios}
                workflowVersions={workflowVersions}
                onNavigateToResearch={(companyId) => handleNavigate?.('RESEARCH', companyId)}
                onStartTraining={onStartTraining}
                onNavigateToScenario={onNavigateToScenario}
                onViewWorkflow={onViewWorkflow}
              />

              {/* Workflows Section */}
              <div className="bg-white rounded-xl border border-wm-neutral/20 shadow-sm">
                <div className="p-4 border-b border-wm-neutral/20 flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-wm-blue text-lg">Use Cases</h3>
                    <p className="text-sm text-wm-blue/60 mt-1">Your saved use case versions and solutions</p>
                  </div>
                  <button
                    onClick={() => setActiveSection('workflows')}
                    className="text-sm text-wm-accent hover:text-wm-accent/80 font-medium"
                  >
                    View All →
                  </button>
                </div>
                <div className="p-4">
                  {workflowVersions.length === 0 ? (
                    <div className="text-center py-12">
                      <Icons.Workflow className="w-12 h-12 text-wm-neutral mx-auto mb-4" />
                      <p className="text-wm-blue/60">No use cases yet</p>
                      <p className="text-sm text-wm-blue/50 mt-2">Create your first use case by training on a scenario</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {workflowVersions.slice(0, 6).map((workflow) => {
                        const scenario = scenarios.find(s => s.id === workflow.scenarioId);
                        return (
                          <div 
                            key={workflow.id}
                            className="p-4 border border-wm-neutral/20 rounded-lg hover:border-wm-blue/30 hover:shadow-md cursor-pointer transition-all"
                            onClick={() => onViewWorkflow?.(workflow.id)}
                          >
                            <div className="flex items-start gap-3">
                              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                                <Icons.Workflow className="w-6 h-6 text-purple-600" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <h4 className="font-semibold text-wm-blue truncate">
                                  {workflow.versionTitle || 'Untitled Use Case'}
                                </h4>
                                <p className="text-sm text-wm-blue/60 mt-1 line-clamp-2">
                                  {scenario?.title || 'Unknown scenario'}
                                </p>
                                <div className="flex items-center gap-2 mt-2">
                                  {workflow.evaluationScore !== null && (
                                    <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">
                                      Score: {workflow.evaluationScore}
                                    </span>
                                  )}
                                  <span className="text-xs text-wm-blue/50">
                                    {new Date(workflow.timestamp).toLocaleDateString()}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Companies Section */}
          {activeSection === 'companies' && (
            <div className="space-y-6">
              <div className="bg-white rounded-xl border border-wm-neutral/20 shadow-sm">
                <div className="p-4 border-b border-wm-neutral/20 flex items-center justify-between">
                  <h3 className="font-semibold text-wm-blue">All Companies</h3>
                  <button
                    onClick={() => handleNavigate?.('RESEARCH')}
                    className="px-3 py-1.5 bg-wm-accent text-white text-sm rounded-lg hover:bg-wm-accent/90 transition-colors flex items-center gap-2"
                  >
                    <Icons.Plus className="w-4 h-4" />
                    Add Company
                  </button>
                </div>
                <div className="p-4">
                  {companies.length === 0 ? (
                    <div className="text-center py-12">
                      <Icons.Building className="w-12 h-12 text-wm-neutral mx-auto mb-4" />
                      <p className="text-wm-blue/60">No companies yet</p>
                      <button
                        onClick={() => handleNavigate?.('RESEARCH')}
                        className="mt-4 px-4 py-2 bg-wm-blue text-white rounded-lg hover:bg-wm-blue/90 transition-colors"
                      >
                        Start Your First Research
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {companies.map((company) => (
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

          {/* Workflows Section */}
          {activeSection === 'workflows' && (
            <div className="space-y-6">
              {(() => {
                const toggleProcess = (scenarioId: string) => {
                  setExpandedProcesses(prev => ({
                    ...prev,
                    [scenarioId]: !prev[scenarioId]
                  }));
                };
                
                if (workflowVersions.length === 0) {
                  return (
                    <div className="bg-white rounded-xl border border-wm-neutral/20 shadow-sm">
                      <div className="p-4 border-b border-wm-neutral/20">
                        <h3 className="font-semibold text-wm-blue">All Use Cases</h3>
                      </div>
                      <div className="p-4">
                        <div className="text-center py-12">
                          <Icons.Workflow className="w-12 h-12 text-wm-neutral mx-auto mb-4" />
                          <p className="text-wm-blue/60">No use cases yet</p>
                          <p className="text-sm text-wm-blue/50 mt-2">Complete a scenario to create your first use case</p>
                        </div>
                      </div>
                    </div>
                  );
                }
                
                return (
                  <>
                    {workflowVersions.length === 0 ? (
                <div className="bg-white rounded-xl border border-wm-neutral/20 shadow-sm">
                  <div className="p-4 border-b border-wm-neutral/20">
                    <h3 className="font-semibold text-wm-blue">All Use Cases</h3>
                  </div>
                  <div className="p-4">
                    <div className="text-center py-12">
                      <Icons.Workflow className="w-12 h-12 text-wm-neutral mx-auto mb-4" />
                      <p className="text-wm-blue/60">No use cases yet</p>
                      <p className="text-sm text-wm-blue/50 mt-2">Complete a scenario to create your first use case</p>
                    </div>
                  </div>
                </div>
              ) : (
                (() => {
                  // Group workflow versions by scenario
                  const groupedByScenario: Record<string, { scenario: Scenario | undefined; workflows: typeof workflowVersions }> = {};
                  
                  workflowVersions.forEach((workflow) => {
                    if (!groupedByScenario[workflow.scenarioId]) {
                      groupedByScenario[workflow.scenarioId] = {
                        scenario: scenarios.find(s => s.id === workflow.scenarioId),
                        workflows: []
                      };
                    }
                    groupedByScenario[workflow.scenarioId].workflows.push(workflow);
                  });

                  // Sort workflows within each group by timestamp (newest first)
                  Object.values(groupedByScenario).forEach(group => {
                    group.workflows.sort((a, b) => b.timestamp - a.timestamp);
                  });

                  return (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {Object.entries(groupedByScenario).map(([scenarioId, { scenario, workflows }]) => {
                        // Get latest workflow for demo URLs
                        const latestWorkflow = workflows[0];
                        
                        // Check workflow version for demo URLs first, then fall back to evaluation
                        const hasDirectDemoUrls = latestWorkflow?.demoProjectUrl || latestWorkflow?.demoPublishedUrl;
                        const evaluation = !hasDirectDemoUrls && latestWorkflow?.sourceEvaluationId 
                          ? evaluations.find(e => e.id === latestWorkflow.sourceEvaluationId)
                          : null;
                        
                        const projectUrl = latestWorkflow?.demoProjectUrl || evaluation?.demoProjectUrl;
                        const publishedUrl = latestWorkflow?.demoPublishedUrl || evaluation?.demoPublishedUrl;
                        
                        console.log('Dashboard2 Latest Workflow:', {
                          scenarioTitle: scenario?.title,
                          workflowHasDemoUrls: hasDirectDemoUrls,
                          workflowDemoProjectUrl: latestWorkflow?.demoProjectUrl,
                          workflowDemoPublishedUrl: latestWorkflow?.demoPublishedUrl,
                          sourceEvaluationId: latestWorkflow?.sourceEvaluationId,
                          evaluationFound: !!evaluation,
                          evaluationDemoProjectUrl: evaluation?.demoProjectUrl,
                          evaluationDemoPublishedUrl: evaluation?.demoPublishedUrl,
                          finalProjectUrl: projectUrl,
                          finalPublishedUrl: publishedUrl
                        });
                        
                        return (
                          <div key={scenarioId} className="bg-white rounded-xl border border-wm-neutral/20 shadow-sm hover:shadow-md transition-shadow flex flex-col">
                            <div className="p-5 flex-1">
                              <div className="flex items-start justify-between mb-3">
                                <h3 className="font-semibold text-wm-blue text-lg line-clamp-2 flex-1">
                                  {scenario?.title || 'Unknown Process'}
                                </h3>
                                {scenario?.domain && (
                                  <span className="ml-2 px-2 py-1 bg-wm-blue/10 text-wm-blue text-xs font-semibold rounded-full flex-shrink-0">
                                    {scenario.domain}
                                  </span>
                                )}
                              </div>
                              <p className="text-sm text-wm-blue/60 mb-4">
                                {workflows.length} use {workflows.length === 1 ? 'case' : 'cases'}
                              </p>
                              
                              {/* Latest Use Case Info */}
                              {latestWorkflow && (
                                <div className="mb-4 p-3 bg-wm-neutral/5 rounded-lg">
                                  <p className="text-xs font-medium text-wm-blue/70 mb-1">Latest:</p>
                                  <p className="text-sm text-wm-blue font-medium line-clamp-1">
                                    {latestWorkflow.versionTitle || 'Untitled'}
                                  </p>
                                  <p className="text-xs text-wm-blue/60 mt-1">
                                    {new Date(latestWorkflow.timestamp).toLocaleDateString()}
                                  </p>
                                  {latestWorkflow.evaluationScore !== null && (
                                    <span className="inline-block mt-2 px-2 py-1 bg-green-50 text-green-700 text-xs font-semibold rounded">
                                      Score: {latestWorkflow.evaluationScore}
                                    </span>
                                  )}
                                </div>
                              )}
                              
                              {/* Demo URLs for latest use case */}
                              {(projectUrl || publishedUrl) && (
                                <div className="flex flex-col gap-2 mb-4">
                                  {projectUrl && (
                                    <a
                                      href={projectUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="inline-flex items-center gap-1 px-2 py-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 text-xs rounded-md transition-colors"
                                    >
                                      <Icons.ExternalLink className="w-3 h-3" />
                                      Demo Project
                                    </a>
                                  )}
                                  {publishedUrl && (
                                    <a
                                      href={publishedUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="inline-flex items-center gap-1 px-2 py-1.5 bg-green-50 text-green-600 hover:bg-green-100 text-xs rounded-md transition-colors"
                                    >
                                      <Icons.ExternalLink className="w-3 h-3" />
                                      Published Demo
                                    </a>
                                  )}
                                </div>
                              )}
                            </div>
                            
                            {/* Expandable Use Cases List */}
                            <div className="border-t border-wm-neutral/10">
                              <button
                                onClick={() => toggleProcess(scenarioId)}
                                className="w-full p-4 flex items-center justify-between hover:bg-wm-neutral/5 transition-colors"
                              >
                                <span className="text-sm font-medium text-wm-blue">
                                  {expandedProcesses[scenarioId] ? 'Hide' : 'Show'} All {workflows.length} Use {workflows.length === 1 ? 'Case' : 'Cases'}
                                </span>
                                <Icons.ChevronDown className={`w-5 h-5 text-wm-blue/60 transition-transform ${expandedProcesses[scenarioId] ? 'rotate-180' : ''}`} />
                              </button>
                              
                              {expandedProcesses[scenarioId] && (
                                <div className="px-4 pb-4 space-y-2">
                                  {workflows.map((workflow) => {
                                    // Check workflow version for demo URLs first, then fall back to evaluation
                                    const hasDirectDemoUrls = workflow.demoProjectUrl || workflow.demoPublishedUrl;
                                    const evaluation = !hasDirectDemoUrls && workflow.sourceEvaluationId 
                                      ? evaluations.find(e => e.id === workflow.sourceEvaluationId)
                                      : null;
                                    
                                    const projectUrl = workflow.demoProjectUrl || evaluation?.demoProjectUrl;
                                    const publishedUrl = workflow.demoPublishedUrl || evaluation?.demoPublishedUrl;
                                    
                                    console.log('Dashboard2 Individual Workflow:', {
                                      workflowTitle: workflow.versionTitle,
                                      workflowHasDemoUrls: hasDirectDemoUrls,
                                      workflowDemoProjectUrl: workflow.demoProjectUrl,
                                      workflowDemoPublishedUrl: workflow.demoPublishedUrl,
                                      sourceEvaluationId: workflow.sourceEvaluationId,
                                      evaluationFound: !!evaluation,
                                      evaluationDemoProjectUrl: evaluation?.demoProjectUrl,
                                      evaluationDemoPublishedUrl: evaluation?.demoPublishedUrl,
                                      finalProjectUrl: projectUrl,
                                      finalPublishedUrl: publishedUrl
                                    });
                                    
                                    return (
                                      <div 
                                        key={workflow.id}
                                        className="p-3 border border-wm-neutral/20 rounded-lg hover:border-wm-blue/30 hover:bg-wm-neutral/5 transition-all"
                                      >
                                        <div className="flex items-start justify-between gap-3">
                                          <div className="flex-1 min-w-0">
                                            <h5 className="text-sm font-medium text-wm-blue line-clamp-1">
                                              {workflow.versionTitle || 'Untitled Use Case'}
                                            </h5>
                                            <p className="text-xs text-wm-blue/60 mt-1">
                                              {new Date(workflow.timestamp).toLocaleDateString()}
                                              {workflow.evaluationScore !== null && (
                                                <span className="ml-2 px-1.5 py-0.5 bg-green-50 text-green-700 font-semibold rounded">
                                                  {workflow.evaluationScore}
                                                </span>
                                              )}
                                            </p>
                                            {/* Demo URLs */}
                                            {(projectUrl || publishedUrl) && (
                                              <div className="flex flex-wrap gap-1.5 mt-2">
                                                {projectUrl && (
                                                  <a
                                                    href={projectUrl}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-blue-50 text-blue-600 hover:bg-blue-100 text-xs rounded transition-colors"
                                                  >
                                                    <Icons.ExternalLink className="w-2.5 h-2.5" />
                                                    Demo
                                                  </a>
                                                )}
                                                {publishedUrl && (
                                                  <a
                                                    href={publishedUrl}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-green-50 text-green-600 hover:bg-green-100 text-xs rounded transition-colors"
                                                  >
                                                    <Icons.ExternalLink className="w-2.5 h-2.5" />
                                                    Published
                                                  </a>
                                                )}
                                              </div>
                                            )}
                                          </div>
                                          <button
                                            onClick={() => onViewWorkflow?.(workflow.id)}
                                            className="p-1.5 hover:bg-wm-blue/10 rounded transition-colors flex-shrink-0"
                                          >
                                            <Icons.ChevronRight className="w-4 h-4 text-wm-blue/60" />
                                          </button>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()
              )}
            </>
          );
        })()}
            </div>
          )}

          {/* Settings Section */}
          {activeSection === 'settings' && (
            <div className="space-y-6">
              <div className="bg-white rounded-xl border border-wm-neutral/20 shadow-sm">
                <div className="p-4 border-b border-wm-neutral/20">
                  <h3 className="font-semibold text-wm-blue">Settings</h3>
                </div>
                <div className="p-6">
                  <p className="text-wm-blue/60">Settings configuration coming soon...</p>
                </div>
              </div>
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
