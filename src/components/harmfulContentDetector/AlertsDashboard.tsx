"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  fetchAlerts,
  ingestFacebookPoll,
  ingestTwitterPoll,
  ingestYouTubePoll,
  patchAlert,
  HCD_API_BASE,
} from "@/lib/harmfulContentDetector/api";
import type { AlertSummary, Severity } from "@/lib/harmfulContentDetector/types";
import {
  FetchResultStatusUI,
  type FetchResultStatus,
} from "./FetchResultStatus";

const WS_BASE = (() => {
  const base = process.env.NEXT_PUBLIC_HCD_WS_BASE_URL ?? "";
  if (base.startsWith("ws://") || base.startsWith("wss://")) return base;
  const api = HCD_API_BASE.startsWith("https")
    ? HCD_API_BASE.replace(/^https/, "wss")
    : HCD_API_BASE.replace(/^http/, "ws");
  return api || "ws://localhost:8000";
})();

const CATEGORY_PRESETS: Array<{
  id: string;
  label: string;
  patterns: RegExp[];
}> = [
  { id: "all", label: "All", patterns: [] },
  { id: "harassment", label: "Harassment", patterns: [/harassment/i] },
  { id: "hate-speech", label: "Hate Speech", patterns: [/hate/i, /speech/i] },
  { id: "child-abuse", label: "Child Abuse", patterns: [/child/i, /abuse/i] },
  { id: "elder-abuse", label: "Elder Abuse", patterns: [/elder/i, /abuse/i] },
  {
    id: "violent-act",
    label: "Violent Act",
    patterns: [/violence/i, /violent/i, /act/i],
  },
  {
    id: "murder-threat",
    label: "Murder Threat",
    patterns: [/murder/i, /kill/i, /homicide/i, /threat/i],
  },
];

function parseApiDate(value: string): Date {
  if (!value) return new Date(0);
  const hasTimezone = /[zZ]|[+-]\d{2}:\d{2}$/.test(value);
  return new Date(hasTimezone ? value : `${value}Z`);
}

const BASE = "/dashboard/social-media";

export default function AlertsDashboard() {
  const [alerts, setAlerts] = useState<AlertSummary[]>([]);
  const [q, setQ] = useState("");
  const [severity, setSeverity] = useState<Severity | "">("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [actionMsg, setActionMsg] = useState("");
  const [busyAlertId, setBusyAlertId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [fetchingPosts, setFetchingPosts] = useState(false);
  const [fetchResult, setFetchResult] = useState<FetchResultStatus | null>(
    null
  );

  async function loadAlerts() {
    setLoading(true);
    setError("");
    try {
      const data = await fetchAlerts("new");
      setAlerts(data);
    } catch (err) {
      const isConnectionRefused =
        err instanceof Error &&
        (err.message.includes("Failed to fetch") ||
          err.message.includes("fetch") ||
          err.message.includes("Connection refused") ||
          err.message.includes("ERR_CONNECTION_REFUSED"));
      const msg = isConnectionRefused
        ? "Backend API (port 8000) is not running. In a terminal run: npm run dev:backend"
        : "Failed to load alerts.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAlerts();
  }, []);

  function toPlatformResult(
    settled: PromiseSettledResult<{
      ok: boolean;
      ingested?: number;
      error?: string;
    }>
  ): FetchResultStatus["youtube"] {
    if (settled.status === "rejected")
      return { ok: false, error: String(settled.reason) };
    const v = settled.value;
    if (v.ok) return { ok: true, ingested: v.ingested ?? 0 };
    return { ok: false, error: v.error ?? "Failed" };
  }

  async function fetchPostsNow() {
    setFetchingPosts(true);
    setFetchResult(null);
    const [yt, tw, fb] = await Promise.allSettled([
      ingestYouTubePoll(),
      ingestTwitterPoll(),
      ingestFacebookPoll(),
    ]);
    setFetchResult({
      youtube: toPlatformResult(yt),
      twitter: toPlatformResult(tw),
      facebook: toPlatformResult(fb),
    });
    setFetchingPosts(false);
  }

  // Real-time alerts over WebSocket. If the backend (port 8000) is not running,
  // the browser will log "WebSocket connection to 'ws://localhost:8000/ws/alerts' failed" – start it with: npm run dev:backend
  useEffect(() => {
    let ws: WebSocket | null = null;
    let cancelled = false;
    let retryCount = 0;
    const maxRetries = 10;
    const retryDelayMs = 5000;

    const url = `${WS_BASE.replace(/\/$/, "")}/ws/alerts`;

    function connect() {
      if (cancelled || retryCount > maxRetries) return;
      try {
        ws = new WebSocket(url);
        ws.onmessage = (event) => {
          const incoming = JSON.parse(event.data as string) as AlertSummary;
          if (String(incoming.status).toLowerCase() !== "new") return;
          setAlerts((prev) => [
            incoming,
            ...prev.filter((p) => p.id !== incoming.id),
          ]);
        };
        ws.onopen = () => {
          retryCount = 0;
          ws?.send("subscribed");
        };
        ws.onerror = () => {};
        ws.onclose = () => {
          ws = null;
          if (!cancelled && retryCount < maxRetries) {
            retryCount += 1;
            setTimeout(connect, retryDelayMs);
          }
        };
      } catch {
        if (!cancelled && retryCount < maxRetries) {
          retryCount += 1;
          setTimeout(connect, retryDelayMs);
        }
      }
    }

    const timer = window.setTimeout(connect, 0);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      if (
        ws != null &&
        (ws.readyState === WebSocket.CONNECTING || ws.readyState === WebSocket.OPEN)
      ) {
        ws.close();
      }
    };
  }, []);

  function shortCategoryLabel(category: string): string {
    return category
      .replaceAll("_", " ")
      .split(" ")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  }

  function contentSnippet(alert: AlertSummary): string {
    const label = shortCategoryLabel(alert.category);
    return `Detected ${label.toLowerCase()} content`;
  }

  function scorePercent(alert: AlertSummary): number {
    return Math.max(1, Math.min(99, Math.round(alert.fusion_score)));
  }

  function timeAgo(value: string): string {
    const deltaSec = Math.max(
      0,
      Math.floor((Date.now() - parseApiDate(value).getTime()) / 1000)
    );
    if (deltaSec < 60) return `${deltaSec}s ago`;
    const mins = Math.floor(deltaSec / 60);
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  }

  function isRecentAlert(value: string, maxAgeHours = 24): boolean {
    const ageMs = Date.now() - parseApiDate(value).getTime();
    return ageMs >= 0 && ageMs <= maxAgeHours * 60 * 60 * 1000;
  }

  function statusTagClass(status: string): string {
    const normalized = status.toLowerCase();
    if (normalized.includes("resolved")) return "hcd-tag hcd-tag-resolved";
    if (normalized.includes("investigating"))
      return "hcd-tag hcd-tag-investigating";
    return "hcd-tag hcd-tag-open";
  }

  async function reportToAuthorize(alert: AlertSummary) {
    setActionMsg("");
    setBusyAlertId(alert.id);
    try {
      await patchAlert(alert.id, { status: "investigating" });
      setAlerts((prev) => prev.filter((item) => item.id !== alert.id));
      setActionMsg(`Alert #${alert.id} marked for authority review.`);
    } catch {
      setActionMsg(`Failed to report alert #${alert.id}.`);
    } finally {
      setBusyAlertId(null);
    }
  }

  const filtered = useMemo(() => {
    const selected =
      CATEGORY_PRESETS.find((item) => item.id === selectedCategory) ??
      CATEGORY_PRESETS[0];
    return alerts.filter((a) => {
      const qMatch = q
        ? JSON.stringify(a).toLowerCase().includes(q.toLowerCase())
        : true;
      const sMatch = severity ? a.severity === severity : true;
      const normalizedCategory = a.category.replaceAll("_", " ");
      const cMatch =
        selected.id === "all"
          ? true
          : selected.patterns.some(
              (pattern) =>
                pattern.test(a.category) || pattern.test(normalizedCategory)
            );
      return qMatch && sMatch && cMatch;
    });
  }, [alerts, q, severity, selectedCategory]);

  const criticalAlerts = useMemo(
    () =>
      filtered.filter(
        (a) => a.severity === "CRITICAL" || a.severity === "HIGH"
      ),
    [filtered]
  );
  const feedAlerts = useMemo(
    () =>
      filtered.filter(
        (a) => a.severity !== "CRITICAL" && a.severity !== "HIGH"
      ),
    [filtered]
  );

  const scannedToday = alerts.length;
  const flaggedHarmful = alerts.filter(
    (a) => a.severity === "CRITICAL" || a.severity === "HIGH"
  ).length;
  const reportedCases = alerts.filter(
    (a) => a.status.toLowerCase() !== "new"
  ).length;
  const avgResponse = alerts.length
    ? `${(
        alerts.reduce((sum, a) => sum + a.fusion_score, 0) / alerts.length
      ).toFixed(1)}`
    : "0.0";

  return (
    <div className="hcd-dashboard-layout">
      <div className="hcd-stats-grid">
        <div className="hcd-metric-card">
          <div className="hcd-metric-label">Scanned Today</div>
          <div className="hcd-metric-value">{scannedToday.toLocaleString()}</div>
        </div>
        <div className="hcd-metric-card">
          <div className="hcd-metric-label">Flagged Harmful</div>
          <div className="hcd-metric-value">
            {flaggedHarmful.toLocaleString()}
          </div>
        </div>
        <div className="hcd-metric-card">
          <div className="hcd-metric-label">Reported Cases</div>
          <div className="hcd-metric-value">
            {reportedCases.toLocaleString()}
          </div>
        </div>
        <div className="hcd-metric-card">
          <div className="hcd-metric-label">Avg Response Time</div>
          <div className="hcd-metric-value">{avgResponse}m</div>
        </div>
      </div>

      <div>
        <div className="hcd-section-title">Categories</div>
        <div className="hcd-category-tabs">
          {CATEGORY_PRESETS.map((category) => (
            <button
              key={category.id}
              className={`hcd-category-btn${
                selectedCategory === category.id ? " active" : ""
              }`}
              onClick={() => setSelectedCategory(category.id)}
            >
              {category.label}
            </button>
          ))}
        </div>
      </div>

      <div
        className="hcd-row"
        style={{ flexWrap: "wrap", alignItems: "center", gap: "0.5rem" }}
      >
        <input
          placeholder="Search alerts..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <select
          value={severity}
          onChange={(e) => setSeverity(e.target.value as Severity | "")}
        >
          <option value="">All severities</option>
          <option value="LOW">LOW</option>
          <option value="MED">MED</option>
          <option value="HIGH">HIGH</option>
          <option value="CRITICAL">CRITICAL</option>
        </select>
        <button
          type="button"
          className="hcd-btn-secondary"
          onClick={loadAlerts}
          disabled={loading}
          title="Reload the alerts list"
        >
          {loading ? "Loading…" : "Refresh alerts"}
        </button>
        <button
          type="button"
          onClick={() => fetchPostsNow()}
          disabled={fetchingPosts}
          title="Pull new posts from YouTube, Twitter and Facebook"
          style={{
            padding: "0.4rem 0.75rem",
            background: "#eff6ff",
            color: "#1d4ed8",
            border: "1px solid #bfdbfe",
            borderRadius: "6px",
            cursor: fetchingPosts ? "not-allowed" : "pointer",
            fontWeight: 500,
          }}
        >
          {fetchingPosts ? "Fetching…" : "Fetch new posts"}
        </button>
        {fetchResult != null && <FetchResultStatusUI result={fetchResult} />}
      </div>

      {error && <div className="hcd-status-bad">{error}</div>}
      {actionMsg && <div className="hcd-status-ok">{actionMsg}</div>}

      <div className="hcd-feed-grid">
        <div>
          <h3 className="hcd-section-title">Critical Alerts</h3>
          <div className="hcd-feed-list">
            {(loading ? [] : criticalAlerts).map((alert) => (
              <div key={alert.id} className="hcd-feed-card critical">
                <div className="hcd-feed-head">
                  <span
                    className={`hcd-tag ${
                      alert.severity === "CRITICAL"
                        ? "hcd-tag-critical"
                        : "hcd-tag-high"
                    }`}
                  >
                    {alert.severity}
                  </span>
                  <span className="hcd-muted">{timeAgo(alert.created_at)}</span>
                </div>
                <div className="hcd-feed-title">{contentSnippet(alert)}</div>
                <div className="hcd-feed-sub">
                  {shortCategoryLabel(alert.category)} {scorePercent(alert)}%
                </div>
                <div className="hcd-feed-actions">
                  <Link
                    className="hcd-action-btn view"
                    href={`${BASE}/alerts/${alert.id}`}
                  >
                    View
                  </Link>
                  <button
                    className="hcd-action-btn report"
                    disabled={busyAlertId === alert.id}
                    onClick={() => reportToAuthorize(alert)}
                  >
                    {busyAlertId === alert.id
                      ? "Reporting..."
                      : "Report to Authorize"}
                  </button>
                </div>
              </div>
            ))}
            {!loading && criticalAlerts.length === 0 && (
              <div className="hcd-empty-state">No critical alerts.</div>
            )}
          </div>
        </div>

        <div>
          <h3 className="hcd-section-title">Content Feed</h3>
          <div className="hcd-feed-list">
            {(loading ? [] : feedAlerts).map((alert) => (
              <div key={alert.id} className="hcd-feed-card">
                <div className="hcd-feed-head">
                  {isRecentAlert(alert.created_at) ? (
                    <span className="hcd-tag hcd-tag-new">NEW</span>
                  ) : (
                    <span className={statusTagClass(String(alert.status || "OPEN"))}>
                      {String(alert.status || "OPEN").toUpperCase()}
                    </span>
                  )}
                  <span className="hcd-muted">{timeAgo(alert.created_at)}</span>
                </div>
                <div className="hcd-feed-title">{contentSnippet(alert)}</div>
                <div className="hcd-feed-sub">
                  {shortCategoryLabel(alert.category)} {scorePercent(alert)}%
                </div>
                <div className="hcd-feed-actions">
                  <Link
                    className="hcd-action-btn view"
                    href={`${BASE}/alerts/${alert.id}`}
                  >
                    View
                  </Link>
                  <button
                    className="hcd-action-btn report"
                    disabled={busyAlertId === alert.id}
                    onClick={() => reportToAuthorize(alert)}
                  >
                    {busyAlertId === alert.id
                      ? "Reporting..."
                      : "Report to Authorize"}
                  </button>
                </div>
              </div>
            ))}
            {!loading && feedAlerts.length === 0 && (
              <div className="hcd-empty-state">No feed items.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
