const mongoose = require('mongoose');

const memberTrainingSchema = new mongoose.Schema(
  {
    member: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    groupTraining: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'GroupTraining',
      required: true,
    },
    group: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Group',
      required: true,
    },
    training: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Training',
      required: true,
    },
    org: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
    },
    ratings: [{
      ratedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
      raterRole: { type: String, required: true },
      rating: { type: Number, min: 0, max: 10, required: true },
      ratedAt: { type: Date, default: Date.now },
    }],
  },
  { timestamps: true }
);

memberTrainingSchema.index({ member: 1, groupTraining: 1 }, { unique: true });

module.exports = mongoose.model('MemberTraining', memberTrainingSchema);
