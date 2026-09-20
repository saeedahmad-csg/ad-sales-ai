"use client";

import modelStats from "@/data/model_stats.json";
import modelCoefficients from "@/data/model_coefficients.json";

/**
 * Compact Model Information card — all values sourced from trained model JSON.
 * No hardcoded metrics.
 */
export default function ModelInfo() {
  const { model, performance } = modelStats;
  const featureCount = modelCoefficients.feature_names.length;

  const rows: { label: string; value: string }[] = [
    { label: "Dataset",            value: "Advertising Dataset (Kaggle)" },
    { label: "Samples",            value: `${model.n_training_samples + model.n_test_samples} (${model.n_training_samples} train / ${model.n_test_samples} test)` },
    { label: "Model",              value: model.type },
    { label: "Degree",             value: String(model.degree) },
    { label: "Input Features",     value: "TV, Radio, Newspaper" },
    { label: "Polynomial Features", value: `${featureCount} (degree-${model.degree} expansion)` },
    { label: "Test R²",            value: `${(performance.r2_test * 100).toFixed(2)}%` },
    { label: "Test RMSE",          value: `${performance.rmse_test} K units` },
  ];

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-slate-600 to-slate-700 flex items-center justify-center text-base shadow-lg shrink-0">
          🔬
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="font-bold text-white whitespace-nowrap">Model Information</h3>
          <p className="text-xs text-white/40 truncate">All metrics from the trained model</p>
        </div>
      </div>

      {/* Info table */}
      <div className="divide-y divide-white/5">
        {rows.map((row) => (
          <div key={row.label} className="flex items-center justify-between py-2.5 gap-4">
            <span className="text-xs text-white/40 shrink-0 font-medium">{row.label}</span>
            <span className="text-xs text-white/80 font-semibold text-right tabular-nums">{row.value}</span>
          </div>
        ))}
      </div>

      {/* R² visual gauge */}
      <div className="mt-4 pt-3 border-t border-white/5">
        <div className="flex justify-between text-xs text-white/40 mb-1.5">
          <span>Model Accuracy</span>
          <span className="text-emerald-400 font-bold">{(performance.r2_test * 100).toFixed(1)}% R²</span>
        </div>
        <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-blue-500 to-emerald-500 rounded-full transition-all duration-700"
            style={{ width: `${performance.r2_test * 100}%` }}
          />
        </div>
        <p className="text-xs text-white/25 mt-1.5">
          The model explains {(performance.r2_test * 100).toFixed(1)}% of sales variance in the test set
        </p>
      </div>
    </div>
  );
}
