import os
import shutil
import uuid
from fastapi import FastAPI, File, UploadFile, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from database import init_db, insert_report, get_all_reports
import sys, os
sys.path.append(os.path.join(os.path.dirname(__file__), ".."))
from classifier.classifier import classify_image
from severity import compute_severity

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB

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
    image: UploadFile = File(...),
    lat: float = Form(...),
    lon: float = Form(...)
):
    # Validate lat/lon ranges
    if not (-90 <= lat <= 90) or not (-180 <= lon <= 180):
        raise HTTPException(status_code=400, detail="Invalid latitude or longitude values")

    # Validate file type
    if not image.content_type or not image.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Uploaded file must be an image")

    # Check file size before saving
    image.file.seek(0, 2)
    file_size = image.file.tell()
    image.file.seek(0)
    if file_size > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail="Image file too large (max 10MB)")
    if file_size == 0:
        raise HTTPException(status_code=400, detail="Uploaded image is empty")

    # Save with a unique filename to prevent overwrites
    try:
        unique_filename = f"{uuid.uuid4().hex}_{image.filename}"
        image_path = os.path.join(UPLOAD_DIR, unique_filename)
        with open(image_path, "wb") as buffer:
            shutil.copyfileobj(image.file, buffer)
    except Exception:
        raise HTTPException(status_code=500, detail="Failed to save uploaded image")

    # Read bytes for classifier
    try:
        with open(image_path, "rb") as f:
            image_bytes = f.read()
    except Exception:
        raise HTTPException(status_code=500, detail="Failed to read saved image")

    # Classify — catch any classifier failure
    try:
        classification = classify_image(image_bytes)
        hazard_type = classification["hazard_type"]
        confidence = classification["confidence"]
    except Exception:
        raise HTTPException(status_code=502, detail="Classifier failed to process the image")

    # Compute severity — always falls back safely
    try:
        severity = compute_severity(hazard_type, confidence)
    except Exception:
        severity = "Low"

    # Store in DB
    try:
        report = insert_report(hazard_type, confidence, severity, lat, lon, image_path)
    except Exception:
        raise HTTPException(status_code=500, detail="Failed to store report in database")

    return report

@app.get("/api/reports")
def list_reports():
    try:
        return get_all_reports()
    except Exception:
        raise HTTPException(status_code=500, detail="Failed to fetch reports")
