const mongoose = require('mongoose');

const moderationRuleSchema = new mongoose.Schema({
  bannedWords: [{
    word: String,
    severity: {
      type: String,
      enum: ['low', 'medium', 'high'],
      default: 'medium'
    }
  }],
  autoHideKeywords: [String],
  autoShadowbanThreshold: {
    type: Number,
    default: 3
  },
  autoFlagSettings: {
    enabled: {
      type: Boolean,
      default: true
    },
    minReports: {
      type: Number,
      default: 3
    },
    autoRemoveThreshold: {
      type: Number,
      default: 10
    }
  },
  spamDetection: {
    enabled: {
      type: Boolean,
      default: true
    },
    maxPostsPerHour: {
      type: Number,
      default: 10
    },
    duplicateContentThreshold: {
      type: Number,
      default: 0.8
    }
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('ModerationRule', moderationRuleSchema);
