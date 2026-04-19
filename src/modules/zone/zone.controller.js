const service = require('./zone.service');
const { sendSuccess } = require('../../utils/response');

const getAll = async (req, res, next) => {
  try {
    const result = await service.getAll(req.orgId, req.query);
    sendSuccess(res, 200, 'Zones fetched.', result);
  } catch (err) { next(err); }
};

const getById = async (req, res, next) => {
  try {
    const zone = await service.getById(req.params.id, req.orgId);
    sendSuccess(res, 200, 'Zone fetched.', zone);
  } catch (err) { next(err); }
};

const create = async (req, res, next) => {
  try {
    const zone = await service.create(req.orgId, req.body);
    sendSuccess(res, 201, 'Zone created.', zone);
  } catch (err) { next(err); }
};

const update = async (req, res, next) => {
  try {
    const zone = await service.update(req.params.id, req.orgId, req.body);
    sendSuccess(res, 200, 'Zone updated.', zone);
  } catch (err) { next(err); }
};

const remove = async (req, res, next) => {
  try {
    await service.remove(req.params.id, req.orgId);
    sendSuccess(res, 200, 'Zone deleted.');
  } catch (err) { next(err); }
};

module.exports = { getAll, getById, create, update, remove };
