const service = require('./certificate.service');
const { sendSuccess } = require('../../utils/response');

const getAll = async (req, res, next) => {
  try {
    const result = await service.getAll(req.user, req.query);
    sendSuccess(res, 200, 'Certificates fetched.', result);
  } catch (err) { next(err); }
};

const getByMember = async (req, res, next) => {
  try {
    const result = await service.getByMember(req.params.memberId, req.user);
    sendSuccess(res, 200, 'Certificates fetched.', result);
  } catch (err) { next(err); }
};

const getByGroup = async (req, res, next) => {
  try {
    const result = await service.getByGroup(req.params.groupId, req.user);
    sendSuccess(res, 200, 'Group certificates fetched.', result);
  } catch (err) { next(err); }
};

const issue = async (req, res, next) => {
  try {
    const result = await service.issue(req.user, req.body);
    sendSuccess(res, 201, 'Certificate issued.', result);
  } catch (err) { next(err); }
};

const revoke = async (req, res, next) => {
  try {
    const result = await service.revoke(req.params.id, req.user);
    sendSuccess(res, 200, 'Certificate revoked.', result);
  } catch (err) { next(err); }
};

module.exports = { getAll, getByMember, getByGroup, issue, revoke };
