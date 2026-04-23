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

const readRoles = ['Super Admin', 'Org Owner', 'Manager', 'District Admin', 'Upazila Admin', 'Union Admin', 'Ward Admin', 'Team Leader', 'Secretary', 'Instructor'];
const writeRoles = ['Super Admin', 'Org Owner', 'Manager', 'District Admin', 'Upazila Admin', 'Union Admin', 'Ward Admin'];

router.use(authenticate);
router.get('/', authorize(...readRoles), controller.getAll);
router.post('/', authorize(...writeRoles), trainingValidator, validate, controller.create);
router.get('/:id', authorize(...readRoles), controller.getById);
router.put('/:id', authorize(...writeRoles), trainingValidator, validate, controller.update);
router.delete('/:id', authorize(...writeRoles), controller.remove);
router.post('/:id/images', authorize(...writeRoles), trainingImageUpload.single('image'), controller.uploadImage);
router.delete('/:id/images/:imageId', authorize(...writeRoles), controller.deleteImage);

module.exports = router;
