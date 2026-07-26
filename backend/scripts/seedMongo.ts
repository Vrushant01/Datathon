import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { faker } from '@faker-js/faker';
import { State, District, UnitType, Unit, Employee, CaseMaster, Victim, Accused, CustomEdge } from '../src/models';

// Import seed data manually from frontend utils
import { SEED_DISTRICTS, SEED_UNITS, SEED_EMPLOYEES, SEED_CASES } from '../../frontend/src/utils/seedData';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const seedDB = async () => {
  const mongoURI = process.env.MONGO_URI;
  if (!mongoURI) {
    console.error('MONGO_URI is missing in .env');
    process.exit(1);
  }

  try {
    await mongoose.connect(mongoURI);
    console.log('MongoDB connected for seeding...');

    // Clear existing data
    console.log('Clearing old collections...');
    await Promise.all([
      District.deleteMany({}),
      Unit.deleteMany({}),
      Employee.deleteMany({}),
      CaseMaster.deleteMany({}),
      Victim.deleteMany({}),
      Accused.deleteMany({}),
    ]);

    console.log('Inserting Districts...');
    await District.insertMany(SEED_DISTRICTS);

    console.log('Inserting Units...');
    await Unit.insertMany(SEED_UNITS);

    console.log('Inserting Employees...');
    const baseEmployees = SEED_EMPLOYEES.map(e => ({
      ...e,
      status: 'Active'
    }));
    
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
    
    await Employee.insertMany([...baseEmployees, ...extraEmployees]);

    console.log('Inserting Cases...');
    // Seed cases in batches of 1000
    const batchSize = 1000;
    for (let i = 0; i < SEED_CASES.length; i += batchSize) {
      const batch = SEED_CASES.slice(i, i + batchSize);
      await CaseMaster.insertMany(batch);
      console.log(`Inserted cases ${i} to ${i + batch.length}`);
    }

    console.log('MongoDB Seed complete!');
    process.exit(0);
  } catch (err) {
    console.error('Error during MongoDB seeding:', err);
    process.exit(1);
  }
};

seedDB();
