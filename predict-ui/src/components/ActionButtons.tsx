import React from 'react';

interface ActionButtonsProps {
  loadingMoreTx: boolean;
  isPredicting: boolean;
  predictionProgress: number;
  canPredict: boolean;
  onLoadMore: () => void;
  onPredict: () => void;
}

export default function ActionButtons({
  loadingMoreTx,
  isPredicting,
  predictionProgress,
  canPredict,
  onLoadMore,
  onPredict,
}: ActionButtonsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
      {/* Load More TX Button */}
      <button
        onClick={onLoadMore}
        disabled={loadingMoreTx}
        className="relative overflow-hidden group w-full py-4 bg-gray-800 hover:bg-gray-700 disabled:bg-gray-900 disabled:opacity-50 text-white font-bold rounded-xl transition-all border border-gray-700 hover:border-gray-600 shadow-lg hover:shadow-xl"
      >
        <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
        <span className="relative flex items-center justify-center gap-2">
          {loadingMoreTx ? (
            <>
               <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
               <span>Syncing Data...</span>
            </>
          ) : (
            <>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              Load More Data
            </>
          )}
        </span>
      </button>

      {/* Predict Button */}
      <button
        onClick={onPredict}
        disabled={isPredicting || !canPredict}
        className={`relative overflow-hidden group w-full py-4 font-bold rounded-xl transition-all shadow-lg hover:shadow-cyan-500/20 ${
            !canPredict 
            ? 'bg-gray-900 text-gray-600 border border-gray-800 cursor-not-allowed' 
            : 'bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white border border-cyan-500/30'
        }`}
      >
        {canPredict && <div className="absolute inset-0 w-full h-full bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>}
        <span className="relative flex items-center justify-center gap-2">
          {isPredicting ? (
            <>
               <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
               <span>Processing... {predictionProgress.toFixed(0)}%</span>
            </>
          ) : (
            <>
               <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
               Run Prediction
            </>
          )}
        </span>
      </button>
    </div>
  );
}
