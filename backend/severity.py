def compute_severity(hazard_type: str, confidence: float) -> str:
    """
    Severity rule per README: High >= 0.75, Medium >= 0.45, else Low.
    Same rule regardless of hazard_type for now (per team contract).
    """
    if confidence >= 0.75:
        return "High"
    elif confidence >= 0.45:
        return "Medium"
    else:
        return "Low"
