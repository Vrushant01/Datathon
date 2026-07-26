import { getSchema } from './schemaCache';

const FORBIDDEN_OPERATORS = [
  '$insert', '$update', '$delete', '$drop', '$out', '$merge', '$bulkWrite',
  '$pull', '$pop',
  '$accumulator', '$function' // Also block custom code execution
];

export const validateQuery = async (collectionName: string, query: any): Promise<boolean> => {
  const schema = await getSchema();
  
  if (!schema[collectionName]) {
    throw new Error(`Security Violation: Collection ${collectionName} does not exist or is restricted.`);
  }

  const queryStr = JSON.stringify(query);
  for (const op of FORBIDDEN_OPERATORS) {
    // Basic check for operator presence in keys
    if (queryStr.includes(`"${op}"`)) {
      throw new Error(`Security Violation: Operator ${op} is not permitted.`);
    }
  }

  return true;
};
