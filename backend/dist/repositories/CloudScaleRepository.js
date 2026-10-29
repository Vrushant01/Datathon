"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CloudScaleRepository = exports.STATUTORY_SECTIONS = exports.STATUTORY_ACTS = void 0;
exports.getCatalystApp = getCatalystApp;
exports.invalidateAllCache = invalidateAllCache;
const zcatalyst_sdk_node_1 = __importDefault(require("zcatalyst-sdk-node"));
const GLOBAL_CACHE = {
    districts: { data: null, promise: null, timestamp: 0 },
    units: { data: null, promise: null, timestamp: 0 },
    employees: { data: null, promise: null, timestamp: 0 },
    casemasters: { data: null, promise: null, timestamp: 0 },
    accuseds: { data: null, promise: null, timestamp: 0 },
    victims: { data: null, promise: null, timestamp: 0 },
    customedges: { data: null, promise: null, timestamp: 0 },
    complainants: { data: null, promise: null, timestamp: 0 },
    actsections: { data: null, promise: null, timestamp: 0 },
    acts: { data: null, promise: null, timestamp: 0 },
    sections: { data: null, promise: null, timestamp: 0 },
    auditlogs: { data: null, promise: null, timestamp: 0 }
};
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes server-side in-memory cache
// Singleton Catalyst app instance.
// In AppSail, CATALYST_CONFIG env var is always set by the platform and contains
// the project credentials. initializeApp() reads it without needing request headers.
// This avoids the "unable to find the type of initialisation" error that occurs
// when catalyst.initialize(req) is called with a browser-originating request
// that lacks Catalyst's internal proxy headers.
exports.STATUTORY_ACTS = [
    { ActCode: 'IPC', ActID: 'IPC', ShortName: 'Indian Penal Code', ActDescription: 'Indian Penal Code, 1860', Active: true },
    { ActCode: 'IT Act', ActID: 'IT Act', ShortName: 'Information Technology Act', ActDescription: 'Information Technology Act, 2000', Active: true },
    { ActCode: 'NDPS Act', ActID: 'NDPS Act', ShortName: 'NDPS Act', ActDescription: 'Narcotic Drugs and Psychotropic Substances Act, 1985', Active: true },
    { ActCode: 'POCSO Act', ActID: 'POCSO Act', ShortName: 'POCSO Act', ActDescription: 'Protection of Children from Sexual Offences Act, 2012', Active: true },
    { ActCode: 'Arms Act', ActID: 'Arms Act', ShortName: 'Arms Act', ActDescription: 'Arms Act, 1959', Active: true },
    { ActCode: 'Motor Vehicles Act', ActID: 'Motor Vehicles Act', ShortName: 'Motor Vehicles Act', ActDescription: 'Motor Vehicles Act, 1988', Active: true },
    { ActCode: 'Karnataka Police Act', ActID: 'Karnataka Police Act', ShortName: 'Karnataka Police Act', ActDescription: 'Karnataka Police Act, 1963', Active: true },
    { ActCode: 'BNS', ActID: 'BNS', ShortName: 'Bharatiya Nyaya Sanhita', ActDescription: 'Bharatiya Nyaya Sanhita, 2023', Active: true }
];
exports.STATUTORY_SECTIONS = [
    { ActCode: 'IPC', SectionCode: '302', SectionID: '302', SectionDescription: 'Punishment for murder', Active: true },
    { ActCode: 'IPC', SectionCode: '307', SectionID: '307', SectionDescription: 'Attempt to murder', Active: true },
    { ActCode: 'IPC', SectionCode: '323', SectionID: '323', SectionDescription: 'Punishment for voluntarily causing hurt', Active: true },
    { ActCode: 'IPC', SectionCode: '324', SectionID: '324', SectionDescription: 'Voluntarily causing hurt by dangerous weapons', Active: true },
    { ActCode: 'IPC', SectionCode: '341', SectionID: '341', SectionDescription: 'Punishment for wrongful restraint', Active: true },
    { ActCode: 'IPC', SectionCode: '354', SectionID: '354', SectionDescription: 'Assault or criminal force to woman with intent to outrage modesty', Active: true },
    { ActCode: 'IPC', SectionCode: '363', SectionID: '363', SectionDescription: 'Punishment for kidnapping', Active: true },
    { ActCode: 'IPC', SectionCode: '376', SectionID: '376', SectionDescription: 'Punishment for rape', Active: true },
    { ActCode: 'IPC', SectionCode: '379', SectionID: '379', SectionDescription: 'Punishment for theft', Active: true },
    { ActCode: 'IPC', SectionCode: '380', SectionID: '380', SectionDescription: 'Theft in dwelling house', Active: true },
    { ActCode: 'IPC', SectionCode: '384', SectionID: '384', SectionDescription: 'Punishment for extortion', Active: true },
    { ActCode: 'IPC', SectionCode: '392', SectionID: '392', SectionDescription: 'Punishment for robbery', Active: true },
    { ActCode: 'IPC', SectionCode: '395', SectionID: '395', SectionDescription: 'Punishment for dacoity', Active: true },
    { ActCode: 'IPC', SectionCode: '406', SectionID: '406', SectionDescription: 'Punishment for criminal breach of trust', Active: true },
    { ActCode: 'IPC', SectionCode: '420', SectionID: '420', SectionDescription: 'Cheating and dishonestly inducing delivery of property', Active: true },
    { ActCode: 'IPC', SectionCode: '498A', SectionID: '498A', SectionDescription: 'Husband or relative of husband subjecting woman to cruelty', Active: true },
    { ActCode: 'IPC', SectionCode: '504', SectionID: '504', SectionDescription: 'Intentional insult with intent to provoke breach of the peace', Active: true },
    { ActCode: 'IPC', SectionCode: '506', SectionID: '506', SectionDescription: 'Punishment for criminal intimidation', Active: true },
    { ActCode: 'IT Act', SectionCode: '66C', SectionID: '66C', SectionDescription: 'Punishment for identity theft', Active: true },
    { ActCode: 'IT Act', SectionCode: '66D', SectionID: '66D', SectionDescription: 'Punishment for cheating by personation using computer resource', Active: true },
    { ActCode: 'IT Act', SectionCode: '67', SectionID: '67', SectionDescription: 'Publishing or transmitting obscene material in electronic form', Active: true },
    { ActCode: 'NDPS Act', SectionCode: '20(b)', SectionID: '20(b)', SectionDescription: 'Production, possession, transport or sale of cannabis', Active: true },
    { ActCode: 'NDPS Act', SectionCode: '21', SectionID: '21', SectionDescription: 'Possession of manufactured drugs and preparations', Active: true },
    { ActCode: 'POCSO Act', SectionCode: '4', SectionID: '4', SectionDescription: 'Punishment for penetrative sexual assault', Active: true },
    { ActCode: 'POCSO Act', SectionCode: '8', SectionID: '8', SectionDescription: 'Punishment for sexual assault', Active: true },
    { ActCode: 'Arms Act', SectionCode: '25', SectionID: '25', SectionDescription: 'Punishment for certain offences including illegal arms possession', Active: true },
    { ActCode: 'Motor Vehicles Act', SectionCode: '184', SectionID: '184', SectionDescription: 'Driving dangerously', Active: true },
    { ActCode: 'Karnataka Police Act', SectionCode: '92', SectionID: '92', SectionDescription: 'Punishment for street offences and public nuisance', Active: true }
];
let _catalystApp = null;
function getCatalystApp(req) {
    // 1. If req is provided, ALWAYS initialize with req.
    // In AppSail / Catalyst reverse proxy, req.headers contains the fresh request-scoped credentials:
    // x-zc-project-secret-key, x-zc-admin-cred-token, x-zc-user-cred-token, x-zc-projectid, x-zc-project-key.
    if (req && (req.headers || req.url)) {
        try {
            return zcatalyst_sdk_node_1.default.initialize(req);
        }
        catch (e) {
            console.warn('[DB] catalyst.initialize(req) failed:', e?.message || e);
        }
    }
    // 2. Singleton fallback for internal/background jobs without request context
    if (_catalystApp)
        return _catalystApp;
    // Try initializeApp() — reads CATALYST_CONFIG env var set by AppSail
    if (process.env.CATALYST_CONFIG) {
        try {
            _catalystApp = zcatalyst_sdk_node_1.default.initializeApp();
            console.log('[DB] Catalyst initialized via CATALYST_CONFIG env var');
            return _catalystApp;
        }
        catch (e) {
            console.warn('[DB] initializeApp() failed:', e.message);
        }
    }
    // Fallback: use request headers (works locally via catalyst serve proxy)
    if (req && req.headers && (req.headers['x-zc-projectid'] || req.headers['x-zc-project-key'])) {
        try {
            _catalystApp = zcatalyst_sdk_node_1.default.initialize(req);
            console.log('[DB] Catalyst initialized via request headers');
            return _catalystApp;
        }
        catch (e) {
            console.warn('[DB] catalyst.initialize(req) failed:', e.message);
        }
    }
    // Last resort: try initialize with req (may work in catalyst serve local mode)
    if (req) {
        try {
            _catalystApp = zcatalyst_sdk_node_1.default.initialize(req);
            console.log('[DB] Catalyst initialized via req (local mode)');
            return _catalystApp;
        }
        catch (e) {
            console.error('[DB] All Catalyst init methods failed. Last error:', e.message);
            throw new Error(`Catalyst SDK init failed: ${e.message}`);
        }
    }
    try {
        _catalystApp = zcatalyst_sdk_node_1.default.initialize();
        return _catalystApp;
    }
    catch (e) {
        throw new Error('Cannot initialize Catalyst SDK: no CATALYST_CONFIG env var and no valid request');
    }
}
class CloudScaleRepository {
    app;
    metrics;
    req;
    constructor(req) {
        this.req = req;
        this.app = getCatalystApp(req);
        if (req) {
            if (!req.metrics) {
                req.metrics = { nosqlCalls: 0, cacheHits: 0, cacheMisses: 0, startTime: Date.now() };
            }
            this.metrics = req.metrics;
        }
        else {
            this.metrics = { nosqlCalls: 0, cacheHits: 0, cacheMisses: 0, startTime: Date.now() };
        }
    }
    async scanAll(tableName) {
        let actualTableName = tableName;
        if (tableName === 'District')
            actualTableName = 'districts';
        if (tableName === 'Unit')
            actualTableName = 'units';
        if (tableName === 'Employee')
            actualTableName = 'employees';
        if (tableName === 'CaseMaster')
            actualTableName = 'casemasters';
        if (tableName === 'Accused')
            actualTableName = 'accuseds';
        if (tableName === 'Victim')
            actualTableName = 'victims';
        if (tableName === 'Complainant')
            actualTableName = 'complainants';
        if (tableName === 'CaseEntity')
            actualTableName = 'case_entities';
        if (tableName === 'Act')
            actualTableName = 'acts';
        if (tableName === 'Section')
            actualTableName = 'sections';
        if (tableName === 'ActSectionAssociation')
            actualTableName = 'actsections';
        const cacheEntry = GLOBAL_CACHE[actualTableName];
        if (!cacheEntry)
            throw new Error(`scanAll not supported for table: ${tableName}`);
        // REASONING FOR 5-MINUTE CACHE (Operational Requirement):
        // The Catalyst NoSQL 'fetchItem' API limits lookups to 25 keys per batch.
        // Downloading 9,674 rows sequentially requires 400 API requests and takes ~80-100 seconds.
        // ZCQL aggregation would be faster but requires AppSail context initialized securely.
        // To ensure AI queries return within timeout windows, a 5-minute memory cache is mandatory.
        const now = Date.now();
        if (cacheEntry.data && (now - cacheEntry.timestamp < CACHE_TTL)) {
            this.metrics.cacheHits++;
            if (cacheEntry.isPartial && this.req) {
                this.req.isDataPartial = true;
                if (this.req.res && typeof this.req.res.setHeader === 'function' && !this.req.res.headersSent) {
                    try {
                        this.req.res.setHeader('X-Data-Partial', 'true');
                        this.req.res.setHeader('Access-Control-Expose-Headers', 'X-Data-Partial');
                    }
                    catch (_) { }
                }
            }
            return cacheEntry.data;
        }
        if (cacheEntry.promise) {
            this.metrics.cacheHits++;
            return cacheEntry.promise;
        }
        this.metrics.cacheMisses++;
        cacheEntry.promise = (async () => {
            const nosql = this.app.nosql();
            const table = nosql.table(actualTableName);
            let ids = [];
            let pkField = '';
            switch (actualTableName) {
                case 'districts':
                    pkField = 'DistrictID';
                    for (let i = 1001; i <= 1031; i++)
                        ids.push(i);
                    break;
                case 'units':
                    pkField = 'UnitID';
                    for (let i = 2000; i <= 2960; i++)
                        ids.push(i);
                    break;
                case 'employees':
                    pkField = 'EmployeeID';
                    for (let i = 10001; i <= 11900; i++)
                        ids.push(i);
                    for (let i = 30001; i <= 30960; i++)
                        ids.push(i);
                    break;
                case 'casemasters':
                    pkField = 'CaseMasterID';
                    for (let i = 100001; i <= 110500; i++)
                        ids.push(i);
                    for (let i = 300001; i <= 301500; i++)
                        ids.push(i);
                    break;
                case 'accuseds':
                    pkField = 'AccusedMasterID';
                    for (let i = 80001; i <= 90500; i++)
                        ids.push(i);
                    for (let i = 300001; i <= 301500; i++)
                        ids.push(i);
                    break;
                case 'victims':
                    pkField = 'VictimMasterID';
                    for (let i = 70001; i <= 80500; i++)
                        ids.push(i);
                    for (let i = 300001; i <= 301500; i++)
                        ids.push(i);
                    break;
                case 'complainants':
                    pkField = 'ComplainantID';
                    for (let i = 10001; i <= 15000; i++)
                        ids.push(i);
                    for (let i = 60001; i <= 72000; i++)
                        ids.push(i);
                    break;
                case 'acts':
                    cacheEntry.data = exports.STATUTORY_ACTS;
                    cacheEntry.timestamp = Date.now();
                    cacheEntry.promise = null;
                    return exports.STATUTORY_ACTS;
                case 'sections':
                    cacheEntry.data = exports.STATUTORY_SECTIONS;
                    cacheEntry.timestamp = Date.now();
                    cacheEntry.promise = null;
                    return exports.STATUTORY_SECTIONS;
                case 'actsections':
                    // ActSectionAssociation is stored in Catalyst Datastore (SQL), not NoSQL.
                    // Return empty array gracefully — the Datastore query path is in a separate method.
                    cacheEntry.data = [];
                    cacheEntry.timestamp = Date.now();
                    cacheEntry.promise = null;
                    return [];
            }
            const allItems = [];
            let batchErrors = 0;
            const { NoSQLItem } = require('zcatalyst-sdk-node/lib/no-sql');
            // Fetch in batches of 25 (max supported by fetchItem)
            const fetchPromises = [];
            for (let i = 0; i < ids.length; i += 25) {
                const batch = ids.slice(i, i + 25);
                const keys = batch.map(v => new NoSQLItem().addNumber(pkField, v));
                fetchPromises.push(async () => {
                    let attempts = 0;
                    let success = false;
                    while (!success && attempts < 4) {
                        attempts++;
                        try {
                            this.metrics.nosqlCalls++;
                            const resp = await table.fetchItem({ keys });
                            const raw = resp;
                            const items = (raw.get || []).map((d) => {
                                const item = d.item;
                                if (!item)
                                    return null;
                                return typeof item.toJSON === 'function' ? item.toJSON() : item;
                            }).filter(Boolean);
                            allItems.push(...items);
                            success = true;
                        }
                        catch (e) {
                            if (e && e.message && e.message.includes('No such Item')) {
                                // Genuninely no records found for these keys, ignore
                                success = true;
                            }
                            else if (e && e.message && e.message.includes('No such resource')) {
                                // Table does not exist - throw to abort
                                throw e;
                            }
                            else {
                                if (attempts < 4) {
                                    await new Promise(r => setTimeout(r, 100 * Math.pow(2, attempts - 1)));
                                }
                                else {
                                    batchErrors++;
                                    console.error(`[DB] fetchItem batch failed for ${actualTableName} after ${attempts} attempts:`, e?.message || e);
                                }
                            }
                        }
                    }
                });
            }
            const scanStart = Date.now();
            // High-performance concurrency pool (6 workers pulling from task queue)
            // Concurrency of 6 avoids Catalyst API rate-limiting while keeping total scan under 5s
            const CONCURRENCY = 6;
            let taskIdx = 0;
            const workerCount = Math.min(CONCURRENCY, fetchPromises.length);
            const workers = Array.from({ length: workerCount }, async () => {
                while (taskIdx < fetchPromises.length) {
                    const current = taskIdx++;
                    await fetchPromises[current]();
                }
            });
            await Promise.all(workers);
            if (batchErrors > 0) {
                console.warn(`[DB] scanAll(${actualTableName}): ${batchErrors} batch(es) failed. Data may be partial. Found ${allItems.length} records.`);
                if (cacheEntry) {
                    cacheEntry.isPartial = true;
                }
                if (this.req) {
                    this.req.isDataPartial = true;
                    if (this.req.res && typeof this.req.res.setHeader === 'function' && !this.req.res.headersSent) {
                        try {
                            this.req.res.setHeader('X-Data-Partial', 'true');
                            this.req.res.setHeader('Access-Control-Expose-Headers', 'X-Data-Partial');
                        }
                        catch (_) { }
                    }
                }
            }
            // Fetch dynamically created records sequentially since NoSQL ZCQL is unreliable for NoSQL tables
            let dynamicStartId = 0;
            if (actualTableName === 'casemasters')
                dynamicStartId = 301501;
            else if (actualTableName === 'employees')
                dynamicStartId = 30961;
            else if (actualTableName === 'units')
                dynamicStartId = 2961;
            else if (actualTableName === 'accuseds')
                dynamicStartId = 301501;
            else if (actualTableName === 'victims')
                dynamicStartId = 301501;
            else if (actualTableName === 'complainants')
                dynamicStartId = 72001;
            if (dynamicStartId > 0) {
                let currentDynamicId = dynamicStartId;
                let foundEmpty = false;
                let consecutiveEmptyBatches = 0;
                while (!foundEmpty && currentDynamicId < dynamicStartId + 2500) { // Safety bound
                    const batchIds = [];
                    for (let i = 0; i < 25; i++)
                        batchIds.push(currentDynamicId + i);
                    const keys = batchIds.map(v => new NoSQLItem().addNumber(pkField, v));
                    try {
                        this.metrics.nosqlCalls++;
                        const resp = await table.fetchItem({ keys });
                        const raw = resp;
                        const items = (raw.get || []).map((d) => typeof d.item?.toJSON === 'function' ? d.item.toJSON() : d.item).filter(Boolean);
                        if (items.length === 0) {
                            consecutiveEmptyBatches++;
                            if (consecutiveEmptyBatches >= 2)
                                foundEmpty = true; // Tolerate small gaps
                        }
                        else {
                            consecutiveEmptyBatches = 0;
                            allItems.push(...items);
                            console.log(`[DB] Fetched dynamic records for ${actualTableName}: +${items.length} (ID: ${currentDynamicId})`);
                        }
                    }
                    catch (e) {
                        consecutiveEmptyBatches++;
                        if (consecutiveEmptyBatches >= 2)
                            foundEmpty = true;
                    }
                    currentDynamicId += 25;
                }
            }
            const cleaned = allItems.map(item => {
                if (!item)
                    return null;
                let unwrapped = item;
                if (typeof item === 'object') {
                    if (item[actualTableName])
                        unwrapped = item[actualTableName];
                    else if (item[tableName])
                        unwrapped = item[tableName];
                }
                if (!unwrapped)
                    return null;
                const clean = {};
                for (const [k, v] of Object.entries(unwrapped)) {
                    if (v && typeof v === 'object') {
                        if ('S' in v)
                            clean[k] = v.S;
                        else if ('N' in v)
                            clean[k] = Number(v.N);
                        else if ('BOOL' in v)
                            clean[k] = v.BOOL === true || v.BOOL === 'true';
                        else if ('NULL' in v)
                            clean[k] = null;
                        else
                            clean[k] = v;
                    }
                    else {
                        clean[k] = v;
                    }
                }
                return clean;
            }).filter(Boolean);
            cacheEntry.data = cleaned;
            // Cache valid results for 5 minutes even if some individual batch had missing keys
            if (cleaned.length === 0) {
                cacheEntry.timestamp = 0;
            }
            else {
                cacheEntry.timestamp = Date.now();
            }
            const totalScanMs = Date.now() - scanStart;
            console.log(`[PERF_TIMING] scanAll(${actualTableName}): ${cleaned.length} rows fetched across ${fetchPromises.length} batches in ${totalScanMs}ms (batchErrors=${batchErrors})`);
            if (this.req?.res && typeof this.req.res.setHeader === 'function' && !this.req.res.headersSent) {
                try {
                    this.req.res.setHeader('X-Timing-Table', actualTableName);
                    this.req.res.setHeader('X-Timing-Rows', String(cleaned.length));
                    this.req.res.setHeader('X-Timing-Ms', String(totalScanMs));
                    this.req.res.setHeader('Access-Control-Expose-Headers', 'X-Data-Partial, X-Timing-Table, X-Timing-Rows, X-Timing-Ms');
                }
                catch (_) { }
            }
            cacheEntry.promise = null;
            return cleaned;
        })();
        try {
            return await cacheEntry.promise;
        }
        catch (e) {
            cacheEntry.promise = null;
            throw e;
        }
    }
    // --- Implementation ---
    async getDistricts() {
        return await this.scanAll('District');
    }
    async getUnits(districtId) {
        const units = await this.scanAll('Unit');
        if (districtId) {
            return units.filter(u => Number(u.DistrictID) === districtId);
        }
        return units;
    }
    async getEmployees() {
        return await this.scanAll('Employee');
    }
    async createEmployee(employeeData, actorId = 'system') {
        const nosql = this.app.nosql();
        const table = nosql.table('employees');
        const { NoSQLItem } = require('zcatalyst-sdk-node/lib/no-sql');
        const employees = await this.getEmployees();
        let employeeId = employees.length > 0 ? Math.max(...employees.map((e) => Number(e.EmployeeID) || 0)) : 9000;
        employeeId++;
        let inserted = false;
        let attempts = 0;
        // Concurrency-safe strategy using the database's native unique constraint.
        // Catalyst NoSQL insertItems will throw if the partition key already exists.
        while (!inserted && attempts < 30) {
            employeeData.EmployeeID = employeeId;
            const item = NoSQLItem.from(employeeData);
            try {
                await table.insertItems({ item });
                inserted = true;
            }
            catch (e) {
                let errorMsg = '';
                try {
                    errorMsg = typeof e === 'object' ? JSON.stringify(e).toLowerCase() : String(e).toLowerCase();
                }
                catch {
                    errorMsg = String(e.message || e).toLowerCase();
                }
                // If the item already exists or duplicate key error, we increment and retry
                if (errorMsg.includes('exist') || errorMsg.includes('duplicate') || errorMsg.includes('already')) {
                    employeeId++;
                    attempts++;
                    // slight backoff to reduce contention
                    await new Promise(r => setTimeout(r, 50 + Math.random() * 50));
                }
                else {
                    console.error("NoSQL Insert Error:", e);
                    throw new Error(`DB Insert Error: ${errorMsg}`); // Throw informative actual network/DB errors
                }
            }
        }
        if (!inserted) {
            throw new Error('Failed to generate a unique Employee ID after multiple attempts due to high concurrency. Please try again.');
        }
        GLOBAL_CACHE['employees'] = { data: null, promise: null, timestamp: 0 };
        await this.createAuditLog({
            Action: 'CREATE_EMPLOYEE',
            EntityType: 'EMPLOYEE',
            EntityID: String(employeeData.EmployeeID),
            Description: `Officer ${employeeData.FirstName} registered`,
            ActorID: actorId
        }).catch(e => console.error(e));
        return employeeData;
    }
    async updateEmployee(employeeId, updateData, actorId = 'system') {
        const nosql = this.app.nosql();
        const { NoSQLItem, NoSQLEnum, NoSQLMarshall } = require('zcatalyst-sdk-node/lib/no-sql');
        const table = nosql.table('employees');
        const updateAttributes = [];
        for (const [key, value] of Object.entries(updateData)) {
            if (key !== 'EmployeeID') {
                updateAttributes.push({
                    operation_type: NoSQLEnum.NoSQLUpdateOperationType.PUT,
                    update_value: NoSQLMarshall.make(value),
                    attribute_path: [key]
                });
            }
        }
        try {
            await table.updateItems({
                keys: new NoSQLItem().addNumber('EmployeeID', employeeId),
                update_attributes: updateAttributes
            });
            GLOBAL_CACHE['employees'] = { data: null, promise: null, timestamp: 0 };
            await this.createAuditLog({
                Action: 'UPDATE_EMPLOYEE',
                EntityType: 'EMPLOYEE',
                EntityID: String(employeeId),
                Description: `Updated employee`,
                ActorID: actorId
            }).catch(e => console.error(e));
            return { EmployeeID: employeeId, ...updateData };
        }
        catch (e) {
            console.error('updateEmployee error', e);
            throw e;
        }
    }
    async deleteEmployee(employeeId, actorId = 'system') {
        const nosql = this.app.nosql();
        const table = nosql.table('employees');
        const { NoSQLItem } = require('zcatalyst-sdk-node/lib/no-sql');
        try {
            const keys = new NoSQLItem().addNumber('EmployeeID', employeeId);
            await table.deleteItems({ keys: [keys] });
            GLOBAL_CACHE['employees'] = { data: null, promise: null, timestamp: 0 };
            await this.createAuditLog({
                Action: 'DELETE_EMPLOYEE',
                EntityType: 'EMPLOYEE',
                EntityID: String(employeeId),
                Description: `Deleted employee`,
                ActorID: actorId
            }).catch(e => console.error(e));
            return true;
        }
        catch (e) {
            console.error(e);
            throw e;
        }
    }
    async createUnit(unitData, actorId = 'system') {
        const nosql = this.app.nosql();
        const table = nosql.table('units');
        const { NoSQLItem } = require('zcatalyst-sdk-node/lib/no-sql');
        const units = await this.getUnits();
        const maxId = units.length > 0 ? Math.max(...units.map((u) => u.UnitID || 0)) : 2000;
        unitData.UnitID = maxId + 1;
        const item = NoSQLItem.from(unitData);
        await table.insertItems({ item });
        GLOBAL_CACHE['units'] = { data: null, promise: null, timestamp: 0 };
        await this.createAuditLog({
            Action: 'CREATE_UNIT',
            EntityType: 'UNIT',
            EntityID: String(unitData.UnitID),
            Description: `Unit ${unitData.UnitName} created`,
            ActorID: actorId
        }).catch(e => console.error(e));
        return unitData;
    }
    async updateUnit(unitId, updateData, actorId = 'system') {
        const nosql = this.app.nosql();
        const { NoSQLItem, NoSQLEnum, NoSQLMarshall } = require('zcatalyst-sdk-node/lib/no-sql');
        const table = nosql.table('units');
        const updateAttributes = [];
        for (const [key, value] of Object.entries(updateData)) {
            if (key !== 'UnitID') {
                updateAttributes.push({
                    operation_type: NoSQLEnum.NoSQLUpdateOperationType.PUT,
                    update_value: NoSQLMarshall.make(value),
                    attribute_path: [key]
                });
            }
        }
        try {
            await table.updateItems({
                keys: new NoSQLItem().addNumber('UnitID', unitId),
                update_attributes: updateAttributes
            });
            GLOBAL_CACHE['units'] = { data: null, promise: null, timestamp: 0 };
            await this.createAuditLog({
                Action: 'UPDATE_UNIT',
                EntityType: 'UNIT',
                EntityID: String(unitId),
                Description: `Updated unit`,
                ActorID: actorId
            }).catch(e => console.error(e));
            return { UnitID: unitId, ...updateData };
        }
        catch (e) {
            console.error('updateUnit error', e);
            throw e;
        }
    }
    async deleteUnit(unitId, actorId = 'system') {
        const nosql = this.app.nosql();
        const table = nosql.table('units');
        const { NoSQLItem } = require('zcatalyst-sdk-node/lib/no-sql');
        try {
            const keys = new NoSQLItem().addNumber('UnitID', unitId);
            await table.deleteItems({ keys: [keys] });
            GLOBAL_CACHE['units'] = { data: null, promise: null, timestamp: 0 };
            await this.createAuditLog({
                Action: 'DELETE_UNIT',
                EntityType: 'UNIT',
                EntityID: String(unitId),
                Description: `Deleted unit`,
                ActorID: actorId
            }).catch(e => console.error(e));
            return true;
        }
        catch (e) {
            console.error(e);
            throw e;
        }
    }
    async createCase(caseData, actorId = 'system') {
        const nosql = this.app.nosql();
        const table = nosql.table('casemasters');
        const { NoSQLItem } = require('zcatalyst-sdk-node/lib/no-sql');
        const validKeys = ["CaseMasterID", "CrimeNo", "CaseNo", "CrimeRegisteredDate", "PolicePersonID", "PoliceStationID", "CaseCategoryID", "GravityOffenceID", "CrimeMajorHeadID", "CrimeMinorHeadID", "CaseStatusID", "CourtID", "IncidentFromDate", "IncidentToDate", "InfoReceivedPSDate", "latitude", "longitude", "BriefFacts"];
        const cleanCaseData = {};
        for (const key of validKeys) {
            if (caseData[key] !== undefined) {
                cleanCaseData[key] = caseData[key];
            }
        }
        const item = NoSQLItem.from(cleanCaseData);
        // Use the correctly supported insertRow method
        try {
            await table.insertItems({ item });
        }
        catch (err) {
            console.error('[DEBUG] insertRow failed for caseData:', JSON.stringify(cleanCaseData, null, 2));
            console.error('[DEBUG] insertRow exact error:', err);
            throw err;
        }
        // Invalidate caches explicitly
        GLOBAL_CACHE['casemasters'] = { data: null, promise: null, timestamp: 0 };
        // Audit log
        await this.createAuditLog({
            Action: 'CREATE_CASE',
            EntityType: 'CASE',
            EntityID: String(caseData.CaseMasterID),
            Description: `Case ${caseData.CaseNo} registered`,
            ActorID: actorId
        }).catch(e => console.error('[Audit] Failed to log createCase:', e));
        return caseData;
    }
    async getCases(filter) {
        const cases = await this.scanAll('CaseMaster');
        let validCaseIds = null;
        if (filter.personId) {
            const allAccused = await this.getAllAccused();
            validCaseIds = new Set(allAccused.filter(a => a.PersonID === filter.personId).map(a => Number(a.CaseMasterID)));
        }
        return cases.filter(c => {
            if (validCaseIds && !validCaseIds.has(Number(c.CaseMasterID)))
                return false;
            if (filter.requireLocation) {
                if (c.latitude == null || c.latitude === 0 || c.latitude === "0")
                    return false;
                if (c.longitude == null || c.longitude === 0 || c.longitude === "0")
                    return false;
            }
            // Allow searching by case number or other string fields if search query is provided
            if (filter.search) {
                const term = filter.search.toLowerCase();
                const caseNoStr = (c.CaseNo || '').toLowerCase();
                const firNoStr = (c.FIRNo || '').toLowerCase();
                const crimeNoStr = (c.CrimeNo || '').toLowerCase();
                const briefStr = (c.BriefFacts || '').toLowerCase();
                if (!caseNoStr.includes(term) && !firNoStr.includes(term) && !crimeNoStr.includes(term) && !briefStr.includes(term))
                    return false;
            }
            if (filter.PoliceStationID) {
                if (typeof filter.PoliceStationID === 'number' && Number(c.PoliceStationID) !== filter.PoliceStationID)
                    return false;
                if (filter.PoliceStationID.$in && !filter.PoliceStationID.$in.includes(Number(c.PoliceStationID)))
                    return false;
            }
            // Officer-level scoping: filter by PolicePersonID (assigned investigating officer)
            if (filter.PolicePersonID && Number(c.PolicePersonID) !== filter.PolicePersonID)
                return false;
            if (filter.CrimeMajorHeadID && Number(c.CrimeMajorHeadID) !== filter.CrimeMajorHeadID)
                return false;
            if (filter.CaseStatusID && Number(c.CaseStatusID) !== filter.CaseStatusID)
                return false;
            if (filter.GravityOffenceID && Number(c.GravityOffenceID) !== filter.GravityOffenceID)
                return false;
            if (filter.CrimeRegisteredDate) {
                if (filter.CrimeRegisteredDate.$gte && c.CrimeRegisteredDate < filter.CrimeRegisteredDate.$gte)
                    return false;
                if (filter.CrimeRegisteredDate.$lte && c.CrimeRegisteredDate > filter.CrimeRegisteredDate.$lte)
                    return false;
            }
            return true;
        });
    }
    async getCaseById(caseId) {
        const cases = await this.scanAll('CaseMaster');
        return cases.find(c => Number(c.CaseMasterID) === caseId) || null;
    }
    async getAllCases() {
        return await this.scanAll('CaseMaster');
    }
    async getAccusedByCase(caseId) {
        const all = await this.scanAll('Accused');
        return all.filter(a => Number(a.CaseMasterID) === caseId);
    }
    async getVictimsByCase(caseId) {
        const all = await this.scanAll('Victim');
        return all.filter(v => Number(v.CaseMasterID) === caseId);
    }
    async getEdgesByCaseViaZCQL(caseId) {
        const cacheKey = `customedges_${caseId}`;
        let cache = GLOBAL_CACHE[cacheKey];
        if (!cache) {
            cache = { data: null, promise: null, timestamp: 0 };
            GLOBAL_CACHE[cacheKey] = cache;
        }
        if (cache.data && (Date.now() - cache.timestamp < 300000))
            return cache.data;
        if (cache.promise)
            return cache.promise;
        const promise = (async () => {
            const nosql = this.app.nosql();
            const zcql = this.app.zcql();
            const { NoSQLItem } = require('zcatalyst-sdk-node/lib/no-sql');
            try {
                // 1. Fetch Strongly Consistent Manual Index
                let indexIds = [];
                try {
                    const resp = await nosql.table('customedges').fetchItem({ keys: [new NoSQLItem().addString('EdgeID', `case-idx-${caseId}`)] });
                    const raw = resp;
                    if (raw.get && raw.get.length > 0) {
                        const itemObj = typeof raw.get[0].item?.to === 'function' ? raw.get[0].item.to() : (typeof raw.get[0].item?.toJSON === 'function' ? raw.get[0].item.toJSON() : raw.get[0].item);
                        let labelStr = itemObj?.label;
                        if (labelStr && typeof labelStr === 'object' && 'S' in labelStr)
                            labelStr = labelStr.S;
                        indexIds = JSON.parse(labelStr || '[]');
                    }
                }
                catch (e) { }
                // 2. Fetch Strongly Consistent Nodes
                const stronglyConsistentEdges = [];
                if (indexIds.length > 0) {
                    for (let i = 0; i < indexIds.length; i += 25) {
                        const batch = indexIds.slice(i, i + 25);
                        const keys = batch.map(id => new NoSQLItem().addString('EdgeID', id));
                        try {
                            const resp = await nosql.table('customedges').fetchItem({ keys });
                            const raw = resp;
                            stronglyConsistentEdges.push(...(raw.get || []).map((d) => {
                                const itemObj = typeof d.item?.to === 'function' ? d.item.to() : (typeof d.item?.toJSON === 'function' ? d.item.toJSON() : d.item);
                                if (!itemObj)
                                    return null;
                                const clean = {};
                                for (const [k, v] of Object.entries(itemObj)) {
                                    if (v && typeof v === 'object') {
                                        if ('S' in v)
                                            clean[k] = v.S;
                                        else if ('N' in v)
                                            clean[k] = Number(v.N);
                                        else if ('BOOL' in v)
                                            clean[k] = v.BOOL === true || v.BOOL === 'true';
                                        else if ('NULL' in v)
                                            clean[k] = null;
                                        else
                                            clean[k] = v;
                                    }
                                    else {
                                        clean[k] = v;
                                    }
                                }
                                return clean;
                            }).filter(Boolean));
                        }
                        catch (e) { }
                    }
                }
                // 3. Fetch ZCQL (Eventually Consistent fallback for older nodes)
                let zcqlEdges = [];
                try {
                    const res = await zcql.executeZCQLQuery(`SELECT * FROM customedges WHERE CaseMasterID = ${caseId}`);
                    zcqlEdges = res.map((r) => r.customedges);
                }
                catch (e) { }
                // 4. Merge and Deduplicate
                const allEdgesMap = new Map();
                zcqlEdges.forEach(e => allEdgesMap.set(e.EdgeID, e));
                stronglyConsistentEdges.forEach(e => allEdgesMap.set(e.EdgeID, e));
                const allEdges = Array.from(allEdgesMap.values());
                cache.data = allEdges;
                cache.timestamp = Date.now();
                return allEdges;
            }
            catch (e) {
                console.error('getEdgesByCaseViaZCQL error:', e.message);
                return [];
            }
            finally {
                cache.promise = null;
            }
        })();
        cache.promise = promise;
        return promise;
    }
    async getCustomEdgesByCase(caseId) {
        try {
            const allEdges = await this.getEdgesByCaseViaZCQL(caseId);
            return allEdges.filter((e) => Number(e.CaseMasterID) === Number(caseId) && e.source !== 'entity');
        }
        catch (e) {
            console.error('getCustomEdgesByCase error:', e.message);
            return [];
        }
    }
    async getAllCustomEdges() {
        try {
            const zcql = this.app.zcql();
            const res = await zcql.executeZCQLQuery("SELECT * FROM customedges LIMIT 200");
            return res.map((r) => r.customedges);
        }
        catch (e) {
            console.error('getAllCustomEdges ZCQL error:', e.message);
            return [];
        }
    }
    async getComplainants() {
        return await this.scanAll('complainants');
    }
    async getActSections() {
        // ActSectionAssociation lives in Catalyst Datastore (SQL), not NoSQL.
        // Use ZCQL to query it, same as complainants/customedges.
        try {
            const zcql = this.app.zcql();
            const res = await zcql.executeZCQLQuery('SELECT * FROM ActSectionAssociation LIMIT 5000');
            return res.map((r) => r.ActSectionAssociation || r);
        }
        catch (e) {
            console.warn('[DB] getActSections: ZCQL failed (table may not exist):', e.message);
            return [];
        }
    }
    async getActs() {
        return exports.STATUTORY_ACTS;
    }
    async getSections() {
        return exports.STATUTORY_SECTIONS;
    }
    async getRepeatOffenders() {
        const allAccused = await this.scanAll('Accused');
        const personMap = new Map();
        allAccused.forEach(acc => {
            if (!acc.PersonID || acc.PersonID === "")
                return;
            if (!personMap.has(acc.PersonID)) {
                personMap.set(acc.PersonID, {
                    _id: acc.PersonID,
                    name: acc.AccusedName,
                    offenceCount: 0,
                    caseIds: []
                });
            }
            const record = personMap.get(acc.PersonID);
            record.offenceCount += 1;
            record.caseIds.push(acc.CaseMasterID);
        });
        return Array.from(personMap.values())
            .filter(p => p.offenceCount > 1)
            .sort((a, b) => (b.offenceCount - a.offenceCount) || a._id.localeCompare(b._id))
            .slice(0, 5);
    }
    async getStationCaseCounts() {
        const cases = await this.scanAll('CaseMaster');
        const countMap = new Map();
        cases.forEach(c => {
            const sId = Number(c.PoliceStationID);
            if (!countMap.has(sId))
                countMap.set(sId, 0);
            countMap.set(sId, countMap.get(sId) + 1);
        });
        return Array.from(countMap.entries()).map(([stationId, count]) => ({ stationId, count }));
    }
    async getAllAccused() {
        return await this.scanAll('Accused');
    }
    async getAllVictims() {
        return await this.scanAll('Victim');
    }
    async getCasesByOfficer(officerId) {
        const cases = await this.scanAll('CaseMaster');
        return cases.filter(c => Number(c.PolicePersonID) === officerId);
    }
    async getCasesByStation(stationId) {
        const cases = await this.scanAll('CaseMaster');
        return cases.filter(c => Number(c.PoliceStationID) === stationId);
    }
    // --- Case Mutations ---
    async updateCaseStatus(caseId, statusId, userEmail) {
        const nosql = this.app.nosql();
        const { NoSQLItem, NoSQLEnum, NoSQLMarshall } = require('zcatalyst-sdk-node/lib/no-sql');
        const table = nosql.table('casemasters');
        try {
            await table.updateItems({
                keys: new NoSQLItem().addNumber('CaseMasterID', caseId),
                update_attributes: [
                    {
                        operation_type: NoSQLEnum.NoSQLUpdateOperationType.PUT,
                        update_value: NoSQLMarshall.make(statusId),
                        attribute_path: ['CaseStatusID']
                    }
                ]
            });
            // Invalidate cache
            GLOBAL_CACHE['casemasters'] = { data: null, promise: null, timestamp: 0 };
            // Audit log
            await this.createAuditLog({
                Action: 'UPDATE_CASE_STATUS',
                EntityType: 'CASE',
                EntityID: String(caseId),
                Description: `Case status updated to ${statusId}`,
                ActorID: userEmail || 'system',
                NewValue: String(statusId)
            });
            return true;
        }
        catch (e) {
            console.error('updateCaseStatus error', e);
            return false;
        }
    }
    async updateCase(caseId, updateData, actorId = 'system') {
        const nosql = this.app.nosql();
        const { NoSQLItem, NoSQLEnum, NoSQLMarshall } = require('zcatalyst-sdk-node/lib/no-sql');
        const table = nosql.table('casemasters');
        const allowedKeys = new Set([
            'PoliceStationID', 'CaseCategoryID', 'GravityOffenceID',
            'CrimeMajorHeadID', 'CrimeMinorHeadID', 'CaseStatusID',
            'CourtID', 'IncidentFromDate', 'IncidentToDate',
            'InfoReceivedPSDate', 'latitude', 'longitude',
            'BriefFacts', 'GDEntryNumber', 'GDEntryTimestamp',
            'DelayInReporting', 'DelayReason', 'BNSApplicable',
            'CrimeSceneLocation', 'DistanceDirection',
            'JurisdictionFlag', 'StolenProperty'
        ]);
        const updateAttributes = [];
        for (const [key, value] of Object.entries(updateData)) {
            if (!allowedKeys.has(key)) {
                throw new Error(`Field '${key}' is unsupported or immutable.`);
            }
            let marshalledValue;
            if (typeof value === 'number') {
                marshalledValue = NoSQLMarshall.makeNumber(value);
            }
            else if (typeof value === 'boolean') {
                marshalledValue = NoSQLMarshall.makeBoolean(value);
            }
            else {
                marshalledValue = NoSQLMarshall.make(value);
            }
            updateAttributes.push({
                operation_type: NoSQLEnum.NoSQLUpdateOperationType.PUT,
                update_value: marshalledValue,
                attribute_path: [key]
            });
        }
        if (updateAttributes.length === 0) {
            return this.getCaseById(caseId); // Nothing to update
        }
        try {
            await table.updateItems({
                keys: new NoSQLItem().addNumber('CaseMasterID', caseId),
                update_attributes: updateAttributes
            });
            // Invalidate cache
            GLOBAL_CACHE['casemasters'] = { data: null, promise: null, timestamp: 0 };
            // Audit log
            await this.createAuditLog({
                Action: 'UPDATE_CASE',
                EntityType: 'CASE',
                EntityID: String(caseId),
                Description: 'Case fields updated',
                ActorID: actorId,
                NewValue: JSON.stringify(updateData)
            });
            return await this.getCaseById(caseId);
        }
        catch (e) {
            console.error('updateCase error', e);
            throw e;
        }
    }
    async reassignCase(caseId, targetOfficerId, actorId = 'system') {
        const employees = await this.getEmployees();
        const officerExists = employees.find(e => Number(e.EmployeeID) === targetOfficerId);
        if (!officerExists) {
            throw new Error(`Invalid target officer ID: ${targetOfficerId}`);
        }
        const nosql = this.app.nosql();
        const { NoSQLItem, NoSQLEnum, NoSQLMarshall } = require('zcatalyst-sdk-node/lib/no-sql');
        const table = nosql.table('casemasters');
        try {
            await table.updateItems({
                keys: new NoSQLItem().addNumber('CaseMasterID', caseId),
                update_attributes: [
                    {
                        operation_type: NoSQLEnum.NoSQLUpdateOperationType.PUT,
                        update_value: NoSQLMarshall.makeNumber(targetOfficerId),
                        attribute_path: ['PolicePersonID']
                    }
                ]
            });
            // Invalidate cache
            GLOBAL_CACHE['casemasters'] = { data: null, promise: null, timestamp: 0 };
            // Audit log
            await this.createAuditLog({
                Action: 'REASSIGN_CASE',
                EntityType: 'CASE',
                EntityID: String(caseId),
                Description: `Case reassigned to officer ${targetOfficerId}`,
                ActorID: actorId,
                NewValue: String(targetOfficerId)
            });
            return true;
        }
        catch (e) {
            console.error('reassignCase error', e);
            throw e;
        }
    }
    async deleteCase(caseId, actorId = 'system') {
        // First, fetch the case so we can include stationId/officerId in the audit log
        const caseRecord = await this.getCaseById(caseId);
        if (!caseRecord) {
            throw new Error(`Case ${caseId} not found`);
        }
        const nosql = this.app.nosql();
        const table = nosql.table('casemasters');
        const { NoSQLItem } = require('zcatalyst-sdk-node/lib/no-sql');
        try {
            const keys = new NoSQLItem().addNumber('CaseMasterID', caseId);
            await table.deleteItems({ keys: [keys] });
            // Invalidate the casemasters cache so subsequent reads reflect the deletion
            GLOBAL_CACHE['casemasters'] = { data: null, promise: null, timestamp: 0 };
            // Audit log
            await this.createAuditLog({
                Action: 'DELETE_CASE',
                EntityType: 'CASE',
                EntityID: String(caseId),
                Description: `Case ${caseRecord.CaseNo || caseId} deleted`,
                ActorID: actorId
            }).catch(e => console.error('[Audit] Failed to log deleteCase:', e));
            console.log(`[DB] CaseMaster ${caseId} deleted by ${actorId}`);
            return true;
        }
        catch (e) {
            console.error('deleteCase error', e);
            throw e;
        }
    }
    // --- Timeline, Evidence, Chargesheets ---
    async addTimelineNote(note, actorId = 'system') {
        const nosql = this.app.nosql();
        const { NoSQLItem } = require('zcatalyst-sdk-node/lib/no-sql');
        // Ensure NoteID is present
        if (!note.NoteID)
            note.NoteID = Date.now();
        const item = NoSQLItem.from(note);
        await nosql.table('timelinenotes').insertItems({ item });
        // Audit log
        await this.createAuditLog({
            Action: 'ADD_TIMELINE_NOTE',
            EntityType: 'TIMELINE',
            EntityID: String(note.NoteID),
            Description: `Timeline note added to Case ${note.CaseMasterID}`,
            ActorID: actorId || note.user_email || 'system'
        });
        return note;
    }
    async getTimelineNotesByCase(caseId) {
        const nosql = this.app.nosql();
        const { NoSQLEnum, NoSQLMarshall } = require('zcatalyst-sdk-node/lib/no-sql');
        try {
            const resp = await nosql.table('timelinenotes').queryTable({
                key_condition: {
                    attribute: ['CaseMasterID'],
                    operator: NoSQLEnum.NoSQLOperator.EQUALS,
                    value: NoSQLMarshall.makeNumber(caseId)
                }
            });
            const raw = resp;
            return (raw.get || []).map((d) => typeof d.item?.toJSON === 'function' ? d.item.toJSON() : d.item).filter(Boolean);
        }
        catch (e) {
            if (e.message?.includes('Table Not Found'))
                return [];
            console.error('getTimelineNotesByCase error:', e);
            return [];
        }
    }
    async uploadEvidence(evidence, actorId = 'system') {
        const nosql = this.app.nosql();
        const { NoSQLItem } = require('zcatalyst-sdk-node/lib/no-sql');
        if (!evidence.EvidenceID)
            evidence.EvidenceID = Date.now();
        const item = NoSQLItem.from(evidence);
        await nosql.table('evidencefiles').insertItems({ item });
        // Audit log
        await this.createAuditLog({
            Action: 'UPLOAD_EVIDENCE',
            EntityType: 'EVIDENCE',
            EntityID: String(evidence.EvidenceID),
            Description: `Evidence uploaded for Case ${evidence.CaseMasterID}`,
            ActorID: actorId || evidence.userEmail || 'system'
        });
        return evidence;
    }
    async getEvidenceFilesByCase(caseId) {
        const nosql = this.app.nosql();
        const { NoSQLEnum, NoSQLMarshall } = require('zcatalyst-sdk-node/lib/no-sql');
        try {
            const resp = await nosql.table('evidencefiles').queryTable({
                key_condition: {
                    attribute: ['CaseMasterID'],
                    operator: NoSQLEnum.NoSQLOperator.EQUALS,
                    value: NoSQLMarshall.makeNumber(caseId)
                }
            });
            const raw = resp;
            return (raw.get || []).map((d) => typeof d.item?.toJSON === 'function' ? d.item.toJSON() : d.item).filter(Boolean);
        }
        catch (e) {
            return [];
        }
    }
    async submitChargesheet(cs, actorId = 'system') {
        const nosql = this.app.nosql();
        const { NoSQLItem } = require('zcatalyst-sdk-node/lib/no-sql');
        if (!cs.CSID)
            cs.CSID = Date.now();
        const item = NoSQLItem.from(cs);
        await nosql.table('chargesheets').insertItems({ item });
        // Audit log
        await this.createAuditLog({
            Action: 'SUBMIT_CHARGESHEET',
            EntityType: 'CHARGESHEET',
            EntityID: String(cs.CSID),
            Description: `Chargesheet submitted for Case ${cs.CaseMasterID}`,
            ActorID: actorId || cs.user_email || 'system'
        });
        return cs;
    }
    async getChargesheetsByCase(caseId) {
        const nosql = this.app.nosql();
        const { NoSQLEnum, NoSQLMarshall } = require('zcatalyst-sdk-node/lib/no-sql');
        try {
            const resp = await nosql.table('chargesheets').queryTable({
                key_condition: {
                    attribute: ['CaseMasterID'],
                    operator: NoSQLEnum.NoSQLOperator.EQUALS,
                    value: NoSQLMarshall.makeNumber(caseId)
                }
            });
            const raw = resp;
            return (raw.get || []).map((d) => typeof d.item?.toJSON === 'function' ? d.item.toJSON() : d.item).filter(Boolean);
        }
        catch (e) {
            return [];
        }
    }
    // --- Manual Indexing for Strong Consistency ---
    async syncManualIndex(caseId, edgeId, action) {
        const nosql = this.app.nosql();
        const { NoSQLItem, NoSQLEnum, NoSQLMarshall } = require('zcatalyst-sdk-node/lib/no-sql');
        const indexEdgeId = `case-idx-${caseId}`;
        try {
            const resp = await nosql.table('customedges').fetchItem({ keys: [new NoSQLItem().addString('EdgeID', indexEdgeId)] });
            const raw = resp;
            let ids = [];
            let exists = false;
            if (raw.get && raw.get.length > 0) {
                exists = true;
                const itemObj = typeof raw.get[0].item?.to === 'function' ? raw.get[0].item.to() : (typeof raw.get[0].item?.toJSON === 'function' ? raw.get[0].item.toJSON() : raw.get[0].item);
                let labelStr = itemObj?.label;
                if (labelStr && typeof labelStr === 'object' && 'S' in labelStr)
                    labelStr = labelStr.S;
                ids = JSON.parse(labelStr || '[]');
            }
            let changed = false;
            if (action === 'add' && !ids.includes(edgeId)) {
                ids.push(edgeId);
                changed = true;
            }
            else if (action === 'remove' && ids.includes(edgeId)) {
                ids = ids.filter(id => id !== edgeId);
                changed = true;
            }
            if (changed) {
                if (exists) {
                    await nosql.table('customedges').updateItems({
                        keys: new NoSQLItem().addString('EdgeID', indexEdgeId),
                        update_attributes: [{
                                operation_type: NoSQLEnum.NoSQLUpdateOperationType.PUT,
                                update_value: NoSQLMarshall.make(JSON.stringify(ids)),
                                attribute_path: ['label']
                            }]
                    });
                }
                else {
                    const item = NoSQLItem.from({
                        EdgeID: indexEdgeId,
                        CaseMasterID: caseId,
                        source: 'index',
                        target: 'index',
                        label: JSON.stringify(ids)
                    });
                    await nosql.table('customedges').insertItems({ item });
                }
            }
        }
        catch (e) {
            console.error('syncManualIndex error:', e.message);
            if (action === 'add') {
                try {
                    const item = NoSQLItem.from({
                        EdgeID: indexEdgeId,
                        CaseMasterID: caseId,
                        source: 'index',
                        target: 'index',
                        label: JSON.stringify([edgeId])
                    });
                    await nosql.table('customedges').insertItems({ item });
                }
                catch (insertError) {
                    console.error('syncManualIndex fallback insert error:', insertError.message);
                }
            }
        }
    }
    // --- Network Mutations ---
    async addCustomEdge(edge) {
        const nosql = this.app.nosql();
        const { NoSQLItem } = require('zcatalyst-sdk-node/lib/no-sql');
        if (!edge.EdgeID) {
            const crypto = require('crypto');
            edge.EdgeID = crypto.randomUUID();
        }
        const item = NoSQLItem.from(edge);
        await nosql.table('customedges').insertItems({ item });
        await this.syncManualIndex(edge.CaseMasterID, edge.EdgeID, 'add');
        const cacheKey = `customedges_${edge.CaseMasterID}`;
        if (GLOBAL_CACHE[cacheKey] && GLOBAL_CACHE[cacheKey].data) {
            GLOBAL_CACHE[cacheKey].data.push(item);
        }
        return edge;
    }
    async getCaseEntities(caseId) {
        try {
            const allEdges = await this.getEdgesByCaseViaZCQL(caseId);
            return allEdges.filter((e) => Number(e.CaseMasterID) === Number(caseId) && e.source === 'entity').map((edge) => {
                try {
                    return {
                        EntityID: edge.target,
                        CaseMasterID: edge.CaseMasterID,
                        ...JSON.parse(edge.label || '{}')
                    };
                }
                catch (e) {
                    return null;
                }
            }).filter(Boolean);
        }
        catch (e) {
            console.error('getCaseEntities error:', e.message);
            return [];
        }
    }
    async addCaseEntity(entityType, entity, actorId = 'system') {
        const nosql = this.app.nosql();
        const { NoSQLItem } = require('zcatalyst-sdk-node/lib/no-sql');
        // Route proper entities to their real tables
        if (entityType === 'Complainant') {
            const item = NoSQLItem.from(entity);
            await nosql.table('complainants').insertItems({ item });
            GLOBAL_CACHE['complainants'] = { data: null, promise: null, timestamp: 0 };
            return entity;
        }
        if (entityType === 'Victim') {
            const item = NoSQLItem.from(entity);
            await nosql.table('victims').insertItems({ item });
            GLOBAL_CACHE['victims'] = { data: null, promise: null, timestamp: 0 };
            return entity;
        }
        if (entityType === 'Accused') {
            const item = NoSQLItem.from(entity);
            await nosql.table('accuseds').insertItems({ item });
            GLOBAL_CACHE['accuseds'] = { data: null, promise: null, timestamp: 0 };
            return entity;
        }
        if (entityType === 'ActSection') {
            // Guard: skip insert entirely if ActID or SectionID are empty/falsy
            if (!entity.ActID || !entity.SectionID) {
                console.log('[addCaseEntity] Skipping ActSection insert: missing ActID or SectionID', entity);
                return entity;
            }
            // ActSectionAssociation is a Datastore table, not NoSQL
            const datastore = this.app.datastore();
            try {
                await datastore.table('ActSectionAssociation').insertRow(entity);
            }
            catch (err) {
                // Log but do NOT throw — a missing act-section link should never fail the whole FIR creation
                console.error(`Failed to insert ActSectionAssociation (non-fatal):`, err.message || err);
            }
            return entity;
        }
        // Fallback: Persist to customedges for pure Network Graph custom entities
        const crypto = require('crypto');
        const entityId = entity.EntityID || entity.PersonID || entity.VictimID || entity.ComplainantID || crypto.randomUUID();
        const edge = {
            EdgeID: `entity-${entityId}`,
            CaseMasterID: entity.CaseMasterID,
            source: 'entity',
            target: String(entityId),
            label: JSON.stringify({ type: entityType, value: entity.value, description: entity.description })
        };
        const item = NoSQLItem.from(edge);
        await nosql.table('customedges').insertItems({ item });
        await this.syncManualIndex(entity.CaseMasterID, edge.EdgeID, 'add');
        const cacheKey = `customedges_${entity.CaseMasterID}`;
        if (GLOBAL_CACHE[cacheKey] && GLOBAL_CACHE[cacheKey].data) {
            GLOBAL_CACHE[cacheKey].data.push(item);
        }
        // Audit log
        await this.createAuditLog({
            Action: 'CREATE_CASE_ENTITY',
            EntityType: entityType.toUpperCase(),
            EntityID: String(entityId),
            Description: `${entityType} added to Case ${entity.CaseMasterID}`,
            ActorID: actorId || entity.userEmail || 'system'
        }).catch(e => console.error(e));
        return { ...entity, EntityID: entityId };
    }
    async deleteCaseEntity(caseId, entityId, actorId = 'system') {
        const nosql = this.app.nosql();
        const { NoSQLItem, NoSQLEnum, NoSQLMarshall } = require('zcatalyst-sdk-node/lib/no-sql');
        // The Add node stores the entity edge exactly as 'entity-' + entityId
        const entityEdgeId = `entity-${entityId}`;
        // 1. Delete the primary node edge
        try {
            const keys = new NoSQLItem().addString('EdgeID', entityEdgeId);
            await nosql.table('customedges').deleteItems({ keys: [keys] });
            await this.syncManualIndex(caseId, entityEdgeId, 'remove');
        }
        catch (e) {
            console.error('Failed to delete primary entity node:', e);
        }
        // 2. Fetch and delete any connected relationship edges using NoSQL ZCQL
        try {
            const allEdges = await this.getEdgesByCaseViaZCQL(caseId);
            for (const edge of allEdges) {
                if (Number(edge.CaseMasterID) === Number(caseId) && (edge.source === entityEdgeId || edge.target === entityEdgeId)) {
                    if (edge.EdgeID) {
                        const edgeKeys = new NoSQLItem().addString('EdgeID', edge.EdgeID);
                        await nosql.table('customedges').deleteItems({ keys: [edgeKeys] }).catch((err) => console.error(err));
                        await this.syncManualIndex(caseId, edge.EdgeID, 'remove');
                    }
                }
            }
        }
        catch (e) {
            console.error('Failed to query/delete connected edges:', e);
        }
        // Update cache
        const cacheKey = `customedges_${caseId}`;
        if (GLOBAL_CACHE[cacheKey] && GLOBAL_CACHE[cacheKey].data) {
            GLOBAL_CACHE[cacheKey].data = GLOBAL_CACHE[cacheKey].data.filter((e) => e.EdgeID !== entityEdgeId && e.source !== entityEdgeId && e.target !== entityEdgeId);
        }
        // Audit log
        await this.createAuditLog({
            Action: 'DELETE_CASE_ENTITY',
            EntityType: 'CUSTOM_ENTITY',
            EntityID: entityId,
            Description: `Deleted entity ${entityId} from Case ${caseId}`,
            ActorID: actorId
        }).catch(e => console.error(e));
    }
    async getCaseStatistics(metric, filters) {
        const cases = await this.scanAll('CaseMaster');
        // Apply filters
        const filteredCases = cases.filter(c => {
            if (c.latitude == null || c.latitude === 0 || c.longitude == null || c.longitude === 0)
                return false;
            if (filters.station && Number(c.PoliceStationID) !== filters.station)
                return false;
            if (filters.crime_category && Number(c.CrimeMajorHeadID) !== filters.crime_category)
                return false;
            // We assume station implies district. If district is provided without station, we'd ideally need a join,
            // but for simplicity we rely on frontend/LLM sending the station IDs if needed, or if DistrictID exists on CaseMaster.
            if (filters.district && c.DistrictID && Number(c.DistrictID) !== filters.district)
                return false;
            return true;
        });
        switch (metric) {
            case 'total_cases':
                return { metric: 'total_cases', value: filteredCases.length, source: 'CloudScale' };
            case 'pending_cases': {
                // MATCHING DASHBOARD LOGIC: Solved/Closed are StatusID 2, 3, or 4.
                // Therefore Pending is total minus solved.
                const solved = filteredCases.filter(c => c.CaseStatusID === 2 || c.CaseStatusID === 3 || c.CaseStatusID === 4).length;
                const pending = filteredCases.length - solved;
                return { metric: 'pending_cases', value: pending, source: 'CloudScale' };
            }
            case 'solved_cases': {
                // MATCHING DASHBOARD LOGIC: Solved/Closed are StatusID 2, 3, or 4.
                const solved = filteredCases.filter(c => c.CaseStatusID === 2 || c.CaseStatusID === 3 || c.CaseStatusID === 4).length;
                return { metric: 'solved_cases', value: solved, source: 'CloudScale' };
            }
            case 'crime_category_breakdown': {
                const counts = {};
                filteredCases.forEach(c => {
                    const cat = Number(c.CrimeMajorHeadID);
                    counts[cat] = (counts[cat] || 0) + 1;
                });
                return { metric, breakdown: Object.entries(counts).map(([k, v]) => ({ crime_category: Number(k), count: v })), source: 'CloudScale' };
            }
            case 'station_breakdown': {
                const counts = {};
                filteredCases.forEach(c => {
                    const st = Number(c.PoliceStationID);
                    counts[st] = (counts[st] || 0) + 1;
                });
                return { metric, breakdown: Object.entries(counts).map(([k, v]) => ({ station_id: Number(k), count: v })), source: 'CloudScale' };
            }
            case 'district_breakdown': {
                const counts = {};
                filteredCases.forEach(c => {
                    // If DistrictID is not populated on CaseMaster, we fallback to PoliceStationID as a proxy or 0
                    const dist = Number(c.DistrictID) || 0;
                    counts[dist] = (counts[dist] || 0) + 1;
                });
                return { metric, breakdown: Object.entries(counts).map(([k, v]) => ({ district_id: Number(k), count: v })), source: 'CloudScale' };
            }
            default:
                throw new Error(`Metric '${metric}' is not supported.`);
        }
    }
    async updateCaseEntity(entityId, entityType, value, description, actorId = 'system', position, caseId) {
        const nosql = this.app.nosql();
        const { NoSQLItem, NoSQLEnum, NoSQLMarshall } = require('zcatalyst-sdk-node/lib/no-sql');
        const edgeId = `entity-${entityId}`;
        // Support keeping existing position if not provided
        let labelObj = { type: entityType, value, description };
        if (position) {
            labelObj.position = position;
        }
        else {
            try {
                if (caseId) {
                    const existingEdges = await this.getEdgesByCaseViaZCQL(caseId);
                    const existing = existingEdges.find((e) => e.EdgeID === edgeId);
                    if (existing && existing.label) {
                        const parsed = JSON.parse(existing.label);
                        if (parsed.position)
                            labelObj.position = parsed.position;
                    }
                }
            }
            catch (e) { }
        }
        await nosql.table('customedges').updateItems({
            keys: new NoSQLItem().addString('EdgeID', edgeId),
            update_attributes: [
                {
                    operation_type: NoSQLEnum.NoSQLUpdateOperationType.PUT,
                    update_value: NoSQLMarshall.make(JSON.stringify(labelObj)),
                    attribute_path: ['label']
                }
            ]
        });
        if (caseId) {
            const cacheKey = `customedges_${caseId}`;
            if (GLOBAL_CACHE[cacheKey] && GLOBAL_CACHE[cacheKey].data) {
                const idx = GLOBAL_CACHE[cacheKey].data.findIndex((e) => e.EdgeID === edgeId);
                if (idx !== -1) {
                    const e = GLOBAL_CACHE[cacheKey].data[idx];
                    const newLabel = { ...JSON.parse(e.label || '{}'), ...labelObj };
                    e.label = JSON.stringify(newLabel);
                }
            }
        }
        await this.createAuditLog({
            Action: 'UPDATE_CASE_ENTITY',
            EntityType: 'CUSTOM_ENTITY',
            EntityID: String(entityId),
            Description: `Updated entity ${entityId} to type ${entityType}, value ${value}`,
            ActorID: actorId
        });
        return { EntityID: entityId, type: entityType, value, description, position: labelObj.position };
    }
    // --- Audit Logs ---
    async createAuditLog(log) {
        try {
            const nosql = this.app.nosql();
            const table = nosql.table('auditlogs');
            const { NoSQLItem } = require('zcatalyst-sdk-node/lib/no-sql');
            const logId = `${Date.now()}-${Math.floor(Math.random() * 10000)}`;
            const timestamp = new Date().toISOString();
            const item = NoSQLItem.from({
                AuditLogID: logId,
                LogGroup: 'ALL',
                Timestamp: timestamp,
                Action: log.Action,
                EntityType: log.EntityType,
                EntityID: log.EntityID,
                Description: log.Description,
                ActorID: String(log.ActorID || ''),
                OldValue: log.OldValue || null,
                NewValue: log.NewValue || null
            });
            await table.insertItems({ item });
        }
        catch (e) {
            // Do not re-throw here so the business operation succeeds even if auditing fails.
            // But log heavily.
            console.error('[Audit] Critical: Failed to persist audit log in CloudScale:', e);
        }
    }
    async getAuditLogs(filter) {
        try {
            const nosql = this.app.nosql();
            const table = nosql.table('auditlogs');
            const { NoSQLEnum, NoSQLMarshall, NoSQLItem } = require('zcatalyst-sdk-node/lib/no-sql');
            const { NoSQLOperator } = NoSQLEnum;
            const page = filter?.page && filter.page >= 1 ? filter.page : 1;
            const limit = filter?.limit && filter.limit >= 1 && filter.limit <= 100 ? filter.limit : 50;
            const query = {
                key_condition: {
                    attribute: ['LogGroup'],
                    operator: NoSQLOperator.EQUALS,
                    value: NoSQLMarshall.makeString('ALL')
                },
                forward_scan: false,
                limit: limit
            };
            if (filter?.cursor) {
                query.start_key = NoSQLItem.from({
                    LogGroup: 'ALL',
                    Timestamp: filter.cursor
                });
            }
            const tableDetails = await nosql.getTable('auditlogs');
            const detailsJson = tableDetails.toJSON ? tableDetails.toJSON() : tableDetails;
            const index = detailsJson.global_index?.find((idx) => idx.name === 'LogGroupIndex' || idx.id === 'LogGroupIndex')
                || detailsJson.local_index?.find((idx) => idx.name === 'LogGroupIndex' || idx.id === 'LogGroupIndex');
            const realTable = nosql.table(detailsJson);
            const indexIdToUse = index ? index.id : 'LogGroupIndex';
            const res = await realTable.queryIndex(indexIdToUse, query);
            const raw = res;
            const data = (raw.get || []).map((d) => {
                const item = d.item;
                if (!item)
                    return null;
                // Unwrap the {"S": "..."} NoSQL raw types returned by queryIndex
                const rawJson = typeof item.toJSON === 'function' ? item.toJSON() : item;
                const clean = {};
                for (const [k, v] of Object.entries(rawJson)) {
                    if (v && typeof v === 'object') {
                        if ('S' in v)
                            clean[k] = v.S;
                        else if ('N' in v)
                            clean[k] = Number(v.N);
                        else if ('BOOL' in v)
                            clean[k] = v.BOOL === true || v.BOOL === 'true';
                        else if ('NULL' in v)
                            clean[k] = null;
                        else
                            clean[k] = v;
                    }
                    else {
                        clean[k] = v;
                    }
                }
                return clean;
            }).filter(Boolean);
            let nextCursor;
            if (raw.start_key) {
                const skItem = raw.start_key;
                if (typeof skItem.getString === 'function') {
                    nextCursor = skItem.getString('Timestamp') || undefined;
                }
                else if (skItem.Timestamp) {
                    nextCursor = skItem.Timestamp;
                }
                else if (skItem.toJSON) {
                    nextCursor = skItem.toJSON().Timestamp;
                }
            }
            return {
                data,
                total: 0, // Fallback, NoSQL does not support cheap counts
                page,
                limit,
                nextCursor
            };
        }
        catch (error) {
            console.error('[Audit] Failed to fetch audit logs from NoSQL index:', error);
            return { data: [], total: 0, page: 1, limit: 50 };
        }
    }
}
exports.CloudScaleRepository = CloudScaleRepository;
function invalidateAllCache() {
    for (const key of Object.keys(GLOBAL_CACHE)) {
        GLOBAL_CACHE[key] = { data: null, promise: null, timestamp: 0 };
    }
    console.log('[Cache] Invalidate all cache called.');
}
