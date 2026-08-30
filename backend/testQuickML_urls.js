const axios = require('axios');
const dotenv = require('dotenv');
dotenv.config();

const features = {
  case_count_7d: 0,
  case_count_previous_7d: 0,
  case_count_previous_30d: 0,
  case_count_previous_90d: 0,
  growth_vs_previous_week: 0,
  growth_vs_previous_30d: 0,
  property_cases: 0,
  women_cases: 1,
  body_cases: 0,
  economic_cases: 0,
  cyber_cases: 0,
  sll_cases: 0,
  night_case_ratio: 0,
  unique_accused_count: 1,
  repeat_offender_case_count: 1,
  historical_mean_7d: 0,
  historical_stddev_7d: 0,
  historical_z_score: 0
};

const token = process.env.QUICKML_ACCESS_TOKEN;

const test = async (url) => {
  try {
    const response = await axios.post(url, { data: features }, {
      headers: {
        'CATALYST-ORG': process.env.QUICKML_ORG_ID,
        'X-QUICKML-ENDPOINT-KEY': process.env.QUICKML_ENDPOINT_KEY,
        'Authorization': `Zoho-oauthtoken ${token}`,
        'Content-Type': 'application/json'
      }
    });
    console.log('SUCCESS for', url);
    console.log(JSON.stringify(response.data, null, 2));
  } catch (err) {
    console.log('FAILED for', url);
    console.log(err.response ? err.response.data : err.message);
  }
};

(async () => {
  await test('https://api.catalyst.zoho.in/quickml/v1/project/4535900000013024/endpoints/station-risk-predictor-final/predict');
  await test('https://api.catalyst.zoho.in/quickml/v1/project/45359000000013024/endpoints/station-risk-predictor-final/predict');
  await test('https://api.catalyst.zoho.in/quickml/v1/project/4535900000013024/endpoints/predict');
  await test('https://api.catalyst.zoho.in/quickml/v1/project/45359000000013024/endpoints/predict');
})();
