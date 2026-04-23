const express = require('express');
const controller = require('./fund.controller');
const { authenticate, authorize } = require('../../middleware/auth.middleware');
const { body } = require('express-validator');
const validate = require('../../middleware/validate.middleware');

const router = express.Router();

const managementRoles = ['Super Admin', 'Org Owner', 'Manager', 'Accountant'];

const fundValidator = [
  body('title').trim().notEmpty().withMessage('Title is required.'),
  body('totalAmount').isNumeric().withMessage('Total amount must be a number.'),
  body('timeline').isInt({ min: 1 }).withMessage('Timeline must be at least 1 month.'),
  body('startDate').isISO8601().withMessage('Valid start date is required.'),
  body('interestRate').optional().isNumeric(),
  body('dueDay').optional().isInt({ min: 1, max: 28 }),
];

router.use(authenticate, authorize(...managementRoles));

router.get('/', controller.getAll);
router.post('/', fundValidator, validate, controller.create);
router.get('/:id', controller.getById);
router.put('/:id', controller.update);
router.delete('/:id', controller.remove);
router.post('/:id/activate', controller.activate);
router.patch('/:id/status', body('status').notEmpty(), validate, controller.updateStatus);
router.get('/:id/summary', controller.getSummary);

module.exports = router;
