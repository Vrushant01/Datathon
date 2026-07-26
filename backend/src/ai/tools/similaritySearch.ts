import { searchSimilar, VectorDocument } from '../vectorStore';
import { getDb } from '../mongodb';
import { aiLogger } from '../logger';
import { ObjectId } from 'mongodb';

export const similaritySearch = async (queryText: string, limit: number = 5) => {
  try {
    const start = Date.now();
    const similarDocs = await searchSimilar(queryText, limit);
    
    // Fetch full documents from original collections
    const db = await getDb();
    const results = await Promise.all(similarDocs.map(async (doc: VectorDocument) => {
      const fullDoc = await db.collection(doc.collection).findOne({ _id: new ObjectId(doc.documentId) });
      return {
        ...fullDoc,
        _similarityScore: (doc as any).score
      };
    }));

    aiLogger.logQuery(`similaritySearch for "${queryText}"`, Date.now() - start, similarDocs.map((d: VectorDocument) => d.collection), false);
    return results;
  } catch (err: any) {
    aiLogger.logQuery(`similaritySearch`, 0, [], true);
    throw err;
  }
};
