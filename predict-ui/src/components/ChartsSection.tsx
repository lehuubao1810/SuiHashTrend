import React from 'react';
import { Bar, Line, Doughnut } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  ChartOptions
} from "chart.js";

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

// Dark theme chart defaults
ChartJS.defaults.color = '#9ca3af';
ChartJS.defaults.borderColor = '#374151';

interface ChartData {
  trendDistribution: any;
  confidenceDistribution: any;
  trendTimeline: any;
  modelPerformance: any;
}

interface ChartsSectionProps {
  chartData: ChartData | null;
}

export default function ChartsSection({ chartData }: ChartsSectionProps) {
  if (!chartData) return null;

  const chartOptions: ChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "top",
        labels: { color: '#e5e7eb' }
      },
    },
    scales: {
        x: { grid: { color: '#374151' } },
        y: { grid: { color: '#374151' } }
    }
  };

  const doughnutOptions: ChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "bottom",
        labels: { color: '#e5e7eb' }
      },
    },
  };

  return (
    <div className="mt-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <h2 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-500 mb-8 flex items-center gap-2">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
        Trend Analytics Dashboard
      </h2>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Chart 1: Market Sentiment */}
        <div className="bg-gray-900/50 p-6 rounded-xl border border-gray-800 backdrop-blur-sm shadow-lg hover:border-cyan-500/30 transition-colors">
          <h3 className="text-lg font-semibold mb-4 text-gray-200">Market Sentiment Distribution</h3>
          <div className="h-64">
            <Doughnut data={chartData.trendDistribution} options={doughnutOptions as any} />
          </div>
        </div>

        {/* Chart 2: Trend by Type */}
        <div className="bg-gray-900/50 p-6 rounded-xl border border-gray-800 backdrop-blur-sm shadow-lg hover:border-cyan-500/30 transition-colors">
          <h3 className="text-lg font-semibold mb-4 text-gray-200">Trend by Transaction Type</h3>
          <div className="h-64">
            <Bar data={chartData.confidenceDistribution} options={chartOptions as any} />
          </div>
        </div>

        {/* Chart 3: Trend Timeline */}
        <div className="bg-gray-900/50 p-6 rounded-xl border border-gray-800 backdrop-blur-sm shadow-lg hover:border-cyan-500/30 transition-colors col-span-1 lg:col-span-2">
          <h3 className="text-lg font-semibold mb-4 text-gray-200">Trend Confidence Timeline</h3>
          <div className="h-64">
            <Line data={chartData.trendTimeline} options={chartOptions as any} />
          </div>
        </div>

        {/* Chart 4: Model Performance */}
        <div className="bg-gray-900/50 p-6 rounded-xl border border-gray-800 backdrop-blur-sm shadow-lg hover:border-cyan-500/30 transition-colors col-span-1 lg:col-span-2">
          <h3 className="text-lg font-semibold mb-4 text-gray-200">Deep Dense Model Performance</h3>
          <div className="h-64">
            <Bar data={chartData.modelPerformance} options={chartOptions as any} />
          </div>
        </div>
      </div>
    </div>
  );
}
