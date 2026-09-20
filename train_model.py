"""
Polynomial Regression Model Trainer
====================================
Trains a degree-2 polynomial regression on the Advertising dataset
(TV, Radio, Newspaper -> Sales) and exports model coefficients + stats
as JSON for use in the Next.js application at runtime.

Features generated (degree=2, include_bias=False):
  Index | Feature
  0     | TV
  1     | Radio
  2     | Newspaper
  3     | TV^2
  4     | TV * Radio
  5     | TV * Newspaper
  6     | Radio^2
  7     | Radio * Newspaper
  8     | Newspaper^2
"""

import json
import os
import numpy as np
import pandas as pd
from sklearn.linear_model import LinearRegression
from sklearn.metrics import mean_squared_error, r2_score
from sklearn.model_selection import cross_val_score, train_test_split
from sklearn.preprocessing import PolynomialFeatures

# ── Configuration ─────────────────────────────────────────────────────────────
DATASET_PATH = "advertising.csv"
OUTPUT_DIR = "model_output"
POLY_DEGREE = 2
RANDOM_STATE = 42
TEST_SIZE = 0.2

# ── Load Data ─────────────────────────────────────────────────────────────────
print("Loading dataset...")
df = pd.read_csv(DATASET_PATH)
print(f"  Shape: {df.shape}")
print(f"  Columns: {list(df.columns)}")
print(df.describe().round(2).to_string())

X = df[["TV", "Radio", "Newspaper"]].values
y = df["Sales"].values

# ── Polynomial Feature Expansion ──────────────────────────────────────────────
print(f"\nApplying degree-{POLY_DEGREE} polynomial feature expansion...")
poly = PolynomialFeatures(degree=POLY_DEGREE, include_bias=False)
X_poly = poly.fit_transform(X)
feature_names = poly.get_feature_names_out(["TV", "Radio", "Newspaper"])
print(f"  Features ({len(feature_names)}): {list(feature_names)}")

# ── Train / Test Split ────────────────────────────────────────────────────────
X_train, X_test, y_train, y_test = train_test_split(
    X_poly, y, test_size=TEST_SIZE, random_state=RANDOM_STATE
)
print(f"\nTrain size: {len(X_train)}, Test size: {len(X_test)}")

# ── Train Model ───────────────────────────────────────────────────────────────
print("\nTraining polynomial regression model...")
model = LinearRegression()
model.fit(X_train, y_train)

# ── Evaluate ──────────────────────────────────────────────────────────────────
y_pred_test = model.predict(X_test)
y_pred_train = model.predict(X_train)

r2_test = r2_score(y_test, y_pred_test)
r2_train = r2_score(y_train, y_pred_train)
rmse_test = np.sqrt(mean_squared_error(y_test, y_pred_test))
rmse_train = np.sqrt(mean_squared_error(y_train, y_pred_train))

# Cross-validation (5-fold)
cv_scores = cross_val_score(
    LinearRegression(), X_poly, y, cv=5, scoring="r2"
)

print(f"\n  Train R²:      {r2_train:.4f}")
print(f"  Test  R²:      {r2_test:.4f}")
print(f"  Train RMSE:    {rmse_train:.4f}")
print(f"  Test  RMSE:    {rmse_test:.4f}")
print(f"  CV R² (5-fold): {cv_scores.mean():.4f} ± {cv_scores.std():.4f}")

# ── Feature Importance (absolute coefficient magnitude, normalized) ────────────
coef_abs = np.abs(model.coef_)
importance = (coef_abs / coef_abs.sum() * 100).tolist()

# ── Compute Diminishing Returns Data ─────────────────────────────────────────
# For each channel, vary that channel's budget while fixing others at their mean
tv_mean = df["TV"].mean()
radio_mean = df["Radio"].mean()
news_mean = df["Newspaper"].mean()

def predict_single(tv, radio, newspaper):
    """Run a single prediction using the trained model."""
    x = np.array([[tv, radio, newspaper]])
    x_p = poly.transform(x)
    return float(model.predict(x_p)[0])

# Generate diminishing returns curves (50 points each)
tv_range = np.linspace(0, 300, 50).tolist()
radio_range = np.linspace(0, 50, 50).tolist()
news_range = np.linspace(0, 100, 50).tolist()

tv_sales = [predict_single(tv, radio_mean, news_mean) for tv in tv_range]
radio_sales = [predict_single(tv_mean, r, news_mean) for r in radio_range]
news_sales = [predict_single(tv_mean, radio_mean, n) for n in news_range]

diminishing_returns = {
    "TV": {"budgets": [round(v, 2) for v in tv_range], "sales": [round(v, 4) for v in tv_sales]},
    "Radio": {"budgets": [round(v, 2) for v in radio_range], "sales": [round(v, 4) for v in radio_sales]},
    "Newspaper": {"budgets": [round(v, 2) for v in news_range], "sales": [round(v, 4) for v in news_sales]},
}

# ── Sample Predictions (for UI verification) ─────────────────────────────────
sample_predictions = []
for _, row in df.head(5).iterrows():
    pred = predict_single(row["TV"], row["Radio"], row["Newspaper"])
    sample_predictions.append({
        "TV": round(float(row["TV"]), 1),
        "Radio": round(float(row["Radio"]), 1),
        "Newspaper": round(float(row["Newspaper"]), 1),
        "actual_sales": round(float(row["Sales"]), 1),
        "predicted_sales": round(pred, 2),
    })

# ── Export Coefficients ───────────────────────────────────────────────────────
os.makedirs(OUTPUT_DIR, exist_ok=True)

coefficients_data = {
    "intercept": float(model.intercept_),
    "coefficients": [float(c) for c in model.coef_],
    "feature_names": list(feature_names),
    "degree": POLY_DEGREE,
    "include_bias": False,
    # Mapping for JS feature reconstruction (must match PolynomialFeatures order)
    "feature_map": {
        "TV":               0,
        "Radio":            1,
        "Newspaper":        2,
        "TV^2":             3,
        "TV Radio":         4,
        "TV Newspaper":     5,
        "Radio^2":          6,
        "Radio Newspaper":  7,
        "Newspaper^2":      8,
    }
}

with open(f"{OUTPUT_DIR}/model_coefficients.json", "w") as f:
    json.dump(coefficients_data, f, indent=2)
print(f"\nCoefficients exported → {OUTPUT_DIR}/model_coefficients.json")

# ── Export Stats ──────────────────────────────────────────────────────────────
stats_data = {
    "model": {
        "type": "Polynomial Regression",
        "degree": POLY_DEGREE,
        "n_features": len(feature_names),
        "n_training_samples": int(len(X_train)),
        "n_test_samples": int(len(X_test)),
    },
    "performance": {
        "r2_train": round(float(r2_train), 4),
        "r2_test": round(float(r2_test), 4),
        "rmse_train": round(float(rmse_train), 4),
        "rmse_test": round(float(rmse_test), 4),
        "cv_r2_mean": round(float(cv_scores.mean()), 4),
        "cv_r2_std": round(float(cv_scores.std()), 4),
    },
    "data_ranges": {
        "TV":        {"min": float(df["TV"].min()),        "max": float(df["TV"].max()),        "mean": round(float(df["TV"].mean()), 2)},
        "Radio":     {"min": float(df["Radio"].min()),     "max": float(df["Radio"].max()),     "mean": round(float(df["Radio"].mean()), 2)},
        "Newspaper": {"min": float(df["Newspaper"].min()), "max": float(df["Newspaper"].max()), "mean": round(float(df["Newspaper"].mean()), 2)},
        "Sales":     {"min": float(df["Sales"].min()),     "max": float(df["Sales"].max()),     "mean": round(float(df["Sales"].mean()), 2)},
    },
    "feature_importance": {
        name: round(imp, 4)
        for name, imp in zip(feature_names, importance)
    },
    "diminishing_returns": diminishing_returns,
    "sample_predictions": sample_predictions,
}

with open(f"{OUTPUT_DIR}/model_stats.json", "w") as f:
    json.dump(stats_data, f, indent=2)
print(f"Stats exported        → {OUTPUT_DIR}/model_stats.json")

print("\n✅ Model training complete!")
print(f"   Test R²:   {r2_test:.4f}")
print(f"   Test RMSE: {rmse_test:.4f} (units: thousand dollars)")
