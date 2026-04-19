const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const Counter = require("../counter/counter.model");

const ROLES = [
  "Super Admin",
  "Org Owner",
  "Manager",
  "Instructor",
  "Accountant",
  "Member",
];

const userSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: [true, "Full name is required"],
      trim: true,
    },
    phone: {
      type: String,
      required: [true, "Phone number is required"],
      unique: true,
      trim: true,
    },
    email: {
      type: String,
      sparse: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [6, "Password must be at least 6 characters"],
    },
    gender: {
      type: String,
      enum: ["Male", "Female", "Other"],
    },
    role: {
      type: String,
      enum: ROLES,
      default: "Member",
    },
    userId: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    org: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      default: null,
    },
  },
  { timestamps: true },
);

userSchema.pre("save", async function (next) {
  if (this.isNew && !this.userId) {
    const counter = await Counter.findByIdAndUpdate(
      "user",
      { $inc: { seq: 1 } },
      { new: true, upsert: true }
    );
    this.userId = `USR-${String(counter.seq).padStart(6, "0")}`;
  }
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

userSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.password;
  return obj;
};

module.exports = mongoose.model("User", userSchema);
module.exports.ROLES = ROLES;
