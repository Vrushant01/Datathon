const axios = require('axios');
const dotenv = require('dotenv');
dotenv.config();
const token = process.env.QUICKML_ACCESS_TOKEN;
const url = 'https://api.catalyst.zoho.in/quickml/v1/project/45359000000013024/endpoints';
(async () => {
  try {
    const res = await axios.get(url, {
      headers: {
        'CATALYST-ORG': process.env.QUICKML_ORG_ID,
        'Authorization': `Zoho-oauthtoken ${token}`
      }
    });
    console.log(JSON.stringify(res.data, null, 2));
  } catch(e) {
    console.error(e.response ? e.response.data : e.message);
  }
})();
