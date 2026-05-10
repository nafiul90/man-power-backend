const express = require('express');
const controller = require('./group.controller');
const { authenticate, authorize } = require('../../middleware/auth.middleware');
const { body } = require('express-validator');
const validate = require('../../middleware/validate.middleware');

const router = express.Router();

const groupValidator = [
  body('title').trim().notEmpty().withMessage('Group title is required.'),
  body('level').isIn(['Division', 'District', 'Upazila', 'Thana', 'Union', 'Ward']).withMessage('Invalid group level.'),
  body('division').optional({ nullable: true, checkFalsy: true }).isMongoId().withMessage('Invalid division ID.'),
  body('district').optional({ nullable: true, checkFalsy: true }).isMongoId().withMessage('Invalid district ID.'),
  body('upazila').optional({ nullable: true, checkFalsy: true }).isMongoId().withMessage('Invalid upazila ID.'),
  body('thana').optional({ nullable: true, checkFalsy: true }).isMongoId().withMessage('Invalid thana ID.'),
  body('union').optional({ nullable: true, checkFalsy: true }).isMongoId().withMessage('Invalid union ID.'),
  body('ward').optional({ nullable: true, checkFalsy: true }).isMongoId().withMessage('Invalid ward ID.'),
  body('category').optional({ nullable: true, checkFalsy: true }).isMongoId().withMessage('Invalid category ID.'),
  body('members').optional().isArray().withMessage('Members must be an array.'),
];

const writeRoles = ['Super Admin', 'Org Owner', 'Manager', 'Division Admin', 'District Admin', 'Upazila Admin', 'Thana Admin', 'Union Admin', 'Ward Admin'];
const readRoles = [...writeRoles, 'Instructor', 'Team Leader', 'Secretary'];

router.use(authenticate);

router.get('/', authorize(...readRoles), controller.getAll);
router.post('/', authorize(...writeRoles), groupValidator, validate, controller.create);
router.get('/:id', authorize(...readRoles), controller.getById);
router.put('/:id', authorize(...writeRoles), groupValidator, validate, controller.update);
router.put('/:id/assignees', authorize(...writeRoles), [
  body('teamLeaders').optional().isArray().withMessage('teamLeaders must be an array.'),
  body('secretaries').optional().isArray().withMessage('secretaries must be an array.'),
], validate, controller.updateAssignees);
router.delete('/:id', authorize(...writeRoles), controller.remove);

module.exports = router;
