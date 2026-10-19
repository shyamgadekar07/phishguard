import mongoose from 'mongoose';
import User from '../models/User.js';
import RiskHistory from '../models/RiskHistory.js';
import {
  getUserBehaviorMetrics,
  getSystemBehaviorOverview,
  getTraineesRiskSummary,
} from '../services/behaviorAnalytics.service.js';
import {
  calculateRiskScore,
  recalculateUserRisk,
} from '../services/riskScore.service.js';
import { getMLRiskPrediction } from '../services/mlPrediction.service.js';

/**
 * @route   GET /api/analytics/overview
 * @desc    Get aggregate platform behavioral analytics & risk distribution
 * @access  Private (ADMIN, SECURITY_OFFICER)
 */
export const getAnalyticsOverview = async (req, res, next) => {
  try {
    const overview = await getSystemBehaviorOverview();

    return res.status(200).json({
      success: true,
      data: overview,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/analytics/users
 * @desc    Get trainee risk overview table with search/filtering capabilities
 * @access  Private (ADMIN, SECURITY_OFFICER)
 */
export const getTraineesRisk = async (req, res, next) => {
  try {
    const trainees = await getTraineesRiskSummary();

    return res.status(200).json({
      success: true,
      count: trainees.length,
      data: { trainees },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/analytics/users/:userId/risk
 * @desc    Get detailed explainable risk score and metrics for a specific user
 * @access  Private (ADMIN, SECURITY_OFFICER)
 */
export const getUserRiskAnalytics = async (req, res, next) => {
  try {
    const { userId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user identifier format',
      });
    }

    const targetUser = await User.findById(userId).select('-password');
    if (!targetUser) {
      return res.status(404).json({
        success: false,
        message: 'Target user not found',
      });
    }

    // 1. Retrieve safe behavioral metrics
    const metrics = await getUserBehaviorMetrics(targetUser._id);

    // 2. Calculate current explainable risk score and factors
    const { riskScore, riskLevel, factors } = calculateRiskScore(metrics);

    // 3. Fetch past risk calculation history (up to last 10 entries)
    const history = await RiskHistory.find({ user: targetUser._id })
      .sort({ calculatedAt: -1 })
      .limit(10)
      .lean();

    // 4. Retrieve advisory Phase 5 ML prediction (fails safe, never overrides deterministic score)
    const mlPrediction = await getMLRiskPrediction(metrics);

    return res.status(200).json({
      success: true,
      data: {
        user: {
          _id: targetUser._id,
          name: targetUser.name,
          email: targetUser.email,
          role: targetUser.role,
          department: targetUser.department,
          isActive: targetUser.isActive,
          createdAt: targetUser.createdAt,
        },
        riskScore,
        riskLevel,
        metrics,
        factors,
        history,
        mlPrediction,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/analytics/me/risk
 * @desc    Get authenticated user's own risk profile and educational insights
 * @access  Private (Self - TRAINEE, ADMIN, SECURITY_OFFICER)
 */
export const getMyRiskAnalytics = async (req, res, next) => {
  try {
    const userId = req.user._id;

    const user = await User.findById(userId).select('-password');
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User profile not found',
      });
    }

    const metrics = await getUserBehaviorMetrics(user._id);
    const { riskScore, riskLevel, factors } = calculateRiskScore(metrics);

    const history = await RiskHistory.find({ user: user._id })
      .sort({ calculatedAt: -1 })
      .limit(10)
      .lean();

    // Retrieve advisory Phase 5 ML prediction for self
    const mlPrediction = await getMLRiskPrediction(metrics);

    return res.status(200).json({
      success: true,
      data: {
        user: {
          _id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          department: user.department,
        },
        riskScore,
        riskLevel,
        metrics,
        factors,
        history,
        mlPrediction,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   POST /api/analytics/users/:userId/recalculate
 * @desc    Explicitly trigger risk score recalculation and history logging
 * @access  Private (ADMIN, SECURITY_OFFICER)
 */
export const recalculateRisk = async (req, res, next) => {
  try {
    const { userId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user identifier format',
      });
    }

    const updatedProfile = await recalculateUserRisk(userId);

    return res.status(200).json({
      success: true,
      message: 'User risk score recalculated successfully',
      data: updatedProfile,
    });
  } catch (error) {
    if (error.message.includes('not found')) {
      return res.status(404).json({
        success: false,
        message: error.message,
      });
    }
    next(error);
  }
};

export default {
  getAnalyticsOverview,
  getTraineesRisk,
  getUserRiskAnalytics,
  getMyRiskAnalytics,
  recalculateRisk,
};
