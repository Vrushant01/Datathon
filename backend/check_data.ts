import { getCatalystApp } from './src/repositories/CloudScaleRepository.js';
import { CloudScaleRepository } from './src/repositories/CloudScaleRepository.js';

async function checkData() {
  const repo = new CloudScaleRepository(null);
  
  const employees = await repo.getEmployees();
  console.log(`Found ${employees.length} employees`);
  
  let badRecords = 0;
  employees.forEach(emp => {
    if (!emp.FirstName || !emp.KGID) {
      console.log(`Bad Record Found: EmployeeID=${emp.EmployeeID}, FirstName=${emp.FirstName}, KGID=${emp.KGID}`);
      badRecords++;
    }
  });
  
  console.log(`Total bad records: ${badRecords}`);
}

checkData().catch(console.error);
