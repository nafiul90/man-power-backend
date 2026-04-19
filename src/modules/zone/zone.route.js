const express = require('express');
const controller = require('./zone.controller');
const { authenticate, authorize } = require('../../middleware/auth.middleware');
const resolveOrg = require('../../middleware/resolveOrg.middleware');
const { body } = require('express-validator');
const validate = require('../../middleware/validate.middleware');

const router = express.Router();

const zoneValidator = [
  body('name').trim().notEmpty().withMessage('Name is required.'),
  body('type')
    .isIn(['Division', 'District', 'Upazila', 'Union'])
    .withMessage('Type must be Division, District, Upazila, or Union.'),
];

router.use(authenticate, authorize('Org Owner'), resolveOrg);

router.get('/', controller.getAll);
router.post('/', zoneValidator, validate, controller.create);
router.get('/:id', controller.getById);
router.put('/:id', validate, controller.update);
router.delete('/:id', controller.remove);

module.exports = router;
