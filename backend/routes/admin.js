const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const User = require('../models/User');
const Post = require('../models/Post');
const Report = require('../models/Report');
const AdminLog = require('../models/AdminLog');
const ModerationRule = require('../models/ModerationRule');
const adminAuth = require('../middleware/adminAuth');

// Helper function to safely create admin logs
async function createAdminLog(logData) {
  try {
    const log = await AdminLog.create(logData);
    console.log(`✅ Admin log created: ${logData.actionType} by ${logData.adminId}`);
    return log;
  } catch (error) {
    console.error('❌ Error creating admin log:', error.message);
    console.error('Log data:', JSON.stringify(logData, null, 2));
    // Don't throw - log creation failure shouldn't break the main action
  }
}

// Admin Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    if (user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Access denied. Admin only.' });
    }

    const token = jwt.sign(
      { userId: user._id, role: user.role },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '7d' }
    );

    res.json({
      success: true,
      token,
      admin: {
        id: user._id,
        email: user.email,
        username: user.username,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Admin login error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Dashboard Stats
router.get('/dashboard/stats', adminAuth, async (req, res) => {
  try {
      const [
      totalUsers,
      totalPosts,
      pendingReports,
      shadowbannedUsers,
      flaggedPosts,
      recentReports
    ] = await Promise.all([
      User.countDocuments(),
      Post.countDocuments(),
      Report.countDocuments({ status: 'pending' }),
      User.countDocuments({ shadowbanned: true }),
      Post.countDocuments({ status: 'flagged' }),
      Report.find({ status: 'pending' }).limit(5).sort({ createdAt: -1 })
    ]);    res.json({
      success: true,
      stats: {
        totalUsers,
        totalPosts,
        pendingReports,
        shadowbannedUsers,
        flaggedPosts,
        recentReports
      }
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;

// ========== POSTS MANAGEMENT ==========

// Get all posts (paginated)
router.get('/posts', adminAuth, async (req, res) => {
  try {
    const { status, filter, page = 1, limit = 50 } = req.query;
    let query = {};

    if (status) query.status = status;

    let sort = { createdAt: -1 };
    if (filter === 'most_reported') {
      query['reports.0'] = { $exists: true };
    } else if (filter === 'flagged') {
      query.status = 'flagged';
    } else if (filter === 'removed') {
      query.status = 'removed';
    }

    console.log(`📋 Admin fetching posts - Filter: ${filter || 'all'}, Page: ${page}, Query:`, JSON.stringify(query));

    const posts = await Post.find(query)
      .populate('author', 'username fakeIP deviceHash violationCount shadowbanned')
      .populate('removedBy', 'username')
      .sort(sort)
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit))
      .lean();

    const total = await Post.countDocuments(query);

    console.log(`✅ Returning ${posts.length} posts out of ${total} total`);
    
    // Log post types for debugging
    const postTypes = posts.map(p => {
      if (p.poll?.enabled) return 'poll';
      if (p.content?.voiceNote?.url) return 'voice';
      if (p.content?.media?.length > 0) return 'media';
      if (p.media?.length > 0) return 'legacy-media';
      return 'text';
    });
    console.log(`📊 Post types in response:`, postTypes.reduce((acc, type) => {
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {}));

    res.json({
      success: true,
      posts,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Get posts error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ========== REPORTS MANAGEMENT ==========

// Get all reports (with filters)
router.get('/reports', adminAuth, async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const query = status ? { status } : {};

    const reports = await Report.find(query)
      .populate('reportedBy', 'username fakeIP deviceHash')
      .populate('postOwner', 'username fakeIP deviceHash violationCount shadowbanned')
      .populate('postId')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));

    const total = await Report.countDocuments(query);

    res.json({
      success: true,
      reports,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Get reports error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Get pending reports
router.get('/reports/pending', adminAuth, async (req, res) => {
  try {
    const reports = await Report.find({ status: 'pending' })
      .populate('reportedBy', 'username fakeIP deviceHash')
      .populate('postOwner', 'username fakeIP deviceHash violationCount shadowbanned')
      .populate('postId')
      .sort({ createdAt: -1 });

    res.json({ success: true, reports });
  } catch (error) {
    console.error('Get pending reports error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Get single report
router.get('/reports/:id', adminAuth, async (req, res) => {
  try {
    console.log('🔍 Looking for report with ID:', req.params.id);

    // Fetch raw report without populate to avoid cast/populate errors
    const rawReport = await Report.findById(req.params.id).lean();

    if (!rawReport) {
      console.log('❌ Report not found with ID:', req.params.id);
      return res.status(404).json({ success: false, message: 'Report not found' });
    }

    console.log('✅ Report raw found:', rawReport._id || rawReport.id || req.params.id);

    // Conditionally populate related fields only when IDs are valid ObjectIds
    const populatedReport = { ...rawReport };

    // reportedBy
    if (rawReport.reportedBy && mongoose.isValidObjectId(rawReport.reportedBy)) {
      populatedReport.reportedBy = await User.findById(rawReport.reportedBy).select('username email fakeIP deviceHash violationCount').lean();
    } else {
      populatedReport.reportedBy = null;
    }

    // postOwner
    if (rawReport.postOwner && mongoose.isValidObjectId(rawReport.postOwner)) {
      populatedReport.postOwner = await User.findById(rawReport.postOwner).select('username email fakeIP deviceHash violationCount shadowbanned').lean();
    } else if (rawReport.postOwner && typeof rawReport.postOwner === 'string' && rawReport.postOwner === 'admin-superadmin') {
      // Handle legacy/hardcoded admin id stored in postOwner
      populatedReport.postOwner = { _id: 'admin-superadmin', username: 'superadmin', email: 'admin@whisperecho.com' };
    } else {
      populatedReport.postOwner = null;
    }

    // postId
    if (rawReport.postId && mongoose.isValidObjectId(rawReport.postId)) {
      populatedReport.postId = await Post.findById(rawReport.postId).lean();
    } else {
      populatedReport.postId = null;
    }

    // reviewedBy
    if (rawReport.reviewedBy && mongoose.isValidObjectId(rawReport.reviewedBy)) {
      populatedReport.reviewedBy = await User.findById(rawReport.reviewedBy).select('username email').lean();
    } else {
      populatedReport.reviewedBy = null;
    }

    // Get previous reports for this post owner only if postOwner is a valid id
    let previousReports = 0;
    if (populatedReport.postOwner && mongoose.isValidObjectId(populatedReport.postOwner._id)) {
      previousReports = await Report.countDocuments({ 
        postOwner: populatedReport.postOwner._id,
        status: 'resolved'
      });
    }

    res.json({ success: true, report: populatedReport, previousReports });
  } catch (error) {
    console.error('❌ Get report error:', error.message || error);
    console.error('Requested ID:', req.params.id);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// Remove post from report
router.post('/reports/:id/remove-post', adminAuth, async (req, res) => {
  try {
    const { adminNotes } = req.body;
    const report = await Report.findById(req.params.id).populate('postId postOwner');

    if (!report) {
      return res.status(404).json({ success: false, message: 'Report not found' });
    }

    // Update post status
    if (report.postId) {
      report.postId.status = 'removed';
      // Only set removedBy if it's a valid ObjectId (not hardcoded admin)
      if (req.userId !== 'admin-superadmin') {
        report.postId.removedBy = req.userId;
      }
      report.postId.removedAt = new Date();
      report.postId.violationCount += 1;
      
      // Validate and save with error handling
      try {
        await report.postId.save({ validateModifiedOnly: true });
      } catch (saveError) {
        console.error('Error saving post:', saveError.message);
        // Continue anyway - the important part is updating the report
      }
    }

    // Update user violation count
    if (report.postOwner) {
      report.postOwner.violationCount += 1;
      
      // Auto-shadowban if threshold reached
      const moderationRule = await ModerationRule.findOne();
      if (moderationRule && report.postOwner.violationCount >= moderationRule.autoShadowbanThreshold) {
        report.postOwner.shadowbanned = true;
        report.postOwner.shadowbannedAt = new Date();
      }
      
      await report.postOwner.save();
    }

    // Update report
    report.status = 'resolved';
    report.actionTaken = 'post_removed';
    report.reviewedBy = req.userId;
    report.reviewedAt = new Date();
    report.adminNotes = adminNotes;
    await report.save();

    // Log admin action
    await createAdminLog({
      adminId: req.userId,
      actionType: 'post_removed',
      targetPost: report.postId?._id,
      targetUser: report.postOwner?._id,
      reportId: report._id,
      details: `Post removed. Reason: ${report.reason}`,
      metadata: { adminNotes }
    });

    // Emit socket event
    if (global.io) {
      global.io.emit('post:removed', { postId: report.postId?._id });
    }

    res.json({ success: true, message: 'Post removed successfully', report });
  } catch (error) {
    console.error('Remove post error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Keep post from report
router.post('/reports/:id/keep-post', adminAuth, async (req, res) => {
  try {
    const { adminNotes } = req.body;
    const report = await Report.findById(req.params.id);

    if (!report) {
      return res.status(404).json({ success: false, message: 'Report not found' });
    }

    report.status = 'rejected';
    report.actionTaken = 'post_kept';
    report.reviewedBy = req.userId;
    report.reviewedAt = new Date();
    report.adminNotes = adminNotes;
    await report.save();

    await createAdminLog({
      adminId: req.userId,
      actionType: 'report_rejected',
      targetPost: report.postId,
      reportId: report._id,
      details: `Report rejected. Post kept.`,
      metadata: { adminNotes }
    });

    res.json({ success: true, message: 'Post kept, report rejected', report });
  } catch (error) {
    console.error('Keep post error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Warn user from report
router.post('/reports/:id/warn-user', adminAuth, async (req, res) => {
  try {
    const { adminNotes } = req.body;
    const report = await Report.findById(req.params.id).populate('postOwner');

    if (!report) {
      return res.status(404).json({ success: false, message: 'Report not found' });
    }

    if (report.postOwner) {
      report.postOwner.violationCount += 1;
      await report.postOwner.save();
    }

    report.status = 'resolved';
    report.actionTaken = 'user_warned';
    report.reviewedBy = req.userId;
    report.reviewedAt = new Date();
    report.adminNotes = adminNotes;
    await report.save();

    await createAdminLog({
      adminId: req.userId,
      actionType: 'user_warned',
      targetUser: report.postOwner?._id,
      reportId: report._id,
      details: `User warned for violation`,
      metadata: { adminNotes }
    });

    res.json({ success: true, message: 'User warned successfully', report });
  } catch (error) {
    console.error('Warn user error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Shadowban user from report
router.post('/reports/:id/shadowban', adminAuth, async (req, res) => {
  try {
    const { adminNotes } = req.body;
    const report = await Report.findById(req.params.id).populate('postOwner postId');

    if (!report) {
      return res.status(404).json({ success: false, message: 'Report not found' });
    }

    if (report.postOwner) {
      report.postOwner.shadowbanned = true;
      report.postOwner.shadowbannedAt = new Date();
      report.postOwner.violationCount += 1;
      await report.postOwner.save();
    }

    if (report.postId) {
      report.postId.status = 'removed';
      // Only set removedBy if it's a valid ObjectId (not hardcoded admin)
      if (req.userId !== 'admin-superadmin') {
        report.postId.removedBy = req.userId;
      }
      report.postId.removedAt = new Date();
      try {
        await report.postId.save({ validateModifiedOnly: true });
      } catch (saveError) {
        console.error('Error saving post in shadowban:', saveError.message);
      }
    }

    report.status = 'resolved';
    report.actionTaken = 'user_shadowbanned';
    report.reviewedBy = req.userId;
    report.reviewedAt = new Date();
    report.adminNotes = adminNotes;
    
    try {
      await report.save();
      console.log(`✅ Report ${report._id} status updated to resolved`);
    } catch (reportSaveError) {
      console.error('❌ Error saving report in shadowban:', reportSaveError.message);
      // Try to save without validation
      await report.save({ validateBeforeSave: false });
    }

    await createAdminLog({
      adminId: req.userId,
      actionType: 'user_shadowbanned',
      targetUser: report.postOwner?._id,
      targetPost: report.postId?._id,
      reportId: report._id,
      details: `User shadowbanned`,
      metadata: { adminNotes }
    });

    res.json({ success: true, message: 'User shadowbanned successfully', report });
  } catch (error) {
    console.error('Shadowban user error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Close report
router.post('/reports/:id/close', adminAuth, async (req, res) => {
  try {
    const { adminNotes } = req.body;
    const report = await Report.findById(req.params.id);

    if (!report) {
      return res.status(404).json({ success: false, message: 'Report not found' });
    }

    report.status = 'resolved';
    report.reviewedBy = req.userId;
    report.reviewedAt = new Date();
    report.adminNotes = adminNotes;
    await report.save();

    res.json({ success: true, message: 'Report closed', report });
  } catch (error) {
    console.error('Close report error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ========== POSTS MANAGEMENT ==========

// Get single post
router.get('/posts/:id', adminAuth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id)
      .populate('author', '_id username email fakeIP deviceHash violationCount shadowbanned')
      .populate('removedBy', 'username email');

    if (!post) {
      return res.status(404).json({ success: false, message: 'Post not found' });
    }

    if (!post.author) {
      console.warn('⚠️ Post found but author is missing:', post._id);
    }

    const reports = await Report.find({ postId: post._id })
      .populate('reportedBy', 'username fakeIP')
      .sort({ createdAt: -1 });

    res.json({ success: true, post, reports });
  } catch (error) {
    console.error('Get post error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Remove post
router.post('/posts/:id/remove', adminAuth, async (req, res) => {
  try {
    const { reason } = req.body;
    const post = await Post.findById(req.params.id).populate('author');

    if (!post) {
      return res.status(404).json({ success: false, message: 'Post not found' });
    }

    post.status = 'removed';
    // Only set removedBy if it's a valid ObjectId (not hardcoded admin)
    if (req.userId !== 'admin-superadmin') {
      post.removedBy = req.userId;
    }
    post.removedAt = new Date();
    post.violationCount += 1;
    try {
      await post.save({ validateModifiedOnly: true });
    } catch (saveError) {
      console.error('Error saving post in remove:', saveError.message);
      // Continue anyway
    }

    if (post.author) {
      post.author.violationCount += 1;
      await post.author.save();
    }

    await createAdminLog({
      adminId: req.userId,
      actionType: 'post_removed',
      targetPost: post._id,
      targetUser: post.author?._id,
      details: reason || 'Post removed by admin'
    });

    if (global.io) {
      global.io.emit('post:removed', { postId: post._id });
    }

    res.json({ success: true, message: 'Post removed successfully', post });
  } catch (error) {
    console.error('Remove post error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Restore post
router.post('/posts/:id/restore', adminAuth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({ success: false, message: 'Post not found' });
    }

    post.status = 'active';
    post.removedBy = null;
    post.removedAt = null;
    await post.save();

    await createAdminLog({
      adminId: req.userId,
      actionType: 'post_restored',
      targetPost: post._id,
      details: 'Post restored by admin'
    });

    if (global.io) {
      global.io.emit('post:restored', { postId: post._id });
    }

    res.json({ success: true, message: 'Post restored successfully', post });
  } catch (error) {
    console.error('Restore post error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ========== USERS MANAGEMENT ==========

// Get all users
router.get('/users', adminAuth, async (req, res) => {
  try {
    const { filter, page = 1, limit = 20, search } = req.query;
    // Removed role filter to show all users
    let query = {};

    if (filter === 'shadowbanned') {
      query.shadowbanned = true;
    } else if (filter === 'violations') {
      query.violationCount = { $gt: 0 };
    }

    if (search) {
      query.$or = [
        { username: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    console.log('🔍 /admin/users query:', JSON.stringify(query));
    console.log('📊 Page:', page, 'Limit:', limit, 'Filter:', filter, 'Search:', search);

    const users = await User.find(query)
      .select('-password')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit))
      .lean();

    const total = await User.countDocuments(query);

    console.log(`✅ Returning ${users.length} users out of ${total} total`);
    
    // Log sample user IDs for debugging
    if (users.length > 0) {
      console.log('📋 Sample user IDs:', users.slice(0, 3).map(u => ({ 
        id: u._id, 
        idString: u._id.toString(),
        idType: typeof u._id,
        username: u.username, 
        violations: u.violationCount 
      })));
    }
    
    // Ensure all users have proper _id as string
    const usersWithStringIds = users.map(user => ({
      ...user,
      _id: user._id.toString() // Ensure _id is always a string
    }));

    res.json({
      success: true,
      users: usersWithStringIds,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Get single user
router.get('/users/:id', adminAuth, async (req, res) => {
  try {
    const userId = req.params.id.trim();
    console.log('🔍 Looking for user with ID:', userId);
    console.log('🔍 Raw ID from params:', req.params.id);
    console.log('🔍 ID length:', userId.length);
    console.log('🔍 ID type:', typeof userId);
    
    // Validate ObjectId format
    if (!mongoose.isValidObjectId(userId)) {
      console.log('❌ Invalid ObjectId format:', userId);
      return res.status(400).json({ success: false, message: 'Invalid user ID format' });
    }
    
    console.log('✅ ObjectId validation passed');
    
    const user = await User.findById(userId).select('-password').lean();

    if (!user) {
      console.log('❌ User not found with ID:', userId);
      
      // Try to find similar IDs
      const similarUsers = await User.find({
        _id: { $regex: userId.substring(0, 10) }
      }).select('_id username violationCount').limit(5).lean().catch(() => []);
      
      console.log('🔍 Similar user IDs found:', similarUsers.map(u => u._id.toString()));
      
      // Check if user exists at all
      const userCount = await User.countDocuments();
      console.log(`📊 Total users in database: ${userCount}`);
      
      // Check users with violations
      const usersWithViolations = await User.countDocuments({ violationCount: { $gt: 0 } });
      console.log(`📊 Users with violations: ${usersWithViolations}`);
      
      return res.status(404).json({ 
        success: false, 
        message: 'User not found',
        debug: {
          requestedId: userId,
          totalUsers: userCount,
          usersWithViolations
        }
      });
    }

    console.log('✅ User found:', user.username, 'ID:', user._id);

    const [posts, reports, adminLogs] = await Promise.all([
      Post.find({ author: user._id }).sort({ createdAt: -1 }).limit(10).lean(),
      Report.find({ postOwner: user._id }).sort({ createdAt: -1 }).limit(10).lean(),
      AdminLog.find({ targetUser: user._id }).sort({ createdAt: -1 }).limit(10).lean()
    ]);
    
    // Manually populate adminId to handle hardcoded admin
    const populatedAdminLogs = await Promise.all(adminLogs.map(async (log) => {
      if (log.adminId && mongoose.isValidObjectId(log.adminId)) {
        const admin = await User.findById(log.adminId).select('username').lean();
        return { ...log, adminId: admin };
      } else if (log.adminId === 'admin-superadmin' || typeof log.adminId === 'string') {
        return { 
          ...log, 
          adminId: { 
            _id: 'admin-superadmin', 
            username: 'superadmin' 
          } 
        };
      }
      return log;
    }));

    console.log(`📊 User ${user.username} - Posts: ${posts.length}, Reports: ${reports.length}, Logs: ${populatedAdminLogs.length}`);

    res.json({ success: true, user, posts, reports, adminLogs: populatedAdminLogs });
  } catch (error) {
    console.error('❌ Get user error:', error);
    console.error('Requested ID:', req.params.id);
    console.error('Error stack:', error.stack);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// Shadowban user
router.post('/users/:id/shadowban', adminAuth, async (req, res) => {
  try {
    const { reason } = req.body;
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    user.shadowbanned = true;
    user.shadowbannedAt = new Date();
    await user.save();

    await createAdminLog({
      adminId: req.userId,
      actionType: 'user_shadowbanned',
      targetUser: user._id,
      details: reason || 'User shadowbanned by admin'
    });

    res.json({ success: true, message: 'User shadowbanned successfully', user });
  } catch (error) {
    console.error('Shadowban user error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Unshadowban user
router.post('/users/:id/unshadowban', adminAuth, async (req, res) => {
  try {
    console.log('🔔 Unshadowban requested for ID:', req.params.id, 'by admin:', req.userId);
    const user = await User.findById(req.params.id);

    if (!user) {
      console.log('❌ Unshadowban failed - user not found:', req.params.id);
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    console.log('ℹ️ Current shadowbanned state for', user.username, user._id, ':', user.shadowbanned, 'shadowbannedAt:', user.shadowbannedAt);

    user.shadowbanned = false;
    user.shadowbannedAt = null;
    await user.save();

    console.log('✅ Unshadowban saved for', user.username, user._id, 'new shadowbanned state:', user.shadowbanned);

    await createAdminLog({
      adminId: req.userId,
      actionType: 'user_unshadowbanned',
      targetUser: user._id,
      details: 'User unshadowbanned by admin'
    });

    res.json({ success: true, message: 'User unshadowbanned successfully', user });
  } catch (error) {
    console.error('Unshadowban user error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Debug: find users by username (admin only)
router.get('/users/by-username/:username', adminAuth, async (req, res) => {
  try {
    const { username } = req.params;
    // Case-insensitive exact match
    const users = await User.find({ username: { $regex: `^${username}$`, $options: 'i' } })
      .select('_id username email role shadowbanned shadowbannedAt violationCount createdAt')
      .lean();

    console.log(`🔎 /admin/users/by-username/${username} found ${users.length} users`);
    res.json({ success: true, users });
  } catch (error) {
    console.error('Error searching users by username:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Reset user violations
router.post('/users/:id/reset-violations', adminAuth, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    user.violationCount = 0;
    await user.save();

    await createAdminLog({
      adminId: req.userId,
      actionType: 'violations_reset',
      targetUser: user._id,
      details: 'User violations reset by admin'
    });

    res.json({ success: true, message: 'Violations reset successfully', user });
  } catch (error) {
    console.error('Reset violations error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ========== MODERATION RULES ==========

// Get moderation rules
router.get('/moderation-rules', adminAuth, async (req, res) => {
  try {
    let rules = await ModerationRule.findOne();
    
    if (!rules) {
      rules = await ModerationRule.create({
        bannedWords: [],
        autoHideKeywords: [],
        autoShadowbanThreshold: 3,
        autoFlagSettings: {
          enabled: true,
          minReports: 3,
          autoRemoveThreshold: 10
        },
        spamDetection: {
          enabled: true,
          maxPostsPerHour: 10,
          duplicateContentThreshold: 0.8
        }
      });
    }

    res.json({ success: true, rules });
  } catch (error) {
    console.error('Get moderation rules error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Update moderation rules
router.put('/moderation-rules', adminAuth, async (req, res) => {
  try {
    const updates = req.body;
    
    let rules = await ModerationRule.findOne();
    
    if (!rules) {
      rules = await ModerationRule.create(updates);
    } else {
      Object.assign(rules, updates);
      await rules.save();
    }

    await createAdminLog({
      adminId: req.userId,
      actionType: 'moderation_rule_updated',
      details: 'Moderation rules updated',
      metadata: updates
    });

    res.json({ success: true, message: 'Moderation rules updated', rules });
  } catch (error) {
    console.error('Update moderation rules error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ========== ADMIN LOGS ==========

// Get admin logs
router.get('/logs', adminAuth, async (req, res) => {
  try {
    const { page = 1, limit = 50, actionType } = req.query;
    const query = actionType ? { actionType } : {};

    console.log('📋 Fetching admin logs with query:', query);

    // Don't populate adminId - just get raw logs
    const logs = await AdminLog.find(query)
      .populate('targetUser', 'username')
      .populate('targetPost')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit))
      .lean(); // Use lean() for better performance

    const total = await AdminLog.countDocuments(query);

    console.log(`📊 Found ${total} total logs, returning ${logs.length} logs`);

    // Transform logs to handle hardcoded admin
    const transformedLogs = logs.map(log => {
      // If adminId is the hardcoded string, create a mock admin object
      if (log.adminId === 'admin-superadmin' || typeof log.adminId === 'string') {
        log.adminId = {
          _id: 'admin-superadmin',
          username: 'superadmin',
          email: 'admin@whisperecho.com'
        };
      }
      return log;
    });

    res.json({
      success: true,
      logs: transformedLogs,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('❌ Get logs error:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

module.exports = router;
