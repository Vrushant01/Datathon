import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { CaseMaster, Accused, Unit } from './src/models';

dotenv.config();

async function investigate() {
  await mongoose.connect(process.env.MONGO_URI || '');
  console.log('Connected to MongoDB.');

  const caseSample = await CaseMaster.findOne({ CrimeRegisteredDateTime: { $exists: true, $ne: null } });
  console.log('Sample Case with CrimeRegisteredDateTime:', caseSample?.CrimeRegisteredDateTime);
  
  const caseSample2 = await CaseMaster.findOne({ IncidentFromDate: { $exists: true, $ne: null } });
  console.log('Sample Case with IncidentFromDate:', caseSample2?.IncidentFromDate);

  const accusedCount = await Accused.countDocuments();
  console.log('Total Accused Records:', accusedCount);

  const caseCount = await CaseMaster.countDocuments();
  console.log('Total CaseMaster Records:', caseCount);

  // Check CrimeMajorHeadIDs
  const uniqueHeads = await CaseMaster.distinct('CrimeMajorHeadID');
  console.log('Unique CrimeMajorHeadIDs in cases:', uniqueHeads);

  process.exit(0);
}

investigate().catch(console.error);
