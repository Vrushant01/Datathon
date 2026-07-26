import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { faker } from '@faker-js/faker';
import { Employee } from '../src/models';
import { SEED_EMPLOYEES } from '../../frontend/src/utils/seedData';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const run = async () => {
  const mongoURI = process.env.MONGO_URI;
  if (!mongoURI) {
    console.error('MONGO_URI is missing in .env');
    process.exit(1);
  }

  try {
    await mongoose.connect(mongoURI);
    console.log('MongoDB connected. Generating extra officers...');

    const baseEmployees = SEED_EMPLOYEES.map(e => ({
      ...e,
      status: 'Active'
    }));

    // Find if we already generated them
    const existing = await Employee.findOne({ EmployeeID: baseEmployees[0].EmployeeID + 20000 });
    if (existing) {
      console.log('Extra officers already exist in the database! Deleting them to start fresh...');
      await Employee.deleteMany({ EmployeeID: { $gte: 30000 } });
    }

    // Generate 1 extra officer per station (so 2 total per station)
    const extraEmployees = baseEmployees.map(e => {
      const newId = e.EmployeeID + 20000;
      return {
        ...e,
        EmployeeID: newId,
        KGID: `KGID${newId}`,
        FirstName: faker.person.fullName(),
        email: `officer${newId}@ksp.gov.in`
      };
    });

    console.log(`Inserting ${extraEmployees.length} extra officers...`);
    await Employee.insertMany(extraEmployees);
    console.log('Done!');
    process.exit(0);
  } catch (err) {
    console.error('Error generating extra officers:', err);
    process.exit(1);
  }
};

run();
