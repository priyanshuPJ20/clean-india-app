const fetch = require('node-fetch');

/**
 * AI Verification Service using Anthropic Claude Vision API
 * Verifies that the image contains a dustbin and garbage disposal
 */
const verifyUploadWithAI = async (mediaUrl, mediaType) => {
  try {
    // For videos, we check the thumbnail (first frame)
    // For images, we check directly via URL
    if (mediaType === 'video') {
      // Videos get a manual review flag since we can't easily analyze them with vision
      return {
        status: 'manual_review',
        confidence: 0,
        dustbinDetected: false,
        garbageDetected: false,
        aiResponse: 'Video uploads require manual review.',
      };
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      console.warn('ANTHROPIC_API_KEY not set, falling back to manual review');
      return {
        status: 'manual_review',
        confidence: 50,
        dustbinDetected: false,
        garbageDetected: false,
        aiResponse: 'AI verification unavailable. Queued for manual review.',
      };
    }

    const prompt = `You are an AI verification system for "Clean India" - a waste disposal app that rewards people for properly throwing garbage into dustbins.

Analyze this image and determine:
1. Is there a dustbin/waste bin/trash can/garbage bin visible in the image?
2. Does the image show someone disposing/throwing garbage/waste into a dustbin?
3. Is this a genuine waste disposal activity (not a fake, repeated, or unrelated image)?

Respond ONLY with a JSON object in this exact format (no other text):
{
  "dustbinDetected": true/false,
  "garbageDetected": true/false,
  "isGenuine": true/false,
  "confidence": 0-100,
  "reason": "brief explanation",
  "verdict": "approved" or "rejected" or "manual_review"
}

Rules for verdict:
- "approved": dustbin clearly visible AND garbage disposal action visible, confidence >= 70
- "rejected": no dustbin, or clearly unrelated image, or obvious fake
- "manual_review": ambiguous, low confidence, or needs human judgment`;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-opus-4-5',
        max_tokens: 256,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image',
                source: {
                  type: 'url',
                  url: mediaUrl,
                },
              },
              {
                type: 'text',
                text: prompt,
              },
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error('AI API error:', err);
      return {
        status: 'manual_review',
        confidence: 0,
        dustbinDetected: false,
        garbageDetected: false,
        aiResponse: 'AI service error. Queued for manual review.',
      };
    }

    const data = await response.json();
    const text = data.content?.[0]?.text || '{}';

    let parsed;
    try {
      parsed = JSON.parse(text.replace(/```json|```/g, '').trim());
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
  } catch (error) {
    console.error('AI verification error:', error);
    return {
      status: 'manual_review',
      confidence: 0,
      dustbinDetected: false,
      garbageDetected: false,
      aiResponse: `Verification error: ${error.message}`,
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
