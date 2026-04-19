const express = require('express');
const controller = require('./group.controller');
const { authenticate, authorize } = require('../../middleware/auth.middleware');
const resolveOrg = require('../../middleware/resolveOrg.middleware');
const { body } = require('express-validator');
const validate = require('../../middleware/validate.middleware');

const router = express.Router();

const groupValidator = [
  body('title').trim().notEmpty().withMessage('Group title is required.'),
  body('zone').optional().isMongoId().withMessage('Invalid zone ID.'),
  body('category').optional().isMongoId().withMessage('Invalid category ID.'),
  body('members').optional().isArray().withMessage('Members must be an array.'),
];

router.use(authenticate, authorize('Org Owner'), resolveOrg);

router.get('/', controller.getAll);
router.post('/', groupValidator, validate, controller.create);
router.get('/:id', controller.getById);
router.put('/:id', groupValidator, validate, controller.update);
router.delete('/:id', controller.remove);

module.exports = router;
