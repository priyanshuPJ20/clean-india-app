const Upload = require('../models/Upload');
const User = require('../models/User');
const { verifyUploadWithAI, generateImageHash, calculatePoints, checkBadges } = require('../utils/aiVerification');

exports.createUpload = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded.' });
    }

    const { caption, latitude, longitude, city, country, address } = req.body;
    const mediaType = req.file.mimetype.startsWith('video/') ? 'video' : 'image';
    const mediaUrl = req.file.path; // Cloudinary URL
    const mediaPublicId = req.file.filename;

    // Anti-cheat: Check for duplicate image hash
    const imageHash = generateImageHash(mediaUrl);
    const duplicate = await Upload.findOne({ imageHash, user: req.user._id });
    if (duplicate) {
      return res.status(400).json({ success: false, message: 'This image has already been uploaded.' });
    }

    // Rate limiting: Max 5 uploads per day per user
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const todayUploads = await Upload.countDocuments({
      user: req.user._id,
      createdAt: { $gte: startOfDay },
    });
    if (todayUploads >= 5) {
      return res.status(429).json({ success: false, message: 'Daily upload limit (5) reached. Try again tomorrow!' });
    }

    // Create upload record
    const upload = await Upload.create({
      user: req.user._id,
      mediaUrl,
      mediaPublicId,
      mediaType,
      caption,
      imageHash,
      location: {
        type: 'Point',
        coordinates: [parseFloat(longitude) || 0, parseFloat(latitude) || 0],
        city: city || req.user.city,
        country: country || req.user.country || 'India',
        address,
      },
      ipAddress: req.ip,
    });

    // Update user upload count
    await User.findByIdAndUpdate(req.user._id, { $inc: { totalUploads: 1 } });

    // Trigger async AI verification
    processUploadVerification(upload._id, mediaUrl, mediaType, req.user._id);

    res.status(201).json({
      success: true,
      message: 'Upload received! AI verification in progress...',
      upload: {
        id: upload._id,
        mediaUrl: upload.mediaUrl,
        status: upload.status,
        aiVerification: upload.aiVerification,
      },
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ success: false, message: 'Upload failed. Please try again.' });
  }
};

// Async AI verification processing
const processUploadVerification = async (uploadId, mediaUrl, mediaType, userId) => {
  try {
    const aiResult = await verifyUploadWithAI(mediaUrl, mediaType);

    const upload = await Upload.findById(uploadId);
    if (!upload) return;

    upload.aiVerification = {
      status: aiResult.status,
      confidence: aiResult.confidence,
      dustbinDetected: aiResult.dustbinDetected,
      garbageDetected: aiResult.garbageDetected,
      aiResponse: aiResult.aiResponse,
      verifiedAt: new Date(),
    };

    // Auto-approve or reject based on AI
    if (aiResult.status === 'verified') {
      upload.status = 'approved';
      upload.adminReview.status = 'approved';

      // Award points
      const user = await User.findById(userId);
      if (user) {
        const isFirstUpload = user.approvedUploads === 0;
        user.updateStreak();
        const points = calculatePoints(user, isFirstUpload);
        user.addPoints(points);
        user.approvedUploads += 1;
        upload.pointsAwarded = points;

        // Check for new badges
        const newBadges = checkBadges(user);
        if (newBadges.length > 0) {
          user.badges.push(...newBadges);
          const badgeNames = newBadges.map((b) => b.name).join(', ');
          user.addNotification('badge', `You earned new badges: ${badgeNames}! 🎉`);
        }

        user.addNotification('upload_approved', `Your upload was approved! +${points} points 🌟`);
        await user.save();
      }
    } else if (aiResult.status === 'rejected') {
      upload.status = 'rejected';
      upload.adminReview.status = 'rejected';
      upload.adminReview.reason = aiResult.aiResponse;

      const user = await User.findById(userId);
      if (user) {
        user.addNotification('upload_rejected', `Upload rejected: ${aiResult.aiResponse}`);
        await user.save();
      }
    }
    // manual_review stays as 'pending' for admin to handle

    await upload.save();
  } catch (error) {
    console.error('AI verification processing error:', error);
  }
};

exports.getMyUploads = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 12;
    const skip = (page - 1) * limit;

    const uploads = await Upload.find({ user: req.user._id })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('user', 'username profilePicture city');

    const total = await Upload.countDocuments({ user: req.user._id });

    res.json({
      success: true,
      uploads,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

exports.getFeed = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 12;
    const skip = (page - 1) * limit;

    const uploads = await Upload.find({ status: 'approved', isPublic: true })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('user', 'username profilePicture city points level');

    const total = await Upload.countDocuments({ status: 'approved', isPublic: true });

    res.json({
      success: true,
      uploads,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

exports.getUploadById = async (req, res) => {
  try {
    const upload = await Upload.findById(req.params.id).populate('user', 'username profilePicture city points badges');
    if (!upload) {
      return res.status(404).json({ success: false, message: 'Upload not found.' });
    }
    res.json({ success: true, upload });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

exports.likeUpload = async (req, res) => {
  try {
    const upload = await Upload.findById(req.params.id);
    if (!upload) return res.status(404).json({ success: false, message: 'Upload not found.' });

    const userId = req.user._id;
    const likedIndex = upload.likes.indexOf(userId);

    if (likedIndex > -1) {
      upload.likes.splice(likedIndex, 1);
    } else {
      upload.likes.push(userId);
    }

    await upload.save();
    res.json({ success: true, likesCount: upload.likes.length, liked: likedIndex === -1 });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

exports.getStats = async (req, res) => {
  try {
    const totalUploads = await Upload.countDocuments({ status: 'approved' });
    const totalUsers = await User.countDocuments({ isActive: true });
    const totalPoints = await User.aggregate([{ $group: { _id: null, total: { $sum: '$points' } } }]);

    // Top cities
    const topCities = await Upload.aggregate([
      { $match: { status: 'approved' } },
      { $group: { _id: '$location.city', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 },
      { $project: { city: '$_id', count: 1, _id: 0 } },
    ]);

    res.json({
      success: true,
      stats: {
        totalUploads,
        totalUsers,
        totalPoints: totalPoints[0]?.total || 0,
        topCities,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};
