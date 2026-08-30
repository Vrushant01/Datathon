import catalyst from 'zcatalyst-sdk-node';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

async function peek() {
  const app = catalyst.initializeApp({
      project_id: process.env.CATALYST_PROJECT_ID,
      project_key: process.env.CATALYST_PROJECT_KEY,
      environment: process.env.CATALYST_ENVIRONMENT || 'Development',
      credential: catalyst.credential.refreshToken({
          client_id: process.env.CATALYST_CLIENT_ID,
          client_secret: process.env.CATALYST_CLIENT_SECRET,
          refresh_token: process.env.CATALYST_REFRESH_TOKEN
      })
  });
  
  const nosql = app.nosql();
  const table = nosql.table('casemasters');
  
  const { NoSQLItem } = require('zcatalyst-sdk-node/lib/no-sql');
  const keys = [1].map(v => new NoSQLItem().addNumber('CaseMasterID', v));
  
  const resp = await table.fetchItem({ keys });
  // @ts-ignore
  const raw = resp.toJSON ? resp.toJSON() : resp;
  const items = (raw.get || []).map((d: any) => {
      const item = d.item;
      if (!item) return null;
      return typeof item.toJSON === 'function' ? item.toJSON() : item;
  }).filter(Boolean);
  
  console.log(JSON.stringify(items, null, 2));
}

peek().catch(console.error);
