"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  fetchAlerts,
  patchAlert,
} from "@/lib/harmfulContentDetector/api";
import type { AlertSummary } from "@/lib/harmfulContentDetector/types";

function parseApiDate(value: string): Date {
  if (!value) return new Date(0);
  const hasTimezone = /[zZ]|[+-]\d{2}:\d{2}$/.test(value);
  return new Date(hasTimezone ? value : `${value}Z`);
}

const BASE = "/dashboard/social-media";

export default function InvestigatingCases() {
  const [alerts, setAlerts] = useState<AlertSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState<number | null>(null);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const data = await fetchAlerts("investigating");
      setAlerts(data);
    } catch {
      setError("Failed to load investigation cases.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function markResolved(alertId: number) {
    setBusyId(alertId);
    try {
      await patchAlert(alertId, { status: "resolved" });
      setAlerts((prev) => prev.filter((a) => a.id !== alertId));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="hcd-dashboard-layout">
      <h2 className="hcd-section-title">Investigation Cases</h2>
      <div className="hcd-row">
        <button className="hcd-btn-secondary" onClick={load}>
          Refresh
        </button>
      </div>
      {error && <div className="hcd-status-bad">{error}</div>}
      <div className="hcd-feed-list">
        {loading ? (
          <div className="hcd-empty-state">
            Loading investigation cases...
          </div>
        ) : alerts.length === 0 ? (
          <div className="hcd-empty-state">No investigation cases.</div>
        ) : (
          alerts.map((alert) => (
            <div key={alert.id} className="hcd-feed-card">
              <div className="hcd-feed-head">
                <span className="hcd-tag hcd-tag-investigating">
                  INVESTIGATING
                </span>
                <span className="hcd-muted">
                  {parseApiDate(alert.created_at).toLocaleString()}
                </span>
              </div>
              <div className="hcd-feed-title">
                {alert.category.replaceAll("_", " ")}
              </div>
              <div className="hcd-feed-sub">
                Risk {alert.fusion_score.toFixed(2)} • Alert #{alert.id}
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
                  disabled={busyId === alert.id}
                  onClick={() => markResolved(alert.id)}
                >
                  {busyId === alert.id ? "Updating..." : "Mark Resolved"}
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
