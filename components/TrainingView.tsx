

import React, { useState } from 'react';
import type firebase from 'firebase/compat/app';
import type { Scenario } from '../types';
import { saveUserScenario } from '../services/firebaseService';
import ScenarioCard from './ScenarioCard';
import CreateScenarioForm from './CreateScenarioForm';

interface TrainingViewProps {
  scenarios: Scenario[];
  onSelectScenario: (scenario: Scenario) => void;
  user: firebase.User;
  onScenarioCreated: (newScenario: Scenario) => void;
  highScores: Record<string, number>;
}

const TrainingView: React.FC<TrainingViewProps> = ({ scenarios, onSelectScenario, user, onScenarioCreated, highScores }) => {
  const [isCreating, setIsCreating] = useState(false);

  const handleSaveScenario = async (data: { title: string; description: string; goal: string }) => {
    // This will throw on error, which is caught by the form component
    const newScenario = await saveUserScenario(user.uid, data);
    onScenarioCreated(newScenario);
  };

  return (
    <div className="animate-fade-in">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold mb-2">Training Scenarios</h1>
        <p className="text-lg text-slate-400">Select a scenario to start practicing, or create your own.</p>
        <button
          onClick={() => setIsCreating(true)}
          className="mt-4 inline-flex items-center justify-center px-5 py-2 border border-transparent text-base font-medium rounded-md text-white bg-sky-600 hover:bg-sky-700 transition-colors"
        >
          Create New Scenario
        </button>
      </div>

      {isCreating && (
        <CreateScenarioForm
          onSave={handleSaveScenario}
          onClose={() => setIsCreating(false)}
        />
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {scenarios.map(scenario => (
          <ScenarioCard 
            key={scenario.id} 
            scenario={scenario} 
            onSelect={onSelectScenario}
            highScore={highScores[scenario.id]}
          />
        ))}
      </div>
    </div>
  );
};

export default TrainingView;