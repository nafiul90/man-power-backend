const service = require('./group.service');
const { sendSuccess } = require('../../utils/response');

const getAll = async (req, res, next) => {
  try {
    const result = await service.getAll(req.user, req.query);
    sendSuccess(res, 200, 'Groups fetched.', result);
  } catch (err) { next(err); }
};

const getById = async (req, res, next) => {
  try {
    const group = await service.getById(req.params.id, req.user);
    sendSuccess(res, 200, 'Group fetched.', group);
  } catch (err) { next(err); }
};

const create = async (req, res, next) => {
  try {
    const group = await service.create(req.user, req.body);
    sendSuccess(res, 201, 'Group created.', group);
  } catch (err) { next(err); }
};

const update = async (req, res, next) => {
  try {
    const group = await service.update(req.params.id, req.user, req.body);
    sendSuccess(res, 200, 'Group updated.', group);
  } catch (err) { next(err); }
};

const remove = async (req, res, next) => {
  try {
    await service.remove(req.params.id, req.user);
    sendSuccess(res, 200, 'Group deleted.');
  } catch (err) { next(err); }
};

const updateAssignees = async (req, res, next) => {
  try {
    const group = await service.updateAssignees(req.params.id, req.user, req.body);
    sendSuccess(res, 200, 'Group assignees updated.', group);
  } catch (err) { next(err); }
};

module.exports = { getAll, getById, create, update, remove, updateAssignees };
