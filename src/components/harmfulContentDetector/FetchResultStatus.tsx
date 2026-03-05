"use client";

export type PlatformResult =
  | { ok: true; ingested: number }
  | { ok: false; error: string };

export type FetchResultStatus = {
  youtube: PlatformResult;
  twitter: PlatformResult;
  facebook: PlatformResult;
};

function friendlyError(msg: string): string {
  const lower = msg.toLowerCase();
  if (lower.includes("quota") || lower.includes("exceeded"))
    return "Quota exceeded";
  if (
    lower.includes("not configured") ||
    lower.includes("not be configured") ||
    lower.includes("apify_token")
  )
    return "Not configured";
  if (lower.includes("failed") || lower.includes("error"))
    return msg.length > 50 ? msg.slice(0, 47) + "…" : msg;
  return msg.length > 40 ? msg.slice(0, 37) + "…" : msg;
}

const PLATFORM_LABELS: Record<keyof FetchResultStatus, string> = {
  youtube: "YouTube",
  twitter: "Twitter",
  facebook: "Facebook",
};

interface FetchResultStatusProps {
  result: FetchResultStatus;
}

export function FetchResultStatusUI({ result }: FetchResultStatusProps) {
  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        gap: "0.5rem",
        alignItems: "stretch",
        marginLeft: "0.5rem",
      }}
      aria-label="Fetch results by platform"
    >
      {(Object.keys(result) as (keyof FetchResultStatus)[]).map((key) => {
        const r = result[key];
        const label = PLATFORM_LABELS[key];
        const isOk = r.ok;
        const statusText = isOk
          ? r.ingested === 0
            ? "No new posts"
            : `${r.ingested} new post${r.ingested === 1 ? "" : "s"}`
          : friendlyError(r.error);
        const title = !isOk ? r.error : undefined;
        return (
          <div
            key={key}
            title={title}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.35rem",
              padding: "0.35rem 0.6rem",
              background: isOk
                ? r.ingested > 0
                  ? "#f0fdf4"
                  : "#f8fafc"
                : "#fef2f2",
              border: `1px solid ${
                isOk
                  ? r.ingested > 0
                    ? "#bbf7d0"
                    : "#e2e8f0"
                  : "#fecaca"
              }`,
              borderRadius: "8px",
              fontSize: "0.8125rem",
              color: isOk
                ? r.ingested > 0
                  ? "#166534"
                  : "#64748b"
                : "#b91c1c",
              fontWeight: 500,
            }}
          >
            <span style={{ color: "#64748b", fontWeight: 600 }}>{label}:</span>
            <span>{statusText}</span>
          </div>
        );
      })}
    </div>
  );
}
