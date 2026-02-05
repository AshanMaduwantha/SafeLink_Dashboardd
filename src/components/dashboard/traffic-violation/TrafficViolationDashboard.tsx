"use client";

import React, { useState } from "react";
import {
  UserGroupIcon,
  ExclamationTriangleIcon,
  TruckIcon,
  ShieldCheckIcon,
  PhoneIcon,
  ChatBubbleLeftRightIcon,
  MagnifyingGlassIcon,
  MapPinIcon,
  ClockIcon,
} from "@heroicons/react/24/outline";

const TrafficViolationDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<"officers" | "violations">("officers");
  const [searchTerm, setSearchTerm] = useState("");

  const metrics = [
    {
      id: 1,
      title: "Active Officers",
      value: "5",
      trend: { value: "↑ 12% from last week", direction: "up", color: "green" },
      icon: UserGroupIcon,
      iconColor: "text-blue-600",
    },
    {
      id: 2,
      title: "Total Violations Today",
      value: "8",
      trend: { value: "↓ 8% from last week", direction: "down", color: "red" },
      icon: ExclamationTriangleIcon,
      iconColor: "text-orange-600",
    },
    {
      id: 3,
      title: "Pending Violations",
      value: "3",
      trend: null,
      icon: TruckIcon,
      iconColor: "text-gray-600",
    },
    {
      id: 4,
      title: "Active Incidents",
      value: "6",
      trend: null,
      icon: ShieldCheckIcon,
      iconColor: "text-blue-600",
    },
  ];

  const officers = [
    {
      id: 1,
      name: "John Martinez",
      initials: "JM",
      badgeNumber: "PD-4521",
      location: "Downtown District, 5th Avenue",
      phone: "+1 (555) 123-4567",
      vehicle: "Unit 42",
      activeIncidents: 2,
      status: "On Patrol",
      statusColor: "bg-blue-100 text-blue-700",
      avatarColor: "bg-blue-500",
      statusDot: null,
    },
    {
      id: 2,
      name: "Sarah Johnson",
      initials: "SJ",
      badgeNumber: "PD-3892",
      location: "North Quarter, Main Street",
      phone: "+1 (555) 234-5678",
      vehicle: "Unit 15",
      activeIncidents: 0,
      status: "Available",
      statusColor: "bg-green-100 text-green-700",
      avatarColor: "bg-blue-400",
      statusDot: "bg-green-500",
    },
    {
      id: 3,
      name: "Michael Chen",
      initials: "MC",
      badgeNumber: "PD-5104",
      location: "East Side, Highway 101",
      phone: "+1 (555) 345-6789",
      vehicle: "Unit 28",
      activeIncidents: 1,
      status: "Responding",
      statusColor: "bg-orange-100 text-orange-700",
      avatarColor: "bg-blue-400",
      statusDot: "bg-orange-500",
    },
    {
      id: 4,
      name: "Emily Rodriguez",
      initials: "ER",
      badgeNumber: "PD-4783",
      location: "West End, Park Boulevard",
      phone: "+1 (555) 456-7890",
      vehicle: "Unit 33",
      activeIncidents: 0,
      status: "Available",
      statusColor: "bg-green-100 text-green-700",
      avatarColor: "bg-blue-400",
      statusDot: "bg-green-500",
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6">
        {/* Metrics Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
          {metrics.map((metric) => {
            const IconComponent = metric.icon;
            return (
              <div
                key={metric.id}
                className="bg-gray-100 rounded-lg p-6 border border-gray-200"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className={`${metric.iconColor} flex-shrink-0`}>
                    <IconComponent className="w-8 h-8" />
                  </div>
                  {metric.trend && (
                    <div
                      className={`text-xs font-medium ${
                        metric.trend.color === "green"
                          ? "text-green-600"
                          : "text-red-600"
                      }`}
                    >
                      {metric.trend.value}
                    </div>
                  )}
                </div>
                <div className="mb-1">
                  <h3 className="text-sm font-medium text-gray-600">
                    {metric.title}
                  </h3>
                </div>
                <div>
                  <p className="text-3xl font-semibold text-gray-900">
                    {metric.value}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Category Tabs */}
        <div className="mb-4">
          <div className="flex items-center justify-between border-b border-gray-200">
            <div className="flex gap-2">
              <button
                onClick={() => setActiveTab("officers")}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === "officers"
                    ? "border-gray-900 text-gray-900 bg-gray-50"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                On-Duty Officers (5)
              </button>
              <button
                onClick={() => setActiveTab("violations")}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === "violations"
                    ? "border-gray-900 text-gray-900 bg-gray-50"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                Violations (8)
              </button>
            </div>
            {activeTab === "violations" && (
              <div className="flex gap-2">
                <span className="px-3 py-1 text-xs font-medium bg-red-100 text-red-700 rounded">
                  High: 3
                </span>
                <span className="px-3 py-1 text-xs font-medium bg-orange-100 text-orange-700 rounded">
                  Medium: 3
                </span>
                <span className="px-3 py-1 text-xs font-medium bg-blue-100 text-blue-700 rounded">
                  Low: 2
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Search Bar */}
        <div className="mb-6">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <MagnifyingGlassIcon
                className="h-5 w-5 text-gray-400"
                aria-hidden="true"
              />
            </div>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg bg-gray-100 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Search by name, badge number, or location..."
            />
          </div>
        </div>

        {/* Officer Cards Grid */}
        {activeTab === "officers" && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
            {officers.map((officer) => (
              <div
                key={officer.id}
                className="bg-white rounded-lg shadow-sm p-6 border border-gray-200"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-4">
                    <div className="relative">
                      <div
                        className={`${officer.avatarColor} w-16 h-16 rounded-full flex items-center justify-center text-white font-semibold text-lg`}
                      >
                        {officer.initials}
                      </div>
                      {officer.statusDot && (
                        <div
                          className={`absolute bottom-0 right-0 ${officer.statusDot} w-4 h-4 rounded-full border-2 border-white`}
                        />
                      )}
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-1">
                        {officer.name}
                      </h3>
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${officer.statusColor}`}
                      >
                        {officer.status}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="space-y-2 mb-4">
                  <div className="text-sm text-gray-600">
                    <span className="font-medium">Badge:</span> {officer.badgeNumber}
                  </div>
                  <div className="text-sm text-gray-600">
                    <span className="font-medium">Location:</span> {officer.location}
                  </div>
                  <div className="text-sm text-gray-600">
                    <span className="font-medium">Phone:</span> {officer.phone}
                  </div>
                  <div className="text-sm text-gray-600">
                    <span className="font-medium">Vehicle:</span> {officer.vehicle}
                  </div>
                  <div className="text-sm text-gray-600">
                    <span className="font-medium">Active Incidents:</span>{" "}
                    <span className="font-semibold text-gray-900">
                      {officer.activeIncidents}
                    </span>
                  </div>
                </div>

                <div className="flex gap-3 pt-4 border-t border-gray-200">
                  <button className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors text-sm font-medium">
                    <PhoneIcon className="w-4 h-4" />
                    Call
                  </button>
                  <button className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium">
                    <ChatBubbleLeftRightIcon className="w-4 h-4" />
                    Message
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Violations Tab Content */}
        {activeTab === "violations" && (
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-6">
              Showing all traffic violations detected in the current area
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Violation Card 1 */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                <div className="relative">
                  {/* Placeholder for vehicle image */}
                  <div className="w-full h-48 bg-gradient-to-br from-gray-200 to-gray-300 relative overflow-hidden">
                    {/* Simulated road with vehicle */}
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-32 h-20 bg-white rounded-lg shadow-lg transform rotate-12"></div>
                    </div>
                    {/* License Plate Overlay */}
                    <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-yellow-300 px-3 py-1 rounded border-2 border-yellow-400">
                      <span className="text-xs font-bold text-gray-900">USA ABC-1234</span>
                    </div>
                    {/* HIGH PRIORITY Tag */}
                    <div className="absolute top-2 right-2 bg-red-600 text-white px-2 py-1 rounded text-xs font-semibold">
                      HIGH PRIORITY
                    </div>
                  </div>
                </div>
                <div className="p-4">
                  {/* Violation Details */}
                  <div className="flex items-center gap-2 mb-3">
                    <ExclamationTriangleIcon className="w-5 h-5 text-red-600" />
                    <span className="text-sm font-semibold text-gray-900">
                      Speeding - 85 mph in 55 mph zone
                    </span>
                  </div>
                  <div className="mb-3">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                      Assigned
                    </span>
                  </div>
                  
                  {/* Vehicle Info */}
                  <div className="flex items-center gap-2 mb-2 text-sm text-gray-600">
                    <TruckIcon className="w-4 h-4" />
                    <span>Sedan • ABC-1234</span>
                  </div>
                  
                  {/* Location */}
                  <div className="flex items-start gap-2 mb-2 text-sm text-gray-600">
                    <MapPinIcon className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <div>
                      <div>Highway 101, Mile Marker 45</div>
                      <div className="text-xs text-gray-500">37.774929, -122.419416</div>
                    </div>
                  </div>
                  
                  {/* Timestamp */}
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <ClockIcon className="w-4 h-4" />
                    <span>2026-01-06 14:23:45</span>
                  </div>
                </div>
              </div>

              {/* Violation Card 2 */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                <div className="relative">
                  {/* Placeholder for vehicle image */}
                  <div className="w-full h-48 bg-gradient-to-br from-amber-100 to-orange-200 relative overflow-hidden">
                    {/* Simulated road with vehicle */}
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-36 h-24 bg-white rounded-lg shadow-lg transform -rotate-6"></div>
                    </div>
                    {/* License Plate Overlay */}
                    <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-yellow-300 px-3 py-1 rounded border-2 border-yellow-400">
                      <span className="text-xs font-bold text-gray-900">USA XYZ-5678</span>
                    </div>
                    {/* HIGH PRIORITY Tag */}
                    <div className="absolute top-2 right-2 bg-red-600 text-white px-2 py-1 rounded text-xs font-semibold">
                      HIGH PRIORITY
                    </div>
                  </div>
                </div>
                <div className="p-4">
                  {/* Violation Details */}
                  <div className="flex items-center gap-2 mb-3">
                    <ExclamationTriangleIcon className="w-5 h-5 text-red-600" />
                    <span className="text-sm font-semibold text-gray-900">
                      Running Red Light
                    </span>
                  </div>
                  <div className="mb-3">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-700">
                      Pending
                    </span>
                  </div>
                  
                  {/* Vehicle Info */}
                  <div className="flex items-center gap-2 mb-2 text-sm text-gray-600">
                    <TruckIcon className="w-4 h-4" />
                    <span>SUV • XYZ-5678</span>
                  </div>
                  
                  {/* Location */}
                  <div className="flex items-start gap-2 mb-2 text-sm text-gray-600">
                    <MapPinIcon className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <div>
                      <div>Main St & 5th Avenue Intersection</div>
                      <div className="text-xs text-gray-500">37.783829, -122.408123</div>
                    </div>
                  </div>
                  
                  {/* Timestamp */}
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <ClockIcon className="w-4 h-4" />
                    <span>2026-01-06 14:15:32</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TrafficViolationDashboard;
