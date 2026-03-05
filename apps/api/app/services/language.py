def detect_lang(text: str) -> str:
    if not text:
        return "unknown"

    sinhala_chars = sum(1 for ch in text if "\u0d80" <= ch <= "\u0dff")
    ratio = sinhala_chars / max(1, len(text))
    if ratio > 0.1:
        return "si"
    return "en"
