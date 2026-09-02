# Investigation, FIR, & Case Management Audit

This document presents a code-level technical audit of the investigation and case management workflow in the KSP AI-Driven Crime Analytics Platform.

**Date of Audit:** 2026-09-02
**Context:** Based strictly on the existing codebase (React/Express/CloudScale).

## 1. Executive Summary

The application implements a hybrid state-management approach where the frontend heavily relies on `localStorage` (`mockDb.ts`) for immediate UI updates, while asynchronously flushing specific actions to the backend (Catalyst CloudScale). 

While the "Plan -> Retrieve -> Generate" AI Chatbot is fully functional backend-to-frontend, the **Case Management module is partially disjointed**. Many core operations (like updating case details, transferring cases) are only simulated on the frontend, returning HTTP `501 Not Implemented` from the backend API. However, investigation-specific actions like Timeline Logging, Evidence Upload, and Network mapping do have fully wired backend endpoints.

## 2. Feature Implementation Status

### 2.1 FIR Registration & Assignment
- **Status:** Partially Implemented (Frontend + Backend Creation, Frontend-Only Updates)
- **Frontend:** `FIRManagement.tsx` manages a complex form to collect case details, acts, accused, victims, and complainant data. 
- **Backend:** `POST /api/cases` successfully creates a new `CaseMaster` record and auto-generates `CrimeNo` / `CaseNo`. It saves `Complainant`, `Victim`, and `Accused` records using `db.addCaseEntity`.
- **Gaps:** 
  - `PUT /api/cases/:id` and `PATCH /api/cases/:id` return `501 Not Implemented`. You cannot edit a case once created.
  - Case Reassignment (`PUT /api/cases/:caseId/reassign`) returns `501 Not Implemented`.

### 2.2 Case Investigation Workflow (Officer Portal)
- **Status:** Fully Implemented
- **Frontend:** `CaseDetail.tsx` provides a 5-tab interface (Overview, Timeline Notes, Evidence Locker, Chargesheet Filing, Print/Download FIR).
- **Backend:** 
  - **Timeline Notes:** `POST /api/cases/:caseId/timeline` works and saves to CloudScale.
  - **Evidence Locker:** `POST /api/cases/:caseId/evidence` uses `multer` for memory buffering and attempts to upload to Catalyst FileStore. If the Catalyst SDK fails, it gracefully falls back to storing a mock file path.
  - **Chargesheet:** `POST /api/cases/:caseId/chargesheet` allows filing Type A, B, or C reports and correctly auto-updates the case status to "Chargesheeted".
  - **Status Updates:** `PUT /api/cases/:caseId/status` successfully updates the `CaseStatusID` on CloudScale.

### 2.3 Criminal Network (Syndicate Tracer)
- **Status:** Fully Implemented
- **Frontend:** `CriminalNetwork.tsx` uses `@xyflow/react` to render an interactive node-edge graph centered around a selected FIR.
- **Backend:** 
  - **Entities:** Officers can inject custom nodes (Vehicles, Phones, Bank Accounts, Locations, Weapons, Evidence). Handled via `POST /api/network/entities/:type`.
  - **Edges:** Officers can manually connect nodes using custom edges. Handled via `POST /api/network/edges`.
- **Gaps:** Graph data relies heavily on data pulled locally via `mockDb.getCases()`, `mockDb.getAccused()`, rather than fetching an aggregated network object directly from the backend (though the `/api/network/:caseId` endpoint exists, it isn't utilized by the graph UI).

### 2.4 GIS Mapping & Hotspots
- **Status:** Fully Implemented
- **Frontend:** `AdminGISMap.tsx` uses `maplibre-gl` to cluster FIRs spatially. It features interactive district filtering and renders AI-generated Red Zone hotspots.
- **Backend:** `GET /api/hotspots` uses an algorithmic approach to group valid base cases spatially and calculate a risk score (0-99).

### 2.5 Audit Logging & Notifications
- **Status:** Mocked (Client-Side Only)
- **Frontend:** `mockDb.ts` intercepts actions (like `addTimelineNote`, `deleteEmployee`, `updateCaseStatus`) and pushes entries to `state.auditLogs` and `state.notifications`.
- **Backend:** **Not Implemented.** There are no backend endpoints for saving, retrieving, or validating audit logs or push notifications. All logs are lost if local storage is cleared.

## 3. Data Integrity & State Sync (`mockDb.ts`)

The most critical architectural bottleneck is `mockDb.ts`. It acts as a client-side Database ORM.
- **On Startup:** The application fetches everything from the backend (Cases, Employees, Units, Acts) and hydrates `localStorage`.
- **On Mutation (Investigation):** When an officer uploads evidence, `mockDb.uploadEvidence` triggers an asynchronous `fetch` to `/api/cases/:caseId/evidence` but **synchronously updates `localStorage`** first.
- **On Mutation (FIR Edit):** When an admin transfers a case, `mockDb` updates `localStorage`, but the backend `PUT /api/cases/:id/reassign` yields a `501`. 
- **Risk:** This "optimistic UI" pattern without robust error handling or backend implementations means the UI often shows data that is not actually persisted to Catalyst CloudScale.

## 4. Key Takeaways for Future Development
1. **Backend Implementations Required:** Finish the `PUT`, `PATCH`, and `DELETE` endpoints for `/api/cases`.
2. **Remove Client-Side ORM:** Refactor frontend pages to use standard React Query or `useEffect` fetch calls against backend routes rather than querying `mockDb.getCases()`.
3. **Audit Log Persistence:** Implement a true backend audit table. Currently, forensic compliance is simulated on the client.
