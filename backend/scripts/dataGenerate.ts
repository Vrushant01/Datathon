import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs/promises';

async function generateData() {
  console.log('\n==================================================');
  console.log('DATA GENERATION');
  console.log('==================================================\n');
  
  const scriptPath = path.resolve(__dirname, '../../generate_seed.py');
  
  console.log('Running authoritative seed generator: generate_seed.py');
  
  const pythonProc = spawn('python', [scriptPath], {
      cwd: path.resolve(__dirname, '../../'), // run in root where the xlsx might be
      stdio: 'inherit'
  });

  const exitCode = await new Promise((resolve) => {
      pythonProc.on('close', resolve);
  });

  if (exitCode !== 0) {
      console.error(`\n❌ Generator failed with exit code ${exitCode}`);
      process.exit(1);
  }
  
  console.log('\n✅ Data generated successfully.');
  
  // Output summary
  try {
      // Dynamic import to avoid caching issues with ts-node if we were to require it at the top
      const seedData = await import('../../frontend/src/utils/seedData');
      
      console.log('\nGenerated Output Summary:');
      console.log(`${seedData.SEED_DISTRICTS?.length || 0} districts`);
      console.log(`${seedData.SEED_UNITS?.length || 0} units`);
      console.log(`${seedData.SEED_EMPLOYEES?.length || 0} employees`);
      console.log(`${seedData.SEED_CASES?.length || 0} cases`);
      console.log(`${seedData.SEED_ACCUSED?.length || 0} accused`);
      console.log(`${seedData.SEED_VICTIMS?.length || 0} victims`);
      
  } catch (err: any) {
      console.error('❌ Failed to read generated datasets for summary:', err.message);
      process.exit(1);
  }
}

generateData();
