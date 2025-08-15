import React, { useState, useEffect } from 'react';
import type firebase from 'firebase/compat/app';
import { getAllUserEvaluations } from '../services/firebaseService';
import type { AggregatedEvaluationResult } from '../types';
import { LoadingSpinner } from './OperatorConsole';
import { Icons } from '../constants';
import { useTranslation } from '../i18n';

interface DashboardViewProps {
  user: firebase.User;
  onStartTraining: () => void;
}

const RecentActivityItem: React.FC<{ item: AggregatedEvaluationResult }> = ({ item }) => (
    <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4 flex items-center justify-between gap-4">
        <div>
            <p className="font-semibold text-slate-200">{item.scenarioTitle}</p>
            <p className="text-sm text-slate-400">{new Date(item.timestamp).toLocaleDateString()}</p>
        </div>
        <div className="text-right">
            <p className="text-2xl font-bold text-sky-400">{item.score}<span className="text-base text-slate-500">/10</span></p>
        </div>
    </div>
);


const DashboardView: React.FC<DashboardViewProps> = ({ user, onStartTraining }) => {
  const { t } = useTranslation();
  const [history, setHistory] = useState<AggregatedEvaluationResult[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [averageScore, setAverageScore] = useState<number | null>(null);

  useEffect(() => {
    const fetchHistory = async () => {
      if (user && !user.isAnonymous) {
        setIsLoading(true);
        try {
          const allEvaluations = await getAllUserEvaluations(user.uid);
          setHistory(allEvaluations);
          // compute average score across all evaluations
          if (allEvaluations.length > 0) {
            const total = allEvaluations.reduce((acc, ev) => acc + (typeof ev.score === 'number' ? ev.score : 0), 0);
            setAverageScore(total / allEvaluations.length);
          } else {
            setAverageScore(null);
          }
        } catch (error) {
          console.error("Could not fetch recent activity:", error);
        } finally {
          setIsLoading(false);
        }
      } else {
        setIsLoading(false);
        setAverageScore(null);
      }
    };
    fetchHistory();
  }, [user]);
  
  const firstName = user.displayName?.split(' ')[0] || 'Operator';

  return (
    <div className="animate-fade-in-up">
      <h1 className="text-4xl sm:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-blue-500">
        {t('dashboard.welcome', { name: firstName })}
      </h1>
      <p className="mt-2 text-lg text-slate-400">
        {t('dashboard.trainingGround')}
      </p>

      <div className="mt-8 grid grid-cols-1 lg:grid-cols-5 gap-8">
        {/* Main Content: Challenges */}
        <div className="lg:col-span-3">
          <h2 className="text-2xl font-bold text-white mb-4">{t('dashboard.trainingGround')}</h2>
          <div 
              onClick={onStartTraining}
              className="group flex flex-col p-6 bg-slate-800/50 border border-slate-700 rounded-xl hover:bg-slate-800 hover:border-sky-500 transition-all duration-300 cursor-pointer transform hover:-translate-y-1 h-full"
          >
              <div className="flex-shrink-0 flex items-center justify-center w-12 h-12 bg-sky-500/10 rounded-lg mb-4 group-hover:bg-sky-500/20 transition-colors">
                  <Icons.LightBulb />
              </div>
              <div className="flex-grow">
                  <h3 className="text-2xl font-bold text-slate-100 mb-2">{t('dashboard.trainingGround')}</h3>
                  <p className="text-slate-400">
                      {t('dashboard.noScores')}
                  </p>
          <div className="mt-4">
            {averageScore !== null ? (
              <p className="text-sm text-sky-300">{t('sidebar.average')}: <span className="font-semibold text-white">{averageScore.toFixed(1)}/10</span></p>
            ) : (
              <p className="text-sm text-slate-400">{t('dashboard.noScores')}</p>
            )}
          </div>
              </div>
          </div>
        </div>

        {/* Sidebar: Recent Activity */}
        <div className="lg:col-span-2">
            <h2 className="text-2xl font-bold text-white mb-4">{t('dashboard.recentActivity')}</h2>
            <div className="bg-slate-800/20 border border-slate-800 rounded-xl p-4 min-h-[200px] flex flex-col">
                {isLoading ? (
                    <div className="m-auto"><LoadingSpinner /></div>
                ) : history.length > 0 ? (
                    <div className="space-y-3">
                        {history.slice(0, 3).map(item => <RecentActivityItem key={item.id} item={item} />)}
                    </div>
                ) : (
                    <div className="m-auto text-center">
                        <div className="flex items-center justify-center w-12 h-12 bg-slate-700/50 rounded-full mb-4 mx-auto">
                            <Icons.Beaker />
                        </div>
                        <p className="font-semibold text-slate-300">{t('dashboard.noActivity')}</p>
                        <p className="text-sm text-slate-400">{t('dashboard.noActivityInfo')}</p>
                    </div>
                )}
            </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardView;