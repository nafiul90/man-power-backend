const service = require('./groupTraining.service');
const { sendSuccess } = require('../../utils/response');

const getByGroup = async (req, res, next) => {
  try {
    const result = await service.getByGroup(req.params.groupId, req.user);
    sendSuccess(res, 200, 'Group trainings fetched.', result);
  } catch (err) { next(err); }
};

const getById = async (req, res, next) => {
  try {
    const result = await service.getById(req.params.id, req.user);
    sendSuccess(res, 200, 'GroupTraining fetched.', result);
  } catch (err) { next(err); }
};

const assign = async (req, res, next) => {
  try {
    const result = await service.assign(req.user, req.body);
    sendSuccess(res, 201, 'Training assigned to group.', result);
  } catch (err) { next(err); }
};

const updateInstructors = async (req, res, next) => {
  try {
    const result = await service.updateInstructors(req.params.id, req.user, req.body);
    sendSuccess(res, 200, 'Instructors updated.', result);
  } catch (err) { next(err); }
};

const updateStatus = async (req, res, next) => {
  try {
    const result = await service.updateStatus(req.params.id, req.user, req.body);
    sendSuccess(res, 200, 'Status updated.', result);
  } catch (err) { next(err); }
};

const remove = async (req, res, next) => {
  try {
    await service.remove(req.params.id, req.user);
    sendSuccess(res, 200, 'GroupTraining removed.');
  } catch (err) { next(err); }
};

module.exports = { getByGroup, getById, assign, updateInstructors, updateStatus, remove };
