const http = require('http');

http.get('http://localhost:3001/api/cases', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    try {
      const parsed = JSON.parse(data);
      console.log('Status Code:', res.statusCode);
      console.log('Type:', Array.isArray(parsed) ? 'Array' : typeof parsed);
      console.log('Length:', parsed.length);
      if (parsed.length > 0) {
        console.log('First Record:', JSON.stringify(parsed[0]).substring(0, 200));
      }
    } catch (e) {
      console.error('Failed to parse response:', e);
      console.log('Raw data snippet:', data.substring(0, 200));
    }
  });
}).on('error', err => {
  console.error('Error fetching API:', err.message);
});
