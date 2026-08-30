import { listTables } from '../cloudscale';

export const listCollections = async () => {
  return listTables();
};
