const mongoose = require('mongoose');

const AREA_TYPES = ['Division', 'District', 'Upazila', 'Union'];

const adminAreaSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
    },
    type: {
      type: String,
      enum: AREA_TYPES,
      required: [true, 'Type is required'],
    },
    parent: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'AdminArea',
      default: null,
    },
    admins: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    org: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
    },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

adminAreaSchema.index({ name: 1, type: 1, org: 1 }, { unique: true });

module.exports = mongoose.model('AdminArea', adminAreaSchema);
module.exports.AREA_TYPES = AREA_TYPES;
