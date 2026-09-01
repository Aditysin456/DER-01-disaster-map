import io
import os

import torch
import torch.nn as nn
from torchvision import transforms, models
from PIL import Image
from ultralytics import YOLO


# ---------------------------------------------------------
# Paths
# ---------------------------------------------------------

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

THERMAL_MODEL_PATH = os.path.join(
    BASE_DIR,
    "thermal_model.pth"
)

PERSON_MODEL_PATH = os.path.join(
    BASE_DIR,
    "best.pt"
)


# ---------------------------------------------------------
# Device
# ---------------------------------------------------------

device = torch.device(
    "cuda" if torch.cuda.is_available() else "cpu"
)


# ---------------------------------------------------------
# MobileNetV2
# Human presence classifier
# ---------------------------------------------------------

thermal_model = models.mobilenet_v2(weights=None)

thermal_model.classifier[1] = nn.Linear(
    thermal_model.last_channel,
    2
)

thermal_model.load_state_dict(
    torch.load(
        THERMAL_MODEL_PATH,
        map_location=device
    )
)

thermal_model = thermal_model.to(device)
thermal_model.eval()


thermal_transform = transforms.Compose([
    transforms.Resize((224, 224)),
    transforms.ToTensor(),
    transforms.Normalize(
        [0.485, 0.456, 0.406],
        [0.229, 0.224, 0.225]
    )
])


# ---------------------------------------------------------
# YOLO
# Person detector
# ---------------------------------------------------------

person_model = YOLO(PERSON_MODEL_PATH)


# ---------------------------------------------------------
# Main thermal classification function
# ---------------------------------------------------------

def classify_thermal(image_bytes):

    # Convert image bytes to PIL image
    image = Image.open(
        io.BytesIO(image_bytes)
    ).convert("RGB")


    # -----------------------------------------------------
    # 1. MobileNetV2 - human presence
    # -----------------------------------------------------

    image_tensor = thermal_transform(
        image
    ).unsqueeze(0).to(device)

    with torch.no_grad():

        output = thermal_model(
            image_tensor
        )

        probabilities = torch.softmax(
            output,
            dim=1
        )

        confidence, prediction = torch.max(
            probabilities,
            dim=1
        )

    prediction = prediction.item()
    confidence = confidence.item()

    # Class order:
    # 0 = humans_detected
    # 1 = no_humans

    humans_detected = prediction == 0


    # -----------------------------------------------------
    # 2. YOLO - count people
    # -----------------------------------------------------

    results = person_model(
        image,
        verbose=False
    )

    human_count = 0

    for result in results:

        if result.boxes is None:
            continue

        if result.boxes.conf is not None:

            confident_detections = (
                result.boxes.conf >= 0.35
            )

            human_count += int(
                confident_detections.sum().item()
            )


    # -----------------------------------------------------
    # Combine results
    # -----------------------------------------------------

    # If YOLO found at least one person,
    # humans are definitely considered present.
    if human_count > 0:
        humans_detected = True

    # If neither model indicates humans,
    # return count as zero.
    if not humans_detected:
        human_count = 0


    # -----------------------------------------------------
    # Final contract
    # -----------------------------------------------------

    return {
        "humans_detected": humans_detected,
        "human_count_estimate": human_count,
        "confidence": round(confidence, 2)
    }


# ---------------------------------------------------------
# Basic loading test
# ---------------------------------------------------------

if __name__ == "__main__":

    print("Thermal classifier loaded successfully.")
    print("Device:", device)
    print("MobileNetV2: loaded")
    print("YOLO person detector: loaded")