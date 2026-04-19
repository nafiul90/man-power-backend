const express = require('express');
const controller = require('./certificate.controller');
const { authenticate, authorize } = require('../../middleware/auth.middleware');
const { body } = require('express-validator');
const validate = require('../../middleware/validate.middleware');

const router = express.Router();
const allowedRoles = ['Super Admin', 'Org Owner', 'Manager', 'Instructor'];

router.use(authenticate, authorize(...allowedRoles));

router.get('/', controller.getAll);
router.get('/member/:memberId', controller.getByMember);
router.get('/group/:groupId', controller.getByGroup);

router.post(
  '/',
  [
    body('memberId').notEmpty().withMessage('Member is required.'),
    body('groupTrainingId').notEmpty().withMessage('GroupTraining is required.'),
  ],
  validate,
  controller.issue
);

router.put('/:id/revoke', controller.revoke);

module.exports = router;
