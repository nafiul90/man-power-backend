const service = require('./fund.service');
const { sendSuccess } = require('../../utils/response');

const getAll = async (req, res, next) => {
  try {
    const result = await service.getAll(req.user, req.query);
    sendSuccess(res, 200, 'Funds fetched.', result);
  } catch (err) { next(err); }
};

const getById = async (req, res, next) => {
  try {
    const fund = await service.getById(req.params.id, req.user);
    sendSuccess(res, 200, 'Fund fetched.', fund);
  } catch (err) { next(err); }
};

const create = async (req, res, next) => {
  try {
    const fund = await service.create(req.user, req.body);
    sendSuccess(res, 201, 'Fund created.', fund);
  } catch (err) { next(err); }
};

const update = async (req, res, next) => {
  try {
    const fund = await service.update(req.params.id, req.user, req.body);
    sendSuccess(res, 200, 'Fund updated.', fund);
  } catch (err) { next(err); }
};

const activate = async (req, res, next) => {
  try {
    const fund = await service.activate(req.params.id, req.user);
    sendSuccess(res, 200, 'Fund activated. Installments generated.', fund);
  } catch (err) { next(err); }
};

const updateStatus = async (req, res, next) => {
  try {
    const fund = await service.updateStatus(req.params.id, req.user, req.body.status);
    sendSuccess(res, 200, 'Fund status updated.', fund);
  } catch (err) { next(err); }
};

const remove = async (req, res, next) => {
  try {
    await service.remove(req.params.id, req.user);
    sendSuccess(res, 200, 'Fund deleted.');
  } catch (err) { next(err); }
};

const getSummary = async (req, res, next) => {
  try {
    const summary = await service.getSummary(req.params.id, req.user);
    sendSuccess(res, 200, 'Fund summary fetched.', summary);
  } catch (err) { next(err); }
};

module.exports = { getAll, getById, create, update, activate, updateStatus, remove, getSummary };
