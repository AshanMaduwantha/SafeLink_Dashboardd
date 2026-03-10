"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDownIcon } from "@heroicons/react/24/outline";
import {
  GoogleMap,
  HeatmapLayer,
  MarkerF,
  useJsApiLoader,
  Libraries,
} from "@react-google-maps/api";

type IncidentItem = {
  _id: string;
  victim: string;
  dateTime: string;
  location: string;
  description: string;
  language?: string;
  incidentType: "Women" | "Children" | "Women & Children";
  severity: "Low" | "Medium" | "High" | "Critical";
  rawLabel?: string;
};

type VideoIncidentRow = {
  id: number;
  location: string;
  time: string;
  videourl: string;
};

type DetectState = "idle" | "loading" | "success" | "error";

type DetectResult = {
  victim: string;
  incidentType: string;
  rawLabel: string;
  severity: string;
  language: string;
  description: string;
};

const getIncidentColor = (incidentType: IncidentItem["incidentType"]) => {
  if (incidentType === "Women") return "bg-red-100 text-red-700";
  if (incidentType === "Women & Children") return "bg-purple-100 text-purple-700";
  return "bg-blue-100 text-blue-700";
};

const getSeverityColor = (severity: IncidentItem["severity"]) => {
  if (severity === "Critical") return "bg-red-100 text-red-700";
  if (severity === "High") return "bg-orange-100 text-orange-700";
  if (severity === "Medium") return "bg-yellow-100 text-yellow-700";
  return "bg-green-100 text-green-700";
};

const getRawLabelColor = (rawLabel: string) => {
  const label = rawLabel?.toLowerCase() ?? "";
  if (label.includes("harassment")) return "bg-red-100 text-red-700";
  if (label.includes("physical_assault") || label.includes("assault")) return "bg-orange-100 text-orange-700";
  if (label.includes("child_endangerment")) return "bg-purple-100 text-purple-700";
  if (label.includes("unsafe_transport")) return "bg-yellow-100 text-yellow-700";
  return "bg-blue-100 text-blue-700";
};

const parseDateTime = (value: string) => {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed;
};

const SEVERITY_WEIGHTS: Record<IncidentItem["severity"], number> = {
  Low: 1,
  Medium: 2,
  High: 3,
  Critical: 4,
};

const SEVERITY_HEAT_COLORS: Record<IncidentItem["severity"], string> = {
  Low: "rgba(34, 197, 94, 0.35)",
  Medium: "rgba(234, 179, 8, 0.35)",
  High: "rgba(249, 115, 22, 0.35)",
  Critical: "rgba(239, 68, 68, 0.35)",
};

const GOOGLE_MAP_LIBRARIES: Libraries = ["visualization"];
const DEFAULT_MAP_CENTER = { lat: 6.9271, lng: 79.8612 };

type HeatmapPoint = {
  location: string;
  incidentCount: number;
  weightedScore: number;
  dominantSeverity: IncidentItem["severity"];
};

const getLocationKey = (value: string) => value.trim().toLowerCase();

const parseLatLngFromLocation = (location: string) => {
  const trimmed = location.trim();
  const match = trimmed.match(
    /^(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)$/,
  );
  if (!match) return null;

  const lat = Number(match[1]);
  const lng = Number(match[2]);
  if (Number.isNaN(lat) || Number.isNaN(lng)) return null;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;

  return { lat, lng };
};

const formatDate = (value: string) => {
  const parsed = parseDateTime(value);
  if (!parsed) return value;
  return parsed.toLocaleDateString();
};

const formatTime = (value: string) => {
  const parsed = parseDateTime(value);
  if (!parsed) return value;
  return parsed.toLocaleTimeString();
};

const WomenChildrenDashboard: React.FC = () => {
  const [view, setView] = useState<"table" | "heatmap" | "video">("table");
  const [heatmapView, setHeatmapView] = useState<"live" | "history">("live");
  const [incidents, setIncidents] = useState<IncidentItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [severityFilter, setSeverityFilter] = useState("All Severity");
  const [categoryFilter, setCategoryFilter] = useState("All Categories");

  // Video Incidents (NeonDB)
  const [videoIncidents, setVideoIncidents] = useState<VideoIncidentRow[]>([]);
  const [videoLoading, setVideoLoading] = useState(false);
  const [videoError, setVideoError] = useState<string | null>(null);
  const [detectStates, setDetectStates] = useState<Record<number, DetectState>>(() => {
    try {
      const raw = localStorage.getItem("safelink_detect_states");
      return raw ? (JSON.parse(raw) as Record<number, DetectState>) : {};
    } catch {
      return {};
    }
  });
  const [detectResults, setDetectResults] = useState<Record<number, DetectResult | string>>(() => {
    try {
      const raw = localStorage.getItem("safelink_detect_results");
      return raw ? (JSON.parse(raw) as Record<number, DetectResult | string>) : {};
    } catch {
      return {};
    }
  });
  const [geoPoints, setGeoPoints] = useState<
    Array<{
      location: string;
      position: { lat: number; lng: number };
      weight: number;
      incidentCount: number;
      dominantSeverity: IncidentItem["severity"];
    }>
  >([]);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [geocodingError, setGeocodingError] = useState<string | null>(null);
  const [nowTimestamp, setNowTimestamp] = useState<number | null>(null);
  const geocodeCache = useRef<Map<string, { lat: number; lng: number } | null>>(
    new Map(),
  );

  const googleMapsApiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "";
  const { isLoaded: isMapLoaded, loadError } = useJsApiLoader({
    id: "incident-heatmap-script",
    googleMapsApiKey,
    libraries: GOOGLE_MAP_LIBRARIES,
  });

  useEffect(() => {
    setNowTimestamp(Date.now());
    const intervalId = window.setInterval(() => {
      setNowTimestamp(Date.now());
    }, 60_000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, []);

  useEffect(() => {
    const loadIncidents = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const params = new URLSearchParams();
        if (severityFilter !== "All Severity") {
          params.set("severity", severityFilter);
        }
        if (categoryFilter !== "All Categories") {
          params.set("incidentType", categoryFilter);
        }

        const query = params.toString();
        const endpoint = query ? `/api/incidents?${query}` : "/api/incidents";
        const response = await fetch(endpoint);

        if (!response.ok) {
          throw new Error("Failed to load incidents");
        }

        const data = await response.json();
        setIncidents(data.incidents || []);
      } catch (_error) {
        setError("Could not load incidents from MongoDB.");
      } finally {
        setIsLoading(false);
      }
    };

    loadIncidents();
  }, [severityFilter, categoryFilter]);

  useEffect(() => {
    if (view !== "video") return;
    const loadVideoIncidents = async () => {
      try {
        setVideoLoading(true);
        setVideoError(null);
        const res = await fetch("/api/video-incidents");
        if (!res.ok) throw new Error("Failed to load video incidents");
        const data = await res.json();
        setVideoIncidents(data.incidents || []);
      } catch {
        setVideoError("Could not load video incidents from database.");
      } finally {
        setVideoLoading(false);
      }
    };
    loadVideoIncidents();
  }, [view]);

  const handleDetect = async (row: VideoIncidentRow) => {
    setDetectStates((prev) => ({ ...prev, [row.id]: "loading" }));
    setDetectResults((prev) => {
      const next = { ...prev };
      delete next[row.id];
      return next;
    });
    try {
      const res = await fetch("/api/detect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          videourl: row.videourl,
          location: row.location,
          datetime: row.time,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Detection failed");

      setDetectStates((prev) => {
        const next = { ...prev, [row.id]: "success" as DetectState };
        try { localStorage.setItem("safelink_detect_states", JSON.stringify(next)); } catch {}
        return next;
      });
      setDetectResults((prev) => {
        const next = { ...prev, [row.id]: data as DetectResult };
        try { localStorage.setItem("safelink_detect_results", JSON.stringify(next)); } catch {}
        return next;
      });
    } catch (err: unknown) {
      setDetectStates((prev) => ({ ...prev, [row.id]: "error" }));
      setDetectResults((prev) => ({
        ...prev,
        [row.id]: err instanceof Error ? err.message : "Detection failed",
      }));
    }
  };

  const heatmapPoints = useMemo(() => {
    if (nowTimestamp === null) return [];
    const now = nowTimestamp;
    const oneDayAgo = now - 24 * 60 * 60 * 1000;
    const incidentsForView =
      heatmapView === "live"
        ? incidents.filter((incident) => {
            const incidentDate = parseDateTime(incident.dateTime);
            return incidentDate ? incidentDate.getTime() >= oneDayAgo : false;
          })
        : incidents;

    const groupedByLocation = new Map<
      string,
      {
        location: string;
        incidentCount: number;
        weightedScore: number;
        severityCount: Record<IncidentItem["severity"], number>;
      }
    >();

    for (const incident of incidentsForView) {
      const key = getLocationKey(incident.location);
      const existing = groupedByLocation.get(key);
      if (existing) {
        existing.incidentCount += 1;
        existing.weightedScore += SEVERITY_WEIGHTS[incident.severity];
        existing.severityCount[incident.severity] += 1;
      } else {
        groupedByLocation.set(key, {
          location: incident.location.trim(),
          incidentCount: 1,
          weightedScore: SEVERITY_WEIGHTS[incident.severity],
          severityCount: {
            Low: incident.severity === "Low" ? 1 : 0,
            Medium: incident.severity === "Medium" ? 1 : 0,
            High: incident.severity === "High" ? 1 : 0,
            Critical: incident.severity === "Critical" ? 1 : 0,
          },
        });
      }
    }

    const points = Array.from(groupedByLocation.values()).map((group) => {
      const severities: IncidentItem["severity"][] = [
        "Critical",
        "High",
        "Medium",
        "Low",
      ];
      let dominantSeverity: IncidentItem["severity"] = "Low";
      let dominantCount = -1;
      for (const severity of severities) {
        const count = group.severityCount[severity];
        if (count > dominantCount) {
          dominantSeverity = severity;
          dominantCount = count;
        }
      }
      return {
        location: group.location,
        incidentCount: group.incidentCount,
        weightedScore: group.weightedScore,
        dominantSeverity,
      };
    });

    return points;
  }, [heatmapView, incidents, nowTimestamp]);

  const liveIncidentCount = useMemo(() => {
    if (nowTimestamp === null) return 0;
    const now = nowTimestamp;
    const oneDayAgo = now - 24 * 60 * 60 * 1000;
    return incidents.filter((incident) => {
      const incidentDate = parseDateTime(incident.dateTime);
      return incidentDate ? incidentDate.getTime() >= oneDayAgo : false;
    }).length;
  }, [incidents, nowTimestamp]);

  useEffect(() => {
    if (!isMapLoaded) {
      return;
    }
    if (heatmapPoints.length === 0) {
      setGeoPoints([]);
      setGeocodingError(null);
      return;
    }

    let isCancelled = false;
    const geocoder = new window.google.maps.Geocoder();

    const geocodeLocations = async () => {
      try {
        setIsGeocoding(true);
        setGeocodingError(null);

        const results = await Promise.all(
          heatmapPoints.map(async (point) => {
            const locationKey = getLocationKey(point.location);
            const cached = geocodeCache.current.get(locationKey);
            if (cached === null) return null;
            if (cached) {
              return {
                location: point.location,
                position: cached,
                weight: point.weightedScore,
                incidentCount: point.incidentCount,
                dominantSeverity: point.dominantSeverity,
              };
            }

            const directCoordinates = parseLatLngFromLocation(point.location);
            if (directCoordinates) {
              geocodeCache.current.set(locationKey, directCoordinates);
              return {
                location: point.location,
                position: directCoordinates,
                weight: point.weightedScore,
                incidentCount: point.incidentCount,
                dominantSeverity: point.dominantSeverity,
              };
            }

            const geocodeQuery = async (address: string) =>
              new Promise<{ lat: number; lng: number } | null>((resolve) => {
                geocoder.geocode({ address }, (response, status) => {
                  if (
                    status === window.google.maps.GeocoderStatus.OK &&
                    response &&
                    response[0]
                  ) {
                    const location = response[0].geometry.location;
                    resolve({
                      lat: location.lat(),
                      lng: location.lng(),
                    });
                    return;
                  }
                  resolve(null);
                });
              });

            const fallbackQueries = [
              point.location,
              `${point.location}, Sri Lanka`,
              `${point.location}, Colombo, Sri Lanka`,
            ];

            let resolvedPosition: { lat: number; lng: number } | null = null;
            for (const query of fallbackQueries) {
              resolvedPosition = await geocodeQuery(query);
              if (resolvedPosition) break;
            }

            geocodeCache.current.set(locationKey, resolvedPosition);

            if (!resolvedPosition) return null;

            return {
              location: point.location,
              position: resolvedPosition,
              weight: point.weightedScore,
              incidentCount: point.incidentCount,
              dominantSeverity: point.dominantSeverity,
            };
          }),
        );

        if (isCancelled) return;

        const validPoints = results.filter(
          (
            item,
          ): item is {
            location: string;
            position: { lat: number; lng: number };
            weight: number;
            incidentCount: number;
            dominantSeverity: IncidentItem["severity"];
          } => item !== null,
        );
        setGeoPoints(validPoints);
        if (validPoints.length === 0) {
          setGeocodingError(
            "Could not geocode incident locations. Use recognizable place names.",
          );
        }
      } catch (_error) {
        if (!isCancelled) {
          setGeoPoints([]);
          setGeocodingError("Failed to geocode locations for heatmap.");
        }
      } finally {
        if (!isCancelled) {
          setIsGeocoding(false);
        }
      }
    };

    geocodeLocations();

    return () => {
      isCancelled = true;
    };
  }, [heatmapPoints, isMapLoaded]);

  const mapCenter = useMemo(() => {
    if (geoPoints.length === 0) return DEFAULT_MAP_CENTER;
    const totals = geoPoints.reduce(
      (accumulator, point) => {
        accumulator.lat += point.position.lat;
        accumulator.lng += point.position.lng;
        return accumulator;
      },
      { lat: 0, lng: 0 },
    );
    return {
      lat: totals.lat / geoPoints.length,
      lng: totals.lng / geoPoints.length,
    };
  }, [geoPoints]);

  const heatmapData = useMemo(() => {
    if (!isMapLoaded) return [];
    return geoPoints.map((point) => ({
      location: new window.google.maps.LatLng(
        point.position.lat,
        point.position.lng,
      ),
      weight: point.weight,
    }));
  }, [geoPoints, isMapLoaded]);

  const summaryCards = useMemo(() => {
    const highestActivityPoint = heatmapPoints.reduce<HeatmapPoint | null>(
      (top, point) =>
        !top || point.incidentCount > top.incidentCount ? point : top,
      null,
    );
    const visibleIncidents = heatmapPoints.reduce(
      (total, point) => total + point.incidentCount,
      0,
    );

    return [
      {
        title: "Highest Activity",
        value: highestActivityPoint
          ? `${highestActivityPoint.location} (${highestActivityPoint.incidentCount})`
          : "No Data",
      },
      { title: "Total Areas", value: `${heatmapPoints.length}` },
      { title: "Coverage", value: `${visibleIncidents} incidents` },
    ];
  }, [heatmapPoints]);

  /* const metrics = [
    {
      id: 1,
      title: "Total Incidents",
      value: "1,247",
      subtitle: "Last 24 hours",
      trend: { value: "+12%", direction: "up", color: "red" },
      iconColor: "bg-blue-500",
    },
    {
      id: 2,
      title: "Active Cases",
      value: "89",
      subtitle: "Currently ongoing",
      trend: { value: "-5%", direction: "down", color: "green" },
      iconColor: "bg-orange-500",
    },
    {
      id: 3,
      title: "High Priority",
      value: "23",
      subtitle: "Requires attention",
      trend: { value: "+8%", direction: "up", color: "red" },
      iconColor: "bg-red-500",
    },
    {
      id: 4,
      title: "Response Time",
      value: "4.2m",
      subtitle: "Average response",
      trend: { value: "-15%", direction: "down", color: "green" },
      iconColor: "bg-green-500",
    },
  ]; */

  const legendItems = [
    { label: "Low", color: "bg-green-500" },
    { label: "Medium", color: "bg-yellow-500" },
    { label: "High", color: "bg-orange-500" },
    { label: "Critical", color: "bg-red-500" },
  ];

  /*video incidents section*/

  if (view === "video") {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6">
          <div className="mb-4 flex items-center justify-between">
            <button
              onClick={() => setView("table")}
              className="text-sm text-gray-600 hover:text-gray-900"
            >
              ← Back to Table
            </button>
            <h2 className="text-lg font-semibold text-gray-900">
              Video Incidents
            </h2>
            <span className="text-xs text-gray-400">
              Click Detect to analyse a video
            </span>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    {["Location", "Time", "Video URL", "Action", "Result"].map(
                      (h) => (
                        <th
                          key={h}
                          scope="col"
                          className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                        >
                          {h}
                        </th>
                      ),
                    )}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {videoLoading && (
                    <tr>
                      <td
                        colSpan={6}
                        className="px-6 py-10 text-sm text-center text-gray-500"
                      >
                        Loading video incidents...
                      </td>
                    </tr>
                  )}
                  {!videoLoading && videoError && (
                    <tr>
                      <td
                        colSpan={6}
                        className="px-6 py-10 text-sm text-center text-red-600"
                      >
                        {videoError}
                      </td>
                    </tr>
                  )}
                  {!videoLoading && !videoError && videoIncidents.length === 0 && (
                    <tr>
                      <td
                        colSpan={6}
                        className="px-6 py-10 text-sm text-center text-gray-500"
                      >
                        No video incidents found.
                      </td>
                    </tr>
                  )}
                  {!videoLoading &&
                    !videoError &&
                    videoIncidents.map((row) => {
                      const state = detectStates[row.id] ?? "idle";
                      const result = detectResults[row.id];
                      return (
                        <tr key={row.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 text-sm text-gray-700">
                            {row.location}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-600 whitespace-nowrap">
                            {new Date(row.time).toLocaleString()}
                          </td>
                          <td className="px-6 py-4 text-sm text-blue-600 max-w-xs truncate">
                            <a
                              href={row.videourl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="hover:underline"
                            >
                              {row.videourl}
                            </a>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <button
                              onClick={() => handleDetect(row)}
                              disabled={state === "loading"}
                              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                                state === "loading"
                                  ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                                  : state === "success"
                                    ? "bg-green-600 text-white hover:bg-green-700"
                                    : state === "error"
                                      ? "bg-red-600 text-white hover:bg-red-700"
                                      : "bg-blue-600 text-white hover:bg-blue-700"
                              }`}
                            >
                              {state === "loading"
                                ? "Detecting…"
                                : state === "success"
                                  ? "Detected ✓"
                                  : state === "error"
                                    ? "Retry"
                                    : "Detect"}
                            </button>
                          </td>
                          <td className="px-6 py-4 text-sm">
                            {state === "loading" && (
                              <span className="text-gray-400 text-xs">
                                Running detection, please wait…
                              </span>
                            )}
                            {state === "success" && typeof result === "object" && (
                              <div className="space-y-0.5 text-xs text-gray-700">
                                <p>
                                  <span className="font-medium">Victim:</span>{" "}
                                  {result.victim}
                                </p>
                                <p>
                                  <span className="font-medium">Type:</span>{" "}
                                  {result.incidentType}
                                </p>
                                <p>
                                  <span className="font-medium">Incident Type:</span>{" "}
                                  {result.rawLabel
                                    ? result.rawLabel.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
                                    : "—"}
                                </p>
                              </div>
                            )}
                            {state === "error" && typeof result === "string" && (
                              <span className="text-xs text-red-600">{result}</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (view === "heatmap") {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6">
          <div className="mb-4">
            <button
              onClick={() => setView("table")}
              className="text-sm text-gray-600 hover:text-gray-900 mb-4"
            >
              ← Back to Table
            </button>
          </div>

          {/* City Incident Heatmap Section */}
          <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200 mb-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  City Incident Heatmap
                </h2>
                <p className="text-sm text-gray-500">
                  Geographic distribution of incidents
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setHeatmapView("live")}
                  className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                    heatmapView === "live"
                      ? "bg-blue-600 text-white"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  Live
                </button>
                <button
                  onClick={() => setHeatmapView("history")}
                  className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                    heatmapView === "history"
                      ? "bg-blue-600 text-white"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  History
                </button>
              </div>
            </div>

            {/* Heatmap Visualization */}
            <div
              className="relative bg-gray-50 rounded-lg p-8 mb-6"
              style={{ minHeight: "400px" }}
            >
              {!googleMapsApiKey && (
                <div className="absolute inset-0 flex items-center justify-center text-sm text-red-600">
                  Add NEXT_PUBLIC_GOOGLE_MAPS_API_KEY to enable Google heatmap.
                </div>
              )}
              {googleMapsApiKey && loadError && (
                <div className="absolute inset-0 flex items-center justify-center text-sm text-red-600">
                  Failed to load Google Maps. Check API key and allowed domains.
                </div>
              )}
              {googleMapsApiKey && isMapLoaded && !loadError && (
                <GoogleMap
                  mapContainerStyle={{ width: "100%", height: "400px" }}
                  options={{
                    disableDefaultUI: false,
                    zoomControl: true,
                    streetViewControl: false,
                    mapTypeControl: false,
                    fullscreenControl: false,
                  }}
                  center={mapCenter}
                  zoom={geoPoints.length > 0 ? 11 : 8}
                >
                  {heatmapData.length > 0 && (
                    <HeatmapLayer
                      data={heatmapData}
                      options={{
                        radius: 35,
                        opacity: 0.75,
                      }}
                    />
                  )}
                  {geoPoints.map((point) => (
                    <MarkerF
                      key={point.location}
                      position={point.position}
                      label={{
                        text: `${point.incidentCount}`,
                        color: "#111827",
                        fontWeight: "700",
                      }}
                      icon={{
                        path: window.google.maps.SymbolPath.CIRCLE,
                        scale: 10,
                        fillColor: SEVERITY_HEAT_COLORS[point.dominantSeverity],
                        fillOpacity: 1,
                        strokeColor: "#1f2937",
                        strokeWeight: 1,
                      }}
                      title={`${point.location}: ${point.incidentCount} incidents`}
                    />
                  ))}
                </GoogleMap>
              )}
              {googleMapsApiKey &&
                isMapLoaded &&
                !loadError &&
                !isGeocoding &&
                !geocodingError &&
                heatmapData.length === 0 && (
                  <div className="absolute inset-0 flex items-center justify-center text-sm text-gray-500">
                    {heatmapPoints.length === 0
                      ? heatmapView === "live" && incidents.length > 0 && liveIncidentCount === 0
                        ? "No incidents in the last 24 hours. Switch to History."
                        : "No incidents available for this view."
                      : "No geocoded locations available for this view."}
                  </div>
                )}
              {googleMapsApiKey && isMapLoaded && !loadError && isGeocoding && (
                <div className="absolute inset-0 flex items-center justify-center text-sm text-gray-500 bg-white/65">
                  Geocoding locations...
                </div>
              )}
              {googleMapsApiKey && isMapLoaded && !loadError && geocodingError && (
                <div className="absolute inset-0 flex items-center justify-center text-sm text-gray-500">
                  {geocodingError}
                </div>
              )}
            </div>

            <div className="flex items-center gap-6">
              <span className="text-sm font-medium text-gray-700">Legend:</span>
              {legendItems.map((item, index) => (
                <div key={index} className="flex items-center gap-2">
                  <div className={`${item.color} w-4 h-4 rounded-full`}></div>
                  <span className="text-sm text-gray-600">{item.label}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {summaryCards.map((card, index) => (
              <div
                key={index}
                className="bg-white rounded-lg shadow-sm p-6 border border-gray-200"
              >
                <h3 className="text-sm font-medium text-gray-600 mb-2">
                  {card.title}
                </h3>
                <p className="text-2xl font-semibold text-gray-900">
                  {card.value}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6">
        {/* Filters and Heat Map Button */}
        <div className="mb-6 flex flex-wrap items-center gap-4 justify-between">
          <div className="flex flex-wrap gap-4">
          <div className="relative">
            <select className="appearance-none bg-white border border-gray-300 rounded-md px-4 py-2 pr-8 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent">
              <option>Today</option>
              <option>Yesterday</option>
              <option>This Week</option>
              <option>This Month</option>
            </select>
            <ChevronDownIcon className="absolute right-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          </div>
          <div className="relative">
            <select
              value={severityFilter}
              onChange={(event) => setSeverityFilter(event.target.value)}
              className="appearance-none bg-white border border-gray-300 rounded-md px-4 py-2 pr-8 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option>All Severity</option>
              <option>Critical</option>
              <option>High</option>
              <option>Medium</option>
              <option>Low</option>
            </select>
            <ChevronDownIcon className="absolute right-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          </div>
          <div className="relative">
            <select
              value={categoryFilter}
              onChange={(event) => setCategoryFilter(event.target.value)}
              className="appearance-none bg-white border border-gray-300 rounded-md px-4 py-2 pr-8 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option>All Categories</option>
              <option>Women</option>
              <option>Children</option>
            </select>
            <ChevronDownIcon className="absolute right-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          </div>
          <div className="relative">
            <select className="appearance-none bg-white border border-gray-300 rounded-md px-4 py-2 pr-8 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent">
              <option>Date</option>
              <option>Newest First</option>
              <option>Oldest First</option>
            </select>
            <ChevronDownIcon className="absolute right-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setView("video")}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm font-medium"
            >
              Video Incidents
            </button>
            <button
              onClick={() => setView("heatmap")}
              className="px-4 py-2 bg-orange-500 text-white rounded-md hover:bg-orange-600 transition-colors text-sm font-medium"
            >
              Heat Map
            </button>
          </div>
        </div>

        {/* Incidents Table */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <input
                      type="checkbox"
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Victim Details
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Time
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Location
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Language
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Incident
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Incident Type
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {isLoading && (
                  <tr>
                    <td
                      colSpan={9}
                      className="px-6 py-10 text-sm text-center text-gray-500"
                    >
                      Loading incidents...
                    </td>
                  </tr>
                )}
                {!isLoading && error && (
                  <tr>
                    <td
                      colSpan={9}
                      className="px-6 py-10 text-sm text-center text-red-600"
                    >
                      {error}
                    </td>
                  </tr>
                )}
                {!isLoading && !error && incidents.length === 0 && (
                  <tr>
                    <td
                      colSpan={9}
                      className="px-6 py-10 text-sm text-center text-gray-500"
                    >
                      No incidents found.
                    </td>
                  </tr>
                )}
                {!isLoading &&
                  !error &&
                  incidents.filter((incident) => incident.rawLabel !== "normal_other").map((incident) => (
                  <tr key={incident._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <input
                        type="checkbox"
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {incident.victim}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {formatDate(incident.dateTime)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {formatTime(incident.dateTime)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {incident.location}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {incident.language || "English"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getIncidentColor(incident.incidentType)}`}
                      >
                        {incident.incidentType}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getRawLabelColor(incident.rawLabel ?? "")}`}
                      >
                        {incident.rawLabel}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WomenChildrenDashboard;
