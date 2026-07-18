const express = require('express');
const multer = require('multer');
const path = require('path');
const { protect, restrictTo } = require('../middleware/authMiddleware');

const router = express.Router();

// Configure Multer storage
const storage = multer.diskStorage({
  destination(req, file, cb) {
    cb(null, 'uploads/');
  },
  filename(req, file, cb) {
    cb(
      null,
      `${file.fieldname}-${Date.now()}${path.extname(file.originalname)}`
    );
  },
});

function checkFileType(file, cb) {
  const filetypes = /jpg|jpeg|png|webp/;
  const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = filetypes.test(file.mimetype);

  if (extname && mimetype) {
    return cb(null, true);
  } else {
    cb(new Error('Images only!'));
  }
}

const upload = multer({
  storage,
  fileFilter: function (req, file, cb) {
    checkFileType(file, cb);
  },
});

router.post('/', protect, restrictTo('owner', 'staff'), upload.single('image'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({
      status: 'error',
      message: 'No file uploaded',
    });
  }

  // Construct URL. In a real environment, you'd use a full domain or a cloud URL.
  // We'll return the relative path that will be served by express.static
  res.json({
    status: 'success',
    imageUrl: `/uploads/${req.file.filename}`,
  });
});

module.exports = router;
