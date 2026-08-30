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

const endpoint = process.env.QUICKML_ENDPOINT_URL;
const token = process.env.QUICKML_ACCESS_TOKEN;

const test = async (name, payload) => {
  try {
    const response = await axios.post(
      endpoint,
      payload,
      {
        headers: {
          'CATALYST-ORG': process.env.QUICKML_ORG_ID,
          'X-QUICKML-ENDPOINT-KEY': process.env.QUICKML_ENDPOINT_KEY,
          'Authorization': `Zoho-oauthtoken ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );
    console.log(`\n--- SUCCESS: ${name} ---`);
    console.log(JSON.stringify(response.data, null, 2));
  } catch (err) {
    console.log(`\n--- FAILED: ${name} ---`);
    console.log(err.response ? err.response.data : err.message);
  }
};

(async () => {
  await test('Array of features', [features]);
  await test('input_data', { input_data: features });
  await test('Root level', features);
  await test('Data array', { data: [features] });
  await test('Current format (data object)', { data: features });
  
  // What if it expects string values? (QuickML sometimes wants stringified arrays)
  await test('Data stringified array', { input_data: JSON.stringify([features]) });
  
  // Wait, the prompt says "The screenshot confirms that the endpoint exposes the optional explainModel parameter."
  await test('Data array with explainModel', { data: [features], explainModel: true });
  await test('Input data array with explainModel', { input_data: [features], explainModel: true });
})();
