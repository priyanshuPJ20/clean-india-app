const mongoose = require('mongoose');

const uploadSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    mediaUrl: {
      type: String,
      required: true,
    },
    mediaPublicId: {
      type: String,
      required: true,
    },
    mediaType: {
      type: String,
      enum: ['image', 'video'],
      required: true,
    },
    thumbnailUrl: String,
    timestamp: {
      type: Date,
      default: Date.now,
    },
    location: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point',
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
        default: [0, 0],
      },
      city: String,
      country: { type: String, default: 'India' },
      address: String,
    },
    // AI Verification
    aiVerification: {
      status: {
        type: String,
        enum: ['pending', 'verified', 'rejected', 'manual_review'],
        default: 'pending',
      },
      confidence: { type: Number, default: 0 }, // 0-100
      dustbinDetected: { type: Boolean, default: false },
      garbageDetected: { type: Boolean, default: false },
      aiResponse: String,
      verifiedAt: Date,
    },
    // Admin Review
    adminReview: {
      status: {
        type: String,
        enum: ['pending', 'approved', 'rejected'],
        default: 'pending',
      },
      reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      reviewedAt: Date,
      reason: String,
    },
    // Final status
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
    },
    pointsAwarded: {
      type: Number,
      default: 0,
    },
    // Anti-cheat
    imageHash: String, // perceptual hash for duplicate detection
    ipAddress: String,
    deviceInfo: String,
    isDuplicate: {
      type: Boolean,
      default: false,
    },
    // Social
    likes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    comments: [
      {
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        text: String,
        createdAt: { type: Date, default: Date.now },
      },
    ],
    caption: {
      type: String,
      maxlength: 500,
    },
    tags: [String],
    isPublic: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Geospatial index
uploadSchema.index({ 'location.coordinates': '2dsphere' });
uploadSchema.index({ user: 1, createdAt: -1 });
uploadSchema.index({ status: 1 });
uploadSchema.index({ imageHash: 1 });
uploadSchema.index({ 'location.city': 1 });
uploadSchema.index({ createdAt: -1 });

uploadSchema.virtual('likesCount').get(function () {
  return this.likes ? this.likes.length : 0;
});

module.exports = mongoose.model('Upload', uploadSchema);
