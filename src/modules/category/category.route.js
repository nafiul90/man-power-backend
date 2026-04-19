const express = require('express');
const controller = require('./category.controller');
const { authenticate, authorize } = require('../../middleware/auth.middleware');
const { body } = require('express-validator');
const validate = require('../../middleware/validate.middleware');

const router = express.Router();

const titleValidator = [body('title').trim().notEmpty().withMessage('Title is required.')];
const allowedRoles = ['Super Admin', 'Org Owner'];

router.use(authenticate, authorize(...allowedRoles));

router.get('/', controller.getAll);
router.post('/', titleValidator, validate, controller.create);
router.get('/:id', controller.getById);
router.put('/:id', titleValidator, validate, controller.update);
router.delete('/:id', controller.remove);

module.exports = router;
