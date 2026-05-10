const AdminArea = require('./adminArea.model');
const { buildOrgFilter } = require('../../utils/scope');

// Hierarchy: Division → District → Upazila → Thana → Union
const PARENT_TYPE = { District: 'Division', Upazila: 'District', Thana: 'Upazila', Union: 'Thana' };

// Each geo-admin role can create areas of types BELOW their level.
const ALLOWED_CREATE_TYPES = {
  'Division Admin': ['District', 'Upazila', 'Thana', 'Union'],
  'District Admin': ['Upazila', 'Thana', 'Union'],
  'Upazila Admin':  ['Thana', 'Union'],
  'Thana Admin':    ['Union'],
};
const UNRESTRICTED_WRITE_ROLES = new Set(['Super Admin', 'Org Owner', 'Manager']);

// Map a geo-admin role to its anchor (territory IDs key + ancestor type).
const ROLE_ANCHOR = {
  'Division Admin': { idsKey: 'divisionIds', anchorType: 'Division' },
  'District Admin': { idsKey: 'districtIds', anchorType: 'District' },
  'Upazila Admin':  { idsKey: 'upazilaIds',  anchorType: 'Upazila'  },
  'Thana Admin':    { idsKey: 'thanaIds',    anchorType: 'Thana'    },
};

/**
 * Walk up the parent chain of `areaId` until a node of `targetType` is found.
 * Returns the matching ancestor's _id (string) or null.
 */
const findAncestorOfType = async (areaId, targetType, orgId) => {
  let cursor = await AdminArea.findOne({ _id: areaId, org: orgId }).select('type parent');
  while (cursor) {
    if (cursor.type === targetType) return String(cursor._id);
    if (!cursor.parent) return null;
    cursor = await AdminArea.findOne({ _id: cursor.parent, org: orgId }).select('type parent');
  }
  return null;
};

const assertWriteScope = async (reqUser, { type, parent, orgId }) => {
  const { role, geoScope } = reqUser;
  if (UNRESTRICTED_WRITE_ROLES.has(role)) return;

  const allowedTypes = ALLOWED_CREATE_TYPES[role];
  if (!allowedTypes) {
    throw { statusCode: 403, message: `${role} cannot create or modify admin areas.` };
  }
  if (!allowedTypes.includes(type)) {
    throw { statusCode: 403, message: `${role} cannot manage ${type} areas.` };
  }

  const anchor = ROLE_ANCHOR[role];
  const territoryIds = (geoScope?.[anchor?.idsKey] ?? []).map(String);
  if (!territoryIds.length) {
    throw { statusCode: 403, message: 'No territory assigned to your account.' };
  }

  if (parent) {
    const ancestorId = await findAncestorOfType(parent, anchor.anchorType, orgId);
    if (!ancestorId || !territoryIds.includes(ancestorId)) {
      throw { statusCode: 403, message: `Selected parent is outside your ${anchor.anchorType.toLowerCase()}.` };
    }
  }
};

const EMPTY = (page, limit) => ({ areas: [], total: 0, page: Number(page), pages: 0 });

const getAll = async (reqUser, { type, parentId, page = 1, limit = 200, search, orgId }) => {
  const orgFilter = buildOrgFilter(reqUser, orgId);
  const query = { ...orgFilter };
  if (search) query.name = { $regex: search, $options: 'i' };

  const { role, geoScope } = reqUser;

  if (role === 'Ward Admin') {
    return EMPTY(page, limit);
  }

  if (role === 'Union Admin') {
    const ids = geoScope?.unionIds ?? [];
    if (!ids.length) return EMPTY(page, limit);
    if (type && type !== 'Union') return EMPTY(page, limit);
    query.type = 'Union';
    query._id = { $in: ids };

  } else if (role === 'Thana Admin') {
    const ids = geoScope?.thanaIds ?? [];
    if (!ids.length) return EMPTY(page, limit);
    const requestedType = type || null;
    if (['Division', 'District', 'Upazila'].includes(requestedType)) return EMPTY(page, limit);
    if (!requestedType || requestedType === 'Thana') {
      query.type = 'Thana';
      query._id = { $in: ids };
    } else {
      query.type = 'Union';
      const idsStr = ids.map(String);
      if (parentId) {
        if (!idsStr.includes(String(parentId))) return EMPTY(page, limit);
        query.parent = parentId;
      } else {
        query.parent = { $in: ids };
      }
    }

  } else if (role === 'Upazila Admin') {
    const ids = geoScope?.upazilaIds ?? [];
    if (!ids.length) return EMPTY(page, limit);
    const requestedType = type || null;
    if (['Division', 'District'].includes(requestedType)) return EMPTY(page, limit);

    if (!requestedType || requestedType === 'Upazila') {
      query.type = 'Upazila';
      query._id = { $in: ids };
    } else if (requestedType === 'Thana') {
      query.type = 'Thana';
      const idsStr = ids.map(String);
      if (parentId) {
        if (!idsStr.includes(String(parentId))) return EMPTY(page, limit);
        query.parent = parentId;
      } else {
        query.parent = { $in: ids };
      }
    } else {
      // Union — parent must be a thana inside one of these upazilas
      query.type = 'Union';
      const thanas = await AdminArea.find({ type: 'Thana', parent: { $in: ids }, ...orgFilter }).select('_id');
      const thanaIds = thanas.map((t) => t._id);
      const thanaIdsStr = thanaIds.map(String);
      if (parentId) {
        if (!thanaIdsStr.includes(String(parentId))) return EMPTY(page, limit);
        query.parent = parentId;
      } else {
        query.parent = { $in: thanaIds };
      }
    }

  } else if (role === 'District Admin') {
    const ids = geoScope?.districtIds ?? [];
    if (!ids.length) return EMPTY(page, limit);
    const requestedType = type || null;
    if (requestedType === 'Division') return EMPTY(page, limit);

    if (!requestedType || requestedType === 'District') {
      query.type = 'District';
      query._id = { $in: ids };
    } else if (requestedType === 'Upazila') {
      query.type = 'Upazila';
      const idsStr = ids.map(String);
      if (parentId) {
        if (!idsStr.includes(String(parentId))) return EMPTY(page, limit);
        query.parent = parentId;
      } else {
        query.parent = { $in: ids };
      }
    } else if (requestedType === 'Thana') {
      query.type = 'Thana';
      const upazilas = await AdminArea.find({ type: 'Upazila', parent: { $in: ids }, ...orgFilter }).select('_id');
      const upazilaIds = upazilas.map((u) => u._id);
      const upazilaIdsStr = upazilaIds.map(String);
      if (parentId) {
        if (!upazilaIdsStr.includes(String(parentId))) return EMPTY(page, limit);
        query.parent = parentId;
      } else {
        query.parent = { $in: upazilaIds };
      }
    } else {
      query.type = 'Union';
      const upazilas = await AdminArea.find({ type: 'Upazila', parent: { $in: ids }, ...orgFilter }).select('_id');
      const thanas = await AdminArea.find({ type: 'Thana', parent: { $in: upazilas.map((u) => u._id) }, ...orgFilter }).select('_id');
      const thanaIds = thanas.map((t) => t._id);
      const thanaIdsStr = thanaIds.map(String);
      if (parentId) {
        if (!thanaIdsStr.includes(String(parentId))) return EMPTY(page, limit);
        query.parent = parentId;
      } else {
        query.parent = { $in: thanaIds };
      }
    }

  } else if (role === 'Division Admin') {
    const ids = geoScope?.divisionIds ?? [];
    if (!ids.length) return EMPTY(page, limit);
    const requestedType = type || null;

    if (!requestedType || requestedType === 'Division') {
      query.type = 'Division';
      query._id = { $in: ids };
    } else if (requestedType === 'District') {
      query.type = 'District';
      const idsStr = ids.map(String);
      if (parentId) {
        if (!idsStr.includes(String(parentId))) return EMPTY(page, limit);
        query.parent = parentId;
      } else {
        query.parent = { $in: ids };
      }
    } else {
      const districts = await AdminArea.find({ type: 'District', parent: { $in: ids }, ...orgFilter }).select('_id');
      const districtIds = districts.map((d) => d._id);
      if (requestedType === 'Upazila') {
        query.type = 'Upazila';
        const districtIdsStr = districtIds.map(String);
        if (parentId) {
          if (!districtIdsStr.includes(String(parentId))) return EMPTY(page, limit);
          query.parent = parentId;
        } else {
          query.parent = { $in: districtIds };
        }
      } else {
        const upazilas = await AdminArea.find({ type: 'Upazila', parent: { $in: districtIds }, ...orgFilter }).select('_id');
        const upazilaIds = upazilas.map((u) => u._id);
        if (requestedType === 'Thana') {
          query.type = 'Thana';
          const upazilaIdsStr = upazilaIds.map(String);
          if (parentId) {
            if (!upazilaIdsStr.includes(String(parentId))) return EMPTY(page, limit);
            query.parent = parentId;
          } else {
            query.parent = { $in: upazilaIds };
          }
        } else {
          // Union
          const thanas = await AdminArea.find({ type: 'Thana', parent: { $in: upazilaIds }, ...orgFilter }).select('_id');
          const thanaIds = thanas.map((t) => t._id);
          query.type = 'Union';
          const thanaIdsStr = thanaIds.map(String);
          if (parentId) {
            if (!thanaIdsStr.includes(String(parentId))) return EMPTY(page, limit);
            query.parent = parentId;
          } else {
            query.parent = { $in: thanaIds };
          }
        }
      }
    }

  } else {
    // Non-geo admins (Super Admin, Org Owner, Manager, etc.) — normal filters
    if (type) query.type = type;
    if (parentId) query.parent = parentId;
  }

  const skip = (page - 1) * limit;
  const [areas, total] = await Promise.all([
    AdminArea.find(query)
      .populate('parent', 'name type')
      .populate('admins', 'fullName phone role')
      .skip(skip)
      .limit(Number(limit))
      .sort({ name: 1 }),
    AdminArea.countDocuments(query),
  ]);
  return { areas, total, page: Number(page), pages: Math.ceil(total / limit) };
};

const getById = async (id, reqUser) => {
  const orgFilter = buildOrgFilter(reqUser);
  const area = await AdminArea.findOne({ _id: id, ...orgFilter })
    .populate('parent', 'name type')
    .populate('admins', 'fullName phone role');
  if (!area) throw { statusCode: 404, message: 'Admin area not found.' };
  return area;
};

const create = async (reqUser, { name, type, parent, admins }) => {
  const orgFilter = buildOrgFilter(reqUser);
  if (!orgFilter.org) throw { statusCode: 400, message: 'No organization associated with your account.' };

  if (PARENT_TYPE[type]) {
    if (!parent) throw { statusCode: 400, message: `${type} requires a ${PARENT_TYPE[type]} parent.` };
    const parentArea = await AdminArea.findOne({ _id: parent, org: orgFilter.org, type: PARENT_TYPE[type] });
    if (!parentArea) throw { statusCode: 400, message: `Parent must be a ${PARENT_TYPE[type]}.` };
  }

  await assertWriteScope(reqUser, { type, parent, orgId: orgFilter.org });

  return AdminArea.create({ name, type, parent: parent || null, admins: admins || [], org: orgFilter.org });
};

const update = async (id, reqUser, { name, parent, admins }) => {
  const orgFilter = buildOrgFilter(reqUser);
  const area = await AdminArea.findOne({ _id: id, ...orgFilter });
  if (!area) throw { statusCode: 404, message: 'Admin area not found.' };

  if (parent !== undefined && parent && PARENT_TYPE[area.type]) {
    const parentArea = await AdminArea.findOne({ _id: parent, org: area.org, type: PARENT_TYPE[area.type] });
    if (!parentArea) throw { statusCode: 400, message: `Parent must be a ${PARENT_TYPE[area.type]}.` };
  }

  await assertWriteScope(reqUser, {
    type: area.type,
    parent: parent !== undefined ? parent : area.parent,
    orgId: orgFilter.org,
  });

  const data = {};
  if (name !== undefined) data.name = name;
  if (parent !== undefined) data.parent = parent || null;
  if (admins !== undefined) data.admins = admins;

  return AdminArea.findByIdAndUpdate(id, data, { new: true, runValidators: true })
    .populate('parent', 'name type')
    .populate('admins', 'fullName phone role');
};

const remove = async (id, reqUser) => {
  const orgFilter = buildOrgFilter(reqUser);
  const area = await AdminArea.findOne({ _id: id, ...orgFilter });
  if (!area) throw { statusCode: 404, message: 'Admin area not found.' };

  await assertWriteScope(reqUser, { type: area.type, parent: area.parent, orgId: orgFilter.org });

  const children = await AdminArea.countDocuments({ parent: id });
  if (children > 0) throw { statusCode: 400, message: 'Cannot delete: area has children. Remove children first.' };
  await AdminArea.findOneAndDelete({ _id: id, ...orgFilter });
  return area;
};

module.exports = { getAll, getById, create, update, remove };
