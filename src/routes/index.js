const express = require('express');
const userRoutes = require('../modules/user/user.route');
const organizationRoutes = require('../modules/organization/organization.route');
const categoryRoutes = require('../modules/category/category.route');
const adminAreaRoutes = require('../modules/adminArea/adminArea.route');
const zoneRoutes = require('../modules/zone/zone.route');
const groupRoutes = require('../modules/group/group.route');
const trainingRoutes = require('../modules/training/training.route');
const groupTrainingRoutes = require('../modules/groupTraining/groupTraining.route');
const memberTrainingRoutes = require('../modules/memberTraining/memberTraining.route');
const certificateRoutes = require('../modules/certificate/certificate.route');
const fundRoutes = require('../modules/fund/fund.route');
const installmentRoutes = require('../modules/installment/installment.route');

const router = express.Router();

router.use('/users', userRoutes);
router.use('/organizations', organizationRoutes);
router.use('/categories', categoryRoutes);
router.use('/admin-areas', adminAreaRoutes);
router.use('/zones', zoneRoutes);
router.use('/groups', groupRoutes);
router.use('/trainings', trainingRoutes);
router.use('/group-trainings', groupTrainingRoutes);
router.use('/member-trainings', memberTrainingRoutes);
router.use('/certificates', certificateRoutes);
router.use('/funds', fundRoutes);
router.use('/installments', installmentRoutes);

module.exports = router;
