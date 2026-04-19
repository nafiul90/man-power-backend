const { body } = require('express-validator');

const loginValidator = [
  body('phone').notEmpty().withMessage('Phone is required.'),
  body('password').notEmpty().withMessage('Password is required.'),
];

const createUserValidator = [
  body('fullName').trim().notEmpty().withMessage('Full name is required.'),
  body('phone').trim().notEmpty().withMessage('Phone is required.'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters.'),
  body('role')
    .optional()
    .isIn(['Super Admin', 'Org Owner', 'Manager', 'Instructor', 'Accountant', 'Member'])
    .withMessage('Invalid role.'),
  body('gender').optional().isIn(['Male', 'Female', 'Other']).withMessage('Invalid gender.'),
  body('email').optional().isEmail().withMessage('Invalid email.'),
];

const updateUserValidator = [
  body('fullName').optional().trim().notEmpty().withMessage('Full name cannot be empty.'),
  body('email').optional().isEmail().withMessage('Invalid email.'),
  body('gender').optional().isIn(['Male', 'Female', 'Other']).withMessage('Invalid gender.'),
  body('role')
    .optional()
    .isIn(['Super Admin', 'Org Owner', 'Manager', 'Instructor', 'Accountant', 'Member'])
    .withMessage('Invalid role.'),
];

const changePasswordValidator = [
  body('newPassword').isLength({ min: 6 }).withMessage('New password must be at least 6 characters.'),
];

const changeOwnPasswordValidator = [
  body('currentPassword').notEmpty().withMessage('Current password is required.'),
  body('newPassword').isLength({ min: 6 }).withMessage('New password must be at least 6 characters.'),
];

module.exports = {
  loginValidator,
  createUserValidator,
  updateUserValidator,
  changePasswordValidator,
  changeOwnPasswordValidator,
};
