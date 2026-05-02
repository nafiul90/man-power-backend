const Ward = require('./ward.model');
const { buildOrgFilter } = require('../../utils/scope');

const getAll = async (reqUser, { page = 1, limit = 50, search, orgId, union, upazila, district }) => {
  const orgFilter = buildOrgFilter(reqUser, orgId);
  const query = { ...orgFilter };
  if (search) query.title = { $regex: search, $options: 'i' };

  const { role, geoScope } = reqUser;

  if (role === 'Ward Admin') {
    if (!geoScope?.wardIds?.length) return { wards: [], total: 0, page: Number(page), pages: 0 };
    query._id = { $in: geoScope.wardIds };
  } else if (role === 'Union Admin') {
    if (!geoScope?.unionId) return { wards: [], total: 0, page: Number(page), pages: 0 };
    query.union = geoScope.unionId;
  } else if (role === 'Upazila Admin') {
    if (!geoScope?.upazilaId) return { wards: [], total: 0, page: Number(page), pages: 0 };
    query.upazila = geoScope.upazilaId;
    // Allow further narrowing by union within their upazila
    if (union) query.union = union;
  } else if (role === 'District Admin') {
    if (!geoScope?.districtId) return { wards: [], total: 0, page: Number(page), pages: 0 };
    query.district = geoScope.districtId;
    // Allow further narrowing by upazila/union within their district
    if (upazila) query.upazila = upazila;
    if (union) query.union = union;
  } else {
    // Non-geo admins: accept explicit geographic filters for drill-down navigation
    if (union) query.union = union;
    else if (upazila) query.upazila = upazila;
    else if (district) query.district = district;
  }

  const skip = (page - 1) * limit;
  const [wards, total] = await Promise.all([
    Ward.find(query)
      .populate('division', 'name')
      .populate('district', 'name')
      .populate('upazila', 'name')
      .populate('union', 'name')
      .populate('admins', 'fullName phone role')
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
    .populate('union', 'name')
    .populate('admins', 'fullName phone role');
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
    .populate('union', 'name')
    .populate('admins', 'fullName phone role');
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
