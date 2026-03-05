"use client";

import { FormEvent, useState } from "react";
import { debugModelCheck } from "@/lib/harmfulContentDetector/api";

export default function DebugConsole() {
  const [text, setText] = useState(
    "He said he will kill with a gun tonight."
  );
  const [lang, setLang] = useState("en");
  const [videoPath, setVideoPath] = useState("");
  const [runAudio, setRunAudio] = useState(true);
  const [result, setResult] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      const payload = {
        text,
        lang: lang.trim() ? lang : undefined,
        video_path: videoPath.trim() ? videoPath : undefined,
        run_audio: runAudio,
      };
      const data = await debugModelCheck(payload);
      setResult(data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Debug request failed"
      );
      setResult(null);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="hcd-row" style={{ flexDirection: "column" }}>
      <h2>Model Debug Console</h2>
      <div className="hcd-card">
        <form
          onSubmit={onSubmit}
          className="hcd-row"
          style={{ flexDirection: "column" }}
        >
          <label>
            Text
            <textarea
              rows={4}
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
          </label>
          <div className="hcd-row">
            <label style={{ minWidth: 220 }}>
              Lang (optional)
              <input
                value={lang}
                onChange={(e) => setLang(e.target.value)}
                placeholder="en or si"
              />
            </label>
            <label style={{ minWidth: 360 }}>
              Video path (optional)
              <input
                value={videoPath}
                onChange={(e) => setVideoPath(e.target.value)}
                placeholder="e.g. sample_video.mp4"
              />
            </label>
          </div>
          <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <input
              type="checkbox"
              checked={runAudio}
              onChange={(e) => setRunAudio(e.target.checked)}
            />
            Run audio pipeline when video is provided
          </label>
          <div className="hcd-row">
            <button type="submit" disabled={loading}>
              {loading ? "Running..." : "Run Model Check"}
            </button>
          </div>
          {error && <div style={{ color: "#b91c1c" }}>{error}</div>}
        </form>
      </div>
      <div className="hcd-card">
        <h3>Result</h3>
        <pre style={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
          {result ? JSON.stringify(result, null, 2) : "No result yet."}
        </pre>
      </div>
    </div>
  );
}
