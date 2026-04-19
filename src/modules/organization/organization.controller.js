const service = require('./organization.service');
const { sendSuccess, sendError } = require('../../utils/response');

const getAll = async (req, res, next) => {
  try {
    const result = await service.getAll(req.query);
    sendSuccess(res, 200, 'Organizations fetched.', result);
  } catch (err) { next(err); }
};

const getById = async (req, res, next) => {
  try {
    const org = await service.getById(req.params.id);
    sendSuccess(res, 200, 'Organization fetched.', org);
  } catch (err) { next(err); }
};

const getMyOrg = async (req, res, next) => {
  try {
    const org = await service.getMyOrg(req.user._id);
    sendSuccess(res, 200, 'Organization fetched.', org);
  } catch (err) { next(err); }
};

const create = async (req, res, next) => {
  try {
    const org = await service.create(req.body);
    sendSuccess(res, 201, 'Organization created.', org);
  } catch (err) { next(err); }
};

const update = async (req, res, next) => {
  try {
    const org = await service.update(req.params.id, req.body);
    sendSuccess(res, 200, 'Organization updated.', org);
  } catch (err) { next(err); }
};

const remove = async (req, res, next) => {
  try {
    await service.remove(req.params.id);
    sendSuccess(res, 200, 'Organization deleted.');
  } catch (err) { next(err); }
};

const getOrgOwners = async (req, res, next) => {
  try {
    const owners = await service.getOrgOwners();
    sendSuccess(res, 200, 'Org owners fetched.', owners);
  } catch (err) { next(err); }
};

module.exports = { getAll, getById, getMyOrg, create, update, remove, getOrgOwners };
