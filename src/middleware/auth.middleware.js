const { verifyToken } = require('../utils/jwt');
const { sendError } = require('../utils/response');
const User = require('../modules/user/user.model');

const authenticate = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return sendError(res, 401, 'Access denied. No token provided.');
  }

  const token = authHeader.split(' ')[1];
  const decoded = verifyToken(token);
  const user = await User.findById(decoded.id).select('-password');
  if (!user) return sendError(res, 401, 'User not found.');

  req.user = user;
  next();
};

const authorize = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user.role)) {
    return sendError(res, 403, 'You do not have permission to perform this action.');
  }
  next();
};

module.exports = { authenticate, authorize };
