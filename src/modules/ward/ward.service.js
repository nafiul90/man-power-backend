const Ward = require('./ward.model');
const { buildOrgFilter } = require('../../utils/scope');

// Map a geo-admin role to (territoryIds key on geoScope, ward field that must match).
const ROLE_TERRITORY = {
  'Division Admin': { idsKey: 'divisionIds', wardField: 'division' },
  'District Admin': { idsKey: 'districtIds', wardField: 'district' },
  'Upazila Admin':  { idsKey: 'upazilaIds',  wardField: 'upazila'  },
  'Thana Admin':    { idsKey: 'thanaIds',    wardField: 'thana'    },
  'Union Admin':    { idsKey: 'unionIds',    wardField: 'union'    },
};

const assertWardInScope = (reqUser, ward) => {
  const { role, geoScope } = reqUser;
  if (['Super Admin', 'Org Owner', 'Manager'].includes(role)) return;
  const cfg = ROLE_TERRITORY[role];
  if (!cfg) throw { statusCode: 403, message: `${role} cannot manage wards.` };
  const territoryIds = (geoScope?.[cfg.idsKey] ?? []).map(String);
  if (!territoryIds.length) throw { statusCode: 403, message: 'No territory assigned to your account.' };
  if (!territoryIds.includes(String(ward[cfg.wardField]))) {
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
  const empty = () => ({ wards: [], total: 0, page: Number(page), pages: 0 });

  if (role === 'Ward Admin') {
    if (!geoScope?.wardIds?.length) return empty();
    query._id = { $in: geoScope.wardIds };
  } else if (role === 'Union Admin') {
    if (!geoScope?.unionIds?.length) return empty();
    query.union = { $in: geoScope.unionIds };
  } else if (role === 'Thana Admin') {
    if (!geoScope?.thanaIds?.length) return empty();
    query.thana = { $in: geoScope.thanaIds };
    if (union) query.union = union;
  } else if (role === 'Upazila Admin') {
    if (!geoScope?.upazilaIds?.length) return empty();
    query.upazila = { $in: geoScope.upazilaIds };
    if (thana) query.thana = thana;
    if (union) query.union = union;
  } else if (role === 'District Admin') {
    if (!geoScope?.districtIds?.length) return empty();
    query.district = { $in: geoScope.districtIds };
    if (upazila) query.upazila = upazila;
    if (thana) query.thana = thana;
    if (union) query.union = union;
  } else if (role === 'Division Admin') {
    if (!geoScope?.divisionIds?.length) return empty();
    query.division = { $in: geoScope.divisionIds };
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
