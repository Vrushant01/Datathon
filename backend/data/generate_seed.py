import pandas as pd
import json
import random
import math
from datetime import datetime, timedelta
import os

random.seed(42)  # Deterministic seed


# --- District socio-economic profiles (informs crime-type mix + case volume) ---
# urbanization_score: 0-100, population_density: low/medium/high
DISTRICT_URBANIZATION = {
    "Bengaluru City":     {"urbanization_score": 95, "population_density": "high"},
    "Bengaluru Rural":    {"urbanization_score": 55, "population_density": "medium"},
    "Mysuru":             {"urbanization_score": 68, "population_density": "high"},
    "Davanagere":          {"urbanization_score": 55, "population_density": "medium"},
    "Dakshina Kannada":   {"urbanization_score": 65, "population_density": "medium"},
    "Udupi":              {"urbanization_score": 60, "population_density": "medium"},
    "Dharwad":            {"urbanization_score": 62, "population_density": "medium"},
    "Belagavi":           {"urbanization_score": 50, "population_density": "medium"},
    "Ballari":            {"urbanization_score": 48, "population_density": "medium"},
    "Vijayanagara":       {"urbanization_score": 40, "population_density": "medium"},
    "Vijayapura":         {"urbanization_score": 42, "population_density": "medium"},
    "Kalaburagi":         {"urbanization_score": 45, "population_density": "medium"},
    "Bidar":              {"urbanization_score": 38, "population_density": "low"},
    "Yadgir":             {"urbanization_score": 25, "population_density": "low"},
    "Raichur":            {"urbanization_score": 30, "population_density": "low"},
    "Koppal":             {"urbanization_score": 28, "population_density": "low"},
    "Bagalkot":           {"urbanization_score": 35, "population_density": "low"},
    "Chitradurga":        {"urbanization_score": 38, "population_density": "medium"},
    "Tumakuru":           {"urbanization_score": 45, "population_density": "medium"},
    "Kolar":              {"urbanization_score": 40, "population_density": "medium"},
    "Chikkaballapur":     {"urbanization_score": 38, "population_density": "medium"},
    "Ramanagara":         {"urbanization_score": 42, "population_density": "medium"},
    "Mandya":             {"urbanization_score": 40, "population_density": "medium"},
    "Hassan":             {"urbanization_score": 42, "population_density": "medium"},
    "Chikkamagaluru":     {"urbanization_score": 35, "population_density": "low"},
    "Kodagu":             {"urbanization_score": 30, "population_density": "low"},
    "Shivamogga":         {"urbanization_score": 45, "population_density": "medium"},
    "Haveri":             {"urbanization_score": 35, "population_density": "low"},
    "Gadag":              {"urbanization_score": 33, "population_density": "low"},
    "Uttara Kannada":     {"urbanization_score": 32, "population_density": "low"},
    "Chamarajanagar":     {"urbanization_score": 28, "population_density": "low"},
}

# --- Crime-type weight tiers, keyed by urbanization bracket ---
# Same 10 categories used across the codebase.
TIER_CRIME_WEIGHTS = {
    "metro": {   # urbanization_score >= 85
        "Cyber Crime": 22, "Fraud": 18, "Theft": 15, "Assault": 10,
        "Extortion": 8, "Public Nuisance": 10, "Burglary": 8,
        "Narcotics": 5, "Kidnapping": 2, "Homicide": 2,
    },
    "high": {    # 60 <= score < 85
        "Cyber Crime": 15, "Fraud": 15, "Theft": 18, "Burglary": 12,
        "Assault": 12, "Extortion": 6, "Public Nuisance": 10,
        "Narcotics": 6, "Kidnapping": 3, "Homicide": 3,
    },
    "medium": {  # 40 <= score < 60
        "Theft": 20, "Burglary": 16, "Assault": 15, "Cyber Crime": 8,
        "Fraud": 10, "Extortion": 5, "Public Nuisance": 10,
        "Narcotics": 8, "Kidnapping": 4, "Homicide": 4,
    },
    "low": {     # score < 40
        "Theft": 18, "Burglary": 14, "Assault": 18, "Cyber Crime": 4,
        "Fraud": 6, "Extortion": 4, "Public Nuisance": 8,
        "Narcotics": 10, "Kidnapping": 6, "Homicide": 6,
    },
}

def _tier_for(score: int) -> str:
    if score >= 85: return "metro"
    if score >= 60: return "high"
    if score >= 40: return "medium"
    return "low"

DISTRICT_PROFILES = {
    name: {
        **info,
        "crime_type_weights": TIER_CRIME_WEIGHTS[_tier_for(info["urbanization_score"])],
    }
    for name, info in DISTRICT_URBANIZATION.items()
}



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
        elif "dakshina" in key: key = "dakshina kannada"
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

# Phase 1 Temporal Fix: Use UTC NOW and dense distributions
NOW = datetime.utcnow()

total_weight = sum(station_case_weights.values())
station_ids_list = list(station_case_weights.keys())
station_weights_list = list(station_case_weights.values())

# --- SCENARIO GENERATION ---
num_scenarios = 200
scenarios = []
scenario_types = ["short_spike", "sustained_spike", "gradual_increase", "repeat_offender", "night_concentration"]

for i in range(num_scenarios):
    s_type = random.choice(scenario_types)
    uid = random.choice(station_ids_list)
    ch = random.choice([100, 200, 300, 400, 500, 600])
    days_ago_start = random.uniform(30, 350)
    
    if s_type == "short_spike":
        days_ago_end = days_ago_start - 7
        count = int(random.uniform(8, 20))
    elif s_type == "sustained_spike":
        days_ago_end = days_ago_start - 14
        count = int(random.uniform(15, 30))
    elif s_type == "gradual_increase":
        days_ago_end = days_ago_start - 21
        count = int(random.uniform(20, 35))
    elif s_type == "repeat_offender":
        days_ago_end = days_ago_start - 7
        count = int(random.uniform(10, 22))
        ch = 100 
    elif s_type == "night_concentration":
        days_ago_end = days_ago_start - 7
        count = int(random.uniform(12, 25))
        ch = 200 
    
    scenarios.append({
        "scenario_id": f"SCN-{i+1}",
        "scenario_type": s_type,
        "station_id": uid,
        "crime_head": ch,
        "days_ago_start": days_ago_start,
        "days_ago_end": days_ago_end,
        "count": count
    })

# Build all case parameters
case_params = []

# 1. Add background cases
for _ in range(5000):
    uid = random.choices(station_ids_list, weights=station_weights_list, k=1)[0]
    r = random.random()
    if r < 0.05: days_ago = random.uniform(0, 1)
    elif r < 0.30: days_ago = random.uniform(1, 7)
    elif r < 0.60: days_ago = random.uniform(7, 30)
    else: days_ago = random.uniform(30, 730)
    case_params.append({
        "uid": uid,
        "major_head_id": random.choice([100, 200, 300, 400, 500, 600]),
        "days_ago": days_ago,
        "scenario": None
    })

# 2. Add scenario cases AND baseline support cases
for scn in scenarios:
    # Inject baseline support cases (4 weeks before the spike) to satisfy minHistoryWindows
    for w in range(1, 5):
        d_ago = scn["days_ago_start"] + (w * 7) + random.uniform(0, 6)
        case_params.append({
            "uid": scn["station_id"],
            "major_head_id": scn["crime_head"],
            "days_ago": d_ago,
            "scenario": None
        })
        
    for _ in range(scn["count"]):
        d_ago = random.uniform(scn["days_ago_end"], scn["days_ago_start"])
        case_params.append({
            "uid": scn["station_id"],
            "major_head_id": scn["crime_head"],
            "days_ago": d_ago,
            "scenario": scn
        })

random.shuffle(case_params)

yearly_serials = {}

for i, p in enumerate(case_params):
    cid = 100001 + i
    uid = p["uid"]
    station = next(u for u in units if u["UnitID"] == uid)
    major_head_id = p["major_head_id"]
    cat_id = random.randint(1, 3)
    gravity_id = random.randint(1, 3)
    minor_head_id = random.randint(1, 5)
    days_ago = p["days_ago"]
    scn = p["scenario"]
    
    date_part = NOW - timedelta(days=days_ago)
    
    if scn and scn["scenario_type"] == "night_concentration":
        hour = random.choice(list(range(18, 24)) + list(range(0, 5)))
    elif major_head_id in [100, 200, 500, 600]:
        hour = random.choice(list(range(18, 24)) + list(range(0, 5)))
    else:
        hour = random.choice(list(range(9, 18)))
        
    final_dt = date_part.replace(hour=hour, minute=random.randint(0, 59), second=random.randint(0, 59), microsecond=0)
    if final_dt > NOW:
        final_dt = NOW
        
    crime_date_str = final_dt.strftime("%Y-%m-%d")
    crime_datetime_str = final_dt.strftime("%Y-%m-%dT%H:%M:%SZ")
    
    c_lat, c_lon = generate_point_near(station["latitude"], station["longitude"], 3.0)
    
    station_officers = [e["EmployeeID"] for e in employees if e["UnitID"] == station["UnitID"]]
    io = station_officers[0] if station_officers else 10001
    
    # NEW FIELDS LOGIC
    gd_entry = f"GD-{random.randint(100, 999)}/{final_dt.strftime('%y')}"
    gd_time = (final_dt - timedelta(hours=random.randint(0, 5))).strftime("%Y-%m-%dT%H:%M:%SZ")
    delay = random.choice([True, False, False])
    delay_reason = "Busy with other duties/delayed by complainant" if delay else ""
    bns_applicable = final_dt >= datetime(2024, 7, 1)
    
    # Plausible crime scene
    landmarks = ['Main Road', 'Market', 'Metro Station', 'Temple', 'Residential Layout', 'Bus Stand', 'Park', 'Commercial Complex']
    crime_scene_loc = f"Near {random.choice(landmarks)}, {station['UnitName']} Area"
    dist_dir = f"{random.uniform(0.5, 8.5):.1f} km {random.choice(['North', 'South', 'East', 'West', 'North-East', 'South-West', 'North-West', 'South-East'])}"
    stolen_prop = "Gold chain and mobile phone" if major_head_id in [200, 300] else ""
    
    # Generate Case-specific narrative
    narratives = [
        f"Station received information about an incident at {crime_scene_loc}. The complainant appeared at the station and reported the occurrence. Preliminary enquiry was conducted at the spot which is {dist_dir} from the PS. Scene was visited, sketch and photographs were taken. Investigation is currently ongoing to trace the suspects.",
        f"Complainant arrived at the PS to file a grievance regarding an incident at {crime_scene_loc}. After recording the statement, officers visited the location, approx {dist_dir} from the station. Evidence was collected and witness statements are being recorded. Case registered and investigation initiated.",
        f"Control room dispatched officers to {crime_scene_loc} ({dist_dir} from PS) following a distress call. Upon arrival, the situation was brought under control. The complainant formally lodged a complaint later at the station. Initial spot inspection is complete and suspects are being interrogated."
    ]
    brief_facts = random.choice(narratives)
    if scn:
        brief_facts += f" [Scenario: {scn['scenario_id']}]"

    # New FIR format [4-digit Serial]/[4-digit Year] e.g. 0124/2026
    year = final_dt.year
    if year not in yearly_serials:
        yearly_serials[year] = 0
    yearly_serials[year] += 1
    serial_num = yearly_serials[year]
    crime_no = f"{serial_num:04d}/{year}"
    
    cases.append({
        "CaseMasterID": cid,
        "CrimeNo": crime_no,
        "CaseNo": f"FIR-{cid}",
        "CrimeRegisteredDate": crime_date_str,
        "CrimeRegisteredDateTime": crime_datetime_str,
        "PolicePersonID": io,
        "PoliceStationID": station["UnitID"],
        "CaseCategoryID": cat_id,
        "GravityOffenceID": gravity_id,
        "CrimeMajorHeadID": major_head_id,
        "CrimeMinorHeadID": minor_head_id,
        "CaseStatusID": random.choices([1, 2, 3, 4, 5], weights=[40, 20, 20, 10, 10])[0],
        "CourtID": 1,
        "IncidentFromDate": (final_dt - timedelta(days=random.randint(0, 10), hours=random.randint(0,23), minutes=random.randint(0,59))).strftime("%d-%m-%Y %I:%M %p"),
        "IncidentToDate": crime_date_str,
        "InfoReceivedPSDate": crime_date_str,
        "latitude": c_lat,
        "longitude": c_lon,
        "BriefFacts": brief_facts,
        "GDEntryNumber": gd_entry,
        "GDEntryTimestamp": gd_time,
        "DelayInReporting": delay,
        "DelayReason": delay_reason,
        "BNSApplicable": bns_applicable,
        "CrimeSceneLocation": crime_scene_loc,
        "DistanceDirection": dist_dir,
        "JurisdictionFlag": random.choice(["Inside", "Inside", "Outside"]),
        "StolenProperty": stolen_prop,
        "InformantSignature": "Signed",
        "RecordingOfficerRank": "Inspector",
        "DispatchCopyHanded": True,
        "DispatchCopyDate": crime_date_str
    })
    
    # Accused
    acc = accused_assignments[i % len(accused_assignments)]
    acc_status = random.choice(["Known", "Unknown"])
    accused_rows.append({
        "AccusedMasterID": 80001 + len(accused_rows),
        "CaseMasterID": cid,
        "AccusedName": acc["Name"] if acc_status == "Known" else "Unknown",
        "AgeYear": acc["Age"] if acc_status == "Known" else 0,
        "GenderID": acc["GenderID"] if acc_status == "Known" else 0,
        "PersonID": acc["PersonID"] if acc_status == "Known" else "",
        "FatherSpouseName": f"{random.choice(first_names_male)} {random.choice(last_names)}" if acc_status == "Known" else "Unknown",
        "Address": f"No {random.randint(1, 100)}, {random.choice(['Main Road', 'Cross', 'Street'])}, {station['UnitName']} Area" if acc_status == "Known" else "Unknown",
        "Aliases": f"{acc['Name'].split()[0][:3]} alias" if acc_status == "Known" else "Unknown",
        "PhysicalDescription": f"Height {random.randint(150, 190)}cm, {random.choice(['Fair', 'Dark', 'Wheatish'])} complexion" if acc_status == "Known" else "Not recorded",
        "Status": acc_status
    })
    
    # Victim
    vic = victim_assignments[i % len(victim_assignments)]
    victim_rows.append({
        "VictimMasterID": 70001 + len(victim_rows),
        "CaseMasterID": cid,
        "VictimName": vic["Name"],
        "AgeYear": vic["Age"],
        "GenderID": vic["GenderID"],
        "VictimPolice": "0",
        "PersonID": vic["PersonID"],
        "RelationshipToComplainant": random.choice(["Self", "Father", "Son", "Spouse", "None"])
    })

# Add Complainant generation (mocking 1 complainant per case)
complainant_rows = []
for idx, c in enumerate(cases):
    gender_id = random.choice([1, 2])
    fname = random.choice(first_names_male) if gender_id == 1 else random.choice(["Anjali", "Priya", "Kavitha", "Sneha", "Geetha"])
    lname = random.choice(last_names)
    complainant_rows.append({
        "ComplainantID": 60001 + idx,
        "CaseMasterID": c["CaseMasterID"],
        "ComplainantName": f"{fname} {lname}",
        "AgeYear": random.randint(20, 65),
        "OccupationID": random.randint(1, 5),
        "ReligionID": random.randint(1, 4),
        "CasteID": random.randint(1, 4),
        "GenderID": gender_id,
        "FatherSpouseName": f"{random.choice(first_names_male)} {random.choice(last_names)}",
        "Phone": f"+91-{random.randint(9000000000, 9999999999)}",
        "PermanentAddress": f"No {random.randint(100, 999)}, Local Layout",
        "IdentityProof": f"Aadhaar ****{random.randint(1000, 9999)}"
    })

# Add Act & Section generation
act_section_rows = []
act_mapping = {
    100: [{"ActID": "IPC", "SectionID": "302"}, {"ActID": "IPC", "SectionID": "307"}], # Murder/Attempt
    200: [{"ActID": "IPC", "SectionID": "379"}], # Theft
    300: [{"ActID": "IPC", "SectionID": "392"}], # Robbery
    400: [{"ActID": "IPC", "SectionID": "376"}], # Rape
    500: [{"ActID": "IPC", "SectionID": "420"}], # Fraud
    600: [{"ActID": "IT Act", "SectionID": "66C"}], # Cyber
    700: [{"ActID": "NDPS Act", "SectionID": "20(b)"}], # Narcotics
    800: [{"ActID": "IPC", "SectionID": "323"}], # Assault
    900: [{"ActID": "IPC", "SectionID": "363"}], # Kidnapping
    1000: [{"ActID": "IPC", "SectionID": "384"}], # Extortion
}

for c in cases:
    major_head = c["CrimeMajorHeadID"]
    acts = act_mapping.get(major_head, [{"ActID": "IPC", "SectionID": "323"}])
    for act in acts:
        act_section_rows.append({
            "CaseMasterID": c["CaseMasterID"],
            "Act_Section": f"{act['ActID']}_{act['SectionID']}",
            "ActID": act["ActID"],
            "SectionID": act["SectionID"]
        })

import uuid
custom_edges = []
edge_types = ["Accomplice", "Victim", "Informant", "Related Case", "Family"]

for i in range(10000):
    c = random.choice(cases)
    a = random.choice(accused_rows)
    v = random.choice(victim_rows)
    
    custom_edges.append({
        "EdgeID": str(uuid.uuid4()),
        "CaseMasterID": c["CaseMasterID"],
        "source": str(a["PersonID"]) if random.random() > 0.5 else str(c["CrimeNo"]),
        "target": str(v["PersonID"]) if random.random() > 0.5 else f"Station_{c['PoliceStationID']}",
        "label": random.choice(edge_types)
    })

# Dump scenarios metadata for validation
import os
os.makedirs('scratch', exist_ok=True)
with open('scratch/scenario_metadata.json', 'w') as f:
    json.dump(scenarios, f, indent=2)

ts_output = f"""// AUTO-GENERATED FILE. DO NOT EDIT BY HAND.
// Generated on: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}
// Total Cases: {len(cases)}
// Total Stations: {len(units)}
// Total Edges: {len(custom_edges)}
import {{ DistrictRow, UnitRow, CaseMasterRow, AccusedRow, VictimRow, EmployeeRow, ComplainantRow, ActSectionAssociationRow }} from '../models';
import {{ CustomEdgeRow }} from './mockDb';

export const SEED_DISTRICTS: DistrictRow[] = {json.dumps(districts, indent=2)};

export const SEED_UNITS: UnitRow[] = {json.dumps(units, indent=2)};

export const SEED_EMPLOYEES: EmployeeRow[] = {json.dumps(employees, indent=2)};

export const SEED_CASES: CaseMasterRow[] = {json.dumps(cases, indent=2)};

export const SEED_ACCUSED: AccusedRow[] = {json.dumps(accused_rows, indent=2)};

export const SEED_VICTIMS: VictimRow[] = {json.dumps(victim_rows, indent=2)};

export const SEED_COMPLAINANTS: ComplainantRow[] = {json.dumps(complainant_rows, indent=2)};

export const SEED_ACT_SECTIONS: ActSectionAssociationRow[] = {json.dumps(act_section_rows, indent=2)};

export const SEED_CUSTOM_EDGES: CustomEdgeRow[] = {json.dumps(custom_edges, indent=2)};
"""

with open('frontend/src/utils/seedData.ts', 'w', encoding='utf-8') as f:
    f.write(ts_output)

print("Generated frontend/src/utils/seedData.ts")

# Write to backend directly to bypass TS rootDir issues
backend_json = {
    "SEED_DISTRICTS": districts,
    "SEED_UNITS": units,
    "SEED_EMPLOYEES": employees,
    "SEED_CASES": cases,
    "SEED_ACCUSED": accused_rows,
    "SEED_VICTIMS": victim_rows,
    "SEED_COMPLAINANTS": complainant_rows,
    "SEED_ACT_SECTIONS": act_section_rows,
    "SEED_CUSTOM_EDGES": custom_edges
}
with open('backend/src/seedData.json', 'w', encoding='utf-8') as f:
    json.dump(backend_json, f, indent=2)

print("Generated backend/src/seedData.json")

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
