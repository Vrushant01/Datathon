const dotenv = require('dotenv');
const path = require('path');
const result = dotenv.config({ path: path.resolve(__dirname, '../.env') });

if (result.error) {
  console.error('[Config Check] Error loading .env file');
  process.exit(1);
}

const env = process.env;

console.log('[Config Check] QUICKML_ENDPOINT_URL exists:', !!env.QUICKML_ENDPOINT_URL);
console.log('[Config Check] QUICKML_ACCESS_TOKEN exists:', !!env.QUICKML_ACCESS_TOKEN);
console.log('[Config Check] QUICKML_ORG_ID exists:', !!env.QUICKML_ORG_ID);
console.log('[Config Check] QUICKML_ENDPOINT_KEY exists:', !!env.QUICKML_ENDPOINT_KEY);

if (!env.QUICKML_ENDPOINT_KEY) {
  console.log('[Config Check] FAILURE: QUICKML_ENDPOINT_KEY is still undefined.');
  process.exit(1);
} else {
  console.log('[Config Check] SUCCESS: All required variables are present.');
  process.exit(0);
}
