"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.chatComplete = void 0;
const catalystAuth_1 = require("./catalystAuth");
const logger_1 = require("./logger");
const ENDPOINT_URL = process.env.CATALYST_LLM_ENDPOINT_URL
    || 'https://api.catalyst.zoho.in/quickml/v1/project/45359000000013024/glm/chat';
const CATALYST_ORG = process.env.CATALYST_ORG_ID || '60079756936';
const MODEL = process.env.CATALYST_LLM_MODEL || 'crm-di-glm47b_30b_it';
const chatComplete = async (messages, opts = {}) => {
    const accessToken = await (0, catalystAuth_1.getCatalystAccessToken)();
    const body = {
        model: MODEL,
        messages,
        max_tokens: opts.maxTokens ?? 1500,
        temperature: opts.temperature ?? 0.2,
        stream: false,
        chat_template_kwargs: { enable_thinking: false },
    };
    if (opts.tools)
        body.tools = opts.tools;
    if (opts.toolChoice)
        body.tool_choice = opts.toolChoice;
    const start = Date.now();
    const resp = await fetch(ENDPOINT_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`,
            'CATALYST-ORG': CATALYST_ORG,
        },
        body: JSON.stringify(body),
    });
    if (!resp.ok) {
        const text = await resp.text();
        logger_1.aiLogger.error(`Catalyst LLM call failed: ${resp.status} ${text}`);
        throw new Error(`Catalyst LLM call failed: ${resp.status}`);
    }
    const json = await resp.json();
    logger_1.aiLogger.info(`Catalyst LLM call completed in ${Date.now() - start}ms`);
    if (process.env.AI_DEBUG_RAW_RESPONSES === 'true') {
        logger_1.aiLogger.info(`[DEBUG] Raw QuickML response: ${JSON.stringify(json)}`);
    }
    // This QuickML LLM Serving deployment returns a flat {response, tool_calls}
    // shape, NOT the OpenAI choices[0].message shape the request format implied.
    // tool_calls has come back empty even when the model attempts a tool call —
    // in that case it embeds a pseudo-XML <tool_call>...</tool_call> block
    // directly inside `response` instead. See planner.ts for the text parser
    // that handles that case.
    return {
        content: json.response ?? json.choices?.[0]?.message?.content ?? null,
        toolCalls: (json.tool_calls?.length ? json.tool_calls : null) ?? json.choices?.[0]?.message?.tool_calls ?? null,
        raw: json,
    };
};
exports.chatComplete = chatComplete;
