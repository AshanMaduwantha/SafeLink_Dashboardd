import type {
  AlertDetail,
  AlertSummary,
  DebugModelCheckRequest,
  PostSummary,
  User,
} from "./types";

export const HCD_API_BASE =
  process.env.NEXT_PUBLIC_HCD_API_BASE_URL ?? "http://localhost:8000";

function authHeaders(): Record<string, string> {
  return {};
}

export async function fetchAlerts(
  status?: "new" | "investigating" | "resolved"
): Promise<AlertSummary[]> {
  const query = status ? `?status=${encodeURIComponent(status)}` : "";
  const res = await fetch(`${HCD_API_BASE}/alerts${query}`, {
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error("Failed to load alerts");
  return (await res.json()) as AlertSummary[];
}

export async function fetchAlert(id: number): Promise<AlertDetail> {
  const res = await fetch(`${HCD_API_BASE}/alerts/${id}`, {
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error("Failed to load alert");
  return (await res.json()) as AlertDetail;
}

export async function patchAlert(
  id: number,
  payload: { status?: string; assigned_to?: number }
) {
  const res = await fetch(`${HCD_API_BASE}/alerts/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error("Failed to update alert");
  return res.json();
}

export async function deleteResolvedAlerts(): Promise<{ deleted: number }> {
  const res = await fetch(`${HCD_API_BASE}/alerts?status=resolved`, {
    method: "DELETE",
    headers: authHeaders(),
  });
  const text = await res.text();
  if (!res.ok) {
    let msg = "Failed to delete resolved cases";
    try {
      const body = text ? JSON.parse(text) : null;
      if (body?.detail)
        msg = typeof body.detail === "string" ? body.detail : msg;
    } catch {
      if (text) msg = text.slice(0, 150);
    }
    throw new Error(msg);
  }
  return (text ? JSON.parse(text) : { deleted: 0 }) as { deleted: number };
}

export async function sendFeedback(
  id: number,
  payload: {
    decision: "approve" | "reject";
    corrected_category?: string;
    notes?: string;
  }
) {
  const res = await fetch(`${HCD_API_BASE}/alerts/${id}/feedback`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error("Failed to submit feedback");
  return res.json();
}

export async function listUsers(): Promise<User[]> {
  const res = await fetch(`${HCD_API_BASE}/users`, { headers: authHeaders() });
  if (!res.ok) throw new Error("Failed to load users");
  return (await res.json()) as User[];
}

export interface IngestPollResult {
  ok: boolean;
  ingested?: number;
  error?: string;
}

export async function ingestYouTubePoll(): Promise<IngestPollResult> {
  const res = await fetch(`${HCD_API_BASE}/ingest/youtube/poll`, {
    method: "POST",
    headers: authHeaders(),
  });
  const data = (await res
    .json()
    .catch(() => ({}))) as IngestPollResult & { detail?: string };
  if (!res.ok) {
    return {
      ok: false,
      error:
        typeof data.detail === "string" ? data.detail : "YouTube ingest failed",
    };
  }
  return { ok: true, ingested: (data as { ingested?: number }).ingested ?? 0 };
}

export async function ingestFacebookPoll(): Promise<IngestPollResult> {
  const res = await fetch(`${HCD_API_BASE}/ingest/facebook/poll`, {
    method: "POST",
    headers: authHeaders(),
  });
  const data = (await res
    .json()
    .catch(() => ({}))) as IngestPollResult & { detail?: string };
  if (!res.ok) {
    return {
      ok: false,
      error:
        typeof data.detail === "string"
          ? data.detail
          : "Facebook ingest failed",
    };
  }
  return { ok: true, ingested: (data as { ingested?: number }).ingested ?? 0 };
}

export async function ingestTwitterPoll(): Promise<IngestPollResult> {
  const res = await fetch(`${HCD_API_BASE}/ingest/twitter/poll`, {
    method: "POST",
    headers: authHeaders(),
  });
  const data = (await res
    .json()
    .catch(() => ({}))) as IngestPollResult & { detail?: string };
  if (!res.ok) {
    return {
      ok: false,
      error:
        typeof data.detail === "string" ? data.detail : "Twitter ingest failed",
    };
  }
  return { ok: true, ingested: (data as { ingested?: number }).ingested ?? 0 };
}

export async function fetchPosts(
  platform?: string,
  limit?: number
): Promise<PostSummary[]> {
  const params = new URLSearchParams();
  if (platform) params.set("platform", platform);
  if (limit != null) params.set("limit", String(limit));
  const q = params.toString() ? `?${params.toString()}` : "";
  const res = await fetch(`${HCD_API_BASE}/ingest/posts${q}`, {
    headers: authHeaders(),
  });
  const bodyText = await res.text();
  if (!res.ok) {
    let msg = "Failed to load posts";
    try {
      const body = bodyText ? JSON.parse(bodyText) : null;
      if (body?.detail)
        msg =
          typeof body.detail === "string"
            ? body.detail
            : JSON.stringify(body.detail);
    } catch {
      if (bodyText) msg = bodyText.slice(0, 200);
    }
    throw new Error(msg);
  }
  return (bodyText ? JSON.parse(bodyText) : []) as PostSummary[];
}

export interface PostAnalysisResponse {
  post_id: number;
  platform: string;
  has_analysis: boolean;
  has_alert?: boolean;
  alert_threshold?: number;
  fusion_score?: number;
  severity?: string;
  category?: string;
  why_no_alert?: string | null;
}

export async function fetchPostAnalysis(
  postId: number
): Promise<PostAnalysisResponse> {
  const res = await fetch(`${HCD_API_BASE}/ingest/posts/${postId}/analysis`, {
    headers: authHeaders(),
  });
  const text = await res.text();
  if (!res.ok) {
    try {
      const body = text ? JSON.parse(text) : null;
      const detail =
        body?.detail ?? text?.slice(0, 150) ?? "Failed to load analysis";
      throw new Error(typeof detail === "string" ? detail : JSON.stringify(detail));
    } catch (e) {
      if (e instanceof Error) throw e;
      throw new Error(text || "Failed to load analysis");
    }
  }
  return (text ? JSON.parse(text) : {}) as PostAnalysisResponse;
}

export async function deletePost(postId: number): Promise<void> {
  const res = await fetch(`${HCD_API_BASE}/ingest/posts/${postId}`, {
    method: "DELETE",
    headers: authHeaders(),
  });
  if (!res.ok) {
    const text = await res.text();
    let msg = "Failed to delete post";
    try {
      const body = text ? JSON.parse(text) : null;
      if (body?.detail)
        msg = typeof body.detail === "string" ? body.detail : msg;
    } catch {
      if (text) msg = text.slice(0, 150);
    }
    throw new Error(msg);
  }
}

export async function deleteAllPosts(
  platform?: string
): Promise<{ deleted: number }> {
  const q = platform ? `?platform=${encodeURIComponent(platform)}` : "";
  const res = await fetch(`${HCD_API_BASE}/ingest/posts${q}`, {
    method: "DELETE",
    headers: authHeaders(),
  });
  const text = await res.text();
  if (!res.ok) {
    let msg = "Failed to delete posts";
    try {
      const body = text ? JSON.parse(text) : null;
      if (body?.detail)
        msg = typeof body.detail === "string" ? body.detail : msg;
    } catch {
      if (text) msg = text.slice(0, 150);
    }
    throw new Error(msg);
  }
  return (text ? JSON.parse(text) : { deleted: 0 }) as { deleted: number };
}

export async function debugModelCheck(
  payload: DebugModelCheckRequest
): Promise<Record<string, unknown>> {
  const res = await fetch(`${HCD_API_BASE}/debug/model-check`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const msg = await res.text();
    throw new Error(`Debug model check failed: ${msg}`);
  }
  return (await res.json()) as Record<string, unknown>;
}
