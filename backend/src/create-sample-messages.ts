// Script to create sample messages in MongoDB
import { connectDB } from './config/mongodb-atlas';
import { Room, User, Message } from './models';

async function createSampleMessages() {
  try {
    await connectDB();
    console.log('Connected to MongoDB');

    // Find the test user
    const testUser = await User.findOne({ email: 'newuser@example.com' });
    if (!testUser) {
      console.log('Test user not found');
      return;
    }

    console.log('Found test user:', testUser.username);

    // Find some groups
    const groups = await Room.find({}).limit(3);
    if (groups.length === 0) {
      console.log('No groups found');
      return;
    }

    console.log(`Found ${groups.length} groups`);

    // Create sample messages for each group
    for (const group of groups) {
      const sampleMessages = [
        {
          roomId: group._id.toString(),
          senderId: testUser._id.toString(),
          content: `Welcome to ${group.name}! 👋`,
          type: 'text',
          timestamp: new Date(Date.now() - 3600000) // 1 hour ago
        },
        {
          roomId: group._id.toString(),
          senderId: testUser._id.toString(),
          content: 'This is a sample message to test the chat functionality.',
          type: 'text',
          timestamp: new Date(Date.now() - 1800000) // 30 minutes ago
        },
        {
          roomId: group._id.toString(),
          senderId: testUser._id.toString(),
          content: 'You can send messages here and they will be saved to the database! 💬',
          type: 'text',
          timestamp: new Date(Date.now() - 900000) // 15 minutes ago
        }
      ];

      // Check if messages already exist for this group
      const existingMessages = await Message.find({ roomId: group._id.toString() });
      if (existingMessages.length === 0) {
        for (const messageData of sampleMessages) {
          const message = new Message(messageData);
          await message.save();
          console.log(`Created message in ${group.name}: ${messageData.content.substring(0, 50)}...`);
        }
      } else {
        console.log(`Messages already exist for ${group.name}`);
      }
    }

    console.log('Sample messages created successfully');
    process.exit(0);
  } catch (error) {
    console.error('Error creating sample messages:', error);
    process.exit(1);
  }
}

createSampleMessages();
