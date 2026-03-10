"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  ExclamationTriangleIcon,
  MagnifyingGlassIcon,
  MapPinIcon,
  PhotoIcon,
  DocumentTextIcon,
  ArrowPathIcon,
  UserGroupIcon,
  PhoneIcon,
  ChatBubbleLeftRightIcon,
  PlusIcon,
  PencilSquareIcon,
  ClipboardDocumentListIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";

export interface ModelViolation {
  id: number;
  sourceFile: string;
  detectedAt: string;
  className: string;
  confidence: number;
  imageUrl?: string;
  plates?: string[];
  location?: string;
  vehicle?: string;
  category?: string;
}

/** Map model class names to human-readable violation types */
const VIOLATION_TYPE_LABELS: Record<string, string> = {
  class_0: "Stop line violation",
  class_1: "Traffic violation",
  class_2: "Vehicle / Obstruction",
  class_3: "Traffic violation",
  "stop line": "Stop line violation",
  "stop_line": "Stop line violation",
  violation: "Traffic violation",
  vehicle: "Vehicle",
  "number plate": "Number plate",
  "no helmet": "No helmet",
  speeding: "Speeding",
  "red light": "Red light",
  "wrong way": "Wrong way",
  reckless: "Reckless driving",
  other: "Other",
};

function getViolationTypeLabel(className: string): string {
  const key = className.toLowerCase().replace(/\s+/g, " ");
  return VIOLATION_TYPE_LABELS[key] ?? VIOLATION_TYPE_LABELS[className] ?? className;
}

export interface ViolationsExport {
  lastUpdated: string | null;
  total: number;
  violations: ModelViolation[];
  platesBySource?: Record<string, string[]>;
}

export type OfficerStatus = "Available" | "On Patrol" | "Responding" | "Off duty";

export interface Officer {
  id: number;
  name: string;
  badgeNumber: string;
  location: string;
  phone: string;
  vehicle: string;
  status: OfficerStatus;
  activeIncidents: number;
}

const STATUS_OPTIONS: { value: OfficerStatus; label: string; statusColor: string }[] = [
  { value: "Available", label: "Available", statusColor: "bg-green-100 text-green-700" },
  { value: "On Patrol", label: "On Patrol", statusColor: "bg-blue-100 text-blue-700" },
  { value: "Responding", label: "Responding", statusColor: "bg-orange-100 text-orange-700" },
  { value: "Off duty", label: "Off duty", statusColor: "bg-slate-100 text-slate-600" },
];

function getStatusStyle(status: OfficerStatus) {
  return STATUS_OPTIONS.find((s) => s.value === status)?.statusColor ?? "bg-slate-100 text-slate-600";
}

function getInitials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

const INITIAL_OFFICERS: Officer[] = [
  { id: 1, name: "John Martinez", badgeNumber: "PD-4521", location: "Downtown District, 5th Avenue", phone: "+1 (555) 123-4567", vehicle: "Unit 42", activeIncidents: 2, status: "On Patrol" },
  { id: 2, name: "Sarah Johnson", badgeNumber: "PD-3892", location: "North Quarter, Main Street", phone: "+1 (555) 234-5678", vehicle: "Unit 15", activeIncidents: 0, status: "Available" },
  { id: 3, name: "Michael Chen", badgeNumber: "PD-5104", location: "East Side, Highway 101", phone: "+1 (555) 345-6789", vehicle: "Unit 28", activeIncidents: 1, status: "Responding" },
  { id: 4, name: "Emily Rodriguez", badgeNumber: "PD-4783", location: "West End, Park Boulevard", phone: "+1 (555) 456-7890", vehicle: "Unit 33", activeIncidents: 0, status: "Available" },
];

export interface AssignedTask {
  id: string;
  description: string;
  violationId?: number;
  createdAt: string;
}

const TrafficViolationDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<"violations" | "officers">("violations");
  const [searchTerm, setSearchTerm] = useState("");
  const [officerSearch, setOfficerSearch] = useState("");
  const [officers, setOfficers] = useState<Officer[]>(INITIAL_OFFICERS);
  const [assignedTasks, setAssignedTasks] = useState<Record<number, AssignedTask[]>>({});
  const [addOfficerOpen, setAddOfficerOpen] = useState(false);
  const [changeStatusOfficerId, setChangeStatusOfficerId] = useState<number | null>(null);
  const [assignTaskOfficerId, setAssignTaskOfficerId] = useState<number | null>(null);
  const [addOfficerForm, setAddOfficerForm] = useState({ name: "", badgeNumber: "", location: "", phone: "", vehicle: "", status: "Available" as OfficerStatus });
  const [assignTaskForm, setAssignTaskForm] = useState({ description: "", violationId: "" });
  const [modelViolations, setModelViolations] = useState<ViolationsExport>({
    lastUpdated: null,
    total: 0,
    violations: [],
  });
  const [violationsLoading, setViolationsLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/traffic-violation/violations?t=${Date.now()}`)
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error("API failed"))))
      .then((data: ViolationsExport & { source?: string }) => {
        setModelViolations({
          lastUpdated: data.lastUpdated ?? null,
          total: data.total ?? 0,
          violations: data.violations ?? [],
          platesBySource: data.platesBySource ?? {},
        });
        setViolationsLoading(false);
      })
      .catch(() => {
        fetch(`/violations.json?t=${Date.now()}`)
          .then((res) => (res.ok ? res.json() : { lastUpdated: null, total: 0, violations: [], platesBySource: {} }))
          .then((data: ViolationsExport) => {
            setModelViolations(data);
            setViolationsLoading(false);
          })
          .catch(() => {
            setModelViolations({ lastUpdated: null, total: 0, violations: [], platesBySource: {} });
            setViolationsLoading(false);
          });
      });
  }, []);

  const filteredViolations = useMemo(() => {
    const list = modelViolations.violations ?? [];
    if (!searchTerm.trim()) return list;
    const q = searchTerm.toLowerCase().trim();
    return list.filter((v) => {
      const plates = v.plates?.length ? v.plates : (modelViolations.platesBySource?.[v.sourceFile] ?? []);
      const plateMatch = plates.some((p) => p.toLowerCase().includes(q));
      const locationMatch = v.location?.toLowerCase().includes(q);
      const typeMatch = getViolationTypeLabel(v.className).toLowerCase().includes(q);
      const sourceMatch = v.sourceFile?.toLowerCase().includes(q);
      const categoryMatch = v.category?.toLowerCase().includes(q);
      return plateMatch || locationMatch || typeMatch || sourceMatch || categoryMatch;
    });
  }, [modelViolations.violations, modelViolations.platesBySource, searchTerm]);

  const filteredOfficers = useMemo(() => {
    if (!officerSearch.trim()) return officers;
    const q = officerSearch.toLowerCase().trim();
    return officers.filter(
      (o) =>
        o.name.toLowerCase().includes(q) ||
        o.badgeNumber.toLowerCase().includes(q) ||
        o.location.toLowerCase().includes(q)
    );
  }, [officers, officerSearch]);

  const withLocation = (modelViolations.violations ?? []).filter((v) => v.location?.trim()).length;
  const withPlates = (modelViolations.violations ?? []).filter((v) => {
    const p = v.plates?.length ? v.plates : modelViolations.platesBySource?.[v.sourceFile];
    return p?.length;
  }).length;

  const uniquePhotos = useMemo(() => {
    const sources = new Set((modelViolations.violations ?? []).map((v) => v.sourceFile).filter(Boolean));
    return sources.size;
  }, [modelViolations.violations]);

  const metrics = [
    {
      title: "Photos",
      value: uniquePhotos,
      icon: PhotoIcon,
      color: "bg-slate-500",
      textColor: "text-slate-600",
      bgLight: "bg-slate-50",
    },
    {
      title: "Total violations",
      value: modelViolations.total,
      icon: ExclamationTriangleIcon,
      color: "bg-amber-500",
      textColor: "text-amber-600",
      bgLight: "bg-amber-50",
    },
    {
      title: "With location",
      value: withLocation,
      icon: MapPinIcon,
      color: "bg-blue-500",
      textColor: "text-blue-600",
      bgLight: "bg-blue-50",
    },
    {
      title: "With plate detected",
      value: withPlates,
      icon: DocumentTextIcon,
      color: "bg-emerald-500",
      textColor: "text-emerald-600",
      bgLight: "bg-emerald-50",
    },
  ];

  const handleAddOfficer = () => {
    if (!addOfficerForm.name.trim() || !addOfficerForm.badgeNumber.trim()) return;
    const nextId = Math.max(0, ...officers.map((o) => o.id)) + 1;
    setOfficers((prev) => [
      ...prev,
      {
        id: nextId,
        name: addOfficerForm.name.trim(),
        badgeNumber: addOfficerForm.badgeNumber.trim(),
        location: addOfficerForm.location.trim() || "—",
        phone: addOfficerForm.phone.trim() || "—",
        vehicle: addOfficerForm.vehicle.trim() || "—",
        status: addOfficerForm.status,
        activeIncidents: 0,
      },
    ]);
    setAddOfficerForm({ name: "", badgeNumber: "", location: "", phone: "", vehicle: "", status: "Available" });
    setAddOfficerOpen(false);
  };

  const handleChangeStatus = (officerId: number, status: OfficerStatus) => {
    setOfficers((prev) => prev.map((o) => (o.id === officerId ? { ...o, status } : o)));
    setChangeStatusOfficerId(null);
  };

  const handleAssignTask = () => {
    if (assignTaskOfficerId == null || !assignTaskForm.description.trim()) return;
    const task: AssignedTask = {
      id: `t-${Date.now()}`,
      description: assignTaskForm.description.trim(),
      violationId: assignTaskForm.violationId ? parseInt(assignTaskForm.violationId, 10) : undefined,
      createdAt: new Date().toISOString(),
    };
    const newList = [...(assignedTasks[assignTaskOfficerId] ?? []), task];
    setAssignedTasks((prev) => ({ ...prev, [assignTaskOfficerId]: newList }));
    setOfficers((prev) =>
      prev.map((o) => (o.id === assignTaskOfficerId ? { ...o, activeIncidents: newList.length } : o))
    );
    setAssignTaskForm({ description: "", violationId: "" });
    setAssignTaskOfficerId(null);
  };

  const removeTask = (officerId: number, taskId: string) => {
    const newList = (assignedTasks[officerId] ?? []).filter((t) => t.id !== taskId);
    setAssignedTasks((prev) => ({ ...prev, [officerId]: newList }));
    setOfficers((prev) =>
      prev.map((o) => (o.id === officerId ? { ...o, activeIncidents: newList.length } : o))
    );
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6">
        {/* Page header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900">Traffic violations</h1>
          <p className="mt-1 text-sm text-slate-500">
            Reports from the app and model detections. Photos show detection frames when available.
          </p>
          <p className="mt-1 text-xs text-slate-400">
            Each row is one violation detection — one photo can produce multiple rows. Only reports that completed successfully (upload → analysis → save) appear here; failed uploads or detection do not create a row.
          </p>
        </div>

        {/* Metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {metrics.map((m) => {
            const Icon = m.icon;
            return (
              <div
                key={m.title}
                className={`${m.bgLight} rounded-xl border border-slate-200/80 p-4 flex items-center gap-4`}
              >
                <div className={`${m.color} rounded-lg p-2.5`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-600">{m.title}</p>
                  <p className={`text-2xl font-bold ${m.textColor}`}>{m.value}</p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Tabs */}
        <div className="border-b border-slate-200 mb-4">
          <nav className="flex gap-1" aria-label="Tabs">
            <button
              onClick={() => setActiveTab("violations")}
              className={`px-4 py-2.5 text-sm font-medium rounded-t-lg border-b-2 transition-colors ${
                activeTab === "violations"
                  ? "border-amber-500 text-amber-600 bg-amber-50/50"
                  : "border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-100/50"
              }`}
            >
              Violations ({modelViolations.total})
            </button>
            <button
              onClick={() => setActiveTab("officers")}
              className={`px-4 py-2.5 text-sm font-medium rounded-t-lg border-b-2 transition-colors ${
                activeTab === "officers"
                  ? "border-amber-500 text-amber-600 bg-amber-50/50"
                  : "border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-100/50"
              }`}
            >
              On-Duty Officers ({officers.length})
            </button>
          </nav>
        </div>

        {/* Violations tab: Last updated + Search + Table */}
        {activeTab === "violations" && (
          <>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
              <div className="flex items-center gap-2 text-sm text-slate-500">
                {modelViolations.lastUpdated ? (
                  <>
                    <ArrowPathIcon className="w-4 h-4" />
                    Last updated: {new Date(modelViolations.lastUpdated).toLocaleString()}
                  </>
                ) : (
                  <span>No data yet</span>
                )}
              </div>
              <div className="relative w-full sm:max-w-xs">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search by plate, location, violation type..."
                  className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-200 bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                />
              </div>
            </div>
          </>
        )}

        {/* Officers tab: Search */}
        {activeTab === "officers" && (
          <div className="mb-4">
            <div className="relative w-full sm:max-w-md">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                value={officerSearch}
                onChange={(e) => setOfficerSearch(e.target.value)}
                placeholder="Search by name, badge number, or location..."
                className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-200 bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
              />
            </div>
          </div>
        )}

        {/* Violations table */}
        {activeTab === "violations" && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          {violationsLoading ? (
            <div className="p-12 text-center text-slate-500">
              <ArrowPathIcon className="w-10 h-10 mx-auto animate-spin text-amber-500 mb-3" />
              <p>Loading violations…</p>
            </div>
          ) : filteredViolations.length === 0 ? (
            <div className="p-12 text-center">
              <PhotoIcon className="w-12 h-12 mx-auto text-slate-300 mb-3" />
              <p className="text-slate-600 font-medium">No violations to show</p>
              <p className="text-sm text-slate-500 mt-1">
                {searchTerm.trim()
                  ? "Try a different search."
                  : "Reports from the app will appear here after submission."}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200">
                <thead>
                  <tr className="bg-slate-50">
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                      Photo
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                      #
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                      Source
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                      Number plate(s)
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                      Violation type
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                      Confidence
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                      Location
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                      Detected at
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredViolations.map((v) => {
                    const plates = v.plates?.length ? v.plates : (modelViolations.platesBySource?.[v.sourceFile] ?? []);
                    return (
                      <tr key={v.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-4 py-3">
                          {v.imageUrl ? (
                            <div className="space-y-1">
                              <a
                                href={v.imageUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="block w-24 h-16 rounded-lg border border-slate-200 overflow-hidden bg-slate-100 focus:ring-2 focus:ring-amber-500 focus:ring-offset-1"
                              >
                                <img
                                  src={v.imageUrl}
                                  alt={v.sourceFile}
                                  className="w-full h-full object-cover"
                                  onError={(e) => {
                                    const img = e.currentTarget;
                                    const fallback = v.sourceFile
                                      ? `/api/traffic-violation/image/by-name?file=${encodeURIComponent(v.sourceFile)}`
                                      : null;
                                    if (fallback && img.src !== fallback) img.src = fallback;
                                  }}
                                />
                              </a>
                              {plates.length > 0 && (
                                <div className="text-[10px] font-mono text-slate-600 break-words max-w-[6rem]">
                                  {plates.map((p, i) => (
                                    <span key={i} className="block bg-slate-800 text-white px-1.5 py-0.5 rounded my-0.5 text-center">
                                      {p}
                                    </span>
                                  ))}
                                </div>
                              )}
                              {v.location && (
                                <div className="text-[10px] text-slate-600 flex items-start gap-0.5 mt-0.5 max-w-[6rem]" title={v.location}>
                                  <MapPinIcon className="w-3 h-3 text-blue-500 flex-shrink-0 mt-0.5" />
                                  <span className="break-words">{v.location}</span>
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="text-slate-400 text-sm">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm font-medium text-slate-900">{v.id}</td>
                        <td className="px-4 py-3 text-xs text-slate-500 font-mono max-w-[8rem] truncate" title={v.sourceFile}>
                          {v.sourceFile}
                        </td>
                        <td className="px-4 py-3">
                          {plates.length > 0 ? (
                            <div className="flex flex-wrap gap-1.5">
                              {plates.map((plate, idx) => (
                                <span
                                  key={idx}
                                  className="inline-flex font-mono font-bold text-sm px-2.5 py-1 rounded-md bg-slate-900 text-white border border-amber-400"
                                  title={/^\(plate \d+%\)$/.test(plate) ? "Plate region detected; OCR text not available. Install Tesseract on the server to extract plate numbers." : "Detected number plate"}
                                >
                                  {plate}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="text-slate-400 text-sm">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          {v.className === "No violations detected" ? (
                            <span className="text-slate-500 italic">No violations detected</span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5">
                              <ExclamationTriangleIcon className="w-4 h-4 text-amber-500 flex-shrink-0" />
                              {getViolationTypeLabel(v.className)}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <span
                            className={`font-semibold ${
                              v.confidence >= 70 ? "text-red-600" : v.confidence >= 50 ? "text-amber-600" : "text-slate-500"
                            }`}
                          >
                            {v.confidence > 0 ? `${v.confidence}%` : "—"}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-700 min-w-[12rem] max-w-[20rem]" title={v.location ?? undefined}>
                          {v.location ? (
                            <span className="inline-flex items-center gap-2">
                              <MapPinIcon className="w-4 h-4 text-blue-500 flex-shrink-0" aria-hidden />
                              <span className="break-words">{v.location}</span>
                            </span>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-500 whitespace-nowrap">
                          {new Date(v.detectedAt).toLocaleString()}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
        )}

        {/* On-Duty Officers */}
        {activeTab === "officers" && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <h2 className="text-lg font-semibold text-slate-900">Available on duty</h2>
              <button
                type="button"
                onClick={() => setAddOfficerOpen(true)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 font-medium text-sm"
              >
                <PlusIcon className="w-5 h-5" /> Add officer
              </button>
            </div>
            {filteredOfficers.length === 0 ? (
              <p className="text-slate-500 py-8 text-center">No officers match your search.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredOfficers.map((officer) => (
                  <div
                    key={officer.id}
                    className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start gap-4">
                      <div className="bg-blue-500 w-14 h-14 rounded-full flex items-center justify-center text-white font-semibold text-lg flex-shrink-0">
                        {getInitials(officer.name)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-base font-semibold text-slate-900">{officer.name}</h3>
                        <span className={`inline-flex mt-1 px-2 py-0.5 rounded-full text-xs font-medium ${getStatusStyle(officer.status)}`}>
                          {officer.status}
                        </span>
                        <dl className="mt-3 space-y-1 text-sm text-slate-600">
                          <div><span className="font-medium text-slate-500">Badge:</span> {officer.badgeNumber}</div>
                          <div><span className="font-medium text-slate-500">Location:</span> {officer.location}</div>
                          <div><span className="font-medium text-slate-500">Vehicle:</span> {officer.vehicle}</div>
                          <div><span className="font-medium text-slate-500">Active incidents:</span> {officer.activeIncidents}</div>
                        </dl>
                        {(assignedTasks[officer.id]?.length ?? 0) > 0 && (
                          <div className="mt-3 pt-3 border-t border-slate-100">
                            <p className="text-xs font-medium text-slate-500 mb-1">Assigned tasks</p>
                            <ul className="space-y-1">
                              {assignedTasks[officer.id].map((t) => (
                                <li key={t.id} className="flex items-start gap-2 text-sm">
                                  <span className="text-slate-700 flex-1">{t.description}</span>
                                  <button type="button" onClick={() => removeTask(officer.id, t.id)} className="text-slate-400 hover:text-red-500" title="Remove task">
                                    <XMarkIcon className="w-4 h-4" />
                                  </button>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                        <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-slate-100">
                          <button
                            type="button"
                            onClick={() => setChangeStatusOfficerId(officer.id)}
                            className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 text-sm font-medium"
                          >
                            <PencilSquareIcon className="w-4 h-4" /> Change status
                          </button>
                          <button
                            type="button"
                            onClick={() => { setAssignTaskOfficerId(officer.id); setAssignTaskForm({ description: "", violationId: "" }); }}
                            className="inline-flex items-center gap-1.5 px-3 py-2 bg-amber-50 text-amber-700 rounded-lg hover:bg-amber-100 text-sm font-medium border border-amber-200"
                          >
                            <ClipboardDocumentListIcon className="w-4 h-4" /> Assign task
                          </button>
                          <a href={`tel:${officer.phone}`} className="inline-flex items-center gap-2 px-3 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 text-sm font-medium">
                            <PhoneIcon className="w-4 h-4" /> Call
                          </a>
                          <button type="button" className="inline-flex items-center gap-2 px-3 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 text-sm font-medium">
                            <ChatBubbleLeftRightIcon className="w-4 h-4" /> Message
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Modal: Add officer */}
        {addOfficerOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setAddOfficerOpen(false)}>
            <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
              <h3 className="text-lg font-semibold text-slate-900">Add officer</h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Name *</label>
                  <input type="text" value={addOfficerForm.name} onChange={(e) => setAddOfficerForm((f) => ({ ...f, name: e.target.value }))} className="w-full px-3 py-2 border border-slate-200 rounded-lg" placeholder="Full name" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Badge number *</label>
                  <input type="text" value={addOfficerForm.badgeNumber} onChange={(e) => setAddOfficerForm((f) => ({ ...f, badgeNumber: e.target.value }))} className="w-full px-3 py-2 border border-slate-200 rounded-lg" placeholder="e.g. PD-4521" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Location</label>
                  <input type="text" value={addOfficerForm.location} onChange={(e) => setAddOfficerForm((f) => ({ ...f, location: e.target.value }))} className="w-full px-3 py-2 border border-slate-200 rounded-lg" placeholder="Current area" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Phone</label>
                  <input type="text" value={addOfficerForm.phone} onChange={(e) => setAddOfficerForm((f) => ({ ...f, phone: e.target.value }))} className="w-full px-3 py-2 border border-slate-200 rounded-lg" placeholder="+1 (555) 000-0000" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Vehicle</label>
                  <input type="text" value={addOfficerForm.vehicle} onChange={(e) => setAddOfficerForm((f) => ({ ...f, vehicle: e.target.value }))} className="w-full px-3 py-2 border border-slate-200 rounded-lg" placeholder="e.g. Unit 42" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
                  <select value={addOfficerForm.status} onChange={(e) => setAddOfficerForm((f) => ({ ...f, status: e.target.value as OfficerStatus }))} className="w-full px-3 py-2 border border-slate-200 rounded-lg">
                    {STATUS_OPTIONS.map((s) => (
                      <option key={s.value} value={s.value}>{s.label}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setAddOfficerOpen(false)} className="flex-1 px-4 py-2 border border-slate-200 rounded-lg text-slate-700 hover:bg-slate-50">Cancel</button>
                <button type="button" onClick={handleAddOfficer} className="flex-1 px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 font-medium">Add</button>
              </div>
            </div>
          </div>
        )}

        {/* Modal: Change status */}
        {changeStatusOfficerId != null && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setChangeStatusOfficerId(null)}>
            <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
              <h3 className="text-lg font-semibold text-slate-900">Change status</h3>
              <p className="text-sm text-slate-600">{officers.find((o) => o.id === changeStatusOfficerId)?.name}</p>
              <div className="space-y-2">
                {STATUS_OPTIONS.map((s) => (
                  <button key={s.value} type="button" onClick={() => handleChangeStatus(changeStatusOfficerId, s.value)} className={`w-full text-left px-4 py-2 rounded-lg border ${getStatusStyle(s.value)} font-medium`}>
                    {s.label}
                  </button>
                ))}
              </div>
              <button type="button" onClick={() => setChangeStatusOfficerId(null)} className="w-full px-4 py-2 border border-slate-200 rounded-lg text-slate-700 hover:bg-slate-50">Cancel</button>
            </div>
          </div>
        )}

        {/* Modal: Assign task */}
        {assignTaskOfficerId != null && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setAssignTaskOfficerId(null)}>
            <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
              <h3 className="text-lg font-semibold text-slate-900">Assign task</h3>
              <p className="text-sm text-slate-600">To: {officers.find((o) => o.id === assignTaskOfficerId)?.name}</p>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Task description *</label>
                <textarea value={assignTaskForm.description} onChange={(e) => setAssignTaskForm((f) => ({ ...f, description: e.target.value }))} rows={3} className="w-full px-3 py-2 border border-slate-200 rounded-lg" placeholder="Describe the task..." />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Link to violation (optional)</label>
                <select value={assignTaskForm.violationId} onChange={(e) => setAssignTaskForm((f) => ({ ...f, violationId: e.target.value }))} className="w-full px-3 py-2 border border-slate-200 rounded-lg">
                  <option value="">— None —</option>
                  {(modelViolations.violations ?? []).map((v) => (
                    <option key={v.id} value={v.id}>#{v.id} – {getViolationTypeLabel(v.className)} ({v.detectedAt ? new Date(v.detectedAt).toLocaleDateString() : ""})</option>
                  ))}
                </select>
              </div>
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setAssignTaskOfficerId(null)} className="flex-1 px-4 py-2 border border-slate-200 rounded-lg text-slate-700 hover:bg-slate-50">Cancel</button>
                <button type="button" onClick={handleAssignTask} disabled={!assignTaskForm.description.trim()} className="flex-1 px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 font-medium disabled:opacity-50 disabled:pointer-events-none">Assign</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TrafficViolationDashboard;
