"use client";

interface ModelStatsProps {
  stats: {
    r2_train: number;
    r2_test: number;
    rmse_train: number;
    rmse_test: number;
  };
  featureImportance: Record<string, number>;
}

function GaugeBar({ value, max = 100, color }: { value: number; max?: number; color: string }) {
  const pct = Math.min((value / max) * 100, 100);
  return (
    <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
      <div
        className={`h-full ${color} rounded-full transition-all duration-700`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

export default function ModelStats({ stats, featureImportance }: ModelStatsProps) {
  const r2Pct = (stats.r2_test * 100).toFixed(1);

  // Top 5 features by importance
  const topFeatures = Object.entries(featureImportance)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 6);

  const maxImportance = Math.max(...topFeatures.map(([, v]) => v));

  const metricColor = (val: number, inverse = false) => {
    if (inverse) return val < 1.5 ? "text-emerald-400" : val < 2.5 ? "text-amber-400" : "text-red-400";
    return val > 0.9 ? "text-emerald-400" : val > 0.8 ? "text-blue-400" : "text-amber-400";
  };

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-base shadow-lg shadow-emerald-500/30 shrink-0">
          🎯
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="font-bold text-white whitespace-nowrap">Model Performance</h3>
          <p className="text-xs text-white/40 truncate">Degree-2 Polynomial Regression</p>
        </div>
        <div className="ml-auto text-right shrink-0">
          <span className="text-2xl font-black text-emerald-400">{r2Pct}%</span>
          <p className="text-xs text-white/40">Test R²</p>
        </div>
      </div>

      {/* 4 metrics */}
      <div className="grid grid-cols-2 gap-3">
        {[
          { label: "Train R²", value: stats.r2_train, fmt: (v: number) => v.toFixed(4), color: metricColor(stats.r2_train) },
          { label: "Test R²", value: stats.r2_test, fmt: (v: number) => v.toFixed(4), color: metricColor(stats.r2_test) },
          { label: "Train RMSE", value: stats.rmse_train, fmt: (v: number) => v.toFixed(4), color: metricColor(stats.rmse_train, true) },
          { label: "Test RMSE", value: stats.rmse_test, fmt: (v: number) => v.toFixed(4), color: metricColor(stats.rmse_test, true) },
        ].map((m) => (
          <div key={m.label} className="rounded-xl bg-white/5 border border-white/10 p-3">
            <p className="text-xs text-white/40 mb-1">{m.label}</p>
            <p className={`text-xl font-bold ${m.color} tabular-nums`}>{m.fmt(m.value)}</p>
            <GaugeBar
              value={m.label.includes("R²") ? m.value * 100 : (3 - m.value) * 40}
              color={m.label.includes("R²") ? "bg-emerald-500" : "bg-blue-500"}
            />
          </div>
        ))}
      </div>

      {/* Feature importance */}
      <div>
        <p className="text-xs text-white/40 uppercase tracking-wider mb-3 font-semibold">Feature Importance</p>
        <div className="space-y-2.5">
          {topFeatures.map(([name, val]) => {
            const pct = (val / maxImportance) * 100;
            const colors = [
              "bg-blue-500", "bg-purple-500", "bg-cyan-500",
              "bg-emerald-500", "bg-amber-500", "bg-pink-500",
            ];
            const ci = topFeatures.findIndex(([n]) => n === name);
            return (
              <div key={name} className="flex items-center gap-3">
                <span className="text-xs text-white/60 w-32 shrink-0 font-mono">{name}</span>
                <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${colors[ci % colors.length]} rounded-full transition-all duration-700`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span className="text-xs text-white/60 w-14 text-right shrink-0 tabular-nums">{val.toFixed(1)}%</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Model info badges */}
      <div className="flex flex-wrap gap-2 pt-1">
        {[
          { label: "Degree 2", icon: "∂" },
          { label: "9 Features", icon: "⚙" },
          { label: "200 Rows", icon: "📦" },
          { label: "No Scaling", icon: "⚡" },
        ].map((badge) => (
          <span
            key={badge.label}
            className="text-xs px-2.5 py-1 rounded-full border border-white/10 bg-white/5 text-white/50 font-medium"
          >
            {badge.icon} {badge.label}
          </span>
        ))}
      </div>
    </div>
  );
}
