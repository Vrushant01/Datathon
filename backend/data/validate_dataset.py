import os
import sys
import math

csv_path = 'backend/scripts/station_risk_training_final.csv'

if not os.path.exists(csv_path):
    print(f"Error: Could not find {csv_path}")
    sys.exit(1)

with open(csv_path, 'r') as f:
    lines = f.read().strip().split('\n')

headers = lines[0].split(',')
rows = lines[1:]

TOTAL_ROWS = len(rows)
TARGET_0_COUNT = 0
TARGET_1_COUNT = 0
DUPLICATE_ROW_COUNT = 0
CONFLICTING_FEATURE_VECTOR_COUNT = 0
MISSING_VALUE_COUNT = 0
NAN_COUNT = 0
INFINITY_COUNT = 0
INVALID_RATIO_COUNT = 0
INVALID_COUNT_RELATIONSHIPS = 0
INVALID_Z_SCORE_COUNT = 0

feature_signatures = {}
exact_rows = set()

# Map column names to indices
try:
    c_target = headers.index('target_risk')
    c_case_7d = headers.index('case_count_7d')
    c_night_ratio = headers.index('night_case_ratio')
    c_prop = headers.index('property_cases')
    c_women = headers.index('women_cases')
    c_body = headers.index('body_cases')
    c_econ = headers.index('economic_cases')
    c_cyber = headers.index('cyber_cases')
    c_sll = headers.index('sll_cases')
    c_uniq = headers.index('unique_accused_count')
    c_repeat = headers.index('repeat_offender_case_count')
    c_mean = headers.index('historical_mean_7d')
    c_stddev = headers.index('historical_stddev_7d')
    c_z = headers.index('historical_z_score')
except ValueError as e:
    print(f"Missing column: {e}")
    sys.exit(1)

for raw_row in rows:
    if not raw_row.strip():
        continue
    if raw_row in exact_rows:
        DUPLICATE_ROW_COUNT += 1
    exact_rows.add(raw_row)

    cols = raw_row.split(',')
    
    # Missing checks
    if len(cols) != len(headers):
        MISSING_VALUE_COUNT += 1
        continue
    for c in cols:
        if c.strip() == '':
            MISSING_VALUE_COUNT += 1

    try:
        target = int(cols[c_target])
        if target == 1:
            TARGET_1_COUNT += 1
        elif target == 0:
            TARGET_0_COUNT += 1
    except ValueError:
        NAN_COUNT += 1
        continue

    # Conflicting features check
    # Signature is everything except target
    sig_cols = [c for i, c in enumerate(cols) if i != c_target]
    sig = "|".join(sig_cols)
    if sig in feature_signatures:
        if feature_signatures[sig] != target:
            CONFLICTING_FEATURE_VECTOR_COUNT += 1
    else:
        feature_signatures[sig] = target
        
    # Mathematical checks
    try:
        case_7d = int(cols[c_case_7d])
        night_ratio = float(cols[c_night_ratio])
        prop = int(cols[c_prop])
        women = int(cols[c_women])
        body = int(cols[c_body])
        econ = int(cols[c_econ])
        cyber = int(cols[c_cyber])
        sll = int(cols[c_sll])
        uniq = int(cols[c_uniq])
        repeat = int(cols[c_repeat])
        mean_7d = float(cols[c_mean])
        stddev_7d = float(cols[c_stddev])
        z_score = float(cols[c_z])
    except ValueError:
        NAN_COUNT += 1
        continue

    if night_ratio < 0 or night_ratio > 1:
        INVALID_RATIO_COUNT += 1

    cat_sum = prop + women + body + econ + cyber + sll
    if cat_sum > case_7d:
        INVALID_COUNT_RELATIONSHIPS += 1
    
    if repeat > uniq:
        INVALID_COUNT_RELATIONSHIPS += 1

    if stddev_7d > 0:
        expected_z = (case_7d - mean_7d) / stddev_7d
        # Allow small floating point difference due to rounding in JS vs Python
        if abs(expected_z - z_score) > 0.1:
            INVALID_Z_SCORE_COUNT += 1

    # check infinity
    for v in [night_ratio, mean_7d, stddev_7d, z_score]:
        if math.isinf(v):
            INFINITY_COUNT += 1

POSITIVE_RATE = (TARGET_1_COUNT / TOTAL_ROWS) * 100 if TOTAL_ROWS > 0 else 0

print("TOTAL ROWS", TOTAL_ROWS)
print("TARGET 0 COUNT", TARGET_0_COUNT)
print("TARGET 1 COUNT", TARGET_1_COUNT)
print(f"POSITIVE RATE {POSITIVE_RATE:.2f}%")
print("DUPLICATE ROW COUNT", DUPLICATE_ROW_COUNT)
print("CONFLICTING FEATURE VECTOR COUNT", CONFLICTING_FEATURE_VECTOR_COUNT)
print("MISSING VALUE COUNT", MISSING_VALUE_COUNT)
print("NAN COUNT", NAN_COUNT)
print("INFINITY COUNT", INFINITY_COUNT)
print("INVALID RATIO COUNT", INVALID_RATIO_COUNT)
print("INVALID COUNT RELATIONSHIPS", INVALID_COUNT_RELATIONSHIPS)
print("INVALID Z-SCORE COUNT", INVALID_Z_SCORE_COUNT)

passed = (
    TOTAL_ROWS == 50000 and 
    TARGET_0_COUNT == 45000 and 
    TARGET_1_COUNT == 5000 and 
    DUPLICATE_ROW_COUNT == 0 and 
    CONFLICTING_FEATURE_VECTOR_COUNT == 0 and 
    MISSING_VALUE_COUNT == 0 and 
    NAN_COUNT == 0 and 
    INFINITY_COUNT == 0 and 
    INVALID_RATIO_COUNT == 0 and 
    INVALID_COUNT_RELATIONSHIPS == 0 and 
    INVALID_Z_SCORE_COUNT == 0
)

if passed:
    print("PASS")
else:
    print("FAIL")
