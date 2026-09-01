"use strict";
// Minimal in-memory query engine so the AI planner can keep issuing
// Mongo-shaped filters/pipelines, but they run against arrays already
// pulled from Catalyst CloudScale (see cloudscale.ts) instead of a
// real MongoDB driver. Supports the operator subset your planner prompt
// and existing filters (see CloudScaleRepository.getCases) already use:
// equality, $gte, $lte, $gt, $lt, $ne, $in.
Object.defineProperty(exports, "__esModule", { value: true });
exports.runAggregate = exports.countDocs = exports.findDocs = exports.matchesFilter = exports.assertSafeQuery = void 0;
const FORBIDDEN_OPERATORS = ['$where', '$function', '$accumulator', '$out', '$merge'];
const assertSafeQuery = (query) => {
    const str = JSON.stringify(query ?? {});
    for (const op of FORBIDDEN_OPERATORS) {
        if (str.includes(`"${op}"`)) {
            throw new Error(`Security Violation: operator ${op} is not permitted.`);
        }
    }
};
exports.assertSafeQuery = assertSafeQuery;
const getField = (doc, path) => path.split('.').reduce((v, k) => (v == null ? undefined : v[k]), doc);
const matchesFilter = (doc, filter = {}) => {
    for (const [key, cond] of Object.entries(filter)) {
        const value = getField(doc, key);
        if (cond !== null && typeof cond === 'object' && !Array.isArray(cond)) {
            for (const [op, opVal] of Object.entries(cond)) {
                switch (op) {
                    case '$gte':
                        if (!(value >= opVal))
                            return false;
                        break;
                    case '$lte':
                        if (!(value <= opVal))
                            return false;
                        break;
                    case '$gt':
                        if (!(value > opVal))
                            return false;
                        break;
                    case '$lt':
                        if (!(value < opVal))
                            return false;
                        break;
                    case '$ne':
                        if (value === opVal)
                            return false;
                        break;
                    case '$in':
                        if (!Array.isArray(opVal) || !opVal.includes(value))
                            return false;
                        break;
                    case '$options': break; // handled by $regex
                    case '$regex':
                        if (typeof value !== 'string')
                            return false;
                        try {
                            const flags = cond.$options || 'i';
                            if (!new RegExp(opVal, flags).test(value))
                                return false;
                        }
                        catch (e) {
                            return false;
                        }
                        break;
                    default: throw new Error(`Security Violation: operator ${op} is not permitted.`);
                }
            }
        }
        else {
            if (value !== cond)
                return false;
        }
    }
    return true;
};
exports.matchesFilter = matchesFilter;
const findDocs = (data, filter, limit = 10, sort) => {
    (0, exports.assertSafeQuery)(filter);
    let results = data.filter(d => (0, exports.matchesFilter)(d, filter));
    if (sort) {
        const [field, dir] = sort;
        results = results.sort((a, b) => (getField(a, field) > getField(b, field) ? 1 : -1) * dir);
    }
    return results.slice(0, Math.min(limit, 100));
};
exports.findDocs = findDocs;
const countDocs = (data, filter) => {
    (0, exports.assertSafeQuery)(filter);
    return data.filter(d => (0, exports.matchesFilter)(d, filter)).length;
};
exports.countDocs = countDocs;
// Supports a small pipeline subset: $match, $group (with $sum/$avg/$count/$min/$max),
// $sort, $limit — enough for "count by district", "avg risk by station" style questions.
const runAggregate = (data, pipeline) => {
    (0, exports.assertSafeQuery)(pipeline);
    let rows = data;
    for (const stage of pipeline) {
        if (stage.$match) {
            rows = rows.filter(d => (0, exports.matchesFilter)(d, stage.$match));
        }
        else if (stage.$group) {
            const { _id, ...accs } = stage.$group;
            const groups = new Map();
            for (const row of rows) {
                const key = typeof _id === 'string' && _id.startsWith('$')
                    ? String(getField(row, _id.slice(1)))
                    : 'all';
                if (!groups.has(key))
                    groups.set(key, []);
                groups.get(key).push(row);
            }
            rows = Array.from(groups.entries()).map(([key, groupRows]) => {
                const out = { _id: key };
                for (const [outField, accExpr] of Object.entries(accs)) {
                    const [accOp, srcField] = Object.entries(accExpr)[0];
                    const isCountShorthand = srcField === 1 || srcField === undefined;
                    const nums = isCountShorthand
                        ? groupRows.map(() => 1)
                        : groupRows.map(r => Number(getField(r, String(srcField).replace(/^\$/, ''))) || 0);
                    switch (accOp) {
                        case '$sum':
                            out[outField] = isCountShorthand ? groupRows.length : nums.reduce((a, b) => a + b, 0);
                            break;
                        case '$avg':
                            out[outField] = nums.reduce((a, b) => a + b, 0) / (nums.length || 1);
                            break;
                        case '$min':
                            out[outField] = Math.min(...nums);
                            break;
                        case '$max':
                            out[outField] = Math.max(...nums);
                            break;
                        case '$count':
                            out[outField] = groupRows.length;
                            break;
                        default: throw new Error(`Security Violation: accumulator ${accOp} is not permitted.`);
                    }
                }
                return out;
            });
        }
        else if (stage.$sort) {
            const [[field, dir]] = Object.entries(stage.$sort);
            rows = rows.sort((a, b) => (getField(a, field) > getField(b, field) ? 1 : -1) * dir);
        }
        else if (stage.$limit) {
            rows = rows.slice(0, stage.$limit);
        }
        else {
            const key = Object.keys(stage)[0];
            throw new Error(`Security Violation: pipeline stage ${key} is not permitted.`);
        }
    }
    return rows.slice(0, 100);
};
exports.runAggregate = runAggregate;
