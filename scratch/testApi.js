fetch('http://localhost:5000/api/cases')
  .then(res => res.json())
  .then(data => {
    console.log('Returned count:', data.length || data.error || data);
  })
  .catch(err => console.error('Fetch error:', err));
