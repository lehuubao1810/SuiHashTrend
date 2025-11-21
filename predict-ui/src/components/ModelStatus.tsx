import React from 'react';
import * as tf from "@tensorflow/tfjs";

interface ModelInfo {
  name: string;
  model: tf.LayersModel;
  inputShape: number[];
}

interface ModelStatusProps {
  models: ModelInfo[];
  loadingModels: boolean;
}

export default function ModelStatus({ models, loadingModels }: ModelStatusProps) {
  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-bold text-gray-100 flex items-center gap-2">
          <span className="text-purple-500">🧠</span> Neural Networks Status
          <span className="bg-gray-800 text-gray-300 text-xs px-2 py-1 rounded-full border border-gray-700">
            {models.length} Active
          </span>
        </h3>
      </div>

      {loadingModels && (
         <div className="flex items-center gap-3 text-purple-400 bg-purple-950/30 p-3 rounded-lg border border-purple-900/50 backdrop-blur-sm mb-4 animate-pulse">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-purple-400"></div>
            <span className="font-mono text-sm">Loading Deep Dense Models...</span>
          </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {models.map((modelInfo, idx) => (
          <div
            key={idx}
            className="group relative p-4 bg-gray-900/50 border border-gray-800 rounded-xl backdrop-blur-sm hover:border-purple-500/50 transition-all duration-300 hover:shadow-[0_0_15px_rgba(168,85,247,0.15)]"
          >
            <div className="absolute top-0 right-0 p-2 opacity-0 group-hover:opacity-100 transition-opacity">
               <div className="h-2 w-2 rounded-full bg-green-500 shadow-[0_0_5px_rgba(34,197,94,0.8)]"></div>
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-2 mb-2">
                <div className="p-1.5 bg-purple-500/10 rounded-lg">
                   <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.384-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                    </svg>
                </div>
                <span className="font-bold text-gray-200 tracking-wide">
                  {modelInfo.name.toUpperCase()}
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs text-gray-500 font-mono bg-black/30 p-2 rounded border border-gray-800">
                <span>Input Shape:</span>
                <span className="text-cyan-400">[{modelInfo.inputShape.join(", ")}]</span>
              </div>
            </div>
          </div>
        ))}
        {models.length === 0 && !loadingModels && (
          <div className="col-span-full p-8 bg-gray-900/30 border border-dashed border-gray-700 rounded-xl text-center">
            <p className="text-gray-500 font-mono">No neural networks loaded yet.</p>
          </div>
        )}
      </div>
    </div>
  );
}
