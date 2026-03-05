from pathlib import Path

from app.services.keyword_prefilter import KeywordPrefilter


def test_keyword_prefilter_matches(tmp_path: Path):
    en = tmp_path / "en.txt"
    si = tmp_path / "si.txt"
    en.write_text("kill\nhate\n", encoding="utf-8")
    si.write_text("මරන්න\n", encoding="utf-8")

    prefilter = KeywordPrefilter(str(en), str(si))
    matched, hits = prefilter.match("This post says kill now")
    assert matched is True
    assert "kill" in hits


def test_keyword_prefilter_no_match(tmp_path: Path):
    en = tmp_path / "en.txt"
    si = tmp_path / "si.txt"
    en.write_text("hate\n", encoding="utf-8")
    si.write_text("මරන්න\n", encoding="utf-8")

    prefilter = KeywordPrefilter(str(en), str(si))
    matched, hits = prefilter.match("Safe text")
    assert matched is False
    assert hits == []
