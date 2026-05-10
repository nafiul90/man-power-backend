const express = require('express');
const controller = require('./ward.controller');
const { authenticate, authorize } = require('../../middleware/auth.middleware');
const { body } = require('express-validator');
const validate = require('../../middleware/validate.middleware');

const router = express.Router();

const wardValidator = [
  body('title').trim().notEmpty().withMessage('Ward title is required.'),
  body('division').optional({ nullable: true }).isMongoId().withMessage('Invalid division ID.'),
  body('district').optional({ nullable: true }).isMongoId().withMessage('Invalid district ID.'),
  body('upazila').optional({ nullable: true }).isMongoId().withMessage('Invalid upazila ID.'),
  body('thana').optional({ nullable: true }).isMongoId().withMessage('Invalid thana ID.'),
  body('union').optional({ nullable: true }).isMongoId().withMessage('Invalid union ID.'),
  body('admins').optional().isArray().withMessage('admins must be an array.'),
];

// Scope checks happen in the service for geo admins.
const writeRoles = ['Super Admin', 'Org Owner', 'Manager', 'Division Admin', 'District Admin', 'Upazila Admin', 'Thana Admin', 'Union Admin'];
const readRoles = [...writeRoles, 'Ward Admin', 'Team Leader', 'Secretary'];

router.use(authenticate);
router.get('/', authorize(...readRoles), controller.getAll);
router.post('/', authorize(...writeRoles), wardValidator, validate, controller.create);
router.get('/:id', authorize(...readRoles), controller.getById);
router.put('/:id', authorize(...writeRoles), wardValidator, validate, controller.update);
router.delete('/:id', authorize(...writeRoles), controller.remove);

module.exports = router;
