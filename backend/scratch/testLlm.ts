import axios from 'axios';
import * as dotenv from 'dotenv';
dotenv.config();

const endpoint = process.env.QUICKML_ENDPOINT_URL;
const token = process.env.QUICKML_ACCESS_TOKEN;
const orgId = process.env.QUICKML_ORG_ID;
const endpointKey = process.env.QUICKML_ENDPOINT_KEY;

async function run() {
  try {
    const payload = {
      data: {
        messages: [{ role: "user", content: "Hello" }],
        tools: [
          {
            name: "get_case_statistics",
            description: "Get statistics about cases",
            parameters: {
              type: "object",
              properties: {
                metric: { type: "string" }
              }
            }
          }
        ]
      }
    };
    
    console.log("Sending payload...");
    const res = await axios.post(endpoint as string, payload, {
      headers: {
        'CATALYST-ORG': orgId,
        'X-QUICKML-ENDPOINT-KEY': endpointKey,
        'Authorization': `Zoho-oauthtoken ${token}`,
        'Content-Type': 'application/json'
      }
    });
    console.log("Response:", JSON.stringify(res.data, null, 2));
  } catch(e: any) {
    if (e.response) {
      console.error("HTTP Error:", e.response.status, e.response.data);
    } else {
      console.error("Error:", e.message);
    }
  }
}
run();
