const fs = require('fs');
const content = fs.readFileSync('src/utils/mockDb.ts', 'utf8');

// The file likely contains something like `const employees = [ ... ];`
// Let's try a regex or just substring
const startMatch = content.indexOf('const employees: Employee[] = [') || content.indexOf('const employees = [');
if (startMatch === -1) {
  console.log("Could not find employees array start.");
  process.exit(1);
}

const lines = content.split('\n');
let inEmployees = false;
let openBrackets = 0;
let employeesStr = '';

for (let line of lines) {
  if (!inEmployees && (line.includes('const employees: Employee[] = [') || line.includes('const employees: any[] = ['))) {
    inEmployees = true;
  }
  
  if (inEmployees) {
    employeesStr += line + '\n';
    openBrackets += (line.match(/\[/g) || []).length;
    openBrackets -= (line.match(/\]/g) || []).length;
    
    if (openBrackets === 0) {
      break;
    }
  }
}

try {
  // strip "const employees: any[] = " 
  const jsonStr = employeesStr.replace(/const employees.*?=\s*/, '').replace(/;\s*$/, '');
  // It might be a JS object, not strict JSON. Let's eval it.
  const employees = eval('(' + jsonStr + ')');
  
  let badRecords = 0;
  employees.forEach(emp => {
    if (emp.FirstName === undefined || emp.FirstName === null || emp.KGID === undefined || emp.KGID === null) {
      console.log(`Bad Record Found: EmployeeID=${emp.EmployeeID}, FirstName=${emp.FirstName}, KGID=${emp.KGID}, RankID=${emp.RankID}, UnitID=${emp.UnitID}`);
      badRecords++;
    }
  });
  console.log(`Total bad records: ${badRecords}`);
} catch (e) {
  console.error("Failed to parse", e);
}
