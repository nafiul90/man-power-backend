const express = require('express');
const userRoutes = require('../modules/user/user.route');
const organizationRoutes = require('../modules/organization/organization.route');
const categoryRoutes = require('../modules/category/category.route');
const zoneRoutes = require('../modules/zone/zone.route');
const groupRoutes = require('../modules/group/group.route');

const router = express.Router();

router.use('/users', userRoutes);
router.use('/organizations', organizationRoutes);
router.use('/categories', categoryRoutes);
router.use('/zones', zoneRoutes);
router.use('/groups', groupRoutes);

module.exports = router;
