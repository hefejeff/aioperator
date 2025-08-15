import React, { useState, useEffect } from 'react';
import type firebase from 'firebase/compat/app';
import { getAllUserEvaluations } from '../services/firebaseService';
import type { AggregatedEvaluationResult } from '../types';
import { LoadingSpinner } from './OperatorConsole';
import { Icons } from '../constants';
import { useTranslation } from '../i18n';

// Group evaluations by scenario title for display
const groupEvaluations = (evaluations: AggregatedEvaluationResult[]) => {
  return evaluations.reduce((acc, current) => {
    (acc[current.scenarioTitle] = acc[current.scenarioTitle] || []).push(current);
    return acc;
  }, {} as Record<string, AggregatedEvaluationResult[]>);
};

const HistoryView: React.FC<{ user: firebase.User }> = ({ user }) => {
  const [history, setHistory] = useState<Record<string, AggregatedEvaluationResult[]>>({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchHistory = async () => {
      setIsLoading(true);
      try {
        const allEvaluations = await getAllUserEvaluations(user.uid);
        setHistory(groupEvaluations(allEvaluations));
      } catch (error) {
        console.error("Could not fetch evaluation history:", error);
        // Silently fail in case of network error, the component will show the "No History" message.
      } finally {
        setIsLoading(false);
      }
    };
    if (user && !user.isAnonymous) {
        fetchHistory();
    } else {
        setIsLoading(false);
    }
  }, [user]);
  
  const hasHistory = Object.keys(history).length > 0;

  const { t } = useTranslation();

  return (
    <div className="max-w-4xl mx-auto animate-fade-in">
      <h1 className="text-3xl font-bold text-center mb-8">{t('history.title')}</h1>
      {isLoading ? (
        <div className="flex justify-center p-8"><LoadingSpinner /></div>
      ) : !hasHistory ? (
        <div className="text-center bg-slate-800/50 p-8 rounded-xl border border-slate-700">
            <div className="flex items-center justify-center w-16 h-16 bg-sky-500/10 rounded-full mb-4 mx-auto">
                <Icons.ClipboardCheck />
            </div>
            <h2 className="mt-4 text-xl font-bold">{t('history.noHistory')}</h2>
            <p className="text-slate-400 mt-2">{t('history.noEntries')}</p>
        </div>
      ) : (
        <div className="space-y-8">
          {Object.entries(history).map(([scenarioTitle, evaluations]) => (
            <div key={scenarioTitle}>
              <h2 className="text-2xl font-bold text-sky-400 mb-4">{scenarioTitle}</h2>
              <div className="space-y-4">
                {evaluations.map(item => (
                  <div key={item.id} className="bg-slate-800 border border-slate-700 rounded-xl p-6 hover:border-sky-500 transition-colors">
                    <div className="flex justify-between items-start gap-4">
                        <div className="flex-grow">
                            <p className="text-sm text-slate-400">{new Date(item.timestamp).toLocaleString()}</p>
                            <p className="font-semibold text-white mt-3">{t('history.feedback')}</p>
                            <p className="text-slate-300 mt-1 whitespace-pre-wrap text-sm">{item.feedback}</p>
                            {item.workflowExplanation && (
                                <>
                                    <p className="font-semibold text-white mt-3">{t('history.workflowExplanation')}</p>
                                    <p className="text-slate-300/80 mt-1 whitespace-pre-wrap text-sm italic bg-slate-900/50 p-3 rounded-md">"{item.workflowExplanation}"</p>
                                </>
                            )}
                        </div>
                        <div className="text-right ml-4 flex-shrink-0 w-24">
                            <p className="text-slate-400 text-sm">{t('history.score')}</p>
                            <p className="text-5xl font-bold text-sky-400">{item.score}<span className="text-2xl text-slate-500">/10</span></p>
                        </div>
                    </div>
                    {item.imageUrl && (
                        <details className="mt-4">
                            <summary className="cursor-pointer text-sm text-sky-400 hover:underline">{t('history.viewDiagram')}</summary>
                            <img src={item.imageUrl} alt="Submitted workflow diagram" className="mt-2 max-h-60 rounded-lg border border-slate-600" />
                        </details>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
export default HistoryView;
