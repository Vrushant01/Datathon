import catalyst from 'zcatalyst-sdk-node';
import * as dotenv from 'dotenv';
dotenv.config({ path: '../.env' });

// @ts-ignore
const app = catalyst.initialize();
const nosql = app.zcql();

async function checkState() {
    try {
        console.log("Checking DB state...");
        
        // 1. Check seeded units
        const newUnitsQuery = await nosql.executeZCQLQuery("SELECT * FROM units WHERE UnitID >= 2931");
        console.log(`Seeded Units found (>=2931): ${newUnitsQuery.length}`);
        
        // 2. Check seeded cases
        const newCasesQuery = await nosql.executeZCQLQuery("SELECT * FROM casemasters WHERE CaseMasterID >= 110001");
        console.log(`Seeded Cases found (>=110001): ${newCasesQuery.length}`);
        
        // 3. Check relabeling (units currently in Davanagere vs Dakshina Kannada)
        const davanagereUnits = await nosql.executeZCQLQuery("SELECT * FROM units WHERE DistrictID = 1004");
        const dkUnits = await nosql.executeZCQLQuery("SELECT * FROM units WHERE DistrictID = 1029");
        
        console.log(`Units in Davanagere (1004): ${davanagereUnits.length}`);
        console.log(`Units in Dakshina Kannada (1029): ${dkUnits.length}`);
        
        // Also let's check a specific known relabeled unit like 2090
        const unit2090 = await nosql.executeZCQLQuery("SELECT DistrictID FROM units WHERE UnitID = 2090");
        if(unit2090.length > 0) {
            console.log(`Unit 2090 currently has DistrictID: ${unit2090[0].units.DistrictID}`);
        } else {
            console.log(`Unit 2090 not found`);
        }
        
    } catch (e) {
        console.error("Error querying DB:", e);
    }
}

checkState();
