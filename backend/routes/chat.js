const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const Conversation = require('../models/Conversation');
const User = require('../models/User');

const router = express.Router();

// GET /api/chat/conversations - list user's conversations
router.get('/conversations', authenticateToken, async (req, res) => {
  try {
    const userId = req.user._id;
    const convos = await Conversation.find({ participants: userId })
      .sort({ lastMessageAt: -1 })
      .populate('participants', 'username avatar')
      .select('participants lastMessageAt messages')
      .limit(50);

    const data = convos.map(c => ({
      _id: c._id,
      participants: c.participants,
      lastMessageAt: c.lastMessageAt,
      lastMessage: c.messages?.length ? c.messages[c.messages.length - 1] : null,
    }));

    res.json({ success: true, conversations: data });
  } catch (e) {
    console.error('List conversations error:', e);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /api/chat/messages/:peerId?page=1&limit=30 - fetch messages with a peer
router.get('/messages/:peerId', authenticateToken, async (req, res) => {
  try {
    const userId = req.user._id;
    const { peerId } = req.params;
    const { page = 1, limit = 30 } = req.query;
    const skip = (page - 1) * limit;

    const peer = await User.findById(peerId);
    if (!peer) return res.status(404).json({ success: false, message: 'User not found' });

    const convo = await Conversation.getOrCreateBetween(userId, peerId);
    const total = convo.messages.length;
    const start = Math.max(0, total - skip - parseInt(limit));
    const end = Math.max(0, total - skip);
    const pageItems = convo.messages.slice(start, end);

    res.json({
      success: true,
      messages: pageItems.reverse(), // newest last on client, we invert later
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        hasMore: start > 0,
      },
    });
  } catch (e) {
    console.error('Get messages error:', e);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// POST /api/chat/messages/:peerId - send message
router.post('/messages/:peerId', authenticateToken, async (req, res) => {
  try {
    const userId = req.user._id;
    const { peerId } = req.params;
    const { text, media } = req.body || {};
    
    // Validate: must have either text or media
    if ((!text || typeof text !== 'string' || !text.trim()) && (!media || !Array.isArray(media) || media.length === 0)) {
      return res.status(400).json({ success: false, message: 'Text or media is required' });
    }

    const peer = await User.findById(peerId);
    if (!peer) return res.status(404).json({ success: false, message: 'User not found' });

    const convo = await Conversation.getOrCreateBetween(userId, peerId);
    const message = { 
      sender: userId, 
      text: text ? text.trim() : '', 
      media: media || [],
      createdAt: new Date(), 
      readBy: [userId] 
    };
    convo.messages.push(message);
    convo.lastMessageAt = new Date();
    await convo.save();

    // Emit via socket.io including minimal sender info for rich previews
    try {
      const { io } = require('../server');
      const senderUser = await User.findById(userId).select('username avatar');
      const savedMsg = convo.messages[convo.messages.length - 1];
      io.to(String(peerId)).emit('chat:new-message', {
        conversationId: convo._id,
        message: { _id: savedMsg._id, text: savedMsg.text, media: savedMsg.media, createdAt: savedMsg.createdAt, readBy: savedMsg.readBy },
        sender: senderUser ? { _id: senderUser._id, username: senderUser.username, avatar: senderUser.avatar } : { _id: userId },
      });
    } catch (e) {}

    const savedMsg = convo.messages[convo.messages.length - 1];
    res.status(201).json({ success: true, message: 'Message sent', data: { conversationId: convo._id, message: { _id: savedMsg._id, text: savedMsg.text, media: savedMsg.media, createdAt: savedMsg.createdAt, readBy: savedMsg.readBy } } });
  } catch (e) {
    console.error('Send message error:', e);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// PATCH /api/chat/messages/:peerId/:messageId - edit a message sent by user
router.patch('/messages/:peerId/:messageId', authenticateToken, async (req, res) => {
  try {
    const userId = req.user._id;
    const { peerId, messageId } = req.params;
    const { text } = req.body || {};
    if (!text || typeof text !== 'string' || !text.trim()) {
      return res.status(400).json({ success: false, message: 'Text is required' });
    }
    const convo = await Conversation.getOrCreateBetween(userId, peerId);
    const msg = convo.messages.id(messageId);
    if (!msg) return res.status(404).json({ success: false, message: 'Message not found' });
    if (String(msg.sender) !== String(userId)) return res.status(403).json({ success: false, message: 'Not allowed' });
    if (msg.deleted) return res.status(400).json({ success: false, message: 'Message deleted' });
    msg.text = text.trim();
    msg.editedAt = new Date();
    convo.lastMessageAt = new Date();
    await convo.save();
    try {
      const { io } = require('../server');
      io.to(String(peerId)).emit('chat:message-updated', { conversationId: convo._id, messageId, text: msg.text, editedAt: msg.editedAt, sender: { _id: userId } });
    } catch (e) {}
    res.json({ success: true, message: 'Message updated', data: { conversationId: convo._id, message: msg } });
  } catch (e) {
    console.error('Edit message error:', e);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// DELETE /api/chat/messages/:peerId/:messageId - unsend (soft delete) a message
router.delete('/messages/:peerId/:messageId', authenticateToken, async (req, res) => {
  try {
    const userId = req.user._id;
    const { peerId, messageId } = req.params;
    const convo = await Conversation.getOrCreateBetween(userId, peerId);
    const msg = convo.messages.id(messageId);
    if (!msg) return res.status(404).json({ success: false, message: 'Message not found' });
    if (String(msg.sender) !== String(userId)) return res.status(403).json({ success: false, message: 'Not allowed' });
    if (msg.deleted) return res.status(400).json({ success: false, message: 'Already deleted' });
    msg.deleted = true;
    msg.deletedAt = new Date();
    convo.lastMessageAt = new Date();
    await convo.save();
    try {
      const { io } = require('../server');
      io.to(String(peerId)).emit('chat:message-deleted', { conversationId: convo._id, messageId, deletedAt: msg.deletedAt, sender: { _id: userId } });
    } catch (e) {}
    res.json({ success: true, message: 'Message deleted', data: { conversationId: convo._id, messageId } });
  } catch (e) {
    console.error('Delete message error:', e);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// POST /api/chat/read/:peerId - mark messages from peer as read
router.post('/read/:peerId', authenticateToken, async (req, res) => {
  try {
    const userId = req.user._id;
    const { peerId } = req.params;
    const convo = await Conversation.getOrCreateBetween(userId, peerId);
    let updated = 0;
    convo.messages.forEach(m => {
      if (String(m.sender) !== String(userId) && !m.readBy.some(id => String(id) === String(userId))) {
        m.readBy.push(userId);
        updated += 1;
      }
    });
    if (updated > 0) await convo.save();
    res.json({ success: true, updated });
  } catch (e) {
    console.error('Mark read error:', e);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// POST /api/chat/messages/:peerId/:messageId/react - add or update reaction
router.post('/messages/:peerId/:messageId/react', authenticateToken, async (req, res) => {
  try {
    const userId = req.user._id;
    const { peerId, messageId } = req.params;
    const { type } = req.body || {};
    const validTypes = ['funny', 'rage', 'shock', 'relatable', 'love', 'thinking'];
    if (!type || !validTypes.includes(type)) {
      return res.status(400).json({ success: false, message: 'Invalid reaction type' });
    }
    const convo = await Conversation.getOrCreateBetween(userId, peerId);
    const msg = convo.messages.id(messageId);
    if (!msg) return res.status(404).json({ success: false, message: 'Message not found' });
    if (msg.deleted) return res.status(400).json({ success: false, message: 'Message deleted' });
    
    // Remove existing reaction from this user if any
    msg.reactions = msg.reactions.filter(r => String(r.user) !== String(userId));
    // Add new reaction
    msg.reactions.push({ user: userId, type, createdAt: new Date() });
    await convo.save();
    
    try {
      const { io } = require('../server');
      io.to(String(peerId)).emit('chat:message-reacted', { 
        conversationId: convo._id, 
        messageId, 
        userId, 
        type,
        reactions: msg.reactions 
      });
    } catch (e) {}
    
    res.json({ success: true, message: 'Reaction added', data: { reactions: msg.reactions } });
  } catch (e) {
    console.error('React to message error:', e);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// DELETE /api/chat/messages/:peerId/:messageId/react - remove reaction
router.delete('/messages/:peerId/:messageId/react', authenticateToken, async (req, res) => {
  try {
    const userId = req.user._id;
    const { peerId, messageId } = req.params;
    const convo = await Conversation.getOrCreateBetween(userId, peerId);
    const msg = convo.messages.id(messageId);
    if (!msg) return res.status(404).json({ success: false, message: 'Message not found' });
    
    msg.reactions = msg.reactions.filter(r => String(r.user) !== String(userId));
    await convo.save();
    
    try {
      const { io } = require('../server');
      io.to(String(peerId)).emit('chat:message-reacted', { 
        conversationId: convo._id, 
        messageId, 
        userId, 
        type: null,
        reactions: msg.reactions 
      });
    } catch (e) {}
    
    res.json({ success: true, message: 'Reaction removed', data: { reactions: msg.reactions } });
  } catch (e) {
    console.error('Remove reaction error:', e);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
