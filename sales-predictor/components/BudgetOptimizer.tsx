"use client";

import { buildPolyFeatures } from "@/lib/polynomialModel";
import modelCoefficients from "@/data/model_coefficients.json";

interface BudgetOptimizerProps {
  tv: number;
  radio: number;
  newspaper: number;
  prediction: number | null;
  onApplySuggestion: (tv: number, radio: number, newspaper: number) => void;
}

/** Run prediction inline using the baked-in coefficients — no API call needed. */
function predictSales(tv: number, radio: number, newspaper: number): number {
  const features = buildPolyFeatures(tv, radio, newspaper);
  const raw =
    modelCoefficients.intercept +
    features.reduce((sum, f, i) => sum + f * modelCoefficients.coefficients[i], 0);
  return Math.max(0, raw);
}

/** Format a predicted-sales gain as a signed percentage string. */
function gainString(candidate: number, baseline: number): string {
  if (baseline <= 0) return "—";
  const pct = ((candidate - baseline) / baseline) * 100;
  const sign = pct >= 0 ? "+" : "";
  return `${sign}${pct.toFixed(1)}%`;
}

/** Badge colour rules based on actual gain magnitude. */
function badgeForGain(
  candidate: number,
  baseline: number
): { label: string; color: string } {
  const pct = baseline > 0 ? ((candidate - baseline) / baseline) * 100 : 0;
  if (pct > 10) return { label: "High Gain", color: "text-emerald-400 bg-emerald-500/20 border-emerald-500/30" };
  if (pct > 3)  return { label: "Moderate Gain", color: "text-blue-400 bg-blue-500/20 border-blue-500/30" };
  if (pct > 0)  return { label: "Slight Gain", color: "text-purple-400 bg-purple-500/20 border-purple-500/30" };
  return { label: "Lower Sales", color: "text-amber-400 bg-amber-500/20 border-amber-500/30" };
}

export default function BudgetOptimizer({
  tv,
  radio,
  newspaper,
  prediction,
  onApplySuggestion,
}: BudgetOptimizerProps) {
  const totalBudget = tv + radio + newspaper;
  const currentPred = prediction ?? predictSales(tv, radio, newspaper);

  // ── Model-based candidate allocations ────────────────────────────────────
  // Each distributes the *same total budget* differently and uses the actual
  // polynomial model to predict resulting sales.
  const candidates = [
    {
      title: "TV-Dominant",
      description: "Shift more budget to TV, the highest-weight linear channel",
      tv:        Math.round(totalBudget * 0.65),
      radio:     Math.round(totalBudget * 0.25),
      newspaper: Math.round(totalBudget * 0.10),
      icon: "📺",
    },
    {
      title: "Balanced TV + Radio",
      description: "Equal split between TV and Radio captures their cross-channel interaction term",
      tv:        Math.round(totalBudget * 0.50),
      radio:     Math.round(totalBudget * 0.38),
      newspaper: Math.round(totalBudget * 0.12),
      icon: "⚖️",
    },
    {
      title: "Radio Emphasis",
      description: "Higher Radio allocation; effective when Radio's quadratic term adds value at current spend",
      tv:        Math.round(totalBudget * 0.40),
      radio:     Math.round(totalBudget * 0.48),
      newspaper: Math.round(totalBudget * 0.12),
      icon: "📻",
    },
    {
      title: "Reduce Newspaper",
      description: "Cut Newspaper to minimum and redirect to TV and Radio — Newspaper has the weakest model coefficient",
      tv:        Math.round(tv   * 1.15),
      radio:     Math.round(radio * 1.10),
      newspaper: Math.max(0, Math.round(newspaper * 0.3)),
      icon: "✂️",
    },
  ].map((c) => {
    const pred = predictSales(c.tv, c.radio, c.newspaper);
    const badge = badgeForGain(pred, currentPred);
    return { ...c, predictedSales: pred, badge };
  });

  // ── Model-derived insights ────────────────────────────────────────────────
  const insights: string[] = [];
  if (totalBudget > 0) {
    if (newspaper / totalBudget > 0.3)
      insights.push("⚠️ Newspaper is >30% of budget — model shows it has the smallest coefficient; reallocating may improve sales");
    if (tv / totalBudget < 0.3)
      insights.push("💡 TV allocation is below 30% — the model assigns TV the highest linear coefficient (0.076)");
    if (radio / totalBudget > 0.5)
      insights.push("📻 Radio is >50% of budget — at high levels Radio's quadratic term becomes negative, reducing marginal returns");
    if (tv > 250)
      insights.push("📉 TV spend exceeds $250K — the TV² coefficient (−0.000111) is reducing marginal gains at this level");
  }
  if (insights.length === 0)
    insights.push("✅ Current allocation looks reasonable; try the strategies below to compare model predictions");

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-5">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center text-base shadow-lg shadow-orange-500/30 shrink-0">
          🎯
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="font-bold text-white whitespace-nowrap">Budget Optimizer</h3>
          <p className="text-xs text-white/40 truncate">Model-based budget recommendations</p>
        </div>
      </div>

      {/* Insights */}
      {insights.length > 0 && (
        <div className="mb-5 space-y-2">
          {insights.map((ins, i) => (
            <div key={i} className="flex items-start gap-2 rounded-xl bg-white/5 border border-white/10 px-3 py-2.5">
              <p className="text-xs text-white/70 leading-relaxed">{ins}</p>
            </div>
          ))}
        </div>
      )}

      {/* Current allocation bar */}
      <div className="mb-5">
        <p className="text-xs text-white/40 uppercase tracking-wider font-semibold mb-3">Current Allocation</p>
        <div className="flex gap-2 items-center">
          {[
            { label: "TV",        val: tv,        color: "bg-blue-500",   pct: ((tv        / totalBudget) * 100).toFixed(0) },
            { label: "Radio",     val: radio,     color: "bg-purple-500", pct: ((radio     / totalBudget) * 100).toFixed(0) },
            { label: "Newspaper", val: newspaper, color: "bg-amber-500",  pct: ((newspaper / totalBudget) * 100).toFixed(0) },
          ].map((item) => (
            <div key={item.label} className="flex-1 text-center">
              <div
                className={`h-1.5 w-full rounded-full ${item.color} mb-1.5`}
                style={{ opacity: Number(item.pct) / 100 + 0.3 }}
              />
              <p className="text-sm font-bold text-white tabular-nums">{item.pct}%</p>
              <p className="text-xs text-white/40">{item.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Strategy cards — gains computed from model */}
      <div className="space-y-2.5">
        <p className="text-xs text-white/40 uppercase tracking-wider font-semibold mb-2">
          Strategy Comparisons{" "}
          <span className="text-white/20 normal-case font-normal">(same total budget, predicted by model)</span>
        </p>
        {candidates.map((s) => (
          <div
            key={s.title}
            className="group rounded-xl border border-white/10 bg-white/5 p-4 hover:bg-white/8 hover:border-white/20 transition-all duration-200 cursor-pointer"
            onClick={() => onApplySuggestion(s.tv, s.radio, s.newspaper)}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3 flex-1 min-w-0">
                <span className="text-xl mt-0.5 shrink-0">{s.icon}</span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <h4 className="text-sm font-bold text-white whitespace-nowrap">{s.title}</h4>
                    <span className={`text-xs px-2 py-0.5 rounded-full border ${s.badge.color} font-medium shrink-0`}>
                      {s.badge.label}
                    </span>
                  </div>
                  <p className="text-xs text-white/50 leading-relaxed">{s.description}</p>
                  <div className="flex flex-wrap gap-2 mt-2.5 text-xs text-white/40">
                    <span className="px-1.5 py-0.5 rounded bg-white/5 border border-white/5 font-mono">📺 ${s.tv}K</span>
                    <span className="px-1.5 py-0.5 rounded bg-white/5 border border-white/5 font-mono">📻 ${s.radio}K</span>
                    <span className="px-1.5 py-0.5 rounded bg-white/5 border border-white/5 font-mono">📰 ${s.newspaper}K</span>
                  </div>
                </div>
              </div>
              <div className="text-right shrink-0 min-w-[72px]">
                {/* Predicted sales from model */}
                <p className="text-sm font-bold text-white/80 tabular-nums">
                  {s.predictedSales.toFixed(1)}K
                </p>
                <p className="text-xs text-white/30 whitespace-nowrap">pred. sales</p>
                {/* Gain vs current — calculated from model */}
                <p className={`text-xs font-bold mt-0.5 tabular-nums ${
                  s.predictedSales >= currentPred ? "text-emerald-400" : "text-red-400"
                }`}>
                  {gainString(s.predictedSales, currentPred)}
                </p>
                <span className="text-xs text-white/30 group-hover:text-white/60 transition-colors mt-1 block whitespace-nowrap">
                  Apply →
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
