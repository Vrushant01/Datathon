import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { CaseMaster } from './src/models';

dotenv.config();

async function run() {
  await mongoose.connect(process.env.MONGO_URI || '');
  const caseDoc = await CaseMaster.findOne().lean();
  console.log(Object.keys(caseDoc || {}));
  process.exit(0);
}
run();
