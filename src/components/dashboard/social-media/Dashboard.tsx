"use client";

import React, { useState } from "react";

const DashboardPage: React.FC = () => {
  const [selectedCategory, setSelectedCategory] = useState("All");

  const categories = [
    "All",
    "Harassment",
    "Hate Speech",
    "Child Abuse",
    "Elder Abuse",
    "Violent Act",
    "Murder Threat",
  ];

  const criticalAlerts = [
    {
      id: 1,
      platform: "Facebook",
      severity: "CRITICAL",
      timeAgo: "2m ago",
      message: "I will kill you tonight!",
      category: "Murder Threat",
      confidence: 95,
      confidenceColor: "bg-purple-100 text-purple-800",
    },
    {
      id: 2,
      platform: "Facebook",
      severity: "CRITICAL",
      timeAgo: "6m ago",
      message: "I know where you live. Watch your back.",
      category: "Murder Threat",
      confidence: 97,
      confidenceColor: "bg-purple-100 text-purple-800",
    },
    {
      id: 3,
      platform: "Facebook",
      severity: "CRITICAL",
      timeAgo: "9m ago",
      message: "Teaching my son a lesson with my belt tonight",
      category: "Child Abuse",
      confidence: 89,
      confidenceColor: "bg-purple-100 text-purple-800",
    },
    {
      id: 4,
      platform: "Facebook",
      severity: "CRITICAL",
      timeAgo: "11m ago",
      message: "You're going to regret this...",
      category: "Violent Act",
      confidence: 92,
      confidenceColor: "bg-purple-100 text-purple-800",
    },
  ];

  const contentFeed = [
    {
      id: 1,
      platform: "YouTube",
      label: "NEW",
      timeAgo: "0m ago",
      message: "I'm going to hurt you...",
      category: "Violent Act",
      confidence: 86,
      confidenceColor: "bg-gray-100 text-gray-800",
    },
    {
      id: 2,
      platform: "Facebook",
      label: "NEW",
      timeAgo: "5m ago",
      message: "You deserve to die you piece of trash",
      category: "Hate Speech",
      confidence: 88,
      confidenceColor: "bg-gray-100 text-gray-800",
    },
    {
      id: 3,
      platform: "Facebook",
      label: "NEW",
      timeAgo: "8m ago",
      message: "Gonna beat you senseless if I see you",
      category: "Violent Act",
      confidence: 84,
      confidenceColor: "bg-gray-100 text-gray-800",
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6">
        {/* Metrics Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-gray-100 rounded-lg p-6">
            <div className="text-sm text-gray-600 mb-1">Scanned Today</div>
            <div className="text-3xl font-semibold text-gray-900">156,234</div>
          </div>
          <div className="bg-gray-100 rounded-lg p-6">
            <div className="text-sm text-gray-600 mb-1">Flagged Harmful</div>
            <div className="text-3xl font-semibold text-gray-900">892</div>
          </div>
          <div className="bg-gray-100 rounded-lg p-6">
            <div className="text-sm text-gray-600 mb-1">Reported Cases</div>
            <div className="text-3xl font-semibold text-gray-900">47</div>
          </div>
          <div className="bg-gray-100 rounded-lg p-6">
            <div className="text-sm text-gray-600 mb-1">Avg Response Time</div>
            <div className="text-3xl font-semibold text-gray-900">3.2m</div>
          </div>
        </div>

        {/* Categories Filter */}
        <div className="mb-6">
          <div className="text-sm font-semibold text-gray-900 mb-3">
            Categories
          </div>
          <div className="flex flex-wrap gap-2">
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  selectedCategory === category
                    ? "bg-blue-600 text-white"
                    : "bg-white text-gray-700 hover:bg-gray-100 border border-gray-300"
                }`}
              >
                {category}
              </button>
            ))}
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Critical Alerts Section */}
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Critical Alerts
            </h2>
            <div className="space-y-4">
              {criticalAlerts.map((alert) => (
                <div
                  key={alert.id}
                  className="bg-white rounded-lg border-l-4 border-red-500 shadow-sm p-4"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-red-600 bg-red-50 px-2 py-1 rounded">
                        {alert.severity}
                      </span>
                      <span className="text-xs text-gray-500">
                        {alert.platform}
                      </span>
                    </div>
                    <span className="text-xs text-gray-500">
                      {alert.timeAgo}
                    </span>
                  </div>
                  <p className="text-sm text-gray-900 mb-3">{alert.message}</p>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-xs font-medium px-2 py-1 rounded ${alert.confidenceColor}`}
                      >
                        {alert.category} {alert.confidence}%
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <button className="px-3 py-1.5 text-xs font-medium text-gray-700 bg-gray-100 rounded hover:bg-gray-200">
                        View
                      </button>
                      <button className="px-3 py-1.5 text-xs font-medium text-white bg-orange-500 rounded hover:bg-orange-600">
                        Report to Authorize
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Content Feed Section */}
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Content Feed
            </h2>
            <div className="space-y-4">
              {contentFeed.map((item) => (
                <div
                  key={item.id}
                  className="bg-white rounded-lg shadow-sm p-4 border border-gray-200"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-2 py-1 rounded">
                        {item.label}
                      </span>
                      <span className="text-xs text-gray-500">
                        {item.platform}
                      </span>
                    </div>
                    <span className="text-xs text-gray-500">
                      {item.timeAgo}
                    </span>
                  </div>
                  <p className="text-sm text-gray-900 mb-3">{item.message}</p>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-xs font-medium px-2 py-1 rounded ${item.confidenceColor}`}
                      >
                        {item.category} {item.confidence}%
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <button className="px-3 py-1.5 text-xs font-medium text-gray-700 bg-gray-100 rounded hover:bg-gray-200">
                        View
                      </button>
                      <button className="px-3 py-1.5 text-xs font-medium text-white bg-orange-500 rounded hover:bg-orange-600">
                        Report to Authorize
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
