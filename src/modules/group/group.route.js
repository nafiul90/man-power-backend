const express = require('express');
const controller = require('./group.controller');
const { authenticate, authorize } = require('../../middleware/auth.middleware');
const { body } = require('express-validator');
const validate = require('../../middleware/validate.middleware');

const router = express.Router();

const groupValidator = [
  body('title').trim().notEmpty().withMessage('Group title is required.'),
  body('ward').optional().isMongoId().withMessage('Invalid ward ID.'),
  body('category').optional().isMongoId().withMessage('Invalid category ID.'),
  body('members').optional().isArray().withMessage('Members must be an array.'),
];

const writeRoles = ['Super Admin', 'Org Owner'];
const readRoles = [...writeRoles, 'Manager', 'Instructor'];

router.use(authenticate);

router.get('/', authorize(...readRoles), controller.getAll);
router.post('/', authorize(...writeRoles), groupValidator, validate, controller.create);
router.get('/:id', authorize(...readRoles), controller.getById);
router.put('/:id', authorize(...writeRoles), groupValidator, validate, controller.update);
router.delete('/:id', authorize(...writeRoles), controller.remove);

module.exports = router;
