import React from 'react';
import { ModelInfo } from '../app/page';

interface PredictionResult {
  txDigest: string;
  predictions: { [key: string]: number };
  predictedTrends: { [key: string]: "UP" | "DOWN" };
  confidence: number;
  overallTrend: "BULLISH" | "BEARISH" | "NEUTRAL";
}

interface PredictionResultsProps {
  predictions: PredictionResult[];
  models: { name: string }[];
}

export default function PredictionResults({ predictions, models }: PredictionResultsProps) {
  if (predictions.length === 0) return null;

  const getTrendColor = (trend: string) => {
    const colors: { [key: string]: string } = {
      BULLISH: "bg-green-500/20 text-green-400 border-green-500/30",
      BEARISH: "bg-red-500/20 text-red-400 border-red-500/30",
      NEUTRAL: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
      UP: "bg-green-500/10 text-green-400",
      DOWN: "bg-red-500/10 text-red-400",
    };
    return colors[trend] || "bg-gray-800 text-gray-400 border-gray-700";
  };

  return (
    <div className="mt-12 animate-in fade-in slide-in-from-bottom-8 duration-1000">
      <h2 className="text-xl font-bold text-gray-100 mb-6 flex items-center gap-2">
         <span className="text-purple-500">⚡</span> Prediction Results ({predictions.length})
      </h2>

      {/* Summary by Trend */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        {Object.entries({
          BULLISH: predictions.filter((p) => p.overallTrend === "BULLISH").length,
          NEUTRAL: predictions.filter((p) => p.overallTrend === "NEUTRAL").length,
          BEARISH: predictions.filter((p) => p.overallTrend === "BEARISH").length,
        }).map(([trend, count]) => (
          <div
            key={trend}
            className={`p-6 rounded-xl border backdrop-blur-sm flex flex-col items-center justify-center transition-transform hover:scale-105 ${getTrendColor(trend)}`}
          >
            <div className="text-4xl font-bold mb-2">{count}</div>
            <div className="text-sm font-bold tracking-widest uppercase opacity-80">{trend}</div>
          </div>
        ))}
      </div>

      {/* Results Table */}
      <div className="rounded-xl border border-gray-800 overflow-hidden bg-gray-900/30 backdrop-blur-sm">
        <div className="overflow-x-auto">
          <div className="max-h-[450px] overflow-y-auto">
            <table className="w-full text-sm text-left text-gray-400">
              <thead className="text-xs text-gray-400 uppercase bg-gray-900/80 border-b border-gray-800">
                <tr>
                  <th className="px-6 py-4 font-medium sticky top-0 z-10 bg-gray-900/80">TX Hash</th>
                  {models.map((m) => (
                    <th key={m.name} className="px-6 py-4 font-medium text-center sticky top-0 z-10 bg-gray-900/80">
                      {m.name.toUpperCase()}
                    </th>
                  ))}
                  <th className="px-6 py-4 font-medium text-center sticky top-0 z-10 bg-gray-900/80">Market Trend</th>
                  <th className="px-6 py-4 font-medium text-center sticky top-0 z-10 bg-gray-900/80">Confidence</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {predictions.map((pred, idx) => {
                  return (
                    <tr key={idx} className="hover:bg-gray-800/50 transition-colors">
                      <td className="px-6 py-4 font-mono text-xs text-cyan-400">
                        {pred.txDigest.slice(0, 8)}...{pred.txDigest.slice(-6)}
                      </td>
                      {models.map((m) => {
                        const score = pred.predictions[m.name] || 0;
                        const trend = pred.predictedTrends[m.name] || "DOWN";
                        return (
                          <td key={m.name} className="px-6 py-4 text-center">
                            <div className="flex flex-col items-center gap-1">
                              <span className={`text-xs px-2 py-0.5 rounded font-bold ${getTrendColor(trend)}`}>
                                {trend}
                              </span>
                              <span className="text-[10px] text-gray-500 font-mono">{(score * 100).toFixed(1)}%</span>
                            </div>
                          </td>
                        );
                      })}
                      <td className="px-6 py-4 text-center">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold border ${getTrendColor(pred.overallTrend)}`}>
                          {pred.overallTrend}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <div className="w-16 h-1.5 bg-gray-700 rounded-full overflow-hidden">
                            <div className="h-full bg-cyan-500" style={{ width: `${pred.confidence * 100}%` }} />
                          </div>
                          <span className="font-mono text-xs text-gray-300">{(pred.confidence * 100).toFixed(0)}%</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
