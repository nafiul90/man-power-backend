const Category = require('./category.model');

const getAll = async (orgId, { page = 1, limit = 50, search }) => {
  const query = { org: orgId };
  if (search) query.title = { $regex: search, $options: 'i' };

  const skip = (page - 1) * limit;
  const [categories, total] = await Promise.all([
    Category.find(query).skip(skip).limit(Number(limit)).sort({ title: 1 }),
    Category.countDocuments(query),
  ]);
  return { categories, total, page: Number(page), pages: Math.ceil(total / limit) };
};

const getById = async (id, orgId) => {
  const category = await Category.findOne({ _id: id, org: orgId });
  if (!category) throw { statusCode: 404, message: 'Category not found.' };
  return category;
};

const create = async (orgId, { title }) => {
  return Category.create({ title, org: orgId });
};

const update = async (id, orgId, { title }) => {
  const category = await Category.findOneAndUpdate(
    { _id: id, org: orgId },
    { title },
    { new: true, runValidators: true }
  );
  if (!category) throw { statusCode: 404, message: 'Category not found.' };
  return category;
};

const remove = async (id, orgId) => {
  const category = await Category.findOneAndDelete({ _id: id, org: orgId });
  if (!category) throw { statusCode: 404, message: 'Category not found.' };
  return category;
};

module.exports = { getAll, getById, create, update, remove };
