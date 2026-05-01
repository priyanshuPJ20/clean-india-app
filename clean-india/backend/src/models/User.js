const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const badgeSchema = new mongoose.Schema({
  id: String,
  name: String,
  description: String,
  icon: String,
  earnedAt: { type: Date, default: Date.now },
});

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: [true, 'Username is required'],
      unique: true,
      trim: true,
      minlength: [3, 'Username must be at least 3 characters'],
      maxlength: [30, 'Username cannot exceed 30 characters'],
      match: [/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers and underscores'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email'],
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [8, 'Password must be at least 8 characters'],
      select: false,
    },
    profilePicture: {
      type: String,
      default: null,
    },
    city: {
      type: String,
      trim: true,
      default: null,
    },
    country: {
      type: String,
      trim: true,
      default: 'India',
    },
    role: {
      type: String,
      enum: ['user', 'admin'],
      default: 'user',
    },
    // Gamification
    points: {
      type: Number,
      default: 0,
    },
    totalUploads: {
      type: Number,
      default: 0,
    },
    approvedUploads: {
      type: Number,
      default: 0,
    },
    currentStreak: {
      type: Number,
      default: 0,
    },
    longestStreak: {
      type: Number,
      default: 0,
    },
    lastUploadDate: {
      type: Date,
      default: null,
    },
    badges: [badgeSchema],
    monthlyPoints: {
      type: Map,
      of: Number,
      default: {},
    },
    // Anti-cheat
    uploadHashes: [String], // store perceptual hashes of uploaded images
    // Social
    friends: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    friendRequests: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    // Notifications
    notifications: [
      {
        type: { type: String },
        message: String,
        read: { type: Boolean, default: false },
        createdAt: { type: Date, default: Date.now },
      },
    ],
    isActive: {
      type: Boolean,
      default: true,
    },
    isBanned: {
      type: Boolean,
      default: false,
    },
    banReason: String,
    referralCode: {
      type: String,
      unique: true,
      sparse: true,
    },
    referredBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    referralCount: { type: Number, default: 0 },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes
userSchema.index({ points: -1 });
userSchema.index({ city: 1, points: -1 });
userSchema.index({ country: 1, points: -1 });
userSchema.index({ email: 1 });
userSchema.index({ username: 1 });

// Virtual: rank display
userSchema.virtual('level').get(function () {
  if (this.points < 100) return 'Beginner';
  if (this.points < 500) return 'Eco Warrior';
  if (this.points < 1000) return 'Green Champion';
  if (this.points < 2500) return 'Earth Guardian';
  return 'Planet Hero';
});

// Hash password before save
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// Generate referral code
userSchema.pre('save', function (next) {
  if (!this.referralCode) {
    this.referralCode = this.username.toUpperCase().slice(0, 4) + Math.random().toString(36).substr(2, 6).toUpperCase();
  }
  next();
});

// Compare password
userSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Update streak
userSchema.methods.updateStreak = function () {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  if (!this.lastUploadDate) {
    this.currentStreak = 1;
  } else {
    const lastDate = new Date(this.lastUploadDate);
    const lastDay = new Date(lastDate.getFullYear(), lastDate.getMonth(), lastDate.getDate());
    const diffDays = Math.floor((today - lastDay) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      // Same day, no streak change
    } else if (diffDays === 1) {
      this.currentStreak += 1;
    } else {
      this.currentStreak = 1;
    }
  }

  if (this.currentStreak > this.longestStreak) {
    this.longestStreak = this.currentStreak;
  }

  this.lastUploadDate = now;
};

// Add points
userSchema.methods.addPoints = function (points) {
  this.points += points;
  const monthKey = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
  const currentMonthPoints = this.monthlyPoints.get(monthKey) || 0;
  this.monthlyPoints.set(monthKey, currentMonthPoints + points);
};

// Add notification
userSchema.methods.addNotification = function (type, message) {
  this.notifications.unshift({ type, message });
  if (this.notifications.length > 50) {
    this.notifications = this.notifications.slice(0, 50);
  }
};

module.exports = mongoose.model('User', userSchema);
