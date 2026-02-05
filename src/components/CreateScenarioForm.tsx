import React, { useState } from 'react';
import { useTranslation } from '../i18n';
import { LoadingSpinner } from './OperatorConsole';
// Note: import is done dynamically in the handler to avoid throwing at module load if API key is missing

interface CreateScenarioFormProps {
  initialDomain?: string;
  onSave: (data: { 
    title: string; 
    title_es?: string; 
    description: string; 
    description_es?: string; 
    goal: string; 
    goal_es?: string; 
    domain?: string;
    industry?: string;
    process?: string;
    valueDrivers?: string;
    painPoints?: string;
    currentWorkflowImage: File | undefined;
  }) => Promise<void>;
  onClose: () => void;
}

export type ScenarioFormPayload = Parameters<CreateScenarioFormProps['onSave']>[0];

const CreateScenarioForm: React.FC<CreateScenarioFormProps> = ({ initialDomain, onSave, onClose }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [goal, setGoal] = useState('');
  const [domain, setDomain] = useState(initialDomain || '');
  const [industry, setIndustry] = useState('');
  const [process, setProcess] = useState('');
  const [isCustomProcess, setIsCustomProcess] = useState(false);
  const [customProcess, setCustomProcess] = useState('');
  const [valueDrivers, setValueDrivers] = useState('');
  const [painPoints, setPainPoints] = useState('');
  const [currentWorkflowImage, setCurrentWorkflowImage] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [generatingExample, setGeneratingExample] = useState(false);
  const { t, lang } = useTranslation();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // AI generation removed

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        setError(t('operator.invalidImageAlert'));
        return;
      }
      if (!file.type.startsWith('image/')) {
        setError(t('operator.invalidImageAlert'));
        return;
      }
      setCurrentWorkflowImage(file);
      setPreviewUrl(URL.createObjectURL(file));
      setError(null);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim() || !goal.trim()) {
      setError(t('form.error.required'));
      return;
    }
    setError(null);
    setIsLoading(true);
    try {
      const finalDomain = domain || 'General';

      // Build payload that includes both English and Spanish versions.
      const payload: ScenarioFormPayload = {
        title: title.trim(),
        description: description.trim(),
        goal: goal.trim(),
        domain: finalDomain,
        process: (isCustomProcess ? customProcess : process) || undefined,
        valueDrivers: valueDrivers || undefined,
        painPoints: painPoints || undefined,
        currentWorkflowImage: currentWorkflowImage || undefined
      };

      // Try to generate translations via geminiService if available. If it fails, fall back to the original text.
      const tryTranslate = async (text: string, target: 'English' | 'Spanish') => {
        try {
          const mod = await import('../services/geminiService');
          const prompt = `Translate the following text to ${target}. Keep the meaning and tone, be concise, and return only the translated text:\n\n${text}`;
          const raw = await mod.generateText(prompt, null, { temperature: 0.2 });
          return (raw ?? text).trim();
        } catch (err) {
          console.debug('Translation attempt failed, using original text as fallback', err);
          return text;
        }
      };

  if (lang === 'English') {
        // user provided English -> create Spanish translations
        payload.title_es = await tryTranslate(payload.title, 'Spanish');
        payload.description_es = await tryTranslate(payload.description, 'Spanish');
        payload.goal_es = await tryTranslate(payload.goal, 'Spanish');
      } else {
        // user provided Spanish -> create English translations
        payload.title_es = payload.title; // keep original Spanish
        payload.title = await tryTranslate(payload.title, 'English');
        payload.description_es = payload.description;
        payload.description = await tryTranslate(payload.description, 'English');
        payload.goal_es = payload.goal;
        payload.goal = await tryTranslate(payload.goal, 'English');
      }

      await onSave(payload);
      onClose(); // Close on success
    } catch (err) {
      setError(t('form.error.saveFailed'));
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateExample = async () => {
    if (!domain) return; // need a domain to tailor example
    setGeneratingExample(true);
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

      const prompts = domainPrompts[domain] || ['Create a general workflow automation scenario'];
      const selectedPrompt = prompts[Math.floor(Math.random() * prompts.length)];
      
      const prompt = `${selectedPrompt}. You must respond with EXACTLY this format:

TITLE: "A specific, actionable title for this workflow"
CURRENT_PROCESS: "A detailed description of the current manual process with specific pain points and inefficiencies"
DESIRED_OUTCOME: "Concrete, measurable outcomes and success criteria that would be achieved"
VALUE_DRIVERS: "3-5 key business value drivers (e.g., cost savings, time reduction, quality improvement)"
PAIN_POINTS: "3-5 specific pain points and problems this workflow will solve"

Make this example specific to ${domain} with realistic details, metrics, and business impact. Avoid generic responses.`;
      
      const response = await mod.generateText(prompt, null, { temperature: 0.4 });
      
      // Parse the structured response - handle multi-line content
      const markers = ['TITLE:', 'CURRENT_PROCESS:', 'DESIRED_OUTCOME:', 'VALUE_DRIVERS:', 'PAIN_POINTS:'];
      let parsedTitle = '';
      let parsedCurrentProcess = '';
      let parsedDesiredOutcome = '';
      let parsedValueDrivers = '';
      let parsedPainPoints = '';
      
      let currentSection = '';
      let currentContent: string[] = [];
      
      const lines = response.split('\n');
      for (const line of lines) {
        const trimmedLine = line.trim();
        if (!trimmedLine) continue;
        
        // Check if this line starts a new section
        let foundMarker = false;
        for (const marker of markers) {
          if (trimmedLine.startsWith(marker)) {
            // Save previous section if it exists
            if (currentSection) {
              const content = currentContent.join(' ').replace(/['"]/g, '').trim();
              if (currentSection === 'TITLE:') parsedTitle = content;
              else if (currentSection === 'CURRENT_PROCESS:') parsedCurrentProcess = content;
              else if (currentSection === 'DESIRED_OUTCOME:') parsedDesiredOutcome = content;
              else if (currentSection === 'VALUE_DRIVERS:') parsedValueDrivers = content;
              else if (currentSection === 'PAIN_POINTS:') parsedPainPoints = content;
            }
            
            // Start new section
            currentSection = marker;
            currentContent = [trimmedLine.replace(marker, '').trim()];
            foundMarker = true;
            break;
          }
        }
        
        // If no marker found and we're in a section, add to current content
        if (!foundMarker && currentSection) {
          currentContent.push(trimmedLine);
        }
      }
      
      // Don't forget to save the last section
      if (currentSection) {
        const content = currentContent.join(' ').replace(/['"]/g, '').trim();
        if (currentSection === 'TITLE:') parsedTitle = content;
        else if (currentSection === 'CURRENT_PROCESS:') parsedCurrentProcess = content;
        else if (currentSection === 'DESIRED_OUTCOME:') parsedDesiredOutcome = content;
        else if (currentSection === 'VALUE_DRIVERS:') parsedValueDrivers = content;
        else if (currentSection === 'PAIN_POINTS:') parsedPainPoints = content;
      }
      
      // Directly populate form fields
      if (parsedTitle) setTitle(parsedTitle);
      if (parsedCurrentProcess) setDescription(parsedCurrentProcess);
      if (parsedDesiredOutcome) setGoal(parsedDesiredOutcome);
      if (parsedValueDrivers) setValueDrivers(parsedValueDrivers);
      if (parsedPainPoints) setPainPoints(parsedPainPoints);
      
      console.log('AI Example generated and populated:', { 
        parsedTitle, 
        parsedCurrentProcess, 
        parsedDesiredOutcome,
        parsedValueDrivers,
        parsedPainPoints
      });
      
    } catch (err) {
      console.error('Failed to generate example', err);
      // Fallback with domain-specific content that directly populates fields
      const fallbackData = {
        title: `${domain} Process Optimization`,
        currentProcess: `Current ${domain.toLowerCase()} processes are inefficient and time-consuming, requiring significant manual effort that could be automated.`,
        desiredOutcome: `Streamline ${domain.toLowerCase()} operations through AI automation to reduce processing time and improve accuracy.`,
        valueDrivers: `Reduce manual effort by 60%, improve processing speed by 80%, enhance accuracy and consistency`,
        painPoints: `High manual workload, slow turnaround times, prone to human error, lack of visibility`
      };
      
      setTitle(fallbackData.title);
      setDescription(fallbackData.currentProcess);
      setGoal(fallbackData.desiredOutcome);
      setValueDrivers(fallbackData.valueDrivers);
      setPainPoints(fallbackData.painPoints);
    } finally {
      setGeneratingExample(false);
    }
  };

  // handleGenerate removed

  const domainOptions = [
    'Sales','HR','Finance','Operations','Logistics','Healthcare','Manufacturing','Legal','Procurement','Marketing','IT','Customer Support'
  ];

  const translatedDomainOptions = domainOptions.map(domain => ({
    value: domain,
    label: t(`domain.${domain.toLowerCase().replace(/\s+/g, '_')}`) || domain
  }));

  // Domain to process mapping (matches BusinessDomainManagement)
  const domainProcessMap: Record<string, string[]> = {
    'Sales': ['Lead Qualification', 'Proposal Generation', 'Contract Review'],
    'HR': ['Resume Screening', 'Onboarding Automation', 'Performance Review'],
    'Finance': ['Invoice Processing', 'Expense Approval', 'Financial Reporting'],
    'Operations': ['Workflow Optimization', 'Resource Allocation'],
    'Logistics': ['Shipment Tracking', 'Inventory Management'],
    'Healthcare': ['Patient Intake', 'Appointment Scheduling'],
    'Manufacturing': ['Quality Control', 'Production Planning'],
    'Legal': ['Document Review', 'Contract Analysis'],
    'Procurement': ['Purchase Order Processing', 'Vendor Management'],
    'Marketing': ['Campaign Analytics', 'Content Generation'],
    'IT': ['Ticket Routing', 'System Monitoring'],
    'Customer Support': ['Email Triage', 'Knowledge Base Search']
  };

  const availableProcesses = domain ? domainProcessMap[domain] || [] : [];

  return (
    <div 
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in"
      onClick={onClose}
    >
      <div 
        className="bg-white border border-wm-neutral/30 rounded-xl shadow-2xl p-6 w-full max-w-2xl text-left relative animate-fade-in-up overflow-y-auto max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-2xl font-bold text-wm-blue mb-4">{t('form.workflow.title')}</h2>
        <form onSubmit={handleSave} className="space-y-5">
          {/* Domain */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-sm font-bold text-wm-blue">{t('form.domain')}</label>
              <button
                type="button"
                onClick={handleGenerateExample}
                disabled={!domain || generatingExample}
                className="text-xs px-2 py-1 rounded-md bg-wm-accent text-white disabled:opacity-40 hover:bg-wm-accent/90 transition-colors font-bold"
              >
                {generatingExample ? t('loading') : t('aiExample.button')}
              </button>
            </div>
            <select
              value={domain}
              onChange={(e) => { 
                setDomain(e.target.value); 
                setProcess(''); // Reset process when domain changes
                setIsCustomProcess(false);
                setCustomProcess('');
              }}
              className="w-full bg-white border border-wm-neutral/30 rounded-lg p-3 text-wm-blue focus:ring-2 focus:ring-wm-accent focus:outline-none transition-shadow"
            >
              <option value="">{t('form.selectDomain')}</option>
              {translatedDomainOptions.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          {/* Industry (Optional) */}
          <div>
            <label className="block text-sm font-bold text-wm-blue mb-1">Industry (Optional)</label>
            <select
              value={industry}
              onChange={(e) => setIndustry(e.target.value)}
              className="w-full bg-white border border-wm-neutral/30 rounded-lg p-3 text-wm-blue focus:ring-2 focus:ring-wm-accent focus:outline-none transition-shadow"
            >
              <option value="">Select an industry (optional)</option>
              <option value="Healthcare">Healthcare</option>
              <option value="Finance">Finance</option>
              <option value="Retail">Retail</option>
              <option value="Manufacturing">Manufacturing</option>
              <option value="Technology">Technology</option>
              <option value="Education">Education</option>
              <option value="Real Estate">Real Estate</option>
              <option value="Hospitality">Hospitality</option>
              <option value="Transportation">Transportation</option>
              <option value="Energy">Energy</option>
              <option value="Telecommunications">Telecommunications</option>
              <option value="Media & Entertainment">Media & Entertainment</option>
              <option value="Government">Government</option>
              <option value="Non-Profit">Non-Profit</option>
              <option value="Professional Services">Professional Services</option>
              <option value="Other">Other</option>
            </select>
          </div>

          {/* Process */}
          {domain && availableProcesses.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-sm font-bold text-wm-blue">Sub-domain</label>
                {!isCustomProcess && (
                  <button
                    type="button"
                    onClick={() => setIsCustomProcess(true)}
                    className="text-xs text-wm-accent hover:text-wm-accent/80 font-bold"
                  >
                    + Add custom sub-domain
                  </button>
                )}
              </div>
              
              {isCustomProcess ? (
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={customProcess}
                    onChange={(e) => setCustomProcess(e.target.value)}
                    placeholder="Enter custom sub-domain name"
                    className="flex-1 bg-white border border-wm-neutral/30 rounded-lg p-3 text-wm-blue focus:ring-2 focus:ring-wm-accent focus:outline-none transition-shadow placeholder:text-wm-blue/40"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setIsCustomProcess(false);
                      setCustomProcess('');
                    }}
                    className="px-3 py-2 text-sm text-wm-blue/60 hover:text-wm-blue hover:bg-wm-neutral/20 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <select
                  value={process}
                  onChange={(e) => setProcess(e.target.value)}
                  className="w-full bg-white border border-wm-neutral/30 rounded-lg p-3 text-wm-blue focus:ring-2 focus:ring-wm-accent focus:outline-none transition-shadow"
                >
                  <option value="">Select a sub-domain (optional)</option>
                  {availableProcesses.map(proc => (
                    <option key={proc} value={proc}>{proc}</option>
                  ))}
                </select>
              )}
            </div>
          )}
          {/* Workflow Title */}
          <div>
            <label htmlFor="title" className="block text-sm font-bold text-wm-blue mb-1">{t('form.title')}</label>
            <input
              id="title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t('form.titlePlaceholder')}
              className="w-full bg-white border border-wm-neutral/30 rounded-lg p-3 text-wm-blue focus:ring-2 focus:ring-wm-accent focus:outline-none transition-shadow placeholder:text-wm-blue/40"
            />
          </div>
          {/* Current Process */}
          <div>
            <label htmlFor="description" className="block text-sm font-bold text-wm-blue mb-1">Current Process</label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              placeholder="Describe the current process"
              className="w-full bg-white border border-wm-neutral/30 rounded-lg p-3 text-wm-blue focus:ring-2 focus:ring-wm-accent focus:outline-none transition-shadow placeholder:text-wm-blue/40"
            />
          </div>
          {/* Desired Outcome */}
          <div>
            <label htmlFor="goal" className="block text-sm font-bold text-wm-blue mb-1">Desired Outcome</label>
            <textarea
              id="goal"
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              rows={4}
              placeholder="What is the desired outcome?"
              className="w-full bg-white border border-wm-neutral/30 rounded-lg p-3 text-wm-blue focus:ring-2 focus:ring-wm-accent focus:outline-none transition-shadow placeholder:text-wm-blue/40"
            />
          </div>

          {/* Value Drivers */}
          <div>
            <label htmlFor="valueDrivers" className="block text-sm font-bold text-wm-blue mb-1">
              Value Drivers <span className="ml-1 text-wm-blue/50 font-normal">(Optional)</span>
            </label>
            <textarea
              id="valueDrivers"
              value={valueDrivers}
              onChange={(e) => setValueDrivers(e.target.value)}
              rows={3}
              placeholder="What business value will this deliver?"
              className="w-full bg-white border border-wm-neutral/30 rounded-lg p-3 text-wm-blue focus:ring-2 focus:ring-wm-accent focus:outline-none transition-shadow placeholder:text-wm-blue/40"
            />
          </div>

          {/* Pain Points */}
          <div>
            <label htmlFor="painPoints" className="block text-sm font-bold text-wm-blue mb-1">
              Pain Points <span className="ml-1 text-wm-blue/50 font-normal">(Optional)</span>
            </label>
            <textarea
              id="painPoints"
              value={painPoints}
              onChange={(e) => setPainPoints(e.target.value)}
              rows={3}
              placeholder="What problems does this solve?"
              className="w-full bg-white border border-wm-neutral/30 rounded-lg p-3 text-wm-blue focus:ring-2 focus:ring-wm-accent focus:outline-none transition-shadow placeholder:text-wm-blue/40"
            />
          </div>

          {/* Current Workflow Image Upload */}
          <div className="mt-4 pt-4 border-t border-wm-neutral/30">
            <div className="mb-2">
              <label className="block text-sm font-bold text-wm-blue">
                {t('form.currentWorkflow')}
                <span className="ml-1 text-wm-blue/50">({t('form.optional')})</span>
              </label>
              <p className="text-sm text-wm-blue/60 mt-1">{t('form.uploadImage')}</p>
            </div>
            
            <div className="mt-3">
              {previewUrl ? (
                <div className="relative rounded-lg border-2 border-wm-accent/50 bg-wm-accent/10 p-4">
                  <img
                    src={previewUrl}
                    alt="Current workflow preview"
                    className="max-h-64 object-contain mx-auto rounded-lg"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setCurrentWorkflowImage(null);
                      setPreviewUrl(null);
                    }}
                    className="absolute top-2 right-2 p-1 bg-wm-pink/90 hover:bg-wm-pink text-white rounded-full transition-colors"
                    title={t('form.removeImage')}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </button>
                </div>
              ) : (
                <label
                  htmlFor="workflow-image"
                  className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-wm-neutral/50 hover:border-wm-accent rounded-lg cursor-pointer bg-wm-neutral/10 hover:bg-wm-neutral/20 transition-all duration-200"
                >
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    <svg className="w-8 h-8 mb-3 text-wm-blue/40" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                    <p className="mb-2 text-sm text-wm-blue/60">{t('form.dragToUpload')}</p>
                    <p className="text-xs text-wm-blue/40">{t('form.imageTypes')}</p>
                  </div>
                  <input
                    id="workflow-image"
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="hidden"
                  />
                </label>
              )}
            </div>
          </div>

          <div>
            {domain && (
              <div className="mt-2">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-wm-accent/20 text-wm-accent">{domain}</span>
              </div>
            )}
          </div>
          
          {error && (
            <p className="text-sm text-wm-pink bg-wm-pink/10 p-3 rounded-lg text-center font-bold">{error}</p>
          )}

          <div className="flex items-center justify-end gap-4 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-md text-sm font-bold text-wm-blue/60 hover:bg-wm-neutral/20 transition-colors"
            >
              {t('common.cancel')}
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex items-center justify-center px-6 py-2 bg-wm-accent text-white font-bold rounded-lg hover:bg-wm-accent/90 transition-colors disabled:bg-wm-neutral disabled:cursor-not-allowed"
            >
              {isLoading ? <LoadingSpinner /> : t('common.save')}
            </button>
          </div>
        </form>
        <button 
            onClick={onClose}
            className="absolute top-3 right-3 text-wm-blue/40 hover:text-wm-blue/60 transition-colors"
                aria-label={t('common.close')}
        >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
        </button>
      </div>
    </div>
  );
};

export default CreateScenarioForm;
