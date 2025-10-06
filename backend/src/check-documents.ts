// Script to check documents in MongoDB
import { connectDB } from './config/mongodb-atlas';
import { DocumentModel } from './models';

async function checkDocuments() {
  try {
    await connectDB();
    console.log('Connected to MongoDB');
    
    const docs = await DocumentModel.find({});
    console.log(`Documents in database: ${docs.length}`);
    
    docs.forEach((doc: any) => {
      console.log(`- ID: ${doc._id}, Title: ${doc.title}, Created by: ${doc.createdBy}`);
    });
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkDocuments();
