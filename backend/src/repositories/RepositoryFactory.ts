import { IDataRepository } from './IDataRepository';
import { MongoRepository } from './MongoRepository';
import { CloudScaleRepository } from './CloudScaleRepository';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

export class RepositoryFactory {
  static getRepository(req?: any): IDataRepository {
    const headerProvider = req?.headers?.['x-mock-db-provider'];
    const provider = headerProvider || process.env.DB_PROVIDER || 'mongo';
    if (provider === 'cloudscale') {
      console.log('[DB] Using CloudScale Repository (Per-Request)');
      return new CloudScaleRepository(req);
    }
    // MongoRepository can be a singleton or newly instantiated
    return new MongoRepository();
  }
}
