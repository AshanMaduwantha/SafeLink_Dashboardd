from pathlib import Path
from typing import Dict, List, Optional, Tuple

import cv2

from app.core.config import get_settings


class VideoModel:
    def __init__(self) -> None:
        self.settings = get_settings()
        self.model = self._load_yolo(self.settings.yolo_weights_path)

    @staticmethod
    def _load_yolo(path: str):
        p = Path(path)
        if not p.exists() or p.suffix != ".pt":
            return None
        try:
            from ultralytics import YOLO

            return YOLO(str(p))
        except Exception:
            return None

    def _save_overlay(self, frame, boxes: List[Tuple[int, int, int, int]], out_path: Path) -> None:
        img = frame.copy()
        for x1, y1, x2, y2 in boxes:
            cv2.rectangle(img, (x1, y1), (x2, y2), (0, 0, 255), 2)
        out_path.parent.mkdir(parents=True, exist_ok=True)
        cv2.imwrite(str(out_path), img)

    def _is_violence_related(self, class_name: str) -> bool:
        class_name_norm = class_name.lower().strip()
        return any(keyword in class_name_norm for keyword in self.settings.violence_class_keywords_list)

    def analyze(self, video_path: str, evidence_dir: str, fps_sample: int = 1) -> Dict:
        cap = cv2.VideoCapture(video_path)
        if not cap.isOpened():
            return {"video_score": 0.0, "evidence_frames": []}

        frame_idx = 0
        detections = []
        detection_labels: List[str] = []
        evidence_frames: List[str] = []
        native_fps = max(1.0, cap.get(cv2.CAP_PROP_FPS) or 1.0)
        interval = int(max(1, native_fps / max(1, fps_sample)))

        while True:
            ret, frame = cap.read()
            if not ret:
                break
            if frame_idx % interval != 0:
                frame_idx += 1
                continue

            score = 0.0
            boxes: List[Tuple[int, int, int, int]] = []
            if self.model is not None:
                try:
                    results = self.model(frame, verbose=False)
                    for r in results:
                        if getattr(r, "boxes", None) is None:
                            continue
                        names = getattr(r, "names", {})
                        for box in r.boxes:
                            conf = float(box.conf[0])
                            class_id = int(box.cls[0]) if getattr(box, "cls", None) is not None else -1
                            class_name = str(names.get(class_id, f"class_{class_id}")).lower()
                            if self.settings.violence_class_keywords_list and not self._is_violence_related(class_name):
                                continue
                            score = max(score, conf)
                            detection_labels.append(f"{class_name}:{conf:.2f}")
                            x1, y1, x2, y2 = [int(v) for v in box.xyxy[0]]
                            boxes.append((x1, y1, x2, y2))
                except Exception:
                    score = 0.0
            else:
                # Demo fallback: high motion proxy.
                gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
                score = float(gray.std() / 128.0)

            if score > 0.4:
                out_name = f"frame_{frame_idx}.jpg"
                out_path = Path(evidence_dir) / out_name
                self._save_overlay(frame, boxes, out_path)
                evidence_frames.append(str(out_path))
                detections.append(score)

            frame_idx += 1

        cap.release()
        video_score = min(1.0, sum(detections) / max(1, len(detections))) if detections else 0.0
        return {
            "video_score": video_score,
            "evidence_frames": evidence_frames[:12],
            "top_detections": detection_labels[:30],
        }


_video_model: Optional[VideoModel] = None


def get_video_model() -> VideoModel:
    global _video_model
    if _video_model is None:
        _video_model = VideoModel()
    return _video_model
