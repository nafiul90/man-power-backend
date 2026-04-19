const MemberTraining = require('./memberTraining.model');
const { buildOrgFilter } = require('../../utils/scope');

const RATE_ROLES = ['Org Owner', 'Manager', 'Instructor'];

const getByGroupTraining = async (groupTrainingId, reqUser) => {
  const orgFilter = buildOrgFilter(reqUser);
  return MemberTraining.find({ groupTraining: groupTrainingId, ...orgFilter })
    .populate('member', 'fullName phone email')
    .populate('ratedBy', 'fullName');
};

const getByMember = async (memberId, reqUser) => {
  const orgFilter = buildOrgFilter(reqUser);
  return MemberTraining.find({ member: memberId, ...orgFilter })
    .populate('training', 'title purpose')
    .populate('group', 'title')
    .populate('groupTraining', 'status scheduledDate startedAt completedAt')
    .populate('ratedBy', 'fullName')
    .sort({ createdAt: -1 });
};

const rate = async (id, reqUser, { rating }) => {
  if (!RATE_ROLES.includes(reqUser.role)) {
    throw { statusCode: 403, message: 'Not authorized to rate members.' };
  }
  const orgFilter = buildOrgFilter(reqUser);
  const mt = await MemberTraining.findOneAndUpdate(
    { _id: id, ...orgFilter },
    { rating, ratedBy: reqUser._id, ratedAt: new Date() },
    { new: true, runValidators: true }
  ).populate('member', 'fullName phone email');
  if (!mt) throw { statusCode: 404, message: 'MemberTraining record not found.' };
  return mt;
};

const getByGroup = async (groupId, reqUser) => {
  const orgFilter = buildOrgFilter(reqUser);
  return MemberTraining.find({ group: groupId, ...orgFilter })
    .populate('member', 'fullName phone email userId')
    .populate('training', 'title')
    .populate('groupTraining', 'status')
    .populate('ratedBy', 'fullName');
};

module.exports = { getByGroupTraining, getByGroup, getByMember, rate };
