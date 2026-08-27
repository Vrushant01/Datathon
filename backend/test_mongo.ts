import { RepositoryFactory } from './src/repositories/RepositoryFactory';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

async function runTest() {
  await mongoose.connect(process.env.MONGO_URI!);
  console.log('MongoDB connected.');
  
  const db = RepositoryFactory.getRepository();
  
  const districts = await db.getDistricts();
  console.log(`Districts: ${districts.length}`);
  
  const cases = await db.getCases({});
  console.log(`Cases: ${cases.length}`);
  
  const employees = await db.getEmployees();
  console.log(`Employees: ${employees.length}`);
  
  process.exit(0);
}

runTest().catch(console.error);
