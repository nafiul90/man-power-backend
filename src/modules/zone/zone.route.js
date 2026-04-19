const express = require('express');
const controller = require('./zone.controller');
const { authenticate, authorize } = require('../../middleware/auth.middleware');
const { body } = require('express-validator');
const validate = require('../../middleware/validate.middleware');

const router = express.Router();

const zoneValidator = [
  body('title').trim().notEmpty().withMessage('Zone title is required.'),
  body('division').optional({ nullable: true }).isMongoId().withMessage('Invalid division ID.'),
  body('district').optional({ nullable: true }).isMongoId().withMessage('Invalid district ID.'),
  body('upazila').optional({ nullable: true }).isMongoId().withMessage('Invalid upazila ID.'),
  body('union').optional({ nullable: true }).isMongoId().withMessage('Invalid union ID.'),
];

const allowedRoles = ['Super Admin', 'Org Owner'];
router.use(authenticate, authorize(...allowedRoles));

router.get('/', controller.getAll);
router.post('/', zoneValidator, validate, controller.create);
router.get('/:id', controller.getById);
router.put('/:id', zoneValidator, validate, controller.update);
router.delete('/:id', controller.remove);

module.exports = router;
