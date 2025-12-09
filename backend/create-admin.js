require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// Simple User model for admin creation
const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['user', 'admin'], default: 'user' },
  fakeIP: String,
  deviceHash: String,
  violationCount: { type: Number, default: 0 },
  shadowbanned: { type: Boolean, default: false }
});

userSchema.methods.comparePassword = async function(password) {
  return bcrypt.compare(password, this.password);
};

const User = mongoose.model('User', userSchema);

async function createAdmin() {
  try {
    // Connect to MongoDB
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/whisper-echo';
    await mongoose.connect(mongoURI);
    console.log('✅ Connected to MongoDB');

    // Check if admin already exists
    const existingAdmin = await User.findOne({ role: 'admin' });
    if (existingAdmin) {
      console.log('❌ Admin user already exists:', existingAdmin.email);
      process.exit(0);
    }

    // Create admin user
    const adminData = {
      username: 'admin',
      email: 'admin@whisperecho.com',
      password: await bcrypt.hash('admin123', 10), // Change this password!
      role: 'admin',
      fakeIP: '192.168.1.100',
      deviceHash: 'admin-device-hash'
    };

    const admin = await User.create(adminData);
    console.log('✅ Admin user created successfully!');
    console.log('📧 Email:', admin.email);
    console.log('🔑 Password: admin123');
    console.log('⚠️  Please change the password after first login!');

  } catch (error) {
    console.error('❌ Error creating admin:', error.message);
  } finally {
    mongoose.disconnect();
  }
}

createAdmin();