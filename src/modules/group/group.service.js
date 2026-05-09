const Group = require('./group.model');
const Ward = require('../ward/ward.model');
const AdminArea = require('../adminArea/adminArea.model');
const { buildOrgFilter } = require('../../utils/scope');
const { resolveWardIds } = require('../../utils/geoScope');

const LEVELS = Group.LEVELS;

/**
 * Build a MongoDB constraint capturing the geo scope of a geo admin role.
 * Each role sees groups at their level OR below, within their territory.
 * For non-Ward admins, falls back to ward-in-territory so legacy ward-level
 * groups (without denormalized ancestors) still show up.
 *
 * Returns null for non geo admins (no restriction).
 * Returns false (sentinel) when the admin has no assigned area.
 */
const buildGeoScopeConstraint = async (reqUser) => {
  const { role, geoScope } = reqUser;

  if (role === 'Ward Admin') {
    const wardIds = geoScope?.wardIds ?? [];
    if (!wardIds.length) return false;
    return { level: 'Ward', ward: { $in: wardIds } };
  }

  if (role === 'District Admin' || role === 'Upazila Admin' || role === 'Union Admin') {
    const territoryKey = role === 'District Admin' ? 'districtId' : role === 'Upazila Admin' ? 'upazilaId' : 'unionId';
    const queryKey = role === 'District Admin' ? 'district' : role === 'Upazila Admin' ? 'upazila' : 'union';
    if (!geoScope?.[territoryKey]) return false;
    const wardIds = await resolveWardIds(reqUser);
    const or = [{ [queryKey]: geoScope[territoryKey] }];
    if (wardIds && wardIds.length) or.push({ ward: { $in: wardIds } });
    return { $or: or };
  }
  return null;
};

/**
 * Resolve and denormalize the geographic ancestry of a group from its
 * level + chosen area. For ward groups, derive division/district/upazila/union
 * from the ward record. For non-ward groups, derive ancestors from the AdminArea.
 */
const resolveAncestry = async ({ level, division, district, upazila, union, ward, orgId }) => {
  if (!LEVELS.includes(level)) {
    throw { statusCode: 400, message: 'Invalid group level.' };
  }

  if (level === 'Ward') {
    if (!ward) throw { statusCode: 400, message: 'Ward is required for ward-level groups.' };
    const w = await Ward.findOne({ _id: ward, org: orgId }).select('division district upazila union');
    if (!w) throw { statusCode: 400, message: 'Ward not found in your organization.' };
    return {
      level,
      division: w.division ?? null,
      district: w.district ?? null,
      upazila: w.upazila ?? null,
      union: w.union ?? null,
      ward: w._id,
    };
  }

  const requiredField = level.toLowerCase();
  const areaId = { division, district, upazila, union }[requiredField];
  if (!areaId) throw { statusCode: 400, message: `${level} selection is required.` };

  const area = await AdminArea.findOne({ _id: areaId, type: level, org: orgId }).select('parent');
  if (!area) throw { statusCode: 400, message: `${level} not found in your organization.` };

  const ancestry = { level, division: null, district: null, upazila: null, union: null, ward: null };
  ancestry[requiredField] = area._id;

  // Walk up parents to fill ancestors
  let cursor = area;
  const types = ['Union', 'Upazila', 'District', 'Division'];
  for (let i = types.indexOf(level) + 1; i < types.length && cursor?.parent; i++) {
    const parent = await AdminArea.findById(cursor.parent).select('parent type');
    if (!parent) break;
    ancestry[parent.type.toLowerCase()] = parent._id;
    cursor = parent;
  }
  return ancestry;
};

/**
 * Verify the resolved ancestry of a group falls within the creator's geo scope.
 */
const assertAncestryInScope = (reqUser, ancestry) => {
  const { role, geoScope } = reqUser;
  if (role === 'District Admin') {
    if (String(ancestry.district) !== String(geoScope?.districtId)) {
      throw { statusCode: 403, message: 'Group is outside your district.' };
    }
  } else if (role === 'Upazila Admin') {
    if (String(ancestry.upazila) !== String(geoScope?.upazilaId)) {
      throw { statusCode: 403, message: 'Group is outside your upazila.' };
    }
  } else if (role === 'Union Admin') {
    if (String(ancestry.union) !== String(geoScope?.unionId)) {
      throw { statusCode: 403, message: 'Group is outside your union.' };
    }
  } else if (role === 'Ward Admin') {
    const wardIds = (geoScope?.wardIds ?? []).map(String);
    if (ancestry.level !== 'Ward' || !wardIds.includes(String(ancestry.ward))) {
      throw { statusCode: 403, message: 'Group is outside your ward(s).' };
    }
  }
};

const getAll = async (
  reqUser,
  { page = 1, limit = 20, search, orgId, level, division, district, upazila, union, wardId, category }
) => {
  const orgFilter = buildOrgFilter(reqUser, orgId);
  const query = { ...orgFilter };
  if (search) query.title = { $regex: search, $options: 'i' };
  if (level && LEVELS.includes(level)) query.level = level;
  if (category) query.category = category;

  if (reqUser.role === 'Team Leader') {
    query.teamLeaders = reqUser._id;
  } else if (reqUser.role === 'Secretary') {
    query.secretaries = reqUser._id;
  } else {
    const scopeConstraint = await buildGeoScopeConstraint(reqUser);
    if (scopeConstraint === false) {
      return { groups: [], total: 0, page: Number(page), pages: 0 };
    }
    if (scopeConstraint) Object.assign(query, scopeConstraint);
  }

  // Apply explicit area filters (drill-down). These AND with geo scope above.
  if (division) query.division = division;
  if (district) query.district = district;
  if (upazila) query.upazila = upazila;
  if (union) query.union = union;
  if (wardId) query.ward = wardId;

  const skip = (page - 1) * limit;
  const [groups, total] = await Promise.all([
    Group.find(query)
      .populate('division', 'name')
      .populate('district', 'name')
      .populate('upazila', 'name')
      .populate('union', 'name')
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
  const query = { _id: id, ...orgFilter };
  if (reqUser.role === 'Team Leader') query.teamLeaders = reqUser._id;
  else if (reqUser.role === 'Secretary') query.secretaries = reqUser._id;
  else {
    const scopeConstraint = await buildGeoScopeConstraint(reqUser);
    if (scopeConstraint === false) throw { statusCode: 404, message: 'Group not found.' };
    if (scopeConstraint) Object.assign(query, scopeConstraint);
  }

  const group = await Group.findOne(query)
    .populate('division', 'name')
    .populate('district', 'name')
    .populate('upazila', 'name')
    .populate('union', 'name')
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

  const ancestry = await resolveAncestry({
    level: data.level,
    division: data.division,
    district: data.district,
    upazila: data.upazila,
    union: data.union,
    ward: data.ward,
    orgId: orgFilter.org,
  });
  assertAncestryInScope(reqUser, ancestry);

  return Group.create({
    title: data.title,
    category: data.category || null,
    members: data.members || [],
    teamLeaders: data.teamLeaders || [],
    secretaries: data.secretaries || [],
    ...ancestry,
    org: orgFilter.org,
  });
};

const findInScope = async (id, reqUser) => {
  const orgFilter = buildOrgFilter(reqUser);
  const query = { _id: id, ...orgFilter };
  const scopeConstraint = await buildGeoScopeConstraint(reqUser);
  if (scopeConstraint === false) return null;
  if (scopeConstraint) Object.assign(query, scopeConstraint);
  return Group.findOne(query);
};

const update = async (id, reqUser, data) => {
  const orgFilter = buildOrgFilter(reqUser);
  const existing = await findInScope(id, reqUser);
  if (!existing) throw { statusCode: 404, message: 'Group not found.' };

  const update = {
    ...(data.title !== undefined ? { title: data.title } : {}),
    ...(data.category !== undefined ? { category: data.category || null } : {}),
    ...(data.members !== undefined ? { members: data.members } : {}),
    ...(data.teamLeaders !== undefined ? { teamLeaders: data.teamLeaders } : {}),
    ...(data.secretaries !== undefined ? { secretaries: data.secretaries } : {}),
  };

  // If level/area is being changed, re-resolve ancestry and re-check scope
  if (data.level !== undefined) {
    const ancestry = await resolveAncestry({
      level: data.level,
      division: data.division,
      district: data.district,
      upazila: data.upazila,
      union: data.union,
      ward: data.ward,
      orgId: orgFilter.org,
    });
    assertAncestryInScope(reqUser, ancestry);
    Object.assign(update, ancestry);
  }

  const group = await Group.findOneAndUpdate(
    { _id: id, ...orgFilter },
    update,
    { new: true, runValidators: true }
  )
    .populate('division', 'name')
    .populate('district', 'name')
    .populate('upazila', 'name')
    .populate('union', 'name')
    .populate('ward', 'title')
    .populate('category', 'title')
    .populate('members', 'fullName phone role');
  return group;
};

const remove = async (id, reqUser) => {
  const existing = await findInScope(id, reqUser);
  if (!existing) throw { statusCode: 404, message: 'Group not found.' };
  await Group.findOneAndDelete({ _id: existing._id });
  return existing;
};

const updateAssignees = async (id, reqUser, { teamLeaders, secretaries }) => {
  const orgFilter = buildOrgFilter(reqUser);
  const existing = await findInScope(id, reqUser);
  if (!existing) throw { statusCode: 404, message: 'Group not found.' };

  const update = {};
  if (teamLeaders !== undefined) update.teamLeaders = teamLeaders;
  if (secretaries !== undefined) update.secretaries = secretaries;
  const group = await Group.findOneAndUpdate(
    { _id: id, ...orgFilter },
    update,
    { new: true }
  )
    .populate('division', 'name')
    .populate('district', 'name')
    .populate('upazila', 'name')
    .populate('union', 'name')
    .populate('ward', 'title')
    .populate('category', 'title')
    .populate('members', 'fullName phone role')
    .populate('teamLeaders', 'fullName phone role')
    .populate('secretaries', 'fullName phone role');
  return group;
};

module.exports = { getAll, getById, create, update, remove, updateAssignees };
