const mongoose = require('mongoose');

const ZONE_TYPES = ['Division', 'District', 'Upazila', 'Union'];

const zoneSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Zone name is required'],
      trim: true,
    },
    type: {
      type: String,
      enum: ZONE_TYPES,
      required: [true, 'Zone type is required'],
    },
    parent: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Zone',
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

zoneSchema.index({ name: 1, type: 1, org: 1 }, { unique: true });

module.exports = mongoose.model('Zone', zoneSchema);
module.exports.ZONE_TYPES = ZONE_TYPES;
