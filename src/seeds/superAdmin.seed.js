const User = require('../modules/user/user.model');

const seedSuperAdmin = async () => {
  const count = await User.countDocuments();
  if (count > 0) return;

  await User.create({
    fullName: 'Super Admin',
    phone: '+8801966362744',
    password: 'admin123',
    role: 'Super Admin',
    gender: 'Male',
  });

  console.log('Super Admin created: phone=+8801966362744, password=admin123');
};

module.exports = seedSuperAdmin;
