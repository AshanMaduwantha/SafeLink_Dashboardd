from pathlib import Path
from typing import List, Set, Tuple


class KeywordPrefilter:
    def __init__(self, en_path: str, si_path: str) -> None:
        self.en_keywords = self._load(en_path)
        self.si_keywords = self._load(si_path)

    @staticmethod
    def _load(path: str) -> Set[str]:
        p = Path(path)
        if not p.exists():
            return set()
        return {line.strip().lower() for line in p.read_text(encoding="utf-8").splitlines() if line.strip()}

    def match(self, text: str) -> Tuple[bool, List[str]]:
        normalized = (text or "").lower()
        hits = [kw for kw in self.en_keywords.union(self.si_keywords) if kw in normalized]
        return (len(hits) > 0, hits)
