const express = require('express');
const controller = require('./installment.controller');
const { authenticate, authorize } = require('../../middleware/auth.middleware');
const { body } = require('express-validator');
const validate = require('../../middleware/validate.middleware');

const router = express.Router();

const managementRoles = ['Super Admin', 'Org Owner', 'Manager', 'Accountant'];

router.use(authenticate, authorize(...managementRoles));

router.get('/by-fund/:fundId', controller.getByFund);
router.get('/by-member', controller.getByMember);
router.get('/due', controller.getDueRecords);
router.get('/report', controller.getCollectionReport);
router.get('/summary', controller.getOrgSummary);
router.post('/mark-overdue', controller.markOverdue);
router.patch(
  '/:id/collect',
  body('paidAmount').isNumeric({ min: 0.01 }).withMessage('Paid amount is required.'),
  validate,
  controller.collectPayment
);

module.exports = router;
