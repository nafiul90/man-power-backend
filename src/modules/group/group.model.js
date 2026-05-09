const mongoose = require('mongoose');

const GROUP_LEVELS = ['Division', 'District', 'Upazila', 'Union', 'Ward'];

const groupSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Group title is required'],
      trim: true,
    },
    level: {
      type: String,
      enum: GROUP_LEVELS,
      required: [true, 'Group level is required'],
      default: 'Ward',
    },
    division: { type: mongoose.Schema.Types.ObjectId, ref: 'AdminArea', default: null },
    district: { type: mongoose.Schema.Types.ObjectId, ref: 'AdminArea', default: null },
    upazila: { type: mongoose.Schema.Types.ObjectId, ref: 'AdminArea', default: null },
    union: { type: mongoose.Schema.Types.ObjectId, ref: 'AdminArea', default: null },
    ward: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Ward',
      default: null,
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
      default: null,
    },
    members: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    teamLeaders: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    secretaries: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    org: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
    },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

groupSchema.index({ title: 1, org: 1 }, { unique: true });
groupSchema.index({ level: 1, org: 1 });
groupSchema.index({ district: 1 });
groupSchema.index({ upazila: 1 });
groupSchema.index({ union: 1 });

const Group = mongoose.model('Group', groupSchema);
Group.LEVELS = GROUP_LEVELS;
module.exports = Group;
