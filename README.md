# DER-01: Citizen-Reported Disaster Damage Mapping

## Architecture
Single-backend, two-service: FastAPI backend imports classifier module in-process. Frontend is a static Leaflet.js page polling the backend.

## Stack
- Backend: Python, FastAPI, Uvicorn
- Storage: SQLite
- Classifier: Python, PyTorch (transfer learning)
- Frontend: HTML/CSS/JS, Leaflet.js

## API Contract

### POST /api/reports
Request: multipart form — `image` (file), `lat` (float), `lon` (float)
Response:
```json
{ "id": int, "hazard_type": string, "confidence": float, "severity": string, "lat": float, "lon": float, "timestamp": string }
```

### GET /api/reports
Response: array of the above shape

## Classifier Contract
Input: raw image bytes
Output: `{ "hazard_type": string, "confidence": float }`
hazard_type is one of: "flood", "fire", "structural_damage"

## Severity Rule
- High: confidence >= 0.75
- Medium: confidence >= 0.45
- Low: confidence < 0.45

## Folders
- /classifier — Person 1 (ML model)
- /backend — Person 2 (FastAPI + SQLite)
- /frontend — Person 3 (Leaflet map)
