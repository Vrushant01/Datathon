    // Temporary helper for CloudScale NoSQL because it lacks a native scan operation
    private async scanAll(tableName: string): Promise<any[]> {
        const nosql = this.app.nosql();
        const table = nosql.table(tableName);
        
        // Define known ranges based on our dataset
        let ids: number[] = [];
        let pkField = '';
        
        switch (tableName) {
            case 'districts':
                pkField = 'DistrictID';
                for (let i = 1001; i <= 1031; i++) ids.push(i);
                break;
            case 'units':
                pkField = 'UnitID';
                for (let i = 2001; i <= 2930; i++) ids.push(i);
                break;
            case 'employees':
                pkField = 'EmployeeID';
                for (let i = 10001; i <= 31000; i++) ids.push(i); // Generous range
                break;
            case 'casemasters':
                pkField = 'CaseMasterID';
                for (let i = 1; i <= 5000; i++) ids.push(i);
                break;
            case 'accuseds':
                pkField = 'AccusedMasterID';
                for (let i = 1; i <= 5000; i++) ids.push(i);
                break;
            case 'victims':
                pkField = 'VictimMasterID';
                for (let i = 1; i <= 5000; i++) ids.push(i);
                break;
            default:
                throw new Error(`scanAll not supported for table: ${tableName}`);
        }

        const allItems: any[] = [];
        const { NoSQLItem } = require('zcatalyst-sdk-node/lib/no-sql');
        
        // Batch in groups of 25 (Catalyst limit)
        for (let i = 0; i < ids.length; i += 25) {
            const batch = ids.slice(i, i + 25);
            const keys = batch.map(v => new NoSQLItem().addNumber(pkField, v));
            try {
                const resp = await table.fetchItem({ keys });
                const raw = resp.toJSON?.() ?? resp;
                const items = (raw.get || []).map((d: any) => {
                    const item = d.item;
                    if (!item) return null;
                    return typeof item.toJSON === 'function' ? item.toJSON() : item;
                }).filter(Boolean);
                allItems.push(...items);
            } catch (e) {
                // Ignore missing batches
            }
        }
        
        // Unpack DynamoDB-style typing ({S: "val"}, {N: "123"})
        return allItems.map(item => {
            const clean: any = {};
            for (const [k, v] of Object.entries(item)) {
                if (v && typeof v === 'object') {
                    if ('S' in (v as any)) clean[k] = (v as any).S;
                    else if ('N' in (v as any)) clean[k] = Number((v as any).N);
                    else if ('BOOL' in (v as any)) clean[k] = (v as any).BOOL;
                    else clean[k] = v;
                } else {
                    clean[k] = v;
                }
            }
            return clean;
        });
    }
