import { getDb } from './mongodb';
import { generateEmbedding } from './embeddings';
import { aiLogger } from './logger';
import { ObjectId } from 'mongodb';

export interface VectorDocument {
  _id?: ObjectId;
  documentId: string;
  collection: string;
  embedding: number[];
  metadata: any;
  contentSummary: string;
}

export const saveEmbedding = async (doc: VectorDocument) => {
  const db = await getDb();
  await db.collection('embeddings').updateOne(
    { documentId: doc.documentId, collection: doc.collection },
    { $set: doc },
    { upsert: true }
  );
};

export const searchSimilar = async (queryText: string, limit: number = 5): Promise<VectorDocument[]> => {
  try {
    const queryEmbedding = await generateEmbedding(queryText);
    if (!queryEmbedding || queryEmbedding.length === 0) return [];

    const db = await getDb();
    
    // Generic fallback for local MongoDB without Atlas Vector Search.
    // Calculates Cosine Similarity in-memory.
    const allEmbeddings = await db.collection('embeddings').find().toArray();
    
    const calculateCosineSimilarity = (vecA: number[], vecB: number[]) => {
      if (!vecA || !vecB || vecA.length !== vecB.length) return 0;
      let dotProduct = 0;
      let normA = 0;
      let normB = 0;
      for (let i = 0; i < vecA.length; i++) {
        dotProduct += vecA[i] * vecB[i];
        normA += vecA[i] * vecA[i];
        normB += vecB[i] * vecB[i];
      }
      if (normA === 0 || normB === 0) return 0;
      return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
    };

    const scored = allEmbeddings.map((doc: any) => ({
      ...doc,
      score: calculateCosineSimilarity(queryEmbedding, doc.embedding || [])
    }));

    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, limit) as VectorDocument[];
  } catch (err: any) {
    aiLogger.error(`Error searching embeddings: ${err.message}`);
    return [];
  }
};
