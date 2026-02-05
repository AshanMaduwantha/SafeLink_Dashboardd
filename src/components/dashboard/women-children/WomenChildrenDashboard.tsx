"use client";

import React, { useState } from "react";
import { ChevronDownIcon } from "@heroicons/react/24/outline";

const WomenChildrenDashboard: React.FC = () => {
  const [view, setView] = useState<"table" | "heatmap">("table");
  const [heatmapView, setHeatmapView] = useState<"live" | "history">("live");

  const incidents = [
    {
      id: "INC001",
      victim: "Anonymous",
      dateTime: "2026-01-06 14:30",
      location: "Green Valley School, Mumbai",
      description: "Child reported verbal abuse by teacher",
      incident: "Children",
      incidentColor: "bg-blue-100 text-blue-700",
      severity: "High",
      severityColor: "bg-orange-100 text-orange-700",
    },
    {
      id: "INC002",
      victim: "Priya Sharma",
      dateTime: "2026-01-06 09:15",
      location: "Park Street, Kolkata",
      description: "Domestic violence",
      incident: "Women",
      incidentColor: "bg-red-100 text-red-700",
      severity: "Critical",
      severityColor: "bg-red-100 text-red-700",
    },
    {
      id: "INC003",
      victim: "Anonymous",
      dateTime: "2026-01-05 18:45",
      location: "Sector 15, Delhi",
      description: "Child found wandering",
      incident: "Children",
      incidentColor: "bg-blue-100 text-blue-700",
      severity: "Medium",
      severityColor: "bg-yellow-100 text-yellow-700",
    },
    {
      id: "INC004",
      victim: "Anita Desai",
      dateTime: "2026-01-05 22:00",
      location: "MG Road, Bangalore",
      description: "Harassment in public",
      incident: "Women",
      incidentColor: "bg-red-100 text-red-700",
      severity: "Medium",
      severityColor: "bg-yellow-100 text-yellow-700",
    },
    {
      id: "INC005",
      victim: "Rahul Kumar",
      dateTime: "2026-01-05 11:20",
      location: "St. Mary's School, Chennai",
      description: "Bullying incident",
      incident: "Women",
      incidentColor: "bg-red-100 text-red-700",
      severity: "Medium",
      severityColor: "bg-yellow-100 text-yellow-700",
    },
    {
      id: "INC006",
      victim: "Kavita Singh",
      dateTime: "2026-01-04 16:30",
      location: "Andheri West, Mumbai",
      description: "Workplace discrimination",
      incident: "Children",
      incidentColor: "bg-blue-100 text-blue-700",
      severity: "High",
      severityColor: "bg-orange-100 text-orange-700",
    },
  ];

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

  const summaryCards = [
    { title: "Highest Activity", value: "Downtown" },
    { title: "Total Areas", value: "7 Districts" },
    { title: "Coverage", value: "100%" },
  ];

  const legendItems = [
    { label: "Low", color: "bg-green-500" },
    { label: "Medium", color: "bg-yellow-500" },
    { label: "High", color: "bg-orange-500" },
    { label: "Critical", color: "bg-red-500" },
  ];

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
              <svg
                viewBox="0 0 800 400"
                className="w-full h-full"
                style={{ minHeight: "400px" }}
                preserveAspectRatio="xMidYMid meet"
              >
                <g>
                  <circle cx="200" cy="150" r="90" fill="rgba(239, 68, 68, 0.25)" />
                  <circle cx="200" cy="150" r="70" fill="rgba(239, 68, 68, 0.35)" />
                  <circle cx="200" cy="150" r="50" fill="rgba(249, 115, 22, 0.4)" />
                  <text
                    x="200"
                    y="155"
                    textAnchor="middle"
                    fill="#1f2937"
                    fontSize="14"
                    fontWeight="500"
                  >
                    Downtown
                  </text>

                  <circle cx="400" cy="100" r="80" fill="rgba(34, 197, 94, 0.25)" />
                  <circle cx="400" cy="100" r="60" fill="rgba(34, 197, 94, 0.35)" />
                  <circle cx="400" cy="100" r="45" fill="rgba(20, 184, 166, 0.4)" />
                  <text
                    x="400"
                    y="105"
                    textAnchor="middle"
                    fill="#1f2937"
                    fontSize="14"
                    fontWeight="500"
                  >
                    North District
                  </text>

                  <circle cx="500" cy="200" r="75" fill="rgba(34, 197, 94, 0.25)" />
                  <circle cx="500" cy="200" r="55" fill="rgba(34, 197, 94, 0.35)" />
                  <circle cx="500" cy="200" r="40" fill="rgba(20, 184, 166, 0.4)" />
                  <text
                    x="500"
                    y="205"
                    textAnchor="middle"
                    fill="#1f2937"
                    fontSize="14"
                    fontWeight="500"
                  >
                    Central Park
                  </text>

                  <circle cx="600" cy="150" r="70" fill="rgba(249, 115, 22, 0.25)" />
                  <circle cx="600" cy="150" r="50" fill="rgba(249, 115, 22, 0.35)" />
                  <circle cx="600" cy="150" r="35" fill="rgba(251, 146, 60, 0.4)" />
                  <text
                    x="600"
                    y="155"
                    textAnchor="middle"
                    fill="#1f2937"
                    fontSize="14"
                    fontWeight="500"
                  >
                    East Side
                  </text>

                  <circle cx="150" cy="250" r="65" fill="rgba(234, 179, 8, 0.25)" />
                  <circle cx="150" cy="250" r="45" fill="rgba(234, 179, 8, 0.35)" />
                  <circle cx="150" cy="250" r="30" fill="rgba(34, 197, 94, 0.4)" />
                  <text
                    x="150"
                    y="255"
                    textAnchor="middle"
                    fill="#1f2937"
                    fontSize="14"
                    fontWeight="500"
                  >
                    West End
                  </text>

                  <circle cx="350" cy="300" r="80" fill="rgba(239, 68, 68, 0.25)" />
                  <circle cx="350" cy="300" r="60" fill="rgba(239, 68, 68, 0.35)" />
                  <circle cx="350" cy="300" r="45" fill="rgba(249, 115, 22, 0.4)" />
                  <text
                    x="350"
                    y="305"
                    textAnchor="middle"
                    fill="#1f2937"
                    fontSize="14"
                    fontWeight="500"
                  >
                    South Quarter
                  </text>

                  <circle cx="550" cy="320" r="70" fill="rgba(234, 179, 8, 0.25)" />
                  <circle cx="550" cy="320" r="50" fill="rgba(234, 179, 8, 0.35)" />
                  <circle cx="550" cy="320" r="35" fill="rgba(251, 146, 60, 0.4)" />
                  <text
                    x="550"
                    y="325"
                    textAnchor="middle"
                    fill="#1f2937"
                    fontSize="14"
                    fontWeight="500"
                  >
                    Harbor Area
                  </text>

                  <path
                    d="M 180 120 Q 300 80 420 120 Q 520 140 620 120 Q 640 200 600 280 Q 500 320 400 300 Q 250 320 180 250 Z"
                    fill="none"
                    stroke="#9ca3af"
                    strokeWidth="2"
                    strokeDasharray="5,5"
                  />
                </g>
              </svg>
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
            <select className="appearance-none bg-white border border-gray-300 rounded-md px-4 py-2 pr-8 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent">
              <option>All Status</option>
              <option>Active</option>
              <option>Resolved</option>
              <option>Pending</option>
            </select>
            <ChevronDownIcon className="absolute right-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          </div>
          <div className="relative">
            <select className="appearance-none bg-white border border-gray-300 rounded-md px-4 py-2 pr-8 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent">
              <option>All Severity</option>
              <option>Critical</option>
              <option>High</option>
              <option>Medium</option>
              <option>Low</option>
            </select>
            <ChevronDownIcon className="absolute right-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          </div>
          <div className="relative">
            <select className="appearance-none bg-white border border-gray-300 rounded-md px-4 py-2 pr-8 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent">
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
          <button
            onClick={() => setView("heatmap")}
            className="px-4 py-2 bg-orange-500 text-white rounded-md hover:bg-orange-600 transition-colors text-sm font-medium"
          >
            Heat Map
          </button>
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
                    Incident ID
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Victim Details
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date & Time
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Location
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Description
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Incident
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Severity
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {incidents.map((incident) => (
                  <tr key={incident.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <input
                        type="checkbox"
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {incident.id}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {incident.victim}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {incident.dateTime}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {incident.location}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {incident.description}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${incident.incidentColor}`}
                      >
                        {incident.incident}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${incident.severityColor}`}
                      >
                        {incident.severity}
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