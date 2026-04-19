const User = require('./user.model');
const { generateToken } = require('../../utils/jwt');
const { buildOrgFilter } = require('../../utils/scope');

const login = async (phone, password) => {
  const user = await User.findOne({ phone }).select('+password').populate('org', '_id title');
  if (!user || !user.isActive) throw { statusCode: 401, message: 'Invalid credentials.' };

  const isMatch = await user.comparePassword(password);
  if (!isMatch) throw { statusCode: 401, message: 'Invalid credentials.' };

  const token = generateToken({
    id: user._id,
    role: user.role,
    org: user.org?._id ?? null,
  });

  return { token, user };
};

const getAllUsers = async (reqUser, { page = 1, limit = 10, role, search, orgId }) => {
  const orgFilter = buildOrgFilter(reqUser, orgId);
  const query = { ...orgFilter };
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
    User.find(query).populate('org', 'title').skip(skip).limit(Number(limit)).sort({ createdAt: -1 }),
    User.countDocuments(query),
  ]);

  return { users, total, page: Number(page), limit: Number(limit), pages: Math.ceil(total / limit) };
};

const getUserById = async (id, reqUser) => {
  const orgFilter = buildOrgFilter(reqUser);
  const user = await User.findOne({ _id: id, ...orgFilter }).populate('org', 'title');
  if (!user) throw { statusCode: 404, message: 'User not found.' };
  return user;
};

const createUser = async (reqUser, data) => {
  // Assign requesting user's org automatically (unless Super Admin explicitly provides one)
  const org = reqUser.role === 'Super Admin' ? (data.org || null) : (reqUser.org || null);
  const user = await User.create({ ...data, org });
  return user;
};

const updateUser = async (id, reqUser, data) => {
  const orgFilter = buildOrgFilter(reqUser);
  const allowedData = { ...data };
  if (reqUser.role !== 'Super Admin') delete allowedData.org;

  const user = await User.findOneAndUpdate(
    { _id: id, ...orgFilter },
    allowedData,
    { new: true, runValidators: true }
  );
  if (!user) throw { statusCode: 404, message: 'User not found.' };
  return user;
};

const changePassword = async (id, reqUser, newPassword) => {
  const orgFilter = buildOrgFilter(reqUser);
  const user = await User.findOne({ _id: id, ...orgFilter });
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
  const user = await User.findByIdAndUpdate(id, filtered, { new: true, runValidators: true });
  if (!user) throw { statusCode: 404, message: 'User not found.' };
  return user;
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
