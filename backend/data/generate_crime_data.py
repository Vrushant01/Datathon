import csv
import json
import random
from datetime import datetime, timedelta

def generate_data(num_records=10000):
    districts = ["Bengaluru Urban", "Mysuru", "Hubballi-Dharwad", "Mangaluru", "Belagavi", "Kalaburagi", "Davanagere", "Ballari", "Vijayapura", "Shivamogga"]
    crime_heads = ["Theft", "Burglary", "Assault", "Cyber Crime", "Fraud", "Narcotics", "Homicide", "Kidnapping", "Extortion", "Public Nuisance"]
    statuses = ["Open", "Under Investigation", "Charge Sheet Filed", "Closed", "Cold Case"]
    
    # Bounding box for Karnataka
    lat_min, lat_max = 11.5, 18.4
    lon_min, lon_max = 74.0, 78.5
    
    start_date = datetime(2023, 1, 1)
    
    records = []
    
    for i in range(1, num_records + 1):
        # Random date within last 3 years
        random_days = random.randint(0, 3 * 365)
        crime_date = start_date + timedelta(days=random_days)
        
        district = random.choice(districts)
        head = random.choice(crime_heads)
        status = random.choice(statuses)
        
        # Latitude and longitude with slight clustering around cities
        lat = round(random.uniform(lat_min, lat_max), 6)
        lon = round(random.uniform(lon_min, lon_max), 6)
        
        # Generate some Modus Operandi (MO) for RAG to pick up on
        mo_list = [
            "Entered through back window at night",
            "Used phishing link via SMS",
            "Targeted elderly victim on street",
            "Group of 3 suspects on motorcycle",
            "Stolen vehicle used for getaway",
            "Financial fraud promising high returns",
            "Cyber extortion using fake social media profile"
        ]
        
        record = {
            "case_id": f"KSP-2026-{str(i).zfill(6)}",
            "date": crime_date.strftime("%Y-%m-%d"),
            "time": f"{str(random.randint(0, 23)).zfill(2)}:{str(random.randint(0, 59)).zfill(2)}",
            "district": district,
            "station": f"{district} Police Station {random.randint(1, 5)}",
            "crime_category": head,
            "status": status,
            "latitude": lat,
            "longitude": lon,
            "victim_age": random.randint(18, 80),
            "victim_gender": random.choice(["Male", "Female", "Other"]),
            "modus_operandi": random.choice(mo_list),
            "suspect_count": random.randint(0, 3),
            "estimated_loss_inr": random.randint(0, 500000) if head in ["Theft", "Burglary", "Fraud", "Cyber Crime"] else 0
        }
        records.append(record)
        
    return records

if __name__ == "__main__":
    print("Generating 10,000 realistic crime records for Karnataka...")
    data = generate_data(10000)
    
    # Save as CSV
    csv_file = "karnataka_crime_data_10000.csv"
    with open(csv_file, 'w', newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, fieldnames=data[0].keys())
        writer.writeheader()
        writer.writerows(data)
    
    # Save as JSON
    json_file = "karnataka_crime_data_10000.json"
    with open(json_file, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=4)
        
    print(f"Success! Generated {csv_file} and {json_file}")
