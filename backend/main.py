import os
import shutil
import uuid
import sys
sys.path.append(os.path.join(os.path.dirname(__file__), ".."))
from fastapi import FastAPI, File, UploadFile, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from typing import Optional

from database import init_db, insert_report, get_all_reports
from classifier.real_classifier import classify_image
from classifier.classify_thermal import classify_thermal
from severity import compute_severity
from severity import estimate_severity

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://der-01-disaster-map.vercel.app",
        "http://localhost:5500",
        "http://127.0.0.1:5500",
    ],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

MAX_FILE_SIZE = 10 * 1024 * 1024


def _validate_image_file(f: UploadFile, label: str):
    if not f.content_type or not f.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail=f"{label} must be an image")
    f.file.seek(0, 2)
    size = f.file.tell()
    f.file.seek(0)
    if size > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail=f"{label} too large (max 10MB)")
    if size == 0:
        raise HTTPException(status_code=400, detail=f"{label} is empty")


def _save_file(f: UploadFile) -> str:
    unique_filename = f"{uuid.uuid4().hex}_{f.filename}"
    path = os.path.join(UPLOAD_DIR, unique_filename)
    try:
        with open(path, "wb") as buffer:
            shutil.copyfileobj(f.file, buffer)
    except Exception:
        raise HTTPException(status_code=500, detail="Failed to save uploaded file")
    return path


@app.on_event("startup")
def startup():
    init_db()


@app.get("/")
def root():
    return {"status": "DER-01 backend is alive"}


@app.get("/health")
def health():
    return {"status": "ok", "service": "DER-01 backend"}


@app.post("/api/reports")
async def create_report(
    image: Optional[UploadFile] = File(None),
    source: str = Form(...),
    thermal_image: Optional[UploadFile] = File(None),
    lat: Optional[float] = Form(None),
    lon: Optional[float] = Form(None),
    captured_at: Optional[str] = Form(None),
):
    source = source.lower().strip()
    if source not in ("mobile", "drone"):
        raise HTTPException(status_code=400, detail="source must be 'mobile' or 'drone'")

    if source == "mobile" and image is None:
        raise HTTPException(status_code=400, detail="Mobile reports require a normal image")
    if source == "drone" and image is None and thermal_image is None:
        raise HTTPException(status_code=400, detail="Drone reports require a normal image, a thermal image, or both")

    if lat is not None or lon is not None:
        if lat is None or lon is None:
            raise HTTPException(status_code=400, detail="Both lat and lon must be provided together")
        if not (-90 <= lat <= 90) or not (-180 <= lon <= 180):
            raise HTTPException(status_code=400, detail="Invalid latitude or longitude values")
    else:
        raise HTTPException(
            status_code=400,
            detail="Missing lat/lon - could not be determined from photo or device location"
        )

    if image is not None:
        _validate_image_file(image, "image")
    if thermal_image is not None:
        _validate_image_file(thermal_image, "thermal_image")

    # Modality separation (by design): the RGB hazard classifier
    # (classify_image) only ever receives image_path (normal/RGB images).
    # It is NOT trained on thermal imagery and must never receive
    # thermal_image_path. Thermal images are routed exclusively to
    # classify_thermal for human detection. Do not cross-wire these.
    image_path = _save_file(image) if image is not None else None
    thermal_image_path = _save_file(thermal_image) if thermal_image is not None else None

    if image_path is not None:
        try:
            with open(image_path, "rb") as f:
                image_bytes = f.read()
        except Exception:
            raise HTTPException(status_code=500, detail="Failed to read saved image")

        try:
            classification = classify_image(image_path)
            hazard_type = classification["hazard_type"]
            confidence = classification["confidence"]
        except Exception:
            raise HTTPException(status_code=502, detail="Classifier failed to process the image")

        try:
            severity = estimate_severity(image_path, hazard_type, confidence)
        except Exception:
            severity = "Low"
    else:
        hazard_type = "Unknown"
        confidence = None
        severity = "Unknown"

    humans_detected = None
    human_count_estimate = None
    thermal_confidence = None
    count_confident = None
    if thermal_image_path is not None:
        try:
            with open(thermal_image_path, "rb") as f:
                thermal_bytes = f.read()
            thermal_result = classify_thermal(thermal_bytes)
            humans_detected = thermal_result["humans_detected"]
            human_count_estimate = thermal_result["human_count_estimate"]
            thermal_confidence = thermal_result["confidence"]
            count_confident = thermal_result["count_confident"]
        except Exception:
            humans_detected = None
            human_count_estimate = None
            thermal_confidence = None
            count_confident = None

    try:
        report = insert_report(
            hazard_type, confidence, severity, lat, lon, image_path,
            source=source, thermal_image_path=thermal_image_path,
            humans_detected=humans_detected, human_count_estimate=human_count_estimate,
            thermal_confidence=thermal_confidence, captured_at=captured_at
        )
    except Exception:
        raise HTTPException(status_code=500, detail="Failed to store report in database")

    if isinstance(report, dict):
        report["count_confident"] = count_confident
    return report


@app.get("/api/reports")
def list_reports():
    try:
        return get_all_reports()
    except Exception:
        raise HTTPException(status_code=500, detail="Failed to fetch reports")
