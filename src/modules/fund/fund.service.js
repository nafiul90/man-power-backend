const Fund = require('./fund.model');
const Installment = require('../installment/installment.model');
const { buildOrgFilter } = require('../../utils/scope');

/**
 * Calculates per-member installment breakdown using flat interest method.
 * Monthly installment = (principal + totalInterest) / timeline
 */
const calcInstallment = (loanAmount, interestRate, interestType, timeline) => {
  const monthlyRate =
    interestType === 'annual' ? interestRate / 100 / 12 : interestRate / 100;
  const totalInterest = loanAmount * monthlyRate * timeline;
  const totalPayable = loanAmount + totalInterest;
  const monthly = totalPayable / timeline;
  const principal = loanAmount / timeline;
  const interest = totalInterest / timeline;
  return { monthly: +monthly.toFixed(2), principal: +principal.toFixed(2), interest: +interest.toFixed(2), totalPayable: +totalPayable.toFixed(2) };
};

/**
 * Generates Installment documents for all members when fund is activated.
 */
const generateInstallments = async (fund) => {
  const installments = [];
  const start = new Date(fund.startDate);

  for (const fm of fund.members) {
    const { principal, interest, totalPayable } = calcInstallment(
      fm.loanAmount, fund.interestRate, fund.interestType, fund.timeline
    );

    for (let i = 1; i <= fund.timeline; i++) {
      const dueDate = new Date(start);
      dueDate.setMonth(dueDate.getMonth() + i);
      dueDate.setDate(fund.dueDay);

      installments.push({
        fund: fund._id,
        member: fm.user,
        org: fund.org,
        installmentNumber: i,
        dueDate,
        principalAmount: principal,
        interestAmount: interest,
        totalDue: +(principal + interest).toFixed(2),
        paidAmount: 0,
        status: 'Pending',
      });
    }

    // Store computed values back on the member subdoc
    fm.monthlyInstallment = +(principal + interest).toFixed(2);
    fm.totalPayable = totalPayable;
  }

  await Installment.insertMany(installments, { ordered: false });
};

const getAll = async (reqUser, { page = 1, limit = 20, search, status, orgId }) => {
  const orgFilter = buildOrgFilter(reqUser, orgId);
  const query = { ...orgFilter };
  if (search) query.title = { $regex: search, $options: 'i' };
  if (status) query.status = status;

  const skip = (page - 1) * limit;
  const [funds, total] = await Promise.all([
    Fund.find(query)
      .populate('sourceGroup', 'title')
      .populate('createdBy', 'fullName')
      .populate('members.user', 'fullName phone userId')
      .skip(skip)
      .limit(Number(limit))
      .sort({ createdAt: -1 }),
    Fund.countDocuments(query),
  ]);
  return { funds, total, page: Number(page), pages: Math.ceil(total / limit) };
};

const getById = async (id, reqUser) => {
  const orgFilter = buildOrgFilter(reqUser);
  const fund = await Fund.findOne({ _id: id, ...orgFilter })
    .populate('sourceGroup', 'title members')
    .populate('createdBy', 'fullName')
    .populate('members.user', 'fullName phone userId');
  if (!fund) throw { statusCode: 404, message: 'Fund not found.' };
  return fund;
};

const create = async (reqUser, body) => {
  const orgFilter = buildOrgFilter(reqUser);
  if (!orgFilter.org) throw { statusCode: 400, message: 'No organization associated.' };

  const { title, description, sourceGroup, members, totalAmount, interestRate, interestType, timeline, dueDay, startDate, notes } = body;

  const membersWithCalc = (members || []).map((m) => {
    const { monthly, totalPayable } = calcInstallment(
      m.loanAmount, interestRate || 0, interestType || 'annual', timeline
    );
    return { user: m.userId, loanAmount: m.loanAmount, monthlyInstallment: monthly, totalPayable };
  });

  return Fund.create({
    title, description, org: orgFilter.org, sourceGroup: sourceGroup || null,
    members: membersWithCalc, totalAmount, interestRate: interestRate || 0,
    interestType: interestType || 'annual', timeline, dueDay: dueDay || 10,
    startDate, notes, createdBy: reqUser._id || reqUser.id, status: 'Draft',
  });
};

const update = async (id, reqUser, body) => {
  const orgFilter = buildOrgFilter(reqUser);
  const fund = await Fund.findOne({ _id: id, ...orgFilter });
  if (!fund) throw { statusCode: 404, message: 'Fund not found.' };
  if (fund.status === 'Active') throw { statusCode: 400, message: 'Cannot edit an active fund. Cancel first.' };

  const { title, description, members, totalAmount, interestRate, interestType, timeline, dueDay, startDate, notes, sourceGroup } = body;

  if (title !== undefined) fund.title = title;
  if (description !== undefined) fund.description = description;
  if (notes !== undefined) fund.notes = notes;
  if (totalAmount !== undefined) fund.totalAmount = totalAmount;
  if (interestRate !== undefined) fund.interestRate = interestRate;
  if (interestType !== undefined) fund.interestType = interestType;
  if (timeline !== undefined) fund.timeline = timeline;
  if (dueDay !== undefined) fund.dueDay = dueDay;
  if (startDate !== undefined) fund.startDate = startDate;
  if (sourceGroup !== undefined) fund.sourceGroup = sourceGroup || null;

  if (members !== undefined) {
    const effectiveRate = fund.interestRate;
    const effectiveType = fund.interestType;
    const effectiveTimeline = fund.timeline;
    fund.members = members.map((m) => {
      const { monthly, totalPayable } = calcInstallment(m.loanAmount, effectiveRate, effectiveType, effectiveTimeline);
      return { user: m.userId, loanAmount: m.loanAmount, monthlyInstallment: monthly, totalPayable };
    });
  }

  await fund.save();
  return fund;
};

const activate = async (id, reqUser) => {
  const orgFilter = buildOrgFilter(reqUser);
  const fund = await Fund.findOne({ _id: id, ...orgFilter });
  if (!fund) throw { statusCode: 404, message: 'Fund not found.' };
  if (fund.status !== 'Draft') throw { statusCode: 400, message: `Fund is already ${fund.status}.` };
  if (!fund.members.length) throw { statusCode: 400, message: 'Fund must have at least one member.' };

  await generateInstallments(fund);
  fund.status = 'Active';
  await fund.save();
  return fund;
};

const updateStatus = async (id, reqUser, status) => {
  const orgFilter = buildOrgFilter(reqUser);
  const fund = await Fund.findOne({ _id: id, ...orgFilter });
  if (!fund) throw { statusCode: 404, message: 'Fund not found.' };

  const transitions = {
    Active: ['Completed', 'Cancelled'],
    Draft: ['Cancelled'],
  };
  if (!transitions[fund.status]?.includes(status)) {
    throw { statusCode: 400, message: `Cannot transition from ${fund.status} to ${status}.` };
  }

  fund.status = status;
  await fund.save();
  return fund;
};

const remove = async (id, reqUser) => {
  const orgFilter = buildOrgFilter(reqUser);
  const fund = await Fund.findOne({ _id: id, ...orgFilter });
  if (!fund) throw { statusCode: 404, message: 'Fund not found.' };
  if (fund.status === 'Active') throw { statusCode: 400, message: 'Cannot delete an active fund.' };

  await Installment.deleteMany({ fund: id });
  await fund.deleteOne();
};

const getSummary = async (id, reqUser) => {
  const orgFilter = buildOrgFilter(reqUser);
  const fund = await Fund.findOne({ _id: id, ...orgFilter });
  if (!fund) throw { statusCode: 404, message: 'Fund not found.' };

  const [totalDueAgg, totalPaidAgg, overdueCount, pendingCount] = await Promise.all([
    Installment.aggregate([
      { $match: { fund: fund._id } },
      { $group: { _id: null, total: { $sum: '$totalDue' } } },
    ]),
    Installment.aggregate([
      { $match: { fund: fund._id } },
      { $group: { _id: null, total: { $sum: '$paidAmount' } } },
    ]),
    Installment.countDocuments({ fund: fund._id, status: 'Overdue' }),
    Installment.countDocuments({ fund: fund._id, status: { $in: ['Pending', 'Partial'] } }),
  ]);

  const totalDue = totalDueAgg[0]?.total || 0;
  const totalPaid = totalPaidAgg[0]?.total || 0;

  return {
    fund,
    totalDue,
    totalPaid,
    totalOutstanding: +(totalDue - totalPaid).toFixed(2),
    overdueCount,
    pendingCount,
  };
};

module.exports = { getAll, getById, create, update, activate, updateStatus, remove, getSummary };
