import mongoose from 'mongoose';
import { CaseMaster, Accused, Victim } from '../src/models';
import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../.env') });

async function analyze() {
  await mongoose.connect(process.env.MONGO_URI as string);
  console.log('Case:', (await CaseMaster.findOne().lean())?.CaseMasterID);
  console.log('Accused:', (await Accused.findOne().lean())?.AccusedMasterID);
  console.log('Victim:', (await Victim.findOne().lean())?.VictimMasterID);
  await mongoose.disconnect();
}

analyze().catch(console.error);
