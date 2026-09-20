"use client";

import { useEffect, useRef, useState } from "react";

interface PredictionResultProps {
  prediction: number | null;
  confidenceLow: number | null;
  confidenceHigh: number | null;
  breakdown: { feature: string; contribution: number; coefficient: number }[];
  isLoading: boolean;
  tv: number;
  radio: number;
  newspaper: number;
}

function useCountUp(target: number, duration = 600) {
  const [current, setCurrent] = useState(target);
  const rafRef = useRef<number>(0);
  const startRef = useRef<number>(0);
  const fromRef = useRef<number>(target);

  useEffect(() => {
    fromRef.current = current;
    startRef.current = 0;
    cancelAnimationFrame(rafRef.current);

    const animate = (timestamp: number) => {
      if (!startRef.current) startRef.current = timestamp;
      const elapsed = timestamp - startRef.current;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCurrent(fromRef.current + (target - fromRef.current) * eased);
      if (progress < 1) rafRef.current = requestAnimationFrame(animate);
    };

    rafRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafRef.current);
  }, [target, duration]);

  return current;
}

// Assumption: 1 unit of predicted Sales ≈ $10K revenue (industry proxy for this dataset)
const REVENUE_PER_UNIT_K = 10;

export default function PredictionResult({
  prediction,
  confidenceLow,
  confidenceHigh,
  breakdown,
  isLoading,
  tv,
  radio,
  newspaper,
}: PredictionResultProps) {
  const animatedPrediction = useCountUp(prediction ?? 0, 700);
  const totalBudget = tv + radio + newspaper; // in $K

  // Estimated revenue in $K (prediction is in thousands of units)
  const estimatedRevenueK = prediction != null ? prediction * REVENUE_PER_UNIT_K : null;

  // Revenue/Spend multiplier: how many dollars of revenue per dollar spent
  const revenueMultiplier =
    estimatedRevenueK != null && totalBudget > 0
      ? (estimatedRevenueK / totalBudget).toFixed(2)
      : null;

  // True ROI %: ((Revenue - Cost) / Cost) × 100
  const roiPercent =
    estimatedRevenueK != null && totalBudget > 0
      ? (((estimatedRevenueK - totalBudget) / totalBudget) * 100).toFixed(1)
      : null;

  // Top contributing features (linear channel terms only)
  const topFeatures = [...breakdown]
    .filter((f) => ["TV", "Radio", "Newspaper"].includes(f.feature))
    .sort((a, b) => b.contribution - a.contribution);

  return (
    <div className="relative rounded-2xl border border-white/10 bg-gradient-to-br from-indigo-950/80 via-slate-900/80 to-purple-950/80 backdrop-blur-xl overflow-hidden">
      {/* Animated glow bg */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-600/5 via-transparent to-purple-600/5 pointer-events-none" />
      <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-blue-500 via-purple-500 to-cyan-500" />

      <div className="relative p-7">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-lg shadow-lg shadow-purple-500/30">
            📊
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">Sales Prediction</h2>
            <p className="text-xs text-white/40">Polynomial Regression Model · Degree 2</p>
          </div>
          {isLoading && (
            <div className="ml-auto flex gap-1">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="w-2 h-2 rounded-full bg-blue-400 animate-bounce"
                  style={{ animationDelay: `${i * 0.15}s` }}
                />
              ))}
            </div>
          )}
        </div>

        {/* Main prediction value */}
        <div className="text-center py-8 relative">
          <p className="text-sm text-white/40 mb-2 uppercase tracking-widest">Predicted Sales</p>
          <div className="relative inline-block">
            <span className="text-7xl font-black bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400 bg-clip-text text-transparent tabular-nums leading-none">
              {animatedPrediction.toFixed(1)}
            </span>
            <span className="text-2xl font-bold text-white/50 ml-2">K units</span>
          </div>

          {/* Confidence interval */}
          {confidenceLow !== null && confidenceHigh !== null && (
            <p className="text-sm text-white/40 mt-3">
              ±1.5× RMSE range:{" "}
              <span className="text-white/70 font-semibold">
                {confidenceLow.toFixed(1)}K – {confidenceHigh.toFixed(1)}K
              </span>
            </p>
          )}
        </div>

        {/* KPI strip — all values derived from model output */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="rounded-xl bg-white/5 border border-white/10 p-3 text-center">
            <p className="text-xs text-white/40 mb-1">Total Budget</p>
            <p className="text-lg font-bold text-white">${totalBudget.toFixed(0)}K</p>
          </div>

          {/* Revenue / Spend multiplier (not called ROI) */}
          <div className="rounded-xl bg-white/5 border border-white/10 p-3 text-center">
            <p className="text-xs text-white/40 mb-1">Revenue / Spend</p>
            <p className="text-lg font-bold text-emerald-400">
              {revenueMultiplier != null ? `${revenueMultiplier}×` : "—"}
            </p>
          </div>

          {/* Revenue estimate */}
          <div className="rounded-xl bg-white/5 border border-white/10 p-3 text-center">
            <p className="text-xs text-white/40 mb-1">Est. Revenue</p>
            <p className="text-lg font-bold text-purple-300">
              {estimatedRevenueK != null ? `$${estimatedRevenueK.toFixed(0)}K` : "—"}
            </p>
          </div>
        </div>

        {/* ROI % row */}
        <div className="rounded-xl bg-white/5 border border-white/10 px-4 py-3 mb-5 flex items-center justify-between">
          <div>
            <p className="text-xs text-white/40">
              Marketing ROI{" "}
              <span className="text-white/25 font-normal">
                = (Revenue − Budget) ÷ Budget × 100
              </span>
            </p>
          </div>
          <p className={`text-lg font-bold tabular-nums ${
            roiPercent != null && Number(roiPercent) > 0 ? "text-emerald-400" : "text-red-400"
          }`}>
            {roiPercent != null ? `${Number(roiPercent) > 0 ? "+" : ""}${roiPercent}%` : "—"}
          </p>
        </div>

        {/* Channel contribution bars — from model breakdown */}
        <div>
          <p className="text-xs text-white/40 uppercase tracking-widest mb-3">
            Linear Channel Contribution{" "}
            <span className="text-white/20 normal-case font-normal">(from model breakdown)</span>
          </p>
          <div className="space-y-2.5">
            {topFeatures.map((feat, i) => {
              const colors = ["bg-blue-500", "bg-purple-500", "bg-amber-500"];
              const maxContrib = Math.max(...topFeatures.map((f) => Math.abs(f.contribution)));
              const pct = maxContrib > 0 ? (Math.abs(feat.contribution) / maxContrib) * 100 : 0;
              const isNeg = feat.contribution < 0;
              return (
                <div key={feat.feature} className="flex items-center gap-3">
                  <span className="text-sm text-white/60 w-20 shrink-0">{feat.feature}</span>
                  <div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${colors[i]} ${isNeg ? "opacity-50" : ""}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className={`text-sm font-bold w-16 text-right tabular-nums ${isNeg ? "text-red-400" : "text-white/80"}`}>
                    {isNeg ? "" : "+"}{feat.contribution.toFixed(2)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
