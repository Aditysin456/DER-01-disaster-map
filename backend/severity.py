def compute_severity(hazard_type: str, confidence: float) -> str:
    """
    Severity rule: High >= 0.75, Medium >= 0.45, else Low.
    Handles edge cases so this NEVER returns null or crashes:
    - confidence out of [0,1] range gets clamped
    - non-numeric or missing confidence defaults to Low (safest fallback)
    """
    try:
        confidence = float(confidence)
    except (TypeError, ValueError):
        return "Low"

    # Clamp confidence into valid [0, 1] range
    confidence = max(0.0, min(1.0, confidence))

    if confidence >= 0.75:
        return "High"
    elif confidence >= 0.45:
        return "Medium"
    else:
        return "Low"
