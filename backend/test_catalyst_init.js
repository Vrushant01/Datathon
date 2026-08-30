require('dotenv').config();
const catalyst = require('zcatalyst-sdk-node');
try {
  const app = catalyst.initializeApp({
    project_id: '45359000000013024',
    project_key: '45359000000013024',
    environment: 'Development',
    credential: catalyst.credential.refreshToken({
      client_id: process.env.ZOHO_CLIENT_ID,
      client_secret: process.env.ZOHO_CLIENT_SECRET,
      refresh_token: process.env.ZOHO_REFRESH_TOKEN
    })
  });
  console.log('App initialized!');
  app.datastore().table('districts').getPagedRows().then(res => {
    console.log('Districts:', res.data.length);
  }).catch(err => {
    console.error('Datastore Error:', err);
  });
} catch(e) {
  console.error('Init Error:', e);
}
