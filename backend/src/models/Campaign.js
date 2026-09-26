import mongoose from 'mongoose';

const campaignSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Campaign name is required'],
      trim: true,
      minlength: [3, 'Campaign name must be at least 3 characters long'],
      maxlength: [100, 'Campaign name cannot exceed 100 characters'],
    },
    description: {
      type: String,
      trim: true,
      default: '',
    },
    template: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Template',
      required: [true, 'Template reference is required for a campaign'],
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Creator user reference is required'],
    },
    targets: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    channel: {
      type: String,
      required: [true, 'Campaign channel is required'],
      enum: {
        values: ['EMAIL', 'SMS', 'WHATSAPP'],
        message: '{VALUE} is not a valid campaign channel',
      },
      uppercase: true,
      trim: true,
    },
    status: {
      type: String,
      enum: {
        values: ['DRAFT', 'SCHEDULED', 'RUNNING', 'COMPLETED', 'CANCELLED'],
        message: '{VALUE} is not a valid campaign status',
      },
      default: 'DRAFT',
      uppercase: true,
      trim: true,
    },
    scheduledAt: {
      type: Date,
      default: null,
    },
    startedAt: {
      type: Date,
      default: null,
    },
    completedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// High-performance query indexes
campaignSchema.index({ status: 1, channel: 1 });
campaignSchema.index({ createdBy: 1 });
campaignSchema.index({ createdAt: -1 });

const Campaign = mongoose.model('Campaign', campaignSchema);

export default Campaign;
