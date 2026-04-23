const express = require('express');
const controller = require('./training.controller');
const { authenticate, authorize } = require('../../middleware/auth.middleware');
const { trainingImageUpload } = require('../../middleware/upload.middleware');
const { body } = require('express-validator');
const validate = require('../../middleware/validate.middleware');

const router = express.Router();

const trainingValidator = [
  body('title').trim().notEmpty().withMessage('Title is required.'),
  body('purpose').optional().trim(),
];

const allowedRoles = ['Super Admin', 'Org Owner', 'Manager'];

router.use(authenticate, authorize(...allowedRoles));

router.get('/', controller.getAll);
router.post('/', trainingValidator, validate, controller.create);
router.get('/:id', controller.getById);
router.put('/:id', trainingValidator, validate, controller.update);
router.delete('/:id', controller.remove);
router.post('/:id/images', trainingImageUpload.single('image'), controller.uploadImage);
router.delete('/:id/images/:imageId', controller.deleteImage);

module.exports = router;
