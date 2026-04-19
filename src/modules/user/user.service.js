const User = require('./user.model');
const { generateToken } = require('../../utils/jwt');

const login = async (phone, password) => {
  const user = await User.findOne({ phone }).select('+password');
  if (!user || !user.isActive) throw { statusCode: 401, message: 'Invalid credentials.' };

  const isMatch = await user.comparePassword(password);
  if (!isMatch) throw { statusCode: 401, message: 'Invalid credentials.' };

  const token = generateToken({ id: user._id, role: user.role });
  return { token, user };
};

const getAllUsers = async ({ page = 1, limit = 10, role, search }) => {
  const query = {};
  if (role) query.role = role;
  if (search) {
    query.$or = [
      { fullName: { $regex: search, $options: 'i' } },
      { phone: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
    ];
  }

  const skip = (page - 1) * limit;
  const [users, total] = await Promise.all([
    User.find(query).skip(skip).limit(Number(limit)).sort({ createdAt: -1 }),
    User.countDocuments(query),
  ]);

  return { users, total, page: Number(page), limit: Number(limit), pages: Math.ceil(total / limit) };
};

const getUserById = async (id) => {
  const user = await User.findById(id);
  if (!user) throw { statusCode: 404, message: 'User not found.' };
  return user;
};

const createUser = async (data) => {
  const user = await User.create(data);
  return user;
};

const updateUser = async (id, data) => {
  const user = await User.findByIdAndUpdate(id, data, { new: true, runValidators: true });
  if (!user) throw { statusCode: 404, message: 'User not found.' };
  return user;
};

const changePassword = async (id, newPassword) => {
  const user = await User.findById(id);
  if (!user) throw { statusCode: 404, message: 'User not found.' };
  user.password = newPassword;
  await user.save();
  return user;
};

const deleteUser = async (id) => {
  const user = await User.findByIdAndDelete(id);
  if (!user) throw { statusCode: 404, message: 'User not found.' };
  return user;
};

const updateProfile = async (id, data) => {
  const allowed = ['fullName', 'email', 'gender'];
  const filtered = Object.fromEntries(Object.entries(data).filter(([k]) => allowed.includes(k)));
  return updateUser(id, filtered);
};

const changeOwnPassword = async (id, currentPassword, newPassword) => {
  const user = await User.findById(id).select('+password');
  if (!user) throw { statusCode: 404, message: 'User not found.' };
  const isMatch = await user.comparePassword(currentPassword);
  if (!isMatch) throw { statusCode: 400, message: 'Current password is incorrect.' };
  user.password = newPassword;
  await user.save();
  return user;
};

module.exports = {
  login,
  getAllUsers,
  getUserById,
  createUser,
  updateUser,
  changePassword,
  deleteUser,
  updateProfile,
  changeOwnPassword,
};
