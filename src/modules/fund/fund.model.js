const mongoose = require('mongoose');

const fundMemberSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    loanAmount: { type: Number, required: true, min: 0 },
    monthlyInstallment: { type: Number, default: 0 },
    totalPayable: { type: Number, default: 0 },
    totalPaid: { type: Number, default: 0 },
  },
  { _id: true }
);

const fundSchema = new mongoose.Schema(
  {
    title: { type: String, required: [true, 'Fund title is required'], trim: true },
    description: { type: String, trim: true },
    org: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true },
    sourceGroup: { type: mongoose.Schema.Types.ObjectId, ref: 'Group', default: null },
    members: [fundMemberSchema],
    totalAmount: { type: Number, required: [true, 'Total amount is required'], min: 1 },
    interestRate: { type: Number, default: 0, min: 0 },
    interestType: { type: String, enum: ['monthly', 'annual'], default: 'annual' },
    timeline: { type: Number, required: [true, 'Timeline (months) is required'], min: 1 },
    dueDay: { type: Number, default: 10, min: 1, max: 28 },
    startDate: { type: Date, required: [true, 'Start date is required'] },
    status: {
      type: String,
      enum: ['Draft', 'Active', 'Completed', 'Cancelled'],
      default: 'Draft',
    },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    notes: { type: String, trim: true },
  },
  { timestamps: true }
);

fundSchema.index({ title: 1, org: 1 }, { unique: true });

module.exports = mongoose.model('Fund', fundSchema);
