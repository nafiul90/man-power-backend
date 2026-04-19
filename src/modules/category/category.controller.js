const service = require('./category.service');
const { sendSuccess } = require('../../utils/response');

const getAll = async (req, res, next) => {
  try {
    const result = await service.getAll(req.orgId, req.query);
    sendSuccess(res, 200, 'Categories fetched.', result);
  } catch (err) { next(err); }
};

const getById = async (req, res, next) => {
  try {
    const category = await service.getById(req.params.id, req.orgId);
    sendSuccess(res, 200, 'Category fetched.', category);
  } catch (err) { next(err); }
};

const create = async (req, res, next) => {
  try {
    const category = await service.create(req.orgId, req.body);
    sendSuccess(res, 201, 'Category created.', category);
  } catch (err) { next(err); }
};

const update = async (req, res, next) => {
  try {
    const category = await service.update(req.params.id, req.orgId, req.body);
    sendSuccess(res, 200, 'Category updated.', category);
  } catch (err) { next(err); }
};

const remove = async (req, res, next) => {
  try {
    await service.remove(req.params.id, req.orgId);
    sendSuccess(res, 200, 'Category deleted.');
  } catch (err) { next(err); }
};

module.exports = { getAll, getById, create, update, remove };
