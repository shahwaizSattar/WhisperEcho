const jwt = require('jsonwebtoken');
const User = require('../models/User');

const adminAuth = async (req, res, next) => {
  try {
    // Check for hardcoded admin authentication first
    const adminAuthHeader = req.header('X-Admin-Auth');
    const adminToken = req.header('X-Admin-Token');
    
    if (adminAuthHeader === 'true' && adminToken) {
      // Verify hardcoded admin token
      try {
        const decoded = Buffer.from(adminToken, 'base64').toString('utf-8');
        const [username, password, timestamp] = decoded.split(':');
        
        if (username === 'superadmin' && password === 'WhisperEcho@2025') {
          // Create a mock admin user for the request
          req.userId = 'admin-superadmin';
          req.user = {
            _id: 'admin-superadmin',
            username: 'superadmin',
            email: 'admin@whisperecho.com',
            role: 'admin'
          };
          return next();
        }
      } catch (decodeError) {
        console.error('Admin token decode error:', decodeError);
      }
    }

    // Fallback to JWT token authentication
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ 
        success: false, 
        message: 'Access denied. No token provided.' 
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    const user = await User.findById(decoded.userId);

    if (!user) {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid token. User not found.' 
      });
    }

    if (user.role !== 'admin') {
      return res.status(403).json({ 
        success: false, 
        message: 'Access denied. Admin privileges required.' 
      });
    }

    req.user = user;
    req.userId = user._id;
    next();
  } catch (error) {
    console.error('Admin auth error:', error);
    res.status(401).json({ 
      success: false, 
      message: 'Invalid or expired token.' 
    });
  }
};

module.exports = adminAuth;
