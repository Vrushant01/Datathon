// Z-Score Anomaly Detection
export const calculateZScores = (values: number[]): { value: number; zScore: number; isAnomaly: boolean }[] => {
  if (values.length === 0) return [];
  if (values.length === 1) return [{ value: values[0], zScore: 0, isAnomaly: false }];

  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / (values.length - 1);
  const stdDev = Math.sqrt(variance);

  // If stdDev is 0, all values are identical, so no anomalies
  if (stdDev === 0) {
    return values.map(v => ({ value: v, zScore: 0, isAnomaly: false }));
  }

  return values.map(v => {
    const zScore = (v - mean) / stdDev;
    // Standard threshold is usually > 2 or > 3
    const isAnomaly = Math.abs(zScore) >= 2;
    return { value: v, zScore, isAnomaly };
  });
};

// Moving Average (Trend calculation)
export const calculateMovingAverage = (values: number[], windowSize: number = 7): number[] => {
  const result: number[] = [];
  for (let i = 0; i < values.length; i++) {
    if (i < windowSize - 1) {
      result.push(values[i]); // Or null/undefined based on implementation, here we just keep it
    } else {
      let sum = 0;
      for (let j = 0; j < windowSize; j++) {
        sum += values[i - j];
      }
      result.push(sum / windowSize);
    }
  }
  return result;
};

// Percent deviation from historical average
export const getPercentDeviation = (current: number, historicalAvg: number): number => {
  if (historicalAvg === 0) return current > 0 ? 100 : 0;
  return ((current - historicalAvg) / historicalAvg) * 100;
};
