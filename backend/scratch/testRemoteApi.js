const https = require('https');

https.get('https://backend-50044295489.development.catalystappsail.in/api/cases', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    try {
      const parsed = JSON.parse(data);
      console.log('Status Code:', res.statusCode);
      console.log('Type:', Array.isArray(parsed) ? 'Array' : typeof parsed);
      console.log('Length:', parsed.length);
    } catch (e) {
      console.error('Failed to parse:', e);
    }
  });
}).on('error', err => {
  console.error('Error fetching API:', err.message);
});
