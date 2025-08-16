import React, { useState } from 'react';
import { useTranslation } from '../i18n';
import { LoadingSpinner } from './OperatorConsole';
// Note: import is done dynamically in the handler to avoid throwing at module load if API key is missing

interface CreateScenarioFormProps {
  onSave: (data: { title: string; title_es?: string; description: string; description_es?: string; goal: string; goal_es?: string; domain?: string }) => Promise<void>;
  onClose: () => void;
}

const CreateScenarioForm: React.FC<CreateScenarioFormProps> = ({ onSave, onClose }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [goal, setGoal] = useState('');
  const [domain, setDomain] = useState('');
  const [language, setLanguage] = useState<'English' | 'Spanish'>('English');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim() || !goal.trim()) {
      setError(t('create.errorRequired'));
      return;
    }
    setError(null);
    setIsLoading(true);
    try {
      const finalDomain = domain || 'General';

      // Build payload that includes both English and Spanish versions.
      const payload: any = {
        title: title.trim(),
        description: description.trim(),
        goal: goal.trim(),
        domain: finalDomain,
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

      if (language === 'English') {
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
      setError(t('create.errorSaveFailed'));
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerate = async () => {
    setGenerateError(null);
    setIsGenerating(true);
    try {
      // lazy import so the module check runs only when user requests generation
      const mod = await import('../services/geminiService');
  const hintParts: string[] = [];
    if (title.trim()) hintParts.push(`Title hint: ${title.trim()}`);
    if (description.trim()) hintParts.push(`Description hint: ${description.trim()}`);
    if (goal.trim()) hintParts.push(`Goal hint: ${goal.trim()}`);
  if (domain) hintParts.push(`Prefer domain: ${domain}`);
  if (language) hintParts.push(`Return language: ${language}`);

  const prompt = `You are an assistant that creates training scenarios for an "AI Operator Training Hub" application. Each scenario must describe a real-world business process flow (actors, steps, inputs/outputs) where at least one step could be improved or automated using AI. Prefer domains other than customer support unless the user explicitly asks for customer support. Choose a domain for the scenario from this list: Sales, HR, Finance, Operations, Logistics, Healthcare, Manufacturing, Legal, Procurement, Marketing, IT, Customer Support. Produce a JSON object with the following keys:\n- domain: short domain name from the list above\n- title: a short descriptive title (max 60 chars)\n- description: a concise summary (2-3 sentences) that explains the business process, lists the main actors/roles involved, and highlights which step(s) are good candidates for AI improvement or automation\n- goal: a clear, actionable goal the trainee should achieve when designing or critiquing an improved process (focus on AI augmentation opportunities)\nIf the user provided hints, incorporate them. Return ONLY valid JSON. Hints: ${hintParts.join(' | ')}`;

  // choose a random temperature between 0.35 and 0.85 for variety
  const temp = Math.random() * (0.85 - 0.35) + 0.35;
  const raw = await mod.generateText(prompt, null, { temperature: Number(temp.toFixed(2)) });

      // Try to parse JSON from the response
      let parsed: any = null;
      try {
        parsed = JSON.parse(raw);
      } catch (err) {
        // If parsing fails, attempt to extract JSON block from the text
        const match = raw.match(/\{[\s\S]*\}/);
        if (match) {
          try {
            parsed = JSON.parse(match[0]);
          } catch (err2) {
            // fallthrough
          }
        }
      }

      if (parsed && typeof parsed === 'object') {
        if (parsed.domain) setDomain(String(parsed.domain));
        if (parsed.title) setTitle(String(parsed.title));
        if (parsed.description) setDescription(String(parsed.description));
        if (parsed.goal) setGoal(String(parsed.goal));
      } else {
        // If we couldn't parse, put the raw response into the description for editing
        setDescription(raw);
        setGenerateError(t('create.generateErrorNonJson'));
      }
    } catch (err) {
      console.error('AI generation error:', err);
      setGenerateError(t('create.generateErrorFailed'));
    } finally {
      setIsGenerating(false);
    }
  };

  const { t } = useTranslation();

  return (
    <div 
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in"
      onClick={onClose}
    >
      <div 
        className="bg-slate-800 border border-slate-700 rounded-xl shadow-2xl p-6 w-full max-w-2xl text-left relative animate-fade-in-up"
        onClick={(e) => e.stopPropagation()} // Prevent closing modal when clicking inside
      >
  <h2 className="text-2xl font-bold text-white mb-4">{t('create.title')}</h2>
        <form onSubmit={handleSave} className="space-y-4">
          <div className="flex flex-col md:flex-row md:items-center md:space-x-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-slate-300 mb-1">{t('create.domain')}</label>
              <select
                value={domain}
                onChange={(e) => setDomain(e.target.value)}
                className="w-full bg-slate-900 border border-slate-600 rounded-lg p-3 text-slate-200 focus:ring-2 focus:ring-sky-500 focus:outline-none transition-shadow"
              >
                <option value="">{t('create.domainAuto')}</option>
                <option>Sales</option>
                <option>HR</option>
                <option>Finance</option>
                <option>Operations</option>
                <option>Logistics</option>
                <option>Healthcare</option>
                <option>Manufacturing</option>
                <option>Legal</option>
                <option>Procurement</option>
                <option>Marketing</option>
                <option>IT</option>
                <option>Customer Support</option>
              </select>
            </div>
            <div className="mt-3 md:mt-0 md:w-64">
              <label className="block text-sm font-medium text-slate-300 mb-1">{t('create.language')}</label>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value as 'English' | 'Spanish')}
                className="w-full bg-slate-900 border border-slate-600 rounded-lg p-3 text-slate-200 focus:ring-2 focus:ring-sky-500 focus:outline-none transition-shadow"
              >
                <option>English</option>
                <option>Spanish</option>
              </select>
            </div>
          </div>
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-slate-300 mb-1">{t('create.titleField')}</label>
              <input
              id="title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t('create.titleField')}
              className="w-full bg-slate-900 border border-slate-600 rounded-lg p-3 text-slate-200 focus:ring-2 focus:ring-sky-500 focus:outline-none transition-shadow"
            />
            {domain && (
              <div className="mt-2">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-700 text-emerald-100">{domain}</span>
              </div>
            )}
          </div>
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-slate-300 mb-1">{t('create.description')}</label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder={t('create.descriptionPlaceholder')}
              className="w-full bg-slate-900 border border-slate-600 rounded-lg p-3 text-slate-200 focus:ring-2 focus:ring-sky-500 focus:outline-none transition-shadow"
            />
          </div>
          <div>
            <label htmlFor="goal" className="block text-sm font-medium text-slate-300 mb-1">{t('create.goal')}</label>
            <textarea
              id="goal"
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              rows={5}
              placeholder={t('create.goalPlaceholder')}
              className="w-full bg-slate-900 border border-slate-600 rounded-lg p-3 text-slate-200 focus:ring-2 focus:ring-sky-500 focus:outline-none transition-shadow"
            />
          </div>
          
          {error && (
            <p className="text-sm text-red-400 bg-red-900/30 p-3 rounded-lg text-center">{error}</p>
          )}

          {generateError && (
            <p className="text-sm text-amber-300 bg-amber-900/20 p-3 rounded-lg text-center">{generateError}</p>
          )}

          <div className="flex items-center justify-between gap-4 pt-4">
            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={handleGenerate}
                disabled={isGenerating}
                className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-500 transition-colors disabled:opacity-60"
              >
                {isGenerating ? <LoadingSpinner /> : t('create.generate')}
              </button>
              <span className="text-sm text-slate-400">{t('create.orFill')}</span>
            </div>

            <div className="flex justify-end space-x-4">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-md text-sm font-medium text-slate-300 hover:bg-slate-700 transition-colors"
              >
                {t('create.cancel')}
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="flex items-center justify-center px-6 py-2 bg-sky-600 text-white font-bold rounded-lg hover:bg-sky-500 transition-colors disabled:bg-slate-700 disabled:cursor-not-allowed"
              >
                {isLoading ? <LoadingSpinner /> : t('create.save')}
              </button>
            </div>
          </div>
        </form>
        <button 
            onClick={onClose}
            className="absolute top-3 right-3 text-slate-500 hover:text-slate-300 transition-colors"
            aria-label="Close"
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
