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

// Each creator role can assign only roles below their level in the hierarchy.
// Hierarchy (high → low): Super Admin > Org Owner > Manager > Division Admin
//   > District Admin > Upazila Admin > Thana Admin > Union Admin > Ward Admin
//   > Team Leader / Secretary / Instructor / Accountant > Member
const LEAF_ROLES = ['Team Leader', 'Secretary', 'Instructor', 'Accountant', 'Member'];

const ALLOWED_ASSIGN_ROLES = {
  'Super Admin':    ['Org Owner', 'Manager', 'Division Admin', 'District Admin', 'Upazila Admin', 'Thana Admin', 'Union Admin', 'Ward Admin', ...LEAF_ROLES, 'Super Admin'],
  'Org Owner':      ['Manager', 'Division Admin', 'District Admin', 'Upazila Admin', 'Thana Admin', 'Union Admin', 'Ward Admin', ...LEAF_ROLES],
  'Manager':        [...LEAF_ROLES],
  'Division Admin': ['District Admin', 'Upazila Admin', 'Thana Admin', 'Union Admin', 'Ward Admin', ...LEAF_ROLES],
  'District Admin': ['Upazila Admin', 'Thana Admin', 'Union Admin', 'Ward Admin', ...LEAF_ROLES],
  'Upazila Admin':  ['Thana Admin', 'Union Admin', 'Ward Admin', ...LEAF_ROLES],
  'Thana Admin':    ['Union Admin', 'Ward Admin', ...LEAF_ROLES],
  'Union Admin':    ['Ward Admin', ...LEAF_ROLES],
  'Ward Admin':     [...LEAF_ROLES],
  'Team Leader':    ['Member'],
  'Secretary':      ['Member'],
};

const restrictRoleAssignment = (req, res, next) => {
  const actorRole = req.user.role;
  const targetRole = req.body.role;
  if (!targetRole) return next();
  const allowed = ALLOWED_ASSIGN_ROLES[actorRole];
  if (!allowed || !allowed.includes(targetRole)) {
    return sendError(res, 403, `${actorRole} cannot assign role: ${targetRole}.`);
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
const adminRoles = ['Super Admin', 'Org Owner', 'Manager', 'Division Admin', 'District Admin', 'Upazila Admin', 'Thana Admin', 'Union Admin', 'Ward Admin'];
const readRoles = [...adminRoles, 'Instructor', 'Team Leader', 'Secretary'];
const manageRoles = [...adminRoles];
// Roles allowed to create users — Team Leader & Secretary may create Members per role hierarchy.
const createRoles = [...manageRoles, 'Team Leader', 'Secretary'];
const raterRoles = [...adminRoles];

router.get('/', authenticate, authorize(...readRoles), controller.getAllUsers);
router.post('/', authenticate, authorize(...createRoles), restrictSuperAdminRole, restrictRoleAssignment, createUserValidator, validate, controller.createUser);
router.get('/:id/stats', authenticate, authorize(...adminRoles, 'Instructor'), controller.getMemberStats);
router.get('/:id', authenticate, authorize(...adminRoles, 'Instructor'), controller.getUserById);
router.put('/:id', authenticate, authorize(...manageRoles), restrictSuperAdminRole, restrictRoleAssignment, updateUserValidator, validate, controller.updateUser);
router.patch('/:id/change-password', authenticate, authorize(...manageRoles), changePasswordValidator, validate, controller.changeUserPassword);
router.put('/:id/rate', authenticate, authorize(...raterRoles), [
  body('rating').isFloat({ min: 0, max: 10 }).withMessage('Rating must be between 0 and 10.'),
], validate, controller.rateUser);
router.delete('/:id', authenticate, authorize('Super Admin'), controller.deleteUser);

module.exports = router;
