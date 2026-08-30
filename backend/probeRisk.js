const axios = require('axios');
const dotenv = require('dotenv');
dotenv.config();

const token = process.env.QUICKML_ACCESS_TOKEN;
const endpoint = process.env.QUICKML_ENDPOINT_URL;

const test = async (name, features) => {
  try {
    const res = await axios.post(endpoint, { data: features }, {
      headers: {
        'CATALYST-ORG': process.env.QUICKML_ORG_ID,
        'X-QUICKML-ENDPOINT-KEY': process.env.QUICKML_ENDPOINT_KEY,
        'Authorization': `Zoho-oauthtoken ${token}`,
        'Content-Type': 'application/json'
      }
    });
    const d = res.data;
    console.log(`\n--- ${name} ---`);
    console.log(`raw result:            ${JSON.stringify(d.result)}`);
    console.log(`raw likelihood_score:  ${JSON.stringify(d.likelihood_score)}`);
    console.log(`status:                ${d.status}`);
    const risk = d.result[0];
    const score = d.likelihood_score[0];
    console.log(`result[0]:             ${risk}  => class="${risk === 1 ? 'High' : 'Low'}"`);
    console.log(`likelihood_score[0]:   ${score.toFixed(4)}`);
  } catch (err) {
    console.log(`\n--- FAILED: ${name} ---`);
    console.log(err.response ? err.response.data : err.message);
  }
};

(async () => {
  // Station with ZERO activity — most likely Low risk
  await test('Zero-activity station (expect Low)', {
    case_count_7d: 0, case_count_previous_7d: 0, case_count_previous_30d: 0,
    case_count_previous_90d: 0, growth_vs_previous_week: 0, growth_vs_previous_30d: 0,
    property_cases: 0, women_cases: 0, body_cases: 0, economic_cases: 0,
    cyber_cases: 0, sll_cases: 0, night_case_ratio: 0, unique_accused_count: 0,
    repeat_offender_case_count: 0, historical_mean_7d: 0,
    historical_stddev_7d: 0, historical_z_score: 0
  });

  // Station with HIGH activity and extreme z-score — most likely High risk
  await test('High-activity station (expect High)', {
    case_count_7d: 50, case_count_previous_7d: 10, case_count_previous_30d: 40,
    case_count_previous_90d: 100, growth_vs_previous_week: 5.0, growth_vs_previous_30d: 3.5,
    property_cases: 15, women_cases: 10, body_cases: 8, economic_cases: 5,
    cyber_cases: 3, sll_cases: 2, night_case_ratio: 0.65, unique_accused_count: 30,
    repeat_offender_case_count: 12, historical_mean_7d: 12.5,
    historical_stddev_7d: 4.2, historical_z_score: 4.5
  });

  // Station with moderate activity
  await test('Moderate-activity station (borderline)', {
    case_count_7d: 8, case_count_previous_7d: 6, case_count_previous_30d: 25,
    case_count_previous_90d: 70, growth_vs_previous_week: 1.3, growth_vs_previous_30d: 0.9,
    property_cases: 4, women_cases: 2, body_cases: 1, economic_cases: 1,
    cyber_cases: 0, sll_cases: 0, night_case_ratio: 0.25, unique_accused_count: 8,
    repeat_offender_case_count: 3, historical_mean_7d: 7.0,
    historical_stddev_7d: 2.5, historical_z_score: 0.4
  });
})();
