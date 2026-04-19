const express = require('express');
const controller = require('./adminArea.controller');
const { authenticate, authorize } = require('../../middleware/auth.middleware');
const { body } = require('express-validator');
const validate = require('../../middleware/validate.middleware');

const router = express.Router();

const areaValidator = [
  body('name').trim().notEmpty().withMessage('Name is required.'),
  body('type').isIn(['Division', 'District', 'Upazila', 'Union']).withMessage('Invalid type.'),
];

const allowedRoles = ['Super Admin', 'Org Owner'];
router.use(authenticate, authorize(...allowedRoles));

router.get('/', controller.getAll);
router.post('/', areaValidator, validate, controller.create);
router.get('/:id', controller.getById);
router.put('/:id', validate, controller.update);
router.delete('/:id', controller.remove);

module.exports = router;
