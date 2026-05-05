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

// ─── Inline SVG icon helper ──────────────────────────────────────────────────
const SvgIcon = ({
  children,
  size = 16,
  strokeWidth = 1.8,
}: {
  children: React.ReactNode;
  size?: number;
  strokeWidth?: number;
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={strokeWidth}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    {children}
  </svg>
);

// ─── Global CSS ───────────────────────────────────────────────────────────────
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap');
.sr-root{
  --bg:#f8fafc;--surface:#ffffff;--panel:#f1f5f9;--border:#e5e7eb;--border-strong:#d1d5db;
  --accent:#2563eb;--accent-soft:#eff6ff;
  --red:#dc2626;--red-soft:#fef2f2;--orange:#ea580c;--orange-soft:#fff7ed;
  --yellow:#ca8a04;--yellow-soft:#fefce8;--green:#16a34a;--green-soft:#f0fdf4;
  --text:#0f172a;--text-2:#334155;--muted:#64748b;--muted-light:#94a3b8;
  --font-body:'Inter',system-ui,-apple-system,sans-serif;
  --font-mono:'JetBrains Mono',monospace;
  --shadow-sm:0 1px 2px rgba(15,23,42,.04);
  --shadow-md:0 1px 3px rgba(15,23,42,.06),0 1px 2px rgba(15,23,42,.04);
  --shadow-lg:0 4px 12px rgba(15,23,42,.08),0 2px 4px rgba(15,23,42,.04);
  background:var(--bg);color:var(--text);font-family:var(--font-body);
  min-height:100vh;overflow-x:hidden;margin:-32px;padding:0;-webkit-font-smoothing:antialiased;
}
.sr-navbar{background:var(--surface);border-bottom:1px solid var(--border);padding:0 32px;height:64px;display:flex;align-items:center;justify-content:space-between;position:sticky;top:0;z-index:100;}
.sr-nav-sub{font-size:12px;font-weight:600;color:var(--muted);letter-spacing:1.5px;text-transform:uppercase;}
.sr-live-badge{display:inline-flex;align-items:center;gap:8px;padding:6px 12px;background:#ecfdf5;border:1px solid #a7f3d0;border-radius:999px;font-size:11px;font-weight:600;color:#047857;letter-spacing:1px;}
.sr-live-dot{width:7px;height:7px;border-radius:50%;background:#10b981;animation:sr-pulse 1.6s ease-in-out infinite;flex-shrink:0;}
.sr-nav-time{font-family:var(--font-mono);font-size:12px;color:var(--muted);font-weight:500;}
.sr-layout{display:grid;grid-template-columns:240px 1fr;min-height:calc(100vh - 64px);}
.sr-sidebar{background:var(--surface);border-right:1px solid var(--border);padding:20px 16px;display:flex;flex-direction:column;gap:4px;overflow-y:auto;}
.sr-sidebar-label{font-size:11px;font-weight:600;color:var(--muted-light);letter-spacing:1.2px;text-transform:uppercase;padding:14px 12px 8px;}
.sr-sidebar-btn{display:flex;align-items:center;gap:12px;padding:9px 12px;border-radius:8px;border:none;background:none;cursor:pointer;color:var(--text-2);font-family:var(--font-body);font-size:13px;font-weight:500;transition:all .15s;width:100%;text-align:left;}
.sr-sidebar-btn:hover{background:var(--panel);color:var(--text);}
.sr-sidebar-btn.active{background:var(--accent-soft);color:var(--accent);font-weight:600;}
.sr-sidebar-btn svg{flex-shrink:0;opacity:.85;}
.sr-sidebar-btn .sev-dot{width:9px;height:9px;border-radius:50%;flex-shrink:0;margin-left:3px;margin-right:3px;}
.sr-sidebar-badge{margin-left:auto;background:var(--panel);color:var(--text-2);font-size:11px;font-weight:600;padding:2px 9px;border-radius:999px;font-family:var(--font-mono);min-width:26px;text-align:center;}
.sr-sidebar-btn.active .sr-sidebar-badge{background:var(--accent);color:#fff;}
.sr-sidebar-badge.warning{background:#fef3c7;color:#92400e;}
.sr-cat-row{display:flex;justify-content:space-between;align-items:center;padding:7px 12px;font-size:12.5px;color:var(--text-2);border-radius:6px;}
.sr-cat-row + .sr-cat-row{border-top:1px solid var(--border);}
.sr-cat-row .count{color:var(--muted);font-family:var(--font-mono);font-weight:600;}
.sr-cat-empty{padding:8px 12px;font-size:12px;color:var(--muted);font-style:italic;}
.sr-main{padding:28px 32px;overflow-y:auto;display:flex;flex-direction:column;gap:24px;}
.sr-stats-grid{display:grid;grid-template-columns:repeat(6,1fr);gap:14px;}
.sr-stat-card{background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:18px 18px;position:relative;transition:border-color .2s,box-shadow .2s,transform .2s;box-shadow:var(--shadow-sm);}
.sr-stat-card:hover{border-color:var(--border-strong);box-shadow:var(--shadow-md);transform:translateY(-1px);}
.sr-stat-icon{width:34px;height:34px;border-radius:9px;display:inline-flex;align-items:center;justify-content:center;background:color-mix(in srgb,var(--accent-color,var(--accent)) 12%,transparent);color:var(--accent-color,var(--accent));margin-bottom:14px;}
.sr-stat-label{font-size:11.5px;color:var(--muted);font-weight:500;margin-bottom:4px;letter-spacing:.2px;}
.sr-stat-value{font-size:28px;font-weight:700;color:var(--text);line-height:1.1;letter-spacing:-.5px;}
.sr-stat-sub{font-size:11px;color:var(--muted-light);margin-top:5px;}
.sr-filter-bar{display:flex;align-items:center;gap:8px;flex-wrap:wrap;}
.sr-filter-bar h2{font-size:18px;font-weight:700;color:var(--text);flex:1;letter-spacing:-.3px;margin:0;}
.sr-filter-btn{padding:7px 14px;border-radius:8px;border:1px solid var(--border);background:var(--surface);color:var(--text-2);font-size:12.5px;font-weight:500;cursor:pointer;transition:all .15s;font-family:var(--font-body);display:inline-flex;align-items:center;gap:6px;}
.sr-filter-btn:hover{border-color:var(--border-strong);background:var(--panel);}
.sr-filter-btn.active{background:var(--accent-soft);border-color:#bfdbfe;color:var(--accent);font-weight:600;}
.sr-filter-btn.danger.active{background:var(--red-soft);border-color:#fecaca;color:var(--red);}
.sr-filter-btn.warning.active{background:var(--orange-soft);border-color:#fed7aa;color:var(--orange);}
.sr-filter-btn .sev-dot{width:8px;height:8px;border-radius:50%;}
.sr-refresh-btn{padding:7px 14px;border-radius:8px;border:1px solid var(--border);background:var(--surface);color:var(--text-2);font-size:12.5px;font-weight:500;cursor:pointer;transition:all .15s;display:inline-flex;align-items:center;gap:6px;}
.sr-refresh-btn:hover{border-color:var(--accent);color:var(--accent);background:var(--accent-soft);}
.sr-incidents-list{display:flex;flex-direction:column;gap:10px;}
.sr-incident-card{background:var(--surface);border:1px solid var(--border);border-radius:12px;overflow:hidden;cursor:pointer;transition:all .15s;box-shadow:var(--shadow-sm);animation:sr-slideIn .25s ease;}
.sr-incident-card:hover{border-color:var(--border-strong);box-shadow:var(--shadow-md);}
.sr-incident-card.expanded{border-color:var(--accent);box-shadow:0 0 0 3px var(--accent-soft);}
.sr-incident-header{display:grid;grid-template-columns:4px 1fr auto;align-items:stretch;padding:16px 20px;gap:16px;}
.sr-severity-bar{width:4px;border-radius:4px;flex-shrink:0;align-self:stretch;}
.sr-incident-top-row{display:flex;align-items:center;gap:10px;margin-bottom:8px;flex-wrap:wrap;}
.sr-incident-id{font-family:var(--font-mono);font-size:11px;color:var(--muted);font-weight:500;background:var(--panel);padding:3px 8px;border-radius:5px;}
.sr-severity-badge{font-size:10px;font-weight:700;letter-spacing:.8px;padding:3px 9px;border-radius:5px;border:1px solid;}
.sev-CRITICAL{color:#b91c1c;border-color:#fca5a5;background:#fef2f2;}
.sev-HIGH{color:#c2410c;border-color:#fdba74;background:#fff7ed;}
.sev-MEDIUM{color:#a16207;border-color:#fde047;background:#fefce8;}
.sev-LOW{color:#15803d;border-color:#86efac;background:#f0fdf4;}
.sev-NONE{color:#64748b;border-color:#cbd5e1;background:#f1f5f9;}
.sr-cat-tag{font-size:11px;padding:3px 9px;border-radius:5px;background:var(--panel);color:var(--text-2);font-weight:500;}
.sr-cat-tag.muted{color:var(--muted-light);}
.sr-incident-meta{display:flex;gap:18px;flex-wrap:wrap;align-items:center;}
.sr-meta-item{display:inline-flex;align-items:center;gap:6px;font-size:12.5px;color:var(--muted);}
.sr-meta-item svg{flex-shrink:0;}
.sr-meta-link{display:inline-flex;align-items:center;gap:5px;color:var(--accent);text-decoration:none;font-size:12.5px;font-weight:500;}
.sr-meta-link:hover{text-decoration:underline;}
.sr-incident-actions{display:flex;flex-direction:column;align-items:flex-end;gap:8px;flex-shrink:0;}
.sr-status-badge{font-size:10px;letter-spacing:.8px;padding:4px 10px;border-radius:5px;font-weight:700;}
.st-pending{background:#fef3c7;color:#92400e;}
.st-reviewed{background:#dbeafe;color:#1e40af;}
.st-resolved{background:#d1fae5;color:#065f46;}
.sr-notified-badge{display:inline-flex;align-items:center;gap:4px;font-size:11px;color:#15803d;font-weight:500;}
.sr-incident-detail{border-top:1px solid var(--border);padding:20px;background:#fafbfc;animation:sr-fadeIn .2s ease;}
.sr-detail-grid{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px;}
.sr-detail-block{background:var(--surface);border-radius:10px;padding:16px;border:1px solid var(--border);}
.sr-detail-block h4{font-size:11px;color:var(--muted);font-weight:600;letter-spacing:1.2px;text-transform:uppercase;margin:0 0 12px;}
.sr-detail-row{display:flex;justify-content:space-between;align-items:baseline;padding:6px 0;border-bottom:1px solid #f1f5f9;font-size:12.5px;}
.sr-detail-row:last-child{border-bottom:none;}
.sr-detail-row .lbl{color:var(--muted);}
.sr-detail-row .val{color:var(--text);font-weight:500;text-align:right;max-width:60%;word-break:break-word;}
.sr-evidence-grid{display:flex;gap:10px;overflow-x:auto;padding-bottom:6px;}
.sr-evidence-img{width:200px;height:120px;object-fit:cover;border-radius:8px;border:1px solid var(--border);flex-shrink:0;cursor:pointer;transition:transform .2s,box-shadow .2s;}
.sr-evidence-img:hover{transform:scale(1.02);box-shadow:var(--shadow-md);}
.sr-no-evidence{color:var(--muted);font-size:12.5px;}
.sr-notes-area{width:100%;background:var(--surface);border:1px solid var(--border);border-radius:8px;color:var(--text);padding:10px 12px;font-family:var(--font-body);font-size:13px;resize:vertical;min-height:70px;margin-top:8px;transition:all .15s;box-sizing:border-box;}
.sr-notes-area:focus{outline:none;border-color:var(--accent);box-shadow:0 0 0 3px var(--accent-soft);}
.sr-detail-actions{display:flex;gap:8px;margin-top:12px;flex-wrap:wrap;}
.sr-det-btn{padding:8px 16px;border-radius:8px;border:1px solid;font-size:12.5px;font-weight:600;cursor:pointer;transition:all .15s;font-family:var(--font-body);display:inline-flex;align-items:center;gap:6px;}
.sr-det-btn-primary{border-color:#34d399;color:#047857;background:#ecfdf5;}
.sr-det-btn-primary:hover{background:#d1fae5;}
.sr-det-btn-police{border-color:#60a5fa;color:#1e40af;background:#eff6ff;}
.sr-det-btn-police:hover{background:#dbeafe;}
.sr-det-btn-resolve{border-color:var(--border-strong);color:var(--muted);background:var(--surface);}
.sr-det-btn-resolve:hover{border-color:var(--text-2);color:var(--text-2);}
.sr-lightbox{display:none;position:fixed;inset:0;z-index:9000;background:rgba(0,0,0,.85);align-items:center;justify-content:center;}
.sr-lightbox.open{display:flex;}
.sr-lightbox img{max-width:90vw;max-height:90vh;border-radius:10px;box-shadow:0 20px 60px rgba(0,0,0,.5);}
.sr-lightbox-close{position:absolute;top:20px;right:28px;font-size:28px;color:#fff;cursor:pointer;opacity:.8;line-height:1;}
.sr-lightbox-close:hover{opacity:1;}
.sr-toast-container{position:fixed;bottom:28px;right:28px;z-index:9500;display:flex;flex-direction:column;gap:10px;}
.sr-toast{background:#fff;border:1px solid var(--border);border-radius:10px;padding:12px 16px;font-size:13px;color:var(--text);min-width:280px;animation:sr-toastIn .3s ease;display:flex;align-items:center;gap:12px;border-left:3px solid var(--accent);box-shadow:var(--shadow-lg);}
.sr-toast.threat{border-left-color:var(--red);}
.sr-spinner{text-align:center;padding:60px;color:var(--muted);font-size:13px;font-weight:500;letter-spacing:1px;}
.sr-spinner-ring{display:block;width:32px;height:32px;border:2px solid var(--border);border-top-color:var(--accent);border-radius:50%;animation:sr-spin .8s linear infinite;margin:0 auto 16px;}
.sr-empty-state{text-align:center;padding:60px 32px;color:var(--muted);background:var(--surface);border:1px solid var(--border);border-radius:12px;}
.sr-empty-state .icon{display:inline-flex;align-items:center;justify-content:center;width:56px;height:56px;border-radius:50%;background:var(--panel);color:var(--muted);margin-bottom:14px;}
.sr-empty-state h3{font-size:16px;font-weight:600;margin:0 0 6px;color:var(--text);}
.sr-empty-state p{font-size:13px;margin:0;}
.sr-root ::-webkit-scrollbar{width:8px;height:8px;}
.sr-root ::-webkit-scrollbar-track{background:transparent;}
.sr-root ::-webkit-scrollbar-thumb{background:var(--border-strong);border-radius:4px;}
.sr-root ::-webkit-scrollbar-thumb:hover{background:var(--muted-light);}
@media(max-width:1280px){.sr-stats-grid{grid-template-columns:repeat(3,1fr);}}
@media(max-width:1100px){.sr-layout{grid-template-columns:1fr;}.sr-sidebar{display:none;}.sr-detail-grid{grid-template-columns:1fr;}}
@media(max-width:680px){.sr-stats-grid{grid-template-columns:repeat(2,1fr);}.sr-incident-header{grid-template-columns:4px 1fr;}.sr-incident-actions{display:none;}.sr-main{padding:20px 16px;}}
@keyframes sr-pulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.4;transform:scale(.7)}}
@keyframes sr-spin{to{transform:rotate(360deg)}}
@keyframes sr-slideIn{from{opacity:0;transform:translateY(-8px)}to{opacity:1;transform:translateY(0)}}
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
      showToast("Police notification recorded");
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

  // ── Stat card config (UI only) ─────────────────────────────────────────
  const statCards: {
    label: string;
    value: number | undefined;
    sub: string;
    color: string;
    icon: React.ReactNode;
  }[] = [
    {
      label: "Total Reports",
      value: stats?.total,
      sub: "All time",
      color: "#2563eb",
      icon: (
        <SvgIcon size={18}>
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="16" y1="13" x2="8" y2="13" />
          <line x1="16" y1="17" x2="8" y2="17" />
        </SvgIcon>
      ),
    },
    {
      label: "Threats Detected",
      value: stats?.threats_detected,
      sub: "Confirmed incidents",
      color: "#dc2626",
      icon: (
        <SvgIcon size={18}>
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          <line x1="12" y1="9" x2="12" y2="13" />
          <line x1="12" y1="17" x2="12.01" y2="17" />
        </SvgIcon>
      ),
    },
    {
      label: "Pending Review",
      value: stats?.pending_review,
      sub: "Awaiting action",
      color: "#d97706",
      icon: (
        <SvgIcon size={18}>
          <circle cx="12" cy="12" r="10" />
          <polyline points="12 6 12 12 16 14" />
        </SvgIcon>
      ),
    },
    {
      label: "Critical",
      value: stats?.critical,
      sub: "Firearms detected",
      color: "#b91c1c",
      icon: (
        <SvgIcon size={18}>
          <polygon points="7.86 2 16.14 2 22 7.86 22 16.14 16.14 22 7.86 22 2 16.14 2 7.86" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </SvgIcon>
      ),
    },
    {
      label: "High Severity",
      value: stats?.high,
      sub: "Knives / Fire",
      color: "#ea580c",
      icon: (
        <SvgIcon size={18}>
          <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
          <line x1="12" y1="9" x2="12" y2="13" />
          <line x1="12" y1="17" x2="12.01" y2="17" />
        </SvgIcon>
      ),
    },
    {
      label: "Police Notified",
      value: stats?.police_notified,
      sub: "Via admin call",
      color: "#15803d",
      icon: (
        <SvgIcon size={18}>
          <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
        </SvgIcon>
      ),
    },
  ];

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <>
      <style>{CSS}</style>
      <div className="sr-root">
        {/* NAVBAR */}
        <nav className="sr-navbar">
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span className="sr-nav-sub">Command Center</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <span className="sr-live-badge">
              <span className="sr-live-dot" />
              LIVE MONITORING
            </span>
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
              <SvgIcon>
                <line x1="8" y1="6" x2="21" y2="6" />
                <line x1="8" y1="12" x2="21" y2="12" />
                <line x1="8" y1="18" x2="21" y2="18" />
                <circle cx="3.8" cy="6" r="1.2" />
                <circle cx="3.8" cy="12" r="1.2" />
                <circle cx="3.8" cy="18" r="1.2" />
              </SvgIcon>
              All Incidents
              <span className="sr-sidebar-badge">{stats?.total ?? 0}</span>
            </button>
            <button
              className={`sr-sidebar-btn${isActive("pending", null) ? " active" : ""}`}
              onClick={() => applyFilter("pending")}
            >
              <SvgIcon>
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </SvgIcon>
              Pending Review
              <span className="sr-sidebar-badge warning">
                {stats?.pending_review ?? 0}
              </span>
            </button>
            <button
              className={`sr-sidebar-btn${isActive("reviewed", null) ? " active" : ""}`}
              onClick={() => applyFilter("reviewed")}
            >
              <SvgIcon>
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </SvgIcon>
              Reviewed
            </button>
            <button
              className={`sr-sidebar-btn${isActive("resolved", null) ? " active" : ""}`}
              onClick={() => applyFilter("resolved")}
            >
              <SvgIcon>
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </SvgIcon>
              Resolved
            </button>

            <div className="sr-sidebar-label">Severity</div>
            <button
              className={`sr-sidebar-btn${isActive("all", "CRITICAL") ? " active" : ""}`}
              onClick={() => applySev("CRITICAL")}
            >
              <span className="sev-dot" style={{ background: "#dc2626" }} />
              Critical
            </button>
            <button
              className={`sr-sidebar-btn${isActive("all", "HIGH") ? " active" : ""}`}
              onClick={() => applySev("HIGH")}
            >
              <span className="sev-dot" style={{ background: "#ea580c" }} />
              High
            </button>
            <button
              className={`sr-sidebar-btn${isActive("all", "MEDIUM") ? " active" : ""}`}
              onClick={() => applySev("MEDIUM")}
            >
              <span className="sev-dot" style={{ background: "#eab308" }} />
              Medium
            </button>

            <div className="sr-sidebar-label">Category Breakdown</div>
            <div style={{ padding: "0 4px" }}>
              {stats?.category_breakdown?.length ? (
                stats.category_breakdown.map((c) => (
                  <div key={c.category} className="sr-cat-row">
                    <span>{c.category}</span>
                    <span className="count">{c.count}</span>
                  </div>
                ))
              ) : (
                <div className="sr-cat-empty">No detections yet</div>
              )}
            </div>
          </aside>

          {/* MAIN */}
          <main className="sr-main">
            {/* Stats */}
            <div className="sr-stats-grid">
              {statCards.map(({ label, value, sub, color, icon }) => (
                <div
                  key={label}
                  className="sr-stat-card"
                  style={{ "--accent-color": color } as React.CSSProperties}
                >
                  <div className="sr-stat-icon">{icon}</div>
                  <div className="sr-stat-label">{label}</div>
                  <div className="sr-stat-value">{value ?? "—"}</div>
                  <div className="sr-stat-sub">{sub}</div>
                </div>
              ))}
            </div>

            {/* Filter bar */}
            <div className="sr-filter-bar">
              <h2>Incident Feed</h2>
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
                <span className="sev-dot" style={{ background: "#dc2626" }} />
                Critical
              </button>
              <button
                className={`sr-filter-btn warning${isActive("all", "HIGH") ? " active" : ""}`}
                onClick={() => applySev("HIGH")}
              >
                <span className="sev-dot" style={{ background: "#ea580c" }} />
                High
              </button>
              <button className="sr-refresh-btn" onClick={refreshAll}>
                <SvgIcon size={14}>
                  <polyline points="23 4 23 10 17 10" />
                  <polyline points="1 20 1 14 7 14" />
                  <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
                </SvgIcon>
                Refresh
              </button>
            </div>

            {/* Incidents */}
            <div className="sr-incidents-list">
              {incLoading ? (
                <div className="sr-spinner">
                  <span className="sr-spinner-ring" />
                  Loading incidents…
                </div>
              ) : serverError ? (
                <div className="sr-empty-state">
                  <span className="icon">
                    <SvgIcon size={28}>
                      <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                      <line x1="12" y1="9" x2="12" y2="13" />
                      <line x1="12" y1="17" x2="12.01" y2="17" />
                    </SvgIcon>
                  </span>
                  <h3>Cannot connect to server</h3>
                  <p>Make sure Flask is running on {API_BASE_URL}</p>
                </div>
              ) : incidents.length === 0 ? (
                <div className="sr-empty-state">
                  <span className="icon">
                    <SvgIcon size={26}>
                      <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
                    </SvgIcon>
                  </span>
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
                                <span className="sr-cat-tag muted">
                                  no threat
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="sr-incident-meta">
                            <span className="sr-meta-item">
                              <SvgIcon size={14}>
                                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                                <circle cx="12" cy="10" r="3" />
                              </SvgIcon>
                              {loc.town ?? "—"}
                              {loc.district ? ", " + loc.district : ""}
                            </span>
                            <span className="sr-meta-item">
                              <SvgIcon size={14}>
                                <circle cx="12" cy="12" r="10" />
                                <polyline points="12 6 12 12 16 14" />
                              </SvgIcon>
                              {formatDate(inc.submitted_at)}
                            </span>
                            {loc.maps_url && (
                              <a
                                className="sr-meta-link"
                                href={loc.maps_url}
                                target="_blank"
                                rel="noreferrer"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <SvgIcon size={14}>
                                  <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6" />
                                  <line x1="8" y1="2" x2="8" y2="18" />
                                  <line x1="16" y1="6" x2="16" y2="22" />
                                </SvgIcon>
                                Maps
                              </a>
                            )}
                            <span className="sr-meta-item">
                              <SvgIcon size={14}>
                                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                                <circle cx="12" cy="13" r="4" />
                              </SvgIcon>
                              {det.total_detections ?? 0} detections
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
                              <SvgIcon size={12} strokeWidth={2.4}>
                                <polyline points="20 6 9 17 4 12" />
                              </SvgIcon>
                              Police notified
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
            <span className="sr-lightbox-close">×</span>
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
              <SvgIcon size={16} strokeWidth={2}>
                {t.threat ? (
                  <>
                    <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                    <line x1="12" y1="9" x2="12" y2="13" />
                    <line x1="12" y1="17" x2="12.01" y2="17" />
                  </>
                ) : (
                  <>
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="16" x2="12" y2="12" />
                    <line x1="12" y1="8" x2="12.01" y2="8" />
                  </>
                )}
              </SvgIcon>
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
          Loading details…
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
                  Open Google Maps →
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
      <div className="sr-detail-block" style={{ marginBottom: 16 }}>
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
            <SvgIcon size={14} strokeWidth={2.2}>
              <polyline points="20 6 9 17 4 12" />
            </SvgIcon>
            Mark as Reviewed
          </button>
          <button
            className="sr-det-btn sr-det-btn-police"
            onClick={() => onMarkPolice(inc._id, notes)}
          >
            <SvgIcon size={14}>
              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
            </SvgIcon>
            Mark Police Notified
          </button>
          <button
            className="sr-det-btn sr-det-btn-resolve"
            onClick={() => onSaveNotes(inc._id, "resolved", notes)}
          >
            <SvgIcon size={14}>
              <polyline points="21 8 21 21 3 21 3 8" />
              <rect x="1" y="3" width="22" height="5" />
              <line x1="10" y1="12" x2="14" y2="12" />
            </SvgIcon>
            Archive / Resolve
          </button>
        </div>
      </div>
    </div>
  );
}
