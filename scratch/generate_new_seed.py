import pandas as pd
import json
import random
import math
from datetime import datetime, timedelta
import os

random.seed(42)  # Deterministic seed

# --- 1. Point in Polygon (Ray Casting) ---
def point_in_polygon(point, polygon):
    x, y = point  # x=lon, y=lat
    inside = False
    for i in range(len(polygon)):
        p1x, p1y = polygon[i]
        p2x, p2y = polygon[(i + 1) % len(polygon)]
        if min(p1y, p2y) < y <= max(p1y, p2y) and x <= max(p1x, p2x):
            if p1y != p2y:
                xints = (y - p1y) * (p2x - p1x) / (p2y - p1y) + p1x
            if p1x == p2x or x <= xints:
                inside = not inside
    return inside

def point_in_multipolygon(point, multipolygon):
    for poly in multipolygon:
        if isinstance(poly[0][0], list):
            for ring in poly:
                if point_in_polygon(point, ring): return True
        else:
            if point_in_polygon(point, poly): return True
    return False

# --- 2. Load District Polygons ---
with open('frontend/src/assets/karnataka_districts.geojson', 'r') as f:
    geojson = json.load(f)

districts_geo = {}
for feature in geojson['features']:
    name = feature['properties']['district']
    geom_type = feature['geometry']['type']
    coords = feature['geometry']['coordinates']
    districts_geo[name.lower()] = {'type': geom_type, 'coords': coords}
    all_points = []
    if geom_type == 'Polygon':
        for ring in coords: all_points.extend(ring)
    elif geom_type == 'MultiPolygon':
        for poly in coords:
            for ring in poly: all_points.extend(ring)
    lons = [p[0] for p in all_points]
    lats = [p[1] for p in all_points]
    districts_geo[name.lower()]['bbox'] = (min(lons), max(lons), min(lats), max(lats))

def generate_point_in_district(district_name):
    key = district_name.lower().strip()
    if key not in districts_geo:
        if "bengaluru city" in key or "bengaluru urban" in key: key = "bangalore"
        elif "bengaluru rural" in key: key = "bangalore rural"
        elif "hubballi" in key or "dharwad" in key: key = "dharwad"
        elif "belagavi" in key: key = "belgaum"
        elif "vijayapura" in key: key = "bijapur"
        elif "kalaburagi" in key: key = "gulbarga"
        elif "mangaluru" in key or "dakshina" in key: key = "dakshina kannada"
        elif "mysuru" in key: key = "mysore"
        elif "shivamogga" in key: key = "shimoga"
        elif "tumakuru" in key: key = "tumkur"
        elif "chikkamagaluru" in key: key = "chikmagalur"
        elif "chikkaballapur" in key: key = "chikkaballapura"
        elif "ballari" in key: key = "bellary"
        elif "chamarajanagar" in key: key = "chamrajnagar"
        elif "vijayanagara" in key: key = "bellary" # Approximate to parent
        else: return None
            
    geo = districts_geo[key]
    min_lon, max_lon, min_lat, max_lat = geo['bbox']
    for _ in range(1000):
        lon = random.uniform(min_lon, max_lon)
        lat = random.uniform(min_lat, max_lat)
        if geo['type'] == 'Polygon':
            if point_in_multipolygon((lon, lat), [geo['coords']]): return (lat, lon)
        elif geo['type'] == 'MultiPolygon':
            if point_in_multipolygon((lon, lat), geo['coords']): return (lat, lon)
    return ((min_lat+max_lat)/2, (min_lon+max_lon)/2)

def generate_point_near(lat, lon, max_dist_km):
    deg = max_dist_km / 111.0
    angle = random.uniform(0, 2 * math.pi)
    r = random.uniform(0, deg)
    return lat + r * math.cos(angle), lon + r * math.sin(angle)

# --- 3. Generate Entities ---
df = pd.read_excel('Karnataka_Police_Stations_Synthetic.xlsx')

# Data Corrections as requested
df.loc[df['District'] == 'Bengaluru City', 'District'] = 'Bengaluru Urban'
df.loc[df['District'] == 'Mangaluru', 'District'] = 'Dakshina Kannada'

chit_idx = df[df['District'] == 'Chitradurga'].index
df.loc[chit_idx[15:], 'District'] = 'Davanagere'
df.loc[chit_idx[15:], 'Station Name'] = [f'Davanagere PS {i+1}' for i in range(len(chit_idx[15:]))]

unique_districts = df['District'].unique()
districts = []
district_map = {}
for idx, d_name in enumerate(unique_districts):
    did = 1001 + idx
    districts.append({"DistrictID": did, "DistrictName": str(d_name), "StateID": 1, "Active": True})
    district_map[d_name] = did

units = []
station_ids = []
station_case_weights = {} # Determine how many cases each station gets
for idx, row in df.iterrows():
    uid = 2000 + idx
    did = district_map[row['District']]
    d_name = str(row['District'])
    s_name = str(row['Station Name'])
    
    pt = generate_point_in_district(d_name)
    if not pt:
        # Fallback coordinate
        pt = (15.3173, 75.7139)
    lat, lon = pt
    
    units.append({
        "UnitID": uid, "UnitName": s_name, "TypeID": 1, "ParentUnit": None,
        "NationalityID": 1, "StateID": 1, "DistrictID": did, "Active": True,
        "latitude": lat, "longitude": lon
    })
    station_ids.append(uid)
    # Give stations random weight: Low (10), Med (40), High (100)
    station_case_weights[uid] = random.choices([10, 40, 100], weights=[50, 35, 15])[0]

first_names_male = ["Ramesh", "Suresh", "Vikram", "Anjali", "Priya", "Kiran", "Naveen", "Divya", "Kavitha", "Arjun", "Deepak", "Sneha", "Manoj", "Pradeep", "Lakshmi", "Bhavya", "Harish", "Mohan", "Geetha", "Rajesh"]
last_names = ["Gowda", "Patil", "Shetty", "Rao", "Naidu", "Desai", "Hegde", "Bhat", "Kulkarni", "Joshi", "Murthy", "Nayak", "Pujari", "Reddy"]

def generate_person(pid_prefix, idx):
    fname = random.choice(first_names_male) + " " + random.choice(last_names)
    gender = 1 if fname.split()[0] not in ["Anjali", "Priya", "Divya", "Kavitha", "Sneha", "Lakshmi", "Bhavya", "Geetha"] else 2
    return {
        "PersonID": f"{pid_prefix}-{idx}",
        "Name": fname,
        "GenderID": gender,
        "Age": random.randint(18, 65)
    }

def generate_pool(prefix, total, weights):
    # weights: [single_pct, med_pct, repeat_pct]
    assignments = []
    pid_counter = 1001
    
    while len(assignments) < total:
        acc_type = random.choices(["single", "med", "repeat"], weights=weights)[0]
        
        if acc_type == "single":
            cases_needed = 1
        elif acc_type == "med":
            cases_needed = random.randint(2, 3)
        else:
            cases_needed = random.randint(4, 10)
            
        if len(assignments) + cases_needed > total:
            cases_needed = total - len(assignments)
            
        person = generate_person(prefix, pid_counter)
        pid_counter += 1
        
        for _ in range(cases_needed):
            assignments.append(person)
            
    random.shuffle(assignments)
    return assignments

accused_assignments = generate_pool("A", 5000, [75, 20, 5])
victim_assignments = generate_pool("V", 5000, [90, 8, 2])

# Generate employees (1 per station)
employees = []
eid_counter = 10001
for station in units:
    fname = random.choice(first_names_male) + " " + random.choice(last_names)
    gender = 1 if fname.split()[0] not in ["Anjali", "Priya", "Divya", "Kavitha", "Sneha", "Lakshmi", "Bhavya", "Geetha"] else 2
    employees.append({
        "EmployeeID": eid_counter,
        "DistrictID": station["DistrictID"],
        "UnitID": station["UnitID"],
        "RankID": random.choice([4, 5, 6]), # PSI, PI, DSP
        "DesignationID": random.choice([1, 2]), # IO, SHO
        "KGID": f"KGID{eid_counter}",
        "FirstName": fname,
        "EmployeeDOB": (datetime(1970, 1, 1) + timedelta(days=random.randint(0, 365*25))).strftime("%Y-%m-%d"),
        "GenderID": gender,
        "BloodGroupID": random.randint(1, 8),
        "PhysicallyChallenged": False,
        "AppointmentDate": (datetime(1995, 1, 1) + timedelta(days=random.randint(0, 365*10))).strftime("%Y-%m-%d"),
        "email": f"officer{eid_counter}@ksp.gov.in",
        "status": "Active"
    })
    eid_counter += 1

cases = []
accused_rows = []
victim_rows = []

start_date = datetime(2023, 1, 1)

total_weight = sum(station_case_weights.values())
station_ids_list = list(station_case_weights.keys())
station_weights_list = list(station_case_weights.values())

for i in range(5000):
    cid = 100001 + i
    
    # Weighted choice for station
    uid = random.choices(station_ids_list, weights=station_weights_list, k=1)[0]
    station = next(u for u in units if u["UnitID"] == uid)
    
    crime_date = start_date + timedelta(days=random.randint(0, 365*3))
    
    # Cases within 3km of station
    c_lat, c_lon = generate_point_near(station["latitude"], station["longitude"], 3.0)
    
    # Pick IO from station
    station_officers = [e["EmployeeID"] for e in employees if e["UnitID"] == station["UnitID"]]
    io = station_officers[0] if station_officers else 10001
    
    cases.append({
        "CaseMasterID": cid,
        "CrimeNo": f"CR/{cid}/2026",
        "CaseNo": f"FIR-{cid}",
        "CrimeRegisteredDate": crime_date.strftime("%Y-%m-%d"),
        "PolicePersonID": io,
        "PoliceStationID": station["UnitID"],
        "CaseCategoryID": random.randint(1, 3),
        "GravityOffenceID": random.randint(1, 3),
        "CrimeMajorHeadID": random.choice([100, 200, 300, 400, 500, 600]),
        "CrimeMinorHeadID": random.randint(1, 5),
        "CaseStatusID": random.choices([1, 2, 3, 4, 5], weights=[40, 20, 20, 10, 10])[0],
        "CourtID": 1,
        "IncidentFromDate": (crime_date - timedelta(days=random.randint(0, 10))).strftime("%Y-%m-%d"),
        "IncidentToDate": crime_date.strftime("%Y-%m-%d"),
        "InfoReceivedPSDate": crime_date.strftime("%Y-%m-%d"),
        "latitude": c_lat,
        "longitude": c_lon,
        "BriefFacts": "Generated synthetic crime incident."
    })
    
    # Accused
    acc = accused_assignments[i]
    accused_rows.append({
        "AccusedMasterID": 80001 + len(accused_rows),
        "CaseMasterID": cid,
        "AccusedName": acc["Name"],
        "AgeYear": acc["Age"],
        "GenderID": acc["GenderID"],
        "PersonID": acc["PersonID"]
    })
    
    # Victim
    vic = victim_assignments[i]
    victim_rows.append({
        "VictimMasterID": 70001 + len(victim_rows),
        "CaseMasterID": cid,
        "VictimName": vic["Name"],
        "AgeYear": vic["Age"],
        "GenderID": vic["GenderID"],
        "VictimPolice": "0",
        "PersonID": vic["PersonID"]
    })

ts_output = f"""// AUTO-GENERATED FILE. DO NOT EDIT BY HAND.
// Generated on: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}
// Total Cases: {len(cases)}
// Total Stations: {len(units)}

export const SEED_DISTRICTS = {json.dumps(districts, indent=2)};

export const SEED_UNITS = {json.dumps(units, indent=2)};

export const SEED_EMPLOYEES = {json.dumps(employees, indent=2)};

export const SEED_CASES = {json.dumps(cases, indent=2)};

export const SEED_ACCUSED = {json.dumps(accused_rows, indent=2)};

export const SEED_VICTIMS = {json.dumps(victim_rows, indent=2)};
"""

os.makedirs('backend/scripts/generated', exist_ok=True)
with open('backend/scripts/generated/seedData.ts', 'w', encoding='utf-8') as f:
    f.write(ts_output)

print("Generated backend/scripts/generated/seedData.ts")

# --- Validation Report ---
report = {}
report["FIR count"] = len(cases)
report["station count"] = len(units)
report["district count"] = len(districts)
report["accused record count"] = len(accused_rows)
report["unique accused count"] = len(set([a["PersonID"] for a in accused_rows]))
report["victim record count"] = len(victim_rows)
report["unique victim count"] = len(set([v["PersonID"] for v in victim_rows]))

# Referencial integrity
orphan_station = sum(1 for c in cases if c["PoliceStationID"] not in station_ids)
report["orphan PoliceStationIDs"] = orphan_station
report["orphan DistrictIDs"] = sum(1 for s in units if s["DistrictID"] not in [d["DistrictID"] for d in districts])

# Validate Coordinates and Distance
invalid_coords = 0
out_of_district = 0
distances = []
import math

def haversine(lat1, lon1, lat2, lon2):
    R = 6371.0 # Earth radius km
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat/2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon/2)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c

for c in cases:
    if math.isnan(c["latitude"]) or math.isnan(c["longitude"]) or not (11.0 <= c["latitude"] <= 19.0) or not (74.0 <= c["longitude"] <= 79.0):
        invalid_coords += 1
    st = next(u for u in units if u["UnitID"] == c["PoliceStationID"])
    distances.append(haversine(c["latitude"], c["longitude"], st["latitude"], st["longitude"]))

report["invalid coordinates"] = invalid_coords
report["cases too far from assigned station"] = sum(1 for d in distances if d > 3.5)
report["average FIR -> station distance (km)"] = round(sum(distances) / len(distances), 2) if distances else 0
report["max FIR -> station distance (km)"] = round(max(distances), 2) if distances else 0

# Geographic Distribution
district_cases = {d["DistrictID"]: 0 for d in districts}
station_cases = {u["UnitID"]: 0 for u in units}
for c in cases:
    station_cases[c["PoliceStationID"]] += 1
    st = next(u for u in units if u["UnitID"] == c["PoliceStationID"])
    district_cases[st["DistrictID"]] += 1

report["cases per district (min/max/avg)"] = f"{min(district_cases.values())} / {max(district_cases.values())} / {round(sum(district_cases.values())/len(districts), 1)}"
report["cases per station (min/max/avg)"] = f"{min(station_cases.values())} / {max(station_cases.values())} / {round(sum(station_cases.values())/len(units), 1)}"

report["stations with 0 cases"] = sum(1 for c in station_cases.values() if c == 0)
report["stations with 1-5 cases"] = sum(1 for c in station_cases.values() if 1 <= c <= 5)
report["stations with 6-25 cases"] = sum(1 for c in station_cases.values() if 6 <= c <= 25)
report["stations with 26-60 cases"] = sum(1 for c in station_cases.values() if 26 <= c <= 60)
report["stations with 61+ cases"] = sum(1 for c in station_cases.values() if c >= 61)

# Station Coordinate Uniqueness
coord_groups = {}
for u in units:
    c_key = (round(u["latitude"], 4), round(u["longitude"], 4))
    coord_groups[c_key] = coord_groups.get(c_key, 0) + 1

report["unique coordinate pairs"] = len(coord_groups)
duplicate_groups = {k: v for k, v in coord_groups.items() if v > 1}
report["duplicate coordinate groups"] = len(duplicate_groups)
report["largest duplicate group size"] = max(duplicate_groups.values()) if duplicate_groups else 0

# Repeat offenders
acc_counts = {}
for a in accused_rows:
    acc_counts[a["PersonID"]] = acc_counts.get(a["PersonID"], 0) + 1

first_time = sum(1 for c in acc_counts.values() if c == 1)
med_time = sum(1 for c in acc_counts.values() if 2 <= c <= 3)
repeat_time = sum(1 for c in acc_counts.values() if c >= 4)

report["unique accused distribution"] = {
    "exactly 1 FIR": first_time,
    "2-3 FIRs": med_time,
    "4+ FIRs": repeat_time
}

first_time_assignments = sum(c for c in acc_counts.values() if c == 1)
med_time_assignments = sum(c for c in acc_counts.values() if 2 <= c <= 3)
repeat_time_assignments = sum(c for c in acc_counts.values() if c >= 4)
total_a = len(accused_rows)

report["FIR assignment distribution"] = {
    "first-time offenders": f"{round(first_time_assignments/total_a*100, 1)}%",
    "2-3 case offenders": f"{round(med_time_assignments/total_a*100, 1)}%",
    "4+ case offenders": f"{round(repeat_time_assignments/total_a*100, 1)}%"
}

sorted_acc = sorted(acc_counts.items(), key=lambda x: x[1], reverse=True)
report["top 20 repeat offenders"] = sorted_acc[:20]

# Repeat victims
vic_counts = {}
for v in victim_rows:
    vic_counts[v["PersonID"]] = vic_counts.get(v["PersonID"], 0) + 1

v_first_time = sum(1 for c in vic_counts.values() if c == 1)
v_med_time = sum(1 for c in vic_counts.values() if 2 <= c <= 3)
v_repeat_time = sum(1 for c in vic_counts.values() if c >= 4)
report["first-time victim count"] = v_first_time
report["2-3 case victim count"] = v_med_time
report["4+ case victim count"] = v_repeat_time

sorted_vic = sorted(vic_counts.items(), key=lambda x: x[1], reverse=True)
report["top 20 repeat victims"] = sorted_vic[:20]

# Determinism / Identity consistency
inconsistent = 0
person_dict = {}
for a in accused_rows:
    pid = a["PersonID"]
    identity = f"{a['AccusedName']}|{a['AgeYear']}|{a['GenderID']}"
    if pid in person_dict and person_dict[pid] != identity:
        inconsistent += 1
    person_dict[pid] = identity
for v in victim_rows:
    pid = v["PersonID"]
    identity = f"{v['VictimName']}|{v['AgeYear']}|{v['GenderID']}"
    if pid in person_dict and person_dict[pid] != identity:
        inconsistent += 1
    person_dict[pid] = identity
report["inconsistent identity cases"] = inconsistent

with open('scratch/validation_report.json', 'w') as f:
    json.dump(report, f, indent=2)

print("Validation complete.")
