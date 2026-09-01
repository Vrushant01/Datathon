"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMigrationStatus = exports.startMigration = void 0;
const startMigration = async (req, res) => {
    res.status(400).json({ error: 'MongoDB has been permanently removed. Migration is no longer possible.' });
};
exports.startMigration = startMigration;
const getMigrationStatus = async (req, res) => {
    res.json({
        status: 'completed',
        progress: 100,
        total: 100,
        currentTable: 'None',
        message: 'MongoDB removed. CloudScale is the single source of truth.'
    });
};
exports.getMigrationStatus = getMigrationStatus;
