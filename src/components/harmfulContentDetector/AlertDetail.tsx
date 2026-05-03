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
  // Matches: Z, +00:00, +0000 (Facebook omits the colon)
  const hasTimezone = /[zZ]|[+-]\d{2}:?\d{2}$/.test(value);
  // Normalise +0000 → +00:00 so all JS engines parse it correctly
  const normalised = value.replace(/([+-]\d{2})(\d{2})$/, "$1:$2");
  return new Date(hasTimezone ? normalised : `${normalised}Z`);
}

function formatTimeLag(from: Date, to: Date): string {
  const diffMs = Math.max(0, to.getTime() - from.getTime());
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "Less than a minute";
  if (diffMin < 60) return `${diffMin} minute${diffMin !== 1 ? "s" : ""}`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr} hour${diffHr !== 1 ? "s" : ""}`;
  const diffDay = Math.floor(diffHr / 24);
  return `${diffDay} day${diffDay !== 1 ? "s" : ""}`;
}

const BASE = "/dashboard/social-media";


const CATEGORY_LABELS: Record<string, string> = {
  general_violence: "General Violence",
  weapons: "Weapons / Armed Threat",
  fire_explosion: "Fire / Explosion",
  hate_speech: "Hate Speech",
  self_harm: "Self Harm",
  drugs: "Drug-Related Content",
  abuse: "Abuse / Assault",
  terrorism: "Terrorism / Extremism",
};

const SEVERITY_CONFIG: Record<
  string,
  { label: string; color: string; bg: string; border: string; advice: string }
> = {
  CRITICAL: {
    label: "Critical Threat",
    color: "#991b1b",
    bg: "#fef2f2",
    border: "#fca5a5",
    advice: "Immediate action required. Escalate to senior officers and dispatch if necessary.",
  },
  HIGH: {
    label: "High Risk",
    color: "#c2410c",
    bg: "#fff7ed",
    border: "#fdba74",
    advice: "Urgent review needed. Assign an officer to investigate this report.",
  },
  MED: {
    label: "Moderate Risk",
    color: "#92400e",
    bg: "#fffbeb",
    border: "#fcd34d",
    advice: "Review the content and evidence below. Decide if further investigation is needed.",
  },
  LOW: {
    label: "Low Risk",
    color: "#166534",
    bg: "#f0fdf4",
    border: "#86efac",
    advice: "Content flagged for awareness. Monitor and close if no further action is needed.",
  },
};

function RiskMeter({ score }: { score: number }) {
  const clamped = Math.min(100, Math.max(0, score));
  const color =
    clamped >= 80 ? "#dc2626" : clamped >= 60 ? "#ea580c" : clamped >= 40 ? "#d97706" : "#16a34a";
  return (
    <div className="hcd-risk-meter">
      <div className="hcd-risk-meter-track">
        <div
          className="hcd-risk-meter-fill"
          style={{ width: `${clamped}%`, background: color }}
        />
      </div>
      <div className="hcd-risk-meter-labels">
        <span>Low</span>
        <span>Moderate</span>
        <span>High</span>
        <span>Critical</span>
      </div>
    </div>
  );
}

function DetectionBadge({ label }: { label: string }) {
  const [name, scoreStr] = label.split(":");
  const pct = scoreStr ? Math.round(Number(scoreStr) * 100) : null;
  const niceName = name.replaceAll("_", " ").replace(/\b\w/g, (c) => c.toUpperCase());

  const isHigh = pct !== null && pct >= 60;
  const isMed = pct !== null && pct >= 40 && pct < 60;

  return (
    <span
      className={`hcd-detection-badge ${isHigh ? "hcd-detection-badge-high" : isMed ? "hcd-detection-badge-med" : ""}`}
    >
      {pct !== null ? `${niceName} — ${pct}%` : niceName}
    </span>
  );
}

function buildThreatSummary(
  category: string,
  severity: string,
  fusionScore: number,
  topDetections: string[],
  hasVideo: boolean,
  transcript: string
): string {
  const catLabel = CATEGORY_LABELS[category] ?? category.replaceAll("_", " ");
  const detectionNames = topDetections
    .slice(0, 3)
    .map((d) => d.split(":")[0].replaceAll("_", " ").toLowerCase())
    .filter((v, i, a) => a.indexOf(v) === i);

  let summary = `The AI system flagged this ${hasVideo ? "video" : "text"} post as potentially containing `;
  summary += `${catLabel.toLowerCase()} content`;

  if (detectionNames.length > 0) {
    summary += `, with visual detections of ${detectionNames.join(", ")}`;
  }

  summary += `. The overall risk score is ${Math.round(fusionScore)} out of 100`;

  if (severity === "CRITICAL" || severity === "HIGH") {
    summary += `, which is considered ${severity.toLowerCase()} risk.`;
  } else {
    summary += `.`;
  }

  if (transcript) {
    summary += " Audio from the video has also been transcribed and is available below.";
  }

  return summary;
}

export default function AlertDetail() {
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const [data, setData] = useState<AlertDetailType | null>(null);
  const [busyAction, setBusyAction] = useState<"" | "investigating" | "resolved">("");
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
      setMessage(status === "resolved" ? "Case marked as resolved." : "Case assigned for investigation.");
    } catch {
      setMessage("Failed to update case status. Please try again.");
    } finally {
      setBusyAction("");
    }
  }

  if (!data)
    return (
      <div className="hcd-loading-state">
        <div className="hcd-loading-spinner" />
        <div>Loading incident report...</div>
      </div>
    );

  const media = (data.post.media as Array<Record<string, unknown>> | undefined) ?? [];
  const category = String(data.analysis.category ?? "");
  const severity = String(data.analysis.severity ?? "LOW");
  const postUrl = String(data.post.url ?? "").trim();
  const fusionScore = Number(data.analysis.fusion_score ?? 0);
  const postText = String(data.post.text ?? "").trim();
  const platform = String(data.post.platform ?? "").toLowerCase();
  const author = String(data.post.author ?? "Unknown").trim();
  const publishedAtRaw = data.post.published_at ? String(data.post.published_at) : null;
  const publishedAt = publishedAtRaw ? parseApiDate(publishedAtRaw) : null;
  const statusVal = String(data.status ?? "").toLowerCase();

  const sevConfig = SEVERITY_CONFIG[severity] ?? SEVERITY_CONFIG.LOW;
  const reportedAt = parseApiDate(data.created_at);

  const allTopDetections: string[] = [];
  let hasVideo = false;
  let mainTranscript = "";

  for (const m of media) {
    const meta = (m.meta_json as Record<string, unknown> | undefined) ?? {};
    const detections = (meta.top_detections as string[] | undefined) ?? [];
    allTopDetections.push(...detections);
    if (String(m.type ?? "") === "video") hasVideo = true;
    if (!mainTranscript) mainTranscript = String(meta.transcript ?? "");
  }

  const threatSummary = buildThreatSummary(
    category,
    severity,
    fusionScore,
    allTopDetections,
    hasVideo,
    mainTranscript
  );

  function toStorageUrl(pathValue: string): string {
    if (!pathValue) return "";
    if (pathValue.startsWith("http://") || pathValue.startsWith("https://")) return pathValue;
    if (pathValue.startsWith("/storage/")) return `${HCD_API_BASE}${pathValue}`;
    const idx = pathValue.indexOf("/storage/");
    if (idx >= 0) return `${HCD_API_BASE}${pathValue.slice(idx)}`;
    return "";
  }

  const statusTagClass =
    statusVal === "resolved"
      ? "hcd-tag-resolved"
      : statusVal === "investigating"
      ? "hcd-tag-investigating"
      : "hcd-tag-new";

  return (
    <div className="hcd-detail-layout">

      {/* ── Header ── */}
      <div className="hcd-report-header">
        <div className="hcd-report-header-left">
          <div className="hcd-report-caseid">INCIDENT REPORT — CASE #{data.id}</div>
          <div className="hcd-report-meta">
            <span>{platform.charAt(0).toUpperCase() + platform.slice(1)}</span>
            <span>·</span>
            <span>
              Posted: {publishedAt
                ? publishedAt.toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })
                : reportedAt.toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })}
            </span>
            <span>·</span>
            <span className={`hcd-tag ${statusTagClass}`}>
              {statusVal.charAt(0).toUpperCase() + statusVal.slice(1)}
            </span>
          </div>
        </div>
        <Link href={BASE} className="hcd-btn-secondary hcd-detail-back-btn">
          ← Back to Dashboard
        </Link>
      </div>

      {/* ── Threat Level Banner ── */}
      <div
        className="hcd-threat-banner"
        style={{ background: sevConfig.bg, borderColor: sevConfig.border }}
      >
        <div className="hcd-threat-banner-top">
          <div className="hcd-threat-level-label" style={{ color: sevConfig.color }}>
            {sevConfig.label}
          </div>
          <div className="hcd-threat-score" style={{ color: sevConfig.color }}>
            Risk Score: {Math.round(fusionScore)} / 100
          </div>
        </div>
        <RiskMeter score={fusionScore} />
        <div className="hcd-threat-advice" style={{ color: sevConfig.color }}>
          {sevConfig.advice}
        </div>
      </div>

      {/* ── AI Summary ── */}
      <div className="hcd-card hcd-detail-card">
        <div className="hcd-section-title">AI Threat Summary</div>
        <div className="hcd-ai-summary-text">{threatSummary}</div>
        <div className="hcd-summary-pills">
          <div className="hcd-summary-pill">
            <span className="hcd-summary-pill-label">Threat Type</span>
            <span className="hcd-summary-pill-value">
              {CATEGORY_LABELS[category] ?? category.replaceAll("_", " ")}
            </span>
          </div>
          <div className="hcd-summary-pill">
            <span className="hcd-summary-pill-label">Content Type</span>
            <span className="hcd-summary-pill-value">{hasVideo ? "Video Post" : "Text Post"}</span>
          </div>
          <div className="hcd-summary-pill">
            <span className="hcd-summary-pill-label">Platform</span>
            <span className="hcd-summary-pill-value">{platform.charAt(0).toUpperCase() + platform.slice(1)}</span>
          </div>
          <div className="hcd-summary-pill">
            <span className="hcd-summary-pill-label">Posted By</span>
            <span className="hcd-summary-pill-value">{author}</span>
          </div>
        </div>
      </div>

      {/* ── Officer Actions ── */}
      <div className="hcd-card hcd-detail-card hcd-actions-card">
        <div className="hcd-section-title">Officer Actions</div>
        <div className="hcd-officer-actions">
          {postUrl && (
            <button
              className="hcd-officer-btn hcd-officer-btn-source"
              onClick={() => window.open(postUrl, "_blank", "noopener,noreferrer")}
            >
              View Original Post
            </button>
          )}
          <button
            className="hcd-officer-btn hcd-officer-btn-investigate"
            disabled={busyAction !== "" || statusVal === "investigating"}
            onClick={() => setStatus("investigating")}
          >
            {busyAction === "investigating" ? "Updating..." : "Start Investigation"}
          </button>
          <button
            className="hcd-officer-btn hcd-officer-btn-resolve"
            disabled={busyAction !== "" || statusVal === "resolved"}
            onClick={() => setStatus("resolved")}
          >
            {busyAction === "resolved" ? "Updating..." : "Mark as Resolved"}
          </button>
        </div>
        {message && (
          <div className={message.toLowerCase().includes("failed") ? "hcd-status-bad" : "hcd-status-ok"}>
            {message}
          </div>
        )}
      </div>

      {/* ── Post Content ── */}
      <div className="hcd-card hcd-detail-card">
        <div className="hcd-section-title">Post Content</div>
        {postText ? (
          <div className="hcd-post-text-box">{postText}</div>
        ) : (
          <div className="hcd-muted">No text content in this post.</div>
        )}
      </div>

      {/* ── Visual Evidence ── */}
      {media.length > 0 && (
        <div className="hcd-card hcd-detail-card">
          <div className="hcd-section-title">Visual Evidence</div>
          <div className="hcd-muted" style={{ marginBottom: 8 }}>
            Frames extracted from the video where harmful content was detected.
          </div>
          {media.map((m, idx) => {
            const meta = (m.meta_json as Record<string, unknown> | undefined) ?? {};
            const evidenceFrames = (meta.evidence_frames as string[] | undefined) ?? [];
            const topDetections = (meta.top_detections as string[] | undefined) ?? [];
            const transcript = String(meta.transcript ?? "");
            const mediaType = String(m.type ?? "unknown");
            const mediaPath = String(m.path ?? "");
            const mediaUrl = toStorageUrl(mediaPath);

            return (
              <div key={idx} className="hcd-evidence-item">
                {/* Evidence header */}
                <div className="hcd-evidence-header">
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    <span className="hcd-tag hcd-tag-open">
                      {mediaType === "video" ? "VIDEO" : "IMAGE"}
                    </span>
                    <span className="hcd-muted" style={{ fontSize: 12 }}>
                      Evidence file #{idx + 1}
                    </span>
                    {meta.duration_sec != null && (
                      <span className="hcd-video-stat">
                        Duration: {Number(meta.duration_sec) >= 60
                          ? `${Math.floor(Number(meta.duration_sec) / 60)}m ${Math.round(Number(meta.duration_sec) % 60)}s`
                          : `${Number(meta.duration_sec)}s`}
                      </span>
                    )}
                    {meta.frames_sampled != null && (
                      <span className="hcd-video-stat">
                        {meta.frames_sampled} frames checked
                      </span>
                    )}
                    {meta.fps_sample_used != null && (
                      <span className="hcd-video-stat">
                        {meta.fps_sample_used} frame{Number(meta.fps_sample_used) !== 1 ? "s" : ""}/sec sampling
                      </span>
                    )}
                  </div>
                  {mediaUrl && (
                    <button
                      className="hcd-officer-btn hcd-officer-btn-sm"
                      onClick={() => window.open(mediaUrl, "_blank", "noopener,noreferrer")}
                    >
                      Download File
                    </button>
                  )}
                </div>

                {/* What the AI detected */}
                {topDetections.length > 0 && (
                  <div>
                    <div className="hcd-evidence-detect-label">What was detected:</div>
                    <div className="hcd-evidence-chip-list">
                      {topDetections.slice(0, 12).map((d) => (
                        <DetectionBadge key={d} label={d} />
                      ))}
                    </div>
                  </div>
                )}

                {/* Evidence frames */}
                {evidenceFrames.length > 0 && (
                  <div>
                    <div className="hcd-evidence-detect-label">Key frames from the video:</div>
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
                  </div>
                )}

                {/* Transcript */}
                {transcript && (
                  <div className="hcd-transcript-box">
                    <div style={{ fontWeight: 700, marginBottom: 4 }}>Audio Transcript</div>
                    <div>{transcript}</div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── Case Timeline ── */}
      <div className="hcd-card hcd-detail-card">
        <div className="hcd-section-title">Case Timeline</div>
        <div className="hcd-timeline">

          {/* Original post time on social media */}
          {publishedAt ? (
            <div className="hcd-timeline-item">
              <div className="hcd-timeline-dot hcd-timeline-dot-blue" />
              <div>
                <div className="hcd-timeline-title">
                  Post published on {platform.charAt(0).toUpperCase() + platform.slice(1)}
                </div>
                <div className="hcd-timeline-time">
                  {publishedAt.toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })}
                </div>
              </div>
            </div>
          ) : (
            <div className="hcd-timeline-item">
              <div className="hcd-timeline-dot hcd-timeline-dot-blue" />
              <div>
                <div className="hcd-timeline-title">
                  Post published on {platform.charAt(0).toUpperCase() + platform.slice(1)}
                </div>
                <div className="hcd-timeline-time hcd-muted">Original post time not available</div>
              </div>
            </div>
          )}

          {/* AI detection time */}
          <div className="hcd-timeline-item">
            <div className="hcd-timeline-dot hcd-timeline-dot-gray" />
            <div>
              <div className="hcd-timeline-title">Detected by AI system</div>
              <div className="hcd-timeline-time">
                {parseApiDate(data.created_at).toLocaleString("en-GB", {
                  dateStyle: "medium",
                  timeStyle: "short",
                })}
              </div>
              {publishedAt && (
                <div className="hcd-timeline-lag">
                  {formatTimeLag(publishedAt, parseApiDate(data.created_at))} after posting
                </div>
              )}
            </div>
          </div>

          {statusVal === "investigating" && (
            <div className="hcd-timeline-item">
              <div className="hcd-timeline-dot hcd-timeline-dot-orange" />
              <div>
                <div className="hcd-timeline-title">Investigation started</div>
                <div className="hcd-timeline-time">
                  {parseApiDate(data.updated_at).toLocaleString("en-GB", {
                    dateStyle: "medium",
                    timeStyle: "short",
                  })}
                </div>
              </div>
            </div>
          )}

          {statusVal === "resolved" && (
            <div className="hcd-timeline-item">
              <div className="hcd-timeline-dot hcd-timeline-dot-green" />
              <div>
                <div className="hcd-timeline-title">Case resolved</div>
                <div className="hcd-timeline-time">
                  {parseApiDate(data.updated_at).toLocaleString("en-GB", {
                    dateStyle: "medium",
                    timeStyle: "short",
                  })}
                </div>
              </div>
            </div>
          )}

        </div>
      </div>

    </div>
  );
}
