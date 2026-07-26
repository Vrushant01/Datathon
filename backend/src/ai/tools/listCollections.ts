import { getDb } from '../mongodb';

export const listCollections = async () => {
  const db = await getDb();
  const collections = await db.listCollections().toArray();
  return collections.map(c => c.name);
};
