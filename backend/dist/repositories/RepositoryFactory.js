"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RepositoryFactory = void 0;
const CloudScaleRepository_1 = require("./CloudScaleRepository");
class RepositoryFactory {
    static getRepository(req) {
        console.log('[DB] Using CloudScale Repository (Per-Request)');
        return new CloudScaleRepository_1.CloudScaleRepository(req);
    }
}
exports.RepositoryFactory = RepositoryFactory;
