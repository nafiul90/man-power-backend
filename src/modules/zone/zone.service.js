const Zone = require('./zone.model');

const PARENT_TYPE = { District: 'Division', Upazila: 'District', Union: 'Upazila' };

const getAll = async (orgId, { type, parentId, page = 1, limit = 100, search }) => {
  const query = { org: orgId };
  if (type) query.type = type;
  if (parentId) query.parent = parentId;
  if (search) query.name = { $regex: search, $options: 'i' };

  const skip = (page - 1) * limit;
  const [zones, total] = await Promise.all([
    Zone.find(query)
      .populate('parent', 'name type')
      .skip(skip)
      .limit(Number(limit))
      .sort({ name: 1 }),
    Zone.countDocuments(query),
  ]);
  return { zones, total, page: Number(page), pages: Math.ceil(total / limit) };
};

const getById = async (id, orgId) => {
  const zone = await Zone.findOne({ _id: id, org: orgId }).populate('parent', 'name type');
  if (!zone) throw { statusCode: 404, message: 'Zone not found.' };
  return zone;
};

const create = async (orgId, { name, type, parent }) => {
  if (parent && PARENT_TYPE[type]) {
    const parentZone = await Zone.findOne({ _id: parent, org: orgId, type: PARENT_TYPE[type] });
    if (!parentZone) throw { statusCode: 400, message: `Parent must be a ${PARENT_TYPE[type]}.` };
  }
  return Zone.create({ name, type, parent: parent || null, org: orgId });
};

const update = async (id, orgId, { name, parent }) => {
  const zone = await Zone.findOne({ _id: id, org: orgId });
  if (!zone) throw { statusCode: 404, message: 'Zone not found.' };

  if (parent !== undefined && parent && PARENT_TYPE[zone.type]) {
    const parentZone = await Zone.findOne({ _id: parent, org: orgId, type: PARENT_TYPE[zone.type] });
    if (!parentZone) throw { statusCode: 400, message: `Parent must be a ${PARENT_TYPE[zone.type]}.` };
  }

  const data = {};
  if (name !== undefined) data.name = name;
  if (parent !== undefined) data.parent = parent || null;

  return Zone.findByIdAndUpdate(id, data, { new: true, runValidators: true }).populate('parent', 'name type');
};

const remove = async (id, orgId) => {
  const children = await Zone.countDocuments({ parent: id, org: orgId });
  if (children > 0) throw { statusCode: 400, message: 'Cannot delete zone with children. Remove children first.' };
  const zone = await Zone.findOneAndDelete({ _id: id, org: orgId });
  if (!zone) throw { statusCode: 404, message: 'Zone not found.' };
  return zone;
};

module.exports = { getAll, getById, create, update, remove };
