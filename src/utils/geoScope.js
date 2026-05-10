const AdminArea = require('../modules/adminArea/adminArea.model');
const Ward = require('../modules/ward/ward.model');
const Group = require('../modules/group/group.model');
const User = require('../modules/user/user.model');

const GEO_ADMIN_ROLES = ['Division Admin', 'District Admin', 'Upazila Admin', 'Thana Admin', 'Union Admin', 'Ward Admin'];

const isGeoAdmin = (role) => GEO_ADMIN_ROLES.includes(role);

/**
 * Resolves the geographic scope for a geo-admin user by looking up their assigned area.
 * Called once per request in auth middleware and cached on req.user.geoScope.
 *
 * Hierarchy: Division → District → Upazila → Thana → Union → Ward
 *
 * Returns an object with the IDs of their assigned area and ancestors:
 *  - Division Admin: { divisionId }
 *  - District Admin: { districtId, divisionId }
 *  - Upazila Admin:  { upazilaId, districtId, divisionId }
 *  - Thana Admin:    { thanaId, upazilaId, districtId, divisionId }
 *  - Union Admin:    { unionId, thanaId, upazilaId, districtId, divisionId }
 *  - Ward Admin:     { wardIds: [] }
 */
const resolveGeoScope = async (user) => {
  const orgId = user.org?._id ?? user.org;
  const userId = user._id;

  if (user.role === 'Division Admin') {
    const area = await AdminArea.findOne({ type: 'Division', admins: userId, org: orgId }).select('_id');
    return { divisionId: area?._id ?? null };
  }

  if (user.role === 'District Admin') {
    const area = await AdminArea.findOne({ type: 'District', admins: userId, org: orgId }).select('_id parent');
    return { districtId: area?._id ?? null, divisionId: area?.parent ?? null };
  }

  if (user.role === 'Upazila Admin') {
    const area = await AdminArea.findOne({ type: 'Upazila', admins: userId, org: orgId }).select('_id parent');
    if (!area) return { upazilaId: null, districtId: null, divisionId: null };
    const district = await AdminArea.findById(area.parent).select('_id parent');
    return { upazilaId: area._id, districtId: district?._id ?? null, divisionId: district?.parent ?? null };
  }

  if (user.role === 'Thana Admin') {
    const thana = await AdminArea.findOne({ type: 'Thana', admins: userId, org: orgId }).select('_id parent');
    if (!thana) return { thanaId: null, upazilaId: null, districtId: null, divisionId: null };
    const upazila = await AdminArea.findById(thana.parent).select('_id parent');
    const district = upazila ? await AdminArea.findById(upazila.parent).select('_id parent') : null;
    return {
      thanaId: thana._id,
      upazilaId: upazila?._id ?? null,
      districtId: district?._id ?? null,
      divisionId: district?.parent ?? null,
    };
  }

  if (user.role === 'Union Admin') {
    const union = await AdminArea.findOne({ type: 'Union', admins: userId, org: orgId }).select('_id parent');
    if (!union) return { unionId: null, thanaId: null, upazilaId: null, districtId: null, divisionId: null };
    const thana = await AdminArea.findById(union.parent).select('_id parent');
    const upazila = thana ? await AdminArea.findById(thana.parent).select('_id parent') : null;
    const district = upazila ? await AdminArea.findById(upazila.parent).select('_id parent') : null;
    return {
      unionId: union._id,
      thanaId: thana?._id ?? null,
      upazilaId: upazila?._id ?? null,
      districtId: district?._id ?? null,
      divisionId: district?.parent ?? null,
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
  else if (role === 'Thana Admin') filter.thana = geoScope.thanaId;
  else if (role === 'Upazila Admin') filter.upazila = geoScope.upazilaId;
  else if (role === 'District Admin') filter.district = geoScope.districtId;
  else if (role === 'Division Admin') filter.division = geoScope.divisionId;

  const wards = await Ward.find(filter).select('_id');
  return wards.map((w) => w._id);
};

/**
 * Returns user IDs in a geo-admin's scope:
 *  - members / teamLeaders / secretaries of groups in their territory
 *  - admins of wards in scope
 *  - admins of AdminArea(s) within scope
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
    else if (role === 'Thana Admin') filter.thana = geoScope.thanaId;
    else if (role === 'Upazila Admin') filter.upazila = geoScope.upazilaId;
    else if (role === 'District Admin') filter.district = geoScope.districtId;
    else if (role === 'Division Admin') filter.division = geoScope.divisionId;

    const wards = await Ward.find(filter).select('_id admins');
    wardIds = wards.map((w) => w._id);
    wards.forEach((w) => w.admins.forEach((id) => userIds.add(String(id))));
  }

  // --- collect group members in scope (ward-level + level-specific groups) ---
  const groupOr = [{ ward: { $in: wardIds } }];
  if (role === 'Union Admin' && geoScope.unionId) groupOr.push({ union: geoScope.unionId });
  else if (role === 'Thana Admin' && geoScope.thanaId) groupOr.push({ thana: geoScope.thanaId });
  else if (role === 'Upazila Admin' && geoScope.upazilaId) groupOr.push({ upazila: geoScope.upazilaId });
  else if (role === 'District Admin' && geoScope.districtId) groupOr.push({ district: geoScope.districtId });
  else if (role === 'Division Admin' && geoScope.divisionId) groupOr.push({ division: geoScope.divisionId });
  const groups = await Group.find({ org: orgId, $or: groupOr }).select(
    'members teamLeaders secretaries',
  );
  groups.forEach((g) => {
    g.members.forEach((id) => userIds.add(String(id)));
    g.teamLeaders.forEach((id) => userIds.add(String(id)));
    g.secretaries.forEach((id) => userIds.add(String(id)));
  });

  // --- collect AdminArea admins within scope ---
  const collectAdmins = (areas) => areas.forEach((a) => a.admins.forEach((id) => userIds.add(String(id))));

  if (role === 'Union Admin' && geoScope.unionId) {
    const a = await AdminArea.findById(geoScope.unionId).select('admins');
    if (a) a.admins.forEach((id) => userIds.add(String(id)));
  } else if (role === 'Thana Admin' && geoScope.thanaId) {
    const [thana, unions] = await Promise.all([
      AdminArea.findById(geoScope.thanaId).select('admins'),
      AdminArea.find({ type: 'Union', parent: geoScope.thanaId, org: orgId }).select('admins'),
    ]);
    if (thana) thana.admins.forEach((id) => userIds.add(String(id)));
    collectAdmins(unions);
  } else if (role === 'Upazila Admin' && geoScope.upazilaId) {
    const [upazila, thanas] = await Promise.all([
      AdminArea.findById(geoScope.upazilaId).select('admins'),
      AdminArea.find({ type: 'Thana', parent: geoScope.upazilaId, org: orgId }).select('_id admins'),
    ]);
    if (upazila) upazila.admins.forEach((id) => userIds.add(String(id)));
    collectAdmins(thanas);
    const thanaIds = thanas.map((t) => t._id);
    const unions = await AdminArea.find({ type: 'Union', parent: { $in: thanaIds }, org: orgId }).select('admins');
    collectAdmins(unions);
  } else if (role === 'District Admin' && geoScope.districtId) {
    const [district, upazilas] = await Promise.all([
      AdminArea.findById(geoScope.districtId).select('admins'),
      AdminArea.find({ type: 'Upazila', parent: geoScope.districtId, org: orgId }).select('_id admins'),
    ]);
    if (district) district.admins.forEach((id) => userIds.add(String(id)));
    collectAdmins(upazilas);
    const upazilaIds = upazilas.map((u) => u._id);
    const thanas = await AdminArea.find({ type: 'Thana', parent: { $in: upazilaIds }, org: orgId }).select('_id admins');
    collectAdmins(thanas);
    const thanaIds = thanas.map((t) => t._id);
    const unions = await AdminArea.find({ type: 'Union', parent: { $in: thanaIds }, org: orgId }).select('admins');
    collectAdmins(unions);
  } else if (role === 'Division Admin' && geoScope.divisionId) {
    const [division, districts] = await Promise.all([
      AdminArea.findById(geoScope.divisionId).select('admins'),
      AdminArea.find({ type: 'District', parent: geoScope.divisionId, org: orgId }).select('_id admins'),
    ]);
    if (division) division.admins.forEach((id) => userIds.add(String(id)));
    collectAdmins(districts);
    const districtIds = districts.map((d) => d._id);
    const upazilas = await AdminArea.find({ type: 'Upazila', parent: { $in: districtIds }, org: orgId }).select('_id admins');
    collectAdmins(upazilas);
    const upazilaIds = upazilas.map((u) => u._id);
    const thanas = await AdminArea.find({ type: 'Thana', parent: { $in: upazilaIds }, org: orgId }).select('_id admins');
    collectAdmins(thanas);
    const thanaIds = thanas.map((t) => t._id);
    const unions = await AdminArea.find({ type: 'Union', parent: { $in: thanaIds }, org: orgId }).select('admins');
    collectAdmins(unions);
  }

  // --- transitively pull in users created by anyone already in scope ---
  // Covers freshly-created sub-admins who haven't been linked to a ward / area / group yet.
  // BFS through `createdBy`; each iteration adds users created by the current frontier.
  let frontier = [...userIds];
  for (let depth = 0; depth < 8 && frontier.length > 0; depth++) {
    const created = await User.find({ createdBy: { $in: frontier }, org: orgId }).select('_id');
    const next = [];
    for (const u of created) {
      const idStr = String(u._id);
      if (!userIds.has(idStr)) {
        userIds.add(idStr);
        next.push(u._id);
      }
    }
    if (next.length === 0) break;
    frontier = next;
  }

  return [...userIds];
};

module.exports = { isGeoAdmin, resolveGeoScope, resolveWardIds, resolveGeoUserIds };
