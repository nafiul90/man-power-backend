require('dotenv').config();
const app = require('./app');
const connectDB = require('./config/db');
const seedSuperAdmin = require('./seeds/superAdmin.seed');

const PORT = process.env.PORT || 5000;

const start = async () => {
  await connectDB();
  await seedSuperAdmin();
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT} [${process.env.NODE_ENV}]`);
  });
};

start();
