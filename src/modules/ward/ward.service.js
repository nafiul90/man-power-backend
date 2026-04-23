const Ward = require('./ward.model');
const { buildOrgFilter } = require('../../utils/scope');

const getAll = async (reqUser, { page = 1, limit = 50, search, orgId }) => {
  const orgFilter = buildOrgFilter(reqUser, orgId);
  const query = { ...orgFilter };
  if (search) query.title = { $regex: search, $options: 'i' };

  const skip = (page - 1) * limit;
  const [wards, total] = await Promise.all([
    Ward.find(query)
      .populate('division', 'name')
      .populate('district', 'name')
      .populate('upazila', 'name')
      .populate('union', 'name')
      .populate('org', 'title')
      .skip(skip)
      .limit(Number(limit))
      .sort({ title: 1 }),
    Ward.countDocuments(query),
  ]);
  return { wards, total, page: Number(page), pages: Math.ceil(total / limit) };
};

const getById = async (id, reqUser) => {
  const orgFilter = buildOrgFilter(reqUser);
  const ward = await Ward.findOne({ _id: id, ...orgFilter })
    .populate('division', 'name')
    .populate('district', 'name')
    .populate('upazila', 'name')
    .populate('union', 'name');
  if (!ward) throw { statusCode: 404, message: 'Ward not found.' };
  return ward;
};

const create = async (reqUser, data) => {
  const orgFilter = buildOrgFilter(reqUser);
  if (!orgFilter.org) throw { statusCode: 400, message: 'No organization associated with your account.' };
  return Ward.create({ ...data, org: orgFilter.org });
};

const update = async (id, reqUser, data) => {
  const orgFilter = buildOrgFilter(reqUser);
  const ward = await Ward.findOneAndUpdate(
    { _id: id, ...orgFilter },
    data,
    { new: true, runValidators: true }
  )
    .populate('division', 'name')
    .populate('district', 'name')
    .populate('upazila', 'name')
    .populate('union', 'name');
  if (!ward) throw { statusCode: 404, message: 'Ward not found.' };
  return ward;
};

const remove = async (id, reqUser) => {
  const orgFilter = buildOrgFilter(reqUser);
  const ward = await Ward.findOneAndDelete({ _id: id, ...orgFilter });
  if (!ward) throw { statusCode: 404, message: 'Ward not found.' };
  return ward;
};

module.exports = { getAll, getById, create, update, remove };
