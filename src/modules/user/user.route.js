const express = require('express');
const controller = require('./user.controller');
const { authenticate, authorize } = require('../../middleware/auth.middleware');
const validate = require('../../middleware/validate.middleware');
const { sendError } = require('../../utils/response');
const {
  loginValidator,
  createUserValidator,
  updateUserValidator,
  changePasswordValidator,
  changeOwnPasswordValidator,
} = require('./user.validator');

const router = express.Router();

// Prevent Org Owner from creating/assigning Super Admin role
const restrictSuperAdminRole = (req, res, next) => {
  if (req.user.role === 'Org Owner' && req.body.role === 'Super Admin') {
    return sendError(res, 403, 'Org Owner cannot assign the Super Admin role.');
  }
  next();
};

// Public
router.post('/login', loginValidator, validate, controller.login);

// Authenticated user routes
router.get('/me', authenticate, controller.getMe);
router.patch('/me', authenticate, updateUserValidator, validate, controller.updateProfile);
router.patch('/me/change-password', authenticate, changeOwnPasswordValidator, validate, controller.changeOwnPassword);

// Admin routes
const adminRoles = ['Super Admin', 'Org Owner', 'Manager', 'District Admin', 'Upazila Admin', 'Union Admin', 'Ward Admin'];
const readRoles = [...adminRoles, 'Instructor', 'Team Leader', 'Secretary'];

router.get('/', authenticate, authorize(...readRoles), controller.getAllUsers);
router.post('/', authenticate, authorize('Super Admin', 'Org Owner'), restrictSuperAdminRole, createUserValidator, validate, controller.createUser);
router.get('/:id/stats', authenticate, authorize(...adminRoles, 'Instructor'), controller.getMemberStats);
router.get('/:id', authenticate, authorize(...adminRoles, 'Instructor'), controller.getUserById);
router.put('/:id', authenticate, authorize('Super Admin', 'Org Owner'), restrictSuperAdminRole, updateUserValidator, validate, controller.updateUser);
router.patch('/:id/change-password', authenticate, authorize('Super Admin', 'Org Owner'), changePasswordValidator, validate, controller.changeUserPassword);
router.delete('/:id', authenticate, authorize('Super Admin'), controller.deleteUser);

module.exports = router;
