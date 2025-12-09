const mongoose = require('mongoose');

const postSchema = new mongoose.Schema({
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  content: {
    text: {
      type: String,
      required: false,
      maxlength: 2000,
      default: ''
    },
    isFlagged: {
      type: Boolean,
      default: false
    },
    moderation: {
      severity: {
        type: String,
        enum: ['SAFE', 'BLUR', 'WARNING', 'BLOCK'],
        default: 'SAFE'
      },
      scores: {
        hateSpeech: { type: Number, default: 0 },
        harassment: { type: Number, default: 0 },
        threats: { type: Number, default: 0 },
        sexual: { type: Number, default: 0 },
        selfHarm: { type: Number, default: 0 },
        extremism: { type: Number, default: 0 },
        profanity: { type: Number, default: 0 }
      },
      reason: String,
      checkedAt: Date
    },
    image: {
      type: String,
      default: null
    },
    voiceNote: {
      url: {
        type: String,
        default: null
      },
      effect: {
        type: String,
        enum: ['none', 'deep', 'robot', 'soft', 'glitchy', 'girly', 'boyish', null],
        default: 'none'
      },
      duration: {
        type: Number,
        default: 0
      }
    },
    media: [{
      url: {
        type: String,
        required: true
      },
      type: {
        type: String,
        required: true,
        enum: ['image', 'video', 'audio']
      },
      filename: {
        type: String,
        required: true
      },
      originalName: {
        type: String,
        required: true
      },
      size: {
        type: Number,
        required: true
      }
    }]
  },
  category: {
    type: String,
    required: true,
    enum: ['Gaming', 'Education', 'Beauty', 'Fitness', 'Music', 'Technology', 
           'Art', 'Food', 'Travel', 'Sports', 'Movies', 'Books', 'Fashion',
           'Photography', 'Comedy', 'Science', 'Politics', 'Business']
  },
  visibility: {
    type: String,
    enum: ['normal', 'disguise'],
    default: 'normal'
  },
  disguiseAvatar: {
    type: String,
    default: null
  },
  reactions: {
    funny: [{ user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, timestamp: Date }],
    rage: [{ user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, timestamp: Date }],
    shock: [{ user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, timestamp: Date }],
    relatable: [{ user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, timestamp: Date }],
    love: [{ user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, timestamp: Date }],
    thinking: [{ user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, timestamp: Date }]
  },
  reactionCounts: {
    funny: { type: Number, default: 0 },
    rage: { type: Number, default: 0 },
    shock: { type: Number, default: 0 },
    relatable: { type: Number, default: 0 },
    love: { type: Number, default: 0 },
    thinking: { type: Number, default: 0 },
    total: { type: Number, default: 0 }
  },
  comments: [{
    author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    content: { type: String, required: true, maxlength: 500 },
    isFlagged: { type: Boolean, default: false },
    isAnonymous: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now },
    reactions: {
      funny: [{ user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, timestamp: Date }],
      love: [{ user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, timestamp: Date }]
    },
    reactionCounts: {
      funny: { type: Number, default: 0 },
      love: { type: Number, default: 0 },
      total: { type: Number, default: 0 }
    },
    replies: [{
      author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
      content: { type: String, required: true, maxlength: 500 },
      createdAt: { type: Date, default: Date.now },
      reactions: {
        funny: [{ user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, timestamp: Date }],
        love: [{ user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, timestamp: Date }]
      },
      reactionCounts: {
        funny: { type: Number, default: 0 },
        love: { type: Number, default: 0 },
        total: { type: Number, default: 0 }
      }
    }]
  }],
  vanishMode: {
    enabled: { type: Boolean, default: false },
    duration: {
      type: String,
      enum: ['1hour', '6hours', '12hours', '24hours', '1day', '1week', 'custom'],
      default: '1day'
    },
    customMinutes: { type: Number, min: 1, max: 10080 }, // Max 1 week in minutes
    vanishAt: Date
  },
  poll: {
    enabled: { type: Boolean, default: false },
    type: {
      type: String,
      enum: ['yesno', 'emoji', 'multi'],
      default: 'yesno'
    },
    question: { type: String, maxlength: 200 },
    options: [{
      text: { type: String, maxlength: 100 },
      emoji: String,
      votes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
      voteCount: { type: Number, default: 0 }
    }],
    revealAfterVote: { type: Boolean, default: false },
    totalVotes: { type: Number, default: 0 },
    isAnonymous: { type: Boolean, default: true }
  },
  interactions: {
    commentsLocked: { type: Boolean, default: false },
    reactionsLocked: { type: Boolean, default: false }
  },
  oneTime: {
    enabled: { type: Boolean, default: false },
    viewedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }]
  },
  trending: {
    score: { type: Number, default: 0 },
    lastCalculated: { type: Date, default: Date.now }
  },
  tags: [String],
  location: {
    city: String,
    country: String,
    emoji: String
  },
  // Geospatial location for City Radar feature
  geoLocation: {
    type: {
      type: String,
      enum: ['Point']
    },
    coordinates: [Number] // [longitude, latitude]
  },
  locationEnabled: {
    type: Boolean,
    default: false
  },
  locationName: {
    type: String,
    default: null
  },
  rating: {
    type: Number,
    min: 1,
    max: 5,
    default: null
  },
  isAIGenerated: {
    image: { type: Boolean, default: false }
  },
  reports: [{
    reporter: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    reason: String,
    timestamp: { type: Date, default: Date.now }
  }],
  isHidden: { type: Boolean, default: false },
  moderationFlags: {
    isReviewed: { type: Boolean, default: false },
    flaggedFor: [String],
    aiConfidence: Number
  },
  status: {
    type: String,
    enum: ['active', 'removed', 'flagged'],
    default: 'active'
  },
  violationCount: {
    type: Number,
    default: 0
  },
  removedBy: {
    type: mongoose.Schema.Types.Mixed, // Allow both ObjectId and String for hardcoded admin
    ref: 'User'
  },
  removedAt: {
    type: Date
  }
}, {
  timestamps: true
});

// Index for better query performance
postSchema.index({ author: 1, createdAt: -1 });
postSchema.index({ category: 1, createdAt: -1 });
postSchema.index({ 'trending.score': -1 });
postSchema.index({ 'vanishMode.vanishAt': 1 });
postSchema.index({ geoLocation: '2dsphere' }); // Geospatial index for location queries

// Calculate trending score
postSchema.methods.calculateTrendingScore = function() {
  const now = new Date();
  const ageInHours = (now - this.createdAt) / (1000 * 60 * 60);
  const reactionWeight = this.reactionCounts.total * 2;
  const commentWeight = this.comments.length * 3;
  const timeDecay = Math.pow(0.9, ageInHours); // Decay over time
  
  this.trending.score = (reactionWeight + commentWeight) * timeDecay;
  this.trending.lastCalculated = now;
  return this.save();
};

postSchema.methods.addReaction = async function(userId, reactionType) {
  Object.keys(this.reactions).forEach(type => {
    this.reactions[type] = this.reactions[type].filter(r => !r.user.equals(userId));
  });
  
  this.reactions[reactionType].push({
    user: userId,
    timestamp: new Date()
  });
  
  this.reactionCounts.funny = this.reactions.funny.length;
  this.reactionCounts.rage = this.reactions.rage.length;
  this.reactionCounts.shock = this.reactions.shock.length;
  this.reactionCounts.relatable = this.reactions.relatable.length;
  this.reactionCounts.love = this.reactions.love.length;
  this.reactionCounts.thinking = this.reactions.thinking.length;
  this.reactionCounts.total = this.reactions.funny.length + this.reactions.rage.length + 
                               this.reactions.shock.length + this.reactions.relatable.length + 
                               this.reactions.love.length + this.reactions.thinking.length;
  
  this.markModified('reactionCounts');
  
  await this.calculateTrendingScore();
  return this.save();
};

postSchema.methods.removeReaction = async function(userId) {
  Object.keys(this.reactions).forEach(type => {
    this.reactions[type] = this.reactions[type].filter(r => !r.user.equals(userId));
  });
  
  this.reactionCounts.funny = this.reactions.funny.length;
  this.reactionCounts.rage = this.reactions.rage.length;
  this.reactionCounts.shock = this.reactions.shock.length;
  this.reactionCounts.relatable = this.reactions.relatable.length;
  this.reactionCounts.love = this.reactions.love.length;
  this.reactionCounts.thinking = this.reactions.thinking.length;
  this.reactionCounts.total = this.reactions.funny.length + this.reactions.rage.length + 
                               this.reactions.shock.length + this.reactions.relatable.length + 
                               this.reactions.love.length + this.reactions.thinking.length;
  
  this.markModified('reactionCounts');
  
  await this.calculateTrendingScore();
  return this.save();
};

// Auto-delete vanish mode posts
postSchema.pre('save', function(next) {
  if (this.vanishMode.enabled && !this.vanishMode.vanishAt) {
    const durations = {
      '1hour': 60 * 60 * 1000,
      '6hours': 6 * 60 * 60 * 1000,
      '12hours': 12 * 60 * 60 * 1000,
      '24hours': 24 * 60 * 60 * 1000,
      '1day': 24 * 60 * 60 * 1000,
      '1week': 7 * 24 * 60 * 60 * 1000,
      'custom': (this.vanishMode.customMinutes || 60) * 60 * 1000
    };
    this.vanishMode.vanishAt = new Date(Date.now() + durations[this.vanishMode.duration]);
  }
  next();
});

module.exports = mongoose.model('Post', postSchema);
