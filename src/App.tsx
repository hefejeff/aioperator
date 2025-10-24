

import React, { useCallback, useEffect, useState } from 'react';
import { User } from 'firebase/auth';
import { getWorkflowVersion, saveUserScenario } from './services/firebaseService';
import { getCompany, updateCompanySelectedScenarios } from './services/companyService';
import CreateScenarioForm from './components/CreateScenarioForm';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from './services/firebaseInit';
import type { Scenario } from './types';
import { getScenarios, seedScenarios, updateUserProfile, getAllUserEvaluations, getUserProfile } from './services/firebaseService';
import Header from './components/Header';
import DashboardView from './components/DashboardView';
import TrainingView from './components/TrainingView';
import OperatorConsole from './components/OperatorConsole';
import RightSidebar from './components/RightSidebar';
// import LoginView from './components/LoginView';
import PublicLanding from './components/PublicLanding';
import LoadingScreen from './components/LoadingScreen';
import AdminDashboard from './components/AdminDashboard';
import WorkflowDetailView from './components/WorkflowDetailView';
import CompanyResearch from './components/CompanyResearch';
import { ALL_SCENARIOS } from './constants';
import { I18nProvider } from './i18n';

type View = 'DASHBOARD' | 'TRAINING' | 'SCENARIO' | 'ADMIN' | 'WORKFLOW_DETAIL' | 'RESEARCH';

type ScenarioCreationContext = {
  source: 'RESEARCH' | 'DEFAULT';
  companyId?: string;
  companyName?: string;
};

const App: React.FC = () => {
  const [view, setView] = useState<View>('TRAINING');
  const [previousView, setPreviousView] = useState<View>('TRAINING');
  const [activeScenario, setActiveScenario] = useState<Scenario | null>(null);
  const [activeWorkflowId, setActiveWorkflowId] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [isWorkflowDrawerOpen, setIsWorkflowDrawerOpen] = useState(false);

  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [highScores, setHighScores] = useState<Record<string, number>>({});
  const [averageScores, setAverageScores] = useState<Record<string, number>>({});
  const [isLoadingScenarios, setIsLoadingScenarios] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [initialLang, setInitialLang] = useState<'English' | 'Spanish'>(() => {
    // First try to get from localStorage
    const savedLang = localStorage.getItem('preferredLanguage');
    if (savedLang === 'English' || savedLang === 'Spanish') {
      return savedLang;
    }
    // Fall back to browser language
    const browserLang = navigator.language.startsWith('es') ? 'Spanish' : 'English';
    return browserLang;
  });
  const [role, setRole] = useState<'SUPER_ADMIN' | 'ADMIN' | 'PRO_USER' | 'USER' | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      setIsLoadingAuth(false);
      
      if (currentUser) {
        try {
          const profile = await getUserProfile(currentUser.uid);
          if (profile && profile.preferredLanguage) {
            setInitialLang(profile.preferredLanguage as 'English' | 'Spanish');
            // Also update localStorage
            localStorage.setItem('preferredLanguage', profile.preferredLanguage);
          }
          if (profile && profile.role) setRole(profile.role);
        } catch (e) {
          // ignore
        }
        setView('DASHBOARD'); // Default to dashboard on login
        // Store/update user profile info in the database
        await updateUserProfile(currentUser);

        // Load scenarios and evaluations after user is confirmed
        try {
          setIsLoadingScenarios(true);
          setError(null);
          setHighScores({});
          setAverageScores({});
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
          
          // Fetch all evaluations to calculate high scores and average scores
          const evaluations = await getAllUserEvaluations(currentUser.uid);
          const scores: Record<string, number> = {};
          const scoreAggregates: Record<string, { total: number; count: number }> = {};

          evaluations.forEach(ev => {
              // High score calculation
              if (!scores[ev.scenarioId] || ev.score > scores[ev.scenarioId]) {
                  scores[ev.scenarioId] = ev.score;
              }
              // Average score aggregation
              if (!scoreAggregates[ev.scenarioId]) {
                  scoreAggregates[ev.scenarioId] = { total: 0, count: 0 };
              }
              scoreAggregates[ev.scenarioId].total += ev.score;
              scoreAggregates[ev.scenarioId].count += 1;
          });
          setHighScores(scores);
          
          const averages: Record<string, number> = {};
          for (const scenarioId in scoreAggregates) {
              averages[scenarioId] = scoreAggregates[scenarioId].total / scoreAggregates[scenarioId].count;
          }
          setAverageScores(averages);

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
        setAverageScores({});
        setIsLoadingScenarios(false);
        setError(null);
      }
    });
    
    return () => unsubscribe();
  }, []);


  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null);

  const handleNavigate = useCallback((newView: 'DASHBOARD' | 'TRAINING' | 'ADMIN' | 'RESEARCH', companyId?: string) => {
    setPreviousView(view);
    setActiveScenario(null);
    if (newView === 'RESEARCH' && companyId) {
      setSelectedCompanyId(companyId);
    } else {
      setSelectedCompanyId(null);
    }
    setView(newView);
  }, [view]);

  const handleStartTraining = useCallback((scenario?: Scenario) => {
    setPreviousView(view);
    if (scenario) {
      setActiveScenario(scenario);
      setView('SCENARIO');
    } else {
      setView('TRAINING');
    }
  }, [view]);

  const handleNavigateToScenario = useCallback((scenarioId: string) => {
    const scenario = scenarios.find(s => s.id === scenarioId);
    if (scenario) {
      setPreviousView(view);
      setActiveScenario(scenario);
      setView('SCENARIO');
    }
  }, [scenarios, view]);
  
  const handleSelectScenario = useCallback((scenario: Scenario) => {
    setPreviousView(view);
    setActiveScenario(scenario);
    setView('SCENARIO');
  }, [view]);

  const handleSelectWorkflow = useCallback(async (workflowId: string) => {
    if (!user?.uid) {
      console.error('No user logged in');
      return;
    }
    
    try {
      // First try to find the workflow with the user's ID
      const workflowExists = await getWorkflowVersion(workflowId, user.uid);
      if (!workflowExists) {
        // If not found as owner, try to find as a team member
        const workflowAsTeamMember = await getWorkflowVersion(workflowId);
        if (!workflowAsTeamMember) {
          console.error(`Workflow ${workflowId} not found`);
          return;
        }
      }
      
      // Save the current view before navigating
      setPreviousView(view);
      setActiveWorkflowId(workflowId);
      setView('WORKFLOW_DETAIL');
      
    } catch (error) {
      console.error('Error checking workflow:', error);
    }
  }, [user?.uid, view]);

  const handleBack = useCallback(() => {
    setActiveScenario(null);
    setActiveWorkflowId(null);
    
    // If we're in a workflow detail view, return to the previous view
    if (view === 'WORKFLOW_DETAIL') {
      setView(previousView);
    }
    // For scenarios always go back to training view
    else if (view === 'SCENARIO') {
      setView('TRAINING');
    }
    // Default fallback to dashboard
    else {
      setView('DASHBOARD');
    }
  }, [view, previousView]);

  const handleScenarioCreated = (newScenario: Scenario) => {
    setScenarios(prevScenarios => [...prevScenarios, newScenario]);
    if (scenarioCreationContext?.source === 'RESEARCH') {
      setView('RESEARCH');
    } else {
      setView('TRAINING');
    }
    setScenarioCreationContext(null);
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
    // Note: Average scores are not recalculated here to avoid a full data re-fetch.
    // They will be updated on the next full page load/login.
  }, []);

  const handleSaveScenario = async (data: {
    title: string;
    title_es?: string;
    description: string;
    description_es?: string;
    goal: string;
    goal_es?: string;
    domain?: string;
    currentWorkflowImage?: File;
  }) => {
    if (!user) return;

    let base64Image: string | null = null;
    
    const workflowImage = data.currentWorkflowImage;
    if (workflowImage) {
      const reader = new FileReader();
      base64Image = await new Promise<string>((resolve) => {
        reader.onloadend = () => {
          if (reader.result) {
            resolve(reader.result as string);
          } else {
            resolve(''); // In case of empty result, provide empty string
          }
        };
        reader.readAsDataURL(workflowImage);
      });
    }

    const scenarioData: Omit<Scenario, 'id' | 'type'> = {
      title: data.title,
      title_es: data.title_es,
      description: data.description,
      description_es: data.description_es,
      goal: data.goal,
      goal_es: data.goal_es,
      domain: data.domain,
      currentWorkflowImage: base64Image || null,
      favoritedBy: {}
    };

    const newScenario = await saveUserScenario(user.uid, scenarioData);

    if (scenarioCreationContext?.companyId) {
      const companyId = scenarioCreationContext.companyId;
      let companyName = scenarioCreationContext.companyName;
      try {
        const company = await getCompany(companyId, user.uid);
        if (company) {
          companyName = company.name;
          const existingSelected = company.selectedScenarios ?? [];
          if (!existingSelected.includes(newScenario.id)) {
            await updateCompanySelectedScenarios(company.id, user.uid, [...existingSelected, newScenario.id]);
          }
        }
      } catch (associationError) {
        console.error('Failed to associate scenario with company:', associationError);
      }

      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('company-scenario-created', {
            detail: {
              scenario: newScenario,
              companyId,
              companyName
            }
          })
        );
      }
    }

    handleScenarioCreated(newScenario);
  };

  const trainingScenarios = scenarios.filter(s => s.type === 'TRAINING');

  const [isCreatingScenario, setIsCreatingScenario] = useState(false);
  const [scenarioCreationContext, setScenarioCreationContext] = useState<ScenarioCreationContext | null>(null);
  
  const openScenarioCreator = (context: ScenarioCreationContext) => {
    setScenarioCreationContext(context);
    setIsCreatingScenario(true);
  };

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
                  averageScores={averageScores}
                />;
      case 'SCENARIO':
        if (activeScenario && user) {
          return <OperatorConsole 
                    scenario={activeScenario} 
                    onBack={handleBack} 
                    user={user} 
                    onEvaluationCompleted={handleEvaluationCompleted}
                    onViewWorkflow={handleSelectWorkflow}
                 />;
        }
        return null;
      case 'WORKFLOW_DETAIL':
        if (activeWorkflowId && user) {
          return <WorkflowDetailView
                    workflowId={activeWorkflowId}
                    userId={user.uid}
                    onBack={handleBack}
                 />;
        }
        return null;
      case 'DASHBOARD':
      default:
        return <DashboardView 
                    user={user!}
                    onStartTraining={handleStartTraining}
                    onNavigateToScenario={handleNavigateToScenario}
                    onViewWorkflow={handleSelectWorkflow}
                    onScenarioCreated={handleScenarioCreated}
                    handleNavigate={handleNavigate}
               />;
      case 'ADMIN':
        if (user) {
          return <AdminDashboard currentUser={user} />;
        }
        return null;
      case 'RESEARCH':
        if (user) {
          return <CompanyResearch 
                    userId={user.uid} 
                    initialCompany={selectedCompanyId || undefined}
                    onSelectScenario={handleNavigateToScenario}
                    onCreateScenario={(ctx) => openScenarioCreator({
                      source: 'RESEARCH',
                      companyId: ctx?.companyId,
                      companyName: ctx?.companyName
                    })}
                    onViewWorkflow={handleSelectWorkflow}
                  />;
        }
        return null;
    }
  };

  if (isLoadingAuth) {
    return <LoadingScreen />;
  }

  return (
    <I18nProvider initial={initialLang}>
    <div className="min-h-screen bg-slate-900 font-sans">
      <Header 
        onNavigate={handleNavigate} 
        user={user} 
        userRole={role} 
        onOpenWorkflowDrawer={() => setIsWorkflowDrawerOpen(true)}
      />
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
      <div className="container mx-auto px-4 sm:px-6 md:px-8 py-4 sm:py-6 md:py-8">
        {user ? (
          <div className="flex flex-col lg:flex-row gap-8 items-start">
            <main className={`flex-1 w-full ${error ? 'pt-0' : ''}`}>
              {renderAppContent()}
              {isCreatingScenario && (
                <CreateScenarioForm 
                  onSave={async (data) => {
                    await handleSaveScenario(data);
                    setIsCreatingScenario(false);
                    setScenarioCreationContext(null);
                  }}
                  onClose={() => {
                    setIsCreatingScenario(false);
                    setScenarioCreationContext(null);
                  }}
                />
              )}
            </main>
            <div className="w-full lg:w-auto lg:shrink-0">
              <RightSidebar 
                user={user} 
                onSelectWorkflow={handleSelectWorkflow}
                isOpen={isWorkflowDrawerOpen}
                onClose={() => setIsWorkflowDrawerOpen(false)}
              />
            </div>
          </div>
        ) : (
          <main className={`${error ? 'pt-0' : ''}`}>
            <PublicLanding />
          </main>
        )}
      </div>
    </div>
  </I18nProvider>
  );
};

export default App;
