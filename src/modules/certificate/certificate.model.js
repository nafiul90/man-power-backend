const mongoose = require('mongoose');
const Counter = require('../counter/counter.model');

const certificateSchema = new mongoose.Schema(
  {
    certificateNo: {
      type: String,
      unique: true,
    },
    member: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    training: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Training',
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
    org: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
    },
    issuedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    issuedAt: { type: Date, default: Date.now },
    status: {
      type: String,
      enum: ['Active', 'Revoked'],
      default: 'Active',
    },
    notes: { type: String, trim: true },
  },
  { timestamps: true }
);

certificateSchema.pre('save', async function (next) {
  if (this.certificateNo) return next();
  const counter = await Counter.findByIdAndUpdate(
    'certificate',
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );
  this.certificateNo = `CERT-${String(counter.seq).padStart(6, '0')}`;
  next();
});

module.exports = mongoose.model('Certificate', certificateSchema);
