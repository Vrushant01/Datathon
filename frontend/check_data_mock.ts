import { mockDb } from './src/utils/mockDb';

function checkData() {
  const employees = mockDb.getEmployees();
  console.log(`Found ${employees.length} employees`);
  
  let badRecords = 0;
  employees.forEach(emp => {
    if (emp.FirstName === undefined || emp.FirstName === null || emp.KGID === undefined || emp.KGID === null) {
      console.log(`Bad Record Found: EmployeeID=${emp.EmployeeID}, FirstName=${emp.FirstName}, KGID=${emp.KGID}, RankID=${emp.RankID}, UnitID=${emp.UnitID}`);
      badRecords++;
    }
  });
  
  console.log(`Total bad records: ${badRecords}`);
}

checkData();
