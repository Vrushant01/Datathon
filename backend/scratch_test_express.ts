import express from 'express';
import { CloudScaleRepository } from './src/repositories/CloudScaleRepository';

const app = express();

app.get('/test', async (req, res) => {
  try {
    const db = new CloudScaleRepository(req);
    const cases = await db.getCases({});
    res.json({ count: cases.length });
  } catch (err: any) {
    res.status(500).json({ error: err.message, stack: err.stack });
  }
});

const server = app.listen(5001, () => {
  console.log('Test server on 5001');
  fetch('http://localhost:5001/test')
    .then((r: any) => r.json())
    .then((data: any) => {
      console.log('Result:', data);
      server.close();
      process.exit(0);
    })
    .catch((e: any) => {
      console.error(e);
      server.close();
      process.exit(1);
    });
});
