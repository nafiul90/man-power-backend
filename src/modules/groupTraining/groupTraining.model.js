const mongoose = require('mongoose');

const statusHistorySchema = new mongoose.Schema(
  {
    status: {
      type: String,
      enum: ['Pending', 'Started', 'Completed'],
      required: true,
    },
    note: { type: String, trim: true },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    date: { type: Date, default: Date.now },
  },
  { _id: false }
);

const groupTrainingSchema = new mongoose.Schema(
  {
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
    instructors: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    status: {
      type: String,
      enum: ['Pending', 'Started', 'Completed'],
      default: 'Pending',
    },
    statusHistory: [statusHistorySchema],
    scheduledDate: { type: Date },
    startedAt: { type: Date },
    completedAt: { type: Date },
  },
  { timestamps: true }
);

groupTrainingSchema.index({ group: 1, training: 1 }, { unique: true });

module.exports = mongoose.model('GroupTraining', groupTrainingSchema);
