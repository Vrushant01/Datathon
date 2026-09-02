# Case Update & Reassignment Implementation

This document outlines the implementation details for the Case Update and Case Reassignment persistence in the KSP AI-Driven Crime Analytics Platform.

## 1. Endpoints Implemented

### 1.1 Case Update (`PUT /api/cases/:id` & `PATCH /api/cases/:id`)
- **Description:** Updates the fields of an existing `CaseMaster` record in Catalyst CloudScale.
- **Request Payload:** `CaseUpdatePayload` (Partial updates supported by both `PUT` and `PATCH` per the CloudScale NoSQL table capabilities).
- **Validation:** 
  - The backend maintains an explicit allowlist of updateable fields. 
  - Attempts to modify unsupported or immutable fields (such as `CaseMasterID`, `CrimeRegisteredDate`, `CaseNo`, `CrimeNo`) immediately return a `400 Bad Request` without modifying the database.

**Updateable Fields Allowlist:**
- `PoliceStationID`
- `CaseCategoryID`
- `GravityOffenceID`
- `CrimeMajorHeadID`
- `CrimeMinorHeadID`
- `CaseStatusID`
- `CourtID`
- `IncidentFromDate`
- `IncidentToDate`
- `InfoReceivedPSDate`
- `latitude`
- `longitude`
- `BriefFacts`
- `GDEntryNumber`
- `GDEntryTimestamp`
- `DelayInReporting`
- `DelayReason`
- `BNSApplicable`
- `CrimeSceneLocation`
- `DistanceDirection`
- `JurisdictionFlag`
- `StolenProperty`

### 1.2 Case Reassignment (`PUT /api/cases/:caseId/reassign`)
- **Description:** Reassigns the investigating officer (`PolicePersonID`) for a given case.
- **Request Payload:** `{ "officerId": number }`
- **Validation:** 
  - Checks if the requested `officerId` is provided.
  - Queries the `Employee` table to ensure the `officerId` exists and corresponds to a valid employee.
  - Returns `400 Bad Request` with an appropriate error message if validation fails.

## 2. CloudScale Persistence

Both update and reassignment endpoints successfully map their updates to `table.updateItems` using `NoSQLEnum.NoSQLUpdateOperationType.PUT` and correctly marshall values via `NoSQLMarshall`.

### Cache Invalidation
The implementation invalidates the in-memory `GLOBAL_CACHE['casemasters']` immediately upon a successful NoSQL update. This guarantees that any subsequent `getCases()` request retrieves the fresh persisted data directly from Catalyst CloudScale rather than stale memory.

## 3. Frontend Synchronization (`mockDb.ts`)

The "false success" issue has been resolved. The mock database (`mockDb.ts`) now adheres strictly to a synchronous execution chain:

1. **Wait for Backend Validation:** `transferCase` and `updateCase` use `async/await` to invoke the `fetch` to their respective endpoints.
2. **Handle Rejection:** If `res.ok` is false (e.g., due to an invalid officer or unsupported field), the function throws an Error parsed from the backend response.
3. **Prevent False UI Mutations:** The `state.cases` local object is only mutated and `saveDbState()` is only called *after* the backend explicitly succeeds. 
4. **UI Response:** `FIRManagement.tsx` wraps the transfer submit action in a `try/catch` block, immediately displaying a toast error message (`Transfer failed: <reason>`) if the backend rejects the request, rather than assuming success.

## 4. Tests Performed

The following behaviors were verified post-implementation:
- **Valid Reassignment:** Admin transferred case 100001 to Officer 9002. Backend accepted, UI updated, and refresh preserved Officer 9002.
- **Invalid Officer ID Reassignment:** Tried assigning case 100001 to a non-existent Officer ID. Backend correctly threw `400 Bad Request: Invalid target officer ID`. The UI displayed an error toast, and the previous officer was maintained in the local state.
- **Valid Case Update:** A simulated `PUT` request with `BriefFacts: "Updated fact"` successfully returned `200 OK`.
- **Immutable Modification Attempt:** A simulated `PATCH` request with `CaseMasterID: 999999` correctly returned `400 Bad Request: Field 'CaseMasterID' is unsupported or immutable.`
- **Status Update & Audit Logistics**: CaseDetail status updates now correctly utilize the `PUT /api/cases/:caseId/status` backend persistence endpoint. Upon success, this explicitly generates persistent CloudScale audit events (via `UPDATE_CASE_STATUS`), bridging the frontend to real backend trails.
- **Status Regression:** Updating the case status directly via `PUT /api/cases/:caseId/status` still works perfectly and independently via its original persistence route.

## 5. Limitations
Notifications for reassignments remain mocked (frontend-only). As explicitly requested in the requirements, backend implementation for full audit compliance of all other modules is deferred to a future phase.
