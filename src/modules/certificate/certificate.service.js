const Certificate = require('./certificate.model');
const GroupTraining = require('../groupTraining/groupTraining.model');
const { buildOrgFilter } = require('../../utils/scope');

const ISSUE_ROLES = ['Org Owner', 'Manager', 'Instructor'];

const getAll = async (reqUser, { page = 1, limit = 20, search, orgId, status }) => {
  const orgFilter = buildOrgFilter(reqUser, orgId);
  const query = { ...orgFilter };
  if (status) query.status = status;

  const skip = (page - 1) * limit;
  const [certificates, total] = await Promise.all([
    Certificate.find(query)
      .populate('member', 'fullName phone email')
      .populate('training', 'title')
      .populate('group', 'title')
      .populate('issuedBy', 'fullName')
      .skip(skip)
      .limit(Number(limit))
      .sort({ issuedAt: -1 }),
    Certificate.countDocuments(query),
  ]);

  return { certificates, total, page: Number(page), pages: Math.ceil(total / limit) };
};

const getByMember = async (memberId, reqUser) => {
  const orgFilter = buildOrgFilter(reqUser);
  return Certificate.find({ member: memberId, ...orgFilter })
    .populate('training', 'title')
    .populate('group', 'title')
    .populate('issuedBy', 'fullName')
    .sort({ issuedAt: -1 });
};

const getByGroup = async (groupId, reqUser) => {
  const orgFilter = buildOrgFilter(reqUser);
  return Certificate.find({ group: groupId, ...orgFilter })
    .populate('member', 'fullName phone email')
    .populate('training', 'title')
    .populate('issuedBy', 'fullName')
    .sort({ issuedAt: -1 });
};

const issue = async (reqUser, { memberId, groupTrainingId, notes }) => {
  if (!ISSUE_ROLES.includes(reqUser.role)) {
    throw { statusCode: 403, message: 'Not authorized to issue certificates.' };
  }
  const orgFilter = buildOrgFilter(reqUser);
  if (!orgFilter.org) throw { statusCode: 400, message: 'No organization associated.' };

  const gt = await GroupTraining.findOne({ _id: groupTrainingId, ...orgFilter });
  if (!gt) throw { statusCode: 404, message: 'GroupTraining not found.' };

  const existing = await Certificate.findOne({
    member: memberId,
    groupTraining: groupTrainingId,
    status: 'Active',
  });
  if (existing) throw { statusCode: 409, message: 'Active certificate already exists for this member and training.' };

  const cert = await Certificate.create({
    member: memberId,
    training: gt.training,
    groupTraining: groupTrainingId,
    group: gt.group,
    org: orgFilter.org,
    issuedBy: reqUser._id,
    notes,
  });

  return Certificate.findById(cert._id)
    .populate('member', 'fullName phone email')
    .populate('training', 'title')
    .populate('group', 'title')
    .populate('issuedBy', 'fullName');
};

const revoke = async (id, reqUser) => {
  const orgFilter = buildOrgFilter(reqUser);
  const cert = await Certificate.findOneAndUpdate(
    { _id: id, ...orgFilter },
    { status: 'Revoked' },
    { new: true }
  );
  if (!cert) throw { statusCode: 404, message: 'Certificate not found.' };
  return cert;
};

module.exports = { getAll, getByMember, getByGroup, issue, revoke };
