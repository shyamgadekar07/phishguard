import Template from '../models/Template.js';

const VALID_CHANNELS = ['EMAIL', 'SMS', 'WHATSAPP'];
const VALID_DIFFICULTIES = ['LOW', 'MEDIUM', 'HIGH'];

/**
 * @route   POST /api/templates
 * @desc    Create a new phishing template
 * @access  Private (ADMIN, SECURITY_OFFICER)
 */
export const createTemplate = async (req, res, next) => {
  try {
    const { name, channel, subject, content, description, difficulty, isActive } = req.body;

    // 1. Validate required fields
    if (!name || !channel || !content) {
      return res.status(400).json({
        success: false,
        message: 'Name, channel, and content are required fields',
      });
    }

    // 2. Validate channel
    const normalizedChannel = channel.trim().toUpperCase();
    if (!VALID_CHANNELS.includes(normalizedChannel)) {
      return res.status(400).json({
        success: false,
        message: `Invalid channel. Supported channels are: ${VALID_CHANNELS.join(', ')}`,
      });
    }

    // 3. Validate difficulty if supplied
    let normalizedDifficulty = 'LOW';
    if (difficulty) {
      normalizedDifficulty = difficulty.trim().toUpperCase();
      if (!VALID_DIFFICULTIES.includes(normalizedDifficulty)) {
        return res.status(400).json({
          success: false,
          message: `Invalid difficulty. Supported levels are: ${VALID_DIFFICULTIES.join(', ')}`,
        });
      }
    }

    // 4. Create template
    const template = await Template.create({
      name: name.trim(),
      channel: normalizedChannel,
      subject: subject ? subject.trim() : (normalizedChannel === 'EMAIL' ? name.trim() : ''),
      content: content.trim(),
      description: description ? description.trim() : '',
      difficulty: normalizedDifficulty,
      isActive: typeof isActive === 'boolean' ? isActive : true,
      createdBy: req.user._id,
    });

    return res.status(201).json({
      success: true,
      message: 'Phishing template created successfully',
      data: { template },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/templates
 * @desc    Get all phishing templates with optional filtering
 * @access  Private (ADMIN, SECURITY_OFFICER)
 */
export const getTemplates = async (req, res, next) => {
  try {
    const { channel, difficulty, isActive } = req.query;
    const filter = {};

    if (channel) {
      const normalizedChannel = channel.trim().toUpperCase();
      if (VALID_CHANNELS.includes(normalizedChannel)) {
        filter.channel = normalizedChannel;
      }
    }

    if (difficulty) {
      const normalizedDiff = difficulty.trim().toUpperCase();
      if (VALID_DIFFICULTIES.includes(normalizedDiff)) {
        filter.difficulty = normalizedDiff;
      }
    }

    if (typeof isActive !== 'undefined') {
      filter.isActive = isActive === 'true';
    }

    const templates = await Template.find(filter)
      .populate('createdBy', 'name email role')
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: templates.length,
      data: { templates },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/templates/:id
 * @desc    Get a single phishing template by ID
 * @access  Private (ADMIN, SECURITY_OFFICER)
 */
export const getTemplateById = async (req, res, next) => {
  try {
    const template = await Template.findById(req.params.id).populate('createdBy', 'name email role');

    if (!template) {
      return res.status(404).json({
        success: false,
        message: 'Template not found',
      });
    }

    return res.status(200).json({
      success: true,
      data: { template },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   PUT /api/templates/:id
 * @desc    Update a phishing template
 * @access  Private (ADMIN, SECURITY_OFFICER)
 */
export const updateTemplate = async (req, res, next) => {
  try {
    const { name, channel, subject, content, description, difficulty, isActive } = req.body;

    const template = await Template.findById(req.params.id);
    if (!template) {
      return res.status(404).json({
        success: false,
        message: 'Template not found',
      });
    }

    if (name) template.name = name.trim();
    if (content) template.content = content.trim();
    if (typeof subject !== 'undefined') template.subject = subject.trim();
    if (typeof description !== 'undefined') template.description = description.trim();
    if (typeof isActive === 'boolean') template.isActive = isActive;

    if (channel) {
      const normalizedChannel = channel.trim().toUpperCase();
      if (!VALID_CHANNELS.includes(normalizedChannel)) {
        return res.status(400).json({
          success: false,
          message: `Invalid channel. Supported channels: ${VALID_CHANNELS.join(', ')}`,
        });
      }
      template.channel = normalizedChannel;
    }

    if (difficulty) {
      const normalizedDiff = difficulty.trim().toUpperCase();
      if (!VALID_DIFFICULTIES.includes(normalizedDiff)) {
        return res.status(400).json({
          success: false,
          message: `Invalid difficulty. Supported levels: ${VALID_DIFFICULTIES.join(', ')}`,
        });
      }
      template.difficulty = normalizedDiff;
    }

    await template.save();

    return res.status(200).json({
      success: true,
      message: 'Template updated successfully',
      data: { template },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   DELETE /api/templates/:id
 * @desc    Soft-delete / deactivate template
 * @access  Private (ADMIN, SECURITY_OFFICER)
 */
export const deleteTemplate = async (req, res, next) => {
  try {
    const template = await Template.findById(req.params.id);
    if (!template) {
      return res.status(404).json({
        success: false,
        message: 'Template not found',
      });
    }

    template.isActive = false;
    await template.save();

    return res.status(200).json({
      success: true,
      message: 'Template deactivated successfully',
      data: { template },
    });
  } catch (error) {
    next(error);
  }
};

export default {
  createTemplate,
  getTemplates,
  getTemplateById,
  updateTemplate,
  deleteTemplate,
};
