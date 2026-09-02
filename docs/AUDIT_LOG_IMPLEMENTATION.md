# Persistent Backend Audit Logs Implementation

This document describes the implementation of persistent, server-side audit logs using Catalyst CloudScale.

## 1. Architecture
The original audit log system relied on the frontend `localStorage` (via `mockDb.ts`), which was insecure and ephemeral. The new architecture moves the authoritative source of audit truth entirely to the backend. Successful database mutations now synchronously append a strongly-typed audit record to a dedicated CloudScale `auditlogs` table.

## 2. CloudScale Table Name
**Table**: `auditlogs`

## 3. CloudScale Schema
Each audit record uses the `AuditLog` interface:
- **AuditLogID**: string (e.g., `1678123123-1234`)
- **Timestamp**: ISO 8601 string
- **Action**: string (e.g., `UPDATE_CASE`, `REASSIGN_CASE`)
- **EntityType**: string (e.g., `CASE`, `TIMELINE`, `ACCUSED`)
- **EntityID**: string
- **Description**: string (Human-readable description)
- **ActorID**: string
- **OldValue**: string | null (Optional)
- **NewValue**: string | null (Optional JSON or string payload)

*Note*: No sensitive authentication credentials, passwords, or tokens are ever stored in the audit trail.

## 4. Repository Methods
`backend/src/repositories/IDataRepository.ts` now defines two new methods:
- `createAuditLog(log: AuditLogPayload): Promise<void>`
- `getAuditLogs(filter?: AuditLogFilter): Promise<AuditLogResult>`

`CloudScaleRepository` implements these using standard Catalyst SDK NoSQL methods:
- `insertItems()` to persist records.
- `scanAll()` for retrievals.

## 5. API Endpoints
- **[NEW] `GET /api/audit-logs`**: Exposes the backend audit trail to the admin UI.
  - Supports query parameters: `entityType`, `entityId`, `actorId`, `action`, `page`, `limit`.

## 6. Audit Events Implemented
We inject `createAuditLog` tracking after successful operations for the following events:
- `CREATE_CASE`
- `UPDATE_CASE`
- `REASSIGN_CASE`
- `UPDATE_CASE_STATUS`
- `ADD_TIMELINE_NOTE`
- `UPLOAD_EVIDENCE`
- `SUBMIT_CHARGESHEET`
- `CREATE_CASE_ENTITY` (when adding Accused, Victim, Complainant)

## 7. Actor Identity Mechanism & Limitation
**Constraint & Limitation**: The current backend architecture (`app.ts`) does not enforce a strict JWT middleware or possess an authenticated request context (e.g., `req.user`). 
**Implementation Strategy**: 
- We do **NOT** treat the frontend-provided `userEmail` as cryptographically authenticated or trusted.
- For traceability without spoofing security guarantees, we pass `req.body.userEmail` or `req.headers['x-user-email']` down to the repository. If not provided, it explicitly falls back to `'system'`.
- This clearly demonstrates the limitation: until a robust authentication system (like standard Bearer tokens) is configured at the edge, `ActorID` reflects the provided email but should formally be regarded as 'unknown/system' from a zero-trust perspective. 

## 8. Frontend Changes
- Modified `frontend/src/pages/Admin/AuditLogs.tsx` to read directly from `GET /api/audit-logs` using `useEffect` and standard `fetch`.
- Replaced `localStorage` filtering with backend-driven pagination variables.
- Preserved the existing UI grid/roster aesthetic while adding a loading spinner (`<Loader />`) and error handling states.
- Implemented robust UI-side pagination (Previous/Next buttons linked to `page` state).

## 9. Pagination Implementation
Given the current schema and scale, the implementation employs a hybrid approach:
- **CloudScale Retrieval**: We use `scanAll('auditlogs')` to retrieve records.
- **Server-Side Processing**: The array is filtered, sorted (newest first), and sliced on the Express/Node layer based on `page` and `limit`.
- **Response**: The API returns precisely what the client requested in the current chunk, meaning the browser does *not* download the entire table. Database-level pagination via cursors is deferred for when scale mandates it.

## 10. Security Behavior
- **Append-Only**: There is no API route exposed for `PUT`, `PATCH`, or `DELETE` on `/api/audit-logs`. Records can only be appended programmatically by the server following a successful mutation.
- **Success/Failure Semantics**: `await this.createAuditLog(...)` executes strictly *after* the core business operation (e.g., `updateItems`) yields success.
- **Audit Persistence Failure**: If the `insertItems` call for the audit log fails, the error is caught and logged (`console.error`), but the application suppresses the exception so the primary business flow succeeds.

## 11. Persistence Verification Result
All architecture strictly binds the audit trail to the persistent CloudScale backend. Since data flows out of `GET /api/audit-logs` straight from `nosql.table('auditlogs')`, any hard-reload immediately recovers identical audit entries without dependency on the client session.

## 12. Remaining Limitations
1. **Actor Traceability**: Without real JWTs, we remain reliant on frontend-provided fields or fallback to `'system'`.
2. **True DB Pagination**: Large-scale auditing (e.g., millions of rows) will eventually necessitate true Catalyst NoSQL cursors instead of `scanAll` + Node-side slicing.
3. **No Notifications/AI**: As per project restrictions, notifications remain uncoupled from backend auditing and AI features were intentionally excluded from this scope.
