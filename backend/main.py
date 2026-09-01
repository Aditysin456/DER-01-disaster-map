import os
import shutil
from fastapi import FastAPI, File, UploadFile, Form

from database import init_db, insert_report, get_all_reports
from classifier_stub import classify_image
from severity import compute_severity

app = FastAPI()

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
    # Save the uploaded image
    image_path = os.path.join(UPLOAD_DIR, image.filename)
    with open(image_path, "wb") as buffer:
        shutil.copyfileobj(image.file, buffer)

    # Read bytes for classifier
    with open(image_path, "rb") as f:
        image_bytes = f.read()

    # Classify
    classification = classify_image(image_bytes)
    hazard_type = classification["hazard_type"]
    confidence = classification["confidence"]

    # Compute severity
    severity = compute_severity(hazard_type, confidence)

    # Store in DB
    report = insert_report(hazard_type, confidence, severity, lat, lon, image_path)

    return report

@app.get("/api/reports")
def list_reports():
    return get_all_reports()
