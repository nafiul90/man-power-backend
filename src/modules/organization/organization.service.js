const Organization = require("./organization.model");
const User = require("../user/user.model");
const { buildOrgFilter } = require("../../utils/scope");

const syncOwnersOrg = async (orgId, newOwners, oldOwners = []) => {
  const removed = oldOwners.filter((id) => !newOwners.includes(String(id)));
  const added = newOwners.filter(
    (id) => !oldOwners.map(String).includes(String(id)),
  );

  const ops = [];
  if (added.length)
    ops.push(User.updateMany({ _id: { $in: added } }, { org: orgId }));
  if (removed.length)
    ops.push(
      User.updateMany({ _id: { $in: removed }, org: orgId }, { org: null }),
    );
  await Promise.all(ops);
};

const getAll = async (reqUser, { page = 1, limit = 20, search }) => {
  const orgFilter = buildOrgFilter(reqUser);
  const query = { ...orgFilter };
  if (search) query.title = { $regex: search, $options: "i" };

  const skip = (page - 1) * limit;
  const [orgs, total] = await Promise.all([
    Organization.find(query)
      .populate("owners", "fullName phone email role")
      .skip(skip)
      .limit(Number(limit))
      .sort({ createdAt: -1 }),
    Organization.countDocuments(query),
  ]);
  return { orgs, total, page: Number(page), pages: Math.ceil(total / limit) };
};

const getById = async (id) => {
  const org = await Organization.findById(id).populate(
    "owners",
    "fullName phone email role",
  );
  if (!org) throw { statusCode: 404, message: "Organization not found." };
  return org;
};

const getMyOrg = async (userId) => {
  const org = await Organization.findOne({ owners: userId }).populate(
    "owners",
    "fullName phone email role",
  );
  if (!org)
    throw { statusCode: 404, message: "No organization found for this user." };
  return org;
};

const create = async ({ title, owners = [] }) => {
  if (owners.length) {
    const users = await User.find({ _id: { $in: owners }, role: "Org Owner" });
    if (users.length !== owners.length)
      throw {
        statusCode: 400,
        message: "All owners must have the Org Owner role.",
      };
  }
  const org = await Organization.create({ title, owners });
  await syncOwnersOrg(org._id, owners, []);
  return org.populate("owners", "fullName phone email role");
};

const update = async (id, { title, owners }) => {
  const existing = await Organization.findById(id);
  if (!existing) throw { statusCode: 404, message: "Organization not found." };

  const data = {};
  if (title !== undefined) data.title = title;
  if (owners !== undefined) {
    if (owners.length) {
      const users = await User.find({
        _id: { $in: owners },
        role: "Org Owner",
      });
      if (users.length !== owners.length)
        throw {
          statusCode: 400,
          message: "All owners must have the Org Owner role.",
        };
    }
    data.owners = owners;
    await syncOwnersOrg(id, owners, existing.owners);
  }

  const org = await Organization.findByIdAndUpdate(id, data, {
    new: true,
    runValidators: true,
  }).populate("owners", "fullName phone email role");
  return org;
};

const remove = async (id) => {
  const org = await Organization.findByIdAndDelete(id);
  if (!org) throw { statusCode: 404, message: "Organization not found." };
  if (org.owners.length) {
    await User.updateMany({ _id: { $in: org.owners }, org: id }, { org: null });
  }
  return org;
};

const getOrgOwners = async () =>
  User.find({ role: "Org Owner" })
    .select("fullName phone email org")
    .populate("org", "title");

module.exports = {
  getAll,
  getById,
  getMyOrg,
  create,
  update,
  remove,
  getOrgOwners,
};
