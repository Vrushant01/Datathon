# AI Intelligence Integration Layer

## Overview
This document outlines the architecture and implementation of the AI Intelligence Action Integration Layer, which brings together isolated AI capabilities (Anomalies, Station Risk, GIS Hotspots, Case Management, Repeated Offenders, Criminal Network, and the AI Assistant) into a unified intelligence workflow. The objective is to guide investigators from **DETECT** → **IDENTIFY** → **INVESTIGATE** → **CONNECT** → **RECOMMEND** → **ACT** → **AUDIT** without introducing new ML algorithms or hallucinating data.

## IntelligenceAlert Model
The frontend introduces a normalized `IntelligenceAlert` model to unify data originating from different systems (`AI Anomaly Detection` and `Station Risk`).

**Fields:**
- `id`: Unique identifier (e.g., `ALT-TEMP-...` or `RISK-...`)
- `type`: `ANOMALY` | `RISK`
- `severity`: `CRITICAL` | `HIGH` | `MODERATE` | `LOW`
- `districtId`, `stationId`: Geographic identifiers if available
- `locationName`: Human-readable location name
- `crimeHeadId`, `crimeType`: Crime categories if applicable
- `dateFrom`, `dateTo`: Temporal window
- `currentValue`, `baselineValue`, `score`: Statistical metrics
- `explanation`: Contextual description of the alert

## Intelligence Correlation Architecture

The frontend no longer downloads the full case dataset for correlation. Instead, it sends the minimum verified alert dimensions to the backend, which independently constructs the authoritative investigation context. Both the Intelligence Center UI and the AI Investigation Summary reuse the exact same backend service (`intelligenceService.ts`).

1. **Anomaly → Case Correlation**:
   The anomaly's specific dimensions (`districtId`, `stationId`, `crimeHeadId`, `dateFrom`, `dateTo`, `type`) are sent to `GET /api/ai/intelligence-context`. The backend filters the database purely server-side.

2. **Anomaly → GIS Hotspot Correlation**:
   The backend identically passes these dimensions to the internal Hotspot service to retrieve geographic DBSCAN clusters that overlap with the alert.

3. **Case → Repeated Offender Correlation**:
   The backend cross-references the server-side resolved cases against the repeated offenders repository. Only offenders strictly tied to one of the affected `CaseMasterID`s are presented.

4. **Person → Criminal Network Correlation**:
   Any identified repeat offenders provide a direct drill-down link into `/admin-portal/network?personId=X`, reusing the existing network visualization system.

## AI Investigation Summary

The integration leverages the existing Catalyst LLM structure to summarize complex findings. 
- **Endpoint**: `POST /api/chatbot/investigation-summary`
- **Context Construction (Server-Side)**: The frontend sends **only** the `alertDetails` (identifiers and metadata). The backend independently queries the `intelligenceService` to fetch the true cases, hotspots, and offenders. This strictly prevents the frontend from injecting authoritative investigation facts (such as fabricated case counts or names) into the LLM context.
- **AI Guardrails**: The system prompt explicitly enforces strict guidelines:
  - Do NOT invent case details or relationships.
  - Distinctly separate **FACTS** from **RECOMMENDATIONS**.
  - Confess when information is unavailable rather than fabricating conclusions.

## Deterministic Recommendations

A deterministic recommendation engine provides actionable guidance immediately available in the Investigation Panel. These rules are purely logic-driven and are not dictated by the LLM:
- *High anomaly + matching hotspot* → "Review affected FIRs within the identified GIS hotspot."
- *High anomaly + repeated offender* → "Review cases involving the identified repeat offender(s) active during this anomaly window."
- *High station risk + high volume* → "Review current station workload and pending investigations. A high volume of unsolved cases correlates with the risk score."

These are **advisory only**. The system does not autonomously mutate data or enforce police actions.

## Action & Audit Flow

When an investigator decides to act on intelligence (e.g., reassigning an officer to an affected case), they are directed to the standard `CaseDetail` view.
From there, performing any mutation uses the existing endpoints (e.g., `PUT /api/cases/:id/reassign`).
This ensures all changes automatically flow through the established persistent CloudScale Audit Logs mechanism. The Intelligence Center itself only correlates data; it does not introduce bypasses or undocumented side-effects.

## Performance Considerations

- **Server-Side Filtering**: Hotspots and station risks rely on batch queries and backend computations rather than downloading massive datasets into the browser.
- **Lazy Context**: Context resolution (fetching hotspots and matching offenders) only occurs when an alert is explicitly clicked and selected, preventing cascading API floods on initial page load.

## Empty States & Fallbacks

- If no cases match: "No matching cases found."
- If no hotspot exists: "No matching hotspot available."
- If no offenders are tied: "No related repeat-offender records found."
- If LLM summary fails: "AI summary unavailable. Database findings are still available."
No fake "fallback" profiles are generated under any circumstances.
