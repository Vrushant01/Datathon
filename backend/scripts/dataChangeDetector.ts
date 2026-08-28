import crypto from 'crypto';
import fs from 'fs/promises';
import path from 'path';

// Canonicalize JSON by sorting object keys and serializing
export function canonicalizeJSON(obj: any): string {
    if (Array.isArray(obj)) {
        // If it's an array of objects, we don't necessarily sort the array (to maintain generated order)
        // But we canonicalize each element
        return '[' + obj.map(item => canonicalizeJSON(item)).join(',') + ']';
    } else if (obj !== null && typeof obj === 'object') {
        const sortedKeys = Object.keys(obj).sort();
        const parts = sortedKeys.map(k => `"${k}":${canonicalizeJSON(obj[k])}`);
        return '{' + parts.join(',') + '}';
    }
    return JSON.stringify(obj);
}

export function generateChecksum(data: any): string {
    const canonical = canonicalizeJSON(data);
    return crypto.createHash('sha256').update(canonical).digest('hex');
}

export async function detectChanges(genDir: string, manifestPath: string) {
    const tables = [
        { key: 'SEED_DISTRICTS', table: 'districts' },
        { key: 'SEED_UNITS', table: 'units' },
        { key: 'SEED_EMPLOYEES', table: 'employees' },
        { key: 'SEED_CASES', table: 'casemasters' },
        { key: 'SEED_ACCUSED', table: 'accuseds' },
        { key: 'SEED_VICTIMS', table: 'victims' }
    ];

    let manifest: any = {};
    try {
        const raw = await fs.readFile(manifestPath, 'utf-8');
        manifest = JSON.parse(raw);
    } catch (e) {
        // No existing manifest
    }

    const currentHashes = manifest.hashes || {};
    const changes: string[] = [];
    const newHashes: any = {};
    const newCounts: any = {};

    console.log('\n==================================================');
    console.log('CHANGE DETECTION');
    console.log('==================================================\n');

    const seedData = await import('../../frontend/src/utils/seedData');

    for (const t of tables) {
        const data = seedData[t.key] || [];
        const checksum = generateChecksum(data);
        
        newHashes[t.table] = checksum;
        newCounts[t.table] = data.length;

        if (currentHashes[t.table] !== checksum) {
            console.log(`${t.table.padEnd(15)} : CHANGED`);
            changes.push(t.table);
        } else {
            console.log(`${t.table.padEnd(15)} : UNCHANGED`);
        }
    }

    return { changes, newHashes, newCounts, oldManifest: manifest };
}
