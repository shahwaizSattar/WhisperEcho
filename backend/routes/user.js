const express = require('express');
const User = require('../models/User');
const Notification = require('../models/Notification');
const { authenticateToken } = require('../middleware/auth');
const { body, validationResult } = require('express-validator');

const router = express.Router();

// GET /api/user/profile/:username - Get user profile
router.get('/profile/:username', async (req, res) => {
  try {
    const { username } = req.params;
    
    const user = await User.findOne({ username })
      .select('-password -email -phone')
      .populate('followers', 'username avatar')
      .populate('following', 'username avatar');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      user
    });

  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// PUT /api/user/profile - Update user profile
router.put('/profile', authenticateToken, [
  body('bio').optional().isLength({ max: 500 }),
  body('preferences').optional().isArray()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { bio, preferences, avatar, settings } = req.body;
    const userId = req.user._id;

    const updateData = {};
    if (bio !== undefined) updateData.bio = bio;
    if (preferences) updateData.preferences = preferences;
    if (avatar) updateData.avatar = avatar;
    if (settings) updateData.settings = { ...req.user.settings, ...settings };

    const user = await User.findByIdAndUpdate(
      userId,
      updateData,
      { new: true, runValidators: true }
    ).select('-password');

    res.json({
      success: true,
      message: 'Profile updated successfully',
      user
    });

  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// POST /api/user/echo/:userId - Follow/Echo a user
router.post('/echo/:userId', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;
    const currentUserId = req.user._id;

    if (userId === currentUserId.toString()) {
      return res.status(400).json({
        success: false,
        message: 'You cannot echo yourself'
      });
    }

    const targetUser = await User.findById(userId);
    if (!targetUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const currentUser = await User.findById(currentUserId);
    
    // Check if already following
    if (currentUser.following.includes(userId)) {
      return res.status(400).json({
        success: false,
        message: 'Already echoing this user'
      });
    }

    // Add to following/followers
    await targetUser.addFollower(currentUserId);

    if (targetUser.settings?.notifications?.followers !== false) {
      try {
        await Notification.create({
          user: targetUser._id,
          actor: currentUserId,
          type: 'track',
          metadata: {
            username: targetUser.username
          }
        });
      } catch (notifyError) {
        console.error('Create track notification error:', notifyError);
      }
    }

    res.json({
      success: true,
      message: `You are now echoing ${targetUser.username}`,
      isEchoing: true
    });

  } catch (error) {
    console.error('Echo user error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// DELETE /api/user/echo/:userId - Unfollow/Unecho a user
router.delete('/echo/:userId', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;
    const currentUserId = req.user._id;

    const targetUser = await User.findById(userId);
    if (!targetUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const currentUser = await User.findById(currentUserId);
    
    // Check if actually following
    if (!currentUser.following.includes(userId)) {
      return res.status(400).json({
        success: false,
        message: 'Not echoing this user'
      });
    }

    // Remove from following/followers
    await targetUser.removeFollower(currentUserId);

    res.json({
      success: true,
      message: `You are no longer echoing ${targetUser.username}`,
      isEchoing: false
    });

  } catch (error) {
    console.error('Unecho user error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// GET /api/user/discover - Discover random users based on preferences
router.get('/discover', authenticateToken, async (req, res) => {
  try {
    const currentUser = req.user;
    const { limit = 10 } = req.query;

    // Find users with similar preferences who aren't already followed
    const users = await User.aggregate([
      {
        $match: {
          _id: { $ne: currentUser._id },
          _id: { $nin: currentUser.following },
          preferences: { $in: currentUser.preferences },
          'settings.privacy.allowDiscovery': true
        }
      },
      { $sample: { size: parseInt(limit) } },
      {
        $project: {
          username: 1,
          avatar: 1,
          bio: 1,
          preferences: 1,
          stats: 1,
          badges: 1
        }
      }
    ]);

    res.json({
      success: true,
      users
    });

  } catch (error) {
    console.error('Discover users error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// GET /api/user/echo-trails/:userId - Get echo trails (who they follow)
router.get('/echo-trails/:userId', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;
    
    const user = await User.findById(userId)
      .populate('following', 'username avatar bio preferences stats')
      .select('following');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Anonymize the trails - remove direct identifiers
    const anonymizedTrails = user.following.map(followedUser => ({
      id: followedUser._id,
      preferences: followedUser.preferences,
      stats: followedUser.stats,
      hasAvatar: !!followedUser.avatar,
      bioLength: followedUser.bio ? followedUser.bio.length : 0,
      joinedRecently: followedUser.createdAt > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    }));

    res.json({
      success: true,
      trails: anonymizedTrails,
      count: anonymizedTrails.length
    });

  } catch (error) {
    console.error('Get echo trails error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// GET /api/user/search - Search users
router.get('/search', async (req, res) => {
  try {
    const { q, category } = req.query;
    
    if (!q || q.length < 2) {
      return res.status(400).json({
        success: false,
        message: 'Search query must be at least 2 characters'
      });
    }

    const searchQuery = {
      $or: [
        { username: { $regex: q, $options: 'i' } },
        { bio: { $regex: q, $options: 'i' } }
      ]
    };

    if (category) {
      searchQuery.preferences = category;
    }

    const users = await User.find(searchQuery)
      .select('username avatar bio preferences stats badges')
      .limit(20)
      .sort({ 'stats.karmaScore': -1 });

    res.json({
      success: true,
      users,
      count: users.length
    });

  } catch (error) {
    console.error('Search users error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// GET /api/user/list - List all users (for debugging)
router.get('/list', async (req, res) => {
  try {
    const users = await User.find({})
      .select('username avatar bio')
      .limit(50);
    
    console.log('📋 All users in database:', users.map(u => u.username));
    
    res.json({
      success: true,
      users,
      count: users.length
    });
  } catch (error) {
    console.error('List users error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// PUT /api/user/change-password - Change password
router.put('/change-password', authenticateToken, [
  body('currentPassword').notEmpty().withMessage('Current password is required'),
  body('newPassword').isLength({ min: 6 }).withMessage('New password must be at least 6 characters')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { currentPassword, newPassword } = req.body;
    const userId = req.user._id;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const passwordMatch = await user.comparePassword(currentPassword);
    if (!passwordMatch) {
      return res.status(401).json({
        success: false,
        message: 'Current password is incorrect'
      });
    }

    user.password = newPassword;
    await user.save();

    res.json({
      success: true,
      message: 'Password changed successfully'
    });

  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// PUT /api/user/change-username - Change username
router.put('/change-username', authenticateToken, [
  body('newUsername').isLength({ min: 3, max: 30 }).withMessage('Username must be 3-30 characters'),
  body('newUsername').matches(/^[a-zA-Z0-9_-]+$/).withMessage('Username can only contain letters, numbers, underscores, and hyphens')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { newUsername } = req.body;
    const userId = req.user._id;

    const existingUser = await User.findOne({ username: newUsername });
    if (existingUser && existingUser._id.toString() !== userId.toString()) {
      return res.status(400).json({
        success: false,
        message: 'Username already taken'
      });
    }

    const user = await User.findByIdAndUpdate(
      userId,
      { username: newUsername },
      { new: true, runValidators: true }
    ).select('-password');

    res.json({
      success: true,
      message: 'Username changed successfully',
      user
    });

  } catch (error) {
    console.error('Change username error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// GET /api/user/notifications - Get user notifications
router.get('/notifications', authenticateToken, async (req, res) => {
  try {
    const [notifications, unreadCount] = await Promise.all([
      Notification.find({ user: req.user._id })
        .sort({ createdAt: -1 })
        .limit(50)
        .populate('actor', 'username avatar')
        .populate('post', 'content')
        .lean(),
      Notification.countDocuments({ user: req.user._id, read: false })
    ]);

    const formattedNotifications = notifications.map(notification => ({
      _id: notification._id,
      type: notification.type,
      read: notification.read,
      createdAt: notification.createdAt,
      user: notification.actor ? {
        _id: notification.actor._id,
        username: notification.actor.username,
        avatar: notification.actor.avatar
      } : undefined,
      post: notification.post ? {
        _id: notification.post._id,
        content: {
          text: notification.post.content?.text || ''
        }
      } : undefined,
      comment: notification.metadata?.commentContent ? {
        content: notification.metadata.commentContent
      } : undefined,
      reactionType: notification.reactionType
    }));

    res.json({
      success: true,
      notifications: formattedNotifications,
      unreadCount
    });

  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// POST /api/user/notifications/read - Mark notifications as read
router.post('/notifications/read', authenticateToken, async (req, res) => {
  try {
    const { notificationIds } = req.body || {};
    const filter = { user: req.user._id, read: false };

    if (Array.isArray(notificationIds) && notificationIds.length > 0) {
      filter._id = { $in: notificationIds };
    }

    const result = await Notification.updateMany(filter, { $set: { read: true } });
    const modifiedCount = typeof result.modifiedCount === 'number'
      ? result.modifiedCount
      : typeof result.nModified === 'number'
      ? result.nModified
      : 0;

    res.json({
      success: true,
      updated: modifiedCount
    });
  } catch (error) {
    console.error('Mark notifications read error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// POST /api/users/:userId/mute - Mute a user
router.post('/:userId/mute', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;
    const currentUserId = req.user._id;

    if (userId === currentUserId.toString()) {
      return res.status(400).json({
        success: false,
        message: 'You cannot mute yourself'
      });
    }

    const targetUser = await User.findById(userId);
    if (!targetUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const currentUser = await User.findById(currentUserId);
    
    if (currentUser.mutedUsers.includes(userId)) {
      return res.status(400).json({
        success: false,
        message: 'User already muted'
      });
    }

    currentUser.mutedUsers.push(userId);
    await currentUser.save();

    res.json({
      success: true,
      message: `You have muted ${targetUser.username}`,
      mutedUserId: userId
    });

  } catch (error) {
    console.error('Mute user error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// DELETE /api/users/:userId/mute - Unmute a user
router.delete('/:userId/mute', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;
    const currentUserId = req.user._id;

    const currentUser = await User.findById(currentUserId);
    
    if (!currentUser.mutedUsers.includes(userId)) {
      return res.status(400).json({
        success: false,
        message: 'User is not muted'
      });
    }

    currentUser.mutedUsers = currentUser.mutedUsers.filter(id => id.toString() !== userId);
    await currentUser.save();

    res.json({
      success: true,
      message: 'User unmuted successfully'
    });

  } catch (error) {
    console.error('Unmute user error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// POST /api/users/:userId/block - Block a user
router.post('/:userId/block', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;
    const currentUserId = req.user._id;

    if (userId === currentUserId.toString()) {
      return res.status(400).json({
        success: false,
        message: 'You cannot block yourself'
      });
    }

    const targetUser = await User.findById(userId);
    if (!targetUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const currentUser = await User.findById(currentUserId);
    
    if (currentUser.blockedUsers.includes(userId)) {
      return res.status(400).json({
        success: false,
        message: 'User already blocked'
      });
    }

    currentUser.blockedUsers.push(userId);
    
    // Also remove from following/followers
    if (currentUser.following.includes(userId)) {
      await targetUser.removeFollower(currentUserId);
    }
    
    await currentUser.save();

    res.json({
      success: true,
      message: `You have blocked ${targetUser.username}`,
      blockedUserId: userId
    });

  } catch (error) {
    console.error('Block user error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// DELETE /api/users/:userId/block - Unblock a user
router.delete('/:userId/block', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;
    const currentUserId = req.user._id;

    const currentUser = await User.findById(currentUserId);
    
    if (!currentUser.blockedUsers.includes(userId)) {
      return res.status(400).json({
        success: false,
        message: 'User is not blocked'
      });
    }

    currentUser.blockedUsers = currentUser.blockedUsers.filter(id => id.toString() !== userId);
    await currentUser.save();

    res.json({
      success: true,
      message: 'User unblocked successfully'
    });

  } catch (error) {
    console.error('Unblock user error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// GET /api/users/blocked - Get blocked users list
router.get('/blocked', authenticateToken, async (req, res) => {
  try {
    const currentUser = await User.findById(req.user._id)
      .populate('blockedUsers', 'username avatar bio');

    res.json({
      success: true,
      blockedUsers: currentUser.blockedUsers || []
    });

  } catch (error) {
    console.error('Get blocked users error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

module.exports = router;
