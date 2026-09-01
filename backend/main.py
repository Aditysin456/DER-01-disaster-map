import os
import shutil
from fastapi import FastAPI, File, UploadFile, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from database import init_db, insert_report, get_all_reports
from classifier_stub import classify_image
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

@app.on_event("startup")
def startup():
    init_db()

@app.get("/")
def root():
    return {"status": "DER-01 backend is alive"}

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

    # Save the uploaded image
    try:
        image_path = os.path.join(UPLOAD_DIR, image.filename)
        with open(image_path, "wb") as buffer:
            shutil.copyfileobj(image.file, buffer)
    except Exception:
        raise HTTPException(status_code=500, detail="Failed to save uploaded image")

    # Check file isn't empty
    if os.path.getsize(image_path) == 0:
        os.remove(image_path)
        raise HTTPException(status_code=400, detail="Uploaded image is empty")

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