"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  fetchAlert,
  patchAlert,
  HCD_API_BASE,
} from "@/lib/harmfulContentDetector/api";
import type { AlertDetail as AlertDetailType } from "@/lib/harmfulContentDetector/types";

function parseApiDate(value: string): Date {
  if (!value) return new Date(0);
  const hasTimezone = /[zZ]|[+-]\d{2}:\d{2}$/.test(value);
  return new Date(hasTimezone ? value : `${value}Z`);
}

const BASE = "/dashboard/social-media";

export default function AlertDetail() {
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const [data, setData] = useState<AlertDetailType | null>(null);
  const [busyAction, setBusyAction] = useState<
    "" | "investigating" | "resolved"
  >("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!id) return;
    fetchAlert(Number(id)).then(setData).catch(console.error);
  }, [id]);

  async function refreshAlert() {
    if (!id) return;
    const updated = await fetchAlert(Number(id));
    setData(updated);
  }

  async function setStatus(status: "investigating" | "resolved") {
    if (!data) return;
    setBusyAction(status);
    setMessage("");
    try {
      await patchAlert(data.id, { status });
      await refreshAlert();
      setMessage(`Alert marked as ${status}.`);
    } catch {
      setMessage("Failed to update alert status.");
    } finally {
      setBusyAction("");
    }
  }

  function formatCategory(category: string): string {
    return category
      .replaceAll("_", " ")
      .split(" ")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  }

  if (!data)
    return <div className="hcd-empty-state">Loading alert details...</div>;

  const media =
    (data.post.media as Array<Record<string, unknown>> | undefined) ?? [];
  const category = String(data.analysis.category ?? "");
  const severity = String(data.analysis.severity ?? "LOW");
  const postUrl = String(data.post.url ?? "").trim();
  const fusionScore = Number(data.analysis.fusion_score ?? 0);
  const postText = String(data.post.text ?? "").trim();

  function fileNameFromPath(pathValue: string): string {
    const parts = pathValue.split("/");
    return parts[parts.length - 1] || pathValue;
  }

  function toStorageUrl(pathValue: string): string {
    if (!pathValue) return "";
    if (
      pathValue.startsWith("http://") ||
      pathValue.startsWith("https://")
    )
      return pathValue;
    if (pathValue.startsWith("/storage/")) return `${HCD_API_BASE}${pathValue}`;
    const marker = "/storage/";
    const idx = pathValue.indexOf(marker);
    if (idx >= 0) return `${HCD_API_BASE}${pathValue.slice(idx)}`;
    return "";
  }

  function simplifyDetectionLabel(value: string): string {
    const [label, score] = value.split(":");
    const niceLabel = label
      .replaceAll("_", " ")
      .replace(/\b\w/g, (c) => c.toUpperCase());
    if (!score) return niceLabel;
    const pct = Math.round(Number(score) * 100);
    return Number.isFinite(pct) ? `${niceLabel} ${pct}%` : niceLabel;
  }

  return (
    <div className="hcd-detail-layout">
      <div
        className="hcd-row"
        style={{ justifyContent: "space-between", alignItems: "center" }}
      >
        <div>
          <h2 className="hcd-section-title">Alert #{data.id}</h2>
          <div className="hcd-muted">
            Quick review of risk, source, and media evidence
          </div>
        </div>
        <Link href={BASE} className="hcd-btn-secondary hcd-detail-back-btn">
          Back to Dashboard
        </Link>
      </div>

      <div className="hcd-detail-summary-grid">
        <div className="hcd-metric-card">
          <div className="hcd-metric-label">Status</div>
          <div className="hcd-detail-stat">
            {String(data.status).toUpperCase()}
          </div>
        </div>
        <div className="hcd-metric-card">
          <div className="hcd-metric-label">Severity</div>
          <div className="hcd-detail-stat">
            <span className={`hcd-badge severity-${severity}`}>{severity}</span>
          </div>
        </div>
        <div className="hcd-metric-card">
          <div className="hcd-metric-label">Category</div>
          <div className="hcd-detail-stat">{formatCategory(category)}</div>
        </div>
        <div className="hcd-metric-card">
          <div className="hcd-metric-label">Fusion Score</div>
          <div className="hcd-detail-stat">{fusionScore.toFixed(2)}</div>
        </div>
      </div>

      <div className="hcd-detail-single">
        <div className="hcd-card hcd-detail-card">
          <h3 className="hcd-section-title">Post Details</h3>
          <div>
            <strong>Reported:</strong>{" "}
            {parseApiDate(data.created_at).toLocaleString()}
          </div>
          <div>
            <strong>Post text:</strong>{" "}
            {postText || "No text content available"}
          </div>
          <div className="hcd-row" style={{ marginTop: 10 }}>
            <button
              className="hcd-action-btn source-open"
              disabled={!postUrl || busyAction !== ""}
              onClick={() => {
                if (postUrl)
                  window.open(postUrl, "_blank", "noopener,noreferrer");
              }}
            >
              Open Source Post
            </button>
            <button
              className="hcd-action-btn view"
              disabled={busyAction !== ""}
              onClick={() => setStatus("investigating")}
            >
              {busyAction === "investigating" ? "Updating..." : "Start Investigation"}
            </button>
            <button
              className="hcd-action-btn report"
              disabled={busyAction !== ""}
              onClick={() => setStatus("resolved")}
            >
              {busyAction === "resolved" ? "Updating..." : "Mark as Resolved"}
            </button>
          </div>
          {message && (
            <div
              className={
                message.toLowerCase().includes("failed")
                  ? "hcd-status-bad"
                  : "hcd-status-ok"
              }
            >
              {message}
            </div>
          )}
        </div>
      </div>

      <div className="hcd-card hcd-detail-card">
        <h3 className="hcd-section-title">Evidence</h3>
        <div className="hcd-muted">
          Detected media information and highlights from this alert.
        </div>
        {media.length === 0 && (
          <div className="hcd-empty-state">No media evidence attached.</div>
        )}
        {media.map((m, idx) => {
          const meta =
            (m.meta_json as Record<string, unknown> | undefined) ?? {};
          const evidenceFrames =
            (meta.evidence_frames as string[] | undefined) ?? [];
          const topDetections =
            (meta.top_detections as string[] | undefined) ?? [];
          const transcript = String(meta.transcript ?? "");
          const mediaType = String(m.type ?? "unknown");
          const mediaPath = String(m.path ?? "");
          return (
            <div key={idx} className="hcd-evidence-item">
              <div className="hcd-evidence-header">
                <span className="hcd-tag hcd-tag-open">
                  {mediaType.toUpperCase()}
                </span>
                <span className="hcd-muted">{fileNameFromPath(mediaPath)}</span>
              </div>
              <div className="hcd-muted">
                <strong>File:</strong> {mediaPath}
              </div>
              <div className="hcd-row">
                <button
                  className="hcd-action-btn view"
                  disabled={!toStorageUrl(mediaPath)}
                  onClick={() => {
                    const url = toStorageUrl(mediaPath);
                    if (url) window.open(url, "_blank", "noopener,noreferrer");
                  }}
                >
                  Open Downloaded File
                </button>
              </div>
              {transcript && (
                <div className="hcd-transcript-box">
                  <strong>Transcript Summary</strong>
                  <div>{transcript}</div>
                </div>
              )}
              {topDetections.length > 0 && (
                <div>
                  <strong>Top detections</strong>
                  <div className="hcd-evidence-chip-list">
                    {topDetections.slice(0, 10).map((detection) => (
                      <span key={detection} className="hcd-evidence-chip">
                        {simplifyDetectionLabel(detection)}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {evidenceFrames.length > 0 ? (
                <div className="hcd-evidence-frame-grid">
                  {evidenceFrames.slice(0, 8).map((frameUrl) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      key={frameUrl}
                      src={`${HCD_API_BASE}${frameUrl}`}
                      alt="Evidence frame"
                      className="hcd-evidence-frame"
                    />
                  ))}
                </div>
              ) : (
                <div className="hcd-muted">
                  No preview frames available for this media.
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="hcd-detail-grid">
        <div className="hcd-card hcd-detail-card">
          <h3 className="hcd-section-title">Text Probabilities</h3>
          <pre>{JSON.stringify(data.analysis.text_probs, null, 2)}</pre>
        </div>
        <div className="hcd-card hcd-detail-card">
          <h3 className="hcd-section-title">Audio Probabilities</h3>
          <pre>{JSON.stringify(data.analysis.audio_probs, null, 2)}</pre>
        </div>
        <div className="hcd-card hcd-detail-card hcd-detail-span-2">
          <h3 className="hcd-section-title">Model Explanation</h3>
          <pre>{JSON.stringify(data.analysis.explanation_json, null, 2)}</pre>
        </div>
      </div>
    </div>
  );
}
