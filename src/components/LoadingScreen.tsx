import React from 'react';

const LoadingScreen: React.FC = () => (
  <div className="fixed inset-0 flex items-center justify-center bg-white z-50">
    <div className="flex flex-col items-center justify-center space-y-8">
      {/* Bouncing dots animation */}
      <div className="flex items-center justify-center space-x-4">
        <div className="w-6 h-6 rounded-full bg-wm-accent animate-bounce [animation-delay:-0.3s]"></div>
        <div className="w-6 h-6 rounded-full bg-wm-pink animate-bounce [animation-delay:-0.15s]"></div>
        <div className="w-6 h-6 rounded-full bg-wm-yellow animate-bounce"></div>
      </div>
      <p className="text-wm-blue text-lg font-bold tracking-wide">Loading...</p>
    </div>
  </div>
);

export default LoadingScreen;
