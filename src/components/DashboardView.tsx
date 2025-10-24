import React, { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import { 
  getAllUserEvaluations, 
  getScenarios, 
  getAllUserWorkflowVersions, 
  saveUserScenario, 
  toggleFavoriteScenario,
  listCompanyResearch
} from '../services/firebaseService';
import type { Scenario, WorkflowVersion, AggregatedEvaluationResult, Company } from '../types';
import CreateScenarioForm, { ScenarioFormPayload } from './CreateScenarioForm';
import brainIcon from '../assets/brain_icon.png';
import CompaniesSection from './CompaniesSection';
import WorkflowsSection from './WorkflowsSection';

interface DashboardViewProps {
  user: User;
  onStartTraining: (scenario?: Scenario) => void;
  onNavigateToScenario: (scenarioId: string) => void;
  onViewWorkflow: (workflowId: string) => void;
  onScenarioCreated?: (newScenario: Scenario) => void;
  handleNavigate: (view: 'DASHBOARD' | 'TRAINING' | 'ADMIN' | 'RESEARCH', companyId?: string) => void;
}

const DashboardView: React.FC<DashboardViewProps> = ({ user, onStartTraining, onNavigateToScenario, onViewWorkflow, onScenarioCreated, handleNavigate }) => {
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [workflowVersions, setWorkflowVersions] = useState<WorkflowVersion[]>([]);
  const [evaluations, setEvaluations] = useState<AggregatedEvaluationResult[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form state for the problem form
  const [problemDescription, setProblemDescription] = useState('');
  const [problemTarget, setProblemTarget] = useState('');
  const [problemDomain, setProblemDomain] = useState('');
  const [scenarioTitle, setScenarioTitle] = useState('');
  const [isSubmittingProblem, setIsSubmittingProblem] = useState(false);
  
  const [isGeneratingExample, setIsGeneratingExample] = useState(false);
  const [showStarredOnly, setShowStarredOnly] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [companies, setCompanies] = useState<Company[]>([]);

  // Function to handle starting new company research
  const handleStartNewResearch = () => {
    handleNavigate('RESEARCH');
  };

  useEffect(() => {
    const fetchData = async () => {
      if (!user || user.isAnonymous) {
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setError(null);

        // Fetch all data in parallel
        const [scenariosData, workflowData, evaluationsData, companyResearchData] = await Promise.all([
          getScenarios(user.uid),
          getAllUserWorkflowVersions(user.uid),
          getAllUserEvaluations(user.uid),
          listCompanyResearch(user.uid)
        ]);

        // Transform company research data to match Company interface and deduplicate
        const transformedCompanies = companyResearchData.reduce((uniqueCompanies, researchData) => {
          const { name, currentResearch, history, lastUpdated, selectedScenarios = [] } = researchData;
          const resolvedLastUpdated = lastUpdated ?? Date.now();
          const existingCompany = uniqueCompanies.find(c => c.name.toLowerCase() === name.toLowerCase());
          
          // If company exists, update it only if the new data is more recent
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

          // If company doesn't exist, add it
          uniqueCompanies.push({
            id: `${name.toLowerCase()}_${Date.now()}`, // Ensure unique ID
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
      } catch (e) {
        console.error('Could not fetch dashboard data', e);
        setError('Failed to load dashboard data');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [user]);

  // Group workflow versions by scenario
  const workflowsByScenario = workflowVersions.reduce((acc, workflow) => {
    if (!acc[workflow.scenarioId]) {
      acc[workflow.scenarioId] = [];
    }
    acc[workflow.scenarioId].push(workflow);
    return acc;
  }, {} as Record<string, WorkflowVersion[]>);

  // Filter scenarios to only show those with completed workflows
  const scenariosWithWorkflows = scenarios.filter(scenario => 
    workflowsByScenario[scenario.id] && workflowsByScenario[scenario.id].length > 0
  );

  // Apply star filter
  const filteredScenarios = showStarredOnly 
    ? scenariosWithWorkflows.filter(scenario => scenario.favoritedBy?.[user.uid])
    : scenariosWithWorkflows;

  const handleViewDetails = (scenarioId: string) => {
    onNavigateToScenario(scenarioId);
  };

  const handleStartTraining = (scenario: Scenario) => {
    onStartTraining(scenario);
  };

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
      onStartTraining(newScenario);
    } catch (error) {
      console.error('Failed to create scenario:', error);
    }
  };

  const handleToggleFavorite = async (scenario: Scenario) => {
    try {
      const newFavoriteState = await toggleFavoriteScenario(user.uid, scenario);
      
      // Update the scenarios state to reflect the change
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

  const handleSubmitProblem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!problemDescription.trim() || !problemTarget.trim()) return;

    setIsSubmittingProblem(true);
    try {
      const newScenario = await saveUserScenario(user.uid, {
        title: scenarioTitle.trim() || `${problemDomain || 'Custom'} Workflow Problem`,
        description: problemDescription.trim(),
        goal: problemTarget.trim(),
        domain: problemDomain || 'General'
      });
      
      // Clear form
      setScenarioTitle('');
      setProblemDescription('');
      setProblemTarget('');
      setProblemDomain('');
      
      // Notify parent if callback provided
      if (onScenarioCreated) {
        onScenarioCreated(newScenario);
      }
      
      // Start training with the new scenario
      onStartTraining(newScenario);
    } catch (error) {
      console.error('Failed to create scenario:', error);
    } finally {
      setIsSubmittingProblem(false);
    }
  };

  const generateAiExample = async () => {
    if (!problemDomain) return;
    
    setIsGeneratingExample(true);
    try {
      const mod = await import('../services/geminiService');
      // Create varied, domain-specific prompts for more diverse examples
      const domainPrompts: Record<string, string[]> = {
        'Sales': [
          'Create a workflow for automating lead scoring and qualification in a B2B sales environment',
          'Design a process for automated follow-up sequences after sales demos',
          'Build a system for territory assignment and opportunity distribution',
          'Create a workflow for competitive analysis and proposal customization'
        ],
        'HR': [
          'Design an automated candidate screening and interview scheduling system',
          'Create a workflow for employee onboarding and document collection',
          'Build a performance review reminder and feedback collection process',
          'Design a system for tracking PTO requests and coverage arrangements'
        ],
        'Finance': [
          'Create an automated expense report processing and approval workflow',
          'Design a system for monthly financial close and reconciliation tasks',
          'Build a workflow for vendor payment approvals and processing',
          'Create an automated budget variance reporting system'
        ],
        'Operations': [
          'Design a workflow for supply chain disruption monitoring and response',
          'Create a system for quality control issue tracking and resolution',
          'Build an automated inventory reorder and vendor notification process',
          'Design a workflow for maintenance scheduling and equipment tracking'
        ],
        'Logistics': [
          'Create an automated shipment tracking and customer notification system',
          'Design a workflow for route optimization and delivery scheduling',
          'Build a system for warehouse capacity planning and allocation',
          'Create a process for freight audit and carrier performance tracking'
        ],
        'Healthcare': [
          'Design a patient appointment reminder and preparation workflow',
          'Create a system for medical record requests and transfer processing',
          'Build a workflow for insurance verification and pre-authorization',
          'Design an automated lab result notification and follow-up system'
        ],
        'Manufacturing': [
          'Create a workflow for production line efficiency monitoring and alerts',
          'Design a system for quality defect tracking and root cause analysis',
          'Build an automated materials planning and procurement process',
          'Create a workflow for equipment downtime tracking and maintenance scheduling'
        ],
        'Legal': [
          'Design a contract review and approval workflow with stakeholder routing',
          'Create a system for legal document template management and generation',
          'Build a workflow for compliance deadline tracking and notifications',
          'Design an automated client intake and conflict checking process'
        ],
        'Procurement': [
          'Create a workflow for vendor evaluation and selection processes',
          'Design a system for purchase requisition approval and routing',
          'Build an automated contract renewal notification system',
          'Create a workflow for spend analysis and budget tracking'
        ],
        'Marketing': [
          'Design a workflow for content approval and publication scheduling',
          'Create a system for lead nurturing campaign automation',
          'Build a workflow for event planning and attendee management',
          'Design an automated competitor monitoring and alert system'
        ],
        'IT': [
          'Create a workflow for incident escalation and resolution tracking',
          'Design a system for software license management and renewal alerts',
          'Build an automated user access provisioning and deprovisioning process',
          'Create a workflow for security vulnerability assessment and patching'
        ],
        'Customer Support': [
          'Design a workflow for ticket routing based on customer tier and issue type',
          'Create a system for automated knowledge base article suggestions',
          'Build a workflow for customer satisfaction follow-up and feedback collection',
          'Design an escalation process for high-priority customer issues'
        ]
      };

      const prompts = domainPrompts[problemDomain] || ['Create a general workflow automation scenario'];
      const selectedPrompt = prompts[Math.floor(Math.random() * prompts.length)];
      
      const prompt = `${selectedPrompt}. You must respond with EXACTLY this format:

TITLE: "A specific, actionable title for this workflow"
PROBLEM: "A detailed, real-world problem description with specific pain points and current inefficiencies"
TARGET: "Concrete, measurable outcomes and success criteria that would be achieved"

Make this example specific to ${problemDomain} with realistic details, metrics, and business impact. Avoid generic responses.`;
      
      const text = await mod.generateText(prompt, null, { temperature: 0.7 });
      
      try {
        // Parse the structured text response
        const lines = text.trim().split('\n');
        let title = '';
        let problem = '';
        let target = '';
        
        // Check if response has the expected TITLE:/PROBLEM:/TARGET: format
        const hasStructuredFormat = text.includes('TITLE:') && text.includes('PROBLEM:') && text.includes('TARGET:');
        
        if (hasStructuredFormat) {
          // Parse structured format
          for (const line of lines) {
            if (line.startsWith('TITLE:')) {
              title = line.replace('TITLE:', '').trim().replace(/^["']|["']$/g, '');
            } else if (line.startsWith('PROBLEM:')) {
              problem = line.replace('PROBLEM:', '').trim().replace(/^["']|["']$/g, '');
            } else if (line.startsWith('TARGET:')) {
              target = line.replace('TARGET:', '').trim().replace(/^["']|["']$/g, '');
            }
          }
        } else {
          // AI returned unstructured text - treat as problem description
          
          // Generate domain-specific title and target
          const domainTitles: Record<string, string> = {
            'Sales': 'Sales Process Optimization',
            'HR': 'HR Process Automation',
            'Finance': 'Financial Process Enhancement',
            'Operations': 'Operations Efficiency Improvement',
            'Logistics': 'Logistics Optimization',
            'Healthcare': 'Healthcare Workflow Enhancement',
            'Manufacturing': 'Manufacturing Process Automation',
            'Legal': 'Legal Process Streamlining',
            'Procurement': 'Procurement Process Optimization',
            'Marketing': 'Marketing Automation Challenge',
            'IT': 'IT Operations Enhancement',
            'Customer Support': 'Customer Support Optimization'
          };
          
          const domainTargets: Record<string, string> = {
            'Sales': 'Increase conversion rates, reduce sales cycle time, and improve lead qualification efficiency',
            'HR': 'Streamline hiring processes, reduce administrative burden, and improve employee experience',
            'Finance': 'Automate financial reporting, reduce errors, and accelerate decision-making processes',
            'Operations': 'Optimize workflow efficiency, reduce manual tasks, and improve operational visibility',
            'Logistics': 'Enhance supply chain visibility, reduce delivery times, and optimize resource allocation',
            'Healthcare': 'Improve patient care efficiency, reduce administrative overhead, and ensure compliance',
            'Manufacturing': 'Optimize production processes, reduce downtime, and improve quality control',
            'Legal': 'Accelerate document review, ensure compliance, and reduce manual research time',
            'Procurement': 'Streamline vendor management, reduce costs, and improve procurement cycle time',
            'Marketing': 'Improve campaign effectiveness, automate lead nurturing, and enhance customer targeting',
            'IT': 'Reduce incident response time, automate routine tasks, and improve system reliability',
            'Customer Support': 'Reduce response times, improve issue resolution, and enhance customer satisfaction'
          };
          
          title = domainTitles[problemDomain] || `${problemDomain} Workflow Challenge`;
          problem = text.trim();
          target = domainTargets[problemDomain] || `Automate and optimize ${problemDomain.toLowerCase()} processes to improve efficiency and outcomes`;
        }
        
        if (title && problem && target) {
          // Directly populate form fields instead of storing in aiExample
          setScenarioTitle(title);
          setProblemDescription(problem);
          setProblemTarget(target);
        } else {
          throw new Error('Invalid response format - missing required fields');
        }
      } catch (parseError) {
        // If structured parsing fails, treat the entire response as the problem description
        const domainTitles: Record<string, string> = {
          'Sales': 'Sales Process Optimization',
          'HR': 'HR Process Automation',
          'Finance': 'Financial Process Enhancement',
          'Operations': 'Operations Efficiency Improvement',
          'Logistics': 'Logistics Optimization',
          'Healthcare': 'Healthcare Workflow Enhancement',
          'Manufacturing': 'Manufacturing Process Automation',
          'Legal': 'Legal Process Streamlining',
          'Procurement': 'Procurement Process Optimization',
          'Marketing': 'Marketing Automation Challenge',
          'IT': 'IT Operations Enhancement',
          'Customer Support': 'Customer Support Optimization'
        };
        
        const domainTargets: Record<string, string> = {
          'Sales': 'Increase conversion rates, reduce sales cycle time, and improve lead qualification efficiency',
          'HR': 'Streamline hiring processes, reduce administrative burden, and improve employee experience',
          'Finance': 'Automate financial reporting, reduce errors, and accelerate decision-making processes',
          'Operations': 'Optimize workflow efficiency, reduce manual tasks, and improve operational visibility',
          'Logistics': 'Enhance supply chain visibility, reduce delivery times, and optimize resource allocation',
          'Healthcare': 'Improve patient care efficiency, reduce administrative overhead, and ensure compliance',
          'Manufacturing': 'Optimize production processes, reduce downtime, and improve quality control',
          'Legal': 'Accelerate document review, ensure compliance, and reduce manual research time',
          'Procurement': 'Streamline vendor management, reduce costs, and improve procurement cycle time',
          'Marketing': 'Improve campaign effectiveness, automate lead nurturing, and enhance customer targeting',
          'IT': 'Reduce incident response time, automate routine tasks, and improve system reliability',
          'Customer Support': 'Reduce response times, improve issue resolution, and enhance customer satisfaction'
        };
        
        const fallbackData = {
          title: domainTitles[problemDomain] || `${problemDomain} Workflow Challenge`,
          problem: text.trim() || 'Could not generate an example right now. Please try again later.',
          target: domainTargets[problemDomain] || `Automate and optimize ${problemDomain.toLowerCase()} processes to improve efficiency and outcomes`
        };
        // Directly populate form fields with fallback data
        setScenarioTitle(fallbackData.title);
        setProblemDescription(fallbackData.problem);
        setProblemTarget(fallbackData.target);
      }
    } catch (e) {
      console.error('Failed to generate example', e);
      const domainTitles: Record<string, string> = {
        'Sales': 'Sales Process Optimization',
        'HR': 'HR Process Automation',
        'Finance': 'Financial Process Enhancement',
        'Operations': 'Operations Efficiency Improvement',
        'Logistics': 'Logistics Optimization',
        'Healthcare': 'Healthcare Workflow Enhancement',
        'Manufacturing': 'Manufacturing Process Automation',
        'Legal': 'Legal Process Streamlining',
        'Procurement': 'Procurement Process Optimization',
        'Marketing': 'Marketing Automation Challenge',
        'IT': 'IT Operations Enhancement',
        'Customer Support': 'Customer Support Optimization'
      };
      
      const domainTargets: Record<string, string> = {
        'Sales': 'Increase conversion rates, reduce sales cycle time, and improve lead qualification efficiency',
        'HR': 'Streamline hiring processes, reduce administrative burden, and improve employee experience',
        'Finance': 'Automate financial reporting, reduce errors, and accelerate decision-making processes',
        'Operations': 'Optimize workflow efficiency, reduce manual tasks, and improve operational visibility',
        'Logistics': 'Enhance supply chain visibility, reduce delivery times, and optimize resource allocation',
        'Healthcare': 'Improve patient care efficiency, reduce administrative overhead, and ensure compliance',
        'Manufacturing': 'Optimize production processes, reduce downtime, and improve quality control',
        'Legal': 'Accelerate document review, ensure compliance, and reduce manual research time',
        'Procurement': 'Streamline vendor management, reduce costs, and improve procurement cycle time',
        'Marketing': 'Improve campaign effectiveness, automate lead nurturing, and enhance customer targeting',
        'IT': 'Reduce incident response time, automate routine tasks, and improve system reliability',
        'Customer Support': 'Reduce response times, improve issue resolution, and enhance customer satisfaction'
      };
      
      const errorData = {
        title: domainTitles[problemDomain] || `${problemDomain} Workflow Challenge`,
        problem: 'Could not generate an example right now. Please try again later.',
        target: domainTargets[problemDomain] || 'Improve efficiency and reduce manual work.'
      };
      // Directly populate form fields with error data
      setScenarioTitle(errorData.title);
      setProblemDescription(errorData.problem);
      setProblemTarget(errorData.target);
    } finally {
      setIsGeneratingExample(false);
    }
  };

  const clearForm = () => {
    setScenarioTitle('');
    setProblemDescription('');
    setProblemTarget('');
    setProblemDomain('');
  };

  if (isLoading) {
    return (
      <div className="animate-fade-in-up">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-500"></div>
          <span className="ml-3 text-slate-400">Loading dashboard...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="animate-fade-in-up">
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 text-red-400">
          <p>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Create Scenario Modal */}
      {showCreateModal && (
        <CreateScenarioForm
          onSave={handleScenarioCreated}
          onClose={() => setShowCreateModal(false)}
        />
      )}
      
      {/* Main Content Grid */}
      <div className="container mx-auto px-4 sm:px-6 md:px-8 py-16">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Companies Section */}
          <div className="lg:col-span-1">
            <CompaniesSection
              companies={companies}
              onStartNewResearch={handleStartNewResearch}
              handleNavigate={handleNavigate}
            />
          </div>
          
          {/* Workflows Section */}
          <div className="lg:col-span-1">
            <WorkflowsSection
              user={user}
              scenarios={filteredScenarios}
              workflowVersions={workflowVersions}
              evaluations={evaluations}
              showStarredOnly={showStarredOnly}
              onToggleStarred={() => setShowStarredOnly(!showStarredOnly)}
              onViewDetails={handleViewDetails}
              onViewWorkflow={onViewWorkflow}
              onStartTraining={handleStartTraining}
              onToggleFavorite={handleToggleFavorite}
              onCreateScenario={() => setShowCreateModal(true)}
            />

          </div>

          {/* AI Assistant Column */}
          <div className="lg:col-span-1">
            <div className="sticky top-8">
              <div className="bg-gradient-to-br from-slate-800/60 to-slate-900/60 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-8 shadow-2xl">
                <div className="text-center mb-8">
                  <div className="relative mb-6">
                    <div className="absolute inset-0 bg-gradient-to-r from-sky-500/30 to-emerald-500/30 rounded-full blur-xl"></div>
                    <div className="relative w-20 h-20 mx-auto">
                      <img
                        src={brainIcon}
                        alt="AI Assistant"
                        className="w-full h-full object-contain drop-shadow-2xl"
                      />
                    </div>
                  </div>
                  <h3 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-sky-400 via-blue-400 to-emerald-400 mb-3">
                    AI Workflow Assistant
                  </h3>
                  <p className="text-slate-300 leading-relaxed">
                    Describe your challenge and let our AI help you design the perfect automation workflow.
                  </p>
                </div>

                <form onSubmit={handleSubmitProblem} className="space-y-6">
                  {/* Domain Selection */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <label className="text-sm font-semibold text-slate-200 uppercase tracking-wider">Domain</label>
                      <button
                        type="button"
                        onClick={generateAiExample}
                        disabled={isGeneratingExample || !problemDomain}
                        className="group px-4 py-2 bg-gradient-to-r from-sky-500 to-blue-600 text-white text-xs font-semibold rounded-lg hover:shadow-lg hover:shadow-sky-500/25 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300"
                      >
                        {isGeneratingExample ? (
                          <span className="flex items-center gap-2">
                            <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin"></div>
                            Generating...
                          </span>
                        ) : (
                          <span className="flex items-center gap-2">
                            ✨ AI Example
                          </span>
                        )}
                      </button>
                    </div>
                    <select
                      value={problemDomain}
                      onChange={(e) => setProblemDomain(e.target.value)}
                      className="w-full bg-slate-900/50 border border-slate-600 rounded-xl p-4 text-slate-200 focus:ring-2 focus:ring-sky-500 focus:border-sky-500 focus:outline-none transition-all duration-200 backdrop-blur-sm"
                    >
                      <option value="">Choose your domain...</option>
                      {['Sales','HR','Finance','Operations','Logistics','Healthcare','Manufacturing','Legal','Procurement','Marketing','IT','Customer Support'].map(domain => (
                        <option key={domain} value={domain}>{domain}</option>
                      ))}
                    </select>
                  </div>

                  {/* Scenario Title */}
                  <div>
                    <label className="block text-sm font-semibold text-slate-200 uppercase tracking-wider mb-3">Workflow Title</label>
                    <input
                      type="text"
                      value={scenarioTitle}
                      onChange={(e) => setScenarioTitle(e.target.value)}
                      placeholder="Give your workflow a descriptive name"
                      className="w-full bg-slate-900/50 border border-slate-600 rounded-xl p-4 text-slate-200 placeholder-slate-400 focus:ring-2 focus:ring-sky-500 focus:border-sky-500 focus:outline-none transition-all duration-200 backdrop-blur-sm"
                    />
                  </div>

                  {/* Problem Description */}
                  <div>
                    <label className="block text-sm font-semibold text-slate-200 uppercase tracking-wider mb-3">Your Challenge</label>
                    <textarea
                      value={problemDescription}
                      onChange={(e) => setProblemDescription(e.target.value)}
                      rows={4}
                      placeholder="Describe the problem you're facing in detail..."
                      className="w-full bg-slate-900/50 border border-slate-600 rounded-xl p-4 text-slate-200 placeholder-slate-400 focus:ring-2 focus:ring-sky-500 focus:border-sky-500 focus:outline-none transition-all duration-200 backdrop-blur-sm resize-none"
                    />
                  </div>

                  {/* Target */}
                  <div>
                    <label className="block text-sm font-semibold text-slate-200 uppercase tracking-wider mb-3">Success Goal</label>
                    <textarea
                      value={problemTarget}
                      onChange={(e) => setProblemTarget(e.target.value)}
                      rows={3}
                      placeholder="What would success look like? What do you want to achieve?"
                      className="w-full bg-slate-900/50 border border-slate-600 rounded-xl p-4 text-slate-200 placeholder-slate-400 focus:ring-2 focus:ring-sky-500 focus:border-sky-500 focus:outline-none transition-all duration-200 backdrop-blur-sm resize-none"
                    />
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-3 pt-4">
                    <button
                      type="button"
                      onClick={clearForm}
                      className="flex-1 px-6 py-4 bg-slate-700/50 text-slate-300 font-semibold rounded-xl hover:bg-slate-600/50 transition-all duration-200 backdrop-blur-sm border border-slate-600"
                    >
                      Clear Form
                    </button>
                    <button
                      type="submit"
                      disabled={!problemDescription.trim() || !problemTarget.trim() || isSubmittingProblem}
                      className="flex-1 px-6 py-4 bg-gradient-to-r from-sky-500 to-blue-600 text-white font-semibold rounded-xl hover:shadow-lg hover:shadow-sky-500/25 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 hover:-translate-y-0.5"
                    >
                      {isSubmittingProblem ? (
                        <span className="flex items-center justify-center gap-2">
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          Creating...
                        </span>
                      ) : (
                        <span className="flex items-center justify-center gap-2">
                          <span className="text-lg">+</span>
                          Create Workflow
                        </span>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardView;
