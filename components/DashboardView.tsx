import React, { useState, useEffect } from 'react';
import type firebase from 'firebase/compat/app';
import { getAllUserEvaluations } from '../services/firebaseService';
import type { AggregatedEvaluationResult } from '../types';
import { LoadingSpinner } from './OperatorConsole';
import { Icons } from '../constants';

interface DashboardViewProps {
  user: firebase.User;
  onStartTraining: () => void;
  onStartEvaluation: () => void;
  isEvaluationAvailable: boolean;
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


const DashboardView: React.FC<DashboardViewProps> = ({ user, onStartTraining, onStartEvaluation, isEvaluationAvailable }) => {
  const [history, setHistory] = useState<AggregatedEvaluationResult[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchHistory = async () => {
      if (user && !user.isAnonymous) {
        setIsLoading(true);
        try {
            const allEvaluations = await getAllUserEvaluations(user.uid);
            setHistory(allEvaluations);
        } catch (error) {
            console.error("Could not fetch recent activity:", error);
            // Silently fail in case of network error, the component will show the "No activity" message.
        } finally {
            setIsLoading(false);
        }
      } else {
        setIsLoading(false);
      }
    };
    fetchHistory();
  }, [user]);
  
  const firstName = user.displayName?.split(' ')[0] || 'Operator';

  return (
    <div className="animate-fade-in-up">
      <h1 className="text-4xl sm:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-blue-500">
        Welcome Back, {firstName}!
      </h1>
      <p className="mt-2 text-lg text-slate-400">
        Here's a summary of your journey. Ready for the next challenge?
      </p>

      <div className="mt-8 grid grid-cols-1 lg:grid-cols-5 gap-8">
        {/* Main Content: Challenges */}
        <div className="lg:col-span-3">
          <h2 className="text-2xl font-bold text-white mb-4">Start a New Challenge</h2>
          <div className="flex flex-col sm:flex-row items-stretch justify-center gap-6">
             <div 
                onClick={onStartTraining}
                className="group flex-1 flex flex-col p-6 bg-slate-800/50 border border-slate-700 rounded-xl hover:bg-slate-800 hover:border-sky-500 transition-all duration-300 cursor-pointer transform hover:-translate-y-1"
            >
                <div className="flex-shrink-0 flex items-center justify-center w-12 h-12 bg-sky-500/10 rounded-lg mb-4 group-hover:bg-sky-500/20 transition-colors">
                    <Icons.LightBulb />
                </div>
                <div className="flex-grow">
                    <h3 className="text-2xl font-bold text-slate-100 mb-2">Training Ground</h3>
                    <p className="text-slate-400">
                        Practice with a variety of scenarios to learn the art of effective prompting.
                    </p>
                </div>
            </div>
            <div 
                onClick={isEvaluationAvailable ? onStartEvaluation : undefined}
                className={`group flex-1 flex flex-col p-6 bg-slate-800/50 border border-slate-700 rounded-xl transition-all duration-300 ${isEvaluationAvailable ? 'hover:bg-slate-800 hover:border-sky-500 cursor-pointer transform hover:-translate-y-1' : 'opacity-50 cursor-not-allowed'}`}
            >
                <div className="flex-shrink-0 flex items-center justify-center w-12 h-12 bg-sky-500/10 rounded-lg mb-4 group-hover:bg-sky-500/20 transition-colors">
                    <Icons.ClipboardCheck />
                </div>
                <div className="flex-grow">
                    <h3 className="text-2xl font-bold text-slate-100 mb-2">Performance Evaluation</h3>
                    <p className="text-slate-400">
                        Test your skills with a challenging task and receive AI-powered feedback.
                    </p>
                </div>
            </div>
          </div>
        </div>

        {/* Sidebar: Recent Activity */}
        <div className="lg:col-span-2">
            <h2 className="text-2xl font-bold text-white mb-4">Recent Activity</h2>
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
                        <p className="font-semibold text-slate-300">No activity yet</p>
                        <p className="text-sm text-slate-400">Complete a scenario to see your results here.</p>
                    </div>
                )}
            </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardView;