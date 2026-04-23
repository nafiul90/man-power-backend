const userService = require('./user.service');
const { sendSuccess, sendError } = require('../../utils/response');

const login = async (req, res, next) => {
  try {
    const { phone, password } = req.body;
    const { token, user } = await userService.login(phone, password);
    return sendSuccess(res, 200, 'Login successful.', { token, user });
  } catch (err) { next(err); }
};

const getMe = (req, res) => sendSuccess(res, 200, 'Profile fetched.', req.user);

const updateProfile = async (req, res, next) => {
  try {
    const user = await userService.updateProfile(req.user._id, req.body);
    return sendSuccess(res, 200, 'Profile updated.', user);
  } catch (err) { next(err); }
};

const changeOwnPassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    await userService.changeOwnPassword(req.user._id, currentPassword, newPassword);
    return sendSuccess(res, 200, 'Password changed successfully.');
  } catch (err) { next(err); }
};

const getAllUsers = async (req, res, next) => {
  try {
    const result = await userService.getAllUsers(req.user, req.query);
    return sendSuccess(res, 200, 'Users fetched.', result);
  } catch (err) { next(err); }
};

const getUserById = async (req, res, next) => {
  try {
    const user = await userService.getUserById(req.params.id, req.user);
    return sendSuccess(res, 200, 'User fetched.', user);
  } catch (err) { next(err); }
};

const createUser = async (req, res, next) => {
  try {
    const user = await userService.createUser(req.user, req.body);
    return sendSuccess(res, 201, 'User created.', user);
  } catch (err) { next(err); }
};

const updateUser = async (req, res, next) => {
  try {
    const user = await userService.updateUser(req.params.id, req.user, req.body);
    return sendSuccess(res, 200, 'User updated.', user);
  } catch (err) { next(err); }
};

const changeUserPassword = async (req, res, next) => {
  try {
    await userService.changePassword(req.params.id, req.user, req.body.newPassword);
    return sendSuccess(res, 200, 'User password changed.');
  } catch (err) { next(err); }
};

const deleteUser = async (req, res, next) => {
  try {
    await userService.deleteUser(req.params.id);
    return sendSuccess(res, 200, 'User deleted.');
  } catch (err) { next(err); }
};

const getMemberStats = async (req, res, next) => {
  try {
    const stats = await userService.getMemberStats(req.params.id, req.user);
    return sendSuccess(res, 200, 'Member stats fetched.', stats);
  } catch (err) { next(err); }
};

const rateUser = async (req, res, next) => {
  try {
    const user = await userService.rateUser(req.params.id, req.user, req.body.rating);
    return sendSuccess(res, 200, 'User rated.', user);
  } catch (err) { next(err); }
};

module.exports = {
  login, getMe, updateProfile, changeOwnPassword,
  getAllUsers, getUserById, createUser, updateUser, changeUserPassword, deleteUser,
  getMemberStats, rateUser,
};
