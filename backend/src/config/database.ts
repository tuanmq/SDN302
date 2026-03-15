import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const mongoUri = process.env.MONGODB_URI || process.env.DATABASE_URL;

if (!mongoUri) {
  throw new Error('MongoDB connection string (MONGODB_URI) not specified in environment');
}

mongoose.set('strictQuery', false);

// helper function to connect and export
export async function connectDatabase(): Promise<typeof mongoose> {
  const uri = process.env.MONGODB_URI || process.env.DATABASE_URL;
  if (!uri) {
    throw new Error('MongoDB connection string (MONGODB_URI or DATABASE_URL) not specified in environment');
  }
  console.log('Connecting to MongoDB at', uri);
  try {
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 10000,
    });
    console.log('Connected to MongoDB');
  } catch (err) {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  }
  return mongoose;
}

export default mongoose;
