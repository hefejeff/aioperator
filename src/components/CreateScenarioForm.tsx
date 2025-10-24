import React, { useState } from 'react';
import { useTranslation } from '../i18n';
import { LoadingSpinner } from './OperatorConsole';
// Note: import is done dynamically in the handler to avoid throwing at module load if API key is missing

interface CreateScenarioFormProps {
  onSave: (data: { 
    title: string; 
    title_es?: string; 
    description: string; 
    description_es?: string; 
    goal: string; 
    goal_es?: string; 
    domain?: string;
    currentWorkflowImage: File | undefined;
  }) => Promise<void>;
  onClose: () => void;
}

export type ScenarioFormPayload = Parameters<CreateScenarioFormProps['onSave']>[0];

const CreateScenarioForm: React.FC<CreateScenarioFormProps> = ({ onSave, onClose }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [goal, setGoal] = useState('');
  const [domain, setDomain] = useState('');
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
PROBLEM: "A detailed, real-world problem description with specific pain points and current inefficiencies"
TARGET: "Concrete, measurable outcomes and success criteria that would be achieved"

Make this example specific to ${domain} with realistic details, metrics, and business impact. Avoid generic responses.`;
      
      const response = await mod.generateText(prompt, null, { temperature: 0.4 });
      
      // Parse the structured response
      const lines = response.split('\n').filter(line => line.trim());
      let parsedTitle = '';
      let parsedProblem = '';
      let parsedTarget = '';
      
      for (const line of lines) {
        if (line.startsWith('TITLE:')) {
          parsedTitle = line.replace('TITLE:', '').replace(/['"]/g, '').trim();
        } else if (line.startsWith('PROBLEM:')) {
          parsedProblem = line.replace('PROBLEM:', '').replace(/['"]/g, '').trim();
        } else if (line.startsWith('TARGET:')) {
          parsedTarget = line.replace('TARGET:', '').replace(/['"]/g, '').trim();
        }
      }
      
      // Directly populate form fields
      if (parsedTitle) setTitle(parsedTitle);
      if (parsedProblem) setDescription(parsedProblem);
      if (parsedTarget) setGoal(parsedTarget);
      
      console.log('AI Example generated and populated:', { parsedTitle, parsedProblem, parsedTarget });
      
    } catch (err) {
      console.error('Failed to generate example', err);
      // Fallback with domain-specific content that directly populates fields
      const fallbackData = {
        title: `${domain} Process Optimization`,
        problem: `Current ${domain.toLowerCase()} processes are inefficient and time-consuming, requiring significant manual effort that could be automated.`,
        target: `Streamline ${domain.toLowerCase()} operations through AI automation to reduce processing time and improve accuracy.`
      };
      
      setTitle(fallbackData.title);
      setDescription(fallbackData.problem);
      setGoal(fallbackData.target);
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

  return (
    <div 
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in"
      onClick={onClose}
    >
      <div 
        className="bg-slate-800 border border-slate-700 rounded-xl shadow-2xl p-6 w-full max-w-2xl text-left relative animate-fade-in-up overflow-y-auto max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-2xl font-bold text-white mb-4">{t('form.workflow.title')}</h2>
        <form onSubmit={handleSave} className="space-y-5">
          {/* Domain */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-sm font-medium text-slate-300">{t('form.domain')}</label>
              <button
                type="button"
                onClick={handleGenerateExample}
                disabled={!domain || generatingExample}
                className="text-xs px-2 py-1 rounded-md bg-sky-700 text-white disabled:opacity-40 hover:bg-sky-600 transition-colors"
              >
                {generatingExample ? t('loading') : t('aiExample.button')}
              </button>
            </div>
            <select
              value={domain}
              onChange={(e) => { setDomain(e.target.value); }}
              className="w-full bg-slate-900 border border-slate-600 rounded-lg p-3 text-slate-200 focus:ring-2 focus:ring-sky-500 focus:outline-none transition-shadow"
            >
              <option value="">{t('form.selectDomain')}</option>
              {translatedDomainOptions.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
          {/* Workflow Title */}
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-slate-300 mb-1">{t('form.title')}</label>
            <input
              id="title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t('form.titlePlaceholder')}
              className="w-full bg-slate-900 border border-slate-600 rounded-lg p-3 text-slate-200 focus:ring-2 focus:ring-sky-500 focus:outline-none transition-shadow"
            />
          </div>
          {/* Your Problem (Description) */}
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-slate-300 mb-1">{t('form.description')}</label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              placeholder={t('form.descriptionPlaceholder')}
              className="w-full bg-slate-900 border border-slate-600 rounded-lg p-3 text-slate-200 focus:ring-2 focus:ring-sky-500 focus:outline-none transition-shadow"
            />
          </div>
          {/* Target (Goal) */}
          <div>
            <label htmlFor="goal" className="block text-sm font-medium text-slate-300 mb-1">{t('form.goal')}</label>
            <textarea
              id="goal"
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              rows={4}
              placeholder={t('form.goalPlaceholder')}
              className="w-full bg-slate-900 border border-slate-600 rounded-lg p-3 text-slate-200 focus:ring-2 focus:ring-sky-500 focus:outline-none transition-shadow"
            />
          </div>

          {/* Current Workflow Image Upload */}
          <div className="mt-4 pt-4 border-t border-slate-700">
            <div className="mb-2">
              <label className="block text-sm font-medium text-slate-300">
                {t('form.currentWorkflow')}
                <span className="ml-1 text-slate-500">({t('form.optional')})</span>
              </label>
              <p className="text-sm text-slate-400 mt-1">{t('form.uploadImage')}</p>
            </div>
            
            <div className="mt-3">
              {previewUrl ? (
                <div className="relative rounded-lg border-2 border-sky-500/50 bg-sky-500/10 p-4">
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
                    className="absolute top-2 right-2 p-1 bg-red-500/90 hover:bg-red-600 text-white rounded-full transition-colors"
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
                  className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-slate-600 hover:border-slate-500 rounded-lg cursor-pointer bg-slate-900/50 hover:bg-slate-800/50 transition-all duration-200"
                >
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    <svg className="w-8 h-8 mb-3 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                    <p className="mb-2 text-sm text-slate-400">{t('form.dragToUpload')}</p>
                    <p className="text-xs text-slate-500">{t('form.imageTypes')}</p>
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
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-700 text-emerald-100">{domain}</span>
              </div>
            )}
          </div>
          
          {error && (
            <p className="text-sm text-red-400 bg-red-900/30 p-3 rounded-lg text-center">{error}</p>
          )}

          <div className="flex items-center justify-end gap-4 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-md text-sm font-medium text-slate-300 hover:bg-slate-700 transition-colors"
            >
              {t('common.cancel')}
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex items-center justify-center px-6 py-2 bg-sky-600 text-white font-bold rounded-lg hover:bg-sky-500 transition-colors disabled:bg-slate-700 disabled:cursor-not-allowed"
            >
              {isLoading ? <LoadingSpinner /> : t('common.save')}
            </button>
          </div>
        </form>
        <button 
            onClick={onClose}
            className="absolute top-3 right-3 text-slate-500 hover:text-slate-300 transition-colors"
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
