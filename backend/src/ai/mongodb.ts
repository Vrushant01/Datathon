import { MongoClient, Db } from 'mongodb';
import { AI_CONFIG } from './config';
import { aiLogger } from './logger';

let client: MongoClient | null = null;
let dbInstance: Db | null = null;

export const getDb = async (): Promise<Db> => {
  if (dbInstance) return dbInstance;
  
  if (!client) {
    client = new MongoClient(AI_CONFIG.MONGODB_URI, {
      maxPoolSize: 10,
    });
    await client.connect();
    aiLogger.info('Connected to MongoDB natively for AI Analytics.');
  }
  
  dbInstance = client.db(AI_CONFIG.MONGODB_DATABASE);
  return dbInstance;
};

export const closeDb = async () => {
  if (client) {
    await client.close();
    client = null;
    dbInstance = null;
    aiLogger.info('Closed MongoDB native connection.');
  }
};
