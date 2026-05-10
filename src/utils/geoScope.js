const AdminArea = require('../modules/adminArea/adminArea.model');
const Ward = require('../modules/ward/ward.model');
const Group = require('../modules/group/group.model');
const User = require('../modules/user/user.model');

const GEO_ADMIN_ROLES = ['Division Admin', 'District Admin', 'Upazila Admin', 'Thana Admin', 'Union Admin', 'Ward Admin'];

const isGeoAdmin = (role) => GEO_ADMIN_ROLES.includes(role);

const dedupe = (ids) => {
  const seen = new Set();
  const out = [];
  for (const id of ids) {
    if (!id) continue;
    const k = String(id);
    if (!seen.has(k)) { seen.add(k); out.push(id); }
  }
  return out;
};

/**
 * Resolves the geographic scope for a geo-admin user. Each user may be admin of
 * multiple areas at their level — every level returns an ARRAY of IDs.
 *
 * Hierarchy: Division → District → Upazila → Thana → Union → Ward
 *
 * Returned shape:
 *  - Division Admin: { divisionIds }
 *  - District Admin: { districtIds, divisionIds }
 *  - Upazila Admin:  { upazilaIds, districtIds, divisionIds }
 *  - Thana Admin:    { thanaIds, upazilaIds, districtIds, divisionIds }
 *  - Union Admin:    { unionIds, thanaIds, upazilaIds, districtIds, divisionIds }
 *  - Ward Admin:     { wardIds }
 */
const resolveGeoScope = async (user) => {
  const orgId = user.org?._id ?? user.org;
  const userId = user._id;

  const findAreas = (type) => AdminArea.find({ type, admins: userId, org: orgId }).select('_id parent');
  const fetchParents = async (children) => {
    const parentIds = dedupe(children.map((c) => c.parent).filter(Boolean));
    if (!parentIds.length) return [];
    return AdminArea.find({ _id: { $in: parentIds }, org: orgId }).select('_id parent');
  };

  if (user.role === 'Division Admin') {
    const divisions = await findAreas('Division');
    return { divisionIds: divisions.map((d) => d._id) };
  }

  if (user.role === 'District Admin') {
    const districts = await findAreas('District');
    return {
      districtIds: districts.map((d) => d._id),
      divisionIds: dedupe(districts.map((d) => d.parent).filter(Boolean)),
    };
  }

  if (user.role === 'Upazila Admin') {
    const upazilas = await findAreas('Upazila');
    const districts = await fetchParents(upazilas);
    return {
      upazilaIds: upazilas.map((u) => u._id),
      districtIds: districts.map((d) => d._id),
      divisionIds: dedupe(districts.map((d) => d.parent).filter(Boolean)),
    };
  }

  if (user.role === 'Thana Admin') {
    const thanas = await findAreas('Thana');
    const upazilas = await fetchParents(thanas);
    const districts = await fetchParents(upazilas);
    return {
      thanaIds: thanas.map((t) => t._id),
      upazilaIds: upazilas.map((u) => u._id),
      districtIds: districts.map((d) => d._id),
      divisionIds: dedupe(districts.map((d) => d.parent).filter(Boolean)),
    };
  }

  if (user.role === 'Union Admin') {
    const unions = await findAreas('Union');
    const thanas = await fetchParents(unions);
    const upazilas = await fetchParents(thanas);
    const districts = await fetchParents(upazilas);
    return {
      unionIds: unions.map((u) => u._id),
      thanaIds: thanas.map((t) => t._id),
      upazilaIds: upazilas.map((u) => u._id),
      districtIds: districts.map((d) => d._id),
      divisionIds: dedupe(districts.map((d) => d.parent).filter(Boolean)),
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
  if (role === 'Union Admin')   filter.union    = { $in: geoScope.unionIds   ?? [] };
  else if (role === 'Thana Admin') filter.thana    = { $in: geoScope.thanaIds    ?? [] };
  else if (role === 'Upazila Admin') filter.upazila = { $in: geoScope.upazilaIds ?? [] };
  else if (role === 'District Admin') filter.district = { $in: geoScope.districtIds ?? [] };
  else if (role === 'Division Admin') filter.division = { $in: geoScope.divisionIds ?? [] };

  const wards = await Ward.find(filter).select('_id');
  return wards.map((w) => w._id);
};

/**
 * Returns user IDs in a geo-admin's scope (members, ward admins, area admins,
 * plus any users transitively created by anyone already in scope).
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
    if (role === 'Union Admin')   filter.union    = { $in: geoScope.unionIds   ?? [] };
    else if (role === 'Thana Admin') filter.thana    = { $in: geoScope.thanaIds    ?? [] };
    else if (role === 'Upazila Admin') filter.upazila = { $in: geoScope.upazilaIds ?? [] };
    else if (role === 'District Admin') filter.district = { $in: geoScope.districtIds ?? [] };
    else if (role === 'Division Admin') filter.division = { $in: geoScope.divisionIds ?? [] };

    const wards = await Ward.find(filter).select('_id admins');
    wardIds = wards.map((w) => w._id);
    wards.forEach((w) => w.admins.forEach((id) => userIds.add(String(id))));
  }

  // --- collect group members in scope ---
  const groupOr = [{ ward: { $in: wardIds } }];
  if (role === 'Union Admin' && geoScope.unionIds?.length) groupOr.push({ union: { $in: geoScope.unionIds } });
  else if (role === 'Thana Admin' && geoScope.thanaIds?.length) groupOr.push({ thana: { $in: geoScope.thanaIds } });
  else if (role === 'Upazila Admin' && geoScope.upazilaIds?.length) groupOr.push({ upazila: { $in: geoScope.upazilaIds } });
  else if (role === 'District Admin' && geoScope.districtIds?.length) groupOr.push({ district: { $in: geoScope.districtIds } });
  else if (role === 'Division Admin' && geoScope.divisionIds?.length) groupOr.push({ division: { $in: geoScope.divisionIds } });
  const groups = await Group.find({ org: orgId, $or: groupOr }).select('members teamLeaders secretaries');
  groups.forEach((g) => {
    g.members.forEach((id) => userIds.add(String(id)));
    g.teamLeaders.forEach((id) => userIds.add(String(id)));
    g.secretaries.forEach((id) => userIds.add(String(id)));
  });

  // --- collect AdminArea admins within scope (walk down the hierarchy) ---
  const collectAdmins = (areas) => areas.forEach((a) => a.admins.forEach((id) => userIds.add(String(id))));

  if (role === 'Union Admin' && geoScope.unionIds?.length) {
    const areas = await AdminArea.find({ _id: { $in: geoScope.unionIds }, org: orgId }).select('admins');
    collectAdmins(areas);
  } else if (role === 'Thana Admin' && geoScope.thanaIds?.length) {
    const [thanas, unions] = await Promise.all([
      AdminArea.find({ _id: { $in: geoScope.thanaIds }, org: orgId }).select('admins'),
      AdminArea.find({ type: 'Union', parent: { $in: geoScope.thanaIds }, org: orgId }).select('admins'),
    ]);
    collectAdmins(thanas); collectAdmins(unions);
  } else if (role === 'Upazila Admin' && geoScope.upazilaIds?.length) {
    const [upazilas, thanas] = await Promise.all([
      AdminArea.find({ _id: { $in: geoScope.upazilaIds }, org: orgId }).select('admins'),
      AdminArea.find({ type: 'Thana', parent: { $in: geoScope.upazilaIds }, org: orgId }).select('_id admins'),
    ]);
    collectAdmins(upazilas); collectAdmins(thanas);
    const thanaIds = thanas.map((t) => t._id);
    const unions = await AdminArea.find({ type: 'Union', parent: { $in: thanaIds }, org: orgId }).select('admins');
    collectAdmins(unions);
  } else if (role === 'District Admin' && geoScope.districtIds?.length) {
    const [districts, upazilas] = await Promise.all([
      AdminArea.find({ _id: { $in: geoScope.districtIds }, org: orgId }).select('admins'),
      AdminArea.find({ type: 'Upazila', parent: { $in: geoScope.districtIds }, org: orgId }).select('_id admins'),
    ]);
    collectAdmins(districts); collectAdmins(upazilas);
    const upazilaIds = upazilas.map((u) => u._id);
    const thanas = await AdminArea.find({ type: 'Thana', parent: { $in: upazilaIds }, org: orgId }).select('_id admins');
    collectAdmins(thanas);
    const thanaIds = thanas.map((t) => t._id);
    const unions = await AdminArea.find({ type: 'Union', parent: { $in: thanaIds }, org: orgId }).select('admins');
    collectAdmins(unions);
  } else if (role === 'Division Admin' && geoScope.divisionIds?.length) {
    const [divisions, districts] = await Promise.all([
      AdminArea.find({ _id: { $in: geoScope.divisionIds }, org: orgId }).select('admins'),
      AdminArea.find({ type: 'District', parent: { $in: geoScope.divisionIds }, org: orgId }).select('_id admins'),
    ]);
    collectAdmins(divisions); collectAdmins(districts);
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

  // --- transitively pull in users created by anyone in scope (BFS via createdBy) ---
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
