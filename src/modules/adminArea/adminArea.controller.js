const service = require('./adminArea.service');
const { sendSuccess } = require('../../utils/response');

const getAll = async (req, res, next) => {
  try {
    const result = await service.getAll(req.user, req.query);
    sendSuccess(res, 200, 'Admin areas fetched.', result);
  } catch (err) { next(err); }
};

const getById = async (req, res, next) => {
  try {
    const area = await service.getById(req.params.id, req.user);
    sendSuccess(res, 200, 'Admin area fetched.', area);
  } catch (err) { next(err); }
};

const create = async (req, res, next) => {
  try {
    const area = await service.create(req.user, req.body);
    sendSuccess(res, 201, 'Admin area created.', area);
  } catch (err) { next(err); }
};

const update = async (req, res, next) => {
  try {
    const area = await service.update(req.params.id, req.user, req.body);
    sendSuccess(res, 200, 'Admin area updated.', area);
  } catch (err) { next(err); }
};

const remove = async (req, res, next) => {
  try {
    await service.remove(req.params.id, req.user);
    sendSuccess(res, 200, 'Admin area deleted.');
  } catch (err) { next(err); }
};

module.exports = { getAll, getById, create, update, remove };
