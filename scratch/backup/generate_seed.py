import pandas as pd
import json
import random
from datetime import datetime, timedelta

def generate_seed_data():
    df = pd.read_excel('Karnataka_Police_Stations_Synthetic.xlsx')
    
    # 1. Generate Districts Map
    unique_districts = df['District'].unique()
    districts = []
    district_map = {}
    
    for idx, d_name in enumerate(unique_districts):
        did = 1001 + idx
        districts.append({
            "DistrictID": did,
            "DistrictName": str(d_name),
            "StateID": 1,
            "Active": True
        })
        district_map[d_name] = did
        
    DISTRICT_COORDS = {
        'Bengaluru City': (12.9716, 77.5946),
        'Bengaluru Rural': (13.2000, 77.5000),
        'Mysuru': (12.2958, 76.6394),
        'Mangaluru': (12.9141, 74.8560),
        'Belagavi': (15.8497, 74.4977),
        'Dharwad': (15.4589, 75.0078),
        'Kalaburagi': (17.3297, 76.8343),
        'Ballari': (15.1394, 76.9214),
        'Vijayapura': (16.8302, 75.7100),
        'Bagalkot': (16.1817, 75.6958),
        'Shivamogga': (13.9299, 75.5681),
        'Hassan': (13.0033, 76.1004),
        'Tumakuru': (13.3379, 77.1173),
        'Mandya': (12.5218, 76.8951),
        'Udupi': (13.3409, 74.7421),
        'Kodagu': (12.3375, 75.8069),
        'Raichur': (16.2076, 77.3463),
        'Koppal': (15.3465, 76.1554),
        'Haveri': (14.7951, 75.4011),
        'Gadag': (15.4300, 75.6333),
        'Chikkamagaluru': (13.3161, 75.7720),
        'Chitradurga': (14.2251, 76.3980),
        'Kolar': (13.1367, 78.1291),
        'Ramanagara': (12.7150, 77.2812),
        'Bidar': (17.9104, 77.5199),
        'Yadgir': (16.7667, 77.1333),
        'Chamarajanagar': (11.9261, 76.9400),
        'Uttara Kannada': (14.8055, 74.1333),
        'Dakshina Kannada': (12.8631, 75.2505),
        'Vijayanagara': (15.2750, 76.3900),
        'Chikkaballapur': (13.4325, 77.7275)
    }

    # 2. Generate Stations
    units = []
    station_ids = []
        
    for idx, row in df.iterrows():
        uid = 2000 + idx
        did = district_map[row['District']]
        station_name = str(row['Station Name'])
        base_lat, base_lon = DISTRICT_COORDS.get(row['District'], (15.3173, 75.7139))
        
        # Spread stations realistically across the entire district to reach borders
        # 1 degree is approx 111km. District radius is typically 40-60km (~0.35 - 0.5 degrees).
        coastal = ['Udupi', 'Mangaluru', 'Uttara Kannada', 'Dakshina Kannada']
        
        # Determine jitter based on coastal or inland
        if row['District'] in coastal:
            # Coastal districts are bounded by the Arabian Sea to the west.
            # We push longitude to the East only to avoid spawning in the ocean.
            lat_jitter = random.uniform(-0.08, 0.08)
            lng_jitter = random.uniform(0.01, 0.15) 
        else:
            lat_jitter = random.uniform(-0.08, 0.08)
            lng_jitter = random.uniform(-0.08, 0.08)
            
        lat = base_lat + lat_jitter
        lng = base_lon + lng_jitter

        units.append({
            "UnitID": uid,
            "UnitName": str(row['Station Name']),
            "TypeID": 1,
            "ParentUnit": None,
            "NationalityID": 1,
            "StateID": 1,
            "DistrictID": did,
            "Active": True,
            "latitude": lat,
            "longitude": lng
        })
        station_ids.append(uid)
        
    # 3. Generate Officers
    employees = []
    officer_ids = []
    
    first_names = ["Ramesh", "Suresh", "Vikram", "Anjali", "Priya", "Kiran", "Naveen", "Divya", "Kavitha", "Arjun", "Deepak", "Sneha", "Manoj", "Pradeep", "Lakshmi", "Bhavya", "Harish", "Mohan", "Geetha", "Rajesh"]
    last_names = ["Gowda", "Patil", "Shetty", "Rao", "Naidu", "Desai", "Hegde", "Bhat", "Kulkarni", "Joshi", "Murthy", "Nayak", "Pujari", "Reddy"]
    
    # Generate at least 1 officer for every station
    eid_counter = 10001
    for station in units:
        fname = random.choice(first_names) + " " + random.choice(last_names)
        
        employees.append({
            "EmployeeID": eid_counter,
            "DistrictID": station["DistrictID"],
            "UnitID": station["UnitID"],
            "RankID": random.choice([4, 5, 6]), # PSI, PI, DSP
            "DesignationID": random.choice([1, 2]), # IO, SHO
            "KGID": f"KGID{eid_counter}",
            "FirstName": fname,
            "EmployeeDOB": (datetime(1970, 1, 1) + timedelta(days=random.randint(0, 365*25))).strftime("%Y-%m-%d"),
            "GenderID": 1 if fname.split()[0] not in ["Anjali", "Priya", "Divya", "Kavitha", "Sneha", "Lakshmi", "Bhavya", "Geetha"] else 2,
            "BloodGroupID": random.randint(1, 8),
            "PhysicallyChallenged": False,
            "AppointmentDate": (datetime(2000, 1, 1) + timedelta(days=random.randint(0, 365*20))).strftime("%Y-%m-%d"),
            "email": f"officer{eid_counter}@ksp.gov.in",
            "status": "Active"
        })
        officer_ids.append(eid_counter)
        eid_counter += 1
        
    # 4. Generate FIRs
    cases = []
    
    start_date = datetime(2023, 1, 1)
    
    for i in range(5000):
        cid = 100001 + i
        station = random.choice(units)
        # Find officers in this station
        station_officers = [e["EmployeeID"] for e in employees if e["UnitID"] == station["UnitID"]]
        officer_id = random.choice(station_officers) if station_officers else random.choice(officer_ids)
        
        crime_date = start_date + timedelta(days=random.randint(0, 365*3))
        
        cases.append({
            "CaseMasterID": cid,
            "CrimeNo": f"CR/{cid}/2026",
            "CaseNo": f"FIR-{cid}",
            "CrimeRegisteredDate": crime_date.strftime("%Y-%m-%d"),
            "PolicePersonID": officer_id,
            "PoliceStationID": station["UnitID"],
            "CaseCategoryID": random.randint(1, 3),
            "GravityOffenceID": random.randint(1, 3),
            "CrimeMajorHeadID": random.choice([100, 200, 300, 400, 500, 600]),
            "CrimeMinorHeadID": random.randint(1, 5),
            "CaseStatusID": random.choices([1, 2, 3, 4, 5], weights=[40, 20, 20, 10, 10])[0], # Mostly Open/Under Inv
            "CourtID": 1,
            "IncidentFromDate": (crime_date - timedelta(days=random.randint(0, 10))).strftime("%Y-%m-%d"),
            "IncidentToDate": crime_date.strftime("%Y-%m-%d"),
            "InfoReceivedPSDate": crime_date.strftime("%Y-%m-%d"),
            "latitude": station["latitude"] + random.uniform(-0.02, 0.02),
            "longitude": station["longitude"] + random.uniform(-0.02, 0.02),
            "BriefFacts": "Generated synthetic crime incident."
        })
        
    # Write to seedData.ts
    with open('frontend/src/utils/seedData.ts', 'w', encoding='utf-8') as f:
        f.write("// AUTO-GENERATED SEED DATA FROM EXCEL\n")
        f.write("import { DistrictRow, UnitRow, EmployeeRow, CaseMasterRow } from './mockDb';\n\n")
        f.write(f"export const SEED_DISTRICTS: DistrictRow[] = {json.dumps(districts, indent=2)};\n\n")
        f.write(f"export const SEED_UNITS: UnitRow[] = {json.dumps(units, indent=2)};\n\n")
        f.write(f"export const SEED_EMPLOYEES: EmployeeRow[] = {json.dumps(employees, indent=2)};\n\n")
        f.write(f"export const SEED_CASES: CaseMasterRow[] = {json.dumps(cases, indent=2)};\n\n")

if __name__ == "__main__":
    print("Generating seedData.ts...")
    generate_seed_data()
    print("Done!")
