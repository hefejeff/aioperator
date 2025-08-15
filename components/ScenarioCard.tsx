

import React from 'react';
import type { Scenario } from '../types';

interface ScenarioCardProps {
  scenario: Scenario;
  onSelect: (scenario: Scenario) => void;
  highScore?: number;
}

const ScenarioCard: React.FC<ScenarioCardProps> = ({ scenario, onSelect, highScore }) => {
  const isCustom = !!scenario.userId;

  return (
    <div 
      className="bg-slate-800 rounded-lg p-6 border border-slate-700 hover:border-sky-500 transition-all duration-200 cursor-pointer flex flex-col justify-between transform hover:scale-105 relative"
      onClick={() => onSelect(scenario)}
    >
      {isCustom && (
        <span className="absolute top-2 right-2 text-xs bg-sky-900 text-sky-300 px-2 py-1 rounded-full font-semibold z-10">
          Custom
        </span>
      )}
      <div>
        <h3 className="text-xl font-bold text-sky-400 mb-2">{scenario.title}</h3>
        <p className="text-slate-400 text-sm mb-4">{scenario.description}</p>
        {highScore !== undefined && (
            <div className="flex items-center space-x-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
                <p className="text-sm font-semibold text-slate-300">
                    High Score: <span className="font-bold text-yellow-400">{highScore}/10</span>
                </p>
            </div>
        )}
      </div>
      <button className="mt-4 text-sm font-semibold text-white bg-sky-600/50 hover:bg-sky-500/70 py-2 rounded-md transition-colors">
        Start Scenario
      </button>
    </div>
  );
};

export default ScenarioCard;