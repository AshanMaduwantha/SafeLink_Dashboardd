"use client";

import { useEffect, useState } from "react";
import {
  deleteAllPosts as apiDeleteAllPosts,
  deletePost as apiDeletePost,
  fetchPosts,
  ingestFacebookPoll,
  ingestTwitterPoll,
  ingestYouTubePoll,
} from "@/lib/harmfulContentDetector/api";
import type { PostSummary } from "@/lib/harmfulContentDetector/types";
import {
  FetchResultStatusUI,
  type FetchResultStatus,
} from "./FetchResultStatus";

const PLATFORMS = ["all", "youtube", "twitter", "facebook", "demo"] as const;

function formatDate(value: string | null): string {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleString();
  } catch {
    return value;
  }
}

export default function PostsBrowser() {
  const [posts, setPosts] = useState<PostSummary[]>([]);
  const [platform, setPlatform] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [postToDelete, setPostToDelete] = useState<PostSummary | null>(null);
  const [showDeleteAllConfirm, setShowDeleteAllConfirm] = useState(false);
  const [deletingAll, setDeletingAll] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [fetchingPosts, setFetchingPosts] = useState(false);
  const [fetchResult, setFetchResult] = useState<FetchResultStatus | null>(
    null
  );

  async function load() {
    setLoading(true);
    setError("");
    setSuccessMsg("");
    try {
      const data = await fetchPosts(
        platform === "all" ? undefined : platform,
        80
      );
      setPosts(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load posts.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [platform]);

  function openDeleteConfirm(p: PostSummary) {
    setError("");
    setPostToDelete(p);
  }

  function closeDeleteConfirm() {
    if (!deletingId) setPostToDelete(null);
  }

  async function confirmDelete() {
    if (!postToDelete) return;
    setDeletingId(postToDelete.id);
    setError("");
    try {
      await apiDeletePost(postToDelete.id);
      setPosts((prev) => prev.filter((x) => x.id !== postToDelete.id));
      setPostToDelete(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete post.");
    } finally {
      setDeletingId(null);
    }
  }

  async function confirmDeleteAll() {
    setDeletingAll(true);
    setError("");
    try {
      const result = await apiDeleteAllPosts(
        platform === "all" ? undefined : platform
      );
      setPosts([]);
      setShowDeleteAllConfirm(false);
      if (result.deleted > 0)
        setSuccessMsg(`Removed ${result.deleted} post(s) from the database.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete posts.");
    } finally {
      setDeletingAll(false);
    }
  }

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
    setError("");
    setSuccessMsg("");
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
    await load();
    setFetchingPosts(false);
  }

  return (
    <div className="hcd-row" style={{ flexDirection: "column" }}>
      <h2>Recent posts</h2>
      <div className="hcd-card" style={{ marginBottom: "1rem" }}>
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            gap: "0.75rem",
          }}
        >
          <label style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <span style={{ fontWeight: 500, color: "#374151" }}>Platform</span>
            <select
              value={platform}
              onChange={(e) => setPlatform(e.target.value)}
              style={{
                padding: "0.4rem 0.6rem",
                borderRadius: "6px",
                border: "1px solid #e5e7eb",
                minWidth: "6rem",
              }}
            >
              {PLATFORMS.map((p) => (
                <option key={p} value={p}>
                  {p === "all" ? "All" : p.charAt(0).toUpperCase() + p.slice(1)}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            onClick={() => load()}
            disabled={loading}
            style={{
              padding: "0.4rem 0.75rem",
              borderRadius: "6px",
              border: "1px solid #d1d5db",
              background: "#f9fafb",
              color: "#374151",
              cursor: loading ? "not-allowed" : "pointer",
              fontWeight: 500,
            }}
          >
            {loading ? "Loading…" : "Refresh"}
          </button>
          <button
            type="button"
            onClick={() => fetchPostsNow()}
            disabled={fetchingPosts || loading}
            style={{
              padding: "0.4rem 0.75rem",
              background: "#eff6ff",
              color: "#1d4ed8",
              border: "1px solid #bfdbfe",
              borderRadius: "6px",
              cursor: fetchingPosts || loading ? "not-allowed" : "pointer",
              fontWeight: 500,
            }}
          >
            {fetchingPosts ? "Fetching…" : "Fetch posts now"}
          </button>
          <button
            type="button"
            onClick={() => setShowDeleteAllConfirm(true)}
            disabled={loading || posts.length === 0}
            style={{
              padding: "0.4rem 0.75rem",
              background: "#fef2f2",
              color: "#b91c1c",
              border: "1px solid #fecaca",
              borderRadius: "6px",
              cursor: posts.length === 0 ? "not-allowed" : "pointer",
              fontWeight: 500,
            }}
          >
            Delete all posts{platform !== "all" ? ` (${platform})` : ""}
          </button>
        </div>
        {fetchResult != null && (
          <div
            style={{
              marginTop: "0.75rem",
              paddingTop: "0.75rem",
              borderTop: "1px solid #e5e7eb",
            }}
          >
            <FetchResultStatusUI result={fetchResult} />
          </div>
        )}
      </div>
      {error && <div style={{ color: "#b91c1c" }}>{error}</div>}
      {successMsg && <div style={{ color: "#15803d" }}>{successMsg}</div>}
      {loading && posts.length === 0 ? (
        <div className="hcd-card">Loading posts…</div>
      ) : posts.length === 0 ? (
        <div className="hcd-card">
          No posts found. Use <strong>Fetch posts now</strong> above to pull
          from YouTube, Twitter, and Facebook.
        </div>
      ) : (
        <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
          {posts.map((p) => (
            <li key={p.id} className="hcd-card" style={{ marginBottom: "0.75rem" }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  gap: "1rem",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                    flexWrap: "wrap",
                  }}
                >
                  <span
                    style={{
                      background: "#e5e7eb",
                      color: "#374151",
                      padding: "0.2rem 0.5rem",
                      borderRadius: "4px",
                      fontSize: "0.85rem",
                    }}
                  >
                    {p.platform}
                  </span>
                  <span style={{ fontSize: "0.85rem", color: "#6b7280" }}>
                    {formatDate(p.created_at)}
                  </span>
                </div>
                <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                  <button
                    type="button"
                    onClick={() => openDeleteConfirm(p)}
                    disabled={deletingId === p.id}
                    style={{
                      padding: "0.25rem 0.5rem",
                      fontSize: "0.8rem",
                      background: "#fef2f2",
                      color: "#b91c1c",
                      border: "1px solid #fecaca",
                      borderRadius: "4px",
                      cursor: deletingId === p.id ? "not-allowed" : "pointer",
                    }}
                  >
                    {deletingId === p.id ? "Removing…" : "Remove"}
                  </button>
                </div>
              </div>
              <div style={{ marginTop: "0.5rem" }}>
                <strong>{p.author || "Unknown"}</strong>
              </div>
              <div
                style={{
                  marginTop: "0.25rem",
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word",
                }}
              >
                {p.text || "(no text)"}
              </div>
              {p.url && (
                <a
                  href={p.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ marginTop: "0.5rem", display: "inline-block" }}
                >
                  Open post →
                </a>
              )}
            </li>
          ))}
        </ul>
      )}

      {postToDelete && (
        <>
          <div
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0,0,0,0.45)",
              zIndex: 999,
            }}
            onClick={closeDeleteConfirm}
            aria-hidden="true"
          />
          <div
            className="hcd-card"
            style={{
              position: "fixed",
              left: "50%",
              top: "50%",
              transform: "translate(-50%, -50%)",
              maxWidth: "420px",
              width: "90%",
              zIndex: 1000,
              padding: "1.5rem",
              boxShadow: "0 20px 40px rgba(0,0,0,0.2)",
            }}
            role="dialog"
            aria-labelledby="delete-dialog-title"
            aria-modal="true"
          >
            <h3
              id="delete-dialog-title"
              style={{ marginTop: 0, marginBottom: "0.5rem" }}
            >
              Remove this post?
            </h3>
            <p style={{ color: "#6b7280", marginBottom: "1.25rem" }}>
              The post from <strong>{postToDelete.platform}</strong> by{" "}
              <strong>{postToDelete.author || "Unknown"}</strong> will be
              removed from the list. This cannot be undone.
            </p>
            <div
              style={{
                display: "flex",
                gap: "0.75rem",
                justifyContent: "flex-end",
              }}
            >
              <button
                type="button"
                className="hcd-btn-secondary"
                onClick={closeDeleteConfirm}
                disabled={deletingId === postToDelete.id}
              >
                Cancel
              </button>
              <button
                type="button"
                style={{
                  padding: "0.4rem 1rem",
                  background: "#b91c1c",
                  color: "#fff",
                  border: "none",
                  borderRadius: "6px",
                  cursor:
                    deletingId === postToDelete.id ? "not-allowed" : "pointer",
                }}
                onClick={confirmDelete}
                disabled={deletingId === postToDelete.id}
              >
                {deletingId === postToDelete.id
                  ? "Removing…"
                  : "Yes, remove post"}
              </button>
            </div>
          </div>
        </>
      )}

      {showDeleteAllConfirm && (
        <>
          <div
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0,0,0,0.45)",
              zIndex: 999,
            }}
            onClick={() => !deletingAll && setShowDeleteAllConfirm(false)}
            aria-hidden="true"
          />
          <div
            className="hcd-card"
            style={{
              position: "fixed",
              left: "50%",
              top: "50%",
              transform: "translate(-50%, -50%)",
              maxWidth: "420px",
              width: "90%",
              zIndex: 1000,
              padding: "1.5rem",
              boxShadow: "0 20px 40px rgba(0,0,0,0.2)",
            }}
            role="dialog"
            aria-labelledby="delete-all-dialog-title"
            aria-modal="true"
          >
            <h3
              id="delete-all-dialog-title"
              style={{ marginTop: 0, marginBottom: "0.5rem" }}
            >
              Delete all posts?
            </h3>
            <p style={{ color: "#6b7280", marginBottom: "1.25rem" }}>
              {platform === "all"
                ? "All posts in the database will be removed. Related alerts and media will also be deleted. This cannot be undone."
                : `All ${platform} posts will be removed. This cannot be undone.`}
            </p>
            <div
              style={{
                display: "flex",
                gap: "0.75rem",
                justifyContent: "flex-end",
              }}
            >
              <button
                type="button"
                className="hcd-btn-secondary"
                onClick={() => !deletingAll && setShowDeleteAllConfirm(false)}
                disabled={deletingAll}
              >
                Cancel
              </button>
              <button
                type="button"
                style={{
                  padding: "0.4rem 1rem",
                  background: "#b91c1c",
                  color: "#fff",
                  border: "none",
                  borderRadius: "6px",
                  cursor: deletingAll ? "not-allowed" : "pointer",
                }}
                onClick={confirmDeleteAll}
                disabled={deletingAll}
              >
                {deletingAll ? "Deleting…" : "Yes, delete all"}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
