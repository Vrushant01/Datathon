"use strict";
/**
 * Analyzes time series data. If sample size > 30, uses Linear Regression.
 * Otherwise, falls back to EMA or simple Z-Score trend.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.analyzeTrend = exports.calculateEMA = exports.calculateLinearRegression = void 0;
exports.detectTemporalAnomalies = detectTemporalAnomalies;
const calculateLinearRegression = (y) => {
    const n = y.length;
    let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
    for (let i = 0; i < n; i++) {
        sumX += i;
        sumY += y[i];
        sumXY += i * y[i];
        sumX2 += i * i;
    }
    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;
    // Calculate R-Squared
    const yMean = sumY / n;
    let ssTot = 0, ssRes = 0;
    for (let i = 0; i < n; i++) {
        const f = slope * i + intercept;
        ssTot += Math.pow(y[i] - yMean, 2);
        ssRes += Math.pow(y[i] - f, 2);
    }
    const rSquared = ssTot === 0 ? 0 : 1 - (ssRes / ssTot);
    return { slope, intercept, rSquared };
};
exports.calculateLinearRegression = calculateLinearRegression;
const calculateEMA = (values, days = 7) => {
    if (values.length === 0)
        return [];
    const k = 2 / (days + 1);
    const ema = [values[0]];
    for (let i = 1; i < values.length; i++) {
        ema.push(values[i] * k + ema[i - 1] * (1 - k));
    }
    return ema;
};
exports.calculateEMA = calculateEMA;
const analyzeTrend = (values) => {
    const n = values.length;
    if (n < 7) {
        // Insufficient data fallback to percent difference between first and last if possible
        const diff = n > 1 ? values[n - 1] - values[0] : 0;
        const percent = n > 1 && values[0] !== 0 ? (diff / values[0]) * 100 : 0;
        return {
            trend: diff > 0 ? 'increasing' : diff < 0 ? 'decreasing' : 'stable',
            slope: diff,
            percentIncrease: percent,
            algorithmUsed: 'Simple Statistical Difference (Fallback)',
            confidence: Math.min(100, n * 10), // Low confidence
            forecast: values[n - 1] || 0
        };
    }
    if (n >= 30) {
        // Machine Learning: Linear Regression
        const { slope, intercept, rSquared } = (0, exports.calculateLinearRegression)(values);
        const forecast = slope * n + intercept;
        const initial = intercept;
        const final = slope * (n - 1) + intercept;
        const percent = initial !== 0 ? ((final - initial) / initial) * 100 : 0;
        return {
            trend: slope > 0.1 ? 'increasing' : slope < -0.1 ? 'decreasing' : 'stable',
            slope,
            percentIncrease: percent,
            algorithmUsed: 'Linear Regression',
            confidence: Math.min(99, Math.round(rSquared * 100) + 10), // R^2 represents fitness
            forecast
        };
    }
    else {
        // Medium Data: EMA
        const ema = (0, exports.calculateEMA)(values, 7);
        const recentAvg = ema[ema.length - 1];
        const oldAvg = ema[0];
        const percent = oldAvg !== 0 ? ((recentAvg - oldAvg) / oldAvg) * 100 : 0;
        return {
            trend: percent > 5 ? 'increasing' : percent < -5 ? 'decreasing' : 'stable',
            slope: recentAvg - oldAvg,
            percentIncrease: percent,
            algorithmUsed: 'Exponential Moving Average (EMA)',
            confidence: Math.min(100, 50 + n),
            forecast: recentAvg
        };
    }
};
exports.analyzeTrend = analyzeTrend;
// ─── Temporal Anomaly Detection ──────────────────────────────────────────────
/**
 * Maps crime head IDs to human-readable names.
 */
const CRIME_HEAD_NAMES = {
    100: 'Crimes Against Body',
    200: 'Crimes Against Property',
    300: 'Crimes Against Women',
    400: 'Economic Offences',
    500: 'Cyber Crimes',
    600: 'Special & Local Laws',
};
const DEFAULT_CONFIG = {
    baselineWindowCount: 8, // Use 8 prior 7-day windows (~8 weeks of history)
    minHistoryWindows: 3, // Need at least 3 non-trivial windows to form a useful baseline
    zHigh: 2.0,
    zCritical: 3.0,
    maxAlerts: 20,
};
/**
 * Normalise a CrimeRegisteredDateTime (ISO string) or CrimeRegisteredDate ("YYYY-MM-DD")
 * to the number of complete UTC days since Unix epoch.
 * Returns null for unparseable / future dates.
 */
function toDayIndex(raw, nowDayIndex) {
    if (!raw)
        return null;
    const d = new Date(raw);
    if (isNaN(d.getTime()))
        return null;
    // Truncate to UTC midnight
    const dayIdx = Math.floor(d.getTime() / 86_400_000);
    // Reject future dates (allows up to 1 day of clock skew)
    if (dayIdx > nowDayIndex + 1)
        return null;
    return dayIdx;
}
/**
 * Core entry point. Runs Z-Score temporal anomaly detection across three scopes:
 *   1. STATE  (all Karnataka) × crime head
 *   2. DISTRICT               × crime head
 *   3. STATION                × crime head
 *
 * Each scope is evaluated in independent 7-day complete windows. The CURRENT window
 * is the most recent complete 7-day period (days D-7 to D-1 relative to today UTC).
 * The BASELINE windows are the preceding `baselineWindowCount` complete periods,
 * EXCLUDING the current window.
 *
 * @param cases  Full CaseMaster dataset already in memory
 * @param unitToDistrict  Map of UnitID → DistrictID
 * @param districtNames   Map of DistrictID → district name
 * @param unitNames       Map of UnitID → station name
 * @param config          Optional override of detection parameters
 */
function detectTemporalAnomalies(cases, unitToDistrict, districtNames, unitNames, config = {}) {
    const cfg = { ...DEFAULT_CONFIG, ...config };
    // ── 1. Anchor time ──────────────────────────────────────────────────────────
    // "Today" in UTC is the day that is currently in progress – we do NOT count it.
    const nowMs = Date.now();
    const todayDayIndex = Math.floor(nowMs / 86_400_000); // UTC day index
    // Current window: days [todayDayIndex-7, todayDayIndex-1] inclusive
    const currentWindowEnd = todayDayIndex - 1;
    const currentWindowStart = todayDayIndex - 7;
    // Baseline: windows from (currentWindowStart - baselineWindowCount*7) up to currentWindowStart-1
    const baselineStart = currentWindowStart - cfg.baselineWindowCount * 7;
    // ── 2. Parse and index each case ──────────────────────────────────────────
    // Structure: dayIndex → stationId → crimeHeadId → count
    const dayStationCrime = new Map();
    for (const c of cases) {
        const dayIdx = toDayIndex(c.CrimeRegisteredDateTime || c.CrimeRegisteredDate, todayDayIndex);
        if (dayIdx === null)
            continue;
        // Only index days within the analysis range
        if (dayIdx < baselineStart || dayIdx > currentWindowEnd)
            continue;
        const stationId = Number(c.PoliceStationID) || 0;
        const crimeHeadId = Number(c.CrimeMajorHeadID) || 0;
        if (!dayStationCrime.has(dayIdx))
            dayStationCrime.set(dayIdx, new Map());
        const byStation = dayStationCrime.get(dayIdx);
        if (!byStation.has(stationId))
            byStation.set(stationId, new Map());
        const byCrime = byStation.get(stationId);
        byCrime.set(crimeHeadId, (byCrime.get(crimeHeadId) || 0) + 1);
    }
    // ── 3. Build weekly aggregate for each scope × crime head combination ──────
    //
    // windowCounts[windowIndex][scopeKey] = count
    // windowIndex 0 = current window; 1..baselineWindowCount = baseline (oldest last)
    //
    // scopeKey format:  "STATE|0|<crimeHead>" | "DIST|<distId>|<crimeHead>" | "STA|<staId>|<crimeHead>"
    const totalWindows = 1 + cfg.baselineWindowCount; // current + baselines
    // windowCounts[w][scopeKey]  w=0 is current
    const windowCounts = Array.from({ length: totalWindows }, () => new Map());
    for (const [dayIdx, byStation] of dayStationCrime) {
        // Which window index does this day belong to?
        const daysAgo = currentWindowEnd - dayIdx; // 0 = most recent day in current window
        const windowIdx = Math.floor(daysAgo / 7); // 0 = current, 1..8 = baseline
        if (windowIdx >= totalWindows)
            continue;
        const wMap = windowCounts[windowIdx];
        for (const [stationId, byCrime] of byStation) {
            const districtId = unitToDistrict.get(stationId) ?? 0;
            for (const [crimeHeadId, count] of byCrime) {
                const stateKey = `STATE|0|${crimeHeadId}`;
                const distKey = `DIST|${districtId}|${crimeHeadId}`;
                const stationKey = `STA|${stationId}|${crimeHeadId}`;
                wMap.set(stateKey, (wMap.get(stateKey) || 0) + count);
                wMap.set(distKey, (wMap.get(distKey) || 0) + count);
                wMap.set(stationKey, (wMap.get(stationKey) || 0) + count);
            }
        }
    }
    // ── 4. Collect all distinct scope keys ───────────────────────────────────
    const allKeys = new Set();
    for (const wMap of windowCounts) {
        for (const k of wMap.keys())
            allKeys.add(k);
    }
    // ── 5. Run Z-score detection per key ────────────────────────────────────
    let candidateSeries = 0;
    let rejectedInsufficient = 0;
    const anomalies = [];
    const seenDedupKeys = new Set();
    for (const key of allKeys) {
        candidateSeries++;
        const currentCount = windowCounts[0].get(key) || 0;
        // Collect baseline window counts (indices 1..N), only those present
        const baselineValues = [];
        for (let w = 1; w < totalWindows; w++) {
            const v = windowCounts[w].get(key);
            if (v !== undefined)
                baselineValues.push(v);
        }
        // Reject if insufficient history
        if (baselineValues.length < cfg.minHistoryWindows) {
            rejectedInsufficient++;
            continue;
        }
        // We only flag INCREASES (current > baseline), not drops
        // Drops are handled differently (e.g. closures) and cause false positives
        const baselineMean = baselineValues.reduce((a, b) => a + b, 0) / baselineValues.length;
        if (currentCount <= baselineMean)
            continue; // Not an upward anomaly
        // Standard deviation of baseline
        const variance = baselineValues.reduce((a, b) => a + Math.pow(b - baselineMean, 2), 0) / baselineValues.length;
        const baselineStdDev = Math.sqrt(variance);
        let zScore;
        if (baselineStdDev < 0.001) {
            // Zero-variance baseline: all historical windows had the exact same count
            // Use a soft rule: if current is meaningfully above, treat as high anomaly
            if (currentCount > baselineMean * 1.5 && currentCount >= baselineMean + 3) {
                zScore = 2.5; // Assign a synthetic z-score indicating notable deviation
            }
            else {
                continue;
            }
        }
        else {
            zScore = (currentCount - baselineMean) / baselineStdDev;
        }
        // Guard against NaN / Infinity
        if (!isFinite(zScore))
            continue;
        if (zScore < cfg.zHigh)
            continue;
        const severity = zScore >= cfg.zCritical ? 'CRITICAL' : 'HIGH';
        // Decode key
        const parts = key.split('|');
        const scope = parts[0]; // raw prefix: 'STATE' | 'DIST' | 'STA'
        const locationIdRaw = parseInt(parts[1]);
        const crimeHeadId = parseInt(parts[2]);
        let level;
        let locationName;
        let locationId;
        if (scope === 'STATE') {
            level = 'STATE';
            locationName = 'Karnataka';
            locationId = null;
        }
        else if (scope === 'DIST') {
            level = 'DISTRICT';
            locationId = locationIdRaw;
            locationName = districtNames.get(locationIdRaw) || `District ${locationIdRaw}`;
        }
        else {
            level = 'STATION';
            locationId = locationIdRaw;
            locationName = unitNames.get(locationIdRaw) || `Station ${locationIdRaw}`;
        }
        const crimeType = CRIME_HEAD_NAMES[crimeHeadId] || `Crime Category ${crimeHeadId}`;
        const percentageChange = baselineMean > 0
            ? Math.round(((currentCount - baselineMean) / baselineMean) * 1000) / 10
            : 100;
        const windowStartDate = new Date((currentWindowStart) * 86_400_000).toISOString().split('T')[0];
        const windowEndDate = new Date((currentWindowEnd) * 86_400_000).toISOString().split('T')[0];
        const dedupKey = `${level}|${locationId ?? 'STATE'}|${crimeHeadId}|${windowStartDate}`;
        if (seenDedupKeys.has(dedupKey))
            continue;
        seenDedupKeys.add(dedupKey);
        anomalies.push({
            dedupKey,
            severity,
            level,
            locationName,
            locationId,
            crimeType,
            crimeHeadId,
            currentCount,
            baselineMean: Math.round(baselineMean * 10) / 10,
            baselineStdDev: Math.round(baselineStdDev * 100) / 100,
            zScore: Math.round(zScore * 100) / 100,
            percentageChange,
            windowStart: windowStartDate,
            windowEnd: windowEndDate,
            baselinePeriods: baselineValues.length,
            algorithmUsed: 'Z-Score Temporal Deviation (Non-Overlapping Windows)',
            reason: `${crimeType} registrations in ${locationName} were ${percentageChange}% above the ${baselineValues.length}-week historical baseline (z=${zScore.toFixed(2)}).`,
        });
    }
    // Sort by z-score descending, take top N
    anomalies.sort((a, b) => b.zScore - a.zScore);
    const finalAnomalies = anomalies.slice(0, cfg.maxAlerts);
    return {
        candidateSeries,
        rejectedInsufficient,
        anomalies: finalAnomalies,
        highCount: finalAnomalies.filter(a => a.severity === 'HIGH').length,
        criticalCount: finalAnomalies.filter(a => a.severity === 'CRITICAL').length,
    };
}
