/**
 * PhishGuard Phase 5: Machine Learning Prediction Client Service
 * =============================================================
 * Handles behavioral feature mapping, communication with the FastAPI
 * ML microservice, strict timeouts, and safe fallback responses.
 *
 * IMPORTANT:
 * - This service provides ADVISORY behavioral predictions only.
 * - Phase 4 deterministic scoring remains the authoritative platform risk score.
 * - Never transmits passwords, credentials, tokens, OTPs, or PII to the ML service.
 */

const DEFAULT_ML_SERVICE_URL = 'http://127.0.0.1:8000';
const ML_REQUEST_TIMEOUT_MS = 3000;

export const PROTOTYPE_DISCLAIMER =
  'Academic prototype trained on synthetic data. Does not establish real-world predictive validity.';

/**
 * Maps raw behavioral metrics from behaviorAnalytics.service into the ML feature schema.
 *
 * Rate Conversion Notice:
 * Backend metrics represent rates as PERCENTAGES (0.0 to 100.0).
 * The ML microservice expects bounded RATIOS in [0.0, 1.0].
 *
 * Repeat Click Mapping & Limitation Notice:
 * In the PhishGuard event model, `metrics.clickedCount` is the total count of simulation
 * events where the user clicked a simulated phishing link. The event schema records
 * separate simulation event documents, rather than intra-email click telemetry.
 * If a user has clicked in 2 or more simulations (clickedCount >= 2), they have demonstrated
 * repeated vulnerability across campaigns. To avoid falsely penalizing isolated single-click
 * events while safely identifying recurring interactions, `repeat_click_count` is mapped as
 * `clickedCount >= 2 ? clickedCount : 0`.
 *
 * @param {Object} metrics Behavioral metrics from behaviorAnalytics.service
 * @returns {{ simulation_count: number, click_rate: number, report_rate: number, open_rate: number, repeat_click_count: number }}
 */
export const mapBehaviorMetricsToMLFeatures = (metrics = {}) => {
  const simulationCount = Math.max(0, parseInt(metrics.totalSimulations, 10) || 0);

  // Convert percentage (0-100) to ratio (0.0-1.0) with strict boundary clamping
  const normalizeRate = (ratePercent) => {
    if (typeof ratePercent !== 'number' || isNaN(ratePercent)) {
      return 0.0;
    }
    const ratio = ratePercent / 100.0;
    const clamped = Math.min(1.0, Math.max(0.0, ratio));
    return Number(clamped.toFixed(4));
  };

  const clickRate = normalizeRate(metrics.clickRate);
  const reportRate = normalizeRate(metrics.reportRate);
  const openRate = normalizeRate(metrics.openRate);

  const rawClicks = Math.max(0, parseInt(metrics.clickedCount, 10) || 0);
  const repeatClickCount = rawClicks >= 2 ? rawClicks : 0;

  return {
    simulation_count: simulationCount,
    click_rate: clickRate,
    report_rate: reportRate,
    open_rate: openRate,
    repeat_click_count: repeatClickCount,
  };
};

/**
 * Calls the FastAPI ML microservice to retrieve an advisory risk prediction.
 *
 * Graceful Degradation Strategy:
 * - If totalSimulations is 0: Returns 'insufficient_data' immediately.
 * - If ML service is offline, times out, or errors: Returns 'unavailable' fallback.
 * - Never throws an unhandled exception or interrupts the caller.
 *
 * @param {Object} metrics Behavioral metrics
 * @returns {Promise<Object>} Advisory ML prediction result object
 */
export const getMLRiskPrediction = async (metrics = {}) => {
  const features = mapBehaviorMetricsToMLFeatures(metrics);

  // 1. Safe cold-start handling for zero simulations
  if (features.simulation_count === 0) {
    return {
      status: 'insufficient_data',
      risk_category: null,
      model_probabilities: null,
      message: 'Insufficient simulation history to generate a machine learning prediction. At least 1 simulation is required.',
      disclaimer: PROTOTYPE_DISCLAIMER,
      isAvailable: true,
    };
  }

  const baseUrl = (process.env.ML_SERVICE_URL || DEFAULT_ML_SERVICE_URL).replace(/\/+$/, '');
  const targetUrl = `${baseUrl}/predict`;

  try {
    // 2. Dispatch request to FastAPI ML service with strict 3-second timeout
    const response = await fetch(targetUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      // Strictly pass only the 5 numerical features (no credentials, tokens, or PII)
      body: JSON.stringify(features),
      signal: AbortSignal.timeout(ML_REQUEST_TIMEOUT_MS),
    });

    if (!response.ok) {
      console.warn(`[ML Service] Prediction request returned status ${response.status} from ${targetUrl}`);
      return {
        status: 'unavailable',
        risk_category: null,
        model_probabilities: null,
        message: `ML service responded with HTTP status ${response.status}. Advisory prediction unavailable.`,
        disclaimer: PROTOTYPE_DISCLAIMER,
        isAvailable: false,
      };
    }

    const data = await response.json();

    return {
      status: data.status || 'success',
      risk_category: data.risk_category || null,
      model_probabilities: data.model_probabilities || null,
      message: data.message || 'Advisory ML prediction generated successfully.',
      disclaimer: data.disclaimer || PROTOTYPE_DISCLAIMER,
      isAvailable: true,
    };
  } catch (error) {
    const isTimeout = error.name === 'TimeoutError' || error.name === 'AbortError';
    console.warn(`[ML Service] Prediction call failed: ${isTimeout ? 'Request timed out after 3000ms' : error.message}`);

    return {
      status: 'unavailable',
      risk_category: null,
      model_probabilities: null,
      message: isTimeout
        ? 'ML risk prediction service timed out after 3000ms.'
        : 'ML risk prediction service is currently unreachable.',
      disclaimer: PROTOTYPE_DISCLAIMER,
      isAvailable: false,
    };
  }
};

export default {
  PROTOTYPE_DISCLAIMER,
  mapBehaviorMetricsToMLFeatures,
  getMLRiskPrediction,
};
