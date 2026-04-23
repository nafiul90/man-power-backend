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
  body('union').optional({ nullable: true }).isMongoId().withMessage('Invalid union ID.'),
];

const allowedRoles = ['Super Admin', 'Org Owner'];
router.use(authenticate, authorize(...allowedRoles));

router.get('/', controller.getAll);
router.post('/', wardValidator, validate, controller.create);
router.get('/:id', controller.getById);
router.put('/:id', wardValidator, validate, controller.update);
router.delete('/:id', controller.remove);

module.exports = router;
