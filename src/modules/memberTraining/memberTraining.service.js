const MemberTraining = require('./memberTraining.model');
const { buildOrgFilter } = require('../../utils/scope');

const RATE_ROLES = ['Org Owner', 'Manager', 'Instructor', 'Team Leader', 'Secretary'];

const getByGroupTraining = async (groupTrainingId, reqUser) => {
  const orgFilter = buildOrgFilter(reqUser);
  const filter = { groupTraining: groupTrainingId, ...orgFilter };
  if (reqUser.role === 'Team Leader') {
    const Group = require('../group/group.model');
    const gt = await require('../groupTraining/groupTraining.model').findById(groupTrainingId).select('group');
    if (gt) {
      const group = await Group.findOne({ _id: gt.group, teamLeaders: reqUser._id });
      if (!group) return [];
    }
  } else if (reqUser.role === 'Secretary') {
    const Group = require('../group/group.model');
    const gt = await require('../groupTraining/groupTraining.model').findById(groupTrainingId).select('group');
    if (gt) {
      const group = await Group.findOne({ _id: gt.group, secretaries: reqUser._id });
      if (!group) return [];
    }
  }
  return MemberTraining.find(filter)
    .populate('member', 'fullName phone email')
    .populate('ratings.ratedBy', 'fullName role');
};

const getByMember = async (memberId, reqUser) => {
  const orgFilter = buildOrgFilter(reqUser);
  return MemberTraining.find({ member: memberId, ...orgFilter })
    .populate('training', 'title purpose')
    .populate('group', 'title')
    .populate('groupTraining', 'status scheduledDate startedAt completedAt')
    .populate('ratings.ratedBy', 'fullName role')
    .sort({ createdAt: -1 });
};

const rate = async (id, reqUser, { rating }) => {
  if (!RATE_ROLES.includes(reqUser.role)) {
    throw { statusCode: 403, message: 'Not authorized to rate members.' };
  }
  const orgFilter = buildOrgFilter(reqUser);
  const mt = await MemberTraining.findOne({ _id: id, ...orgFilter });
  if (!mt) throw { statusCode: 404, message: 'MemberTraining record not found.' };

  if (['Team Leader', 'Secretary'].includes(reqUser.role)) {
    const Group = require('../group/group.model');
    const field = reqUser.role === 'Team Leader' ? 'teamLeaders' : 'secretaries';
    const group = await Group.findOne({ _id: mt.group, [field]: reqUser._id });
    if (!group) throw { statusCode: 403, message: 'Not authorized to rate members of this group.' };
  }

  const idx = mt.ratings.findIndex((r) => String(r.ratedBy) === String(reqUser._id));
  if (idx >= 0) {
    mt.ratings[idx].rating = rating;
    mt.ratings[idx].ratedAt = new Date();
  } else {
    mt.ratings.push({ ratedBy: reqUser._id, raterRole: reqUser.role, rating, ratedAt: new Date() });
  }
  await mt.save();

  return MemberTraining.findById(mt._id)
    .populate('member', 'fullName phone email')
    .populate('ratings.ratedBy', 'fullName role');
};

const getByGroup = async (groupId, reqUser) => {
  const orgFilter = buildOrgFilter(reqUser);
  return MemberTraining.find({ group: groupId, ...orgFilter })
    .populate('member', 'fullName phone email userId')
    .populate('training', 'title')
    .populate('groupTraining', 'status')
    .populate('ratings.ratedBy', 'fullName role');
};

module.exports = { getByGroupTraining, getByGroup, getByMember, rate };
