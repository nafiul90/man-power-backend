const express = require('express');
const controller = require('./adminArea.controller');
const { authenticate, authorize } = require('../../middleware/auth.middleware');
const { body } = require('express-validator');
const validate = require('../../middleware/validate.middleware');

const router = express.Router();

const createValidator = [
  body('name').trim().notEmpty().withMessage('Name is required.'),
  body('type').isIn(['Division', 'District', 'Upazila', 'Thana', 'Union']).withMessage('Invalid type.'),
  body('admins').optional().isArray().withMessage('admins must be an array.'),
];

// Type is immutable on update — only name/parent/admins may change.
const updateValidator = [
  body('name').optional().trim().notEmpty().withMessage('Name cannot be empty.'),
  body('admins').optional().isArray().withMessage('admins must be an array.'),
];

// Scope checks happen in the service; route-level just gates the HTTP layer.
const writeRoles = ['Super Admin', 'Org Owner', 'Manager', 'Division Admin', 'District Admin', 'Upazila Admin', 'Thana Admin'];
const readRoles = [...writeRoles, 'Union Admin', 'Ward Admin', 'Team Leader', 'Secretary'];

router.use(authenticate);
router.get('/', authorize(...readRoles), controller.getAll);
router.post('/', authorize(...writeRoles), createValidator, validate, controller.create);
router.get('/:id', authorize(...readRoles), controller.getById);
router.put('/:id', authorize(...writeRoles), updateValidator, validate, controller.update);
router.delete('/:id', authorize(...writeRoles), controller.remove);

module.exports = router;
