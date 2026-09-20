"use client";

import { useState, useRef, useEffect } from "react";

interface BudgetInputCardProps {
  channel: "TV" | "Radio" | "Newspaper";
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  mean: number;
  color: string;
  icon: string;
  description: string;
}

const CHANNEL_CONFIG = {
  TV: {
    gradient: "from-blue-500 to-cyan-400",
    glow: "shadow-blue-500/30",
    track: "bg-blue-500",
    ring: "ring-blue-500/50",
    text: "text-blue-400",
    badge: "bg-blue-500/20 text-blue-300 border-blue-500/30",
  },
  Radio: {
    gradient: "from-purple-500 to-pink-400",
    glow: "shadow-purple-500/30",
    track: "bg-purple-500",
    ring: "ring-purple-500/50",
    text: "text-purple-400",
    badge: "bg-purple-500/20 text-purple-300 border-purple-500/30",
  },
  Newspaper: {
    gradient: "from-amber-500 to-orange-400",
    glow: "shadow-amber-500/30",
    track: "bg-amber-500",
    ring: "ring-amber-500/50",
    text: "text-amber-400",
    badge: "bg-amber-500/20 text-amber-300 border-amber-500/30",
  },
};

export default function BudgetInputCard({
  channel,
  value,
  onChange,
  min,
  max,
  mean,
  color,
  icon,
  description,
}: BudgetInputCardProps) {
  const cfg = CHANNEL_CONFIG[channel];
  const pct = ((value - min) / (max - min)) * 100;
  const meanPct = ((mean - min) / (max - min)) * 100;

  const getZoneLabel = () => {
    if (pct < 33) return { label: "Low Spend", color: "text-emerald-400" };
    if (pct < 66) return { label: "Optimal Zone", color: "text-blue-400" };
    return { label: "Diminishing Returns", color: "text-amber-400" };
  };

  const zone = getZoneLabel();

  return (
    <div
      className={`group relative rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-6 transition-all duration-300 hover:border-white/20 hover:bg-white/8 hover:shadow-2xl ${cfg.glow}`}
    >
      {/* Subtle gradient top border */}
      <div className={`absolute inset-x-0 top-0 h-px bg-gradient-to-r ${cfg.gradient} rounded-t-2xl opacity-70`} />

      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <span className="text-2xl">{icon}</span>
          <div>
            <h3 className="font-bold text-white text-lg tracking-tight">{channel}</h3>
            <p className="text-xs text-white/40">{description}</p>
          </div>
        </div>
        <span className={`text-xs px-3 py-1 rounded-full border ${cfg.badge} font-medium`}>
          {zone.label}
        </span>
      </div>

      {/* Value display */}
      <div className="flex items-end justify-between mb-4">
        <div>
          <span className={`text-4xl font-black ${cfg.text} tabular-nums transition-all duration-200`}>
            ${value.toFixed(0)}K
          </span>
        </div>
        <div className="text-right">
          <p className="text-xs text-white/40">avg. spend</p>
          <p className="text-sm text-white/60 font-semibold">${mean}K</p>
        </div>
      </div>

      {/* Custom Slider */}
      <div className="relative mb-4">
        {/* Mean marker */}
        <div
          className="absolute top-1/2 -translate-y-1/2 w-0.5 h-5 bg-white/30 rounded-full z-10"
          style={{ left: `${meanPct}%` }}
          title={`Industry average: $${mean}K`}
        />
        <input
          type="range"
          min={min}
          max={max}
          step={0.5}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="w-full appearance-none h-2 rounded-full cursor-pointer outline-none"
          style={{
            background: `linear-gradient(to right, var(--slider-fill, #60a5fa) ${pct}%, rgba(255,255,255,0.1) ${pct}%)`,
          }}
        />
      </div>

      {/* Range labels */}
      <div className="flex justify-between text-xs text-white/30">
        <span>${min}K</span>
        <span className="text-white/50 font-medium">{pct.toFixed(0)}% of range</span>
        <span>${max}K</span>
      </div>

      {/* Quick preset buttons */}
      <div className="flex gap-2 mt-4">
        {[
          { label: "Low", val: min + (max - min) * 0.2 },
          { label: "Mid", val: mean },
          { label: "High", val: min + (max - min) * 0.85 },
        ].map((preset) => (
          <button
            key={preset.label}
            onClick={() => onChange(Math.round(preset.val))}
            className="flex-1 py-1.5 rounded-lg text-xs font-semibold border border-white/10 bg-white/5 text-white/60 hover:bg-white/10 hover:text-white hover:border-white/20 transition-all duration-200"
          >
            {preset.label}
          </button>
        ))}
      </div>
    </div>
  );
}
