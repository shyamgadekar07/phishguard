import mongoose from 'mongoose';

const FORBIDDEN_METADATA_KEYS = [
  'password',
  'pwd',
  'pass',
  'otp',
  'pin',
  'cvv',
  'card',
  'token',
  'secret',
  'credential',
  'auth',
];

const simulationEventSchema = new mongoose.Schema(
  {
    campaign: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Campaign',
      required: [true, 'Campaign reference is required'],
      index: true,
    },
    template: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Template',
      required: [true, 'Template reference is required'],
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Target user reference is required'],
      index: true,
    },
    trackingId: {
      type: String,
      required: [true, 'Tracking ID is required'],
      unique: true,
      index: true,
      trim: true,
    },
    eventType: {
      type: String,
      required: [true, 'Event type is required'],
      enum: {
        values: ['SENT', 'DELIVERED', 'OPENED', 'CLICKED', 'REPORTED', 'IGNORED'],
        message: '{VALUE} is not a valid simulation event type',
      },
      uppercase: true,
      trim: true,
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
    metadata: {
      type: Map,
      of: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

// Sanitization hook: Guarantee that no sensitive credentials ever get saved to metadata
simulationEventSchema.pre('save', function (next) {
  if (this.metadata) {
    const rawMeta = this.metadata instanceof Map ? Object.fromEntries(this.metadata) : this.metadata;
    for (const key of Object.keys(rawMeta)) {
      const lowerKey = key.toLowerCase();
      if (FORBIDDEN_METADATA_KEYS.some((forbidden) => lowerKey.includes(forbidden))) {
        if (this.metadata instanceof Map) {
          this.metadata.delete(key);
        } else {
          delete this.metadata[key];
        }
      }
    }
  }
  next();
});

// Indexes for analytical aggregation
simulationEventSchema.index({ campaign: 1, eventType: 1 });
simulationEventSchema.index({ campaign: 1, user: 1 });
simulationEventSchema.index({ user: 1, eventType: 1 });

const SimulationEvent = mongoose.model('SimulationEvent', simulationEventSchema);

export default SimulationEvent;
