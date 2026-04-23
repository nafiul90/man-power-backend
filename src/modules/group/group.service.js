const Group = require('./group.model');
const { buildOrgFilter } = require('../../utils/scope');

const getAll = async (reqUser, { page = 1, limit = 20, search, orgId }) => {
  const orgFilter = buildOrgFilter(reqUser, orgId);
  const query = { ...orgFilter };
  if (search) query.title = { $regex: search, $options: 'i' };
  if (reqUser.role === 'Team Leader') query.teamLeaders = reqUser._id;
  else if (reqUser.role === 'Secretary') query.secretaries = reqUser._id;

  const skip = (page - 1) * limit;
  const [groups, total] = await Promise.all([
    Group.find(query)
      .populate('ward', 'title')
      .populate('category', 'title')
      .populate('members', 'fullName phone role')
      .populate('teamLeaders', 'fullName phone role')
      .populate('secretaries', 'fullName phone role')
      .populate('org', 'title')
      .skip(skip)
      .limit(Number(limit))
      .sort({ createdAt: -1 }),
    Group.countDocuments(query),
  ]);
  return { groups, total, page: Number(page), pages: Math.ceil(total / limit) };
};

const getById = async (id, reqUser) => {
  const orgFilter = buildOrgFilter(reqUser);
  if (reqUser.role === 'Team Leader') orgFilter.teamLeaders = reqUser._id;
  else if (reqUser.role === 'Secretary') orgFilter.secretaries = reqUser._id;
  const group = await Group.findOne({ _id: id, ...orgFilter })
    .populate('ward', 'title')
    .populate('category', 'title')
    .populate('members', 'fullName phone role')
    .populate('teamLeaders', 'fullName phone role')
    .populate('secretaries', 'fullName phone role');
  if (!group) throw { statusCode: 404, message: 'Group not found.' };
  return group;
};

const create = async (reqUser, data) => {
  const orgFilter = buildOrgFilter(reqUser);
  if (!orgFilter.org) throw { statusCode: 400, message: 'No organization associated with your account.' };
  return Group.create({ ...data, org: orgFilter.org });
};

const update = async (id, reqUser, data) => {
  const orgFilter = buildOrgFilter(reqUser);
  const group = await Group.findOneAndUpdate(
    { _id: id, ...orgFilter },
    data,
    { new: true, runValidators: true }
  )
    .populate('ward', 'title')
    .populate('category', 'title')
    .populate('members', 'fullName phone role');
  if (!group) throw { statusCode: 404, message: 'Group not found.' };
  return group;
};

const remove = async (id, reqUser) => {
  const orgFilter = buildOrgFilter(reqUser);
  const group = await Group.findOneAndDelete({ _id: id, ...orgFilter });
  if (!group) throw { statusCode: 404, message: 'Group not found.' };
  return group;
};

const updateAssignees = async (id, reqUser, { teamLeaders, secretaries }) => {
  const orgFilter = buildOrgFilter(reqUser);
  const update = {};
  if (teamLeaders !== undefined) update.teamLeaders = teamLeaders;
  if (secretaries !== undefined) update.secretaries = secretaries;
  const group = await Group.findOneAndUpdate(
    { _id: id, ...orgFilter },
    update,
    { new: true }
  )
    .populate('ward', 'title')
    .populate('category', 'title')
    .populate('members', 'fullName phone role')
    .populate('teamLeaders', 'fullName phone role')
    .populate('secretaries', 'fullName phone role');
  if (!group) throw { statusCode: 404, message: 'Group not found.' };
  return group;
};

module.exports = { getAll, getById, create, update, remove, updateAssignees };
