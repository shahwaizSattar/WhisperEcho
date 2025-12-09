const mongoose = require('mongoose');

const adminLogSchema = new mongoose.Schema({
  adminId: {
    type: mongoose.Schema.Types.Mixed, // Allow both ObjectId and String for hardcoded admin
    ref: 'User',
    required: true
  },
  actionType: {
    type: String,
    required: true,
    enum: [
      'post_removed',
      'post_restored',
      'user_shadowbanned',
      'user_unshadowbanned',
      'user_warned',
      'report_resolved',
      'report_rejected',
      'moderation_rule_updated',
      'violations_reset'
    ]
  },
  targetPost: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Post'
  },
  targetUser: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  reportId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Report'
  },
  details: {
    type: String,
    maxlength: 1000
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed
  }
}, {
  timestamps: true
});

adminLogSchema.index({ adminId: 1, createdAt: -1 });
adminLogSchema.index({ actionType: 1, createdAt: -1 });

module.exports = mongoose.model('AdminLog', adminLogSchema);
