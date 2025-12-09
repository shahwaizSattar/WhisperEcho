const express = require('express');
const router = express.Router();
const Report = require('../models/Report');
const Post = require('../models/Post');
const { authenticateToken } = require('../middleware/auth');
const { v4: uuidv4 } = require('uuid');

// Create a report (User reports a post)
router.post('/create', authenticateToken, async (req, res) => {
  try {
    const { postId, reason, description } = req.body;

    if (!postId || !reason) {
      return res.status(400).json({ 
        success: false, 
        message: 'Post ID and reason are required' 
      });
    }

    const post = await Post.findById(postId).populate('author');

    if (!post) {
      return res.status(404).json({ 
        success: false, 
        message: 'Post not found' 
      });
    }

    // Check if user already reported this post
    const existingReport = await Report.findOne({
      postId,
      reportedBy: req.user._id
    });

    if (existingReport) {
      return res.status(400).json({ 
        success: false, 
        message: 'You have already reported this post' 
      });
    }

    // Create post snapshot
    const postSnapshot = {
      content: post.content.text,
      media: post.content.media.map(m => ({ url: m.url, type: m.type })),
      category: post.category,
      createdAt: post.createdAt
    };

    // Create report
    const report = await Report.create({
      reportId: uuidv4(),
      postId: post._id,
      reportedBy: req.user._id,
      postOwner: post.author._id,
      reason,
      description,
      postSnapshot,
      status: 'pending'
    });

    // Add report to post
    post.reports.push({
      reporter: req.user._id,
      reason,
      timestamp: new Date()
    });

    // Auto-flag if threshold reached
    const ModerationRule = require('../models/ModerationRule');
    const moderationRule = await ModerationRule.findOne();
    
    if (moderationRule && moderationRule.autoFlagSettings.enabled) {
      if (post.reports.length >= moderationRule.autoFlagSettings.minReports) {
        post.status = 'flagged';
      }
      
      // Auto-remove if threshold reached
      if (post.reports.length >= moderationRule.autoFlagSettings.autoRemoveThreshold) {
        post.status = 'removed';
        post.removedAt = new Date();
      }
    }

    await post.save();

    // Emit socket event to admin panel
    if (global.io) {
      global.io.emit('report:created', { 
        reportId: report._id,
        postId: post._id,
        reason 
      });
    }

    res.json({ 
      success: true, 
      message: 'Report submitted successfully',
      report 
    });
  } catch (error) {
    console.error('Create report error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Get user's reports
router.get('/my-reports', authenticateToken, async (req, res) => {
  try {
    const reports = await Report.find({ reportedBy: req.user._id })
      .populate('postId')
      .sort({ createdAt: -1 });

    res.json({ success: true, reports });
  } catch (error) {
    console.error('Get my reports error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
