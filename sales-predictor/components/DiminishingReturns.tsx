"use client";

import { useState } from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";
import { Line } from "react-chartjs-2";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler);

interface DiminishingReturnsProps {
  drData: {
    TV: { budget: number; sales: number }[];
    Radio: { budget: number; sales: number }[];
    Newspaper: { budget: number; sales: number }[];
  } | null;
  currentBudgets: { tv: number; radio: number; newspaper: number };
}

const CHANNEL_STYLES = {
  TV: {
    label: "TV",
    border: "rgba(96, 165, 250, 1)",
    fill: "rgba(96, 165, 250, 0.1)",
    point: "rgba(96, 165, 250, 1)",
    current: "rgba(96, 165, 250, 0.9)",
    tab: "bg-blue-500/20 text-blue-300 border-blue-500/40",
    activeTab: "bg-blue-500 text-white border-blue-400",
  },
  Radio: {
    label: "Radio",
    border: "rgba(168, 85, 247, 1)",
    fill: "rgba(168, 85, 247, 0.1)",
    point: "rgba(168, 85, 247, 1)",
    current: "rgba(168, 85, 247, 0.9)",
    tab: "bg-purple-500/20 text-purple-300 border-purple-500/40",
    activeTab: "bg-purple-500 text-white border-purple-400",
  },
  Newspaper: {
    label: "Newspaper",
    border: "rgba(251, 191, 36, 1)",
    fill: "rgba(251, 191, 36, 0.1)",
    point: "rgba(251, 191, 36, 1)",
    current: "rgba(251, 191, 36, 0.9)",
    tab: "bg-amber-500/20 text-amber-300 border-amber-500/40",
    activeTab: "bg-amber-500 text-white border-amber-400",
  },
};

type Channel = "TV" | "Radio" | "Newspaper";

/**
 * Detect whether the curve actually shows diminishing marginal returns
 * by checking if the average slope in the second half < first half.
 */
function analyzeResponseCurve(data: { budget: number; sales: number }[]): {
  isDiminishing: boolean;
  label: string;
  subtitle: string;
  halfwayBudget: string | null;
} {
  if (data.length < 4) return { isDiminishing: false, label: "Incremental Spend Analysis", subtitle: "How predicted sales change with budget", halfwayBudget: null };

  const midpoint = Math.floor(data.length / 2);
  const firstHalfSlopes: number[] = [];
  const secondHalfSlopes: number[] = [];

  for (let i = 1; i < midpoint; i++) {
    const dBudget = data[i].budget - data[i - 1].budget;
    if (dBudget > 0) firstHalfSlopes.push((data[i].sales - data[i - 1].sales) / dBudget);
  }
  for (let i = midpoint + 1; i < data.length; i++) {
    const dBudget = data[i].budget - data[i - 1].budget;
    if (dBudget > 0) secondHalfSlopes.push((data[i].sales - data[i - 1].sales) / dBudget);
  }

  const avgFirst  = firstHalfSlopes.reduce((s, v) => s + v, 0) / (firstHalfSlopes.length || 1);
  const avgSecond = secondHalfSlopes.reduce((s, v) => s + v, 0) / (secondHalfSlopes.length || 1);
  const isDiminishing = avgSecond < avgFirst * 0.7; // second half slope is <70% of first half

  // Find the point where marginal return drops below 50% of its peak (actual threshold)
  const slopes = data.map((d, i) => {
    if (i === 0) return 0;
    const dBudget = d.budget - data[i - 1].budget;
    return dBudget > 0 ? (d.sales - data[i - 1].sales) / dBudget : 0;
  });
  const peakSlope = Math.max(...slopes);
  const thresholdIdx = slopes.findIndex((s, i) => s < peakSlope * 0.5 && i > 3);
  const halfwayBudget = thresholdIdx > 0 ? `$${data[thresholdIdx]?.budget.toFixed(0)}K` : null;

  return {
    isDiminishing,
    label: isDiminishing ? "Diminishing Returns Analysis" : "Incremental Spend Analysis",
    subtitle: isDiminishing
      ? "Model shows slowing gains — each extra dollar yields less sales here"
      : "How predicted sales change as spending increases (other channels fixed)",
    halfwayBudget,
  };
}

export default function DiminishingReturns({ drData, currentBudgets }: DiminishingReturnsProps) {
  const [activeChannel, setActiveChannel] = useState<Channel>("TV");

  if (!drData) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-6 flex items-center justify-center h-64">
        <div className="text-center">
          <div className="w-12 h-12 rounded-full border-2 border-blue-500/30 border-t-blue-500 animate-spin mx-auto mb-3" />
          <p className="text-white/40 text-sm">Loading incremental spend analysis…</p>
        </div>
      </div>
    );
  }

  const style = CHANNEL_STYLES[activeChannel];
  const data = drData[activeChannel];
  const currentBudget =
    activeChannel === "TV"
      ? currentBudgets.tv
      : activeChannel === "Radio"
      ? currentBudgets.radio
      : currentBudgets.newspaper;

  // Find current budget index in data
  const currentIdx = Math.max(
    0,
    data.findIndex((d) => d.budget >= currentBudget) === -1
      ? data.length - 1
      : data.findIndex((d) => d.budget >= currentBudget)
  );
  const currentSales = data[currentIdx]?.sales ?? 0;

  // Analyse curve shape for honest labeling
  const analysis = analyzeResponseCurve(data);

  // Incremental gain from current position to max
  const maxSales = Math.max(...data.map((d) => d.sales));
  const incrementalGain = (maxSales - currentSales).toFixed(2);

  const chartData = {
    labels: data.map((d) => `$${d.budget.toFixed(0)}K`),
    datasets: [
      {
        label: `${activeChannel} Predicted Sales`,
        data: data.map((d) => d.sales),
        borderColor: style.border,
        backgroundColor: style.fill,
        borderWidth: 2.5,
        fill: true,
        tension: 0.4,
        pointRadius: 0,
        pointHoverRadius: 5,
        pointHoverBackgroundColor: style.point,
      },
      // Current budget marker — single highlighted point
      {
        label: "Your Current Budget",
        data: data.map((d, i) => (i === currentIdx ? d.sales : null)),
        borderColor: style.current,
        backgroundColor: style.current,
        borderWidth: 0,
        pointRadius: 8,
        pointHoverRadius: 10,
        fill: false,
        tension: 0,
        showLine: false,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    animation: { duration: 600, easing: "easeInOutQuart" as const },
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: "rgba(15, 23, 42, 0.95)",
        borderColor: style.border,
        borderWidth: 1,
        titleColor: "#fff",
        bodyColor: "rgba(255,255,255,0.7)",
        padding: 12,
        callbacks: {
          label: (ctx: { parsed: { y: number | null } }) =>
            ctx.parsed.y != null ? ` ${ctx.parsed.y.toFixed(2)}K units (model prediction)` : "",
        },
      },
    },
    scales: {
      x: {
        grid: { color: "rgba(255,255,255,0.05)" },
        ticks: {
          color: "rgba(255,255,255,0.4)",
          maxTicksLimit: 6,
          font: { size: 11 },
        },
      },
      y: {
        grid: { color: "rgba(255,255,255,0.05)" },
        ticks: {
          color: "rgba(255,255,255,0.4)",
          font: { size: 11 },
          callback: (v: string | number) => `${Number(v).toFixed(1)}K`,
        },
      },
    },
  };

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl overflow-hidden relative">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-blue-500/50 via-purple-500/50 to-amber-500/50" />

      <div className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="font-bold text-white text-lg">{analysis.label}</h3>
            <p className="text-xs text-white/40 mt-0.5">{analysis.subtitle}</p>
          </div>
          {/* Channel tabs */}
          <div className="flex gap-2">
            {(["TV", "Radio", "Newspaper"] as Channel[]).map((ch) => (
              <button
                key={ch}
                onClick={() => setActiveChannel(ch)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all duration-200 ${
                  activeChannel === ch ? CHANNEL_STYLES[ch].activeTab : CHANNEL_STYLES[ch].tab
                }`}
              >
                {ch}
              </button>
            ))}
          </div>
        </div>

        {/* Chart — all points from polynomial model predictions */}
        <div className="h-52 mb-4">
          <Line data={chartData} options={options} />
        </div>

        {/* Insight cards */}
        <div className="grid grid-cols-3 gap-3 mt-4">
          <div className="rounded-xl bg-white/5 border border-white/10 p-3">
            <p className="text-xs text-white/40 mb-1">Current Budget</p>
            <p className="text-base font-bold text-white">${currentBudget.toFixed(0)}K</p>
          </div>
          <div className="rounded-xl bg-white/5 border border-white/10 p-3">
            <p className="text-xs text-white/40 mb-1">Predicted Sales</p>
            <p className="text-base font-bold text-white">{currentSales.toFixed(1)}K</p>
          </div>
          <div className="rounded-xl bg-white/5 border border-white/10 p-3">
            <p className="text-xs text-white/40 mb-1">
              {analysis.isDiminishing ? "Half-Return Threshold" : "Max Gain (to ceiling)"}
            </p>
            <p className="text-base font-bold text-amber-400">
              {analysis.isDiminishing
                ? analysis.halfwayBudget ?? "N/A"
                : `+${incrementalGain}K`}
            </p>
          </div>
        </div>

        {/* Curve type indicator */}
        <div className={`mt-3 rounded-xl px-3 py-2 border text-xs flex items-center gap-2 ${
          analysis.isDiminishing
            ? "bg-amber-500/10 border-amber-500/20 text-amber-300"
            : "bg-blue-500/10 border-blue-500/20 text-blue-300"
        }`}>
          <span>{analysis.isDiminishing ? "⚠️" : "ℹ️"}</span>
          <span>
            {analysis.isDiminishing
              ? `Model curve confirms diminishing marginal returns for ${activeChannel} at current other-channel levels`
              : `Model shows a ${activeChannel} response curve — shape may vary as other channels change`}
          </span>
        </div>
      </div>
    </div>
  );
}
