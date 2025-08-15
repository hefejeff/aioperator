import React from 'react';
import { useTranslation } from '../i18n';
import type { LeaderboardEntry } from '../types';
import { LoadingSpinner } from './OperatorConsole';
import { Icons } from '../constants';

interface LeaderboardSidebarProps {
  leaderboard: LeaderboardEntry[];
  isLoading: boolean;
}

const LeaderboardItem: React.FC<{ entry: LeaderboardEntry; rank: number }> = ({ entry, rank }) => {
  const isFirst = rank === 1;

  return (
    <li className={`flex items-center justify-between p-3 rounded-lg ${isFirst ? 'bg-yellow-500/10' : ''}`}>
      <div className="flex items-center space-x-3">
        <span className={`w-6 text-center font-bold ${isFirst ? 'text-yellow-400' : 'text-slate-400'}`}>
          {rank}
        </span>
        <span className="font-medium text-slate-200 truncate">{entry.displayName}</span>
      </div>
      <div className="flex items-center space-x-2">
        {isFirst && <div className="text-yellow-400"><Icons.Trophy /></div>}
        <span className="font-bold text-sky-400">{entry.score}</span>
      </div>
    </li>
  );
};

const LeaderboardSidebar: React.FC<LeaderboardSidebarProps> = ({ leaderboard, isLoading }) => {
  const { t } = useTranslation();
  return (
    <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
      <h2 className="text-xl font-bold mb-4 text-white text-center">{t('leaderboard.title')}</h2>
      {isLoading ? (
        <div className="flex justify-center py-8">
          <LoadingSpinner />
        </div>
      ) : leaderboard.length > 0 ? (
        <ul className="space-y-2">
          {leaderboard.map((entry, index) => (
            <LeaderboardItem key={entry.uid} entry={entry} rank={index + 1} />
          ))}
        </ul>
      ) : (
    <div className="text-center py-8">
            <div className="flex items-center justify-center w-12 h-12 bg-slate-700/50 rounded-full mb-4 mx-auto">
                <Icons.Trophy />
            </div>
      <p className="font-semibold text-slate-300">{t('leaderboard.empty')}</p>
      <p className="text-sm text-slate-400">{t('leaderboard.empty')}</p>
        </div>
      )}
    </div>
  );
};

export default LeaderboardSidebar;
