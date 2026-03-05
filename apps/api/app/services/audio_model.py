import json
import subprocess
from pathlib import Path
from typing import Dict

from app.core.config import get_settings
from app.services.language import detect_lang
from app.services.text_model import get_text_model


class AudioModel:
    def __init__(self) -> None:
        self.settings = get_settings()
        self.whisper = self._load_whisper()

    def _load_whisper(self):
        try:
            import whisper

            return whisper.load_model(self.settings.whisper_model)
        except Exception:
            return None

    def extract_audio(self, video_path: str, out_wav: str) -> bool:
        cmd = ["ffmpeg", "-y", "-i", video_path, "-vn", "-ac", "1", "-ar", "16000", out_wav]
        proc = subprocess.run(cmd, capture_output=True, text=True)
        return proc.returncode == 0

    def transcribe(self, wav_path: str) -> str:
        if self.whisper is None:
            return ""
        try:
            result = self.whisper.transcribe(wav_path)
            return result.get("text", "").strip()
        except Exception:
            return ""

    def analyze_video_audio(self, video_path: str, work_dir: str) -> Dict:
        work = Path(work_dir)
        work.mkdir(parents=True, exist_ok=True)
        wav_path = work / "audio.wav"
        transcript_path = work / "transcript.json"

        transcript = ""
        if self.extract_audio(video_path, str(wav_path)):
            transcript = self.transcribe(str(wav_path))
        lang = detect_lang(transcript)
        probs = get_text_model().predict(transcript, lang) if transcript else {}

        transcript_path.write_text(json.dumps({"transcript": transcript, "lang": lang}, ensure_ascii=False), encoding="utf-8")
        return {"transcript": transcript, "audio_probs": probs, "transcript_path": str(transcript_path)}
