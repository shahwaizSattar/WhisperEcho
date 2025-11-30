const express = require('express');
const Post = require('../models/Post');
const User = require('../models/User');
const Notification = require('../models/Notification');
const { authenticateToken, optionalAuth } = require('../middleware/auth');
const { body, validationResult } = require('express-validator');
const { moderateContent } = require('../utils/moderationUtils');

const router = express.Router();

// Helper function to get all users that should be blocked (bidirectional)
async function getBidirectionalBlockedUsers(userId) {
  const currentUser = await User.findById(userId);
  if (!currentUser) return [];
  
  // Users that current user has blocked
  const blockedByMe = currentUser.blockedUsers || [];
  
  // Users who have blocked the current user (bidirectional blocking)
  const usersWhoBlockedMe = await User.find({ 
    blockedUsers: userId 
  }).select('_id');
  
  const blockedMeIds = usersWhoBlockedMe.map(u => u._id);
  
  // Combine both lists (users I blocked + users who blocked me)
  const allBlockedUsers = [...blockedByMe, ...blockedMeIds];
  
  return allBlockedUsers;
}

// POST /api/posts - Create a new post
router.post('/', authenticateToken, [
  body('content.text').optional().isLength({ max: 2000 }),
  body('content.media').optional().isArray(),
  body('category').notEmpty().isIn(['Gaming', 'Education', 'Beauty', 'Fitness', 'Music', 'Technology', 
    'Art', 'Food', 'Travel', 'Sports', 'Movies', 'Books', 'Fashion',
    'Photography', 'Comedy', 'Science', 'Politics', 'Business'])
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

    const { content, category, visibility, disguiseAvatar, vanishMode, tags, poll, interactions, oneTime, geoLocation, locationEnabled, locationName, rating } = req.body;
    const userId = req.user._id;

    // Validate that post has either text, media, voice note, or poll
    if (!content.text?.trim() && 
        (!content.media || content.media.length === 0) && 
        !content.voiceNote?.url &&
        !poll?.enabled) {
      return res.status(400).json({
        success: false,
        message: 'Post must have either text content, media, voice note, or poll'
      });
    }

    // Moderate content with ML-based classification
    const moderatedContent = { ...content };
    if (content.text) {
      const modResult = moderateContent(content.text);
      
      // Block post if severity is BLOCK
      if (modResult.shouldBlock) {
        return res.status(403).json({
          success: false,
          message: 'Content violates community guidelines and cannot be posted',
          moderation: {
            severity: modResult.severity,
            reason: modResult.reason
          }
        });
      }
      
      moderatedContent.isFlagged = modResult.isFlagged;
      moderatedContent.moderation = {
        severity: modResult.severity,
        scores: modResult.scores,
        reason: modResult.reason,
        checkedAt: new Date()
      };
    }

    const postData = {
      author: userId,
      content: moderatedContent,
      category,
      visibility: visibility || 'normal',
      disguiseAvatar: visibility === 'disguise' ? disguiseAvatar : null,
      vanishMode: vanishMode || { enabled: false },
      tags: tags || [],
      poll: poll || { enabled: false },
      interactions: interactions || { commentsLocked: false, reactionsLocked: false },
      oneTime: oneTime || { enabled: false, viewedBy: [] }
    };

    // Add location data if provided
    if (locationEnabled && geoLocation && geoLocation.coordinates && geoLocation.coordinates.length === 2) {
      postData.geoLocation = geoLocation;
      postData.locationEnabled = true;
      if (locationName) {
        postData.locationName = locationName;
        console.log('📌 Saving locationName:', locationName);
      }
    }

    // Add rating if provided (for review posts)
    if (rating && rating >= 1 && rating <= 5) {
      postData.rating = rating;
      console.log('⭐ Saving rating:', rating);
    }

    const post = new Post(postData);

    console.log('💾 Saving post with data:', JSON.stringify({
      locationEnabled: postData.locationEnabled,
      locationName: postData.locationName,
      rating: postData.rating,
      hasGeoLocation: !!postData.geoLocation
    }, null, 2));
    
    await post.save();
    console.log('✅ Post saved with ID:', post._id);
    console.log('✅ Saved post locationName:', post.locationName);
    console.log('✅ Saved post rating:', post.rating);

    // Update user stats
    await User.findByIdAndUpdate(userId, {
      $inc: { 'stats.postsCount': 1 }
    });

    // Update user streak
    const user = await User.findById(userId);
    const today = new Date();
    const lastPost = user.streaks.lastPostDate ? new Date(user.streaks.lastPostDate) : null;
    
    if (!lastPost || lastPost.toDateString() !== today.toDateString()) {
      const daysSinceLastPost = lastPost ? Math.floor((today - lastPost) / (1000 * 60 * 60 * 24)) : 0;
      
      if (daysSinceLastPost === 1) {
        user.streaks.currentStreak += 1;
        if (user.streaks.currentStreak > user.streaks.longestStreak) {
          user.streaks.longestStreak = user.streaks.currentStreak;
        }
      } else if (daysSinceLastPost > 1) {
        user.streaks.currentStreak = 1;
      } else if (!lastPost) {
        user.streaks.currentStreak = 1;
      }
      
      user.streaks.lastPostDate = today;
      await user.save();
    }

    // Populate author info for response
    await post.populate('author', 'username avatar');

    res.status(201).json({
      success: true,
      message: 'Post created successfully',
      post
    });

  } catch (error) {
    console.error('Create post error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// GET /api/posts/feed - Get user's personalized feed
router.get('/feed', authenticateToken, async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;
    const userId = req.user._id;

    // Get current user to access muted/blocked lists
    const currentUser = await User.findById(userId);
    const mutedUsers = currentUser.mutedUsers || [];
    const hiddenPosts = currentUser.hiddenPosts || [];
    
    // Get bidirectional blocked users (users I blocked + users who blocked me)
    const blockedUsers = await getBidirectionalBlockedUsers(userId);

    // Build dynamic source filters
    const followingIds = Array.isArray(req.user.following) ? req.user.following : [];
    const userPrefs = Array.isArray(req.user.preferences) ? req.user.preferences : [];

    const sourceFilters = [];
    // Include user's own posts
    sourceFilters.push({ author: userId });
    if (followingIds.length > 0) sourceFilters.push({ author: { $in: followingIds } });
    if (userPrefs.length > 0) sourceFilters.push({ category: { $in: userPrefs } });

    const baseVisibilityFilters = {
      isHidden: false,
      _id: { $nin: hiddenPosts }, // Exclude hidden posts
      author: { $nin: [...mutedUsers, ...blockedUsers] }, // Exclude muted and blocked users
      locationEnabled: { $ne: true }, // Exclude City Radar posts from home feed
      $or: [
        { 'vanishMode.enabled': false },
        { 'vanishMode.vanishAt': { $gt: new Date() } }
      ],
      // Exclude one-time posts that have been viewed by this user
      $nor: [
        { 'oneTime.enabled': true, 'oneTime.viewedBy': userId }
      ]
    };

    const query = sourceFilters.length > 0
      ? { $and: [ { $or: sourceFilters }, baseVisibilityFilters ] }
      : baseVisibilityFilters; // if no sources, show recent visible posts

    // Get regular posts only (WhisperWall posts are separate)
    let posts = await Post.find(query)
    .populate('author', 'username avatar')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(parseInt(limit));

    console.log('📥 Retrieved posts:', posts.length); // Debug log

    // Fallback: if no matches for preferences/following, show recent visible posts
    if (posts.length === 0 && (userPrefs.length > 0 || followingIds.length > 0)) {
      posts = await Post.find(baseVisibilityFilters)
        .populate('author', 'username avatar')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit));
    }

    // Calculate if user has reacted to each post and mark if outside preferences
    const postsWithUserReactions = posts.map(post => {
      const userReaction = Object.keys(post.reactions).find(reactionType => 
        post.reactions[reactionType].some(r => r.user.equals(userId))
      );
      
      // Check if post category is outside user's preferences
      const isOutsidePreferences = post.category && 
        userPrefs.length > 0 && 
        !userPrefs.includes(post.category) &&
        !post.author.equals(userId);
      
      return {
        ...post.toObject(),
        userReaction: userReaction || null,
        userHasReacted: !!userReaction,
        isOutsidePreferences
      };
    });

    res.json({
      success: true,
      posts: postsWithUserReactions,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        hasMore: postsWithUserReactions.length === parseInt(limit)
      }
    });

  } catch (error) {
    console.error('Get feed error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// GET /api/posts/search - Search posts (searches entire database, excludes blocked users)
router.get('/search', optionalAuth, async (req, res) => {
  try {
    const { q, category, page = 1, limit = 20 } = req.query;
    
    if (!q || q.length < 1) {
      return res.status(400).json({
        success: false,
        message: 'Search query must be at least 1 character'
      });
    }

    const skip = (page - 1) * limit;
    
    const searchQuery = {
      $and: [
        {
          $or: [
            { 'content.text': { $regex: q, $options: 'i' } },
            { category: { $regex: q, $options: 'i' } },
            { tags: { $regex: q, $options: 'i' } }
          ]
        },
        {
          isHidden: false,
          $or: [
            { 'vanishMode.enabled': false },
            { 'vanishMode.vanishAt': { $gt: new Date() } }
          ]
        }
      ]
    };

    if (category) {
      searchQuery.$and[0].category = category;
    }

    // Exclude blocked users (bidirectional) if authenticated
    if (req.user) {
      const currentUser = await User.findById(req.user._id);
      const mutedUsers = currentUser.mutedUsers || [];
      const blockedUsers = await getBidirectionalBlockedUsers(req.user._id);
      
      console.log(`🔍 Post search: query="${q}", blocked count=${blockedUsers.length}, muted count=${mutedUsers.length}`);
      
      searchQuery.$and.push({
        author: { $nin: [...mutedUsers, ...blockedUsers] }
      });
    }

    const posts = await Post.find(searchQuery)
      .populate('author', 'username avatar')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    console.log(`🔍 Post search results: found ${posts.length} posts`);

    // Add user reaction info if authenticated
    let postsWithUserReactions = posts;
    if (req.user) {
      postsWithUserReactions = posts.map(post => {
        const userReaction = Object.keys(post.reactions).find(reactionType => 
          post.reactions[reactionType].some(r => r.user.equals(req.user._id))
        );
        
        return {
          ...post.toObject(),
          userReaction: userReaction || null,
          userHasReacted: !!userReaction
        };
      });
    }

    res.json({
      success: true,
      posts: postsWithUserReactions,
      data: postsWithUserReactions, // Add data field for consistency
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        hasMore: posts.length === parseInt(limit)
      }
    });

  } catch (error) {
    console.error('Search posts error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// GET /api/posts/explore - Get trending and explore posts
router.get('/explore', optionalAuth, async (req, res) => {
  try {
    const { page = 1, limit = 20, category, filter = 'trending' } = req.query;
    const skip = (page - 1) * limit;

    let sortCriteria = {};
    let matchCriteria = {
      isHidden: false,
      locationEnabled: { $ne: true }, // Exclude City Radar posts from explore
      $or: [
        { 'vanishMode.enabled': false },
        { 'vanishMode.vanishAt': { $gt: new Date() } }
      ]
    };

    if (category) {
      matchCriteria.category = category;
    }

    // Exclude blocked users (bidirectional) if authenticated
    if (req.user) {
      const currentUser = await User.findById(req.user._id);
      const mutedUsers = currentUser.mutedUsers || [];
      const blockedUsers = await getBidirectionalBlockedUsers(req.user._id);
      
      matchCriteria.author = { $nin: [...mutedUsers, ...blockedUsers] };
    }

    switch (filter) {
      case 'trending':
        sortCriteria = { 'trending.score': -1, createdAt: -1 };
        break;
      case 'recent':
        sortCriteria = { createdAt: -1 };
        break;
      case 'popular':
        sortCriteria = { 'reactionCounts.total': -1, createdAt: -1 };
        break;
      default:
        sortCriteria = { 'trending.score': -1, createdAt: -1 };
    }

    const posts = await Post.find(matchCriteria)
      .populate('author', 'username avatar')
      .sort(sortCriteria)
      .skip(skip)
      .limit(parseInt(limit));

    // Add user reaction info if authenticated
    let postsWithUserReactions = posts;
    if (req.user) {
      postsWithUserReactions = posts.map(post => {
        const userReaction = Object.keys(post.reactions).find(reactionType => 
          post.reactions[reactionType].some(r => r.user.equals(req.user._id))
        );
        
        return {
          ...post.toObject(),
          userReaction: userReaction || null,
          userHasReacted: !!userReaction
        };
      });
    }

    res.json({
      success: true,
      posts: postsWithUserReactions,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        hasMore: posts.length === parseInt(limit)
      }
    });

  } catch (error) {
    console.error('Get explore posts error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// GET /api/posts/:postId - Get single post
router.get('/:postId', optionalAuth, async (req, res) => {
  try {
    const { postId } = req.params;

    const post = await Post.findById(postId)
      .populate('author', 'username avatar')
      .populate('comments.author', 'username avatar');

    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found'
      });
    }

    // Check if post has vanished
    if (post.vanishMode.enabled && post.vanishMode.vanishAt < new Date()) {
      return res.status(404).json({
        success: false,
        message: 'Post has vanished'
      });
    }

    // Add user reaction info if authenticated
    let postData = post.toObject();
    if (req.user) {
      const userReaction = Object.keys(post.reactions).find(reactionType => 
        post.reactions[reactionType].some(r => r.user.equals(req.user._id))
      );
      
      postData.userReaction = userReaction || null;
      postData.userHasReacted = !!userReaction;
    }

    res.json({
      success: true,
      post: postData
    });

  } catch (error) {
    console.error('Get post error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// POST /api/posts/:postId/comments - Add comment to post
router.post('/:postId/comments', authenticateToken, [
  body('content').notEmpty().isLength({ max: 500 })
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

    const { postId } = req.params;
    const { content, isAnonymous } = req.body;
    const userId = req.user._id;

    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found'
      });
    }

    // Check if comments are locked
    if (post.interactions?.commentsLocked) {
      return res.status(403).json({
        success: false,
        message: 'Comments are locked on this post'
      });
    }

    // Moderate comment content
    const modResult = moderateContent(content);
    
    const comment = {
      author: userId,
      content,
      isFlagged: modResult.isFlagged,
      isAnonymous: isAnonymous || false,
      createdAt: new Date(),
      reactions: { funny: [], love: [] }
    };

    post.comments.push(comment);
    await post.save();
    await post.calculateTrendingScore();

    // Populate the new comment
    await post.populate('comments.author', 'username avatar');
    const newComment = post.comments[post.comments.length - 1];

    if (!post.author.equals(userId)) {
      const postAuthor = await User.findById(post.author);

      if (postAuthor?.settings?.notifications?.comments !== false) {
        try {
          await Notification.create({
            user: post.author,
            actor: userId,
            type: 'comment',
            post: post._id,
            commentId: newComment._id,
            metadata: {
              commentContent: content.slice(0, 140)
            }
          });
        } catch (notifyError) {
          console.error('Create comment notification error:', notifyError);
        }
      }
    }

    res.status(201).json({
      success: true,
      message: 'Comment added successfully',
      comment: newComment
    });

  } catch (error) {
    console.error('Add comment error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// POST /api/posts/:postId/comments/:commentId/replies - Add reply to comment
router.post('/:postId/comments/:commentId/replies', authenticateToken, [
  body('content').notEmpty().isLength({ max: 500 })
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

    const { postId, commentId } = req.params;
    const { content } = req.body;
    const userId = req.user._id;

    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found'
      });
    }

    // Check if comments are locked
    if (post.interactions?.commentsLocked) {
      return res.status(403).json({
        success: false,
        message: 'Comments are locked on this post'
      });
    }

    const comment = post.comments.id(commentId);
    if (!comment) {
      return res.status(404).json({
        success: false,
        message: 'Comment not found'
      });
    }

    // Moderate reply content
    const modResult = moderateContent(content);
    
    const reply = {
      author: userId,
      content,
      createdAt: new Date(),
      reactions: { funny: [], love: [] },
      reactionCounts: { funny: 0, love: 0, total: 0 }
    };

    comment.replies = comment.replies || [];
    comment.replies.push(reply);
    await post.save();

    // Populate the new reply
    await post.populate('comments.replies.author', 'username avatar');
    const newReply = comment.replies[comment.replies.length - 1];

    // Notify comment author
    if (!comment.author.equals(userId)) {
      const commentAuthor = await User.findById(comment.author);

      if (commentAuthor?.settings?.notifications?.comments !== false) {
        try {
          await Notification.create({
            user: comment.author,
            actor: userId,
            type: 'reply',
            post: post._id,
            commentId: comment._id,
            metadata: {
              replyContent: content.slice(0, 140)
            }
          });
        } catch (notifyError) {
          console.error('Create reply notification error:', notifyError);
        }
      }
    }

    res.status(201).json({
      success: true,
      message: 'Reply added successfully',
      reply: newReply
    });

  } catch (error) {
    console.error('Add reply error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// GET /api/posts/:postId/comments/:commentId/replies - Get replies for a comment
router.get('/:postId/comments/:commentId/replies', authenticateToken, async (req, res) => {
  try {
    const { postId, commentId } = req.params;
    const userId = req.user._id;

    const post = await Post.findById(postId).populate('comments.replies.author', 'username avatar');
    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found'
      });
    }

    const comment = post.comments.id(commentId);
    if (!comment) {
      return res.status(404).json({
        success: false,
        message: 'Comment not found'
      });
    }

    // Add userReaction to each reply
    const repliesWithUserReaction = (comment.replies || []).map(reply => {
      let userReaction = null;
      if (reply.reactions.funny.some(r => r.user.equals(userId))) {
        userReaction = 'funny';
      } else if (reply.reactions.love.some(r => r.user.equals(userId))) {
        userReaction = 'love';
      }

      return {
        ...reply.toObject(),
        userReaction,
        reactionCounts: reply.reactionCounts || {
          funny: reply.reactions.funny.length,
          love: reply.reactions.love.length,
          total: reply.reactions.funny.length + reply.reactions.love.length
        }
      };
    });

    res.json({
      success: true,
      replies: repliesWithUserReaction
    });

  } catch (error) {
    console.error('Get replies error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// PUT /api/posts/:postId - Edit post
router.put('/:postId', authenticateToken, [
  body('content.text').optional().isLength({ max: 2000 }),
  body('content.media').optional().isArray(),
  body('category').optional().isIn(['Gaming', 'Education', 'Beauty', 'Fitness', 'Music', 'Technology', 
    'Art', 'Food', 'Travel', 'Sports', 'Movies', 'Books', 'Fashion',
    'Photography', 'Comedy', 'Science', 'Politics', 'Business'])
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

    const { postId } = req.params;
    const userId = req.user._id;
    const { content, category, tags } = req.body;

    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found'
      });
    }

    // Check if user owns the post
    if (!post.author.equals(userId)) {
      return res.status(403).json({
        success: false,
        message: 'You can only edit your own posts'
      });
    }

    // Update post fields
    if (content) {
      if (content.text !== undefined) post.content.text = content.text;
      if (content.media !== undefined) post.content.media = content.media;
    }
    
    if (category) post.category = category;
    if (tags) post.tags = tags;

    await post.save();
    await post.populate('author', 'username avatar');

    res.json({
      success: true,
      message: 'Post updated successfully',
      post
    });

  } catch (error) {
    console.error('Edit post error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// DELETE /api/posts/:postId - Delete post
router.delete('/:postId', authenticateToken, async (req, res) => {
  try {
    const { postId } = req.params;
    const userId = req.user._id;

    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found'
      });
    }

    // Check if user owns the post
    if (!post.author.equals(userId)) {
      return res.status(403).json({
        success: false,
        message: 'You can only delete your own posts'
      });
    }

    await Post.findByIdAndDelete(postId);

    // Update user stats
    await User.findByIdAndUpdate(userId, {
      $inc: { 'stats.postsCount': -1 }
    });

    res.json({
      success: true,
      message: 'Post deleted successfully'
    });

  } catch (error) {
    console.error('Delete post error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// GET /api/posts/user/:username - Get user's posts
router.get('/user/:username', optionalAuth, async (req, res) => {
  try {
    const { username } = req.params;
    const { page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;
    const viewerId = req.user?._id; // Current viewer's ID (if authenticated)

    const user = await User.findOne({ username });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Build query - if viewer is the post author, show all posts
    // If viewer is someone else, exclude one-time posts they've already viewed
    const query = {
      author: user._id,
      isHidden: false,
      $or: [
        { 'vanishMode.enabled': false },
        { 'vanishMode.vanishAt': { $gt: new Date() } }
      ]
    };

    // If viewer is NOT the post author, exclude one-time posts they've viewed
    if (viewerId && !viewerId.equals(user._id)) {
      query.$nor = [
        { 'oneTime.enabled': true, 'oneTime.viewedBy': viewerId }
      ];
    }

    const posts = await Post.find(query)
    .populate('author', 'username avatar')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(parseInt(limit));

    res.json({
      success: true,
      posts,
      user: {
        username: user.username,
        avatar: user.avatar,
        bio: user.bio,
        stats: user.stats,
        preferences: user.preferences
      },
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        hasMore: posts.length === parseInt(limit)
      }
    });

  } catch (error) {
    console.error('Get user posts error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// POST /api/posts/:postId/hide - Hide a post
router.post('/:postId/hide', authenticateToken, async (req, res) => {
  try {
    const { postId } = req.params;
    const userId = req.user._id;

    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found'
      });
    }

    const user = await User.findById(userId);
    
    if (user.hiddenPosts.includes(postId)) {
      return res.status(400).json({
        success: false,
        message: 'Post already hidden'
      });
    }

    user.hiddenPosts.push(postId);
    await user.save();

    res.json({
      success: true,
      message: 'Post hidden successfully',
      hiddenPostId: postId
    });

  } catch (error) {
    console.error('Hide post error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// DELETE /api/posts/:postId/hide - Unhide a post
router.delete('/:postId/hide', authenticateToken, async (req, res) => {
  try {
    const { postId } = req.params;
    const userId = req.user._id;

    const user = await User.findById(userId);
    
    if (!user.hiddenPosts.includes(postId)) {
      return res.status(400).json({
        success: false,
        message: 'Post is not hidden'
      });
    }

    user.hiddenPosts = user.hiddenPosts.filter(id => id.toString() !== postId);
    await user.save();

    res.json({
      success: true,
      message: 'Post unhidden successfully'
    });

  } catch (error) {
    console.error('Unhide post error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// POST /api/posts/:postId/report - Report a post
router.post('/:postId/report', authenticateToken, [
  body('reason').notEmpty().withMessage('Report reason is required')
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

    const { postId } = req.params;
    const { reason } = req.body;
    const userId = req.user._id;

    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found'
      });
    }

    // In a real app, you'd store this in a Reports collection
    console.log(`Post ${postId} reported by user ${userId} for reason: ${reason}`);

    res.json({
      success: true,
      message: 'Report submitted successfully'
    });

  } catch (error) {
    console.error('Report post error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// POST /api/posts/:postId/poll/vote - Vote on a poll
router.post('/:postId/poll/vote', authenticateToken, [
  body('optionIndex').isInt({ min: 0 }).withMessage('Valid option index required')
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

    const { postId } = req.params;
    const { optionIndex } = req.body;
    const userId = req.user._id;

    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found'
      });
    }

    if (!post.poll.enabled) {
      return res.status(400).json({
        success: false,
        message: 'This post does not have a poll'
      });
    }

    if (optionIndex >= post.poll.options.length) {
      return res.status(400).json({
        success: false,
        message: 'Invalid option index'
      });
    }

    // Check if user already voted
    const hasVoted = post.poll.options.some(option => 
      option.votes.some(vote => vote.equals(userId))
    );

    if (hasVoted) {
      // Remove previous vote
      post.poll.options.forEach(option => {
        const voteIndex = option.votes.findIndex(vote => vote.equals(userId));
        if (voteIndex !== -1) {
          option.votes.splice(voteIndex, 1);
          option.voteCount = option.votes.length;
        }
      });
      post.poll.totalVotes -= 1;
    }

    // Add new vote
    post.poll.options[optionIndex].votes.push(userId);
    post.poll.options[optionIndex].voteCount = post.poll.options[optionIndex].votes.length;
    post.poll.totalVotes += 1;

    await post.save();

    res.json({
      success: true,
      message: 'Vote recorded successfully',
      poll: {
        options: post.poll.options.map(opt => ({
          text: opt.text,
          emoji: opt.emoji,
          voteCount: opt.voteCount,
          hasVoted: opt.votes.some(vote => vote.equals(userId))
        })),
        totalVotes: post.poll.totalVotes,
        userHasVoted: true
      }
    });

  } catch (error) {
    console.error('Vote on poll error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// POST /api/posts/:postId/lock - Lock/unlock comments or reactions
router.post('/:postId/lock', authenticateToken, [
  body('lockType').isIn(['comments', 'reactions', 'both']).withMessage('Valid lock type required'),
  body('locked').isBoolean().withMessage('Locked status required')
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

    const { postId } = req.params;
    const { lockType, locked } = req.body;
    const userId = req.user._id;

    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found'
      });
    }

    // Check if user owns the post
    if (!post.author.equals(userId)) {
      return res.status(403).json({
        success: false,
        message: 'You can only lock your own posts'
      });
    }

    if (lockType === 'comments' || lockType === 'both') {
      post.interactions.commentsLocked = locked;
    }
    if (lockType === 'reactions' || lockType === 'both') {
      post.interactions.reactionsLocked = locked;
    }

    await post.save();

    res.json({
      success: true,
      message: `${lockType} ${locked ? 'locked' : 'unlocked'} successfully`,
      interactions: post.interactions
    });

  } catch (error) {
    console.error('Lock post error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// POST /api/posts/:postId/mark-viewed - Mark one-time post as viewed
router.post('/:postId/mark-viewed', authenticateToken, async (req, res) => {
  try {
    const { postId } = req.params;
    const userId = req.user._id;

    const post = await Post.findById(postId);
    
    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found'
      });
    }

    // Check if it's a one-time post
    if (!post.oneTime?.enabled) {
      return res.status(400).json({
        success: false,
        message: 'This is not a one-time post'
      });
    }

    // Check if already viewed
    if (post.oneTime.viewedBy.includes(userId)) {
      return res.status(200).json({
        success: true,
        message: 'Already marked as viewed'
      });
    }

    // Add user to viewedBy array
    post.oneTime.viewedBy.push(userId);
    await post.save();

    res.json({
      success: true,
      message: 'Post marked as viewed'
    });

  } catch (error) {
    console.error('Mark viewed error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

module.exports = router;
