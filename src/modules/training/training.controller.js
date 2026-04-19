const service = require('./training.service');
const { sendSuccess } = require('../../utils/response');

const getAll = async (req, res, next) => {
  try {
    const result = await service.getAll(req.user, req.query);
    sendSuccess(res, 200, 'Trainings fetched.', result);
  } catch (err) { next(err); }
};

const getById = async (req, res, next) => {
  try {
    const training = await service.getById(req.params.id, req.user);
    sendSuccess(res, 200, 'Training fetched.', training);
  } catch (err) { next(err); }
};

const create = async (req, res, next) => {
  try {
    const training = await service.create(req.user, req.body);
    sendSuccess(res, 201, 'Training created.', training);
  } catch (err) { next(err); }
};

const update = async (req, res, next) => {
  try {
    const training = await service.update(req.params.id, req.user, req.body);
    sendSuccess(res, 200, 'Training updated.', training);
  } catch (err) { next(err); }
};

const remove = async (req, res, next) => {
  try {
    await service.remove(req.params.id, req.user);
    sendSuccess(res, 200, 'Training deleted.');
  } catch (err) { next(err); }
};

module.exports = { getAll, getById, create, update, remove };
