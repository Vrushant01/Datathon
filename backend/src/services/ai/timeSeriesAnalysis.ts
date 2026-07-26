/**
 * Analyzes time series data. If sample size > 30, uses Linear Regression.
 * Otherwise, falls back to EMA or simple Z-Score trend.
 */

export interface TrendAnalysis {
  trend: 'increasing' | 'decreasing' | 'stable';
  slope: number;
  percentIncrease: number;
  algorithmUsed: string;
  confidence: number;
  forecast: number;
}

export const calculateLinearRegression = (y: number[]): { slope: number; intercept: number; rSquared: number } => {
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

export const calculateEMA = (values: number[], days: number = 7): number[] => {
  if (values.length === 0) return [];
  const k = 2 / (days + 1);
  const ema = [values[0]];
  for (let i = 1; i < values.length; i++) {
    ema.push(values[i] * k + ema[i - 1] * (1 - k));
  }
  return ema;
};

export const analyzeTrend = (values: number[]): TrendAnalysis => {
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
    const { slope, intercept, rSquared } = calculateLinearRegression(values);
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
  } else {
    // Medium Data: EMA
    const ema = calculateEMA(values, 7);
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
