import React, { useEffect, useState } from 'react';
import type firebase from 'firebase/compat/app';
import { getAllUserEvaluations, getGlobalLeaderboard } from '../services/firebaseService';
import { useTranslation } from '../i18n';
import type { AggregatedEvaluationResult } from '../types';
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

    // Listen for updates so the sidebar stays fresh when new scores are saved elsewhere in the app
    const onUpdate = () => { fetchGlobal(); };
    window.addEventListener('leaderboard-updated', onUpdate as EventListener);
  return () => { mounted = false; };
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
      </div>
    </aside>
  );
};

export default RightSidebar;
