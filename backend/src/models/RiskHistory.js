import mongoose from 'mongoose';

const FORBIDDEN_FIELDS = [
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

const factorSchema = new mongoose.Schema(
  {
    factor: {
      type: String,
      required: true,
      trim: true,
    },
    impact: {
      type: Number,
      required: true,
    },
    explanation: {
      type: String,
      required: true,
      trim: true,
    },
  },
  { _id: false }
);

const riskHistorySchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Target user reference is required'],
      index: true,
    },
    riskScore: {
      type: Number,
      required: [true, 'Risk score is required'],
      min: [0, 'Risk score cannot be less than 0'],
      max: [100, 'Risk score cannot exceed 100'],
    },
    riskLevel: {
      type: String,
      required: [true, 'Risk level is required'],
      enum: {
        values: ['LOW', 'MEDIUM', 'HIGH'],
        message: '{VALUE} is not a valid risk level',
      },
    },
    previousScore: {
      type: Number,
      default: 0,
      min: [0, 'Previous score cannot be less than 0'],
      max: [100, 'Previous score cannot exceed 100'],
    },
    previousLevel: {
      type: String,
      enum: {
        values: ['LOW', 'MEDIUM', 'HIGH'],
        message: '{VALUE} is not a valid risk level',
      },
      default: 'LOW',
    },
    factors: {
      type: [factorSchema],
      default: [],
    },
    metrics: {
      totalSimulations: { type: Number, default: 0 },
      deliveredCount: { type: Number, default: 0 },
      openedCount: { type: Number, default: 0 },
      clickedCount: { type: Number, default: 0 },
      reportedCount: { type: Number, default: 0 },
      ignoredCount: { type: Number, default: 0 },
      clickRate: { type: Number, default: 0 },
      reportRate: { type: Number, default: 0 },
      openRate: { type: Number, default: 0 },
    },
    calculatedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Sanitization safeguard: ensure no credential fields are stored in factors or metrics
riskHistorySchema.pre('save', function (next) {
  if (this.factors && Array.isArray(this.factors)) {
    this.factors.forEach((f) => {
      if (f.explanation) {
        FORBIDDEN_FIELDS.forEach((forbidden) => {
          if (f.explanation.toLowerCase().includes(forbidden)) {
            f.explanation = f.explanation.replace(new RegExp(forbidden, 'gi'), '[REDACTED]');
          }
        });
      }
    });
  }
  next();
});

riskHistorySchema.index({ user: 1, calculatedAt: -1 });

const RiskHistory = mongoose.model('RiskHistory', riskHistorySchema);

export default RiskHistory;
