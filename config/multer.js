const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  folder: 'fb-blogs',
  allowedFormats: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'tiff', 'mp4', 'mov', 'avi', 'mkv'],
  params: {
    resource_type: 'auto',
  },
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 100 * 1024 * 1024 // 100MB limit for videos
  },
  fileFilter: (req, file, cb) => {
    const allowedMimes = [
      'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/bmp', 'image/tiff',
      'video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/x-matroska'
    ];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Images and videos are allowed.'));
    }
  }
});

module.exports = upload;
