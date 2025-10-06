import mongoose from 'mongoose';
import { Message, Room, User } from './models';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://neo:1234567890@cluster0.8qjqj.mongodb.net/chat-platform?retryWrites=true&w=majority';

async function createSampleMessages() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to database');

    // Get all groups
    const groups = await Room.find({});
    console.log(`Found ${groups.length} groups`);

    // Get a user to send messages
    const user = await User.findOne({});
    if (!user) {
      console.log('No users found, creating a test user');
      const testUser = new User({
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123',
        role: 'USER'
      });
      await testUser.save();
      console.log('Created test user');
    }

    const sender = await User.findOne({});
    if (!sender) {
      console.log('No sender found');
      return;
    }

    console.log(`Using sender: ${sender.username} (${sender._id})`);

    // Create sample messages for each group
    for (const group of groups) {
      console.log(`Creating messages for group: ${group.name} (${group._id})`);
      
      const sampleMessages = [
        `Welcome to ${group.name}! 👋`,
        `This is a sample message in ${group.name}.`,
        `You can start chatting here! 💬`,
        `Group created on ${group.createdAt?.toLocaleDateString() || 'recently'}.`,
        `This group has ${group.members?.length || 0} members.`
      ];

      for (const content of sampleMessages) {
        const message = new Message({
          content,
          senderId: sender._id,
          roomId: group._id,
          timestamp: new Date(),
          type: 'text'
        });

        await message.save();
        console.log(`Created message: "${content}"`);
      }
    }

    console.log('Sample messages created successfully!');
    
    // Show summary
    const totalMessages = await Message.countDocuments();
    console.log(`Total messages in database: ${totalMessages}`);
    
  } catch (error) {
    console.error('Error creating sample messages:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from database');
  }
}

createSampleMessages();
