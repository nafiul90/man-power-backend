const express = require('express');
const controller = require('./adminArea.controller');
const { authenticate, authorize } = require('../../middleware/auth.middleware');
const { body } = require('express-validator');
const validate = require('../../middleware/validate.middleware');

const router = express.Router();

const areaValidator = [
  body('name').trim().notEmpty().withMessage('Name is required.'),
  body('type').isIn(['Division', 'District', 'Upazila', 'Union']).withMessage('Invalid type.'),
  body('admins').optional().isArray().withMessage('admins must be an array.'),
];

const writeRoles = ['Super Admin', 'Org Owner'];
const readRoles = [...writeRoles, 'Manager', 'District Admin', 'Upazila Admin', 'Union Admin', 'Ward Admin', 'Team Leader', 'Secretary'];

router.use(authenticate);
router.get('/', authorize(...readRoles), controller.getAll);
router.post('/', authorize(...writeRoles), areaValidator, validate, controller.create);
router.get('/:id', authorize(...readRoles), controller.getById);
router.put('/:id', authorize(...writeRoles), areaValidator, validate, controller.update);
router.delete('/:id', authorize(...writeRoles), controller.remove);

module.exports = router;
