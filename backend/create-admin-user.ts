import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// User Schema (simplified for this script)
const UserSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  firstName: { type: String },
  lastName: { type: String },
  role: { type: String, default: 'USER' },
  isOnline: { type: Boolean, default: false },
  lastSeen: { type: Date, default: Date.now },
  avatar: { type: String },
  mutedUntil: { type: Date },
  muteReason: { type: String }
}, {
  timestamps: true
});

const User = mongoose.model('User', UserSchema);

async function createAdminUser() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb+srv://neo:neo123@cluster0.8qjqj.mongodb.net/chat-platform?retryWrites=true&w=majority');
    console.log('✅ Connected to MongoDB');

    // Check if admin user already exists
    const existingAdmin = await User.findOne({ role: 'ADMIN' });
    if (existingAdmin) {
      console.log('👑 Admin user already exists:', existingAdmin.username);
      console.log('📧 Email:', existingAdmin.email);
      console.log('🔑 Password: admin123 (default)');
      return;
    }

    // Create admin user
    const hashedPassword = await bcrypt.hash('admin123', 10);
    
    const adminUser = new User({
      username: 'admin',
      email: 'admin@chatplatform.com',
      password: hashedPassword,
      firstName: 'Admin',
      lastName: 'User',
      role: 'ADMIN',
      isOnline: false,
      lastSeen: new Date()
    });

    await adminUser.save();
    
    console.log('🎉 Admin user created successfully!');
    console.log('👤 Username: admin');
    console.log('📧 Email: admin@chatplatform.com');
    console.log('🔑 Password: admin123');
    console.log('👑 Role: ADMIN');
    
  } catch (error) {
    console.error('❌ Error creating admin user:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run the script
createAdminUser();
