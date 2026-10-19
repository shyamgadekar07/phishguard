import User from '../models/User.js';
import RiskHistory from '../models/RiskHistory.js';
import { getUserBehaviorMetrics } from './behaviorAnalytics.service.js';

/**
 * Centralized deterministic risk level thresholds
 * 0–39   LOW
 * 40–69  MEDIUM
 * 70–100 HIGH
 */
export const RISK_THRESHOLDS = {
  LOW: { min: 0, max: 39, label: 'LOW' },
  MEDIUM: { min: 40, max: 69, label: 'MEDIUM' },
  HIGH: { min: 70, max: 100, label: 'HIGH' },
};

/**
 * Deterministically maps a numerical risk score (0-100) to its risk level.
 *
 * @param {number} score
 * @returns {'LOW'|'MEDIUM'|'HIGH'}
 */
export const getRiskLevel = (score) => {
  if (score >= RISK_THRESHOLDS.HIGH.min) {
    return RISK_THRESHOLDS.HIGH.label;
  }
  if (score >= RISK_THRESHOLDS.MEDIUM.min) {
    return RISK_THRESHOLDS.MEDIUM.label;
  }
  return RISK_THRESHOLDS.LOW.label;
};

/**
 * Deterministic, explainable risk score calculation engine.
 * Academic prototype risk indicator based strictly on safe simulation behavior.
 *
 * @param {Object} behaviorMetrics Safe behavioral metrics from behaviorAnalytics.service
 * @returns {{ riskScore: number, riskLevel: string, factors: Array<{ factor: string, impact: number, explanation: string }> }}
 */
export const calculateRiskScore = (behaviorMetrics) => {
  if (!behaviorMetrics || behaviorMetrics.totalSimulations === 0) {
    return {
      riskScore: 0,
      riskLevel: RISK_THRESHOLDS.LOW.label,
      factors: [
        {
          factor: 'BASELINE',
          impact: 0,
          explanation: 'Baseline security profile: No simulation interactions recorded yet.',
        },
      ],
    };
  }

  const factors = [];
  let calculatedScore = 15; // Modest baseline exposure for active simulation targets

  factors.push({
    factor: 'BASELINE_EXPOSURE',
    impact: 15,
    explanation: 'Standard organizational baseline risk for active simulation participants.',
  });

  // 1. CLICKED behavior (Primary risk signal)
  if (behaviorMetrics.clickRate > 0) {
    const clickImpact = Math.round((behaviorMetrics.clickRate / 100) * 55);
    calculatedScore += clickImpact;
    factors.push({
      factor: 'CLICK_RATE',
      impact: clickImpact,
      explanation: `User clicked simulated phishing links in ${behaviorMetrics.clickRate}% of campaigns.`,
    });
  }

  // Repeat click penalty
  if (behaviorMetrics.clickedCount >= 2) {
    const repeatImpact = 10;
    calculatedScore += repeatImpact;
    factors.push({
      factor: 'REPEAT_CLICKS',
      impact: repeatImpact,
      explanation: `User interacted with multiple separate phishing simulations (${behaviorMetrics.clickedCount} clicks recorded).`,
    });
  }

  // 2. OPENED behavior (Secondary exposure signal)
  if (behaviorMetrics.openRate > 0) {
    const openImpact = Math.round((behaviorMetrics.openRate / 100) * 10);
    if (openImpact > 0) {
      calculatedScore += openImpact;
      factors.push({
        factor: 'OPEN_RATE',
        impact: openImpact,
        explanation: `User opened simulated suspicious communications in ${behaviorMetrics.openRate}% of campaigns.`,
      });
    }
  }

  // 3. REPORTED behavior (Proactive awareness mitigation factor)
  if (behaviorMetrics.reportRate > 0) {
    const reportImpact = Math.round((behaviorMetrics.reportRate / 100) * 35);
    calculatedScore -= reportImpact;
    factors.push({
      factor: 'REPORT_RATE',
      impact: -reportImpact,
      explanation: `User proactively reported simulated phishing attempts in ${behaviorMetrics.reportRate}% of campaigns, demonstrating security awareness.`,
    });
  }

  // 4. IGNORED / PASSIVE behavior (Neutral signal)
  if (behaviorMetrics.ignoredCount > 0) {
    factors.push({
      factor: 'PASSIVE_BEHAVIOR',
      impact: 0,
      explanation: `User ignored ${behaviorMetrics.ignoredCount} simulation(s); neutral awareness effect.`,
    });
  }

  // Strict boundary constraint: 0 <= riskScore <= 100
  const riskScore = Math.max(0, Math.min(100, calculatedScore));
  const riskLevel = getRiskLevel(riskScore);

  return {
    riskScore,
    riskLevel,
    factors,
  };
};

/**
 * Controlled recalculation of a user's risk profile.
 * Retrieves safe metrics, computes deterministic score and factors,
 * updates User document, and records an entry in RiskHistory.
 *
 * @param {string|mongoose.Types.ObjectId} userId
 * @returns {Promise<Object>} Updated risk assessment and history snapshot
 */
export const recalculateUserRisk = async (userId) => {
  const user = await User.findById(userId);
  if (!user) {
    throw new Error('User not found for risk recalculation');
  }

  const previousScore = user.riskScore ?? 0;
  const previousLevel = user.riskLevel || 'LOW';

  // 1. Retrieve safe behavioral metrics
  const metrics = await getUserBehaviorMetrics(userId);

  // 2. Calculate deterministic risk score & factors
  const { riskScore, riskLevel, factors } = calculateRiskScore(metrics);

  // 3. Update User model fields
  user.riskScore = riskScore;
  user.riskLevel = riskLevel;
  await user.save();

  // 4. Record entry in RiskHistory
  const historyRecord = await RiskHistory.create({
    user: user._id,
    riskScore,
    riskLevel,
    previousScore,
    previousLevel,
    factors,
    metrics: {
      totalSimulations: metrics.totalSimulations,
      deliveredCount: metrics.deliveredCount,
      openedCount: metrics.openedCount,
      clickedCount: metrics.clickedCount,
      reportedCount: metrics.reportedCount,
      ignoredCount: metrics.ignoredCount,
      clickRate: metrics.clickRate,
      reportRate: metrics.reportRate,
      openRate: metrics.openRate,
    },
    calculatedAt: new Date(),
  });

  return {
    user: {
      _id: user._id,
      name: user.name,
      email: user.email,
      department: user.department,
      role: user.role,
      riskScore: user.riskScore,
      riskLevel: user.riskLevel,
    },
    riskScore,
    riskLevel,
    metrics,
    factors,
    historyRecord,
  };
};

export default {
  RISK_THRESHOLDS,
  getRiskLevel,
  calculateRiskScore,
  recalculateUserRisk,
};
