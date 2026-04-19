const express = require('express');
const controller = require('./user.controller');
const { authenticate, authorize } = require('../../middleware/auth.middleware');
const validate = require('../../middleware/validate.middleware');
const {
  loginValidator,
  createUserValidator,
  updateUserValidator,
  changePasswordValidator,
  changeOwnPasswordValidator,
} = require('./user.validator');

const router = express.Router();

// Public
router.post('/login', loginValidator, validate, controller.login);

// Authenticated user routes
router.get('/me', authenticate, controller.getMe);
router.patch('/me', authenticate, updateUserValidator, validate, controller.updateProfile);
router.patch('/me/change-password', authenticate, changeOwnPasswordValidator, validate, controller.changeOwnPassword);

// Admin routes
const adminRoles = ['Super Admin', 'Org Owner', 'Manager'];

router.get('/', authenticate, authorize(...adminRoles), controller.getAllUsers);
router.post('/', authenticate, authorize('Super Admin', 'Org Owner'), createUserValidator, validate, controller.createUser);
router.get('/:id', authenticate, authorize(...adminRoles), controller.getUserById);
router.put('/:id', authenticate, authorize('Super Admin', 'Org Owner'), updateUserValidator, validate, controller.updateUser);
router.patch('/:id/change-password', authenticate, authorize('Super Admin', 'Org Owner'), changePasswordValidator, validate, controller.changeUserPassword);
router.delete('/:id', authenticate, authorize('Super Admin'), controller.deleteUser);

module.exports = router;
