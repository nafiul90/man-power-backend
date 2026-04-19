const mongoose = require('mongoose');

const groupSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Group title is required'],
      trim: true,
    },
    zone: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Zone',
      default: null,
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
      default: null,
    },
    members: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    org: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
    },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

groupSchema.index({ title: 1, org: 1 }, { unique: true });

module.exports = mongoose.model('Group', groupSchema);
