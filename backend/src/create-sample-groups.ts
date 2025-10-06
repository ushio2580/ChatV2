// Script to create sample groups in MongoDB
import { connectDB } from './config/mongodb-atlas';
import { Room, User } from './models';

async function createSampleGroups() {
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

    // Create sample groups
    const sampleGroups = [
      {
        name: 'General',
        description: 'General chat room for everyone',
        type: 'group',
        ownerId: testUser._id.toString(),
        members: [testUser._id.toString()],
        admins: [testUser._id.toString()],
        settings: {
          maxMembers: 100,
          allowFileUpload: true,
          allowAnonymous: false
        }
      },
      {
        name: 'Random',
        description: 'Random discussions and topics',
        type: 'group',
        ownerId: testUser._id.toString(),
        members: [testUser._id.toString()],
        admins: [testUser._id.toString()],
        settings: {
          maxMembers: 50,
          allowFileUpload: true,
          allowAnonymous: false
        }
      },
      {
        name: 'Development',
        description: 'Development and coding discussions',
        type: 'group',
        ownerId: testUser._id.toString(),
        members: [testUser._id.toString()],
        admins: [testUser._id.toString()],
        settings: {
          maxMembers: 30,
          allowFileUpload: true,
          allowAnonymous: false
        }
      }
    ];

    // Check if groups already exist
    for (const groupData of sampleGroups) {
      const existingGroup = await Room.findOne({ name: groupData.name });
      if (!existingGroup) {
        const group = new Room(groupData);
        await group.save();
        console.log(`Created group: ${groupData.name}`);
      } else {
        console.log(`Group already exists: ${groupData.name}`);
      }
    }

    console.log('Sample groups created successfully');
    process.exit(0);
  } catch (error) {
    console.error('Error creating sample groups:', error);
    process.exit(1);
  }
}

createSampleGroups();
