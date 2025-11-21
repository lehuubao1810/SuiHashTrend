import React from 'react';

interface HeaderProps {
  loading: boolean;
  error: string;
}

export default function Header({ loading, error }: HeaderProps) {
  return (
    <div className="mb-8">
      <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-500 mb-6 tracking-tight">
        📈 Deep Dense Trend Prediction System
      </h1>

      <div className="space-y-4">
        {loading && (
          <div className="flex items-center gap-3 text-cyan-400 bg-cyan-950/30 p-3 rounded-lg border border-cyan-900/50 backdrop-blur-sm animate-pulse">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-cyan-400"></div>
            <span className="font-mono text-sm">System Initializing: Loading resources from Walrus...</span>
          </div>
        )}

        {error && (
          <div className="p-4 bg-red-950/30 border border-red-500/50 rounded-lg backdrop-blur-sm">
            <div className="flex items-center gap-2 mb-1">
               <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-red-500" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
               <p className="text-red-400 font-bold uppercase tracking-wider text-sm">System Error</p>
            </div>
            <p className="text-red-300 text-sm font-mono pl-7">{error}</p>
          </div>
        )}
      </div>
    </div>
  );
}
