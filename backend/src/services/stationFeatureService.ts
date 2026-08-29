import { StationFeatures } from './quickmlService';
import { RepositoryFactory } from '../repositories/RepositoryFactory';

export const calculateFeatures = async (req: any, stationId: number): Promise<StationFeatures> => {
  const repo = RepositoryFactory.getRepository(req);
  
  // We'll anchor calculations to Date.now() by default, or an explicitly requested demo date
  const now = process.env.RISK_ANALYSIS_DATE ? new Date(process.env.RISK_ANALYSIS_DATE) : new Date();
  
  // Helper to subtract days
  const subDays = (date: Date, days: number) => {
    const d = new Date(date);
    d.setDate(d.getDate() - days);
    return d;
  };

  const date_now = now.getTime();
  const date_minus_7 = subDays(now, 7).getTime();
  const date_minus_14 = subDays(now, 14).getTime();
  const date_minus_30 = subDays(now, 30).getTime();
  const date_minus_60 = subDays(now, 60).getTime();
  const date_minus_90 = subDays(now, 90).getTime();
  const date_minus_365 = subDays(now, 365).getTime();

  // Fetch all cases for this station from CloudScale
  const cases = await repo.getCasesByStation(stationId);
  
  let case_count_7d = 0;
  let case_count_previous_7d = 0;
  let case_count_previous_30d = 0; // last 30 days
  let case_count_prior_30d = 0;    // -60 to -30 days for growth calculation
  let case_count_previous_90d = 0; // last 90 days
  
  let property_cases = 0;
  let women_cases = 0;
  let body_cases = 0;
  let economic_cases = 0;
  let cyber_cases = 0;
  let sll_cases = 0;

  let night_cases = 0;
  let total_cases_with_time = 0;

  // For historical stats (7-day buckets over last 365 days)
  const buckets_365d: Record<number, number> = {};
  for (let i = 0; i < 52; i++) {
    buckets_365d[i] = 0;
  }

  for (const c of cases) {
    // 1. Time-based counts
    let incidentTime = 0;
    if (c.IncidentFromDate) {
      // IncidentFromDate format example: "31-03-2026 01:46 PM"
      const dStr = String(c.IncidentFromDate);
      const match = dStr.match(/^(\d{2})-(\d{2})-(\d{4})\s+(\d{2}):(\d{2})\s+(AM|PM)$/i);
      if (match) {
        const day = parseInt(match[1], 10);
        const month = parseInt(match[2], 10) - 1;
        const year = parseInt(match[3], 10);
        let hour = parseInt(match[4], 10);
        const min = parseInt(match[5], 10);
        const ampm = match[6].toUpperCase();
        
        if (ampm === 'PM' && hour < 12) hour += 12;
        if (ampm === 'AM' && hour === 12) hour = 0;
        
        const dt = new Date(year, month, day, hour, min);
        incidentTime = dt.getTime();
        
        // Calculate Night Case Ratio exactly as specified
        total_cases_with_time++;
        if (hour >= 18 || hour <= 5) {
          night_cases++;
        }
      } else {
        const dt = new Date(c.IncidentFromDate);
        incidentTime = dt.getTime();
        if (!isNaN(incidentTime)) {
          total_cases_with_time++;
          const hour = dt.getHours();
          if (hour >= 18 || hour <= 5) {
            night_cases++;
          }
        }
      }
    } else if (c.CrimeRegisteredDate) {
      incidentTime = new Date(c.CrimeRegisteredDate).getTime();
    }

    if (incidentTime > 0) {
      if (incidentTime >= date_minus_7 && incidentTime <= date_now) {
        case_count_7d++;
      }
      if (incidentTime >= date_minus_14 && incidentTime < date_minus_7) {
        case_count_previous_7d++;
      }
      if (incidentTime >= date_minus_30 && incidentTime <= date_now) {
        case_count_previous_30d++;
      }
      if (incidentTime >= date_minus_60 && incidentTime < date_minus_30) {
        case_count_prior_30d++;
      }
      if (incidentTime >= date_minus_90 && incidentTime <= date_now) {
        case_count_previous_90d++;
      }
      
      // Bucket for last 365 days
      if (incidentTime >= date_minus_365 && incidentTime <= date_now) {
        const daysAgo = Math.floor((date_now - incidentTime) / (1000 * 60 * 60 * 24));
        const bucketIdx = Math.floor(daysAgo / 7);
        if (bucketIdx < 52) {
          buckets_365d[bucketIdx]++;
        }
      }
    }

    // 2. Category counts (all-time for the station)
    switch (Number(c.CrimeMajorHeadID)) {
      case 200: property_cases++; break;
      case 300: women_cases++; break;
      case 100: body_cases++; break;
      case 400: economic_cases++; break;
      case 500: cyber_cases++; break;
      case 600: sll_cases++; break;
    }
  }

  // 3. Growth calculations
  const growth_vs_previous_week = case_count_previous_7d === 0 
    ? (case_count_7d > 0 ? 1.0 : 0.0)
    : (case_count_7d - case_count_previous_7d) / case_count_previous_7d;

  const growth_vs_previous_30d = case_count_prior_30d === 0
    ? (case_count_previous_30d > 0 ? 1.0 : 0.0)
    : (case_count_previous_30d - case_count_prior_30d) / case_count_prior_30d;

  const night_case_ratio = total_cases_with_time > 0 ? night_cases / total_cases_with_time : 0;

  // 4. Accused metrics
  const caseIds = cases.map(c => Number(c.CaseMasterID)).filter(id => id > 0);
  const allAccused = await repo.getAllAccused();
  const accusedRecords = allAccused.filter(a => caseIds.includes(Number(a.CaseMasterID)));
  
  const uniqueAccusedIds = new Set<string>();
  accusedRecords.forEach(a => {
    if (a.PersonID) uniqueAccusedIds.add(a.PersonID);
    else if (a.AccusedName) uniqueAccusedIds.add(a.AccusedName.toLowerCase());
  });
  const unique_accused_count = uniqueAccusedIds.size;

  let repeat_offender_case_count = 0;
  if (uniqueAccusedIds.size > 0) {
    const validPersonIds = Array.from(uniqueAccusedIds).filter(id => id.length > 5);
    if (validPersonIds.length > 0) {
      // Find global occurrence count
      const personCounts = new Map<string, number>();
      for (const a of allAccused) {
        if (a.PersonID && validPersonIds.includes(a.PersonID)) {
          personCounts.set(a.PersonID, (personCounts.get(a.PersonID) || 0) + 1);
        }
      }
      const repeatIds = new Set(Array.from(personCounts.entries()).filter(([k,v]) => v > 1).map(([k,v]) => k));
      
      const casesWithRepeatOffenders = new Set<number>();
      for (const a of accusedRecords) {
        if (a.PersonID && repeatIds.has(a.PersonID)) {
          casesWithRepeatOffenders.add(Number(a.CaseMasterID));
        }
      }
      repeat_offender_case_count = casesWithRepeatOffenders.size;
    }
  }

  // 5. Historical Stats (mean & stddev of 7d buckets)
  const bucketValues = Object.values(buckets_365d);
  const historical_mean_7d = bucketValues.reduce((a, b) => a + b, 0) / bucketValues.length;
  
  const variance = bucketValues.reduce((sq, n) => sq + Math.pow(n - historical_mean_7d, 2), 0) / bucketValues.length;
  const historical_stddev_7d = Math.sqrt(variance);

  const historical_z_score = historical_stddev_7d > 0 
    ? (case_count_7d - historical_mean_7d) / historical_stddev_7d 
    : 0;

  return {
    case_count_7d,
    case_count_previous_7d,
    case_count_previous_30d,
    case_count_previous_90d,
    growth_vs_previous_week,
    growth_vs_previous_30d,
    property_cases,
    women_cases,
    body_cases,
    economic_cases,
    cyber_cases,
    sll_cases,
    night_case_ratio,
    unique_accused_count,
    repeat_offender_case_count,
    historical_mean_7d: Number(historical_mean_7d.toFixed(2)),
    historical_stddev_7d: Number(historical_stddev_7d.toFixed(2)),
    historical_z_score: Number(historical_z_score.toFixed(2))
  };
};
