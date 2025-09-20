import React, { useState, useEffect } from 'react';
import type firebase from 'firebase/compat/app';
import { getAllUserEvaluations, getScenarios, getAllUserWorkflowVersions, saveUserScenario } from '../services/firebaseService';
import { Icons } from '../constants';
import { useTranslation } from '../i18n';
import type { Scenario, WorkflowVersion, AggregatedEvaluationResult } from '../types';
import WorkflowCard from './WorkflowCard';
import brainIcon from '../assets/brain_icon.png';

interface DashboardViewProps {
  user: firebase.User;
  onStartTraining: (scenario?: Scenario) => void;
  onNavigateToScenario: (scenarioId: string) => void;
  onViewWorkflow: (workflowId: string) => void;
  onScenarioCreated?: (newScenario: Scenario) => void;
}

const DashboardView: React.FC<DashboardViewProps> = ({ user, onStartTraining, onNavigateToScenario, onViewWorkflow, onScenarioCreated }) => {
  const { t } = useTranslation();
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
        const [scenariosData, workflowData, evaluationsData] = await Promise.all([
          getScenarios(user.uid),
          getAllUserWorkflowVersions(user.uid),
          getAllUserEvaluations(user.uid)
        ]);

        setScenarios(scenariosData);
        setWorkflowVersions(workflowData);
        setEvaluations(evaluationsData);
      } catch (e) {
        console.error('Could not fetch dashboard data', e);
        setError('Failed to load dashboard data');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [user]);

  const firstName = user.displayName?.split(' ')[0] || 'Operator';

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

  const handleViewDetails = (scenarioId: string) => {
    onNavigateToScenario(scenarioId);
  };

  const handleStartTraining = (scenario: Scenario) => {
    onStartTraining(scenario);
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
    <div className="animate-fade-in-up">
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        {/* Main Content - Left 2/3 */}
        <div className="xl:col-span-2">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-4xl sm:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-blue-500">
              {t('dashboard.welcome', { name: firstName })}
            </h1>
            <p className="mt-2 text-lg text-slate-400">
              {t('dashboard.reviewWorkflows')}
            </p>
          </div>

          {/* Workflow Cards Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {scenariosWithWorkflows.map((scenario) => (
              <WorkflowCard
                key={scenario.id}
                scenario={scenario}
                workflowVersions={workflowsByScenario[scenario.id] || []}
                evaluations={evaluations}
                onViewDetails={handleViewDetails}
                onViewWorkflow={onViewWorkflow}
                onStartTraining={handleStartTraining}
              />
            ))}
          </div>

          {/* Empty State */}
          {scenariosWithWorkflows.length === 0 && (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-slate-700/50 rounded-full flex items-center justify-center mx-auto mb-4">
                <Icons.LightBulb />
              </div>
              <h3 className="text-xl font-semibold text-slate-200 mb-2">{t('dashboard.noCompletedWorkflows')}</h3>
              <p className="text-slate-400 mb-6">
                {t('dashboard.noCompletedWorkflowsInfo')}
              </p>
              <button
                onClick={() => onStartTraining()}
                className="px-6 py-3 bg-sky-500 text-white rounded-lg hover:bg-sky-600 transition-colors"
              >
                {t('dashboard.startFirstWorkflow')}
              </button>
            </div>
          )}
        </div>

        {/* Problem Form Sidebar - Right 1/3 */}
        <div className="xl:col-span-1">
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6 sticky top-4">
            <div className="mb-6 text-center">
              <div className="w-fit mx-auto">
                <img
                  src={brainIcon}
                  alt="AI brain icon"
                  className="h-16 w-16 object-contain drop-shadow-xl transition-transform duration-300"
                />
              </div>
              <h2 className="mt-3 text-2xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-sky-400 via-blue-400 to-emerald-400 mb-2">What's Your Problem?</h2>
              <p className="text-slate-300 text-sm">
                Describe a challenge you're facing, and we'll help you design an AI workflow to solve it.
              </p>
            </div>

            <form onSubmit={handleSubmitProblem} className="space-y-4">
              {/* Domain Selection with AI Example */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-slate-300">Domain</label>
                  <button
                    type="button"
                    onClick={generateAiExample}
                    disabled={isGeneratingExample || !problemDomain}
                    className="text-xs px-3 py-1.5 rounded-md bg-sky-600 hover:bg-sky-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-medium tracking-wide transition-colors"
                  >
                    {isGeneratingExample ? 'Generating...' : 'AI Example'}
                  </button>
                </div>
                <select
                  value={problemDomain}
                  onChange={(e) => {
                    setProblemDomain(e.target.value);
                  }}
                  className="w-full bg-slate-900 border border-slate-600 rounded-lg p-3 text-slate-200 focus:ring-2 focus:ring-sky-500 focus:outline-none transition-shadow"
                >
                  <option value="">Select a domain...</option>
                  {['Sales','HR','Finance','Operations','Logistics','Healthcare','Manufacturing','Legal','Procurement','Marketing','IT','Customer Support'].map(domain => (
                    <option key={domain} value={domain}>{domain}</option>
                  ))}
                </select>
              </div>

              {/* Scenario Title */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Scenario Title</label>
                <input
                  type="text"
                  value={scenarioTitle}
                  onChange={(e) => setScenarioTitle(e.target.value)}
                  placeholder="Enter a title for your workflow scenario..."
                  className="w-full bg-slate-900 border border-slate-600 rounded-lg p-3 text-slate-200 focus:ring-2 focus:ring-sky-500 focus:outline-none transition-shadow"
                />
              </div>

              {/* Problem Description */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Your Problem</label>
                <textarea
                  value={problemDescription}
                  onChange={(e) => setProblemDescription(e.target.value)}
                  rows={4}
                  placeholder="Describe the challenge or inefficiency you're facing..."
                  className="w-full bg-slate-900 border border-slate-600 rounded-lg p-3 text-slate-200 focus:ring-2 focus:ring-sky-500 focus:outline-none transition-shadow resize-none"
                />
              </div>

              {/* Target/Goal */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Target Outcome</label>
                <textarea
                  value={problemTarget}
                  onChange={(e) => setProblemTarget(e.target.value)}
                  rows={3}
                  placeholder="What would success look like? What do you want to achieve?"
                  className="w-full bg-slate-900 border border-slate-600 rounded-lg p-3 text-slate-200 focus:ring-2 focus:ring-sky-500 focus:outline-none transition-shadow resize-none"
                />
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={clearForm}
                  className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-slate-700 text-slate-300 font-medium rounded-lg hover:bg-slate-600 transition-colors"
                >
                  Clear Form
                </button>
                <button
                  type="submit"
                  disabled={!problemDescription.trim() || !problemTarget.trim() || isSubmittingProblem}
                  className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-sky-600 text-white font-medium rounded-lg hover:bg-sky-500 transition-colors disabled:bg-slate-700 disabled:cursor-not-allowed"
                >
                  {isSubmittingProblem ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Creating...
                    </>
                  ) : (
                    <>
                      <Icons.Plus />
                      Create Workflow
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardView;