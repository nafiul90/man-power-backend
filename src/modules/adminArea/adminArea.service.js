const AdminArea = require('./adminArea.model');
const { buildOrgFilter } = require('../../utils/scope');

const PARENT_TYPE = { District: 'Division', Upazila: 'District', Union: 'Upazila' };

const EMPTY = (page, limit) => ({ areas: [], total: 0, page: Number(page), pages: 0 });

const getAll = async (reqUser, { type, parentId, page = 1, limit = 200, search, orgId }) => {
  const orgFilter = buildOrgFilter(reqUser, orgId);
  const query = { ...orgFilter };
  if (search) query.name = { $regex: search, $options: 'i' };

  const { role, geoScope } = reqUser;

  if (role === 'Ward Admin') {
    // Ward admins have no admin-area responsibilities
    return EMPTY(page, limit);
  }

  if (role === 'Union Admin') {
    const { unionId } = geoScope ?? {};
    if (!unionId) return EMPTY(page, limit);
    if (type && type !== 'Union') return EMPTY(page, limit);
    query.type = 'Union';
    query._id = unionId;

  } else if (role === 'Upazila Admin') {
    const { upazilaId } = geoScope ?? {};
    if (!upazilaId) return EMPTY(page, limit);

    const requestedType = type || null;
    if (requestedType === 'Division' || requestedType === 'District') return EMPTY(page, limit);

    if (!requestedType || requestedType === 'Upazila') {
      query.type = 'Upazila';
      query._id = upazilaId;
    } else {
      // Union — only those whose parent is their upazila
      query.type = 'Union';
      if (parentId) {
        if (String(parentId) !== String(upazilaId)) return EMPTY(page, limit);
        query.parent = parentId;
      } else {
        query.parent = upazilaId;
      }
    }

  } else if (role === 'District Admin') {
    const { districtId } = geoScope ?? {};
    if (!districtId) return EMPTY(page, limit);

    const requestedType = type || null;
    if (requestedType === 'Division') return EMPTY(page, limit);

    if (!requestedType || requestedType === 'District') {
      query.type = 'District';
      query._id = districtId;
    } else if (requestedType === 'Upazila') {
      query.type = 'Upazila';
      if (parentId) {
        if (String(parentId) !== String(districtId)) return EMPTY(page, limit);
        query.parent = parentId;
      } else {
        query.parent = districtId;
      }
    } else {
      // Union — only those under upazilas in their district
      query.type = 'Union';
      if (parentId) {
        // Verify that parentId is a valid upazila inside this district
        const upazila = await AdminArea.findOne({
          _id: parentId, type: 'Upazila', parent: districtId, ...orgFilter,
        }).select('_id');
        if (!upazila) return EMPTY(page, limit);
        query.parent = parentId;
      } else {
        const upazilas = await AdminArea.find({
          type: 'Upazila', parent: districtId, ...orgFilter,
        }).select('_id');
        query.parent = { $in: upazilas.map((u) => u._id) };
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

  if (parent && PARENT_TYPE[type]) {
    const parentArea = await AdminArea.findOne({ _id: parent, org: orgFilter.org, type: PARENT_TYPE[type] });
    if (!parentArea) throw { statusCode: 400, message: `Parent must be a ${PARENT_TYPE[type]}.` };
  }
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
  const children = await AdminArea.countDocuments({ parent: id });
  if (children > 0) throw { statusCode: 400, message: 'Cannot delete: area has children. Remove children first.' };
  const area = await AdminArea.findOneAndDelete({ _id: id, ...orgFilter });
  if (!area) throw { statusCode: 404, message: 'Admin area not found.' };
  return area;
};

module.exports = { getAll, getById, create, update, remove };
