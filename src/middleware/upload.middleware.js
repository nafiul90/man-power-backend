const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

const createStorage = (destination) =>
  multer.diskStorage({
    destination: (req, file, cb) => cb(null, destination),
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      cb(null, `${uuidv4()}${ext}`);
    },
  });

const imageFilter = (req, file, cb) => {
  if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb({ statusCode: 400, message: 'Only JPEG, PNG, WebP, and GIF images are allowed.' }, false);
  }
};

const trainingImageUpload = multer({
  storage: createStorage(path.join(__dirname, '../../uploads/trainings')),
  fileFilter: imageFilter,
  limits: { fileSize: MAX_FILE_SIZE },
});

module.exports = { trainingImageUpload };
