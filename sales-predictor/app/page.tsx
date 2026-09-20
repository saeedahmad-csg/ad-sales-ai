"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import BudgetInputCard from "@/components/BudgetInputCard";
import PredictionResult from "@/components/PredictionResult";
import DiminishingReturns from "@/components/DiminishingReturns";
import ModelStats from "@/components/ModelStats";
import ModelInfo from "@/components/ModelInfo";
import BudgetOptimizer from "@/components/BudgetOptimizer";
import modelStats from "@/data/model_stats.json";

type DRPoint = { budget: number; sales: number };
type DRData = { TV: DRPoint[]; Radio: DRPoint[]; Newspaper: DRPoint[] };

interface PredictionResponse {
  prediction: number;
  breakdown: { feature: string; contribution: number; coefficient: number }[];
  confidence_low: number;
  confidence_high: number;
  diminishing_returns: DRData;
  model_stats: typeof modelStats.performance;
}

const DEFAULTS = { tv: 147.04, radio: 23.26, newspaper: 30.55 };

export default function HomePage() {
  const [tv, setTv] = useState(DEFAULTS.tv);
  const [radio, setRadio] = useState(DEFAULTS.radio);
  const [newspaper, setNewspaper] = useState(DEFAULTS.newspaper);

  const [result, setResult] = useState<PredictionResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchPrediction = useCallback(async (tvVal: number, radioVal: number, newsVal: number) => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/predict", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tv: tvVal, radio: radioVal, newspaper: newsVal }),
      });
      if (res.ok) {
        const data = await res.json();
        setResult(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Debounced prediction call
  const triggerPrediction = useCallback(
    (tvVal: number, radioVal: number, newsVal: number) => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        fetchPrediction(tvVal, radioVal, newsVal);
      }, 250);
    },
    [fetchPrediction]
  );

  // Initial prediction
  useEffect(() => {
    fetchPrediction(tv, radio, newspaper);
  }, []);

  const handleTv = (v: number) => { setTv(v); triggerPrediction(v, radio, newspaper); };
  const handleRadio = (v: number) => { setRadio(v); triggerPrediction(tv, v, newspaper); };
  const handleNewspaper = (v: number) => { setNewspaper(v); triggerPrediction(tv, radio, v); };

  const handleApplySuggestion = (newTv: number, newRadio: number, newNewspaper: number) => {
    setTv(newTv);
    setRadio(newRadio);
    setNewspaper(newNewspaper);
    triggerPrediction(newTv, newRadio, newNewspaper);
  };

  const { data_ranges, performance, feature_importance } = modelStats;

  return (
    <div className="min-h-screen bg-slate-950 relative overflow-hidden">
      {/* Background ambient orbs */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-[-20%] left-[-10%] w-[60vw] h-[60vw] rounded-full bg-blue-600/8 blur-[120px]" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[50vw] h-[50vw] rounded-full bg-purple-600/8 blur-[120px]" />
        <div className="absolute top-[40%] left-[40%] w-[30vw] h-[30vw] rounded-full bg-cyan-600/5 blur-[100px]" />
      </div>

      {/* Grid pattern overlay */}
      <div
        className="fixed inset-0 pointer-events-none z-0 opacity-[0.015]"
        style={{
          backgroundImage: `
            linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)
          `,
          backgroundSize: "50px 50px",
        }}
      />

      <div className="relative z-10">
        {/* ── Header ─────────────────────────────────────────────────────── */}
        <header className="border-b border-white/5 bg-slate-950/80 backdrop-blur-xl sticky top-0 z-50">
          <div className="w-full max-w-[1720px] mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center font-black text-white text-sm shadow-lg shadow-blue-500/30">
                AI
              </div>
              <div>
                <h1 className="text-lg font-black text-white tracking-tight">AdSales AI</h1>
                <p className="text-xs text-white/40">Polynomial Regression Predictor</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-xs text-emerald-400 font-semibold">Model Active</span>
              </div>
              <div className="text-right hidden md:block">
                <p className="text-xs text-white/40">Test R²</p>
                <p className="text-sm font-bold text-emerald-400">{(performance.r2_test * 100).toFixed(1)}%</p>
              </div>
            </div>
          </div>
        </header>

        {/* ── Hero ───────────────────────────────────────────────────────── */}
        <section className="w-full max-w-[1720px] mx-auto px-4 sm:px-6 lg:px-8 pt-12 pb-8">
          <div className="text-center max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-blue-500/30 bg-blue-500/10 text-blue-300 text-xs font-semibold mb-6 backdrop-blur">
              <span>📊</span> Advertising Dataset · 200 samples · Degree-2 Polynomial
            </div>
            <h2 className="text-5xl sm:text-6xl font-black text-white leading-tight mb-4">
              Predict Sales from{" "}
              <span className="bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400 bg-clip-text text-transparent">
                Ad Budgets
              </span>
            </h2>
            <p className="text-lg text-white/50 max-w-2xl mx-auto leading-relaxed">
              Adjust TV, Radio, and Newspaper budgets to instantly predict sales. Built on polynomial regression to
              reveal diminishing returns and hidden cross-channel synergies.
            </p>
          </div>
        </section>

        {/* ── Main Content ───────────────────────────────────────────────── */}
        <main className="w-full max-w-[1720px] mx-auto px-4 sm:px-6 lg:px-8 pb-20">
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

            {/* Left: Budget Inputs */}
            <div className="xl:col-span-1 space-y-4">
              <div className="flex items-center gap-3 mb-2">
                <h3 className="text-base font-bold text-white">Advertising Budgets</h3>
                <span className="text-xs text-white/30 px-2 py-0.5 rounded-full border border-white/10 bg-white/5">
                  $ thousands
                </span>
              </div>

              <BudgetInputCard
                channel="TV"
                value={tv}
                onChange={handleTv}
                min={data_ranges.TV.min}
                max={data_ranges.TV.max}
                mean={data_ranges.TV.mean}
                color="blue"
                icon="📺"
                description="Television advertising spend"
              />
              <BudgetInputCard
                channel="Radio"
                value={radio}
                onChange={handleRadio}
                min={data_ranges.Radio.min}
                max={data_ranges.Radio.max}
                mean={data_ranges.Radio.mean}
                color="purple"
                icon="📻"
                description="Radio advertising spend"
              />
              <BudgetInputCard
                channel="Newspaper"
                value={newspaper}
                onChange={handleNewspaper}
                min={data_ranges.Newspaper.min}
                max={data_ranges.Newspaper.max}
                mean={data_ranges.Newspaper.mean}
                color="amber"
                icon="📰"
                description="Newspaper advertising spend"
              />

              {/* Reset button */}
              <button
                onClick={() => handleApplySuggestion(DEFAULTS.tv, DEFAULTS.radio, DEFAULTS.newspaper)}
                className="w-full py-2.5 rounded-xl border border-white/10 bg-white/5 text-white/50 text-sm font-semibold hover:bg-white/10 hover:text-white hover:border-white/20 transition-all duration-200"
              >
                ↺ Reset to Dataset Averages
              </button>
            </div>

            {/* Right: Results */}
            <div className="xl:col-span-2 space-y-6">
              {/* Prediction */}
              <PredictionResult
                prediction={result?.prediction ?? null}
                confidenceLow={result?.confidence_low ?? null}
                confidenceHigh={result?.confidence_high ?? null}
                breakdown={result?.breakdown ?? []}
                isLoading={isLoading}
                tv={tv}
                radio={radio}
                newspaper={newspaper}
              />

              {/* Diminishing Returns Chart */}
              <DiminishingReturns
                drData={result?.diminishing_returns ?? null}
                currentBudgets={{ tv, radio, newspaper }}
              />
            </div>
          </div>

          {/* ── Model Analysis & Optimization: 3 full-width columns across the screen ── */}
          <div className="mt-8 grid grid-cols-1 lg:grid-cols-3 gap-6">
            <ModelStats
              stats={modelStats.performance}
              featureImportance={modelStats.feature_importance}
            />
            <ModelInfo />
            <BudgetOptimizer
              tv={tv}
              radio={radio}
              newspaper={newspaper}
              prediction={result?.prediction ?? null}
              onApplySuggestion={handleApplySuggestion}
            />
          </div>

          {/* ── How It Works ─────────────────────────────────────────── */}
          <section className="mt-16 rounded-2xl border border-white/10 bg-white/3 backdrop-blur-xl p-8">
            <h3 className="text-xl font-bold text-white mb-2 text-center">How the Model Works</h3>
            <p className="text-xs text-white/40 text-center mb-6">A plain-English guide to what the model is doing behind the scenes</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                {
                  step: "01",
                  title: "Expanding the Inputs",
                  desc: "Your three budget numbers (TV, Radio, Newspaper) are transformed into 9 derived values. These include each budget squared (e.g. TV²) and each pair multiplied together (e.g. TV × Radio) — giving the model more signals to work with.",
                  icon: "🔢",
                  color: "from-blue-500/20 to-blue-600/5",
                  detail: "β = (XᵀX)⁻¹ Xᵀy",
                },
                {
                  step: "02",
                  title: "Learning the Formula",
                  desc: "The model finds the best multiplier (coefficient) for each of the 9 inputs so that the combination matches historical sales as closely as possible. This is solved mathematically in one step — no guessing or trial-and-error.",
                  icon: "🧮",
                  color: "from-purple-500/20 to-purple-600/5",
                  detail: "Normal equations, no iteration",
                },
                {
                  step: "03",
                  title: "Non-Linear Relationships",
                  desc: "Because of the squared terms (e.g. TV²), the model can capture curves — not just straight lines. When the model's TV² coefficient is negative, it means each extra dollar spent yields a slightly smaller return than the last.",
                  icon: "📉",
                  color: "from-cyan-500/20 to-cyan-600/5",
                  detail: "Quadratic terms detect curve shape",
                },
                {
                  step: "04",
                  title: "Channel Interactions",
                  desc: "The TV × Radio cross-term captures synergy — if both channels are active at the same time, the combined effect can be larger than spending on each channel separately. The model learns this from patterns in the data.",
                  icon: "⚡",
                  color: "from-amber-500/20 to-amber-600/5",
                  detail: "TV × Radio cross-term coefficient",
                },
              ].map((item) => (
                <div
                  key={item.step}
                  className={`rounded-xl border border-white/10 bg-gradient-to-br ${item.color} p-5`}
                >
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-2xl">{item.icon}</span>
                    <span className="text-xs font-mono text-white/30">STEP {item.step}</span>
                  </div>
                  <h4 className="font-bold text-white mb-2">{item.title}</h4>
                  <p className="text-xs text-white/50 leading-relaxed mb-3">{item.desc}</p>
                  <span className="text-xs font-mono text-white/20">{item.detail}</span>
                </div>
              ))}
            </div>
          </section>
        </main>

        {/* Footer */}
        <footer className="border-t border-white/5 py-8">
          <div className="w-full max-w-[1720px] mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <p className="text-sm text-white/20">
              Built with Next.js 16 · Polynomial Regression (degree=2) · Advertising Dataset (200 rows) ·
              Test R² = {(performance.r2_test * 100).toFixed(1)}%
            </p>
          </div>
        </footer>
      </div>
    </div>
  );
}
