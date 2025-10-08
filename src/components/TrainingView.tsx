

import React, { useEffect, useState } from 'react';
import type firebase from 'firebase/compat/app';
import type { Scenario } from '../types';
import { saveUserScenario, deleteUserScenario, updateScenario, toggleFavoriteScenario, getUserFavoriteScenarioIds } from '../services/firebaseService';
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
  const [showStarredOnly, setShowStarredOnly] = useState(false);
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());
  const [favoriteBusyId, setFavoriteBusyId] = useState<string | null>(null);

  useEffect(() => {
  setLocalScenarios(scenarios);
  }, [scenarios]);

  useEffect(() => {
    (async () => {
      try {
        const favs = await getUserFavoriteScenarioIds(user.uid);
        setFavoriteIds(favs);
      } catch (e) {
        // non-blocking
      }
    })();
  }, [user]);

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
  
  // Apply star filter
  const finalFilteredScenarios = showStarredOnly 
    ? filteredScenarios.filter(scenario => favoriteIds.has(scenario.id))
    : filteredScenarios;

  const sortedScenarios = [...finalFilteredScenarios].sort((a,b)=>{
    const aFav = favoriteIds.has(a.id) ? 1 : 0;
    const bFav = favoriteIds.has(b.id) ? 1 : 0;
    if (aFav !== bFav) return bFav - aFav; // favorites first
    return a.title.localeCompare(b.title);
  });

  const handleToggleFavorite = async (scenario: Scenario) => {
    if (favoriteBusyId) return;
    setFavoriteBusyId(scenario.id);
    try {
      const nowFav = await toggleFavoriteScenario(user.uid, scenario);
      setFavoriteIds(prev => {
        const next = new Set(prev);
        if (nowFav) next.add(scenario.id); else next.delete(scenario.id);
        return next;
      });
      // Optimistically update local scenario favoritedBy map
      setLocalScenarios(prev => prev.map(s => {
        if (s.id !== scenario.id) return s;
        const current = { ...(s.favoritedBy || {}) } as Record<string, true>;
        if (nowFav) {
          current[user.uid] = true as true;
        } else {
          delete current[user.uid];
        }
        return { ...s, favoritedBy: Object.keys(current).length ? current : undefined };
      }));
    } catch (e) {
      alert('Failed to toggle favorite.');
    } finally {
      setFavoriteBusyId(null);
    }
  };

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
        <div className="flex items-center space-x-4">
          {/* Star Filter Toggle */}
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium text-slate-300">Filters</span>
            <button
              onClick={() => setShowStarredOnly(!showStarredOnly)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-200 ${
                showStarredOnly
                  ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                  : 'bg-slate-700/50 text-slate-400 border border-slate-600/50 hover:bg-slate-600/50 hover:text-slate-300'
              }`}
            >
              <svg
                className={`w-4 h-4 transition-all duration-200 ${
                  showStarredOnly ? 'fill-current' : 'fill-none stroke-current'
                }`}
                viewBox="0 0 24 24"
                strokeWidth="2"
              >
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
              </svg>
              <span className="text-sm font-medium">
                {showStarredOnly ? 'Starred' : 'All'}
              </span>
            </button>
          </div>
          
          {/* Domain Filter */}
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
      </div>

      {sortedScenarios.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sortedScenarios.map(scenario => (
            <ScenarioCard 
              key={scenario.id} 
              scenario={scenario} 
              onSelect={onSelectScenario}
              highScore={highScores[scenario.id]}
              averageScore={averageScores[scenario.id]}
              onTranslate={handleTranslate}
              isFavorited={favoriteIds.has(scenario.id)}
              onToggleFavorite={handleToggleFavorite}
              favoriteBusy={favoriteBusyId === scenario.id}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-20">
          <div className="relative max-w-md mx-auto">
            {/* Background glow effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-yellow-500/10 via-amber-500/10 to-orange-500/10 rounded-3xl blur-2xl animate-pulse"></div>
            
            {/* Icon container */}
            <div className="relative w-32 h-32 bg-gradient-to-br from-slate-800/60 to-slate-900/60 backdrop-blur-xl rounded-3xl flex items-center justify-center mx-auto mb-8 border border-slate-700/50">
              <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent rounded-3xl"></div>
              <div className="relative text-slate-400">
                <svg className="w-16 h-16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                </svg>
              </div>
            </div>
            
            {/* Content */}
            <div className="relative">
              <h3 className="text-3xl font-bold text-white mb-4 bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">
                {showStarredOnly ? 'No Starred Scenarios Yet' : 'No Scenarios Found'}
              </h3>
              <p className="text-lg text-slate-400 mb-10 max-w-sm mx-auto leading-relaxed">
                {showStarredOnly 
                  ? 'Star your favorite scenarios to keep them organized and easily accessible.'
                  : domainFilter !== 'All' 
                    ? `No scenarios found in the ${domainFilter} domain.`
                    : 'Create your first scenario to get started with AI automation.'
                }
              </p>
              {!showStarredOnly && (
                <button
                  onClick={() => setIsCreating(true)}
                  className="group relative px-10 py-4 bg-gradient-to-r from-sky-500 to-blue-600 text-white font-semibold rounded-2xl hover:shadow-2xl hover:shadow-sky-500/25 transition-all duration-300 hover:-translate-y-1 backdrop-blur-sm border border-sky-400/20 hover:border-sky-300/40"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-white/10 to-transparent rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                  <span className="relative flex items-center gap-3">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    <span className="text-lg">Create Your First Scenario</span>
                  </span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TrainingView;