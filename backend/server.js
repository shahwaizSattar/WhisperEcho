require('dotenv').config({ path: require('path').resolve(__dirname, '.env') });
console.log("✅ MONGODB_URI present:", !!process.env.MONGODB_URI);

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const http = require('http');
const socketIo = require('socket.io');
const cron = require('node-cron');
const path = require('path');
const helmet = require('helmet');
const session = require('express-session');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

global.io = io;

// Routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/user');
const postRoutes = require('./routes/posts');
const whisperWallRoutes = require('./routes/whisperwall');
const reactionRoutes = require('./routes/reactions');
const chatRoutes = require('./routes/chat');
const locationRoutes = require('./routes/location');
const adminRoutes = require('./routes/admin');
const reportRoutes = require('./routes/reports');

// Upload middleware
const { uploadMiddleware, getFileUrl } = require('./middleware/upload');

// Validation middleware
const { sanitizeInput } = require('./middleware/validation');

// Fake IP middleware
const fakeIpMiddleware = require('./middleware/fakeIp');

// --- DISABLE TRUST PROXY ---
// This ensures Express doesn't try to read real IP from proxy headers
app.set('trust proxy', false);

// --- FAKE IP MIDDLEWARE (MUST BE FIRST) ---
// This strips real IP and injects fake IP before any other middleware
app.use(fakeIpMiddleware);

// --- Security headers ---
// Disable some helmet features that can block media playback
app.use(helmet({
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: false,
  contentSecurityPolicy: false,
}));

// --- CORS Setup ---
// Allow all origins with credentials for React/React Native frontend
const corsOptions = {
  origin: '*', // Allow all origins
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-Admin-Auth', 'X-Admin-Token'],
  credentials: true
};
app.use(cors(corsOptions));

// Handle preflight requests for all routes
app.options('*', cors(corsOptions));

// Additional preflight handling
app.use((req, res, next) => {
  if (req.method === 'OPTIONS') {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Admin-Auth, X-Admin-Token');
    res.status(200).end();
    return;
  }
  next();
});

// --- Session middleware for WhisperWall ---
app.use(session({
  secret: process.env.SESSION_SECRET || 'whisper-wall-secret-key',
  resave: false,
  saveUninitialized: true,
  cookie: { 
    secure: process.env.NODE_ENV === 'production',
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// --- Body parser ---
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// --- Input sanitization ---
app.use(sanitizeInput);

// --- Request logging middleware ---
app.use((req, res, next) => {
  console.log(`📥 ${req.method} ${req.url} - ${new Date().toISOString()}`);
  console.log(`🎭 Client Fake IP: ${req.fakeIP || req.ip}`);

  const isSensitiveAuthRoute = req.path.startsWith('/api/auth');

  if (!isSensitiveAuthRoute && req.body && Object.keys(req.body).length > 0) {
    console.log('📦 Request body:', JSON.stringify(req.body, null, 2));
  }
  next();
});

// --- Rate limiter ---
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

// More strict limiter for auth endpoints to reduce abuse
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many authentication attempts, please try again later.',
  },
});

// --- Serve static files with proper headers for video streaming ---
app.use('/uploads', (req, res, next) => {
  // Enable CORS for media files
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Range');
  res.header('Access-Control-Expose-Headers', 'Content-Length, Content-Range, Accept-Ranges');
  
  // Enable range requests for video streaming
  res.header('Accept-Ranges', 'bytes');
  
  next();
}, express.static(path.join(__dirname, 'uploads'), {
  // Enable etag and last-modified for caching
  etag: true,
  lastModified: true,
  // Set proper content types
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.mp4')) {
      res.setHeader('Content-Type', 'video/mp4');
    } else if (filePath.endsWith('.webm')) {
      res.setHeader('Content-Type', 'video/webm');
    } else if (filePath.endsWith('.mp3')) {
      res.setHeader('Content-Type', 'audio/mpeg');
    } else if (filePath.endsWith('.wav')) {
      res.setHeader('Content-Type', 'audio/wav');
    }
  }
}));

// --- MongoDB connection ---
const connectDB = async () => {
  try {
    // Use URI from environment or fallback to local MongoDB for development
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/whisper-echo';
    
    console.log('🔌 Connecting to MongoDB Atlas...');
    
    await mongoose.connect(mongoURI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    
    console.log('✅ MongoDB Atlas connected successfully!');
    console.log('📊 Database:', mongoose.connection.name);
    
  } catch (error) {
    console.error('❌ MongoDB connection error:', error.message);
    console.log('💡 Make sure your Atlas cluster is running and IP is whitelisted');
    
    // Don't exit - let the server run without database for debugging
    console.log('📱 Server will start anyway for debugging...');
  }
};
connectDB();

// --- Health check endpoint ---
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// --- Routes ---
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/user', userRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/whisperwall', whisperWallRoutes);
app.use('/api/reactions', reactionRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/location', locationRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/reports', reportRoutes);

// --- Media upload endpoints ---
app.post('/api/upload/single', uploadMiddleware.single('media'), uploadMiddleware.handleError, (req, res) => {
  if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded' });
  const folder = getMediaFolder(req.file.mimetype);
  const fileUrl = getFileUrl(req, req.file.filename, folder);
  res.json({ success: true, message: 'File uploaded', file: { ...req.file, url: fileUrl } });
});

app.post('/api/upload/multiple', uploadMiddleware.multiple('media', 5), uploadMiddleware.handleError, (req, res) => {
  if (!req.files || req.files.length === 0) return res.status(400).json({ success: false, message: 'No files uploaded' });
  const files = req.files.map(file => {
    const folder = getMediaFolder(file.mimetype);
    const fileUrl = getFileUrl(req, file.filename, folder);
    let mediaType = 'image';
    if (file.mimetype.startsWith('video/')) mediaType = 'video';
    else if (file.mimetype.startsWith('audio/')) mediaType = 'audio';
    
    return { 
      url: fileUrl,
      type: mediaType,
      filename: file.filename,
      originalname: file.originalname,
      mimetype: file.mimetype,
      size: file.size
    };
  });
  console.log('📤 Files uploaded successfully:', files.length);
  res.json({ success: true, message: `${files.length} files uploaded`, files });
});

// --- Helper ---
const getMediaFolder = (mimetype) => {
  if (mimetype.startsWith('video/')) return 'videos';
  if (mimetype.startsWith('audio/')) return 'audio';
  return 'images';
};

// --- Socket.io ---
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);
  socket.on('join-room', room => socket.join(room));
  socket.on('leave-room', room => socket.leave(room));
  socket.on('disconnect', () => console.log('User disconnected:', socket.id));
});

// --- Cron jobs ---
// Clean up expired WhisperWall posts (24 hour auto-delete)
cron.schedule('0 0 * * *', async () => {
  try {
    const WhisperPost = require('./models/WhisperPost');
    const deleted = await WhisperPost.deleteMany({ createdAt: { $lt: new Date(Date.now() - 24*60*60*1000) } });
    console.log(`🧹 Cleared ${deleted.deletedCount} WhisperWall posts`);
  } catch (error) {
    console.error('Error clearing WhisperWall posts:', error);
  }
});

// Clean up vanished posts (runs every minute)
cron.schedule('* * * * *', async () => {
  try {
    const WhisperPost = require('./models/WhisperPost');
    const now = new Date();
    
    // Find and delete expired vanish mode posts
    const expiredPosts = await WhisperPost.find({
      'vanishMode.enabled': true,
      'vanishMode.vanishAt': { $lte: now }
    });
    
    if (expiredPosts.length > 0) {
      const postIds = expiredPosts.map(p => p._id.toString());
      await WhisperPost.deleteMany({ _id: { $in: postIds } });
      
      // Emit socket event to notify clients
      io.emit('whispers:vanished', { postIds });
      
      console.log(`⏱️ Deleted ${expiredPosts.length} vanished posts`);
    }
  } catch (error) {
    console.error('Error cleaning vanished posts:', error);
  }
});

// --- Health check ---
app.get('/health', (req, res) => res.json({ status: 'OK', timestamp: new Date().toISOString() }));

// --- Test endpoint ---
app.get('/api/test', (req, res) => {
  console.log('🧪 Test endpoint hit!');
  res.json({ 
    success: true, 
    message: 'Backend is working!', 
    timestamp: new Date().toISOString(),
    port: PORT || 3001
  });
});

// --- Test video endpoint ---
app.get('/api/test-video', (req, res) => {
  const fs = require('fs');
  const videoPath = path.join(__dirname, 'uploads/videos/71260391-2089-4f55-b153-2000f6ab692a.mp4');
  
  if (!fs.existsSync(videoPath)) {
    return res.status(404).json({ success: false, message: 'Video file not found' });
  }
  
  const stat = fs.statSync(videoPath);
  res.json({
    success: true,
    message: 'Video file exists',
    path: videoPath,
    size: stat.size,
    sizeInMB: (stat.size / (1024 * 1024)).toFixed(2),
    url: `http://${process.env.SERVER_IP || '172.20.10.2'}:${PORT}/uploads/videos/71260391-2089-4f55-b153-2000f6ab692a.mp4`
  });
});

// --- Test video page ---
app.get('/test-video-page', (req, res) => {
  res.sendFile(path.join(__dirname, 'test-video.html'));
});

app.post('/api/test', (req, res) => {
  console.log('🧪 Test POST endpoint hit!');
  console.log('📦 POST body:', req.body);
  res.json({ 
    success: true, 
    message: 'POST endpoint is working!', 
    receivedData: req.body,
    timestamp: new Date().toISOString()
  });
});

// --- Start server ---
const PORT = process.env.PORT || 5000;
server.listen(PORT, process.env.SERVER_HOST || '0.0.0.0', () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🔗 Health check: http://localhost:${PORT}/health`);
  console.log(`📱 Mobile access: http://${process.env.SERVER_IP || '172.20.10.2'}:${PORT}/health`);
});

module.exports = { app, io };
