async function run() {
    // @ts-ignore
    const { SEED_DISTRICTS, SEED_EMPLOYEES, SEED_ACCUSED, SEED_VICTIMS, SEED_COMPLAINANTS } = require('./generated/seedData.ts');

    console.log("--- 1. Checking Districts Table ---");
    const mangaluruDistricts = SEED_DISTRICTS.filter((d: any) => 
        String(d.DistrictName).toLowerCase() === 'mangaluru' || 
        String(d.DistrictName).includes('Mangaluru')
    );
    console.log(`Total Districts: ${SEED_DISTRICTS.length}`);
    console.log(`Districts with 'Mangaluru' in DistrictName: ${mangaluruDistricts.length}`);
    if (mangaluruDistricts.length > 0) {
        console.log("Found:", mangaluruDistricts);
    }
    console.log("All current district names in the table:");
    console.log(SEED_DISTRICTS.map((d: any) => d.DistrictName).join(', '));

    console.log("\n--- 2. Checking Employees Table ---");
    let count = 0;
    for (const e of SEED_EMPLOYEES) {
        if (e.District && (String(e.District).toLowerCase() === 'mangaluru' || String(e.District).includes('Mangaluru'))) {
            count++;
        }
    }
    console.log(`Total Employees: ${SEED_EMPLOYEES.length}, Found Mangaluru in District field: ${count}`);

    console.log("\n--- Checking Victims Table ---");
    count = 0;
    for (const e of SEED_VICTIMS) {
        if (e.District && (String(e.District).toLowerCase() === 'mangaluru' || String(e.District).includes('Mangaluru'))) {
            count++;
        }
    }
    console.log(`Total Victims: ${SEED_VICTIMS.length}, Found Mangaluru in District field: ${count}`);

    console.log("\n--- Checking Accuseds Table ---");
    count = 0;
    for (const e of SEED_ACCUSED) {
        if (e.District && (String(e.District).toLowerCase() === 'mangaluru' || String(e.District).includes('Mangaluru'))) {
            count++;
        }
    }
    console.log(`Total Accuseds: ${SEED_ACCUSED.length}, Found Mangaluru in District field: ${count}`);

    console.log("\n--- Checking Complainants Table ---");
    count = 0;
    for (const e of SEED_COMPLAINANTS) {
        if (e.District && (String(e.District).toLowerCase() === 'mangaluru' || String(e.District).includes('Mangaluru'))) {
            count++;
        }
    }
    console.log(`Total Complainants: ${SEED_COMPLAINANTS.length}, Found Mangaluru in District field: ${count}`);
}

run();
