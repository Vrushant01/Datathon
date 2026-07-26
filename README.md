# KSP AI-Driven Crime Analytics & Visualization Platform

This is a production-ready, full-stack crime intelligence platform built for the **Karnataka State Police (KSP)**. The platform combines official government UI standards with modern analytics, GIS mapping, AI risk profiling, and case workflow tools.

## Architecture

The project is structured as a monorepo:
* `/frontend`: React 19 + TypeScript + Vite + Tailwind CSS + Leaflet GIS + Recharts.
* `/backend`: Node.js + Express.js + PDFKit report generators + AI risk engines.
* `/supabase`: SQL database migration files and role permissions.

## Database Schema (Supabase)

Implemented exactly matching the official **KSP Police FIR ER Diagram**:
1. **Roster & Administrative**: `State`, `District`, `Unit` (Police Stations), `UnitType`, `Rank`, `Designation`, `Employee` (Officers).
2. **Crime Master**: `CaseMaster`, `ComplainantDetails`, `Victim`, `Accused`, `Act`, `Section`, `ActSectionAssociation`, `CrimeHead`, `CrimeSubHead`, `CrimeHeadActSection`, `CaseCategory`, `GravityOffence`, `CaseStatusMaster`, `Court`, `ChargesheetDetails`.
3. **Arrests & Junctions**: `ArrestSurrender`, `inv_arrestsurrenderaccused`, `Inv_OccuranceTime`.
4. **Platform Security**: `user_profiles` (Supabase Auth mapping), `evidence_files` (Storage references), `audit_logs` (System trails), `timeline_notes`.

## Key Features

1. **Official Government UI**: Navy blue, gold, and white color palettes with scrolling ticker tapes, emergency helpline widgets, and national emblems.
2. **Police Officer Portal (`/login`)**:
   * Filtered inbox displaying assigned cases only.
   * Case details showing Complainant, Victim, Accused, Acts & Sections.
   * Investigation timeline logging with Spot Mahazar, Witness statements.
   * Secure Evidence Locker for uploading images, videos, medical reports.
   * Chargesheet Generator (A/B/C final report codes) closing cases and dispatching to JMFC Court.
   * Print/Export FIR copies using browser printer layout sheets.
3. **Administrator Portal (`/admin`)**:
   * Command Center Widget Dashboard (Solved/pending cases, categories, active staff).
   * Officer CRUD Management (Enroll, suspend/activate, assign station/ranks, reset credentials).
   * Register FIR Case Wizard (Dynamic 3-step registration flow mapping complainants, victims, accused, and acts).
   * Audit Compliance Logs (Immutable logs of actions).
4. **GIS Crime Mapping**: Interactive spatial Leaflet map with filters (District, station, crime head, status) showing crime densities and hotspot zones.
5. **AI Intelligence Engine**:
   * Spacial density cluster tracking.
   * Predictive Risk Scoring based on age demographics, MO, and previous offence records.
   * Repeat Offender link graphs.

---

## Instructions to Run

### 1. Database Setup
Register migrations and seeds in your Supabase project using the files under:
* `/supabase/migrations/01_initial_schema.sql` (Schema, triggers and RLS policies)
* `/supabase/seed.sql` (Metadata list and demo cases)

### 2. Run Backend API
```bash
cd backend
npm install
npm run dev
```
Starts API services on `http://localhost:5000`.

### 3. Run Frontend Portal
```bash
cd frontend
npm install
npm run dev
```
Launches Vite dev server on `http://localhost:5173`.

---

## Demo Credentials (Mock DB Persistence)

The platform runs in a seamless **dual-mode**: if Supabase env parameters are absent, it automatically boots into a **local mock database** persisted via `LocalStorage` so you can test all features offline.

* **Admin Portal Login**:
  * Email: `admin@ksp.gov.in`
  * Password: `admin123`
* **Police Officer Login**:
  * Employee ID: `9002` (Officer Vrushant Patil - Koramangala PS)
  * Password: `password`
