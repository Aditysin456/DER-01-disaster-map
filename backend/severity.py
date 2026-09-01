import os
from PIL import Image

import numpy as np


def compute_severity(hazard_type: str, confidence: float) -> str:
    """
    Severity rule: High >= 0.75, Medium >= 0.45, else Low.
    Legacy/fallback only — no longer the primary severity source.
    """
    try:
        confidence = float(confidence)
    except (TypeError, ValueError):
        return "Low"
    confidence = max(0.0, min(1.0, confidence))
    if confidence >= 0.75:
        return "High"
    elif confidence >= 0.45:
        return "Medium"
    else:
        return "Low"


def _pct_pixels_in_range(arr, lo, hi):
    mask = np.all((arr >= lo) & (arr <= hi), axis=-1)
    return mask, mask.sum() / mask.size


def _flood_water_mask(arr):
    """
    Detects water (blue sky-reflecting puddles/floods, or brown muddy floods)
    by requiring real channel separation, instead of a flat brightness range.
    This avoids matching flat grey concrete/rubble as 'flood'.
    """
    r = arr[..., 0].astype(int)
    g = arr[..., 1].astype(int)
    b = arr[..., 2].astype(int)
    bluish = (b - r) > 15       # clear/sky-reflecting water
    is_vegetation = (g > r + 10) & (g > b + 10)   # exclude grass/leaves
    brownish = ((r - b) > 15) & (~is_vegetation)     # muddy floodwater
    color_ok = bluish | brownish
    max_c = np.maximum(np.maximum(r, g), b)
    brightness_ok = (max_c > 30) & (max_c < 220)  # exclude near-black shadow, near-white glare
    return color_ok & brightness_ok


def _border_touch_score(mask):
    h, w = mask.shape
    edges_touched = 0
    if mask[0, :].mean() > 0.15: edges_touched += 1
    if mask[-1, :].mean() > 0.15: edges_touched += 1
    if mask[:, 0].mean() > 0.15: edges_touched += 1
    if mask[:, -1].mean() > 0.15: edges_touched += 1
    return edges_touched / 4


def _load_rgb_array(image_path, max_dim=400):
    img = Image.open(image_path).convert("RGB")
    img.thumbnail((max_dim, max_dim))
    return np.array(img)


def estimate_severity(image_path: str, hazard_type: str, confidence: float = None) -> str:
    if hazard_type == "no_hazard":
        return "Low"
    try:
        arr = _load_rgb_array(image_path)
        h = arr.shape[0]
        lower_half = arr[h // 2:, :, :]

        if hazard_type == "flood":
            mask, coverage = _pct_pixels_in_range(lower_half, (30, 40, 40), (160, 160, 190))

                 
        elif hazard_type == "fire":
            r = arr[..., 0].astype(int)
            g = arr[..., 1].astype(int)
            b = arr[..., 2].astype(int)
            mask = (r > 100) & (r > g) & (r > b)
            coverage = mask.sum() / mask.size
        elif hazard_type == "landslide":
            mask, coverage = _pct_pixels_in_range(arr, (50, 30, 15), (220, 180, 150))
        elif hazard_type == "structural_collapse":
            mask, coverage = _pct_pixels_in_range(arr, (50, 50, 45), (200, 200, 190))
        else:
            coverage = 0.0
            mask = None

        border_score = _border_touch_score(mask) if mask is not None else 0.0
        score = coverage * (0.6 + 0.4 * border_score)
        print(f"[DEBUG] {os.path.basename(image_path)} {hazard_type} "
              f"coverage={coverage:.3f} border={border_score:.3f} score={score:.3f}")
    except Exception:
        return compute_severity(hazard_type, confidence)

    if hazard_type == "fire":
        high_t, med_t = 0.35, 0.20
    else:
        high_t, med_t = 0.50, 0.28
    if score >= high_t:
        return "High"
    elif score >= med_t:
        return "Medium"
    else:
        return "Low"