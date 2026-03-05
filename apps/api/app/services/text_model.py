import importlib.util
import json
import math
from pathlib import Path
from typing import Any, Callable, Dict, Optional

from app.core.config import get_settings
from app.services.constants import CATEGORIES


class TextModel:
    def __init__(self) -> None:
        self.settings = get_settings()
        self.label_map = self._load_label_map()
        self.custom_predict_fn = self._load_custom_predictor()
        self.model = self._try_load_model(self.settings.nlp_model_path)

    def _load_label_map(self) -> Dict[int, str]:
        if self.settings.nlp_label_map_json:
            try:
                payload = json.loads(self.settings.nlp_label_map_json)
                return {int(k): str(v) for k, v in payload.items()}
            except Exception:
                pass
        path = Path(self.settings.nlp_model_path)
        label_map_file = path / "label_map.json" if path.is_dir() else path.with_suffix(".label_map.json")
        if label_map_file.exists():
            try:
                payload = json.loads(label_map_file.read_text(encoding="utf-8"))
                return {int(k): str(v) for k, v in payload.items()}
            except Exception:
                pass
        return {idx: category for idx, category in enumerate(CATEGORIES)}

    def _load_custom_predictor(self) -> Optional[Callable[..., Dict[str, float]]]:
        path = Path(self.settings.nlp_adapter_path)
        if not path.exists() or not path.is_file():
            return None
        try:
            spec = importlib.util.spec_from_file_location("nlp_custom_adapter", str(path))
            if spec is None or spec.loader is None:
                return None
            module = importlib.util.module_from_spec(spec)
            spec.loader.exec_module(module)
            predict = getattr(module, "predict", None)
            if callable(predict):
                return predict
        except Exception:
            return None
        return None

    def _try_load_model(self, model_path: str):
        path = Path(model_path)
        if path.is_file() and path.suffix == ".pt":
            try:
                import torch

                model = torch.load(path, map_location="cpu")
                if hasattr(model, "eval"):
                    model.eval()
                return model
            except Exception:
                return None
        if path.exists() and path.is_dir():
            pt_candidates = sorted(path.glob("*.pt"))
            if pt_candidates:
                try:
                    import torch

                    model = torch.load(pt_candidates[0], map_location="cpu")
                    if hasattr(model, "eval"):
                        model.eval()
                    return model
                except Exception:
                    pass
            try:
                from transformers import pipeline

                return pipeline("text-classification", model=str(path), tokenizer=str(path), top_k=None)
            except Exception:
                return None
        return None

    @staticmethod
    def _softmax(values: list[float]) -> list[float]:
        if not values:
            return []
        m = max(values)
        exps = [math.exp(v - m) for v in values]
        s = sum(exps) or 1.0
        return [e / s for e in exps]

    def _normalize_dict(self, payload: Dict[str, Any]) -> Dict[str, float]:
        probs = {category: 0.0 for category in CATEGORIES}
        for key, value in payload.items():
            key_norm = str(key).lower().strip()
            score = float(value)
            for category in CATEGORIES:
                if key_norm == category or key_norm in category or category in key_norm:
                    probs[category] = max(probs[category], score)
        total = sum(probs.values())
        if total <= 0:
            return probs
        return {k: v / total for k, v in probs.items()}

    def _tensor_like_to_probs(self, output: Any) -> Optional[Dict[str, float]]:
        try:
            raw_values: list[float] = []
            if hasattr(output, "detach"):
                tensor = output.detach().cpu().flatten()
                raw_values = [float(v) for v in tensor.tolist()]
            elif isinstance(output, (list, tuple)):
                raw_values = [float(v) for v in output]
            if not raw_values:
                return None
            normalized = self._softmax(raw_values)
            probs = {category: 0.0 for category in CATEGORIES}
            for idx, score in enumerate(normalized):
                mapped = self.label_map.get(idx)
                if mapped in probs:
                    probs[mapped] = float(score)
            return probs
        except Exception:
            return None

    def _heuristic_predict(self, text: str, lang: str) -> Dict[str, float]:
        normalized = (text or "").lower()
        scores = {category: 0.05 for category in CATEGORIES}
        if any(word in normalized for word in ["hate", "harass", "වෛර", "හිරිහැර"]):
            scores["harassment_hate_speech"] = 0.78
        if any(word in normalized for word in ["kill", "murder", "shoot", "stab", "මර", "ඝාත"]):
            scores["killings_murder_violent_acts"] = 0.85
        if any(word in normalized for word in ["elder abuse", "වැඩිහිටි"]):
            scores["elder_abuse"] = 0.8
        if any(word in normalized for word in ["child abuse", "ළමා අපයෝජන", "child"]):
            scores["child_abuse"] = 0.88
        if any(word in normalized for word in ["fight", "violent", "ගැටුම", "අවි"]):
            scores["general_violence"] = max(scores["general_violence"], 0.75)

        total = sum(scores.values())
        return {k: v / total for k, v in scores.items()}

    def predict(self, text: str, lang: str) -> Dict[str, float]:
        if self.custom_predict_fn is not None:
            try:
                return self._normalize_dict(self.custom_predict_fn(text=text, lang=lang, categories=CATEGORIES))
            except Exception:
                pass

        if self.model is None:
            return self._heuristic_predict(text, lang)

        if callable(self.model):
            try:
                output = self.model(text)
                if isinstance(output, dict):
                    normalized = self._normalize_dict(output)
                    if sum(normalized.values()) > 0:
                        return normalized
                tensor_probs = self._tensor_like_to_probs(output)
                if tensor_probs is not None and sum(tensor_probs.values()) > 0:
                    return tensor_probs
            except Exception:
                pass

        if hasattr(self.model, "__class__") and self.model.__class__.__name__ == "TextClassificationPipeline":
            try:
                results = self.model(text, truncation=True)
                probs: Dict[str, float] = {k: 0.0 for k in CATEGORIES}
                flat = results[0] if isinstance(results, list) else results
                for item in flat:
                    label = str(item.get("label", "")).lower()
                    score = float(item.get("score", 0.0))
                    for category in CATEGORIES:
                        if category in label:
                            probs[category] = max(probs[category], score)
                if sum(probs.values()) > 0:
                    return probs
            except Exception:
                pass

        return self._heuristic_predict(text, lang)


_text_model: Optional[TextModel] = None


def get_text_model() -> TextModel:
    global _text_model
    if _text_model is None:
        _text_model = TextModel()
    return _text_model
