import mongoose from 'mongoose';

const templateSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Template name is required'],
      trim: true,
      minlength: [2, 'Template name must be at least 2 characters long'],
      maxlength: [100, 'Template name cannot exceed 100 characters'],
    },
    channel: {
      type: String,
      required: [true, 'Simulation channel is required'],
      enum: {
        values: ['EMAIL', 'SMS', 'WHATSAPP'],
        message: '{VALUE} is not a supported simulation channel',
      },
      uppercase: true,
      trim: true,
    },
    subject: {
      type: String,
      trim: true,
      default: '',
    },
    content: {
      type: String,
      required: [true, 'Template content is required'],
      trim: true,
    },
    description: {
      type: String,
      trim: true,
      default: '',
    },
    difficulty: {
      type: String,
      enum: {
        values: ['LOW', 'MEDIUM', 'HIGH'],
        message: '{VALUE} is not a valid difficulty level',
      },
      default: 'LOW',
      uppercase: true,
      trim: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Creator user reference is required'],
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for high-frequency queries
templateSchema.index({ channel: 1, isActive: 1 });
templateSchema.index({ difficulty: 1, isActive: 1 });
templateSchema.index({ createdBy: 1 });

const Template = mongoose.model('Template', templateSchema);

export default Template;
