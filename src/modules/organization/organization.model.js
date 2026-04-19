const mongoose = require('mongoose');

const organizationSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Organization title is required'],
      trim: true,
      unique: true,
    },
    owners: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Organization', organizationSchema);
