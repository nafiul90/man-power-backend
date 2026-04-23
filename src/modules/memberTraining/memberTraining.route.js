const express = require('express');
const controller = require('./memberTraining.controller');
const { authenticate, authorize } = require('../../middleware/auth.middleware');
const { body } = require('express-validator');
const validate = require('../../middleware/validate.middleware');

const router = express.Router();
const allowedRoles = ['Super Admin', 'Org Owner', 'Manager', 'Instructor', 'Team Leader', 'Secretary', 'District Admin', 'Upazila Admin', 'Union Admin', 'Ward Admin'];

router.use(authenticate, authorize(...allowedRoles));

router.get('/group-training/:groupTrainingId', controller.getByGroupTraining);
router.get('/group-scope/:groupId', controller.getByGroup);
router.get('/member/:memberId', controller.getByMember);
router.put(
  '/:id/rate',
  [body('rating').isFloat({ min: 0, max: 10 }).withMessage('Rating must be between 0 and 10.')],
  validate,
  controller.rate
);

module.exports = router;
