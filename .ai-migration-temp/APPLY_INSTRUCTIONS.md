# How to apply this to your actual repo

This zip mirrors your repo's folder structure. Everything in it is new or
modified — copy it over your real `Datathon/` project (paths line up
exactly with `backend/src/ai/...` and `frontend/src/pages/Admin/...`).

## 1. Copy files in
Overwrite these files with the versions in this zip:
- backend/src/ai/schemaCache.ts
- backend/src/ai/config.ts
- backend/src/ai/promptBuilder.ts
- backend/src/ai/planner.ts
- backend/src/ai/rag.ts
- backend/src/ai/chatbot.ts
- backend/src/ai/retriever.ts
- backend/src/ai/index.ts
- backend/src/ai/tools/findDocuments.ts
- backend/src/ai/tools/countDocuments.ts
- backend/src/ai/tools/aggregate.ts
- backend/src/ai/tools/listCollections.ts
- frontend/src/pages/Admin/AIAssistant.tsx

Add these new files (they didn't exist before):
- backend/src/ai/cloudscale.ts
- backend/src/ai/queryEngine.ts
- backend/src/ai/catalystAuth.ts
- backend/src/ai/catalystLLM.ts

## 2. Delete these files (fully replaced, now dead code)
- backend/src/ai/mongodb.ts
- backend/src/ai/embeddings.ts
- backend/src/ai/vectorStore.ts
- backend/src/ai/tools/similaritySearch.ts
- backend/src/ai/queryValidator.ts

## 3. Confirm your .env has these three (you already set them)
```
ZOHO_REFRESH_TOKEN=...
ZOHO_CLIENT_ID=...
ZOHO_CLIENT_SECRET=...
```
Optional (defaults already point at your deployed endpoint, override only if needed):
```
CATALYST_LLM_ENDPOINT_URL=https://api.catalyst.zoho.in/quickml/v1/project/45359000000013024/glm/chat
CATALYST_ORG_ID=60079756936
CATALYST_LLM_MODEL=crm-di-glm47b_30b_it
ZOHO_ACCOUNTS_URL=https://accounts.zoho.in
```

## 4. Kill and restart your dev server
`dotenv` only loads env vars at process startup — if `npm run dev` was
already running, Ctrl+C it and start it again after copying these files in.

## 5. Verify compiles clean
From `backend/`:
```bash
npx tsc --noEmit -p tsconfig.json
```
Should print nothing (no errors). I ran this exact check in my own clone
before packaging this, so it should be clean — but your local `node_modules`
version of `zcatalyst-sdk-node` or TS config could differ slightly, so
worth re-checking on your machine.

## 6. Test again
Ask "How many FIRs were registered today?" in the AI Assistant UI and
watch your terminal logs, same as before. Send me the output either way.
