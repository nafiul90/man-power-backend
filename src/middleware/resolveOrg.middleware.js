const Organization = require('../modules/organization/organization.model');
const { sendError } = require('../utils/response');

const resolveOrg = async (req, res, next) => {
  const org = await Organization.findOne({ owners: req.user._id, isActive: true });
  if (!org) return sendError(res, 403, 'No active organization found for your account.');
  req.orgId = org._id;
  req.org = org;
  next();
};

module.exports = resolveOrg;
