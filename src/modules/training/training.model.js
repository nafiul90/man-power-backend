const mongoose = require('mongoose');

const trainingSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Training title is required'],
      trim: true,
    },
    purpose: {
      type: String,
      trim: true,
    },
    org: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
    },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

trainingSchema.index({ title: 1, org: 1 }, { unique: true });

module.exports = mongoose.model('Training', trainingSchema);
