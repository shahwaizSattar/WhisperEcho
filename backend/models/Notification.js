const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  actor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    enum: ['reaction', 'comment', 'track'],
    required: true
  },
  post: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Post'
  },
  commentId: {
    type: mongoose.Schema.Types.ObjectId
  },
  reactionType: String,
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  read: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

notificationSchema.index({ user: 1, createdAt: -1 });

const formatNotificationPayload = (notification) => ({
  _id: notification._id,
  type: notification.type,
  read: notification.read,
  createdAt: notification.createdAt,
  user: notification.actor
    ? {
        _id: notification.actor._id,
        username: notification.actor.username,
        avatar: notification.actor.avatar,
      }
    : undefined,
  post: notification.post
    ? {
        _id: notification.post._id,
        content: {
          text: notification.post.content?.text || '',
        },
      }
    : undefined,
  comment: notification.metadata?.commentContent
    ? {
        content: notification.metadata.commentContent,
      }
    : undefined,
  reactionType: notification.reactionType,
});

notificationSchema.post('save', async function (doc) {
  try {
    if (!global.io || !doc?.user) {
      return;
    }

    const populatedNotification = await doc.populate([
      { path: 'actor', select: 'username avatar' },
      { path: 'post', select: 'content' },
    ]);

    const unreadCount = await doc.constructor.countDocuments({
      user: doc.user,
      read: false,
    });

    global.io.to(doc.user.toString()).emit('notification:new', {
      notification: formatNotificationPayload(populatedNotification),
      unreadCount,
    });
  } catch (error) {
    console.error('Notification broadcast error:', error?.message || error);
  }
});

module.exports = mongoose.model('Notification', notificationSchema);
