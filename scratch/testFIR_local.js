async function createFIR() {
  const url = 'http://localhost:5000/api/cases';
  const data = {
    PoliceStationID: 2001,
    PolicePersonID: 10001,
    CaseStatusID: 1,
    CrimeMajorHeadID: 1,
    CrimeMinorHeadID: 1,
    GravityOffenceID: 1,
    CaseCategoryID: 1
  };
  
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-email': 'admin@system.com',
        'Authorization': 'Bearer 123'
      },
      body: JSON.stringify(data)
    });
    
    console.log('Status:', res.status);
    const text = await res.text();
    console.log('Body:', text);
  } catch (err) {
    console.error(err);
  }
}

createFIR();
