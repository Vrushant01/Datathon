const fs = require('fs');
const path = require('path');

const ROOT = 'e:/study/Project/datathon--code+base/datathon2';
const BACKEND = path.join(ROOT, 'backend');
const FRONTEND = path.join(ROOT, 'frontend');
const BACKEND_DATA = path.join(BACKEND, 'data');
const FRONTEND_DATA = path.join(FRONTEND, 'data');

// Create directories if they don't exist
if (!fs.existsSync(BACKEND_DATA)) fs.mkdirSync(BACKEND_DATA, { recursive: true });
if (!fs.existsSync(FRONTEND_DATA)) fs.mkdirSync(FRONTEND_DATA, { recursive: true });

// Move backend related files
const backendFilesToMove = [
    { src: path.join(ROOT, 'Karnataka_Police_Stations_Synthetic.xlsx'), dest: path.join(BACKEND_DATA, 'Karnataka_Police_Stations_Synthetic.xlsx') },
    { src: path.join(ROOT, 'generate_crime_data.py'), dest: path.join(BACKEND_DATA, 'generate_crime_data.py') },
    { src: path.join(ROOT, 'generate_seed.py'), dest: path.join(BACKEND_DATA, 'generate_seed.py') },
    { src: path.join(ROOT, 'validate_dataset.py'), dest: path.join(BACKEND_DATA, 'validate_dataset.py') },
    { src: path.join(ROOT, 'station_coords.json'), dest: path.join(BACKEND_DATA, 'station_coords.json') },
    { src: path.join(BACKEND, 'dist', 'seedData.json'), dest: path.join(BACKEND_DATA, 'seedData.json') },
];

backendFilesToMove.forEach(file => {
    if (fs.existsSync(file.src)) {
        fs.renameSync(file.src, file.dest);
        console.log(`Moved ${file.src} to ${file.dest}`);
    } else {
        console.log(`File not found: ${file.src}`);
    }
});

// Move frontend related files
const mockDbPath = path.join(FRONTEND, 'src', 'utils', 'mockDb.ts');
const newMockDbPath = path.join(FRONTEND_DATA, 'mockDb.ts');

if (fs.existsSync(mockDbPath)) {
    fs.renameSync(mockDbPath, newMockDbPath);
    console.log(`Moved mockDb.ts to frontend/data/mockDb.ts`);
    
    // Update imports
    const walkSync = function(dir, filelist) {
        files = fs.readdirSync(dir);
        filelist = filelist || [];
        files.forEach(function(file) {
            if (fs.statSync(path.join(dir, file)).isDirectory()) {
                filelist = walkSync(path.join(dir, file), filelist);
            }
            else {
                if (file.endsWith('.ts') || file.endsWith('.tsx')) {
                    filelist.push(path.join(dir, file));
                }
            }
        });
        return filelist;
    };
    
    const tsFiles = walkSync(path.join(FRONTEND, 'src'));
    
    tsFiles.forEach(file => {
        let content = fs.readFileSync(file, 'utf8');
        let updated = false;
        
        // Find relative path from current file to frontend/data/mockDb
        const fileDir = path.dirname(file);
        let relPath = path.relative(fileDir, path.join(FRONTEND_DATA, 'mockDb'));
        relPath = relPath.replace(/\\/g, '/');
        if (!relPath.startsWith('.')) relPath = './' + relPath;

        // Replace imports:
        // import ... from '../utils/mockDb';
        // import ... from '../../utils/mockDb';
        // etc.
        const importRegex = /from\s+['"]([^'"]*\/utils\/mockDb)['"]/g;
        if (importRegex.test(content)) {
            content = content.replace(importRegex, `from '${relPath}'`);
            updated = true;
        }

        if (updated) {
            fs.writeFileSync(file, content, 'utf8');
            console.log(`Updated imports in ${file}`);
        }
    });
}

// Remove unnecessary files
const filesToDelete = [
    // root
    path.join(ROOT, 'check_case.js'),
    path.join(ROOT, 'districts_res.json'),
    path.join(ROOT, 'fix_districts_output.json'),
    path.join(ROOT, 'fix_districts_res.json'),
    path.join(ROOT, 'out.json'),
    path.join(ROOT, 'preflight_results.json'),
    path.join(ROOT, 'preflight_results_2.json'),
    path.join(ROOT, 'preflight_results_3.json'),
    path.join(ROOT, 'preflight_results_4.json'),
    path.join(ROOT, 'preflight_results_5.json'),
    path.join(ROOT, 'refactor_map.js'),
    path.join(ROOT, 'replaceFetch.js'),
    path.join(ROOT, 'report.json'),
    path.join(ROOT, 'scratch_polys.js'),
    path.join(ROOT, 'script.js'),
    path.join(ROOT, 'test_cases.json'),
    path.join(ROOT, 'validation_results.json'),
    path.join(ROOT, 'validation_v2.json'),
    path.join(ROOT, 'validation_v3.json'),
    path.join(ROOT, 'zcql_output.json'),
    // backend
    path.join(BACKEND, 'checkMap.ts'),
    path.join(BACKEND, 'check_data.ts'),
    path.join(BACKEND, 'cs_dash.json'),
    path.join(BACKEND, 'cs_dash_clean.json'),
    path.join(BACKEND, 'dump_keys.ts'),
    path.join(BACKEND, 'fix_braces.js'),
    path.join(BACKEND, 'fix_forensic.js'),
    path.join(BACKEND, 'fix_projectDetails.js'),
    path.join(BACKEND, 'fix_ts.js'),
    path.join(BACKEND, 'fix_ts2.js'),
    path.join(BACKEND, 'forensic_snippet.ts'),
    path.join(BACKEND, 'inject_interceptor.js'),
    path.join(BACKEND, 'investigate_db.ts'),
    path.join(BACKEND, 'listQuickML.js'),
    path.join(BACKEND, 'local_test.json'),
    path.join(BACKEND, 'mongo_dash.json'),
    path.join(BACKEND, 'mongo_dash_clean.json'),
    path.join(BACKEND, 'patch_app.js'),
    path.join(BACKEND, 'probeRisk.js'),
    path.join(BACKEND, 'prod_update.json'),
    path.join(BACKEND, 'recovery.patch'),
    path.join(BACKEND, 'scratch_catalyst.js'),
    path.join(BACKEND, 'scratch_test.ts'),
    path.join(BACKEND, 'scratch_test_express.ts'),
    path.join(BACKEND, 'test-chat2.js'),
    path.join(BACKEND, 'test.js'),
    path.join(BACKEND, 'test2.js'),
    path.join(BACKEND, 'test2.json'),
    path.join(BACKEND, 'test3.json'),
    path.join(BACKEND, 'testQuickML.js'),
    path.join(BACKEND, 'testQuickML_types.js'),
    path.join(BACKEND, 'testQuickML_urls.js'),
    path.join(BACKEND, 'test_catalyst_init.js'),
    path.join(BACKEND, 'test_clean.js'),
    path.join(BACKEND, 'test_concurrency.js'),
    path.join(BACKEND, 'test_diff.js'),
    path.join(BACKEND, 'test_gsi.js'),
    path.join(BACKEND, 'test_indexes.js'),
    path.join(BACKEND, 'test_mongo.ts'),
    path.join(BACKEND, 'test_parity.js'),
    path.join(BACKEND, 'test_parity_v2.js'),
    path.join(BACKEND, 'test_parity_v3.js'),
    path.join(BACKEND, 'test_parity_v4.js'),
    path.join(BACKEND, 'test_res.json'),
    path.join(BACKEND, 'test_scanAll.ts'),
    path.join(BACKEND, 'test_sdk.js'),
    path.join(BACKEND, 'validation_results.json'),
    path.join(BACKEND, 'verifyEmployees.ts'),
    // frontend
    path.join(FRONTEND, 'check_data.ts'),
    path.join(FRONTEND, 'check_data_mock.ts'),
    path.join(FRONTEND, 'imports.txt'),
    path.join(FRONTEND, 'parse_mock.cjs'),
    path.join(FRONTEND, 'test_gis.cjs'),
    path.join(FRONTEND, 'test_map.js'),
];

filesToDelete.forEach(file => {
    if (fs.existsSync(file)) {
        fs.unlinkSync(file);
        console.log(`Deleted ${file}`);
    }
});

// Update seedController.ts to use the new seedData.json path
const seedControllerPath = path.join(BACKEND, 'src', 'controllers', 'seedController.ts');
if (fs.existsSync(seedControllerPath)) {
    let content = fs.readFileSync(seedControllerPath, 'utf8');
    // It currently uses: const seedPath = path.join(__dirname, '../seedData.json');
    // In dist, __dirname is backend/dist/controllers. 
    // Now it needs to point to backend/data/seedData.json
    // Relative from backend/dist/controllers to backend/data/seedData.json:
    // path.join(__dirname, '../../data/seedData.json')
    content = content.replace(/path\.join\(__dirname, '\.\.\/seedData\.json'\)/g, "path.join(__dirname, '../../data/seedData.json')");
    fs.writeFileSync(seedControllerPath, content, 'utf8');
    console.log(`Updated seedController.ts`);
}

console.log("Cleanup complete.");
