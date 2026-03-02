"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { API_BASE_URL, REFRESH_INTERVAL_MS } from "@/config/config";

// ─── Types ────────────────────────────────────────────────────────────────────
interface Severity {
  level: string;
}
interface DetectionItem {
  class: string;
  confidence: number;
  timestamp_sec: number;
}
interface Detection {
  severity?: Severity;
  category?: string;
  classes?: string[];
  total_detections?: number;
  detected?: boolean;
  detections?: DetectionItem[];
}
interface Location {
  town?: string;
  district?: string;
  country?: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  maps_url?: string;
}
interface Incident {
  _id: string;
  report_id?: string;
  status: string;
  submitted_at: string;
  police_notified?: boolean;
  detection?: Detection;
  location?: Location;
  evidence_images?: string[];
  admin_notes?: string;
}
interface Stats {
  total: number;
  threats_detected: number;
  pending_review: number;
  critical: number;
  high: number;
  police_notified: number;
  category_breakdown?: { category: string; count: number }[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function sevColor(level = "NONE") {
  return (
    (
      {
        CRITICAL: "#ff2d2d",
        HIGH: "#ff7b00",
        MEDIUM: "#ffd600",
        LOW: "#00e676",
      } as Record<string, string>
    )[level] ?? "#5c6470"
  );
}
function formatDate(iso?: string) {
  if (!iso) return "—";
  try {
    return new Date(iso)
      .toLocaleString("en-GB", { hour12: false })
      .replace(",", "");
  } catch {
    return iso;
  }
}

// ─── Global CSS ───────────────────────────────────────────────────────────────
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Rajdhani:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;700&family=Inter:wght@300;400;500;600&display=swap');
.sr-root{--bg:#f4f6f9;--surface:#ffffff;--panel:#f9fafb;--border:#e2e6ea;--accent:#1d72f5;--accent2:#7c3aed;--red:#e53e3e;--orange:#dd6b20;--yellow:#d69e2e;--green:#276749;--green-bg:#c6f6d5;--text:#1a202c;--muted:#718096;--font-head:'Rajdhani',sans-serif;--font-mono:'JetBrains Mono',monospace;--font-body:'Inter',sans-serif;background:var(--bg);color:var(--text);font-family:var(--font-body);min-height:100vh;overflow-x:hidden;margin:-32px;padding:0;}
.sr-navbar{background:var(--surface);border-bottom:1px solid var(--border);padding:0 28px;height:60px;display:flex;align-items:center;justify-content:space-between;position:sticky;top:0;z-index:100;box-shadow:0 1px 4px rgba(0,0,0,.06);}
.sr-nav-logo{width:32px;height:32px;background:linear-gradient(135deg,var(--red),var(--orange));border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:16px;}
.sr-nav-title{font-family:var(--font-head);font-size:20px;font-weight:700;letter-spacing:2px;color:var(--text);}
.sr-nav-title span{color:var(--accent);}
.sr-nav-sub{font-family:var(--font-mono);font-size:10px;color:var(--muted);letter-spacing:2px;}
.sr-live-dot{width:8px;height:8px;border-radius:50%;animation:sr-pulse 1.4s ease-in-out infinite;}
.sr-nav-time{font-family:var(--font-mono);font-size:12px;color:var(--muted);letter-spacing:1px;}
.sr-layout{display:grid;grid-template-columns:260px 1fr;min-height:calc(100vh - 60px);}
.sr-sidebar{background:var(--surface);border-right:1px solid var(--border);padding:24px 16px;display:flex;flex-direction:column;gap:8px;}
.sr-sidebar-label{font-family:var(--font-mono);font-size:10px;color:var(--muted);letter-spacing:2px;text-transform:uppercase;padding:12px 12px 6px;}
.sr-sidebar-btn{display:flex;align-items:center;gap:12px;padding:10px 14px;border-radius:8px;border:none;background:none;cursor:pointer;color:var(--muted);font-family:var(--font-body);font-size:13px;font-weight:500;transition:all .18s;width:100%;text-align:left;}
.sr-sidebar-btn:hover{background:#edf2f7;color:var(--text);}
.sr-sidebar-btn.active{background:#ebf4ff;color:var(--accent);border-left:2px solid var(--accent);}
.sr-sidebar-badge{margin-left:auto;background:var(--red);color:#fff;font-size:10px;font-weight:700;padding:2px 7px;border-radius:10px;font-family:var(--font-mono);}
.sr-main{padding:28px;overflow-y:auto;display:flex;flex-direction:column;gap:24px;}
.sr-stats-grid{display:grid;grid-template-columns:repeat(6,1fr);gap:14px;}
.sr-stat-card{background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:18px 16px;position:relative;overflow:hidden;transition:box-shadow .2s;box-shadow:0 1px 3px rgba(0,0,0,.05);}
.sr-stat-card::before{content:'';position:absolute;top:0;left:0;right:0;height:3px;background:var(--accent-color,var(--accent));}
.sr-stat-card:hover{box-shadow:0 4px 12px rgba(0,0,0,.1);}
.sr-stat-label{font-family:var(--font-mono);font-size:10px;color:var(--muted);letter-spacing:1.5px;text-transform:uppercase;margin-bottom:10px;}
.sr-stat-value{font-family:var(--font-head);font-size:36px;font-weight:700;color:var(--accent-color,var(--accent));line-height:1;}
.sr-stat-sub{font-size:11px;color:var(--muted);margin-top:6px;}
.sr-filter-bar{display:flex;align-items:center;gap:12px;flex-wrap:wrap;}
.sr-filter-bar h2{font-family:var(--font-head);font-size:20px;font-weight:700;letter-spacing:1px;color:var(--text);flex:1;}
.sr-filter-btn{padding:7px 16px;border-radius:6px;border:1px solid var(--border);background:var(--surface);color:var(--muted);font-size:12px;font-weight:500;cursor:pointer;transition:all .15s;font-family:var(--font-body);}
.sr-filter-btn:hover{border-color:var(--accent);color:var(--accent);}
.sr-filter-btn.active{background:#ebf4ff;border-color:var(--accent);color:var(--accent);}
.sr-filter-btn.danger.active{background:#fff5f5;border-color:var(--red);color:var(--red);}
.sr-filter-btn.warning.active{background:#fffaf0;border-color:var(--orange);color:var(--orange);}
.sr-refresh-btn{padding:7px 14px;border-radius:6px;border:1px solid var(--accent);background:transparent;color:var(--accent);font-size:12px;cursor:pointer;transition:all .15s;font-family:var(--font-mono);letter-spacing:1px;}
.sr-refresh-btn:hover{background:#ebf4ff;}
.sr-incidents-list{display:flex;flex-direction:column;gap:12px;}
.sr-incident-card{background:var(--surface);border:1px solid var(--border);border-radius:12px;overflow:hidden;cursor:pointer;transition:all .2s;animation:sr-slideIn .3s ease;box-shadow:0 1px 3px rgba(0,0,0,.05);}
.sr-incident-card:hover{box-shadow:0 4px 12px rgba(0,0,0,.1);transform:translateY(-1px);}
.sr-incident-card.expanded{border-color:var(--accent);box-shadow:0 0 0 2px rgba(29,114,245,.15);}
.sr-incident-header{display:grid;grid-template-columns:4px 1fr auto;align-items:stretch;padding:16px 20px;gap:16px;}
.sr-severity-bar{width:4px;border-radius:4px;flex-shrink:0;align-self:stretch;}
.sr-incident-top-row{display:flex;align-items:center;gap:12px;margin-bottom:8px;flex-wrap:wrap;}
.sr-incident-id{font-family:var(--font-mono);font-size:11px;color:var(--muted);letter-spacing:1px;}
.sr-severity-badge{font-family:var(--font-mono);font-size:10px;font-weight:700;letter-spacing:1.5px;padding:3px 10px;border-radius:4px;border:1px solid;}
.sev-CRITICAL{color:#c53030;border-color:#fc8181;background:#fff5f5;}
.sev-HIGH{color:#c05621;border-color:#f6ad55;background:#fffaf0;}
.sev-MEDIUM{color:#b7791f;border-color:#f6e05e;background:#fffff0;}
.sev-LOW{color:#276749;border-color:#68d391;background:#f0fff4;}
.sev-NONE{color:#718096;border-color:#cbd5e0;background:#f7fafc;}
.sr-cat-tag{font-size:11px;padding:2px 10px;border-radius:20px;background:#edf2f7;color:#4a5568;font-weight:500;}
.sr-incident-meta{display:flex;gap:20px;flex-wrap:wrap;}
.sr-meta-item{display:flex;align-items:center;gap:6px;font-size:12px;color:var(--muted);}
.sr-meta-link{color:var(--accent);text-decoration:none;font-size:12px;}
.sr-meta-link:hover{text-decoration:underline;}
.sr-incident-actions{display:flex;flex-direction:column;align-items:flex-end;gap:10px;flex-shrink:0;}
.sr-status-badge{font-family:var(--font-mono);font-size:10px;letter-spacing:1px;padding:4px 10px;border-radius:4px;font-weight:600;}
.st-pending{background:#fefcbf;color:#744210;}
.st-reviewed{background:#bee3f8;color:#2a4365;}
.st-resolved{background:#c6f6d5;color:#276749;}
.sr-notified-badge{font-size:10px;color:#276749;}
.sr-incident-detail{border-top:1px solid var(--border);padding:20px;background:#fafbfc;animation:sr-fadeIn .2s ease;}
.sr-detail-grid{display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:20px;}
.sr-detail-block{background:var(--surface);border-radius:8px;padding:14px;border:1px solid var(--border);}
.sr-detail-block h4{font-family:var(--font-mono);font-size:10px;color:var(--muted);letter-spacing:2px;text-transform:uppercase;margin-bottom:12px;}
.sr-detail-row{display:flex;justify-content:space-between;align-items:baseline;padding:5px 0;border-bottom:1px solid #f0f0f0;font-size:12px;}
.sr-detail-row:last-child{border-bottom:none;}
.sr-detail-row .lbl{color:var(--muted);}
.sr-detail-row .val{color:var(--text);font-weight:500;text-align:right;max-width:55%;word-break:break-word;}
.sr-evidence-grid{display:flex;gap:12px;overflow-x:auto;padding-bottom:8px;}
.sr-evidence-img{width:200px;height:120px;object-fit:cover;border-radius:8px;border:1px solid var(--border);flex-shrink:0;cursor:pointer;transition:transform .2s,box-shadow .2s;}
.sr-evidence-img:hover{transform:scale(1.03);box-shadow:0 4px 12px rgba(0,0,0,.15);}
.sr-no-evidence{color:var(--muted);font-size:12px;font-style:italic;}
.sr-notes-area{width:100%;background:#fafbfc;border:1px solid var(--border);border-radius:8px;color:var(--text);padding:10px 14px;font-family:var(--font-body);font-size:13px;resize:vertical;min-height:70px;margin-top:8px;}
.sr-notes-area:focus{outline:none;border-color:var(--accent);box-shadow:0 0 0 3px rgba(29,114,245,.1);}
.sr-detail-actions{display:flex;gap:10px;margin-top:14px;flex-wrap:wrap;}
.sr-det-btn{padding:8px 18px;border-radius:8px;border:1px solid;font-size:12px;font-weight:600;cursor:pointer;transition:all .15s;font-family:var(--font-body);}
.sr-det-btn-primary{border-color:#38a169;color:#276749;background:#f0fff4;}
.sr-det-btn-primary:hover{background:#c6f6d5;}
.sr-det-btn-police{border-color:#3182ce;color:#2b6cb0;background:#ebf8ff;}
.sr-det-btn-police:hover{background:#bee3f8;}
.sr-det-btn-resolve{border-color:#a0aec0;color:#718096;background:transparent;}
.sr-det-btn-resolve:hover{border-color:#4a5568;color:#4a5568;}
.sr-lightbox{display:none;position:fixed;inset:0;z-index:9000;background:rgba(0,0,0,.85);align-items:center;justify-content:center;}
.sr-lightbox.open{display:flex;}
.sr-lightbox img{max-width:90vw;max-height:90vh;border-radius:8px;box-shadow:0 20px 60px rgba(0,0,0,.5);}
.sr-lightbox-close{position:absolute;top:20px;right:28px;font-size:32px;color:#fff;cursor:pointer;opacity:.7;}
.sr-lightbox-close:hover{opacity:1;}
.sr-toast-container{position:fixed;bottom:28px;right:28px;z-index:9500;display:flex;flex-direction:column;gap:10px;}
.sr-toast{background:#fff;border:1px solid var(--border);border-radius:10px;padding:14px 18px;font-size:13px;color:var(--text);min-width:280px;animation:sr-toastIn .3s ease;display:flex;align-items:center;gap:12px;border-left:3px solid var(--accent);box-shadow:0 8px 32px rgba(0,0,0,.12);}
.sr-toast.threat{border-left-color:var(--red);}
.sr-spinner{text-align:center;padding:60px;color:var(--muted);font-family:var(--font-mono);font-size:13px;letter-spacing:2px;}
.sr-spinner-ring{display:block;width:36px;height:36px;border:2px solid #e2e8f0;border-top-color:var(--accent);border-radius:50%;animation:sr-spin .8s linear infinite;margin:0 auto 20px;}
.sr-empty-state{text-align:center;padding:80px 40px;color:var(--muted);}
.sr-empty-state .icon{font-size:48px;margin-bottom:16px;}
.sr-empty-state h3{font-family:var(--font-head);font-size:20px;margin-bottom:8px;color:var(--text);}
.sr-empty-state p{font-size:13px;}
.sr-root ::-webkit-scrollbar{width:6px;height:6px;}
.sr-root ::-webkit-scrollbar-track{background:transparent;}
.sr-root ::-webkit-scrollbar-thumb{background:#cbd5e0;border-radius:3px;}
.sr-root ::-webkit-scrollbar-thumb:hover{background:#a0aec0;}
@media(max-width:1100px){.sr-stats-grid{grid-template-columns:repeat(3,1fr);}.sr-layout{grid-template-columns:1fr;}.sr-sidebar{display:none;}.sr-detail-grid{grid-template-columns:1fr;}}
@media(max-width:680px){.sr-stats-grid{grid-template-columns:repeat(2,1fr);}.sr-incident-header{grid-template-columns:4px 1fr;}.sr-incident-actions{display:none;}}
@keyframes sr-pulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.4;transform:scale(.8)}}
@keyframes sr-spin{to{transform:rotate(360deg)}}
@keyframes sr-slideIn{from{opacity:0;transform:translateY(-12px)}to{opacity:1;transform:translateY(0)}}
@keyframes sr-fadeIn{from{opacity:0}to{opacity:1}}
@keyframes sr-toastIn{from{opacity:0;transform:translateX(20px)}to{opacity:1;transform:translateX(0)}}
`;

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [currentFilter, setCurrentFilter] = useState("all");
  const [currentSeverity, setCurrentSev] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [detailCache, setDetailCache] = useState<Map<string, Incident>>(
    new Map(),
  );
  const [loadingDetail, setLoadingDetail] = useState<string | null>(null);
  const [toasts, setToasts] = useState<
    { id: number; msg: string; threat: boolean }[]
  >([]);
  const [clock, setClock] = useState("");
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);
  const [incLoading, setIncLoading] = useState(true);
  const [serverError, setServerError] = useState(false);
  const lastCountRef = useRef(0);
  const toastId = useRef(0);

  // ── Clock ────────────────────────────────────────────────────────────────
  useEffect(() => {
    const tick = () =>
      setClock(
        new Date().toLocaleString("en-GB", { hour12: false }).replace(",", ""),
      );
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, []);

  // ── Toast ────────────────────────────────────────────────────────────────
  const showToast = useCallback((msg: string, threat = false) => {
    const id = ++toastId.current;
    setToasts((p) => [...p, { id, msg, threat }]);
    setTimeout(() => setToasts((p) => p.filter((t) => t.id !== id)), 5000);
  }, []);

  // ── Load Stats ───────────────────────────────────────────────────────────
  const loadStats = useCallback(async () => {
    try {
      const d: Stats = await fetch(`${API_BASE_URL}/stats`).then((r) =>
        r.json(),
      );
      setStats(d);
    } catch {
      /* silent */
    }
  }, []);

  // ── Load Incidents ───────────────────────────────────────────────────────
  const loadIncidents = useCallback(async () => {
    const p = new URLSearchParams({ per_page: "50" });
    if (currentFilter !== "all" && !currentSeverity)
      p.set("status", currentFilter);
    if (currentSeverity) p.set("severity", currentSeverity);
    try {
      const d = await fetch(`${API_BASE_URL}/incidents?${p}`).then((r) =>
        r.json(),
      );
      const fresh: Incident[] = d.incidents || [];
      if (lastCountRef.current > 0 && fresh.length > lastCountRef.current) {
        const n = fresh[0];
        showToast(
          `${fresh.length - lastCountRef.current} new report(s) — ${n.location?.town ?? "Unknown"} — ${n.detection?.category ?? "No threat"}`,
          !!n.detection?.detected,
        );
      }
      lastCountRef.current = fresh.length;
      setIncidents(fresh);
      setServerError(false);
    } catch {
      setServerError(true);
    } finally {
      setIncLoading(false);
    }
  }, [currentFilter, currentSeverity, showToast]);

  const refreshAll = useCallback(() => {
    loadStats();
    loadIncidents();
  }, [loadStats, loadIncidents]);

  useEffect(() => {
    refreshAll();
    const t = setInterval(refreshAll, REFRESH_INTERVAL_MS);
    return () => clearInterval(t);
  }, [refreshAll]);

  // ── Filters ──────────────────────────────────────────────────────────────
  const applyFilter = (f: string) => {
    setCurrentFilter(f);
    setCurrentSev(null);
    setDetailCache(new Map());
    setIncLoading(true);
  };
  const applySev = (s: string) => {
    setCurrentSev(s);
    setCurrentFilter("all");
    setDetailCache(new Map());
    setIncLoading(true);
  };
  const isActive = (f: string, s: string | null) =>
    s ? currentSeverity === s : currentFilter === f && !currentSeverity;

  // ── Toggle card ──────────────────────────────────────────────────────────
  const toggleCard = async (id: string) => {
    if (expandedId === id) {
      setExpandedId(null);
      return;
    }
    setExpandedId(id);
    if (detailCache.has(id)) return;
    setLoadingDetail(id);
    try {
      const inc: Incident = await fetch(`${API_BASE_URL}/incidents/${id}`).then(
        (r) => r.json(),
      );
      setDetailCache((prev) => new Map(prev).set(id, inc));
    } finally {
      setLoadingDetail(null);
    }
  };

  // ── Admin actions ─────────────────────────────────────────────────────────
  const saveNotes = async (id: string, status: string, notes: string) => {
    try {
      await fetch(`${API_BASE_URL}/incidents/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, admin_notes: notes }),
      });
      showToast(`Incident marked as ${status}`);
      setDetailCache((p) => {
        const m = new Map(p);
        m.delete(id);
        return m;
      });
      refreshAll();
    } catch {
      showToast("Update failed");
    }
  };
  const markPolice = async (id: string, notes: string) => {
    try {
      await fetch(`${API_BASE_URL}/incidents/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ police_notified: true, admin_notes: notes }),
      });
      showToast("✅ Police notification recorded");
      setDetailCache((p) => {
        const m = new Map(p);
        m.delete(id);
        return m;
      });
      refreshAll();
    } catch {
      showToast("Update failed");
    }
  };

  const stCls = (s: string) =>
    ({
      pending: "st-pending",
      reviewed: "st-reviewed",
      resolved: "st-resolved",
    })[s] ?? "st-pending";

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <>
      <style>{CSS}</style>
      <div className="sr-root">
        {/* NAVBAR */}
        <nav className="sr-navbar">
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span className="sr-nav-sub">COMMAND CENTER</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                fontFamily: "var(--font-mono)",
                fontSize: 11,
                color: "#276749",
                letterSpacing: 1,
              }}
            >
              <div className="sr-live-dot" style={{ background: "#38a169" }} />
              LIVE MONITORING
            </div>
            <span className="sr-nav-time">{clock}</span>
          </div>
        </nav>

        {/* LAYOUT */}
        <div className="sr-layout">
          {/* SIDEBAR */}
          <aside className="sr-sidebar">
            <div className="sr-sidebar-label">Navigation</div>
            <button
              className={`sr-sidebar-btn${isActive("all", null) ? " active" : ""}`}
              onClick={() => applyFilter("all")}
            >
              <span>📋</span> All Incidents
              <span className="sr-sidebar-badge">{stats?.total ?? 0}</span>
            </button>
            <button
              className={`sr-sidebar-btn${isActive("pending", null) ? " active" : ""}`}
              onClick={() => applyFilter("pending")}
            >
              <span>⏳</span> Pending Review
              <span
                className="sr-sidebar-badge"
                style={{ background: "#ffd600", color: "#000" }}
              >
                {stats?.pending_review ?? 0}
              </span>
            </button>
            <button
              className={`sr-sidebar-btn${isActive("reviewed", null) ? " active" : ""}`}
              onClick={() => applyFilter("reviewed")}
            >
              <span>🔍</span> Reviewed
            </button>
            <button
              className={`sr-sidebar-btn${isActive("resolved", null) ? " active" : ""}`}
              onClick={() => applyFilter("resolved")}
            >
              <span>✅</span> Resolved
            </button>

            <div className="sr-sidebar-label" style={{ marginTop: 12 }}>
              Severity
            </div>
            <button
              className={`sr-sidebar-btn${isActive("all", "CRITICAL") ? " active" : ""}`}
              onClick={() => applySev("CRITICAL")}
            >
              <span>🔴</span> Critical
            </button>
            <button
              className={`sr-sidebar-btn${isActive("all", "HIGH") ? " active" : ""}`}
              onClick={() => applySev("HIGH")}
            >
              <span>🟠</span> High
            </button>
            <button
              className={`sr-sidebar-btn${isActive("all", "MEDIUM") ? " active" : ""}`}
              onClick={() => applySev("MEDIUM")}
            >
              <span>🟡</span> Medium
            </button>

            <div className="sr-sidebar-label" style={{ marginTop: 12 }}>
              Category Breakdown
            </div>
            <div
              style={{ padding: "0 12px", fontSize: 12, color: "var(--muted)" }}
            >
              {stats?.category_breakdown?.length ? (
                stats.category_breakdown.map((c) => (
                  <div
                    key={c.category}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      padding: "4px 0",
                      borderBottom: "1px solid var(--border)",
                    }}
                  >
                    <span>{c.category}</span>
                    <span
                      style={{
                        color: "var(--text)",
                        fontFamily: "var(--font-mono)",
                      }}
                    >
                      {c.count}
                    </span>
                  </div>
                ))
              ) : (
                <span>No detections yet</span>
              )}
            </div>
          </aside>

          {/* MAIN */}
          <main className="sr-main">
            {/* Stats */}
            <div className="sr-stats-grid">
              {(
                [
                  ["Total Reports", stats?.total, "All time", "#1d72f5"],
                  [
                    "Threats Detected",
                    stats?.threats_detected,
                    "Confirmed incidents",
                    "#e53e3e",
                  ],
                  [
                    "Pending Review",
                    stats?.pending_review,
                    "Awaiting action",
                    "#d69e2e",
                  ],
                  ["Critical", stats?.critical, "Firearms detected", "#c53030"],
                  ["High Severity", stats?.high, "Knives / Fire", "#dd6b20"],
                  [
                    "Police Notified",
                    stats?.police_notified,
                    "Via admin call",
                    "#276749",
                  ],
                ] as [string, number | undefined, string, string][]
              ).map(([label, val, sub, color]) => (
                <div
                  key={label}
                  className="sr-stat-card"
                  style={{ "--accent-color": color } as React.CSSProperties}
                >
                  <div className="sr-stat-label">{label}</div>
                  <div className="sr-stat-value">{val ?? "—"}</div>
                  <div className="sr-stat-sub">{sub}</div>
                </div>
              ))}
            </div>

            {/* Filter bar */}
            <div className="sr-filter-bar">
              <h2>INCIDENT FEED</h2>
              <button
                className={`sr-filter-btn${isActive("all", null) ? " active" : ""}`}
                onClick={() => applyFilter("all")}
              >
                All
              </button>
              <button
                className={`sr-filter-btn danger${isActive("all", "CRITICAL") ? " active" : ""}`}
                onClick={() => applySev("CRITICAL")}
              >
                🔴 Critical
              </button>
              <button
                className={`sr-filter-btn warning${isActive("all", "HIGH") ? " active" : ""}`}
                onClick={() => applySev("HIGH")}
              >
                🟠 High
              </button>
              <button className="sr-refresh-btn" onClick={refreshAll}>
                ⟳ REFRESH
              </button>
            </div>

            {/* Incidents */}
            <div className="sr-incidents-list">
              {incLoading ? (
                <div className="sr-spinner">
                  <span className="sr-spinner-ring" />
                  LOADING INCIDENTS
                </div>
              ) : serverError ? (
                <div className="sr-empty-state">
                  <div className="icon">⚠️</div>
                  <h3>Cannot connect to server</h3>
                  <p>Make sure Flask is running on {API_BASE_URL}</p>
                </div>
              ) : incidents.length === 0 ? (
                <div className="sr-empty-state">
                  <div className="icon">📭</div>
                  <h3>No incidents found</h3>
                  <p>No reports match your current filter.</p>
                </div>
              ) : (
                incidents.map((inc) => {
                  const det = inc.detection ?? {};
                  const loc = inc.location ?? {};
                  const sevLvl = det.severity?.level ?? "NONE";
                  const isOpen = expandedId === inc._id;
                  const detail = detailCache.get(inc._id);

                  return (
                    <div
                      key={inc._id}
                      className={`sr-incident-card${isOpen ? " expanded" : ""}`}
                    >
                      {/* Header */}
                      <div
                        className="sr-incident-header"
                        onClick={() => toggleCard(inc._id)}
                      >
                        <div
                          className="sr-severity-bar"
                          style={{ background: sevColor(sevLvl) }}
                        />
                        <div>
                          <div className="sr-incident-top-row">
                            <span className="sr-incident-id">
                              {inc.report_id ?? inc._id.slice(-8)}
                            </span>
                            <span className={`sr-severity-badge sev-${sevLvl}`}>
                              {sevLvl}
                            </span>
                            <div
                              style={{
                                display: "flex",
                                gap: 6,
                                flexWrap: "wrap",
                              }}
                            >
                              {(det.classes ?? []).length ? (
                                det.classes!.map((c) => (
                                  <span key={c} className="sr-cat-tag">
                                    {c}
                                  </span>
                                ))
                              ) : (
                                <span
                                  className="sr-cat-tag"
                                  style={{ color: "var(--muted)" }}
                                >
                                  no threat
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="sr-incident-meta">
                            <span className="sr-meta-item">
                              📍 {loc.town ?? "—"}
                              {loc.district ? ", " + loc.district : ""}
                            </span>
                            <span className="sr-meta-item">
                              🕐 {formatDate(inc.submitted_at)}
                            </span>
                            {loc.maps_url && (
                              <a
                                className="sr-meta-link"
                                href={loc.maps_url}
                                target="_blank"
                                rel="noreferrer"
                                onClick={(e) => e.stopPropagation()}
                              >
                                🗺️ Maps
                              </a>
                            )}
                            <span className="sr-meta-item">
                              📸 {det.total_detections ?? 0} detections
                            </span>
                          </div>
                        </div>
                        <div className="sr-incident-actions">
                          <span
                            className={`sr-status-badge ${stCls(inc.status)}`}
                          >
                            {inc.status.toUpperCase()}
                          </span>
                          {inc.police_notified && (
                            <span className="sr-notified-badge">
                              ✅ Police notified
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Expanded detail */}
                      {isOpen && (
                        <IncidentDetail
                          inc={detail ?? inc}
                          loading={loadingDetail === inc._id}
                          onSaveNotes={saveNotes}
                          onMarkPolice={markPolice}
                          onLightbox={setLightboxSrc}
                        />
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </main>
        </div>

        {/* LIGHTBOX */}
        {lightboxSrc && (
          <div
            className="sr-lightbox open"
            onClick={() => setLightboxSrc(null)}
          >
            <span className="sr-lightbox-close">✕</span>
            <img
              src={lightboxSrc}
              alt="Evidence"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        )}

        {/* TOASTS */}
        <div className="sr-toast-container">
          {toasts.map((t) => (
            <div key={t.id} className={`sr-toast${t.threat ? " threat" : ""}`}>
              <span>{t.threat ? "🚨" : "ℹ️"}</span>
              <span>{t.msg}</span>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

// ─── IncidentDetail ───────────────────────────────────────────────────────────
function IncidentDetail({
  inc,
  loading,
  onSaveNotes,
  onMarkPolice,
  onLightbox,
}: {
  inc: Incident;
  loading: boolean;
  onSaveNotes: (id: string, status: string, notes: string) => void;
  onMarkPolice: (id: string, notes: string) => void;
  onLightbox: (src: string) => void;
}) {
  const [notes, setNotes] = useState(inc.admin_notes ?? "");
  const det = inc.detection ?? {};
  const loc = inc.location ?? {};
  const sev = det.severity ?? { level: "NONE" };
  const imgs = inc.evidence_images ?? [];

  if (loading)
    return (
      <div className="sr-incident-detail">
        <div className="sr-spinner">
          <span className="sr-spinner-ring" />
          LOADING DETAILS
        </div>
      </div>
    );

  return (
    <div className="sr-incident-detail">
      <div className="sr-detail-grid">
        {/* Location */}
        <div className="sr-detail-block">
          <h4>Location Info</h4>
          {(
            [
              ["Town", loc.town],
              ["District", loc.district],
              ["Country", loc.country],
              ["Address", loc.address],
            ] as [string, string | undefined][]
          ).map(([l, v]) => (
            <div key={l} className="sr-detail-row">
              <span className="lbl">{l}</span>
              <span className="val">{v ?? "—"}</span>
            </div>
          ))}
          {loc.latitude != null && (
            <div className="sr-detail-row">
              <span className="lbl">Coordinates</span>
              <span className="val" style={{ fontFamily: "var(--font-mono)" }}>
                {loc.latitude.toFixed(5)}, {loc.longitude?.toFixed(5)}
              </span>
            </div>
          )}
          <div className="sr-detail-row">
            <span className="lbl">Maps</span>
            <span className="val">
              {loc.maps_url ? (
                <a
                  href={loc.maps_url}
                  target="_blank"
                  rel="noreferrer"
                  className="sr-meta-link"
                >
                  Open Google Maps ↗
                </a>
              ) : (
                "—"
              )}
            </span>
          </div>
          <div className="sr-detail-row">
            <span className="lbl">Reported</span>
            <span className="val">{formatDate(inc.submitted_at)}</span>
          </div>
        </div>

        {/* Detection */}
        <div className="sr-detail-block">
          <h4>Detection Summary</h4>
          <div className="sr-detail-row">
            <span className="lbl">Category</span>
            <span className="val">{det.category ?? "none"}</span>
          </div>
          <div className="sr-detail-row">
            <span className="lbl">Severity</span>
            <span className="val">
              <span className={`sr-severity-badge sev-${sev.level ?? "NONE"}`}>
                {sev.level ?? "NONE"}
              </span>
            </span>
          </div>
          <div className="sr-detail-row">
            <span className="lbl">Total Detections</span>
            <span className="val" style={{ fontFamily: "var(--font-mono)" }}>
              {det.total_detections ?? 0}
            </span>
          </div>
          <div className="sr-detail-row">
            <span className="lbl">Evidence Frames</span>
            <span className="val" style={{ fontFamily: "var(--font-mono)" }}>
              {imgs.length}
            </span>
          </div>
          <div style={{ marginTop: 10 }}>
            {(det.detections ?? []).slice(0, 8).map((d, i) => (
              <div key={i} className="sr-detail-row">
                <span className="lbl">
                  {d.class} @ {d.timestamp_sec}s
                </span>
                <span
                  className="val"
                  style={{
                    color: "var(--accent)",
                    fontFamily: "var(--font-mono)",
                  }}
                >
                  {(d.confidence * 100).toFixed(1)}%
                </span>
              </div>
            ))}
            {!det.detections?.length && (
              <span style={{ color: "var(--muted)", fontSize: 12 }}>
                No detections
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Evidence images */}
      <div className="sr-detail-block" style={{ marginBottom: 20 }}>
        <h4>Evidence Images (YOLO Annotated)</h4>
        {imgs.length ? (
          <div className="sr-evidence-grid">
            {imgs.map((b64, i) => (
              <img
                key={i}
                className="sr-evidence-img"
                src={`data:image/jpeg;base64,${b64}`}
                alt={`Evidence ${i + 1}`}
                loading="lazy"
                onClick={() => onLightbox(`data:image/jpeg;base64,${b64}`)}
              />
            ))}
          </div>
        ) : (
          <p className="sr-no-evidence">
            No evidence frames captured (no threats detected or video too
            short).
          </p>
        )}
      </div>

      {/* Admin actions */}
      <div className="sr-detail-block">
        <h4>Admin Actions</h4>
        <label style={{ fontSize: 12, color: "var(--muted)" }}>
          Notes / Actions taken:
        </label>
        <textarea
          className="sr-notes-area"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Record actions taken, police contact details, follow-up notes..."
        />
        <div className="sr-detail-actions">
          <button
            className="sr-det-btn sr-det-btn-primary"
            onClick={() => onSaveNotes(inc._id, "reviewed", notes)}
          >
            ✓ Mark as Reviewed
          </button>
          <button
            className="sr-det-btn sr-det-btn-police"
            onClick={() => onMarkPolice(inc._id, notes)}
          >
            📞 Mark Police Notified
          </button>
          <button
            className="sr-det-btn sr-det-btn-resolve"
            onClick={() => onSaveNotes(inc._id, "resolved", notes)}
          >
            Archive / Resolve
          </button>
        </div>
      </div>
    </div>
  );
}
