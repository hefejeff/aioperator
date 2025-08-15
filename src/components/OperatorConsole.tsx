import React, { useState, useCallback, useRef, useEffect } from 'react';
import type firebase from 'firebase/compat/app';
import type { Scenario, EvaluationResult, StoredEvaluationResult, LeaderboardEntry } from '../types';
import { evaluateOperatorPerformance } from '../services/geminiService';
import { saveEvaluation, getEvaluations, getLeaderboardForScenario } from '../services/firebaseService';
import { Icons } from '../constants';
import LeaderboardSidebar from './LeaderboardSidebar';
import { useTranslation } from '../i18n';

interface OperatorConsoleProps {
  scenario: Scenario;
  onBack: () => void;
  user: firebase.User;
  onEvaluationCompleted: (scenarioId: string, newScore: number) => void;
}

export const LoadingSpinner: React.FC = () => (
    <div className="flex items-center justify-center space-x-2">
        <div className="w-2 h-2 rounded-full bg-sky-400 animate-pulse [animation-delay:-0.3s]"></div>
        <div className="w-2 h-2 rounded-full bg-sky-400 animate-pulse [animation-delay:-0.15s]"></div>
        <div className="w-2 h-2 rounded-full bg-sky-400 animate-pulse"></div>
    </div>
);

const OperatorConsole: React.FC<OperatorConsoleProps> = ({ scenario, onBack, user, onEvaluationCompleted }) => {
  const [workflowExplanation, setWorkflowExplanation] = useState('');
  const [evaluation, setEvaluation] = useState<EvaluationResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [image, setImage] = useState<{ base64: string; mimeType: string; dataUrl: string } | null>(null);
  const [pastEvaluations, setPastEvaluations] = useState<StoredEvaluationResult[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [isLoadingLeaderboard, setIsLoadingLeaderboard] = useState(true);

  const fetchLeaderboard = useCallback(async () => {
      setIsLoadingLeaderboard(true);
      try {
          const data = await getLeaderboardForScenario(scenario.id);
          setLeaderboard(data);
      } catch (e) {
          console.error("Failed to fetch leaderboard", e);
      } finally {
          setIsLoadingLeaderboard(false);
      }
  }, [scenario.id]);

  useEffect(() => {
    fetchLeaderboard();
  }, [fetchLeaderboard]);

  useEffect(() => {
    const fetchHistory = async () => {
      if(user.isAnonymous) {
        setIsLoadingHistory(false);
        return;
      }
      setIsLoadingHistory(true);
      try {
        const history = await getEvaluations(user.uid, scenario.id);
        setPastEvaluations(history);
      } catch (error)
        {
        console.error("Could not fetch scenario history:", error);
      } finally {
        setIsLoadingHistory(false);
      }
    };
    fetchHistory();
  }, [user.uid, user.isAnonymous, scenario.id]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please upload a valid image file (PNG, JPG, etc.).');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      const mimeType = dataUrl.substring(dataUrl.indexOf(':') + 1, dataUrl.indexOf(';'));
      const base64 = dataUrl.split(',')[1];
      setImage({ base64, mimeType, dataUrl });
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveImage = () => {
    setImage(null);
    if (fileInputRef.current) {
        fileInputRef.current.value = "";
    }
  };

  const handleSubmitForEvaluation = useCallback(async () => {
    if (!workflowExplanation || isLoading) return;
    setIsLoading(true);
    setEvaluation(null);
    const imagePart = image ? { base64: image.base64, mimeType: image.mimeType } : null;
    const result = await evaluateOperatorPerformance(scenario.goal, workflowExplanation, imagePart);
    setEvaluation(result);
    setIsLoading(false);

    if (result.score > 0 && !user.isAnonymous) {
      const imageUrl = image ? image.dataUrl : null;
      try {
        await saveEvaluation(user.uid, scenario.id, result, workflowExplanation, imageUrl, user.displayName);
        onEvaluationCompleted(scenario.id, result.score);
        fetchLeaderboard(); // Refetch leaderboard after submitting a new score

        const newEntry: StoredEvaluationResult = {
          ...result,
          id: `new-${Date.now()}`,
          timestamp: Date.now(),
          workflowExplanation,
          imageUrl,
          userId: user.uid,
          scenarioId: scenario.id,
        };
        setPastEvaluations(prev => [newEntry, ...prev]);
      } catch (error) {
        console.error("Failed to save evaluation:", error);
        alert("Could not save your evaluation. Please check your connection and try again.");
      }
    }

  }, [workflowExplanation, isLoading, image, scenario.goal, user.uid, user.displayName, user.isAnonymous, scenario.id, onEvaluationCompleted, fetchLeaderboard]);

  const { t } = useTranslation();
  const { lang } = useTranslation();
  const localizedTitle = lang === 'Spanish' && scenario.title_es ? scenario.title_es : scenario.title;
  const localizedDescription = lang === 'Spanish' && scenario.description_es ? scenario.description_es : scenario.description;
  const localizedGoal = lang === 'Spanish' && scenario.goal_es ? scenario.goal_es : scenario.goal;

  return (
    <div className="flex flex-col lg:flex-row gap-8 max-w-7xl mx-auto animate-fade-in">
        {/* Main Console */}
        <div className="w-full lg:flex-1 min-w-0">
          <button onClick={onBack} className="flex items-center space-x-2 text-sm text-sky-400 hover:text-sky-300 mb-6 transition-colors">
            <Icons.ChevronLeft />
            <span>{t('operator.back')}</span>
          </button>

          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6 mb-6">
            <h1 className="text-2xl font-bold text-white mb-2">{localizedTitle}</h1>
            <p className="text-slate-400 mb-4">{localizedDescription}</p>
            <div className="bg-slate-900 border border-slate-600 rounded-lg p-4">
              <h2 className="font-semibold text-sky-400 mb-1">{lang === 'Spanish' ? 'Tu Objetivo:' : 'Your Goal:'}</h2>
              <p className="text-slate-300">{localizedGoal}</p>
            </div>
          </div>
          
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
            <h2 className="text-xl font-bold mb-4 text-white">{t('operator.design')}</h2>

            <div className="flex flex-col mb-6">
                <label htmlFor="workflow" className="text-lg font-semibold mb-2">1. {t('operator.explain')}</label>
                <p className="text-sm text-slate-400 mb-3">Describe the steps in your process. Specify which tasks are handled by AI and which require human intervention.</p>
                <textarea
                  id="workflow"
                  value={workflowExplanation}
                  onChange={(e) => setWorkflowExplanation(e.target.value)}
                  placeholder={"e.g., Step 1 (AI): Ingest customer email and categorize intent. Step 2 (Human): Review high-priority tickets..."}
                  className="flex-grow bg-slate-900 border border-slate-600 rounded-lg p-4 text-slate-200 focus:ring-2 focus:ring-sky-500 focus:outline-none transition-shadow w-full"
                  rows={10}
                />
            </div>

            <div className="mb-6">
              <label className="text-lg font-semibold mb-2 block">2. {t('operator.visual')}</label>
              <div className="bg-slate-800 border-2 border-dashed border-slate-600 rounded-xl p-6 text-center transition-colors hover:border-sky-500">
                  <input 
                    type="file" 
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept="image/*"
                    className="hidden"
                    aria-hidden="true"
                  />
                  {!image ? (
                    <div className="cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                        <Icons.Upload />
            <p className="mt-2 text-sm text-slate-400">{t('operator.uploadHint')}</p>
                        <span
                            className="mt-4 inline-block bg-slate-700 text-white font-bold py-2 px-4 rounded-lg hover:bg-slate-600 transition-colors"
                        >
              {t('operator.selectImage')}
                        </span>
                    </div>
                  ) : (
                    <div>
                        <div className="relative inline-block">
                            <img src={image.dataUrl} alt="Workflow preview" className="max-h-60 rounded-lg mx-auto shadow-lg" />
                            <button 
                                onClick={handleRemoveImage}
                                className="absolute -top-2 -right-2 bg-red-600 text-white rounded-full p-1 leading-none hover:bg-red-500 transition-colors"
                                aria-label="Remove image"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                    </div>
                  )}
              </div>
            </div>
              
            <button
              onClick={handleSubmitForEvaluation}
              disabled={isLoading || !workflowExplanation}
              className="w-full flex items-center justify-center bg-sky-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-sky-500 transition-colors disabled:bg-slate-700 disabled:cursor-not-allowed"
            >
              {isLoading ? <LoadingSpinner /> : t('operator.evaluate')}
            </button>
          </div>

          {evaluation && (
            <div className="mt-8 bg-slate-800 border border-slate-700 rounded-xl p-6 animate-fade-in-up">
              <h2 className="text-xl font-bold mb-4 text-center">{t('operator.feedback')}</h2>
              <div className="text-center mb-4">
                <p className="text-slate-400">Your Score</p>
                <p className="text-6xl font-extrabold text-sky-400">{evaluation.score}<span className="text-3xl font-medium text-slate-500">/10</span></p>
              </div>
              <div>
                <h3 className="font-semibold text-sky-400 mb-1">{t('operator.aiFeedback')}</h3>
                <p className="text-slate-300 whitespace-pre-wrap">{evaluation.feedback}</p>
              </div>
            </div>
          )}
          
          <div className="mt-8">
              <h2 className="text-xl font-bold mb-4 text-center">{t('operator.historyTitle')}</h2>
        {isLoadingHistory ? (
          <div className="text-center p-4"><LoadingSpinner /></div>
        ) : pastEvaluations.length > 0 ? (
                  <div className="space-y-4">
                      {pastEvaluations.map(item => (
                          <div key={item.id} className="bg-slate-800 border border-slate-700 rounded-xl p-4 animate-fade-in-up">
                              <div className="flex justify-between items-start">
                                  <div>
                                      <p className="text-sm text-slate-400">{new Date(item.timestamp).toLocaleString()}</p>
                    <p className="text-slate-300 mt-2 whitespace-pre-wrap text-sm">{item.feedback.substring(0, 150)}...</p>
                                  </div>
                                  <div className="text-right ml-4 flex-shrink-0">
                    <p className="text-slate-400 text-sm">{t('history.score')}</p>
                                      <p className="text-3xl font-bold text-sky-400">{item.score}<span className="text-lg text-slate-500">/10</span></p>
                                  </div>
                              </div>
                          </div>
                      ))}
                  </div>
              ) : (
          <p className="text-center text-slate-400 p-4">{t('operator.noHistoryScenario')}</p>
              )}
          </div>
      </div>

      {/* Right Sidebar */}
      <aside className="w-full lg:w-96 flex-shrink-0">
          <div className="lg:sticky lg:top-24 h-fit">
              <LeaderboardSidebar 
                leaderboard={leaderboard} 
                isLoading={isLoadingLeaderboard} 
              />
          </div>
      </aside>
    </div>
  );
};

export default OperatorConsole;