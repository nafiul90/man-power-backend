const Category = require('./category.model');
const { buildOrgFilter } = require('../../utils/scope');

const getAll = async (reqUser, { page = 1, limit = 50, search, orgId }) => {
  const orgFilter = buildOrgFilter(reqUser, orgId);
  const query = { ...orgFilter };
  if (search) query.title = { $regex: search, $options: 'i' };

  const skip = (page - 1) * limit;
  const [categories, total] = await Promise.all([
    Category.find(query).skip(skip).limit(Number(limit)).sort({ title: 1 }),
    Category.countDocuments(query),
  ]);
  return { categories, total, page: Number(page), pages: Math.ceil(total / limit) };
};

const getById = async (id, reqUser) => {
  const orgFilter = buildOrgFilter(reqUser);
  const category = await Category.findOne({ _id: id, ...orgFilter });
  if (!category) throw { statusCode: 404, message: 'Category not found.' };
  return category;
};

const create = async (reqUser, { title }) => {
  const orgFilter = buildOrgFilter(reqUser);
  if (!orgFilter.org) throw { statusCode: 400, message: 'No organization associated with your account.' };
  return Category.create({ title, org: orgFilter.org });
};

const update = async (id, reqUser, { title }) => {
  const orgFilter = buildOrgFilter(reqUser);
  const category = await Category.findOneAndUpdate(
    { _id: id, ...orgFilter },
    { title },
    { new: true, runValidators: true }
  );
  if (!category) throw { statusCode: 404, message: 'Category not found.' };
  return category;
};

const remove = async (id, reqUser) => {
  const orgFilter = buildOrgFilter(reqUser);
  const category = await Category.findOneAndDelete({ _id: id, ...orgFilter });
  if (!category) throw { statusCode: 404, message: 'Category not found.' };
  return category;
};

module.exports = { getAll, getById, create, update, remove };
