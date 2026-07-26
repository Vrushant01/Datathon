import { getDb } from './mongodb';
import { aiLogger } from './logger';

export interface FieldInfo {
  type: string;
  count: number;
}

export interface CollectionSchema {
  collectionName: string;
  fields: Record<string, FieldInfo>;
  sampleDocuments: any[];
}

let cachedSchema: Record<string, CollectionSchema> | null = null;
let isDiscovering = false;

const inferType = (val: any): string => {
  if (val === null) return 'null';
  if (Array.isArray(val)) return 'array';
  if (val instanceof Date) return 'date';
  return typeof val;
};

export const discoverSchema = async (): Promise<Record<string, CollectionSchema>> => {
  if (isDiscovering) {
    while (isDiscovering) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    return cachedSchema || {};
  }
  
  isDiscovering = true;
  try {
    const db = await getDb();
    const collections = await db.listCollections().toArray();
    const schema: Record<string, CollectionSchema> = {};

    for (const collInfo of collections) {
      if (collInfo.name === 'embeddings' || collInfo.name.startsWith('system.')) continue;
      
      const collectionName = collInfo.name;
      const sampleDocs = await db.collection(collectionName).find().limit(20).toArray();
      
      const fields: Record<string, FieldInfo> = {};
      
      for (const doc of sampleDocs) {
        for (const [key, val] of Object.entries(doc)) {
          const type = inferType(val);
          if (!fields[key]) {
            fields[key] = { type, count: 0 };
          }
          fields[key].count += 1;
        }
      }
      
      schema[collectionName] = {
        collectionName,
        fields,
        sampleDocuments: sampleDocs.slice(0, 2) // keep 2 docs for prompt context
      };
    }
    
    cachedSchema = schema;
    aiLogger.info(`Schema discovered for ${Object.keys(schema).length} collections.`);
    return schema;
  } catch (err: any) {
    aiLogger.error(`Schema discovery failed: ${err.message}`);
    throw err;
  } finally {
    isDiscovering = false;
  }
};

export const getSchema = async (): Promise<Record<string, CollectionSchema>> => {
  if (!cachedSchema) {
    return await discoverSchema();
  }
  return cachedSchema;
};
