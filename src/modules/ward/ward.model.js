const mongoose = require('mongoose');

const wardSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Ward title is required'],
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

wardSchema.index({ title: 1, org: 1 }, { unique: true });

module.exports = mongoose.model('Ward', wardSchema);
