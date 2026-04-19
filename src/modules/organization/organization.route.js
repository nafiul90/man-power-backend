const express = require('express');
const controller = require('./organization.controller');
const { authenticate, authorize } = require('../../middleware/auth.middleware');
const { body } = require('express-validator');
const validate = require('../../middleware/validate.middleware');

const router = express.Router();

const orgValidator = [
  body('title').trim().notEmpty().withMessage('Title is required.'),
  body('owners').optional().isArray().withMessage('Owners must be an array.'),
];

router.get('/owners', authenticate, authorize('Super Admin'), controller.getOrgOwners);
router.get('/my', authenticate, authorize('Org Owner'), controller.getMyOrg);

router.get('/', authenticate, authorize('Super Admin'), controller.getAll);
router.post('/', authenticate, authorize('Super Admin'), orgValidator, validate, controller.create);
router.get('/:id', authenticate, authorize('Super Admin'), controller.getById);
router.put('/:id', authenticate, authorize('Super Admin'), orgValidator, validate, controller.update);
router.delete('/:id', authenticate, authorize('Super Admin'), controller.remove);

module.exports = router;
