const mongoose = require('mongoose');

const reportSchema = new mongoose.Schema({
  reportId: {
    type: String,
    required: true,
    unique: true
  },
  postId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Post',
    required: true
  },
  reportedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  postOwner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  reason: {
    type: String,
    required: true,
    enum: [
      'spam',
      'harassment',
      'hate_speech',
      'hate', // Allow both formats
      'violence',
      'sexual_content',
      'misinformation',
      'self_harm',
      'other'
    ]
  },
  description: {
    type: String,
    maxlength: 500
  },
  postSnapshot: {
    content: String,
    media: [{
      url: String,
      type: String
    }],
    category: String,
    createdAt: Date
  },
  status: {
    type: String,
    enum: ['pending', 'resolved', 'rejected'],
    default: 'pending'
  },
  actionTaken: {
    type: String,
    enum: ['none', 'post_removed', 'post_kept', 'user_warned', 'user_shadowbanned'],
    default: 'none'
  },
  adminNotes: {
    type: String,
    maxlength: 1000
  },
  reviewedBy: {
    type: mongoose.Schema.Types.Mixed, // Allow both ObjectId and String for hardcoded admin
    ref: 'User'
  },
  reviewedAt: {
    type: Date
  }
}, {
  timestamps: true
});

// Indexes for better query performance
reportSchema.index({ status: 1, createdAt: -1 });
reportSchema.index({ postId: 1 });
reportSchema.index({ reportedBy: 1 });
reportSchema.index({ postOwner: 1 });

module.exports = mongoose.model('Report', reportSchema);
