import mongoose from 'mongoose';
import { Employee } from '../src/models';
import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../.env') });

async function analyze() {
  await mongoose.connect(process.env.MONGO_URI as string);
  const emp = await Employee.findOne().lean();
  if (emp) {
    const emps = await Employee.find({ UnitID: emp.UnitID }).lean();
    console.log(JSON.stringify(emps, null, 2));
  }
  await mongoose.disconnect();
}
analyze().catch(console.error);
