import { IDataRepository } from './IDataRepository';
import { CloudScaleRepository } from './CloudScaleRepository';

export class RepositoryFactory {
  static getRepository(req?: any): IDataRepository {
    console.log('[DB] Using CloudScale Repository (Per-Request)');
    return new CloudScaleRepository(req);
  }
}
