

import React, { useState, useCallback, useEffect } from 'react';
import type { User } from 'firebase/auth';
import { auth } from './firebaseConfig';
import type { Scenario } from './types';
import { getScenarios, seedScenarios, updateUserProfile, getAllUserEvaluations } from './services/firebaseService';
import Header from './components/Header';
import DashboardView from './components/DashboardView';
import TrainingView from './components/TrainingView';
import OperatorConsole from './components/OperatorConsole';
import LoginView from './components/LoginView';
import LoadingScreen from './components/LoadingScreen';
import HistoryView from './components/HistoryView';
import { ALL_SCENARIOS } from './constants';

type View = 'DASHBOARD' | 'TRAINING' | 'SCENARIO' | 'EVALUATION' | 'HISTORY';

const App: React.FC = () => {
  const [view, setView] = useState<View>('DASHBOARD');
  const [activeScenario, setActiveScenario] = useState<Scenario | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);

  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [highScores, setHighScores] = useState<Record<string, number>>({});
  const [isLoadingScenarios, setIsLoadingScenarios] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (currentUser) => {
      setUser(currentUser);
      setIsLoadingAuth(false);
      
      if (currentUser) {
        setView('DASHBOARD'); // Default to dashboard on login
        // Store/update user profile info in the database
        await updateUserProfile(currentUser);

        // Load scenarios and evaluations after user is confirmed
        try {
          setIsLoadingScenarios(true);
          setError(null);
          setHighScores({});
          // Pass UID to get default and user-specific scenarios
          let fetchedScenarios = await getScenarios(currentUser.uid);

          if (fetchedScenarios.length === 0) {
            console.log("No scenarios found in DB, attempting to seed.");
            await seedScenarios();
            fetchedScenarios = await getScenarios(currentUser.uid);
            if (fetchedScenarios.length === 0) {
              throw new Error("Seeding failed or database is still empty. This is likely due to Firebase Realtime Database security rules not allowing writes to the '/scenarios' path.");
            }
          }
          setScenarios(fetchedScenarios);
          
          // Fetch all evaluations to calculate high scores
          const evaluations = await getAllUserEvaluations(currentUser.uid);
          const scores: Record<string, number> = {};
          evaluations.forEach(ev => {
              if (!scores[ev.scenarioId] || ev.score > scores[ev.scenarioId]) {
                  scores[ev.scenarioId] = ev.score;
              }
          });
          setHighScores(scores);

        } catch (err) {
          const errorMessage = err instanceof Error ? err.message : "An unknown error occurred.";
          console.warn(`--- OFFLINE MODE ACTIVATED ---\nFailed to load scenarios from Firebase: ${errorMessage}\nFalling back to local data. Progress will not be saved.`);
          setError('Could not connect to Firebase. The app is running in offline mode and your progress will not be saved.');
          setScenarios(ALL_SCENARIOS);
        } finally {
          setIsLoadingScenarios(false);
        }
      } else {
        // If no user, reset scenarios and loading state
        setScenarios([]);
        setHighScores({});
        setIsLoadingScenarios(false);
        setError(null);
      }
    });
    
    return () => unsubscribe();
  }, []);


  const handleNavigate = useCallback((newView: 'DASHBOARD' | 'TRAINING' | 'HISTORY') => {
    setActiveScenario(null);
    setView(newView);
  }, []);

  const handleStartTraining = useCallback(() => {
    setView('TRAINING');
  }, []);
  
  const evaluationScenario = scenarios.find(s => s.type === 'EVALUATION');

  const handleStartEvaluation = useCallback(() => {
    if (evaluationScenario) {
        setActiveScenario(evaluationScenario);
        setView('EVALUATION');
    }
  }, [evaluationScenario]);

  const handleSelectScenario = useCallback((scenario: Scenario) => {
    setActiveScenario(scenario);
    setView('SCENARIO');
  }, []);

  const handleBack = useCallback(() => {
    setActiveScenario(null);
    if (view === 'SCENARIO' || view === 'EVALUATION') {
        setView(view === 'SCENARIO' ? 'TRAINING' : 'DASHBOARD');
    } else {
        setView('DASHBOARD');
    }
  }, [view]);

  const handleScenarioCreated = (newScenario: Scenario) => {
    setScenarios(prevScenarios => [...prevScenarios, newScenario]);
    setView('TRAINING'); // Ensure user stays on the training view
  };
  
  const handleEvaluationCompleted = useCallback((scenarioId: string, newScore: number) => {
    setHighScores(prevScores => {
        const currentBest = prevScores[scenarioId];
        if (currentBest === undefined || newScore > currentBest) {
            return {
                ...prevScores,
                [scenarioId]: newScore,
            };
        }
        return prevScores;
    });
  }, []);

  const trainingScenarios = scenarios.filter(s => s.type === 'TRAINING');

  const renderAppContent = () => {
    if (isLoadingScenarios && user) {
        return <LoadingScreen />;
    }

    switch (view) {
      case 'TRAINING':
        return <TrainingView 
                  scenarios={trainingScenarios} 
                  onSelectScenario={handleSelectScenario}
                  user={user!}
                  onScenarioCreated={handleScenarioCreated}
                  highScores={highScores}
                />;
      case 'SCENARIO':
        if (activeScenario && user) {
          return <OperatorConsole 
                    scenario={activeScenario} 
                    onBack={handleBack} 
                    isEvaluation={false} 
                    user={user} 
                    onEvaluationCompleted={handleEvaluationCompleted}
                 />;
        }
        return null;
      case 'EVALUATION':
        if (activeScenario && user) {
          return <OperatorConsole 
                    scenario={activeScenario} 
                    onBack={handleBack} 
                    isEvaluation={true} 
                    user={user} 
                    onEvaluationCompleted={handleEvaluationCompleted}
                  />;
        }
        return null;
      case 'HISTORY':
        if (user) {
            return <HistoryView user={user} />;
        }
        return null;
      case 'DASHBOARD':
      default:
        return <DashboardView 
                    user={user!}
                    onStartTraining={handleStartTraining} 
                    onStartEvaluation={handleStartEvaluation} 
                    isEvaluationAvailable={!!evaluationScenario} 
               />;
    }
  };

  if (isLoadingAuth) {
    return <LoadingScreen />;
  }

  return (
    <div className="min-h-screen bg-slate-900 font-sans">
      <Header onNavigate={handleNavigate} user={user} />
        {error && (
            <div className="bg-yellow-900/30 border-l-4 border-yellow-500 text-yellow-300 p-4 mx-4 my-6 sm:mx-6 md:mx-8 rounded-r-lg shadow-lg animate-fade-in" role="alert">
                <div className="flex">
                    <div className="py-1">
                        <svg className="fill-current h-6 w-6 text-yellow-500 mr-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M2.93 17.07A10 10 0 1 1 17.07 2.93 10 10 0 0 1 2.93 17.07zM9 5v6h2V5H9zm0 8v2h2v-2H9z"/></svg>
                    </div>
                    <div>
                        <p className="font-bold">Offline Mode Activated</p>
                        <p className="text-sm">{error}</p>
                    </div>
                </div>
            </div>
      )}
      <main className={`p-4 sm:p-6 md:p-8 ${error ? 'pt-0' : ''}`}>
        {user ? renderAppContent() : <LoginView />}
      </main>
    </div>
  );
};

export default App;