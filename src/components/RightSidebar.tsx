import React, { useEffect, useState } from 'react';
import type firebase from 'firebase/compat/app';
import { getAllUserEvaluations, getGlobalLeaderboard, getSavedPrds, getSavedPitches } from '../services/firebaseService';
import { useTranslation } from '../i18n';
import type { AggregatedEvaluationResult, SavedPitch, SavedPrd } from '../types';
import LeaderboardSidebar from './LeaderboardSidebar';

interface RightSidebarProps {
  user: firebase.User | null;
}

const RightSidebar: React.FC<RightSidebarProps> = ({ user }) => {
  const [recent, setRecent] = useState<AggregatedEvaluationResult[]>([]);
  const [isLoadingRecent, setIsLoadingRecent] = useState(false);
  const [average, setAverage] = useState<number | null>(null);
  const [highScoreCount, setHighScoreCount] = useState<number>(0);
  const [globalTop, setGlobalTop] = useState<import('../types').LeaderboardEntry[]>([]);
  const [isLoadingGlobal, setIsLoadingGlobal] = useState(false);
  // Library state
  const [prds, setPrds] = useState<SavedPrd[]>([]);
  const [pitches, setPitches] = useState<SavedPitch[]>([]);
  const [isLibraryLoading, setIsLibraryLoading] = useState(false);
  const [libraryModal, setLibraryModal] = useState<{ type: 'PRD' | 'PITCH'; item: SavedPrd | SavedPitch } | null>(null);

  useEffect(() => {
  if (!user) return;
    let mounted = true;
  const fetch = async () => {
      setIsLoadingRecent(true);
      try {
        const all = await getAllUserEvaluations(user.uid);
        if (!mounted) return;
        setRecent(all.slice(0, 5));
        if (all.length > 0) {
          const total = all.reduce((acc, v) => acc + (v.score || 0), 0);
          setAverage(total / all.length);
          setHighScoreCount(all.filter(a => a.score >= 9).length);
        } else {
          setAverage(null);
          setHighScoreCount(0);
        }
      } catch (err) {
        console.error('Failed to fetch recent activity for sidebar', err);
      } finally {
        if (mounted) setIsLoadingRecent(false);
      }
    };
  fetch();
    
    // Also fetch global leaderboard
    const fetchGlobal = async () => {
      setIsLoadingGlobal(true);
      try {
        const top = await getGlobalLeaderboard(5);
        if (!mounted) return;
        setGlobalTop(top);
      } catch (e) {
        console.error('Failed to fetch global leaderboard', e);
      } finally {
        if (mounted) setIsLoadingGlobal(false);
      }
    };

    fetchGlobal();

    // Fetch user's saved library (PRDs and Pitches)
    const fetchLibrary = async () => {
      if (!user) return;
      setIsLibraryLoading(true);
      try {
        const [p1, p2] = await Promise.all([
          getSavedPrds(user.uid),
          getSavedPitches(user.uid),
        ]);
        if (!mounted) return;
        setPrds(p1);
        setPitches(p2);
      } catch (e) {
        console.error('Failed to load your library', e);
      } finally {
        if (mounted) setIsLibraryLoading(false);
      }
    };

    fetchLibrary();

    // Listen for updates so the sidebar stays fresh when new scores are saved elsewhere in the app
    const onUpdate = () => { fetchGlobal(); };
    window.addEventListener('leaderboard-updated', onUpdate as EventListener);
  return () => {
      mounted = false;
      window.removeEventListener('leaderboard-updated', onUpdate as EventListener);
    };
  }, [user]);
  const { t } = useTranslation();

  return (
  // Temporarily force the sidebar visible for debugging (was hidden md:block ...)
  <aside className="block w-full md:w-72 lg:w-80 xl:w-96 space-y-6">
      <div className="sticky top-20 space-y-4">
        <LeaderboardSidebar leaderboard={globalTop} isLoading={isLoadingGlobal} />

        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-white mb-2">{t('sidebar.yourStats')}</h3>
          <p className="text-sm text-slate-300">{t('sidebar.average')}: <span className="font-bold text-sky-400">{average !== null ? average.toFixed(1) : ''}</span></p>
          <p className="text-sm text-slate-300">{t('sidebar.topScores')}: <span className="font-bold text-white">{highScoreCount}</span></p>
          <p className="text-sm text-slate-400 mt-3">{t('sidebar.recentActivity')}</p>
          {isLoadingRecent ? (
            <p className="text-sm text-slate-400">{t('loading')}</p>
          ) : recent.length > 0 ? (
            <ul className="mt-2 space-y-2">
              {recent.map(r => (
                <li key={r.id} className="text-sm text-slate-300">{r.scenarioTitle} — <span className="text-sky-400 font-semibold">{r.score}/10</span></li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-slate-400">{t('noRecentActivity')}</p>
          )}
        </div>

        {/* Library section */}
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-white mb-2">Your Library</h3>
          {isLibraryLoading ? (
            <p className="text-sm text-slate-400">Loading…</p>
          ) : (
            <div className="space-y-4">
              <div>
                <p className="text-sm text-slate-400 mb-2">Saved PRDs</p>
                {prds.length ? (
                  <ul className="space-y-1">
                    {prds.slice(0,5).map(p => (
                      <li key={p.id} className="text-sm text-slate-300 flex items-center justify-between">
                        <span className="truncate mr-2">{p.scenarioTitle || p.scenarioId}</span>
                        <button className="text-sky-400 hover:text-sky-300 text-xs" onClick={() => setLibraryModal({ type: 'PRD', item: p })}>View</button>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-slate-500">No PRDs saved yet.</p>
                )}
              </div>
              <div>
                <p className="text-sm text-slate-400 mb-2">Saved Elevator Pitches</p>
                {pitches.length ? (
                  <ul className="space-y-1">
                    {pitches.slice(0,5).map(p => (
                      <li key={p.id} className="text-sm text-slate-300 flex items-center justify-between">
                        <span className="truncate mr-2">{p.scenarioTitle || p.scenarioId}</span>
                        <button className="text-sky-400 hover:text-sky-300 text-xs" onClick={() => setLibraryModal({ type: 'PITCH', item: p })}>View</button>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-slate-500">No Pitches saved yet.</p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
      {/* Library modal */}
      {libraryModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" onClick={() => setLibraryModal(null)}>
          <div className="bg-slate-900 border border-slate-700 rounded-xl max-w-3xl w-full p-4 md:p-6 max-h-[85vh] overflow-y-auto" onClick={(e)=>e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-white font-semibold">{libraryModal.type === 'PRD' ? 'PRD' : 'Elevator Pitch'} Preview</h3>
              <button onClick={() => setLibraryModal(null)} className="p-2 rounded-md text-slate-300 hover:text-white hover:bg-slate-700/50" aria-label="Close">×</button>
            </div>
            <div className="bg-slate-800/60 border border-slate-700 rounded-lg p-3 max-h-[60vh] overflow-auto">
              <pre className="whitespace-pre-wrap text-slate-200 text-sm">{(libraryModal.item as any).markdown}</pre>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
};

export default RightSidebar;
