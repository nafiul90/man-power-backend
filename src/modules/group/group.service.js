const Group = require('./group.model');

const getAll = async (orgId, { page = 1, limit = 20, search }) => {
  const query = { org: orgId };
  if (search) query.title = { $regex: search, $options: 'i' };

  const skip = (page - 1) * limit;
  const [groups, total] = await Promise.all([
    Group.find(query)
      .populate('zone', 'name type')
      .populate('category', 'title')
      .populate('members', 'fullName phone role')
      .skip(skip)
      .limit(Number(limit))
      .sort({ createdAt: -1 }),
    Group.countDocuments(query),
  ]);
  return { groups, total, page: Number(page), pages: Math.ceil(total / limit) };
};

const getById = async (id, orgId) => {
  const group = await Group.findOne({ _id: id, org: orgId })
    .populate('zone', 'name type')
    .populate('category', 'title')
    .populate('members', 'fullName phone role');
  if (!group) throw { statusCode: 404, message: 'Group not found.' };
  return group;
};

const create = async (orgId, data) => {
  return Group.create({ ...data, org: orgId });
};

const update = async (id, orgId, data) => {
  const group = await Group.findOneAndUpdate(
    { _id: id, org: orgId },
    data,
    { new: true, runValidators: true }
  )
    .populate('zone', 'name type')
    .populate('category', 'title')
    .populate('members', 'fullName phone role');
  if (!group) throw { statusCode: 404, message: 'Group not found.' };
  return group;
};

const remove = async (id, orgId) => {
  const group = await Group.findOneAndDelete({ _id: id, org: orgId });
  if (!group) throw { statusCode: 404, message: 'Group not found.' };
  return group;
};

module.exports = { getAll, getById, create, update, remove };
