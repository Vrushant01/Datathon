const fs = require('fs');
const BASE_URL = 'https://backend-50044295489.development.catalystappsail.in/api/cloudscale-indexes';

async function getIndexes() {
  try {
    const resp = await fetch(BASE_URL);
    if (resp.ok) {
       console.log(JSON.stringify(await resp.json(), null, 2));
    } else {
       console.log("Failed:", resp.status, await resp.text());
    }
  } catch (e) {
    console.log(e);
  }
}
getIndexes();
