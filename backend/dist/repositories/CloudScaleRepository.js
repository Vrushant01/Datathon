"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CloudScaleRepository = void 0;
exports.getCatalystApp = getCatalystApp;
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
    auditlogs: { data: null, promise: null, timestamp: 0 }
};
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
// Singleton Catalyst app instance.
// In AppSail, CATALYST_CONFIG env var is always set by the platform and contains
// the project credentials. initializeApp() reads it without needing request headers.
// This avoids the "unable to find the type of initialisation" error that occurs
// when catalyst.initialize(req) is called with a browser-originating request
// that lacks Catalyst's internal proxy headers.
let _catalystApp = null;
function getCatalystApp(req) {
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
    throw new Error('Cannot initialize Catalyst SDK: no CATALYST_CONFIG env var and no valid request');
}
class CloudScaleRepository {
    app;
    metrics;
    constructor(req) {
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
                    break;
                case 'accuseds':
                    pkField = 'AccusedMasterID';
                    for (let i = 80001; i <= 90500; i++)
                        ids.push(i);
                    break;
                case 'victims':
                    pkField = 'VictimMasterID';
                    for (let i = 70001; i <= 80500; i++)
                        ids.push(i);
                    break;
            }
            const allItems = [];
            let batchErrors = 0;
            const { NoSQLItem } = require('zcatalyst-sdk-node/lib/no-sql');
            // Fetch in batches of 25 (max supported by fetchItem)
            // Fetch in batches of 25 (max supported by fetchItem)
            const fetchPromises = [];
            for (let i = 0; i < ids.length; i += 25) {
                const batch = ids.slice(i, i + 25);
                const keys = batch.map(v => new NoSQLItem().addNumber(pkField, v));
                fetchPromises.push(async () => {
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
                    }
                    catch (e) {
                        batchErrors++;
                        console.error(`[DB] fetchItem batch failed for ${actualTableName}:`, e?.message || e);
                    }
                });
            }
            // Run fetchPromises in controlled concurrency batches.
            // CONCURRENCY=4: safe against CloudScale rate limits while still being ~4x faster than sequential.
            // 400 batches / 4 concurrent = 100 rounds * ~150ms avg = ~15 seconds for casemasters (cold start).
            // After first load, 5-minute cache makes all subsequent calls instant.
            const CONCURRENCY = 4;
            for (let i = 0; i < fetchPromises.length; i += CONCURRENCY) {
                const chunk = fetchPromises.slice(i, i + CONCURRENCY);
                await Promise.all(chunk.map(fn => fn()));
                // Small delay between rounds to stay well within CloudScale rate limits
                if (i + CONCURRENCY < fetchPromises.length) {
                    await new Promise(r => setTimeout(r, 50));
                }
            }
            if (batchErrors > 0) {
                console.warn(`[DB] scanAll(${actualTableName}): ${batchErrors} batch(es) failed silently. Data may be partial.`);
            }
            const cleaned = allItems.map(item => {
                const clean = {};
                for (const [k, v] of Object.entries(item)) {
                    if (v && typeof v === 'object') {
                        if ('S' in v)
                            clean[k] = v.S;
                        else if ('N' in v)
                            clean[k] = Number(v.N);
                        else if ('BOOL' in v)
                            clean[k] = v.BOOL === true || v.BOOL === 'true';
                        else
                            clean[k] = v;
                    }
                    else {
                        clean[k] = v;
                    }
                }
                return clean;
            });
            cacheEntry.data = cleaned;
            cacheEntry.timestamp = Date.now();
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
    async createCase(caseData, actorId = 'system') {
        const nosql = this.app.nosql();
        const table = nosql.table('casemasters');
        const { NoSQLItem } = require('zcatalyst-sdk-node/lib/no-sql');
        const item = NoSQLItem.from(caseData);
        // Explicitly using the already-proven insertItems
        await table.insertItems({ item });
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
        return cases.filter(c => {
            if (c.latitude == null || c.latitude === 0)
                return false;
            if (c.longitude == null || c.longitude === 0)
                return false;
            if (filter.PoliceStationID) {
                if (typeof filter.PoliceStationID === 'number' && Number(c.PoliceStationID) !== filter.PoliceStationID)
                    return false;
                if (filter.PoliceStationID.$in && !filter.PoliceStationID.$in.includes(Number(c.PoliceStationID)))
                    return false;
            }
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
    async getAllCasesForAnalytics() {
        const cases = await this.scanAll('CaseMaster');
        const valid = cases.filter(c => c.latitude != null && c.latitude !== 0 && c.longitude != null && c.longitude !== 0);
        valid.sort((a, b) => new Date(b.CrimeRegisteredDate).getTime() - new Date(a.CrimeRegisteredDate).getTime());
        return valid.slice(0, 5000);
    }
    async getAccusedByCase(caseId) {
        const all = await this.scanAll('Accused');
        return all.filter(a => Number(a.CaseMasterID) === caseId);
    }
    async getVictimsByCase(caseId) {
        const all = await this.scanAll('Victim');
        return all.filter(v => Number(v.CaseMasterID) === caseId);
    }
    async getCustomEdgesByCase(caseId) {
        return [];
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
        try {
            const zcql = this.app.zcql();
            const res = await zcql.executeZCQLQuery("SELECT * FROM complainants LIMIT 200");
            return res.map((r) => r.complainants);
        }
        catch (e) {
            console.error('getComplainants ZCQL error:', e.message);
            return [];
        }
    }
    async getActSections() {
        try {
            const zcql = this.app.zcql();
            const res = await zcql.executeZCQLQuery("SELECT * FROM actsections LIMIT 200");
            return res.map((r) => r.actsections);
        }
        catch (e) {
            console.error('getActSections ZCQL error:', e.message);
            return [];
        }
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
        return edge;
    }
    async addCaseEntity(entityType, entity, actorId = 'system') {
        const nosql = this.app.nosql();
        const { NoSQLItem } = require('zcatalyst-sdk-node/lib/no-sql');
        let table = 'accuseds';
        if (entityType === 'Victim')
            table = 'victims';
        if (entityType === 'Complainant')
            table = 'complainants';
        const item = NoSQLItem.from(entity);
        await nosql.table(table).insertItems({ item });
        GLOBAL_CACHE[table] = { data: null, promise: null, timestamp: 0 };
        // Audit log
        const entityId = entity.PersonID || entity.VictimID || entity.ComplainantID || Date.now();
        await this.createAuditLog({
            Action: 'CREATE_CASE_ENTITY',
            EntityType: entityType.toUpperCase(),
            EntityID: String(entityId),
            Description: `${entityType} added to Case ${entity.CaseMasterID}`,
            ActorID: actorId || entity.userEmail || 'system'
        });
        return entity;
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
    async updateCaseEntity(entityType, entity) {
        throw new Error('Update entity not fully implemented in CloudScale repo mock');
    }
    async deleteCaseEntity(entityType, entityId) {
        throw new Error('Delete entity not fully implemented in CloudScale repo mock');
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
                return typeof item.toJSON === 'function' ? item.toJSON() : item;
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
