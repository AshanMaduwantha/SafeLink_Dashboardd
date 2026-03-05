"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  deletePost,
  deleteResolvedAlerts,
  fetchAlerts,
} from "@/lib/harmfulContentDetector/api";
import type { AlertSummary } from "@/lib/harmfulContentDetector/types";

function parseApiDate(value: string): Date {
  if (!value) return new Date(0);
  const hasTimezone = /[zZ]|[+-]\d{2}:\d{2}$/.test(value);
  return new Date(hasTimezone ? value : `${value}Z`);
}

const BASE = "/dashboard/social-media";

export default function ResolvedCases() {
  const [alerts, setAlerts] = useState<AlertSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [deletingPostId, setDeletingPostId] = useState<number | null>(null);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const data = await fetchAlerts("resolved");
      setAlerts(data);
    } catch {
      setError("Failed to load resolved cases.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function confirmDeleteResolved() {
    setDeleting(true);
    setError("");
    setSuccessMsg("");
    try {
      const result = await deleteResolvedAlerts();
      setShowDeleteConfirm(false);
      setAlerts([]);
      if (result.deleted > 0)
        setSuccessMsg(`Deleted ${result.deleted} resolved case(s).`);
      await load();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to delete resolved cases."
      );
    } finally {
      setDeleting(false);
    }
  }

  async function deleteOnePost(postId: number) {
    setDeletingPostId(postId);
    setError("");
    try {
      await deletePost(postId);
      setAlerts((prev) => prev.filter((a) => a.post_id !== postId));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete post.");
    } finally {
      setDeletingPostId(null);
    }
  }

  return (
    <div className="hcd-dashboard-layout">
      <h2 className="hcd-section-title">Resolved Cases</h2>
      <div
        className="hcd-row"
        style={{ flexWrap: "wrap", alignItems: "center", gap: "0.5rem" }}
      >
        <button
          type="button"
          className="hcd-btn-secondary"
          onClick={load}
          disabled={loading}
        >
          {loading ? "Loading…" : "Refresh"}
        </button>
        <button
          type="button"
          onClick={() => setShowDeleteConfirm(true)}
          disabled={loading || alerts.length === 0}
          title="Delete all resolved cases and their posts"
          style={{
            padding: "0.4rem 0.75rem",
            background: "#fef2f2",
            color: "#b91c1c",
            border: "1px solid #fecaca",
            borderRadius: "6px",
            cursor: loading || alerts.length === 0 ? "not-allowed" : "pointer",
            fontWeight: 500,
          }}
        >
          Delete resolved
        </button>
      </div>
      {showDeleteConfirm && (
        <div className="hcd-card" style={{ marginTop: "0.75rem", maxWidth: "28rem" }}>
          <p style={{ margin: "0 0 0.75rem" }}>
            Delete all {alerts.length} resolved case(s)? This also removes the
            underlying posts. This cannot be undone.
          </p>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button
              type="button"
              className="hcd-btn-secondary"
              onClick={() => setShowDeleteConfirm(false)}
              disabled={deleting}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={confirmDeleteResolved}
              disabled={deleting}
              style={{
                padding: "0.4rem 0.75rem",
                background: "#b91c1c",
                color: "#fff",
                border: "none",
                borderRadius: "6px",
                cursor: deleting ? "not-allowed" : "pointer",
              }}
            >
              {deleting ? "Deleting…" : "Delete all"}
            </button>
          </div>
        </div>
      )}
      {error && <div className="hcd-status-bad">{error}</div>}
      {successMsg && <div className="hcd-status-ok">{successMsg}</div>}
      <div className="hcd-feed-list">
        {loading ? (
          <div className="hcd-empty-state">Loading resolved cases...</div>
        ) : alerts.length === 0 ? (
          <div className="hcd-empty-state">No resolved cases.</div>
        ) : (
          alerts.map((alert) => (
            <div key={alert.id} className="hcd-feed-card">
              <div className="hcd-feed-head">
                <span className="hcd-tag hcd-tag-resolved">RESOLVED</span>
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
                  type="button"
                  onClick={() => deleteOnePost(alert.post_id)}
                  disabled={deletingPostId === alert.post_id}
                  title="Delete this resolved case and its post"
                  style={{
                    padding: "0.25rem 0.5rem",
                    background: "#fef2f2",
                    color: "#b91c1c",
                    border: "1px solid #fecaca",
                    borderRadius: "4px",
                    cursor:
                      deletingPostId === alert.post_id
                        ? "not-allowed"
                        : "pointer",
                    fontSize: "0.875rem",
                  }}
                >
                  {deletingPostId === alert.post_id ? "Deleting…" : "Delete"}
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
