const express = require('express');
const { body } = require('express-validator');
const rateLimit = require('express-rate-limit');
const router = express.Router();

const authController = require('../controllers/authController');
const uploadController = require('../controllers/uploadController');
const leaderboardController = require('../controllers/leaderboardController');
const adminController = require('../controllers/adminController');
const { auth, adminOnly } = require('../middleware/auth');
const { upload } = require('../config/cloudinary');

// Rate limiters
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 10, message: 'Too many attempts. Try again in 15 minutes.' });
const uploadLimiter = rateLimit({ windowMs: 60 * 60 * 1000, max: 10, message: 'Too many uploads. Try again later.' });

// ===== AUTH ROUTES =====
router.post('/auth/register',
  authLimiter,
  [
    body('username').trim().isLength({ min: 3, max: 30 }).matches(/^[a-zA-Z0-9_]+$/),
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 8 }),
  ],
  authController.register
);

router.post('/auth/login',
  authLimiter,
  [body('email').isEmail(), body('password').notEmpty()],
  authController.login
);

router.get('/auth/me', auth, authController.getMe);
router.patch('/auth/profile', auth, upload.single('profilePicture'), authController.updateProfile);
router.get('/auth/notifications', auth, authController.getNotifications);
router.patch('/auth/notifications/read', auth, authController.markNotificationsRead);

// ===== UPLOAD ROUTES =====
router.post('/uploads',
  auth,
  uploadLimiter,
  (req, res) => {
    console.log("UPLOAD WORKING");

    res.json({
      success: true,
      upload: {
        status: "pending"
      }
    });
  }
);
router.get('/uploads/me', auth, uploadController.getMyUploads);
router.get('/uploads/feed', uploadController.getFeed);
router.get('/uploads/stats', uploadController.getStats);
router.get('/uploads/:id', uploadController.getUploadById);
router.post('/uploads/:id/like', auth, uploadController.likeUpload);

// ===== LEADERBOARD ROUTES =====
router.get('/leaderboard/global', leaderboardController.getGlobalLeaderboard);
router.get('/leaderboard/monthly', leaderboardController.getMonthlyLeaderboard);
router.get('/leaderboard/cities', leaderboardController.getCities);
router.get('/leaderboard/my-rank', auth, leaderboardController.getUserRank);
router.get('/leaderboard/city/:city', leaderboardController.getCityLeaderboard);

// ===== SOCIAL ROUTES =====
router.get('/users/:id', async (req, res) => {
  const User = require('../models/User');
  try {
    const user = await User.findById(req.params.id)
      .select('-password -email -uploadHashes -notifications')
      .lean({ virtuals: true });
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });
    res.json({ success: true, user });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// ===== ADMIN ROUTES =====
router.use('/admin', auth, adminOnly);
router.get('/admin/dashboard', adminController.getDashboardStats);
router.get('/admin/uploads/pending', adminController.getPendingUploads);
router.patch('/admin/uploads/:id/review', adminController.reviewUpload);
router.get('/admin/users', adminController.getAllUsers);
router.patch('/admin/users/:id/ban', adminController.banUser);
router.patch('/admin/users/:id/unban', adminController.unbanUser);

module.exports = router;
