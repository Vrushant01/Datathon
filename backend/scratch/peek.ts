import catalyst from 'zcatalyst-sdk-node';

async function peek() {
  const app = catalyst.initialize(undefined as any);
  const nosql = app.nosql();
  const table = nosql.table('casemasters');
  
  const { NoSQLItem } = require('zcatalyst-sdk-node/lib/no-sql');
  const keys = [1, 2, 3].map(v => new NoSQLItem().addNumber('CaseMasterID', v));
  
  const resp = await table.fetchItem({ keys });
  const raw = resp.toJSON?.() ?? resp;
  const items = (raw.get || []).map((d: any) => {
      const item = d.item;
      if (!item) return null;
      return typeof item.toJSON === 'function' ? item.toJSON() : item;
  }).filter(Boolean);
  
  console.log(JSON.stringify(items, null, 2));
}

peek().catch(console.error);
