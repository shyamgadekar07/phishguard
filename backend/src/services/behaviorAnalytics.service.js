import mongoose from 'mongoose';
import SimulationEvent from '../models/SimulationEvent.js';
import Campaign from '../models/Campaign.js';
import User from '../models/User.js';

/**
 * Deterministically aggregate safe simulation events for a specific user.
 * Backend remains the sole source of truth.
 *
 * @param {string|mongoose.Types.ObjectId} userId
 * @returns {Promise<Object>} Safe user behavioral metrics
 */
export const getUserBehaviorMetrics = async (userId) => {
  const userObjectId = new mongoose.Types.ObjectId(userId);

  // Retrieve all simulation events for this user
  const events = await SimulationEvent.find({ user: userObjectId })
    .populate('campaign', 'name channel status')
    .sort({ timestamp: -1 })
    .lean();

  let totalSimulations = events.length;
  let deliveredCount = 0;
  let openedCount = 0;
  let clickedCount = 0;
  let reportedCount = 0;
  let ignoredCount = 0;

  const campaignIdsSet = new Set();

  events.forEach((ev) => {
    if (ev.campaign?._id) {
      campaignIdsSet.add(ev.campaign._id.toString());
    } else if (ev.campaign) {
      campaignIdsSet.add(ev.campaign.toString());
    }

    const type = ev.eventType;
    const meta = ev.metadata || {};

    // Any event that was sent/delivered represents a delivered simulation probe
    if (['DELIVERED', 'OPENED', 'CLICKED', 'REPORTED', 'IGNORED'].includes(type)) {
      deliveredCount++;
    }

    if (type === 'CLICKED' || meta.clickedAt) {
      clickedCount++;
    }

    if (type === 'REPORTED' || meta.reportedAt) {
      reportedCount++;
    }

    if (type === 'OPENED' || meta.openedAt) {
      openedCount++;
    }

    if (type === 'IGNORED') {
      ignoredCount++;
    }
  });

  // Calculate rates deterministically, rounded to 1 decimal place
  const effectiveBase = totalSimulations > 0 ? totalSimulations : 0;
  const clickRate = effectiveBase > 0 ? Number(((clickedCount / effectiveBase) * 100).toFixed(1)) : 0;
  const reportRate = effectiveBase > 0 ? Number(((reportedCount / effectiveBase) * 100).toFixed(1)) : 0;
  const openRate = effectiveBase > 0 ? Number(((openedCount / effectiveBase) * 100).toFixed(1)) : 0;

  // Format safe recent behavioral activity (latest 10 events, strictly sanitize metadata)
  const recentActivity = events.slice(0, 10).map((ev) => ({
    eventId: ev._id,
    eventType: ev.eventType,
    timestamp: ev.timestamp,
    campaignName: ev.campaign?.name || 'Simulation Campaign',
    channel: ev.campaign?.channel || ev.metadata?.channel || 'EMAIL',
    safeDetails: {
      isSimulated: true,
      channel: ev.campaign?.channel || ev.metadata?.channel || 'EMAIL',
    },
  }));

  // Fetch campaign names for participated campaigns
  const campaignsParticipated = events
    .filter((ev) => ev.campaign && typeof ev.campaign === 'object')
    .map((ev) => ({
      campaignId: ev.campaign._id,
      name: ev.campaign.name,
      channel: ev.campaign.channel,
      status: ev.campaign.status,
    }))
    .filter(
      (v, idx, arr) => arr.findIndex((c) => c.campaignId.toString() === v.campaignId.toString()) === idx
    );

  return {
    userId: userObjectId.toString(),
    totalSimulations,
    deliveredCount,
    openedCount,
    clickedCount,
    reportedCount,
    ignoredCount,
    clickRate,
    reportRate,
    openRate,
    campaignsParticipatedCount: campaignIdsSet.size,
    campaignsParticipated,
    recentActivity,
  };
};

/**
 * Aggregate high-level system behavioral analytics for Admin and Security Officer dashboard.
 *
 * @returns {Promise<Object>} Aggregate platform security metrics
 */
export const getSystemBehaviorOverview = async () => {
  // Aggregate user counts by risk level among TRAINEE users
  const [totalTrainees, lowRiskUsers, medRiskUsers, highRiskUsers] = await Promise.all([
    User.countDocuments({ role: 'TRAINEE' }),
    User.countDocuments({ role: 'TRAINEE', riskLevel: 'LOW' }),
    User.countDocuments({ role: 'TRAINEE', riskLevel: 'MEDIUM' }),
    User.countDocuments({ role: 'TRAINEE', riskLevel: 'HIGH' }),
  ]);

  // Aggregate event metrics across all simulation events
  const totalSimulations = await SimulationEvent.countDocuments();
  const totalClicks = await SimulationEvent.countDocuments({ eventType: 'CLICKED' });
  const totalReports = await SimulationEvent.countDocuments({ eventType: 'REPORTED' });
  const totalOpened = await SimulationEvent.countDocuments({ eventType: 'OPENED' });

  const overallClickRate =
    totalSimulations > 0 ? Number(((totalClicks / totalSimulations) * 100).toFixed(1)) : 0;
  const overallReportRate =
    totalSimulations > 0 ? Number(((totalReports / totalSimulations) * 100).toFixed(1)) : 0;
  const overallOpenRate =
    totalSimulations > 0 ? Number(((totalOpened / totalSimulations) * 100).toFixed(1)) : 0;

  return {
    totalTrainees,
    lowRiskUsers,
    mediumRiskUsers: medRiskUsers,
    highRiskUsers,
    totalSimulations,
    totalClicks,
    totalReports,
    totalOpened,
    overallClickRate,
    overallReportRate,
    overallOpenRate,
  };
};

/**
 * Retrieve trainee risk summaries for administrative risk monitoring table.
 *
 * @returns {Promise<Array>} List of trainees with risk metrics
 */
export const getTraineesRiskSummary = async () => {
  const trainees = await User.find({ role: 'TRAINEE' })
    .select('_id name email department riskScore riskLevel isActive createdAt')
    .sort({ riskScore: -1, createdAt: -1 })
    .lean();

  // Aggregate event counts per user via MongoDB aggregation
  const eventStats = await SimulationEvent.aggregate([
    {
      $group: {
        _id: '$user',
        total: { $sum: 1 },
        clicks: {
          $sum: {
            $cond: [{ $eq: ['$eventType', 'CLICKED'] }, 1, 0],
          },
        },
        reports: {
          $sum: {
            $cond: [{ $eq: ['$eventType', 'REPORTED'] }, 1, 0],
          },
        },
      },
    },
  ]);

  const statsMap = new Map();
  eventStats.forEach((s) => {
    if (s._id) {
      statsMap.set(s._id.toString(), s);
    }
  });

  return trainees.map((trainee) => {
    const s = statsMap.get(trainee._id.toString()) || { total: 0, clicks: 0, reports: 0 };
    const clickRate = s.total > 0 ? Number(((s.clicks / s.total) * 100).toFixed(1)) : 0;
    const reportRate = s.total > 0 ? Number(((s.reports / s.total) * 100).toFixed(1)) : 0;

    return {
      _id: trainee._id,
      name: trainee.name,
      email: trainee.email,
      department: trainee.department || 'General',
      riskScore: trainee.riskScore ?? 0,
      riskLevel: trainee.riskLevel || 'LOW',
      isActive: trainee.isActive,
      simulationCount: s.total,
      clickedCount: s.clicks,
      reportedCount: s.reports,
      clickRate,
      reportRate,
    };
  });
};

export default {
  getUserBehaviorMetrics,
  getSystemBehaviorOverview,
  getTraineesRiskSummary,
};
