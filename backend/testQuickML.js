const axios = require('axios');
const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.join(__dirname, '../../../../../e:/study/Project/datathon--code+base/datathon2/backend/.env') });

async function testQuickML() {
  const endpoint = process.env.QUICKML_ENDPOINT_URL;
  const token = process.env.QUICKML_ACCESS_TOKEN;

  if (!endpoint || !token) {
    console.error('Missing config');
    return;
  }

  const features = {
    case_count_7d: 10,
    case_count_previous_7d: 5,
    case_count_previous_30d: 20,
    case_count_previous_90d: 50,
    growth_vs_previous_week: 1,
    growth_vs_previous_30d: 0,
    property_cases: 2,
    women_cases: 1,
    body_cases: 2,
    economic_cases: 0,
    cyber_cases: 0,
    sll_cases: 5,
    night_case_ratio: 0.2,
    unique_accused_count: 5,
    repeat_offender_case_count: 1,
    historical_mean_7d: 8,
    historical_stddev_7d: 2,
    historical_z_score: 1
  };

  try {
    const response = await axios.post(
      endpoint,
      { data: features }, // Single prediction
      {
        headers: {
          'CATALYST-ORG': process.env.QUICKML_ORG_ID,
          'X-QUICKML-ENDPOINT-KEY': process.env.QUICKML_ENDPOINT_KEY,
          'Authorization': `Zoho-oauthtoken ${token}`,
          'Content-Type': 'application/json'
        },
        timeout: 10000
      }
    );
    console.log("SUCCESS:");
    console.log(JSON.stringify(response.data, null, 2));
  } catch (error) {
    console.error("ERROR:");
    if (error.response) {
      console.error(error.response.status, error.response.data);
    } else {
      console.error(error.message);
    }
  }
}

testQuickML();
