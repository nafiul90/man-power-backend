const AdminArea = require('../modules/adminArea/adminArea.model');
const Ward = require('../modules/ward/ward.model');
const Group = require('../modules/group/group.model');

const GEO_ADMIN_ROLES = ['District Admin', 'Upazila Admin', 'Union Admin', 'Ward Admin'];

const isGeoAdmin = (role) => GEO_ADMIN_ROLES.includes(role);

/**
 * Resolves the geographic scope for a geo-admin user by looking up their assigned area.
 * Called once per request in auth middleware and cached on req.user.geoScope.
 *
 * Returns an object with the IDs of their assigned area and ancestors:
 *  - District Admin: { districtId }
 *  - Upazila Admin:  { upazilaId, districtId }
 *  - Union Admin:    { unionId, upazilaId, districtId }
 *  - Ward Admin:     { wardIds: [] }
 */
const resolveGeoScope = async (user) => {
  const orgId = user.org?._id ?? user.org;
  const userId = user._id;

  if (user.role === 'District Admin') {
    const area = await AdminArea.findOne({ type: 'District', admins: userId, org: orgId }).select('_id');
    return { districtId: area?._id ?? null };
  }

  if (user.role === 'Upazila Admin') {
    const area = await AdminArea.findOne({ type: 'Upazila', admins: userId, org: orgId }).select('_id parent');
    return {
      upazilaId: area?._id ?? null,
      districtId: area?.parent ?? null,
    };
  }

  if (user.role === 'Union Admin') {
    const union = await AdminArea.findOne({ type: 'Union', admins: userId, org: orgId }).select('_id parent');
    if (!union) return { unionId: null, upazilaId: null, districtId: null };
    const upazila = await AdminArea.findById(union.parent).select('_id parent');
    return {
      unionId: union._id,
      upazilaId: upazila?._id ?? null,
      districtId: upazila?.parent ?? null,
    };
  }

  if (user.role === 'Ward Admin') {
    const wards = await Ward.find({ admins: userId, org: orgId }).select('_id');
    return { wardIds: wards.map((w) => w._id) };
  }

  return null;
};

/**
 * Returns ward IDs accessible to a geo-admin user.
 * Returns null for non-geo admins (no restriction).
 * Returns [] if the admin has no assigned area.
 */
const resolveWardIds = async (reqUser) => {
  const { role, geoScope } = reqUser;
  if (!isGeoAdmin(role)) return null;
  if (!geoScope) return [];

  const orgId = reqUser.org?._id ?? reqUser.org;

  if (role === 'Ward Admin') return geoScope.wardIds ?? [];

  const filter = { org: orgId };
  if (role === 'Union Admin') filter.union = geoScope.unionId;
  else if (role === 'Upazila Admin') filter.upazila = geoScope.upazilaId;
  else if (role === 'District Admin') filter.district = geoScope.districtId;

  const wards = await Ward.find(filter).select('_id');
  return wards.map((w) => w._id);
};

/**
 * Returns user IDs in a geo-admin's scope:
 *  - members / teamLeaders / secretaries of groups in their wards
 *  - admins of those wards
 *  - admins of their AdminArea(s) (union/upazila/district admins within scope)
 *
 * Returns null for non-geo admins (no restriction).
 * Returns [] if the admin has no assigned area.
 */
const resolveGeoUserIds = async (reqUser) => {
  const { role, geoScope } = reqUser;
  if (!isGeoAdmin(role)) return null;
  if (!geoScope) return [];

  const orgId = reqUser.org?._id ?? reqUser.org;
  const userIds = new Set([String(reqUser._id)]);

  // --- collect ward IDs and ward admins ---
  let wardIds = [];
  if (role === 'Ward Admin') {
    wardIds = geoScope.wardIds ?? [];
  } else {
    const filter = { org: orgId };
    if (role === 'Union Admin') filter.union = geoScope.unionId;
    else if (role === 'Upazila Admin') filter.upazila = geoScope.upazilaId;
    else if (role === 'District Admin') filter.district = geoScope.districtId;

    const wards = await Ward.find(filter).select('_id admins');
    wardIds = wards.map((w) => w._id);
    wards.forEach((w) => w.admins.forEach((id) => userIds.add(String(id))));
  }

  // --- collect group members in scope (ward-level + level-specific groups) ---
  const groupOr = [{ ward: { $in: wardIds } }];
  if (role === 'Union Admin' && geoScope.unionId) groupOr.push({ union: geoScope.unionId });
  else if (role === 'Upazila Admin' && geoScope.upazilaId) groupOr.push({ upazila: geoScope.upazilaId });
  else if (role === 'District Admin' && geoScope.districtId) groupOr.push({ district: geoScope.districtId });
  const groups = await Group.find({ org: orgId, $or: groupOr }).select(
    'members teamLeaders secretaries',
  );
  groups.forEach((g) => {
    g.members.forEach((id) => userIds.add(String(id)));
    g.teamLeaders.forEach((id) => userIds.add(String(id)));
    g.secretaries.forEach((id) => userIds.add(String(id)));
  });

  // --- collect AdminArea admins within scope ---
  if (role === 'Union Admin' && geoScope.unionId) {
    const area = await AdminArea.findById(geoScope.unionId).select('admins');
    area?.admins.forEach((id) => userIds.add(String(id)));
  } else if (role === 'Upazila Admin' && geoScope.upazilaId) {
    const [upazilaArea, unions] = await Promise.all([
      AdminArea.findById(geoScope.upazilaId).select('admins'),
      AdminArea.find({ type: 'Union', parent: geoScope.upazilaId, org: orgId }).select('admins'),
    ]);
    upazilaArea?.admins.forEach((id) => userIds.add(String(id)));
    unions.forEach((u) => u.admins.forEach((id) => userIds.add(String(id))));
  } else if (role === 'District Admin' && geoScope.districtId) {
    const [districtArea, upazilas] = await Promise.all([
      AdminArea.findById(geoScope.districtId).select('admins'),
      AdminArea.find({ type: 'Upazila', parent: geoScope.districtId, org: orgId }).select('_id admins'),
    ]);
    districtArea?.admins.forEach((id) => userIds.add(String(id)));
    upazilas.forEach((u) => u.admins.forEach((id) => userIds.add(String(id))));

    const upazilaIds = upazilas.map((u) => u._id);
    const unions = await AdminArea.find({ type: 'Union', parent: { $in: upazilaIds }, org: orgId }).select('admins');
    unions.forEach((u) => u.admins.forEach((id) => userIds.add(String(id))));
  }

  return [...userIds];
};

module.exports = { isGeoAdmin, resolveGeoScope, resolveWardIds, resolveGeoUserIds };
