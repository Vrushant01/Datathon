import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const checkDb = async () => {
  const mongoURI = process.env.MONGO_URI;
  try {
    await mongoose.connect(mongoURI as string);
    console.log('Connected to MongoDB.');
    const db = mongoose.connection.db;
    
    // Check all collections in the current DB
    const collections = await db!.listCollections().toArray();
    console.log(`Collections in database '${db!.databaseName}':`);
    
    for (const col of collections) {
      const count = await db!.collection(col.name).countDocuments();
      console.log(`- ${col.name}: ${count} documents`);
    }
    
    process.exit(0);
  } catch(e) {
    console.error(e);
    process.exit(1);
  }
}
checkDb();
