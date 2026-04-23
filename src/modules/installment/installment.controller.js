const service = require('./installment.service');
const { sendSuccess } = require('../../utils/response');

const getByFund = async (req, res, next) => {
  try {
    const result = await service.getByFund(req.params.fundId, req.user, req.query);
    sendSuccess(res, 200, 'Installments fetched.', result);
  } catch (err) { next(err); }
};

const getByMember = async (req, res, next) => {
  try {
    const result = await service.getByMember(req.user, req.query);
    sendSuccess(res, 200, 'Installments fetched.', result);
  } catch (err) { next(err); }
};

const collectPayment = async (req, res, next) => {
  try {
    const inst = await service.collectPayment(req.params.id, req.user, req.body);
    sendSuccess(res, 200, 'Payment recorded.', inst);
  } catch (err) { next(err); }
};

const markOverdue = async (req, res, next) => {
  try {
    await service.markOverdue();
    sendSuccess(res, 200, 'Overdue installments marked.');
  } catch (err) { next(err); }
};

const getDueRecords = async (req, res, next) => {
  try {
    const result = await service.getDueRecords(req.user, req.query);
    sendSuccess(res, 200, 'Due records fetched.', result);
  } catch (err) { next(err); }
};

const getCollectionReport = async (req, res, next) => {
  try {
    const result = await service.getCollectionReport(req.user, req.query);
    sendSuccess(res, 200, 'Collection report fetched.', result);
  } catch (err) { next(err); }
};

const getOrgSummary = async (req, res, next) => {
  try {
    const result = await service.getOrgSummary(req.user);
    sendSuccess(res, 200, 'Summary fetched.', result);
  } catch (err) { next(err); }
};

module.exports = { getByFund, getByMember, collectPayment, markOverdue, getDueRecords, getCollectionReport, getOrgSummary };
