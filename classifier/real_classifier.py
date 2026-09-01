import os
import torch
import torch.nn as nn
from torchvision import transforms, models
from PIL import Image

# Real trained hazard classifier (Level 2).
# Matches the EXACT same function name and output format as the Level 1 stub,
# so the backend needs zero changes to swap this in.

MODEL_PATH = os.path.join(os.path.dirname(__file__), "hazard_model.pth")
IMAGE_SIZE = 128

_device = torch.device("cpu")  # inference on CPU is fine, no GPU needed for this

# Load model + class names once, when this file is first imported
_checkpoint = torch.load(MODEL_PATH, map_location=_device)
_class_names = _checkpoint["class_names"]

_model = models.mobilenet_v2(weights=None)
_model.classifier[1] = nn.Linear(_model.last_channel, len(_class_names))
_model.load_state_dict(_checkpoint["model_state_dict"])
_model.to(_device)
_model.eval()

_transform = transforms.Compose([
    transforms.Resize((IMAGE_SIZE, IMAGE_SIZE)),
    transforms.ToTensor(),
    transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
])


def classify_image(image):
    """
    Real trained classifier (Level 2).
    Takes a PIL Image (or a file path string) and returns
    {hazard_type, confidence} — exactly matching the original stub's format.
    """
    if isinstance(image, str):
        image = Image.open(image).convert("RGB")
    else:
        image = image.convert("RGB")

    input_tensor = _transform(image).unsqueeze(0).to(_device)

    with torch.no_grad():
        outputs = _model(input_tensor)
        probabilities = torch.softmax(outputs, dim=1)[0]
        predicted_index = torch.argmax(probabilities).item()

    hazard_type = _class_names[predicted_index]
    confidence = round(probabilities[predicted_index].item(), 2)

    return {
        "hazard_type": hazard_type,
        "confidence": confidence
    }


# Quick test — run this file directly with a sample image to check it works
if __name__ == "__main__":
    import sys
    if len(sys.argv) > 1:
        test_image_path = sys.argv[1]
        print(classify_image(test_image_path))
    else:
        print("Usage: python real_classifier.py path\\to\\some\\test\\image.jpg")
