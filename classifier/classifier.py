import random

HAZARD_TYPES = ["flood", "fire", "structural_collapse", "landslide"]

def classify_image(image):
    hazard_type = random.choice(HAZARD_TYPES)
    confidence = round(random.uniform(0.4, 0.99), 2)
    return {"hazard_type": hazard_type, "confidence": confidence}

def classify_thermal(image_bytes):
    humans_detected = random.random() > 0.4
    human_count_estimate = random.randint(1, 4) if humans_detected else 0
    confidence = round(random.uniform(0.5, 0.95), 2)
    return {
        "humans_detected": humans_detected,
        "human_count_estimate": human_count_estimate,
        "confidence": confidence
    }
