

import React, { useEffect, useState } from 'react';
import type firebase from 'firebase/compat/app';
import type { Scenario } from '../types';
import { saveUserScenario, deleteUserScenario, updateScenario } from '../services/firebaseService';
import ScenarioCard from './ScenarioCard';
import CreateScenarioForm from './CreateScenarioForm';
import { useTranslation } from '../i18n';

interface TrainingViewProps {
  scenarios: Scenario[];
  onSelectScenario: (scenario: Scenario) => void;
  user: firebase.User;
  onScenarioCreated: (newScenario: Scenario) => void;
  highScores: Record<string, number>;
  averageScores: Record<string, number>;
}

const TrainingView: React.FC<TrainingViewProps> = ({ scenarios, onSelectScenario, user, onScenarioCreated, highScores, averageScores }) => {
  const [isCreating, setIsCreating] = useState(false);
  const [localScenarios, setLocalScenarios] = useState<Scenario[]>(scenarios);
  const [domainFilter, setDomainFilter] = useState<string>('All');

  useEffect(() => {
  setLocalScenarios(scenarios);
  }, [scenarios]);

  useEffect(() => {
    const onDelete = async (e: Event) => {
      const detail = (e as CustomEvent).detail as { id: string } | undefined;
      if (!detail || !user) return;
      try {
        await deleteUserScenario(user.uid, detail.id);
        setLocalScenarios(prev => prev.filter(s => s.id !== detail.id));
      } catch (err) {
        console.error('Failed to delete scenario:', err);
        alert('Failed to delete scenario. See console for details.');
      }
    };
    window.addEventListener('scenario-delete', onDelete as EventListener);
    return () => window.removeEventListener('scenario-delete', onDelete as EventListener);
  }, [user]);

  const handleSaveScenario = async (data: { title: string; description: string; goal: string; domain?: string }) => {
    // This will throw on error, which is caught by the form component
    const newScenario = await saveUserScenario(user.uid, data as any);
    onScenarioCreated(newScenario);
  };

  const [translatingId, setTranslatingId] = useState<string | null>(null);

  const handleTranslate = async (scenario: Scenario) => {
    if (translatingId) return; // single translation at a time
    setTranslatingId(scenario.id);
    try {
      // Attempt to use geminiService to translate to Spanish if missing
      const mod = await import('../services/geminiService');

      const translateText = async (text: string, target: 'Spanish' | 'English') => {
        try {
          const prompt = `Translate the following text to ${target}. Keep meaning and tone, be concise. Return only the translated text:\n\n${text}`;
          const raw = await mod.generateText(prompt, null, { temperature: 0.2 });
          return (raw ?? text).trim();
        } catch (err) {
          console.debug('Translation failed, falling back to original', err);
          return text;
        }
      };

      const updated: Scenario = { ...scenario };
      // If Spanish missing, create title_es/description_es/goal_es from English
      if (!updated.title_es && updated.title) {
        updated.title_es = await translateText(updated.title, 'Spanish');
      }
      if (!updated.description_es && updated.description) {
        updated.description_es = await translateText(updated.description, 'Spanish');
      }
      if (!updated.goal_es && updated.goal) {
        updated.goal_es = await translateText(updated.goal, 'Spanish');
      }

      if (updated.userId) {
        // user-owned scenario — update in-place
        await updateScenario(updated);
      } else {
        // seeded scenario — create a per-user override so we don't write to protected global path
        const { createUserScenarioOverride } = await import('../services/firebaseService');
        await createUserScenarioOverride(user.uid, updated.id, {
          title_es: updated.title_es,
          description_es: updated.description_es,
          goal_es: updated.goal_es,
          domain: updated.domain,
        });
      }
      setLocalScenarios(prev => prev.map(s => s.id === updated.id ? updated : s));
    } catch (err) {
      console.error('Translation failed:', err);
      alert('Translation failed. See console for details.');
    } finally {
      setTranslatingId(null);
    }
  };

  const filteredScenarios = domainFilter === 'All' ? localScenarios : localScenarios.filter(s => (s.domain || 'General') === domainFilter);

  const { t } = useTranslation();

  return (
    <div className="animate-fade-in">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold mb-2">{t('training.title')}</h1>
        <p className="text-lg text-slate-400">{t('training.subtitle')}</p>
        <button
          onClick={() => setIsCreating(true)}
          className="mt-4 inline-flex items-center justify-center px-5 py-2 border border-transparent text-base font-medium rounded-md text-white bg-sky-600 hover:bg-sky-700 transition-colors"
        >
          {t('training.createButton')}
        </button>
      </div>

      {isCreating && (
        <CreateScenarioForm
          onSave={handleSaveScenario}
          onClose={() => setIsCreating(false)}
        />
      )}

        <div className="flex items-center justify-between mb-4">
        <div />
        <div className="flex items-center space-x-2">
          <label className="text-sm text-slate-300">{t('training.filter')}</label>
          <select value={domainFilter} onChange={(e) => setDomainFilter(e.target.value)} className="bg-slate-900 border border-slate-700 rounded-md p-2 text-slate-200">
            <option value="All">{t('filter.all')}</option>
            {['Sales','HR','Finance','Operations','Logistics','Healthcare','Manufacturing','Legal','Procurement','Marketing','IT','Customer Support','General'].map(d => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredScenarios.map(scenario => (
          <ScenarioCard 
            key={scenario.id} 
            scenario={scenario} 
            onSelect={onSelectScenario}
            highScore={highScores[scenario.id]}
            averageScore={averageScores[scenario.id]}
            onTranslate={handleTranslate}
          />
        ))}
      </div>
    </div>
  );
};

export default TrainingView;