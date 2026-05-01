const Upload = require('../models/Upload');
const User = require('../models/User');
const { calculatePoints, checkBadges } = require('../utils/aiVerification');

exports.getPendingUploads = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const query = { 'adminReview.status': 'pending' };
    if (req.query.aiStatus) {
      query['aiVerification.status'] = req.query.aiStatus;
    }

    const uploads = await Upload.find(query)
      .populate('user', 'username email city profilePicture totalUploads approvedUploads')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Upload.countDocuments(query);

    res.json({ success: true, uploads, pagination: { page, limit, total } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

exports.reviewUpload = async (req, res) => {
  try {
    const { action, reason } = req.body; // action: 'approve' | 'reject'
    const upload = await Upload.findById(req.params.id).populate('user');

    if (!upload) {
      return res.status(404).json({ success: false, message: 'Upload not found.' });
    }

    if (upload.adminReview.status !== 'pending') {
      return res.status(400).json({ success: false, message: 'Upload already reviewed.' });
    }

    upload.adminReview = {
      status: action === 'approve' ? 'approved' : 'rejected',
      reviewedBy: req.user._id,
      reviewedAt: new Date(),
      reason: reason || '',
    };
    upload.status = action === 'approve' ? 'approved' : 'rejected';

    if (action === 'approve' && upload.status !== 'approved') {
      const user = await User.findById(upload.user._id || upload.user);
      if (user) {
        const isFirstUpload = user.approvedUploads === 0;
        user.updateStreak();
        const points = calculatePoints(user, isFirstUpload);
        user.addPoints(points);
        user.approvedUploads += 1;
        upload.pointsAwarded = points;

        const newBadges = checkBadges(user);
        if (newBadges.length > 0) {
          user.badges.push(...newBadges);
        }

        user.addNotification('upload_approved', `Your upload was manually approved! +${points} points ✅`);
        await user.save();
      }
    } else if (action === 'reject') {
      const user = await User.findById(upload.user._id || upload.user);
      if (user) {
        user.addNotification('upload_rejected', `Upload rejected by admin: ${reason || 'Does not meet requirements'}`);
        await user.save();
      }
    }

    await upload.save();
    res.json({ success: true, message: `Upload ${action}d successfully.`, upload });
  } catch (error) {
    console.error('Admin review error:', error);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

exports.getAllUsers = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    const search = req.query.search;

    const query = {};
    if (search) {
      query.$or = [{ username: new RegExp(search, 'i') }, { email: new RegExp(search, 'i') }];
    }

    const users = await User.find(query)
      .select('-password')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await User.countDocuments(query);

    res.json({ success: true, users, pagination: { page, limit, total } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

exports.banUser = async (req, res) => {
  try {
    const { reason } = req.body;
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { isBanned: true, banReason: reason || 'Violation of terms' },
      { new: true }
    );

    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });

    res.json({ success: true, message: `User ${user.username} has been banned.` });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

exports.unbanUser = async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { isBanned: false, $unset: { banReason: 1 } },
      { new: true }
    );

    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });

    res.json({ success: true, message: `User ${user.username} has been unbanned.` });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

exports.getDashboardStats = async (req, res) => {
  try {
    const [
      totalUsers,
      totalUploads,
      pendingReviews,
      approvedToday,
      rejectedTotal,
      topUsers,
    ] = await Promise.all([
      User.countDocuments(),
      Upload.countDocuments(),
      Upload.countDocuments({ 'adminReview.status': 'pending' }),
      Upload.countDocuments({
        status: 'approved',
        createdAt: { $gte: new Date(new Date().setHours(0, 0, 0, 0)) },
      }),
      Upload.countDocuments({ status: 'rejected' }),
      User.find().sort({ points: -1 }).limit(5).select('username points approvedUploads profilePicture'),
    ]);

    // Upload trend last 7 days
    const trend = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const start = new Date(date.setHours(0, 0, 0, 0));
      const end = new Date(date.setHours(23, 59, 59, 999));
      const count = await Upload.countDocuments({ createdAt: { $gte: start, $lte: end } });
      trend.push({ date: start.toISOString().split('T')[0], count });
    }

    res.json({
      success: true,
      stats: { totalUsers, totalUploads, pendingReviews, approvedToday, rejectedTotal, topUsers, trend },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};
