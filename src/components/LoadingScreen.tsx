import React from 'react';

const LoadingScreen: React.FC = () => (
  <div className="flex items-center justify-center h-screen w-screen bg-slate-900">
    <div className="flex items-center justify-center space-x-2">
        <div className="w-4 h-4 rounded-full bg-sky-400 animate-pulse [animation-delay:-0.3s]"></div>
        <div className="w-4 h-4 rounded-full bg-sky-400 animate-pulse [animation-delay:-0.15s]"></div>
        <div className="w-4 h-4 rounded-full bg-sky-400 animate-pulse"></div>
    </div>
  </div>
);

export default LoadingScreen;
