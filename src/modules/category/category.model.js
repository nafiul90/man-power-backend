const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Category title is required'],
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

categorySchema.index({ title: 1, org: 1 }, { unique: true });

module.exports = mongoose.model('Category', categorySchema);
