# Investigation Workflow Architecture

This document describes the technical architecture of the Investigation, FIR, and Case Management systems within the KSP AI-Driven Crime Analytics Platform.

## 1. System Architecture Overview

The system employs a React + TypeScript frontend and a Node.js + Express backend, backed by Catalyst CloudScale (NoSQL). It relies heavily on a hybrid state management architecture where the frontend maintains a pseudo-database in `localStorage` (`mockDb.ts`) that asynchronously syncs with the backend.

### 1.1 Components

*   **Frontend UI (`React`):**
    *   `FIRManagement.tsx`: Admin-level FIR registration, listing, and reassignment.
    *   `CaseDetail.tsx`: Officer-level investigation dashboard (Timeline, Evidence, Chargesheet, Print).
    *   `CriminalNetwork.tsx`: Visual graph builder for mapping cases to suspects, victims, and custom entities (React Flow).
    *   `AdminGISMap.tsx`: Spatial clustering of FIRs and Hotspot overlay (MapLibre GL).
*   **Frontend State Manager (`mockDb.ts`):** 
    *   Acts as the central clearinghouse for all case-related actions on the client.
    *   Intercepts component actions, updates `localStorage`, and selectively fires `fetch` calls to backend endpoints.
*   **Backend API (`Express`):**
    *   `app.ts`: Defines routes for `/api/cases`, `/api/network`, and `/api/reports`.
*   **Backend Data Access (`CloudScaleRepository.ts`):**
    *   Abstracts Zoho Catalyst CloudScale API via `RepositoryFactory.getRepository()`.

## 2. End-to-End Workflow & Data Flow

### Step 1: FIR Registration (`FIRManagement.tsx` -> `mockDb.ts` -> `app.ts`)
1.  Admin fills out the FIR form and clicks "Register".
2.  `mockDb.createCase(payload)` is called.
3.  The frontend issues `POST /api/cases` with the form payload.
4.  The backend (`app.ts`):
    *   Auto-generates `CaseMasterID`, `CaseNo`, and `CrimeNo`.
    *   Uses `CloudScaleRepository` to save the `CaseMaster` record.
    *   Parses sub-arrays (`Complainant`, `Victim`, `Accused`) and calls `db.addCaseEntity()` to store them in the `case_entities` Catalyst table.
    *   Invalidates the Hotspot cache.
5.  Frontend `mockDb` receives the response, updates its `localStorage` arrays (`state.cases`, `state.victims`, etc.), and adds an "FIR Registered" timeline note and an audit log (client-side only).

### Step 2: Investigation & Case Updates (`CaseDetail.tsx`)
Officers navigate to their assigned case to manage the investigation.
1.  **Overview:** Renders `CaseMaster`, `Complainant`, `Victim`, and `Accused` directly from `mockDb.getCaseDetails(caseId)`.
2.  **Timeline Notes:**
    *   Officer submits a new note.
    *   `mockDb.addTimelineNote()` sends `POST /api/cases/:caseId/timeline`.
    *   Backend saves the note to Catalyst `timeline_notes` table.
3.  **Evidence Upload:**
    *   Officer uploads a file.
    *   `mockDb.uploadEvidence()` sends `POST /api/cases/:caseId/evidence` with `FormData`.
    *   Backend uses `multer` to process the file and uploads it to Catalyst FileStore. It saves the metadata (path, type) in the `evidence_files` table.
4.  **Chargesheet:**
    *   Officer files a final report.
    *   `mockDb.submitChargesheet()` sends `POST /api/cases/:caseId/chargesheet`.
    *   Backend saves the record in `chargesheets` table and auto-updates the case status to `2` (Chargesheeted).
5.  **Status Change:**
    *   `mockDb.updateCaseStatus()` sends `PUT /api/cases/:caseId/status`.
    *   Backend updates the `CaseStatusID` in the `CaseMaster` table.

### Step 3: Syndicate Tracking / Criminal Network (`CriminalNetwork.tsx`)
1.  **Graph Construction:** 
    *   When an FIR is selected, the frontend builds a graph locally from `mockDb` cases, accused, victims, and case entities.
2.  **Injecting Nodes:**
    *   An Officer adds a new entity (e.g., a "Vehicle" linked to the case).
    *   `mockDb.addCaseEntity()` fires `POST /api/network/entities/:type`.
    *   Backend saves the node to Catalyst.
3.  **Drawing Edges:**
    *   An Officer drags a line between two nodes on the React Flow canvas.
    *   `mockDb.addCustomEdge()` fires `POST /api/network/edges`.
    *   Backend saves the connection in the `custom_edges` table.

### Step 4: Map & Hotspots (`AdminGISMap.tsx`)
1.  **Case Points:** The map renders individual FIRs based on their latitude/longitude.
2.  **AI Hotspots:** 
    *   `GET /api/hotspots` calculates clusters of FIRs based on spatial proximity, calculates risk scores, and returns GeoJSON circle polygons.

## 3. Data Schema & Relationships

*   **CaseMaster (Core Entity):** Links to `DistrictID`, `PoliceStationID`, `PolicePersonID` (Assigned Officer), `CrimeMajorHeadID` (Category), `CaseStatusID`.
*   **Case Entities:** Complainants, Victims, Accused, Vehicles, Weapons, etc. share relationships via `CaseMasterID`.
*   **Timeline Notes:** Tracked via `CaseMasterID`.
*   **Evidence Files:** Tracked via `CaseMasterID`.
*   **Chargesheets:** Final reports tied to `CaseMasterID`.
*   **Custom Edges:** Directed relationships defining the source and target node IDs for the Criminal Network.

## 4. Architectural Limitations & Bottlenecks

1.  **Incomplete CRUD:** While creating a case is supported, updating the core `CaseMaster` properties (e.g., Brief Facts, Reassignment) is currently returning `501 Not Implemented` on the backend. Updates exist only on the frontend `localStorage`.
2.  **Client-Heavy Processing:** The Criminal Network graph and the FIR listing rely on the frontend pulling large arrays of data from `localStorage` (`mockDb.ts`) rather than executing efficient SQL/NoSQL queries on the backend.
3.  **Ephemeral Audit Trail:** Audit logs and notifications are appended to `localStorage` via `mockDb.ts` but lack backend persistence routes, making them ephemeral and device-specific.
