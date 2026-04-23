const service = require('./ward.service');
const { sendSuccess } = require('../../utils/response');

const getAll = async (req, res, next) => {
  try {
    const result = await service.getAll(req.user, req.query);
    sendSuccess(res, 200, 'Wards fetched.', result);
  } catch (err) { next(err); }
};

const getById = async (req, res, next) => {
  try {
    const ward = await service.getById(req.params.id, req.user);
    sendSuccess(res, 200, 'Ward fetched.', ward);
  } catch (err) { next(err); }
};

const create = async (req, res, next) => {
  try {
    const ward = await service.create(req.user, req.body);
    sendSuccess(res, 201, 'Ward created.', ward);
  } catch (err) { next(err); }
};

const update = async (req, res, next) => {
  try {
    const ward = await service.update(req.params.id, req.user, req.body);
    sendSuccess(res, 200, 'Ward updated.', ward);
  } catch (err) { next(err); }
};

const remove = async (req, res, next) => {
  try {
    await service.remove(req.params.id, req.user);
    sendSuccess(res, 200, 'Ward deleted.');
  } catch (err) { next(err); }
};

module.exports = { getAll, getById, create, update, remove };
