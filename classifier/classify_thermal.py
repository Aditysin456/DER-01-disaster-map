import random

# STUB thermal / human-detection classifier (Level 1).
# Used only for drone submissions, to estimate human presence for
# search-and-rescue prioritization. Runs alongside the hazard classifier,
# not instead of it — a drone submission calls BOTH.


def classify_thermal(image_bytes):
    """
    Takes raw thermal image bytes (unused for now) and returns a fake but
    contract-valid {humans_detected, human_count_estimate, confidence}
    response, so the backend can integrate before any real model exists.

    Later, this function will be replaced with a real trained model,
    but the return format will stay exactly the same.
    """
    humans_detected = random.choice([True, False])
    human_count_estimate = random.randint(1, 4) if humans_detected else 0
    confidence = round(random.uniform(0.4, 0.99), 2)

    return {
        "humans_detected": humans_detected,
        "human_count_estimate": human_count_estimate,
        "confidence": confidence
    }


# Quick test — run this file directly to check it works
if __name__ == "__main__":
    for _ in range(3):
        print(classify_thermal(None))
