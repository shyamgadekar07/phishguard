"""
PhishGuard Phase 5: Machine Learning Training Script
====================================================
Academic / Synthetic Experiment Prototype Notice:
This script builds a reproducible, safe baseline prototype for PhishGuard's
Machine Learning & Risk Prediction phase using Python, pandas, NumPy, and scikit-learn.

IMPORTANT DISCLAIMER:
- The dataset generated in this script is strictly synthetic.
- Synthetic risk labels (LOW, MEDIUM, HIGH) are assigned through heuristic
  simulation rules and Gaussian perturbations for academic and demonstration purposes.
- Synthetic labels and experimental model metrics DO NOT establish real-world predictive
  validity and must not be used for production security enforcement without validated,
  ethically sourced, real-world telemetry.
- No real user credentials, passwords, tokens, OTPs, or PII are used or stored.

Features Used:
- simulation_count   : Total simulated phishing campaigns assigned to the user (int >= 1)
- click_rate         : Ratio of simulated phishing emails clicked (float 0.0 - 1.0)
- report_rate        : Ratio of simulated phishing emails proactively reported (float 0.0 - 1.0)
- open_rate          : Ratio of simulated phishing emails opened (float 0.0 - 1.0)
- repeat_click_count : Total number of repeated click incidents across simulations (int >= 0)

Target Classes:
- LOW    : Low phishing susceptibility / good security awareness
- MEDIUM : Moderate susceptibility / inconsistent security behavior
- HIGH   : High phishing susceptibility / recurring vulnerable interactions

How to Run:
From the project root directory (D:\\PROJECT\\phishguard):
    .\\ml-service\\venv\\Scripts\\python.exe ml-service\\train_model.py
or (if your current active environment has scikit-learn, pandas, numpy, and joblib):
    python ml-service/train_model.py
"""

import os
import sys
import argparse
from pathlib import Path
from typing import Tuple, List, Dict, Any

import numpy as np
import pandas as pd
import joblib

from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import (
    accuracy_score,
    precision_recall_fscore_support,
    classification_report,
    confusion_matrix,
)

# ---------------------------------------------------------------------------
# Constants & Configuration
# ---------------------------------------------------------------------------
DEFAULT_RANDOM_SEED = 42
DEFAULT_SAMPLE_SIZE = 2000
CLASS_LABELS: List[str] = ["LOW", "MEDIUM", "HIGH"]
FEATURE_COLUMNS: List[str] = [
    "simulation_count",
    "click_rate",
    "report_rate",
    "open_rate",
    "repeat_click_count",
]


# ---------------------------------------------------------------------------
# Synthetic Dataset Generation
# ---------------------------------------------------------------------------
def generate_synthetic_data(
    num_samples: int = DEFAULT_SAMPLE_SIZE,
    random_state: int = DEFAULT_RANDOM_SEED,
) -> pd.DataFrame:
    """
    Generates a synthetic behavioral dataset for the risk prediction experiment.

    Heuristic Labeling Mechanism:
    - Synthesizes 3 behavioral user archetypes/cohorts:
      1. Low-Risk / High-Security-Awareness (~45%): Low clicks, high proactive reporting.
      2. Moderate-Risk (~35%): Occasional clicks, moderate awareness, average reporting.
      3. High-Risk / High-Susceptibility (~20%): Frequent clicks, repeat interactions, low reporting.
    - Base risk points are synthesized from behavioral signals:
      + Exposure baseline: +15 points
      + Click rate impact: up to +55 points (click_rate / 100 * 55)
      + Repeat clicks: +10 points if repeat_click_count >= 2
      + Open rate impact: up to +10 points (open_rate / 100 * 10)
      - Proactive reporting mitigation: up to -35 points (report_rate / 100 * 35)
      + Stochastic noise: N(0, 4) to simulate human variance and realistic boundary overlap
    - Risk score thresholds:
      * score < 40  -> LOW
      * 40 <= score < 70 -> MEDIUM
      * score >= 70 -> HIGH

    Notice:
    These synthetic rules are an experimental heuristic model for prototyping.
    They do not establish real-world predictive validity.
    """
    if num_samples < 50:
        raise ValueError("num_samples must be at least 50 to allow train/test stratification.")

    rng = np.random.default_rng(random_state)

    # 1. Multi-cohort assignment to ensure balanced behavioral patterns
    cohort_types = rng.choice(
        ["low_risk", "moderate_risk", "high_risk"],
        size=num_samples,
        p=[0.45, 0.35, 0.20],
    )

    simulation_counts = rng.integers(3, 31, size=num_samples)
    open_rates = np.zeros(num_samples, dtype=float)
    click_rates = np.zeros(num_samples, dtype=float)
    report_rates = np.zeros(num_samples, dtype=float)
    repeat_click_counts = np.zeros(num_samples, dtype=int)

    for i, cohort in enumerate(cohort_types):
        sims = simulation_counts[i]
        if cohort == "low_risk":
            # Cautious users: moderate opens, low clicks, high reporting
            op = rng.uniform(0.20, 0.70)
            cl = rng.uniform(0.0, min(0.15, op))
            rep = rng.uniform(0.50, 0.95)
            rc = 1 if (cl > 0.08 and rng.random() < 0.15) else 0
        elif cohort == "moderate_risk":
            # Intermediate users: regular opens, moderate clicks, inconsistent reporting
            op = rng.uniform(0.40, 0.85)
            cl = rng.uniform(0.20, min(0.55, op))
            rep = rng.uniform(0.15, 0.50)
            est_clicks = int(round(cl * sims))
            rc = rng.integers(0, min(3, max(1, est_clicks))) if est_clicks > 0 else 0
        else:  # high_risk
            # Vulnerable users: high opens, high clicks, repeated clicks, minimal reporting
            op = rng.uniform(0.65, 1.00)
            cl = rng.uniform(0.50, op)
            rep = rng.uniform(0.0, 0.20)
            est_clicks = max(2, int(round(cl * sims)))
            rc = rng.integers(2, max(3, min(8, est_clicks + 1)))

        open_rates[i] = np.clip(op, 0.0, 1.0)
        click_rates[i] = np.clip(cl, 0.0, 1.0)
        report_rates[i] = np.clip(rep, 0.0, 1.0)
        repeat_click_counts[i] = max(0, rc)

    # 2. Compute synthetic risk score with slight Gaussian noise
    noise = rng.normal(0, 4.0, size=num_samples)
    raw_scores = (
        15.0
        + (click_rates * 55.0)
        + np.where(repeat_click_counts >= 2, 10.0, 0.0)
        + (open_rates * 10.0)
        - (report_rates * 35.0)
        + noise
    )
    clamped_scores = np.clip(raw_scores, 0.0, 100.0)

    # 3. Discretize into classes (LOW, MEDIUM, HIGH)
    labels = []
    for s in clamped_scores:
        if s < 40.0:
            labels.append("LOW")
        elif s < 70.0:
            labels.append("MEDIUM")
        else:
            labels.append("HIGH")

    # 4. Construct DataFrame
    df = pd.DataFrame({
        "simulation_count": simulation_counts.astype(int),
        "click_rate": np.round(click_rates, 4),
        "report_rate": np.round(report_rates, 4),
        "open_rate": np.round(open_rates, 4),
        "repeat_click_count": repeat_click_counts.astype(int),
        "risk_level": labels,
    })

    return df


# ---------------------------------------------------------------------------
# Input Validation
# ---------------------------------------------------------------------------
def validate_dataset(df: pd.DataFrame) -> None:
    """Validates the structure, types, and values of the dataset."""
    if df.empty:
        raise ValueError("Dataset is empty.")

    missing_cols = set(FEATURE_COLUMNS + ["risk_level"]) - set(df.columns)
    if missing_cols:
        raise ValueError(f"Dataset is missing required columns: {missing_cols}")

    if df[FEATURE_COLUMNS + ["risk_level"]].isnull().any().any():
        raise ValueError("Dataset contains null or missing values.")

    # Range validations
    if not (df["simulation_count"] >= 1).all():
        raise ValueError("simulation_count must be >= 1 for all records.")
    if not ((df["click_rate"] >= 0.0) & (df["click_rate"] <= 1.0)).all():
        raise ValueError("click_rate must be within [0.0, 1.0].")
    if not ((df["report_rate"] >= 0.0) & (df["report_rate"] <= 1.0)).all():
        raise ValueError("report_rate must be within [0.0, 1.0].")
    if not ((df["open_rate"] >= 0.0) & (df["open_rate"] <= 1.0)).all():
        raise ValueError("open_rate must be within [0.0, 1.0].")
    if not (df["repeat_click_count"] >= 0).all():
        raise ValueError("repeat_click_count must be >= 0 for all records.")

    unexpected_labels = set(df["risk_level"].unique()) - set(CLASS_LABELS)
    if unexpected_labels:
        raise ValueError(f"Dataset contains unexpected target labels: {unexpected_labels}")


# ---------------------------------------------------------------------------
# Model Pipeline Training & Evaluation
# ---------------------------------------------------------------------------
def train_and_evaluate(
    df: pd.DataFrame,
    test_size: float = 0.25,
    random_state: int = DEFAULT_RANDOM_SEED,
) -> Tuple[Pipeline, Dict[str, Any]]:
    """
    Splits data reproducibly, trains a baseline classifier via Pipeline,
    and calculates evaluation metrics on the held-out test split.
    """
    validate_dataset(df)

    X = df[FEATURE_COLUMNS]
    y = df["risk_level"]

    # Stratified Train/Test split to preserve class balance and avoid leakage
    X_train, X_test, y_train, y_test = train_test_split(
        X,
        y,
        test_size=test_size,
        random_state=random_state,
        stratify=y,
    )

    # Scikit-learn Pipeline with feature scaling and baseline Random Forest classifier
    pipeline = Pipeline([
        ("scaler", StandardScaler()),
        (
            "classifier",
            RandomForestClassifier(
                n_estimators=100,
                max_depth=6,
                random_state=random_state,
                class_weight="balanced",
            ),
        ),
    ])

    # Fit pipeline exclusively on training data
    pipeline.fit(X_train, y_train)

    # Evaluate on held-out test set
    y_pred = pipeline.predict(X_test)

    accuracy = accuracy_score(y_test, y_pred)
    precision, recall, f1, support = precision_recall_fscore_support(
        y_test,
        y_pred,
        labels=CLASS_LABELS,
        zero_division=0,
    )
    conf_matrix = confusion_matrix(y_test, y_pred, labels=CLASS_LABELS)
    cls_report = classification_report(
        y_test,
        y_pred,
        labels=CLASS_LABELS,
        digits=4,
        zero_division=0,
    )

    metrics_summary = {
        "accuracy": accuracy,
        "per_class": {
            label: {
                "precision": precision[i],
                "recall": recall[i],
                "f1_score": f1[i],
                "support": int(support[i]),
            }
            for i, label in enumerate(CLASS_LABELS)
        },
        "confusion_matrix": conf_matrix,
        "classification_report": cls_report,
        "test_sample_count": len(y_test),
        "train_sample_count": len(X_train),
    }

    return pipeline, metrics_summary


# ---------------------------------------------------------------------------
# Output Display
# ---------------------------------------------------------------------------
def print_evaluation_results(metrics: Dict[str, Any]) -> None:
    """Prints evaluation results clearly formatted for inspection."""
    print("=" * 70)
    print("PHISHGUARD PHASE 5: ML BASELINE EVALUATION RESULTS")
    print("=" * 70)
    print(f"Dataset Split    : {metrics['train_sample_count']} train / {metrics['test_sample_count']} test")
    print(f"Overall Accuracy : {metrics['accuracy']:.4f} ({metrics['accuracy'] * 100:.2f}%)")
    print("-" * 70)
    print("PER-CLASS PERFORMANCE (Precision, Recall, F1-Score):")
    print(f"{'Class':<10} {'Precision':<12} {'Recall':<12} {'F1-Score':<12} {'Support':<10}")
    for label in CLASS_LABELS:
        pc = metrics["per_class"][label]
        print(f"{label:<10} {pc['precision']:<12.4f} {pc['recall']:<12.4f} {pc['f1_score']:<12.4f} {pc['support']:<10}")
    print("-" * 70)
    print("CONFUSION MATRIX:")
    print(f"Labels: {CLASS_LABELS}")
    print(metrics["confusion_matrix"])
    print("-" * 70)
    print("CLASSIFICATION REPORT:")
    print(metrics["classification_report"])
    print("=" * 70)
    print("IMPORTANT DISCLAIMER:")
    print("These results reflect baseline fitting on synthetic behavioral heuristics.")
    print("They DO NOT establish real-world predictive validity and are intended solely")
    print("for academic prototyping and pipeline validation.")
    print("=" * 70)


# ---------------------------------------------------------------------------
# Model Persistence
# ---------------------------------------------------------------------------
def save_model_artifact(
    pipeline: Pipeline,
    output_path: Path,
    metadata: Dict[str, Any],
) -> Path:
    """
    Saves the trained pipeline and metadata bundle using joblib.
    Creates parent directories if necessary.
    """
    output_path.parent.mkdir(parents=True, exist_ok=True)

    artifact_bundle = {
        "pipeline": pipeline,
        "features": FEATURE_COLUMNS,
        "classes": CLASS_LABELS,
        "metadata": metadata,
    }

    joblib.dump(artifact_bundle, output_path)
    return output_path


# ---------------------------------------------------------------------------
# Main Execution Entry Point
# ---------------------------------------------------------------------------
def main() -> None:
    """Parses arguments, generates data, trains baseline classifier, and saves artifact."""
    parser = argparse.ArgumentParser(
        description="PhishGuard ML Phase 5: Train Baseline Risk Classifier on Synthetic Behavioral Data",
    )
    parser.add_argument(
        "--samples",
        type=int,
        default=DEFAULT_SAMPLE_SIZE,
        help=f"Number of synthetic samples to generate (default: {DEFAULT_SAMPLE_SIZE})",
    )
    parser.add_argument(
        "--seed",
        type=int,
        default=DEFAULT_RANDOM_SEED,
        help=f"Random seed for reproducibility (default: {DEFAULT_RANDOM_SEED})",
    )
    parser.add_argument(
        "--output",
        type=str,
        default=None,
        help="Path where the joblib model artifact should be saved.",
    )

    args = parser.parse_args()

    # Determine script and models directory paths relative to file location
    script_dir = Path(__file__).resolve().parent
    models_dir = script_dir / "models"
    model_output_file = Path(args.output) if args.output else models_dir / "phishguard_risk_model.joblib"

    print(f"Generating {args.samples} synthetic behavioral records (seed={args.seed})...")
    df = generate_synthetic_data(num_samples=args.samples, random_state=args.seed)

    print("Class distribution in synthetic dataset:")
    print(df["risk_level"].value_counts().to_string())
    print()

    print("Training baseline classifier pipeline...")
    pipeline, metrics = train_and_evaluate(df, test_size=0.25, random_state=args.seed)

    print_evaluation_results(metrics)

    metadata = {
        "prototype": "PhishGuard Phase 5 ML Risk Predictor",
        "random_seed": args.seed,
        "sample_size": args.samples,
        "features": FEATURE_COLUMNS,
        "classes": CLASS_LABELS,
        "accuracy": float(metrics["accuracy"]),
        "synthetic_notice": (
            "Model trained strictly on synthetic telemetry. "
            "Does not establish real-world predictive validity."
        ),
    }

    saved_path = save_model_artifact(pipeline, model_output_file, metadata)
    print(f"\nModel artifact successfully saved to: {saved_path}")


if __name__ == "__main__":
    main()
