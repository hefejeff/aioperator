

import React, { useEffect, useState } from 'react';
import type { User } from 'firebase/auth';
import type { Scenario } from '../types';
import { saveUserScenario, deleteUserScenario, updateScenario, toggleFavoriteScenario, getUserFavoriteScenarioIds } from '../services/firebaseService';
import ScenarioCard from './ScenarioCard';
import CreateScenarioForm from './CreateScenarioForm';
import { useTranslation } from '../i18n';

interface TrainingViewProps {
  scenarios: Scenario[];
  onSelectScenario: (scenario: Scenario) => void;
  user: User;
  onScenarioCreated: (newScenario: Scenario) => void;
}

const TrainingView: React.FC<TrainingViewProps> = ({ scenarios, onSelectScenario, user, onScenarioCreated }) => {
  const [isCreating, setIsCreating] = useState(false);
  const [localScenarios, setLocalScenarios] = useState<Scenario[]>(scenarios);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const [domainFilter, setDomainFilter] = useState<string>('All');
  const [subdomainFilter, setSubdomainFilter] = useState<string>('All');
  const [industryFilter, setIndustryFilter] = useState<string>('All');
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

  // Reset subdomain filter when domain changes
  useEffect(() => {
    setSubdomainFilter('All');
  }, [domainFilter]);

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
    console.log('handleTranslate called for scenario:', scenario.id);
    if (translatingId) {
      console.log('Already translating, skipping');
      return; // single translation at a time
    }
    setTranslatingId(scenario.id);
    console.log('Starting translation for:', scenario.id);
    try {
      // Attempt to use geminiService to translate to Spanish if missing
      const mod = await import('../services/geminiService');
      console.log('geminiService module loaded');

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
      console.log('Current scenario translations:', {
        title_es: updated.title_es,
        description_es: updated.description_es,
        goal_es: updated.goal_es,
        process_es: updated.process_es,
        valueDrivers_es: updated.valueDrivers_es,
        painPoints_es: updated.painPoints_es
      });
      // If Spanish missing, create translations from English
      if (!updated.title_es && updated.title) {
        console.log('Translating title:', updated.title);
        updated.title_es = await translateText(updated.title, 'Spanish');
        console.log('Title translated to:', updated.title_es);
      }
      if (!updated.description_es && updated.description) {
        console.log('Translating description');
        updated.description_es = await translateText(updated.description, 'Spanish');
      }
      if (!updated.goal_es && updated.goal) {
        console.log('Translating goal');
        updated.goal_es = await translateText(updated.goal, 'Spanish');
      }
      if (!updated.process_es && updated.process) {
        console.log('Translating process');
        updated.process_es = await translateText(updated.process, 'Spanish');
      }
      if (!updated.valueDrivers_es && updated.valueDrivers) {
        console.log('Translating valueDrivers');
        updated.valueDrivers_es = await translateText(updated.valueDrivers, 'Spanish');
      }
      if (!updated.painPoints_es && updated.painPoints) {
        console.log('Translating painPoints');
        updated.painPoints_es = await translateText(updated.painPoints, 'Spanish');
      }

      console.log('Translations complete, updating scenario...');
      if (updated.userId) {
        // user-owned scenario — update in-place
        console.log('Updating user-owned scenario');
        await updateScenario(updated);
      } else {
        // seeded scenario — create a per-user override so we don't write to protected global path
        console.log('Creating user override for seeded scenario');
        const { createUserScenarioOverride } = await import('../services/firebaseService');
        await createUserScenarioOverride(user.uid, updated.id, {
          title_es: updated.title_es,
          description_es: updated.description_es,
          goal_es: updated.goal_es,
          process_es: updated.process_es,
          valueDrivers_es: updated.valueDrivers_es,
          painPoints_es: updated.painPoints_es,
          domain: updated.domain,
        });
      }
      console.log('Scenario updated successfully');
      setLocalScenarios(prev => prev.map(s => s.id === updated.id ? updated : s));
    } catch (err) {
      console.error('Translation failed:', err);
      alert('Translation failed. See console for details.');
    } finally {
      console.log('Translation complete, clearing translatingId');
      setTranslatingId(null);
    }
  };

  // Apply filters or search independently
  let filteredScenarios;
  let searchResults: Scenario[] = [];
  
  if (searchQuery.trim()) {
    // If searching, ignore other filters and search across all scenarios
    const query = searchQuery.toLowerCase();
    searchResults = localScenarios.filter(s => 
      s.title.toLowerCase().includes(query) || 
      s.description.toLowerCase().includes(query) ||
      (s.domain && s.domain.toLowerCase().includes(query)) ||
      (s.process && s.process.toLowerCase().includes(query)) ||
      (s.industry && s.industry.toLowerCase().includes(query))
    );
    filteredScenarios = searchResults;
  } else {
    // If not searching, apply domain/subdomain/industry filters
    filteredScenarios = domainFilter === 'All' ? localScenarios : localScenarios.filter(s => (s.domain || 'General') === domainFilter);
    filteredScenarios = subdomainFilter === 'All' ? filteredScenarios : filteredScenarios.filter(s => s.process === subdomainFilter);
    filteredScenarios = industryFilter === 'All' ? filteredScenarios : filteredScenarios.filter(s => s.industry === industryFilter);
  }
  
  // Apply star filter to both search and filter results
  const finalFilteredScenarios = showStarredOnly 
    ? filteredScenarios.filter(scenario => favoriteIds.has(scenario.id))
    : filteredScenarios;

  // Get available subdomains for current domain filter
  const availableSubdomains = domainFilter === 'All' 
    ? Array.from(new Set(localScenarios.map(s => s.process).filter(Boolean))).sort()
    : Array.from(new Set(localScenarios.filter(s => (s.domain || 'General') === domainFilter).map(s => s.process).filter(Boolean))).sort();

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
        <h1 className="text-3xl font-bold mb-2 text-wm-blue">{t('training.title')}</h1>
        <p className="text-lg text-wm-blue/60">{t('training.subtitle')}</p>
        
        {/* Large Search Box with Create Option */}
        <div className="mt-6 max-w-3xl mx-auto relative">
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setShowSearchDropdown(true);
              }}
              onFocus={() => setShowSearchDropdown(true)}
              onBlur={() => setTimeout(() => setShowSearchDropdown(false), 200)}
              placeholder="Search scenarios by title, description, domain, sub-domain, or industry..."
              className="w-full px-6 py-4 text-lg border-2 border-wm-neutral/30 rounded-xl focus:outline-none focus:border-wm-accent transition-colors"
            />
          </div>
          
          {/* Search Results Dropdown */}
          {showSearchDropdown && (
            <div className="absolute top-full mt-2 w-full bg-white border-2 border-wm-accent/30 rounded-xl shadow-xl max-h-96 overflow-y-auto z-50">
              {searchQuery.trim() && searchResults.length > 0 && (
                <>
                  {searchResults.slice(0, 10).map(scenario => (
                    <button
                      key={scenario.id}
                      onClick={() => {
                        onSelectScenario(scenario);
                        setShowSearchDropdown(false);
                        setSearchQuery('');
                      }}
                      className="w-full px-6 py-3 text-left hover:bg-wm-accent/10 transition-colors border-b border-wm-neutral/10 last:border-b-0"
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex-1">
                          <div className="font-bold text-wm-blue">{scenario.title}</div>
                          <div className="text-sm text-wm-blue/60 line-clamp-1">{scenario.description}</div>
                          <div className="flex gap-2 mt-1">
                            {scenario.domain && (
                              <span className="text-xs px-2 py-0.5 bg-wm-accent/10 text-wm-accent rounded-full">{scenario.domain}</span>
                            )}
                            {scenario.process && (
                              <span className="text-xs px-2 py-0.5 bg-wm-blue/10 text-wm-blue rounded-full">{scenario.process}</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </button>
                  ))}
                  {searchResults.length > 10 && (
                    <div className="px-6 py-2 text-sm text-wm-blue/50 text-center border-b border-wm-neutral/10">
                      Showing 10 of {searchResults.length} results
                    </div>
                  )}
                </>
              )}
              
              {searchQuery.trim() && searchResults.length === 0 && (
                <div className="px-6 py-4 text-center text-wm-blue/50 border-b border-wm-neutral/10">
                  No scenarios found matching "{searchQuery}"
                </div>
              )}
              
              {/* Create New Option - Always Visible and Sticky */}
              <button
                onClick={() => {
                  setIsCreating(true);
                  setShowSearchDropdown(false);
                  setSearchQuery('');
                }}
                className="w-full px-6 py-4 text-left bg-wm-accent/5 hover:bg-wm-accent/10 transition-colors font-bold text-wm-accent flex items-center gap-2 sticky bottom-0"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Create New Scenario
              </button>
            </div>
          )}
        </div>
      </div>

      {isCreating && (
        <CreateScenarioForm
          onSave={handleSaveScenario}
          onClose={() => setIsCreating(false)}
        />
      )}

        <div className="flex items-center justify-between mb-6 bg-gradient-to-r from-wm-accent/5 via-wm-blue/5 to-wm-accent/5 p-4 rounded-xl border border-wm-neutral/20 shadow-sm">
        <div />
        <div className="flex items-center space-x-4">
          {/* Star Filter Toggle */}
          <div className="flex items-center gap-4">
            <span className="text-sm font-bold text-wm-blue/70">Filters</span>
            <button
              onClick={() => setShowStarredOnly(!showStarredOnly)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-200 font-bold ${
                showStarredOnly
                  ? 'bg-wm-yellow/20 text-wm-blue border border-wm-yellow/50'
                  : 'bg-wm-neutral/20 text-wm-blue/60 border border-wm-neutral/30 hover:bg-wm-neutral/30 hover:text-wm-blue'
              }`}
            >
              <svg
                className={`w-4 h-4 transition-all duration-200 ${
                  showStarredOnly ? 'fill-current text-wm-yellow' : 'fill-none stroke-current'
                }`}
                viewBox="0 0 24 24"
                strokeWidth="2"
              >
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
              </svg>
              <span className="text-sm font-bold">
                {showStarredOnly ? 'Starred' : 'All'}
              </span>
            </button>
          </div>
          
          {/* Industry Filter */}
          <div className="flex items-center space-x-2">
            <label className="text-sm text-wm-blue/70 font-bold">Industry</label>
            <select value={industryFilter} onChange={(e) => setIndustryFilter(e.target.value)} className="bg-white border border-wm-neutral/30 rounded-md p-2 text-wm-blue">
              <option value="All">All Industries</option>
              {['Healthcare', 'Finance', 'Retail', 'Manufacturing', 'Technology', 'Education', 'Real Estate', 'Hospitality', 'Transportation', 'Energy', 'Telecommunications', 'Media & Entertainment', 'Government', 'Non-Profit', 'Professional Services', 'Other'].map(i => (
                <option key={i} value={i}>{i}</option>
              ))}
            </select>
          </div>

          {/* Domain Filter */}
          <div className="flex items-center space-x-2">
            <label className="text-sm text-wm-blue/70 font-bold">{t('training.filter')}</label>
            <select value={domainFilter} onChange={(e) => setDomainFilter(e.target.value)} className="bg-white border border-wm-neutral/30 rounded-md p-2 text-wm-blue">
              <option value="All">{t('filter.all')}</option>
              {['Sales','HR','Finance','Operations','Logistics','Healthcare','Manufacturing','Legal','Procurement','Marketing','IT','Customer Support','General'].map(d => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>

          {/* Subdomain Filter */}
          <div className="flex items-center space-x-2">
            <label className="text-sm text-wm-blue/70 font-bold">Sub-domain</label>
            <select 
              value={subdomainFilter} 
              onChange={(e) => setSubdomainFilter(e.target.value)} 
              className="bg-white border border-wm-neutral/30 rounded-md p-2 text-wm-blue"
              disabled={availableSubdomains.length === 0}
            >
              <option value="All">All Sub-domains</option>
              {availableSubdomains.map(sd => (
                <option key={sd} value={sd}>{sd}</option>
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
            <div className="absolute inset-0 bg-gradient-to-r from-wm-yellow/10 via-wm-accent/10 to-wm-pink/10 rounded-3xl blur-2xl animate-pulse"></div>
            
            {/* Icon container */}
            <div className="relative w-32 h-32 bg-gradient-to-br from-white to-wm-neutral/20 backdrop-blur-xl rounded-3xl flex items-center justify-center mx-auto mb-8 border border-wm-neutral/30 shadow-sm">
              <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent rounded-3xl"></div>
              <div className="relative text-wm-blue/40">
                <svg className="w-16 h-16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                </svg>
              </div>
            </div>
            
            {/* Content */}
            <div className="relative">
              <h3 className="text-3xl font-bold text-wm-blue mb-4">
                {showStarredOnly ? 'No Starred Scenarios Yet' : 'No Scenarios Found'}
              </h3>
              <p className="text-lg text-wm-blue/60 mb-10 max-w-sm mx-auto leading-relaxed">
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
                  className="group relative px-10 py-4 bg-wm-accent text-white font-bold rounded-2xl hover:shadow-2xl hover:shadow-wm-accent/25 transition-all duration-300 hover:-translate-y-1 backdrop-blur-sm border border-wm-accent/20 hover:border-wm-accent/40"
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