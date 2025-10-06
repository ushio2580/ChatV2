import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://ponchocanales123_db_user:atjXhyI5PkzwjiNf@chat-plataform.hlmqkj1.mongodb.net/?retryWrites=true&w=majority&appName=chat-plataform';

export const connectDB = async () => {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ MongoDB Atlas connected successfully');
  } catch (error) {
    console.error('❌ MongoDB Atlas connection error:', error);
    process.exit(1);
  }
};

export default mongoose;
