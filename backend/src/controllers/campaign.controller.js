import mongoose from 'mongoose';
import Campaign from '../models/Campaign.js';
import Template from '../models/Template.js';
import User from '../models/User.js';
import SimulationEvent from '../models/SimulationEvent.js';
import generateTrackingId from '../utils/generateTrackingId.js';

const VALID_CAMPAIGN_STATUSES = ['DRAFT', 'SCHEDULED', 'RUNNING', 'COMPLETED', 'CANCELLED'];

/**
 * Helper to initialize safe simulation tracking events for campaign targets
 */
const initializeSimulationEvents = async (campaign) => {
  for (const targetId of campaign.targets) {
    const existing = await SimulationEvent.findOne({
      campaign: campaign._id,
      user: targetId,
    });

    if (!existing) {
      const trackingId = generateTrackingId(24);
      // Create initial delivery simulation record
      await SimulationEvent.create({
        campaign: campaign._id,
        template: campaign.template,
        user: targetId,
        trackingId,
        eventType: 'DELIVERED',
        timestamp: new Date(),
        metadata: {
          channel: campaign.channel,
          simulationType: 'Cybersecurity Awareness Probe',
        },
      });
    }
  }
};

/**
 * @route   POST /api/campaigns
 * @desc    Create a new simulation campaign
 * @access  Private (ADMIN, SECURITY_OFFICER)
 */
export const createCampaign = async (req, res, next) => {
  try {
    const { name, description, template: templateId, targets, channel, scheduledAt, status } = req.body;

    // 1. Validate required fields
    if (!name || !templateId || !channel) {
      return res.status(400).json({
        success: false,
        message: 'Name, template, and channel are required to create a campaign',
      });
    }

    // 2. Validate template existence
    if (!mongoose.Types.ObjectId.isValid(templateId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid template identifier format',
      });
    }

    const template = await Template.findById(templateId);
    if (!template) {
      return res.status(404).json({
        success: false,
        message: 'Referenced phishing template does not exist',
      });
    }

    // 3. Validate template is active
    if (!template.isActive) {
      return res.status(400).json({
        success: false,
        message: 'Cannot create campaign with an inactive or deactivated template',
      });
    }

    // 4. Validate channel match between campaign and template
    const normalizedChannel = channel.trim().toUpperCase();
    if (normalizedChannel !== template.channel) {
      return res.status(400).json({
        success: false,
        message: `Channel mismatch: Campaign channel (${normalizedChannel}) must match template channel (${template.channel})`,
      });
    }

    // 5. Validate targets
    const targetUserIds = Array.isArray(targets) ? targets : [];
    for (const id of targetUserIds) {
      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({
          success: false,
          message: `Invalid target user identifier format: ${id}`,
        });
      }
    }

    if (targetUserIds.length > 0) {
      const foundUsers = await User.find({
        _id: { $in: targetUserIds },
      });

      if (foundUsers.length !== targetUserIds.length) {
        return res.status(400).json({
          success: false,
          message: 'One or more target users could not be found in the database',
        });
      }

      // Check all target users are active
      const inactiveUser = foundUsers.find((u) => !u.isActive);
      if (inactiveUser) {
        return res.status(400).json({
          success: false,
          message: `Target user ${inactiveUser.email} is inactive and cannot be enrolled in campaigns`,
        });
      }

      // Check all target users have TRAINEE role
      const nonTraineeUser = foundUsers.find((u) => u.role !== 'TRAINEE');
      if (nonTraineeUser) {
        return res.status(400).json({
          success: false,
          message: `Target user ${nonTraineeUser.email} is not a TRAINEE and cannot be enrolled in campaigns`,
        });
      }
    }

    // 6. Validate status
    let initialStatus = 'DRAFT';
    if (status) {
      const normStatus = status.trim().toUpperCase();
      if (!VALID_CAMPAIGN_STATUSES.includes(normStatus)) {
        return res.status(400).json({
          success: false,
          message: `Invalid status. Valid values: ${VALID_CAMPAIGN_STATUSES.join(', ')}`,
        });
      }

      if (normStatus === 'RUNNING' && targetUserIds.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Campaign must have at least one target trainee before launch.',
        });
      }

      initialStatus = normStatus;
    }

    // 7. Create campaign
    const campaign = await Campaign.create({
      name: name.trim(),
      description: description ? description.trim() : '',
      template: template._id,
      createdBy: req.user._id,
      targets: targetUserIds,
      channel: normalizedChannel,
      status: initialStatus,
      scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
      startedAt: initialStatus === 'RUNNING' ? new Date() : null,
    });

    // If campaign is initialized as RUNNING, seed initial simulation delivery tracking
    if (campaign.status === 'RUNNING' && campaign.targets.length > 0) {
      await initializeSimulationEvents(campaign);
    }

    const populated = await Campaign.findById(campaign._id)
      .populate('template', 'name channel subject difficulty')
      .populate('createdBy', 'name email role')
      .populate('targets', 'name email role department');

    return res.status(201).json({
      success: true,
      message: 'Simulation campaign created successfully',
      data: { campaign: populated },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/campaigns
 * @desc    Get all campaigns
 * @access  Private (ADMIN, SECURITY_OFFICER)
 */
export const getCampaigns = async (req, res, next) => {
  try {
    const { status, channel } = req.query;
    const filter = {};

    if (status) {
      const normStatus = status.trim().toUpperCase();
      if (VALID_CAMPAIGN_STATUSES.includes(normStatus)) {
        filter.status = normStatus;
      }
    }

    if (channel) {
      filter.channel = channel.trim().toUpperCase();
    }

    const campaigns = await Campaign.find(filter)
      .populate('template', 'name channel subject difficulty')
      .populate('createdBy', 'name email role')
      .populate('targets', 'name email role department')
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: campaigns.length,
      data: { campaigns },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/campaigns/:id
 * @desc    Get single campaign by ID
 * @access  Private (ADMIN, SECURITY_OFFICER)
 */
export const getCampaignById = async (req, res, next) => {
  try {
    const campaign = await Campaign.findById(req.params.id)
      .populate('template')
      .populate('createdBy', 'name email role')
      .populate('targets', 'name email role department');

    if (!campaign) {
      return res.status(404).json({
        success: false,
        message: 'Campaign not found',
      });
    }

    return res.status(200).json({
      success: true,
      data: { campaign },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   PUT /api/campaigns/:id
 * @desc    Update campaign details or transition status
 * @access  Private (ADMIN, SECURITY_OFFICER)
 */
export const updateCampaign = async (req, res, next) => {
  try {
    const campaign = await Campaign.findById(req.params.id);
    if (!campaign) {
      return res.status(404).json({
        success: false,
        message: 'Campaign not found',
      });
    }

    const { name, description, status, targets, scheduledAt } = req.body;

    if (name) campaign.name = name.trim();
    if (typeof description !== 'undefined') campaign.description = description.trim();
    if (typeof scheduledAt !== 'undefined') campaign.scheduledAt = scheduledAt ? new Date(scheduledAt) : null;

    if (targets && Array.isArray(targets)) {
      for (const id of targets) {
        if (!mongoose.Types.ObjectId.isValid(id)) {
          return res.status(400).json({
            success: false,
            message: `Invalid target ID: ${id}`,
          });
        }
      }

      if (targets.length > 0) {
        const foundUsers = await User.find({
          _id: { $in: targets },
        });

        if (foundUsers.length !== targets.length) {
          return res.status(400).json({
            success: false,
            message: 'One or more target users could not be found in the database',
          });
        }

        const inactiveUser = foundUsers.find((u) => !u.isActive);
        if (inactiveUser) {
          return res.status(400).json({
            success: false,
            message: `Target user ${inactiveUser.email} is inactive and cannot be enrolled in campaigns`,
          });
        }

        const nonTraineeUser = foundUsers.find((u) => u.role !== 'TRAINEE');
        if (nonTraineeUser) {
          return res.status(400).json({
            success: false,
            message: `Target user ${nonTraineeUser.email} is not a TRAINEE and cannot be enrolled in campaigns`,
          });
        }
      }

      campaign.targets = targets;
    }

    if (status) {
      const normStatus = status.trim().toUpperCase();

      if (!VALID_CAMPAIGN_STATUSES.includes(normStatus)) {
        return res.status(400).json({
          success: false,
          message: `Invalid status: ${normStatus}`,
        });
      }

      // A campaign cannot be launched without at least one target trainee.
      if (normStatus === 'RUNNING') {
        if (!Array.isArray(campaign.targets) || campaign.targets.length === 0) {
          return res.status(400).json({
            success: false,
            message: 'Campaign must have at least one target trainee before launch.',
          });
        }

        // Verify all targets exist, are active, and are TRAINEE users.
        const targetUsers = await User.find({
          _id: { $in: campaign.targets },
        }).select('_id email role isActive');

        if (targetUsers.length !== campaign.targets.length) {
          return res.status(400).json({
            success: false,
            message: 'One or more campaign target users could not be found.',
          });
        }

        const invalidTarget = targetUsers.find(
          (user) => !user.isActive || user.role !== 'TRAINEE'
        );

        if (invalidTarget) {
          return res.status(400).json({
            success: false,
            message: 'All campaign targets must be active TRAINEE users.',
          });
        }
      }

      campaign.status = normStatus;

      if (normStatus === 'RUNNING' && !campaign.startedAt) {
        campaign.startedAt = new Date();
      }

      if (normStatus === 'COMPLETED' || normStatus === 'CANCELLED') {
        campaign.completedAt = new Date();
      }
    }

    await campaign.save();

    // If campaign is RUNNING, ensure simulation events are generated for targets
    if (campaign.status === 'RUNNING' && campaign.targets.length > 0) {
      await initializeSimulationEvents(campaign);
    }

    const populated = await Campaign.findById(campaign._id)
      .populate('template', 'name channel subject difficulty')
      .populate('createdBy', 'name email role')
      .populate('targets', 'name email role department');

    return res.status(200).json({
      success: true,
      message: 'Campaign updated successfully',
      data: { campaign: populated },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   DELETE /api/campaigns/:id
 * @desc    Delete or cancel campaign
 * @access  Private (ADMIN, SECURITY_OFFICER)
 */
export const deleteCampaign = async (req, res, next) => {
  try {
    const campaign = await Campaign.findById(req.params.id);
    if (!campaign) {
      return res.status(404).json({
        success: false,
        message: 'Campaign not found',
      });
    }

    campaign.status = 'CANCELLED';
    campaign.completedAt = new Date();
    await campaign.save();

    return res.status(200).json({
      success: true,
      message: 'Campaign cancelled successfully',
      data: { campaign },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/campaigns/:id/metrics
 * @desc    Retrieve campaign simulation metrics and rates
 * @access  Private (ADMIN, SECURITY_OFFICER)
 */
export const getCampaignMetrics = async (req, res, next) => {
  try {
    const campaign = await Campaign.findById(req.params.id);
    if (!campaign) {
      return res.status(404).json({
        success: false,
        message: 'Campaign not found',
      });
    }

    const totalTargets = campaign.targets.length;

    // Aggregate counts by eventType
    const events = await SimulationEvent.find({ campaign: campaign._id });

    let sent = 0;
    let delivered = 0;
    let opened = 0;
    let clicked = 0;
    let reported = 0;
    let ignored = 0;

    events.forEach((ev) => {
      switch (ev.eventType) {
        case 'SENT':
          sent++;
          break;
        case 'DELIVERED':
          delivered++;
          break;
        case 'OPENED':
          opened++;
          break;
        case 'CLICKED':
          clicked++;
          break;
        case 'REPORTED':
          reported++;
          break;
        case 'IGNORED':
          ignored++;
          break;
        default:
          break;
      }
    });

    // Delivered defaults to total targets if campaign is active and simulation events were generated
    const effectiveBase = delivered > 0 ? delivered : totalTargets;

    const clickRate = effectiveBase > 0 ? Number(((clicked / effectiveBase) * 100).toFixed(1)) : 0;
    const openRate = effectiveBase > 0 ? Number(((opened / effectiveBase) * 100).toFixed(1)) : 0;
    const reportRate = effectiveBase > 0 ? Number(((reported / effectiveBase) * 100).toFixed(1)) : 0;

    return res.status(200).json({
      success: true,
      data: {
        campaignId: campaign._id,
        campaignName: campaign.name,
        channel: campaign.channel,
        status: campaign.status,
        metrics: {
          totalTargets,
          sent: sent > 0 ? sent : delivered,
          delivered,
          opened,
          clicked,
          reported,
          ignored,
        },
        percentages: {
          clickRate,
          openRate,
          reportRate,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

export default {
  createCampaign,
  getCampaigns,
  getCampaignById,
  updateCampaign,
  deleteCampaign,
  getCampaignMetrics,
};
