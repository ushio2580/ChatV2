// Script to remove duplicate General groups and allow system recreation
require('dotenv').config();
const mongoose = require('mongoose');

// Define the schema to use with mongoose
const roomSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: String,
  type: { type: String, default: 'group' },
  ownerId: String,
  members: [String],
  admins: [String],
  memberCount: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
  settings: {
    maxMembers: Number,
    allowFileUpload: Boolean,
    allowAnonymous: Boolean
  }
});

const Room = mongoose.model('Room', roomSchema);

async function cleanupGeneralGroups() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb+srv://neo:neo123@cluster0.8qjqj.mongodb.net/chat-platform?retryWrites=true&w=majority');
    console.log('Connected to MongoDB');

    // Find all General groups
    const generalGroups = await Room.find({ name: 'General' });
    console.log(`Found ${generalGroups.length} General groups:`);
    
    generalGroups.forEach((group, index) => {
      console.log(`${index + 1}. ID: ${group._id}, Description: "${group.description}", Members: ${group.memberCount}, Owner: ${group.ownerId}`);
    });

    if (generalGroups.length === 0) {
      console.log('No General groups found. Nothing to clean up.');
      process.exit(0);
    }

    // Delete all General groups
    console.log('\n🗑️  Deleting all General groups...');
    await Room.deleteMany({ name: 'General' });
    console.log('✅ All General groups deleted successfully!');

    // Also clean up related data
    console.log('\n🧹 Cleaning up related data...');
    
    // Clean up messages (optional - uncomment if needed)
    // await mongoose.connection.db.collection('messages').deleteMany({ roomId: { $in: generalGroups.map(g => g._id.toString()) } });
    
    console.log('✅ Cleanup completed!');
    console.log('\n📋 Next steps:');
    console.log('1. Restart the backend server');
    console.log('2. Reload the frontend');
    console.log('3. The system will automatically create a single General group');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error during cleanup:', error);
    process.exit(1);
  }
}

cleanupGeneralGroups();
