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

// Upload middleware
const { uploadMiddleware, getFileUrl } = require('./middleware/upload');

// --- Security headers ---
app.use(helmet());

// --- CORS Setup ---
// In production, you can set CORS_ORIGINS as a comma-separated list of allowed origins.
const allowedOrigins = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(',').map(o => o.trim()).filter(Boolean)
  : null;

const corsOptions = {
  origin: allowedOrigins && allowedOrigins.length > 0
    ? allowedOrigins
    : true, // Allow all origins when no explicit list is provided (useful for local/dev)
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
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
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.status(200).end();
    return;
  }
  next();
});

// --- Body parser ---
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// --- Request logging middleware ---
app.use((req, res, next) => {
  console.log(`📥 ${req.method} ${req.url} - ${new Date().toISOString()}`);

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

// --- Serve static files ---
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

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

// --- Routes ---
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/user', userRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/whisperwall', whisperWallRoutes);
app.use('/api/reactions', reactionRoutes);
app.use('/api/chat', chatRoutes);

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

// --- Cron job ---
cron.schedule('0 0 * * *', async () => {
  try {
    const WhisperPost = require('./models/WhisperPost');
    const deleted = await WhisperPost.deleteMany({ createdAt: { $lt: new Date(Date.now() - 24*60*60*1000) } });
    console.log(`🧹 Cleared ${deleted.deletedCount} WhisperWall posts`);
  } catch (error) {
    console.error('Error clearing WhisperWall posts:', error);
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
server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🔗 Health check: http://localhost:${PORT}/health`);
  console.log(`📱 Mobile access: http://192.168.10.2:${PORT}/health`);
});

module.exports = { app, io };
