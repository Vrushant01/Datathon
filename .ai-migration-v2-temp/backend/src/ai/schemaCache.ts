import { getTableData, listTables } from './cloudscale';
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
  if (val === null || val === undefined) return 'null';
  if (Array.isArray(val)) return 'array';
  return typeof val;
};

export const discoverSchema = async (req?: any): Promise<Record<string, CollectionSchema>> => {
  if (isDiscovering) {
    while (isDiscovering) await new Promise(r => setTimeout(r, 100));
    return cachedSchema || {};
  }

  isDiscovering = true;
  try {
    const schema: Record<string, CollectionSchema> = {};

    for (const table of listTables()) {
      const rows = await getTableData(table, req);
      const sample = rows.slice(0, 20);
      const fields: Record<string, FieldInfo> = {};

      for (const doc of sample) {
        for (const [key, val] of Object.entries(doc)) {
          const type = inferType(val);
          if (!fields[key]) fields[key] = { type, count: 0 };
          fields[key].count += 1;
        }
      }

      schema[table] = {
        collectionName: table,
        fields,
        sampleDocuments: sample.slice(0, 2),
      };
    }

    cachedSchema = schema;
    aiLogger.info(`[CloudScale] Schema discovered for ${Object.keys(schema).length} tables.`);
    return schema;
  } catch (err: any) {
    aiLogger.error(`Schema discovery failed: ${err.message}`);
    throw err;
  } finally {
    isDiscovering = false;
  }
};

export const getSchema = async (req?: any): Promise<Record<string, CollectionSchema>> => {
  if (cachedSchema) return cachedSchema;
  try {
    return await discoverSchema(req);
  } catch (err: any) {
    aiLogger.error(`getSchema falling back to empty schema: ${err.message}`);
    return {};
  }
};
