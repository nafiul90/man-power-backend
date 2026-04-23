const express = require('express');
const controller = require('./user.controller');
const { authenticate, authorize } = require('../../middleware/auth.middleware');
const validate = require('../../middleware/validate.middleware');
const { sendError } = require('../../utils/response');
const { body } = require('express-validator');
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

// Ward Admin and geo admins can only create/assign lower roles
const ALLOWED_ASSIGN_ROLES = {
  'Manager': ['Team Leader', 'Secretary', 'Instructor', 'Member'],
  'Ward Admin': ['Team Leader', 'Secretary', 'Instructor', 'Member'],
  'District Admin': ['Team Leader', 'Secretary', 'Instructor', 'Member', 'Ward Admin', 'Union Admin'],
  'Upazila Admin': ['Team Leader', 'Secretary', 'Instructor', 'Member', 'Ward Admin', 'Union Admin'],
  'Union Admin': ['Team Leader', 'Secretary', 'Instructor', 'Member', 'Ward Admin'],
};

const restrictRoleAssignment = (req, res, next) => {
  const actorRole = req.user.role;
  const targetRole = req.body.role;
  if (targetRole && ALLOWED_ASSIGN_ROLES[actorRole]) {
    if (!ALLOWED_ASSIGN_ROLES[actorRole].includes(targetRole)) {
      return sendError(res, 403, `${actorRole} cannot assign role: ${targetRole}.`);
    }
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
const manageRoles = ['Super Admin', 'Org Owner', 'Manager', 'District Admin', 'Upazila Admin', 'Union Admin', 'Ward Admin'];
const raterRoles = ['Super Admin', 'Org Owner', 'Manager', 'District Admin', 'Upazila Admin', 'Union Admin', 'Ward Admin'];

router.get('/', authenticate, authorize(...readRoles), controller.getAllUsers);
router.post('/', authenticate, authorize(...manageRoles), restrictSuperAdminRole, restrictRoleAssignment, createUserValidator, validate, controller.createUser);
router.get('/:id/stats', authenticate, authorize(...adminRoles, 'Instructor'), controller.getMemberStats);
router.get('/:id', authenticate, authorize(...adminRoles, 'Instructor'), controller.getUserById);
router.put('/:id', authenticate, authorize(...manageRoles), restrictSuperAdminRole, restrictRoleAssignment, updateUserValidator, validate, controller.updateUser);
router.patch('/:id/change-password', authenticate, authorize(...manageRoles), changePasswordValidator, validate, controller.changeUserPassword);
router.put('/:id/rate', authenticate, authorize(...raterRoles), [
  body('rating').isFloat({ min: 0, max: 10 }).withMessage('Rating must be between 0 and 10.'),
], validate, controller.rateUser);
router.delete('/:id', authenticate, authorize('Super Admin'), controller.deleteUser);

module.exports = router;
