import random

HAZARD_TYPES = ["flood", "fire", "structural_damage"]

def classify_image(image_bytes: bytes) -> dict:
    """
    Stub classifier matching the contract: input raw image bytes,
    output {hazard_type: str, confidence: float}.
    Replace this import with Person 1's real classifier module later.
    """
    hazard_type = random.choice(HAZARD_TYPES)
    confidence = round(random.uniform(0.3, 0.95), 2)
    return {"hazard_type": hazard_type, "confidence": confidence}
