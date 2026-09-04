const fs = require('fs');
const path = require('path');

const SEED_DATA_PATH = 'e:/study/Project/datathon--code+base/datathon2/backend/dist/seedData.json';
const seedData = JSON.parse(fs.readFileSync(SEED_DATA_PATH, 'utf8'));
const allUnits = seedData.SEED_UNITS;

const TARGET_DISTRICTS = [1001, 1003, 1004]; // Blr, Mysuru, Mangaluru
const targetUnits = allUnits.filter(u => TARGET_DISTRICTS.includes(Number(u.DistrictID)) && u.latitude != null);

// Data pools
const FIRST_NAMES_MALE = ['Rahul', 'Rajesh', 'Suresh', 'Manjunath', 'Karthik', 'Sanjay', 'Darshan', 'Ganesh', 'Arun', 'Prakash'];
const FIRST_NAMES_FEMALE = ['Pooja', 'Kavya', 'Shruthi', 'Ramya', 'Lakshmi', 'Nandini', 'Shilpa', 'Geetha', 'Meghana', 'Asha'];
const LAST_NAMES = ['Gowda', 'Kumar', 'Rao', 'Shetty', 'Patil', 'Nayak', 'Bhat', 'Hegde', 'Murthy', 'Reddy'];

const CRIME_TYPES = [
    { headId: 200, headName: 'Property', catId: 2, catName: 'Theft', gravId: 4, acts: ['379 IPC', '380 IPC'], factTemplates: [
        'Stolen two-wheeler parked outside residence at night.',
        'Gold ornaments worth 2 lakhs stolen from locked house.',
        'Mobile phone snatched by bike-borne miscreants near bus stop.',
        'Cash and laptop missing from PG accommodation.'
    ]},
    { headId: 100, headName: 'Body', catId: 1, catName: 'Assault', gravId: 2, acts: ['324 IPC', '307 IPC', '323 IPC'], factTemplates: [
        'Victim attacked with iron rod over property dispute.',
        'Drunken brawl outside bar led to severe injuries to the victim.',
        'Domestic violence case involving physical assault on spouse.',
        'Street fight resulted in stabbing incident.'
    ]},
    { headId: 400, headName: 'Economic', catId: 4, catName: 'Fraud', gravId: 3, acts: ['420 IPC', '406 IPC'], factTemplates: [
        'Job fraud - took money promising government employment.',
        'Online OTP scam leading to loss of 5 lakhs from bank account.',
        'Investment fraud promising high returns in short time.'
    ]}
];

// Helper functions
const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const randElem = (arr) => arr[Math.floor(Math.random() * arr.length)];
const randName = (isMale) => `${randElem(isMale ? FIRST_NAMES_MALE : FIRST_NAMES_FEMALE)} ${randElem(LAST_NAMES)}`;

// Jitter coordinates to simulate incidents within station jurisdiction
const jitterCoord = (base, isLat) => {
    // 0.01 deg is approx 1km. Jitter by +/- 0.02 (2km)
    const jitter = (Math.random() - 0.5) * 0.04;
    return Number(base) + jitter;
};

const generateDryRun = () => {
    let currentCaseId = 111001;
    let currentAccusedId = 91001;
    let currentVictimId = 81001;
    let currentCompId = 71001;
    let currentActId = 61001;

    const sampleDate = '2026-09-02T14:30:00Z'; // Just for dry run display

    const cases = [];
    const accused = [];
    const victims = [];
    const complainants = [];
    const acts = [];

    for (let i = 0; i < 5; i++) {
        const unit = randElem(targetUnits);
        const crime = randElem(CRIME_TYPES);
        const statusId = randElem([1, 1, 2, 3]); // 50% Inv, 25% Charge, 25% Closed

        const caseId = currentCaseId++;
        
        // 1. Case
        cases.push({
            CaseMasterID: caseId,
            CaseNo: `${String(i+1).padStart(4, '0')}/2026`,
            CrimeNo: `CR-${String(i+1).padStart(4, '0')}/2026`,
            PoliceStationID: unit.UnitID,
            DistrictID: unit.DistrictID,
            CrimeRegisteredDate: sampleDate,
            CrimeRegisteredDateTime: sampleDate,
            CrimeMajorHeadID: crime.headId,
            CaseCategoryID: crime.catId,
            GravityOffenceID: crime.gravId,
            CaseStatusID: statusId,
            latitude: jitterCoord(unit.latitude, true),
            longitude: jitterCoord(unit.longitude, false),
            BriefFacts: randElem(crime.factTemplates)
        });

        // 2. Accused
        const numAccused = randInt(1, 2);
        for(let a=0; a<numAccused; a++) {
            const isMale = Math.random() > 0.1; // 90% male
            accused.push({
                AccusedMasterID: currentAccusedId++,
                CaseMasterID: caseId,
                AccusedName: randName(isMale),
                AgeYear: randInt(20, 50),
                GenderID: isMale ? 1 : 2,
                PersonID: `P-A-${currentAccusedId}`
            });
        }

        // 3. Victims
        const numVictims = randInt(1, 2);
        for(let v=0; v<numVictims; v++) {
            const isMale = Math.random() > 0.4;
            victims.push({
                VictimMasterID: currentVictimId++,
                CaseMasterID: caseId,
                VictimName: randName(isMale),
                AgeYear: randInt(20, 60),
                GenderID: isMale ? 1 : 2,
                PersonID: `P-V-${currentVictimId}`
            });
        }

        // 4. Complainant
        const isMaleC = Math.random() > 0.3;
        complainants.push({
            ComplainantID: currentCompId++,
            CaseMasterID: caseId,
            ComplainantName: randName(isMaleC),
            AgeYear: randInt(25, 65),
            GenderID: isMaleC ? 1 : 2
        });

        // 5. Acts
        const numActs = randInt(1, 2);
        for(let a=0; a<numActs; a++) {
            acts.push({
                CaseActSectionID: currentActId++,
                CaseMasterID: caseId,
                Act_Section: randElem(crime.acts)
            });
        }
    }

    fs.writeFileSync('e:/study/Project/datathon--code+base/datathon2/scratch/dry_run_sample.json', JSON.stringify({
        cases, accused, victims, complainants, acts
    }, null, 2));
    
    console.log("Dry run sample generated successfully.");
}

generateDryRun();
