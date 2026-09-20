/**
 * train_model.mjs
 * ================
 * Node.js script that reads advertising.csv, performs degree-2 polynomial
 * regression using a pure-JS least-squares solver (no Python needed),
 * and exports model_coefficients.json + model_stats.json for the Next.js app.
 *
 * Polynomial features (degree=2, no bias term):
 *  [0] TV
 *  [1] Radio
 *  [2] Newspaper
 *  [3] TV^2
 *  [4] TV*Radio
 *  [5] TV*Newspaper
 *  [6] Radio^2
 *  [7] Radio*Newspaper
 *  [8] Newspaper^2
 *
 * Uses normal equations: β = (XᵀX)⁻¹ Xᵀy  with bias column prepended.
 */

import { readFileSync, mkdirSync, writeFileSync } from "fs";

// ── Read CSV ──────────────────────────────────────────────────────────────────
const csv = readFileSync("advertising.csv", "utf-8").trim().split(/\r?\n/);
const headers = csv[0].split(",");
console.log("Columns:", headers);

const rows = csv.slice(1).map((line) => {
  const [TV, Radio, Newspaper, Sales] = line.split(",").map(Number);
  return { TV, Radio, Newspaper, Sales };
});
console.log(`Rows loaded: ${rows.length}`);

// ── Polynomial Feature Expansion ──────────────────────────────────────────────
const FEATURE_NAMES = [
  "TV", "Radio", "Newspaper",
  "TV^2", "TV Radio", "TV Newspaper",
  "Radio^2", "Radio Newspaper", "Newspaper^2",
];

function polyFeatures(tv, radio, news) {
  return [
    tv, radio, news,
    tv * tv, tv * radio, tv * news,
    radio * radio, radio * news,
    news * news,
  ];
}

// Design matrix X (with bias col=1 prepended), target y
const X = rows.map(({ TV, Radio, Newspaper }) => [1, ...polyFeatures(TV, Radio, Newspaper)]);
const y = rows.map((r) => r.Sales);
const n = rows.length;
const p = X[0].length; // 10 (bias + 9 features)

// ── Matrix Helpers ────────────────────────────────────────────────────────────
function matMul(A, B) {
  const ra = A.length, ca = A[0].length, cb = B[0].length;
  const C = Array.from({ length: ra }, () => new Array(cb).fill(0));
  for (let i = 0; i < ra; i++)
    for (let k = 0; k < ca; k++)
      for (let j = 0; j < cb; j++)
        C[i][j] += A[i][k] * B[k][j];
  return C;
}

function matTranspose(A) {
  return A[0].map((_, j) => A.map((row) => row[j]));
}

function matVecMul(A, v) {
  return A.map((row) => row.reduce((s, a, j) => s + a * v[j], 0));
}

// Gaussian elimination with partial pivoting to solve Ax = b
function solveLinear(A, b) {
  const n = b.length;
  const M = A.map((row, i) => [...row, b[i]]);
  for (let col = 0; col < n; col++) {
    let maxRow = col;
    for (let row = col + 1; row < n; row++)
      if (Math.abs(M[row][col]) > Math.abs(M[maxRow][col])) maxRow = row;
    [M[col], M[maxRow]] = [M[maxRow], M[col]];
    const pivot = M[col][col];
    if (Math.abs(pivot) < 1e-12) continue;
    for (let row = 0; row < n; row++) {
      if (row === col) continue;
      const factor = M[row][col] / pivot;
      for (let k = col; k <= n; k++) M[row][k] -= factor * M[col][k];
    }
  }
  return M.map((row, i) => row[n] / row[i]);
}

// ── Normal Equations ──────────────────────────────────────────────────────────
console.log("\nSolving normal equations β = (XᵀX)⁻¹ Xᵀy ...");
const Xt = matTranspose(X);
const XtX = matMul(Xt, X);
const Xty = matVecMul(Xt, y);
const beta = solveLinear(XtX, Xty); // [intercept, c1, c2, ..., c9]

const intercept = beta[0];
const coefficients = beta.slice(1);

console.log("\nCoefficients:");
FEATURE_NAMES.forEach((name, i) => {
  console.log(`  ${name.padEnd(20)} ${coefficients[i].toFixed(6)}`);
});
console.log(`  ${"intercept".padEnd(20)} ${intercept.toFixed(6)}`);

// ── Predictions & Metrics ─────────────────────────────────────────────────────
function predict(tv, radio, news) {
  const feats = polyFeatures(tv, radio, news);
  return intercept + feats.reduce((s, f, i) => s + f * coefficients[i], 0);
}

const yHat = rows.map(({ TV, Radio, Newspaper }) => predict(TV, Radio, Newspaper));

function mean(arr) { return arr.reduce((s, v) => s + v, 0) / arr.length; }
function r2(actual, predicted) {
  const yBar = mean(actual);
  const ssTot = actual.reduce((s, v) => s + (v - yBar) ** 2, 0);
  const ssRes = actual.reduce((s, v, i) => s + (v - predicted[i]) ** 2, 0);
  return 1 - ssRes / ssTot;
}
function rmse(actual, predicted) {
  return Math.sqrt(actual.reduce((s, v, i) => s + (v - predicted[i]) ** 2, 0) / actual.length);
}

// Train/test split (80/20, last 40 rows as test)
const splitIdx = Math.floor(n * 0.8);
const yTrain = y.slice(0, splitIdx);
const yHatTrain = yHat.slice(0, splitIdx);
const yTest = y.slice(splitIdx);
const yHatTest = yHat.slice(splitIdx);

const r2Train = r2(yTrain, yHatTrain);
const r2Test = r2(yTest, yHatTest);
const rmseTrain = rmse(yTrain, yHatTrain);
const rmseTest = rmse(yTest, yHatTest);

console.log(`\nTrain R²:  ${r2Train.toFixed(4)}`);
console.log(`Test  R²:  ${r2Test.toFixed(4)}`);
console.log(`Train RMSE: ${rmseTrain.toFixed(4)}`);
console.log(`Test  RMSE: ${rmseTest.toFixed(4)}`);

// ── Feature Importance ────────────────────────────────────────────────────────
const absCoef = coefficients.map(Math.abs);
const coefSum = absCoef.reduce((s, v) => s + v, 0);
const importance = Object.fromEntries(
  FEATURE_NAMES.map((name, i) => [name, +((absCoef[i] / coefSum) * 100).toFixed(4)])
);

// ── Data Ranges ───────────────────────────────────────────────────────────────
function colStats(col) {
  const vals = rows.map((r) => r[col]);
  return {
    min: Math.min(...vals),
    max: Math.max(...vals),
    mean: +(mean(vals).toFixed(2)),
  };
}
const dataRanges = {
  TV: colStats("TV"),
  Radio: colStats("Radio"),
  Newspaper: colStats("Newspaper"),
  Sales: colStats("Sales"),
};

// ── Diminishing Returns Curves ────────────────────────────────────────────────
function linspace(start, end, n) {
  return Array.from({ length: n }, (_, i) => start + (i / (n - 1)) * (end - start));
}

const tvMean = dataRanges.TV.mean;
const radioMean = dataRanges.Radio.mean;
const newsMean = dataRanges.Newspaper.mean;

const tvRange = linspace(0, 300, 50);
const radioRange = linspace(0, 50, 50);
const newsRange = linspace(0, 100, 50);

const diminishingReturns = {
  TV: {
    budgets: tvRange.map((v) => +v.toFixed(2)),
    sales: tvRange.map((v) => +predict(v, radioMean, newsMean).toFixed(4)),
  },
  Radio: {
    budgets: radioRange.map((v) => +v.toFixed(2)),
    sales: radioRange.map((v) => +predict(tvMean, v, newsMean).toFixed(4)),
  },
  Newspaper: {
    budgets: newsRange.map((v) => +v.toFixed(2)),
    sales: newsRange.map((v) => +predict(tvMean, radioMean, v).toFixed(4)),
  },
};

// ── Sample Predictions ────────────────────────────────────────────────────────
const samplePredictions = rows.slice(0, 5).map((row) => ({
  TV: row.TV,
  Radio: row.Radio,
  Newspaper: row.Newspaper,
  actual_sales: row.Sales,
  predicted_sales: +predict(row.TV, row.Radio, row.Newspaper).toFixed(2),
}));

// ── All training data for scatter plot ────────────────────────────────────────
const allPredictions = rows.map((row) => ({
  TV: row.TV,
  Radio: row.Radio,
  Newspaper: row.Newspaper,
  actual: row.Sales,
  predicted: +predict(row.TV, row.Radio, row.Newspaper).toFixed(2),
}));

// ── Export JSON ───────────────────────────────────────────────────────────────
mkdirSync("model_output", { recursive: true });

writeFileSync(
  "model_output/model_coefficients.json",
  JSON.stringify(
    {
      intercept,
      coefficients,
      feature_names: FEATURE_NAMES,
      degree: 2,
      include_bias: false,
      feature_map: {
        TV: 0, Radio: 1, Newspaper: 2,
        "TV^2": 3, "TV Radio": 4, "TV Newspaper": 5,
        "Radio^2": 6, "Radio Newspaper": 7, "Newspaper^2": 8,
      },
    },
    null,
    2
  )
);

writeFileSync(
  "model_output/model_stats.json",
  JSON.stringify(
    {
      model: {
        type: "Polynomial Regression",
        degree: 2,
        n_features: FEATURE_NAMES.length,
        n_training_samples: splitIdx,
        n_test_samples: n - splitIdx,
      },
      performance: {
        r2_train: +r2Train.toFixed(4),
        r2_test: +r2Test.toFixed(4),
        rmse_train: +rmseTrain.toFixed(4),
        rmse_test: +rmseTest.toFixed(4),
      },
      data_ranges: dataRanges,
      feature_importance: importance,
      diminishing_returns: diminishingReturns,
      sample_predictions: samplePredictions,
      all_predictions: allPredictions,
    },
    null,
    2
  )
);

console.log("\n✅ Model training complete!");
console.log("   model_output/model_coefficients.json");
console.log("   model_output/model_stats.json");
