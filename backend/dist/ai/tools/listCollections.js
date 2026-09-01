"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listCollections = void 0;
const cloudscale_1 = require("../cloudscale");
const listCollections = async () => {
    return (0, cloudscale_1.listTables)();
};
exports.listCollections = listCollections;
