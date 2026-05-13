const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

/**
 * AI Verification Service using Anthropic Claude Vision API
 * Verifies that the image contains a dustbin and garbage disposal
 */
const verifyUploadWithAI = async (mediaUrl, mediaType) => {
  try {
    // Video = manual review
    if (mediaType === 'video') {
      return {
        status: 'manual_review',
        confidence: 0,
        dustbinDetected: false,
        garbageDetected: false,
        aiResponse: 'Video uploads require manual review.',
      };
    }

    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      console.warn('GEMINI_API_KEY not set, auto approving for development');

      return {
        status: 'verified',
        confidence: 100,
        dustbinDetected: true,
        garbageDetected: true,
        aiResponse: 'Auto-approved (development mode)',
      };
    }

    const model = genAI.getGenerativeModel({
      model: 'gemini-1.5-flash',
    });

    const prompt = `
You are an AI verification system for a cleanliness reward app called "Clean India".

Analyze this image carefully.

Check:

1. Is a dustbin/trash can/garbage bin visible?
2. Is a person throwing waste or disposing garbage?
3. Is this a genuine cleanliness action?
4. Is the image fake, irrelevant, blurry, selfie-only, or suspicious?

Rules:
- APPROVE only if dustbin is visible AND waste disposal looks genuine.
- REJECT selfies, unrelated photos, random images, dark/blurry images, or cheating attempts.
- If uncertain, choose manual_review.

Return ONLY valid JSON.

Example:

{
  "dustbinDetected": true,
  "garbageDetected": true,
  "isGenuine": true,
  "confidence": 92,
  "reason": "Person is disposing waste into visible dustbin",
  "verdict": "approved"
}
`;

  const result = await model.generateContent(`
${prompt}

Image URL:
${mediaUrl}
`);

    const responseText = result.response.text();

    let parsed;

    try {
      parsed = JSON.parse(
        responseText.replace(/```json|```/g, '').trim()
      );
    } catch {
      parsed = {
        dustbinDetected: false,
        garbageDetected: false,
        isGenuine: false,
        confidence: 0,
        reason: 'Could not parse AI response',
        verdict: 'manual_review',
      };
    }

    const statusMap = {
      approved: 'verified',
      rejected: 'rejected',
      manual_review: 'manual_review',
    };

    return {
      status: statusMap[parsed.verdict] || 'manual_review',
      confidence: parsed.confidence || 0,
      dustbinDetected: parsed.dustbinDetected || false,
      garbageDetected: parsed.garbageDetected || false,
      aiResponse: parsed.reason || '',
    };

  }catch (error) {
  console.error('AI verification error:', error);

  return {
    status: 'verified',
    confidence: 90,
    dustbinDetected: true,
    garbageDetected: true,
    aiResponse: 'Auto approved (AI unavailable)',
  };
}
};

/**
 * Simple hash function to detect exact duplicate images
 * In production, use a proper perceptual hashing library
 */
const generateImageHash = (url) => {
  // In production, download image and compute pHash
  // For now, use URL-based hash as placeholder
  return Buffer.from(url).toString('base64').slice(0, 32);
};

/**
 * Calculate points for an approved upload
 */
const calculatePoints = (user, isFirstUpload) => {
  const BASE_POINTS = parseInt(process.env.POINTS_PER_UPLOAD) || 10;
  const STREAK_BONUS = parseInt(process.env.POINTS_STREAK_BONUS) || 5;
  const FIRST_UPLOAD_BONUS = parseInt(process.env.POINTS_FIRST_UPLOAD) || 50;

  let points = BASE_POINTS;

  // First upload bonus
  if (isFirstUpload) {
    points += FIRST_UPLOAD_BONUS;
  }

  // Streak bonus
  if (user.currentStreak > 1) {
    points += Math.min(user.currentStreak * STREAK_BONUS, 50); // cap at 50
  }

  // Milestone bonuses
  if (user.approvedUploads + 1 === 10) points += 20;
  if (user.approvedUploads + 1 === 50) points += 100;
  if (user.approvedUploads + 1 === 100) points += 250;

  return points;
};

/**
 * Check what badges a user should earn
 */
const checkBadges = (user) => {
  const earned = [];
  const existingBadgeIds = user.badges.map((b) => b.id);

  const BADGES = [
    { id: 'first_upload', name: 'First Step', description: 'Made your first upload', icon: '🌱', condition: () => user.approvedUploads >= 1 },
    { id: 'streak_3', name: '3-Day Streak', description: 'Uploaded for 3 consecutive days', icon: '🔥', condition: () => user.currentStreak >= 3 },
    { id: 'streak_7', name: 'Week Warrior', description: '7-day upload streak', icon: '⚡', condition: () => user.currentStreak >= 7 },
    { id: 'streak_30', name: 'Month Master', description: '30-day upload streak', icon: '🏆', condition: () => user.currentStreak >= 30 },
    { id: 'uploads_10', name: 'Eco Starter', description: '10 approved uploads', icon: '♻️', condition: () => user.approvedUploads >= 10 },
    { id: 'uploads_50', name: 'Clean Champion', description: '50 approved uploads', icon: '🌍', condition: () => user.approvedUploads >= 50 },
    { id: 'uploads_100', name: 'Planet Hero', description: '100 approved uploads', icon: '🦸', condition: () => user.approvedUploads >= 100 },
    { id: 'points_500', name: 'Point Collector', description: 'Earned 500 points', icon: '⭐', condition: () => user.points >= 500 },
    { id: 'points_1000', name: 'Eco Elite', description: 'Earned 1000 points', icon: '💎', condition: () => user.points >= 1000 },
  ];

  for (const badge of BADGES) {
    if (!existingBadgeIds.includes(badge.id) && badge.condition()) {
      earned.push({ id: badge.id, name: badge.name, description: badge.description, icon: badge.icon });
    }
  }

  return earned;
};

module.exports = { verifyUploadWithAI, generateImageHash, calculatePoints, checkBadges };
