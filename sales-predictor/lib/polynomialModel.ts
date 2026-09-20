/**
 * Polynomial Model — shared prediction logic
 * Mirrors the exact feature order used in train_model.mjs
 * Features: [TV, Radio, Newspaper, TV^2, TV*Radio, TV*Newspaper, Radio^2, Radio*Newspaper, Newspaper^2]
 */

import modelStats from "@/data/model_stats.json";

// Use actual test RMSE from the trained model — not hardcoded
const TEST_RMSE = modelStats.performance.rmse_test;

export interface ModelCoefficients {
  intercept: number;
  coefficients: number[];
  feature_names: string[];
  degree: number;
}

export interface PredictionResult {
  prediction: number;
  breakdown: { feature: string; contribution: number; coefficient: number }[];
  confidence_low: number;
  confidence_high: number;
}

export function buildPolyFeatures(tv: number, radio: number, newspaper: number): number[] {
  return [
    tv,
    radio,
    newspaper,
    tv * tv,
    tv * radio,
    tv * newspaper,
    radio * radio,
    radio * newspaper,
    newspaper * newspaper,
  ];
}

export function runPrediction(
  tv: number,
  radio: number,
  newspaper: number,
  model: ModelCoefficients
): PredictionResult {
  const features = buildPolyFeatures(tv, radio, newspaper);
  let prediction = model.intercept;
  const breakdown = features.map((f, i) => {
    const contribution = f * model.coefficients[i];
    prediction += contribution;
    return {
      feature: model.feature_names[i],
      contribution,
      coefficient: model.coefficients[i],
    };
  });

  // Confidence interval: ±1.5 × actual test RMSE from trained model
  return {
    prediction: Math.max(0, prediction),
    breakdown,
    confidence_low: Math.max(0, prediction - 1.5 * TEST_RMSE),
    confidence_high: prediction + 1.5 * TEST_RMSE,
  };
}

export function computeDiminishingReturns(
  channel: "TV" | "Radio" | "Newspaper",
  model: ModelCoefficients,
  fixedValues: { tv: number; radio: number; newspaper: number },
  points = 60
): { budget: number; sales: number }[] {
  const ranges: Record<string, [number, number]> = {
    TV: [0, 300],
    Radio: [0, 50],
    Newspaper: [0, 100],
  };
  const [min, max] = ranges[channel];
  return Array.from({ length: points }, (_, i) => {
    const budget = min + (i / (points - 1)) * (max - min);
    const tv = channel === "TV" ? budget : fixedValues.tv;
    const radio = channel === "Radio" ? budget : fixedValues.radio;
    const newspaper = channel === "Newspaper" ? budget : fixedValues.newspaper;
    const { prediction } = runPrediction(tv, radio, newspaper, model);
    return { budget: +budget.toFixed(2), sales: +prediction.toFixed(3) };
  });
}
