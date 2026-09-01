"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.fixDates = fixDates;
async function fixDates(req, res) {
    try {
        const catalyst = require('zcatalyst-sdk-node');
        const app = catalyst.initialize(req);
        const nosql = app.nosql();
        const table = nosql.table('casemasters');
        const { NoSQLItem, NoSQLEnum, NoSQLMarshall } = require('zcatalyst-sdk-node/lib/no-sql');
        // Generate date distribution (9674 records)
        // Target: March 2026 to August 30, 2026
        const totalRecords = 9674;
        const endDate = new Date('2026-08-30T23:59:59Z');
        const startDate = new Date('2026-03-01T00:00:00Z');
        // We'll read from seedData to get a clean object, which is guaranteed to parse correctly by the SDK
        const { SEED_CASES } = require('../scripts/generated/seedData');
        let allItems = SEED_CASES.filter((c) => c.CaseMasterID >= 100001 && c.CaseMasterID <= 110000);
        console.log(`Using ${allItems.length} casemasters from seedData.`);
        if (allItems.length === 0) {
            return res.status(404).json({ error: "No records found" });
        }
        // Now calculate dates for allItems.length records
        const timeDiff = endDate.getTime() - startDate.getTime();
        const recordsToUpdate = allItems.sort((a, b) => a.CaseMasterID - b.CaseMasterID);
        // Create a mapping
        const mapping = [];
        const report = {
            oldDateRange: { min: '9999', max: '0000' },
            newDateRange: { min: '9999', max: '0000' },
            monthlyDistribution: {},
            failedUpdates: 0,
            recordsUpdated: 0
        };
        const updates = [];
        for (let i = 0; i < recordsToUpdate.length; i++) {
            const item = recordsToUpdate[i];
            const randomMs = Math.random() * timeDiff;
            const newD = new Date(startDate.getTime() + randomMs);
            const newIso = newD.toISOString();
            const newDateStr = newIso.split('T')[0];
            const oldIso = item.CrimeRegisteredDateTime;
            const oldDateStr = item.CrimeRegisteredDate;
            if (oldIso < report.oldDateRange.min)
                report.oldDateRange.min = oldIso;
            if (oldIso > report.oldDateRange.max)
                report.oldDateRange.max = oldIso;
            if (newIso < report.newDateRange.min)
                report.newDateRange.min = newIso;
            if (newIso > report.newDateRange.max)
                report.newDateRange.max = newIso;
            const monthKey = newDateStr.substring(0, 7);
            report.monthlyDistribution[monthKey] = (report.monthlyDistribution[monthKey] || 0) + 1;
            mapping.push({
                id: item.CaseMasterID,
                oldIso,
                oldDateStr,
                newIso,
                newDateStr
            });
            updates.push({
                id: item.CaseMasterID,
                newIso,
                newDateStr
            });
        }
        console.log("Saving mapping backup...");
        const fs = require('fs');
        const backupPath = require('path').join(__dirname, '../scripts/date_migration_backup.json');
        fs.writeFileSync(backupPath, JSON.stringify(mapping, null, 2));
        console.log("Executing updates in batches of 25...");
        for (let i = 0; i < updates.length; i += 25) {
            const batch = updates.slice(i, i + 25);
            const promises = batch.map(async (u) => {
                try {
                    const itemToUpdate = recordsToUpdate.find((r) => r.CaseMasterID === u.id);
                    if (itemToUpdate) {
                        const cleanObj = JSON.parse(JSON.stringify(itemToUpdate));
                        cleanObj.CrimeRegisteredDateTime = u.newIso;
                        cleanObj.CrimeRegisteredDate = u.newDateStr;
                        const item = NoSQLItem.from(cleanObj);
                        await table.insertItems({ item });
                        report.recordsUpdated++;
                    }
                }
                catch (err) {
                    console.error(`Update failed for ${u.id}`, err);
                    report.failedUpdates++;
                    if (!report.errors)
                        report.errors = [];
                    report.errors.push(err.message);
                }
            });
            await Promise.all(promises);
            await new Promise(r => setTimeout(r, 100));
            if ((i + batch.length) % 1000 === 0) {
                console.log(`Updated ${i + batch.length} / ${updates.length}`);
            }
        }
        res.json({
            success: true,
            report,
            backupLocation: backupPath
        });
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
}
