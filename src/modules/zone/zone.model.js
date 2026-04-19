const mongoose = require('mongoose');

const zoneSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Zone title is required'],
      trim: true,
    },
    division: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'AdminArea',
      default: null,
    },
    district: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'AdminArea',
      default: null,
    },
    upazila: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'AdminArea',
      default: null,
    },
    union: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'AdminArea',
      default: null,
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

zoneSchema.index({ title: 1, org: 1 }, { unique: true });

module.exports = mongoose.model('Zone', zoneSchema);
