"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getRoleFromLegacyRank = getRoleFromLegacyRank;
/**
 * Temporarily maps legacy RankID to modern RBAC fields.
 * This function exists to preserve CloudScale data without requiring a full backfill migration.
 * Phase 3/4 should replace this by storing SystemRole and RankString natively in the database.
 */
function getRoleFromLegacyRank(rankId) {
    switch (rankId) {
        case 1: // Constable
            return { RankString: 'PC', SystemRole: 'FIELD_OFFICER', ScopeType: 'ASSIGNED' };
        case 2: // Head Constable
            return { RankString: 'HC', SystemRole: 'WRITER', ScopeType: 'STATION' };
        case 3: // ASI
            return { RankString: 'ASI', SystemRole: 'IO', ScopeType: 'ASSIGNED' };
        case 4: // PSI/SI
            return { RankString: 'PSI_SI', SystemRole: 'IO', ScopeType: 'ASSIGNED' };
        case 5: // Inspector
            return { RankString: 'PI', SystemRole: 'SHO', ScopeType: 'STATION' };
        case 6: // DySP / ASP
            return { RankString: 'ASP_DYSP', SystemRole: 'ADMIN_COMMAND', ScopeType: 'RANGE' };
        case 7: // SP
            return { RankString: 'SP_DCP', SystemRole: 'ADMIN_COMMAND', ScopeType: 'DISTRICT' };
        case 8: // IGP
            return { RankString: 'IGP', SystemRole: 'ADMIN_COMMAND', ScopeType: 'STATE' };
        default:
            // Fallback for unknown rank
            return { RankString: 'UNKNOWN', SystemRole: 'FIELD_OFFICER', ScopeType: 'ASSIGNED' };
    }
}
