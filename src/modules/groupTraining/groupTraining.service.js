const GroupTraining = require('./groupTraining.model');
const MemberTraining = require('../memberTraining/memberTraining.model');
const Group = require('../group/group.model');
const { buildOrgFilter } = require('../../utils/scope');

const STATUS_ROLES = ['Org Owner', 'Manager', 'Instructor'];

const getByGroup = async (groupId, reqUser) => {
  const orgFilter = buildOrgFilter(reqUser);
  return GroupTraining.find({ group: groupId, ...orgFilter })
    .populate('training', 'title purpose')
    .populate('instructors', 'fullName phone email')
    .sort({ createdAt: -1 });
};

const getById = async (id, reqUser) => {
  const orgFilter = buildOrgFilter(reqUser);
  const gt = await GroupTraining.findOne({ _id: id, ...orgFilter })
    .populate('training', 'title purpose')
    .populate('instructors', 'fullName phone email')
    .populate('group', 'title')
    .populate('statusHistory.updatedBy', 'fullName');
  if (!gt) throw { statusCode: 404, message: 'GroupTraining not found.' };
  return gt;
};

const assign = async (reqUser, { groupId, trainingId, instructors = [], scheduledDate }) => {
  const orgFilter = buildOrgFilter(reqUser);
  if (!orgFilter.org) throw { statusCode: 400, message: 'No organization associated.' };

  const group = await Group.findOne({ _id: groupId, ...orgFilter });
  if (!group) throw { statusCode: 404, message: 'Group not found.' };

  const existing = await GroupTraining.findOne({ group: groupId, training: trainingId });
  if (existing) throw { statusCode: 409, message: 'Training already assigned to this group.' };

  const gt = await GroupTraining.create({
    group: groupId,
    training: trainingId,
    org: orgFilter.org,
    instructors,
    scheduledDate,
    statusHistory: [{ status: 'Pending', updatedBy: reqUser._id, date: new Date() }],
  });

  // Create MemberTraining records for all current group members
  if (group.members.length) {
    const docs = group.members.map((memberId) => ({
      member: memberId,
      groupTraining: gt._id,
      group: groupId,
      training: trainingId,
      org: orgFilter.org,
    }));
    await MemberTraining.insertMany(docs, { ordered: false });
  }

  return gt.populate([
    { path: 'training', select: 'title purpose' },
    { path: 'instructors', select: 'fullName phone email' },
  ]);
};

const updateInstructors = async (id, reqUser, { instructors }) => {
  const orgFilter = buildOrgFilter(reqUser);
  const gt = await GroupTraining.findOneAndUpdate(
    { _id: id, ...orgFilter },
    { instructors },
    { new: true }
  ).populate('instructors', 'fullName phone email');
  if (!gt) throw { statusCode: 404, message: 'GroupTraining not found.' };
  return gt;
};

const updateStatus = async (id, reqUser, { status, note }) => {
  if (!STATUS_ROLES.includes(reqUser.role)) {
    throw { statusCode: 403, message: 'Not authorized to update training status.' };
  }
  const orgFilter = buildOrgFilter(reqUser);
  const gt = await GroupTraining.findOne({ _id: id, ...orgFilter });
  if (!gt) throw { statusCode: 404, message: 'GroupTraining not found.' };

  gt.status = status;
  gt.statusHistory.push({ status, note, updatedBy: reqUser._id, date: new Date() });

  if (status === 'Started' && !gt.startedAt) gt.startedAt = new Date();
  if (status === 'Completed' && !gt.completedAt) gt.completedAt = new Date();

  await gt.save();
  return gt.populate('statusHistory.updatedBy', 'fullName');
};

const remove = async (id, reqUser) => {
  const orgFilter = buildOrgFilter(reqUser);
  const gt = await GroupTraining.findOneAndDelete({ _id: id, ...orgFilter });
  if (!gt) throw { statusCode: 404, message: 'GroupTraining not found.' };
  await MemberTraining.deleteMany({ groupTraining: id });
  return gt;
};

const getByInstructor = async (instructorId, orgFilter, { page = 1, limit = 50 }) => {
  const query = { instructors: instructorId, ...orgFilter };
  const skip = (page - 1) * limit;
  const [groupTrainings, total] = await Promise.all([
    GroupTraining.find(query)
      .populate('training', 'title purpose')
      .populate('group', 'title')
      .populate('instructors', 'fullName phone')
      .populate('statusHistory.updatedBy', 'fullName')
      .skip(skip).limit(Number(limit)).sort({ createdAt: -1 }),
    GroupTraining.countDocuments(query),
  ]);
  return { groupTrainings, total, page: Number(page), pages: Math.ceil(total / limit) };
};

module.exports = { getByGroup, getById, assign, updateInstructors, updateStatus, getByInstructor, remove };
