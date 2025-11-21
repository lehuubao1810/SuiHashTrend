import React from 'react';

interface LoadingOverlayProps {
  isVisible: boolean;
  message: string;
}

export default function LoadingOverlay({ isVisible, message }: LoadingOverlayProps) {
  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
      <div className="flex flex-col items-center justify-center">
        {/* AI Brain Animation */}
        <div className="relative w-32 h-32 mb-8">
            <div className="absolute inset-0 rounded-full border-t-4 border-cyan-500 animate-spin"></div>
            <div className="absolute inset-2 rounded-full border-r-4 border-purple-500 animate-spin animation-delay-200"></div>
            <div className="absolute inset-4 rounded-full border-b-4 border-pink-500 animate-spin animation-delay-500"></div>
            <div className="absolute inset-0 flex items-center justify-center">
                 <div className="h-16 w-16 bg-gradient-to-br from-cyan-500 to-purple-600 rounded-full blur-lg animate-pulse"></div>
            </div>
        </div>
        
        <h3 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-400 mb-2 animate-pulse">
          AI Analysis in Progress
        </h3>
        <p className="text-gray-400 font-mono text-sm tracking-wider">
            {message}
        </p>
      </div>
    </div>
  );
}
