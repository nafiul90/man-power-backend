const Training = require('./training.model');
const { buildOrgFilter } = require('../../utils/scope');

const getAll = async (reqUser, { page = 1, limit = 50, search, orgId }) => {
  const orgFilter = buildOrgFilter(reqUser, orgId);
  const query = { ...orgFilter };
  if (search) query.title = { $regex: search, $options: 'i' };

  const skip = (page - 1) * limit;
  const [trainings, total] = await Promise.all([
    Training.find(query).skip(skip).limit(Number(limit)).sort({ createdAt: -1 }),
    Training.countDocuments(query),
  ]);
  return { trainings, total, page: Number(page), pages: Math.ceil(total / limit) };
};

const getById = async (id, reqUser) => {
  const orgFilter = buildOrgFilter(reqUser);
  const training = await Training.findOne({ _id: id, ...orgFilter });
  if (!training) throw { statusCode: 404, message: 'Training not found.' };
  return training;
};

const create = async (reqUser, { title, purpose }) => {
  const orgFilter = buildOrgFilter(reqUser);
  if (!orgFilter.org) throw { statusCode: 400, message: 'No organization associated with your account.' };
  return Training.create({ title, purpose, org: orgFilter.org });
};

const update = async (id, reqUser, { title, purpose, isActive }) => {
  const orgFilter = buildOrgFilter(reqUser);
  const data = {};
  if (title !== undefined) data.title = title;
  if (purpose !== undefined) data.purpose = purpose;
  if (isActive !== undefined) data.isActive = isActive;

  const training = await Training.findOneAndUpdate(
    { _id: id, ...orgFilter },
    data,
    { new: true, runValidators: true }
  );
  if (!training) throw { statusCode: 404, message: 'Training not found.' };
  return training;
};

const remove = async (id, reqUser) => {
  const orgFilter = buildOrgFilter(reqUser);
  const training = await Training.findOneAndDelete({ _id: id, ...orgFilter });
  if (!training) throw { statusCode: 404, message: 'Training not found.' };
  return training;
};

module.exports = { getAll, getById, create, update, remove };
