import axios from 'axios';

export interface StationFeatures {
  case_count_7d: number;
  case_count_previous_7d: number;
  case_count_previous_30d: number;
  case_count_previous_90d: number;
  growth_vs_previous_week: number;
  growth_vs_previous_30d: number;
  property_cases: number;
  women_cases: number;
  body_cases: number;
  economic_cases: number;
  cyber_cases: number;
  sll_cases: number;
  night_case_ratio: number;
  unique_accused_count: number;
  repeat_offender_case_count: number;
  historical_mean_7d: number;
  historical_stddev_7d: number;
  historical_z_score: number;
}

export const predictStationRisk = async (features: StationFeatures) => {
  const endpoint = process.env.QUICKML_ENDPOINT_URL;
  const token = process.env.QUICKML_ACCESS_TOKEN;

  if (!endpoint || !token) {
    throw new Error('QuickML configuration is missing in environment variables.');
  }

  try {
    const response = await axios.post(
      endpoint,
      { data: features },
      {
        headers: {
          'CATALYST-ORG': process.env.QUICKML_ORG_ID,
          'X-QUICKML-ENDPOINT-KEY': process.env.QUICKML_ENDPOINT_KEY,
          'Authorization': `Zoho-oauthtoken ${token}`,
          'Content-Type': 'application/json'
        },
        timeout: 10000 // 10s timeout
      }
    );

    const mlData = response.data;
    
    // Convert QuickML response to our expected format
    if (mlData && typeof mlData.result !== 'undefined' && typeof mlData.likelihood_score !== 'undefined') {
      const risk = mlData.result;
      const likelihoodScore = mlData.likelihood_score;
      
      return {
        success: true,
        risk: risk,
        riskLabel: risk === 1 ? 'High' : 'Low',
        likelihoodScore: likelihoodScore
      };
    } else {
      throw new Error('Malformed QuickML response.');
    }
  } catch (error: any) {
    if (error.response) {
      throw new Error(`QuickML Error: ${error.response.status} - ${JSON.stringify(error.response.data)}`);
    } else if (error.request) {
      throw new Error('QuickML Network Error: No response received.');
    } else {
      throw new Error(`QuickML Error: ${error.message}`);
    }
  }
};
