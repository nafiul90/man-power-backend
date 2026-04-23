const Installment = require('./installment.model');
const Fund = require('../fund/fund.model');
const { buildOrgFilter } = require('../../utils/scope');

const getByFund = async (fundId, reqUser, { page = 1, limit = 50, member, status, installmentNumber }) => {
  const orgFilter = buildOrgFilter(reqUser);

  // Verify fund belongs to org
  const fund = await Fund.findOne({ _id: fundId, ...orgFilter });
  if (!fund) throw { statusCode: 404, message: 'Fund not found.' };

  const query = { fund: fundId };
  if (member) query.member = member;
  if (status) query.status = status;
  if (installmentNumber) query.installmentNumber = Number(installmentNumber);

  const skip = (page - 1) * limit;
  const [installments, total] = await Promise.all([
    Installment.find(query)
      .populate('member', 'fullName phone userId')
      .populate('collectedBy', 'fullName')
      .skip(skip)
      .limit(Number(limit))
      .sort({ dueDate: 1 }),
    Installment.countDocuments(query),
  ]);

  return { installments, total, page: Number(page), pages: Math.ceil(total / limit) };
};

const getByMember = async (reqUser, { fundId, memberId, page = 1, limit = 50 }) => {
  const orgFilter = buildOrgFilter(reqUser);
  const query = { org: orgFilter.org || undefined };
  if (orgFilter.org) query.org = orgFilter.org;
  if (fundId) query.fund = fundId;
  if (memberId) query.member = memberId;

  const skip = (page - 1) * limit;
  const [installments, total] = await Promise.all([
    Installment.find(query)
      .populate('fund', 'title')
      .populate('member', 'fullName phone userId')
      .populate('collectedBy', 'fullName')
      .skip(skip)
      .limit(Number(limit))
      .sort({ dueDate: 1 }),
    Installment.countDocuments(query),
  ]);

  return { installments, total, page: Number(page), pages: Math.ceil(total / limit) };
};

const collectPayment = async (id, reqUser, { paidAmount, notes }) => {
  const orgFilter = buildOrgFilter(reqUser);
  const inst = await Installment.findOne({ _id: id, ...orgFilter.org ? { org: orgFilter.org } : {} });
  if (!inst) throw { statusCode: 404, message: 'Installment not found.' };
  if (inst.status === 'Paid') throw { statusCode: 400, message: 'Installment is already fully paid.' };

  const newPaid = inst.paidAmount + paidAmount;
  inst.paidAmount = +newPaid.toFixed(2);
  inst.notes = notes || inst.notes;
  inst.collectedBy = reqUser._id || reqUser.id;
  inst.paidAt = new Date();

  if (inst.paidAmount >= inst.totalDue) {
    inst.paidAmount = inst.totalDue;
    inst.status = 'Paid';
  } else {
    inst.status = 'Partial';
  }

  await inst.save();

  // Update member's totalPaid in the Fund document
  await Fund.updateOne(
    { _id: inst.fund, 'members.user': inst.member },
    { $inc: { 'members.$.totalPaid': paidAmount } }
  );

  return inst;
};

/**
 * Mark overdue installments (called as a utility or scheduled job)
 */
const markOverdue = async () => {
  const now = new Date();
  await Installment.updateMany(
    { dueDate: { $lt: now }, status: { $in: ['Pending', 'Partial'] } },
    { $set: { status: 'Overdue' } }
  );
};

const getDueRecords = async (reqUser, { fundId, asOf, page = 1, limit = 50 }) => {
  const orgFilter = buildOrgFilter(reqUser);
  const referenceDate = asOf ? new Date(asOf) : new Date();

  const query = {
    ...(orgFilter.org ? { org: orgFilter.org } : {}),
    dueDate: { $lte: referenceDate },
    status: { $in: ['Pending', 'Partial', 'Overdue'] },
  };
  if (fundId) query.fund = fundId;

  const skip = (page - 1) * limit;
  const [installments, total] = await Promise.all([
    Installment.find(query)
      .populate('fund', 'title')
      .populate('member', 'fullName phone userId')
      .skip(skip)
      .limit(Number(limit))
      .sort({ dueDate: 1 }),
    Installment.countDocuments(query),
  ]);

  return { installments, total, page: Number(page), pages: Math.ceil(total / limit) };
};

const getCollectionReport = async (reqUser, { fundId, fromDate, toDate, page = 1, limit = 100 }) => {
  const orgFilter = buildOrgFilter(reqUser);
  const query = { ...(orgFilter.org ? { org: orgFilter.org } : {}) };
  if (fundId) query.fund = fundId;
  if (fromDate || toDate) {
    query.paidAt = {};
    if (fromDate) query.paidAt.$gte = new Date(fromDate);
    if (toDate) {
      const end = new Date(toDate);
      end.setHours(23, 59, 59, 999);
      query.paidAt.$lte = end;
    }
  }
  query.paidAmount = { $gt: 0 };

  const skip = (page - 1) * limit;
  const [installments, total, summaryAgg] = await Promise.all([
    Installment.find(query)
      .populate('fund', 'title')
      .populate('member', 'fullName phone userId')
      .populate('collectedBy', 'fullName')
      .skip(skip)
      .limit(Number(limit))
      .sort({ paidAt: -1 }),
    Installment.countDocuments(query),
    Installment.aggregate([
      { $match: query },
      {
        $group: {
          _id: null,
          totalCollected: { $sum: '$paidAmount' },
          totalDue: { $sum: '$totalDue' },
          count: { $sum: 1 },
        },
      },
    ]),
  ]);

  const summary = summaryAgg[0] || { totalCollected: 0, totalDue: 0, count: 0 };

  return { installments, total, page: Number(page), pages: Math.ceil(total / limit), summary };
};

const getOrgSummary = async (reqUser) => {
  const orgFilter = buildOrgFilter(reqUser);
  const match = orgFilter.org ? { org: orgFilter.org } : {};

  const agg = await Installment.aggregate([
    { $match: match },
    {
      $group: {
        _id: '$status',
        totalDue: { $sum: '$totalDue' },
        totalPaid: { $sum: '$paidAmount' },
        count: { $sum: 1 },
      },
    },
  ]);

  const result = { Pending: 0, Paid: 0, Partial: 0, Overdue: 0, totalDue: 0, totalPaid: 0, totalOutstanding: 0 };
  for (const row of agg) {
    result[row._id] = row.count;
    result.totalDue += row.totalDue;
    result.totalPaid += row.totalPaid;
  }
  result.totalOutstanding = +(result.totalDue - result.totalPaid).toFixed(2);

  return result;
};

module.exports = {
  getByFund,
  getByMember,
  collectPayment,
  markOverdue,
  getDueRecords,
  getCollectionReport,
  getOrgSummary,
};
