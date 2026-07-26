import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { faker } from '@faker-js/faker';
import { CaseMaster, Victim, Accused, CustomEdge } from '../src/models';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const generateData = async () => {
  const mongoURI = process.env.MONGO_URI;
  if (!mongoURI) {
    console.error('MONGO_URI is missing');
    process.exit(1);
  }

  try {
    await mongoose.connect(mongoURI);
    console.log('MongoDB connected. Generating Victims and Accused for 5000 cases...');

    // Delete existing to prevent duplicates if run multiple times
    console.log('Clearing existing victims/accused/edges...');
    await Victim.deleteMany({});
    await Accused.deleteMany({});
    await CustomEdge.deleteMany({});

    // Fetch all cases
    const cases = await CaseMaster.find().select('CaseMasterID CaseNo').lean();
    console.log(`Found ${cases.length} cases.`);

    const victimsToInsert = [];
    const accusedToInsert = [];
    const edgesToInsert = [];

    let victimIdCounter = 1;
    let accusedIdCounter = 1;

const MALE_NAMES = ["Darshan", "Puneeth", "Sudeep", "Yash", "Ganesh", "Upendra", "Shivaraj", "Rishab", "Rakshit", "Kiran", "Chethan", "Praveen", "Karthik", "Sanjay", "Manjunath", "Basavaraj", "Naveen", "Santosh", "Vijay", "Kumar", "Ramesh", "Suresh", "Manoj", "Pradeep", "Ashok"];
const FEMALE_NAMES = ["Radhika", "Ramya", "Rashmika", "Ashika", "Rachita", "Amulya", "Hariprriya", "Srinidhi", "Kriti", "Shruti", "Pooja", "Bhavana", "Deepa", "Kavya", "Nandini", "Shilpa", "Geetha", "Vidya", "Asha", "Meena", "Roopa", "Anusha", "Divya", "Swathi", "Priyanka"];
const LAST_NAMES = ["Gowda", "Shetty", "Patil", "Hegde", "Rao", "Bhat", "Desai", "Kulkarni", "Naidu", "Reddy", "Kumar", "Hiremath", "Nayak", "Pujar", "Kamat", "Shenoy", "Prabhu", "Acharya", "Joshi", "Murthy"];

const getKarnatakanName = (gender: number) => {
  const firstNames = gender === 1 ? MALE_NAMES : FEMALE_NAMES;
  const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
  const lastName = LAST_NAMES[Math.floor(Math.random() * LAST_NAMES.length)];
  return `${firstName} ${lastName}`;
};

    console.log('Generating dummy data in memory with unique Karnatakan names...');
    for (const c of cases) {
      // 1 Victim
      const vId = victimIdCounter++;
      const vAge = Math.floor(Math.random() * 50) + 18; // 18 to 67
      const vGender = Math.floor(Math.random() * 2) + 1; // 1 or 2
      const vName = getKarnatakanName(vGender);
      
      victimsToInsert.push({
        VictimMasterID: vId,
        CaseMasterID: c.CaseMasterID,
        VictimName: vName,
        AgeYear: vAge,
        GenderID: vGender,
        VictimPolice: "0"
      });

      // 1 Accused
      const aId = accusedIdCounter++;
      const aAge = Math.floor(Math.random() * 45) + 18; // 18 to 62
      const aGender = Math.floor(Math.random() * 2) + 1; // 1 or 2
      const aName = getKarnatakanName(aGender);
      
      accusedToInsert.push({
        AccusedMasterID: aId,
        CaseMasterID: c.CaseMasterID,
        AccusedName: aName,
        AgeYear: aAge,
        GenderID: aGender,
        PersonID: `A${aId}`
      });

      // 2 Edges for the graph
      edgesToInsert.push({
        EdgeID: `case-${c.CaseMasterID}-victim-${vId}`,
        CaseMasterID: c.CaseMasterID,
        source: `case-${c.CaseMasterID}`,
        target: `victim-${vId}`,
        label: 'Victim'
      });
      edgesToInsert.push({
        EdgeID: `case-${c.CaseMasterID}-accused-${aId}`,
        CaseMasterID: c.CaseMasterID,
        source: `case-${c.CaseMasterID}`,
        target: `accused-${aId}`,
        label: 'Accused'
      });
    }

    console.log(`Inserting ${victimsToInsert.length} victims...`);
    // Insert in batches
    const batchSize = 2000;
    for (let i = 0; i < victimsToInsert.length; i += batchSize) {
      await Victim.insertMany(victimsToInsert.slice(i, i + batchSize));
    }

    console.log(`Inserting ${accusedToInsert.length} accused...`);
    for (let i = 0; i < accusedToInsert.length; i += batchSize) {
      await Accused.insertMany(accusedToInsert.slice(i, i + batchSize));
    }

    console.log(`Inserting ${edgesToInsert.length} edges...`);
    for (let i = 0; i < edgesToInsert.length; i += batchSize) {
      await CustomEdge.insertMany(edgesToInsert.slice(i, i + batchSize));
    }

    console.log('Successfully generated all victims, accused, and network edges!');
    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
};

generateData();
