import React from 'react';

interface TransactionControlProps {
  txCount: number;
  loadingMoreTx: boolean;
  onLoadMore: () => void;
}

export default function TransactionControl({ txCount, loadingMoreTx, onLoadMore }: TransactionControlProps) {
  return (
    <div
      className={`p-4 rounded-xl border backdrop-blur-sm transition-all duration-300 ${
        txCount > 0
          ? "bg-cyan-950/20 border-cyan-900/50 shadow-[0_0_20px_rgba(6,182,212,0.05)]"
          : "bg-gray-900/50 border-gray-800"
      }`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`flex items-center justify-center h-10 w-10 rounded-full ${txCount > 0 ? 'bg-cyan-500/20 text-cyan-400' : 'bg-gray-800 text-gray-500'}`}>
             {txCount > 0 ? (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
             ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
             )}
          </div>
          <div>
              <p className="text-sm text-gray-400 font-medium uppercase tracking-wider">Data Source</p>
              <p className="text-lg font-bold text-gray-100">
                {txCount} <span className="text-sm font-normal text-gray-500">TX Hashes Ready</span>
              </p>
          </div>
        </div>
        {/* <button
          onClick={onLoadMore}
          disabled={loadingMoreTx}
          className="group relative px-4 py-2 bg-gray-800 hover:bg-gray-700 disabled:bg-gray-900 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-all border border-gray-700 hover:border-gray-600 overflow-hidden"
        >
          <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
          {loadingMoreTx ? (
            <div className="flex items-center gap-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              <span>Syncing...</span>
            </div>
          ) : (
            <span className="flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Load +100 TX
            </span>
          )}
        </button> */}
      </div>
    </div>
  );
}
