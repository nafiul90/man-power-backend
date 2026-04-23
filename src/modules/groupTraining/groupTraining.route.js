const express = require('express');
const controller = require('./groupTraining.controller');
const { authenticate, authorize } = require('../../middleware/auth.middleware');
const { body } = require('express-validator');
const validate = require('../../middleware/validate.middleware');

const router = express.Router();

const statusRoles = ['Super Admin', 'Org Owner', 'Manager', 'Instructor', 'Team Leader', 'Secretary', 'District Admin', 'Upazila Admin', 'Union Admin', 'Ward Admin'];
const manageRoles = ['Super Admin', 'Org Owner', 'Manager', 'District Admin', 'Upazila Admin', 'Union Admin', 'Ward Admin'];

router.use(authenticate);

router.get('/mine', authorize(...manageRoles, 'Instructor', 'Team Leader', 'Secretary'), controller.getMine);
router.get('/group/:groupId', authorize(...manageRoles, 'Instructor', 'Team Leader', 'Secretary'), controller.getByGroup);
router.get('/:id', authorize(...manageRoles, 'Instructor', 'Team Leader', 'Secretary'), controller.getById);

router.post(
  '/',
  authorize(...manageRoles),
  [
    body('groupId').notEmpty().withMessage('Group is required.'),
    body('trainingId').notEmpty().withMessage('Training is required.'),
    body('instructors').optional().isArray(),
  ],
  validate,
  controller.assign
);

router.put(
  '/:id/instructors',
  authorize(...manageRoles),
  [body('instructors').isArray().withMessage('Instructors must be an array.')],
  validate,
  controller.updateInstructors
);

router.put(
  '/:id/status',
  authorize(...statusRoles),
  [body('status').isIn(['Pending', 'Started', 'Completed']).withMessage('Invalid status.')],
  validate,
  controller.updateStatus
);

router.delete('/:id', authorize(...manageRoles), controller.remove);

module.exports = router;
