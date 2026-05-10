const Ward = require('./ward.model');
const { buildOrgFilter } = require('../../utils/scope');

// Map a geo-admin role to (territory key on geoScope, ward field that must match).
const ROLE_TERRITORY = {
  'Division Admin': { territoryKey: 'divisionId', wardField: 'division' },
  'District Admin': { territoryKey: 'districtId', wardField: 'district' },
  'Upazila Admin':  { territoryKey: 'upazilaId',  wardField: 'upazila'  },
  'Thana Admin':    { territoryKey: 'thanaId',    wardField: 'thana'    },
  'Union Admin':    { territoryKey: 'unionId',    wardField: 'union'    },
};

const assertWardInScope = (reqUser, ward) => {
  const { role, geoScope } = reqUser;
  if (['Super Admin', 'Org Owner', 'Manager'].includes(role)) return;
  const cfg = ROLE_TERRITORY[role];
  if (!cfg) throw { statusCode: 403, message: `${role} cannot manage wards.` };
  if (!geoScope?.[cfg.territoryKey]) throw { statusCode: 403, message: 'No territory assigned to your account.' };
  if (String(ward[cfg.wardField]) !== String(geoScope[cfg.territoryKey])) {
    throw { statusCode: 403, message: `Ward is outside your ${cfg.wardField}.` };
  }
};

const getAll = async (
  reqUser,
  { page = 1, limit = 50, search, orgId, division, district, upazila, thana, union }
) => {
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
  } else if (role === 'Thana Admin') {
    if (!geoScope?.thanaId) return { wards: [], total: 0, page: Number(page), pages: 0 };
    query.thana = geoScope.thanaId;
    if (union) query.union = union;
  } else if (role === 'Upazila Admin') {
    if (!geoScope?.upazilaId) return { wards: [], total: 0, page: Number(page), pages: 0 };
    query.upazila = geoScope.upazilaId;
    if (thana) query.thana = thana;
    if (union) query.union = union;
  } else if (role === 'District Admin') {
    if (!geoScope?.districtId) return { wards: [], total: 0, page: Number(page), pages: 0 };
    query.district = geoScope.districtId;
    if (upazila) query.upazila = upazila;
    if (thana) query.thana = thana;
    if (union) query.union = union;
  } else if (role === 'Division Admin') {
    if (!geoScope?.divisionId) return { wards: [], total: 0, page: Number(page), pages: 0 };
    query.division = geoScope.divisionId;
    if (district) query.district = district;
    if (upazila) query.upazila = upazila;
    if (thana) query.thana = thana;
    if (union) query.union = union;
  } else {
    // Non-geo admins: accept explicit geographic filters for drill-down navigation
    if (union) query.union = union;
    else if (thana) query.thana = thana;
    else if (upazila) query.upazila = upazila;
    else if (district) query.district = district;
    else if (division) query.division = division;
  }

  const skip = (page - 1) * limit;
  const [wards, total] = await Promise.all([
    Ward.find(query)
      .populate('division', 'name')
      .populate('district', 'name')
      .populate('upazila', 'name')
      .populate('thana', 'name')
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
    .populate('thana', 'name')
    .populate('union', 'name')
    .populate('admins', 'fullName phone role');
  if (!ward) throw { statusCode: 404, message: 'Ward not found.' };
  return ward;
};

const create = async (reqUser, data) => {
  const orgFilter = buildOrgFilter(reqUser);
  if (!orgFilter.org) throw { statusCode: 400, message: 'No organization associated with your account.' };
  // Validate the proposed ward's territory chain falls in the creator's scope.
  assertWardInScope(reqUser, data);
  return Ward.create({ ...data, org: orgFilter.org });
};

const update = async (id, reqUser, data) => {
  const orgFilter = buildOrgFilter(reqUser);
  const existing = await Ward.findOne({ _id: id, ...orgFilter });
  if (!existing) throw { statusCode: 404, message: 'Ward not found.' };
  assertWardInScope(reqUser, existing);
  // If geographic fields are being changed, the new chain must also be in scope.
  const merged = {
    division: data.division !== undefined ? data.division : existing.division,
    district: data.district !== undefined ? data.district : existing.district,
    upazila: data.upazila !== undefined ? data.upazila : existing.upazila,
    thana: data.thana !== undefined ? data.thana : existing.thana,
    union: data.union !== undefined ? data.union : existing.union,
  };
  assertWardInScope(reqUser, merged);

  const ward = await Ward.findOneAndUpdate(
    { _id: id, ...orgFilter },
    data,
    { new: true, runValidators: true }
  )
    .populate('division', 'name')
    .populate('district', 'name')
    .populate('upazila', 'name')
    .populate('thana', 'name')
    .populate('union', 'name')
    .populate('admins', 'fullName phone role');
  return ward;
};

const remove = async (id, reqUser) => {
  const orgFilter = buildOrgFilter(reqUser);
  const ward = await Ward.findOne({ _id: id, ...orgFilter });
  if (!ward) throw { statusCode: 404, message: 'Ward not found.' };
  assertWardInScope(reqUser, ward);
  await Ward.findOneAndDelete({ _id: id, ...orgFilter });
  return ward;
};

module.exports = { getAll, getById, create, update, remove };
