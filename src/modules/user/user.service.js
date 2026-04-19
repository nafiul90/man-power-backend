const User = require('./user.model');
const Group = require('../group/group.model');
const MemberTraining = require('../memberTraining/memberTraining.model');
const Certificate = require('../certificate/certificate.model');
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

const getAllUsers = async (reqUser, {
  page = 1, limit = 10, role, search, orgId,
  groupId, minRating, maxRating, hasCert, trainingId,
  withStats = false,
}) => {
  const orgFilter = buildOrgFilter(reqUser, orgId);
  const query = { ...orgFilter };

  if (role) query.role = role;
  if (search) {
    query.$or = [
      { fullName: { $regex: search, $options: 'i' } },
      { phone: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
      { userId: search },
    ];
  }

  // Collect sets of IDs from cross-collection filters, then intersect
  let filterIds = null;

  const intersect = (existing, newIds) => {
    const s = new Set(newIds.map(String));
    return existing === null ? [...s] : existing.filter((id) => s.has(String(id)));
  };

  if (groupId) {
    const group = await Group.findById(groupId).select('members');
    filterIds = intersect(filterIds, group?.members ?? []);
  }

  if (trainingId) {
    const ids = await MemberTraining.distinct('member', { training: trainingId, ...orgFilter });
    filterIds = intersect(filterIds, ids);
  }

  if (hasCert === 'true') {
    const ids = await Certificate.distinct('member', { ...orgFilter, status: 'Active' });
    filterIds = intersect(filterIds, ids);
  }

  if (minRating !== undefined || maxRating !== undefined) {
    const ratingMatch = { rating: { $ne: null } };
    if (orgFilter.org) ratingMatch.org = orgFilter.org;
    const ratingAgg = await MemberTraining.aggregate([
      { $match: ratingMatch },
      { $group: { _id: '$member', avgRating: { $avg: '$rating' } } },
      {
        $match: {
          avgRating: {
            ...(minRating !== undefined ? { $gte: Number(minRating) } : {}),
            ...(maxRating !== undefined ? { $lte: Number(maxRating) } : {}),
          },
        },
      },
    ]);
    filterIds = intersect(filterIds, ratingAgg.map((r) => r._id));
  }

  if (filterIds !== null) query._id = { $in: filterIds };

  const skip = (page - 1) * limit;
  const [users, total] = await Promise.all([
    User.find(query).populate('org', 'title').skip(skip).limit(Number(limit)).sort({ createdAt: -1 }),
    User.countDocuments(query),
  ]);

  let statsMap = {};
  if (withStats === 'true' || withStats === true) {
    const userIds = users.map((u) => u._id);
    const orgMatch = orgFilter.org ? { org: orgFilter.org } : {};

    const [mtStats, certStats, groupStats] = await Promise.all([
      MemberTraining.aggregate([
        { $match: { member: { $in: userIds }, ...orgMatch } },
        { $group: { _id: '$member', count: { $sum: 1 }, avgRating: { $avg: '$rating' } } },
      ]),
      Certificate.aggregate([
        { $match: { member: { $in: userIds }, ...orgMatch, status: 'Active' } },
        { $group: { _id: '$member', count: { $sum: 1 } } },
      ]),
      Group.aggregate([
        { $match: { members: { $elemMatch: { $in: userIds } }, ...orgMatch } },
        { $unwind: '$members' },
        { $match: { members: { $in: userIds } } },
        { $group: { _id: '$members', count: { $sum: 1 } } },
      ]),
    ]);

    mtStats.forEach((s) => {
      statsMap[String(s._id)] = {
        trainings: s.count,
        avgRating: s.avgRating != null ? parseFloat(s.avgRating.toFixed(1)) : null,
      };
    });
    certStats.forEach((s) => {
      statsMap[String(s._id)] = { ...statsMap[String(s._id)], certs: s.count };
    });
    groupStats.forEach((s) => {
      statsMap[String(s._id)] = { ...statsMap[String(s._id)], groups: s.count };
    });
  }

  const enrichedUsers = users.map((u) => {
    const obj = u.toJSON();
    if (withStats === 'true' || withStats === true) {
      const s = statsMap[String(u._id)] ?? {};
      obj.stats = {
        trainings: s.trainings ?? 0,
        avgRating: s.avgRating ?? null,
        certs: s.certs ?? 0,
        groups: s.groups ?? 0,
      };
    }
    return obj;
  });

  return { users: enrichedUsers, total, page: Number(page), limit: Number(limit), pages: Math.ceil(total / limit) };
};

const getUserById = async (id, reqUser) => {
  const orgFilter = buildOrgFilter(reqUser);
  const user = await User.findOne({ _id: id, ...orgFilter }).populate('org', 'title');
  if (!user) throw { statusCode: 404, message: 'User not found.' };
  return user;
};

const createUser = async (reqUser, data) => {
  const org = reqUser.role === 'Super Admin' ? (data.org || null) : (reqUser.org || null);
  const { groupId, ...userData } = data;
  const user = await User.create({ ...userData, org });

  if (groupId) {
    await Group.findOneAndUpdate(
      { _id: groupId, org: user.org },
      { $addToSet: { members: user._id } }
    );
  }

  return user;
};

const updateUser = async (id, reqUser, data) => {
  const orgFilter = buildOrgFilter(reqUser);
  const { groupId, ...allowedData } = data;
  if (reqUser.role !== 'Super Admin') delete allowedData.org;

  const user = await User.findOneAndUpdate(
    { _id: id, ...orgFilter },
    allowedData,
    { new: true, runValidators: true }
  );
  if (!user) throw { statusCode: 404, message: 'User not found.' };

  if (groupId !== undefined) {
    await Group.updateMany({ members: id, org: user.org }, { $pull: { members: id } });
    if (groupId) {
      await Group.findOneAndUpdate(
        { _id: groupId, org: user.org },
        { $addToSet: { members: id } }
      );
    }
  }

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

const getMemberStats = async (id, reqUser) => {
  const orgFilter = buildOrgFilter(reqUser);
  const orgMatch = orgFilter.org ? { org: orgFilter.org } : {};

  const [mtStats, certStats, groupStats] = await Promise.all([
    MemberTraining.aggregate([
      { $match: { member: require('mongoose').Types.ObjectId.createFromHexString(id), ...orgMatch } },
      { $group: { _id: null, count: { $sum: 1 }, avgRating: { $avg: '$rating' } } },
    ]),
    Certificate.countDocuments({ member: id, ...orgMatch, status: 'Active' }),
    Group.countDocuments({ members: id, ...orgMatch }),
  ]);

  const mt = mtStats[0] ?? {};
  return {
    trainings: mt.count ?? 0,
    avgRating: mt.avgRating != null ? parseFloat(mt.avgRating.toFixed(1)) : null,
    certs: certStats,
    groups: groupStats,
  };
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
  getMemberStats,
};
