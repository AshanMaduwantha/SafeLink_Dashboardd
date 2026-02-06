"use client";

import React, { useState } from "react";
import dynamic from "next/dynamic";

const LiveStreamViewer = dynamic(
  () => import("@/components/dashboard/live-stream/LiveStreamViewer"),
  { ssr: false },
);

const DEFAULT_CHANNEL = "live_stream_channel";

export default function LiveStreamPage() {
  const [viewing, setViewing] = useState(false);
  const [channelName] = useState(DEFAULT_CHANNEL);

  const startViewing = () => {
    setViewing(true);
  };

  const stopViewing = () => {
    setViewing(false);
  };

  if (viewing) {
    return (
      <div className="min-h-screen bg-gray-50 -m-8 p-8">
        <div className="max-w-6xl mx-auto">
          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="mb-4 flex justify-between items-center">
              <h1 className="text-2xl font-bold text-gray-900">Live Stream</h1>
              <button
                onClick={stopViewing}
                className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
              >
                ← Back
              </button>
            </div>
            <div className="aspect-video bg-gray-900 rounded-lg">
              <LiveStreamViewer
                channelName={channelName}
                onLeave={stopViewing}
              />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 -m-8 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-6">
            Live Streams
          </h1>
          <p className="text-gray-600 mb-6">
            Monitor active broadcasts from the mobile app
          </p>

          {/* Default Stream Card */}
          <div className="border border-gray-200 rounded-lg p-6 hover:border-blue-500 transition-colors">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Default Live Stream
                </h3>
                <p className="text-sm text-gray-500">
                  Channel: {DEFAULT_CHANNEL}
                </p>
                <div className="mt-2">
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    <span className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></span>
                    Ready
                  </span>
                </div>
              </div>
              <button
                onClick={startViewing}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-colors"
              >
                Join Stream →
              </button>
            </div>
          </div>

          {/* Info Section */}
          <div className="mt-8 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <h4 className="font-semibold text-blue-900 m mb-2">
              📱 Broadcasting from Mobile
            </h4>
            <p className="text-sm text-blue-700">
              Start a live stream from the mobile app to see it here. The stream
              will appear automatically when a broadcaster joins the channel.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
