const Zone = require('./zone.model');
const { buildOrgFilter } = require('../../utils/scope');

const getAll = async (reqUser, { page = 1, limit = 50, search, orgId }) => {
  const orgFilter = buildOrgFilter(reqUser, orgId);
  const query = { ...orgFilter };
  if (search) query.title = { $regex: search, $options: 'i' };

  const skip = (page - 1) * limit;
  const [zones, total] = await Promise.all([
    Zone.find(query)
      .populate('division', 'name')
      .populate('district', 'name')
      .populate('upazila', 'name')
      .populate('union', 'name')
      .populate('org', 'title')
      .skip(skip)
      .limit(Number(limit))
      .sort({ title: 1 }),
    Zone.countDocuments(query),
  ]);
  return { zones, total, page: Number(page), pages: Math.ceil(total / limit) };
};

const getById = async (id, reqUser) => {
  const orgFilter = buildOrgFilter(reqUser);
  const zone = await Zone.findOne({ _id: id, ...orgFilter })
    .populate('division', 'name')
    .populate('district', 'name')
    .populate('upazila', 'name')
    .populate('union', 'name');
  if (!zone) throw { statusCode: 404, message: 'Zone not found.' };
  return zone;
};

const create = async (reqUser, data) => {
  const orgFilter = buildOrgFilter(reqUser);
  if (!orgFilter.org) throw { statusCode: 400, message: 'No organization associated with your account.' };
  return Zone.create({ ...data, org: orgFilter.org });
};

const update = async (id, reqUser, data) => {
  const orgFilter = buildOrgFilter(reqUser);
  const zone = await Zone.findOneAndUpdate(
    { _id: id, ...orgFilter },
    data,
    { new: true, runValidators: true }
  )
    .populate('division', 'name')
    .populate('district', 'name')
    .populate('upazila', 'name')
    .populate('union', 'name');
  if (!zone) throw { statusCode: 404, message: 'Zone not found.' };
  return zone;
};

const remove = async (id, reqUser) => {
  const orgFilter = buildOrgFilter(reqUser);
  const zone = await Zone.findOneAndDelete({ _id: id, ...orgFilter });
  if (!zone) throw { statusCode: 404, message: 'Zone not found.' };
  return zone;
};

module.exports = { getAll, getById, create, update, remove };
