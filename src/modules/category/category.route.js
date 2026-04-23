const express = require('express');
const controller = require('./category.controller');
const { authenticate, authorize } = require('../../middleware/auth.middleware');
const { body } = require('express-validator');
const validate = require('../../middleware/validate.middleware');

const router = express.Router();

const titleValidator = [body('title').trim().notEmpty().withMessage('Title is required.')];
const writeRoles = ['Super Admin', 'Org Owner', 'Manager', 'Ward Admin'];
const readRoles = [...writeRoles, 'District Admin', 'Upazila Admin', 'Union Admin', 'Team Leader', 'Secretary', 'Instructor', 'Member'];

router.use(authenticate);
router.get('/', authorize(...readRoles), controller.getAll);
router.post('/', authorize(...writeRoles), titleValidator, validate, controller.create);
router.get('/:id', authorize(...readRoles), controller.getById);
router.put('/:id', authorize(...writeRoles), titleValidator, validate, controller.update);
router.delete('/:id', authorize(...writeRoles), controller.remove);

module.exports = router;
