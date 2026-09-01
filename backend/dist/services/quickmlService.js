"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.predictStationRisk = void 0;
const axios_1 = __importDefault(require("axios"));
const predictStationRisk = async (features) => {
    const endpoint = process.env.QUICKML_ENDPOINT_URL;
    let token = process.env.QUICKML_ACCESS_TOKEN;
    if (!endpoint || !token) {
        throw new Error('QuickML configuration is missing in environment variables.');
    }
    try {
        const makeRequest = async (accessToken) => {
            return await axios_1.default.post(endpoint, { data: features }, {
                headers: {
                    'CATALYST-ORG': process.env.QUICKML_ORG_ID,
                    'X-QUICKML-ENDPOINT-KEY': process.env.QUICKML_ENDPOINT_KEY,
                    'Authorization': `Zoho-oauthtoken ${accessToken}`,
                    'Content-Type': 'application/json'
                },
                timeout: 10000 // 10s timeout
            });
        };
        let response;
        try {
            response = await makeRequest(token);
        }
        catch (error) {
            if (error.response && error.response.data && error.response.data.code === 'INVALID_OAUTHTOKEN') {
                console.log('[Station Risk] Access token expired. Attempting refresh...');
                const refreshUrl = `https://accounts.zoho.in/oauth/v2/token?grant_type=refresh_token&client_id=${process.env.ZOHO_CLIENT_ID}&client_secret=${process.env.ZOHO_CLIENT_SECRET}&refresh_token=${process.env.QUICKML_REFRESH_TOKEN}`;
                const refreshRes = await axios_1.default.post(refreshUrl);
                if (refreshRes.data && refreshRes.data.access_token) {
                    token = refreshRes.data.access_token;
                    process.env.QUICKML_ACCESS_TOKEN = token; // Update for current process
                    console.log('[Station Risk] Token refreshed successfully.');
                    response = await makeRequest(token);
                }
                else {
                    throw new Error('Failed to refresh token: ' + JSON.stringify(refreshRes.data));
                }
            }
            else {
                throw error;
            }
        }
        const mlData = response.data;
        console.log(`[Station Risk] QuickML Response Type: ${typeof mlData}, Keys: ${mlData ? Object.keys(mlData).join(',') : 'none'}`);
        // Sometimes APIs wrap responses in a 'data' object. Handle both unwrapped and wrapped.
        const payload = (mlData && mlData.result) ? mlData : (mlData && mlData.data ? mlData.data : null);
        // Convert QuickML response to our expected format (QuickML returns arrays for batch/single predictions)
        if (payload && Array.isArray(payload.result) && Array.isArray(payload.likelihood_score)) {
            const risk = payload.result[0];
            const likelihoodScore = payload.likelihood_score[0];
            return {
                success: true,
                risk: risk,
                riskLabel: risk === 1 ? 'High' : 'Low',
                likelihoodScore: likelihoodScore
            };
        }
        else {
            console.error(`[Station Risk] Malformed QuickML response: ${JSON.stringify(mlData)}`);
            throw new Error('Malformed QuickML response.');
        }
    }
    catch (error) {
        if (error.response) {
            throw new Error(`QuickML Error: ${error.response.status} - ${JSON.stringify(error.response.data)}`);
        }
        else if (error.request) {
            throw new Error('QuickML Network Error: No response received.');
        }
        else {
            throw new Error(`QuickML Error: ${error.message}`);
        }
    }
};
exports.predictStationRisk = predictStationRisk;
