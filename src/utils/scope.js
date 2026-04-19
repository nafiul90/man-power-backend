/**
 * Builds a MongoDB org filter for multi-tenant data scoping.
 * - Super Admin: no org filter (sees all), or filter by optional orgId param
 * - All others: strictly scoped to their own org from JWT
 */
const buildOrgFilter = (user, queryOrgId = null) => {
  if (user.role === 'Super Admin') {
    return queryOrgId ? { org: queryOrgId } : {};
  }
  return { org: user.org };
};

module.exports = { buildOrgFilter };
