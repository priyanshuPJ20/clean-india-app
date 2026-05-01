const User = require('../models/User');
const Upload = require('../models/Upload');

exports.getGlobalLeaderboard = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    const filter = req.query.filter || 'points'; // points | uploads | streaks

    const sortField = {
      points: { points: -1 },
      uploads: { approvedUploads: -1 },
      streaks: { longestStreak: -1 },
    }[filter] || { points: -1 };

    const users = await User.find({ isActive: true, isBanned: false })
      .select('username profilePicture city country points approvedUploads currentStreak longestStreak badges level')
      .sort(sortField)
      .skip(skip)
      .limit(limit)
      .lean({ virtuals: true });

    const total = await User.countDocuments({ isActive: true, isBanned: false });

    // Add rank
    const ranked = users.map((user, idx) => ({ ...user, rank: skip + idx + 1 }));

    res.json({
      success: true,
      leaderboard: ranked,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

exports.getCityLeaderboard = async (req, res) => {
  try {
    const { city } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const users = await User.find({
      city: new RegExp(city, 'i'),
      isActive: true,
      isBanned: false,
    })
      .select('username profilePicture city points approvedUploads currentStreak badges')
      .sort({ points: -1 })
      .skip(skip)
      .limit(limit)
      .lean({ virtuals: true });

    const total = await User.countDocuments({ city: new RegExp(city, 'i'), isActive: true });
    const ranked = users.map((user, idx) => ({ ...user, rank: skip + idx + 1 }));

    res.json({ success: true, leaderboard: ranked, city, pagination: { page, limit, total } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

exports.getMonthlyLeaderboard = async (req, res) => {
  try {
    const monthKey = req.query.month || `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;

    const users = await User.find({ isActive: true, isBanned: false })
      .select(`username profilePicture city points monthlyPoints badges`)
      .lean();

    const ranked = users
      .map((u) => ({
        ...u,
        monthlyPoints: u.monthlyPoints?.[monthKey] || 0,
      }))
      .filter((u) => u.monthlyPoints > 0)
      .sort((a, b) => b.monthlyPoints - a.monthlyPoints)
      .slice(0, 20)
      .map((u, i) => ({ ...u, rank: i + 1 }));

    res.json({ success: true, leaderboard: ranked, month: monthKey });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

exports.getUserRank = async (req, res) => {
  try {
    const userId = req.user._id;
    const user = await User.findById(userId).select('points city approvedUploads');

    const globalRank = await User.countDocuments({ points: { $gt: user.points }, isActive: true }) + 1;

    let cityRank = null;
    if (user.city) {
      cityRank = await User.countDocuments({
        city: new RegExp(user.city, 'i'),
        points: { $gt: user.points },
        isActive: true,
      }) + 1;
    }

    res.json({ success: true, globalRank, cityRank });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

exports.getCities = async (req, res) => {
  try {
    const cities = await User.distinct('city', { city: { $ne: null }, isActive: true });
    res.json({ success: true, cities: cities.filter(Boolean).sort() });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};
