const mongoose = require('mongoose');

const installmentSchema = new mongoose.Schema(
  {
    fund: { type: mongoose.Schema.Types.ObjectId, ref: 'Fund', required: true },
    member: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    org: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true },
    installmentNumber: { type: Number, required: true },
    dueDate: { type: Date, required: true },
    principalAmount: { type: Number, required: true, min: 0 },
    interestAmount: { type: Number, default: 0, min: 0 },
    totalDue: { type: Number, required: true, min: 0 },
    paidAmount: { type: Number, default: 0, min: 0 },
    status: {
      type: String,
      enum: ['Pending', 'Paid', 'Partial', 'Overdue'],
      default: 'Pending',
    },
    paidAt: { type: Date, default: null },
    collectedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    notes: { type: String, trim: true },
  },
  { timestamps: true }
);

installmentSchema.index({ fund: 1, member: 1, installmentNumber: 1 }, { unique: true });
installmentSchema.index({ org: 1, status: 1 });
installmentSchema.index({ dueDate: 1 });

module.exports = mongoose.model('Installment', installmentSchema);
