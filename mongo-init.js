// MongoDB initialization script
db = db.getSiblingDB('chat_platform');

// Create collections
db.createCollection('users');
db.createCollection('messages');
db.createCollection('rooms');

// Create indexes for better performance
db.users.createIndex({ "email": 1 }, { unique: true });
db.users.createIndex({ "username": 1 }, { unique: true });
db.messages.createIndex({ "roomId": 1 });
db.messages.createIndex({ "timestamp": 1 });
db.rooms.createIndex({ "name": 1 });

print('✅ MongoDB database initialized successfully');
print('📊 Collections created: users, messages, rooms');
print('🔍 Indexes created for better performance');
