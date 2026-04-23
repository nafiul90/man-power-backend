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
    const ratingAgg = await MemberTraining.aggregate([
      { $match: orgFilter.org ? { org: orgFilter.org } : {} },
      { $project: { member: 1, perTrainingAvg: { $avg: '$ratings.rating' } } },
      { $group: { _id: '$member', avgRating: { $avg: '$perTrainingAvg' } } },
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

    const [mtStats, certStats, groupStats, usersWithDr] = await Promise.all([
      MemberTraining.aggregate([
        { $match: { member: { $in: userIds }, ...orgMatch } },
        { $project: { member: 1, perTrainingAvg: { $avg: '$ratings.rating' } } },
        { $group: { _id: '$member', count: { $sum: 1 }, avgRating: { $avg: '$perTrainingAvg' } } },
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
      User.find({ _id: { $in: userIds } }).select('directRatings'),
    ]);

    const drMap = {};
    usersWithDr.forEach((u) => {
      if (u.directRatings && u.directRatings.length > 0) {
        const sum = u.directRatings.reduce((a, r) => a + r.rating, 0);
        drMap[String(u._id)] = sum / u.directRatings.length;
      }
    });

    mtStats.forEach((s) => {
      const mtAvg = s.avgRating != null ? s.avgRating : null;
      const drAvg = drMap[String(s._id)] ?? null;
      let combined = null;
      if (mtAvg !== null && drAvg !== null) combined = (mtAvg + drAvg) / 2;
      else if (mtAvg !== null) combined = mtAvg;
      else if (drAvg !== null) combined = drAvg;
      statsMap[String(s._id)] = {
        trainings: s.count,
        avgRating: combined != null ? parseFloat(combined.toFixed(1)) : null,
      };
    });

    // Also pick up users with ONLY direct ratings (no memberTraining records)
    Object.entries(drMap).forEach(([uid, drAvg]) => {
      if (!statsMap[uid]) {
        statsMap[uid] = { trainings: 0, avgRating: parseFloat(drAvg.toFixed(1)) };
      }
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
  const user = await User.findOne({ _id: id, ...orgFilter })
    .populate('org', 'title')
    .populate('directRatings.ratedBy', 'fullName role phone userId');
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

  const [mtStats, certStats, groupStats, targetUser] = await Promise.all([
    MemberTraining.aggregate([
      { $match: { member: require('mongoose').Types.ObjectId.createFromHexString(id), ...orgMatch } },
      { $project: { member: 1, perTrainingAvg: { $avg: '$ratings.rating' } } },
      { $group: { _id: null, count: { $sum: 1 }, avgRating: { $avg: '$perTrainingAvg' } } },
    ]),
    Certificate.countDocuments({ member: id, ...orgMatch, status: 'Active' }),
    Group.countDocuments({ members: id, ...orgMatch }),
    User.findById(id).select('directRatings'),
  ]);

  const mt = mtStats[0] ?? {};
  const mtAvg = mt.avgRating != null ? mt.avgRating : null;
  let drAvg = null;
  if (targetUser?.directRatings?.length > 0) {
    const sum = targetUser.directRatings.reduce((a, r) => a + r.rating, 0);
    drAvg = sum / targetUser.directRatings.length;
  }
  let combined = null;
  if (mtAvg !== null && drAvg !== null) combined = (mtAvg + drAvg) / 2;
  else if (mtAvg !== null) combined = mtAvg;
  else if (drAvg !== null) combined = drAvg;

  return {
    trainings: mt.count ?? 0,
    avgRating: combined != null ? parseFloat(combined.toFixed(1)) : null,
    certs: certStats,
    groups: groupStats,
    directRatings: targetUser?.directRatings ?? [],
  };
};

const rateUser = async (id, reqUser, rating) => {
  const orgFilter = buildOrgFilter(reqUser);
  const user = await User.findOne({ _id: id, ...orgFilter });
  if (!user) throw { statusCode: 404, message: 'User not found.' };

  const idx = user.directRatings.findIndex((r) => String(r.ratedBy) === String(reqUser._id));
  if (idx >= 0) {
    user.directRatings[idx].rating = rating;
    user.directRatings[idx].ratedAt = new Date();
  } else {
    user.directRatings.push({ ratedBy: reqUser._id, raterRole: reqUser.role, rating, ratedAt: new Date() });
  }
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
  getMemberStats,
  rateUser,
};
