import random

# Fixed list of hazard categories agreed by the team
HAZARD_TYPES = ["flood", "fire", "structural_collapse", "landslide"]


def classify_image(image):
    """
    STUB classifier (Level 1).
    Takes an image (unused for now) and returns a fake but contract-valid
    {hazard_type, confidence} response, so the backend can integrate early.

    Later, this function will be replaced with a real trained model,
    but the return format will stay exactly the same.
    """
    hazard_type = random.choice(HAZARD_TYPES)
    confidence = round(random.uniform(0.4, 0.99), 2)

    return {
        "hazard_type": hazard_type,
        "confidence": confidence
    }


# Quick test — run this file directly to check it works
if __name__ == "__main__":
    for _ in range(3):
        print(classify_image(None))
